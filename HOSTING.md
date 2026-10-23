# KhataFlow - Production Hosting & Deployment Guide

This guide covers everything you need to host **KhataFlow** in production.

---

## 1. Architecture Overview

KhataFlow is designed as a **unified, single-service web application**:
- **Backend**: Node.js + Express with high-performance SQLite (`better-sqlite3` in WAL mode).
- **Frontend**: React 19 + Tailwind CSS + Lucide Icons (compiled to `client/dist`).
- **Unified Delivery**: The Express server serves both the REST API endpoints (`/api/*`) and the compiled frontend single-page application (`client/dist`).
- **No Reverse Proxy Required for Dev/Small VPS**: The entire application runs on a single port (default `5050` or `process.env.PORT`).

---

## 2. Authentication & Data Separation

All demo account buttons and test account switchers have been completely removed. The application enforces strict multi-tenant role isolation:

| Role | Onboarding Flow | Access & Permissions |
|---|---|---|
| **Owner / Admin** | Registers via **"Register New Business"** tab on `/login`. | Full control over business profile, staff members, all customers, invoices, collections, settlements, reports, and audit logs. |
| **Salesman / Staff** | Created by the Owner inside the **Salesmen** section (`/salesmen`). | Secure mobile/email login. Access is restricted **strictly to assigned customers**. Enforced at database and API levels (`403 Forbidden` on unauthorized access). |
| **Customer** | **No login required**. | Customers access statements, receipts, and invoices via public permalinks (`/statement/customer/:id`, `/invoice/public/:id`, `/receipt/public/:id`). |

---

## 3. Environment Variables

Create a `.env` file in the project root (or configure variables in your hosting provider's dashboard):

```env
# Server Port (auto-assigned on platforms like Render or Railway)
PORT=5050

# Environment mode
NODE_ENV=production

# JWT Secret Key (replace with a secure random 64-character string)
JWT_SECRET=production_secret_key_random_64_characters_minimum_length_example

# Set to true ONLY if you want sample demo data (Apex Enterprise) preloaded on startup
SEED_DEMO=false
```

---

## 4. Database Commands

The SQLite database file is stored in `server/data/khataflow.db`.

- **Start Fresh with an Empty Database (Production Ready)**:
  ```bash
  npm run db:reset
  ```
  *Clears all demo records so your business starts with 0 customers, 0 transactions, and 0 salesmen.*

- **Seed Sample Demo Data (Optional for testing)**:
  ```bash
  npm run seed
  ```

- **Run Automated Verification Tests**:
  ```bash
  npm test
  ```

---

## 5. Deployment Options

### Option A: Cloud PaaS (Render, Railway, Fly.io, Heroku)

1. Push your repository to GitHub or GitLab.
2. Connect your repo in **Render** or **Railway**.
3. Configure the service settings:
   - **Environment**: `Node` (Node.js 18+ or 20+)
   - **Build Command**:
     ```bash
     npm install && cd client && npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: *(Generate a secure random string)*
     - `SEED_DEMO`: `false`
4. Persistent Disk (Recommended):
   - Mount a persistent volume at `/server/data` so your SQLite database (`khataflow.db`) persists across deployments.

---

### Option B: Linux VPS (Ubuntu / Debian / DigitalOcean / AWS EC2)

#### Step 1: Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

#### Step 2: Clone and Build
```bash
git clone <your-repo-url> /var/www/khataflow
cd /var/www/khataflow

# Install backend dependencies
npm install

# Install frontend dependencies and compile production assets
cd client && npm install && npm run build
cd ..

# Clear demo data for a fresh start
npm run db:reset
```

#### Step 3: Configure Environment
```bash
cp .env.example .env
nano .env   # Update JWT_SECRET and PORT=5050
```

#### Step 4: Run with PM2 Process Manager
```bash
pm2 start server/src/index.js --name "khataflow"
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx with SSL (Certbot)
Create `/etc/nginx/sites-available/khataflow`:
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and acquire free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/khataflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 6. First-Time Setup After Hosting

1. Open your hosted URL in your browser: `https://yourdomain.com`
2. Click the **"Register New Business"** tab on the login screen.
3. Enter your:
   - Business Name
   - Owner Full Name
   - Mobile Number & Password
   - Address, GSTIN, and UPI ID (optional)
4. Click **"Register Business & Access Dashboard"**.
5. Once inside:
   - Go to **Salesmen** -> Click **"Add Salesman"** to invite your field staff.
   - Go to **Customers** -> Click **"Add Customer"** and assign to your salesmen.
   - Field salesmen can now log in using their mobile number and password on any smartphone or browser.
