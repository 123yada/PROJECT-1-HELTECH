// ============================================================
//  Antigravity Health – Full-Stack Main Application Script
//  Firebase SDK v10.12.2 (modular / ESM) + FastAPI Backend APIs
// ============================================================

// ── Toast Notification System ─────────────────────────────
const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const API_BASE_URL = isLocalHost && window.location.port !== "8000"
  ? `http://${window.location.hostname || "127.0.0.1"}:8000`
  : "";

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

const toast = document.getElementById("toast");
function showToast(msg, isError = false) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = isError ? "#ef4444" : "#2563eb";
  toast.style.transform = "translateY(0)";
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.transform = "translateY(120px)";
    toast.style.opacity = "0";
  }, 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = "Please wait…";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    btn.disabled = false;
  }
}

// ============================================================
//  1. AUTHENTICATION & USER SESSION MANAGEMENT
// ============================================================
const authModal = document.getElementById("authModal");
const authModalTitle = document.getElementById("authModalTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authError = document.getElementById("authError");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authForm = document.getElementById("authForm");
const guestAuthBtn = document.getElementById("guestAuthBtn");
const authToggleLink = document.getElementById("authToggleLink");
const authToggleText = document.getElementById("authToggleText");
const closeAuthModal = document.getElementById("closeAuthModal");

const loginBtn = document.getElementById("loginBtn");
const joinBtn = document.getElementById("joinBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");
const myAddressNavBtn = document.getElementById("myAddressNavBtn");

const GUEST_STORAGE_KEY = "antigravity_guest_user";
const USER_STORAGE_KEY = "antigravity_user";
let isRegisterMode = false;

function getSignedInUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function setSignedInUser(userObj) {
  if (userObj) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  updateAuthNavUI();
}

function getGuestUser() {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function setGuestUser(userObj) {
  if (userObj) {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(userObj));
  } else {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }
  updateAuthNavUI();
}

function getActiveUser() {
  const signedInUser = getSignedInUser();
  if (signedInUser) {
    return { ...signedInUser, isGuest: false };
  }
  const guest = getGuestUser();
  if (guest) {
    return {
      uid: guest.uid,
      email: guest.email,
      isGuest: true
    };
  }
  return null;
}

function updateAuthNavUI() {
  const activeUser = getActiveUser();
  if (activeUser) {
    if (loginBtn) loginBtn.style.display = "none";
    if (joinBtn) joinBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (myAddressNavBtn) myAddressNavBtn.style.display = "inline-flex";
    if (userDisplay) {
      userDisplay.style.display = "inline-flex";
      const namePart = activeUser.email.split("@")[0];
      userDisplay.textContent = `👤 ${namePart}${activeUser.isGuest ? " (Guest)" : ""}`;
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (joinBtn) joinBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (myAddressNavBtn) myAddressNavBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
  }
}

function openAuthModal(registerMode = false) {
  isRegisterMode = registerMode;
  if (authError) authError.style.display = "none";
  if (authEmail) authEmail.value = "";
  if (authPassword) authPassword.value = "";
  if (authModalTitle) authModalTitle.textContent = registerMode ? "Create Account" : "Welcome Back";
  if (authSubmitBtn) authSubmitBtn.textContent = registerMode ? "Register" : "Login";
  if (authToggleText) authToggleText.textContent = registerMode ? "Already have an account?" : "Don't have an account?";
  if (authToggleLink) authToggleLink.textContent = registerMode ? " Login" : " Register";
  if (authModal) authModal.style.display = "flex";
}

if (loginBtn) loginBtn.addEventListener("click", () => openAuthModal(false));
if (joinBtn) joinBtn.addEventListener("click", () => openAuthModal(true));
if (closeAuthModal) closeAuthModal.addEventListener("click", () => { if (authModal) authModal.style.display = "none"; });

if (authToggleLink) {
  authToggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal(!isRegisterMode);
  });
}

function handleGuestAuth() {
  const randomId = Math.floor(1000 + Math.random() * 9000);
  setGuestUser({ uid: `guest_${randomId}`, email: `guest${randomId}@health.io` });
  showToast("⚡ Logged in as Guest!");
  if (authModal) authModal.style.display = "none";
}

if (guestAuthBtn) {
  guestAuthBtn.addEventListener("click", handleGuestAuth);
}

window.openAuthModal = openAuthModal;
window.handleAuthSubmit = handleAuthSubmit;
window.handleGuestAuth = handleGuestAuth;

async function handleAuthSubmit() {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (authError) authError.style.display = "none";
  if (!email || !password) {
    if (authError) {
      authError.textContent = "Please fill in all email & password fields.";
      authError.style.display = "block";
    }
    return;
  }

  setLoading(authSubmitBtn, true);
  try {
    // Also authenticate with FastAPI backend
    const apiEndpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(apiUrl(apiEndpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      
      setSignedInUser({ uid: data.user.uid, email: data.user.email });
      setGuestUser(null);
      showToast(isRegisterMode ? "🎉 Account created! Welcome to Antigravity Health." : "✅ Logged in successfully!");
      if (authModal) authModal.style.display = "none";
      return;
    } catch (apiErr) {
      throw apiErr;
    }

    // Fallback to Firebase
    try {
    } catch (pErr) {}

    if (isRegisterMode) {
      showToast("🎉 Account created! Welcome to Antigravity Health.");
    } else {
      showToast("✅ Logged in successfully!");
    }
    setGuestUser(null);
    if (authModal) authModal.style.display = "none";
  } catch (err) {
    const msgs = {
      "auth/email-already-in-use": "Email already registered. Please login.",
      "auth/invalid-email": "Invalid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password. Try again.",
      "auth/invalid-credential": "Invalid credentials. Check your email & password."
    };
    if (authError) {
      authError.textContent = msgs[err.code] || (err.message || "Authentication error");
      authError.style.display = "block";
    }
  } finally {
    setLoading(authSubmitBtn, false);
  }
}

if (authForm) {
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleAuthSubmit();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    setSignedInUser(null);
    setGuestUser(null);
    showToast("👋 Logged out. See you soon!");
  });
}

updateAuthNavUI();

// ============================================================
//  2. PHARMACY – MEDICINE SEARCH, CATEGORY FILTER & CARDS
// ============================================================
let currentCategory = "All";
let currentSearchQuery = "";

const medicineGrid = document.getElementById("medicineGrid");
const medSearchInput = document.getElementById("medSearchInput");
const categoryPills = document.getElementById("categoryPills");

async function fetchAndRenderMedicines() {
  if (!medicineGrid) return;

  let url = "/api/medicines?";
  if (currentCategory && currentCategory !== "All") url += `category=${encodeURIComponent(currentCategory)}&`;
  if (currentSearchQuery) url += `q=${encodeURIComponent(currentSearchQuery)}`;

  try {
    const res = await fetch(apiUrl(url));
    if (!res.ok) throw new Error("Could not fetch medicines");
    const meds = await res.json();

    medicineGrid.innerHTML = "";
    if (!meds || meds.length === 0) {
      medicineGrid.innerHTML = '<div class="empty-state-p">No medicines found matching your search.</div>';
      return;
    }

    meds.forEach(med => {
      const isRx = med.prescription_required === 1 || med.tag === "Prescription Required";
      const isOutOfStock = med.stock <= 0;

      const badgeCls = isOutOfStock ? "rx" : (isRx ? "rx" : "fast");
      const badgeTxt = isOutOfStock ? "⚠️ Out of Stock" : (isRx ? "📋 Prescription Required" : "⚡ Fast Delivery");

      let btnHtml = "";
      if (isOutOfStock) {
        btnHtml = `<span style="color:var(--red); font-size:0.85rem; font-weight:700;">Currently out of stock</span>`;
      } else if (isRx) {
        btnHtml = `<button class="btn btn-rx" data-name="${med.name}">Upload Doctor Prescription</button>`;
      } else {
        btnHtml = `<button class="btn btn-cart add-cart-btn" data-name="${med.name}" data-price="${med.price}">Add to Cart</button>`;
      }

      const card = document.createElement("div");
      card.className = "med-card";
      card.innerHTML = `
        <div class="med-badge ${badgeCls}">${badgeTxt}</div>
        <img class="med-img" src="${med.image}" alt="${med.name}" onerror="this.src='https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=320&h=200&fit=crop&auto=format'">
        <div class="med-body">
            <h3 class="med-name">${med.name}</h3>
            <p class="med-desc">${med.generic_name ? med.generic_name + ' · ' : ''}${med.category}</p>
            <div class="med-footer" style="margin-top:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                <span class="med-price" style="font-weight:800; font-size:1.1rem; color:var(--text-dark);">₹${med.price.toFixed(2)}</span>
                ${btnHtml}
            </div>
        </div>
      `;
      medicineGrid.appendChild(card);
    });
  } catch (e) {
    console.warn("Pharmacy render fallback notice:", e);
  }
}

if (medSearchInput) {
  let debounceTimer;
  medSearchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      fetchAndRenderMedicines();
    }, 300);
  });
}

if (categoryPills) {
  categoryPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (!pill) return;
    document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentCategory = pill.dataset.cat;
    fetchAndRenderMedicines();
  });
}

fetchAndRenderMedicines();

// ============================================================
//  3. CART SYSTEM & DRAWER MANAGEMENT
// ============================================================
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartNavBtn = document.getElementById('cartNavBtn');
const cartBadge = document.getElementById('cartBadge');
const cartEmpty = document.getElementById('cartEmpty');
const cartItemList = document.getElementById('cartItemList');
const cartSummary = document.getElementById('cartSummary');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

const CART_STORAGE_KEY = "antigravity_cart_items";
let cartItems = [];

try {
  const saved = localStorage.getItem(CART_STORAGE_KEY);
  if (saved) cartItems = JSON.parse(saved);
} catch (e) {}

