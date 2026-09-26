require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const { startCron } = require('./cron');
const Setting = require('./models/Setting');
const HamperType = require('./models/HamperType');

// ---------- Seed default site settings (EXAMPLE values the admin can change) ----------
const DEFAULT_SETTINGS = {
  sitePhone: '+91 98290 12345',
  siteWhatsapp: '+919829012345',
  siteEmail: 'hello@shreejiandshreeji.com',
  siteAddress: '12, Station Road, Bikaner, Rajasthan 334001',
  siteHours: 'Mon–Sat · 10am–8pm',
  instagram: '@shreejiandshreeji',
  facebook: 'shreejiandshreeji',
  announcement: 'Handpacked every morning · Free delivery over ₹999',
  // Homepage / branding copy the admin can change from /admin → Site Settings.
  logoText: 'Shreeji & Shreeji',
  heroTitle: 'Fresh Sweets & Savouries, Packed for You',
  heroSubtitle: 'Handpicked Bikaji favourites — build your hamper in a minute.',
  heroImage: '/images/hero.jpg',
  aboutTitle: 'Our Shop',
  aboutText:
    'We are Shreeji & Shreeji, a wholesale Bikaji sweets & namkeen shop in Bikaner. Every hamper is packed fresh the morning it ships — pick one item from each section and we handle the rest.',
  // Homepage "how it works" steps + footer note (admin-editable).
  stepsHeading: 'Three little steps to the perfect gift',
  step1Title: 'Pick your favourites',
  step1Text: 'Choose one treat from each section and craft a hamper that feels truly personal.',
  step2Title: 'We handpack it fresh',
  step2Text: 'Your hamper is packed the morning it ships — nestled in, sealed and gift-ready.',
  step3Title: 'Delivered to their door',
  step3Text: 'Carried with care to the people you love, anywhere we deliver.',
  footerNote: 'Wholesale Bikaji sweets & namkeen, handpacked into gift hampers in Bikaner.',
  // Hamper builder configuration (admin-editable — no code changes needed).
  // hamperSectionCount = how many items the customer picks (number of sections).
  // hamperSectionNames = display names for sections 1..N (array of strings).
  hamperSectionCount: 6,
  hamperSectionNames: [
    'Something Sweet',
    'Melt-in-Mouth',
    'Classic Favourites',
    'Crunchy & Savoury',
    'Chocolate & More',
    'Finishing Touch',
  ],
};

async function seedDefaultSettings() {
  try {
    const existing = await Setting.find({ key: { $in: Object.keys(DEFAULT_SETTINGS) } })
      .select('key')
      .lean();
    const have = new Set(existing.map((d) => d.key));
    const missing = Object.entries(DEFAULT_SETTINGS).filter(([k]) => !have.has(k));
    if (missing.length > 0) {
      await Setting.insertMany(missing.map(([key, value]) => ({ key, value })));
      console.log(`[settings] Seeded ${missing.length} default site settings (EXAMPLE values).`);
    }
  } catch (err) {
    console.error('[settings] Failed to seed default settings:', err.message);
  }
}

// ---------- Seed default hamper types (EXAMPLE values the admin can change) ----------
// Only inserts slugs that are missing — safe to run on every boot, never
// overwrites admin edits.
const DEFAULT_HAMPER_TYPES = [
  {
    slug: 'large',
    name: 'Large Hamper',
    price: 550,
    image: '/images/products/luxury-gift-box.jpg',
    description: 'Our grandest gift box. Pick one treat from each section — you pay one fixed price.',
    customizable: true,
    sectionCount: 6,
    fixedItems: [],
    active: true,
    sortOrder: 1,
  },
  {
    slug: 'medium',
    name: 'Medium Hamper',
    price: 450,
    image: '/images/products/kaju-katli.jpg',
    description: 'A generous gift box. Pick one treat from each section — you pay one fixed price.',
    customizable: true,
    sectionCount: 6,
    fixedItems: [],
    active: true,
    sortOrder: 2,
  },
  {
    slug: 'small',
    name: 'Small Hamper',
    price: 350,
    image: '/images/products/soan-papdi.jpg',
    description: 'A sweet little gift box. Pick one treat from each section — you pay one fixed price.',
    customizable: true,
    sectionCount: 6,
    fixedItems: [],
    active: true,
    sortOrder: 3,
  },
  {
    slug: 'bikaji-classic-hamper',
    name: 'Bikaji Classic Hamper',
    price: 300,
    image: '/images/products/bikaneri-bhujia.jpg',
    description: 'A ready-made Bikaji gift hamper with classic favourites. No customization needed.',
    customizable: false,
    sectionCount: 6,
    fixedItems: [
      { name: 'Bikaji Bhujia', weight: '400g', qty: 1 },
      { name: 'Rasgulla', weight: '500g', qty: 1 },
      { name: 'Soan Papdi', weight: '250g', qty: 1 },
    ],
    active: true,
    sortOrder: 4,
  },
  {
    slug: 'bikaji-mini-hamper',
    name: 'Bikaji Mini Hamper',
    price: 200,
    image: '/images/products/rasgulla.jpg',
    description: 'A handy ready-made Bikaji gift hamper. No customization needed.',
    customizable: false,
    sectionCount: 6,
    fixedItems: [
      { name: 'Bikaji Bhujia', weight: '200g', qty: 1 },
      { name: 'Soan Papdi', weight: '250g', qty: 1 },
    ],
    active: true,
    sortOrder: 5,
  },
];

