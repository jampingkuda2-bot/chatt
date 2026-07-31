let myUsername = null;

async function init() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) {
      window.location.href = '/login.html';
      return;
    }
    const data = await res.json();
    myUsername = data.username;
    document.getElementById('meLabel').textContent = 'Halo, ' + myUsername;
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  const socket = io();
  const messagesEl = document.getElementById('messages');
  const onlineUl = document.getElementById('onlineUl');

  function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'msg' + (msg.username === myUsername ? ' me' : '');
    const time = new Date(msg.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `<span class="sender">${msg.username} · ${time}</span>${escapeHtml(msg.text)}`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  socket.on('history', (msgs) => {
    msgs.forEach(addMessage);
  });

  socket.on('chat-message', addMessage);
  socket.on('system-message', addSystemMessage);

  socket.on('online-list', (users) => {
    onlineUl.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li');
      li.textContent = u;
      onlineUl.appendChild(li);
    });
  });

  document.getElementById('msgForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    socket.emit('chat-message', text);
    input.value = '';
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
}

init();
