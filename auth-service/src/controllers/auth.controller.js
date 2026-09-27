import {
  createUser,
  findByEmail,
  findById,
  verifyPassword,
} from "../services/user.service.js";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/token.service.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  firstValidationError,
} from "../validators/auth.validator.js";
import { env } from "../config/env.js";

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstValidationError(parsed.error) });
  }
  const { email, username, password } = parsed.data;

  try {
    const user = await createUser({ email, username, password });
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      // Mongo duplicate-key error on the unique email/username index.
      return res
        .status(409)
        .json({ error: "email or username already in use" });
    }
    console.error(err);
    return res.status(500).json({ error: "could not create user" });
  }
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstValidationError(parsed.error) });
  }
  const { email, password } = parsed.data;

  const user = await findByEmail(email);
  const validPassword = await verifyPassword(user, password);

  if (!user || !validPassword) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const accessToken = await signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = await issueRefreshToken(user.id);

  return res.json({ accessToken, refreshToken, expiresIn: env.accessTokenTtl });
}

export async function refresh(req, res) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstValidationError(parsed.error) });
  }
  const { refreshToken } = parsed.data;

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  const user = await findById(rotated.userId);
  if (!user) {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  const accessToken = await signAccessToken({ sub: user.id, role: user.role });

  return res.json({
    accessToken,
    refreshToken: rotated.rawToken,
    expiresIn: env.accessTokenTtl,
  });
}

export async function logout(req, res) {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  return res.status(204).end();
}

export async function me(req, res) {
  const user = await findById(req.user.sub);
  if (!user) return res.status(404).json({ error: "user not found" });
  return res.json(user);
}