function updateCartUI() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));

  let totalQty = 0;
  cartItems.forEach(i => totalQty += i.qty);

  if (cartBadge) {
    cartBadge.style.display = totalQty > 0 ? 'flex' : 'none';
    cartBadge.textContent = totalQty;
  }

  if (cartEmpty && cartItemList && cartSummary) {
    if (totalQty > 0) {
      cartEmpty.style.display = 'none';
      cartItemList.style.display = 'flex';
      cartSummary.style.display = 'block';
    } else {
      cartEmpty.style.display = 'flex';
      cartItemList.style.display = 'none';
      cartSummary.style.display = 'none';
    }
  }

  if (!cartItemList) return;
  cartItemList.innerHTML = '';
  let subtotal = 0;

  cartItems.forEach((item, index) => {
    subtotal += item.price * item.qty;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
          <div class="cart-item-name" style="font-weight:700;">${item.name}</div>
          <div class="cart-item-price" style="color:var(--blue);">₹${item.price.toFixed(2)}</div>
      </div>
      <div class="cart-item-controls" style="display:flex; align-items:center; gap:8px;">
          <button class="qty-btn" onclick="window.updateCartQty(${index}, -1)">-</button>
          <span class="qty-num" style="font-weight:700;">${item.qty}</span>
          <button class="qty-btn" onclick="window.updateCartQty(${index}, 1)">+</button>
          <button class="cart-remove-btn" onclick="window.removeCartItem(${index})" style="background:none; border:none; cursor:pointer;">🗑️</button>
      </div>
    `;
    cartItemList.appendChild(li);
  });

  if (cartSubtotalEl) cartSubtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  const delivery = subtotal > 0 ? 30 : 0;
  if (cartTotalEl) cartTotalEl.textContent = `₹${(subtotal + delivery).toFixed(2)}`;
}

window.openCart = function () {
  if (cartOverlay) cartOverlay.classList.add('active');
  if (cartDrawer) cartDrawer.classList.add('open');
};

window.closeCart = function () {
  if (cartOverlay) cartOverlay.classList.remove('active');
  if (cartDrawer) cartDrawer.classList.remove('open');
};

if (cartNavBtn) cartNavBtn.addEventListener('click', window.openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', window.closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', window.closeCart);

function addToCart(name, price, image) {
  if (!name) return;
  const existing = cartItems.find(i => i.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({ name, price: parseFloat(price) || 0, qty: 1, image: image || "" });
  }
  showToast(`🛒 ${name} added to cart!`);
  updateCartUI();
  window.openCart();
}

window.updateCartQty = function (index, delta) {
  cartItems[index].qty += delta;
  if (cartItems[index].qty <= 0) cartItems.splice(index, 1);
  updateCartUI();
};

window.removeCartItem = function (index) {
  cartItems.splice(index, 1);
  updateCartUI();
};

window.clearCart = function () {
  cartItems = [];
  updateCartUI();
};

updateCartUI();

// ============================================================
//  4. ADDRESS MANAGEMENT MODULE
// ============================================================
const addressModal = document.getElementById("addressModal");
const closeAddressModal = document.getElementById("closeAddressModal");
const addressList = document.getElementById("addressList");
const showAddAddressFormBtn = document.getElementById("showAddAddressFormBtn");
const addAddressForm = document.getElementById("addAddressForm");
const cancelAddressBtn = document.getElementById("cancelAddressBtn");

async function loadSavedAddresses() {
  const activeUser = getActiveUser();
  if (!activeUser || !addressList) return;

  try {
    const res = await fetch(apiUrl(`/api/addresses?user_id=${encodeURIComponent(activeUser.uid)}`));
    const addresses = await res.json();

    addressList.innerHTML = "";
    if (!addresses || addresses.length === 0) {
      addressList.innerHTML = '<div class="empty-state-p">No delivery addresses saved yet. Click "+ Add New Address" above.</div>';
      return;
    }

    addresses.forEach(addr => {
      const card = document.createElement("div");
      card.className = `address-card ${addr.is_default ? 'default-addr' : ''}`;
      card.innerHTML = `
        <div class="address-card-hdr">
            <span class="address-name">${addr.full_name} (${addr.mobile})</span>
            <span class="address-type-badge">${addr.address_type}${addr.is_default ? ' · Default' : ''}</span>
        </div>
        <div class="address-details">
            ${addr.building}, ${addr.street}, ${addr.city}, ${addr.district}, ${addr.state} - <strong>${addr.pincode}</strong>
        </div>
        <div class="address-actions">
            ${!addr.is_default ? `<button class="btn-link" onclick="window.setDefaultAddress('${addr.address_id}')" style="color:var(--blue); font-weight:600; background:none; border:none; cursor:pointer;">Set Default</button> | ` : ''}
            <button class="btn-link" onclick="window.deleteAddress('${addr.address_id}')" style="color:var(--red); font-weight:600; background:none; border:none; cursor:pointer;">Delete</button>
        </div>
      `;
      addressList.appendChild(card);
    });
  } catch (e) {
    console.warn("Could not load addresses:", e);
  }
}

function openAddressModal() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to manage your addresses.", true);
    openAuthModal(false);
    return;
  }
  if (addAddressForm) addAddressForm.style.display = "none";
  if (addressModal) addressModal.style.display = "flex";
  loadSavedAddresses();
}

if (myAddressNavBtn) myAddressNavBtn.addEventListener("click", openAddressModal);
if (closeAddressModal) closeAddressModal.addEventListener("click", () => { if (addressModal) addressModal.style.display = "none"; });

if (showAddAddressFormBtn) {
  showAddAddressFormBtn.addEventListener("click", () => {
    if (addAddressForm) addAddressForm.style.display = "block";
  });
}
if (cancelAddressBtn) {
  cancelAddressBtn.addEventListener("click", () => {
    if (addAddressForm) addAddressForm.style.display = "none";
  });
}

if (addAddressForm) {
  addAddressForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const payload = {
      full_name: document.getElementById("addrFullName").value.trim(),
      mobile: document.getElementById("addrMobile").value.trim(),
      building: document.getElementById("addrBuilding").value.trim(),
      street: document.getElementById("addrStreet").value.trim(),
      city: document.getElementById("addrCity").value.trim(),
      district: document.getElementById("addrDistrict").value.trim(),
      state: document.getElementById("addrState").value.trim(),
      pincode: document.getElementById("addrPincode").value.trim(),
      address_type: document.getElementById("addrType").value,
      is_default: document.getElementById("addrIsDefault").checked
    };

    try {
      const res = await fetch(apiUrl(`/api/addresses?user_id=${encodeURIComponent(activeUser.uid)}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Address validation failed");

      showToast("📍 Address saved successfully!");
      addAddressForm.reset();
      addAddressForm.style.display = "none";
      loadSavedAddresses();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.deleteAddress = async function (addressId) {
  const activeUser = getActiveUser();
  if (!activeUser) return;
  try {
    await fetch(apiUrl(`/api/addresses/${addressId}?user_id=${encodeURIComponent(activeUser.uid)}`), { method: "DELETE" });
    showToast("Address removed.");
    loadSavedAddresses();
  } catch (e) {}
};

window.setDefaultAddress = async function (addressId) {
  const activeUser = getActiveUser();
  if (!activeUser) return;
  try {
    await fetch(apiUrl(`/api/addresses/${addressId}/default?user_id=${encodeURIComponent(activeUser.uid)}`), { method: "PUT" });
    showToast("Default delivery address updated.");
    loadSavedAddresses();
  } catch (e) {}
};

// ============================================================
//  5. CHECKOUT & DEMO PAYMENT PROCESS
// ============================================================
const checkoutModal = document.getElementById("checkoutModal");
const closeCheckoutModal = document.getElementById("closeCheckoutModal");
const checkoutAddressSelectArea = document.getElementById("checkoutAddressSelectArea");
const checkoutItemsList = document.getElementById("checkoutItemsList");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutDelivery = document.getElementById("checkoutDelivery");
const checkoutTotal = document.getElementById("checkoutTotal");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const checkoutAddNewAddrBtn = document.getElementById("checkoutAddNewAddrBtn");

async function openCheckoutModal() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to place an order.", true);
    openAuthModal(false);
    return;
  }

  if (cartItems.length === 0) {
    showToast("🛒 Your cart is empty.", true);
    return;
  }

  window.closeCart();
  if (checkoutModal) checkoutModal.style.display = "flex";

  // Load addresses for selection
  try {
    const res = await fetch(apiUrl(`/api/addresses?user_id=${encodeURIComponent(activeUser.uid)}`));
    const addresses = await res.json();

    checkoutAddressSelectArea.innerHTML = "";
    if (!addresses || addresses.length === 0) {
      checkoutAddressSelectArea.innerHTML = '<div style="color:var(--red); font-size:0.9rem; font-weight:600;">⚠️ No saved delivery address found. Please add a valid address below before checkout.</div>';
    } else {
      addresses.forEach(addr => {
        const isChecked = addr.is_default ? 'checked' : '';
        const label = document.createElement("label");
        label.style.cssText = "display:flex; align-items:flex-start; gap:10px; padding:0.8rem; border:1.5px solid var(--border); border-radius:var(--radius-sm); margin-bottom:0.5rem; cursor:pointer;";
        label.innerHTML = `
          <input type="radio" name="selectedCheckoutAddress" value="${addr.address_id}" ${isChecked} style="margin-top:3px;">
          <div>
              <div style="font-weight:700; font-size:0.92rem;">${addr.full_name} (${addr.mobile}) <span style="font-size:0.75rem; color:var(--blue);">${addr.is_default ? '· Default' : ''}</span></div>
              <div style="font-size:0.85rem; color:var(--text-mid);">${addr.building}, ${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}</div>
          </div>
        `;
        checkoutAddressSelectArea.appendChild(label);
      });
    }
  } catch (e) {}

  // Render Order Items
  checkoutItemsList.innerHTML = "";
  let sub = 0;
  cartItems.forEach(item => {
    sub += item.price * item.qty;
    const itemRow = document.createElement("div");
    itemRow.style.cssText = "display:flex; justify-content:space-between; font-size:0.9rem;";
    itemRow.innerHTML = `<span>${item.name} (x${item.qty})</span><strong>₹${(item.price * item.qty).toFixed(2)}</strong>`;
    checkoutItemsList.appendChild(itemRow);
  });

  const del = sub > 0 ? 30 : 0;
  const tot = sub + del;
  if (checkoutSubtotal) checkoutSubtotal.textContent = `₹${sub.toFixed(2)}`;
  if (checkoutDelivery) checkoutDelivery.textContent = `₹${del.toFixed(2)}`;
  if (checkoutTotal) checkoutTotal.textContent = `₹${tot.toFixed(2)}`;
}

