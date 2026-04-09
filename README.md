```markdown
# 🌸 Bloom — Flower Shop Platform

> A full-stack flower shop with real-time admin → storefront sync.
> Take it one step at a time. Everything here is optional to read in order.

---

## 📌 What This Is

A complete e-commerce system built for a flower shop.
It has a customer-facing storefront, an admin panel, and live updates between them.

**You do not need to read this all at once.**

---

## 🗂 Quick Index

| I want to... | Go to |
|---|---|
| Just run it locally | [→ Quick Start](#-quick-start) |
| Deploy it live | [→ Deployment](#-deployment) |
| Understand the folder layout | [→ Structure](#-project-structure) |
| Know what's connected to what | [→ How It Works](#-how-it-works) |
| See the tech used | [→ Stack](#-tech-stack) |
| Fix something | [→ Common Issues](#-common-issues) |

---

## ✅ Quick Start

> Three steps. That's it.

**1. Install**
```bash
npm install
```

**2. Set up your environment**
```bash
cp .env.example .env
```
Then open `.env` and fill in your values.
Each variable has a comment explaining what it is.

**3. Run**
```bash
npm start
```

or on Windows:
```
start.bat
```

**That's all.** Open `http://localhost:3000` in your browser.

---

## 🌐 Deployment

> You can skip this section if you're only running locally.

### Option A — Tunnel (Fastest, No Setup)
```bash
tunnel.bat
```
Gives you a public URL instantly. Good for demos.

### Option B — Self-Hosted Server

**1. Copy your `.env` to the server**

**2. Install & build**
```bash
npm install
```

**3. Start with a process manager**
```bash
npm install -g pm2
pm2 start server.js --name bloom
pm2 save
```

**4. Set up your reverse proxy (nginx example)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option C — GitHub Actions (Auto-Deploy)

The workflow files are already in `.github/workflows/`.

| File | What it does |
|---|---|
| `deploy.yml` | Deploys on push to `main` |
| `backend-health.yml` | Checks the server is alive |

Just add your server secrets to GitHub:
`Settings → Secrets → Actions`

| Secret Name | What to put |
|---|---|
| `SSH_HOST` | Your server IP |
| `SSH_USER` | Your SSH username |
| `SSH_KEY` | Your private SSH key |

---

## 🔑 Environment Variables

> Only the ones marked ⚠️ are required to run.

```env
# ⚠️ Required
PORT=3000
JWT_SECRET=your_secret_here

# Database (SQLite — no setup needed)
DB_PATH=./database/bloom.db

# Optional — Email notifications
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Optional — Public tunnel URL
PUBLIC_URL=
```

---

## 📁 Project Structure

> You don't need to know all of this. Just the parts you touch.

```
bloom/
│
├── 📂 public/              ← Everything the customer sees
│   ├── index.html          ← Homepage
│   ├── catalog.html        ← Shop / browse products
│   ├── cart.html           ← Cart
│   ├── checkout.html       ← Checkout
│   ├── tracking.html       ← Order tracking
│   │
│   ├── admin.html          ← Admin panel entry point
│   ├── admin/              ← Admin sub-pages
│   │   ├── dashboard.html
│   │   ├── orders.html
│   │   └── analytics.html
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── Store.js    ← App state + real-time socket hub
│   │   │   └── Api.js      ← All HTTP calls go through here
│   │   │
│   │   ├── landing.js      ← Homepage logic
│   │   ├── catalog.js      ← Product browsing
│   │   ├── cart.js         ← Cart management
│   │   ├── checkout.js     ← Checkout flow
│   │   ├── tracking.js     ← Order tracking
│   │   └── admin.js        ← Admin panel logic
│   │
│   └── css/                ← All styles
│
├── 📂 routes/              ← API endpoints (backend)
│   ├── products.js         ← /api/products
│   ├── orders.js           ← /api/orders
│   ├── cart.js             ← /api/cart
│   ├── auth.js             ← /api/auth
│   ├── admin.js            ← /api/admin
│   ├── banners.js          ← /api/banners
│   ├── promos.js           ← /api/promos
│   └── notifications.js    ← /api/notifications
│
├── 📂 sockets/
│   └── SocketManager.js    ← Real-time sync engine
│
├── 📂 services/
│   ├── PricingEngine.js    ← Discount / promo math
│   ├── NotificationService.js
│   ├── RecommendationEngine.js
│   └── TrackingService.js
│
├── 📂 models/              ← Database access
├── 📂 middleware/          ← Auth, rate limiting, validation
├── 📂 database/            ← SQLite setup + seed data
│
├── server.js               ← Entry point
└── .env                    ← Your config (never commit this)
```

