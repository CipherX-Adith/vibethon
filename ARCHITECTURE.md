# Aetheris engineering decisions and assumptions

## 1. Product boundary

Aetheris is a business-to-business exchange for surplus materials and recovered inputs. The core product is the material map: an offer may connect to a process, a recovered output, and a downstream buyer. The marketplace supplies organizations and listings; AI helps normalize unstructured descriptions; deterministic rules explain route candidates.

This implementation adds durable data and authenticated organization workspaces while preserving public marketplace browsing. It does not yet execute a purchase, verify a company, or validate that a material is safe or commercially usable.

## 2. Runtime and database

**Choice:** Node.js HTTP server plus built-in node:sqlite with a file-backed SQLite database.

**Reason:** The current app is a small, dependency-free Node project and the available runtime is Node 22.18. Node currently marks its built-in SQLite API experimental, so startup may print a warning; this is one reason the pilot database layer should move to a maintained PostgreSQL driver before a production SaaS launch. SQLite provides real relational constraints, durable persistence, transactions, indexes, and migrations without requiring credentials or a separate database server for local setup. The app can start with one command and create its data file automatically.

**Assumption:** Initial use is local judging, a pilot, or one application instance. SQLite uses a synchronous API, which keeps this modest server simple but can block the event loop during heavier queries. A local file is not a safe shared database for horizontally scaled instances.

**Production change:** Use managed PostgreSQL with connection pooling and backups before multi-instance production. Keep the same relational entities and ownership rules; replace the database adapter and migrations, not the product model. Move request throttling and session state to shared infrastructure if more than one app process is deployed.

**Schema:** users own credentials; organizations represent companies; memberships connect users to organizations with owner/admin/member roles; sessions store hashed session-token digests and CSRF tokens; listings belong to organizations; saved_listings are per-user bookmarks. Foreign keys prevent orphan records. Live listing deletion is a status change so records are not immediately erased from the database. Demo inventory has an explicit immutable flag.

**Migration choice:** PRAGMA user_version tracks numbered SQL migrations. The migration is applied once at startup. This avoids silently relying on a manually prepared database and leaves a clear path for future schema changes.

## 3. Account and session security

- Registration starts one organization workspace and gives its first account the owner role. This is an assumption for the initial onboarding flow; team invitation and organization switching are not implemented yet.
- The browser never supplies the company name when publishing. The backend takes it from the authenticated organization, which prevents impersonating another listing company.
- Passwords are never stored in plain text. Each password receives a cryptographically random salt and is derived with Node's scrypt implementation. The current rule requires 12–128 characters.
- On sign-in, the server creates a random opaque session token. The browser receives it only in an HttpOnly, SameSite=Lax cookie; the database stores only its SHA-256 digest. The session expires after 14 days. Production cookies receive the Secure flag.
- State-changing browser requests require a same-origin Origin and a CSRF token held in the session response and sent in X-CSRF-Token. APP_ORIGIN overrides origin derivation for a reverse-proxy deployment.
- Login and AI throttles are in-memory. They reduce casual abuse for one process but reset on restart and are not shared across replicas. Production needs a shared rate limiter, email verification, password recovery delivery, optional MFA, monitoring, and a documented retention policy.
- User-facing errors avoid exposing password hashes, API credentials, SQL errors, or whether a particular email/password combination was correct.

## 4. Public data and tenant boundaries

**Choice:** Active marketplace listings are public; create, save, delete, and Gemini analysis require sign-in. Buyers and sellers need to discover each other for the marketplace to be useful. Saved listings are private to the account. The server checks listing ownership or organization admin role before soft-deleting a listing.

**Tenant boundary:** Each user belongs to an organization through memberships. A new account creates one organization. The schema allows more members and roles later; no team invitation API exists yet. Listings store an organization ID and creator ID. The server—not the browser—decides ownership.

**Demo seed:** Existing synthetic offers and requests are inserted into the database at first launch and marked as demo records. Their companies are illustrative. They cannot be edited or deleted from the app and are not represented as verified inventory.

**Legacy browser data:** Previously saved browser-only listings and bookmarks are not automatically uploaded, since doing so would publish potentially private material without an explicit user action. Existing browser storage is left untouched.

## 5. API and frontend boundaries

server.mjs exposes:

- GET /api/session — current account summary and CSRF token; no password data.
- POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout — account and session lifecycle.
- GET /api/listings — public active listings, with a per-request canDelete flag.
- POST /api/listings, DELETE /api/listings/:id — authenticated organization listing management.
- GET /api/saved, POST /api/saved, DELETE /api/saved/:id — private saved items.
- GET /api/status, POST /api/analyze — model configuration and authenticated, rate-limited AI extraction.

auth.js centralizes session refresh and authenticated fetches. app.js renders marketplace state from API responses; localStorage is no longer the source of truth. Search and filtering remain client-side because the seeded marketplace is small. For a large catalog, move search, sorting, filtering, and pagination to SQL and add query limits/cursors.

The HTTP server binds to 127.0.0.1 by default to avoid exposing a development instance on a network. Deployment must set HOST=0.0.0.0, APP_ORIGIN to its public HTTPS URL, and a persistent database path/volume.

## 6. AI boundary and material discovery

**Choice:** Gemini stays behind the Node server. The API key is read from GEMINI_API_KEY; it is never sent to browser code. The model receives only listing description, selected family, and offer/request type. Company account data, quantity, price, region, saved items, and database rows are not sent to Gemini.

**Choice:** Gemini extracts structured fields only. The taxonomy and schema constrain its output, and the server normalizes the response. Prompts tell the model to treat listing text as untrusted and not invent purity, contamination levels, safety, yield, certification, or environmental claims.

**Choice:** The material routes and ranking are curated/deterministic rather than model-generated. This keeps route claims inspectable and repeatable. Shared properties, location groups, direct-family compatibility, and direct quantity comparisons create an explainable screening score. Cross-process conversions do not compare input/output quantities because yield is unknown.

**Fallback:** No Gemini key or a provider failure means local taxonomy and rules mode, clearly labeled in the interface. AI is an optional description-normalization aid, not an autonomous buyer, broker, safety assessor, engineer, or transaction agent.

## 7. Open product and operations work

Before a public SaaS launch, provide:

1. Managed PostgreSQL, encrypted backups, retention and restore procedures.
2. Email verification, password reset, organization invitations, account recovery, and optional MFA.
3. Shared rate limiting, security monitoring, audit events, abuse/reporting flows, and secure secret management.
4. Listing edit/history, organization verification, material evidence uploads, private buyer requirements, and moderation.
5. Messaging, contracts, shipment logistics, payments, dispute handling, and legal/compliance review if transactions are added.
6. Server-side query/pagination and a production-grade deployment pipeline with HTTPS, health checks, observability, and migration controls.

These items are not claimed as implemented by the current build.
