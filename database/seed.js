import db from './Database.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  avatar TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  base_price REAL NOT NULL,
  images TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  inventory INTEGER DEFAULT 0,
  lead_time_days INTEGER DEFAULT 1,
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  customizable INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT DEFAULT 'text',
  updated_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  items TEXT DEFAULT '[]',
  pricing TEXT DEFAULT '{}',
  recipient TEXT DEFAULT '{}',
  status TEXT DEFAULT 'new',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  delivery_date TEXT,
  delivery_slot TEXT,
  special_instructions TEXT,
  qr_code TEXT,
  tracking_code TEXT,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS cart (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  items TEXT DEFAULT '[]',
  updated_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT,
  order_id TEXT,
  rating INTEGER NOT NULL,
  body TEXT,
  photos TEXT DEFAULT '[]',
  user_name TEXT,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  order_id TEXT,
  channel TEXT DEFAULT 'chat',
  subject TEXT NOT NULL,
  messages TEXT DEFAULT '[]',
  status TEXT DEFAULT 'open',
  csat_score INTEGER,
  nps_score INTEGER,
  discount_code TEXT,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_order REAL DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  expires_at INTEGER
)`);

db.run(`CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT,
  title TEXT,
  message TEXT,
  read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  data TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch())
)`);

db.run(`CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  link TEXT,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
)`);

const adminId = uuid();
const adminHash = bcrypt.hashSync('Admin@1234', 10);
db.run(`INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
  [adminId, 'admin@bloom.com', adminHash, 'Bloom Admin', 'admin']);

const products = [
  { name: 'Crimson Horizon', category: 'fresh', subcategory: 'roses', description: 'Twelve deep red roses, hand-wrapped in kraft and satin ribbon.', base_price: 64.99, images: JSON.stringify(['/uploads/products/crimson-horizon.jpg']), tags: JSON.stringify(['romantic','anniversary','red']), inventory: 80, lead_time_days: 1, customizable: 1 },
  { name: 'Blush Drift', category: 'fresh', subcategory: 'mixed', description: 'Soft pinks and creams — ranunculus, garden roses, dusty miller.', base_price: 74.99, images: JSON.stringify(['/uploads/products/blush-drift.jpg']), tags: JSON.stringify(['wedding','birthday','pink']), inventory: 60, lead_time_days: 2, customizable: 1 },
  { name: 'Midnight Garden', category: 'dried', subcategory: 'pampas', description: 'Dried pampas grass, protea, and eucalyptus in a matte black wrap.', base_price: 89.99, images: JSON.stringify(['/uploads/products/midnight-garden.jpg']), tags: JSON.stringify(['modern','sympathy','neutral']), inventory: 45, lead_time_days: 3, customizable: 0 },
  { name: 'Solar Burst', category: 'fresh', subcategory: 'sunflowers', description: 'Bold sunflowers and orange dahlias with lemon grass.', base_price: 54.99, images: JSON.stringify(['/uploads/products/solar-burst.jpg']), tags: JSON.stringify(['birthday','cheerful','yellow']), inventory: 70, lead_time_days: 1, customizable: 1 },
  { name: 'Corporate Prestige', category: 'branded', subcategory: 'arrangement', description: 'Structured white and green arrangement with logo-embossed ribbon.', base_price: 129.99, images: JSON.stringify(['/uploads/products/corporate-prestige.jpg']), tags: JSON.stringify(['corporate','formal','white']), inventory: 30, lead_time_days: 3, customizable: 0 },
  { name: 'Bundle Rush', category: 'bundled', subcategory: 'deal', description: 'Three seasonal bouquets plus a scented candle.', base_price: 149.99, images: JSON.stringify(['/uploads/products/bundle-rush.jpg']), tags: JSON.stringify(['deal','gift','seasonal']), inventory: 25, lead_time_days: 2, customizable: 0 },
  { name: 'Engravable Vase Set', category: 'merchandise', subcategory: 'vase', description: 'Matte ceramic vase with laser-engraved personalization.', base_price: 49.99, images: JSON.stringify(['/uploads/products/vase-set.jpg']), tags: JSON.stringify(['gift','personalized','home']), inventory: 100, lead_time_days: 4, customizable: 1 },
  { name: 'Premium Greeting Cards', category: 'merchandise', subcategory: 'cards', description: 'Pack of 10 premium textured cards with custom message printing.', base_price: 24.99, images: JSON.stringify(['/uploads/products/cards.jpg']), tags: JSON.stringify(['greeting','custom','message']), inventory: 200, lead_time_days: 2, customizable: 1 }
];

