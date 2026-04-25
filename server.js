import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { createHandler } from 'graphql-http/lib/use/express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { schema } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { rateLimiter } from './middleware/rateLimiter.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({ origin: '*' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/faq', faqRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

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
  const staticPages = ['/', '/catalog.html', '/cart.html', '/customize.html', '/support.html'];
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
  } catch {}
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
  console.error('[SERVER ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌸 Bloom running on http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
