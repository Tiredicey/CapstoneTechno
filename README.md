# 🌸 Bloom — Floral E-Commerce Capstone Platform

> A comprehensive, full-stack e-commerce system developed as a Capstone Project by the **BSIT students of STI College Lipa**.
> Designed with a "Persona 5" inspired high-contrast UI, strict WCAG 2.1 AA accessibility, and enterprise-grade security.

---

## 📌 What This Is

Bloom is a fully functional demonstration of modern web technologies. It features a customer-facing storefront, a comprehensive admin dashboard, and real-time synchronization between the two. **Everything is powered by Admins**—from products and banners to dynamic FAQs and order tracking. 

*Note: This is an academic technical demonstration. No physical flowers are shipped, and logistics are simulated.*

---

## 🗂 Quick Index

| I want to... | Go to |
|---|---|
| Just run it locally | [→ Quick Start](#-quick-start) |
| Understand the Architecture | [→ Architecture & State](#-architecture--state) |
| See the tech used | [→ Tech Stack & Security](#-tech-stack--security) |
| Admin Powers | [→ Admin Powers](#-admin-powers) |

---

## ✅ Quick Start

**1. Install Dependencies**
```bash
npm install
```

**2. Environment Setup**
```bash
cp .env.example .env
```
Fill in your required values in the `.env` file.

**3. Start the Server**
```bash
npm start
```
*The SQLite database will auto-initialize on the first run. The system relies entirely on local assets (no unreliable external CDNs or Unsplash links).*

---

## 🏛 Architecture & State

Bloom utilizes advanced client-side state management mapped to a robust Express/SQLite backend, entirely bypassing heavy frontend frameworks.

### 1. State Management (`Store.js`)
- **Cross-Tab Sync:** Utilizes `BroadcastChannel` (`bloom_sync`) to instantly sync logins, logouts, cart counts, and theme preferences across all open browser tabs.
- **Offline Mutations:** Failed non-GET requests are queued into **IndexedDB** (`bloom_offline`). A Service Worker (`sw.js`) Background Sync (`bloom-sync`) automatically replays these mutations when connectivity is restored.
- **Theming & Localization:** Supports dynamic Dark/Light themes and 4 languages (English, Filipino, Spanish, Japanese) via a custom `I18n.js` engine.

### 2. Real-Time Sync (`Socket.io`)
Customers never need to refresh. If an Admin updates a product, changes a hero banner, modifies site content, or edits the FAQ, the server broadcasts the event, and the client `Store` updates the UI instantly.

### 3. Modal & Accessibility (WCAG 2.1 AA)
All modals (Auth, Product, FAQ) implement strict focus-trapping, ARIA labeling (`aria-hidden`, `aria-modal`), and Escape-key listeners to ensure full screen-reader and keyboard navigation compliance. UI copy is designed to be non-confrontational and comforting.

---

## 👑 Admin Powers

**Everything in Bloom is handled by Admins.**
You must be logged in as an Admin to access `/admin.html`. 

To make yourself an admin, run this in your SQLite database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

**Admin Capabilities:**
- **Storefront Control:** Create, edit, and delete products. Changes push live to customers instantly.
- **Dynamic Content:** Edit Hero Banners, Promo Codes, and Site Content.
- **FAQ Management:** The Support page FAQs are fully dynamic. Admins can add, edit, and categorize FAQs directly from the dashboard.
- **Order Logistics:** Update order statuses to simulate the cold-chain logistics network.

---

## 🛡 Tech Stack & Security

| Layer | Technology / Implementation |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite3 (`better-sqlite3`) — Local & lightweight |
| **Real-time** | Socket.IO (Room-based isolation for Admin/Users) |
| **Frontend** | Vanilla JavaScript, CSS Variables (No external frameworks) |
| **PWA / Offline** | Service Workers (`sw.js`), IndexedDB, Web App Manifest |

### Security Implementations
- **Authentication:** `HttpOnly`, `SameSite=Strict` secure cookies for JWTs. Fallback Bearer tokens for API clients.
- **CSRF Protection:** HMAC-SHA256 signed CSRF tokens generated per-session (1-hour TTL). Automatically attached to all mutating requests (POST/PUT/DELETE) by `Api.js`.
- **Password Hashing:** `bcrypt` integration for all user credentials.
- **Rate Limiting:** In-memory backoff tracking using `Retry-After` headers.
- **Data Sanitization:** Strict parameterized SQL queries to prevent SQL Injection.

---

## 🔗 Key URLs

| URL | Purpose |
|---|---|
| `/` | Customer storefront |
| `/support.html` | Omnichannel Support & Dynamic Admin FAQ |
| `/admin.html` | Secure Admin Control Panel |
| `/about.html` | STI LIPA Capstone Team Details |

---

<div align="center">

**Built with 🌸 by the STI LIPA BSIT Capstone Team**

*One step at a time is still progress.*

</div>
