import argon2 from 'argon2';
import { User } from '../models/user.model.js';

// A precomputed dummy hash used to keep login timing similar whether or
// not the email exists, so the endpoint doesn't leak "this email isn't
// registered".
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$8m1r6d1uEwv3nOa3o9nQeOOQoTUp0R2WkS3iLmxKa1I';

export async function createUser({ email, username, password }) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return User.create({
    email: email.toLowerCase(),
    username,
    passwordHash,
    role: 'user',
  });
}

export function findByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

export function findById(id) {
  return User.findById(id);
}

export async function verifyPassword(user, password) {
  return argon2.verify(user ? user.passwordHash : DUMMY_HASH, password).catch(() => false);
}
