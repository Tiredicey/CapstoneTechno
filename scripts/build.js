#!/usr/bin/env node


import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');



function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}



const CORE_MODULES = [
  'public/js/core/Store.js',
  'public/js/core/Api.js',
  'public/js/core/Auth.js',
  'public/js/core/I18n.js',
  'public/js/core/Wishlist.js',
  'public/js/core/WebVitals.js',
  'public/js/core/TouchGestures.js',
  'public/js/core/FormValidator.js',
];

const PAGE_SCRIPTS = [
  'public/js/landing.js',
  'public/js/catalog.js',
  'public/js/cart.js',
  'public/js/checkout.js',
  'public/js/customize.js',
  'public/js/support.js',
  'public/js/tracking.js',
  'public/js/profile.js',
  'public/js/admin.js',
  'public/js/BouquetBuilder.js',
  'public/js/MerchandisePersonalizer.js',
];

const CSS_FILES = [
  'public/css/vars.css',
  'public/css/main.css',
  'public/css/landing.css',
  'public/css/catalog.css',
  'public/css/cart.css',
  'public/css/checkout.css',
  'public/css/customize.css',
  'public/css/support.css',
  'public/css/tracking.css',
  'public/css/admin.css',
];

const STATIC_COPY = [
  'public/manifest.json',
  'public/sw.js',
  'public/robots.txt',
];

const HTML_FILES = [
  'public/index.html',
  'public/catalog.html',
  'public/cart.html',
  'public/checkout.html',
  'public/customize.html',
  'public/support.html',
  'public/tracking.html',
  'public/admin.html',
];



