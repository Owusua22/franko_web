import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "./index.mjs";

process.env.CUSTOM_HEADER_NAME = "Identifier";
process.env.CUSTOM_HEADER_VALUE = "Franko";
process.env.ACCESS_CODE = "TESTACCESS123";
process.env.JWT_SECRET = "super-secret-jwt-key";
process.env.JWT_REFRESH_SECRET = "super-secret-refresh-key";

test("Lambda: generates random 6-digit payment code", async () => {
  const event = {
    httpMethod: "POST",
    headers: {
      Identifier: "Franko",
      "Content-Type": "application/json",
    },
    queryStringParameters: {
      endpoint: "/Payment/Generate-Verification-Code",
    },
    body: JSON.stringify({
      refNo: "ORD-9999-111",
      msisdn: "233241234567",
      amount: 150.0,
      network: "MTN",
      narration: "Samsung Galaxy A14",
    }),
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 200);

  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
  assert.equal(typeof body.code, "string");
  assert.equal(body.code.length, 6);
  assert.match(body.code, /^\d{6}$/);
  assert.equal(body.refNo, "ORD-9999-111");
  assert.ok(body.expiresAt > Date.now());
});

test("Lambda: rejects invalid verification code and enforces attempts", async () => {
  const refNo = "ORD-9999-222";
  // 1. Generate code
  const genEvent = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Generate-Verification-Code" },
    body: JSON.stringify({
      refNo,
      msisdn: "233241234567",
      amount: 200.0,
      network: "MTN",
    }),
  };
  const genRes = await handler(genEvent);
  const genBody = JSON.parse(genRes.body);
  const correctCode = genBody.code;

  // 2. Try wrong code
  const wrongCode = correctCode === "111111" ? "222222" : "111111";
  const verifyEvent = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Verify-Payment-Code" },
    body: JSON.stringify({
      refNo,
      code: wrongCode,
    }),
  };
  const verifyRes = await handler(verifyEvent);
  assert.equal(verifyRes.statusCode, 400);

  const verifyBody = JSON.parse(verifyRes.body);
  assert.equal(verifyBody.success, false);
  assert.match(verifyBody.message, /Invalid verification code/);
  assert.equal(verifyBody.attemptsRemaining, 4);
});

test("Lambda: accepts correct code and initiates Transflow payment", async () => {
  const refNo = "ORD-9999-333";
  // 1. Generate code
  const genEvent = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Generate-Verification-Code" },
    body: JSON.stringify({
      refNo,
      msisdn: "233501234567",
      amount: 350.0,
      network: "VODAFONE",
      narration: "Laptop HP 15",
    }),
  };
  const genRes = await handler(genEvent);
  const genBody = JSON.parse(genRes.body);
  const correctCode = genBody.code;

  // 2. Submit correct code
  const verifyEvent = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Verify-Payment-Code" },
    body: JSON.stringify({
      refNo,
      code: correctCode,
      msisdn: "233501234567",
      amount: 350.0,
      network: "VODAFONE",
    }),
  };
  const verifyRes = await handler(verifyEvent);
  assert.equal(verifyRes.statusCode, 200);

  const verifyBody = JSON.parse(verifyRes.body);
  assert.equal(verifyBody.success, true);
  assert.equal(verifyBody.verified, true);
  assert.equal(verifyBody.responseCode, "01");
});

test("Lambda: verifies transaction result", async () => {
  const refNo = "ORD-9999-444";
  const statusEvent = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Verify-Transaction-Status" },
    body: JSON.stringify({ refNo }),
  };
  const statusRes = await handler(statusEvent);
  assert.equal(statusRes.statusCode, 200);

  const statusBody = JSON.parse(statusRes.body);
  assert.equal(statusBody.success, true);
  assert.equal(statusBody.refNo, refNo);
  assert.equal(typeof statusBody.status, "string");
});

test("Lambda: rejects non-existent payment reference", async () => {
  const event = {
    httpMethod: "POST",
    headers: { Identifier: "Franko", "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Payment/Verify-Payment-Code" },
    body: JSON.stringify({ refNo: "NON-EXISTENT-REF", code: "123456" }),
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
});

test("Lambda: rejects request with missing or invalid security header", async () => {
  const event = {
    httpMethod: "POST",
    headers: {
      Identifier: "WrongHeader",
      "Content-Type": "application/json",
    },
    queryStringParameters: {
      endpoint: "/Payment/Generate-Verification-Code",
    },
    body: JSON.stringify({ refNo: "ORD-1", msisdn: "233240000000" }),
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 401);
  const body = JSON.parse(response.body);
  assert.match(body.message, /Unauthorized/);
});

test("Lambda: verifies access code endpoint remains functional", async () => {
  const event = {
    httpMethod: "POST",
    headers: { "Content-Type": "application/json" },
    queryStringParameters: { endpoint: "/Auth/Verify-Access-Code" },
    body: JSON.stringify({ accessCode: "TESTACCESS123" }),
  };

  const response = await handler(event);
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.success, true);
});
