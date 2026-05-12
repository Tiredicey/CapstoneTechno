import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { SocketManager } from '../sockets/SocketManager.js';
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
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    cb(null, ok.includes(path.extname(file.originalname).toLowerCase()));
  }
});

const router = Router();

const toBool = (v, fallback = 1) => {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'on', 'yes'].includes(s)) return 1;
  if (['0', 'false', 'off', 'no'].includes(s)) return 0;
  return fallback;
};

router.get('/', (req, res) => {
  try {
    const rows = db.all(`SELECT * FROM banners ORDER BY sort_order ASC, created_at ASC`);
    res.set('Cache-Control', 'no-store');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

router.post('/', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order, image_url, active } = req.body;
    const finalImageUrl = req.file ? `/uploads/products/${req.file.filename}` : (image_url || '');
    const finalLink = link_url || '';
    const id = uuid();
    db.run(
      `INSERT INTO banners (id, title, subtitle, image_url, link_url, link, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title || '', subtitle || '', finalImageUrl, finalLink, finalLink, Number(sort_order) || 0, toBool(active, 1)]
    );
    const banner = db.get(`SELECT * FROM banners WHERE id = ?`, [id]);
    SocketManager.emitBannerUpdate({ action: 'created', banner });
    res.status(201).json(banner);
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

    let finalImageUrl = existing.image_url || '';
    if (req.file) {
      finalImageUrl = `/uploads/products/${req.file.filename}`;
      if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', existing.image_url);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }
    } else if (image_url !== undefined) {
      finalImageUrl = image_url;
    }

    const finalLink = link_url !== undefined ? link_url : (existing.link_url || existing.link || '');
    db.run(
      `UPDATE banners SET title=?, subtitle=?, image_url=?, link_url=?, link=?, sort_order=?, active=? WHERE id=?`,
      [
        title ?? existing.title,
        subtitle ?? existing.subtitle,
        finalImageUrl,
        finalLink,
        finalLink,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        active !== undefined ? toBool(active, existing.active) : existing.active,
        req.params.id
      ]
    );
    const banner = db.get(`SELECT * FROM banners WHERE id = ?`, [req.params.id]);
    SocketManager.emitBannerUpdate({ action: 'updated', banner });
    res.json(banner);
  } catch (err) {
    console.error('[BANNER UPDATE]', err);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const banner = db.get(`SELECT image_url FROM banners WHERE id = ?`, [req.params.id]);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    if (banner.image_url && banner.image_url.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, '..', banner.image_url);
      try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
    }
    db.run(`DELETE FROM banners WHERE id = ?`, [req.params.id]);
    SocketManager.emitBannerUpdate({ action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error('[BANNER DELETE]', err);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

export default router;