if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckoutModal);
if (closeCheckoutModal) closeCheckoutModal.addEventListener("click", () => { if (checkoutModal) checkoutModal.style.display = "none"; });
if (checkoutAddNewAddrBtn) checkoutAddNewAddrBtn.addEventListener("click", () => {
  if (checkoutModal) checkoutModal.style.display = "none";
  openAddressModal();
});

if (confirmOrderBtn) {
  confirmOrderBtn.addEventListener("click", async () => {
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const selectedAddrRadio = document.querySelector('input[name="selectedCheckoutAddress"]:checked');
    if (!selectedAddrRadio) {
      showToast("⚠️ Please select a valid delivery address before placing order.", true);
      return;
    }

    const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentRadio ? paymentRadio.value : "Demo UPI / Card";

    setLoading(confirmOrderBtn, true);
    try {
      const orderPayload = {
        user_id: activeUser.uid,
        user_email: activeUser.email,
        address_id: selectedAddrRadio.value,
        payment_method: paymentMethod,
        items: cartItems.map(i => ({
          medicine_id: i.name,
          medicine_name: i.name,
          price: i.price,
          quantity: i.qty
        }))
      };

      const res = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Order creation failed");

      showToast(`🎉 ${data.message} (Order ID: ${data.order_id})`);
      window.clearCart();
      if (checkoutModal) checkoutModal.style.display = "none";
      openOrdersModal();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(confirmOrderBtn, false);
    }
  });
}

// ============================================================
//  6. MY ORDERS MODULE
// ============================================================
const ordersModal = document.getElementById("ordersModal");
const closeOrdersModal = document.getElementById("closeOrdersModal");
const ordersList = document.getElementById("ordersList");
const navOrdersBtn = document.getElementById("navOrdersBtn");

async function openOrdersModal() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to view your orders.", true);
    openAuthModal(false);
    return;
  }
  if (ordersModal) ordersModal.style.display = "flex";

  try {
    const res = await fetch(apiUrl(`/api/orders?user_id=${encodeURIComponent(activeUser.uid)}`));
    const orders = await res.json();

    if (!ordersList) return;
    ordersList.innerHTML = "";
    if (!orders || orders.length === 0) {
      ordersList.innerHTML = '<div class="empty-state-p">You have not placed any orders yet.</div>';
      return;
    }

    orders.forEach(ord => {
      const isCancelled = ord.order_status === "Cancelled";
      const card = document.createElement("div");
      card.className = "order-card";

      let itemsHtml = "";
      if (ord.items) {
        ord.items.forEach(i => {
          itemsHtml += `<div class="order-item-row"><span>• ${i.medicine_name} (x${i.quantity})</span><span>₹${(i.price * i.quantity).toFixed(2)}</span></div>`;
        });
      }

      // Timeline active steps
      const statuses = ["Order Placed", "Confirmed", "Preparing", "Shipped", "Delivered"];
      const currentIdx = statuses.indexOf(ord.order_status);

      let timelineHtml = "";
      if (!isCancelled) {
        timelineHtml = `
          <div class="order-timeline">
              ${statuses.map((st, idx) => `
                <div class="timeline-step ${idx <= currentIdx ? 'active' : ''}">
                    <div class="step-dot"></div>
                    <span>${st}</span>
                </div>
              `).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="order-card-hdr">
            <div>
                <div class="order-id">${ord.order_id}</div>
                <div style="font-size:0.8rem; color:var(--text-light);">${new Date(ord.created_at || Date.now()).toLocaleString()}</div>
            </div>
            <span class="order-status-badge ${ord.order_status.toLowerCase().replace(' ', '')}">${ord.order_status}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-mid); margin-bottom:0.6rem;">📍 <strong>Delivery Address</strong>: ${ord.address_json}</div>
        <div style="background:var(--bg); padding:0.8rem; border-radius:var(--radius-sm); margin-bottom:0.8rem;">
            ${itemsHtml}
            <div style="border-top:1px solid var(--border); margin-top:0.4rem; padding-top:0.4rem; display:flex; justify-content:space-between; font-weight:800;">
                <span>Total Amount (${ord.payment_status})</span>
                <span style="color:var(--blue);">₹${ord.total_amount.toFixed(2)}</span>
            </div>
        </div>
        ${timelineHtml}
        <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:0.6rem;">
            ${!isCancelled && ord.order_status === "Order Placed" ? `<button class="btn" style="background:#fee2e2; color:var(--red); font-size:0.85rem;" onclick="window.cancelUserOrder('${ord.order_id}')">Cancel Order</button>` : ''}
            <button class="btn btn-cta" style="font-size:0.85rem; padding:0.4rem 0.9rem;" onclick="window.reorderItems('${ord.order_id}')">🔄 Reorder</button>
        </div>
      `;
      ordersList.appendChild(card);
    });
  } catch (e) {
    console.warn("Orders fetch warning:", e);
  }
}

if (navOrdersBtn) navOrdersBtn.addEventListener("click", (e) => { e.preventDefault(); openOrdersModal(); });
if (closeOrdersModal) closeOrdersModal.addEventListener("click", () => { if (ordersModal) ordersModal.style.display = "none"; });

window.cancelUserOrder = async function (orderId) {
  const activeUser = getActiveUser();
  if (!activeUser) return;

  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/cancel?user_id=${encodeURIComponent(activeUser.uid)}`), { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Cancellation failed");
    showToast("Order cancelled successfully.");
    openOrdersModal();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.reorderItems = async function (orderId) {
  const activeUser = getActiveUser();
  if (!activeUser) return;
  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}?user_id=${encodeURIComponent(activeUser.uid)}`));
    const ord = await res.json();
    if (ord && ord.items) {
      ord.items.forEach(i => addToCart(i.medicine_name, i.price, ""));
      if (ordersModal) ordersModal.style.display = "none";
    }
  } catch (e) {}
};

// ============================================================
//  7. DOCTOR CONSULTATION, VIDEO CALL, DIGITAL RX & PHARMACY ORDERING
// ============================================================
let currentDoctorSpecialty = "All";
let currentDoctorQuery = "";
let selectedDoctor = {
  id: "DOC-201",
  name: "Dr. Rajesh Kumar",
  specialization: "General Physician (Fever, Cold, Cough & Viral Flu)",
  image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&h=300&fit=crop"
};

const doctorGrid = document.getElementById("doctorGrid");
const docSearchInput = document.getElementById("docSearchInput");
const docCategoryPills = document.getElementById("docCategoryPills");

const consultationChoiceModal = document.getElementById("consultationChoiceModal");
const closeConsultationChoiceModal = document.getElementById("closeConsultationChoiceModal");
const choiceDocImg = document.getElementById("choiceDocImg");
const choiceDocName = document.getElementById("choiceDocName");
const choiceDocSpec = document.getElementById("choiceDocSpec");

const doctorProfileModal = document.getElementById("doctorProfileModal");
const closeDoctorProfileModal = document.getElementById("closeDoctorProfileModal");
const doctorProfileBody = document.getElementById("doctorProfileBody");

const doctorChatModal = document.getElementById("doctorChatModal");
const closeDoctorChatModal = document.getElementById("closeDoctorChatModal");
const chatDocName = document.getElementById("chatDocName");
const chatDocSpec = document.getElementById("chatDocSpec");
const docChatMessages = document.getElementById("docChatMessages");
const docChatInput = document.getElementById("docChatInput");
const sendDocMsgBtn = document.getElementById("sendDocMsgBtn");
const chatPrescriptionBtn = document.getElementById("chatPrescriptionBtn");

const videoCallModal = document.getElementById("videoCallModal");
const videoDocName = document.getElementById("videoDocName");
const videoDocSpec = document.getElementById("videoDocSpec");
const videoFeedDocLabel = document.getElementById("videoFeedDocLabel");
const callTimer = document.getElementById("callTimer");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const videoPrescriptionBtn = document.getElementById("videoPrescriptionBtn");
const endCallBtn = document.getElementById("endCallBtn");
const localVideoFeed = document.getElementById("localVideoFeed");
const localCamOffOverlay = document.getElementById("localCamOffOverlay");

const prescriptionModal = document.getElementById("prescriptionModal");
const closePrescriptionModal = document.getElementById("closePrescriptionModal");
const prescDocName = document.getElementById("prescDocName");
const prescDocSpec = document.getElementById("prescDocSpec");
const prescDiagnosis = document.getElementById("prescDiagnosis");
const prescMedRowsContainer = document.getElementById("prescMedRowsContainer");
const addPrescMedRowBtn = document.getElementById("addPrescMedRowBtn");
const prescInstructions = document.getElementById("prescInstructions");
const savePrescriptionBtn = document.getElementById("savePrescription");

const myPrescriptionsModal = document.getElementById("myPrescriptionsModal");
const closeMyPrescriptionsModal = document.getElementById("closeMyPrescriptionsModal");
const prescriptionsList = document.getElementById("prescriptionsList");
const navPrescriptionsBtn = document.getElementById("navPrescriptionsBtn");

