import { handleSeoRequest } from "./lib/seo.js";

// Cloudflare Pages catch-all: only SEO directory routes and the dynamic sitemap.
// Keep the homepage, API, admin and all static assets on their existing handlers.
export async function onRequest(context) {
  const { request, env, next } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  const { pathname } = new URL(request.url);
  if (pathname === "/" || pathname === "/robots.txt" || pathname.startsWith("/api/") ||
      pathname === "/admin" || pathname.startsWith("/admin/")) return next();
  const isSitemap = pathname === "/sitemap.xml";
  if (!isSitemap && /\.[a-z0-9]{2,8}$/i.test(pathname)) return next();
  if (!env.DB) return next();
  const response = await handleSeoRequest(request, env);
  return response || next();
}
