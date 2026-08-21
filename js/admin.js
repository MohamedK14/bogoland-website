const API_BASE = 'https://bogoland-backend.onrender.com';

const TOKEN_KEY = 'bogoland_admin_token';

function getToken(){
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token){
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken(){
  sessionStorage.removeItem(TOKEN_KEY);
}

let categoriesCache = [];

function showDashboard(){
  document.getElementById('admin-login-form').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  loadCategories();
  loadProducts();
}

function showLogin(){
  document.getElementById('admin-login-form').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function categoryRowHTML(c){
  return `
    <div class="admin-row" data-id="${c.id}">
      <div class="admin-row-info">
        <img src="${c.image}" alt="${c.nameFr}">
        <span>${c.nameFr}</span>
      </div>
      <label class="admin-switch">
        <input type="checkbox" class="admin-toggle" ${c.available ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  `;
}

function loadCategories(){
  const errorEl = document.getElementById('admin-error');
  errorEl.style.display = 'none';

  fetch(`${API_BASE}/api/categories`)
    .then(res => res.json())
    .then(categories => {
      categoriesCache = categories;
      populateCategorySelect(categories);

      const list = document.getElementById('admin-categories-list');
      list.innerHTML = categories.map(categoryRowHTML).join('');

      list.querySelectorAll('.admin-row').forEach(row => {
        const id = row.dataset.id;
        const toggle = row.querySelector('.admin-toggle');
        toggle.addEventListener('change', () => {
          updateCategoryAvailability(id, toggle.checked, toggle);
        });
      });
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = "Impossible de charger les catégories. Le serveur est-il déployé et API_BASE correctement configuré dans js/admin.js ?";
      errorEl.style.display = 'block';
    });
}

function updateCategoryAvailability(id, available, toggleEl){
  const errorEl = document.getElementById('admin-error');
  errorEl.style.display = 'none';

  fetch(`${API_BASE}/api/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ available }),
  })
    .then(res => {
      if(res.status === 401){
        clearToken();
        showLogin();
        throw new Error('Session expirée, reconnectez-vous.');
      }
      if(!res.ok){ throw new Error('Update failed'); }
      return res.json();
    })
    .catch(err => {
      console.error(err);
      toggleEl.checked = !available; // revert the switch on failure
      errorEl.textContent = "La mise à jour a échoué.";
      errorEl.style.display = 'block';
    });
}

// --- PRODUCTS TAB ---

function populateCategorySelect(categories){
  const select = document.getElementById('product-category');
  const current = select.value;
  select.innerHTML = categories.map(c => `<option value="${c.nameFr}">${c.nameFr}</option>`).join('');
  if(current){ select.value = current; }
}

function formatPriceAdmin(price){
  return `CFA${Number(price).toLocaleString('en-US')}`;
}

function productRowHTML(p){
  return `
    <div class="admin-row" data-id="${p.id}">
      <div class="admin-row-info">
        <img src="${p.image || ''}" alt="${p.nameFr}">
        <div>
          <span>${p.nameFr}</span>
          <div class="admin-row-meta">${p.category} — ${formatPriceAdmin(p.price)} — ${p.inStock ? 'En stock' : 'Rupture'} — ${p.clickCount || 0} clics</div>
        </div>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="admin-icon-btn admin-edit-product">Modifier</button>
        <button type="button" class="admin-icon-btn danger admin-delete-product">Supprimer</button>
      </div>
    </div>
  `;
}

function loadProducts(){
  const errorEl = document.getElementById('admin-products-error');
  errorEl.style.display = 'none';

  fetch(`${API_BASE}/api/products`)
    .then(res => res.json())
    .then(products => {
      const list = document.getElementById('admin-products-list');
      list.innerHTML = products.map(productRowHTML).join('');

      list.querySelectorAll('.admin-row').forEach(row => {
        const id = Number(row.dataset.id);
        const product = products.find(p => p.id === id);
        row.querySelector('.admin-edit-product').addEventListener('click', () => openProductModal(product));
        row.querySelector('.admin-delete-product').addEventListener('click', () => deleteProduct(id));
      });
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = "Impossible de charger les produits.";
      errorEl.style.display = 'block';
    });
}

function deleteProduct(id){
  if(!confirm('Supprimer ce produit définitivement ?')) return;
  const errorEl = document.getElementById('admin-products-error');
  errorEl.style.display = 'none';

  fetch(`${API_BASE}/api/products/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  })
    .then(res => {
      if(res.status === 401){
        clearToken();
        showLogin();
        throw new Error('Session expirée, reconnectez-vous.');
      }
      if(!res.ok){ throw new Error('Delete failed'); }
      loadProducts();
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = "La suppression a échoué.";
      errorEl.style.display = 'block';
    });
}

// --- PRODUCT MODAL (add/edit) ---

let workingImages = []; // urls for the product currently being edited/added

function imageThumbHTML(url, index){
  return `
    <div class="admin-image-thumb" data-index="${index}">
      <img src="${url}" alt="">
      <button type="button" class="admin-remove-image" data-index="${index}" aria-label="Retirer">✕</button>
    </div>
  `;
}

function renderProductImages(){
  const list = document.getElementById('product-images-list');
  list.innerHTML = workingImages.map(imageThumbHTML).join('');
  list.querySelectorAll('.admin-remove-image').forEach(btn => {
    btn.addEventListener('click', () => {
      workingImages.splice(Number(btn.dataset.index), 1);
      renderProductImages();
    });
  });
}

function openProductModal(product){
  document.getElementById('product-form-error').style.display = 'none';
  document.getElementById('product-form').reset();
  populateCategorySelect(categoriesCache);

  workingImages = product ? [...(product.images || [])] : [];
  renderProductImages();

  document.getElementById('product-modal-title').textContent = product ? 'Modifier le produit' : 'Ajouter un produit';
  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name-fr').value = product ? product.nameFr : '';
  document.getElementById('product-name-en').value = product ? product.nameEn : '';
  document.getElementById('product-category').value = product ? product.category : '';
  document.getElementById('product-price').value = product ? product.price : '';
  document.getElementById('product-desc-fr').value = product ? product.descriptionFr : '';
  document.getElementById('product-desc-en').value = product ? product.descriptionEn : '';
  document.getElementById('product-in-stock').checked = product ? product.inStock : true;

  document.getElementById('product-modal-overlay').style.display = 'flex';
}

function closeProductModal(){
  document.getElementById('product-modal-overlay').style.display = 'none';
}

function uploadProductImage(file){
  const statusEl = document.getElementById('product-upload-status');
  statusEl.textContent = "Envoi de l'image...";
  statusEl.style.display = 'block';

  const formData = new FormData();
  formData.append('image', file);

  return fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData,
  })
    .then(res => {
      if(res.status === 401){
        clearToken();
        showLogin();
        throw new Error('Session expirée, reconnectez-vous.');
      }
      if(!res.ok){ throw new Error('Upload failed'); }
      return res.json();
    })
    .then(({ url }) => {
      workingImages.push(url);
      renderProductImages();
      statusEl.style.display = 'none';
    })
    .catch(err => {
      console.error(err);
      statusEl.textContent = "Échec de l'envoi de l'image.";
    });
}

