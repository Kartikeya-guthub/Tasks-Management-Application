# 🎬 Demo Script — Task Management Application

> Estimated time: 2–3 minutes

---

## 🔗 URLs

- **Frontend:** https://task-management-application-taupe.vercel.app
- **Backend:** https://tasks-management-application.onrender.com

---

## ✅ Pre-Demo Checklist

Before the demo, wake the Render server (free tier sleeps):

```bash
curl https://tasks-management-application.onrender.com/health
# Should return: OK
```

Wait ~30 seconds if it was sleeping.

---

## 🎯 Demo Flow

### Step 1 — Register (30s)

> "I'll show user registration with validation."

1. Open https://task-management-application-taupe.vercel.app
2. Click **Register**
3. Enter email + password (min 8 chars)
4. Click **Register** → redirected to Tasks page

**What to say:** _"Passwords are hashed with bcrypt (cost factor 12) before storage. The JWT access token is stored in an HttpOnly cookie — not localStorage — so it can't be stolen via XSS."_

---

### Step 2 — Create Tasks (30s)

> "I'll create a few tasks to demonstrate CRUD."

1. Click **New Task**
2. Enter title, description, set status to `todo`
3. Click **Save** → task appears in list
4. Create 2-3 more with different statuses (`in_progress`, `done`)

**What to say:** _"The task description is encrypted at rest using AES-256-GCM. Each write uses a fresh 12-byte IV. The key comes from an environment variable — never from source code."_

---

### Step 3 — Search & Filter (20s)

> "Let me demonstrate search and filtering."

1. Type part of a task title in the search box → list updates (debounced 300ms)
2. Select a status from the dropdown → list filters instantly
3. Change page if there are multiple pages

**What to say:** _"Search uses a parameterized SQL `ILIKE` query — no string concatenation, so SQL injection isn't possible. Results are paginated — the API returns a `meta` object with total count and page info."_

---

### Step 4 — Edit & Delete (20s)

> "Full CRUD."

1. Click **Edit** on a task → update title or status → **Save**
2. Click **Delete** on a task → confirm → task removed

**What to say:** _"Every task operation checks `WHERE id = $1 AND user_id = $2` — users can only access their own tasks. Cross-user access returns 403."_

---

### Step 5 — Auth Persistence (20s)

> "Tokens auto-refresh — the user stays logged in."

1. Refresh the page → still logged in (access token in HttpOnly cookie)
2. Open browser DevTools → Application → Cookies → show cookies are `HttpOnly` (not readable via JS)

**What to say:** _"If the access token expires, the frontend automatically calls `/api/auth/refresh` to get a new one using the refresh token — this is transparent to the user. Refresh tokens are rotated on every use and stored hashed in the database."_

---

## ❓ Likely Follow-up Questions

### "Why HttpOnly cookies over localStorage?"

> `localStorage` is accessible via JavaScript — any XSS vulnerability can steal tokens stored there. `HttpOnly` cookies can't be read by JS at all. Combined with `SameSite=None; Secure`, they're safe for cross-origin requests over HTTPS.

### "How does the encryption work?"

> AES-256-GCM is an authenticated encryption scheme — it both encrypts and verifies integrity. I generate a fresh 12-byte random IV per encryption call, then store `base64(iv + authTag + ciphertext)` in the DB column. The 256-bit key comes from a `FIELD_ENC_KEY` env var.

### "What would you improve with more time?"

> 1. **Rate limiting** on auth routes (e.g. express-rate-limit) to prevent brute force
> 2. **Email verification** on register
> 3. **Redis** for refresh token storage instead of Postgres (faster revocation checks)
> 4. **Role-based access** (admin/user)
> 5. **Upgrade Render** to always-on instance to eliminate cold starts

### "How does refresh token rotation prevent replay attacks?"

> Each refresh token is single-use — once used, it's marked `revoked = true` in the DB. If an attacker replays an old token, our check finds it revoked and returns `401`. We also store tokens hashed (bcrypt) so a DB leak doesn't expose live tokens.

### "Why Render + Vercel instead of a single platform?"

> Vercel is optimized for static/SSR frontend — global CDN, instant deploys, zero config for Vite. Render is better for persistent backend processes with long-running connections to a database. Using both gives best performance for each layer.

---

## 🏁 Closing

> "The app is fully deployed and publicly accessible. The GitHub repo has CI/CD via GitHub Actions — lint and tests run on every push. I'd be happy to walk through any part of the codebase in detail."
