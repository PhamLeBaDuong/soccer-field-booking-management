This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Frontend Setup

Create `client/web/.env.local` when you need custom API settings:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_USE_MOCK=false
```

Install and run from `client/web`:

```bash
npm install
npm run dev
npm run build
```

Set `NEXT_PUBLIC_USE_MOCK=true` to use the built-in PitchBook demo data when the backend is unavailable.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The Next.js app lives in `client/web`, which is **not** the repository root. Configure
the Vercel project as follows:

1. **Import the repo** at [vercel.com/new](https://vercel.com/new).
2. **Root Directory** → set to `client/web`. Vercel then auto-detects Next.js and uses
   `next build` / `.next` automatically — no `vercel.json` needed.
3. **Environment Variables** (Settings → Environment Variables, for the Production +
   Preview environments):

   | Name                   | Value                                                   |
   | ---------------------- | ------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`  | `https://soccer-field-booking-management-1.onrender.com` |
   | `NEXT_PUBLIC_USE_MOCK` | `false`                                                 |

   These are `NEXT_PUBLIC_*` variables, so they are **inlined at build time**. If you add
   or change them after a deploy, you must redeploy for the new value to take effect.
   If `NEXT_PUBLIC_API_URL` is unset, the build silently falls back to
   `http://localhost:5000` and the live site will fail to reach the backend.

4. Make sure the backend CORS / Socket.IO origin allowlist includes the Vercel domain
   (e.g. `https://<project>.vercel.app` and any custom domain).
