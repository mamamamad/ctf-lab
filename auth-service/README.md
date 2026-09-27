# auth-service

Phase 0 of the CTF platform: registration, login, and profile — nothing else yet
(no instance orchestration, no score-service integration). Node.js + Express +
MongoDB (via Mongoose), access tokens signed with RS256 + rotating refresh
tokens.

## Run it

```
docker compose up --build
```

Then open http://localhost:3000 — it redirects to `/login.html` if you have no
token, or `/profile.html` if you do.

On first boot, `entrypoint.sh` generates an RSA keypair into `./keys/` (mounted
as a volume, so it's never baked into the image and survives rebuilds). Delete
that folder if you ever want to force new keys.

## Project layout

```
src/
  config/       env vars, Mongo connection, RSA key loading
  models/       Mongoose schemas (User, RefreshToken)
  services/     password hashing + user lookups, access/refresh token logic
  controllers/  request handlers for each route
  routes/       Express routers
  middleware/   requireAuth (verifies the access token)
  server.js     wires everything together, starts both HTTP listeners
```

## What's here

- `POST /api/auth/register` — email, username, password (min 8 chars)
- `POST /api/auth/login` — returns `{ accessToken, refreshToken, expiresIn }`
- `POST /api/auth/refresh` — takes `{ refreshToken }`, returns a new
  `{ accessToken, refreshToken, expiresIn }` pair. The old refresh token is
  revoked as part of the same call (rotation), so it can't be replayed.
- `POST /api/auth/logout` — takes `{ refreshToken }`, revokes it server-side
- `GET /api/auth/me` — profile, requires `Authorization: Bearer <accessToken>`
- `GET /pubkey` (port 4000, **not published to the host**) — the public key,
  for other services to verify access tokens. Reachable only as
  `http://auth-service:4000/pubkey` from containers on `app-net`.

## Access + refresh tokens

- **Access token**: stateless RS256 JWT, 15 minutes by default
  (`ACCESS_TOKEN_TTL`). Verified with the public key, no DB lookup needed.
- **Refresh token**: opaque random string, 7 days by default
  (`REFRESH_TOKEN_TTL_DAYS`). Only its SHA-256 hash is stored in MongoDB
  (`refreshtokens` collection), with a TTL index so expired/rotated rows are
  cleaned up automatically. Every `/refresh` call revokes the presented
  token and issues a new pair (rotation), so a leaked-and-reused refresh
  token stops working the next time the legitimate client uses it.
- The frontend (`public/app.js`) stores both tokens in `localStorage` and
  transparently retries once through `/refresh` on a 401.

## Re-theming for a different competition

Everything visual is driven by CSS variables in `public/theme.css`. To re-skin
the UI, replace only that one file — `public/styles.css` never hardcodes a
color or font.

## Known simplifications (intentional, for this phase)

- Tokens are stored in `localStorage` on the frontend — worth revisiting (e.g.
  an httpOnly cookie for the refresh token) once you're reviewing this for
  XSS exposure.
- Single signing key, no rotation yet (see the JWT design discussion — this
  was a deliberate v1 trade-off).
- No device/session listing or "revoke all sessions" endpoint yet — refresh
  tokens can only be revoked one at a time via `/logout`.
