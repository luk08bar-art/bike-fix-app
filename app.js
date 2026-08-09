// app.js – BikeFix Panel (Supabase integrated)
// ------------------------------------------------------------
// NOTE: Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.

/*** 1. INITIALIZATION ***/
document.addEventListener('DOMContentLoaded', async () => {
  // Supabase client
  const SUPABASE_URL = 'https://vrnarcpmttwnowolhxnw.supabase.co'; // actual URL
  const SUPABASE_ANON_KEY = 'sb_publishable_mDCab83XNSsH8A1dhlRXAQ_S_MYdkr7'; // public anon key
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Global state
  let orders = [];
  let usedOpinions = [];
  const MECHANIC_CODE = 'nowostandardowy19.18wis';

  // DOM references
  const loginForm = document.getElementById('login-form');
  const viewLogin = document.getElementById('view-login');
  const viewCustomer = document.getElementById('view-customer');
  const viewMechanic = document.getElementById('view-mechanic');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const accessCodeInput = document.getElementById('access-code'); // will be created later
  const errorMsg = document.getElementById('error-msg'); // will be created later

  // -----------------------------------------------------------------
  // 2. DATA LOADING (Orders & Used Opinions)
  // -----------------------------------------------------------------
  const loadOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
      console.error('Failed to load orders:', error);
      orders = [];
    } else {
      orders = data;
    }
  };

  const loadUsedOpinions = async () => {
    const { data, error } = await supabase.from('used_opinions').select('opinion');
    if (error) {
      console.error('Failed to load used opinions:', error);
      usedOpinions = [];
    } else {
      usedOpinions = data.map(row => row.opinion);
    }
  };

  await Promise.all([loadOrders(), loadUsedOpinions()]);

  // If no orders exist, you may seed demo data (optional)
  if (orders.length === 0) {
    // Example demo orders – you can keep or remove
    orders = [
      {
        id: crypto.randomUUID(),
        client_code: 'TOMEK123',
        client_name: 'Tomek Kowalski',
        bike_model: 'Trek Marlin 7 (Górski 29")',
        client_phone: '+48 600 100 200',
        date: new Date().toISOString().split('T')[0],
        status: 'W trakcie',
        tasks: [
          { name: 'Diagnoza napędu i układu hamulcowego', price: 50, done: true },
          { name: 'Wymiana łańcucha Shimano Deore 10s', price: 95, done: true },
          { name: 'Centrowanie tylnego koła 29"', price: 45, done: false },
          { name: 'Regulacja i smarowanie przerzutek', price: 35, done: false }
        ]
      },
      {
        id: crypto.randomUUID(),
        client_code: 'KASIA99',
        client_name: 'Katarzyna Nowak',
        bike_model: 'Specialized Sirrus (Cross)',
        client_phone: '+48 501 300 400',
        date: new Date().toISOString().split('T')[0],
        status: 'Gotowe',
        tasks: [
          { name: 'Przegląd posezonowy', price: 150, done: true },
          { name: 'Wymiana klocków hamulcowych V-Brake', price: 40, done: true }
        ]
      }
    ];
    // Upsert demo orders into Supabase
    await supabase.from('orders').upsert(orders);
  }

  // -----------------------------------------------------------------
  // 3. AUTHENTICATION LOGIC
  // -----------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailField = document.getElementById('login-email');
    const passwordField = document.getElementById('login-password');

    // If email/password fields exist → Supabase Auth flow
    if (emailField && passwordField) {
      const email = emailField.value.trim();
      const password = passwordField.value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        loginErrorMsg.textContent = 'Błędny e‑mail lub hasło.';
        loginErrorMsg.classList.remove('hidden');
        setTimeout(() => loginErrorMsg.classList.add('hidden'), 3000);
        return;
      }
      // Successful login – replace login UI with the original access‑code UI
      showCodeEntryUI();
      return;
    }
    // Fallback – should never happen because we always render the auth form first
    handleAccessCodeSubmit();
  });

  // -----------------------------------------------------------------
  // 4. UI HELPERS – Code entry UI after login
  // -----------------------------------------------------------------
  function showCodeEntryUI() {
    // Build the original access‑code form inside the placeholder div
    const placeholder = document.getElementById('code-entry-placeholder');
    placeholder.innerHTML = `
      <div class="input-group">
        <input type="text" id="access-code" placeholder="Wprowadź kod zlecenia (np. TOMEK123)" autocomplete="off" required>
      </div>
      <p id="error-msg" class="error-msg hidden">Nieprawidłowy kod zlecenia. Spróbuj ponownie.</p>
      <button type="submit" class="btn btn--primary" id="btn-submit-login">Sprawdź status</button>
    `;
    // Re‑attach submit handler for access‑code checking
    loginForm.removeEventListener('submit', handleAccessCodeSubmit);
    loginForm.addEventListener('submit', handleAccessCodeSubmit);
    // Switch view
    hideAllViews();
    viewLogin.classList.remove('hidden');
    triggerAnimations(viewLogin);
    // Update references to newly created elements
    accessCodeInput = document.getElementById('access-code');
    errorMsg = document.getElementById('error-msg');
  }

  function handleAccessCodeSubmit(e) {
    e.preventDefault();
    const code = accessCodeInput.value.trim().toUpperCase();
    if (code === MECHANIC_CODE.toUpperCase()) {
      hideAllViews();
      isMechanicView = true;
      renderMechanicOrders();
      viewMechanic.classList.remove('hidden');
      triggerAnimations(viewMechanic);
      return;
    }
    const order = orders.find(o => o.client_code === code);
    if (order) {
      order.view_count = (order.view_count || 0) + 1;
      saveOrders();
      hideAllViews();
      activeCustomerOrderCode = code;
      renderCustomerView(order);
      viewCustomer.classList.remove('hidden');
      triggerAnimations(viewCustomer);
    } else {
      showError();
    }
  }

  // -----------------------------------------------------------------
  // 5. ORDER PERSISTENCE (Supabase)
  // -----------------------------------------------------------------
  async function saveOrders() {
    const { error } = await supabase.from('orders').upsert(orders);
    if (error) console.error('Failed to save orders:', error);
  }

  // -----------------------------------------------------------------
  // 6. USED OPINIONS PERSISTENCE (Supabase)
  // -----------------------------------------------------------------
  async function addUsedOpinion(opinion) {
    // Guard against duplicates
    if (usedOpinions.includes(opinion)) return;
    const { error } = await supabase.from('used_opinions').insert({ opinion });
    if (!error) usedOpinions.push(opinion);
    if (error) console.error('Failed to store used opinion:', error);
  }

  // Example helper used elsewhere when generating reviews
  function generateThreeUniqueOpinions() {
    const pool = [
      'Profesjonalna obsługa, polecam! ',
      'Świetna jakość usług, naprawa szybka. ',
      'Super serwis, przyjazny personel. ',
      'Rower działa jak nowy po wizycie. ',
      'Bardzo dobra komunikacja i transparentność. '
    ];
    const selected = [];
    while (selected.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      const opinion = pool.splice(idx, 1)[0];
      if (!usedOpinions.includes(opinion)) {
        selected.push(opinion);
        // Persist instantly so other devices don't reuse it
        addUsedOpinion(opinion);
      }
    }
    return selected;
  }

  // -----------------------------------------------------------------
  // 7. COMMON UI FUNCTIONS (unchanged from original)
  // -----------------------------------------------------------------
  function hideAllViews() {
    viewLogin.classList.add('hidden');
    viewCustomer.classList.add('hidden');
    viewMechanic.classList.add('hidden');
    if (errorMsg) errorMsg.classList.add('hidden');
    if (accessCodeInput) accessCodeInput.value = '';
    activeCustomerOrderCode = null;
    isMechanicView = false;
  }

  function showError() {
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
      accessCodeInput.style.borderColor = '#ff3333';
      setTimeout(() => {
        errorMsg.classList.add('hidden');
        accessCodeInput.style.borderColor = '';
      }, 3000);
    }
  }

  function triggerAnimations(container) {
    const elements = container.querySelectorAll('.reveal');
    elements.forEach(el => {
      el.style.animation = 'none';
      // force reflow
      void el.offsetHeight;
      el.style.animation = null;
    });
  }

  // -----------------------------------------------------------------
  // 8. RENDERING LOGIC (customer & mechanic) – kept as‑is
  // -----------------------------------------------------------------
  // NOTE: All rendering functions from the original file are retained below.
  // They reference the global `orders` array which is now kept in sync with Supabase.

  // ... (existing rendering functions such as renderCustomerView, renderMechanicOrders, etc.)

  // For brevity, the rest of the original file (event handlers, modal logic,
  // task management, Fixik widget, etc.) remains unchanged. Ensure that any
  // place where `saveOrders()` was called now uses the async version defined
  // above (it returns a promise, but we deliberately ignore the result where
  // appropriate).

  // -----------------------------------------------------------------
  // 9. INITIAL UI STATE
  // -----------------------------------------------------------------
  // At start we show the login/auth screen.
  hideAllViews();
  viewLogin.classList.remove('hidden');
  triggerAnimations(viewLogin);
});

// End of app.js – all other helper functions from the original implementation
// should be copied below unchanged (e.g., generateSecureCode, setRandomPlaceholder,
// opinion generation utilities, modal management, Fixik widget, etc.).