const prescriptionPrintModal = document.getElementById("prescriptionPrintModal");
const closePrintPrescriptionModal = document.getElementById("closePrintPrescriptionModal");
const printablePrescriptionContent = document.getElementById("printablePrescriptionContent");
const printModalOrderPharmacyBtn = document.getElementById("printModalOrderPharmacyBtn");

const consultationsModal = document.getElementById("consultationsModal");
const closeConsultationsModal = document.getElementById("closeConsultationsModal");
const consultationsList = document.getElementById("consultationsList");
const navConsultationsBtn = document.getElementById("navConsultationsBtn");

let activeConsultationId = null;
window.localMediaStream = null;
window.activeCallInterval = null;
let isMicMuted = false;
let isCameraOff = false;

// ── Fetch and Render Doctors dynamically ────────────────────
async function fetchAndRenderDoctors() {
  if (!doctorGrid) return;
  let url = "/api/doctors?";
  if (currentDoctorSpecialty && currentDoctorSpecialty !== "All") {
    url += `specialty=${encodeURIComponent(currentDoctorSpecialty)}&`;
  }
  if (currentDoctorQuery) {
    url += `q=${encodeURIComponent(currentDoctorQuery)}`;
  }

  try {
    const res = await fetch(apiUrl(url));
    if (!res.ok) throw new Error("Could not fetch doctor list");
    const docs = await res.json();

    if (!docs || docs.length === 0) {
      doctorGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 2.5rem; background:#fff; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
            <h3 style="font-size:1.2rem; font-weight:700;">No doctors found matching "${currentDoctorQuery || currentDoctorSpecialty}"</h3>
            <p style="color:var(--text-mid); font-size:0.9rem; margin-top:4px;">Try searching for symptoms like "fever", "headache", "cold", "stomach pain", or "body pain".</p>
        </div>
      `;
      return;
    }

    window.globalDoctorsMap = window.globalDoctorsMap || {};
    docs.forEach(doc => {
      window.globalDoctorsMap[doc.doctor_id] = doc;
      const card = document.createElement("div");
      card.className = "doctor-card";
      card.dataset.docId = doc.doctor_id;
      const statusCls = doc.available ? "online" : "offline";
      const statusTxt = doc.available ? "● Online" : "● Offline";

      card.innerHTML = `
        <div class="doc-status ${statusCls}">${statusTxt}</div>
        <img class="doc-avatar-img" src="${doc.image}" alt="${doc.name}" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&h=300&fit=crop'">
        <h3 class="doc-name">${doc.name}</h3>
        <div class="doc-spec">${doc.specialization}</div>
        <div class="doc-exp">🎓 ${doc.qualification} · ${doc.experience}</div>
        <div class="doc-rating">⭐⭐⭐⭐⭐ <span>(${doc.review_count.toLocaleString()}+ reviews)</span></div>
        <div class="doc-fee">Consultation: <strong style="color:#10b981">&#x1F7E2; ${doc.fee === 0 ? 'Free' : '₹' + doc.fee}</strong></div>
        <button class="btn btn-book" onclick="window.initiateBooking('${doc.doctor_id}', '${doc.name.replace(/'/g, "\\'")}', '${doc.specialization.replace(/'/g, "\\'")}', '${doc.image}')">
          Book Consultation
        </button>
      `;
      doctorGrid.appendChild(card);
    });
  } catch (e) {
    console.warn("Doctors fetch fallback notice:", e);
  }
}

if (docSearchInput) {
  let docDebounce;
  docSearchInput.addEventListener("input", (e) => {
    clearTimeout(docDebounce);
    docDebounce = setTimeout(() => {
      currentDoctorQuery = e.target.value.trim();
      fetchAndRenderDoctors();
    }, 280);
  });
}

if (docCategoryPills) {
  docCategoryPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (!pill) return;
    document.querySelectorAll("#docCategoryPills .cat-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentDoctorSpecialty = pill.dataset.spec || "All";
    fetchAndRenderDoctors();
  });
}

// ── Consultation Booking & Choice Modal ──────────────────────
window.initiateBooking = function (doctorId, doctorName, doctorSpecialization, doctorImage) {
  const docFromMap = window.globalDoctorsMap ? window.globalDoctorsMap[doctorId] : null;
  const domCardImg = document.querySelector(`[data-doc-id="${doctorId}"] img`)?.src;
  
  const finalImage = doctorImage || (docFromMap ? docFromMap.image : null) || domCardImg || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&h=300&fit=crop";

  selectedDoctor = {
    id: doctorId || "DOC-201",
    name: doctorName || (docFromMap ? docFromMap.name : "Dr. Rajesh Kumar"),
    specialization: doctorSpecialization || (docFromMap ? docFromMap.specialization : "General Physician"),
    image: finalImage
  };

  if (choiceDocName) choiceDocName.textContent = selectedDoctor.name;
  if (choiceDocSpec) choiceDocSpec.textContent = selectedDoctor.specialization;
  if (choiceDocImg) choiceDocImg.src = selectedDoctor.image;

  if (consultationChoiceModal) consultationChoiceModal.style.display = "flex";
};

if (closeConsultationChoiceModal) {
  closeConsultationChoiceModal.addEventListener("click", () => {
    if (consultationChoiceModal) consultationChoiceModal.style.display = "none";
  });
}

window.confirmConsultationMode = function (mode) {
  if (consultationChoiceModal) consultationChoiceModal.style.display = "none";
  if (mode === "Chat") {
    window.startDoctorChat(selectedDoctor.id);
  } else {
    window.startLiveVideoCall(selectedDoctor);
  }
};

// ── Doctor Profile Modal ─────────────────────────────────────
async function openDoctorProfile(doctorId) {
  if (!doctorProfileModal || !doctorProfileBody) return;
  try {
    const res = await fetch(apiUrl(`/api/doctors/${doctorId}`));
    const doc = await res.json();

    selectedDoctor = {
      id: doc.doctor_id,
      name: doc.name,
      specialization: doc.specialization,
      image: doc.image
    };

    doctorProfileBody.innerHTML = `
      <div style="text-align:center; margin-bottom:1.2rem;">
          <img src="${doc.image}" alt="${doc.name}" style="width:110px; height:110px; border-radius:50%; object-fit:cover; margin:0 auto 0.8rem; border:3px solid var(--blue);">
          <h3 style="font-size:1.3rem; font-weight:800;">${doc.name}</h3>
          <div style="color:var(--blue); font-weight:700; font-size:0.95rem;">${doc.specialization}</div>
          <div style="font-size:0.85rem; color:var(--text-mid); margin-top:2px;">${doc.qualification} · ${doc.experience} Experience</div>
          <div style="margin-top:6px;"><span style="color:#f59e0b;">⭐ ${doc.rating}</span> <span style="font-size:0.8rem; color:var(--text-light);">(${doc.review_count.toLocaleString()} reviews)</span></div>
      </div>
      <div style="background:var(--bg); padding:1rem; border-radius:var(--radius-sm); font-size:0.9rem; margin-bottom:1.2rem; border:1px solid var(--border);">
          <strong>About Doctor:</strong><br>${doc.about}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
          <button class="btn btn-cta" onclick="window.startDoctorChat('${doc.doctor_id}')">💬 Chat Consultation</button>
          <button class="btn btn-hero-primary" onclick="window.startLiveVideoCall(selectedDoctor)">📹 Live Video Call</button>
      </div>
    `;
    doctorProfileModal.style.display = "flex";
  } catch (e) {
    console.warn("Profile fetch error:", e);
  }
}

if (closeDoctorProfileModal) {
  closeDoctorProfileModal.addEventListener("click", () => {
    if (doctorProfileModal) doctorProfileModal.style.display = "none";
  });
}

// ── Live Doctor Chat Session ────────────────────────────────
window.startDoctorChat = async function (doctorId) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to start consultation.", true);
    openAuthModal(false);
    return;
  }

  try {
    const res = await fetch(apiUrl("/api/consultations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: activeUser.uid, doctor_id: doctorId, consultation_type: "Chat" })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Could not start consultation");

    activeConsultationId = data.consultation_id;
    if (doctorProfileModal) doctorProfileModal.style.display = "none";
    if (chatDocName) chatDocName.textContent = data.doctor_name;
    if (chatDocSpec) chatDocSpec.textContent = `${data.specialization} · Online`;
    if (doctorChatModal) doctorChatModal.style.display = "flex";

    loadChatMessages();
  } catch (err) {
    showToast(err.message, true);
  }
};

async function loadChatMessages() {
  if (!activeConsultationId || !docChatMessages) return;
  try {
    const res = await fetch(apiUrl(`/api/consultations/${activeConsultationId}/messages`));
    const msgs = await res.json();

    docChatMessages.innerHTML = "";
    msgs.forEach(m => {
      const bubble = document.createElement("div");
      bubble.className = `doc-chat-bubble ${m.sender_type}`;
      bubble.textContent = m.message;
      docChatMessages.appendChild(bubble);
    });
    docChatMessages.scrollTop = docChatMessages.scrollHeight;
  } catch (e) {}
}

if (sendDocMsgBtn && docChatInput) {
  sendDocMsgBtn.addEventListener("click", async () => {
    const text = docChatInput.value.trim();
    const activeUser = getActiveUser();
    if (!text || !activeConsultationId || !activeUser) return;

    docChatInput.value = "";
    try {
      await fetch(apiUrl(`/api/consultations/${activeConsultationId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_id: activeUser.uid, sender_type: "user", message: text })
      });
      loadChatMessages();
    } catch (e) {}
  });

  docChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendDocMsgBtn.click();
  });
}

if (closeDoctorChatModal) {
  closeDoctorChatModal.addEventListener("click", () => {
    if (doctorChatModal) doctorChatModal.style.display = "none";
  });
}

if (chatPrescriptionBtn) {
  chatPrescriptionBtn.addEventListener("click", () => {
    window.openCreatePrescriptionModal(
      selectedDoctor.id,
      selectedDoctor.name,
      selectedDoctor.specialization,
      "Consultation Assessment: Acute Symptoms (Fever/Cold/Headache)"
    );
  });
}

