# SSLS Law — Free static website rebuild

This is a standalone static rebuild starter intended for Cloudflare Pages. It does not depend on GoDaddy Airo, React, Vite, server-side rendering, or a paid hosting service.

## Included
- Responsive charcoal-and-antique-gold styling with Cormorant Garamond and Inter
- Home, About, Practice Areas and Contact pages
- Mobile navigation, page titles/descriptions, canonical URL updates
- Contact form that opens the visitor's email application addressed to `general@sslslaw.com`
- Cloudflare Pages SPA fallback (`_redirects`)
- Uses the uploaded horizontal logo asset

## SEO: pre-rendered pages (re-run after editing content)
Page content lives in `app.js`, but each page is also saved as its own static HTML file (`index.html`, `about.html`, `practice-areas.html`, `contact.html`, `privacy-notice.html`, `website-disclaimer.html`, `404.html`) so Google sees the full text, title and description of every page without running JavaScript. `sitemap.xml` and `robots.txt` are real files for the same reason.

**After changing any text in `app.js`, or the layout in `index.html`, run this from this folder and commit the regenerated files:**
```bash
node scripts/prerender.mjs
```
It needs only Node.js (no packages). Each practice area also has its own page (e.g. `/family-law`, `/conveyancing-property`); their text is in `areaDetails` in `app.js` and should stay general information, worded factually in line with the Bar's publicity rules. Page titles and descriptions are in `pageMeta` in `app.js`; the preferred domain is `siteUrl` (currently `https://sslslaw.com`). Because `404.html` exists, Cloudflare Pages returns a real 404 for unknown addresses instead of the homepage.

## Important before publishing
1. Review all content, qualifications, address, phone numbers and email address.
2. The Team page currently uses a typographic portrait placeholder; replace it with approved partner photographs if available.
3. The contact form is a `mailto:` handoff, not a server-side form. Visitors must have an email application configured and still need to press Send. For direct form submissions, configure a form provider or a Cloudflare Pages Function before publishing.
4. Confirm the canonical domain and whether `www.sslslaw.com` should be the preferred URL.
5. No DNS changes are needed while testing.

## Preview locally
This version is plain HTML/CSS/JavaScript. Open `index.html` for a quick local check, or use a local static server for SPA routes:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`. Note that Python's simple server does not implement SPA fallback for nested routes; test navigation from the homepage or deploy to Cloudflare Pages to test `_redirects`.

## Deploy to Cloudflare Pages
1. Create a GitHub repository and upload all files in this folder to its root.
2. In Cloudflare, open Workers & Pages → Create → Pages → Connect to Git.
3. Choose the repository.
4. Framework preset: None. Build command: leave blank. Build output directory: `/` (or `.` if accepted by the interface).
5. Deploy the preview URL and test all five pages.
6. Add `www.sslslaw.com` as a custom domain only after the preview is approved. Follow Cloudflare's domain instructions and avoid deleting existing DNS records blindly.

## Logo
The existing Airo logo reference is not a downloadable image URL; this project uses a text mark as a safe fallback. If you export the actual logo from Airo later, save it under `assets/` and update the `.brand` markup and CSS.
