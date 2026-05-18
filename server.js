import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { execSync } from 'child_process';
import { createHandler } from 'graphql-http/lib/use/express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { schema } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { inputSanitizer } from './middleware/sanitize.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import customizationRoutes from './routes/customization.js';
import supportRoutes from './routes/support.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import faqRoutes from './routes/faq.js';
import contentRoutes from './routes/content.js';
import bannerRoutes from './routes/banners.js';
import promoRoutes from './routes/promos.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import { SocketManager } from './sockets/SocketManager.js';
import { authenticate } from './middleware/auth.js';
import db from './database/Database.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
  console.log('🧬 Running Pre-Boot Page Generation...');
  execSync('node generatePages.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('✨ Pre-Boot Page Generation Completed Successfully.');
} catch (e) {
  console.error('❌ Pre-Boot Page Generation FAILED:', e.message);
}
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.set('trust proxy', 1);
const IS_PROD = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: IS_PROD ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io", "https://ajax.googleapis.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://picsum.photos", "https://fastly.picsum.photos", "https://images.unsplash.com", "https://images.pexels.com", "https://image.pollinations.ai", "https://media.sketchfab.com", "https://static.sketchfab.com", "https://api.qrserver.com"],
      connectSrc: ["'self'", "wss:", "ws:", "blob:", "data:", "https://image.pollinations.ai", "https://text.pollinations.ai", "https://gen.pollinations.ai", "https://modelviewer.dev", "https://cdn.jsdelivr.net", "https://arvr.google.com"],
      mediaSrc: ["'self'", "blob:", "https://videos.pexels.com", "https://player.vimeo.com"],
      frameSrc: ["https://sketchfab.com", "https://arvr.google.com", "https://embed.windy.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  } : false
}));
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);
app.use(inputSanitizer);
app.use(cookieParser());
import { existsSync } from 'fs';
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATIC_ROOT = IS_PROD && existsSync(DIST_DIR) ? DIST_DIR : PUBLIC_DIR;
app.use(express.static(STATIC_ROOT, {
  maxAge: IS_PROD ? '1y' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (IS_PROD && (filePath.endsWith('.min.js') || filePath.endsWith('.min.css'))) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
if (IS_PROD && existsSync(DIST_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/banners', bannerRoutes);
app.use('/api/admin/promos', promoRoutes);
app.use('/api/admin/reviews', reviewRoutes);
app.use('/api/admin/content', contentRoutes);
app.use('/api/admin/faqs', faqRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.post('/api/newsletter', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (email TEXT UNIQUE, subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)`, [email]);
    res.json({ success: true, message: 'Subscription saved successfully' });
  } catch (e) {
    console.error('[NEWSLETTER-BACKEND]', e);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});
import multer from 'multer';
import { writeFileSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
const AR_DIR = path.join(__dirname, 'uploads', 'ar');
mkdirSync(AR_DIR, { recursive: true });
const arUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
app.post('/api/customization/ar-model', arUpload.single('model'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No model uploaded' });
    const id = randomBytes(10).toString('hex');
    const filename = `bouquet-${id}.glb`;
    writeFileSync(path.join(AR_DIR, filename), req.file.buffer);
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    res.json({ url: `${proto}://${host}/uploads/ar/${filename}`, id });
  } catch (e) {
    console.error('[AR-UPLOAD]', e);
    res.status(500).json({ error: 'AR upload failed' });
  }
});
app.get('/api/wishlist', authenticate, (req, res) => {
  try {
    const items = db.all(
      `SELECT w.product_id, w.added_at, p.name, p.base_price AS price, p.images, p.category
       FROM wishlists w LEFT JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? ORDER BY w.added_at DESC`,
      [req.user.id]
    );
    res.set('Cache-Control', 'no-store');
    res.json(items);
  } catch (err) {
    console.error('[WISHLIST]', err);
    res.json([]);
  }
});
app.post('/api/wishlist/:productId', authenticate, (req, res) => {
  try {
    db.run(`INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)`,
      [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.delete('/api/wishlist/:productId', authenticate, (req, res) => {
  try {
    db.run(`DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`,
      [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
try {
  const executableSchema = makeExecutableSchema({ typeDefs: schema, resolvers });
  app.use('/graphql', createHandler({ schema: executableSchema }));
} catch (e) {
  console.warn('[GRAPHQL] Schema load failed — skipping GraphQL endpoint:', e.message);
}
SocketManager.init(io);
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    routes: [
      '/api/auth', '/api/products', '/api/cart', '/api/orders',
      '/api/customization', '/api/support', '/api/analytics', '/api/admin',
      '/api/faq', '/api/content', '/api/banners', '/api/promos',
      '/api/users', '/api/reviews', '/api/notifications'
    ]
  });
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/sitemap.xml', async (req, res) => {
  const host = req.protocol + '://' + req.get('host');
  const staticPages = ['/', '/catalog.html', '/cart.html', '/customize.html', '/support.html', '/about.html', '/blog.html', '/contact.html', '/shipping.html', '/returns.html', '/privacy.html'];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  staticPages.forEach(p => {
    xml += '  <url><loc>' + host + p + '</loc><changefreq>weekly</changefreq><priority>' + (p === '/' ? '1.0' : '0.7') + '</priority></url>\n';
  });
  try {
    const db = (await import('./database/Database.js')).default;
    const products = db.all('SELECT id FROM products WHERE is_active = 1');
    products.forEach(p => {
      xml += '  <url><loc>' + host + '/catalog.html?id=' + p.id + '</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n';
    });
  } catch { }
  xml += '</urlset>';
  res.set('Content-Type', 'application/xml').send(xml);
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Uploaded file exceeds the maximum size limit' });
    }
    return res.status(400).json({ error: 'Upload configuration error: ' + err.message });
  }
  if (err.message && err.message.indexOf('type') !== -1) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌸 Bloom running on http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