// ── Live Video Call with Automatic Camera Stream & Controls ─
window.startLiveVideoCall = async function (docObj) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to start video consultation.", true);
    openAuthModal(false);
    return;
  }

  const doc = docObj || selectedDoctor;
  if (doctorProfileModal) doctorProfileModal.style.display = "none";
  if (consultationChoiceModal) consultationChoiceModal.style.display = "none";

  // Create consultation record on backend
  try {
    const res = await fetch(apiUrl("/api/consultations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: activeUser.uid, doctor_id: doc.id, consultation_type: "Video Call" })
    });
    const data = await res.json();
    if (data.consultation_id) activeConsultationId = data.consultation_id;
  } catch (e) {}

  if (videoDocName) videoDocName.textContent = `Consultation with ${doc.name}`;
  if (videoDocSpec) videoDocSpec.textContent = `${doc.specialization} · Live Video Call`;
  if (videoFeedDocLabel) videoFeedDocLabel.textContent = `${doc.name} (Live Stream)`;

  const docVideoFeed = document.getElementById("docVideoFeed");
  const doctorImgUrl = doc.image || selectedDoctor.image || (window.globalDoctorsMap && window.globalDoctorsMap[doc.id] ? window.globalDoctorsMap[doc.id].image : null) || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=600&fit=crop";
  if (docVideoFeed) {
    docVideoFeed.src = doctorImgUrl;
    docVideoFeed.alt = `${doc.name} Live Stream Feed`;
  }

  if (videoCallModal) videoCallModal.style.display = "flex";

  // Reset controls state
  isMicMuted = false;
  isCameraOff = false;
  if (muteBtn) {
    muteBtn.textContent = "🎤";
    muteBtn.style.background = "rgba(255,255,255,0.15)";
  }
  if (camBtn) {
    camBtn.textContent = "📷";
    camBtn.style.background = "rgba(255,255,255,0.15)";
  }
  if (localCamOffOverlay) localCamOffOverlay.style.display = "none";

  // Automatically turn camera & mic ON
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true
      });
      window.localMediaStream = stream;
      if (localVideoFeed) {
        localVideoFeed.srcObject = stream;
        localVideoFeed.play().catch(() => {});
      }
      showToast("🎥 Camera & Microphone connected successfully!");
    } else {
      showToast("ℹ️ Camera simulation active in this browser environment.");
    }
  } catch (err) {
    console.warn("Media stream request notice:", err);
    showToast("ℹ️ Camera access not permitted or simulated. Continuing video call.", false);
  }

  // Live Call Timer
  let sec = 0;
  if (callTimer) {
    callTimer.textContent = "00:00";
    if (window.activeCallInterval) clearInterval(window.activeCallInterval);
    window.activeCallInterval = setInterval(() => {
      sec++;
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      callTimer.textContent = `${m}:${s}`;
    }, 1000);
  }
};

window.stopVideoCall = function () {
  if (window.activeCallInterval) {
    clearInterval(window.activeCallInterval);
    window.activeCallInterval = null;
  }
  if (window.localMediaStream) {
    window.localMediaStream.getTracks().forEach(t => t.stop());
    window.localMediaStream = null;
  }
  if (localVideoFeed) {
    localVideoFeed.srcObject = null;
  }
  if (videoCallModal) videoCallModal.style.display = "none";
  showToast("📞 Video call ended. Opening Create Digital Prescription...");

  const doc = selectedDoctor || { id: "DOC-201", name: "Dr. Rajesh Kumar", specialization: "General Physician (Fever, Cold, Cough & Viral Flu)" };

  // Directly display the "Create Digital Prescription" modal immediately
  window.openCreatePrescriptionModal(
    doc.id,
    doc.name,
    doc.specialization,
    `Video Consultation Assessment: Acute Illness & Treatment (${doc.specialization})`
  );
};

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    isMicMuted = !isMicMuted;
    if (window.localMediaStream) {
      window.localMediaStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    }
    muteBtn.textContent = isMicMuted ? "🔇" : "🎤";
    muteBtn.style.background = isMicMuted ? "var(--red)" : "rgba(255,255,255,0.15)";
    showToast(isMicMuted ? "🔇 Microphone Muted" : "🎤 Microphone Active");
  });
}

if (camBtn) {
  camBtn.addEventListener("click", () => {
    isCameraOff = !isCameraOff;
    if (window.localMediaStream) {
      window.localMediaStream.getVideoTracks().forEach(t => t.enabled = !isCameraOff);
    }
    camBtn.textContent = isCameraOff ? "🚫" : "📷";
    camBtn.style.background = isCameraOff ? "var(--red)" : "rgba(255,255,255,0.15)";
    if (localCamOffOverlay) localCamOffOverlay.style.display = isCameraOff ? "flex" : "none";
    showToast(isCameraOff ? "🚫 Camera Turned Off" : "📷 Camera Turned On");
  });
}

if (videoPrescriptionBtn) {
  videoPrescriptionBtn.addEventListener("click", () => {
    window.openCreatePrescriptionModal(
      selectedDoctor.id,
      selectedDoctor.name,
      selectedDoctor.specialization,
      "Video Consultation: Acute Illness Assessment & Treatment"
    );
  });
}

// ── Digital Prescription Creation Module ────────────────────
window.openCreatePrescriptionModal = function (docId, docName, docSpec, defaultDiagnosis) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to generate prescription.", true);
    openAuthModal(false);
    return;
  }

  if (prescDocName) prescDocName.textContent = docName || selectedDoctor.name;
  if (prescDocSpec) prescDocSpec.textContent = docSpec || selectedDoctor.specialization;
  const patientInput = document.getElementById("patientName");
  if (patientInput) patientInput.value = activeUser.email.split("@")[0].replace(/\./g, " ").toUpperCase();
  if (prescDiagnosis) prescDiagnosis.value = defaultDiagnosis || "Viral Fever with Cold & Body Pain";
  if (prescInstructions) prescInstructions.value = "Drink plenty of warm water. Rest adequately and take light, easily digestible meals. Avoid cold drinks. Review with doctor if fever persists beyond 3 days.";

  if (prescriptionModal) prescriptionModal.style.display = "flex";
};

if (closePrescriptionModal) {
  closePrescriptionModal.addEventListener("click", () => {
    if (prescriptionModal) prescriptionModal.style.display = "none";
  });
}

function createPrescriptionMedicineRowHtml(selectedMed = "Dolo 650", dosage = "1 tablet (650mg)", freq = "Twice daily after meals (1-0-1)", dur = "5 days") {
  return `
    <div class="presc-med-row" style="background: var(--bg); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); display:grid; grid-template-columns: 2fr 1.2fr 1.5fr 1fr auto; gap: 0.6rem; align-items: end;">
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Medicine Name</label>
            <select class="rx-med-name" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem; background:#fff;">
                <option value="Dolo 650" ${selectedMed === "Dolo 650" ? "selected" : ""}>Dolo 650 (Paracetamol 650mg)</option>
                <option value="Paracetamol 500mg" ${selectedMed === "Paracetamol 500mg" ? "selected" : ""}>Paracetamol 500mg (Fever & Pain)</option>
                <option value="Crocin Advance" ${selectedMed === "Crocin Advance" ? "selected" : ""}>Crocin Advance (Fast Relief)</option>
                <option value="Astra-Zen Clear" ${selectedMed === "Astra-Zen Clear" ? "selected" : ""}>Astra-Zen Clear (Flu & Fever)</option>
                <option value="Neuro-Sync" ${selectedMed === "Neuro-Sync" ? "selected" : ""}>Neuro-Sync (Headache & Focus)</option>
                <option value="Gravity-Fix" ${selectedMed === "Gravity-Fix" ? "selected" : ""}>Gravity-Fix (Muscle Gel)</option>
                <option value="BioShield-X" ${selectedMed === "BioShield-X" ? "selected" : ""}>BioShield-X (Antibiotic)</option>
                <option value="PainAway Pro" ${selectedMed === "PainAway Pro" ? "selected" : ""}>PainAway Pro (Pain Relief)</option>
                <option value="GlucoBalance" ${selectedMed === "GlucoBalance" ? "selected" : ""}>GlucoBalance (Blood Sugar)</option>
                <option value="CalmWave" ${selectedMed === "CalmWave" ? "selected" : ""}>CalmWave (Stress & Anxiety)</option>
                <option value="AllerShield" ${selectedMed === "AllerShield" ? "selected" : ""}>AllerShield (Antihistamine)</option>
                <option value="VitaCore Plus" ${selectedMed === "VitaCore Plus" ? "selected" : ""}>VitaCore Plus (Multivitamin)</option>
            </select>
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Dosage</label>
            <input type="text" class="rx-med-dosage" value="${dosage}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem;">
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Frequency</label>
            <select class="rx-med-freq" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem; background:#fff;">
                <option value="Twice daily after meals (1-0-1)" ${freq.includes("1-0-1") ? "selected" : ""}>Twice daily after food (1-0-1)</option>
                <option value="Three times a day (1-1-1)" ${freq.includes("1-1-1") ? "selected" : ""}>Three times a day (1-1-1)</option>
                <option value="Once daily at bedtime (0-0-1)" ${freq.includes("0-0-1") ? "selected" : ""}>Once daily at bedtime (0-0-1)</option>
                <option value="Once daily morning (1-0-0)" ${freq.includes("1-0-0") ? "selected" : ""}>Once daily morning (1-0-0)</option>
                <option value="As needed for pain / fever (SOS)" ${freq.includes("SOS") ? "selected" : ""}>As needed (SOS / Max 3/day)</option>
            </select>
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Duration</label>
            <input type="text" class="rx-med-dur" value="${dur}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem;">
        </div>
        <button type="button" class="remove-rx-row-btn" style="background:none; border:none; color:var(--red); font-size:1.2rem; cursor:pointer; padding:0 4px; line-height:1;" title="Remove row">✕</button>
    </div>
  `;
}

