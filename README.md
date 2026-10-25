# Aetheris — circular materials marketplace

Aetheris connects public surplus offers and buyer requests through a curated cross-industry material graph. The app now includes organization accounts, durable listing and saved-item storage, and server-side session authentication.

## Run locally

Install Node.js 22.13 or newer. Copy the environment example to a local .env file, then run npm start in this folder and open http://127.0.0.1:4173. The SQLite database is created automatically at data/aetheris.sqlite; the first run seeds the illustrative demo marketplace. Node 22 may print an experimental API warning for its built-in SQLite driver. Database files and .env are ignored by Git.

Create an organization account from Sign in → Create account. Passwords must be at least 12 characters. Sign in to publish offers or requests, save listings, and run Gemini extraction if a Gemini key is configured. Public browsing and the curated map work without an account.

To enable Gemini, set GEMINI_API_KEY in the local .env file. Never put a key in browser code or commit it. The model receives only the material description, selected material family, and offer/request type. Amount, price, region, account information, and database records are not sent to the model.

## Product architecture

- index.html and styles.css: Marketplace, material map, analysis, account dialogs.
- app.js: Graph display, local deterministic matching, filters, and browser interaction.
- analysis.js: Workbench orchestration, ranking explanation, route evidence, scenario estimator.
- auth.js: Sign-in and registration UI, session refresh, CSRF token handling, authenticated browser API client.
- server.mjs: HTTP server, authentication, organization membership, listings/saved APIs, Gemini proxy, validation and rate limits.
- database.mjs: SQLite startup, migration runner, and demo seeding.
- migrations/001_initial.sql: Versioned relational schema.
- demo-listings.json: Explicitly labeled demo inventory inserted into SQLite on first run.
- ARCHITECTURE.md: Data model, request flows, security decisions, assumptions, and production gaps.

## Database and accounts

SQLite persists users, organizations, memberships, sessions, listings, and saved listings. Registration creates one organization and makes its first user the owner. Listings are associated with that organization, and the server derives the published company name from the signed-in account instead of trusting a form field. All users can browse active offers and requests; only organization owners/admins can remove organization listings. Demo listings cannot be deleted.

The schema uses foreign keys, indexes, soft deletion for live listings, and a PRAGMA user_version migration sequence. Sessions use random opaque cookie tokens; only their SHA-256 digests are stored. Passwords use per-user salts and Node's scrypt implementation. Session cookies are HttpOnly and SameSite=Lax, and become Secure when NODE_ENV=production. JSON mutations also require a same-origin request and a session CSRF token.

## Material analysis

1. Extract: Authenticated requests can send a description to Gemini for constrained structured extraction. Without a configured key, the UI clearly uses local taxonomy/rules.
2. Retrieve: The browser checks Aetheris's curated routes and their source notes.
3. Rank: Deterministic rules compare family, stated properties, broad region, and quantities only for directly comparable material families.
4. Qualify: The app shows evidence, uncertainty, missing details, and checks for human review.

AI does not verify material safety, determine conversion yield, approve a buyer, or create graph routes. Match scores are screening heuristics, not probabilities.

## Engineering scope and limits

This build uses SQLite because it provides a real relational database and zero external service setup for a single-host pilot. It is suitable for a local demo or a small, single-instance deployment with persistent disk. It is not configured for horizontal scaling: multiple server replicas must not share a local SQLite file. Before running a production multi-instance SaaS, migrate to managed PostgreSQL, move session/rate-limit state to shared services, and configure durable backups and secret management.

Registration currently creates a workspace owner. The membership schema supports owner/admin/member roles, but team invitations, email verification, password reset delivery, MFA, audit logs, listing edit/version history, messaging, payment, and transaction settlement need an email provider and further product/security work. No real companies or processor capacity are verified; seeded listings are synthetic.

APP_ORIGIN must equal the public HTTPS origin when deployed behind a reverse proxy. Set HOST=0.0.0.0 for a container/platform that needs the app to bind externally, use HTTPS termination, set NODE_ENV=production, and keep the database on a persistent volume. Do not deploy the SQLite file to an ephemeral serverless filesystem.