document.getElementById('admin-add-product').addEventListener('click', () => openProductModal(null));
document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
document.getElementById('product-modal-overlay').addEventListener('click', (e) => {
  if(e.target.id === 'product-modal-overlay'){ closeProductModal(); }
});

document.getElementById('product-image-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(file){ uploadProductImage(file); }
  e.target.value = '';
});

document.getElementById('product-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('product-form-error');
  errorEl.style.display = 'none';

  const id = document.getElementById('product-id').value;
  const payload = {
    nameFr: document.getElementById('product-name-fr').value,
    nameEn: document.getElementById('product-name-en').value,
    category: document.getElementById('product-category').value,
    price: Number(document.getElementById('product-price').value),
    descriptionFr: document.getElementById('product-desc-fr').value,
    descriptionEn: document.getElementById('product-desc-en').value,
    inStock: document.getElementById('product-in-stock').checked,
    images: workingImages,
  };

  const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
  const method = id ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  })
    .then(res => {
      if(res.status === 401){
        clearToken();
        showLogin();
        throw new Error('Session expirée, reconnectez-vous.');
      }
      if(!res.ok){ throw new Error('Save failed'); }
      return res.json();
    })
    .then(() => {
      closeProductModal();
      loadProducts();
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = "L'enregistrement a échoué.";
      errorEl.style.display = 'block';
    });
});

// --- TABS ---

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`admin-tab-${tab.dataset.tab}`).style.display = 'block';
  });
});

document.getElementById('admin-login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  errorEl.style.display = 'none';

  fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(res => {
      if(!res.ok){ throw new Error('Invalid credentials'); }
      return res.json();
    })
    .then(({ token }) => {
      setToken(token);
      showDashboard();
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = "E-mail ou mot de passe incorrect.";
      errorEl.style.display = 'block';
    });
});

document.getElementById('admin-logout').addEventListener('click', () => {
  clearToken();
  showLogin();
});

document.addEventListener('DOMContentLoaded', () => {
  if(getToken()){
    showDashboard();
  }
});
