import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/register"];
const publicAssetPaths = new Set([
  "/apple-icon.png",
  "/exercise-placeholder.png",
  "/exercise-placeholder.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/manifest.webmanifest",
  "/maskable-icon-512.png",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isApiUpload = pathname === "/api/upload" || pathname.startsWith("/api/upload/");
  const isAsset = pathname.startsWith("/_next") || pathname.startsWith("/favicon");
  const isPublicAsset = publicAssetPaths.has(pathname);

  if (isPublic || isAsset || isApiUpload || isPublicAsset) {
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
