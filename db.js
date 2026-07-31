const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], messages: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readDB().users;
}

function findUser(username) {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

function addUser(user) {
  const db = readDB();
  db.users.push(user);
  writeDB(db);
}

function getMessages(limit = 100) {
  const db = readDB();
  return db.messages.slice(-limit);
}

function addMessage(msg) {
  const db = readDB();
  db.messages.push(msg);
  // keep max 500 messages so file doesn't grow forever
  if (db.messages.length > 500) db.messages = db.messages.slice(-500);
  writeDB(db);
}

module.exports = { getUsers, findUser, addUser, getMessages, addMessage };
