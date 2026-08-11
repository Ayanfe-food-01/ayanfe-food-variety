# Production deployment

This project is split into two services:

- `client/` is a Vite SPA deployed to Vercel.
- `server/` is an Express API deployed to Render.
- PostgreSQL is hosted by Neon.
- Product images and payment receipts are stored in Cloudinary.

## 1. Neon

Create a production Neon PostgreSQL database and copy its pooled or direct
connection string into Render as `NEON_DATABASE_URL`. Keep `sslmode=require`.

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
- Pre-deploy command: `npm run prisma:migrate`
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

## 4. Vercel

Create a Vercel project with `client` as the project root. The committed
`client/vercel.json` configures `npm ci`, the Vite build, `dist`, and SPA
fallback routing.

Set this Vercel environment variable for Preview and Production:

```text
VITE_API_URL=https://your-render-service.onrender.com/api/v1
```

The API uses credentialed cross-origin requests for admin and customer
sessions, so `CORS_ORIGIN` must exactly match the deployed Vercel origin
including `https://` and excluding a trailing slash.

## 5. Production smoke test

After both services are deployed:

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