const path = require('node:path');

function readRequiredEnv(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required. Set it in your .env file.`);
  }

  return value.trim();
}

function readPort() {
  const rawPort = readRequiredEnv('PORT');
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function readDatabasePath() {
  const databasePath = readRequiredEnv('DATABASE_PATH');

  if (databasePath === ':memory:') {
    return databasePath;
  }

  return path.resolve(databasePath);
}

function readConfig() {
  return {
    databasePath: readDatabasePath(),
    jwtSecret: readRequiredEnv('JWT_SECRET'),
    port: readPort()
  };
}

module.exports = {
  readConfig
};

