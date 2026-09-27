// Generates the RSA keypair used to sign/verify JWTs (RS256).
// Run once (locally, or automatically by entrypoint.sh in the container)
// BEFORE the server starts. Never commit the private key.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const keysDir = path.join(process.cwd(), 'keys');
fs.mkdirSync(keysDir, { recursive: true });

const privatePath = path.join(keysDir, 'private.pem');
const publicPath = path.join(keysDir, 'public.pem');

if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
  console.log('Keys already exist in ./keys — skipping generation.');
  process.exit(0);
}

crypto.generateKeyPair(
  'rsa',
  {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  },
  (err, publicKey, privateKey) => {
    if (err) throw err;
    fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicPath, publicKey);
    console.log('Wrote new RSA keypair to ./keys/private.pem and ./keys/public.pem');
  }
);
