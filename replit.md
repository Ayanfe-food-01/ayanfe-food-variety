# Ayanfe Food Variety Limited

## Project overview

This project is a React + TypeScript + Vite storefront with an Express + TypeScript API and Prisma-backed PostgreSQL data. The storefront supports catalog browsing, cart checkout, manual bank-transfer payment proof submission, Cloudinary receipt storage, and optional Resend notifications. The admin portal uses email/password authentication with database-backed sessions and role-protected API routes.

## Running the app

From the project root:

```bash
cd client
npm ci
npm run dev -- --host 0.0.0.0 --port 5000
```

The Replit workflows run the frontend on port 5000 and the API on port 8000. The homepage is rendered from `client/src/pages/Home.tsx`. Reusable UI components live under `client/src/components/`, API modules live under `server/src/`, and the Prisma schema/migrations live under `server/prisma/`.

For a production split deployment, build the frontend with `VITE_API_URL=https://<render-api>/api/v1`, and run the backend with `npm run build` followed by `npm run start` from `server/`. Apply Prisma migrations with `npm run prisma:migrate` from `server/`.

## User preferences

- Keep the existing React, TypeScript, Vite, and Tailwind-compatible project structure.
- Complete the homepage before starting shop, product detail, cart, checkout, backend, authentication, payments, or admin features.