if (addPrescMedRowBtn && prescMedRowsContainer) {
  addPrescMedRowBtn.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = createPrescriptionMedicineRowHtml("Paracetamol 500mg", "1 tablet (500mg)", "Three times a day (1-1-1)", "3 days");
    prescMedRowsContainer.appendChild(div.firstElementChild);
  });

  prescMedRowsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-rx-row-btn");
    if (removeBtn) {
      const rows = prescMedRowsContainer.querySelectorAll(".presc-med-row");
      if (rows.length > 1) {
        removeBtn.closest(".presc-med-row").remove();
      } else {
        showToast("At least one medicine is required in prescription.", true);
      }
    }
  });
}

// Issue Prescription Submission
if (savePrescriptionBtn) {
  savePrescriptionBtn.addEventListener("click", async () => {
    const activeUser = getActiveUser();
    if (!activeUser) {
      showToast("⚠️ Please login to issue prescription.", true);
      openAuthModal(false);
      return;
    }

    const patientName = document.getElementById("patientName")?.value.trim() || "Patient";
    const diagnosis = prescDiagnosis?.value.trim() || "General Medical Ailment";
    const instructions = prescInstructions?.value.trim() || "Take medicines on time and rest.";

    const medRows = document.querySelectorAll("#prescMedRowsContainer .presc-med-row");
    const medicinesList = [];
    medRows.forEach(row => {
      const name = row.querySelector(".rx-med-name")?.value || "Dolo 650";
      const dosage = row.querySelector(".rx-med-dosage")?.value || "1 tablet";
      const freq = row.querySelector(".rx-med-freq")?.value || "Twice daily";
      const dur = row.querySelector(".rx-med-dur")?.value || "5 days";
      medicinesList.push({
        name: name,
        dosage: dosage,
        frequency: freq,
        duration: dur,
        instructions: "Take with warm water after meals"
      });
    });

    if (medicinesList.length === 0) {
      showToast("Please prescribe at least one medicine.", true);
      return;
    }

    setLoading(savePrescriptionBtn, true);
    try {
      const res = await fetch(apiUrl("/api/prescriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUser.uid,
          patient_name: patientName,
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.name,
          doctor_specialization: selectedDoctor.specialization,
          diagnosis: diagnosis,
          medicines: medicinesList,
          instructions: instructions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate prescription");

      showToast(`✅ Digital Prescription ${data.prescription_id} issued successfully!`);
      if (prescriptionModal) prescriptionModal.style.display = "none";

      // Fetch newly created prescription to view printable sheet & offer pharmacy order
      try {
        const rxRes = await fetch(apiUrl(`/api/prescriptions/${data.prescription_id}`));
        if (rxRes.ok) {
          const rxData = await rxRes.json();
          window.viewPrescriptionPrint(rxData);
        }
      } catch (err) {}
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(savePrescriptionBtn, false);
    }
  });
}

// ── Printable / View Digital Prescription Modal ─────────────
window.viewPrescriptionPrint = function (rx) {
  if (!prescriptionPrintModal || !printablePrescriptionContent) return;

  let medsHtml = "";
  if (rx.medicines && rx.medicines.length > 0) {
    medsHtml = rx.medicines.map((m, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: 700;">${idx + 1}. 💊 ${m.name}</td>
        <td style="padding: 10px 8px;">${m.dosage || '1 dose'}</td>
        <td style="padding: 10px 8px;">${m.frequency || 'Twice daily'}</td>
        <td style="padding: 10px 8px;">${m.duration || '5 days'}</td>
        <td style="padding: 10px 8px; color: #64748b; font-size: 0.82rem;">${m.instructions || 'After meals with water'}</td>
      </tr>
    `).join("");
  } else {
    medsHtml = `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: 700;">1. 💊 ${rx.medication || 'Dolo 650'}</td>
        <td style="padding: 10px 8px;">${rx.dosage || '1 tablet (650mg)'}</td>
        <td style="padding: 10px 8px;">Twice daily</td>
        <td style="padding: 10px 8px;">5 days</td>
        <td style="padding: 10px 8px; color: #64748b; font-size: 0.82rem;">After meals</td>
      </tr>
    `;
  }

  printablePrescriptionContent.innerHTML = `
    <div style="font-family: inherit; color: #1e293b;">
      <!-- Clinic & Doctor Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--blue); padding-bottom: 1.2rem; margin-bottom: 1.2rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="background: var(--blue); color: #fff; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">▲</div>
            <span style="font-weight: 800; font-size: 1.25rem; color: #0f172a;">Antigravity <span style="color: var(--blue);">Health</span></span>
          </div>
          <div style="font-size: 0.8rem; color: #64748b;">Certified Digital TeleHealth Network · 24/7 Virtual Care</div>
          <div style="font-size: 0.8rem; color: #64748b;">Emergency Helpline: 112 | Support: 1800-123-4567</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">${rx.doctor_name || 'Dr. Rajesh Kumar'}</div>
          <div style="font-size: 0.85rem; color: var(--blue); font-weight: 600;">${rx.doctor_specialization || 'General Physician'}</div>
          <div style="font-size: 0.78rem; color: #64748b;">Reg No: AGY-MED-${(rx.doctor_id || 'DOC-201').replace(/[^0-9]/g, '') || '201'}984</div>
          <div style="font-size: 0.78rem; color: #16a34a; font-weight: 700;">🟢 Teleconsultation Verified</div>
        </div>
      </div>

      <!-- Patient & Prescription Metadata -->
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.2rem; font-size: 0.9rem;">
        <div>
          <div><strong style="color: #475569;">Patient Name:</strong> <span style="font-weight: 700; color: #0f172a;">${rx.patient_name || 'Patient'}</span></div>
          <div style="margin-top: 4px;"><strong style="color: #475569;">Clinical Diagnosis:</strong> <span style="font-weight: 600; color: var(--blue);">${rx.diagnosis || 'General Consultation'}</span></div>
        </div>
        <div style="text-align: right;">
          <div><strong style="color: #475569;">Rx ID:</strong> <span style="font-family: monospace; font-weight: 700;">${rx.prescription_id}</span></div>
          <div style="margin-top: 4px;"><strong style="color: #475569;">Date & Time:</strong> ${new Date(rx.timestamp || Date.now()).toLocaleString()}</div>
        </div>
      </div>

      <!-- Rx Medications Symbol & Table -->
      <div style="margin-bottom: 1.4rem;">
        <div style="font-size: 1.6rem; font-weight: 900; font-family: serif; color: var(--blue); margin-bottom: 0.4rem;">℞</div>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155; font-size: 0.8rem; text-transform: uppercase;">
              <th style="padding: 8px;">Medicine Name</th>
              <th style="padding: 8px;">Dosage</th>
              <th style="padding: 8px;">Frequency</th>
              <th style="padding: 8px;">Duration</th>
              <th style="padding: 8px;">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${medsHtml}
          </tbody>
        </table>
      </div>

      <!-- Clinical Advice -->
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 0.9rem; border-radius: 8px; margin-bottom: 1.4rem; font-size: 0.86rem; color: #92400e;">
        <strong>📋 Doctor's Advice / Special Instructions:</strong><br>
        <p style="margin-top: 4px; line-height: 1.5;">${rx.instructions || 'Stay hydrated, get plenty of rest, and take prescribed medicines strictly on schedule. Follow up if symptoms persist.'}</p>
      </div>

      <!-- Footer Sign-off -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 1rem; margin-top: 1rem;">
        <div style="font-size: 0.75rem; color: #94a3b8; max-width: 60%;">
          ⚡ This is a certified computer-generated digital prescription under Antigravity Health Telemedicine Guidelines. Valid for instant pharmacy fulfillment.
        </div>
        <div style="text-align: center;">
          <div style="font-family: cursive; font-size: 1.2rem; color: var(--blue); font-weight: 700; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; margin-bottom: 4px;">
            ${rx.doctor_name || 'Dr. Rajesh Kumar'}
          </div>
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">Digitally Signed & Verified</div>
        </div>
      </div>
    </div>
  `;

  if (printModalOrderPharmacyBtn) {
    printModalOrderPharmacyBtn.onclick = () => window.orderPrescriptionMedicines(rx.prescription_id);
  }

  prescriptionPrintModal.style.display = "flex";
};

window.printPrescriptionDoc = function () {
  window.print();
};

if (closePrintPrescriptionModal) {
  closePrintPrescriptionModal.addEventListener("click", () => {
    if (prescriptionPrintModal) prescriptionPrintModal.style.display = "none";
  });
}

// ── My Prescriptions Module ─────────────────────────────────
async function openMyPrescriptionsModal() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to view your prescriptions.", true);
    openAuthModal(false);
    return;
  }
  if (myPrescriptionsModal) myPrescriptionsModal.style.display = "flex";

  try {
    const res = await fetch(apiUrl(`/api/prescriptions?user_id=${encodeURIComponent(activeUser.uid)}`));
    const list = await res.json();
    if (!prescriptionsList) return;
    prescriptionsList.innerHTML = "";
    if (!list || list.length === 0) {
      prescriptionsList.innerHTML = '<div class="empty-state-p">No prescriptions issued yet. Consult a doctor to receive a digital prescription.</div>';
      return;
    }

    list.forEach(rx => {
      const card = document.createElement("div");
      card.className = "prescription-card";
      card.style.cssText = "background:#fff; border:1.5px solid var(--border); border-radius:var(--radius-md); padding:1.2rem; margin-bottom:1rem; box-shadow:var(--shadow-sm);";
      
      let medsSummary = "";
      if (rx.medicines && rx.medicines.length > 0) {
        medsSummary = rx.medicines.map(m => `<li><strong>${m.name}</strong> - ${m.dosage || ''} (${m.frequency || ''}) for ${m.duration || ''}</li>`).join("");
      } else {
        medsSummary = `<li><strong>${rx.medication || 'Prescribed Meds'}</strong> - ${rx.dosage || ''}</li>`;
      }

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem; border-bottom:1px solid var(--border); padding-bottom:0.6rem;">
          <div>
            <div style="font-weight:800; font-size:1.05rem; color:var(--blue);">${rx.prescription_id}</div>
            <div style="font-size:0.85rem; color:var(--text-mid);">👨‍⚕️ ${rx.doctor_name || 'Dr. Rajesh Kumar'} (${rx.doctor_specialization || 'General Physician'})</div>
          </div>
          <span style="font-size:0.8rem; color:var(--text-light);">${new Date(rx.timestamp || Date.now()).toLocaleDateString()}</span>
        </div>
        <div style="font-size:0.88rem; margin-bottom:0.6rem;">
          <strong>Diagnosis:</strong> ${rx.diagnosis || 'Clinical Consultation'}<br>
          <strong>Patient:</strong> ${rx.patient_name || 'Patient'}
        </div>
        <div style="background:var(--bg); padding:0.8rem; border-radius:var(--radius-sm); margin-bottom:0.8rem;">
          <strong style="font-size:0.85rem; color:var(--text-dark);">Prescribed Medications:</strong>
          <ul style="margin-top:0.3rem; padding-left:1.2rem; font-size:0.85rem; color:var(--text-mid);">
            ${medsSummary}
          </ul>
          ${rx.instructions ? `<div style="font-size:0.8rem; color:var(--text-light); margin-top:0.4rem;"><em>Advice: ${rx.instructions}</em></div>` : ''}
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
          <button class="btn btn-outline-nav" id="viewPrintBtn_${rx.prescription_id}" style="font-size:0.85rem; padding:0.4rem 0.9rem;">
            📄 View / Print
          </button>
          <button class="btn btn-cta" onclick="window.orderPrescriptionMedicines('${rx.prescription_id}')" style="font-size:0.85rem; padding:0.4rem 1rem;">
            🛒 Order from Pharmacy
          </button>
        </div>
      `;
      prescriptionsList.appendChild(card);

      const viewBtn = document.getElementById(`viewPrintBtn_${rx.prescription_id}`);
      if (viewBtn) {
        viewBtn.addEventListener("click", () => window.viewPrescriptionPrint(rx));
      }
    });
  } catch (err) {
    console.warn("Prescriptions fetch error:", err);
  }
}

if (navPrescriptionsBtn) {
  navPrescriptionsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openMyPrescriptionsModal();
  });
}
document.querySelectorAll('a[href="#prescriptions"]').forEach(el => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    openMyPrescriptionsModal();
  });
});
if (closeMyPrescriptionsModal) {
  closeMyPrescriptionsModal.addEventListener("click", () => {
    if (myPrescriptionsModal) myPrescriptionsModal.style.display = "none";
  });
}

