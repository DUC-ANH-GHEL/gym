# Gym Planner

Mobile-first gym planner and workout tracker built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Neon Postgres, Cloudinary, Web Push, and QStash.

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
   CLOUDINARY_URL=
   ADMIN_IDENTIFIERS=
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=mailto:you@example.com
   QSTASH_URL=
   QSTASH_TOKEN=
   QSTASH_CURRENT_SIGNING_KEY=
   QSTASH_NEXT_SIGNING_KEY=
   ```

   `NEXTAUTH_SECRET` must be set and kept stable in production. Changing it invalidates existing login cookies.

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

Exercise image upload uses `/api/upload` and requires a logged-in session. If Cloudinary env vars are empty, the upload UI shows a setup message instead of crashing.

Recommended Cloudinary env var:

```env
CLOUDINARY_URL=
```

The app also supports split Cloudinary variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

## Admin

Set `ADMIN_IDENTIFIERS` to a comma-separated list of login accounts that can manage exercise catalog metadata.

```env
ADMIN_IDENTIFIERS=admin,coach
```

Accounts listed in `ADMIN_IDENTIFIERS` cannot register through the public form. Create the account first, then enable the admin identifier. Redeploy after changing production environment variables.

## Workout Rest Reminders

After a completed set, the app starts a 45-second rest timer. After the final set of an exercise, it starts a 120-second rest timer for the next exercise.

When the app is open, the service worker sends the notification at the timer boundary. When the app is closed but the device can receive Web Push, QStash publishes a delayed callback at the same reminder due time. The callback is verified with QStash signing keys before it can send a push notification.

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Required environment variables:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

`QSTASH_URL` and `QSTASH_TOKEN` are used only to schedule the delayed callback. `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` verify that the callback was sent by QStash. Do not expose these variables to client-side code.

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
- Login cookies are long-lived and should only be cleared when the user logs out, the browser deletes site data, or `NEXTAUTH_SECRET` changes.
- `/api/upload` validates session, same-origin requests, file type, and a 5MB image size limit.
- QStash callbacks verify the signed raw request body before processing a reminder.
- `.env*`, `.next`, and `node_modules` are ignored by git.
