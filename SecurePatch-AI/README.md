# Bytecodx Security Workspace

Bytecodx Security Workspace is the vulnerability-management application
alongside the Bytecodx resource collection. It uses a React/TypeScript
frontend, a Java 21 Spring Boot API, PostgreSQL, and a configurable AI provider
(local Ollama or OpenAI).

## Phase 1 status

- Responsive navy-and-indigo dashboard with light and dark themes.
- API availability indicator backed by a real health endpoint.
- Configurable local Ollama or server-side OpenAI integration for
  evidence-grounded drafts. Drafts are explicitly unverified.
- Server-side account registration, password hashing, CSRF-protected session
  sign-in/sign-out, and a database migration for user accounts.
- Spring Boot and PostgreSQL configuration, Dockerfiles, and Docker Compose.
- Empty states clearly distinguish the new installation from verified scan
  results. No scanner integrations or findings are simulated.

Asset/scanner workflows, vulnerability-source correlation, risk scoring,
remediation, and reporting are not implemented yet; they belong to later
phases. AI drafts explanations from caller-supplied evidence and is not a
verified intelligence source.

## Local database-free demo

When PostgreSQL or Docker is unavailable, run the API with the `demo` Spring
profile. This profile uses a local H2 file database for demonstration only;
normal deployments continue to use PostgreSQL. The API listens only on
loopback in this profile. For an alternate development port, set
`SERVER_PORT=5002` and start Vite with `VITE_API_PROXY_TARGET=http://localhost:5002`.

The demo profile creates the viewer account if it does not already exist:
`demo@bytecodx.local` / `BytecodxDemo2026!`. Keep this profile local-only and
change the demo password before exposing any deployment to a network.
In Vite development mode, the sign-in page shows these credentials and a
button to fill them into the form. It still signs in through the API; the
backend must be running with the `demo` profile enabled.
The demo API listens on `127.0.0.1:5002` by default, and Vite's development
proxy targets that port. Set `SERVER_PORT` or `VITE_API_PROXY_TARGET` to
override either default.

## AI provider setup

AI explanations use the provider selected by the backend's `AI_PROVIDER`
setting. The default is `ollama`, which expects a local Ollama service and
installed `qwen2.5:3b` model. For OpenAI, set `AI_PROVIDER=openai`,
`OPENAI_API_KEY` to your secret key, and `OPENAI_MODEL` to a model available to
that key. Set these variables on the Java backend process or hosting service.
Never put an AI key in frontend code, a `VITE_` variable, the login page, or
source control.

For local Docker Compose, copy `.env.example` to `.env`, choose the provider,
then run `docker compose up --build`. For Ollama, pull the model once:
`docker compose exec ollama ollama pull qwen2.5:3b`. Model downloads are never
triggered automatically. The Ollama container is reachable only from the
Compose network and does not publish its port to the host.

For host-installed Ollama, set `AI_PROVIDER=ollama`, `OLLAMA_ENABLED=true`,
`OLLAMA_MODEL=qwen2.5:3b`, and `OLLAMA_BASE_URL=http://localhost:11434` for
the backend process. Install the model with `ollama pull qwen2.5:3b`.

API endpoints:

- `GET /api/v1/intelligence/status` reports the configured provider and its
  availability. For OpenAI, this checks the backend key and configured model.
- `POST /api/v1/intelligence/explanations` accepts a question,
  caller-supplied evidence, and source-reference labels. The evidence and
  labels are not independently verified by this foundation build.
- The previous `/api/v1/intelligence/ollama/*` endpoints remain available for
  local Ollama integrations.

Example request body:

```json
{
  "question": "Summarize the security impact.",
  "evidence": "Paste evidence from an authorized, reviewable source.",
  "sourceReferences": ["caller-supplied source label"]
}
```

Inputs are limited to 1,000 characters for the question, 8,000 for evidence,
and 10 source labels of up to 200 characters each. Generation is capped at
512 tokens. When using OpenAI, the supplied question, evidence, and source
labels are sent to OpenAI; do not include credentials, personal information,
or other secrets.

The Ollama base URL is restricted to local loopback or the Compose `ollama`
service, and provider connection/read timeouts are configurable. Keep the
development API loopback-only; authentication is implemented, while
organization-level authorization and role management are not.

## Start with one click on Windows

Double-click `Start-Bytecodx.bat` in this directory. It starts the Java API
with the local demo profile and H2 database, starts the Vite frontend, waits
for both health checks, and opens the app in your browser. On first run, it
installs frontend dependencies if they are missing. Java 21+, Node.js/npm,
and `curl.exe` are required. The API and frontend bind to loopback only; keep
the two terminal windows open while using the app.

## Run locally with Docker Compose

1. Copy `.env.example` to `.env` and replace the local database password.
2. From this directory, run `docker compose up --build`.
3. Open `http://localhost:5173`. The Java API listens on port 5001 and is
   available at `http://localhost:5001/api/v1/health`.
4. Stop the services with `docker compose down`. Add `-v` only when you
   intentionally want to delete the local PostgreSQL data volume.

The local `.env.example` enables a viewer-only demo login:
`demo@bytecodx.local` / `BytecodxDemo2026!`. This account is created only when
`DEMO_ACCOUNT_ENABLED=true` and does not overwrite an existing account. The
credential is for loopback development only; change it or disable demo-account
seeding before exposing any deployment to a network.

The database port is bound to loopback only. These Compose credentials are for
local development; configure production secrets through your deployment
platform's secret manager.

## Deploying to Vercel (Zero-Config or Custom Backend)

The project is fully configured for seamless deployment on Vercel:

1. **Zero-Config Cloud Mode (Instant)**:
   - Import the repository on [Vercel](https://vercel.com).
   - Vercel automatically detects the build configuration (from repository root or `SecurePatch-AI/frontend`).
   - The app runs **100% completely out of the box** with built-in serverless handlers for health checks, session authentication, AI intelligence drafts, and diagnostic analysis. No "API unavailable" errors will appear.
   - Use the **Instant Sign-in** demo button (`demo@bytecodx.local` / `BytecodxDemo2026!`) or create an account.

2. **Connecting an External Spring Boot Backend (Optional)**:
   - If you deploy the Java backend and PostgreSQL to an external cloud provider (e.g., Render, Railway, AWS, Cloud Run), add the environment variable in Vercel:
     `BACKEND_API_URL=https://your-api-host.example` (HTTPS origin without path).
   - The Vercel proxy will forward requests to your upstream backend. If the backend is ever temporarily down or unreachable, the proxy automatically falls back to built-in handlers to prevent downtime.

## Run frontend and backend without Docker

Start PostgreSQL and set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` in the
environment. From `backend/`, run `mvn spring-boot:run` (the regular profile
uses port 5001). From `frontend/`, run `npm install` once and then
`npm run dev`. For this PostgreSQL setup, set
`VITE_API_PROXY_TARGET=http://localhost:5001`; the Vite default of port 5002 is
for the database-free demo profile.

## Project layout

```text
backend/    Spring Boot API, session authentication, AI providers, and tests
frontend/   React, TypeScript, Vite, and Tailwind CSS
compose.yaml
```

The dashboard intentionally contains no seeded vulnerabilities or fabricated
scanner results. Scanner execution must be added later with authorization
checks, isolated execution, and explicit target validation.
