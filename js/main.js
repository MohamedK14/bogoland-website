// Friend's WhatsApp business number (Mali), digits only, no + or spaces.
const WHATSAPP_NUMBER = '22376448555';

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
        <p class="stock fr">${p.inStock ? 'En stock' : 'Rupture de stock'}</p>
        <p class="stock en" style="display:none;">${p.inStock ? 'In stock' : 'Out of stock'}</p>
      </div>
    </a>
  `;
}

// Renders product cards from products.json into #products-grid, if that
// container exists on the current page (only index.html has one).
function renderProducts(){
  const grid = document.getElementById('products-grid');
  if(!grid) return;

  fetch('products.json')
    .then(res => res.json())
    .then(products => {
      grid.innerHTML = products.map(productCardHTML).join('');
    })
    .catch(err => {
      console.error('Could not load products.json', err);
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:rgba(46,32,19,0.5);">Produits indisponibles pour le moment.</p>';
    });
}

function categoryCardHTML(c){
  const badge = c.available
    ? ''
    : '<span class="col-unavailable-badge fr">Indisponible</span><span class="col-unavailable-badge en" style="display:none;">Unavailable</span>';
  return `
    <div class="col-card ${c.available ? '' : 'unavailable'}">
      <div class="ph" style="height:100%; background-image:url('${c.image}');"></div>
      ${badge}
      <div class="col-label fr">${c.nameFr}</div><div class="col-label en" style="display:none;">${c.nameEn}</div>
    </div>
  `;
}

// Renders the "Nos Collections" cards from categories.json into
// #collections-grid, if present — only index.html has one. Each category's
// `available` flag controls the "Indisponible" badge — today that's a plain
// JSON edit, later a toggle in the admin UI (see bogoland-v4-plan memory).
function renderCategories(){
  const grid = document.getElementById('collections-grid');
  if(!grid) return;

  fetch('categories.json')
    .then(res => res.json())
    .then(categories => {
      grid.innerHTML = categories.map(categoryCardHTML).join('');
    })
    .catch(err => {
      console.error('Could not load categories.json', err);
    });
}

// Renders a single product's detail view (gallery, info, WhatsApp/cart
// buttons, similar products) into #product-detail, if present — only
// product.html has one.
function renderProductDetail(){
  const container = document.getElementById('product-detail');
  if(!container) return;

  const id = Number(getQueryParam('id'));

  fetch('products.json')
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
          <p class="stock fr">${product.inStock ? 'En stock' : 'Rupture de stock'}</p>
          <p class="stock en" style="display:none;">${product.inStock ? 'In stock' : 'Out of stock'}</p>

          <div class="detail-qty">
            <label class="fr" for="qty-input">Quantité</label>
            <label class="en" for="qty-input" style="display:none;">Quantity</label>
            <input type="number" id="qty-input" value="1" min="1">
          </div>

          <div class="detail-actions">
            <a id="whatsapp-btn" class="whatsapp-btn" target="_blank" rel="noopener">
              <span class="fr">Commander sur WhatsApp</span><span class="en" style="display:none;">Order on WhatsApp</span>
            </a>
            <button id="cart-btn" class="cart-btn" type="button">
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

      renderSimilarProducts(products, product);
    })
    .catch(err => {
      console.error('Could not load products.json', err);
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
          <button type="button" class="qty-btn" data-action="decrease">−</button>
          <span class="qty-value">${qty}</span>
          <button type="button" class="qty-btn" data-action="increase">+</button>
        </div>
      </div>
      <button type="button" class="cart-remove" aria-label="Remove">✕</button>
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
      <p class="cart-empty fr">Votre panier est vide.</p>
      <p class="cart-empty en" style="display:none;">Your cart is empty.</p>
      <a href="index.html" class="btn-outline fr" style="display:inline-block; margin-top:20px;">Continuer mes achats</a>
      <a href="index.html" class="btn-outline en" style="display:none; margin-top:20px;">Continue shopping</a>
    `;
    return;
  }

  fetch('products.json')
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
  renderProducts();
  renderCategories();
  renderProductDetail();
  renderCart();
  updateCartBadge();
});
