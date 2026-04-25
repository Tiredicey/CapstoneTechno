const fs = require('fs');

const fixes = {
  'â±': '⏳',
  'ðŸ”': '📍',
  'â„': '❄️',
  'ðŸ¢': '💼',
  'â€': ''
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [bad, good] of Object.entries(fixes)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + filePath);
  } else {
    console.log('No matches in ' + filePath);
  }
}

fixFile('public/index.html');