for (const p of products) {
  db.run(`INSERT OR IGNORE INTO products (id, name, category, subcategory, description, base_price, images, tags, inventory, lead_time_days, customizable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), p.name, p.category, p.subcategory, p.description, p.base_price, p.images, p.tags, p.inventory, p.lead_time_days, p.customizable]);
}

const faqs = [
  { question: 'How long do fresh flowers last?', answer: 'Fresh flowers typically last 5–7 days with proper care — trim stems daily and change water every 2 days.', category: 'products', sort_order: 1 },
  { question: 'Do you offer same-day delivery?', answer: 'Yes! Orders placed before 12:00 PM qualify for same-day delivery within Metro Manila.', category: 'delivery', sort_order: 2 },
  { question: 'Can I customize my bouquet?', answer: 'Absolutely. Use our Customization Studio to choose flowers, colors, wrapping, and add a personal message.', category: 'products', sort_order: 3 },
  { question: 'What is your return/freshness policy?', answer: 'We guarantee freshness for 24 hours from delivery. Contact support with a photo if unsatisfied.', category: 'general', sort_order: 4 },
  { question: 'How do promo codes work?', answer: 'Enter your promo code at checkout. Percent codes reduce the subtotal; shipping codes waive delivery fees.', category: 'payment', sort_order: 5 },
  { question: 'Can I track my order?', answer: 'Yes — visit the Track page and enter your order ID or QR code to see real-time status updates.', category: 'delivery', sort_order: 6 }
];

for (const f of faqs) {
  db.run(`INSERT OR IGNORE INTO faqs (id, question, answer, category, sort_order) VALUES (?, ?, ?, ?, ?)`,
    [uuid(), f.question, f.answer, f.category, f.sort_order]);
}

const defaultContent = [
  { key: 'hero_title', value: 'Every Bloom Tells a Story', type: 'text' },
  { key: 'hero_subtitle', value: 'Handcrafted arrangements delivered with love across the Philippines.', type: 'text' },
  { key: 'hero_image', value: '', type: 'image' },
  { key: 'about_text', value: 'Bloom is a boutique flower shop dedicated to artisan floral design.', type: 'text' },
  { key: 'contact_email', value: 'hello@bloom.ph', type: 'text' },
  { key: 'contact_phone', value: '+63 912 345 6789', type: 'text' },
  { key: 'delivery_fee', value: '150', type: 'text' },
  { key: 'free_delivery_threshold', value: '500', type: 'text' }
];

for (const c of defaultContent) {
  db.run(`INSERT OR IGNORE INTO site_content (key, value, type) VALUES (?, ?, ?)`,
    [c.key, c.value, c.type]);
}

const promoCodes = [
  { code: 'BLOOM10', type: 'percent', value: 10, min_order: 30, max_uses: 500 },
  { code: 'FREESHIP', type: 'shipping', value: 100, min_order: 0, max_uses: 1000 },
  { code: 'WELCOME20', type: 'percent', value: 20, min_order: 50, max_uses: 200 }
];

for (const p of promoCodes) {
  db.run(`INSERT OR IGNORE INTO promo_codes (id, code, type, value, min_order, max_uses) VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), p.code, p.type, p.value, p.min_order, p.max_uses]);
}

console.log('✅ Database seeded — admin@bloom.com / Admin@1234');