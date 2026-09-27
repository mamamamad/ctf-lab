import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { loadKeys, getPublicJwk } from './config/keys.js';
import { authRouter } from './routes/auth.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await loadKeys();
  await connectDb();

  // --- Public server: UI + /api/auth/* -------------------------------
  // This is the only port nginx (or you, in dev) should route to.
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api/auth', authRouter);

  app.listen(env.port, () => console.log(`auth-service public server listening on :${env.port}`));

  // --- Internal server: GET /pubkey only ------------------------------
  // Deliberately a separate listener on a separate port so this can be
  // left unpublished in docker-compose — reachable only from other
  // containers on app-net, never from the internet.
  const internalApp = express();
  internalApp.get('/pubkey', (req, res) => {
    res.json({ keys: [getPublicJwk()] });
  });

  internalApp.listen(env.internalPort, () =>
    console.log(`auth-service internal pubkey server listening on :${env.internalPort}`)
  );
}

main().catch((err) => {
  console.error('auth-service failed to start:', err);
  process.exit(1);
});
