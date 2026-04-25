const fs = require('fs');

let text = fs.readFileSync('public/index.html', 'utf8');


text = text.replace(/<span class="stat-icon"[^>]*>.*?<\/span>\s*<div class="stat-num"[^>]*>48h–14d<\/div>/s, '<span class="stat-icon" aria-hidden="true">⏳</span>\n        <div class="stat-num" id="sLead">48h–14d</div>');

text = text.replace(/<span class="stat-icon"[^>]*>.*?<\/span>\s*<div class="stat-num"[^>]*>MNL.*?BAG<\/div>/s, '<span class="stat-icon" aria-hidden="true">📍</span>\n        <div class="stat-num" id="sCities">MNL · BAG</div>');


text = text.replace(/<span class="stat-icon"[^>]*>.*?<\/span>\s*<div class="stat-num"[^>]*>0–4°C<\/div>/s, '<span class="stat-icon" aria-hidden="true">❄️</span>\n        <div class="stat-num" id="sTemp">0–4°C</div>');


text = text.replace(/<span class="stat-icon"[^>]*>.*?<\/span>\s*<div class="stat-num"[^>]*>AA<\/div>/s, '<span class="stat-icon" aria-hidden="true">♿</span>\n        <div class="stat-num" id="sWcag">AA</div>');


text = text.replace(/<span class="occ-emj"[^>]*>.*?<\/span>Corporate/g, '<span class="occ-emj" aria-hidden="true">💼</span>Corporate');


text = text.replace(/<span class="cat-ico">.*?<\/span>\s*Corporate/g, '<span class="cat-ico">💼</span> Corporate');


text = text.replace(/♡<\/div>.*?<div class="hc-name">/gs, '♡</div>\n          <div class="hc-name">');


text = text.replace(/>â€</g, '><');

fs.writeFileSync('public/index.html', text, 'utf8');
console.log('Regex replacements applied.');
