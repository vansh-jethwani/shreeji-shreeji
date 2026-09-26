# Shreeji & Shreeji — Frontend (React + Vite)

Premium, mobile-first Diwali hamper e-commerce frontend. **No Razorpay** —
payments use direct UPI intent / QR only.

## Run locally

```bash
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:5173 (proxies /api -> http://localhost:5000)
npm run build          # production build -> dist/
```

## Env vars

| Var | Purpose |
| --- | ------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (required) |
| `VITE_API_URL` | Backend origin, e.g. `https://shreeji-shreeji-api.onrender.com`. Empty in dev (Vite proxies `/api`). |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps key with Places API for address autocomplete (optional; manual entry always works) |

## Backend API contract

Base: `{VITE_API_URL}/api`. Auth: `Authorization: Bearer <Clerk session JWT>`
(verified server-side; never trust a client-supplied user id).

### Products
- `GET /api/products/sections` — public. Preferred shape:
  `{ sections: { "1": [Product...], ..., "6": [Product...] } }`.
  Also tolerated: `{ sections: [{ section: 1, products: [...] }] }` or `{ products: [...] }`
  (grouped client-side by `section`). Product: `{ _id, name, description, image, price, section, weight, available }`.
- `GET /api/products` — admin: all products incl. unavailable.
- `POST /api/products` / `PUT /api/products/:id` / `DELETE /api/products/:id` — admin.

### Orders
- `POST /api/orders` — auth. Body:
  `{ items: [{ productId }], address: { building, street, colony, area, city, state, pincode }, phone, paymentMethod: "COD" }`.
  Backend re-validates 6 products (one per section), availability, and computes the total. → `{ order }`.
- `GET /api/orders/my-orders` — auth → `{ orders: [...] }` (or array).
- `GET /api/orders/:id` — auth (owner or admin) → `{ order }`.
- `GET /api/orders` — admin, query `search`, `orderStatus`, `paymentStatus` → `{ orders }`.
- `PATCH /api/orders/:id/status` — admin. Body `{ orderStatus }`.
- `PATCH /api/orders/:id/verify-payment` — admin. Marks UPI `Pending Verification` → `Paid` after manual verification.

### UPI payment (no gateway)
- `POST /api/payment/upi/create` — auth. Body: `{ items: [{ productId }], address, phone }`.
  Backend: validates 6 products / availability, computes total, creates the order
  (`paymentStatus: "Pending"`), generates the UPI URI from **server** values.
  Preferred response:
  ```json
  {
    "order": { "_id": "...", "orderNumber": "SJ2026ABC123", "totalAmount": 1249 },
    "upi": {
      "uri": "upi://pay?pa=...&pn=...&am=1249.00&cu=INR&tr=SJ2026ABC123",
      "merchantUpiId": "merchant@upi",
      "merchantName": "Shreeji & Shreeji",
      "amount": 1249,
      "transactionReference": "SJ2026ABC123"
    }
  }
  ```
  Flat shape `{ orderId, orderNumber, upiUri, merchantUpiId, merchantName, amount, transactionReference }`
  is also tolerated.
- `POST /api/payment/upi/notify` — auth. Body `{ orderId }`. "I Have Completed Payment":
  sets `paymentStatus` → `"Pending Verification"`. **Never** marks Paid.
- `GET /api/payment/upi/status?orderId=...` — auth → `{ paymentStatus, orderStatus }` (used for polling if needed).

### User
- `GET /api/user/profile` — auth → `{ user: { ..., role } }` (`role: "admin"` gates `/admin`).
- `PUT /api/user/profile` — auth. Body `{ name, phone }`.
- `GET /api/user/addresses` → `{ addresses: [...] }`
- `POST /api/user/addresses` / `DELETE /api/user/addresses/:id` — auth.

## Key frontend behaviours

- **Amounts are read-only** everywhere; only the backend-computed total is used for UPI/QR.
- **UPI UX:** mobile/tablet → `upi://pay` intent button + "Waiting for payment confirmation…";
  desktop → QR code (generated from the server URI) + copyable UPI ID. Fallback offered both ways.
- **"I Have Completed Payment"** only notifies the backend (→ Pending Verification); admin verifies manually.
- Hamper draft + cart persist in `localStorage`; cart survives refresh until the order is created.
- Google Maps autocomplete is debounced (350 ms), restricted to India; manual entry always available.
- Amount formatting: `formatINR` (display) / UPI URIs always use backend values.

## Deploy (static frontend)

Build with `VITE_API_URL` pointing at the Render backend, then deploy `dist/` to any
static host (Render Static Site, Netlify, Vercel…).
