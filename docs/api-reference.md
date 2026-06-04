# API Reference Guide

GuardLayer exposes two categories of APIs:
1. **Admin Management APIs** (Dashboard operations, config tuning, audits, keys keys setup) — protected by JWT Authorization.
2. **LLM Proxy Gateways** (Completions routing, compatible with OpenAI format) — protected by Client API Keys.

---

## Authorization Schemes

### Admin API Token
All routes under `/api/*` (except auth registration and login) require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <valid_jwt_token>
```

### Client API Key
Proxy routes under `/v1/*` require a Bearer token in the `Authorization` header representing a valid GuardLayer API Key:
```http
Authorization: Bearer gl_live_abc123...
```

---

## Endpoints

### 1. Admin Authentication

#### `POST /auth/register`
- **Description**: Registers the first administrative user account (subsequent calls will return 403 Forbidden).
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "admin@guardlayer.dev",
    "password": "securepassword123"
  }
  ```
- **Response Schema (`201 Created`)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "uuid-string",
      "email": "admin@guardlayer.dev"
    }
  }
  ```

#### `POST /auth/login`
- **Description**: Authenticates admin credentials and returns a signed JWT.
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "admin@guardlayer.dev",
    "password": "securepassword123"
  }
  ```
- **Response Schema (`200 OK`)**:
  ```json
  {
    "token": "signed_jwt_token_string",
    "user": {
      "id": "uuid-string",
      "email": "admin@guardlayer.dev"
    }
  }
  ```

---

### 2. Client Keys Management

#### `GET /api/keys`
- **Description**: Retrieves a list of all administrative API key scopes.
- **Auth Required**: Yes (Admin JWT)
- **Response Schema (`200 OK`)**:
  ```json
  [
    {
      "id": "uuid-string",
      "name": "production-mobile-app",
      "key_prefix": "gl_live_abc",
      "is_active": true,
      "created_at": "2026-06-04T10:00:00Z",
      "last_used_at": "2026-06-04T15:20:00Z"
    }
  ]
  ```

#### `POST /api/keys`
- **Description**: Creates a new active API Key.
- **Auth Required**: Yes (Admin JWT)
- **Request Body**:
  ```json
  {
    "name": "development-test-suite"
  }
  ```
- **Response Schema (`201 Created`)**:
  ```json
  {
    "id": "uuid-string",
    "name": "development-test-suite",
    "key_prefix": "gl_live_xyz",
    "key": "gl_live_xyz********************9aBc",
    "is_active": true
  }
  ```

---

### 3. Auditing & Threat Logs Export

#### `GET /api/audit/export`
- **Description**: Streams the full history of audit logs filtered by options as a CSV download.
- **Auth Required**: Yes (Admin JWT)
- **Query Parameters**:
  - `api_key_id` (optional): Filter logs to specific key uuid.
  - `from_date` (optional): ISO date range start.
  - `to_date` (optional): ISO date range end.
  - `was_blocked` (optional): Boolean filter (`true` or `false`).
- **Response Format**: `text/csv` stream attachment.

#### `GET /api/threats/export`
- **Description**: Streams security threat occurrences logs filtered by query parameters as a CSV download.
- **Auth Required**: Yes (Admin JWT)
- **Response Format**: `text/csv` stream attachment.

---

### 4. LLM Completions Gateway

#### `POST /v1/chat/completions`
- **Description**: Proxies request completions through safety guardrails.
- **Auth Required**: Yes (Client API Key)
- **Request Body** (OpenAI Schema):
  ```json
  {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "Summarize the document."
      }
    ],
    "temperature": 0.7
  }
  ```
- **Response Schema (`200 OK`)**: Standard OpenAI structure or `400 Bad Request` if blocked by safety thresholds.

---

## Error Codes and Meanings

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED_MISSING_TOKEN` | Bearer token is missing from the request header. |
| `401` | `UNAUTHORIZED_INVALID_TOKEN` | The JWT signature is invalid or has expired. |
| `401` | `UNAUTHORIZED_INVALID_KEY` | Client API key is not registered in the system. |
| `403` | `FORBIDDEN_ADMIN_EXISTS` | Blocked attempt to call `/auth/register` when admin already exists. |
| `429` | `TOO_MANY_REQUESTS` | API key rate limits exceeded. |
