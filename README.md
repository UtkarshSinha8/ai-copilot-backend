# AI Operations Copilot

A production-grade multi-tenant AI backend platform. Businesses upload their documents, connect their APIs, and ask natural language questions — the system finds relevant context from their data and answers using LLMs. Built and deployed end to end.

**Live API:** http://51.20.193.203:3000/api

---

## What this actually does

Most AI chatbots answer from training data only. This platform lets businesses bring their own data. Upload a document, ask a question about it, and the system finds the most relevant parts of that document and uses them to answer — accurately, without hallucinating.

```
Without RAG:  User asks "what is our refund policy?"
              AI guesses from training data

With RAG:     User asks "what is our refund policy?"
              System searches uploaded policy documents
              Finds the exact relevant section
              AI answers using actual company policy
```

---

## Live Demo

### Document Upload — queued for background processing instantly
![Document Upload](https://github.com/user-attachments/assets/d5241c57-aac1-4423-b737-2663007ea568 )

### RAG Pipeline — first query hits vector search, retrieves 5 chunks
![RAG Response](https://github.com/user-attachments/assets/202577eb-f47f-4f5e-bad2-6ce651155ab7)

### Redis Cache Hit — same question returns in 24ms from cache
![Cache Hit](https://github.com/user-attachments/assets/534d1f62-d99e-4088-bb17-214d6f1911c3")

### Streaming AI Response — tokens arrive in real time via SSE
![Streaming](https://github.com/user-attachments/assets/253ed233-db4d-457a-b8da-095740c0aa36")

### pgvector  table creation and embedding storage confirmation
![pgvector](https://github.com/user-attachments/assets/0848e97d-48b4-497a-9b51-428c4e469730")

### AWS EC2 — deployed and running at 51.20.193.203
![EC2 Instance](https://github.com/user-attachments/assets/623e8322-4796-4212-b06a-f49469fb94db")

### Docker Containers on EC2 — all three services up
![Docker Containers](https://github.com/user-attachments/assets/faf606c1-fce2-4003-bdab-91d46c82825f")

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, TypeScript |
| Database | PostgreSQL with pgvector |
| Cache | Redis |
| Job Queues | BullMQ |
| AI Gateway | OpenRouter |
| Auth | JWT with refresh token rotation |
| Deployment | Docker, AWS EC2 |

---

## Features

### Authentication
JWT authentication with refresh token rotation. Access tokens expire in 15 minutes. Refresh tokens are bcrypt-hashed before storage — a compromised database cannot be used to forge tokens. Every refresh call issues a new token pair and invalidates the previous one.

### Role Based Access Control
Guards and custom decorators enforce permissions at the route level. Business logic has no knowledge of authorization rules.

### Document Upload and Processing
Files are uploaded via multipart form data, stored on disk with UUID filenames to prevent path traversal attacks, and immediately queued for background processing via BullMQ. The API returns a job ID instantly without blocking.

### RAG Pipeline
Documents are chunked into overlapping segments, each chunk is embedded using an LLM embedding model, and the vectors are stored in PostgreSQL using the pgvector extension. When a user asks a question, the system runs a similarity search against all their document chunks and retrieves the most relevant ones. Those chunks are injected into the AI prompt as context.

### Redis Caching
Identical questions return cached answers in milliseconds. First query hits the full RAG pipeline. Subsequent identical queries return from Redis cache. Response time drops from seconds to under 30ms on cache hits.

### Streaming AI Responses
AI responses stream token by token via Server-Sent Events. The client starts receiving content immediately rather than waiting for the full response.

### BullMQ Job Queues
Document embedding runs in background workers via BullMQ backed by Redis. The HTTP layer stays fast regardless of how long processing takes.

### Multi-Tenant Isolation
Every query, every entity, every guard enforces that users can only access their own data. No cross-tenant data leakage is possible at the application layer.

---

## Deployment

Running on AWS EC2 t3.micro. The full stack runs inside Docker containers managed by Docker Compose.

```
Live URL:     http://51.20.193.203:3000/api
EC2 Type:     t3.micro
Region:       eu-north-1
Containers:   ai_copilot_backend  → port 3000
              ai_copilot_postgres → port 5432
              ai_copilot_redis    → port 6379
```

---

## API Reference

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/refresh | Refresh tokens | No |
| POST | /api/auth/logout | Logout | Yes |
| POST | /api/auth/me | Current user | Yes |

### Chats

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/chats | Create chat | Yes |
| GET | /api/chats | Get all chats | Yes |
| GET | /api/chats/:id | Get chat | Yes |
| GET | /api/chats/:id/history | Message history | Yes |
| POST | /api/chats/:id/messages | Send message (streaming) | Yes |
| PATCH | /api/chats/:id | Update chat | Yes |
| DELETE | /api/chats/:id | Delete chat | Yes |

### Documents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/documents/upload | Upload document | Yes |
| GET | /api/documents | Get all documents | Yes |
| GET | /api/documents/:id | Get document | Yes |
| GET | /api/documents/:id/chunks | Get chunks | Yes |
| POST | /api/documents/search | Semantic search | Yes |
| POST | /api/documents/ask | Ask question (RAG) | Yes |
| DELETE | /api/documents/:id | Delete document | Yes |

### AI Gateway

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/ai/models | Available models | Yes |
| POST | /api/ai/chat | Direct chat | Yes |

---

## Getting Started

### Requirements

- Node.js 18+
- Docker and Docker Compose
- OpenRouter API key — free tier at openrouter.ai

### Run Locally

```bash
git clone https://github.com/UtkarshSinha8/ai-copilot-backend.git
cd ai-copilot-backend
npm install
cp .env.example .env
# fill in your values in .env
docker-compose up -d
npm run start:dev
```

API runs at `http://localhost:3000/api`

### Run Against Live Server

All endpoints are live at `http://51.20.193.203:3000/api`

Register an account and start making requests directly — no local setup needed.

---

## Project Structure

```
src/
    config/
    common/
        guards/
        decorators/
        filters/
        interceptors/
    modules/
        auth/
        users/
        chat/
        ai-gateway/
        documents/
    app.module.ts
    main.ts
```

---

## Key Architecture Decisions

**UUID primary keys** — sequential integers are guessable. UUIDs are not. Every entity uses UUID primary keys.

**Refresh token rotation** — tokens are hashed with bcrypt before storage. Each use invalidates the previous token. A leaked token has a one-time use window at most.

**AI Gateway abstraction** — the application never imports OpenRouter directly. Switching providers requires changing one file.

**pgvector over external vector DB** — vector search runs inside the same PostgreSQL instance. No additional infrastructure, no additional cost, no network hop.

**BullMQ for document processing** — embedding a document takes 10 to 30 seconds. This runs in background workers. The API returns immediately.

**Redis cache on RAG queries** — the same question asked twice does not hit the AI model twice. Cache hits return in under 30ms.

**Ownership checks on every operation** — multi-tenant isolation enforced at every service method. A user cannot access another user's data regardless of what they pass in the request.

**Soft delete** — no data is hard deleted. Chats and documents use a deletedAt timestamp for audit trails.

---

## Environment Variables

See `.env.example` for the full list.

---

## License

MIT






