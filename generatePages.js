import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

try {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Extraction from Index
  const fontsStart = indexHtml.indexOf('<link rel="preconnect"');
  const fontsEnd = indexHtml.indexOf('<style>');
  const indexFonts = indexHtml.substring(fontsStart, fontsEnd);

  const styleStart = indexHtml.indexOf('<style>');
  const styleEnd = indexHtml.indexOf('</style>') + 8;
  const extraStyles = `
    .nl-form svg, .foot-soc svg, footer svg { width: 18px !important; height: 18px !important; display: inline-block !important; vertical-align: middle !important; }
    .bloom-footer { z-index: 1000 !important; position: relative !important; }
    nav { z-index: 2000 !important; }
    .product-card, .p-card { z-index: 1 !important; }
    .product-card:hover, .p-card:hover { z-index: 10 !important; }
    #bloomBoot { z-index: 9999 !important; }
  `;
  const indexStyles = indexHtml.substring(styleStart, styleEnd).replace('</style>', extraStyles + '</style>');

  const bootStart = indexHtml.indexOf('<div id="bloomBoot"');
  const bootEnd = indexHtml.indexOf('</div>', indexHtml.indexOf('bloom-boot-txt')) + 6;
  const storeBoot = indexHtml.substring(bootStart, bootEnd);

  const navStart = indexHtml.indexOf('<nav id="nav"');
  const navEnd = indexHtml.indexOf('</nav>') + 6;
  const prefixStart = indexHtml.indexOf('<a href="#main"');
  const storeNavPrefix = indexHtml.substring(prefixStart, navStart);
  const storeNav = indexHtml.substring(navStart, navEnd);

  const mobStart = indexHtml.indexOf('<div class="mob-menu"');
  const mobEnd = indexHtml.indexOf('</div>', indexHtml.indexOf('mob-inner')) + 6;
  const storeMob = indexHtml.substring(mobStart, indexHtml.indexOf('</div>', mobEnd) + 6);

  const footStart = indexHtml.indexOf('<footer class="bloom-footer"');
  const footEnd = indexHtml.indexOf('</footer>', footStart) + 9;
  const storeFoot = indexHtml.substring(footStart, footEnd);

  const overlayStart = indexHtml.indexOf('<div class="overlay" id="exitMod"');
  const toastEnd = indexHtml.indexOf('</div>', indexHtml.indexOf('id="toastCon"')) + 6;
  const storeOverlays = indexHtml.substring(overlayStart, toastEnd);

  const styleBlock = `\n<!-- BLOOM_STYLE_INJECT -->\n${indexFonts}\n${indexStyles}\n<!-- BLOOM_STYLE_END -->\n`;
  const storeNavBlock = `\n<!-- BLOOM_NAV_INJECT -->\n${storeBoot}\n${storeNavPrefix}\n${storeNav}\n${storeMob}\n<!-- BLOOM_NAV_END -->\n`;
  const storeFootBlock = `\n<!-- BLOOM_FOOT_INJECT -->\n${storeFoot}\n${storeOverlays}\n<!-- BLOOM_FOOT_END -->\n`;

  function syncPageLayout(filePath) {
    const pageName = path.basename(filePath);
    let pageHtml = fs.readFileSync(filePath, 'utf-8');
    
    // Extract unique pieces
    const mainMatch = pageHtml.match(/<main[^>]*>[\s\S]*?<\/main>/i);
    const pageMain = mainMatch ? mainMatch[0] : '<main></main>';
    
    const titleMatch = pageHtml.match(/<title>[\s\S]*?<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[0] : '<title>Bloom</title>';
    
    // Extract local scripts (like catalog.js)
    const scriptMatches = pageHtml.match(/<script\s+[^>]*src="[^"]+"[^>]*><\/script>/gi) || [];
    const localScripts = scriptMatches.filter(s => !indexHtml.includes(s) && !s.includes('google') && !s.includes('analytics')).join('\n');
    
    // Extract local styles (like catalog.css)
    const styleMatches = pageHtml.match(/<link\s+[^>]*rel="stylesheet"[^>]*href="[^"]+"[^>]*>/gi) || [];
    const localStyles = styleMatches.filter(s => !indexHtml.includes(s)).join('\n');

    // Build fresh
    let freshHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${pageTitle}
  ${localStyles}
  <!-- BLOOM_STYLE_INJECT --><!-- BLOOM_STYLE_END -->
</head>
<body>
  <!-- BLOOM_NAV_INJECT --><!-- BLOOM_NAV_END -->
  ${pageMain}
  ${localScripts}
  <!-- BLOOM_FOOT_INJECT --><!-- BLOOM_FOOT_END -->
</body>
</html>`;

    // Inject
    freshHtml = freshHtml.replace(/(<!-- BLOOM_STYLE_INJECT -->)[\s\S]*?(<!-- BLOOM_STYLE_END -->)/g, styleBlock);
    freshHtml = freshHtml.replace(/(<!-- BLOOM_NAV_INJECT -->)[\s\S]*?(<!-- BLOOM_NAV_END -->)/g, storeNavBlock);
    freshHtml = freshHtml.replace(/(<!-- BLOOM_FOOT_INJECT -->)[\s\S]*?(<!-- BLOOM_FOOT_END -->)/g, storeFootBlock);

    fs.writeFileSync(filePath, freshHtml, 'utf-8');
  }

  const storefrontPages = [
    'catalog.html', 'customize.html', 'cart.html', 'checkout.html',
    'tracking.html', 'confirmation.html', 'support.html', 'profile.html'
  ];

  console.log('\n--- Initiating Global Storefront Layout Re-Construction ---');
  storefrontPages.forEach(page => {
    const p = path.join(publicDir, page);
    if (fs.existsSync(p)) {
      syncPageLayout(p);
      console.log(`✅ Re-constructed layout: ${page}`);
    }
  });
  console.log('--- All Application Pages Re-Constructed! ---');

} catch (err) {
  console.error('Build Error:', err);
}
