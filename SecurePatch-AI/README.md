# Bytecodx Security Workspace

Bytecodx Security Workspace is the vulnerability-management application
alongside the Bytecodx resource collection. It uses a React/TypeScript
frontend, a Java 21 Spring Boot API, PostgreSQL, and a local Ollama model.

## Phase 1 status

- Responsive navy-and-indigo dashboard with light and dark themes.
- API availability indicator backed by a real health endpoint.
- Required local Ollama status and evidence-grounded draft UI backed by the local
  Spring Boot API. Drafts are explicitly unverified.
- Server-side account registration, password hashing, CSRF-protected session
  sign-in/sign-out, and a database migration for user accounts.
- Spring Boot and PostgreSQL configuration, Dockerfiles, and Docker Compose.
- Empty states clearly distinguish the new installation from verified scan
  results. No scanner integrations or findings are simulated.

Asset/scanner workflows, vulnerability-source correlation, risk scoring,
remediation, and reporting are not implemented yet; they belong to later
phases. Ollama drafts explanations from caller-supplied evidence and is not a
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

## Required local Ollama setup

AI explanations require a local Ollama service and installed model. No external
AI API or API key is used. The default configuration is enabled and expects
`qwen2.5:3b`. The integration accepts caller-provided evidence and source
labels, and responses are always marked `UNVERIFIED_DRAFT`; independently
validate every result.

For Docker Compose, copy `.env.example` to `.env`, then run
`docker compose up --build`. Pull the model once:
`docker compose exec ollama ollama pull qwen2.5:3b`. Model downloads are never
triggered automatically. The Ollama container is reachable only from the
Compose network and does not publish its port to the host.

For host-installed Ollama, set `OLLAMA_ENABLED=true`,
`OLLAMA_MODEL=qwen2.5:3b`, and `OLLAMA_BASE_URL=http://localhost:11434` for the
backend process. Install the model with `ollama pull qwen2.5:3b`.

API endpoints:

- `GET /api/v1/intelligence/ollama/status` reports disabled, unavailable,
  missing-model, or ready state.
- `POST /api/v1/intelligence/ollama/explanations` accepts a question,
  caller-supplied evidence, and source-reference labels. The evidence and
  labels are not independently verified by this foundation build.

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
512 tokens.

The base URL is restricted to local loopback or the Compose `ollama` service,
and connection/read timeouts are configurable. Keep the development API
loopback-only; authentication is implemented, while organization-level
authorization and role management are not.

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

## Run frontend and backend without Docker

Start PostgreSQL and set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` in the
environment. From `backend/`, run `mvn spring-boot:run` (the regular profile
uses port 5001). From `frontend/`, run `npm install` once and then
`npm run dev`. For this PostgreSQL setup, set
`VITE_API_PROXY_TARGET=http://localhost:5001`; the Vite default of port 5002 is
for the database-free demo profile.

## Project layout

```text
backend/    Spring Boot API, session authentication, local Ollama integration, and tests
frontend/   React, TypeScript, Vite, and Tailwind CSS
compose.yaml
```

The dashboard intentionally contains no seeded vulnerabilities or fabricated
scanner results. Scanner execution must be added later with authorization
checks, isolated execution, and explicit target validation.
