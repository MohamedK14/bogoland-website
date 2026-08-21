// Friend's WhatsApp business number (Mali), digits only, no + or spaces.
const WHATSAPP_NUMBER = '22376448555';

// Live backend (Render) — see server/README.md. Products/categories now come
// from here (Neon DB) instead of the old static products.json/categories.json.
const API_BASE = 'https://bogoland-backend.onrender.com';

// Small inline icons reused across the WhatsApp/cart buttons and the qty
// stepper, so those controls read at a glance instead of relying on glyphs.
const WHATSAPP_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.11-1.34A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm5.2 14.2c-.22.62-1.28 1.18-1.77 1.24-.45.06-.98.09-1.58-.1-.36-.11-.83-.27-1.43-.53-2.52-1.09-4.16-3.63-4.29-3.8-.13-.17-1.02-1.36-1.02-2.6 0-1.24.65-1.84.88-2.09.22-.25.49-.31.65-.31.16 0 .33 0 .47.01.15.01.35-.06.55.42.2.49.68 1.68.74 1.8.06.12.1.27.02.44-.08.17-.12.27-.24.42-.12.15-.25.33-.36.44-.12.12-.24.25-.1.5.14.25.6 1 1.29 1.62.89.79 1.63 1.04 1.88 1.16.25.12.4.1.55-.06.15-.16.63-.73.8-.99.17-.25.34-.21.56-.13.22.08 1.41.66 1.65.78.24.12.4.18.46.28.06.1.06.6-.16 1.22Z"/></svg>';
const CART_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2.2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21.8 8H6.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="21" r="1.4" fill="currentColor"/><circle cx="18" cy="21" r="1.4" fill="currentColor"/></svg>';
const PLUS_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const MINUS_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const X_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

// --- SEARCH ---
// One overlay per page (markup lives right before </body>), opened from the
// 🔍 icon in the header. Products are fetched once per page load and
// filtered client-side — the catalog is small enough that this stays instant.
let searchProductsCache = null;

function getAllProductsForSearch(){
  if(searchProductsCache) return Promise.resolve(searchProductsCache);
  return fetch(`${API_BASE}/api/products`)
    .then(res => res.json())
    .then(products => { searchProductsCache = products; return products; });
}

function searchResultHTML(p){
  return `
    <a class="search-result-item" href="product.html?id=${p.id}">
      <img src="${p.image || ''}" alt="${p.nameFr}">
      <div class="search-result-info">
        <span class="search-result-name">${p.nameFr}</span>
        <span class="search-result-meta">${p.category} — ${formatPrice(p.price)}</span>
      </div>
    </a>
  `;
}

function renderSearchResults(query, products){
  const resultsEl = document.getElementById('search-results');
  if(!resultsEl) return;

  const trimmed = query.trim().toLowerCase();
  if(!trimmed){
    resultsEl.innerHTML = '<p class="search-hint">Tapez pour rechercher un produit...</p>';
    return;
  }

  const matches = products.filter(p => p.nameFr.toLowerCase().includes(trimmed));
  resultsEl.innerHTML = matches.length
    ? matches.map(searchResultHTML).join('')
    : '<p class="search-empty">Aucun produit trouvé.</p>';
}

function openSearch(){
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  if(!overlay || !input) return;

  overlay.style.display = 'flex';
  input.value = '';
  renderSearchResults('', []);
  input.focus();

  getAllProductsForSearch().then(products => {
    renderSearchResults(input.value, products);
    input.oninput = () => renderSearchResults(input.value, products);
  });
}

function closeSearch(){
  const overlay = document.getElementById('search-overlay');
  if(overlay) overlay.style.display = 'none';
}

function initSearch(){
  const trigger = document.getElementById('search-trigger');
  const overlay = document.getElementById('search-overlay');
  const closeBtn = document.getElementById('search-close');
  if(!trigger || !overlay || !closeBtn) return;

  trigger.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && overlay.style.display !== 'none') closeSearch();
  });
}

