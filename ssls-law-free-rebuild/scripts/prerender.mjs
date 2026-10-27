// Pre-renders every page of the site into its own static HTML file so that
// search engines see each page's full text, title and description without
// having to run JavaScript. Visitors' browsers still load app.js as before,
// which re-renders the same content and keeps navigation instant.
//
// No packages needed. After changing any page content in app.js or the
// layout in index.html, run from the site folder:
//
//   node scripts/prerender.mjs
//
// and commit the regenerated files. Cloudflare Pages needs no build step.
//
// Output: index.html, about.html, practice-areas.html, contact.html, one page per service,
//         privacy-notice.html, website-disclaimer.html, 404.html, sitemap.xml

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SITE = "https://sslslaw.com";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// [site path, output file, page builder in app.js, sitemap priority, change frequency]
const pages = [
  ["/", "index.html", "homePage", "1.0", "monthly"],
  ["/about", "about.html", "aboutPage", "0.8", "yearly"],
  ["/practice-areas", "practice-areas.html", "practicesPage", "0.9", "monthly"],
  ["/contact", "contact.html", "contactPage", "0.8", "yearly"],
  ["/privacy-notice", "privacy-notice.html", "privacyNoticePage", "0.3", "yearly"],
  ["/website-disclaimer", "website-disclaimer.html", "websiteDisclaimerPage", "0.3", "yearly"],
];

// --- Load the page builders from app.js -----------------------------------
// app.js is written for the browser. Give it a do-nothing stand-in for the
// DOM so its start-up code runs harmlessly, then pull out the pure functions
// that build each page's HTML.
const inert = new Proxy(function () {}, {
  get: (_t, prop) => (prop === Symbol.toPrimitive ? () => "" : inert),
  set: () => true,
  apply: () => inert,
  construct: () => inert,
});
const context = vm.createContext({
  document: inert,
  window: inert,
  history: inert,
  localStorage: inert,
  location: { pathname: "/", hash: "", origin: SITE, href: SITE + "/" },
  setTimeout: () => 0,
  URL,
  FormData: inert,
  fetch: inert,
  console,
});
const appJs = readFileSync(join(root, "app.js"), "utf8");
vm.runInContext(
  appJs +
    "\n;globalThis.__site = { pageMeta, siteUrl, notFound, services, servicePage, serviceSchema, " +
    pages.map((p) => p[2]).join(", ") +
    " };",
  context,
  { filename: "app.js" },
);
const app = context.__site;
if (app.siteUrl !== SITE) {
  throw new Error(`siteUrl in app.js (${app.siteUrl}) does not match SITE here (${SITE}).`);
}

// --- Fill the index.html layout for one page -------------------------------
const template = readFileSync(join(root, "index.html"), "utf8");

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`Could not find ${label} in index.html`);
  return html.replace(pattern, replacement);
}

function build({ path, title, desc, body, noindex = false, schema = null, navPath = path }) {
  const url = SITE + (path === "/" ? "/" : path);
  let html = template;

  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`, "<title>");
  html = replaceOnce(html, /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeAttr(desc)}">` +
      (noindex ? '\n  <meta name="robots" content="noindex">' : ""), "meta description");
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${escapeAttr(title)}">`, "og:title");
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${escapeAttr(desc)}">`, "og:description");
  html = replaceOnce(html, /\n?\s*<link rel="canonical" href="[^"]*">/,
    noindex ? "" : `\n  <link rel="canonical" href="${url}">`, "canonical link");
  html = replaceOnce(html, /\n?\s*<meta property="og:url" content="[^"]*">/,
    noindex ? "" : `\n  <meta property="og:url" content="${url}">`, "og:url");

  // Extra structured data for this page (FAQ, breadcrumbs, service).
  html = html.replace(/\n?\s*<script type="application\/ld\+json" data-page>[\s\S]*?<\/script>/g, "");
  if (schema) html = replaceOnce(html, /<\/head>/, `  <script type="application/ld+json" data-page>\n  ${JSON.stringify(schema).replace(/</g, "\\u003c")}\n  </script>\n</head>`, "</head>");

  // Page content goes inside <main>; any previous render is replaced.
  html = replaceOnce(html, /<main id="app" tabindex="-1">[\s\S]*?<\/main>/,
    () => `<main id="app" tabindex="-1">${body}</main>`, "<main id=\"app\">");

  // Highlight the current menu item, as app.js does in the browser.
  html = html.replace(/<a( class="[^"]*")? href="([^"]*)" data-route="([^"]*)"( aria-current="page")?>/g,
    (_m, cls, href, route) => {
      const classes = (cls ? cls.slice(8, -1).split(" ") : []).filter((c) => c && c !== "active");
      if (route === navPath) classes.push("active");
      const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
      return `<a${classAttr} href="${href}" data-route="${route}"${route === navPath ? ' aria-current="page"' : ""}>`;
    });

  html = html.replace(/<span id="year">[^<]*<\/span>/, `<span id="year">${new Date().getFullYear()}</span>`);
  return html;
}

for (const [path, file, builder] of pages) {
  const meta = app.pageMeta[path];
  if (!meta) throw new Error(`No pageMeta entry for ${path} in app.js`);
  writeFileSync(join(root, file), build({ path, title: meta.title, desc: meta.desc, body: app[builder]() }));
  console.log("wrote", file);
}

for (const s of app.services) {
  const path = "/" + s.slug;
  writeFileSync(join(root, s.slug + ".html"), build({ path, title: s.title, desc: s.desc, body: app.servicePage(s), schema: app.serviceSchema(s), navPath: "/practice-areas" }));
  pages.push([path, s.slug + ".html", null, "0.8", "monthly"]);
  console.log("wrote", s.slug + ".html");
}

writeFileSync(join(root, "404.html"), build({
  path: "/404",
  title: "Page Not Found | Siew Song & Lee Sean",
  desc: "Siew Song & Lee Sean — Advocates & Solicitors, Petaling Jaya, Malaysia.",
  body: app.notFound(),
  noindex: true,
}));
console.log("wrote 404.html");

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages.map(([path, , , priority, freq]) =>
      `  <url><loc>${SITE}${path === "/" ? "/" : path}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join("\n") +
    "\n</urlset>\n");
console.log("wrote sitemap.xml");
