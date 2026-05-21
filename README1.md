## System Architecture & Technical Decisions

### 1. API Entry Point & Request Lifecycle (`main.ts`)
The backend is built using NestJS, enforcing a strict structural paradigm to ensure security, data integrity, and cross-origin maintainability from day one.

   **Global Routing Control:** All backend services are namespaced under the `/api` prefix (e.g., `/api/auth`, `/api/chat`). This separates static or web assets from the API gateway routing layer, paving a seamless path for future API versioning (e.g., `/api/v1/`).
   **Fail-Fast Input Validation:** Implemented a global `ValidationPipe` leveraging `class-validator` and `class-transformer`. 
       `whitelist: true` dynamically strips incoming payloads of any properties not explicitly defined in Data Transfer Objects (DTOs), preventing mass-assignment security vulnerabilities.
       `forbidNonWhitelisted: true` forces a fail-fast mechanism, instantly rejecting requests with unknown payloads with a `400 Bad Request` rather than silently ignoring them.
   **Cross-Origin Resource Sharing (CORS):** Configured dynamic origin checking fallback targeting `process.env.FRONTEND_URL` while allowing standard authorization header/cookie delegation (`credentials: true`) to support secure, cookie-based session and token handling.