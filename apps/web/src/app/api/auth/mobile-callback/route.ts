/**
 * Mobile OAuth Callback Handler
 *
 * After Google OAuth completes, Better Auth sets a session cookie and redirects
 * to the callbackURL. This endpoint reads that session cookie, extracts the
 * session token, and redirects to the mobile app via deep link with the token
 * as a query parameter.
 *
 * Flow:
 * 1. Mobile app opens OAuth in in-app browser with callbackURL = /api/auth/mobile-callback
 * 2. Google OAuth completes → Better Auth sets session cookie → redirects here
 * 3. This endpoint reads the cookie → redirects to lastminutes://auth/callback?token=xxx
 * 4. Mobile app intercepts the deep link, saves token, navigates to dashboard
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Better Auth sets these cookie names
    const sessionToken =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
      // If no session cookie, redirect to mobile app with error
      return NextResponse.redirect(
        "lastminutes://auth/callback?error=no_session"
      );
    }

    // Redirect to mobile app with the session token
    const redirectUrl = new URL("lastminutes://auth/callback");
    redirectUrl.searchParams.set("token", sessionToken);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Mobile callback error:", error);
    return NextResponse.redirect(
      "lastminutes://auth/callback?error=callback_failed"
    );
  }
}
