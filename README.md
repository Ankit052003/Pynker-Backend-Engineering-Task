# Pynker Backend Engineering Task

REST API for user authentication and following users, built with Node.js, Express, SQLite, and JWT.

## Requirements

- Node.js 18 or newer
- npm

## Setup

```bash
npm install
cp .env.example .env
npm start
```

On Windows PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd start
```

Set a strong `JWT_SECRET` in `.env` before sharing or deploying the app.

## Verify The Assignment

Run the smoke test:

```bash
npm test
```

On Windows PowerShell:

```powershell
npm.cmd test
```

Expected output:

```text
Smoke test passed.
```

If `npm start` says port `3000` is already in use, stop the other terminal running the server with `Ctrl+C` or change `PORT` in `.env`.

The smoke test verifies the required flow:

- register returns a JWT and user
- login returns a JWT
- authenticated follow succeeds
- following yourself fails
- following twice fails
- followers can be listed without auth
- authenticated unfollow succeeds

## API Endpoints

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

### Follow User

```http
POST /api/users/:id/follow
Authorization: Bearer <jwt>
```

### Unfollow User

```http
DELETE /api/users/:id/follow
Authorization: Bearer <jwt>
```

### List Followers

```http
GET /api/users/:id/followers
```

No authentication is required for this endpoint.

## Environment Variables

```env
PORT=3000
DATABASE_PATH=./data/pynker.sqlite
JWT_SECRET=replace-this-with-a-long-random-secret
```
# Author
## Ankit Kumar