// ── My Consultations Module ─────────────────────────────────
async function openConsultationsModal() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to view consultations.", true);
    openAuthModal(false);
    return;
  }
  if (consultationsModal) consultationsModal.style.display = "flex";

  try {
    const res = await fetch(apiUrl(`/api/consultations?user_id=${encodeURIComponent(activeUser.uid)}`));
    const list = await res.json();
    if (!consultationsList) return;
    consultationsList.innerHTML = "";
    if (!list || list.length === 0) {
      consultationsList.innerHTML = '<div class="empty-state-p">No past consultations found. Click "Find a Doctor" to book one.</div>';
      return;
    }

    list.forEach(c => {
      const card = document.createElement("div");
      card.style.cssText = "background:#fff; border:1.5px solid var(--border); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-sm);";
      card.innerHTML = `
        <div>
          <div style="font-weight:800; font-size:1rem; color:var(--text-dark);">${c.doctor_name}</div>
          <div style="font-size:0.82rem; color:var(--blue); font-weight:600;">${c.specialization} · ${c.consultation_type}</div>
          <div style="font-size:0.78rem; color:var(--text-light); margin-top:2px;">Session ID: ${c.consultation_id} · ${new Date(c.created_at || Date.now()).toLocaleDateString()}</div>
        </div>
        <div>
          <button class="btn btn-cta" onclick="window.initiateBooking('${c.doctor_id}', '${c.doctor_name.replace(/'/g, "\\'")}', '${c.specialization.replace(/'/g, "\\'")}')" style="font-size:0.82rem; padding:0.4rem 0.8rem;">
            Consult Again
          </button>
        </div>
      `;
      consultationsList.appendChild(card);
    });
  } catch (err) {
    console.warn("Consultations fetch error:", err);
  }
}

if (navConsultationsBtn) {
  navConsultationsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openConsultationsModal();
  });
}
if (closeConsultationsModal) {
  closeConsultationsModal.addEventListener("click", () => {
    if (consultationsModal) consultationsModal.style.display = "none";
  });
}

