import crypto from 'node:crypto';
import { SignJWT, jwtVerify, importJWK } from 'jose';
import { env } from '../config/env.js';
import { getPrivateKey, getPublicJwk } from '../config/keys.js';
import { RefreshToken } from '../models/refreshToken.model.js';

let cachedVerificationKey = null;
async function getVerificationKey() {
  if (!cachedVerificationKey) {
    cachedVerificationKey = await importJWK(getPublicJwk(), 'RS256');
  }
  return cachedVerificationKey;
}

// --- Access token: short-lived, stateless JWT (RS256) -----------------

export async function signAccessToken({ sub, role }) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'RS256', kid: env.keyId })
    .setSubject(sub)
    .setIssuedAt()
    .setIssuer(env.issuer)
    .setJti(crypto.randomUUID())
    .setExpirationTime(env.accessTokenTtl)
    .sign(getPrivateKey());
}

export async function verifyAccessToken(token) {
  const key = await getVerificationKey();
  const { payload } = await jwtVerify(token, key, { issuer: env.issuer });
  return payload;
}

// --- Refresh token: opaque random string, hashed at rest --------------

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function newExpiry() {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

export async function issueRefreshToken(userId) {
  const rawToken = crypto.randomBytes(64).toString('hex');

  await RefreshToken.create({
    user: userId,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt: newExpiry(),
  });

  return rawToken;
}

// Verifies a presented refresh token and rotates it: the old token is
// marked revoked and a brand-new one is issued in the same call, so a
// stolen refresh token can only ever be replayed once before both the
// attacker's and the legitimate user's copies stop working.
export async function rotateRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }

  const newRawToken = crypto.randomBytes(64).toString('hex');

  record.revokedAt = new Date();
  record.replacedByTokenHash = hashRefreshToken(newRawToken);
  await record.save();

  await RefreshToken.create({
    user: record.user,
    tokenHash: record.replacedByTokenHash,
    expiresAt: newExpiry(),
  });

  return { userId: record.user, rawToken: newRawToken };
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}
