import { handleSeoRequest } from "./lib/seo.js";

// 24Adz Pages Function: handle only SEO landing-page URLs.
// All other requests continue to the existing Pages static assets.
export async function onRequest(context) {
  const { request, env, next } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Never intercept the homepage, API/admin paths, or static files.
  if (
    path === "/" ||
    path.startsWith("/api/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    /\.[a-z0-9]{2,8}$/i.test(path)
  ) {
    return next();
  }

  // Keep the existing site available if the Pages D1 binding has not
  // been configured yet. SEO routes will remain inactive until DB is added.
  if (!env.DB) {
    return next();
  }

  const response = await handleSeoRequest(request, env);
  return response || next();
}
