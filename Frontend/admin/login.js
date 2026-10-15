const f = document.getElementById('f'), err = document.getElementById('err');
f.onsubmit = async e => {
  e.preventDefault(); err.textContent = ''; e.submitter.disabled = true;
  try {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('e').value, password: document.getElementById('p').value }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not sign in');
    location.href = '/admin/';
  } catch (ex) { err.textContent = ex.message; e.submitter.disabled = false; }
};