async function seedDefaultHamperTypes() {
  try {
    const existing = await HamperType.find({
      slug: { $in: DEFAULT_HAMPER_TYPES.map((t) => t.slug) },
    })
      .select('slug')
      .lean();
    const have = new Set(existing.map((d) => d.slug));
    const missing = DEFAULT_HAMPER_TYPES.filter((t) => !have.has(t.slug));
    if (missing.length > 0) {
      await HamperType.insertMany(missing);
      console.log(`[hamper-types] Seeded ${missing.length} default hamper types (EXAMPLE values).`);
    }
  } catch (err) {
    console.error('[hamper-types] Failed to seed default hamper types:', err.message);
  }
}

const app = express();

// ---------- Security headers ----------
// Content-Security-Policy explicitly allows the third-party scripts this app
// needs: Razorpay checkout (payments), Google Maps (address autocomplete),
// Google Fonts. Everything else stays locked to 'self'.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': [
          "'self'",
          'https://checkout.razorpay.com',
          'https://maps.googleapis.com',
          'https://maps.gstatic.com',
        ],
        'frame-src': ["'self'", 'https://checkout.razorpay.com', 'https://*.razorpay.com'],
        'connect-src': [
          "'self'",
          'https://api.razorpay.com',
          'https://checkout.razorpay.com',
          'https://maps.googleapis.com',
        ],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      },
    },
  })
);

// ---------- CORS ----------
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser / same-origin requests with no Origin header
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ---------- Razorpay webhook (raw body; MUST precede express.json()) ----------
// Razorpay signs the raw request bytes. If express.json() parsed the body
// first, signature verification would fail. This route is intentionally NOT
// behind the /api/payment rate limiter (Razorpay retries webhooks).
const { razorpayWebhook } = require('./controllers/razorpayController');
app.post('/api/payment/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// ---------- Body parsing ----------
app.use(express.json({ limit: '1mb' }));

// ---------- NoSQL injection protection ----------
app.use(mongoSanitize());

// ---------- Rate limiting ----------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', apiLimiter);

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please try again later.' },
});
app.use('/api/payment/', paymentLimiter);

// ---------- Routes ----------
// Uploaded hamper-type images (written by POST /api/admin/upload).
fs.mkdirSync(path.join(__dirname, 'uploads', 'hamper-types'), { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/user', require('./routes/user'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/hamper-types', require('./routes/hamperTypes'));

// ---------- 404 ----------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ---------- Serve the built frontend (single-service deploy) ----------
// On Render the client is built into ../client/dist during the build step and
// this backend serves it, so ONE web service hosts the API + the website.
// Registered after all /api routes (and the /api 404 above) so API responses
// are never swallowed by the SPA fallback. Skipped in local dev, where Vite
// serves the frontend on :5173 instead.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    console.log('[client] Serving production website from', clientDist);
  } else {
    console.warn('[client] No production build found at', clientDist, '- website will not be served.');
  }
}

// ---------- Error handler (never leak stack traces) ----------
 // eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
  });
});

// ---------- Start ----------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startCron();
    return seedDefaultSettings();
  })
  .then(() => seedDefaultHamperTypes())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Shreeji & Shreeji API listening on port ${PORT}`);
      const { getAdminPhones } = require('./middleware/isAdmin');
      if (getAdminPhones().length === 0) {
        console.warn(
          'WARNING: ADMIN_PHONE_NUMBERS has no valid entries — no mobile number will have admin access. ' +
            'Set it to your 10-digit mobile number (e.g. 9829012345) and restart.'
        );
      }
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
