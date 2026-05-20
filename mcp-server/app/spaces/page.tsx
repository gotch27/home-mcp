import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { app } from "@/nextsignal/app";
import type { HomeSpaceMember } from "@/nextsignal/domain/home";
import type { SpacesCreateInput, SpacesJoinInput, SpacesLeaveInput, SpacesListInput, SpacesListMembersInput } from "@/nextsignal/schemas";
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

type SpaceCardView = SpaceSummary & {
  members: HomeSpaceMember[];
  membersError?: string;
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
  const spaces = spacesResult.ok ? await loadSpaceCards(session, spacesResult.data ?? []) : [];
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

        <div className="py-12">
          <section className="w-full" aria-label="Home space">
            <SpacesDashboard spaces={spaces} />
          </section>
        </div>
      </section>
    </main>
  );
}

function SpacesDashboard({ spaces }: { spaces: SpaceCardView[] }) {
  return (
    <div className="grid gap-10 xl:grid-cols-[0.78fr_1.22fr]">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-clay">Spaces</p>
        <h1 className="mt-5 max-w-xl font-serif text-4xl leading-tight tracking-normal sm:text-5xl">
          Choose where your home tools write.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          Create or join spaces here, then use the space id from <code className="font-mono text-ink">space_list</code> when calling MCP tools.
        </p>
      </section>

      <div className="grid gap-8">
        <SpaceForms />
        <SpacesList spaces={spaces} />
      </div>
    </div>
  );
}

function SpaceForms() {
  return (
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
  );
}

function SpacesList({ spaces }: { spaces: SpaceCardView[] }) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white/60 p-6">
        <p className="font-serif text-2xl tracking-normal">No spaces yet</p>
        <p className="mt-2 text-sm leading-6 text-muted">Create a space or join one with an invite code.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-clay">Joined spaces</p>
          <h2 className="mt-2 font-serif text-3xl tracking-normal">Your spaces</h2>
        </div>
        <p className="text-sm font-semibold text-muted">{spaces.length} total</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
    </div>
  );
}

function SpaceCard({ space }: { space: SpaceCardView }) {
  return (
    <article className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-ink/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted">{space.role}</p>
          <h3 className="mt-2 break-words font-serif text-3xl tracking-normal">{space.name}</h3>
        </div>
        <details className="group relative shrink-0">
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-paper text-lg font-bold leading-none text-ink hover:border-sage [&::-webkit-details-marker]:hidden"
            aria-label={`Actions for ${space.name}`}
          >
            ...
          </summary>
          <div className="absolute right-0 z-10 mt-2 min-w-40 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-ink/10">
            <form action={leaveSpaceAction}>
              <input type="hidden" name="spaceId" value={space.id} />
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-danger hover:bg-cream" type="submit">
                Leave space
              </button>
            </form>
          </div>
        </details>
      </div>

      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-cream px-4 py-3">
          <dt className="font-semibold text-muted">Members</dt>
          <dd className="font-serif text-2xl text-ink">{space.memberCount}</dd>
        </div>
        <div className="grid gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
          <dt className="font-semibold text-muted">Space members</dt>
          <dd>
            {space.membersError ? (
              <p className="text-sm text-danger">{space.membersError}</p>
            ) : (
              <ul className="grid gap-2">
                {space.members.map((member) => (
                  <li className="flex items-center justify-between gap-3" key={member.userId}>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{member.displayName || member.email}</span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-mist px-2 py-1 text-xs font-bold text-muted">{member.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="grid gap-1 rounded-2xl bg-mist px-4 py-3">
          <dt className="font-semibold text-muted">Invite code</dt>
          <dd className="break-all text-lg font-bold tracking-normal text-ink">{space.inviteCode}</dd>
        </div>
        <div className="grid gap-1 rounded-2xl bg-cream px-4 py-3">
          <dt className="font-semibold text-muted">Space id</dt>
          <dd className="break-all font-mono text-xs text-ink">{space.id}</dd>
        </div>
      </dl>
    </article>
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

async function loadSpaceCards(session: WebAuthSession, spaces: SpaceSummary[]): Promise<SpaceCardView[]> {
  return Promise.all(spaces.map(async (space) => {
    const result = await app.dispatch<SpacesListMembersInput, HomeSpaceMember[]>("spaces.listMembers", { spaceId: space.id }, {
      runtime: "api",
      request: createWebSessionRequest(session, `nextsignal://web/spaces/${space.id}/members`)
    });

    return {
      ...space,
      members: result.ok ? result.data ?? [] : [],
      membersError: result.ok ? undefined : readResultError(result)
    };
  }));
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
  redirect("/spaces?message=Space%20created");
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
  redirect("/spaces?message=Space%20joined");
}

async function leaveSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesLeaveInput = {
    spaceId: String(formData.get("spaceId") ?? "")
  };
  const result = await app.dispatch<SpacesLeaveInput>("spaces.leave", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/leave")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20left");
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
