// 24Adz SEO landing-page routing. This module is additive and does not alter homepage assets.
const seoEscape = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const seoSlug = (v) => String(v ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const seoResponse = (body, status = 200, noindex = false, method = "GET") => new Response(
  method === "HEAD" ? null : body,
  { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=120, s-maxage=600",
    ...(noindex ? { "X-Robots-Tag": "noindex, follow" } : {})
  }}
);
const seoPage = ({ title, description, canonical, heading, intro, ads = [], crumbs = [], relatedLinks = [], noindex = false }) => {
  const crumbHtml = crumbs.map((c) => `<span class="sep">›</span><a href="${seoEscape(c.url)}">${seoEscape(c.label)}</a>`).join("");
  const cards = ads.map((ad) => `<article class="ad-card">
    ${ad.image_url ? `<img src="${seoEscape(ad.image_url)}" alt="${seoEscape(ad.title)}" loading="lazy">` : ""}
    <div><h2>${seoEscape(ad.title)}</h2>
    ${ad.price ? `<p class="price">${seoEscape(ad.price)}</p>` : ""}
    <p>${seoEscape(ad.description || "")}</p>
    <p class="place">${[ad.area, ad.district].filter(Boolean).map(seoEscape).join(", ")}</p></div>
  </article>`).join("");
  const schema = JSON.stringify({
    "@context": "https://schema.org", "@type": "CollectionPage",
    "name": title, "description": description, "url": canonical,
    "mainEntity": { "@type": "ItemList", "numberOfItems": ads.length,
      "itemListElement": ads.map((ad, i) => ({ "@type": "ListItem", "position": i + 1,
        "item": { "@type": "Thing", "name": ad.title } })) }
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${seoEscape(title)}</title><meta name="description" content="${seoEscape(description)}">
<link rel="canonical" href="${seoEscape(canonical)}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow"}">
<meta property="og:type" content="website"><meta property="og:title" content="${seoEscape(title)}">
<meta property="og:description" content="${seoEscape(description)}"><meta property="og:url" content="${seoEscape(canonical)}">
<script type="application/ld+json">${schema}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#171717;font:16px/1.55 Arial,sans-serif}
.site-head{background:#111;color:#fff;padding:17px max(16px,calc((100% - 1100px)/2));border-bottom:4px solid #f58220}
.site-head a{color:#fff;text-decoration:none;font-weight:800;font-size:24px}
main{max-width:1100px;margin:24px auto;padding:0 16px}
nav{font-size:14px;margin-bottom:18px;color:#555}nav a{color:#b65308;text-decoration:none}.sep{padding:0 7px;color:#999}
h1{font-size:30px;line-height:1.2;margin:10px 0}.intro{color:#555;margin:8px 0 22px}
.ad-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}
.ad-card{display:flex;gap:12px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:12px;min-height:112px}
.ad-card img{width:112px;height:112px;object-fit:cover;border-radius:8px;background:#eee}
.ad-card h2{font-size:18px;margin:0 0 5px}.ad-card p{margin:4px 0;color:#555;font-size:14px}
.ad-card .price{color:#c45b09;font-weight:700;font-size:16px}.ad-card .place{font-weight:600}
.empty{background:#fff;border-radius:12px;padding:22px;color:#555}
.related-links{margin:28px 0;padding:18px;background:#fff;border:1px solid #e5e5e5;border-radius:12px}.related-links h2{font-size:19px;margin:0 0 10px}.related-links ul{display:flex;flex-wrap:wrap;gap:9px 18px;padding-left:20px;margin:0}.related-links a{color:#a94d08;text-decoration:underline}
footer{max-width:1100px;margin:35px auto;padding:16px;color:#777;font-size:13px}
@media(max-width:520px){h1{font-size:25px}.ad-card img{width:90px;height:90px}}
</style></head><body><header class="site-head"><a href="https://www.24adz.com/">24Adz.com</a></header>
<main><nav aria-label="Breadcrumb"><a href="https://www.24adz.com/">Home</a>${crumbHtml}</nav>
<h1>${seoEscape(heading)}</h1><p class="intro">${seoEscape(intro)}</p>
${ads.length ? `<section class="ad-grid" aria-label="Published advertisements">${cards}</section>` :
`<section class="empty"><h2>No published ads yet</h2><p>There are currently no approved advertisements for this selection. Please check again later.</p></section>`}
${relatedLinks.length ? `<section class="related-links"><h2>Explore more on 24Adz</h2><ul>${relatedLinks.map(x => `<li><a href="${seoEscape(x.url)}">${seoEscape(x.label)}</a></li>`).join("")}</ul></section>` : ""}
</main><footer>© ${new Date().getFullYear()} 24Adz.com · Tamil Nadu Classifieds</footer></body></html>`;
};


const sitemapResponse = (xml, method = "GET") => new Response(method === "HEAD" ? null : xml, {
  status: 200,
  headers: {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=1800",
    "X-Content-Type-Options": "nosniff"
  }
});
async function buildSitemap(env) {
  const base = "https://www.24adz.com";
  const urls = new Map();
  const today = new Date().toISOString().slice(0, 10);
  const add = (path, lastmod) => {
    const clean = `/${String(path || "").split("/").filter(Boolean).join("/")}${path === "/" ? "" : "/"}`;
    urls.set(clean, String(lastmod || today).slice(0, 10));
  };
  add("/");
  add("/tamil-nadu/");
  const [catResult, districtResult, areaResult, adsResult] = await Promise.all([
    env.DB.prepare("SELECT id,name,slug,parent_id FROM categories WHERE active=1 ORDER BY sort_order,id").all(),
    env.DB.prepare("SELECT id,name FROM districts ORDER BY name").all(),
    env.DB.prepare("SELECT id,name,district_id FROM areas ORDER BY name").all(),
    env.DB.prepare("SELECT id,category,district,area,details_json,created_at FROM ads WHERE status='approved' AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) ORDER BY created_at DESC LIMIT 20000").all()
  ]);
  const cats = catResult.results || [], districts = districtResult.results || [], areas = areaResult.results || [], ads = adsResult.results || [];
  const mains = cats.filter(c => c.parent_id === null);
  const subs = cats.filter(c => c.parent_id !== null);
  const mainByName = new Map(mains.map(c => [String(c.name).trim().toLowerCase(), c]));
  const subByKey = new Map(subs.map(c => [`${c.parent_id}:${String(c.name).trim().toLowerCase()}`, c]));
  const districtByName = new Map(districts.map(d => [String(d.name).trim().toLowerCase(), d]));
  const areaByDistrictAndName = new Map(areas.map(a => [`${a.district_id}:${String(a.name).trim().toLowerCase()}`, a]));
  for (const ad of ads) {
    const main = mainByName.get(String(ad.category || "").trim().toLowerCase());
    if (!main) continue;
    const mainSlug = seoSlug(main.slug || main.name);
    add(`/${mainSlug}/`, ad.created_at);
    let subName = "";
    try { subName = JSON.parse(ad.details_json || "{}").subcategory || ""; } catch {}
    const sub = subByKey.get(`${main.id}:${String(subName).trim().toLowerCase()}`);
    if (sub) add(`/${mainSlug}/${seoSlug(sub.slug || sub.name)}/`, ad.created_at);
    const district = districtByName.get(String(ad.district || "").trim().toLowerCase());
    if (!district) continue;
    const dSlug = seoSlug(district.name);
    add(`/tamil-nadu/${dSlug}/`, ad.created_at);
    add(`/tamil-nadu/${dSlug}/${mainSlug}/`, ad.created_at);
    if (sub) add(`/tamil-nadu/${dSlug}/${mainSlug}/${seoSlug(sub.slug || sub.name)}/`, ad.created_at);
    if (ad.area) {
      const area = areaByDistrictAndName.get(`${district.id}:${String(ad.area).trim().toLowerCase()}`);
      if (!area) continue;
      const aSlug = seoSlug(area.name);
      add(`/tamil-nadu/${dSlug}/${aSlug}/`, ad.created_at);
      add(`/tamil-nadu/${dSlug}/${aSlug}/${mainSlug}/`, ad.created_at);
      if (sub) add(`/tamil-nadu/${dSlug}/${aSlug}/${mainSlug}/${seoSlug(sub.slug || sub.name)}/`, ad.created_at);
    }
  }
  if (ads.length) add("/tamil-nadu/");
  const xmlEscape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const body = [...urls.entries()].map(([path, lastmod]) =>
    `<url><loc>${xmlEscape(base + path)}</loc><lastmod>${lastmod}</lastmod></url>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

const makeLink = (label, url) => ({ label, url });

export async function handleSeoRequest(req, env) {
  if (!["GET", "HEAD"].includes(req.method)) return null;
  const url = new URL(req.url);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return seoResponse("<h1>Bad URL</h1>", 400, true, req.method); }
  path = path.replace(/\/+/g, "/");
  const cleanPath = path.replace(/\/+$/, "") || "/";
  if (cleanPath === "/sitemap.xml") {
    if (!env.DB) return new Response("Sitemap temporarily unavailable", { status: 503 });
    try { return sitemapResponse(await buildSitemap(env), req.method); }
    catch (error) { console.error("24Adz sitemap error:", error); return new Response("Sitemap temporarily unavailable", { status: 503 }); }
  }
  if (cleanPath === "/" || cleanPath.startsWith("/api/") || cleanPath.startsWith("/admin")) return null;
  // Static assets and files must continue through the existing ASSETS binding.
  if (/\.[a-z0-9]{2,8}$/i.test(cleanPath)) return null;
  if (!env.DB) return null;

  try {
    const parts = cleanPath.split("/").filter(Boolean);
    const categories = (await env.DB.prepare(
      "SELECT id,name,slug,parent_id,active FROM categories WHERE active=1 ORDER BY sort_order,id"
    ).all()).results || [];
    const mains = categories.filter(x => x.parent_id === null);
    const subs = categories.filter(x => x.parent_id !== null);
    const districts = (await env.DB.prepare("SELECT id,name FROM districts ORDER BY name").all()).results || [];
    const bySlug = (rows, slug) => rows.find(x => seoSlug(x.slug || x.name) === slug);
    const getCategory = (slug) => {
      const main = bySlug(mains, slug);
      if (main) return { main, sub: null };
      const sub = bySlug(subs, slug);
      if (!sub) return null;
      return { main: mains.find(x => Number(x.id) === Number(sub.parent_id)) || null, sub };
    };
    const categoryLinksFor = (prefix = "") => mains.flatMap(main => {
      const mainSlug = seoSlug(main.slug || main.name);
      const mainUrl = `${prefix}/${mainSlug}/`.replace(/\/+/g, "/");
      const children = subs.filter(sub => Number(sub.parent_id) === Number(main.id));
      return [makeLink(main.name, mainUrl), ...children.map(sub => makeLink(`${main.name} - ${sub.name}`, `${prefix}/${mainSlug}/${seoSlug(sub.slug || sub.name)}/`.replace(/\/+/g, "/")))];
    });
    if (cleanPath === "/tamil-nadu") {
      const links = [...categoryLinksFor(), ...districts.map(d => makeLink(`${d.name} Classified Ads`, `/tamil-nadu/${seoSlug(d.name)}/`))];
      const html = seoPage({ title: "Tamil Nadu Classified Ads | 24Adz.com", description: "Browse classified advertisements across Tamil Nadu by category, district and local area on 24Adz.com.", canonical: "https://www.24adz.com/tamil-nadu/", heading: "Tamil Nadu Classified Ads", intro: "Explore categories and local classified listings across all Tamil Nadu districts.", ads: [], crumbs: [], relatedLinks: links, noindex: false });
      return seoResponse(html, 200, false, req.method);
    }

    let district = null, area = null, mainCategory = null, subcategory = null;
    let seoRoute = false;
    if (parts[0] === "tamil-nadu") {
      seoRoute = true;
      if (parts.length < 2) return seoResponse("<h1>District not specified</h1>", 404, true, req.method);
      district = bySlug(districts, parts[1]);
      if (!district) return seoResponse("<h1>District page not found</h1>", 404, true, req.method);
      const rest = parts.slice(2);
      if (rest.length) {
        let cat = getCategory(rest[0]);
        if (cat) {
          mainCategory = cat.main; subcategory = cat.sub;
          if (!mainCategory) return seoResponse("<h1>Category not found</h1>", 404, true, req.method);
          if (rest.length > 2) return seoResponse("<h1>Page not found</h1>", 404, true, req.method);
          if (rest.length === 2) {
            const subCat = getCategory(rest[1]);
            if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id))
              return seoResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
            subcategory = subCat.sub;
          }
        } else {
          const areaRows = (await env.DB.prepare("SELECT id,name FROM areas WHERE district_id=? ORDER BY name").bind(district.id).all()).results || [];
          area = bySlug(areaRows, rest[0]);
          if (!area) return seoResponse("<h1>Area page not found</h1>", 404, true, req.method);
          if (rest.length > 1) {
            cat = getCategory(rest[1]);
            if (!cat?.main) return seoResponse("<h1>Category not found</h1>", 404, true, req.method);
            mainCategory = cat.main; subcategory = cat.sub;
            if (rest.length > 3) return seoResponse("<h1>Page not found</h1>", 404, true, req.method);
            if (rest.length === 3) {
              const subCat = getCategory(rest[2]);
              if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id))
                return seoResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
              subcategory = subCat.sub;
            }
          }
        }
      }
    } else {
      const cat = getCategory(parts[0]);
      if (!cat?.main) return null;
      seoRoute = true; mainCategory = cat.main; subcategory = cat.sub;
      if (parts.length > 2) return seoResponse("<h1>Page not found</h1>", 404, true, req.method);
      if (parts.length === 2) {
        const subCat = getCategory(parts[1]);
        if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id))
          return seoResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
        subcategory = subCat.sub;
      }
    }
    if (!seoRoute) return null;

    const where = ["ads.status='approved'", "(ads.expires_at IS NULL OR datetime(ads.expires_at)>datetime('now'))"];
    const values = [];
    if (mainCategory) { where.push("LOWER(TRIM(ads.category))=LOWER(?)"); values.push(mainCategory.name); }
    if (district) { where.push("LOWER(TRIM(ads.district))=LOWER(?)"); values.push(district.name); }
    if (area) { where.push("LOWER(TRIM(ads.area))=LOWER(?)"); values.push(area.name); }
    if (subcategory) {
      where.push("LOWER(TRIM(COALESCE(json_extract(ads.details_json,'$.subcategory'),'')))=LOWER(?)");
      values.push(subcategory.name);
    }
    const ads = (await env.DB.prepare(
      `SELECT id,title,description,category,district,area,price,image_url,created_at
       FROM ads WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC LIMIT 60`
    ).bind(...values).all()).results || [];

    const labels = [];
    if (subcategory) labels.push(subcategory.name);
    else if (mainCategory) labels.push(mainCategory.name);
    if (area) labels.push(area.name);
    if (district) labels.push(district.name);
    const locationText = [area?.name, district?.name, "Tamil Nadu"].filter(Boolean).join(", ");
    const heading = labels.length ? `${labels.join(" in ")} Classified Ads` : "Tamil Nadu Classified Ads";
    const title = `${heading} | 24Adz Tamil Nadu Classifieds`;
    const description = `Find ${subcategory?.name || mainCategory?.name || "classified"} ads${locationText ? ` in ${locationText}` : " across Tamil Nadu"}. Browse latest listings, compare prices and contact advertisers on 24Adz.com.`;
    const canonical = `https://www.24adz.com${cleanPath}/`;
    const crumbs = [];
    if (district) crumbs.push({ label: "Tamil Nadu", url: "/tamil-nadu/" }, { label: district.name, url: `/tamil-nadu/${seoSlug(district.name)}/` });
    if (area) crumbs.push({ label: area.name, url: `/tamil-nadu/${seoSlug(district.name)}/${seoSlug(area.name)}/` });
    if (mainCategory) crumbs.push({ label: mainCategory.name,
      url: district ? `/tamil-nadu/${seoSlug(district.name)}/${area ? `${seoSlug(area.name)}/` : ""}${mainCategory.slug}/` : `/${mainCategory.slug}/` });
    if (subcategory) crumbs.push({ label: subcategory.name,
      url: district ? `/tamil-nadu/${seoSlug(district.name)}/${area ? `${seoSlug(area.name)}/` : ""}${mainCategory.slug}/${subcategory.slug}/` : `/${mainCategory.slug}/${subcategory.slug}/` });
    let relatedLinks = [];
    if (area && district) {
      relatedLinks = categoryLinksFor(`/tamil-nadu/${seoSlug(district.name)}/${seoSlug(area.name)}`);
    } else if (district) {
      const areaRows = (await env.DB.prepare("SELECT id,name FROM areas WHERE district_id=? ORDER BY name").bind(district.id).all()).results || [];
      relatedLinks = [
        ...categoryLinksFor(`/tamil-nadu/${seoSlug(district.name)}`),
        ...areaRows.map(a => makeLink(`${a.name} Classified Ads`, `/tamil-nadu/${seoSlug(district.name)}/${seoSlug(a.name)}/`))
      ];
    } else if (mainCategory) {
      relatedLinks = districts.map(d => makeLink(`${mainCategory.name} in ${d.name}`, `/tamil-nadu/${seoSlug(d.name)}/${seoSlug(mainCategory.slug || mainCategory.name)}/`));
      if (subcategory) relatedLinks = districts.map(d => makeLink(`${subcategory.name} in ${d.name}`, `/tamil-nadu/${seoSlug(d.name)}/${seoSlug(mainCategory.slug || mainCategory.name)}/${seoSlug(subcategory.slug || subcategory.name)}/`));
    }
    const html = seoPage({ title, description, canonical, heading,
      intro: `Find approved ${subcategory?.name || mainCategory?.name || "classified"} advertisements${locationText ? ` in ${locationText}` : " across Tamil Nadu"}.`,
      ads, crumbs, relatedLinks, noindex: ads.length === 0 });
    return seoResponse(html, 200, ads.length === 0, req.method);
  } catch (error) {
    console.error("24Adz SEO routing error:", error);
    return seoResponse("<!doctype html><html><head><meta name=\"robots\" content=\"noindex\"></head><body><h1>Page temporarily unavailable</h1></body></html>", 503, true, req.method);
  }
}
