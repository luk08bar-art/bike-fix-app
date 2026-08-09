// app.js – BikeFix SPA without email/password auth

/*** 1. SUPABASE CONFIGURATION ***/
const SUPABASE_URL = 'https://vrnarcpmttwnowolhxnw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mDCab83XNSsH8A1dhlRXAQ_S_MYdkr7'; // public anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*** 2. GLOBAL STATE ***/
let orders = [];          // fetched orders from Supabase
let usedOpinions = [];    // fetched used_opinions from Supabase
const MECHANIC_CODE = 'nowostandardowy19.18wis'; // special mechanic access code

/*** 3. VIEW HELPERS ***/
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

/*** 4. DATA ACCESS ***/
async function loadOrders() {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Error loading orders:', error);
    orders = [];
  } else {
    orders = data;
  }
}

async function loadUsedOpinions() {
  const { data, error } = await supabase.from('used_opinions').select('opinion');
  if (error) {
    console.error('Error loading used opinions:', error);
    usedOpinions = [];
  } else {
    usedOpinions = data.map(r => r.opinion);
  }
}

async function loadAllData() {
  await Promise.all([loadOrders(), loadUsedOpinions()]);
}

/*** 5. CRUD HELPERS FOR ORDERS ***/
async function addOrder(code) {
  const { error } = await supabase.from('orders').insert({ clientCode: code, status: 'Diagnoza' });
  if (error) console.error('addOrder error:', error);
}

async function updateOrderStatus(id, newStatus) {
  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
  if (error) console.error('updateOrderStatus error:', error);
}

async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) console.error('deleteOrder error:', error);
}

/*** 6. USED OPINIONS ***/
async function addUsedOpinion(opinion) {
  if (usedOpinions.includes(opinion)) return;
  const { error } = await supabase.from('used_opinions').insert({ opinion });
  if (!error) usedOpinions.push(opinion);
}

/*** 7. RENDER CUSTOMER VIEW ***/
function renderCustomerView(clientCode) {
  switchView('view-customer');
  const container = document.getElementById('view-customer');
  const clientOrders = orders.filter(o => (o.clientCode || o.order_code) && (o.clientCode || o.order_code).toUpperCase() === clientCode.toUpperCase());

  container.innerHTML = `
    <h2>Twoje zamówienia</h2>
    <ul id="order-list">
      ${clientOrders.map(o => `<li>${o.clientCode || o.order_code} – ${o.status}</li>`).join('')}
    </ul>
    <form id="new-order-form">
      <div class="input-group">
        <input type="text" id="new-order-code" placeholder="Nowy kod zamówienia" required>
      </div>
      <button type="submit" class="btn btn--primary">Dodaj zamówienie</button>
    </form>
  `;

  document.getElementById('new-order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const code = document.getElementById('new-order-code').value.trim();
    if (code) {
      await addOrder(code);
      await loadOrders();
      renderCustomerView(clientCode);
    }
  });
}

/*** 8. RENDER MECHANIC VIEW ***/
function renderMechanicView() {
  switchView('view-mechanic');
  const container = document.getElementById('view-mechanic');
  container.innerHTML = `
    <h2>Zlecenia serwisanta</h2>
    <table id="orders-table">
      <thead>
        <tr><th>Kod</th><th>Status</th><th>Akcje</th></tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr data-id="${o.id}">
            <td>${o.clientCode || o.order_code}</td>
            <td class="status">${o.status}</td>
            <td>
              <button class="btn btn--secondary fix-button">Fixika</button>
              <button class="btn btn--danger delete-button">Usuń</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
    <form id="new-order-form">
      <div class="input-group">
        <input type="text" id="new-order-code" placeholder="Nowy kod zamówienia" required>
      </div>
      <button type="submit" class="btn btn--primary">Dodaj zamówienie</button>
    </form>
  `;

  // Fixika button – placeholder for real Fixik widget logic
  container.querySelectorAll('.fix-button').forEach(btn => {
    btn.addEventListener('click', async e => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      await updateOrderStatus(id, 'Gotowe');
      await loadOrders();
      renderMechanicView();
    });
  });

  // Delete button
  container.querySelectorAll('.delete-button').forEach(btn => {
    btn.addEventListener('click', async e => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      await deleteOrder(id);
      await loadOrders();
      renderMechanicView();
    });
  });

  // New order form handling
  container.querySelector('#new-order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const code = container.querySelector('#new-order-code').value.trim();
    if (code) {
      await addOrder(code);
      await loadOrders();
      renderMechanicView();
    }
  });
}

/*** 9. INITIAL CODE ENTRY UI ***/
function showCodeEntry() {
  // Replace the login view content with a single code entry form
  const loginSection = document.getElementById('view-login');
  loginSection.innerHTML = `
    <div class="code-entry-box reveal anim-up">
      <h2>Wprowadź kod</h2>
      <form id="code-form">
        <div class="input-group">
          <input type="text" id="access-code" placeholder="Kod klienta lub serwisanta" autocomplete="off" required>
        </div>
        <button type="submit" class="btn btn--primary">Sprawdź</button>
        <p id="code-error-msg" class="error-msg hidden">Niepoprawny kod.</p>
      </form>
    </div>
  `;
  switchView('view-login');

  document.getElementById('code-form').addEventListener('submit', async e => {
    e.preventDefault();
    const code = document.getElementById('access-code').value.trim();
    if (!code) {
      document.getElementById('code-error-msg').classList.remove('hidden');
      return;
    }
    if (code === MECHANIC_CODE) {
      await loadAllData();
      renderMechanicView();
    } else {
      await loadAllData();
      renderCustomerView(code);
    }
  });
}

/*** 10. STARTUP ***/
document.addEventListener('DOMContentLoaded', async () => {
  // Immediately show the code entry field – no email/password auth required
  showCodeEntry();
});
