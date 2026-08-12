# Production deployment

This project is split into two services:

- `client/` is a Vite SPA deployed to Vercel.
- `server/` is an Express API deployed to Render.
- PostgreSQL is hosted by Neon.
- Product images and payment receipts are stored in Cloudinary.

## 1. Neon

Create a production Neon PostgreSQL database and copy its pooled or direct
connection string into Render as `NEON_DATABASE_URL`. Keep `sslmode=require`.
The application passes this value to Prisma at runtime and the migration
script maps it to Prisma's standard `DATABASE_URL` variable automatically.
For safety, local development prefers `DATABASE_URL`; `NEON_DATABASE_URL` is
selected automatically only when `NODE_ENV=production`.

The Render blueprint runs `npm run prisma:migrate` before each deploy. This
applies the committed Prisma migrations to the production database. Seed the
catalog only after confirming the production database is empty:

```bash
cd server
npm run prisma:seed
```

Do not use development database credentials in Render.

## 2. Cloudinary

Create or choose a Cloudinary product environment and add these values to
Render only:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The API performs signed uploads. Product images use the `product-images`
folder, and payment proofs use the `payment-receipts` folder. The API never
exposes the Cloudinary API secret to the browser.

## 3. Render

Create a Render web service from this repository and use `render.yaml`, or
enter these settings manually:

- Root directory: `server`
- Build command: `npm ci && npm run build`
- Pre-deploy command: leave blank on Render Free
- Start command: `npm run start`
- Health check path: `/health`

Required Render values:

- `NODE_ENV=production`
- `NEON_DATABASE_URL`
- `SESSION_SECRET` (at least 32 characters)
- `CORS_ORIGIN` set to the exact Vercel origin
- `PUBLIC_APP_URL` set to the Vercel origin
- Cloudinary values above

Render supplies `PORT`; the committed blueprint includes `10000` as its
default service value.

The production `start` script runs `prisma migrate deploy` before starting
Express. It retries only transient Prisma advisory-lock timeouts with a short,
bounded backoff. This keeps migrations safe on Render Free, where the
dashboard may lock the separate pre-deploy command behind a paid plan. If the
database configuration or a real migration error occurs, the service
intentionally does not start instead of serving an incompatible schema.

## 4. Vercel

Create a Vercel project with `client` as the project root. The committed
`client/vercel.json` configures `npm ci`, the Vite build, `dist`, and SPA
fallback routing.

Set this Vercel environment variable for Preview and Production:

```text
VITE_API_URL=https://your-render-service.onrender.com/api/v1
```

The value must not end with punctuation such as a period. After changing a
Vercel environment variable, trigger a new deployment; environment variables
are embedded into the static frontend during the build.

The API uses credentialed cross-origin requests for admin and customer
sessions, so `CORS_ORIGIN` must exactly match the deployed Vercel origin
including `https://` and excluding a trailing slash.

## 5. Production smoke test

After both services are deployed and the two public URLs have been entered:

1. Open `https://your-render-service.onrender.com/health` and confirm
   `{ "data": { "status": "ok" } }`.
2. Open the Vercel site and confirm catalog categories/products load.
3. Create a customer account and verify refresh keeps the session.
4. Place a test order and upload a payment proof; confirm the Cloudinary URL
   is saved and the admin portal can review it.
5. Log into the admin portal and test a product image upload.
6. Confirm Render logs show no database, CORS, or storage errors.

Never paste production secrets into source files, commits, or chat. Use the
Vercel and Render secret/environment-variable settings.

## Local/Replit connection commands

Run these commands from the repository root. Replit Secrets should contain
`NEON_DATABASE_URL`, `SESSION_SECRET`, and the three `CLOUDINARY_*` values.
Never put those values in a committed `.env` file.

```bash
# Install dependencies once
npm ci
npm --prefix client ci
npm --prefix server ci

# Generate Prisma Client and apply all committed migrations
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate

# Verify database reachability and required server configuration
npm --prefix server run doctor

# Create or update the first admin account using ADMIN_EMAIL and ADMIN_PASSWORD
npm --prefix server run admin:create

# Start the API (terminal 1)
npm --prefix server run dev

# Start the Vite storefront (terminal 2)
npm --prefix client run dev -- --host 0.0.0.0 --port 5000
```

Check the running services with:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
```

`/health` confirms that the process is alive. `/ready` confirms that the API
can reach PostgreSQL and reports whether Cloudinary credentials are configured.
If product creation still fails, run `npm --prefix server run doctor` and check
the API workflow logs; do not retry uploads repeatedly until the configuration
error is fixed.

## Values to enter at deployment time

The code is ready without knowing the final provider URLs. Before the first
production test, enter:

### Vercel

```text
VITE_API_URL=https://<your-render-service>.onrender.com/api/v1
```

### Render

```text
CORS_ORIGIN=https://<your-vercel-project>.vercel.app
PUBLIC_APP_URL=https://<your-vercel-project>.vercel.app
```

If a custom domain is added later, replace these values with the exact custom
frontend origin and redeploy the API. Do not include a trailing slash.