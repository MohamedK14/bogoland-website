function setLang(lang, btn){
  document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.fr').forEach(el => el.style.display = lang === 'fr' ? '' : 'none');
  document.querySelectorAll('.en').forEach(el => el.style.display = lang === 'en' ? '' : 'none');
  document.querySelectorAll('[data-fr]').forEach(el => {
    const text = lang === 'fr' ? el.dataset.fr : el.dataset.en;
    if(el.tagName === 'BUTTON'){ el.textContent = text; }
    else{ el.placeholder = text; }
  });
  document.documentElement.setAttribute('data-lang', lang);
}

function toggleMenu(){
  document.querySelector('nav').classList.toggle('open');
}

// Renders product cards from products.json into #products-grid, if that
// container exists on the current page (only index.html has one).
function renderProducts(){
  const grid = document.getElementById('products-grid');
  if(!grid) return;

  fetch('products.json')
    .then(res => res.json())
    .then(products => {
      grid.innerHTML = products.map(p => `
        <div class="product-card">
          <div class="img-wrap">
            <img class="base-img" src="${p.image}" alt="${p.nameFr}">
            <img class="hover-img" src="${p.hoverImage}" alt="${p.nameFr} - vue 2">
          </div>
          <div class="product-info">
            <h4 class="fr">${p.nameFr}</h4><h4 class="en" style="display:none;">${p.nameEn}</h4>
            <p class="price">CFA${p.price.toLocaleString('en-US')}</p>
            <p class="stock fr">${p.inStock ? 'En stock' : 'Rupture de stock'}</p>
            <p class="stock en" style="display:none;">${p.inStock ? 'In stock' : 'Out of stock'}</p>
          </div>
        </div>
      `).join('');
    })
    .catch(err => {
      console.error('Could not load products.json', err);
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:rgba(46,32,19,0.5);">Produits indisponibles pour le moment.</p>';
    });
}

document.addEventListener('DOMContentLoaded', renderProducts);
