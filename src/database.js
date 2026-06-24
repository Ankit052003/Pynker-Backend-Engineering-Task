const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

function ensureDatabaseDirectory(databasePath) {
  if (databasePath === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function openDatabase(databasePath) {
  ensureDatabaseDirectory(databasePath);

  const database = new sqlite3.Database(databasePath);

  function run(sql, params) {
    return new Promise((resolve, reject) => {
      database.run(sql, params, function handleResult(error) {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          changes: this.changes,
          lastID: this.lastID
        });
      });
    });
  }

  function get(sql, params) {
    return new Promise((resolve, reject) => {
      database.get(sql, params, function handleResult(error, row) {
        if (error) {
          reject(error);
          return;
        }

        resolve(row);
      });
    });
  }

  function all(sql, params) {
    return new Promise((resolve, reject) => {
      database.all(sql, params, function handleResult(error, rows) {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows);
      });
    });
  }

  function exec(sql) {
    return new Promise((resolve, reject) => {
      database.exec(sql, function handleResult(error) {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  function close() {
    return new Promise((resolve, reject) => {
      database.close(function handleResult(error) {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  return {
    all,
    close,
    exec,
    get,
    run
  };
}

async function initializeDatabase(database) {
  await database.exec('PRAGMA foreign_keys = ON;');

  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id <> following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

module.exports = {
  initializeDatabase,
  openDatabase
};

