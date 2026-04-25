const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

content = content.replace(/<div class="stat-num" id="sCities">MNL.*?BAG<\/div>/g, '<div class="stat-num" id="sCities">MNL · BAG</div>');
content = content.replace(/<span class="stat-icon" aria-hidden="true">.*?<\/span>(\s*<div class="stat-num" id="sCities">)/g, '<span class="stat-icon" aria-hidden="true">📍</span>$1');
content = content.replace(/<span class="stat-icon" aria-hidden="true">.*?<\/span>(\s*<div class="stat-num" id="sLead">)/g, '<span class="stat-icon" aria-hidden="true">⏳</span>$1');
content = content.replace(/<span class="stat-icon" aria-hidden="true">.*?<\/span>(\s*<div class="stat-num" id="sTemp">)/g, '<span class="stat-icon" aria-hidden="true">❄️</span>$1');
content = content.replace(/<span class="stat-icon" aria-hidden="true">.*?<\/span>(\s*<div class="stat-num" id="sWcag">)/g, '<span class="stat-icon" aria-hidden="true">♿</span>$1');
content = content.replace(/<button class="cat-tab" data-cat="corporate" role="tab" aria-selected="false">.*?Corporate/g, '<button class="cat-tab" data-cat="corporate" role="tab" aria-selected="false">💼 Corporate');
content = content.replace(/<span class="occ-emj" aria-hidden="true">.*?<\/span>Corporate/g, '<span class="occ-emj" aria-hidden="true">💼</span>Corporate');


content = content.replace(/♡<\/div>[\s\S]*?<div class="hc-name">/g, '♡</div>\n          <div class="hc-name">');

fs.writeFileSync('public/index.html', content, 'utf8');
console.log('Fixed exactly!');
