/* Satish gallery: loads paintings from the API, shows them with hover-zoom,
   and sends buyers to the artist's WhatsApp. Include it on any page:
   <script src="js/sg-gallery.js" defer></script>
   If the frontend runs on a different address than the server, add data-api="http://localhost:3000". */
(() => {
  const API = ((document.currentScript && document.currentScript.dataset.api) || '').replace(/\/$/, '');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₹ ' + Number(n).toLocaleString('en-IN');
  const cl = (u, w) => (u && u.includes('/upload/') ? u.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`) : u);
  const get = p => fetch(API + p).then(r => r.ok ? r.json() : Promise.reject(new Error('Request failed')));

  /* 1) Any element with data-whatsapp becomes a link to the artist's WhatsApp */
  const wa = document.querySelectorAll('[data-whatsapp]');
  if (wa.length) get('/api/config').then(c => { if (c.whatsappUrl) wa.forEach(a => { a.href = c.whatsappUrl; a.target = '_blank'; a.rel = 'noopener'; }); }).catch(() => {});

  /* 2) Gallery */
  const root = document.getElementById('sg-gallery');
  if (!root) return;
  const items = new Map();

  // hover magnifier: image scales up around the cursor (CSS handles the scale, this sets the origin)
  function zoomable(box) {
    const img = box.querySelector('img');
    if (!img) return;
    box.addEventListener('mousemove', e => {
      const r = box.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    });
    box.addEventListener('mouseleave', () => { img.style.transformOrigin = ''; });
  }

  const waBtn = (p, cls) => p.status === 'sold'
    ? `<span class="sg-sold-btn">Sold</span>`
    : `<a class="sg-wa ${cls || ''}" href="${esc(p.whatsappUrl || '#')}" target="_blank" rel="noopener">Order on WhatsApp</a>`;

  function card(p) {
    const img = p.images[0];
    return `<article class="sg-card" data-id="${p._id}">
      <button class="sg-img" data-open aria-label="View ${esc(p.title)}">${img ? `<img loading="lazy" src="${esc(cl(img.url, 800))}" alt="${esc(p.title)}">` : ''}${p.status === 'sold' ? '<span class="sg-tag">Sold</span>' : ''}</button>
      <h3 class="sg-title">${esc(p.title)}</h3>
      <p class="sg-meta">${[p.medium, p.size].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p>
      <p class="sg-price">${money(p.price)}</p>
      <div class="sg-actions"><button class="sg-details" data-open>Details</button>${waBtn(p)}</div></article>`;
  }

  // detail pop-up with description and a bigger, zoomable image
  let dlg;
  function open(p) {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'sg-modal';
      dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
      document.body.append(dlg);
    }
    const imgs = p.images;
    dlg.innerHTML = `<button class="sg-close" data-close aria-label="Close">&times;</button>
      <div class="sg-modal-grid"><div><div class="sg-big sg-zoom">${imgs[0] ? `<img src="${esc(cl(imgs[0].url, 1400))}" alt="${esc(p.title)}">` : ''}</div>
        ${imgs.length > 1 ? `<div class="sg-thumbs">${imgs.map((i, k) => `<button data-i="${k}" class="${k ? '' : 'on'}" aria-label="Image ${k + 1}"><img src="${esc(cl(i.url, 200))}" alt=""></button>`).join('')}</div>` : ''}</div>
        <div class="sg-info">${p.category ? `<p class="sg-cat">${esc(p.category.name)}</p>` : ''}<h2>${esc(p.title)}</h2><p class="sg-price">${money(p.price)}</p>
          <p class="sg-meta">${[p.medium, p.size].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p>
          ${p.description ? `<p class="sg-desc">${esc(p.description)}</p>` : ''}${waBtn(p, 'sg-wa-lg')}</div></div>`;
    const big = $('.sg-big', dlg); zoomable(big);
    dlg.querySelectorAll('.sg-thumbs button').forEach(b => b.onclick = () => {
      dlg.querySelectorAll('.sg-thumbs button').forEach(x => x.classList.toggle('on', x === b));
      $('img', big).src = cl(imgs[b.dataset.i].url, 1400);
    });
    big.addEventListener('click', () => big.classList.toggle('sg-zoomed')); // tap to zoom on touch screens
    dlg.showModal();
  }

  /* what to load:  data-featured="1" -> Popular Paintings only (no filters)
                     data-group="1"    -> sections one below the other, one per category
                     (default)         -> filter bar: search + All mediums + All styles + sort order  */
  const featured = !!root.dataset.featured, grouped = !!root.dataset.group;
  const base = new URLSearchParams();
  if (featured) base.set('featured', '1');
  if (root.dataset.available) base.set('available', '1');
  base.set('limit', root.dataset.limit || (featured ? '24' : '100'));
  let cats = [];

  function paint(list) {
    list.forEach(p => items.set(p._id, p));
    if (!list.length) { root.innerHTML = '<p class="sg-empty">No paintings found.</p>'; return; }
    if (grouped) {
      const groups = new Map();
      list.forEach(p => { const k = p.category ? p.category.name : 'Other'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
      const rank = n => { const i = cats.findIndex(c => c.name === n); return i < 0 ? 999 : i; };   // admin's category order, "Other" last
      root.innerHTML = [...groups].sort((a, b) => rank(a[0]) - rank(b[0]))
        .map(([n, ps]) => `<section class="sg-group"><h2 class="sg-group-title">${esc(n)}</h2><div class="sg-grid">${ps.map(card).join('')}</div></section>`).join('');
    } else root.innerHTML = list.map(card).join('');
    root.querySelectorAll('.sg-img').forEach(zoomable);
  }
  const filters = { search: '', medium: '', category: '', sort: 'newest' };
  let seq = 0;   // ignore slow responses that arrive after a newer request
  function load() {
    const q = new URLSearchParams(base);
    Object.entries(filters).forEach(([k, v]) => { if (v && !(k === 'sort' && v === 'newest')) q.set(k, v); });
    const me = ++seq;
    root.classList.add('sg-loading');
    return get('/api/paintings?' + q).then(d => { if (me === seq) paint(d.items); })
      .catch(() => { if (me === seq) root.innerHTML = '<p class="sg-empty">Could not load paintings right now.</p>'; })
      .then(() => { if (me === seq) root.classList.remove('sg-loading'); });
  }

  root.innerHTML = '<p class="sg-empty">Loading paintings...</p>';
  if (grouped) root.classList.add('sg-grouped');
  const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['title', 'Title: A to Z']];
  const opts = (first, list) => `<option value="">${first}</option>` + list.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');

  Promise.all([
    get('/api/categories').catch(() => ({ items: [] })),
    get('/api/mediums').catch(() => ({ items: [] }))
  ]).then(([c, m]) => {
    cats = c.items;
    if (!featured && !grouped && root.dataset.filters !== 'off') {
      const hash = decodeURIComponent(location.hash.slice(1));          // gallery.html#nature opens with Nature selected
      if (cats.some(x => x.slug === hash)) filters.category = hash;
      const bar = document.createElement('form'); bar.className = 'sg-filterbar';
      bar.setAttribute('role', 'search'); bar.onsubmit = e => e.preventDefault();
      bar.innerHTML = `<input type="search" name="search" placeholder="Search paintings" aria-label="Search paintings" maxlength="80" autocomplete="off">
        <select name="medium" aria-label="Medium">${opts('All mediums', m.items.map(x => [x.name, x.name]))}</select>
        <select name="category" aria-label="Style">${opts('All styles', cats.map(x => [x.slug, x.name]))}</select>
        <select name="sort" aria-label="Sort order">${SORTS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
      bar.category.value = filters.category;
      root.before(bar);
      let t;
      bar.addEventListener('input', e => {
        const el = e.target; if (!el.name) return;
        filters[el.name] = el.value.trim();
        clearTimeout(t); t = setTimeout(load, el.name === 'search' ? 300 : 0);   // wait while typing
      });
    }
    return load();
  });

  root.addEventListener('click', e => {
    if (!e.target.closest('[data-open]')) return;
    const p = items.get(e.target.closest('.sg-card').dataset.id);
    if (p) open(p);
  });
})();
