/**
 * Builds /resultados/ inside isolated INTERWELT Netlify test site.
 * Does not alter repo-root /resultados/ or public production.
 * Staging strips tracking and blocks external purchase/navigation links.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";

const site = "interwelt-pilot-site";
const input = "resultados/index.html";
const result = join(site, "resultados", "index.html");

let html = readFileSync(input, "utf8");
const stripPatterns = [
  /<script id="vl-consent-bootstrap">[\s\S]*?<\/script>/i,
  /<script async="" src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"><\/script>/i,
  /<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];[\s\S]*?gtag\('config', 'G-P1Q2TSMVNJ'\);[\s\S]*?<\/script>/i,
  /<script id="vl-ga4-affiliate-normalizer">[\s\S]*?<\/script>/i,
  /<script defer="" src="\/assets\/vl-cookie-consent\.js"><\/script>/i,
  /<script defer src="\/assets\/vl-whatsapp\.js"><\/script>/i
];
for (const pattern of stripPatterns) html = html.replace(pattern, "");

const head = [
  '<meta name="robots" content="noindex,nofollow,noarchive">',
  '<style id="interwelt-results-preview-only">',
  '#vl-interwelt-preview-header {background:#102c49;color:#fff;text-align:center;padding:13px 15px;font:700 13px/1.5 system-ui;position:sticky;top:0;z-index:100000}',
  '#vl-interwelt-preview-header strong {color:#a6f2da}',
  '.btn-contract[href], .saily-results-btn[href] {opacity:.6!important;cursor:not-allowed!important}',
  '</style>',
  '<script>',
  '/* Staging guard: block external page changes BEFORE inline affiliate listeners. */',
  'window.gtag = function(){};',
  'document.addEventListener("click", function(event) {',
  '  const anchor=event.target.closest && event.target.closest("a[href]");',
  '  if (!anchor) return;',
  '  try {',
  '    const target=new URL(anchor.getAttribute("href"), window.location.href);',
  '    if (target.origin!==window.location.origin || /^(javascript:|data:)/i.test(anchor.getAttribute("href"))) {',
  '      event.preventDefault();',
  '      event.stopImmediatePropagation();',
  '      window.alert("Vista previa sin ventas: los enlaces externos están desactivados.");',
  '    }',
  '  } catch(_) { event.preventDefault(); }',
  '}, true);',
  '</script>'
].join("\n");
html = html.replace("</head>", head + "\n</head>");
html = html.replace(/(<body[^>]*>)/i, '$1\n<div id="vl-interwelt-preview-header" role="status">VISTA PREVIA · INTERWELT en pruebas · enlaces de contratación desactivados · ningún precio en tiempo real</div>');

const requiredAssets = ["assets/vl-interwelt-results.js", "assets/vl-interwelt-results.css"];
const assets = new Set([...requiredAssets]);
for (const match of html.matchAll(/\/(?:assets\/[a-zA-Z0-9.\/_-]+|[a-zA-Z0-9._-]+\.(?:ico|webp|png|svg|jpg|jpeg))/g)) {
  assets.add(match[0].replace(/^\//, ""));
}
let copied = 0;
for (const path of assets) {
  if (!existsSync(path)) {
    if (requiredAssets.includes(path)) throw new Error("Required preview asset missing: " + path);
    console.warn("Skipping missing optional asset:", path);
    continue;
  }
  const to = join(site, path);
  mkdirSync(dirname(to), { recursive:true });
  copyFileSync(path, to);
  copied += 1;
}
mkdirSync(dirname(result), { recursive: true });
writeFileSync(result, html);
writeFileSync(join(site, "_headers"), [
  "/resultados/*",
  "  X-Robots-Tag: noindex, nofollow, noarchive",
  "  Cache-Control: no-store",
  "",
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  ""
].join("\n"));
if (!html.includes('id="vl-interwelt-slot" hidden')) throw new Error("Preview slot missing");
if (!html.includes("vl_interwelt_preview")) throw new Error("Preview flag missing");
if (html.includes("www.googletagmanager.com")) throw new Error("Analytics script still present");
console.log("Isolated /resultados/ preview staged, " + html.length + " chars, " + copied + " assets.");
