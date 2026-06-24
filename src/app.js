const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = '7d';

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asyncHandler(handler) {
  return function handleAsyncRoute(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requireObjectBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw createHttpError(400, 'Request body must be a JSON object.');
  }
}

function readRequiredString(body, fieldName) {
  const value = body[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function readPassword(body) {
  const password = body.password;

  if (typeof password !== 'string' || password.trim().length < 8) {
    throw createHttpError(400, 'password must be at least 8 characters.');
  }

  return password;
}

function normalizeEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw createHttpError(400, 'email must be valid.');
  }

  return normalizedEmail;
}

function parseUserId(rawUserId) {
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId < 1) {
    throw createHttpError(400, 'User id must be a positive integer.');
  }

  return userId;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, PASSWORD_SALT_ROUNDS, function handleHash(error, hash) {
      if (error) {
        reject(error);
        return;
      }

      resolve(hash);
    });
  });
}

function comparePassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, function handleCompare(error, matches) {
      if (error) {
        reject(error);
        return;
      }

      resolve(matches);
    });
  });
}

function toPublicUser(row) {
  return {
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    name: row.name
  };
}

function signToken(userId, jwtSecret) {
  return jwt.sign({ sub: String(userId) }, jwtSecret, {
    expiresIn: TOKEN_EXPIRES_IN
  });
}

function readBearerToken(request) {
  const authorizationHeader = request.get('authorization');

  if (typeof authorizationHeader !== 'string') {
    throw createHttpError(401, 'Authorization bearer token is required.');
  }

  const parts = authorizationHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || parts[1].trim().length === 0) {
    throw createHttpError(401, 'Authorization bearer token is required.');
  }

  return parts[1];
}

function verifyAuthToken(token, jwtSecret) {
  try {
    const payload = jwt.verify(token, jwtSecret);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId < 1) {
      throw createHttpError(401, 'Invalid or expired token.');
    }

    return userId;
  } catch (error) {
    throw createHttpError(401, 'Invalid or expired token.');
  }
}

async function findPublicUserById(database, userId) {
  const row = await database.get(
    `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
    `,
    [userId]
  );

  if (typeof row === 'undefined') {
    return null;
  }

  return toPublicUser(row);
}

async function ensureUserExists(database, userId) {
  const user = await findPublicUserById(database, userId);

  if (user === null) {
    throw createHttpError(404, 'User not found.');
  }

  return user;
}

function createAuthenticateMiddleware(database, jwtSecret) {
  return asyncHandler(async function authenticate(request, response, next) {
    const token = readBearerToken(request);
    const userId = verifyAuthToken(token, jwtSecret);
    const user = await findPublicUserById(database, userId);

    if (user === null) {
      throw createHttpError(401, 'Authenticated user no longer exists.');
    }

    request.auth = {
      user,
      userId
    };

    next();
  });
}

function createApp(database, config) {
  const app = express();
  const authenticate = createAuthenticateMiddleware(database, config.jwtSecret);

  app.use(express.json({ limit: '64kb' }));

  app.post('/api/auth/register', asyncHandler(async function register(request, response) {
    requireObjectBody(request.body);

    const name = readRequiredString(request.body, 'name');
    const email = normalizeEmail(readRequiredString(request.body, 'email'));
    const password = readPassword(request.body);

    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (typeof existingUser !== 'undefined') {
      throw createHttpError(409, 'A user with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const insertResult = await database.run(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES (?, ?, ?)
      `,
      [name, email, passwordHash]
    );
    const user = await ensureUserExists(database, insertResult.lastID);
    const token = signToken(user.id, config.jwtSecret);

    response.status(201).json({
      token,
      user
    });
  }));

  app.post('/api/auth/login', asyncHandler(async function login(request, response) {
    requireObjectBody(request.body);

    const email = normalizeEmail(readRequiredString(request.body, 'email'));
    const password = readPassword(request.body);

    const user = await database.get(
      `
        SELECT id, name, email, password_hash, created_at
        FROM users
        WHERE email = ?
      `,
      [email]
    );

    if (typeof user === 'undefined') {
      throw createHttpError(401, 'Invalid email or password.');
    }

    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      throw createHttpError(401, 'Invalid email or password.');
    }

    response.json({
      token: signToken(user.id, config.jwtSecret),
      user: toPublicUser(user)
    });
  }));

  app.post('/api/users/:id/follow', authenticate, asyncHandler(async function followUser(request, response) {
    const followerId = request.auth.userId;
    const followingId = parseUserId(request.params.id);

    if (followerId === followingId) {
      throw createHttpError(400, 'You cannot follow yourself.');
    }

    const followingUser = await ensureUserExists(database, followingId);
    const existingFollow = await database.get(
      `
        SELECT follower_id
        FROM follows
        WHERE follower_id = ? AND following_id = ?
      `,
      [followerId, followingId]
    );

    if (typeof existingFollow !== 'undefined') {
      throw createHttpError(409, 'You already follow this user.');
    }

    await database.run(
      `
        INSERT INTO follows (follower_id, following_id)
        VALUES (?, ?)
      `,
      [followerId, followingId]
    );

    response.status(201).json({
      followedUser: followingUser,
      message: 'User followed.'
    });
  }));

  app.delete('/api/users/:id/follow', authenticate, asyncHandler(async function unfollowUser(request, response) {
    const followerId = request.auth.userId;
    const followingId = parseUserId(request.params.id);

    if (followerId === followingId) {
      throw createHttpError(400, 'You cannot unfollow yourself.');
    }

    const followingUser = await ensureUserExists(database, followingId);
    const deleteResult = await database.run(
      `
        DELETE FROM follows
        WHERE follower_id = ? AND following_id = ?
      `,
      [followerId, followingId]
    );

    if (deleteResult.changes === 0) {
      throw createHttpError(404, 'You do not follow this user.');
    }

    response.json({
      followedUser: followingUser,
      message: 'User unfollowed.'
    });
  }));

  app.get('/api/users/:id/followers', asyncHandler(async function listFollowers(request, response) {
    const userId = parseUserId(request.params.id);
    const user = await ensureUserExists(database, userId);
    const followers = await database.all(
      `
        SELECT users.id, users.name, users.email, users.created_at
        FROM follows
        INNER JOIN users ON users.id = follows.follower_id
        WHERE follows.following_id = ?
        ORDER BY follows.created_at DESC, users.id DESC
      `,
      [userId]
    );

    response.json({
      followers: followers.map(toPublicUser),
      user
    });
  }));

  app.use(function handleNotFound(request, response) {
    response.status(404).json({
      error: 'Route not found.'
    });
  });

  app.use(function handleError(error, request, response, next) {
    if (error.type === 'entity.parse.failed') {
      response.status(400).json({
        error: 'Request body must be valid JSON.'
      });
      return;
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

    if (statusCode >= 500) {
      console.error({
        message: error.message,
        stack: error.stack
      });
    }

    response.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal server error.' : error.message
    });
  });

  return app;
}

module.exports = {
  createApp
};

