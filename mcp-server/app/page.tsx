import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  decryptWebSession,
  getSignOutUrl,
  webSessionCookieName,
  getWebAuthCookieOptions
} from "@/nextsignal/workos/web-auth";

export default async function HomePage() {
  const session = await getPageSession();
  if (!session) redirect("/login");

  const { user } = session;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <main className="home-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private MCP gateway</p>
          <h1>Home MCP Server</h1>
        </div>
        <form
          action={async () => {
            "use server";
            const cookieStore = await cookies();
            const session = await decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
            cookieStore.delete({
              name: webSessionCookieName,
              ...getWebAuthCookieOptions()
            });

            if (session) {
              redirect(getSignOutUrl(session));
            }

            redirect("/login");
          }}
        >
          <button className="secondary-button" type="submit">Sign out</button>
        </form>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="status-pill">Signed in as {displayName}</p>
          <h2>Shared home tools, protected by WorkOS.</h2>
          <p>
            This server exposes MCP tools for your household shopping list and todos. ChatGPT
            connects through OAuth, while this web home keeps the people and future home spaces
            behind an authenticated WorkOS session.
          </p>
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
          <h3>Browser authentication</h3>
          <p>Human access starts with WorkOS, so future setup screens can safely manage home spaces and members.</p>
        </article>
        <article className="info-card">
          <span className="card-marker">02</span>
          <h3>MCP OAuth</h3>
          <p>ChatGPT and other MCP clients discover protected resource metadata and receive bearer tokens for the MCP endpoint.</p>
        </article>
        <article className="info-card">
          <span className="card-marker">03</span>
          <h3>Shared household state</h3>
          <p>Shopping and todo tools are ready to become space-aware, so everyone in a home can collaborate from the same lists.</p>
        </article>
      </section>

      <footer className="home-footer">
        <a href="/api/health">Health</a>
        <a href="/.well-known/oauth-protected-resource">OAuth resource metadata</a>
      </footer>
    </main>
  );
}

async function getPageSession() {
  const cookieStore = await cookies();
  return decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
}