// --- HERO/STORY MERGED SLIDER (index.html only) ---
// No auto-advance — this is a real drag/swipe slider (Pointer Events cover
// touch, mouse, and pen with the same code). Drag it and the photo+text
// follow your finger 1:1, snapping to the next/previous slide past a
// threshold or springing back otherwise. Arrows + dots offer the same
// navigation for anyone who doesn't drag.
function initHeroStory(){
  const section = document.getElementById('hero-story');
  if(!section) return;

  const slides = Array.from(section.querySelectorAll('.hero-story-slide'));
  const dots = Array.from(section.querySelectorAll('.hero-story-dot'));
  const prevBtn = section.querySelector('.hero-story-arrow-prev');
  const nextBtn = section.querySelector('.hero-story-arrow-next');
  if(slides.length < 2) return;

  let current = 0;

  function setTransform(slide, percent, animate){
    slide.style.transition = animate ? '' : 'none';
    slide.style.transform = `translateX(${percent}%)`;
  }

  // direction: +1 moves forward (incoming slide enters from the right),
  // -1 moves backward (incoming slide enters from the left).
  function goTo(targetIndex, direction){
    if(targetIndex === current) return;
    const outgoing = slides[current];
    const incoming = slides[targetIndex];

    incoming.style.zIndex = 2;
    outgoing.style.zIndex = 1;
    setTransform(incoming, direction > 0 ? 100 : -100, false);
    void incoming.offsetWidth; // force the parked position to commit before animating

    requestAnimationFrame(() => {
      setTransform(incoming, 0, true);
      setTransform(outgoing, direction > 0 ? -100 : 100, true);
    });

    if(dots[current]) dots[current].classList.remove('active');
    slides[current].classList.remove('active');
    current = targetIndex;
    if(dots[current]) dots[current].classList.add('active');
    slides[current].classList.add('active');
  }

  function next(){ goTo((current + 1) % slides.length, 1); }
  function prev(){ goTo((current - 1 + slides.length) % slides.length, -1); }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i, i > current ? 1 : -1));
  });
  if(nextBtn) nextBtn.addEventListener('click', next);
  if(prevBtn) prevBtn.addEventListener('click', prev);

  // --- Drag/swipe ---
  let dragging = false;
  let dragMoved = false;
  let startX = 0;
  let deltaX = 0;

  function onPointerDown(e){
    if(e.target.closest('.hero-story-arrow, .hero-story-dot')) return;
    dragging = true;
    dragMoved = false;
    startX = e.clientX;
    deltaX = 0;
    slides.forEach(s => { s.style.transition = 'none'; });
    section.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){
    if(!dragging) return;
    deltaX = e.clientX - startX;
    if(Math.abs(deltaX) > 8) dragMoved = true;

    const width = section.clientWidth || 1;
    const percent = Math.max(-100, Math.min(100, (deltaX / width) * 100));
    slides[current].style.transform = `translateX(${percent}%)`;

    const neighborIndex = percent < 0
      ? (current + 1) % slides.length
      : (current - 1 + slides.length) % slides.length;
    if(neighborIndex !== current){
      const neighbor = slides[neighborIndex];
      neighbor.style.zIndex = 1;
      neighbor.style.transform = `translateX(${percent < 0 ? percent + 100 : percent - 100}%)`;
    }
  }

  function onPointerUp(){
    if(!dragging) return;
    dragging = false;

    const width = section.clientWidth || 1;
    const threshold = width * 0.18;

    if(deltaX <= -threshold){
      next();
    } else if(deltaX >= threshold){
      prev();
    } else {
      // Didn't drag far enough — spring back to where we started.
      slides.forEach((s, i) => setTransform(s, i === current ? 0 : (i > current ? 100 : -100), true));
    }

    // Swallow the synthetic click a touch-drag leaves behind, so a swipe
    // over the CTA button doesn't also activate it.
    if(dragMoved){
      section.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, { capture: true, once: true });
    }
  }

  section.addEventListener('pointerdown', onPointerDown);
  section.addEventListener('pointermove', onPointerMove);
  section.addEventListener('pointerup', onPointerUp);
  section.addEventListener('pointercancel', onPointerUp);
}

// Fire-and-forget: increments a product's click_count server-side so the
// (future) "Meilleures ventes" section can sort by real interest. Never
// blocks the WhatsApp link itself if the backend is asleep/unreachable.
function trackProductClick(productId){
  fetch(`${API_BASE}/api/products/${productId}/click`, { method: 'POST' }).catch(() => {});
}

// --- CUSTOMER ACCOUNT (login/register live in account.html + js/account.js;
// this bit is shared here so checkout can use it from any page) ---
const CUSTOMER_TOKEN_KEY = 'bogoland_customer_token';

function getCustomerToken(){
  try { return localStorage.getItem(CUSTOMER_TOKEN_KEY); } catch(e){ return null; }
}

