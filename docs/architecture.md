# Architecture

## Product Shape

Mirage Motorworks is split into two experiences:

- Public brand site: premium editorial, inventory discovery, vehicle storytelling, lead capture.
- Garage OS: an internal dealership operating surface for vehicle projects, expenses, repairs, documents, and performance.

The first increment shares the same React app and route tree, with separate public and admin layouts. The backend exposes inventory CRUD over JSON and owns persistence.

## Frontend

The frontend lives in `frontend/`.

- Vite provides fast local development and static builds for GitHub Pages.
- React Router separates public pages from Garage OS.
- TanStack Query manages API reads and mutations.
- React Hook Form and Zod validate admin inventory forms.
- TailwindCSS holds the Mirage visual system.
- shadcn-style primitives live in `src/components/ui` so the design system can evolve without pulling in generated boilerplate.

If `VITE_API_BASE_URL` is absent or unreachable, the frontend falls back to local mock inventory. This keeps the public site and admin UI usable while the local backend is offline.

## Backend

The backend lives in `backend/`.

- Ktor serves JSON endpoints.
- HikariCP manages PostgreSQL connections.
- Flyway applies database migrations at startup.
- Plain SQL keeps the first data layer easy to inspect.

The service is currently local-first through Docker Compose. Future hosted backend decisions should be made after operational needs are clearer.

## Data Model

The first table is `vehicles`, with lifecycle fields for inventory status, financials, highlights, photos, and long-form story content. The shape intentionally supports both public storytelling and Garage OS project tracking.

## Deployment

The frontend build is static and configured for GitHub Pages using Vite's `base` option. The backend is containerized but not yet configured for a production host.
