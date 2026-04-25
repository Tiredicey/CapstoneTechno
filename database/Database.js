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
      ['prod_1',  'Classic Rose Bouquet',  'bouquets',     'A timeless arrangement of red roses',          2799.44, JSON.stringify(['https://picsum.photos/seed/p1/600/400']),  JSON.stringify(['roses','classic','romance']),       50, 1],
      ['prod_2',  'Sunflower Bliss',        'bouquets',     'Bright sunflowers to light up any room',       2239.44, JSON.stringify(['https://picsum.photos/seed/p2/600/400']),      JSON.stringify(['sunflowers','cheerful']),           40, 1],
      ['prod_3',  'Lavender Dreams',        'arrangements', 'Soothing lavender arrangement',                2519.44, JSON.stringify(['https://picsum.photos/seed/p3/600/400']),       JSON.stringify(['lavender','calming']),              30, 1],
      ['prod_4',  'Mixed Wildflowers',      'bouquets',     'A wild and beautiful mix of seasonal flowers', 1959.44, JSON.stringify(['https://picsum.photos/seed/p4/600/400']),    JSON.stringify(['wildflowers','seasonal']),          60, 1],
      ['prod_5',  'Orchid Elegance',        'arrangements', 'Exotic orchids in a luxury vase',              4479.44, JSON.stringify(['https://picsum.photos/seed/p5/600/400']),         JSON.stringify(['orchids','luxury','exotic']),       20, 1],
      ['prod_6',  'Crimson Horizon',        'bouquets',     'Bold crimson roses with dark foliage',         3639.44, JSON.stringify(['https://picsum.photos/seed/p6/600/400']),         JSON.stringify(['roses','bold','romance']),         35, 1],
      ['prod_7',  'Blush Drift',            'arrangements', 'Soft blush peonies and ranunculus',            3079.44, JSON.stringify(['https://picsum.photos/seed/p7/600/400']),           JSON.stringify(['peonies','soft','wedding']),       25, 1],
      ['prod_8',  'White Elegance',         'arrangements', 'Pure white lilies and orchids',                3919.44, JSON.stringify(['https://picsum.photos/seed/p8/600/400']),           JSON.stringify(['lilies','white','wedding']),       20, 1],
      ['prod_9',  'Tulip Festival',         'bouquets',     'Vibrant mixed tulips for any occasion',        2407.44, JSON.stringify(['https://picsum.photos/seed/p9/600/400']),          JSON.stringify(['tulips','colorful','spring']),     45, 1],
      ['prod_10', 'Garden Peony',           'arrangements', 'Lush garden peonies in full bloom',            3359.44, JSON.stringify(['https://picsum.photos/seed/p10/600/400']),           JSON.stringify(['peonies','garden','anniversary']), 30, 1]
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