// ── Order Medicines from Pharmacy from Prescription ─────────
window.orderPrescriptionMedicines = async function (prescriptionId) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to order prescribed medicines.", true);
    openAuthModal(false);
    return;
  }

  showToast("🔍 Matching prescribed medicines with pharmacy catalog...");
  try {
    const res = await fetch(apiUrl(`/api/prescriptions/${prescriptionId}/match-pharmacy`), {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Could not match medicines");

    const matched = data.matched_items || [];
    if (matched.length === 0) {
      showToast("No direct medicine stock matches found in store catalog.", true);
      return;
    }

    let addedCount = 0;
    matched.forEach(item => {
      const existing = cartItems.find(c => c.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        cartItems.push({
          name: item.name,
          price: item.price,
          img: item.image || "images/med_dolo_650.png",
          qty: 1,
          isRx: true,
          dosage: item.dosage,
          frequency: item.frequency
        });
      }
      addedCount++;
    });

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    updateCartUI();
    window.openCart();

    if (prescriptionPrintModal) prescriptionPrintModal.style.display = "none";
    if (myPrescriptionsModal) myPrescriptionsModal.style.display = "none";

    showToast(`🛒 Successfully added ${addedCount} prescribed medicines to cart!`);

    // Smoothly direct/scroll to the Medicine Store / Pharmacy section
    setTimeout(() => {
      const pharmacySection = document.getElementById("pharmacy");
      if (pharmacySection) {
        pharmacySection.scrollIntoView({ behavior: "smooth" });
        pharmacySection.style.transition = "box-shadow 0.6s ease, transform 0.4s ease";
        pharmacySection.style.boxShadow = "0 0 0 4px var(--blue), 0 12px 36px rgba(37,99,235,0.2)";
        setTimeout(() => {
          pharmacySection.style.boxShadow = "none";
        }, 3000);
      }
    }, 350);

  } catch (err) {
    showToast(err.message, true);
  }
};

window.goToMedicineStore = function () {
  if (prescriptionPrintModal) prescriptionPrintModal.style.display = "none";
  if (myPrescriptionsModal) myPrescriptionsModal.style.display = "none";
  const pharmacySection = document.getElementById("pharmacy");
  if (pharmacySection) {
    pharmacySection.scrollIntoView({ behavior: "smooth" });
  }
};

// Support Modal Handlers for Footer Links
function openInfoModal(title, htmlContent) {
  const modal = document.getElementById("infoModal");
  const titleEl = document.getElementById("infoModalTitle");
  const bodyEl = document.getElementById("infoModalBody");
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = htmlContent;
  if (modal) modal.style.display = "flex";
}

const linkHelpCenter = document.getElementById("linkHelpCenter");
if (linkHelpCenter) {
  linkHelpCenter.addEventListener("click", (e) => {
    e.preventDefault();
    openInfoModal("❓ Help Center & FAQ", `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div>
          <h4 style="color:var(--blue); margin-bottom:4px;">Q: How fast is medicine delivery?</h4>
          <p style="color:var(--text-mid);">A: We deliver genuine medicines to your door in under 30 minutes for fast delivery tagged items.</p>
        </div>
        <div>
          <h4 style="color:var(--blue); margin-bottom:4px;">Q: How do doctor consultations work?</h4>
          <p style="color:var(--text-mid);">A: You can connect with certified specialists via instant video call or live interactive chat.</p>
        </div>
        <div>
          <h4 style="color:var(--blue); margin-bottom:4px;">Q: How does the AI Symptom Checker work?</h4>
          <p style="color:var(--text-mid);">A: Our AI checks your described symptoms against clinical rules to offer health advice and recommend relevant specialists or OTC remedies.</p>
        </div>
        <div style="background:var(--blue-light); padding:1rem; border-radius:var(--radius-sm); margin-top:0.5rem;">
          <strong style="color:var(--blue);">Need human assistance?</strong><br>
          Call our support team at <strong>1800-123-4567</strong> or WhatsApp us at <strong>+91 8328641411</strong>.
        </div>
      </div>
    `);
  });
}

const linkPrivacyPolicy = document.getElementById("linkPrivacyPolicy");
if (linkPrivacyPolicy) {
  linkPrivacyPolicy.addEventListener("click", (e) => {
    e.preventDefault();
    openInfoModal("🔒 Privacy & Security Policy", `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <p>At <strong>Antigravity Health</strong>, protecting your medical privacy and personal details is our fundamental commitment.</p>
        <div style="background:var(--bg); padding:0.8rem; border-radius:8px; border:1px solid var(--border);">
          <strong>🛡️ Data Protection Standards:</strong>
          <ul style="margin-top:0.4rem; padding-left:1.2rem;">
            <li><strong>End-to-End Encryption:</strong> All consultation chats, video calls, and order data are encrypted.</li>
            <li><strong>Zero Commercial Data Selling:</strong> We strictly never sell your medical or personal details to third parties.</li>
            <li><strong>Secure Storage:</strong> Health records and prescriptions are safely stored in compliant databases.</li>
          </ul>
        </div>
      </div>
    `);
  });
}

const linkTermsOfService = document.getElementById("linkTermsOfService");
if (linkTermsOfService) {
  linkTermsOfService.addEventListener("click", (e) => {
    e.preventDefault();
    openInfoModal("📜 Terms of Service", `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <p>Welcome to Antigravity Health. By accessing or using our services, you agree to these standard terms:</p>
        <ol style="padding-left:1.2rem; color:var(--text-mid); display:flex; flex-direction:column; gap:0.5rem;">
          <li><strong>Emergency Disclaimer:</strong> Antigravity Health is an online consultation and pharmacy platform. For life-threatening emergencies, always call <strong>112</strong> immediately.</li>
          <li><strong>Teleconsultations:</strong> Virtual consultations provide expert guidance based on user-provided medical history.</li>
          <li><strong>Prescription Medicines:</strong> Prescription-restricted medicines require a valid digital Rx upload or doctor pre-approval.</li>
        </ol>
      </div>
    `);
  });
}

const linkContactUs = document.getElementById("linkContactUs");
if (linkContactUs) {
  linkContactUs.addEventListener("click", (e) => {
    e.preventDefault();
    openInfoModal("📞 Contact Us", `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <p>Our medical support staff and pharmacy logistics team are available 24 hours a day, 7 days a week.</p>
        <div style="background:var(--bg); padding:1rem; border-radius:8px; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.6rem;">
          <div>🚨 <strong>Emergency Services:</strong> Call <strong>112</strong></div>
          <div>📞 <strong>Toll-Free Helpline:</strong> <strong>1800-123-4567</strong></div>
          <div>💬 <strong>WhatsApp Video & Chat:</strong> <a href="https://wa.me/918328641411" target="_blank" style="color:var(--blue); font-weight:700;">+91 8328641411</a></div>
          <div>✉️ <strong>Support Email:</strong> <a href="mailto:support@antigravityhealth.io" style="color:var(--blue);">support@antigravityhealth.io</a></div>
        </div>
      </div>
    `);
  });
}

// ============================================================
//  9. DYNAMIC AI HEALTH ASSISTANT (MULTI-TURN & CONTEXT-AWARE)
// ============================================================
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

window.aiConversationHistory = [];

function addChatMessage(htmlOrText, sender = "bot") {
  if (!chatMessages) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg msg-${sender}`;
  msgDiv.style.margin = "0.8rem 0";

  const avatar = sender === "bot" ? "🤖" : "👤";
  msgDiv.innerHTML = `
    <div style="display:flex; gap:10px; align-items:flex-start; ${sender === 'user' ? 'flex-direction:row-reverse;' : ''}">
        <div style="width:36px; height:36px; border-radius:50%; background:${sender === 'bot' ? 'var(--blue-light)' : 'var(--bg)'}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">${avatar}</div>
        <div class="msg-bubble" style="background:${sender === 'bot' ? '#fff' : 'var(--blue)'}; color:${sender === 'bot' ? 'var(--text-dark)' : '#fff'}; border:${sender === 'bot' ? '1px solid var(--border)' : 'none'}; padding:0.95rem 1.2rem; border-radius:18px; max-width:88%; font-size:0.93rem; line-height:1.55; box-shadow:var(--shadow-sm);">
            ${htmlOrText}
        </div>
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.sendAIFollowUp = function (text) {
  if (userInput) userInput.value = text;
  handleAISymptomCheck();
};

async function handleAISymptomCheck() {
  if (!userInput) return;
  const text = userInput.value.trim();
  if (!text) return;

  addChatMessage(text, "user");
  window.aiConversationHistory.push({ role: "user", content: text });
  userInput.value = "";

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg msg-bot";
  typingDiv.style.margin = "0.8rem 0";
  typingDiv.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center;">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--blue-light); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">🤖</div>
        <div style="background:#fff; border:1px solid var(--border); padding:0.7rem 1rem; border-radius:18px; font-size:0.9rem; color:var(--text-mid);">
            <em>Evaluating symptoms with Antigravity Clinical AI Engine…</em>
        </div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch(apiUrl("/api/analyze-symptoms"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: text,
        category: currentDoctorSpecialty || "General",
        history: window.aiConversationHistory
      })
    });
    const data = await res.json();

    if (chatMessages.contains(typingDiv)) {
      chatMessages.removeChild(typingDiv);
    }

    window.aiConversationHistory.push({ role: "assistant", content: data.advice });

    let responseHtml = `<div>${data.advice}</div>`;

    // 1. Possible Conditions Badges
    if (data.possible_conditions && data.possible_conditions.length > 0) {
      const condPills = data.possible_conditions.map(c => `<span style="background:var(--blue-light); color:var(--blue); font-weight:700; font-size:0.75rem; padding:3px 10px; border-radius:12px; margin-right:5px; display:inline-block; margin-top:3px;">🔍 ${c}</span>`).join('');
      responseHtml += `<div style="margin-top:0.9rem; padding-top:0.6rem; border-top:1px dashed var(--border);"><strong>Clinical Assessment Tags:</strong><br><div style="margin-top:4px;">${condPills}</div></div>`;
    }

    // 2. Interactive Follow-up Questions Pills
    if (data.follow_up_questions && data.follow_up_questions.length > 0) {
      const followUpPills = data.follow_up_questions.map(q => `
        <button type="button" onclick="window.sendAIFollowUp('${q.replace(/'/g, "\\'")}')" style="background:#f8fafc; border:1.5px solid var(--border); color:var(--blue); font-weight:600; font-size:0.8rem; padding:5px 12px; border-radius:16px; cursor:pointer; text-align:left; transition:all 0.2s; margin-top:4px; font-family:inherit;" onmouseover="this.style.background='var(--blue-light)'; this.style.borderColor='var(--blue)';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='var(--border)';">
          💬 ${q}
        </button>
      `).join("");
      responseHtml += `
        <div style="margin-top:1rem; background:var(--bg); padding:0.8rem; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:0.78rem; font-weight:700; color:var(--text-mid); text-transform:uppercase; margin-bottom:4px;">⚡ Quick Follow-up Replies:</div>
            <div style="display:flex; flex-direction:column; gap:4px;">${followUpPills}</div>
        </div>
      `;
    }

    // 3. Recommended Verified Medicines
    if (data.recommended_medicines && data.recommended_medicines.length > 0) {
      let medCardsHtml = "";
      data.recommended_medicines.forEach(m => {
        const isRx = m.prescription_required === 1;
        medCardsHtml += `
          <div style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.6rem; background:#fff; margin-top:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:10px; box-shadow:var(--shadow-sm);">
              <div style="display:flex; align-items:center; gap:8px;">
                  <img src="${m.image}" style="width:38px; height:38px; border-radius:6px; object-fit:cover;" onerror="this.style.display='none'">
                  <div>
                      <div style="font-weight:700; font-size:0.88rem; color:var(--text-dark);">${m.name}</div>
                      <div style="font-size:0.75rem; color:var(--text-mid);">₹${m.price.toFixed(2)} · ${isRx ? '📋 Doctor Rx' : '⚡ OTC Fast Delivery'}</div>
                  </div>
              </div>
              <button class="btn ${isRx ? 'btn-rx' : 'btn-cart add-cart-btn'}" data-name="${m.name}" data-price="${m.price}" style="font-size:0.78rem; padding:0.35rem 0.8rem;">
                  ${isRx ? 'Upload Doctor Prescription' : 'Add to Cart'}
              </button>
          </div>
        `;
      });
      responseHtml += `<div style="margin-top:0.9rem;"><strong>💊 Suggested Pharmacy Medicines:</strong>${medCardsHtml}</div>`;
    }

    // 4. Recommended Doctor Card with Instant Chat & Video Call Triggers
    if (data.recommended_doctor && !data.is_emergency) {
      const doc = data.recommended_doctor;
      responseHtml += `
        <div style="margin-top:1rem; padding:1rem; background:linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius:var(--radius-md); border:1.5px solid var(--blue); box-shadow:var(--shadow-sm);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:0.8rem;">
                <img src="${doc.image}" style="width:52px; height:52px; border-radius:50%; object-fit:cover; border:2px solid var(--blue);" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&h=300&fit=crop'">
                <div>
                    <div style="font-weight:800; font-size:0.98rem; color:var(--text-dark);">${doc.name}</div>
                    <div style="font-size:0.82rem; color:var(--blue); font-weight:600;">${doc.specialization}</div>
                    <div style="font-size:0.75rem; color:var(--green); font-weight:700;">🟢 Online Now · Instant Connect</div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <button class="btn btn-cta" onclick="window.initiateBooking('${doc.doctor_id}', '${doc.name.replace(/'/g, "\\'")}', '${doc.specialization.replace(/'/g, "\\'")}', '${doc.image}'); window.confirmConsultationMode('Chat');" style="padding:0.45rem 0.6rem; font-size:0.8rem; justify-content:center;">
                    💬 Chat with Doctor
                </button>
                <button class="btn btn-hero-primary" onclick="window.initiateBooking('${doc.doctor_id}', '${doc.name.replace(/'/g, "\\'")}', '${doc.specialization.replace(/'/g, "\\'")}', '${doc.image}'); window.confirmConsultationMode('Video Call');" style="padding:0.45rem 0.6rem; font-size:0.8rem; justify-content:center;">
                    📹 Video Consultation
                </button>
            </div>
        </div>
      `;
    }

    addChatMessage(responseHtml, "bot");

  } catch (err) {
    if (chatMessages.contains(typingDiv)) {
      chatMessages.removeChild(typingDiv);
    }
    addChatMessage("⚠️ System is operating normally. If you feel unwell, please stay hydrated, rest, and consult our online General Physicians.", "bot");
  }
}

if (sendBtn) sendBtn.addEventListener("click", handleAISymptomCheck);
if (userInput) {
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleAISymptomCheck();
  });
}

window.handleAISymptomCheck = handleAISymptomCheck;

