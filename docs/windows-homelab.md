# Windows home-lab deployment

Garage OS is served only on the Windows PC's Tailscale address at port 8088.
PostgreSQL and the Ktor backend have no host ports and are reachable only by
the web proxy inside Docker.

For public customer accounts, the web proxy also listens on Windows loopback at
`127.0.0.1:8089`. This port is not reachable from the LAN or Internet directly;
it is the origin target for Cloudflare Tunnel.

## First deployment

Open PowerShell and work from a normal user-owned folder, not `System32`:

```powershell
New-Item -ItemType Directory -Force C:\GarageOS | Out-Null
Set-Location C:\GarageOS
git clone https://github.com/WesleyIreland109/mirage-motorworks.git
Set-Location .\mirage-motorworks
Copy-Item .env.homelab.example .env
notepad .env
```

Replace the two placeholder passwords and the email. Generate the database
password locally if desired:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Do not paste either password into chat or commit `.env`. Start the stack:

```powershell
docker compose -f docker-compose.homelab.yml up -d --build
docker compose -f docker-compose.homelab.yml ps
Invoke-RestMethod http://100.71.95.123:8088/health
```

Open `http://100.71.95.123:8088/login` from a device on the same tailnet.

After the first successful login, remove the `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD` lines from `.env`, then recreate the backend:

```powershell
docker compose -f docker-compose.homelab.yml up -d --force-recreate backend
```

The account remains in PostgreSQL. Bootstrap credentials are no longer present
in the container configuration.

## Updating

```powershell
Set-Location C:\GarageOS\mirage-motorworks
git pull --ff-only
docker compose -f docker-compose.homelab.yml up -d --build
```

## Logs and shutdown

```powershell
docker compose -f docker-compose.homelab.yml logs --tail 100
docker compose -f docker-compose.homelab.yml down
```

Do not add `-v` to `down`; that would remove the PostgreSQL volume.

## Public customer API

Do not forward a router port. Put the public website on a custom domain and
publish an API subdomain through Cloudflare Tunnel, such as:

```text
Website: https://www.example.com      (GitHub Pages)
API:     https://api.example.com      (Cloudflare Tunnel)
Origin:  http://127.0.0.1:8089        (Windows only)
```

Set these values in `.env`:

```dotenv
PUBLIC_SITE_URL=https://www.example.com
CORS_ALLOWED_ORIGINS=https://www.example.com
PUBLIC_REGISTRATION_ENABLED=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=Strict
```

Password reset delivery uses Resend. Verify a sending domain in Resend, create
a domain-scoped sending API key, and add these values only to the Windows `.env`:

```dotenv
RESEND_API_KEY=re_replace_with_the_real_key
EMAIL_FROM=Mirage Motorworks <accounts@example.com>
CONTACT_EMAIL_TO=wesley@example.com
```

Never commit the API key. `EMAIL_FROM` must be on a Resend-verified sending
domain. `CONTACT_EMAIL_TO` is where public contact form inquiries are delivered.
Reset tokens are random, stored only as SHA-256 hashes, expire after 30 minutes,
are single-use, and revoke existing sessions when used.

In the GitHub repository, create an Actions variable named
`MIRAGE_API_BASE_URL` with value `https://api.example.com/api`, then redeploy
GitHub Pages. If Pages uses a custom domain, also set `MIRAGE_BASE_PATH` to `/`.
The website and API should share the same registrable domain so
the session remains a first-party cookie.

Install the named Cloudflare Tunnel as a Windows service using the command
shown by Cloudflare's tunnel dashboard, then configure its published
application route to use `http://127.0.0.1:8089`. Never expose ports 5432 or
8080 and never commit the tunnel token.