---

## ⚡ How It Works

> The short version.

```
Customer browses shop
        ↓
Admin makes a change (product / banner / promo / order status)
        ↓
Server saves it to the database
        ↓
SocketManager broadcasts to connected clients
        ↓
Customer's browser updates automatically — no refresh needed
```

### What updates in real time

| Admin Action | Customer Sees |
|---|---|
| Add / edit / delete product | Catalog refreshes |
| Update order status | Tracking page updates + notification |
| Create / edit banner | Homepage banner changes |
| Edit site content | Homepage text updates |
| Create / edit promo | Cart notified |
| Broadcast notification | Toast popup appears |
| Ban / update user role | User session updates |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Real-time | Socket.IO |
| Auth | JWT |
| API style | REST + GraphQL |
| Frontend | Vanilla JS (no framework) |
| File uploads | Multer |
| Deployment | PM2 + nginx |
| CI/CD | GitHub Actions |

---

## 👤 Roles

| Role | Access |
|---|---|
| `customer` | Shop, cart, checkout, order tracking |
| `admin` | Everything above + full admin panel |

**To make a user admin:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
Run this in your SQLite database after registering.

---

## 🌱 First-Time Data (Seed)

To populate the database with sample products:
```bash
node database/seed.js
```

---

## 🔗 Key URLs

| URL | What's there |
|---|---|
| `/` | Customer homepage |
| `/catalog.html` | Shop / browse |
| `/cart.html` | Cart |
| `/checkout.html` | Checkout |
| `/tracking.html` | Order tracking |
| `/admin.html` | Admin panel |
| `/api/...` | All backend endpoints |
| `/health` | Server status check |
| `/graphql` | GraphQL endpoint |

---

## 🩺 Common Issues

> Check here before anything else.

<details>
<summary>🔴 Server won't start</summary>

- Check that `.env` exists — copy from `.env.example` if not
- Run `npm install` again
- Check the terminal — the error message will tell you what's missing

</details>

<details>
<summary>🔴 Real-time updates not working</summary>

- Make sure `socket.io` is loading on the page (check browser console)
- Check that `JWT_SECRET` is the same in `.env` as when users registered
- If behind nginx, make sure WebSocket headers are proxied (see deployment section)

</details>

<details>
<summary>🔴 Images not showing</summary>

- The `/uploads` folder must exist — it's created automatically on first upload
- If you moved files manually, check the path starts with `/uploads/products/`

</details>

<details>
<summary>🔴 Admin panel shows blank / 403</summary>

- You need to be logged in as a user with `role = 'admin'`
- See the Roles section above to promote your account

</details>

<details>
<summary>🔴 Database errors on start</summary>

- Delete `database/bloom.db` and restart — it will rebuild itself
- Then run `node database/seed.js` to get sample data back

</details>

---

## 📦 Scripts

```bash
npm start          # Start the server
npm run dev        # Start with auto-restart (nodemon)
node database/seed.js   # Seed sample data
```

---

## 🔒 Security Notes

- Never commit `.env` to GitHub — it's in `.gitignore` already
- Change `JWT_SECRET` to something long and random before going live
- Admin routes require a valid admin JWT — they are not publicly accessible

---

## 📄 License

See `LICENSE` file.

---

<div align="center">

**Built with 🌸 by CapstoneTechno**

*One step at a time is still progress.*

</div>
```

---
