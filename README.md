# URL Shortener

A production-oriented URL shortening backend built with **Node.js, Express, Cassandra, and Redis**.

This project started as a simple URL shortener and evolved into a backend system focused on **scalability, caching, reliability, security, observability, and failure handling**.

## ✨ Features

* Create shortened URLs
* Redirect short URLs to their original destinations
* User registration and authentication
* JWT access and refresh tokens
* Refresh-token rotation
* Logout and refresh-token revocation
* User-based authorization for private URL operations
* Cassandra-based persistent storage
* Query-oriented Cassandra data modeling
* Lightweight Transaction (LWT) for concurrent URL creation
* Redis cache-aside caching with TTL
* Redis failure fallback to Cassandra
* Redis circuit breaker
* Layered rate limiting
* CAPTCHA escalation for repeated abuse
* URL validation with Zod
* Request IDs using `AsyncLocalStorage`
* Structured application logging
* Application metrics
* OpenTelemetry tracing
* Jaeger integration
* Docker support
* Docker Compose local setup
* k6 load testing
* Production deployment on Render

---

## 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │      Client      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Express API   │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
                Validation     Auth/AuthZ    Rate Limiting
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Controller    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     Service      │
                         └───────┬──────────┘
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                       ▼                   ▼
                ┌─────────────┐     ┌─────────────┐
                │    Redis    │     │  Cassandra  │
                │    Cache    │     │ Source of   │
                │             │     │   Truth     │
                └─────────────┘     └─────────────┘
```

### Redirect flow

```text
Request: GET /api/url/:shortCode
             │
             ▼
          Redis
             │
       ┌─────┴─────┐
       │           │
     HIT          MISS
       │           │
       ▼           ▼
   Redirect    Cassandra
                   │
                   ▼
              Store in Redis
                   │
                   ▼
                Redirect
```

Redis is treated as a **cache**, not as the source of truth. If Redis is unavailable, the application falls back to Cassandra.

---

# 🗄️ Cassandra Data Model

Cassandra is modeled around the application's access patterns rather than around a single normalized `urls` table.

### `url_by_code`

Used for the primary redirect lookup:

```text
short_code → original_url
```

Query:

> "Given this short code, where should I redirect the user?"

### `code_by_url`

Used to find an existing shortened URL:

```text
original_url → short_code
```

This also supports the idempotent URL creation flow and uses Cassandra LWT to safely handle concurrent creation attempts.

### `urls_by_user`

Used to retrieve URLs belonging to a particular user:

```text
user_id → user's URLs
```

This avoids joins and keeps the query aligned with the Cassandra partition key.

### Why denormalize?

The same information is intentionally represented across multiple tables.

The trade-off is:

```text
More storage
+
More complicated writes
+
Potential partial-write inconsistency
```

in exchange for:

```text
Query-oriented access
+
Efficient partition-key lookups
+
No joins
+
Predictable read performance
```

Cassandra is therefore a deliberate architectural choice for this project's access patterns, not a claim that Cassandra is universally better than a relational database.

---

# ⚡ Concurrent URL Creation with LWT

Multiple requests can attempt to create the same URL simultaneously.

The critical mapping uses:

```sql
INSERT ... IF NOT EXISTS
```

Cassandra's Lightweight Transactions ensure that the conditional write is evaluated atomically.

Conceptually:

```text
100 concurrent requests
          │
          ▼
    INSERT IF NOT EXISTS
          │
     ┌────┴────┐
     │         │
  applied   not applied
   = true     = false
     │         │
     ▼         ▼
  mapping    existing
  created    mapping
```

This prevents competing requests from independently creating the same conditional mapping.

LWT does **not** make all denormalized table writes globally transactional. The three tables are written separately, so partial writes are possible if Cassandra becomes unavailable during the operation.

---

# 🚀 Redis Caching

The application uses a **cache-aside** strategy.

### Cache hit

```text
Request
  ↓
Redis
  ↓
HIT
  ↓
Return cached URL
```

### Cache miss

```text
Request
  ↓
Redis MISS
  ↓
Cassandra
  ↓
Store result in Redis
  ↓
Return URL
```

Cached entries use TTLs to prevent stale data from living indefinitely.

When data is deleted or changed, relevant cache entries can also be invalidated. TTL remains a safety net against stale cache entries.

### Why Redis?

The redirect path is naturally read-heavy. Caching frequently accessed URLs:

* reduces Cassandra traffic
* lowers read latency
* protects the database from unnecessary repeated lookups
* allows cached redirects to continue working during some Cassandra failures

Redis remains an optimization and resilience layer. **Cassandra remains the source of truth.**

---

# 🛡️ Redis Failure Handling

Redis is an optional dependency for serving normal requests.

If Redis becomes unavailable:

```text
Application
    │
    ▼
