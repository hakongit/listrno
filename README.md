# Listr.no

Norwegian short positions tracker. Data from Finanstilsynet.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create listrno --public --source=. --push
```

2. Go to [vercel.com](https://vercel.com) and import the repo

3. Click Deploy (no env vars needed)

That's it. Vercel will auto-deploy on every push.

## Custom Domain

In Vercel dashboard:
1. Go to Settings → Domains
2. Add `listr.no`
3. Update DNS at your registrar:
   - A record: `76.76.21.21`
   - Or CNAME: `cname.vercel-dns.com`
