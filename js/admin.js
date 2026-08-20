// TODO: set this to the deployed server's URL once it exists (Render/Railway).
// e.g. 'https://bogoland-server.onrender.com' — see server/README.md.
const API_BASE = 'https://REPLACE-ME.onrender.com';

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

function showDashboard(){
  document.getElementById('admin-login-form').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  loadCategories();
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
