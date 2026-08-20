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
            <p id="cart-note" class="cart-note fr" style="display:none;">Ajouté (aperçu — panier pas encore connecté).</p>
            <p id="cart-note-en" class="cart-note en" style="display:none;">Added (preview — cart not connected yet).</p>
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

      // "Add to cart" is a visual-only preview for now — see bogoland-v3-plan
      // memory: real localStorage persistence is a deliberately later step.
      const cartBtn = document.getElementById('cart-btn');
      cartBtn.addEventListener('click', () => {
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

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  renderProductDetail();
});
