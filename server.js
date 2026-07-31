const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'ganti-secret-ini-di-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 hari
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
// bagikan session yang sama ke socket.io (butuh socket.io >= 4.6)
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Middleware auth untuk halaman yang butuh login ----------
function requireLogin(req, res, next) {
  if (req.session && req.session.username) return next();
  return res.redirect('/login.html');
}

app.get('/chat.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ---------- API: registrasi ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username minimal 3 karakter' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  }
  if (db.findUser(username)) {
    return res.status(400).json({ error: 'Username sudah dipakai' });
  }
  const hash = await bcrypt.hash(password, 10);
  db.addUser({ username, password: hash, createdAt: Date.now() });
  req.session.username = username;
  res.json({ ok: true });
});

// ---------- API: login ----------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.findUser(username || '');
  if (!user) return res.status(400).json({ error: 'Username tidak ditemukan' });
  const match = await bcrypt.compare(password || '', user.password);
  if (!match) return res.status(400).json({ error: 'Password salah' });
  req.session.username = user.username;
  res.json({ ok: true });
});

// ---------- API: siapa saya ----------
app.get('/api/me', (req, res) => {
  if (req.session && req.session.username) {
    return res.json({ username: req.session.username });
  }
  res.status(401).json({ error: 'Belum login' });
});

// ---------- API: logout ----------
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------- Socket.io: chat real-time ----------
const onlineUsers = new Map(); // username -> socket.id

io.on('connection', (socket) => {
  const session = socket.request.session;
  const username = session && session.username;

  if (!username) {
    socket.disconnect();
    return;
  }

  onlineUsers.set(username, socket.id);
  io.emit('online-list', Array.from(onlineUsers.keys()));

  // kirim riwayat chat ke user yang baru connect
  socket.emit('history', db.getMessages(100));

  socket.broadcast.emit('system-message', `${username} bergabung ke chat`);

  socket.on('chat-message', (text) => {
    if (typeof text !== 'string' || !text.trim()) return;
    const msg = {
      username,
      text: text.trim().slice(0, 2000),
      time: Date.now()
    };
    db.addMessage(msg);
    io.emit('chat-message', msg);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(username);
    io.emit('online-list', Array.from(onlineUsers.keys()));
    io.emit('system-message', `${username} keluar dari chat`);
  });
});

server.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
