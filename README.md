# Shreeji & Shreeji — Customized Diwali Hamper E-commerce

Production-ready MERN e-commerce website for **Shreeji & Shreeji** (wholesale Bikaji namkeens & sweets), selling customized Diwali gift hampers.

**Payment: direct UPI only (merchant UPI ID + QR). No Razorpay, no Stripe, no PayPal, no Cash on Delivery — anywhere.**

---

## 1. Features implemented

- **Hamper builder** — fully dynamic: the admin sets the number of selections (`hamperSectionCount`, default 6) and names each section (`hamperSectionNames`) from Admin → Site Settings; exactly 1 selection per section; live progress (`0/N` → `N/N`), per-section checkmarks, live total, "Add to Cart" disabled until complete with the message *"Please select one item from each of the N sections to complete your hamper."*; selections persist in `localStorage`.
- **Cart** — add / edit / remove hampers, totals, structured for multiple hampers later.
- **Sign-in with name + mobile (no external auth)** — the customer enters their mobile number on the site; new users then add their name and delivery address. No OTP, no Firebase, no Google. The backend upserts the user in MongoDB and issues its own JWT (30 days); every protected route verifies that JWT. Admin access is granted by mobile number (`ADMIN_PHONE_NUMBERS`).
- **Google Maps address autocomplete** — debounced search, autofill + manual editing; fields: building, street, colony, area, city, state, pincode, phone.
- **Direct UPI payment** — mobile/tablet → `upi://pay` intent (URL-encoded, exact backend amount, `tr=` order reference); desktop → dynamic QR (exact amount) + merchant UPI ID + Copy button; amount is read-only everywhere; "I Have Completed Payment" only notifies backend → **Pending Verification** (never auto-marks Paid).
- **Orders** — order success page, order history, order details with product list, payment & order statuses.
- **Admin dashboard** — product CRUD (name, description, image, price, weight, section, availability), order list/search/filter, order-status updates, **manual UPI payment verification** (Pending Verification → Paid/Failed/Refunded), and **Site Settings** (cover photo, titles, all text, contact details, announcement). Server-side admin check via `ADMIN_PHONE_NUMBERS`.
- **Keep-alive** — `cron.js` pings `GET /api/health` on a configurable interval (Render Free friendly; external uptime pingers also supported).
- **UI** — quiet-luxury theme (deep espresso, champagne gold, ivory), Cormorant Garamond + Jost typography, mobile-first responsive, sticky cart/total on mobile, skeleton loaders, friendly error states, SEO meta + semantic HTML + accessibility basics. Year-round premium gifting aesthetic — no seasonal motifs.

## 2. Files created

```
shreeji-shreeji/
├── README.md                  ← this report
├── server/
│   ├── package.json           (express, mongoose, cors, dotenv, helmet,
│   │                           express-rate-limit, express-mongo-sanitize, jsonwebtoken)
│   ├── server.js              (PORT from env, helmet, restricted CORS, rate limits,
│   │                           /api/health, 404 + safe error handler, starts cron)
│   ├── cron.js                (keep-alive pinger)
│   ├── .env.example
│   ├── config/db.js
│   ├── models/User.js | Product.js | Order.js
│   ├── middleware/auth.js     (verifies our JWT, attaches req.auth)
│   ├── middleware/isAdmin.js  (CLERK_ADMIN_USER_IDS server-side check)
│   ├── utils/upi.js           (generateUpiUri, generateOrderNumber → SJ2026XXXXXX)
│   ├── controllers/           (product, order, user, payment)
│   ├── routes/                (health, products, orders, user, payment/upi, admin)
│   └── seed/seed.js           (24 SAMPLE products, sections 1–6 × 4 options)
└── client/
    ├── package.json           (react 18, react-router-dom, @mui/material,
    │                           axios, react-qr-code, vite)
    ├── vite.config.js | index.html | .env.example
    └── src/
        ├── main.jsx           (AuthProvider, SettingsProvider, Router)
        ├── App.jsx            (all 12 routes + /admin)
        ├── index.css          (Diwali theme, responsive, mobile-first)
        ├── components/        (Navbar, Footer, ProductCard, ProgressIndicator,
        │                       HamperSummary, ProtectedRoute, StatusPill)
        ├── pages/             (Home, CreateHamper, Cart, Checkout, OrderSuccess,
        │                       Orders, OrderDetails, Profile, About, Contact,
        │                       Privacy, Terms, RefundPolicy, AdminDashboard)
        ├── context/CartContext.jsx
        └── utils/             (device detection, api client, upi helpers)
```

