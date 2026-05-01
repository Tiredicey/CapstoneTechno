import SQLiteDB from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseClass {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = path.join(__dirname, '..', 'bloom.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new SQLiteDB(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createTables();
    this.migrate();
    this.seedAdmin();
    this.seedProducts();
    this.seedPromoCodes();
    this.seedFaqs();
    return this;
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        language TEXT DEFAULT 'en',
        occasion_profile TEXT DEFAULT '{}',
        loyalty_points INTEGER DEFAULT 0,
        biometric_token TEXT,
        phone TEXT,
        avatar TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        description TEXT,
        base_price REAL NOT NULL,
        images TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        inventory INTEGER DEFAULT 100,
        lead_time_days INTEGER DEFAULT 2,
        rating REAL DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        customizable INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS customizations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        product_id TEXT,
        config TEXT NOT NULL,
        preview_url TEXT,
        price_delta REAL DEFAULT 0,
        saved INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        items TEXT DEFAULT '[]',
        promo_code TEXT,
        discount REAL DEFAULT 0,
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        items TEXT NOT NULL,
        recipient TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_slot TEXT NOT NULL,
        recurring TEXT,
        pricing TEXT NOT NULL,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        status TEXT DEFAULT 'new',
        qr_code TEXT,
        tracking_steps TEXT DEFAULT '[]',
        florist_id TEXT,
        special_instructions TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        order_id TEXT,
        rating INTEGER NOT NULL,
        body TEXT,
        comment TEXT,
        photos TEXT DEFAULT '[]',
        user_name TEXT DEFAULT 'Customer',
        verified INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        order_id TEXT,
        channel TEXT DEFAULT 'chat',
        subject TEXT NOT NULL,
        messages TEXT DEFAULT '[]',
        status TEXT DEFAULT 'open',
        csat_score INTEGER,
        nps_score INTEGER,
        assigned_agent TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL,
        type TEXT,
        value REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        min_order REAL DEFAULT 0,
        max_uses INTEGER DEFAULT 1000,
        used_count INTEGER DEFAULT 0,
        expires_at INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        event_type TEXT NOT NULL,
        payload TEXT DEFAULT '{}',
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT DEFAULT 'text',
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS banners (
        id TEXT PRIMARY KEY,
        title TEXT,
        subtitle TEXT,
        image_url TEXT,
        link_url TEXT,
        link TEXT,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    `);
  }

  migrate() {
    const migrations = [
      `ALTER TABLE users ADD COLUMN phone TEXT`,
      `ALTER TABLE users ADD COLUMN avatar TEXT`,
      `ALTER TABLE reviews ADD COLUMN user_name TEXT DEFAULT 'Customer'`,
      `ALTER TABLE reviews ADD COLUMN comment TEXT`,
      `ALTER TABLE notifications ADD COLUMN message TEXT`,
      `ALTER TABLE banners ADD COLUMN link_url TEXT`,
      `ALTER TABLE promo_codes ADD COLUMN discount_type TEXT`,
      `ALTER TABLE promo_codes ADD COLUMN min_order_amount REAL DEFAULT 0`,
      `ALTER TABLE promo_codes ADD COLUMN created_at INTEGER DEFAULT 0`,
    ];
    for (const sql of migrations) {
      try { this.db.prepare(sql).run(); } catch {}
    }
    try {
      this.db.prepare(`
        UPDATE promo_codes SET discount_type = type WHERE discount_type IS NULL
      `).run();
      this.db.prepare(`
        UPDATE promo_codes SET min_order_amount = min_order WHERE min_order_amount = 0 AND min_order > 0
      `).run();
      this.db.prepare(`
        UPDATE banners SET link_url = link WHERE link_url IS NULL AND link IS NOT NULL
      `).run();
      this.db.prepare(`
        UPDATE notifications SET body = message WHERE body IS NULL AND message IS NOT NULL
      `).run();
    } catch {}

    try {
      const localImageMap = {
        prod_1:  '/uploads/products/crimson-vow.jpg',
        prod_2:  '/uploads/products/neon-blossom.jpg',
        prod_3:  '/uploads/products/velvet-midnight.jpg',
        prod_4:  '/uploads/products/obsidian-rose.jpg',
        prod_5:  '/uploads/products/phantom-orchid.jpg',
        prod_6:  '/uploads/products/executive-crimson.jpg',
        prod_7:  '/uploads/products/rebel-spark.jpg',
        prod_8:  '/uploads/products/shadow-garden.jpg',
        prod_9:  '/uploads/products/tulip-festival.jpg',
        prod_10: '/uploads/products/garden-peony.jpg'
      };
      const stale = this.db.prepare(
        `SELECT id, images FROM products WHERE images LIKE '%images.unsplash.com%' OR images LIKE '%pexels%' OR images LIKE '%null%'`
      ).all();
      if (stale.length) {
        const update = this.db.prepare('UPDATE products SET images = ? WHERE id = ?');
        const tx = this.db.transaction((rows) => {
          for (const row of rows) {
            const target = localImageMap[row.id];
            if (target) update.run(JSON.stringify([target]), row.id);
          }
        });
        tx(stale);
        console.log(`🌸 Migrated ${stale.length} product image(s) to local /uploads/products/*.jpg`);
      }
    } catch (e) {
      console.warn('[DB] product image migration skipped:', e && e.message);
    }
  }

  seedAdmin() {
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get('admin@bloom.com');
    if (existing) return;
    const hash = bcrypt.hashSync('Admin@1234', 10);
    this.db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(uuid(), 'admin@bloom.com', hash, 'Bloom Admin', 'admin');
    console.log('🌸 Admin created: admin@bloom.com / Admin@1234');
  }

  seedProducts() {
    const count = this.db.prepare('SELECT COUNT(*) AS c FROM products').get();
    if (count.c > 0) return;
    const insert = this.db.prepare(
      `INSERT INTO products
        (id, name, category, description, base_price, images, tags, inventory, customizable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const seed = this.db.transaction((rows) => {
      for (const r of rows) insert.run(...r);
    });
    seed([
      ['prod_1',  'Crimson Vow',        'bouquets',     'A timeless arrangement of dark red roses',          2799.44, JSON.stringify(['https://picsum.photos/seed/crimsonvow/800/800']),       JSON.stringify(['roses','classic','romance']),    50, 1],
      ['prod_2',  'Neon Blossom',       'bouquets',     'Striking neon-lit red floral arrangement',          2239.44, JSON.stringify(['https://picsum.photos/seed/neonblossom/800/800']),     JSON.stringify(['neon','urban']),                 40, 1],
      ['prod_3',  'Velvet Midnight',    'arrangements', 'Soothing yet dark lavender arrangement',            2519.44, JSON.stringify(['https://picsum.photos/seed/velvet/800/800']),  JSON.stringify(['lavender','dark']),              30, 1],
      ['prod_4',  'Obsidian Rose',      'bouquets',     'Deep, beautiful mix of shadowed red flowers',       1959.44, JSON.stringify(['https://picsum.photos/seed/obsidian/800/800']),    JSON.stringify(['dark','seasonal']),              60, 1],
      ['prod_5',  'Phantom Orchid',     'arrangements', 'Exotic orchids in a luxury black vase',             4479.44, JSON.stringify(['https://picsum.photos/seed/phantom/800/800']),   JSON.stringify(['orchids','luxury','exotic']),    20, 1],
      ['prod_6',  'Executive Crimson',  'bouquets',     'Bold crimson roses with elegant styling',           3639.44, JSON.stringify(['https://picsum.photos/seed/executive/800/800']),JSON.stringify(['roses','bold','corporate']),     35, 1],
      ['prod_7',  'Rebel Spark',        'arrangements', 'Vibrant pink and red against dark backgrounds',     3079.44, JSON.stringify(['https://picsum.photos/seed/rebel/800/800']),      JSON.stringify(['rebel','spark','modern']),       25, 1],
      ['prod_8',  'Shadow Garden',      'arrangements', 'Moody carnations and deep shadows',                 3919.44, JSON.stringify(['https://picsum.photos/seed/shadow/800/800']),    JSON.stringify(['dark','shadow','elegant']),      20, 1],
      ['prod_9',  'Tulip Festival',     'bouquets',     'Stylized mixed tulips with high contrast',          2407.44, JSON.stringify(['https://picsum.photos/seed/tulip/800/800']),   JSON.stringify(['tulips','colorful','stylish']),  45, 1],
      ['prod_10', 'Garden Peony',       'arrangements', 'Lush red peonies on absolute black',                3359.44, JSON.stringify(['https://picsum.photos/seed/garden/800/800']),     JSON.stringify(['peonies','dark','anniversary']), 30, 1]
    ]);
    console.log('🌸 Products seeded');
  }

  seedPromoCodes() {
    const count = this.db.prepare('SELECT COUNT(*) AS c FROM promo_codes').get();
    if (count.c > 0) return;
    const insert = this.db.prepare(
      `INSERT INTO promo_codes
        (id, code, discount_type, type, value, min_order_amount, min_order, max_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const seed = this.db.transaction((rows) => {
      for (const r of rows) insert.run(...r);
    });
    seed([
      ['promo_1', 'BLOOM10',   'percent',  'percent',  10,  0,   0,   1000],
      ['promo_2', 'BLOOM20',   'percent',  'percent',  20,  2800, 2800, 500],
      ['promo_3', 'FREESHIP',  'shipping', 'shipping', 100, 0,   0,   1000],
      ['promo_4', 'WELCOME15', 'percent',  'percent',  15,  0,   0,   2000]
    ]);
    console.log('🌸 Promo codes seeded');
  }

  seedFaqs() {
    const count = this.db.prepare('SELECT COUNT(*) AS c FROM faqs').get();
    if (count.c > 0) return;
    const insert = this.db.prepare(
      `INSERT INTO faqs (id, question, answer, category, sort_order) VALUES (?, ?, ?, ?, ?)`
    );
    const seed = this.db.transaction((rows) => {
      for (const r of rows) insert.run(...r);
    });
    seed([
      ['faq_1', 'What is Bloom?', 'Bloom is a comprehensive floral e-commerce platform developed as a Capstone Project by the BSIT students of STI College Lipa. It serves as a fully functional demonstration of modern web technologies.', 'general', 1],
      ['faq_2', 'Are the flowers real?', 'This platform is currently a technical demonstration. While the ordering system, payment flows, and data management are real and securely processed, no physical flowers will be delivered.', 'general', 2],
      ['faq_3', 'How is user data protected?', 'We employ enterprise-grade security including bcrypt password hashing, HTTP-only JWT cookies, CSRF tokens, and strict Content Security Policies.', 'security', 3],
      ['faq_4', 'Is this an actual business?', 'No, this is an academic capstone project to demonstrate proficiency in full-stack web development, UX/UI design, and secure database interactions.', 'general', 4],
      ['faq_5', 'Why the dark theme?', 'We adopted a Persona 5-inspired high-contrast UI to showcase advanced CSS methodologies, utilizing strict WCAG 2.1 AA compliant colors for accessibility.', 'technical', 5]
    ]);
    console.log('🌸 FAQs seeded');
  }

  get(sql, params = []) {
    const p = Array.isArray(params) ? params : [params];
    return this.db.prepare(sql).get(...p);
  }

  all(sql, params = []) {
    const p = Array.isArray(params) ? params : [params];
    return this.db.prepare(sql).all(...p);
  }

  run(sql, params = []) {
    const p = Array.isArray(params) ? params : [params];
    return this.db.prepare(sql).run(...p);
  }

  runTransaction(operations = []) {
    const txn = this.db.transaction((ops) => {
      for (const op of ops) {
        const p = Array.isArray(op.params) ? op.params : [op.params];
        this.db.prepare(op.sql).run(...p);
      }
    });
    txn(operations);
  }
}

const instance = new DatabaseClass().init();

export const Database = instance;
export default instance;
