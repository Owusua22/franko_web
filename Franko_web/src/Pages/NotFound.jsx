import { Link } from "react-router-dom";

export default function NotFound() {
  return <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 24px", textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
    <title>Page not found | Franko Trading</title>
    <p style={{ color: "#14532d", fontWeight: 800, letterSpacing: 2 }}>404</p>
    <h1 style={{ fontSize: 30, fontWeight: 800, margin: "16px 0" }}>This page is no longer available</h1>
    <p style={{ color: "#64748b", lineHeight: 1.7 }}>The link may be out of date. Browse our current catalogue instead.</p>
    <Link to="/products" style={{ display: "inline-block", marginTop: 24, padding: "12px 24px", borderRadius: 6, background: "#14532d", color: "white", fontWeight: 700 }}>Browse products</Link>
  </main>;
}
