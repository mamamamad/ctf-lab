import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  internalPort: process.env.INTERNAL_PORT || 4000,

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/authdb',

  keyId: process.env.AUTH_KEY_ID || 'auth-key-1',
  privateKeyPath: process.env.PRIVATE_KEY_PATH || './keys/private.pem',
  publicKeyPath: process.env.PUBLIC_KEY_PATH || './keys/public.pem',
  issuer: process.env.TOKEN_ISSUER || 'ctf-auth-service',

  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
};
