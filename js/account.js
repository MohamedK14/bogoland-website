// Customer account page (account.html). Relies on API_BASE, CUSTOMER_TOKEN_KEY,
// getCustomerToken(), and formatPrice() from js/main.js, loaded first on this page.

function getStoredCustomer(){
  try { return JSON.parse(localStorage.getItem('bogoland_customer') || 'null'); } catch(e){ return null; }
}

function setCustomerSession(token, customer){
  try {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    localStorage.setItem('bogoland_customer', JSON.stringify(customer));
  } catch(e){}
}

function clearCustomerSession(){
  try {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem('bogoland_customer');
  } catch(e){}
}

function showGuestView(){
  document.getElementById('account-guest').style.display = 'block';
  document.getElementById('account-dashboard').style.display = 'none';
}

function showDashboardView(customer){
  document.getElementById('account-guest').style.display = 'none';
  document.getElementById('account-dashboard').style.display = 'block';
  document.getElementById('account-welcome').textContent = `Bonjour, ${customer.name}`;
  document.getElementById('info-name').value = customer.name || '';
  document.getElementById('info-phone').value = customer.phone || '';
  document.getElementById('info-address').value = customer.address || '';
  loadOrders();
}

function orderItemLineHTML(item){
  return `
    <div class="order-line">
      <span>${item.nameFr} × ${item.qty}</span>
      <span>${formatPrice(item.price * item.qty)}</span>
    </div>
  `;
}

function orderCardHTML(order){
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
    <div class="order-card">
      <div class="order-card-head">
        <span class="order-date">${date}</span>
        <span class="order-total">${formatPrice(order.total)}</span>
      </div>
      <div class="order-items">${order.items.map(orderItemLineHTML).join('')}</div>
    </div>
  `;
}

function loadOrders(){
  const listEl = document.getElementById('orders-list');
  const token = getCustomerToken();

  fetch(`${API_BASE}/api/orders`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(orders => {
      listEl.innerHTML = orders.length
        ? orders.map(orderCardHTML).join('')
        : '<p class="cart-empty">Aucune commande pour le moment.</p>';
    })
    .catch(() => {
      listEl.innerHTML = "<p class=\"cart-empty\">Impossible de charger l'historique.</p>";
    });
}

// --- Login/register tabs ---
document.querySelectorAll('.account-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('account-login-form').style.display = tab.dataset.tab === 'login' ? 'flex' : 'none';
    document.getElementById('account-register-form').style.display = tab.dataset.tab === 'register' ? 'flex' : 'none';
  });
});

// --- Login ---
document.getElementById('account-login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.style.display = 'none';

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(res => { if(!res.ok){ throw new Error('Invalid credentials'); } return res.json(); })
    .then(({ token, customer }) => {
      setCustomerSession(token, customer);
      showDashboardView(customer);
    })
    .catch(err => {
      errorEl.textContent = err instanceof TypeError
        ? "Impossible de contacter le serveur. Réessayez plus tard."
        : "E-mail ou mot de passe incorrect.";
      errorEl.style.display = 'block';
    });
});

// --- Register ---
document.getElementById('account-register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  errorEl.style.display = 'none';

  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;

  fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if(!ok){ throw new Error(data.error || "L'inscription a échoué."); }
      setCustomerSession(data.token, data.customer);
      showDashboardView(data.customer);
    })
    .catch(err => {
      errorEl.textContent = err instanceof TypeError
        ? "Impossible de contacter le serveur. Réessayez plus tard."
        : err.message;
      errorEl.style.display = 'block';
    });
});

// --- Saved info (name/phone/address) ---
document.getElementById('account-info-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const noteEl = document.getElementById('info-saved-note');
  noteEl.style.display = 'none';

  const token = getCustomerToken();
  const name = document.getElementById('info-name').value;
  const phone = document.getElementById('info-phone').value;
  const address = document.getElementById('info-address').value;

  fetch(`${API_BASE}/api/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name, phone, address }),
  })
    .then(res => res.json())
    .then(customer => {
      localStorage.setItem('bogoland_customer', JSON.stringify(customer));
      noteEl.style.display = 'block';
    })
    .catch(() => {});
});

// --- Logout ---
document.getElementById('account-logout').addEventListener('click', () => {
  clearCustomerSession();
  showGuestView();
});

// --- Init: if a token is already saved, verify it and show the dashboard ---
document.addEventListener('DOMContentLoaded', () => {
  const token = getCustomerToken();
  if(!token){
    showGuestView();
    return;
  }

  fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => { if(!res.ok){ throw new Error('expired'); } return res.json(); })
    .then(customer => {
      localStorage.setItem('bogoland_customer', JSON.stringify(customer));
      showDashboardView(customer);
    })
    .catch(() => {
      clearCustomerSession();
      showGuestView();
    });
});
