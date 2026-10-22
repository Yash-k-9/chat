# Deploying Private Chat

A step-by-step guide to putting the app online with free tiers:

| Piece | Service | What it does |
|---|---|---|
| Database | **Neon** (PostgreSQL) | Users, chats, encrypted messages |
| Backend | **Render** (Web Service) | Express API + Socket.IO (WebSockets) |
| Frontend | **Vercel** | The React web app |
| Media | **Cloudinary** | Encrypted photo / video / voice files |
| Email | Gmail SMTP (or Brevo, Resend…) | Password-reset links |

How the pieces talk to each other:

```
 Browser ──HTTPS──► Vercel (your-app.vercel.app)
    │                 ├─ serves the React app
    │                 └─ /api/*  ──rewrite──►  Render  (same-site → login cookie works in Safari too)
    │
    └──WSS + HTTPS──► Render (your-api.onrender.com)
                      ├─ Socket.IO (live messages)          ┐ authenticated with the
                      └─ /api/media (encrypted file upload) ┘ access token, no cookies
                         │
                         ├──► Neon (PostgreSQL, SSL)
                         └──► Cloudinary (encrypted blobs only)
```

> Do the steps **in order**. Each step ends with a ✅ check — don't continue until it passes.
> Keep a private note (password manager) of every secret you create. Never commit them.

---

## 0. Before you start

