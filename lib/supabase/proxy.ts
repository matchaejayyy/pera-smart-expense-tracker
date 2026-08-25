import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedPage = (pathname: string) =>
  pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
  pathname === "/profile" || pathname.startsWith("/profile/");

const isProtectedApi = (pathname: string) =>
  pathname === "/api" || pathname.startsWith("/api/");

const copySessionCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
};

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({ request });

  if (!url || !publishableKey) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: "Server authentication is not configured." }, { status: 503 });
    }
    if (isProtectedPage(pathname)) {
      return NextResponse.redirect(new URL("/login?error=missing_configuration", request.url));
    }
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (!isAuthenticated && isProtectedApi(pathname)) {
    return copySessionCookies(
      response,
      NextResponse.json({ error: "A valid signed-in session is required." }, { status: 401 }),
    );
  }

  if (!isAuthenticated && isProtectedPage(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return copySessionCookies(response, NextResponse.redirect(loginUrl));
  }

  return response;
}
