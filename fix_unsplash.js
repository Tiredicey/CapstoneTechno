import fs from 'fs';
import path from 'path';

function replaceImages(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace all Unsplash URLs with the local image asset
    const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?[a-zA-Z0-9=&]+/g;
    
    const newContent = content.replace(regex, '/img/hero-flowers.jpg');
    
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log('Replaced Unsplash URLs in:', filePath);
  } catch (e) {
    console.error('Error replacing in', filePath, e);
  }
}

replaceImages('./public/index.html');
replaceImages('./database/Database.js');
