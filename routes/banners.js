import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
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
  filename: (req, file, cb) => cb(null, `banner_${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', (req, res) => {
  try {
    res.json(db.all(`SELECT * FROM banners ORDER BY sort_order ASC`));
  } catch (err) {
    console.error('[BANNERS GET]', err);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

router.post('/', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order, image_url } = req.body;
    const finalImageUrl = req.file ? `/uploads/products/${req.file.filename}` : (image_url || '');
    const finalLink = link_url || '';
    const id = uuid();
    db.run(
      `INSERT INTO banners (id, title, subtitle, image_url, link_url, link, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, title || '', subtitle || '', finalImageUrl, finalLink, finalLink, Number(sort_order) || 0]
    );
    res.status(201).json(db.get(`SELECT * FROM banners WHERE id = ?`, [id]));
  } catch (err) {
    console.error('[BANNER CREATE]', err);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

router.put('/:id', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM banners WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Banner not found' });
    const { title, subtitle, link_url, sort_order, active, image_url } = req.body;
    const finalImageUrl = req.file ? `/uploads/products/${req.file.filename}` : (image_url || existing.image_url || '');
    const finalLink = link_url || existing.link_url || existing.link || '';
    db.run(
      `UPDATE banners SET title=?, subtitle=?, image_url=?, link_url=?, link=?, sort_order=?, active=? WHERE id=?`,
      [
        title      ?? existing.title,
        subtitle   ?? existing.subtitle,
        finalImageUrl, finalLink, finalLink,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        active     !== undefined ? (active ? 1 : 0) : existing.active,
        req.params.id
      ]
    );
    res.json(db.get(`SELECT * FROM banners WHERE id = ?`, [req.params.id]));
  } catch (err) {
    console.error('[BANNER UPDATE]', err);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    if (!db.get(`SELECT id FROM banners WHERE id = ?`, [req.params.id])) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    db.run(`DELETE FROM banners WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[BANNER DELETE]', err);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

export default router;