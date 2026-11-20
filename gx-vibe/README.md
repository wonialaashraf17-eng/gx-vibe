# GX Vibe starter

A mobile-first Node.js + Express + PostgreSQL starter for GX Vibe.

## Included in this starter

- Responsive GX Vibe homepage and navigation.
- Basic account registration, login and logout endpoints.
- Password hashing with bcrypt.
- JWT session in an HttpOnly cookie.
- PostgreSQL schema for users, videos and reports.
- Video upload endpoint for MP4, WebM and MOV.
- Configurable upload-size limit.
- Short-video feed and GX Watch listing.
- AI Creative Studio interface with clearly marked planned tools.
- Basic PWA manifest and service worker.
- Render deployment blueprint.

## Important: prototype limitations

This is a foundation, not a finished public social network. Local disk uploads are suitable only for testing: Render web-service filesystems are ephemeral unless a persistent disk is configured, and local storage does not scale for video delivery. Before public launch, move media to object storage and add a video processing/streaming service (HLS/DASH), moderation workflows, rate limiting, CSRF protection appropriate to the auth design, email verification, password reset, account deletion, privacy controls, and stronger abuse prevention.

The confirmed product requirement is all video lengths with no fixed duration limit, subject to file-size and storage limits, and playback up to 4K where supported. This starter does not yet transcode videos or provide 4K adaptive streaming. The upload cap is configurable through `MAX_UPLOAD_MB`.

AI Camera, AI Assistant, AI Video, AI Photo Studio and other AI tools are UI placeholders. No AI provider is connected and no API key belongs in frontend code.

Live streaming, messaging, comments, recommendations, creator payouts and admin dashboard are planned, not implemented.

For a platform that may be used by teenagers, add age-appropriate defaults, privacy protections, reporting/blocking, human moderation and safeguards before enabling public interaction features. Do not launch open direct messaging or live broadcasts without robust safety and moderation systems.

## Run locally

1. Install Node.js 20 or newer and PostgreSQL.
2. Create a PostgreSQL database.
3. Copy `.env.example` to `.env`.
4. Fill in `DATABASE_URL`.
5. Set `JWT_SECRET` to a random secret with at least 32 characters.
6. Run the SQL in `schema.sql` against the database.
7. Run `npm install`.
8. Run `npm start`.
9. Open `http://localhost:3000`.

## Deploy on Render

1. Push this project to a GitHub repository.
2. Create a PostgreSQL database on Render (or use a compatible managed PostgreSQL provider).
3. Create a Render Web Service connected to the GitHub repository.
4. Use `npm install` as the build command and `npm start` as the start command.
5. Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `COOKIE_SECURE=true`, and `MAX_UPLOAD_MB`.
6. Run `schema.sql` once against the production database.
7. For production media, configure object storage and replace the local upload implementation before accepting real user uploads.

Never commit `.env` or API secrets to GitHub.
