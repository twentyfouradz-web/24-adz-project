// 24Adz SEO landing pages and dynamic sitemap.
// Reads the live D1 category, district, area and approved-ad data. No schema writes.

const BASE_URL = "https://www.24adz.com";
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const slug = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const urlFor = (path) => `${BASE_URL}${path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`}`;
const htmlResponse = (body, status = 200, noindex = false, method = "GET") => new Response(
  method === "HEAD" ? null : body,
  { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=120, s-maxage=600",
    "X-Content-Type-Options": "nosniff",
    ...(noindex ? { "X-Robots-Tag": "noindex, follow" } : {})
  }}
);
const xmlResponse = (xml, method = "GET") => new Response(method === "HEAD" ? null : xml, {
  status: 200,
  headers: {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=1800",
    "X-Content-Type-Options": "nosniff"
  }
});
const isLiveAd = "ads.status='approved' AND (ads.expires_at IS NULL OR datetime(ads.expires_at)>datetime('now'))";

async function getDirectory(env) {
  const [catResult, districtResult] = await Promise.all([
    env.DB.prepare("SELECT id,name,slug,parent_id,sort_order FROM categories WHERE active=1 ORDER BY sort_order,id").all(),
    env.DB.prepare("SELECT id,name FROM districts ORDER BY name").all()
  ]);
  const categories = catResult.results || [];
  const districts = districtResult.results || [];
  const mains = categories.filter((c) => c.parent_id === null || c.parent_id === undefined);
  const subs = categories.filter((c) => c.parent_id !== null && c.parent_id !== undefined);
  const areasResult = await env.DB.prepare("SELECT id,district_id,name FROM areas ORDER BY name").all();
  const areas = areasResult.results || [];
  const areasByDistrict = new Map();
  for (const area of areas) {
    const key = String(area.district_id);
    if (!areasByDistrict.has(key)) areasByDistrict.set(key, []);
    areasByDistrict.get(key).push(area);
  }
  return { categories, mains, subs, districts, areas, areasByDistrict };
}

function makeLinks(items, href, label = (item) => item.name) {
  return items.map((item) => `<a href="${esc(href(item))}">${esc(label(item))}</a>`).join("");
}

function renderPage({ title, description, canonical, heading, intro, ads = [], crumbs = [], sections = [], noindex = false, lastmod }) {
  const crumbItems = [{ label: "Home", url: "/" }, ...crumbs];
  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": crumbItems.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: urlFor(c.url) }))
  };
  const collectionSchema = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: title,
    description, url: canonical, dateModified: lastmod || undefined,
    mainEntity: { "@type": "ItemList", numberOfItems: ads.length,
      itemListElement: ads.slice(0, 60).map((ad, i) => ({ "@type": "ListItem", position: i + 1,
        item: { "@type": "Thing", name: ad.title } })) }
  };
  const cards = ads.map((ad) => `<article class="ad-card">
    ${ad.image_url ? `<img src="${esc(ad.image_url)}" alt="${esc(ad.title)}" loading="lazy" decoding="async">` : ""}
    <div><h2>${esc(ad.title)}</h2>${ad.price ? `<p class="price">${esc(ad.price)}</p>` : ""}
    ${ad.description ? `<p>${esc(ad.description)}</p>` : ""}
    <p class="place">${esc([ad.area, ad.district].filter(Boolean).join(", "))}</p></div>
  </article>`).join("");
  const sectionHtml = sections.filter((s) => s.items?.length).map((s) =>
    `<section class="link-section"><h2>${esc(s.title)}</h2><div class="link-grid">${s.items.map((x) =>
      `<a href="${esc(x.url)}">${esc(x.label)}</a>`).join("")}</div></section>`).join("");
  const crumbHtml = crumbItems.map((c, i) => i === 0
    ? `<a href="/">${esc(c.label)}</a>`
    : `<span class="sep">›</span><a href="${esc(c.url)}">${esc(c.label)}</a>`).join("");
  const jsonLd = JSON.stringify([breadcrumbSchema, collectionSchema]).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}">
<meta property="og:type" content="website"><meta property="og:site_name" content="24Adz.com"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
<script type="application/ld+json">${jsonLd}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#171717;font:16px/1.55 Arial,sans-serif}
.site-head{background:#111;color:#fff;padding:17px max(16px,calc((100% - 1100px)/2));border-bottom:4px solid #f58220}
.site-head a{color:#fff;text-decoration:none;font-weight:800;font-size:24px}main{max-width:1100px;margin:24px auto;padding:0 16px}
nav{font-size:14px;margin-bottom:18px;color:#555}nav a{color:#b65308;text-decoration:none}.sep{padding:0 7px;color:#999}
h1{font-size:30px;line-height:1.2;margin:10px 0}.intro{color:#555;margin:8px 0 22px}
.ad-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}
.ad-card{display:flex;gap:12px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:12px;min-height:112px}
.ad-card img{width:112px;height:112px;object-fit:cover;border-radius:8px;background:#eee}.ad-card h2{font-size:18px;margin:0 0 5px}
.ad-card p{margin:4px 0;color:#555;font-size:14px}.ad-card .price{color:#c45b09;font-weight:700;font-size:16px}.ad-card .place{font-weight:600}
.link-section{margin:24px 0;background:#fff;border:1px solid #e7e7e7;border-radius:12px;padding:16px}
.link-section h2{font-size:20px;margin:0 0 12px}.link-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px 16px}
.link-grid a{color:#a94f08;text-decoration:none;padding:4px 0}.link-grid a:hover{text-decoration:underline}
.empty{background:#fff;border-radius:12px;padding:22px;color:#555}.directory-note{color:#555}
footer{max-width:1100px;margin:35px auto;padding:16px;color:#777;font-size:13px}
@media(max-width:520px){h1{font-size:25px}.ad-card img{width:90px;height:90px}}
</style></head><body><header class="site-head"><a href="${BASE_URL}/">24Adz.com</a></header>
<main><nav aria-label="Breadcrumb">${crumbHtml}</nav><h1>${esc(heading)}</h1><p class="intro">${esc(intro)}</p>
${ads.length ? `<section class="ad-grid" aria-label="Published advertisements">${cards}</section>` : `<section class="empty"><h2>No published ads yet</h2><p>This directory is ready. New approved advertisements will appear here when available.</p></section>`}
${sectionHtml}</main><footer>© ${new Date().getFullYear()} 24Adz.com · Tamil Nadu Classifieds</footer></body></html>`;
}

