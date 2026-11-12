import { handleSeoRequest } from "./seo.js";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// workers/index.js
var JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
var enc = /* @__PURE__ */ __name((b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "enc");
var dec = /* @__PURE__ */ __name((s) => atob(s.replace(/-/g, "+").replace(/_/g, "/")), "dec");
var uid = /* @__PURE__ */ __name(() => crypto.randomUUID(), "uid");
var str = /* @__PURE__ */ __name((v, n = 5e3) => String(v ?? "").trim().slice(0, n), "str");
var digits = /* @__PURE__ */ __name((v) => String(v ?? "").replace(/\D/g, ""), "digits");
var validMobile = /* @__PURE__ */ __name((v) => /^[6-9]\d{9}$/.test(v), "validMobile");
var reply = /* @__PURE__ */ __name((data, status = 200, origin = "*") => new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Vary": "Origin" } }), "reply");
var fail = /* @__PURE__ */ __name((message, status = 400, origin = "*") => reply({ success: false, error: message }, status, origin), "fail");
var readBody = /* @__PURE__ */ __name(async (req) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
}, "readBody");
var all = /* @__PURE__ */ __name(async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [], "all");
var first = /* @__PURE__ */ __name(async (db, sql, ...a) => db.prepare(sql).bind(...a).first(), "first");
var run = /* @__PURE__ */ __name(async (db, sql, ...a) => db.prepare(sql).bind(...a).run(), "run");
async function sign(s, secret) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return enc(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(s)));
}
__name(sign, "sign");
async function token(payload, secret) {
  const p = enc(new TextEncoder().encode(JSON.stringify(payload)));
  return p + "." + await sign(p, secret);
}
__name(token, "token");
async function claims(req, secret) {
  try {
    const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const [p, s] = t.split(".");
    if (!p || !s || !secret || await sign(p, secret) !== s) return null;
    const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(dec(p), (x) => x.charCodeAt(0))));
    return c.exp > Date.now() ? c : null;
  } catch {
    return null;
  }
}
__name(claims, "claims");
async function isAdmin(req, env) {
  return (await claims(req, env.ADMIN_SESSION_SECRET))?.role === "admin";
}
__name(isAdmin, "isAdmin");
async function supabaseUser(req, env) {
  const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!accessToken || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
    const response = await fetch(base + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + accessToken } });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id || !user.email || !(user.email_confirmed_at || user.confirmed_at)) return null;
    return user;
  } catch {
    return null;
  }
}
__name(supabaseUser, "supabaseUser");
async function clientAuth(req, env, db) {
  const user = await supabaseUser(req, env);
  if (!user) return null;
  return await first(
    db,
    "SELECT id,name,email,mobile,account_id,email_verified FROM client_accounts WHERE supabase_uid=? AND email_verified=1",
    user.id
  );
}
__name(clientAuth, "clientAuth");
async function sha256(value) {
  return enc(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
__name(sha256, "sha256");
async function rateLimit(db, key, max, windowMs) {
  const now = Date.now(), row = await first(db, "SELECT hits,window_started FROM api_rate_limits WHERE rate_key=?", key);
  if (!row || now - Number(row.window_started) >= windowMs) {
    await run(db, "INSERT INTO api_rate_limits(rate_key,hits,window_started,updated_at) VALUES(?,1,?,datetime('now')) ON CONFLICT(rate_key) DO UPDATE SET hits=1,window_started=excluded.window_started,updated_at=datetime('now')", key, now);
    return true;
  }
  if (Number(row.hits) >= max) return false;
  await run(db, "UPDATE api_rate_limits SET hits=hits+1,updated_at=datetime('now') WHERE rate_key=?", key);
  return true;
}
__name(rateLimit, "rateLimit");
async function table(db, t) {
  return !!await first(db, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", t);
}
__name(table, "table");
async function cols(db, t) {
  return (await all(db, `PRAGMA table_info(${t})`)).map((x) => x.name);
}
__name(cols, "cols");
function safeAd(b, mobile, status = "approved") {
  const details = b.category_details && typeof b.category_details === "object" && !Array.isArray(b.category_details) ? { ...b.category_details } : {};
  if (b.subcategory) details.subcategory = str(b.subcategory, 100);
  if (b.custom_fields && typeof b.custom_fields === "object" && !Array.isArray(b.custom_fields)) {
    const custom = {};
    for (const [key, value] of Object.entries(b.custom_fields).slice(0, 100)) {
      if (/^\d+$/.test(String(key)) && ["string", "number", "boolean"].includes(typeof value)) custom[String(key)] = str(value, 2e3);
    }
    details.custom_fields = custom;
  }
  if (b.contact_name) details.contact_name = str(b.contact_name, 100);
  if (b.age) details.age = str(b.age, 3);
  if (b.model_year) details.model_year = str(b.model_year, 4);
  return { id: uid(), title: str(b.title, 160), description: str(b.description, 5e3), category: str(b.category, 100), district: str(b.district, 100), area: str(b.area, 120), price: str(b.price, 40), phone: mobile || digits(b.phone), whatsapp: digits(b.whatsapp || mobile || b.phone), image_url: str(b.image_url || b.image, 2048), details_json: JSON.stringify(details), status };
}
__name(safeAd, "safeAd");
async function validateAdContent(db, a) {
  const category = String(a.category || "").toLowerCase();
  let moderation = { enabled: true, blocked_words: "porn,pornography,xxx,sex,nude,naked,escort,adult,erotic,sexual,hooker,prostitute,call girl,blowjob,handjob,boobs,breasts,genitals,vagina,penis,anal" };
  try {
    const row = await first(db, "SELECT value FROM settings WHERE key='moderation'");
    if (row?.value) moderation = { ...moderation, ...JSON.parse(row.value) };
  } catch {
  }
  if (moderation.enabled === false) return "";
  const text = (String(a.title || "") + " " + String(a.description || "") + " " + String(a.details_json || "")).toLowerCase();
  const words = String(moderation.blocked_words || "").split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 2);
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("(?:^|[^a-z0-9])" + escaped + "(?:$|[^a-z0-9])", "i");
    if (pattern.test(text)) return "Adult or prohibited words are not allowed in this category.";
  }
  return "";
}
__name(validateAdContent, "validateAdContent");
async function saveAd(db, a) {
  await run(db, "INSERT INTO ads(id,title,description,category,district,area,price,phone,whatsapp,image_url,status,details_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))", a.id, a.title, a.description, a.category, a.district, a.area, a.price, a.phone, a.whatsapp, a.image_url, a.status, a.details_json || "{}");
}
__name(saveAd, "saveAd");
async function isActiveMainCategory(db, name) {
  const row = await first(db, "SELECT id FROM categories WHERE name=? AND parent_id IS NULL AND active=1", str(name, 100));
  return !!row;
}
__name(isActiveMainCategory, "isActiveMainCategory");
async function validateAdCategory(db, category, detailsJson) {
  if (!await isActiveMainCategory(db, category)) return "Choose one of the active main categories.";
  let details = {};
  try {
    details = JSON.parse(detailsJson || "{}");
  } catch {
    return "Invalid category details.";
  }
  const available = await first(db, "SELECT COUNT(*) AS n FROM categories c JOIN categories p ON p.id=c.parent_id WHERE p.name=? AND p.active=1 AND c.active=1", category);
  if (Number(available?.n) > 0 && !details.subcategory) return "Please select a subcategory.";
  if (details.subcategory) {
    const sub = await first(db, "SELECT c.id FROM categories c JOIN categories p ON p.id=c.parent_id WHERE c.name=? AND p.name=? AND c.active=1 AND p.active=1", str(details.subcategory, 100), category);
    if (!sub) return "Selected subcategory does not belong to this main category or is inactive.";
  }
  if (await table(db, "form_fields")) {
    const fieldColumns = await cols(db, "form_fields");
    // Legacy form_fields has no category relation. Treating its rows as global
    // required fields incorrectly blocks every category form. Enforce only
    // explicitly category-scoped fields when the schema supports that relation.
    const categoryColumn = fieldColumns.includes("category") ? "category" : fieldColumns.includes("category_name") ? "category_name" : null;
    if (categoryColumn) {
      const required = await all(db, `SELECT id,label FROM form_fields WHERE active=1 AND required=1 AND LOWER(${categoryColumn})=LOWER(?) ORDER BY sort_order,id`, category);
      const custom = details.custom_fields && typeof details.custom_fields === "object" ? details.custom_fields : {};
      for (const field of required) {
        if (!str(custom[String(field.id)] ?? "", 2e3)) return `Please complete the required field: ${str(field.label, 100)}.`;
      }
    }
  }
  return null;
}
__name(validateAdCategory, "validateAdCategory");
async function listAreas(db, district) {
  if (!await table(db, "areas")) return [];
  const value = str(district, 100);
  if (!value) return [];
  const c = await cols(db, "areas");
  if (c.includes("district_id") && await table(db, "districts")) {
    if (/^\d+$/.test(value)) {
      return all(db, "SELECT * FROM areas WHERE district_id=? ORDER BY name", Number(value));
    }
    const dcols = await cols(db, "districts");
    const name = dcols.includes("name") ? "name" : dcols.includes("district_name") ? "district_name" : null;
    if (name) {
      return all(db, `SELECT a.* FROM areas a JOIN districts d ON a.district_id=d.id WHERE LOWER(d.${name})=LOWER(?) ORDER BY a.name`, value);
    }
    return [];
  }
  const dc = c.includes("district_name") ? "district_name" : c.includes("district") ? "district" : null;
  if (!dc) return [];
  if (/^\d+$/.test(value)) return all(db, `SELECT * FROM areas WHERE ${dc}=? ORDER BY name`, Number(value));
  return all(db, `SELECT * FROM areas WHERE LOWER(${dc})=LOWER(?) ORDER BY name`, value);
}
__name(listAreas, "listAreas");
var index_default = { async fetch(req, env) {
  const url = new URL(req.url), p = url.pathname.replace(/\/+$/, "") || "/";
  const configured = env.ALLOWED_ORIGIN || "*", origin = req.headers.get("Origin") || "*";
  const allow = configured === "*" || origin === configured ? configured : "null";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Vary": "Origin" } });
  if (!p.startsWith("/api/")) {
    const seoResponse = await handleSeoRequest(req, env);
    if (seoResponse) return seoResponse;
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return new Response("24Adz.com API is running. Static assets binding is not configured.", { status: 200 });
  }
  const out = /* @__PURE__ */ __name((d, s = 200) => reply(d, s, allow), "out"), bad = /* @__PURE__ */ __name((m, s = 400) => fail(m, s, allow), "bad");
  if (p === "/api/public/auth-config" && req.method === "GET") {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return bad("Supabase URL or anon key is not configured in Worker settings.", 503);
    return out({ success: true, supabaseUrl: String(env.SUPABASE_URL), supabaseAnonKey: String(env.SUPABASE_ANON_KEY) });
  }
  if (!env.DB) return bad("D1 binding DB is missing in wrangler.toml", 500);
  try {
    const ip = req.headers.get("CF-Connecting-IP") || "unknown";
    if (await table(env.DB, "api_rate_limits")) {
      const generalKey = await sha256(`all:${ip}`);
      if (!await rateLimit(env.DB, generalKey, 180, 6e4)) return bad("Too many requests. Please try again in one minute.", 429);
    }
    if (p === "/api/public/check-mobile" && req.method === "POST") {
      const b = await readBody(req) || {}, mobile = digits(b.mobile);
      if (!validMobile(mobile)) return bad("Enter a valid 10-digit mobile number.", 400);
      const key = await sha256(`check-mobile:${mobile}:${ip}`);
      if (!await rateLimit(env.DB, key, 20, 15 * 60 * 1000)) return bad("Too many attempts. Please try again later.", 429);
      const existing = await first(env.DB, "SELECT id FROM client_accounts WHERE mobile=? LIMIT 1", mobile);
      return out({ success: true, registered: !!existing });
    }
    if (p === "/api/public/login-by-mobile" && req.method === "POST") {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return bad("Login service is not configured.", 503);
      const b = await readBody(req) || {}, mobile = digits(b.mobile), password = String(b.password || "");
      if (!validMobile(mobile) || password.length < 1 || password.length > 256) return bad("Invalid login details.", 401);
      const key = await sha256(`mobile-login:${mobile}:${ip}`);
      if (!await rateLimit(env.DB, key, 8, 15 * 60 * 1000)) return bad("Too many login attempts. Try again after 15 minutes.", 429);
      const account = await first(env.DB, "SELECT email FROM client_accounts WHERE mobile=? AND email_verified=1 ORDER BY created_at DESC LIMIT 1", mobile);
      if (!account?.email) return bad("Invalid login details, or this mobile number is not linked to a verified account.", 401);
      try {
        const response = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, "") + "/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { apikey: env.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ email: account.email, password })
        });
        const session = await response.json().catch(() => ({}));
        if (!response.ok || !session.access_token || !session.refresh_token) return bad("Invalid login details, or please verify your email first.", 401);
        return out({ success: true, session: { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, token_type: session.token_type } });
      } catch {
        return bad("Login service is temporarily unavailable. Please try again.", 503);
      }
    }
    if (p === "/api/health" && req.method === "GET") {
      const x = await first(env.DB, "SELECT 1 AS ok");
      return out({ success: true, database: x?.ok === 1 ? "connected" : "error", app: "24Adz.com", features: { supabaseAuthConfigured: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY), clientEmailVerification: "supabase", rateLimiting: await table(env.DB, "api_rate_limits"), chat: await table(env.DB, "chat_messages") } });
    }
    if (p === "/api/admin/login" && req.method === "POST") {
      const b = await readBody(req);
      if (!b) return bad("Invalid JSON");
      if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return bad("Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET Worker secrets", 503);
      if (String(b.password || "") !== env.ADMIN_PASSWORD) return bad("Invalid admin password", 401);
      return out({ success: true, token: await token({ role: "admin", exp: Date.now() + 8 * 36e5 }, env.ADMIN_SESSION_SECRET) });
    }
    if (p === "/api/client/sync" && req.method === "POST") {
      const user = await supabaseUser(req, env, env.DB);
      if (!user) return bad("Supabase session is invalid or email is not verified. Please verify your email and log in again.", 401);
      const b = await readBody(req) || {}, email = str(user.email, 254).toLowerCase();
      const metadata = user.user_metadata || {}, name = str(b.name || metadata.full_name || metadata.name || email.split("@")[0], 100);
      const mobile = digits(b.mobile || metadata.mobile || metadata.phone || "");
      if (mobile && !validMobile(mobile)) return bad("The registered mobile number is invalid.", 400);
      let row = await first(env.DB, "SELECT id,account_id,name,email,mobile FROM client_accounts WHERE supabase_uid=?", user.id);
      if (!row) row = await first(env.DB, "SELECT id,account_id,name,email,mobile FROM client_accounts WHERE LOWER(email)=LOWER(?)", email);
      if (mobile) {
        const mobileOwner = await first(env.DB, "SELECT id FROM client_accounts WHERE mobile=? AND (? IS NULL OR id<>?) LIMIT 1", mobile, row?.id || null, row?.id || null);
        if (mobileOwner) return bad("This mobile number is already registered with another account. Please use your registered number.", 409);
      }
      if (row) {
        await run(env.DB, "UPDATE client_accounts SET supabase_uid=?,email=?,name=?,mobile=CASE WHEN ?<>'' THEN ? ELSE mobile END,email_verified=1,updated_at=datetime('now') WHERE id=?", user.id, email, name, mobile, mobile, row.id);
        row = await first(env.DB, "SELECT id,account_id,name,email,mobile,email_verified FROM client_accounts WHERE id=?", row.id);
      } else {
        const id = uid(), accountId = "24A-" + uid().slice(0, 8).toUpperCase();
        await run(env.DB, "INSERT INTO client_accounts(id,account_id,name,email,mobile,password_hash,email_verified,supabase_uid,created_at,updated_at) VALUES(?,?,?,?,?,'',1,?,datetime('now'),datetime('now'))", id, accountId, name, email, mobile, user.id);
        await run(env.DB, "INSERT OR IGNORE INTO client_coin_wallets(client_id,email,balance) VALUES(?,?,0)", id, email);
        row = await first(env.DB, "SELECT id,account_id,name,email,mobile,email_verified FROM client_accounts WHERE id=?", id);
      }
      await run(env.DB, "INSERT OR IGNORE INTO client_coin_wallets(client_id,email,balance) VALUES(?,?,0)", row.id, email);
      return out({ success: true, client: row });
    }
    // Client credentials and email verification are handled only by Supabase Auth.
    // The legacy D1 password/Resend endpoints have been removed.
    if (p === "/api/client/me" && req.method === "GET") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const wallet = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", client.id);
      const freeCfg = await first(env.DB, "SELECT value FROM settings WHERE key='free_ads'");
      let free = { limit: 3, period_days: 30 };
      try {
        if (freeCfg?.value) free = { ...free, ...JSON.parse(freeCfg.value) };
      } catch {
      }
      const period = Math.max(1, Math.min(365, Number(free.period_days) || 30)), limit = Math.max(0, Math.min(1e3, Number(free.limit) || 0));
      // Shared free quota: count all client ads for this registered mobile number,
      // regardless of which verified email account was used to post them.
      const mobile = digits(client.mobile);
      const mobileCount = await first(env.DB, "SELECT COUNT(*) n FROM ads a LEFT JOIN client_accounts ca ON ca.id=a.owner_client_id WHERE (a.owner_client_id IS NOT NULL OR a.owner_email IS NOT NULL) AND (a.phone=? OR ca.mobile=?) AND COALESCE(a.is_vip,0)=0 AND a.created_at>=datetime('now','-'||?||' days')", mobile, mobile, period);
      const used = Number(mobileCount?.n) || 0;
      return out({ success: true, client, wallet: { balance: Number(wallet?.balance) || 0 }, freeAds: { mobileUsed: used, mobileLimit: limit, periodDays: period } });
    }
    if (p === "/api/client/ads" && req.method === "GET") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      return out({ success: true, ads: await all(env.DB, "SELECT * FROM ads WHERE owner_client_id=? ORDER BY created_at DESC LIMIT 200", client.id) });
    }
    const clientRenew = p.match(/^\/api\/client\/ads\/([^/]+)\/renew$/);
    if (clientRenew && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const adId = decodeURIComponent(clientRenew[1]), b = await readBody(req) || {}, days = Number(b.days);
      if (![3,5,7].includes(days)) return bad("Choose 3, 5 or 7 days.");
      const ad = await first(env.DB, "SELECT id,is_vip,expires_at,status FROM ads WHERE id=? AND owner_client_id=?", adId, client.id);
      if (!ad || ad.status !== "approved") return bad("Only your published ads can be renewed.", 404);
      let prices = {"3":300,"5":500,"7":700};
      const pr = await first(env.DB, "SELECT value FROM settings WHERE key='vip_pricing'");
      try { if (pr?.value) prices = {...prices,...JSON.parse(pr.value)}; } catch {}
      const cost = Math.max(0, Number(prices[String(days)]) || 0);
      const wallet = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", client.id);
      const balance = Number(wallet?.balance) || 0;
      if (balance < cost) return bad(`Not enough Coins. ${cost} Coins required; your balance is ${balance}.`, 402);
      const newBalance = balance - cost;
      await run(env.DB, "UPDATE client_coin_wallets SET balance=?,updated_at=datetime('now') WHERE client_id=?", newBalance, client.id);
      await run(env.DB, "INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note) VALUES(?,?,?,?,?,?,?)", crypto.randomUUID(), client.id, client.email, "vip_debit", -cost, newBalance, `Auto Renew Ad ${adId} for ${days} days`);
      await run(env.DB, "INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))", adId, days, cost, "active", "CLIENT_COIN_RENEW");
      await run(env.DB, "UPDATE ads SET is_vip=1,expires_at=datetime(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at)>datetime('now') THEN expires_at ELSE 'now' END, '+'||?||' days') WHERE id=? AND owner_client_id=?", days, adId, client.id);
      return out({success:true,balance:newBalance,message:`Ad renewed for ${days} days.`});
    }
    if (p === "/api/client/profile" && req.method === "PUT") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const b = await readBody(req) || {}, name = str(b.name, 100), mobile = digits(client.mobile);
      if (!name || !validMobile(mobile)) return bad("A valid registered mobile number is required");
      // Keep the registered mobile immutable here so users cannot reset the shared free-ad quota.
      await run(env.DB, "UPDATE client_accounts SET name=?,updated_at=datetime('now') WHERE id=?", name, client.id);
      return out({ success: true, client: { ...client, name, mobile } });
    }
    if (p === "/api/client/account" && req.method === "DELETE") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const b = await readBody(req) || {};
      if (!b.confirm) return bad("Set confirm=true to delete this account");
      await run(env.DB, "UPDATE ads SET owner_client_id=NULL,owner_email=NULL WHERE owner_client_id=?", client.id);
      await run(env.DB, "DELETE FROM email_action_tokens WHERE client_id=?", client.id);
      await run(env.DB, "DELETE FROM chat_messages WHERE sender_client_id=? OR receiver_client_id=?", client.id, client.id);
      await run(env.DB, "DELETE FROM coin_purchase_requests WHERE client_id=?", client.id);
      await run(env.DB, "DELETE FROM coin_transactions WHERE client_id=?", client.id);
      await run(env.DB, "DELETE FROM client_coin_wallets WHERE client_id=?", client.id);
      await run(env.DB, "DELETE FROM client_accounts WHERE id=?", client.id);
      return out({ success: true, message: "Account deleted." });
    }
    const clientAd = p.match(/^\/api\/client\/ads\/([^/]+)$/);
    if (clientAd && req.method === "PATCH") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const b = await readBody(req) || {}, a = safeAd(b, client.mobile);
      const owned = await first(env.DB, "SELECT id,image_url FROM ads WHERE id=? AND owner_client_id=?", clientAd[1], client.id);
      if (!owned) return bad("You can only edit ads assigned to your account", 403);
      if (!a.title || !a.description || !a.category || !a.district || !a.area) return bad("Title, description, category, district and area are required");
      const categoryError = await validateAdCategory(env.DB, a.category, a.details_json);
      if (categoryError) return bad(categoryError);
      const contentError = await validateAdContent(env.DB, a);
      if (contentError) return bad(contentError);
      const image = a.image_url || owned.image_url;
      await run(env.DB, "UPDATE ads SET title=?,description=?,category=?,district=?,area=?,price=?,phone=?,whatsapp=?,image_url=?,details_json=? WHERE id=? AND owner_client_id=?", a.title, a.description, a.category, a.district, a.area, a.price, a.phone, a.whatsapp, image, a.details_json, clientAd[1], client.id);
      return out({ success: true });
    }
    if (clientAd && req.method === "DELETE") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const owned = await first(env.DB, "SELECT id,image_url FROM ads WHERE id=? AND owner_client_id=?", clientAd[1], client.id);
      if (!owned) return bad("You can only delete ads assigned to your account", 403);
      await run(env.DB, "DELETE FROM ads WHERE id=? AND owner_client_id=?", clientAd[1], client.id);
      return out({ success: true });
    }
    if (p === "/api/client/ads" && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const ip2 = req.headers.get("CF-Connecting-IP") || "unknown";
      if (!await rateLimit(env.DB, await sha256(`client-ad:${client.id}:${ip2}`), 10, 36e5)) return bad("Ad posting limit reached. Try again later.", 429);
      const b = await readBody(req) || {}, a = safeAd(b, client.mobile, "approved");
      if (!a.title || !a.description || !a.category || !a.district || !a.area) return bad("Title, description, category, district and area are required");
      const categoryError = await validateAdCategory(env.DB, a.category, a.details_json);
      if (categoryError) return bad(categoryError);
      const contentError = await validateAdContent(env.DB, a);
      if (contentError) return bad(contentError);
      const freeCfgRow = await first(env.DB, "SELECT value FROM settings WHERE key='free_ads'");
      let freeCfg = { limit: 3, period_days: 30 };
      try {
        if (freeCfgRow?.value) freeCfg = { ...freeCfg, ...JSON.parse(freeCfgRow.value) };
      } catch {
      }
      const freeLimit = Math.max(0, Math.min(1e3, Number(freeCfg.limit) || 0)), period = Math.max(1, Math.min(365, Number(freeCfg.period_days) || 30));
      // All verified email accounts using this mobile number share one rolling quota.
      const mobile = digits(client.mobile);
      if (!validMobile(mobile)) return bad("A valid registered mobile number is required to post an ad.");
      const mobileCount = await first(env.DB, "SELECT COUNT(*) n FROM ads a LEFT JOIN client_accounts ca ON ca.id=a.owner_client_id WHERE (a.owner_client_id IS NOT NULL OR a.owner_email IS NOT NULL) AND (a.phone=? OR ca.mobile=?) AND COALESCE(a.is_vip,0)=0 AND a.created_at>=datetime('now','-'||?||' days')", mobile, mobile, period);
      const freeUsed = Number(mobileCount?.n || 0);
      const freeAllowed = freeUsed < freeLimit;
      const plan = str(b.plan || "free", 20), days = plan === "vip3" ? 3 : plan === "vip5" ? 5 : plan === "vip7" ? 7 : 0;
      let pricing = { "3": 300, "5": 500, "7": 700 };
      try {
        const pr = await first(env.DB, "SELECT value FROM settings WHERE key='vip_pricing'");
        if (pr?.value) pricing = { ...pricing, ...JSON.parse(pr.value) };
      } catch {
      }
      const cost = days ? Math.max(0, Number(pricing[String(days)]) || 0) : 0;
      if (!freeAllowed && !days) return bad("This mobile number has used all " + freeLimit + " free ads in the last " + period + " days, including ads posted through other email accounts. Please purchase Coins through 24Adz Admin WhatsApp Chat to continue posting.", 402);
      if (days) {
        const wallet = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", client.id);
        if (Number(wallet?.balance || 0) < cost) return bad(`Insufficient coins. ${cost} coins required for this VIP plan.`, 402);
        await run(env.DB, "UPDATE client_coin_wallets SET balance=balance-?,updated_at=datetime('now') WHERE client_id=? AND balance>=?", cost, client.id, cost);
        const updated = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", client.id);
        await run(env.DB, "INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note) VALUES(?,?,?,'vip_debit',?,?,?)", uid(), client.id, client.email, -cost, Number(updated?.balance || 0), `VIP ad promotion (${days} days)`);
        a.is_vip = 1;
        a.expires_at = new Date(Date.now() + days * 864e5).toISOString();
      } else {
        a.is_vip = 0;
        a.expires_at = new Date(Date.now() + 30 * 864e5).toISOString();
      }
      if (days) {
        await run(env.DB, "INSERT INTO ads(id,title,description,category,district,area,price,phone,whatsapp,image_url,status,details_json,created_at,owner_email,owner_client_id,is_vip,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?, 'approved',?,datetime('now'),?,?,?,?)", a.id, a.title, a.description, a.category, a.district, a.area, a.price, a.phone, a.whatsapp, a.image_url, a.details_json || "{}", client.email, client.id, a.is_vip, a.expires_at);
      } else {
        // Enforce the quota in the INSERT itself as well, so simultaneous requests
        // cannot both pass a stale pre-check and exceed the mobile-number limit.
        const inserted = await run(env.DB, "INSERT INTO ads(id,title,description,category,district,area,price,phone,whatsapp,image_url,status,details_json,created_at,owner_email,owner_client_id,is_vip,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?, 'approved',?,datetime('now'),?,?,0,? WHERE (SELECT COUNT(*) FROM ads a LEFT JOIN client_accounts ca ON ca.id=a.owner_client_id WHERE (a.owner_client_id IS NOT NULL OR a.owner_email IS NOT NULL) AND (a.phone=? OR ca.mobile=?) AND COALESCE(a.is_vip,0)=0 AND a.created_at>=datetime('now','-'||?||' days')) < ?", a.id, a.title, a.description, a.category, a.district, a.area, a.price, a.phone, a.whatsapp, a.image_url, a.details_json || "{}", client.email, client.id, a.expires_at, mobile, mobile, period, freeLimit);
        if (!inserted?.meta?.changes) return bad("This mobile number has used all " + freeLimit + " free ads in the last " + period + " days, including ads posted through other email accounts. Please purchase Coins through 24Adz Admin WhatsApp Chat to continue posting.", 402);
      }
      return out({ success: true, ad: { ...a, owner_client_id: client.id, owner_email: client.email }, message: "Your advertisement has been published." }, 201);
    }
    if (p === "/api/client/chat" && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const ip2 = req.headers.get("CF-Connecting-IP") || "unknown";
      if (!await rateLimit(env.DB, await sha256(`chat:${client.id}:${ip2}`), 20, 6e4)) return bad("Message limit reached. Please wait.", 429);
      const b = await readBody(req) || {}, ad2 = await first(env.DB, "SELECT id,owner_client_id,phone FROM ads WHERE id=? AND status='approved'", str(b.ad_id, 100)), message = str(b.message, 2e3);
      if (!ad2) return bad("Ad not found", 404);
      if (!message) return bad("Message required");
      if (!ad2.owner_client_id) return bad("This advertiser does not have a client chat account.", 400);
      if (String(ad2.owner_client_id) === String(client.id)) return bad("You cannot chat with yourself.", 400);
      const adDetails = await first(env.DB, "SELECT category,details_json FROM ads WHERE id=?", ad2.id);
      let chatPolicy = {};
      try { const cfg = await first(env.DB, "SELECT value FROM settings WHERE key='contact_policy'"); if (cfg?.value) chatPolicy = JSON.parse(cfg.value); } catch {}
      let sub = ""; try { sub = String(JSON.parse(adDetails?.details_json || "{}").subcategory || "").trim().toLowerCase(); } catch {}
      const ckey = `${String(adDetails?.category||"").trim().toLowerCase()}|${sub}`;
      const mkey = `${String(adDetails?.category||"").trim().toLowerCase()}|*`;
      if ((chatPolicy[ckey] || chatPolicy[mkey] || {chat:true}).chat === false) return bad("Chat is disabled for this category.", 403);
      if ((message.match(/https?:\/\//gi) || []).length > 2 || /(buy now|click here|free money|crypto investment)/i.test(message)) return bad("Message blocked by spam protection", 400);
      const owner = await first(env.DB, "SELECT mobile FROM client_accounts WHERE id=?", ad2.owner_client_id);
      await run(env.DB, "INSERT INTO chat_messages(ad_id,sender_mobile,receiver_mobile,message,sender_client_id,receiver_client_id) VALUES(?,?,?,?,?,?)", ad2.id, client.mobile, owner?.mobile || "", message, client.id, ad2.owner_client_id);
      return out({ success: true, message: "Message sent to advertiser." }, 201);
    }
    if (p === "/api/client/chat/reply" && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const b = await readBody(req) || {}, adId = str(b.ad_id, 100), to = str(b.receiver_client_id, 100), message = str(b.message, 2e3);
      if (!adId || !to || !message) return bad("Conversation, recipient and message are required");
      const ad2 = await first(env.DB, "SELECT id,owner_client_id FROM ads WHERE id=? AND status='approved'", adId);
      if (!ad2 || ![String(ad2.owner_client_id), to].includes(String(client.id))) return bad("Conversation not found", 404);
      if (String(ad2.owner_client_id) === String(client.id) ? to === String(client.id) : String(ad2.owner_client_id) !== to) return bad("Invalid conversation recipient", 403);
      const other = await first(env.DB, "SELECT mobile FROM client_accounts WHERE id=?", to);
      if (!other) return bad("Customer not found", 404);
      await run(env.DB, "INSERT INTO chat_messages(ad_id,sender_mobile,receiver_mobile,message,sender_client_id,receiver_client_id) VALUES(?,?,?,?,?,?)", adId, client.mobile, other.mobile, message, client.id, to);
      return out({ success: true }, 201);
    }
    if (p === "/api/client/messages" && req.method === "GET") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
      return out({ success: true, messages: await all(env.DB, "SELECT id,ad_id,sender_mobile,receiver_mobile,message,created_at,sender_client_id,receiver_client_id FROM chat_messages WHERE (sender_client_id=? OR receiver_client_id=?) AND id>? ORDER BY id ASC LIMIT 100", client.id, client.id, after) });
    }
    if (p === "/api/admin/messages" && req.method === "GET") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
      return out({ success: true, messages: await all(env.DB, "SELECT m.*,c.name AS sender_name,c.email AS sender_email FROM chat_messages m LEFT JOIN client_accounts c ON c.id=m.sender_client_id WHERE m.receiver_client_id='ADMIN' OR m.sender_client_id IN (SELECT id FROM client_accounts) ORDER BY m.id DESC LIMIT 300") });
    }
    const adminReply = p.match(/^\/api\/admin\/messages\/([0-9]+)\/reply$/);
    if (adminReply && req.method === "POST") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const b = await readBody(req) || {}, original = await first(env.DB, "SELECT * FROM chat_messages WHERE id=?", adminReply[1]);
      if (!original) return bad("Message not found", 404);
      const message = str(b.message, 2e3);
      if (!message) return bad("Reply message required");
      await run(env.DB, "INSERT INTO chat_messages(ad_id,sender_mobile,receiver_mobile,message,sender_client_id,receiver_client_id) VALUES(?,?,?,?, 'ADMIN',?)", original.ad_id, "ADMIN", original.sender_mobile, message, original.sender_client_id);
      return out({ success: true }, 201);
    }
    if (p === "/api/client/coin-transactions" && req.method === "GET") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      return out({success:true,transactions:await all(env.DB,"SELECT id,type,coins,balance_after,note,created_at FROM coin_transactions WHERE client_id=? ORDER BY created_at DESC LIMIT 100",client.id)});
    }
    if (p === "/api/client/coin-packages" && req.method === "GET") {
      let packages = [1e3, 2e3, 3e3, 4e3, 5e3].map((coins) => ({ coins, amount: coins }));
      try {
        const row = await first(env.DB, "SELECT value FROM settings WHERE key='coin_packages'");
        if (row?.value) {
          const parsed = JSON.parse(row.value);
          if (Array.isArray(parsed) && parsed.length) packages = parsed;
        }
      } catch {
      }
      return out({ success: true, packages });
    }
    if (p === "/api/client/coin-requests" && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      const b = await readBody(req) || {}, coins = Number(b.coins);
      let packages = [1e3, 2e3, 3e3, 4e3, 5e3].map((n) => ({ coins: n, amount: n }));
      try {
        const row = await first(env.DB, "SELECT value FROM settings WHERE key='coin_packages'");
        if (row?.value) {
          const parsed = JSON.parse(row.value);
          if (Array.isArray(parsed) && parsed.length) packages = parsed;
        }
      } catch {
      }
      const selected = packages.find((x) => Number(x.coins) === coins);
      if (!selected) return bad("Choose a valid coin package");
      const amount = Number(selected.amount);
      if (!Number.isFinite(amount) || amount < 0) return bad("Invalid coin package amount");
      const id = uid();
      await run(env.DB, "INSERT INTO coin_purchase_requests(id,client_id,email,coins,amount,status) VALUES(?,?,?,?,?,'pending')", id, client.id, client.email, coins, amount);
      return out({ success: true, request_id: id, coins, amount, message: "Contact Admin on WhatsApp and share this request ID after payment." }, 201);
    }
    if (p === "/api/admin/clients" && req.method === "GET") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      return out({ success: true, clients: await all(env.DB, "SELECT c.id,c.account_id,c.name,c.email,c.mobile,COALESCE(w.balance,0) balance,c.created_at FROM client_accounts c LEFT JOIN client_coin_wallets w ON w.client_id=c.id ORDER BY c.created_at DESC LIMIT 500") });
    }
    if (p === "/api/admin/coin-requests" && req.method === "GET") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      return out({ success: true, requests: await all(env.DB, "SELECT * FROM coin_purchase_requests ORDER BY created_at DESC LIMIT 300") });
    }
    const coinRequest = p.match(/^\/api\/admin\/coin-requests\/([a-f0-9-]+)\/confirm$/i);
    if (coinRequest && req.method === "POST") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const r = await first(env.DB, "SELECT * FROM coin_purchase_requests WHERE id=?", coinRequest[1]);
      if (!r) return bad("Purchase request not found", 404);
      if (r.status !== "pending") return bad("Request already processed", 409);
      const w = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", r.client_id);
      if (!w) return bad("Client wallet not found", 404);
      const next = Number(w.balance) + Number(r.coins);
      await run(env.DB, "UPDATE client_coin_wallets SET balance=?,updated_at=datetime('now') WHERE client_id=?", next, r.client_id);
      await run(env.DB, "INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note,admin_reference) VALUES(?,?,?,'admin_credit',?,?,?,?)", uid(), r.client_id, r.email, r.coins, next, "Admin confirmed WhatsApp payment", r.id);
      await run(env.DB, "UPDATE coin_purchase_requests SET status='confirmed',updated_at=datetime('now') WHERE id=?", r.id);
      return out({ success: true, balance: next });
    }
    if (p === "/api/admin/coins/credit" && req.method === "POST") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const b = await readBody(req) || {}, email = str(b.email, 254).toLowerCase(), coins = Number(b.coins);
      if (!email || !Number.isInteger(coins) || coins < 1 || coins > 1e6) return bad("Valid email and coin amount required");
      const c = await first(env.DB, "SELECT id,email FROM client_accounts WHERE LOWER(email)=LOWER(?)", email);
      if (!c) return bad("Client email not found", 404);
      await run(env.DB, "INSERT OR IGNORE INTO client_coin_wallets(client_id,email,balance) VALUES(?,?,0)", c.id, c.email);
      const w = await first(env.DB, "SELECT balance FROM client_coin_wallets WHERE client_id=?", c.id), next = Number(w.balance) + coins;
      await run(env.DB, "UPDATE client_coin_wallets SET balance=?,updated_at=datetime('now') WHERE client_id=?", next, c.id);
      await run(env.DB, "INSERT INTO coin_transactions(id,client_id,email,type,coins,balance_after,note,admin_reference) VALUES(?,?,?,'admin_credit',?,?,?,?)", uid(), c.id, c.email, coins, next, str(b.note || "Manual WhatsApp payment", 300), str(b.reference, 120));
      return out({ success: true, client_id: c.id, balance: next });
    }
    if (p === "/api/admin/coin-transactions" && req.method === "GET") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      return out({ success: true, transactions: await all(env.DB, "SELECT * FROM coin_transactions ORDER BY created_at DESC LIMIT 500") });
    }
    if (p === "/api/public/settings" && req.method === "GET") {
      const rows = await all(env.DB, "SELECT key,value FROM settings"), settings = {};
      for (const r of rows) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      }
      return out({ success: true, settings });
    }
    if (p === "/api/public/contact-settings" && req.method === "GET") {
      const row = await first(env.DB, "SELECT value FROM settings WHERE key='contact_buttons'");
      let settings = { call: true, whatsapp: true };
      if (row?.value) {
        try {
          settings = { ...settings, ...JSON.parse(row.value) };
        } catch {
        }
      }
      return out({ success: true, settings });
    }
    if (p === "/api/public/categories" && req.method === "GET") return out({ success: true, categories: await all(env.DB, "SELECT * FROM categories WHERE active=1 ORDER BY sort_order,id") });
    if (p === "/api/public/form-fields" && req.method === "GET") return out({ success: true, fields: await all(env.DB, "SELECT id,label,field_type,required,options_json,sort_order FROM form_fields WHERE active=1 ORDER BY sort_order,id") });
    if (["/api/public/ads", "/api/public/search", "/api/public/filter"].includes(p) && req.method === "GET") {
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1), limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50)), w = ["ads.status='approved'"], a = [];
      for (const k of ["category", "district", "area"]) {
        const v = str(url.searchParams.get(k), 120);
        if (v) {
          w.push("ads." + k + "=?");
          a.push(v);
        }
      }
      const subcategory = str(url.searchParams.get("subcategory"), 100);
      if (subcategory) {
        w.push("json_extract(COALESCE(ads.details_json,'{}'),'$.subcategory')=?");
        a.push(subcategory);
      }
      const q = str(url.searchParams.get("q") || url.searchParams.get("keyword"), 120);
      if (q) {
        w.push("(ads.title LIKE ? OR ads.description LIKE ?)");
        a.push("%" + q + "%", "%" + q + "%");
      }
      const min = url.searchParams.get("min_price"), max = url.searchParams.get("max_price");
      if (min !== null && min !== "") {
        w.push("CAST(ads.price AS REAL)>=?");
        a.push(Number(min) || 0);
      }
      if (max !== null && max !== "") {
        w.push("CAST(ads.price AS REAL)<=?");
        a.push(Number(max) || 0);
      }
      const sort = url.searchParams.get("sort") === "price_low" ? "CAST(ads.price AS REAL) ASC" : url.searchParams.get("sort") === "price_high" ? "CAST(ads.price AS REAL) DESC" : "ads.created_at DESC";
      const vipTable = await table(env.DB, "vip_promotions");
      // Homepage feed: only currently active VIP placements from the seven approved homepage categories.
      // The normal public search/feed remains unchanged unless homepage=1 is explicitly requested.
      if (url.searchParams.get("homepage") === "1") {
        w.push("LOWER(TRIM(ads.category)) IN ('cars','bikes','mobiles','real estate','jobs','hotel rooms','fashion & beauty','personals')");
        if (vipTable) {
          w.push("EXISTS (SELECT 1 FROM vip_promotions hp WHERE hp.ad_id=ads.id AND LOWER(hp.status)='active' AND datetime(hp.created_at,'+'||hp.days||' days')>datetime('now'))");
        } else {
          w.push("1=0");
        }
      }
      const count = await first(env.DB, "SELECT COUNT(*) AS n FROM ads WHERE " + w.join(" AND "), ...a);
      const vipSelect = vipTable ? `,(SELECT p.days FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_days,(SELECT p.created_at FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_started_at,(SELECT datetime(p.created_at,'+'||p.days||' days') FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now') ORDER BY datetime(p.created_at) DESC,p.id DESC LIMIT 1) AS vip_expires_at` : `,NULL AS vip_days,NULL AS vip_started_at,NULL AS vip_expires_at`;
      const vipOrder = vipTable ? `CASE WHEN EXISTS(SELECT 1 FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now')) THEN 1 ELSE 0 END DESC, (SELECT MAX(p.created_at) FROM vip_promotions p WHERE p.ad_id=ads.id AND LOWER(p.status)='active' AND datetime(p.created_at,'+'||p.days||' days')>datetime('now')) DESC` : `0 DESC`;
      const order = vipOrder + `, ` + (url.searchParams.get("sort") === "price_low" || url.searchParams.get("sort") === "price_high" ? sort : "ads.created_at DESC");
      const rows = await all(env.DB, "SELECT ads.*" + vipSelect + " FROM ads WHERE " + w.join(" AND ") + ` ORDER BY ${order} LIMIT ? OFFSET ?`, ...a, limit, (page - 1) * limit);
      let contactPolicy = {};
      try { const cfg = await first(env.DB, "SELECT value FROM settings WHERE key='contact_policy'"); if (cfg?.value) contactPolicy = JSON.parse(cfg.value); } catch {}
      const ads = rows.map((row) => {
        try {
          row.subcategory = JSON.parse(row.details_json || "{}").subcategory || "";
        } catch {
          row.subcategory = "";
        }
        const category = String(row.category || "").trim().toLowerCase();
        let subcategory = "";
        try { subcategory = String(JSON.parse(row.details_json || "{}").subcategory || "").trim().toLowerCase(); } catch {}
        const key = `${category}|${subcategory}`;
        const mainKey = `${category}|*`;
        const policy = contactPolicy[key] || contactPolicy[mainKey] || {chat:true};
        row.can_chat = !!row.owner_client_id && policy.chat !== false;
        row.can_call = !!row.phone;
        row.can_whatsapp = !!(row.whatsapp || row.phone);
        delete row.owner_client_id;
        if (!row.can_call) row.phone = "";
        if (!row.can_whatsapp) row.whatsapp = "";
        const days = Number(row.vip_days) || 0;
        const started = row.vip_started_at ? Date.parse(String(row.vip_started_at).replace(" ", "T") + "Z") : 0;
        const expires = row.vip_expires_at ? Date.parse(String(row.vip_expires_at).replace(" ", "T") + "Z") : 0;
        return { ...row, plan: days ? `VIP ${days} Days` : row.plan || "Free", vipStartedAt: started || 0, vipExpiresAt: expires || 0 };
      });
      return out({ success: true, ads, total: count?.n || 0, page, limit });
    }
    if (p === "/api/public/districts" && req.method === "GET") {
      if (!await table(env.DB, "districts")) return out({ success: true, districts: [] });
      const c = await cols(env.DB, "districts"), sort = c.includes("name") ? "name" : c.includes("district_name") ? "district_name" : "id";
      return out({ success: true, districts: await all(env.DB, `SELECT * FROM districts ORDER BY ${sort}`) });
    }
    if (p === "/api/public/areas" && req.method === "GET") {
      const d = str(url.searchParams.get("district"), 100);
      if (!d) return bad("district query parameter is required");
      return out({ success: true, areas: await listAreas(env.DB, d) });
    }
    const imagePath = p.match(/^\/api\/images\/([a-zA-Z0-9._/-]+)$/);
    if (imagePath && req.method === "GET") {
      if (!env.IMAGES) return bad("R2 image storage is not configured", 503);
      const key = imagePath[1];
      if (key.includes("..")) return bad("Invalid image key", 400);
      const obj = await env.IMAGES.get(key);
      if (!obj) return bad("Image not found", 404);
      const headers = new Headers({ "Cache-Control": "public, max-age=86400", "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream" });
      return new Response(obj.body, { headers });
    }
    if (p === "/api/client/images/upload" && req.method === "POST") {
      const client = await clientAuth(req, env, env.DB);
      if (!client) return bad("Client login required", 401);
      if (!env.IMAGES) return bad("R2 image storage is not configured", 503);
      const form = await req.formData(), file = form.get("image");
      if (!file || typeof file.arrayBuffer !== "function") return bad("Image file is required", 400);
      const type = String(file.type || "").toLowerCase(), allowed = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
      if (!allowed.has(type)) return bad("Supported image formats: JPG, PNG, WEBP, GIF and AVIF", 415);
      if (file.size <= 0 || file.size > 5 * 1024 * 1024) return bad("Image must be between 1 byte and 5 MB", 413);
      const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1], key = `client-ads/${client.id}/${uid()}.${ext}`;
      await env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000" } });
      return out({ success: true, key, url: `${url.origin}/api/images/${key}` }, 201);
    }
    if (p === "/api/admin/images/upload" && req.method === "POST") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      if (!env.IMAGES) return bad("R2 image storage is not configured", 503);
      const form = await req.formData(), file = form.get("image") || form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") return bad("Image file is required (field: image)", 400);
      const type = String(file.type || "").toLowerCase(), allowed = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"]);
      if (!allowed.has(type)) return bad("Supported image formats: JPG, PNG, WEBP, GIF, AVIF and BMP", 415);
      if (file.size <= 0 || file.size > 5 * 1024 * 1024) return bad("Image must be between 1 byte and 5 MB", 413);
      const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1], key = `ads/${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}/${uid()}.${ext}`;
      await env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000" } });
      return out({ success: true, key, url: `${url.origin}/api/images/${key}`, size: file.size, contentType: type }, 201);
    }
    const imageDelete = p.match(/^\/api\/admin\/images\/(.+)$/);
    if (imageDelete && req.method === "DELETE") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      if (!env.IMAGES) return bad("R2 image storage is not configured", 503);
      const key = decodeURIComponent(imageDelete[1]);
      if (!key || key.includes("..")) return bad("Invalid image key", 400);
      await env.IMAGES.delete(key);
      return out({ success: true, key });
    }
    if (p.startsWith("/api/admin/") && !await isAdmin(req, env)) return bad("Admin login required", 401);
    if (p === "/api/admin/districts" && req.method === "GET") {
      if (!await table(env.DB, "districts")) return bad("Districts table is not available in D1", 404);
      const c = await cols(env.DB, "districts"), nameCol = c.includes("name") ? "name" : c.includes("district_name") ? "district_name" : null;
      if (!nameCol) return bad("District table must contain name or district_name column", 500);
      return out({ success: true, districts: await all(env.DB, `SELECT * FROM districts ORDER BY ${nameCol}`) });
    }
    if (p === "/api/admin/districts" && req.method === "POST") {
      if (!await table(env.DB, "districts")) return bad("Districts table is not available in D1", 404);
      const c = await cols(env.DB, "districts"), nameCol = c.includes("name") ? "name" : c.includes("district_name") ? "district_name" : null, b = await readBody(req) || {}, name = str(b.name, 100);
      if (!name) return bad("District name is required");
      if (!nameCol) return bad("District table must contain name or district_name column", 500);
      const exists = await first(env.DB, `SELECT id FROM districts WHERE LOWER(${nameCol})=LOWER(?)`, name);
      if (exists) return bad("District already exists", 409);
      await run(env.DB, `INSERT INTO districts(${nameCol}) VALUES(?)`, name);
      return out({ success: true });
    }
    const districtMatch = p.match(/^\/api\/admin\/districts\/(\d+)$/);
    if (districtMatch && req.method === "PUT") {
      if (!await table(env.DB, "districts")) return bad("Districts table is not available in D1", 404);
      const c = await cols(env.DB, "districts"), nameCol = c.includes("name") ? "name" : c.includes("district_name") ? "district_name" : null, b = await readBody(req) || {}, name = str(b.name, 100);
      if (!name) return bad("District name is required");
      if (!nameCol) return bad("District table must contain name or district_name column", 500);
      await run(env.DB, `UPDATE districts SET ${nameCol}=? WHERE id=?`, name, districtMatch[1]);
      return out({ success: true });
    }
    if (districtMatch && req.method === "DELETE") {
      if (!await table(env.DB, "districts")) return bad("Districts table is not available in D1", 404);
      if (await table(env.DB, "areas")) {
        const ac = await cols(env.DB, "areas");
        if (ac.includes("district_id")) {
          const used = await first(env.DB, "SELECT COUNT(*) AS n FROM areas WHERE district_id=?", districtMatch[1]);
          if (Number(used?.n) > 0) return bad("This district still has areas. Remove or move its areas first.", 409);
        }
      }
      await run(env.DB, "DELETE FROM districts WHERE id=?", districtMatch[1]);
      return out({ success: true });
    }
    if (p === "/api/admin/areas" && req.method === "GET") {
      if (!await table(env.DB, "areas")) return bad("Areas table is not available in D1", 404);
      const district = str(url.searchParams.get("district"), 100), ac = await cols(env.DB, "areas");
      if (!ac.includes("district_id") || !ac.includes("name")) return bad("Area table must contain district_id and name columns", 500);
      let districtId = Number(district);
      if (district && !districtId && await table(env.DB, "districts")) {
        const dc = await cols(env.DB, "districts"), dn = dc.includes("name") ? "name" : dc.includes("district_name") ? "district_name" : null;
        if (dn) {
          const d = await first(env.DB, `SELECT id FROM districts WHERE LOWER(${dn})=LOWER(?)`, district);
          districtId = Number(d?.id) || 0;
        }
      }
      const rows = district ? await all(env.DB, "SELECT * FROM areas WHERE district_id=? ORDER BY name", districtId) : await all(env.DB, "SELECT * FROM areas ORDER BY district_id,name");
      return out({ success: true, areas: rows });
    }
    if (p === "/api/admin/areas" && req.method === "POST") {
      if (!await table(env.DB, "areas")) return bad("Areas table is not available in D1", 404);
      const b = await readBody(req) || {}, ac = await cols(env.DB, "areas"), name = str(b.name, 120), districtId = Number(b.district_id);
      if (!name || !Number.isInteger(districtId) || districtId < 1) return bad("Area name and district are required");
      if (!ac.includes("district_id") || !ac.includes("name")) return bad("Area table must contain district_id and name columns", 500);
      if (await first(env.DB, "SELECT id FROM areas WHERE district_id=? AND LOWER(name)=LOWER(?)", districtId, name)) return bad("Area already exists in this district", 409);
      await run(env.DB, "INSERT INTO areas(district_id,name) VALUES(?,?)", districtId, name);
      return out({ success: true });
    }
    const areaMatch = p.match(/^\/api\/admin\/areas\/(\d+)$/);
    if (areaMatch && req.method === "PUT") {
      if (!await table(env.DB, "areas")) return bad("Areas table is not available in D1", 404);
      const b = await readBody(req) || {}, name = str(b.name, 120), districtId = Number(b.district_id), ac = await cols(env.DB, "areas");
      if (!name || !Number.isInteger(districtId) || districtId < 1 || !ac.includes("district_id") || !ac.includes("name")) return bad("Valid area name and district are required");
      await run(env.DB, "UPDATE areas SET name=?,district_id=? WHERE id=?", name, districtId, areaMatch[1]);
      return out({ success: true });
    }
    if (areaMatch && req.method === "DELETE") {
      if (!await table(env.DB, "areas")) return bad("Areas table is not available in D1", 404);
      await run(env.DB, "DELETE FROM areas WHERE id=?", areaMatch[1]);
      return out({ success: true });
    }
    if (p === "/api/admin/dashboard" && req.method === "GET") {
      const [a, k] = await Promise.all([first(env.DB, "SELECT COUNT(*) n FROM ads"), first(env.DB, "SELECT COUNT(*) n FROM categories")]);
      return out({ success: true, stats: { ads: a.n, categories: k.n } });
    }
    if (p === "/api/admin/categories" && req.method === "GET") return out({ success: true, categories: await all(env.DB, "SELECT * FROM categories WHERE parent_id IS NULL OR parent_id IN (SELECT id FROM categories WHERE parent_id IS NULL) ORDER BY sort_order,id") });
    if (p === "/api/admin/categories" && req.method === "POST") {
      const b = await readBody(req) || {}, name = str(b.name, 80), slug = str(b.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), 100), parentId = Number(b.parent_id);
      if (!name || !slug) return bad("Subcategory name and slug are required.");
      if (!Number.isInteger(parentId) || parentId <= 0) return bad("Select a valid main category for this subcategory.");
      const parent = await first(env.DB, "SELECT id,name,parent_id,active FROM categories WHERE id=?", parentId);
      if (!parent || parent.parent_id !== null && parent.parent_id !== void 0) return bad("Invalid parent. Subcategories must be directly under a main category.");
      if (!await isActiveMainCategory(env.DB, parent.name)) return bad("This parent is not an enabled main category.");
      if (Number(parent.active) !== 1) return bad("Cannot add a subcategory under an inactive main category.");
      if (await first(env.DB, "SELECT id FROM categories WHERE LOWER(name)=LOWER(?) AND parent_id=?", name, parentId)) return bad("This subcategory already exists under the selected category.", 409);
      if (await first(env.DB, "SELECT id FROM categories WHERE slug=?", slug)) return bad("This category URL slug is already in use.", 409);
      await run(env.DB, "INSERT INTO categories(name,slug,parent_id,icon,sort_order,active,created_at) VALUES(?,?,?,?,?,?,datetime('now'))", name, slug, parentId, str(b.icon || "\u25C6", 20), Math.max(0, Number(b.sort_order) || 0), b.active === false ? 0 : 1);
      return out({ success: true });
    }
    const cat = p.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (cat && req.method === "PUT") {
      const b = await readBody(req) || {}, id = Number(cat[1]), current = await first(env.DB, "SELECT * FROM categories WHERE id=?", id);
      if (!current) return bad("Category not found.", 404);
      if (!current.parent_id) return bad("Main categories are fixed. Only subcategories can be edited.");
      const name = str(b.name, 80), slug = str(b.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), 100), parentId = Number(b.parent_id || current.parent_id);
      if (!name || !slug) return bad("Subcategory name and slug are required.");
      const parent = await first(env.DB, "SELECT * FROM categories WHERE id=?", parentId);
      if (!parent || parent.parent_id !== null && parent.parent_id !== void 0 || !await isActiveMainCategory(env.DB, parent.name) || Number(parent.active) !== 1) return bad("Subcategory must belong directly to an active main category.");
      if (await first(env.DB, "SELECT id FROM categories WHERE slug=? AND id<>?", slug, id)) return bad("This URL slug is already in use.", 409);
      if (await first(env.DB, "SELECT id FROM categories WHERE LOWER(name)=LOWER(?) AND parent_id=? AND id<>?", name, parentId, id)) return bad("This subcategory already exists under the selected main category.", 409);
      await run(env.DB, "UPDATE categories SET name=?,slug=?,parent_id=?,icon=?,sort_order=?,active=? WHERE id=?", name, slug, parentId, str(b.icon || "\u25C6", 20), Math.max(0, Number(b.sort_order) || 0), b.active === false ? 0 : 1, id);
      return out({ success: true });
    }
    if (cat && req.method === "DELETE") {
      const id = Number(cat[1]), current = await first(env.DB, "SELECT * FROM categories WHERE id=?", id);
      if (!current) return bad("Category not found.", 404);
      if (!current.parent_id) return bad("The six main categories cannot be deleted.");
      const parent = await first(env.DB, "SELECT name FROM categories WHERE id=?", current.parent_id);
      const used = await first(env.DB, "SELECT COUNT(*) AS n FROM ads WHERE category=? AND json_extract(COALESCE(details_json,'{}'),'$.subcategory')=?", parent?.name || "", current.name);
      if (Number(used?.n) > 0) return bad("This subcategory is used by existing ads. Deactivate it instead of deleting.", 409);
      await run(env.DB, "DELETE FROM categories WHERE id=?", id);
      return out({ success: true });
    }
    if (p === "/api/admin/ads" && req.method === "GET") return out({ success: true, ads: await all(env.DB, "SELECT * FROM ads ORDER BY created_at DESC LIMIT 500") });
    if (p === "/api/admin/ads" && req.method === "POST") {
      const b = await readBody(req) || {}, a = safeAd(b, null, "approved");
      if (!a.title || !a.category || !a.district) return bad("Ad title, category and district are required");
      const categoryError = await validateAdCategory(env.DB, a.category, a.details_json);
      if (categoryError) return bad(categoryError);
      const contentError = await validateAdContent(env.DB, a);
      if (contentError) return bad(contentError);
      await saveAd(env.DB, a);
      let pricing = { "3": 300, "5": 500, "7": 700 };
      try {
        const pr = await first(env.DB, "SELECT value FROM settings WHERE key='vip_pricing'");
        if (pr?.value) pricing = { ...pricing, ...JSON.parse(pr.value) };
      } catch {
      }
      const vipAmount = Number(pricing["7"]) || 0;
      await run(env.DB, "INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))", a.id, 7, vipAmount, "active", "ADMIN_AUTO_VIP");
      return out({ success: true, id: a.id, status: "approved", plan: "VIP 7 Days", message: "Advertisement published with VIP card for 7 days" });
    }
    if (p === "/api/admin/ads/bulk" && req.method === "POST") {
      const b = await readBody(req) || {}, action = str(b.action || "create", 20), items = Array.isArray(b.ads) ? b.ads : [];
      if (action === "create") {
        if (!items.length || items.length > 100) return bad("Provide between 1 and 100 ads");
        const created = [];
        for (const item of items) {
          const a = safeAd(item, null, "approved");
          if (!a.title || !a.category || !a.district) return bad("Every ad requires title, category and district");
          const categoryError = await validateAdCategory(env.DB, a.category, a.details_json);
          if (categoryError) return bad(categoryError);
          const contentError = await validateAdContent(env.DB, a);
          if (contentError) return bad(contentError);
          await saveAd(env.DB, a);
          let pricing = { "3": 300, "5": 500, "7": 700 };
          try {
            const pr = await first(env.DB, "SELECT value FROM settings WHERE key='vip_pricing'");
            if (pr?.value) pricing = { ...pricing, ...JSON.parse(pr.value) };
          } catch {
          }
          const amount = Number(pricing["7"]) || 0;
          await run(env.DB, "INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))", a.id, 7, amount, "active", "ADMIN_BULK_VIP");
          created.push(a.id);
        }
        return out({ success: true, created: created.length, ids: created }, 201);
      }
      const ids = Array.isArray(b.ids) ? b.ids.map((x) => str(x, 100)).filter(Boolean) : [];
      if (!ids.length || ids.length > 500) return bad("Provide between 1 and 500 ad IDs");
      if (action === "delete") {
        for (const id of ids) {
          const row = await first(env.DB, "SELECT image_url FROM ads WHERE id=?", id);
          if (row?.image_url && env.IMAGES) {
            const m = String(row.image_url).match(/\/api\/images\/(.+)$/);
            if (m) await env.IMAGES.delete(m[1]).catch(() => {
            });
          }
          await run(env.DB, "DELETE FROM ads WHERE id=?", id);
        }
        return out({ success: true, deleted: ids.length });
      }
      if (action === "status") {
        if (!["approved", "paused", "rejected", "pending"].includes(b.status)) return bad("Invalid bulk ad status");
        for (const id of ids) await run(env.DB, "UPDATE ads SET status=? WHERE id=?", b.status, id);
        return out({ success: true, updated: ids.length, status: b.status });
      }
      return bad("Bulk action must be create, delete or status");
    }
    const ad = p.match(/^\/api\/admin\/ads\/([^/]+)$/);
    if (ad && req.method === "PATCH") {
      const b = await readBody(req) || {};
      if (b.status) {
        if (!["pending", "approved", "rejected", "paused"].includes(b.status)) return bad("Invalid ad status");
        await run(env.DB, "UPDATE ads SET status=? WHERE id=?", b.status, ad[1]);
      } else {
        const a = safeAd(b, null);
        const categoryError = await validateAdCategory(env.DB, a.category, a.details_json);
        if (categoryError) return bad(categoryError);
        const contentError = await validateAdContent(env.DB, a);
        if (contentError) return bad(contentError);
        await run(env.DB, "UPDATE ads SET title=?,description=?,category=?,district=?,area=?,price=?,phone=?,whatsapp=?,image_url=?,details_json=? WHERE id=?", a.title, a.description, a.category, a.district, a.area, a.price, a.phone, a.whatsapp, a.image_url, a.details_json, ad[1]);
      }
      return out({ success: true });
    }
    if (ad && req.method === "DELETE") {
      const adRow = await first(env.DB, "SELECT image_url FROM ads WHERE id=?", ad[1]);
      if (adRow?.image_url && env.IMAGES) {
        const m = String(adRow.image_url).match(/\/api\/images\/(.+)$/);
        if (m) await env.IMAGES.delete(m[1]).catch(() => {
        });
      }
      await run(env.DB, "DELETE FROM ads WHERE id=?", ad[1]);
      return out({ success: true });
    }
    if (p === "/api/admin/settings" && req.method === "GET") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const rows = await all(env.DB, "SELECT key,value FROM settings"), settings = {};
      for (const r of rows) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      }
      return out({ success: true, settings });
    }
    if (p === "/api/admin/settings" && req.method === "PUT") {
      if (!await isAdmin(req, env)) return bad("Admin login required", 401);
      const b = await readBody(req) || {};
      for (const [k, v] of Object.entries(b)) {
        if (!/^[a-z][a-z0-9_]{0,39}$/i.test(k)) return bad("Invalid settings key");
        if (k === "contact") {
          const n = digits(v?.whatsapp_number);
          if (!validMobile(n)) return bad("Enter a valid 10-digit WhatsApp number.");
          await run(env.DB, "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, JSON.stringify({ whatsapp_number: n, phone: str(v?.phone, 20), email: str(v?.email, 254) }));
          continue;
        }
        if (k === "free_ads") {
          const limit = Number(v?.limit), period = Number(v?.period_days);
          if (!Number.isInteger(limit) || limit < 0 || limit > 1e3 || ![1, 7, 15, 30, 60, 90, 180, 365].includes(period)) return bad("Invalid free-ad settings.");
        }
        if (k === "vip_pricing") {
          for (const d of ["3", "5", "7"]) {
            const n = Number(v?.[d]);
            if (!Number.isFinite(n) || n < 0 || n > 1e6) return bad("VIP prices must be valid non-negative amounts.");
          }
        }
        if (k === "site" && v?.logo_url) {
          if (!/^https?:\/\//i.test(String(v.logo_url))) return bad("Logo URL must begin with http:// or https://.");
        }
        if (k === "moderation") {
          if (typeof v?.enabled !== "boolean" || typeof v?.image_enabled !== "boolean") return bad("Invalid moderation settings.");
          if (String(v?.blocked_words || "").length > 5e3) return bad("Blocked word list is too long.");
          for (const n of [v?.general_sexy_threshold, v?.massage_sexy_threshold]) if (n !== void 0 && (!Number.isFinite(Number(n)) || Number(n) < 0 || Number(n) > 1)) return bad("Image safety thresholds must be between 0 and 1.");
        }
        if (k === "coin_packages") {
          if (!Array.isArray(v) || v.length < 1 || v.length > 10) return bad("Provide 1 to 10 coin packages.");
          for (const x of v) {
            if (![1e3, 2e3, 3e3, 4e3, 5e3].includes(Number(x.coins)) || !Number.isFinite(Number(x.amount)) || Number(x.amount) < 0 || Number(x.amount) > 1e7) return bad("Coin packages must use the supported 1000, 2000, 3000, 4000 or 5000 coin levels with valid rupee amounts.");
          }
        }
        await run(env.DB, "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", str(k, 80), JSON.stringify(v));
      }
      return out({ success: true, message: "Settings saved." });
    }
    if (p === "/api/admin/contact-settings" && req.method === "GET") {
      const row = await first(env.DB, "SELECT value FROM settings WHERE key='contact_buttons'");
      let settings = { call: true, whatsapp: true };
      if (row?.value) {
        try {
          settings = { ...settings, ...JSON.parse(row.value) };
        } catch {
        }
      }
      return out({ success: true, settings });
    }
    if (p === "/api/admin/contact-settings" && req.method === "PUT") {
      const b = await readBody(req) || {}, settings = { call: b.call !== false, whatsapp: b.whatsapp !== false };
      await run(env.DB, "INSERT INTO settings(key,value) VALUES('contact_buttons',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(settings));
      return out({ success: true, settings });
    }
    if (p === "/api/admin/form-fields" && req.method === "GET") return out({ success: true, fields: await all(env.DB, "SELECT * FROM form_fields ORDER BY sort_order,id") });
    if (p === "/api/admin/form-fields" && req.method === "POST") {
      const b = await readBody(req) || {};
      if (!str(b.label, 100)) return bad("Field label required");
      await run(env.DB, "INSERT INTO form_fields(label,field_type,required,options_json,sort_order,active) VALUES(?,?,?,?,?,1)", str(b.label, 100), str(b.field_type || "text", 30), b.required ? 1 : 0, JSON.stringify(Array.isArray(b.options) ? b.options : []), Number(b.sort_order) || 0);
      return out({ success: true });
    }
    const formField = p.match(/^\/api\/admin\/form-fields\/(\d+)$/);
    if (formField && req.method === "DELETE") {
      await run(env.DB, "DELETE FROM form_fields WHERE id=?", formField[1]);
      return out({ success: true });
    }
    const vipActivate = p.match(/^\/api\/admin\/vip\/(\d+)\/activate$/);
    if (vipActivate && req.method === "POST") {
      const id = Number(vipActivate[1]);
      const promo = await first(env.DB, "SELECT id,ad_id,days,status FROM vip_promotions WHERE id=?", id);
      if (!promo) return bad("VIP promotion record not found", 404);
      const ad2 = await first(env.DB, "SELECT id,status FROM ads WHERE id=?", promo.ad_id);
      if (!ad2 || ad2.status !== "approved") return bad("Only a published ad can be activated as VIP", 400);
      await run(env.DB, "UPDATE vip_promotions SET status='active',created_at=datetime('now') WHERE id=?", id);
      return out({ success: true, status: "active", message: "VIP placement activated. Confirm payment before using this action." });
    }
    if (p === "/api/admin/vip" && req.method === "GET") return out({ success: true, promotions: await all(env.DB, "SELECT * FROM vip_promotions ORDER BY created_at DESC LIMIT 200") });
    if (p === "/api/admin/vip" && req.method === "POST") {
      const b = await readBody(req) || {}, days = Number(b.days) || 3;
      let prices = { "3": 300, "5": 500, "7": 700 };
      try {
        const pr = await first(env.DB, "SELECT value FROM settings WHERE key='vip_pricing'");
        if (pr?.value) prices = { ...prices, ...JSON.parse(pr.value) };
      } catch {
      }
      const amount = Number(prices[String(days)]);
      if (![3, 5, 7].includes(days) || !Number.isFinite(amount) || !str(b.ad_id, 100)) return bad("Invalid VIP promotion plan or Ad ID");
      await run(env.DB, "INSERT INTO vip_promotions(ad_id,days,amount,status,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))", str(b.ad_id, 100), days, amount, "pending", str(b.reference, 120));
      return out({ success: true, amount });
    }
    return bad("API route not found", 404);
  } catch (e) {
    console.error("24Adz.com API error", e);
    return bad("Internal server error. Check Worker logs.", 500);
  }
} };
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
