# BOGOLAND server

Express API backed by Neon (Postgres), images stored on Cloudinary. This is the
backend half of the v4 plan — the frontend (`../index.html` etc.) still reads
`products.json` directly for now; switching it to call this API is the next
step once this is deployed and seeded.

## What you need to create first (accounts only you can set up)

1. **Neon** — https://neon.tech, free tier. Create a project, then copy the
   connection string from the dashboard.
2. **Cloudinary** — https://cloudinary.com, free tier. From the dashboard
   home page, copy your Cloud Name, API Key, and API Secret.
3. **Render** or **Railway** — free tier, for hosting this server (GitHub
   Pages only hosts static files, it can't run this).

## Local setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — from Neon.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from Cloudinary.
- `JWT_SECRET` — any long random string (e.g. generate one with `openssl rand -hex 32`).
- `ADMIN_EMAIL` — the email the admin logs in with.
- `ADMIN_PASSWORD_HASH` — run `npm run hash-password -- "your-chosen-password"` and paste the output here. The plain password is never stored anywhere.

Then create the table and load the current products:

```bash
psql "$DATABASE_URL" -f schema.sql   # or paste schema.sql into the Neon SQL editor
npm run seed                          # imports ../products.json into the new table
```

Run it:

```bash
npm run dev
```

Visit `http://localhost:3000/api/products` — you should see the same products
that are currently in `products.json`, now served from Neon.

## API

| Method | Route                     | Auth  | Purpose                                  |
|--------|---------------------------|-------|-------------------------------------------|
| GET    | `/api/products`           | none  | list all products                        |
| GET    | `/api/products/:id`       | none  | one product                               |
| POST   | `/api/products/:id/click` | none  | increments click count (WhatsApp button)  |
| POST   | `/api/admin/login`        | none  | `{email, password}` → `{token}`           |
| POST   | `/api/products`           | admin | create product                            |
| PUT    | `/api/products/:id`       | admin | update product                            |
| DELETE | `/api/products/:id`       | admin | delete product                            |
| POST   | `/api/upload`             | admin | multipart `image` field → `{url}`         |

Admin routes need `Authorization: Bearer <token>` from the login response.

## Deploying

On Render or Railway: point it at this repo, set the **root directory to
`server`**, build command `npm install`, start command `npm start`, and add
all the same environment variables from `.env` in their dashboard (never
commit `.env` — it's gitignored). Set `ALLOWED_ORIGINS` to your GitHub Pages
URL so the live frontend is allowed to call this API.

## Not done yet

- The frontend (`js/main.js`) still fetches `products.json` directly — it
  needs to be pointed at `GET /api/products` from this API instead once it's
  deployed and seeded. That's a deliberate next step, not an oversight.
- No admin UI yet — the admin routes exist but there's no page to use them
  from. That's the next piece after the frontend is switched over.
