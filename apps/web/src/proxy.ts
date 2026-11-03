import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for route protection.
 * - /app, /dashboard, /settings routes require authentication
 * - /admin routes require admin role (checked at API level, redirect here if no session)
 * - Public routes: /, /signin, /signup, /api/auth/*
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — skip auth check
  const publicRoutes = ["/", "/signin", "/signup"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/billing/webhook");

  if (isPublicRoute || isAuthApi || isPublicApi) {
    return NextResponse.next();
  }

  // Protected routes — check for session cookie
  const protectedPrefixes = ["/app", "/dashboard", "/settings", "/admin"];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    // Check for Better Auth session cookie
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ||
      request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionCookie?.value) {
      const signinUrl = new URL("/signin", request.url);
      signinUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
