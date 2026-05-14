import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { app } from "@/nextsignal/app";
import type { SpacesCreateInput, SpacesJoinInput, SpacesListInput } from "@/nextsignal/schemas";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import { createWebSessionRequest } from "@/nextsignal/workos/request-context";
import {
  decryptWebSession,
  getSignOutUrl,
  getWebAuthCookieOptions,
  type WebAuthSession,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";

type SpacesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpacesPage({ searchParams }: SpacesPageProps) {
  const session = await requirePageSession();
  const params = await searchParams;
  const error = readParam(params, "error");
  const message = readParam(params, "message");
  const displayName = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email;

  const spacesResult = await app.dispatch<SpacesListInput, SpaceSummary[]>("spaces.list", {}, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces")
  });
  const spaces = spacesResult.ok ? spacesResult.data ?? [] : [];
  const currentSpace = spaces.find((space) => space.isActive) ?? spaces[0];
  const toast = error
    ? { tone: "error" as const, message: error }
    : message
      ? { tone: "success" as const, message }
      : !spacesResult.ok
        ? { tone: "error" as const, message: readResultError(spacesResult) }
        : null;

  return (
    <main className="min-h-screen bg-cream text-ink">
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}

      <section className="mx-auto min-h-screen w-full max-w-7xl rounded-none bg-paper px-6 py-8 sm:px-10 lg:rounded-3xl lg:px-16 lg:py-12">
        <header className="flex items-center justify-between gap-4">
          <a className="flex items-center gap-3 text-lg font-semibold italic" href="/">
            <span className="h-9 w-9 rounded-full bg-sage" aria-hidden="true" />
            <span className="font-serif">Home MCP</span>
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold text-muted">
            <a className="text-ink hover:text-sage" href="/">Home</a>
            <span className="max-w-40 truncate">{displayName}</span>
            <form action={signOutAction}>
              <button className="text-ink hover:text-sage" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-8rem)] items-center py-12">
          <section className="w-full" aria-label="Home space">
            {currentSpace ? <SpaceView space={currentSpace} /> : <SpaceSetup />}
          </section>
        </div>
      </section>
    </main>
  );
}

function SpaceSetup() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-clay">Spaces</p>
        <h1 className="mt-5 max-w-lg font-serif text-4xl leading-tight tracking-normal sm:text-5xl">
          Start with one household.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          Create a space, or enter an invite code from someone at home.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-ink/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage">Create</p>
          <h2 className="mt-3 font-serif text-3xl tracking-normal">New space</h2>
          <form className="mt-7 grid gap-4" action={createSpaceAction}>
            <label className="grid gap-2 text-sm font-semibold text-muted">
              Space name
              <input
                className="min-h-12 rounded-2xl border border-line bg-paper px-4 text-ink outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
                name="name"
                required
                maxLength={80}
                placeholder="Home"
              />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-sage px-5 text-sm font-bold text-white shadow-lg shadow-sage/20 hover:bg-[#627062]" type="submit">Create</button>
          </form>
        </div>

        <div className="rounded-3xl border border-line bg-white/70 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage">Join</p>
          <h2 className="mt-3 font-serif text-3xl tracking-normal">Use code</h2>
          <form className="mt-7 grid gap-4" action={joinSpaceAction}>
            <label className="grid gap-2 text-sm font-semibold text-muted">
              Invite code
              <input
                className="min-h-12 rounded-2xl border border-line bg-paper px-4 text-ink outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
                name="code"
                required
                maxLength={32}
                placeholder="ABCD2345"
              />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-paper px-5 text-sm font-bold text-ink hover:border-sage" type="submit">Join</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SpaceView({ space }: { space: SpaceSummary }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1fr]">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-clay">Current space</p>
        <h1 className="mt-5 max-w-xl break-words font-serif text-5xl leading-tight tracking-normal sm:text-6xl">
          {space.name}
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          This is the shared home state your MCP tools use for shopping and todos.
        </p>
      </section>

      <article className="relative rounded-3xl border border-line bg-white p-6 shadow-2xl shadow-ink/10 sm:p-8">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.26em] text-muted">
          <span className="h-2 w-2 rounded-full bg-sage" aria-hidden="true" />
          {space.role}
        </p>
        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl bg-cream px-5 py-4">
            <p className="text-sm font-semibold text-muted">Members</p>
            <p className="mt-1 font-serif text-3xl">{space.memberCount}</p>
          </div>
          <div className="rounded-2xl bg-mist px-5 py-4">
            <p className="text-sm font-semibold text-muted">Invite code</p>
            <p className="mt-2 text-2xl font-bold tracking-normal">{space.inviteCode}</p>
          </div>
          <div className="rounded-2xl bg-cream px-5 py-4">
            <p className="text-sm font-semibold text-muted">Status</p>
            <p className="mt-1 font-serif text-3xl italic text-sage">Active</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function Toast({ tone, message }: { tone: "success" | "error"; message: string }) {
  const toneClasses = tone === "error" ? "border-l-danger" : "border-l-leaf";

  return (
    <div
      className={`fixed right-4 top-4 z-20 grid max-w-[min(24rem,calc(100vw-2rem))] gap-1 rounded-lg border border-line border-l-4 bg-white p-4 shadow-xl ${toneClasses}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="text-sm font-bold">{tone === "error" ? "Could not update" : "Done"}</span>
      <p className="text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}

async function createSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesCreateInput = {
    name: String(formData.get("name") ?? "")
  };
  const result = await app.dispatch<SpacesCreateInput>("spaces.create", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/create")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20created%20and%20set%20active");
}

async function joinSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesJoinInput = {
    code: String(formData.get("code") ?? "")
  };
  const result = await app.dispatch<SpacesJoinInput>("spaces.join", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/join")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20joined%20and%20set%20active");
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

async function requirePageSession(): Promise<WebAuthSession> {
  const cookieStore = await cookies();
  const session = await decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
  if (!session) redirect("/login");

  return session;
}

function readResultError(result: { errors: { publicMessage?: string; message: string }[]; meta?: { kind?: string } }) {
  if (result.meta?.kind === "system") {
    return "Something went wrong. Check the server logs and make sure database migrations have run.";
  }

  return result.errors.map((item) => item.publicMessage ?? item.message).join(" ");
}

function readParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
