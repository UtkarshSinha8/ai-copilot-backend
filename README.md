# AI Operations Copilot

A multi-tenant AI backend platform built for businesses. Companies can connect their data, ask questions about it, and trigger automated workflows — all through a single API.

This is not a tutorial project. Every architectural decision was made with production scale in mind — multi-tenancy, security, async processing, and model-agnostic AI integration.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, pgvector |
| Cache | Redis |
| Job Queues | BullMQ |
| AI | OpenRouter |
| Auth | JWT, Passport.js |
| Infra | Docker, Docker Compose |
| Deployment | AWS EC2 |

---

## What is built so far

### Phase 1 (Complete)

JWT authentication with refresh token rotation. Every refresh token is bcrypt hashed before hitting the database. On every refresh call the old token is invalidated and a new pair is issued — so stolen tokens have a one-time use window at most.

Role based access control using NestJS Guards and custom decorators. Permissions are enforced at the route level, completely decoupled from business logic.

Persistent chat system where every message is stored with its role, token count, and the model that generated it. Each chat tracks its own model — users can switch between GPT-4o, Claude, Mistral mid-conversation.

Real-time AI response streaming via Server-Sent Events. The response comes token by token, not all at once. The AI Gateway is an abstraction layer over OpenRouter — switching the model provider requires changing exactly one file.

Multi-tenant data isolation enforced at every layer. Every chat operation checks that the requesting user owns the resource before doing anything.

### Phase 2 (In Progress)

Document upload and processing pipeline. Files get chunked, embedded, and stored as vectors in PostgreSQL using pgvector. When a user asks a question, the system finds the most semantically relevant chunks and injects them into the prompt. This is RAG — Retrieval Augmented Generation.

Redis caching for frequent queries and repeated AI responses.

BullMQ workers for async job processing. Heavy tasks like document embedding run in the background. The API returns immediately with a job ID.

### Phase 3 (Planned)

Workflow automation engine. Users define trigger-action pipelines — upload a document, summarize it, send a notification.

Function calling so the AI can actually take actions — create tasks, query databases, send emails.

GitHub Actions CI/CD pipeline with AWS EC2 deployment.

OpenTelemetry traces on every AI call with token usage and cost attribution per user.

---

## Getting Started

### Requirements

- Node.js 18+
- Docker and Docker Compose
- OpenRouter API key (free tier works fine — openrouter.ai)

### Setup

```bash
git clone https://github.com/UtkarshSinha8/ai-copilot-backend.git
cd ai-copilot-backend
npm install
cp .env.example .env
```

Open `.env` and fill in your values.

```bash
docker-compose up -d
npm run start:dev
```

API runs at `http://localhost:3000/api`

---

## API

### Auth

| Method | Route | Auth Required |
|--------|-------|---------------|
| POST | /api/auth/register | No |
| POST | /api/auth/login | No |
| POST | /api/auth/refresh | No |
| POST | /api/auth/logout | Yes |
| POST | /api/auth/me | Yes |

### Chats

| Method | Route | Auth Required |
|--------|-------|---------------|
| POST | /api/chats | Yes |
| GET | /api/chats | Yes |
| GET | /api/chats/:id | Yes |
| GET | /api/chats/:id/history | Yes |
| PATCH | /api/chats/:id | Yes |
| DELETE | /api/chats/:id | Yes |
| POST | /api/chats/:id/messages | Yes |

### AI

| Method | Route | Auth Required |
|--------|-------|---------------|
| GET | /api/ai/models | Yes |
| POST | /api/ai/chat | Yes |

---

## Project Structure

```
src/
    config/
        database.config.ts
        jwt.config.ts
        redis.config.ts
        openrouter.config.ts
    common/
        guards/
            roles.guard.ts
        decorators/
            roles.decorator.ts
            current-user.decorator.ts
        filters/
            http-exception.filter.ts
        interceptors/
            response.interceptor.ts
    modules/
        auth/
        users/
        chat/
        ai-gateway/
    app.module.ts
    main.ts
```

---

## Key Decisions

**UUID primary keys** — integer IDs are sequential and guessable. UUIDs are not. In a multi-tenant system this matters.

**Refresh token rotation** — tokens are hashed before storage. Each use invalidates the previous token. A leaked refresh token is useless after one rotation cycle.

**AI Gateway as abstraction** — the rest of the application never imports anything from OpenRouter directly. The gateway is the only file that knows which provider is being used.

**Soft delete on chats** — rows are never hard deleted. The deletedAt timestamp is set instead. Data is preserved for audit trails and potential recovery.

**Ownership verification** — every single chat and message operation checks that the authenticated user is the owner of that resource. This is the core of multi-tenant isolation.

**Last 20 messages as context** — sending full chat history to the AI would exceed token limits on long conversations and increase cost linearly. 20 messages is enough context for coherent responses.

---

## Environment Variables

See `.env.example` for the full list of required variables.