Redis ❌
    │
    ▼
Cassandra
    │
    ▼
Response
```

The application does not fail simply because the cache is unavailable.

A circuit breaker prevents the application from repeatedly sending requests to an unhealthy Redis instance.

```text
Redis failures
      │
      ▼
Threshold reached
      │
      ▼
Circuit OPEN
      │
      ▼
Skip Redis
      │
      ▼
Cassandra fallback
      │
      ▼
Cooldown
      │
      ▼
HALF-OPEN
      │
   test request
      │
 ┌────┴────┐
 │         │
success   failure
 │         │
 ▼         ▼
CLOSED    OPEN
```

---

# 🔐 Authentication & Authorization

Authentication is implemented using:

* bcrypt password hashing
* JWT access tokens
* JWT refresh tokens
* HTTP-only cookies

Access tokens are short-lived while refresh tokens are used to obtain new credentials.

### Refresh-token rotation

The refresh flow verifies:

1. Refresh token signature
2. Refresh token expiration
3. User identity
4. Stored refresh token
5. Token rotation

A successful rotation replaces the stored refresh token with a newly generated one.

### Authorization

Authentication alone does not grant access to every resource.

Private URL operations verify that the authenticated user owns the resource.

```text
Valid JWT
   ↓
Who are you?
   ↓
userId
   ↓
Does this resource belong to you?
   ↓
Yes → continue
No  → 403
```

### Logout

Logout:

* revokes the stored refresh token
* clears authentication cookies

---

# 🚦 Rate Limiting & Abuse Protection

The application uses multiple signals rather than relying on a single rate-limit identity.

### Authenticated requests

Rate limiting can use:

```text
userId + client IP
```

### Unauthenticated requests

Rate limiting uses:

```text
client IP + client ID cookie
```

IP-based limiting remains useful for detecting abuse across multiple accounts, while user-based limiting provides a stronger identity once authentication is available.

### Abuse escalation

Repeated violations can trigger additional protections such as:

* CAPTCHA
* temporary blocking
* abuse tracking

The rate-limit decision is handled atomically in Redis using Lua scripting.

---

# 🧪 Input Validation

Request payloads are validated with **Zod**.

Invalid input is rejected before reaching the business logic.

The API also applies an Express JSON body limit to prevent unnecessarily large request payloads.

```text
Client request
      ↓
JSON body limit
      ↓
Zod validation
      ↓
Controller
      ↓
Service
```

Validation is used to enforce application-defined input rules; it is not treated as a complete security mechanism for arbitrary malicious URLs.

---

# 📊 Observability

The application includes several observability layers.

### Request IDs

Requests receive unique request IDs using `crypto.randomUUID()` and `AsyncLocalStorage`.

This allows logs belonging to the same request to be correlated.

### Metrics

The application tracks metrics such as:

* total requests
* errors
* URL creation count
* in-flight requests
* request duration
* average latency
* min/max latency
* p50
* p95
* p99

### OpenTelemetry

The application is instrumented with OpenTelemetry and can export traces through OTLP.

Jaeger can be used locally to inspect traces.

```text
Application
     │
     ▼
OpenTelemetry
     │
     ▼
 OTLP exporter
     │
     ▼
   Jaeger
```

---

# 🧯 Error Handling

The application uses a centralized error-handling middleware.

Application-level errors are represented using `ApiError`, while controllers return successful responses through `ApiResponse`.

The general flow is:

```text
Repository
    ↓
Service
    ↓
throw ApiError
    ↓
Global error middleware
    ↓
