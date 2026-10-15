const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹ ' + Number(n || 0).toLocaleString('en-IN');
const thumb = u => (u && u.includes('/upload/') ? u.replace('/upload/', '/upload/f_auto,q_auto,w_200,h_150,c_fill/') : u || '');
let tt;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); };

async function api(path, o = {}) {
  const init = { method: o.method || 'GET', headers: {} };
  if (o.json) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(o.json); } else if (o.form) init.body = o.form;
  const r = await fetch('/api/admin' + path, init);
  if (r.status === 401) { location.href = '/admin/login.html'; throw new Error('Not signed in'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

let list = [], cats = [];
async function loadCats() {
  cats = (await api('/categories')).items;
  const opt = c => `<option value="${esc(c._id)}">${esc(c.name)}</option>`;
  const keep = $('#fc').value;
  $('#fc').innerHTML = '<option value="">All categories</option><option value="none">No category</option>' + cats.map(opt).join('');
  $('#fc').value = [...$('#fc').options].some(o => o.value === keep) ? keep : '';
  $('#cat').innerHTML = '<option value="">No category</option>' + cats.map(opt).join('');
}
async function load() {
  try { list = (await api('/paintings?q=' + encodeURIComponent($('#sq').value))).items; draw(); }
  catch (e) { $('#list').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function draw() {
  const all = list, fc = $('#fc').value;
  const shown = fc === 'none' ? all.filter(p => !p.category) : fc ? all.filter(p => p.category && p.category._id === fc) : all;
  const sold = all.filter(p => p.status === 'sold').length;
  $('#sum').textContent = `${all.length} painting${all.length === 1 ? '' : 's'} · ${all.length - sold} available · ${sold} sold`;
  const el = $('#list');
  if (!shown.length) { el.innerHTML = all.length ? '<div class="empty">No paintings in this category yet.</div>' : '<div class="empty">No paintings yet. Click "Add painting" to upload your first one.</div>'; return; }
  el.innerHTML = `<div class="wrap-t"><table class="tbl"><thead><tr><th></th><th>Title</th><th>Category</th><th>Size / medium</th><th>Price</th><th>Status</th><th>Featured</th><th></th></tr></thead><tbody>${shown.map(p => `<tr>
   <td>${p.images[0] ? `<img src="${esc(thumb(p.images[0].url))}" alt="">` : '<img alt="">'}</td>
   <td><b>${esc(p.title)}</b><div class="mu">${p.images.length} image${p.images.length === 1 ? '' : 's'}</div></td>
   <td>${p.category ? esc(p.category.name) : '<span class="mu">None</span>'}</td><td class="mu">${esc(p.size)}<br>${esc(p.medium)}</td><td>${money(p.price)}</td>
   <td><select data-st="${p._id}" aria-label="Status"><option value="available"${p.status === 'available' ? ' selected' : ''}>Available</option><option value="sold"${p.status === 'sold' ? ' selected' : ''}>Sold</option></select></td>
   <td><input type="checkbox" data-ft="${p._id}" ${p.featured ? 'checked' : ''} aria-label="Featured"></td>
   <td><div class="act"><button class="btn ghost sm" data-edit="${p._id}">Edit</button><button class="btn danger sm" data-del="${p._id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit]', el).forEach(b => b.onclick = () => openForm(list.find(p => p._id === b.dataset.edit)));
  $$('[data-st]', el).forEach(s => s.onchange = () => quick(s.dataset.st, { status: s.value }));
  $$('[data-ft]', el).forEach(c => c.onchange = () => quick(c.dataset.ft, { featured: c.checked }));
  $$('[data-del]', el).forEach(b => b.onclick = async () => {
    const p = list.find(x => x._id === b.dataset.del);
    if (!confirm(`Delete "${p.title}" and its images? This cannot be undone.`)) return;
    try { await api('/paintings/' + p._id, { method: 'DELETE' }); toast('Painting deleted'); load(); } catch (e) { toast(e.message); }
  });
}
async function quick(id, json) {
  try { await api('/paintings/' + id, { method: 'PUT', json }); toast('Saved'); await load(); } catch (e) { toast(e.message); load(); }
}

/* add / edit form */
const pd = $('#pd'); let editing = null;
$('#pc').onclick = () => pd.close();
$('#add').onclick = () => openForm();
let t; $('#sq').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); };
function openForm(p) {
  editing = p || null; $('#perr').textContent = ''; $('#pf').reset(); $('#prev').innerHTML = '';
  $('#pt').textContent = p ? 'Edit painting' : 'Add painting';
  $('#t').value = p?.title || ''; $('#pr').value = p?.price ?? ''; $('#sz').value = p?.size || ''; $('#md').value = p?.medium || '';
  $('#cat').value = p?.category?._id || ''; $('#st').value = p?.status || 'available'; $('#ft').checked = !!p?.featured; $('#ds').value = p?.description || '';
  $('#cur').innerHTML = (p?.images || []).map(i => `<figure><img src="${esc(thumb(i.url))}" alt=""><label><input type="checkbox" value="${esc(i.publicId)}"> Remove</label></figure>`).join('');
  pd.showModal();
}
$('#im').onchange = e => {
  $('#prev').innerHTML = '';
  [...e.target.files].forEach(f => { const i = document.createElement('img'); i.src = URL.createObjectURL(f); i.alt = ''; i.style.cssText = 'width:96px;height:72px;object-fit:cover;border-radius:8px'; $('#prev').append(i); });
};
$('#pf').onsubmit = async e => {
  e.preventDefault(); $('#perr').textContent = ''; const btn = $('#ps'); btn.disabled = true; btn.textContent = 'Saving...';
  const fd = new FormData();
  Object.entries({ title: $('#t').value, price: $('#pr').value, size: $('#sz').value, medium: $('#md').value, category: $('#cat').value, status: $('#st').value, featured: $('#ft').checked, description: $('#ds').value }).forEach(([k, v]) => fd.append(k, v));
  fd.append('removeImages', JSON.stringify($$('#cur input:checked').map(c => c.value)));
  [...$('#im').files].forEach(f => fd.append('images', f));
  try {
    await api(editing ? '/paintings/' + editing._id : '/paintings', { method: editing ? 'PUT' : 'POST', form: fd });
    pd.close(); toast(editing ? 'Painting updated' : 'Painting added'); load();
  } catch (ex) { $('#perr').textContent = ex.message; }
  btn.disabled = false; btn.textContent = 'Save painting';
};
$('#fc').onchange = draw;
$('#out').onclick = async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/admin/login.html'; };
/* category manager */
const cd = $('#cd');
function drawCats() {
  $('#clist').innerHTML = cats.length ? cats.map(c => `<div class="crow"><input value="${esc(c.name)}" maxlength="40" data-n="${esc(c._id)}" aria-label="Category name"><span class="mu">${c.count} painting${c.count === 1 ? '' : 's'}</span><button class="btn ghost sm" data-save="${esc(c._id)}">Save</button><button class="btn danger sm" data-cdel="${esc(c._id)}">Delete</button></div>`).join('') : '<p class="mu">No categories yet. Add your first one below.</p>';
  $$('[data-save]', cd).forEach(b => b.onclick = async () => {
    try { await api('/categories/' + b.dataset.save, { method: 'PUT', json: { name: $(`[data-n="${b.dataset.save}"]`).value } }); toast('Category renamed'); await refresh(); } catch (e) { $('#cerr').textContent = e.message; }
  });
  $$('[data-cdel]', cd).forEach(b => b.onclick = async () => {
    const c = cats.find(x => x._id === b.dataset.cdel);
    if (!confirm(`Delete the category "${c.name}"? Its ${c.count} painting(s) will stay, but become uncategorised.`)) return;
    try { await api('/categories/' + c._id, { method: 'DELETE' }); toast('Category deleted'); await refresh(); } catch (e) { $('#cerr').textContent = e.message; }
  });
}
async function refresh() { $('#cerr').textContent = ''; await loadCats(); drawCats(); await load(); }
$('#mc').onclick = () => { $('#cerr').textContent = ''; drawCats(); cd.showModal(); };
$('#cclose').onclick = () => cd.close();
$('#cform').onsubmit = async e => {
  e.preventDefault(); $('#cerr').textContent = '';
  try { await api('/categories', { method: 'POST', json: { name: $('#cn').value } }); $('#cn').value = ''; toast('Category added'); await refresh(); }
  catch (ex) { $('#cerr').textContent = ex.message; }
};
loadCats().then(load);
