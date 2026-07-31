document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorMsg.textContent = data.error || 'Terjadi kesalahan';
      return;
    }
    window.location.href = '/chat.html';
  } catch (err) {
    errorMsg.textContent = 'Tidak bisa terhubung ke server';
  }
});