async function build() {
  const startTime = Date.now();
  const manifest = { timestamp: new Date().toISOString(), files: {} };

  console.log('\n🌸 Bloom Build Pipeline');
  console.log('═══════════════════════════════════\n');


  console.log('📁 Cleaning dist/ ...');
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  ensureDir(DIST);
  ensureDir(path.join(DIST, 'js'));
  ensureDir(path.join(DIST, 'js', 'core'));
  ensureDir(path.join(DIST, 'css'));


  console.log('📦 Bundling core modules → core.bundle.min.js');

  let coreConcat = '';
  for (const mod of CORE_MODULES) {
    const fullPath = path.join(ROOT, mod);
    if (fs.existsSync(fullPath)) {
      coreConcat += fs.readFileSync(fullPath, 'utf-8') + '\n;\n';
    } else {
      console.warn(`  ⚠ Missing: ${mod}`);
    }
  }

  const coreResult = await esbuild.transform(coreConcat, {
    minify: true,
    sourcemap: true,
    sourcefile: 'core.bundle.js',
    target: ['es2020'],
    legalComments: 'none',
  });

  const coreBundlePath = path.join(DIST, 'js', 'core.bundle.min.js');
  const coreMapPath = coreBundlePath + '.map';
  const coreWithMap = coreResult.code + `\n//# sourceMappingURL=core.bundle.min.js.map\n`;
  fs.writeFileSync(coreBundlePath, coreWithMap);
  fs.writeFileSync(coreMapPath, coreResult.map);
  manifest.files['js/core.bundle.min.js'] = {
    size: fs.statSync(coreBundlePath).size,
    hash: fileHash(coreBundlePath),
    modules: CORE_MODULES.map(m => path.basename(m)),
  };
  console.log(`   ✓ ${formatBytes(fs.statSync(coreBundlePath).size)} (${CORE_MODULES.length} modules)`);


  console.log('\n📄 Minifying page scripts...');
  for (const script of PAGE_SCRIPTS) {
    const fullPath = path.join(ROOT, script);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠ Skipping missing: ${script}`);
      continue;
    }
    const code = fs.readFileSync(fullPath, 'utf-8');
    const baseName = path.basename(script, '.js');
    const outName = `${baseName}.min.js`;
    const outPath = path.join(DIST, 'js', outName);

    const result = await esbuild.transform(code, {
      minify: true,
      sourcemap: true,
      sourcefile: path.basename(script),
      target: ['es2020'],
      legalComments: 'none',
    });

    fs.writeFileSync(outPath, result.code + `\n//# sourceMappingURL=${outName}.map\n`);
    fs.writeFileSync(outPath + '.map', result.map);

    const originalSize = Buffer.byteLength(code);
    const minifiedSize = fs.statSync(outPath).size;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(0);
    manifest.files[`js/${outName}`] = {
      size: minifiedSize,
      originalSize,
      savings: `${savings}%`,
      hash: fileHash(outPath),
    };
    console.log(`   ✓ ${baseName}.js → ${outName}  (${formatBytes(originalSize)} → ${formatBytes(minifiedSize)}, −${savings}%)`);
  }


  console.log('\n🎨 Minifying CSS...');
  for (const cssFile of CSS_FILES) {
    const fullPath = path.join(ROOT, cssFile);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠ Skipping missing: ${cssFile}`);
      continue;
    }
    const code = fs.readFileSync(fullPath, 'utf-8');
    const baseName = path.basename(cssFile, '.css');
    const outName = `${baseName}.min.css`;
    const outPath = path.join(DIST, 'css', outName);

    const result = await esbuild.transform(code, {
      minify: true,
      sourcemap: true,
      sourcefile: path.basename(cssFile),
      loader: 'css',
    });

    fs.writeFileSync(outPath, result.code + `\n/*# sourceMappingURL=${outName}.map */\n`);
    fs.writeFileSync(outPath + '.map', result.map);

    const originalSize = Buffer.byteLength(code);
    const minifiedSize = fs.statSync(outPath).size;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(0);
    manifest.files[`css/${outName}`] = {
      size: minifiedSize,
      originalSize,
      savings: `${savings}%`,
      hash: fileHash(outPath),
    };
    console.log(`   ✓ ${baseName}.css → ${outName}  (${formatBytes(originalSize)} → ${formatBytes(minifiedSize)}, −${savings}%)`);
  }

  // 5. Copy static assets
  console.log('\n📋 Copying static assets...');
  for (const staticFile of STATIC_COPY) {
    const src = path.join(ROOT, staticFile);
    if (fs.existsSync(src)) {
      const dest = path.join(DIST, path.relative('public', staticFile));
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      console.log(`   ✓ ${path.basename(staticFile)}`);
    }
  }


  const uploadsDir = path.join(ROOT, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    copyRecursive(uploadsDir, path.join(DIST, '..', 'uploads'));
    console.log('   ✓ uploads/');
  }

 
  console.log('\n🔧 Transforming HTML files...');
  for (const htmlFile of HTML_FILES) {
    const fullPath = path.join(ROOT, htmlFile);
    if (!fs.existsSync(fullPath)) continue;

    let html = fs.readFileSync(fullPath, 'utf-8');


    const coreScriptPattern = /<script\s+src="\/js\/core\/(?:Store|Api|Auth|I18n|Wishlist|WebVitals|TouchGestures|FormValidator)\.js"(?:\s+defer)?\s*><\/script>\s*/g;
    const coreMatches = html.match(coreScriptPattern);
    if (coreMatches && coreMatches.length > 0) {

      let first = true;
      html = html.replace(coreScriptPattern, (match) => {
        if (first) {
          first = false;
          return `<script src="/js/core.bundle.min.js"></script>\n`;
        }
        return '';
      });
    }


    html = html.replace(
      /<script(\s+type="module")?\s+src="\/js\/(\w+)\.js"\s*><\/script>/g,
      (match, typeAttr, name) => {
        const minFile = path.join(DIST, 'js', `${name}.min.js`);
        if (fs.existsSync(minFile)) {
          return `<script${typeAttr || ''} src="/js/${name}.min.js"></script>`;
        }
        return match;
      }
    );


    html = html.replace(
      /<link\s+rel="stylesheet"\s+href="\/css\/(\w+)\.css"\s*>/g,
      (match, name) => {
        const minFile = path.join(DIST, 'css', `${name}.min.css`);
        if (fs.existsSync(minFile)) {
          return `<link rel="stylesheet" href="/css/${name}.min.css">`;
        }
        return match;
      }
    );

    const outPath = path.join(DIST, path.relative('public', htmlFile));
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html);
    console.log(`   ✓ ${path.basename(htmlFile)}`);
  }


  const totalOriginal = Object.values(manifest.files).reduce((s, f) => s + (f.originalSize || f.size), 0);
  const totalMinified = Object.values(manifest.files).reduce((s, f) => s + f.size, 0);
  manifest.summary = {
    totalFiles: Object.keys(manifest.files).length,
    totalOriginalSize: formatBytes(totalOriginal),
    totalMinifiedSize: formatBytes(totalMinified),
    totalSavings: `${((1 - totalMinified / totalOriginal) * 100).toFixed(1)}%`,
    buildTime: `${Date.now() - startTime}ms`,
  };

  fs.writeFileSync(path.join(DIST, 'build-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('\n═══════════════════════════════════');
  console.log(`✅ Build complete in ${manifest.summary.buildTime}`);
  console.log(`   Files: ${manifest.summary.totalFiles}`);
  console.log(`   Size:  ${manifest.summary.totalOriginalSize} → ${manifest.summary.totalMinifiedSize} (−${manifest.summary.totalSavings})`);
  console.log(`   Output: ${DIST}`);
  console.log('═══════════════════════════════════\n');
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
