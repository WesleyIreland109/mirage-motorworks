# Mirage Motorworks

Mirage Motorworks is the seed of a boutique enthusiast dealership operating system: a cinematic public brand site, a practical Garage OS admin surface, and a Kotlin/PostgreSQL API for inventory.

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
- `/admin/inventory` inventory CRUD

## Backend API

- `GET /health`
- `GET /api/vehicles`
- `GET /api/vehicles/{slug}`
- `POST /api/vehicles`
- `PUT /api/vehicles/{id}`
- `DELETE /api/vehicles/{id}`

See [docs/architecture.md](docs/architecture.md) and [docs/roadmap.md](docs/roadmap.md).
