import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  paymentOutcome,
  generateOrderCode,
  buildOrderDetails,
  completedOrderRoute,
  assertOrderDetails,
  assertOrderAccepted,
  isValidVerificationCode,
  isVerificationExpired,
} from './checkoutFlow.mjs';

const success = {responseCode:null,responseMessage:'Successfully Processed Transaction',flag:null,name:null,data:{transactionReference:null,checkoutUrl:null}};
test('null-code success is immediate success', () => assert.equal(paymentOutcome(success),'success'));
test('stringified and nested success', () => assert.equal(paymentOutcome({data:JSON.stringify(success)}),'success'));
test('explicit failure cancels', () => assert.equal(paymentOutcome({responseCode:'02',responseMessage:'Transaction declined'}),'failed'));
test('pending is not cancelled', () => assert.equal(paymentOutcome({responseCode:null,responseMessage:'Awaiting approval'}),'pending'));
test('provisional failure code cannot cancel a processing prompt', () => assert.equal(paymentOutcome({responseCode:'02',responseMessage:'Processing Transaction'}),'pending'));
test('code alone cannot cancel an active prompt', () => assert.equal(paymentOutcome({responseCode:'0',responseMessage:null}),'pending'));
test('conflicting code cannot confirm success', () => assert.equal(paymentOutcome({...success,responseCode:'02'}),'pending'));
test('TARGET_AUTHORIZATION_ERROR immediately cancels even with a null code', () => assert.equal(paymentOutcome({responseCode:null,responseMessage:'TARGET_AUTHORIZATION_ERROR',flag:null,name:null,data:{transactionReference:null,checkoutUrl:null}}),'failed'));
test('nested authorization error cancels', () => assert.equal(paymentOutcome({data:JSON.stringify({responseCode:null,responseMessage:'TARGET_AUTHORIZATION_ERROR'})}),'failed'));
test('original order code format is unchanged', () => assert.equal(generateOrderCode(false, 17444, .4567),'ORD-7444-456'));
test('Tel order code shares the original numeric format', () => assert.equal(generateOrderCode(true, 17444, .4567),'TEL-7444-456'));
test('standard and Tel checkouts dispatch all original order and delivery fields', () => {
  for (const telecel of [false, true]) {
    const orderId = generateOrderCode(telecel, 17444, .4567);
    const { checkout, delivery } = buildOrderDetails({cartId:'Cart-1',customerId:'Customer-7',orderId,paymentMode:'Mobile Money',contact:'233501234567',accountType:'Customer',subtotal:125,recipientName:'Ama Mensah',recipientContactNumber:'0241112222',orderNote:'Call me',orderDate:'2026-10-02T09:00:00Z',address:'Accra',paymentService:telecel?'VODAFONE':'MTN'});
    assert.equal(assertOrderDetails(checkout,delivery),true);
    assert.deepEqual(Object.keys(checkout),['Cartid','customerId','orderCode','PaymentMode','PaymentAccountNumber','customerAccountType','paymentService','totalAmount','recipientName','recipientContactNumber','orderNote','orderDate']);
    assert.deepEqual(Object.keys(delivery),['orderCode','OrderCode','address','Customerid','recipientName','recipientContactNumber','orderNote','geoLocation']);
    assert.equal(checkout.orderCode, delivery.OrderCode);
    assert.equal(checkout.customerId, delivery.Customerid);
  }
});
test('incomplete order details block dispatch', () => {
  assert.throws(() => assertOrderDetails({Cartid:'Cart-1',orderCode:'ORD-1-2'},{}));
});
test('only confirmed Mobile Money goes to order-success', () => {
  const route = (paymentMode, paid, accountType = 'Customer', telecel = false) =>
    completedOrderRoute({orderId:'ORD-1234-567',paymentMode,paid,accountType,telecel});
  assert.equal(route('Mobile Money',true),'/order-success/ORD-1234-567');
  assert.equal(route('Mobile Money',false),'/order-received');
  assert.equal(route('Cash on Delivery',false),'/order-received');
  assert.equal(route('Cash on Delivery',true),'/order-received'); // even if caller passes a stale paid flag
  assert.equal(route('Pick Up',true,'Agent'),'/order-received');
  assert.equal(route('Paid Already',true,'Agent'),'/order-received');
  assert.equal(route('Mobile Money',true,'Agent'),'/order-received');
  assert.equal(completedOrderRoute({orderId:'TEL-1234-567',paymentMode:'Mobile Money',paid:true,accountType:'Customer',telecel:true}),'/order-success/TEL-1234-567');
  assert.equal(completedOrderRoute({orderId:'TEL-1234-567',paymentMode:'Mobile Money',paid:true,accountType:'Agent',telecel:true}),'/order-success/TEL-1234-567');
});
test('order rejection is thrown', () => assert.throws(() => assertOrderAccepted({responseCode:null,responseMessage:'Order failed'})));

test('verification code validation recognizes valid 6-digit codes', () => {
  assert.equal(isValidVerificationCode('123456'), true);
  assert.equal(isValidVerificationCode('999999'), true);
  assert.equal(isValidVerificationCode('000123'), true);
  assert.equal(isValidVerificationCode('12345'), false); // 5 digits
  assert.equal(isValidVerificationCode('1234567'), false); // 7 digits
  assert.equal(isValidVerificationCode('abcdef'), false); // letters
  assert.equal(isValidVerificationCode(null), false);
  assert.equal(isValidVerificationCode(''), false);
});

test('verification expiration identifies expired sessions correctly', () => {
  const now = 1000000000;
  const fiveMinAgo = now - (5 * 60 * 1000);
  const elevenMinAgo = now - (11 * 60 * 1000);
  assert.equal(isVerificationExpired(fiveMinAgo, 10 * 60 * 1000, now), false);
  assert.equal(isVerificationExpired(elevenMinAgo, 10 * 60 * 1000, now), true);
});
