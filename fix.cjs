const fs = require('fs');

const fixes = {
  'ðŸ‡ºðŸ‡¸': '🇺🇸',
  'â€“': '–',
  'Â°': '°',
  'â€”': '—',
  'Â·': '·',
  'â†’': '→',
  'â€¹': '‹',
  'ðŸ’': '💐',
  'ðŸŒ¸': '🌸',
  'ðŸŒ·': '🌷',
  'ðŸŒ¿': '🌿',
  'ðŸ¢': '💼',
  'â€º': '›',
  'â™¡': '♡',
  'â˜…': '★',
  'â‚±': '₱',
  'â€¢': '•',
  'â„': '❄️',
  'â™¿': '♿',
  'âœ•': '✕',
  'â€': ''
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [bad, good] of Object.entries(fixes)) {
    content = content.split(bad).join(good);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed ' + filePath);
}

fixFile('public/index.html');
