import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isApiUpload = pathname === "/api/upload" || pathname.startsWith("/api/upload/");
  const isAsset = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isPublic || isAsset || isApiUpload) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("gym_session")?.value);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
