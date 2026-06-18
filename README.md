# Gym Planner

Mobile-first gym planner and workout tracker built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Neon Postgres, and Cloudinary.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example`:

   ```env
   DATABASE_URL=
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

   `NEXTAUTH_SECRET` must be set. The app does not use a weak fallback secret.

3. Generate Prisma Client:

   ```bash
   npm run prisma:generate
   ```

4. Apply migrations to Neon/Postgres:

   ```bash
   npm run prisma:deploy
   ```

5. Start development:

   ```bash
   npm run dev
   ```

## Cloudinary

Exercise image upload uses `/api/upload` and requires a logged-in session. If Cloudinary env vars are empty, the upload UI fails gracefully with a setup message instead of crashing the form.

Required Cloudinary env vars:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Verification

Run before shipping:

```bash
npm run lint
npm run build
npx prisma validate
npm audit --audit-level=moderate
```

## Security Notes

- All app data is scoped by `userId`.
- Protected pages redirect unauthenticated users to `/login`.
- `/api/upload` validates session, same-origin requests, file type, and a 5MB image size limit.
- `.env*`, `.next`, and `node_modules` are ignored by git.
