const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../src/app');
const { initializeDatabase, openDatabase } = require('../src/database');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(function handleClose(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function requestJson(baseUrl, method, pathname, body, token) {
  const headers = {
    'content-type': 'application/json'
  };

  if (typeof token === 'string') {
    headers.authorization = `Bearer ${token}`;
  }

  const options = {
    headers,
    method
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;

  return {
    payload,
    status: response.status
  };
}

async function main() {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pynker-api-'));
  const databasePath = path.join(tempDirectory, 'test.sqlite');
  const database = openDatabase(databasePath);
  const config = {
    jwtSecret: 'smoke-test-secret'
  };
  let server = null;

  try {
    await initializeDatabase(database);

    const app = createApp(database, config);
    server = app.listen(0);
    await listen(server);

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const aliceRegister = await requestJson(
      baseUrl,
      'POST',
      '/api/auth/register',
      {
        email: 'alice@example.com',
        name: 'Alice',
        password: 'password123'
      },
      null
    );
    assert.equal(aliceRegister.status, 201);
    assert.equal(typeof aliceRegister.payload.token, 'string');
    assert.equal(aliceRegister.payload.user.email, 'alice@example.com');

    const bobRegister = await requestJson(
      baseUrl,
      'POST',
      '/api/auth/register',
      {
        email: 'bob@example.com',
        name: 'Bob',
        password: 'password123'
      },
      null
    );
    assert.equal(bobRegister.status, 201);

    const aliceLogin = await requestJson(
      baseUrl,
      'POST',
      '/api/auth/login',
      {
        email: 'alice@example.com',
        password: 'password123'
      },
      null
    );
    assert.equal(aliceLogin.status, 200);

    const aliceToken = aliceLogin.payload.token;
    const bobUserId = bobRegister.payload.user.id;
    const aliceUserId = aliceRegister.payload.user.id;

    const followBob = await requestJson(
      baseUrl,
      'POST',
      `/api/users/${bobUserId}/follow`,
      null,
      aliceToken
    );
    assert.equal(followBob.status, 201);

    const followBobAgain = await requestJson(
      baseUrl,
      'POST',
      `/api/users/${bobUserId}/follow`,
      null,
      aliceToken
    );
    assert.equal(followBobAgain.status, 409);

    const followSelf = await requestJson(
      baseUrl,
      'POST',
      `/api/users/${aliceUserId}/follow`,
      null,
      aliceToken
    );
    assert.equal(followSelf.status, 400);

    const bobFollowers = await requestJson(
      baseUrl,
      'GET',
      `/api/users/${bobUserId}/followers`,
      null,
      null
    );
    assert.equal(bobFollowers.status, 200);
    assert.equal(bobFollowers.payload.followers.length, 1);
    assert.equal(bobFollowers.payload.followers[0].id, aliceUserId);

    const unfollowBob = await requestJson(
      baseUrl,
      'DELETE',
      `/api/users/${bobUserId}/follow`,
      null,
      aliceToken
    );
    assert.equal(unfollowBob.status, 200);

    const bobFollowersAfterUnfollow = await requestJson(
      baseUrl,
      'GET',
      `/api/users/${bobUserId}/followers`,
      null,
      null
    );
    assert.equal(bobFollowersAfterUnfollow.status, 200);
    assert.equal(bobFollowersAfterUnfollow.payload.followers.length, 0);

    console.log('Smoke test passed.');
  } finally {
    if (server !== null) {
      await close(server);
    }

    await database.close();
    fs.rmSync(tempDirectory, { force: true, recursive: true });
  }
}

main().catch(function handleError(error) {
  console.error({
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