## 3. Files modified

None — this is a greenfield build. No existing project was touched.

## 4. Frontend setup

```bash
cd shreeji-shreeji/client
cp .env.example .env   # fill VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL, VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev            # → http://localhost:5173
npm run build          # production build → dist/
```

## 5. Backend setup

```bash
cd shreeji-shreeji/server
cp .env.example .env   # fill values (see §10)
npm install
npm run seed           # loads 24 sample products into MongoDB
npm run dev            # → http://localhost:5000 (watch mode)
npm start              # production (Render uses this)
```

## 6. MongoDB setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com) (MongoDB Atlas).
2. Database Access → create a user + password.
3. Network Access → allow `0.0.0.0/0` (or Render's IPs).
4. Connect → copy the connection string → paste as `MONGODB_URI` in `server/.env`.
5. Run `npm run seed` once to load the 24 sample products.

Indexes are defined in the models (`phone`, `orderNumber`, `userId`, `section`, `available`, `upiTransactionReference`, `createdAt`).

## 7. Auth setup — none needed

There is no external auth system. Sign-in is built in:

1. Customer enters their mobile number on the site (10-digit Indian mobile).
2. First-time users are asked for their **name + delivery address** right after.
3. The backend (`POST /api/auth/login`) upserts the user in MongoDB and returns a JWT (valid 30 days), stored in the browser's localStorage.
4. **Admin access:** put your own mobile number (e.g. `+919829012345`) in `ADMIN_PHONE_NUMBERS` in `server/.env`. Sign in with that number — you'll see the Admin Dashboard.
5. Set a long random `JWT_SECRET` in `server/.env` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## 8. Google Maps setup

1. [console.cloud.google.com](https://console.cloud.google.com) → enable **Places API** (and Maps JavaScript API).
2. Create an API key, restrict it to your domains.
3. Paste as `VITE_GOOGLE_MAPS_API_KEY` (client `.env`) and `GOOGLE_MAPS_API_KEY` (server `.env.example` documents it).

## 9. UPI setup

No gateway account needed. Just:

1. Set `MERCHANT_UPI_ID` to your business UPI ID (e.g. `shreeji@okhdfcbank`).
2. Set `MERCHANT_NAME=Shreeji & Shreeji`.
3. The backend generates `upi://pay?pa=…&pn=…&am=<exact total>&cu=INR&tr=<order ref>` per order; frontend shows UPI intent on mobile, QR on desktop.
4. Verify incoming payments in your UPI app / bank statement, then mark **Paid** in Admin → Orders. Until then orders stay **Pending Verification** — the site never auto-marks payment success.

## 10. Environment variables you must fill

**`server/.env`** (copy from `server/.env.example`):

| Variable | What to put |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string (signs login tokens — keep secret) |
| `ADMIN_PHONE_NUMBERS` | **Your mobile number** in E.164 (e.g. `+919829012345`), comma-separated for multiple admins |
| `MERCHANT_UPI_ID` | **Your real business UPI ID** (customers pay to this) |
| `MERCHANT_NAME` | `Shreeji & Shreeji` |
| `GOOGLE_MAPS_API_KEY` | Google Cloud API key (Places API) |
| `FRONTEND_URL` | e.g. `https://shreeji-shreeji.onrender.com` (comma-separated OK) |
| `BACKEND_URL` | e.g. `https://shreeji-shreeji-api.onrender.com` |
| `CRON_ENABLED` | `true` |
| `CRON_INTERVAL` | `840000` (14 min, default) |

**`client/.env`** (copy from `client/.env.example`):

| Variable | What to put |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `https://shreeji-shreeji-api.onrender.com` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud API key (Places API) |

Never commit `.env` files.

## 11. Render deployment steps

**Backend** (Web Service):
1. Push this repo to GitHub.
2. Render → New → Web Service → select repo, root directory `server`.
3. Build command: `npm install` · Start command: `npm start`.
4. Add all `server/.env` variables in Render → Environment.
5. Deploy. Note the URL → use as `BACKEND_URL` and client `VITE_API_URL`.

**Frontend** (Static Site):
1. Render → New → Static Site → root directory `client`.
2. Build command: `npm install && npm run build` · Publish directory: `dist`.
3. Add the three `VITE_*` env vars.
4. Deploy. Note the URL → use as `FRONTEND_URL` (update backend env too).

**Database:** MongoDB Atlas (see §6).

## 12. Cron / keep-alive setup

- `server/cron.js` runs inside the API process: every `CRON_INTERVAL` ms it GETs `${BACKEND_URL}/api/health`, logs failures, never crashes the server.
- `GET /api/health` is public and returns `{ "status": "ok", "service": "shreeji-shreeji-api" }`.
- Honest caveat: on Render Free this reduces (not eliminates) cold starts. For stronger uptime, add a free external pinger (e.g. UptimeRobot / cron-job.org) hitting the same `/api/health` URL every 5–14 minutes.

## 13. Admin setup

1. Set `ADMIN_PHONE_NUMBERS` in the backend env to your mobile number in E.164 format (e.g. `+919829012345`) and redeploy/restart.
2. Sign in on the site with that number via OTP.
3. Visit `/admin`: manage products (add/edit/deactivate, prices, sections, images), orders (search/filter, update status, verify UPI payments), and **Site Settings** — edit the shop phone, WhatsApp, email, address, hours, socials, and announcement bar shown across the site.

## 14. Seed-data setup

```bash
cd server
npm run seed
```

Loads 24 example products (sections 1–6 × 4 options) with names, descriptions, prices, weights, and product photography (`client/public/images/products/*.jpg` + `client/public/images/hero.jpg` for the homepage). All content is clearly example data — replace it with your real Bikaji products via the admin dashboard or MongoDB; no code changes needed. To use your own photos, upload them and update each product's image URL in admin. To change the number of hamper selections or rename sections, use Admin → Site Settings → Hamper Configuration.

## 15. Local development commands

```bash
# Terminal 1 — backend
cd shreeji-shreeji/server && cp .env.example .env  # fill values
npm install && npm run seed && npm run dev

# Terminal 2 — frontend
cd shreeji-shreeji/client && cp .env.example .env  # fill values
npm install && npm run dev
```

Open http://localhost:5173 → build a hamper → checkout.

## 16. Production deployment checklist

- [ ] MongoDB Atlas URI set, seed run (or real products added via admin)
- [ ] `JWT_SECRET` set to a long random string on the backend
- [ ] `ADMIN_PHONE_NUMBERS` set to your mobile number
- [ ] **`MERCHANT_UPI_ID` set to your real UPI ID** (test with ₹1 order first)
- [ ] Google Maps API key with Places API enabled, domain-restricted
- [ ] `FRONTEND_URL` / `BACKEND_URL` / `VITE_API_URL` all pointing at Render URLs (no localhost)
- [ ] Test full flow on mobile (UPI intent) and desktop (QR): full selection → cart → sign-in → name+address → delivery address → UPI → order → admin verification
- [ ] External uptime pinger on `/api/health` (optional but recommended)
- [ ] Privacy/Terms/Refund pages reviewed; Contact page filled with real phone/email/address

---

### Payment-integrity notes (as required)

- The backend is the **sole source of truth** for the amount: it re-fetches the selected products, validates one-per-section + availability against the current `hamperSectionCount`, and calculates the total server-side. Frontend totals are display-only.
- UPI URI and QR always embed that server-calculated amount (`am=1249.00` format). No amount input exists anywhere.
- "I Have Completed Payment" → `Pending Verification` only. Admin manually verifies against the bank/UPI app before marking `Paid`.
- No claim is made that a UPI app's amount field is uneditable — the site states the amount is *automatically filled from the order total*.
- **Zero Razorpay code, SDKs, routes, or env vars** exist in this project.
