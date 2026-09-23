import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isMaintenanceMode } from "@/lib/maintenance";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Check Full Platform Maintenance Mode
  if (isMaintenanceMode()) {
    // Always allow static Next.js assets, public images, icons, and fonts
    if (
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path.includes(".") // static files like .png, .svg, .jpg, .ico, .css
    ) {
      return NextResponse.next();
    }

    // Allow the maintenance page itself to render
    if (path === "/maintenance") {
      return NextResponse.next();
    }

    // For API routes, return HTTP 503 JSON immediately (prevents webhook/payment execution)
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: "MAINTENANCE_MODE",
          message:
            "The Euphoria platform is temporarily under scheduled maintenance for database upgrades. All records are safe. Please check back shortly.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "300",
          },
        }
      );
    }

    // For all page routes (/, /events, /login, /dashboard, /coordinator, /admin, /super-admin),
    // rewrite to /maintenance with HTTP 503 status
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = "/maintenance";
    return NextResponse.rewrite(maintenanceUrl, {
      status: 503,
      headers: {
        "Retry-After": "300",
      },
    });
  }

  // Normal flow when maintenance is not active
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$).*)",
  ],
};