Consistent API response
```

Validation errors, authentication errors, request-size errors, and unexpected server errors are handled centrally.

Unexpected internal errors are not exposed to clients as raw implementation details.

---

# 📦 Project Structure

```text
url-shortner/
│
├── config/
│   ├── db.js
│   └── redis.js
│
├── controllers/
│
├── middlewares/
│   ├── auth
│   ├── rate limiting
│   ├── validation
│   ├── request ID
│   ├── metrics
│   └── error handling
│
├── observability/
│
├── repositories/
│   ├── Cassandra data access
│   └── user/URL repositories
│
├── routes/
│
├── schemas/
│   └── Zod validation schemas
│
├── services/
│   └── business logic
│
├── utils/
│   ├── ApiError
│   ├── ApiResponse
│   ├── Redis circuit breaker
│   └── other utilities
│
├── Dockerfile
├── compose.yaml
├── instrumentation.js
├── load-test.js
├── server.js
└── package.json
```

---

# 🐳 Docker

The application includes a production-oriented Dockerfile using Node.js Alpine.

The image:

* installs production dependencies
* excludes development dependencies
* excludes environment files from the build context
* runs the application with Node.js

Docker Compose is provided for local development with the backend and Redis. Cassandra is externally managed through Astra DB rather than running as a local container.

---

# 📈 Load Testing

The project includes a k6 load-test script for exercising the redirect endpoint.

The test can be configured using:

```bash
LOAD_TEST_URL=<your-url>
```

The load testing process was used to evaluate:

* request throughput
* latency
* p50/p95 behavior
* error rate
* Redis failure behavior
* application behavior while falling back to Cassandra

### Observed results

During local testing, the application maintained **0% request failures** across the tested Redis failure scenarios.

The tests also showed the expected behavior:

```text
Redis healthy
    ↓
cache requests

Redis unavailable
    ↓
Redis failure
    ↓
Cassandra fallback
    ↓
requests continue successfully
```

Throughput and latency measurements from local load tests should not be treated as production capacity benchmarks because they depend heavily on the test environment and deployment topology.

---

# ☁️ Deployment

The application is deployed as a Docker-based web service on Render.

External services currently used include:

* **Astra DB / Cassandra** for persistent storage
* **Render Key Value / Redis-compatible cache** for caching
* **Render** for application hosting
* **Jaeger / OpenTelemetry** for observability during development/testing

The deployed API is available at:

**https://url-shortner-nh7m.onrender.com**

---

# ⚙️ Local Setup

## Prerequisites

* Node.js 22+
* Docker / Docker Compose
* Cassandra/Astra DB credentials
* Redis
* Required environment variables

## Installation

```bash
git clone https://github.com/Deepak-newbie-alt/url-shortner.git

cd url-shortner

npm install
```

Create a `.env` file using `.env.example` as a reference.

Then start the development server:

```bash
npm run dev
```

Or use Docker Compose:

```bash
docker compose up --build
```

The exact environment configuration depends on whether Cassandra is being accessed through Astra DB or another Cassandra deployment.

---

# 🔑 Environment Variables

The application requires configuration for the services it uses.

Typical variables include:

```text
PORT
NODE_ENV

ASTRA_TOKEN
SCB_PATH

REDIS_URL
REDIS_PASSWORD

ACCESS_TOKEN_SECRET
REFRESH_TOKEN_SECRET

RECAPTCHA_SECRET_KEY

OTEL_SERVICE_NAME

LOAD_TEST_URL
```

Refer to `.env.example` for the current configuration expected by the application.

**Never commit real secrets or credentials to the repository.**

---

# 🔌 API Overview

### User

```text
POST /api/user/register
POST /api/user/login
POST /api/user/rotate-token
POST /api/user/logout
```

### URL

```text
POST /api/url/shorten
GET /api/url/:shortcode
GET /api/url/user/urls
DELETE /api/url/:shortcode
```
The URL routes provide functionality for creating and managing shortened URLs, as well as redirecting users through their short codes.

Authentication is required for operations involving a user's private URLs, while the redirect path remains publicly accessible.

---

# 🔮 Future Improvements

Possible improvements if the system were taken to a significantly larger production scale include:

* Cache stampede protection / request coalescing
* Refresh-ahead caching for extremely hot URLs
* More advanced refresh-token reuse detection
* Hashed refresh-token storage
* Explicit repair/reconciliation for partially written Cassandra denormalized data
* Partition bucketing for extremely large user partitions
* More comprehensive automated integration/load testing
* Scaling Redis and Cassandra based on measured production bottlenecks

These are intentionally not implemented simply for the sake of adding infrastructure. They would be evaluated based on actual workload and failure patterns.

---

# 🎯 What This Project Demonstrates

This project was built to explore backend engineering beyond basic CRUD.

The main areas explored are:

* Query-oriented NoSQL data modeling
* Distributed database trade-offs
* Cassandra LWT
* Cache-aside architecture
* Cache invalidation
* Circuit breakers
* Graceful degradation
* Authentication and authorization
* Refresh-token rotation
* Layered rate limiting
* Abuse protection
* Centralized error handling
* Structured logging
* Metrics
* Distributed tracing
* Dockerized deployment
* Load testing
* Failure testing

The goal was not to build a "perfect" system, but to understand the **trade-offs involved in building and operating a backend service**.

---
