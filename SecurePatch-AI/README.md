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

## Deploying the Vercel frontend with the API

Vercel hosts the frontend and its `/api/*` serverless proxy; it does not host
the Java API or PostgreSQL database. Deploy the backend and database to a
separate HTTPS-capable service using `backend/Dockerfile`, then configure the
backend with its database settings and `AI_PROVIDER=openai`,
`OPENAI_API_KEY`, and `OPENAI_MODEL`. Store `OPENAI_API_KEY` only in the
backend host's secret/environment settings. Set `SESSION_COOKIE_SECURE=true`
on the production backend.

In the Vercel project's server-side environment variables, set
`BACKEND_API_URL` to the backend's HTTPS origin only, for example
`https://your-api-host.example` (no `/api` path). Redeploy the frontend after
setting it. The Vercel proxy keeps browser requests same-origin and forwards
session/CSRF cookies; the OpenAI key is never sent to the browser. Until a
backend URL and provider key are configured, production API calls will report
that the backend or provider is unavailable.

The frontend must not use a `VITE_OPENAI_API_KEY` variable. Any `VITE_` value
is compiled into public browser assets.

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
