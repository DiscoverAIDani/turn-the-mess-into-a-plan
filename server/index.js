import express from 'express';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generatePlan } from './nebius.js';

export const NOTES_LIMIT = 6000;
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

export function createApp({ generate = generatePlan } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    // This prototype is local-only. Reject foreign host/origin requests.
    const host = req.get('host') || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return res.status(403).json({ error: 'REQUEST_REJECTED' });
    const origin = req.get('origin');
    if (origin && origin !== `http://${host}`) return res.status(403).json({ error: 'REQUEST_REJECTED' });
    next();
  });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', express.json({ limit: '32kb' }));
  app.post('/api/plan', async (req, res) => {
    const notes = req.body?.notes;
    if (typeof notes !== 'string' || !notes.trim() || notes.length > NOTES_LIMIT) {
      return res.status(400).json({ error: 'INVALID_NOTES' });
    }
    try { res.json({ result: await generate(notes) }); }
    catch { res.status(502).json({ error: 'GENERATION_FAILED' }); }
  });
  app.use(express.static(publicDirectory, { dotfiles: 'deny' }));
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'REQUEST_FAILED' : 'INVALID_NOTES' });
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port');
  const server = createApp().listen(port, '127.0.0.1', () => {
    console.log(`Open http://127.0.0.1:${port}`);
  });
  server.on('error', () => { console.error('Could not start the local server. Check whether the port is in use.'); process.exitCode = 1; });
}
