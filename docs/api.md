# 📡 API Documentation

**Base URL:** `https://tasks-management-application.onrender.com`

All request/response bodies are JSON. Auth routes set/read HttpOnly cookies.  
Task routes require a valid `accessToken` cookie (set automatically on login).

---

## Authentication

### Register

```
POST /api/auth/register
```

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, valid email |
| `password` | string | required, min 8 chars |

**Responses**

| Status | Body |
|---|---|
| `201 Created` | `{"message":"User registered successfully","user":{"id":"uuid","email":"user@example.com"}}` |
| `400 Bad Request` | `{"error":{"message":"Email and password are required","code":"MISSING_FIELDS"}}` |
| `409 Conflict` | `{"error":{"message":"Email already registered","code":"EMAIL_TAKEN"}}` |

---

### Login

```
POST /api/auth/login
```

Sets `accessToken` (15 min) and `refreshToken` (7 days) as HttpOnly cookies.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Responses**

| Status | Body |
|---|---|
| `200 OK` | `{"message":"Login successful","user":{"id":"uuid","email":"user@example.com"}}` |
| `401 Unauthorized` | `{"error":{"message":"Invalid credentials","code":"INVALID_CREDENTIALS"}}` |

---

### Get Current User

```
GET /api/auth/me
```

Requires valid `accessToken` cookie.

**Responses**

| Status | Body |
|---|---|
| `200 OK` | `{"user":{"id":"uuid","email":"user@example.com"}}` |
| `401 Unauthorized` | `{"error":{"message":"Unauthorized","code":"UNAUTHORIZED"}}` |

---

### Refresh Tokens

```
POST /api/auth/refresh
```

Rotates both tokens. Old refresh token is immediately revoked.

**Responses**

| Status | Body |
|---|---|
| `200 OK` | `{"message":"Tokens refreshed"}` |
| `401 Unauthorized` | `{"error":{"message":"Invalid or expired refresh token","code":"INVALID_REFRESH_TOKEN"}}` |

---

### Logout

```
POST /api/auth/logout
```

Revokes refresh token and clears both cookies.

**Responses**

| Status | Body |
|---|---|
| `200 OK` | `{"message":"Logged out"}` |

---

## Tasks

All task endpoints require a valid `accessToken` cookie. Users can only access their own tasks.

---

### List Tasks

```
GET /api/tasks
```

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (min 1) |
| `limit` | integer | `20` | Items per page (min 1, max 100) |
| `status` | string | — | Filter by status: `todo`, `in_progress`, `done` |
| `search` | string | — | Case-insensitive title search (`ILIKE`) |

**Example Request**

```
GET /api/tasks?status=todo&search=bug&page=1&limit=10
```

**Response `200`**

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Fix login bug",
      "description": "Check token expiry logic",
      "status": "todo",
      "created_at": "2026-02-25T10:00:00.000Z",
      "updated_at": "2026-02-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### Create Task

```
POST /api/tasks
```

**Request Body**

```json
{
  "title": "Fix login bug",
  "description": "Check token expiry logic",
  "status": "todo"
}
```

| Field | Type | Rules |
|---|---|---|
| `title` | string | required |
| `description` | string | optional — encrypted at rest (AES-256-GCM) |
| `status` | string | required — one of `todo`, `in_progress`, `done` |

**Responses**

| Status | Body |
|---|---|
| `201 Created` | Task object (see shape above) |
| `400 Bad Request` | `{"error":{"message":"Invalid status","code":"INVALID_STATUS"}}` |
| `401 Unauthorized` | `{"error":{"message":"Unauthorized","code":"UNAUTHORIZED"}}` |

---

### Get Task

```
GET /api/tasks/:id
```

**Responses**

| Status | Body |
|---|---|
| `200 OK` | Task object |
| `404 Not Found` | `{"error":{"message":"Task not found","code":"NOT_FOUND"}}` |

---

### Update Task

```
PUT /api/tasks/:id
```

**Request Body** — all fields optional

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress"
}
```

**Responses**

| Status | Body |
|---|---|
| `200 OK` | Updated task object |
| `400 Bad Request` | `{"error":{"message":"Invalid status","code":"INVALID_STATUS"}}` |
| `404 Not Found` | `{"error":{"message":"Task not found","code":"NOT_FOUND"}}` |

---

### Delete Task

```
DELETE /api/tasks/:id
```

**Responses**

| Status | Body |
|---|---|
| `200 OK` | `{"message":"Task deleted"}` |
| `404 Not Found` | `{"error":{"message":"Task not found","code":"NOT_FOUND"}}` |

---

## Health Check

```
GET /health
```

**Response `200`** — `OK`

Used by UptimeRobot to keep the Render free instance warm.

---

## Error Format

All errors use a consistent structure:

```json
{
  "error": {
    "message": "Human-readable description",
    "code": "MACHINE_READABLE_CODE"
  }
}
```

### Error Codes Reference

| Code | HTTP Status | Description |
|---|---|---|
| `MISSING_FIELDS` | 400 | Required fields not provided |
| `INVALID_STATUS` | 400 | Status not one of `todo`, `in_progress`, `done` |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token missing, expired, or revoked |
| `NOT_FOUND` | 404 | Resource not found or not owned by user |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
