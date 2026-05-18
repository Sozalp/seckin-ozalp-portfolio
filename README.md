# Seckin Ozalp Portfolio App

Web portfolio + admin panel scaffold.

## Run locally

```bash
npm install
npm run dev
```

Public site:

```text
http://localhost:3000
```

Admin panel:

```text
http://localhost:3000/admin
```

In local development, without Supabase environment variables the app uses demo data and admin edits stay in browser localStorage. In production, the admin panel requires Supabase environment variables and will not open in demo mode.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a private admin user in Supabase Auth.
4. Copy `.env.example` to `.env.local` and fill:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Create a Storage bucket named `portfolio`.

The public site reads published rows from `works`. The admin page signs in with Supabase Auth and can add, edit, delete and reorder work items.

## Deploy to Vercel

1. Push this `portfolio-app` folder to GitHub.
2. Import the GitHub repository in Vercel.
3. Add these Production environment variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Deploy the project.
5. Add `seckinozalp.com` and `www.seckinozalp.com` in Vercel project domains.
6. In Natro DNS, point `@` to Vercel with an A record and `www` with a CNAME record using the values Vercel shows for the project.
