# Pynker Backend Engineering Task

A small REST API for user authentication and a follow system, built for the Pynker backend engineering assignment.

## Tech Stack

- Node.js
- Express
- SQLite
- JWT authentication
- bcrypt password hashing

## Assignment Coverage

| Requirement | Status |
| --- | --- |
| `POST /api/auth/register` creates a user | Complete |
| Passwords are hashed before storage | Complete |
| Register returns a JWT | Complete |
| `POST /api/auth/login` validates credentials | Complete |
| Login returns a JWT on success | Complete |
| `POST /api/users/:id/follow` requires auth | Complete |
| Self-follow is rejected | Complete |
| Duplicate follow is rejected | Complete |
| `DELETE /api/users/:id/follow` unfollows a user | Complete |
| `GET /api/users/:id/followers` is public | Complete |

## Project Structure

```text
src/
  app.js          Express app, routes, validation, auth middleware
  config.js       Environment variable parsing
  database.js     SQLite connection and schema setup
  server.js       Server startup and shutdown handling
scripts/
  smoke-test.js   End-to-end API verification
```

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

Windows PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd start
```

Before production use, replace `JWT_SECRET` in `.env` with a strong secret.

## Verify The Submission

Run the smoke test:

```bash
npm test
```

Windows PowerShell:

```powershell
npm.cmd test
```

Expected output:

```text
Smoke test passed.
```

The smoke test covers registration, login, authenticated follow, duplicate follow rejection, self-follow rejection, public follower listing, and authenticated unfollow.

## API Reference

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

Response includes:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2026-06-25 00:00:00"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

Response includes a JWT and public user object.

### Follow User

```http
POST /api/users/:id/follow
Authorization: Bearer <jwt>
```

Successful response:

```json
{
  "message": "User followed.",
  "followedUser": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "2026-06-25 00:00:00"
  }
}
```

Handled errors include missing token, invalid token, missing target user, self-follow, and duplicate follow.

### Unfollow User

```http
DELETE /api/users/:id/follow
Authorization: Bearer <jwt>
```

Successful response:

```json
{
  "message": "User unfollowed.",
  "followedUser": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "2026-06-25 00:00:00"
  }
}
```

### List Followers

```http
GET /api/users/:id/followers
```

No authentication is required.

Successful response:

```json
{
  "user": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "2026-06-25 00:00:00"
  },
  "followers": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "2026-06-25 00:00:00"
    }
  ]
}
```

## Environment Variables

```env
PORT=3000
DATABASE_PATH=./data/pynker.sqlite
JWT_SECRET=replace-this-with-a-long-random-secret
```

## Troubleshooting

If `npm start` reports that port `3000` is already in use, stop the other server terminal with `Ctrl+C` or set a different `PORT` in `.env`.

If PowerShell blocks `npm`, use `npm.cmd` as shown in the Windows commands above.

## Author

Ankit Kumar
