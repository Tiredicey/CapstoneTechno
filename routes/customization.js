import { Router } from 'express';
import { Database } from '../database/Database.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `custom_${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

function calculatePriceDelta(config = {}) {
  let delta = 0;
  if (config.wrapping === 'premium') delta += 8;
  if (config.wrapping === 'luxury') delta += 15;
  if (config.ribbon === 'satin') delta += 3;
  if (config.ribbon === 'velvet') delta += 6;
  if (config.engraving) delta += 12;
  if (config.giftBox) delta += 10;
  if (config.logoUpload) delta += 20;
  if (config.customDesign) delta += 15;
  if (config.extraBlooms) delta += Number(config.extraBlooms) * 2;
  return delta;
}

router.post('/', optionalAuth, (req, res) => {
  try {
    const { productId, config } = req.body;
    if (!productId || !config) return res.status(400).json({ error: 'productId and config required' });
    const id = uuid();
    const priceDelta = calculatePriceDelta(config);
    Database.run(
      'INSERT INTO customizations (id, user_id, product_id, config, price_delta) VALUES (?, ?, ?, ?, ?)',
      [id, req.user?.id || null, productId, JSON.stringify(config), priceDelta]
    );
    res.status(201).json({ id, priceDelta });
  } catch (err) {
    console.error('[CUSTOMIZATION CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create customization' });
  }
});

router.put('/:id', optionalAuth, (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'config required' });
    const priceDelta = calculatePriceDelta(config);
    Database.run(
      'UPDATE customizations SET config = ?, price_delta = ? WHERE id = ?',
      [JSON.stringify(config), priceDelta, req.params.id]
    );
    res.json({ priceDelta });
  } catch (err) {
    console.error('[CUSTOMIZATION UPDATE ERROR]', err);
    res.status(500).json({ error: 'Failed to update customization' });
  }
});

router.post('/:id/save', authenticate, (req, res) => {
  try {
    Database.run(
      'UPDATE customizations SET saved = 1, user_id = ? WHERE id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ saved: true });
  } catch (err) {
    console.error('[CUSTOMIZATION SAVE ERROR]', err);
    res.status(500).json({ error: 'Failed to save customization' });
  }
});

router.get('/saved', authenticate, (req, res) => {
  try {
    const saved = Database.all(
      'SELECT c.*, p.name as product_name, p.base_price FROM customizations c JOIN products p ON c.product_id = p.id WHERE c.user_id = ? AND c.saved = 1 ORDER BY c.created_at DESC',
      [req.user.id]
    );
    res.json(saved.map(c => ({
      ...c,
      config: typeof c.config === 'string' ? JSON.parse(c.config || '{}') : c.config
    })));
  } catch (err) {
    console.error('[CUSTOMIZATION SAVED ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch saved customizations' });
  }
});

router.post('/upload', upload.single('design'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/products/${req.file.filename}` });
  } catch (err) {
    console.error('[CUSTOMIZATION UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;