// Fire-and-forget: if a customer is logged in, this purchase gets saved as
// an order (shows up later in "Historique des commandes"). Guests checking
// out without an account are completely unaffected — nothing is sent.
function recordOrder(items, total){
  const token = getCustomerToken();
  if(!token) return;

  fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      items: items.map(({ product, qty }) => ({
        productId: product.id, nameFr: product.nameFr, price: product.price, qty, image: product.image,
      })),
      total,
    }),
  }).catch(() => {});
}

// --- DAY/NIGHT THEME TOGGLE ---
// The site is French-only now (no more FR/EN switch), so that header slot
// became a light/dark theme toggle instead. A tiny inline script in each
// page's <head> already applies the saved/system theme before first paint
// (avoids a flash of the wrong theme) — this just wires up the click.
const THEME_KEY = 'bogoland_theme';

function getPreferredTheme(){
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if(saved === 'light' || saved === 'dark') return saved;
  } catch(e){}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.setAttribute('aria-pressed', theme === 'dark'));
}

function initTheme(){
  applyTheme(getPreferredTheme());
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch(e){}
      applyTheme(next);
    });
  });
}

function setLang(lang, btn){
  document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.querySelectorAll('.fr').forEach(el => el.style.display = lang === 'fr' ? '' : 'none');
  document.querySelectorAll('.en').forEach(el => el.style.display = lang === 'en' ? '' : 'none');
  document.querySelectorAll('[data-fr]').forEach(el => {
    const text = lang === 'fr' ? el.dataset.fr : el.dataset.en;
    if(el.tagName === 'BUTTON'){ el.textContent = text; }
    else{ el.placeholder = text; }
  });
  document.documentElement.setAttribute('data-lang', lang);
  window.currentLang = lang;
}

function toggleMenu(){
  document.querySelector('nav').classList.toggle('open');
}

// --- CART (localStorage, no login/backend needed) ---
// Stored as an array of {id, qty}. Per-browser/device only — see
// bogoland-v4-plan memory: this is the frontend half of that plan.
const CART_KEY = 'bogoland_cart';

function getCart(){
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(cart) ? cart : [];
  } catch(e){
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, qty){
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if(existing){ existing.qty += qty; }
  else{ cart.push({ id: productId, qty }); }
  saveCart(cart);
}

function removeFromCart(productId){
  saveCart(getCart().filter(item => item.id !== productId));
}

function updateCartItemQty(productId, qty){
  if(qty <= 0){ return removeFromCart(productId); }
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if(item){ item.qty = qty; saveCart(cart); }
}