- [ ] The code is pushed to GitHub (`git push`), including `DEPLOY.md`, `client/vercel.json`, `server/package.json`.
- [ ] Accounts: [github.com](https://github.com), [neon.tech](https://neon.tech), [render.com](https://render.com), [vercel.com](https://vercel.com), [cloudinary.com](https://cloudinary.com) — sign up with GitHub where possible.
- [ ] Node 22+ installed locally (you'll run two small commands from your PC).

---

## 1. Database — Neon

1. Neon dashboard → **New Project** → name `private-chat`, region close to your users (e.g. *AWS Asia Pacific (Singapore)* for India), PostgreSQL 16+.
2. On the project page click **Connect** → choose the **pooled** connection, copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:XXXX@ep-something-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   This is your **`DATABASE_URL`**. It contains a password — keep it secret.
3. You don't need to create tables: the backend runs the migrations automatically when it starts (step 4).

✅ **Check:** the Neon dashboard shows the project as *Active*.

---

## 2. Media storage — Cloudinary

1. Cloudinary console → ⚙️ **Settings → API Keys**.
2. Copy the **API environment variable** — it looks like `cloudinary://123456789012345:AbCdEf...@your-cloud-name`.
   This is your **`CLOUDINARY_URL`** (secret).

The server uploads files as private, *authenticated* "raw" files. They're already encrypted in the browser, so Cloudinary only ever stores unreadable bytes.

> Why not Render's disk? Render's free instances have an **ephemeral** disk: everything is wiped on each deploy/restart. Without Cloudinary every photo would disappear.

✅ **Check:** you have the `cloudinary://…` string saved.

---

## 3. Secrets you generate yourself

Run these in your project folder **on your PC**:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
→ copy the output as **`JWT_ACCESS_SECRET`** (64 random characters).

```bash
cd server
npm run vapid
```
→ prints **`VAPID_PUBLIC_KEY`** and **`VAPID_PRIVATE_KEY`** (for push notifications).

Email (for password resets) — for Gmail: create an **App password** at <https://myaccount.google.com/apppasswords> (needs 2-Step Verification). That's your **`SMTP_PASS`**.

✅ **Check:** you have JWT secret, 2 VAPID keys, SMTP app password.

---

## 4. Backend — Render

1. Render dashboard → **New → Web Service** → connect your GitHub repo.
2. Settings:

   | Field | Value |
   |---|---|
   | Name | `private-chat-api` (your URL becomes `https://private-chat-api.onrender.com`) |
   | Region | same region as Neon |
   | Branch | `main` |
   | **Root Directory** | `server` |
   | Runtime | Node |
   | **Build Command** | `npm ci` |
   | **Start Command** | `npm run start:prod`  *(runs migrations, then starts the server)* |
   | Instance type | Free (or Starter to avoid sleeping — see below) |
   | **Health Check Path** (Advanced) | `/api/health` |

3. **Environment variables** (Advanced → Add Environment Variable). Use a placeholder for the Vercel URL for now — you'll fix it in step 6:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22` |
   | `DATABASE_URL` | the Neon string from step 1 |
   | `JWT_ACCESS_SECRET` | from step 3 |
   | `CORS_ORIGINS` | `https://placeholder.vercel.app` *(update in step 6)* |
   | `APP_URL` | `https://placeholder.vercel.app` *(update in step 6)* |
   | `TRUST_PROXY` | `2` *(Vercel's proxy + Render's proxy sit in front of the app)* |
   | `CLOUDINARY_URL` | from step 2 |
   | `MAX_MEDIA_MB` | `25` |
   | `VAPID_PUBLIC_KEY` | from step 3 |
   | `VAPID_PRIVATE_KEY` | from step 3 |
   | `VAPID_SUBJECT` | `mailto:you@example.com` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | your full Gmail address |
   | `SMTP_PASS` | the Gmail App password |
   | `MAIL_FROM` | `Private Chat <your-gmail@gmail.com>` |

   Leave `COOKIE_SAMESITE` unset (defaults to `lax`, correct for this setup).

4. **Create Web Service**. Watch the **Logs**. You should see:
   ```
   Migrations complete!
   Server running on http://localhost:10000
   🗂️  Media: encrypted files stored in Cloudinary
   🔔 Push notifications: enabled
   📧 Email: connected to smtp.gmail.com as you@gmail.com ✅
   ```
   The server refuses to start (with a clear message) if a production setting is unsafe — e.g. `CORS_ORIGINS` missing or using `http://`.

✅ **Check:** open `https://private-chat-api.onrender.com/api/health` → `{"status":"ok","database":"ok",…}`

> **Free tier note:** free Render services **sleep after ~15 minutes** without traffic. The first request after that takes 30–60 s, and open chats reconnect automatically once it's awake. For a family app that's used daily, the paid *Starter* instance avoids this.

---

## 5. Frontend — Vercel

1. **Edit `client/vercel.json`** on your PC: replace **all three** `YOUR-API.onrender.com` with your Render host (e.g. `private-chat-api.onrender.com`):
   - the `/api/:path*` rewrite destination,
   - `https://…` and `wss://…` inside `connect-src` of the Content-Security-Policy.

   Commit and push:
   ```bash
   git add client/vercel.json
   git commit -m "Point Vercel at the Render API"
   git push
   ```
2. Vercel dashboard → **Add New → Project** → import the repo.
3. Settings:

   | Field | Value |
   |---|---|
   | **Root Directory** | `client` |
   | Framework Preset | Vite (auto-detected) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | *(leave empty — REST calls go through the rewrite)* |
   | `VITE_REALTIME_URL` | `https://private-chat-api.onrender.com` |

   `VITE_…` values are baked into the JavaScript at build time and are **public** — never put secrets here.
5. **Deploy**. Note your URL, e.g. `https://private-chat.vercel.app`.

✅ **Check:** the login page loads; `https://private-chat.vercel.app/api/health` returns `{"status":"ok",…}` (this proves the rewrite to Render works).

---

## 6. Connect the two

Back in **Render → Environment**, replace the placeholders with your real Vercel URL (no trailing slash):

| Key | Value |
|---|---|
| `CORS_ORIGINS` | `https://private-chat.vercel.app` |
| `APP_URL` | `https://private-chat.vercel.app` |

Save → Render redeploys automatically.

> Using a custom domain later (e.g. `chat.yourname.com`)? Add it in Vercel → Domains, then put it in `CORS_ORIGINS` (comma-separate multiple: `https://chat.yourname.com,https://private-chat.vercel.app`) and `APP_URL`.

✅ **Check:** in the browser console of your Vercel site there are no CORS errors after logging in (step 7).

---

## 7. Create the first account

The app is invite-only, so the first invite comes from your PC, talking to the **Neon** database. In PowerShell:

```powershell
cd server
$env:DATABASE_URL = "postgresql://neondb_owner:XXXX@ep-...neon.tech/neondb?sslmode=require"
npm run invite
Remove-Item Env:DATABASE_URL
```

(The variable you set overrides the one in your local `.env` only for this window.)

Open `https://private-chat.vercel.app/register`, paste the code, create your account. **The first account becomes the admin.** Invite everyone else from inside the app (**✎ → Invite someone**).

✅ **Check — full flow:**
- [ ] Register → you land on the chat list; Settings shows *Admin*.
- [ ] Settings → Encryption key backup → back up your key.
- [ ] Invite a second person (or yourself in a private window) → you both see the new chat instantly.
- [ ] Send a message → ✓✓ appears, typing indicator works.
- [ ] Send a photo → it appears for the other person (Cloudinary dashboard shows a new *raw* file under `private-chat/`).
- [ ] Record a voice note (the browser asks for microphone permission — HTTPS is required, which Vercel provides).
- [ ] Settings → Notifications → **Turn on** → close the tab → send a message from the other account → a "You have a new message" notification appears.
- [ ] Log out → **Forgot password?** → the email arrives (check spam the first time).
- [ ] Reload the page → you stay logged in (the refresh cookie works).
- [ ] On a phone: open the site → browser menu → **Install app / Add to Home screen**.

---

## 8. Updating the app later

Push to `main` → Render and Vercel both redeploy automatically. New database migrations run on Render's start (`npm run start:prod`). GitHub Actions (`.github/workflows/ci.yml`) checks every push: server files parse, web app builds.

---

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Render logs: `Set CORS_ORIGINS…` / `must use https://` and the service won't start | The production safety checks. Set the env vars exactly as in steps 4 and 6. |
| `/api/health` → `"database":"unreachable"` | Wrong `DATABASE_URL`, or missing `?sslmode=require`. Copy it again from Neon. |
| Logged out on every reload | The `/api` rewrite in `vercel.json` isn't pointing at Render (step 5.1), or `VITE_API_URL` is set (leave it empty). |
| Messages don't arrive live, header stuck on "Connecting…" | `VITE_REALTIME_URL` wrong/missing (Vercel → redeploy after changing it), or the CSP `connect-src` doesn't include your `wss://…onrender.com`. Check the browser console for "Refused to connect". |
| Photos fail to upload | `CLOUDINARY_URL` missing/wrong (Render logs show `Cloudinary upload failed`), or the file is over `MAX_MEDIA_MB`. |
| "Too many requests" for everyone at once | Rate limiting sees one shared IP: set `TRUST_PROXY=2` (Vercel + Render). If it persists, try `3`. |
| Password-reset email never arrives | Render logs show `📧 Email: SMTP check FAILED — …` with the reason. Gmail needs an *App password*. |
| Notifications button says "not set up on the server" | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` missing on Render. |
| First load takes ~1 minute | Render free tier was asleep (see step 4 note). |
| Blank page + CSP errors in the console | You changed `vercel.json` CSP; make sure `script-src` still has `'wasm-unsafe-eval'` (needed by the encryption library). |

---

## What this setup does NOT include (yet)

- **Multiple backend instances**: online status and socket rooms live in one server's memory. To scale to several instances, add Redis (`@socket.io/redis-adapter`) — not needed for < 50 users.
- **Backups**: Neon keeps point-in-time history (7 days on the free plan). Export regularly if the data matters to you.
- **Monitoring/alerts**: consider a free uptime monitor (e.g. UptimeRobot) on `/api/health`.
