const express = require('express');
const router = express.Router();

// Public health check - also used by the cron keep-alive.
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'shreeji-shreeji-api' });
});

module.exports = router;
