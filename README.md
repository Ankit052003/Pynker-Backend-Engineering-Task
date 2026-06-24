# Pynker Backend Engineering Task

REST API for user authentication and a follow system, completed for the Pynker backend engineering assignment.

## Reviewer Quick Check

```bash
npm install
cp .env.example .env
npm test
```

Windows PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd test
```

Expected result:

```text
Smoke test passed.
```

The smoke test runs the complete assignment flow: user registration, login, authenticated follow, duplicate follow rejection, self-follow rejection, public followers listing, and authenticated unfollow.

## Tech Stack

- Node.js
- Express
- SQLite
- JWT
- bcrypt password hashing

## Endpoint Summary

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Create a user, hash password, return JWT |
| `POST` | `/api/auth/login` | No | Validate credentials and return JWT |
| `POST` | `/api/users/:id/follow` | Yes | Follow another user |
| `DELETE` | `/api/users/:id/follow` | Yes | Unfollow another user |
| `GET` | `/api/users/:id/followers` | No | List followers for a user |

## Assignment Coverage

| Requirement | Implementation |
| --- | --- |
| Register with `name`, `email`, and `password` | Implemented in `POST /api/auth/register` |
| Hash passwords | Uses `bcryptjs` with 12 salt rounds |
| Return JWT after register/login | JWT is signed with user id in `sub` |
| Clear login error on invalid credentials | Returns `401` with `Invalid email or password.` |
| Follow requires authentication | Uses `Authorization: Bearer <jwt>` |
| Reject self-follow | Returns `400` |
| Reject duplicate follow | Returns `409` |
| Unfollow user | Implemented in `DELETE /api/users/:id/follow` |
| Followers list is public | `GET /api/users/:id/followers` requires no token |

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

## Setup

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

Before running outside local development, replace `JWT_SECRET` in `.env` with a strong private value.

## Environment Variables

```env
PORT=3000
DATABASE_PATH=./data/pynker.sqlite
JWT_SECRET=replace-this-with-a-long-random-secret
```

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

Success: `201 Created`

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "<timestamp>"
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

Success: `200 OK`

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "<timestamp>"
  }
}
```

### Follow User

```http
POST /api/users/:id/follow
Authorization: Bearer <jwt>
```

Success: `201 Created`

```json
{
  "message": "User followed.",
  "followedUser": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "<timestamp>"
  }
}
```

Expected edge cases:

- Missing or invalid token: `401`
- Following yourself: `400`
- Following a missing user: `404`
- Following the same user twice: `409`

### Unfollow User

```http
DELETE /api/users/:id/follow
Authorization: Bearer <jwt>
```

Success: `200 OK`

```json
{
  "message": "User unfollowed.",
  "followedUser": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "<timestamp>"
  }
}
```

### List Followers

```http
GET /api/users/:id/followers
```

No authentication is required.

Success: `200 OK`

```json
{
  "user": {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "createdAt": "<timestamp>"
  },
  "followers": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "<timestamp>"
    }
  ]
}
```

## Implementation Notes

- SQLite schema is created automatically on startup.
- `users.email` is unique and compared case-insensitively.
- `follows` uses a composite primary key to prevent duplicate relationships.
- Foreign keys and cascade deletes are enabled.
- Password hashes are never returned in API responses.
- `.env`, the SQLite data directory, `node_modules`, and the assignment PDF are ignored by Git.

## Troubleshooting

If `npm start` reports that port `3000` is already in use, stop the other server terminal with `Ctrl+C` or set a different `PORT` in `.env`.

If PowerShell blocks `npm`, use `npm.cmd` as shown in the Windows commands above.

## Author

Ankit Kumar
