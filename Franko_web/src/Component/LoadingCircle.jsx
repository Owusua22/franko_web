// Dependency-free so it can render before a lazy page or Redux persistence is ready.
export default function LoadingCircle({ label = "Please wait", compact = false }) {
  return (
    <div className="franko-circle" role="status" aria-live="polite" aria-busy="true" style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 16, minHeight: compact ? 240 : "65vh", padding: 24, color: "#14532d",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <span aria-hidden="true" style={{
        width: 44, height: 44, border: "4px solid #dcfce7", borderTopColor: "#14532d",
        borderRadius: "50%", animation: "franko-loading-spin var(--franko-spin-speed, 0.8s) linear infinite",
      }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <style>{"@keyframes franko-loading-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .franko-circle { --franko-spin-speed: 2s; } }"}</style>
    </div>
  );
}
