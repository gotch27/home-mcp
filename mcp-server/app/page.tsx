import { cookies } from "next/headers";
import { decryptWebSession, webSessionCookieName } from "@/nextsignal/workos/web-auth";

export default async function HomePage() {
  const session = await getPageSession();
  const displayName = session
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    : null;

  return (
    <main className="home-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private MCP gateway</p>
          <h1>Home MCP Server</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <a href="/api/health">Health</a>
          {displayName ? <span>{displayName}</span> : <a href="/login">Sign in</a>}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="status-pill">WorkOS OAuth for people and MCP clients</p>
          <h2>Shared home tools for shopping lists, todos, and the spaces behind them.</h2>
          <p>
            NextSignal exposes MCP tools that ChatGPT and Claude can call through OAuth. Home
            spaces turn those tools into shared household resources, so the right people see the
            same shopping list, todos, and notifications.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="/spaces">Open spaces</a>
            <a className="secondary-link" href="/.well-known/oauth-protected-resource">OAuth metadata</a>
          </div>
        </div>

        <div className="flow-panel" aria-label="MCP authentication flow">
          <div className="flow-node strong">WorkOS AuthKit</div>
          <div className="flow-line" />
          <div className="flow-node">Home spaces</div>
          <div className="flow-line" />
          <div className="flow-node accent">MCP tools</div>
        </div>
      </section>

      <section className="section-grid" aria-label="Server capabilities">
        <article className="info-card">
          <span className="card-marker">01</span>
          <h3>Spaces are families</h3>
          <p>Create a home space, share its invite code, and let members collaborate from the same MCP-backed state.</p>
        </article>
        <article className="info-card">
          <span className="card-marker">02</span>
          <h3>OAuth everywhere</h3>
          <p>Browser users sign in with WorkOS, and MCP clients receive WorkOS-issued bearer tokens for the protected endpoint.</p>
        </article>
        <article className="info-card">
          <span className="card-marker">03</span>
          <h3>Useful notifications</h3>
          <p>Shopping and todo changes are scoped to the active space and emailed to the other people who joined it.</p>
        </article>
      </section>
    </main>
  );
}

async function getPageSession() {
  const cookieStore = await cookies();
  return decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
}
