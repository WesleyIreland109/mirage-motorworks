# Mirage Motorworks

Mirage Motorworks connects three parts of the business in one private operating system:

1. Vehicle acquisition, repair, and resale.
2. Garage OS for owned and temporarily managed vehicles.
3. Mirage telemetry hardware, recorded-drive diagnostics, and customer-facing summaries.

Garage OS keeps those lifecycles distinct: **My Garage** is the permanent personal fleet, **Working On** contains friend/customer vehicles and their imported telemetry sessions, and **Flips** tracks temporary inventory economics.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TailwindCSS, shadcn-style UI primitives, TanStack Query, React Hook Form, Zod, Lucide Icons, Framer Motion
- Backend: Kotlin, Ktor, PostgreSQL, Flyway, Docker Compose
- Deployment target: GitHub Pages for the frontend, local Docker for the backend

## Quick Start

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and uses mock inventory if `VITE_API_BASE_URL` is not set or the backend is unavailable.

To run the backend with PostgreSQL:

```bash
docker compose up --build
```

Then create `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
```

The public contact form posts to `POST /api/contact` and sends email through
Resend. Configure the backend with:

```dotenv
RESEND_API_KEY=re_replace_with_the_real_key
EMAIL_FROM=Mirage Motorworks <accounts@miragemw.com>
CONTACT_EMAIL_TO=wesley@miragemw.com
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://miragemw.com
```

### Create the first Garage OS account

The first account is created only when the `users` table is empty. Put temporary
bootstrap credentials in a root `.env` file before the first backend start:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=you@example.com
BOOTSTRAP_ADMIN_PASSWORD=use-a-unique-password-with-12-or-more-characters
SESSION_COOKIE_SECURE=false
```

Run `docker compose up --build`, verify that you can sign in at `/login`, then
remove both `BOOTSTRAP_ADMIN_*` lines and recreate the backend container. Use
`SESSION_COOKIE_SECURE=true` when the app is served over HTTPS.

## Useful Scripts

```bash
npm run build
npm run lint
npm run preview
```

## Routes

- `/` public home
- `/inventory` public inventory
- `/inventory/:slug` vehicle detail
- `/about` brand story
- `/contact` lead/contact form
- `/journal` garage journal
- `/admin` Garage OS dashboard
- `/admin/working-on` diagnostic vehicles, session imports, and report publishing
- `/admin/flips` acquisition and target-sale tracking
- `/admin/inventory` public sales inventory
- `/drive-reports/:token` privacy-safe published Mirage Drive Summary

## Backend API

- `GET /health`
- `GET /api/vehicles`
- `GET /api/vehicles/{slug}`
- `POST /api/contact`
- `POST /api/vehicles`
- `PUT /api/vehicles/{id}`
- `DELETE /api/vehicles/{id}`
- `GET|POST /api/fleet`
- `GET|POST /api/telemetry-sessions`
- `PUT /api/telemetry-sessions/{id}/report`
- `POST /api/telemetry-sessions/{id}/publish`
- `GET /api/drive-reports/{token}`

## Telemetry privacy boundary

Garage OS imports a session's summary JSON plus telemetry JSONL in the browser. The raw JSONL is parsed locally and is **not uploaded**; the API stores only the metric names, sample counts, and observed minimum/average/maximum values. A report remains private until it is explicitly published. Public reports omit VINs, owner names, private notes, and raw samples. Simulator-backed sessions are permanently identified in the summary so they cannot be mistaken for vehicle evidence.

See [docs/architecture.md](docs/architecture.md) and [docs/roadmap.md](docs/roadmap.md).
