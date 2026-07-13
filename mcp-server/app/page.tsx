import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  decryptWebSession,
  getSignOutUrl,
  getWebAuthCookieOptions,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";

export default async function HomePage() {
  const session = await getPageSession();
  const displayName = session
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    : null;
  const primaryLabel = displayName ? "Open your space" : "Create a home space";

  return (
    <main className="editorial editorial-home">
      <section className="editorial-hero">
        <header className="editorial-nav">
          <a className="editorial-brand" href="/">
            <span className="editorial-brand-mark" aria-hidden="true">H</span>
            <span>Home / MCP</span>
          </a>
          <nav className="editorial-nav-actions" aria-label="Primary">
            {displayName ? (
              <>
                <span className="editorial-user">{displayName}</span>
                <form action={signOutAction}>
                  <button className="editorial-link-button" type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <a className="editorial-link-button" href="/login">Sign in</a>
            )}
          </nav>
        </header>

        <div className="editorial-hero-grid">
          <section className="editorial-copy">
            <p className="editorial-kicker">A calmer way to coordinate home</p>
            <h1>
              Home life,
              <span>beautifully in sync.</span>
            </h1>
            <p className="editorial-lede">
              One private command center for the lists, todos, and small details that keep a household moving—available to everyone and every AI assistant you trust.
            </p>
            <div className="editorial-actions">
              <a className="editorial-primary" href="/spaces">{primaryLabel}<span aria-hidden="true">↗</span></a>
              <a className="editorial-secondary" href="/spaces">Join with a code</a>
            </div>
            <div className="editorial-trust"><span>Private by design</span><span>Made for real households</span></div>
          </section>

          <VideoPlaceholder />
        </div>
      </section>

      <section className="editorial-how">
        <div className="editorial-how-heading">
          <p className="editorial-kicker">How it works</p>
          <h2>Set it up once.<br />Share the flow.</h2>
        </div>
        <div className="editorial-steps">
            <Step number="01" title="Create a space">
              Start one private household space for lists, todos, and members.
            </Step>
            <Step number="02" title="Share the code">
              Give the invite code to the people who should see the same state.
            </Step>
            <Step number="03" title="Use your AI">
              Ask ChatGPT or Claude to add, clear, or check things for the home.
            </Step>
        </div>
      </section>
    </main>
  );
}

function VideoPlaceholder() {
  return (
    <section className="editorial-video" aria-label="Product video placeholder">
      <div className="editorial-video-top"><span>Home, in motion</span><span>01:24</span></div>
      <div className="editorial-video-art">
        <div className="editorial-room-card"><span>Today</span><strong>6 things<br />handled</strong></div>
        <button className="editorial-play" type="button" aria-label="Play demo video"><span aria-hidden="true">▶</span></button>
        <p>See a shared home space come together.</p>
      </div>
    </section>
  );
}

function Step({ children, number, title }: { children: ReactNode; number: string; title: string }) {
  return (
    <article className="editorial-step">
      <p>{number}</p>
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  );
}

async function getPageSession() {
  const cookieStore = await cookies();
  return decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
}

async function signOutAction() {
  "use server";
  const cookieStore = await cookies();
  const session = await decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
  cookieStore.delete({
    name: webSessionCookieName,
    ...getWebAuthCookieOptions()
  });

  if (session) redirect(getSignOutUrl(session));
  redirect("/");
}
