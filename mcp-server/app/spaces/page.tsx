import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { app } from "@/nextsignal/app";
import type { SpacesCreateInput, SpacesJoinInput, SpacesListInput, SpacesSelectInput } from "@/nextsignal/schemas";
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

  return (
    <main className="spaces-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Home spaces</p>
          <h1>Spaces</h1>
        </div>
        <div className="topnav">
          <a href="/">Home</a>
          <span>{displayName}</span>
          <form action={signOutAction}>
            <button className="text-button" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <section className="spaces-layout">
        <div className="space-panel">
          <div className="panel-heading">
            <p className="eyebrow">Create</p>
            <h2>Start a family space</h2>
          </div>
          <form className="stack-form" action={createSpaceAction}>
            <label>
              Space name
              <input name="name" required maxLength={80} placeholder="Home" />
            </label>
            <button className="primary-button" type="submit">Create space</button>
          </form>
        </div>

        <div className="space-panel">
          <div className="panel-heading">
            <p className="eyebrow">Join</p>
            <h2>Use an invite code</h2>
          </div>
          <form className="stack-form" action={joinSpaceAction}>
            <label>
              Invite code
              <input name="code" required maxLength={32} placeholder="ABCD2345" />
            </label>
            <button className="primary-button" type="submit">Join space</button>
          </form>
        </div>
      </section>

      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {!spacesResult.ok ? <p className="notice error">{readResultError(spacesResult)}</p> : null}

      <section className="spaces-list" aria-label="Your spaces">
        <div className="section-heading">
          <p className="eyebrow">Your spaces</p>
          <h2>Active household state</h2>
        </div>

        {spaces.length === 0 ? (
          <div className="empty-state">
            <h3>No spaces yet</h3>
            <p>Create a space or join one with a code from someone in your household.</p>
          </div>
        ) : (
          <div className="space-cards">
            {spaces.map((space) => (
              <article className="space-card" key={space.id}>
                <div>
                  <p className="space-role">{space.role}{space.isActive ? " · active" : ""}</p>
                  <h3>{space.name}</h3>
                  <p>{space.memberCount} member{space.memberCount === 1 ? "" : "s"}</p>
                </div>
                <div className="invite-box" aria-label={`Invite code for ${space.name}`}>
                  <span>Invite code</span>
                  <strong>{space.inviteCode}</strong>
                </div>
                {!space.isActive ? (
                  <form action={selectSpaceAction}>
                    <input type="hidden" name="spaceId" value={space.id} />
                    <button className="secondary-button" type="submit">Make active</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
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

async function selectSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesSelectInput = {
    spaceId: String(formData.get("spaceId") ?? "")
  };
  const result = await app.dispatch<SpacesSelectInput>("spaces.select", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/select")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Active%20space%20updated");
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