async function buildSitemap(env) {
  const directory = await getDirectory(env);
  const { mains, subs, districts, areasByDistrict } = directory;
  const urls = new Map();
  const add = (path, lastmod) => {
    const normalized = path === "/" ? "/" : `/${path.split("/").filter(Boolean).join("/")}/`;
    const date = String(lastmod || new Date().toISOString()).slice(0, 10);
    if (!urls.has(normalized) || date > urls.get(normalized)) urls.set(normalized, date);
  };
  add("/");
  // Stable directory URLs: all active categories, districts and known local areas.
  add("/tamil-nadu/");
  for (const main of mains) add(`/${slug(main.slug || main.name)}/`);
  for (const sub of subs) {
    const parent = mains.find((m) => Number(m.id) === Number(sub.parent_id));
    if (parent) add(`/${slug(parent.slug || parent.name)}/${slug(sub.slug || sub.name)}/`);
  }
  for (const district of districts) {
    const d = slug(district.name);
    add(`/tamil-nadu/${d}/`);
    for (const area of areasByDistrict.get(String(district.id)) || []) add(`/tamil-nadu/${d}/${slug(area.name)}/`);
  }
  // Add category/location combinations only when approved, unexpired ads exist.
  const adsResult = await env.DB.prepare(
    `SELECT id,category,district,area,details_json,created_at FROM ads WHERE ${isLiveAd} ORDER BY created_at DESC LIMIT 30000`
  ).all();
  const ads = adsResult.results || [];
  const mainByName = new Map(mains.map((m) => [String(m.name).trim().toLowerCase(), m]));
  const subByKey = new Map(subs.map((s) => [`${s.parent_id}:${String(s.name).trim().toLowerCase()}`, s]));
  const districtByName = new Map(districts.map((d) => [String(d.name).trim().toLowerCase(), d]));
  for (const ad of ads) {
    const main = mainByName.get(String(ad.category || "").trim().toLowerCase());
    const district = districtByName.get(String(ad.district || "").trim().toLowerCase());
    if (!main) continue;
    const mainPath = slug(main.slug || main.name);
    add(`/${mainPath}/`, ad.created_at);
    let sub = null;
    try {
      const subName = JSON.parse(ad.details_json || "{}").subcategory || "";
      sub = subByKey.get(`${main.id}:${String(subName).trim().toLowerCase()}`) || null;
    } catch {}
    if (sub) add(`/${mainPath}/${slug(sub.slug || sub.name)}/`, ad.created_at);
    if (!district) continue;
    const dPath = `/tamil-nadu/${slug(district.name)}`;
    add(`${dPath}/`, ad.created_at);
    add(`${dPath}/${mainPath}/`, ad.created_at);
    if (sub) add(`${dPath}/${mainPath}/${slug(sub.slug || sub.name)}/`, ad.created_at);
    if (ad.area) {
      const areaRows = directory.areasByDistrict.get(String(district.id)) || [];
      const area = areaRows.find((a) => String(a.name).trim().toLowerCase() === String(ad.area).trim().toLowerCase());
      if (area) {
        const aPath = `${dPath}/${slug(area.name)}`;
        add(`${aPath}/`, ad.created_at);
        add(`${aPath}/${mainPath}/`, ad.created_at);
        if (sub) add(`${aPath}/${mainPath}/${slug(sub.slug || sub.name)}/`, ad.created_at);
      }
    }
  }
  const body = [...urls.entries()].map(([path, date]) =>
    `<url><loc>${esc(urlFor(path))}</loc><lastmod>${esc(date)}</lastmod></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function handleSeoRequest(req, env) {
  if (!['GET', 'HEAD'].includes(req.method)) return null;
  const url = new URL(req.url);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return htmlResponse("<h1>Bad URL</h1>", 400, true, req.method); }
  path = path.replace(/\/{2,}/g, "/");
  const cleanPath = path.replace(/\/+$/, "") || "/";
  if (cleanPath === "/sitemap.xml") {
    if (!env.DB) return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    try { return xmlResponse(await buildSitemap(env), req.method); }
    catch (error) { console.error("24Adz sitemap error:", error); return new Response("Sitemap temporarily unavailable", { status: 503 }); }
  }
  if (cleanPath === "/" || cleanPath === "/robots.txt" || cleanPath.startsWith("/api/") || cleanPath === "/admin" || cleanPath.startsWith("/admin/")) return null;
  if (/\.[a-z0-9]{2,8}$/i.test(cleanPath) || !env.DB) return null;

  try {
    const directory = await getDirectory(env);
    const { mains, subs, districts, areasByDistrict } = directory;
    const bySlug = (rows, value) => rows.find((x) => slug(x.slug || x.name) === value);
    const getCategory = (value) => {
      const main = bySlug(mains, value);
      if (main) return { main, sub: null };
      const sub = bySlug(subs, value);
      if (!sub) return null;
      return { main: mains.find((x) => Number(x.id) === Number(sub.parent_id)) || null, sub };
    };
    const parts = cleanPath.split("/").filter(Boolean);
    let district = null, area = null, mainCategory = null, subcategory = null;
    const crumbs = [];
    const sections = [];
    let heading = "", intro = "", title = "", description = "";

    if (parts[0] === "tamil-nadu") {
      if (parts.length === 1) {
        heading = "Classified Ads Across Tamil Nadu";
        title = "Tamil Nadu Classified Ads | 24Adz";
        description = "Browse classified advertisements across all 38 districts of Tamil Nadu on 24Adz.com.";
        intro = "Explore local classifieds by district, area and category across Tamil Nadu.";
        sections.push({ title: "Browse all districts", items: districts.map((d) => ({ label: d.name, url: `/tamil-nadu/${slug(d.name)}/` })) });
        sections.push({ title: "Browse categories", items: mains.map((c) => ({ label: c.name, url: `/${slug(c.slug || c.name)}/` })) });
      } else {
        district = districts.find((d) => slug(d.name) === parts[1]);
        if (!district) return htmlResponse("<h1>District page not found</h1>", 404, true, req.method);
        crumbs.push({ label: "Tamil Nadu", url: "/tamil-nadu/" }, { label: district.name, url: `/tamil-nadu/${slug(district.name)}/` });
        const rest = parts.slice(2);
        if (rest.length) {
          const firstCat = getCategory(rest[0]);
          if (firstCat) {
            mainCategory = firstCat.main; subcategory = firstCat.sub;
            if (!mainCategory || rest.length > 2) return htmlResponse("<h1>Category page not found</h1>", 404, true, req.method);
            if (rest.length === 2) {
              const subCat = getCategory(rest[1]);
              if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id)) return htmlResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
              subcategory = subCat.sub;
            }
          } else {
            const districtAreas = areasByDistrict.get(String(district.id)) || [];
            area = districtAreas.find((a) => slug(a.name) === rest[0]);
            if (!area || rest.length > 4) return htmlResponse("<h1>Area page not found</h1>", 404, true, req.method);
            crumbs.push({ label: area.name, url: `/tamil-nadu/${slug(district.name)}/${slug(area.name)}/` });
            if (rest.length > 1) {
              const cat = getCategory(rest[1]);
              if (!cat?.main) return htmlResponse("<h1>Category not found</h1>", 404, true, req.method);
              mainCategory = cat.main; subcategory = cat.sub;
              if (rest.length > 2) {
                const subCat = getCategory(rest[2]);
                if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id)) return htmlResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
                subcategory = subCat.sub;
              }
            }
          }
        }
      }
    } else {
      const cat = getCategory(parts[0]);
      if (!cat?.main) return null;
      if (parts.length > 2) return htmlResponse("<h1>Page not found</h1>", 404, true, req.method);
      mainCategory = cat.main; subcategory = cat.sub;
      if (parts.length === 2) {
        const subCat = getCategory(parts[1]);
        if (!subCat?.sub || Number(subCat.main?.id) !== Number(mainCategory.id)) return htmlResponse("<h1>Subcategory not found</h1>", 404, true, req.method);
        subcategory = subCat.sub;
      }
    }

    if (mainCategory) {
      const categoryBase = district
        ? `/tamil-nadu/${slug(district.name)}/${area ? `${slug(area.name)}/` : ""}`
        : "/";
      const mainUrl = `${categoryBase}${slug(mainCategory.slug || mainCategory.name)}/`;
      crumbs.push({ label: mainCategory.name, url: mainUrl });
      if (subcategory) crumbs.push({ label: subcategory.name, url: `${mainUrl}${slug(subcategory.slug || subcategory.name)}/` });
    }

    const where = [isLiveAd];
    const values = [];
    if (mainCategory) { where.push("LOWER(TRIM(ads.category))=LOWER(?)"); values.push(mainCategory.name); }
    if (district) { where.push("LOWER(TRIM(ads.district))=LOWER(?)"); values.push(district.name); }
    if (area) { where.push("LOWER(TRIM(ads.area))=LOWER(?)"); values.push(area.name); }
    if (subcategory) { where.push("LOWER(TRIM(COALESCE(json_extract(ads.details_json,'$.subcategory'),'')))=LOWER(?)"); values.push(subcategory.name); }
    const adResult = await env.DB.prepare(
      `SELECT id,title,description,category,district,area,price,image_url,created_at FROM ads WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 60`
    ).bind(...values).all();
    const ads = adResult.results || [];

    if (mainCategory) {
      const base = district ? `/tamil-nadu/${slug(district.name)}/${area ? `${slug(area.name)}/` : ""}` : "/";
      if (district) crumbs.push({ label: mainCategory.name, url: `${base}${slug(mainCategory.slug || mainCategory.name)}/` });
      sections.push({ title: `More ${mainCategory.name} subcategories`, items: subs.filter((s) => Number(s.parent_id) === Number(mainCategory.id)).map((s) => ({ label: s.name, url: `${base}${slug(mainCategory.slug || mainCategory.name)}/${slug(s.slug || s.name)}/` })) });
    }
    if (district) {
      const areaRows = areasByDistrict.get(String(district.id)) || [];
      sections.push({ title: `Areas in ${district.name}`, items: areaRows.map((a) => ({ label: a.name, url: `/tamil-nadu/${slug(district.name)}/${slug(a.name)}/` })) });
      if (!mainCategory) sections.push({ title: "Browse categories in this district", items: mains.map((c) => ({ label: c.name, url: `/tamil-nadu/${slug(district.name)}/${slug(c.slug || c.name)}/` })) });
    } else if (mainCategory) {
      sections.push({ title: "Browse this category by district", items: districts.map((d) => ({ label: d.name, url: `/tamil-nadu/${slug(d.name)}/${slug(mainCategory.slug || mainCategory.name)}/` })) });
    }
    if (area && district && !mainCategory) {
      sections.push({ title: `Categories in ${area.name}`, items: mains.map((c) => ({ label: c.name, url: `/tamil-nadu/${slug(district.name)}/${slug(area.name)}/${slug(c.slug || c.name)}/` })) });
    }

    const labelParts = [subcategory?.name || mainCategory?.name, area?.name, district?.name].filter(Boolean);
    heading = labelParts.length ? `${labelParts.join(" in ")} Classified Ads` : "Tamil Nadu Classified Ads";
    title = `${heading} | 24Adz Tamil Nadu Classifieds`;
    const location = [area?.name, district?.name, "Tamil Nadu"].filter(Boolean).join(", ");
    description = `Find ${subcategory?.name || mainCategory?.name || "classified"} advertisements${location ? ` in ${location}` : " across Tamil Nadu"}. Browse listings and contact advertisers on 24Adz.com.`;
    intro = `Browse ${subcategory?.name || mainCategory?.name || "classified"} listings${location ? ` in ${location}` : " across Tamil Nadu"}. Explore nearby areas and related categories.`;
    const canonical = urlFor(cleanPath);
    const noindex = false;
    const html = renderPage({ title, description, canonical, heading, intro, ads, crumbs, sections, noindex });
    return htmlResponse(html, 200, noindex, req.method);
  } catch (error) {
    console.error("24Adz SEO routing error:", error);
    return htmlResponse("<!doctype html><html><head><meta name=\"robots\" content=\"noindex\"></head><body><h1>Page temporarily unavailable</h1></body></html>", 503, true, req.method);
  }
}
