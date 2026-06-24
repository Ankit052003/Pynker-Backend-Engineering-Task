require('dotenv').config();

const { createApp } = require('./app');
const { readConfig } = require('./config');
const { initializeDatabase, openDatabase } = require('./database');

async function closeServer(server) {
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

async function listenServer(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once('listening', function handleListening() {
      resolve(server);
    });

    server.once('error', function handleError(error) {
      reject(error);
    });
  });
}

function formatStartupError(error) {
  if (error.code === 'EADDRINUSE') {
    return `Port ${error.port} is already in use. Stop the process using that port or set a different PORT in .env.`;
  }

  return error.message;
}

async function main() {
  const config = readConfig();
  const database = openDatabase(config.databasePath);

  await initializeDatabase(database);

  const app = createApp(database, config);
  const server = await listenServer(app, config.port);

  console.log({
    databasePath: config.databasePath,
    message: 'Pynker API server is running.',
    port: config.port
  });

  async function shutdown(signal) {
    console.log({
      message: 'Shutting down Pynker API server.',
      signal
    });

    await closeServer(server);
    await database.close();
  }

  process.on('SIGINT', function handleSigint() {
    shutdown('SIGINT')
      .then(function exitCleanly() {
        process.exit(0);
      })
      .catch(function exitWithError(error) {
        console.error({
          message: error.message,
          stack: error.stack
        });
        process.exit(1);
      });
  });

  process.on('SIGTERM', function handleSigterm() {
    shutdown('SIGTERM')
      .then(function exitCleanly() {
        process.exit(0);
      })
      .catch(function exitWithError(error) {
        console.error({
          message: error.message,
          stack: error.stack
        });
        process.exit(1);
      });
  });
}

main().catch(function handleStartupError(error) {
  console.error({
    message: formatStartupError(error),
    stack: error.stack
  });
  process.exit(1);
});
