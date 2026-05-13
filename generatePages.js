import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

try {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Extraction
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
    let html = fs.readFileSync(filePath, 'utf-8');
    
    // Flexible Cleanup (handles any attribute order)
    html = html.replace(/<div\s+[^>]*id="bloomBoot"[^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<nav\s+[^>]*id="nav"[^>]*>[\s\S]*?<\/nav>/gi, '');
    html = html.replace(/<div\s+[^>]*class="mob-menu"[^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<footer\s+[^>]*class="bloom-footer"[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Also remove any stray Bloom logos or nav links that might have been hardcoded
    // (This is dangerous but might be needed if they lack IDs)
    // For now, let's just stick to IDs.

    // Injection
    if (html.includes('<!-- BLOOM_STYLE_INJECT -->')) {
      html = html.replace(/(<!-- BLOOM_STYLE_INJECT -->)[\s\S]*?(<!-- BLOOM_STYLE_END -->)/g, styleBlock);
    } else {
      html = html.replace('</head>', styleBlock + '</head>');
    }
    
    if (html.includes('<!-- BLOOM_NAV_INJECT -->')) {
      html = html.replace(/(<!-- BLOOM_NAV_INJECT -->)[\s\S]*?(<!-- BLOOM_NAV_END -->)/g, storeNavBlock);
    } else {
      html = html.replace('<body>', '<body>\n' + storeNavBlock);
    }
    
    if (html.includes('<!-- BLOOM_FOOT_INJECT -->')) {
      html = html.replace(/(<!-- BLOOM_FOOT_INJECT -->)[\s\S]*?(<!-- BLOOM_FOOT_END -->)/g, storeFootBlock);
    } else {
      const mainEnd = html.indexOf('</main>');
      if (mainEnd !== -1) {
        html = html.replace('</main>', '</main>\n' + storeFootBlock);
      } else {
        html = html.replace('</body>', storeFootBlock + '</body>');
      }
    }

    // De-duplicate end markers
    html = html.replace(/(<!-- BLOOM_STYLE_END -->\s*){2,}/g, '<!-- BLOOM_STYLE_END -->\n');
    html = html.replace(/(<!-- BLOOM_NAV_END -->\s*){2,}/g, '<!-- BLOOM_NAV_END -->\n');
    html = html.replace(/(<!-- BLOOM_FOOT_END -->\s*){2,}/g, '<!-- BLOOM_FOOT_END -->\n');

    fs.writeFileSync(filePath, html, 'utf-8');
  }

  const storefrontPages = [
    'catalog.html', 'customize.html', 'cart.html', 'checkout.html',
    'tracking.html', 'confirmation.html', 'support.html', 'profile.html'
  ];

  console.log('\n--- Initiating Global Storefront Layout Synchronization ---');
  storefrontPages.forEach(page => {
    const p = path.join(publicDir, page);
    if (fs.existsSync(p)) {
      syncPageLayout(p);
      console.log(`✅ Synchronized layout: ${page}`);
    }
  });
  console.log('--- All Application Pages Synchronized! ---');

} catch (err) {
  console.error('Build Error:', err);
}
