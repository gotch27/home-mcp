import { createSignInUrl, getWebAuthCookieOptions, webPkceCookieName } from "@/nextsignal/workos/web-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const signIn = await createSignInUrl();
  const response = NextResponse.redirect(signIn.url);
  response.cookies.set(webPkceCookieName, JSON.stringify({
    state: signIn.state,
    codeVerifier: signIn.codeVerifier
  }), {
    ...getWebAuthCookieOptions(),
    maxAge: 60 * 10
  });

  return response;
}
