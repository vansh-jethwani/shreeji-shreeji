// Keep-alive cron for Render Free tier.
// Periodically pings ${BACKEND_URL}/api/health so the service stays warm.
//
// NOTE: Render Free still has sleep/cold-start limitations - this reduces,
// but does not guarantee zero, cold starts. An external uptime service can
// also ping /api/health for the same effect.
//
// Env:
//   CRON_ENABLED=true|false  (default true)
//   CRON_INTERVAL=...         interval in ms (default 14 * 60 * 1000 = 14 min)
//   BACKEND_URL=...           required, e.g. https://your-api.onrender.com

let timer = null;

function startCron() {
  const enabled = String(process.env.CRON_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Keep-alive cron disabled (CRON_ENABLED=false)');
    return;
  }

  const backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!backendUrl) {
    console.log('Keep-alive cron disabled: BACKEND_URL is not set');
    return;
  }

  const intervalMs = Number(process.env.CRON_INTERVAL) || 14 * 60 * 1000;
  const url = `${backendUrl}/api/health`;

  const ping = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      console.log(`[cron] health ping -> ${res.status} ${url}`);
    } catch (err) {
      // Never crash the server on ping failures
      console.error(`[cron] health ping failed: ${err.message}`);
    }
  };

  // Initial delayed ping, then interval
  setTimeout(ping, 60 * 1000);
  timer = setInterval(ping, intervalMs);
  timer.unref?.();
  console.log(`[cron] keep-alive started, pinging ${url} every ${intervalMs / 60000} min`);
}

function stopCron() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startCron, stopCron };
