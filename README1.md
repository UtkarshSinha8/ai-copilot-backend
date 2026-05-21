### PROJECT OVERVIEW:
1. A multi-tenant AI platform — meaning multiple businesses use the same backend but their data is isolated
2. Every design decision flows from this: UUIDs instead of integers, RBAC, JWT, separate modules
3. The architecture is modular — each feature is its own NestJS module that can be developed, tested, and scaled independently

### main.ts points:
1. global validation at the application level so every incoming request is validated before it reaches any controller, following the fail-fast principle

### config module points:
1. Without ConfigModule, we have to process.env.DB_HOST everywhere. If the variable name changes, we update 50 files everywhere
2. used namespaced configuration with registerAs so config is grouped by concern, type-safe

### main.ts points:(The root of everything)
1. loads all .env values
2. database connection

### authentication life cycle:
1. User Logs In: The backend generates an Access Token and a Refresh Token. It hashes the Refresh Token and saves it into this database column, then sends both tokens to the user's browser.

2. User Navigates the App: The browser uses the short-lived Access Token. The database is completely untouched during this time, keeping your API incredibly fast.

3. Access Token Expires (15 mins later): The frontend automatically hits a special /api/auth/refresh endpoint, sending its Refresh Token.

4. The Backend Check: Your NestJS code looks up the user in PostgreSQL and compares the token from the user with the token stored in this refreshToken column. If they match, a new Access Token is issued.

5. User Logs Out: Your code runs a quick update query: UPDATE users SET refreshToken = null WHERE id = 'user_id'. The session is killed permanently.







System Architecture & Technical Decisions

1. API Entry Point & Request Lifecycle (`main.ts`)
The backend is built using NestJS, enforcing a strict structural paradigm to ensure security, data integrity, and cross-origin maintainability from day one.

   Global Routing Control: All backend services are namespaced under the `/api` prefix (e.g., `/api/auth`, `/api/chat`). This separates static or web assets from the API gateway routing layer, paving a seamless path for future API versioning (e.g., `/api/v1/`).
   Fail-Fast Input Validation: Implemented a global `ValidationPipe` leveraging `class-validator` and `class-transformer`. 
       `whitelist: true` dynamically strips incoming payloads of any properties not explicitly defined in Data Transfer Objects (DTOs), preventing mass-assignment security vulnerabilities.
       `forbidNonWhitelisted: true` forces a fail-fast mechanism, instantly rejecting requests with unknown payloads with a `400 Bad Request` rather than silently ignoring them.
   Cross-Origin Resource Sharing (CORS): Configured dynamic origin checking fallback targeting `process.env.FRONTEND_URL` while allowing standard authorization header/cookie delegation (`credentials: true`) to support secure, cookie-based session and token handling.