export default function HomePage() {
  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>NextSignal starter</h1>
      <p style={{ color: "#4b5563", lineHeight: 1.6 }}>
        This app is intentionally small. Start with the health process, then replace the services,
        adapters, and processes with your real application behavior.
      </p>

      <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <a href="/api/health" style={{ color: "#2563eb" }}>
          Open the health API result envelope
        </a>
        <code style={{ padding: 12, background: "#f3f4f6", borderRadius: 6 }}>
          nextsignal/processes/api/health.ts
        </code>
      </section>
    </main>
  );
}