function getCartCount(){
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge(){
  const badge = document.getElementById('cart-badge');
  if(!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function getQueryParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function formatPrice(price){
  return `CFA${price.toLocaleString('en-US')}`;
}

// A product counts as "new" if it was added within the last 30 days —
// auto-computed from dateAdded, never a manual flag.
function isNewArrival(product, days = 30){
  const added = new Date(product.dateAdded);
  const diffDays = (Date.now() - added.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= days;
}

function buildWhatsAppLink(product, qty, lang){
  const name = lang === 'en' ? product.nameEn : product.nameFr;
  const message = lang === 'en'
    ? `Hello, I would like to order: ${name} x${qty} — ${formatPrice(product.price * qty)}`
    : `Bonjour, je souhaite commander : ${name} x${qty} — ${formatPrice(product.price * qty)}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function productCardHTML(p){
  const badge = isNewArrival(p)
    ? '<span class="product-badge fr">Nouveau</span><span class="product-badge en" style="display:none;">New</span>'
    : '';
  return `
    <a class="product-card" href="product.html?id=${p.id}">
      <div class="img-wrap">
        ${badge}
        <img class="base-img" src="${p.image}" alt="${p.nameFr}">
        <img class="hover-img" src="${p.hoverImage}" alt="${p.nameFr} - vue 2">
      </div>
      <div class="product-info">
        <h4 class="fr">${p.nameFr}</h4><h4 class="en" style="display:none;">${p.nameEn}</h4>
        <p class="price">${formatPrice(p.price)}</p>
        <p class="stock fr ${p.inStock ? '' : 'out-of-stock'}">${p.inStock ? 'En stock' : 'Rupture de stock'}</p>
        <p class="stock en ${p.inStock ? '' : 'out-of-stock'}" style="display:none;">${p.inStock ? 'In stock' : 'Out of stock'}</p>
      </div>
    </a>
  `;
}

// Renders product cards from the live API into #products-grid, if that
// container exists on the current page (only index.html has one).
function renderProducts(){
  const grid = document.getElementById('products-grid');
  if(!grid) return;

  fetch(`${API_BASE}/api/products`)
    .then(res => res.json())
    .then(products => {
      grid.innerHTML = products.map(productCardHTML).join('');
    })
    .catch(err => {
      console.error('Could not load products from API', err);
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:rgba(46,32,19,0.5);">Produits indisponibles pour le moment.</p>';
    });
}

function categoryCardHTML(c){
  const badge = c.available
    ? ''
    : '<span class="col-unavailable-badge fr">Indisponible</span><span class="col-unavailable-badge en" style="display:none;">Unavailable</span>';
  return `
    <a class="col-card ${c.available ? '' : 'unavailable'}" href="shop.html?category=${encodeURIComponent(c.nameFr)}">
      <div class="col-img">
        <div class="ph" style="height:100%; background-image:url('${c.image}');"></div>
        ${badge}
      </div>
      <div class="col-label fr">${c.nameFr}</div><div class="col-label en" style="display:none;">${c.nameEn}</div>
    </a>
  `;
}

// Renders the "Nos Collections" cards from the live API into
// #collections-grid, if present — only index.html has one. Each category's
// `available` flag controls the "Indisponible" badge — today that's a plain
// JSON edit, later a toggle in the admin UI (see bogoland-v4-plan memory).
function renderCategories(){
  const grid = document.getElementById('collections-grid');
  if(!grid) return;

  fetch(`${API_BASE}/api/categories`)
    .then(res => res.json())
    .then(categories => {
      grid.innerHTML = categories.map(categoryCardHTML).join('');
    })
    .catch(err => {
      console.error('Could not load categories from API', err);
    });
}

function filterPillHTML(label, value, activeValue){
  return `<button type="button" class="filter-pill ${value === activeValue ? 'active' : ''}" data-category="${value}">${label}</button>`;
}

// Renders the boutique page (#shop-products-grid), if present — only
// shop.html has one. Supports filtering by category via ?category=<nameFr>,
// with clickable pills that update the URL (no reload) — this is also
// where "Nos Collections" cards and the category nav links land.
function renderShop(){
  const grid = document.getElementById('shop-products-grid');
  if(!grid) return;

  const filtersEl = document.getElementById('shop-filters');
  const emptyEl = document.getElementById('shop-empty');
  const titleEl = document.getElementById('shop-title');

  Promise.all([
    fetch(`${API_BASE}/api/products`).then(res => res.json()),
    fetch(`${API_BASE}/api/categories`).then(res => res.json()),
  ])
    .then(([products, categories]) => {
      const renderForCategory = (activeCategory) => {
        filtersEl.innerHTML = [
          filterPillHTML('Tous', '', activeCategory),
          ...categories.map(c => filterPillHTML(c.nameFr, c.nameFr, activeCategory)),
        ].join('');

        const filtered = activeCategory ? products.filter(p => p.category === activeCategory) : products;
        grid.innerHTML = filtered.map(productCardHTML).join('');
        emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';
        // Heading reflects the actual selection, so "Tous" and "Toute la
        // boutique" aren't just saying the same thing twice on screen.
        if(titleEl) titleEl.textContent = activeCategory || 'Toute la boutique';

        filtersEl.querySelectorAll('.filter-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            const cat = btn.dataset.category;
            history.pushState(null, '', cat ? `shop.html?category=${encodeURIComponent(cat)}` : 'shop.html');
            renderForCategory(cat);
          });
        });
      };

      renderForCategory(getQueryParam('category') || '');
    })
    .catch(err => {
      console.error('Could not load shop from API', err);
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:rgba(46,32,19,0.5);">Produits indisponibles pour le moment.</p>';
    });
}

// Renders a single product's detail view (gallery, info, WhatsApp/cart
// buttons, similar products) into #product-detail, if present — only
// product.html has one.
function renderProductDetail(){
  const container = document.getElementById('product-detail');
  if(!container) return;

  const id = Number(getQueryParam('id'));

  fetch(`${API_BASE}/api/products`)
    .then(res => res.json())
    .then(products => {
      const product = products.find(p => p.id === id);
      if(!product){
        container.innerHTML = `
          <p class="fr" style="text-align:center;">Produit introuvable.</p>
          <p class="en" style="display:none; text-align:center;">Product not found.</p>
        `;
        return;
      }

      document.title = `BOGOLAND — ${product.nameFr}`;
      const badge = isNewArrival(product)
        ? '<span class="product-badge fr">Nouveau</span><span class="product-badge en" style="display:none;">New</span>'
        : '';

      container.innerHTML = `
        <div class="detail-gallery">
          <div class="detail-main-img">
            ${badge}
            <img id="detail-main-img" src="${product.images[0]}" alt="${product.nameFr}">
          </div>
          <div class="detail-thumbs">
            ${product.images.map((src, i) => `
              <img class="detail-thumb ${i === 0 ? 'active' : ''}" src="${src}" alt="${product.nameFr} - vue ${i + 1}" data-src="${src}">
            `).join('')}
          </div>
        </div>
        <div class="detail-info">
          <span class="story-label fr">${product.category}</span><span class="story-label en" style="display:none;">${product.category}</span>
          <h1 class="fr">${product.nameFr}</h1><h1 class="en" style="display:none;">${product.nameEn}</h1>
          <p class="detail-price">${formatPrice(product.price)}</p>
          <p class="detail-desc fr">${product.descriptionFr}</p>
          <p class="detail-desc en" style="display:none;">${product.descriptionEn}</p>
          <p class="stock fr ${product.inStock ? '' : 'out-of-stock'}">${product.inStock ? 'En stock' : 'Rupture de stock'}</p>
          <p class="stock en ${product.inStock ? '' : 'out-of-stock'}" style="display:none;">${product.inStock ? 'In stock' : 'Out of stock'}</p>

          <div class="detail-qty">
            <label class="fr" for="qty-input">Quantité</label>
            <label class="en" for="qty-input" style="display:none;">Quantity</label>
            <input type="number" id="qty-input" value="1" min="1">
          </div>

          <div class="detail-actions">
            <a id="whatsapp-btn" class="whatsapp-btn" target="_blank" rel="noopener">
              ${WHATSAPP_ICON_SVG}
              <span class="fr">Commander sur WhatsApp</span><span class="en" style="display:none;">Order on WhatsApp</span>
            </a>
            <button id="cart-btn" class="cart-btn" type="button">
              ${CART_ICON_SVG}
              <span class="fr">Ajouter au panier</span><span class="en" style="display:none;">Add to cart</span>
            </button>
            <p id="cart-note" class="cart-note fr" style="display:none;">Ajouté au panier.</p>
            <p id="cart-note-en" class="cart-note en" style="display:none;">Added to cart.</p>
          </div>
        </div>
      `;

      // Thumbnail swap
      container.querySelectorAll('.detail-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
          document.getElementById('detail-main-img').src = thumb.dataset.src;
          container.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
      });

      // Keep the WhatsApp link in sync with quantity + language
      const qtyInput = document.getElementById('qty-input');
      const whatsappBtn = document.getElementById('whatsapp-btn');
      const updateWhatsAppLink = () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        const currentLang = document.documentElement.getAttribute('data-lang') || 'fr';
        whatsappBtn.href = buildWhatsAppLink(product, qty, currentLang);
      };
      updateWhatsAppLink();
      qtyInput.addEventListener('input', updateWhatsAppLink);
      document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', updateWhatsAppLink));

      const cartBtn = document.getElementById('cart-btn');
      cartBtn.addEventListener('click', () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        addToCart(product.id, qty);
        document.getElementById('cart-note').style.display = document.documentElement.getAttribute('data-lang') === 'fr' ? 'block' : 'none';
        document.getElementById('cart-note-en').style.display = document.documentElement.getAttribute('data-lang') === 'en' ? 'block' : 'none';
      });

      whatsappBtn.addEventListener('click', () => {
        trackProductClick(product.id);
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        recordOrder([{ product, qty }], product.price * qty);
      });

      renderSimilarProducts(products, product);
    })
    .catch(err => {
      console.error('Could not load product from API', err);
      container.innerHTML = '<p style="text-align:center;">Erreur de chargement du produit.</p>';
    });
}

function renderSimilarProducts(allProducts, current){
  const section = document.getElementById('similar-products');
  if(!section) return;

  const similar = allProducts
    .filter(p => p.id !== current.id && p.category === current.category)
    .slice(0, 4);

  if(similar.length === 0){
    section.style.display = 'none';
    return;
  }

  section.querySelector('.products-grid').innerHTML = similar.map(productCardHTML).join('');
}

function cartItemHTML(product, qty){
  const lang = document.documentElement.getAttribute('data-lang') || 'fr';
  const name = lang === 'en' ? product.nameEn : product.nameFr;
  return `
    <div class="cart-item" data-id="${product.id}">
      <img src="${product.image}" alt="${name}">
      <div class="cart-item-info">
        <h4 class="fr">${product.nameFr}</h4><h4 class="en" style="display:none;">${product.nameEn}</h4>
        <p class="price">${formatPrice(product.price)}</p>
        <div class="cart-item-qty">
          <button type="button" class="qty-btn" data-action="decrease" aria-label="Diminuer la quantité">${MINUS_ICON_SVG}</button>
          <span class="qty-value">${qty}</span>
          <button type="button" class="qty-btn" data-action="increase" aria-label="Augmenter la quantité">${PLUS_ICON_SVG}</button>
        </div>
      </div>
      <button type="button" class="cart-remove" aria-label="Retirer du panier">${X_ICON_SVG}</button>
    </div>
  `;
}

// Renders the cart page (#cart-container), if present — only cart.html has one.
function renderCart(){
  const container = document.getElementById('cart-container');
  if(!container) return;

  const cart = getCart();
  if(cart.length === 0){
    container.innerHTML = `
      <div class="cart-empty-state">
        <span class="cart-empty-icon">${CART_ICON_SVG}</span>
        <p class="cart-empty fr">Votre panier est vide.</p>
        <p class="cart-empty en" style="display:none;">Your cart is empty.</p>
        <a href="shop.html" class="btn-outline fr" style="display:inline-block; margin-top:20px;">Continuer mes achats</a>
        <a href="shop.html" class="btn-outline en" style="display:none; margin-top:20px;">Continue shopping</a>
      </div>
    `;
    return;
  }

  fetch(`${API_BASE}/api/products`)
    .then(res => res.json())
    .then(products => {
      const items = cart
        .map(entry => ({ product: products.find(p => p.id === entry.id), qty: entry.qty }))
        .filter(entry => entry.product);

      const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);

      container.innerHTML = `
        <div class="cart-items">
          ${items.map(({ product, qty }) => cartItemHTML(product, qty)).join('')}
        </div>
        <div class="cart-summary">
          <p class="cart-total fr">Total : ${formatPrice(total)}</p>
          <p class="cart-total en" style="display:none;">Total: ${formatPrice(total)}</p>
          <a id="cart-whatsapp-btn" class="whatsapp-btn" target="_blank" rel="noopener">
            ${WHATSAPP_ICON_SVG}
            <span class="fr">Commander sur WhatsApp</span><span class="en" style="display:none;">Order on WhatsApp</span>
          </a>
        </div>
      `;

      const updateWhatsAppCartLink = () => {
        const currentLang = document.documentElement.getAttribute('data-lang') || 'fr';
        const lines = items.map(({ product, qty }) => {
          const name = currentLang === 'en' ? product.nameEn : product.nameFr;
          return `${name} x${qty} — ${formatPrice(product.price * qty)}`;
        });
        const message = currentLang === 'en'
          ? `Hello, I would like to order:\n${lines.join('\n')}\nTotal: ${formatPrice(total)}`
          : `Bonjour, je souhaite commander :\n${lines.join('\n')}\nTotal : ${formatPrice(total)}`;
        document.getElementById('cart-whatsapp-btn').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      };
      updateWhatsAppCartLink();
      document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', updateWhatsAppCartLink));
      document.getElementById('cart-whatsapp-btn').addEventListener('click', () => {
        items.forEach(({ product }) => trackProductClick(product.id));
        recordOrder(items, total);
      });

      container.querySelectorAll('.cart-item').forEach(el => {
        const id = Number(el.dataset.id);
        const entry = items.find(i => i.product.id === id);
        el.querySelector('[data-action="increase"]').addEventListener('click', () => {
          updateCartItemQty(id, entry.qty + 1);
          renderCart();
        });
        el.querySelector('[data-action="decrease"]').addEventListener('click', () => {
          updateCartItemQty(id, entry.qty - 1);
          renderCart();
        });
        el.querySelector('.cart-remove').addEventListener('click', () => {
          removeFromCart(id);
          renderCart();
        });
      });
    });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  initHeroStory();
  renderProducts();
  renderCategories();
  renderShop();
  renderProductDetail();
  renderCart();
  updateCartBadge();
});
