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
    <main className="min-h-screen bg-cream text-ink">
      <section className="mx-auto min-h-screen w-full max-w-7xl rounded-none bg-paper px-6 py-8 sm:px-10 lg:rounded-3xl lg:px-16 lg:py-12">
        <header className="flex items-center justify-between gap-4">
          <a className="flex items-center gap-3 text-lg font-semibold italic" href="/">
            <span className="h-9 w-9 rounded-full bg-sage" aria-hidden="true" />
            <span className="font-serif">Home MCP</span>
          </a>
          <nav className="flex items-center gap-4 text-sm font-semibold text-muted" aria-label="Primary">
            {displayName ? (
              <>
                <span className="max-w-48 truncate">{displayName}</span>
                <form action={signOutAction}>
                  <button className="rounded-full border border-line bg-paper px-5 py-2.5 text-ink shadow-sm hover:border-[#718071]" type="submit">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <a className="rounded-full border border-line bg-paper px-5 py-2.5 text-ink shadow-sm hover:border-[#718071]" href="/login">
                Sign in
              </a>
            )}
          </nav>
        </header>

        <div className="grid min-h-[calc(100vh-8rem)] items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
          <section>
            <h1 className="max-w-xl font-serif text-5xl leading-[0.96] tracking-normal sm:text-6xl lg:text-7xl">
              Your household,
              <span className="block italic text-sage">synced by AI.</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-muted">
              One private space for shopping lists and todos, shared with your household and the AI assistants you already use.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#718071] px-7 text-sm font-bold text-white shadow-lg shadow-[#718071]/25 hover:bg-[#627062]"
                href="/spaces"
              >
                {primaryLabel}
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-paper px-7 text-sm font-bold text-ink hover:border-[#718071]"
                href="/spaces"
              >
                Join with a code
              </a>
            </div>
          </section>

          <VideoPlaceholder />
        </div>
      </section>

      <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-clay">How it works</p>
          <h2 className="mt-6 max-w-xl font-serif text-4xl leading-tight tracking-normal text-ink sm:text-5xl">
            Three small steps.
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
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
        </div>
      </section>
    </main>
  );
}

function VideoPlaceholder() {
  return (
    <section className="relative mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-ink/10">
        <div className="flex items-center justify-between border-b border-line bg-[#fbf8f1] px-5 py-4">
          <div className="flex gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-clay" />
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">Demo video</p>
        </div>
        <div className="relative aspect-video bg-[radial-gradient(circle_at_30%_20%,#fff8ec,transparent_34%),linear-gradient(135deg,#f5efe4,#eef4ef)]">
          <div className="absolute inset-8 rounded-2xl border border-white/70 bg-white/45 shadow-inner" />
          <div className="absolute left-8 top-8 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-muted shadow-sm">
            Home space
          </div>
          <button
            className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#718071] text-white shadow-2xl shadow-[#718071]/30"
            type="button"
            aria-label="Video placeholder"
          >
            <span className="ml-1 block h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-white" />
          </button>
          <div className="absolute bottom-8 left-8 right-8">
            <p className="mb-3 font-serif text-2xl text-ink">See shared lists in motion.</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div className="h-full w-2/5 rounded-full bg-[#718071]" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-6 rounded-full border border-line bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.25em] text-muted shadow-xl">
        <span className="mr-3 inline-block h-2 w-2 rounded-full bg-[#718071]" />
        Preview
      </div>
    </section>
  );
}

function Step({ children, number, title }: { children: ReactNode; number: string; title: string }) {
  return (
    <article>
      <p className="font-mono text-sm text-clay">{number}</p>
      <h3 className="mt-3 font-serif text-3xl leading-tight tracking-normal">{title}</h3>
      <p className="mt-4 max-w-sm text-base leading-7 text-muted">{children}</p>
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
