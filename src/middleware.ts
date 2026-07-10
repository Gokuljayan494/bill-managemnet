import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/server/auth";

const PROTECTED = [
  "/dashboard",
  "/products",
  "/invoices",
  "/bids",
  "/inventory",
  "/customers",
  "/settings",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/products/:path*",
    "/invoices/:path*",
    "/bids/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/settings/:path*",
  ],
};
