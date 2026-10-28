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
        btnHtml = `<button class="btn btn-rx" onclick="window.openPrescriptionUploadModal('${med.name.replace(/'/g, "\\'")}', ${med.price}, '${med.image}')" data-name="${med.name}" data-price="${med.price}" data-image="${med.image}">Upload Doctor Prescription</button>`;
      } else {
        btnHtml = `<button class="btn btn-cart add-cart-btn" onclick="window.addToCart('${med.name.replace(/'/g, "\\'")}', ${med.price}, '${med.image}')" data-name="${med.name}" data-price="${med.price}" data-image="${med.image}">Add to Cart</button>`;
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

window.addToCart = function (name, price, image) {
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
};

window.updateCartQty = function (index, delta) {
  if (!cartItems[index]) return;
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

// ── Prescription Upload Modal & Pharmacist Verification ──────
let currentRxTargetMedicine = null;
let currentUploadedRxFile = null;
let currentSelectedSavedRxId = null;

const uploadPrescriptionModal = document.getElementById("uploadPrescriptionModal");
const uploadRxMedName = document.getElementById("uploadRxMedName");
const uploadRxMedPrice = document.getElementById("uploadRxMedPrice");
const uploadRxMedImg = document.getElementById("uploadRxMedImg");
const rxDropzone = document.getElementById("rxDropzone");
const rxFileInput = document.getElementById("rxFileInput");
const rxFilePreviewBox = document.getElementById("rxFilePreviewBox");
const rxFileName = document.getElementById("rxFileName");
const rxFileSize = document.getElementById("rxFileSize");
const rxVerificationBox = document.getElementById("rxVerificationBox");
const rxVerifyStatusText = document.getElementById("rxVerifyStatusText");
const rxVerifyProgressBar = document.getElementById("rxVerifyProgressBar");
const rxVerifyPercent = document.getElementById("rxVerifyPercent");

window.openPrescriptionUploadModal = function (medName, medPrice, medImage) {
  currentRxTargetMedicine = {
    name: medName || "Prescription Medicine",
    price: parseFloat(medPrice) || 0,
    image: medImage || "images/med_neuro_sync.png"
  };

  if (uploadRxMedName) uploadRxMedName.textContent = currentRxTargetMedicine.name;
  if (uploadRxMedPrice) uploadRxMedPrice.textContent = `₹${currentRxTargetMedicine.price.toFixed(2)}`;
  if (uploadRxMedImg) {
    uploadRxMedImg.src = currentRxTargetMedicine.image;
    uploadRxMedImg.onerror = () => { uploadRxMedImg.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=320&h=200&fit=crop"; };
  }

  // Reset modal state
  window.clearRxFile();
  window.switchRxTab("file");
  if (rxVerificationBox) rxVerificationBox.style.display = "none";
  if (uploadPrescriptionModal) uploadPrescriptionModal.style.display = "flex";
};

window.closePrescriptionUploadModal = function () {
  if (uploadPrescriptionModal) uploadPrescriptionModal.style.display = "none";
};

window.switchRxTab = function (tab) {
  const tabFile = document.getElementById("rxTabFileContent");
  const tabSaved = document.getElementById("rxTabSavedContent");
  const tabNeed = document.getElementById("rxTabNeedContent");

  const btnFile = document.getElementById("tabUploadFileBtn");
  const btnSaved = document.getElementById("tabSavedRxBtn");
  const btnNeed = document.getElementById("tabNeedRxBtn");

  [btnFile, btnSaved, btnNeed].forEach(b => { if (b) b.classList.remove("active"); });
  if (tabFile) tabFile.style.display = "none";
  if (tabSaved) tabSaved.style.display = "none";
  if (tabNeed) tabNeed.style.display = "none";

  if (tab === "file") {
    if (btnFile) btnFile.classList.add("active");
    if (tabFile) tabFile.style.display = "block";
  } else if (tab === "saved") {
    if (btnSaved) btnSaved.classList.add("active");
    if (tabSaved) tabSaved.style.display = "block";
    loadSavedPrescriptionsForUpload();
  } else if (tab === "need") {
    if (btnNeed) btnNeed.classList.add("active");
    if (tabNeed) tabNeed.style.display = "block";
  }
};

window.handleRxFileSelect = function (e) {
  const files = e.target.files;
  if (files && files[0]) {
    setRxSelectedFile(files[0]);
  }
};

window.handleRxDrop = function (e) {
  e.preventDefault();
  if (rxDropzone) {
    rxDropzone.style.borderColor = "#93c5fd";
    rxDropzone.style.background = "#f8fafc";
  }
  const files = e.dataTransfer.files;
  if (files && files[0]) {
    setRxSelectedFile(files[0]);
  }
};

function setRxSelectedFile(file) {
  currentUploadedRxFile = file;
  currentSelectedSavedRxId = null;
  if (rxDropzone) rxDropzone.style.display = "none";
  if (rxFilePreviewBox) rxFilePreviewBox.style.display = "flex";
  if (rxFileName) rxFileName.textContent = file.name;
  if (rxFileSize) rxFileSize.textContent = `${(file.size / 1024).toFixed(1)} KB · Ready for verification`;
  showToast(`📄 Prescription file "${file.name}" attached.`);
}

window.clearRxFile = function () {
  currentUploadedRxFile = null;
  currentSelectedSavedRxId = null;
  if (rxFileInput) rxFileInput.value = "";
  if (rxDropzone) rxDropzone.style.display = "block";
  if (rxFilePreviewBox) rxFilePreviewBox.style.display = "none";
};

async function loadSavedPrescriptionsForUpload() {
  const rxSavedList = document.getElementById("rxSavedList");
  if (!rxSavedList) return;
  const activeUser = getActiveUser();
  if (!activeUser) {
    rxSavedList.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-mid);">Please log in to view your consultation prescriptions.</div>`;
    return;
  }

  rxSavedList.innerHTML = `<div style="text-align:center; padding:1.2rem; color:var(--text-mid);">Loading your digital prescriptions...</div>`;
  try {
    const res = await fetch(apiUrl(`/api/prescriptions?user_id=${activeUser.uid}`));
    const rxs = await res.json();
    if (!rxs || rxs.length === 0) {
      rxSavedList.innerHTML = `
        <div style="text-align:center; padding:1.5rem; background:#f8fafc; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:2rem; margin-bottom:4px;">📋</div>
            <div style="font-weight:700; font-size:0.95rem;">No saved digital prescriptions found</div>
            <div style="font-size:0.8rem; color:var(--text-light); margin-top:4px;">Upload an image of your prescription or consult an online doctor.</div>
        </div>
      `;
      return;
    }

    rxSavedList.innerHTML = "";
    rxs.forEach(rx => {
      const card = document.createElement("div");
      card.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:0.8rem 1rem; border:1px solid var(--border); border-radius:var(--radius-md); margin-bottom:8px; background:#fff; cursor:pointer; transition:border-color 0.2s;";
      card.innerHTML = `
        <div>
            <div style="font-weight:800; font-size:0.9rem; color:var(--text-dark);">${rx.doctor_name || 'Medical Doctor'}</div>
            <div style="font-size:0.78rem; color:var(--blue);">${rx.diagnosis || 'Prescribed Medicine'} · ${rx.created_at ? rx.created_at.split('T')[0] : 'Recent'}</div>
        </div>
        <button class="btn btn-hero-primary" style="padding:0.35rem 0.85rem; font-size:0.8rem; font-weight:700;">Select Rx ✓</button>
      `;
      card.onclick = () => {
        currentSelectedSavedRxId = rx.prescription_id;
        currentUploadedRxFile = { name: `Digital_Rx_${rx.prescription_id}.pdf` };
        window.switchRxTab("file");
        if (rxDropzone) rxDropzone.style.display = "none";
        if (rxFilePreviewBox) rxFilePreviewBox.style.display = "flex";
        if (rxFileName) rxFileName.textContent = `Official Digital Rx (${rx.prescription_id})`;
        if (rxFileSize) rxFileSize.textContent = `Issued by ${rx.doctor_name} · 100% Pre-Verified`;
        showToast(`✅ Selected Digital Rx ${rx.prescription_id}`);
      };
      rxSavedList.appendChild(card);
    });
  } catch (e) {
    rxSavedList.innerHTML = `<div style="text-align:center; padding:1.2rem; color:var(--text-mid);">Could not load records. Please upload an image file.</div>`;
  }
}

window.scrollToDoctors = function () {
  const docSec = document.getElementById("doctors");
  if (docSec) docSec.scrollIntoView({ behavior: "smooth" });
};

window.submitPrescriptionAndAddToCart = function () {
  if (!currentRxTargetMedicine) {
    showToast("⚠️ Please select a medicine first.", true);
    return;
  }

  // If no file uploaded, generate a standard verified mock upload or prompt
  if (!currentUploadedRxFile && !currentSelectedSavedRxId) {
    // Auto-attach demonstration prescription scan
    currentUploadedRxFile = { name: "Doctor_Prescription_Scan.jpg", size: 1024 * 340 };
    setRxSelectedFile(currentUploadedRxFile);
  }

  if (rxVerificationBox) rxVerificationBox.style.display = "block";
  if (rxVerifyProgressBar) rxVerifyProgressBar.style.width = "0%";
  if (rxVerifyPercent) rxVerifyPercent.textContent = "0%";
  if (rxVerifyStatusText) rxVerifyStatusText.textContent = "🔍 Step 1/3: Reading Doctor Medical License & Signature...";

  let progress = 0;
  const interval = setInterval(() => {
    progress += 25;
    if (rxVerifyProgressBar) rxVerifyProgressBar.style.width = `${progress}%`;
    if (rxVerifyPercent) rxVerifyPercent.textContent = `${progress}%`;

    if (progress === 50) {
      if (rxVerifyStatusText) rxVerifyStatusText.textContent = `💊 Step 2/3: Validating dosage safety for ${currentRxTargetMedicine.name}...`;
    } else if (progress === 75) {
      if (rxVerifyStatusText) rxVerifyStatusText.textContent = "🛡️ Step 3/3: Pharmacist AI Verification Approved!";
    } else if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        window.closePrescriptionUploadModal();
        window.addToCart(currentRxTargetMedicine.name, currentRxTargetMedicine.price, currentRxTargetMedicine.image);
        showToast(`✅ Prescription Verified! ${currentRxTargetMedicine.name} added to cart.`);
      }, 400);
    }
  }, 220);
};

// ── Global Event Delegation for Add to Cart & Upload Prescription ─
document.addEventListener("click", (e) => {
  const cartBtn = e.target.closest(".btn-cart, .add-cart-btn");
  if (cartBtn) {
    const medCard = cartBtn.closest(".med-card");
    const name = cartBtn.dataset.name || (medCard ? medCard.querySelector(".med-name")?.textContent.trim() : null);
    const priceText = cartBtn.dataset.price || (medCard ? medCard.querySelector(".med-price")?.textContent.replace(/[^0-9.]/g, "") : "0");
    const image = cartBtn.dataset.image || (medCard ? medCard.querySelector(".med-img")?.src : "");
    if (name) {
      window.addToCart(name, parseFloat(priceText) || 0, image);
    }
    return;
  }

  const rxBtn = e.target.closest(".btn-rx");
  if (rxBtn) {
    const medCard = rxBtn.closest(".med-card");
    const name = rxBtn.dataset.name || (medCard ? medCard.querySelector(".med-name")?.textContent.trim() : "Prescription Medicine");
    const priceText = rxBtn.dataset.price || (medCard ? medCard.querySelector(".med-price")?.textContent.replace(/[^0-9.]/g, "") : "300");
    const image = rxBtn.dataset.image || (medCard ? medCard.querySelector(".med-img")?.src : "images/med_neuro_sync.png");
    window.openPrescriptionUploadModal(name, parseFloat(priceText) || 0, image);
    return;
  }
});

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
let activeVideoConsultation = null;
let isCompletingVideoCall = false;
const ACTIVE_VIDEO_CONSULTATION_KEY = "antigravity_active_video_consultation";
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
    if (!res.ok || !data.consultation_id) throw new Error(data.detail || "Could not start video consultation");
    activeConsultationId = data.consultation_id;
    selectedDoctor = {
      id: data.doctor_id || doc.id,
      name: data.doctor_name || doc.name,
      specialization: data.specialization || doc.specialization,
      image: doc.image
    };
    activeVideoConsultation = {
      consultation_id: data.consultation_id,
      call_session_id: data.call_session_id || null,
      user_id: activeUser.uid,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      specialization: selectedDoctor.specialization,
      status: "Active"
    };
    localStorage.setItem(ACTIVE_VIDEO_CONSULTATION_KEY, JSON.stringify(activeVideoConsultation));
  } catch (e) {
    showToast(e.message, true);
    return;
  }

  if (videoDocName) videoDocName.textContent = `Consultation with ${doc.name}`;
  if (videoDocSpec) videoDocSpec.textContent = `${doc.specialization} · Live Video Call`;
  if (videoFeedDocLabel) videoFeedDocLabel.textContent = `${doc.name} (Live Stream)`;

  const docVideoFeed = document.getElementById("docVideoFeed");
  const doctorImgUrl = doc.image || "images/doc_video_stream.jpg";
  if (docVideoFeed) {
    docVideoFeed.src = doctorImgUrl;
    docVideoFeed.alt = `${doc.name} Live Stream Feed`;
    docVideoFeed.style.objectFit = "cover";
    docVideoFeed.style.objectPosition = "center top";
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

window.stopVideoCall = async function () {
  if (isCompletingVideoCall) return;
  if (!activeVideoConsultation || !activeConsultationId) {
    showToast("No active video consultation found.", true);
    return;
  }
  isCompletingVideoCall = true;
  if (endCallBtn) setLoading(endCallBtn, true);
  try {
    const activeUser = getActiveUser();
    const res = await fetch(apiUrl(`/api/consultations/${activeConsultationId}/complete`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: activeUser?.uid, call_session_id: activeVideoConsultation.call_session_id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Could not complete video consultation");
    const completed = data.consultation;
    activeVideoConsultation = {
      ...activeVideoConsultation,
      status: completed.status,
      completed_at: completed.completed_at,
      doctor_id: completed.doctor_id,
      doctor_name: completed.doctor_name,
      specialization: completed.specialization,
      call_session_id: completed.call_session_id
    };
    localStorage.setItem(ACTIVE_VIDEO_CONSULTATION_KEY, JSON.stringify(activeVideoConsultation));
    selectedDoctor = {
      id: completed.doctor_id,
      name: completed.doctor_name,
      specialization: completed.specialization,
      image: selectedDoctor.image
    };
  } catch (err) {
    showToast(err.message, true);
    return;
  } finally {
    if (endCallBtn) setLoading(endCallBtn, false);
    isCompletingVideoCall = false;
  }

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
  showToast("📞 Video consultation completed. Opening Digital Prescription...");
  const doc = selectedDoctor;
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
    showToast("Please end the video call before creating a prescription.", true);
  });
}

// ── CLINICAL DECISION ENGINE & DYNAMIC PRESCRIPTION SYSTEM ──────

// Master Medication Knowledge Base (All Available Pharmacy Items)
const MASTER_MEDICATIONS_DB = [
  { value: "Paracetamol 500mg", label: "Paracetamol 500mg (Fever & Mild Pain)", category: "Antipyretic / Analgesic", defaultDose: "1 tablet (500mg)", defaultFreq: "Three times a day after food (1-1-1)", defaultDur: "3-5 days", instructions: "Take with plain water after food. Do not exceed 4g/day." },
  { value: "Dolo 650", label: "Dolo 650 (Paracetamol 650mg - High Fever)", category: "Antipyretic", defaultDose: "1 tablet (650mg)", defaultFreq: "Twice daily after food (1-0-1)", defaultDur: "3 days", instructions: "For high fever (>100.5°F). Take with meals. Max 3 tablets/day." },
  { value: "Saline Nasal Drops", label: "Saline Nasal Drops (Cold & Congestion)", category: "Nasal Decongestant", defaultDose: "2 drops per nostril", defaultFreq: "Three times daily (1-1-1)", defaultDur: "5 days", instructions: "Instill drops in both nostrils before sleeping or when congested." },
  { value: "Astra-Zen Clear", label: "Astra-Zen Clear (Cough & Cold Syrup)", category: "Expectorant Syrup", defaultDose: "10 ml syrup", defaultFreq: "Three times daily (1-1-1)", defaultDur: "5 days", instructions: "Shake bottle well. Take warm water after syrup." },
  { value: "Dextromethorphan Syrup", label: "Dextromethorphan Syrup (Dry Cough)", category: "Antitussive Syrup", defaultDose: "5-10 ml syrup", defaultFreq: "Twice daily (1-0-1)", defaultDur: "5 days", instructions: "For dry tickly cough. Avoid cold drinks." },
  { value: "Guaifenesin Syrup", label: "Guaifenesin Syrup (Productive Wet Cough)", category: "Mucolytic Expectorant", defaultDose: "10 ml syrup", defaultFreq: "Three times daily (1-1-1)", defaultDur: "5 days", instructions: "Helps loosen phlegm. Drink plenty of warm water." },
  { value: "Antiseptic Throat Gargle", label: "Povidone-Iodine Throat Gargle", category: "Antiseptic Gargle", defaultDose: "10 ml in warm water", defaultFreq: "Three times daily (1-1-1)", defaultDur: "4 days", instructions: "Gargle for 30 seconds and spit out. Do not swallow." },
  { value: "Neuro-Sync", label: "Neuro-Sync (Headache & Migraine Support)", category: "Analgesic / Neuro Support", defaultDose: "1 capsule", defaultFreq: "Once daily morning (1-0-0)", defaultDur: "5 days", instructions: "Take with morning breakfast and plenty of water." },
  { value: "PainAway Pro", label: "PainAway Pro (Ibuprofen 400mg Pain Reliever)", category: "NSAID Analgesic", defaultDose: "1 tablet (400mg)", defaultFreq: "Twice daily after meals (1-0-1)", defaultDur: "3 days", instructions: "Must be taken strictly after full meals to protect stomach." },
  { value: "Gravity-Fix Gel", label: "Gravity-Fix (Topical Pain Relief Gel)", category: "Topical Gel", defaultDose: "Apply thin layer", defaultFreq: "Twice daily (1-0-1)", defaultDur: "5 days", instructions: "Gently rub over affected painful muscle. Wash hands after use." },
  { value: "Digene Gel", label: "Digene Antacid Gel (Acidity & Heartburn)", category: "Antacid Neutralizer", defaultDose: "2 teaspoonfuls (10ml)", defaultFreq: "After meals & bedtime (1-1-1)", defaultDur: "5 days", instructions: "Chew/swallow antacid gel 30 mins after meals when acid flares." },
  { value: "Famotidine 20mg", label: "Famotidine 20mg (Acid Reflux & GERD)", category: "H2 Blocker", defaultDose: "1 tablet (20mg)", defaultFreq: "Twice daily before food (1-0-1)", defaultDur: "7 days", instructions: "Take 30 mins before breakfast and dinner." },
  { value: "Fungal Diastase + Pepsin", label: "Digestive Enzyme Syrup (Indigestion & Gas)", category: "Digestive Enzymes", defaultDose: "5 ml syrup", defaultFreq: "Twice daily after meals (1-0-1)", defaultDur: "5 days", instructions: "Take immediately after principal heavy meals." },
  { value: "WHO ORS Electrolyte Powder", label: "WHO Oral Rehydration Solution (ORS)", category: "Oral Rehydration", defaultDose: "1 sachet in 1 Litre clean water", defaultFreq: "Sip continuously throughout day", defaultDur: "3 days", instructions: "Dissolve entire packet in 1L fresh water. Sip after every loose stool." },
  { value: "Saccharomyces Boulardii", label: "Probiotic Sachet (Diarrhea & Gut Care)", category: "Probiotic", defaultDose: "1 sachet in water", defaultFreq: "Twice daily (1-0-1)", defaultDur: "5 days", instructions: "Mix with room temperature water or yogurt." },
  { value: "Isabgol (Psyllium Husk)", label: "Isabgol / Psyllium Husk (Constipation)", category: "Bulk Fiber Laxative", defaultDose: "2 teaspoonfuls in warm water", defaultFreq: "Once daily at bedtime (0-0-1)", defaultDur: "7 days", instructions: "Mix in full glass of water/milk and drink immediately at bedtime." },
  { value: "Lactulose Syrup", label: "Lactulose Syrup 15ml (Constipation)", category: "Osmotic Laxative", defaultDose: "15 ml syrup", defaultFreq: "Once daily at bedtime (0-0-1)", defaultDur: "5 days", instructions: "Take at night with water. Adequate fluid intake required." },
  { value: "AllerShield", label: "AllerShield (Cetirizine 10mg - Allergy)", category: "Antihistamine", defaultDose: "1 tablet (10mg)", defaultFreq: "Once daily at bedtime (0-0-1)", defaultDur: "5 days", instructions: "Take at night. May cause mild drowsiness." },
  { value: "VitaCore Plus", label: "VitaCore Plus (Multivitamin & Zinc Support)", category: "Nutritional Supplement", defaultDose: "1 tablet", defaultFreq: "Once daily morning (1-0-0)", defaultDur: "10 days", instructions: "Take after breakfast to support overall recovery." },
  { value: "CalmWave", label: "CalmWave (Stress & Tension Relief)", category: "Herbal Anxiolytic", defaultDose: "1 tablet", defaultFreq: "Twice daily (1-0-1)", defaultDur: "7 days", instructions: "Take with warm milk or water after food." }
];

// Clinical Decision Engine
function runClinicalAssessment(complaintText = "", symptomsText = "", age = 30, weight = 60, allergies = "", pregnancyStatus = "No") {
  const text = `${complaintText} ${symptomsText}`.toLowerCase();
  
  let result = {
    diagnosis: complaintText || "General Medical Ailment",
    isRedFlag: false,
    redFlagMessage: "",
    isPediatric: (age > 0 && age < 12),
    pediatricWarning: "",
    suggestedMedicines: [],
    supportiveCare: "Maintain adequate bed rest, stay hydrated with clean warm fluids, and eat easily digestible foods."
  };

  // 1. Red Flag & Emergency Safety Evaluation
  const redFlags = [];
  if (text.includes("chest pain") || text.includes("heart pain") || text.includes("breathless") || text.includes("shortness of breath") || text.includes("difficulty breathing") || text.includes("gasping")) {
    redFlags.push("Severe respiratory / chest discomfort");
  }
  if (text.includes("anaphylaxis") || text.includes("swelling of tongue") || text.includes("swelling of throat") || text.includes("lip swelling")) {
    redFlags.push("Possible severe allergic anaphylaxis");
  }
  if (text.includes("thunderclap") || text.includes("sudden worst headache") || text.includes("stiff neck with fever") || text.includes("fainting")) {
    redFlags.push("Acute neurological red flag");
  }
  if (text.includes("vomiting blood") || text.includes("black stool") || text.includes("blood in stool") || text.includes("blood in vomit")) {
    redFlags.push("Gastrointestinal bleeding warning sign");
  }
  if (text.includes("severe dehydration") || text.includes("unconscious") || text.includes("confusion")) {
    redFlags.push("Severe systemic / metabolic emergency");
  }

  if (redFlags.length > 0) {
    result.isRedFlag = true;
    result.redFlagMessage = `⚠️ URGENT MEDICAL EVALUATION REQUIRED: Detected emergency warning sign (${redFlags.join(", ")}). Automated self-medication is contraindicated. Please seek immediate emergency medical care or visit a hospital.`;
    result.suggestedMedicines = [];
    result.supportiveCare = "Seek emergency medical intervention immediately. Keep patient calm and seated upright.";
    return result;
  }

  // 2. Pediatric Check (Age < 12)
  if (result.isPediatric) {
    result.pediatricWarning = `⚠️ Pediatric Patient (Age ${age}): Tablet formulations are contraindicated. Requires weight-based liquid/syrup dosing strictly under a pediatrician's evaluation.`;
  }

  // 3. Condition Pathways & Medication Matching

  // A. Fever / Febrile Illness
  if (text.includes("fever") || text.includes("temperature") || text.includes("chills") || text.includes("pyrexia") || text.includes("bukhar")) {
    result.diagnosis = complaintText || "Viral Febrile Episode";
    result.supportiveCare = "Drink plenty of warm fluids (water, ORS, soups). Rest in a cool, well-ventilated room. Monitor body temperature every 4 hours. Sponge with lukewarm water if temperature exceeds 101°F.";
    if (!result.isPediatric) {
      result.suggestedMedicines.push({
        name: "Paracetamol 500mg",
        dosage: "1 tablet (500mg)",
        frequency: "Three times daily after food (1-1-1)",
        duration: "3 days",
        instructions: "Take after meals if temperature > 99.5°F. Max 3g daily."
      });
    }
  }
  // B. Acidity / Heartburn / GERD
  else if (text.includes("acidity") || text.includes("heartburn") || text.includes("acid") || text.includes("reflux") || text.includes("gerd") || text.includes("burning chest")) {
    result.diagnosis = complaintText || "Gastric Hyperacidity & Acid Reflux";
    result.supportiveCare = "Eat small, frequent, non-spicy meals. Do not lie down for 2-3 hours after eating. Elevate head end of bed. Avoid tea, coffee, sodas, citrus fruits, and fried food.";
    result.suggestedMedicines.push({
      name: "Digene Gel",
      dosage: "2 teaspoonfuls (10ml)",
      frequency: "Three times daily after food (1-1-1)",
      duration: "5 days",
      instructions: "Take 30 mins after meals and at bedtime when heartburn flares."
    });
    result.suggestedMedicines.push({
      name: "Famotidine 20mg",
      dosage: "1 tablet (20mg)",
      frequency: "Twice daily before food (1-0-1)",
      duration: "7 days",
      instructions: "Take 30 mins before breakfast and dinner."
    });
  }
  // C. Indigestion / Gastric Gas
  else if (text.includes("indigestion") || text.includes("gas") || text.includes("bloating") || text.includes("fullness") || text.includes("burping")) {
    result.diagnosis = complaintText || "Functional Indigestion & Dyspepsia";
    result.supportiveCare = "Chew food slowly and thoroughly. Sip warm ginger water. Take a light 10-minute walk after meals.";
    result.suggestedMedicines.push({
      name: "Fungal Diastase + Pepsin",
      dosage: "5 ml syrup",
      frequency: "Twice daily after meals (1-0-1)",
      duration: "5 days",
      instructions: "Take immediately after principal heavy meals."
    });
  }
  // D. Cough (Dry vs Productive)
  else if (text.includes("cough") || text.includes("khasi") || text.includes("phlegm") || text.includes("mucus")) {
    if (text.includes("dry") || text.includes("tickle") || text.includes("scratchy")) {
      result.diagnosis = complaintText || "Dry Hacking Cough";
      result.supportiveCare = "Inhale steam twice daily. Sip warm water with honey (for adults). Keep indoor air humidified.";
      result.suggestedMedicines.push({
        name: "Dextromethorphan Syrup",
        dosage: "10 ml syrup",
        frequency: "Twice daily (1-0-1)",
        duration: "5 days",
        instructions: "Take after meals. Avoid cold water."
      });
    } else {
      result.diagnosis = complaintText || "Productive Wet Cough";
      result.supportiveCare = "Hydrate adequately with warm fluids to help loosen sputum secretions. Perform steam inhalation.";
      result.suggestedMedicines.push({
        name: "Guaifenesin Syrup",
        dosage: "10 ml syrup",
        frequency: "Three times daily (1-1-1)",
        duration: "5 days",
        instructions: "Helps expel mucus. Drink plenty of warm water."
      });
    }
  }
  // E. Common Cold & Nasal Congestion
  else if (text.includes("cold") || text.includes("runny nose") || text.includes("sneezing") || text.includes("blocked nose") || text.includes("congestion")) {
    result.diagnosis = complaintText || "Acute Viral Upper Respiratory Cold";
    result.supportiveCare = "Perform steam inhalation twice daily. Rest adequately. Sip warm broths and herbal teas. Use extra pillows under head.";
    result.suggestedMedicines.push({
      name: "Saline Nasal Drops",
      dosage: "2 drops per nostril",
      frequency: "Three times daily (1-1-1)",
      duration: "5 days",
      instructions: "Instill in both nostrils to clear nasal blockage naturally."
    });
  }
  // F. Sore Throat
  else if (text.includes("sore throat") || text.includes("throat pain") || text.includes("gala") || text.includes("tonsil")) {
    result.diagnosis = complaintText || "Acute Viral Sore Throat / Pharyngitis";
    result.supportiveCare = "Gargle with warm salt water (1/2 tsp salt in 1 glass warm water) 3-4 times daily. Sip warm soothing liquids.";
    result.suggestedMedicines.push({
      name: "Antiseptic Throat Gargle",
      dosage: "10 ml diluted in warm water",
      frequency: "Three times daily (1-1-1)",
      duration: "4 days",
      instructions: "Gargle thoroughly for 30 seconds and spit out. Do not swallow."
    });
  }
  // G. Headache
  else if (text.includes("headache") || text.includes("head pain") || text.includes("migraine") || text.includes("sar dard")) {
    result.diagnosis = complaintText || "Tension Headache / Mild Cephalea";
    result.supportiveCare = "Rest in a quiet, dim room. Apply a cool compress to forehead. Hydrate immediately with 2 glasses of water and limit screen time.";
    if (!result.isPediatric) {
      result.suggestedMedicines.push({
        name: "Paracetamol 500mg",
        dosage: "1 tablet (500mg)",
        frequency: "As needed for pain (SOS / Max 3/day)",
        duration: "2 days",
        instructions: "Take with water after food only if headache is intense."
      });
    }
  }
  // H. Diarrhea & Loose Motions
  else if (text.includes("diarrhea") || text.includes("loose motion") || text.includes("watery stool") || text.includes("cramps")) {
    result.diagnosis = complaintText || "Acute Gastroenteritis & Diarrhea";
    result.supportiveCare = "Prevent dehydration: Drink WHO ORS solution continuously after every loose stool. Eat bland BRAT foods (Banana, Rice, Applesauce, Toast). Avoid dairy, spicy foods, and fruit juices.";
    result.suggestedMedicines.push({
      name: "WHO ORS Electrolyte Powder",
      dosage: "1 sachet in 1 Litre clean water",
      frequency: "Sip continuously after every loose stool",
      duration: "3 days",
      instructions: "Dissolve 1 full sachet in 1L fresh water. Sip regularly throughout the day."
    });
    result.suggestedMedicines.push({
      name: "Saccharomyces Boulardii",
      dosage: "1 sachet",
      frequency: "Twice daily (1-0-1)",
      duration: "5 days",
      instructions: "Mix in plain water or curd to restore healthy gut microflora."
    });
  }
  // I. Constipation
  else if (text.includes("constipation") || text.includes("hard stool") || text.includes("straining")) {
    result.diagnosis = complaintText || "Functional Constipation";
    result.supportiveCare = "Increase dietary fiber intake (whole grains, green vegetables, fruits). Drink 8-10 glasses of water daily. Walk for 20-30 minutes daily.";
    result.suggestedMedicines.push({
      name: "Isabgol (Psyllium Husk)",
      dosage: "2 teaspoonfuls",
      frequency: "Once daily at bedtime (0-0-1)",
      duration: "7 days",
      instructions: "Mix in a full glass of warm water or milk and drink immediately at bedtime."
    });
  }
  // J. Mild Allergy & Rash
  else if (text.includes("allergy") || text.includes("hives") || text.includes("rash") || text.includes("itching") || text.includes("khujli")) {
    result.diagnosis = complaintText || "Allergic Dermatitis & Urticaria";
    result.supportiveCare = "Identify and avoid triggering allergens. Wear loose cotton clothes. Apply cold soothing compresses to itchy areas.";
    result.suggestedMedicines.push({
      name: "AllerShield",
      dosage: "1 tablet (10mg)",
      frequency: "Once daily at bedtime (0-0-1)",
      duration: "5 days",
      instructions: "Take at night with water. May cause mild drowsiness."
    });
  }
  // K. Muscle & Body Pain
  else if (text.includes("body pain") || text.includes("muscle pain") || text.includes("body ache") || text.includes("back pain") || text.includes("joint pain")) {
    result.diagnosis = complaintText || "Musculoskeletal Myalgia & Fatigue";
    result.supportiveCare = "Apply RICE protocol (Rest, Ice/Warm compress, Compression, Elevation). Perform gentle passive stretching. Avoid heavy lifting.";
    result.suggestedMedicines.push({
      name: "Gravity-Fix Gel",
      dosage: "Apply thin layer",
      frequency: "Twice daily (1-0-1)",
      duration: "5 days",
      instructions: "Gently apply over painful muscle area. Wash hands thoroughly after application."
    });
  }
  // L. Fallback / General
  else {
    result.diagnosis = complaintText || "General Primary Consultation";
    result.supportiveCare = "Rest adequately, maintain healthy hydration, and monitor your vitals. Review with physician if discomfort persists.";
    result.suggestedMedicines.push({
      name: "VitaCore Plus",
      dosage: "1 tablet",
      frequency: "Once daily morning (1-0-0)",
      duration: "10 days",
      instructions: "Take after breakfast to support overall nutritional recovery."
    });
  }

  return result;
}

// Master Dropdown Options HTML Generator
function getMedicationSelectOptionsHtml(selectedMedName = "") {
  return MASTER_MEDICATIONS_DB.map(med => `
    <option value="${med.value}" ${med.value === selectedMedName ? "selected" : ""}>
      ${med.label}
    </option>
  `).join("");
}

// Helper to create a single row for #prescMedRowsContainer
function createPrescriptionMedicineRowHtml(selectedMedName = "", dosage = "", freq = "", dur = "") {
  // If no med selected, pick first
  const targetMed = MASTER_MEDICATIONS_DB.find(m => m.value === selectedMedName) || MASTER_MEDICATIONS_DB[0];
  
  const finalDosage = dosage || targetMed.defaultDose;
  const finalFreq = freq || targetMed.defaultFreq;
  const finalDur = dur || targetMed.defaultDur;

  return `
    <div class="presc-med-row" style="background: var(--bg); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); display:grid; grid-template-columns: 2fr 1.2fr 1.5fr 1fr auto; gap: 0.6rem; align-items: end;">
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Medicine Name</label>
            <select class="rx-med-name" onchange="if(window.onRxMedSelectionChange) window.onRxMedSelectionChange(this)" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem; background:#fff;">
                ${getMedicationSelectOptionsHtml(targetMed.value)}
            </select>
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Dosage</label>
            <input type="text" class="rx-med-dosage" value="${finalDosage}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem;">
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Frequency</label>
            <select class="rx-med-freq" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem; background:#fff;">
                <option value="Twice daily after meals (1-0-1)" ${finalFreq.includes("1-0-1") ? "selected" : ""}>Twice daily after food (1-0-1)</option>
                <option value="Three times a day (1-1-1)" ${finalFreq.includes("1-1-1") ? "selected" : ""}>Three times a day (1-1-1)</option>
                <option value="Once daily at bedtime (0-0-1)" ${finalFreq.includes("0-0-1") ? "selected" : ""}>Once daily at bedtime (0-0-1)</option>
                <option value="Once daily morning (1-0-0)" ${finalFreq.includes("1-0-0") ? "selected" : ""}>Once daily morning (1-0-0)</option>
                <option value="Sip continuously after loose stool" ${finalFreq.includes("Sip") ? "selected" : ""}>Sip continuously after loose stool</option>
                <option value="As needed for pain / fever (SOS)" ${finalFreq.includes("SOS") ? "selected" : ""}>As needed (SOS / Max 3/day)</option>
            </select>
        </div>
        <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-mid); display:block; margin-bottom:2px;">Duration</label>
            <input type="text" class="rx-med-dur" value="${finalDur}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit; font-size:0.85rem;">
        </div>
        <button type="button" class="remove-rx-row-btn" style="background:none; border:none; color:var(--red); font-size:1.2rem; cursor:pointer; padding:0 4px; line-height:1;" title="Remove row">✕</button>
    </div>
  `;
}

// When doctor changes selected medicine in row, auto-fill default dose & freq for that specific med
window.onRxMedSelectionChange = function(selectElem) {
  const row = selectElem.closest(".presc-med-row");
  if (!row) return;

  const val = selectElem.value;
  const medObj = MASTER_MEDICATIONS_DB.find(m => m.value === val);
  if (medObj) {
    const dosageInput = row.querySelector(".rx-med-dosage");
    const durInput = row.querySelector(".rx-med-dur");
    if (dosageInput) dosageInput.value = medObj.defaultDose;
    if (durInput) durInput.value = medObj.defaultDur;
  }
};

// Dynamic Prescription Diagnosis Tag Clicked
window.updatePrescriptionDiagnosis = function(newDiagnosis) {
  const prescDiagnosis = document.getElementById("prescDiagnosis");
  if (prescDiagnosis) prescDiagnosis.value = newDiagnosis;
  
  // Re-run assessment and populate prescription modal rows
  populatePrescriptionModalForComplaint(newDiagnosis);
};

// Internal function to populate prescription modal dynamically based on patient complaint
function populatePrescriptionModalForComplaint(complaintText = "", symptomsText = "", age = 30, weight = 60, allergies = "", pregnancyStatus = "No") {
  const assessment = runClinicalAssessment(complaintText, symptomsText, age, weight, allergies, pregnancyStatus);

  const prescDiagnosis = document.getElementById("prescDiagnosis");
  const prescInstructions = document.getElementById("prescInstructions");
  const prescSafetyBanner = document.getElementById("prescSafetyBanner");
  const container = document.getElementById("prescMedRowsContainer");

  if (prescDiagnosis) prescDiagnosis.value = assessment.diagnosis;
  if (prescInstructions) prescInstructions.value = assessment.supportiveCare;

  // Handle Safety Banner (Red flags or Pediatric Warnings)
  if (prescSafetyBanner) {
    if (assessment.isRedFlag) {
      prescSafetyBanner.style.display = "block";
      prescSafetyBanner.style.background = "#fef2f2";
      prescSafetyBanner.style.border = "1.5px solid #fecaca";
      prescSafetyBanner.style.color = "#991b1b";
      prescSafetyBanner.innerHTML = assessment.redFlagMessage;
    } else if (assessment.isPediatric) {
      prescSafetyBanner.style.display = "block";
      prescSafetyBanner.style.background = "#fffbeb";
      prescSafetyBanner.style.border = "1.5px solid #fde68a";
      prescSafetyBanner.style.color = "#92400e";
      prescSafetyBanner.innerHTML = assessment.pediatricWarning;
    } else {
      prescSafetyBanner.style.display = "none";
      prescSafetyBanner.innerHTML = "";
    }
  }

  // Populate Medicine Rows
  if (container) {
    container.innerHTML = "";

    if (assessment.isRedFlag || assessment.suggestedMedicines.length === 0) {
      // Empty placeholder prompt
      container.innerHTML = `
        <div style="padding: 1rem; background: var(--bg); border: 1.5px dashed var(--border); border-radius: var(--radius-sm); text-align: center; color: var(--text-mid); font-size: 0.88rem;">
          ${assessment.isRedFlag ? '🚨 <strong>Emergency Warning Active:</strong> Routine automated medicines suppressed. Doctor may manually click "+ Add Medicine" after clinical evaluation.' : '🌱 <strong>Supportive Care Recommended:</strong> No automatic medications needed. Click "+ Add Medicine" above to prescribe manually if clinically indicated.'}
        </div>
      `;
    } else {
      assessment.suggestedMedicines.forEach(m => {
        const div = document.createElement("div");
        div.innerHTML = createPrescriptionMedicineRowHtml(m.name, m.dosage, m.frequency, m.duration);
        container.appendChild(div.firstElementChild);
      });
    }
  }
}

// ── Open Digital Prescription Modal ─────────────────────────
window.openCreatePrescriptionModal = function (docId, docName, docSpec, defaultDiagnosis, symptomsText = "", age = 30, weight = 60, allergies = "", pregnancyStatus = "No") {
  const activeUser = getActiveUser();
  if (!activeUser) {
    showToast("⚠️ Please login to generate prescription.", true);
    openAuthModal(false);
    return;
  }

  const prescDocName = document.getElementById("prescDocName");
  const prescDocSpec = document.getElementById("prescDocSpec");

  if (prescDocName) prescDocName.textContent = docName || selectedDoctor.name;
  if (prescDocSpec) prescDocSpec.textContent = docSpec || selectedDoctor.specialization;
  
  const patientInput = document.getElementById("patientName");
  if (patientInput) patientInput.value = activeUser.email.split("@")[0].replace(/\./g, " ").toUpperCase();

  // Populate dynamic diagnosis, safety warnings, and condition-matched medicines
  populatePrescriptionModalForComplaint(defaultDiagnosis || "Viral Fever with Cold", symptomsText, age, weight, allergies, pregnancyStatus);

  if (prescriptionModal) prescriptionModal.style.display = "flex";
};

if (closePrescriptionModal) {
  closePrescriptionModal.addEventListener("click", () => {
    if (prescriptionModal) prescriptionModal.style.display = "none";
  });
}

if (addPrescMedRowBtn && prescMedRowsContainer) {
  addPrescMedRowBtn.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = createPrescriptionMedicineRowHtml("VitaCore Plus", "1 tablet", "Once daily morning (1-0-0)", "7 days");
    prescMedRowsContainer.appendChild(div.firstElementChild);
  });

  prescMedRowsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-rx-row-btn");
    if (removeBtn) {
      const rows = prescMedRowsContainer.querySelectorAll(".presc-med-row");
      if (rows.length > 0) {
        removeBtn.closest(".presc-med-row").remove();
      } else {
        showToast("No medicine rows to remove.", true);
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
      const name = row.querySelector(".rx-med-name")?.value || "General Medicine";
      const dosage = row.querySelector(".rx-med-dosage")?.value || "1 dose";
      const freq = row.querySelector(".rx-med-freq")?.value || "Twice daily";
      const dur = row.querySelector(".rx-med-dur")?.value || "5 days";
      medicinesList.push({
        name: name,
        dosage: dosage,
        frequency: freq,
        duration: dur,
        instructions: "Take after meals with water as advised"
      });
    });

    setLoading(savePrescriptionBtn, true);
    try {
      const res = await fetch(apiUrl("/api/prescriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUser.uid,
          consultation_id: activeVideoConsultation?.consultation_id || null,
          patient_name: patientName,
          doctor_id: activeVideoConsultation?.doctor_id || selectedDoctor.id,
          doctor_name: activeVideoConsultation?.doctor_name || selectedDoctor.name,
          doctor_specialization: activeVideoConsultation?.specialization || selectedDoctor.specialization,
          diagnosis: diagnosis,
          medicines: medicinesList,
          instructions: instructions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate prescription");

      showToast(`✅ Digital Prescription ${data.prescription_id} issued successfully!`);
      if (activeVideoConsultation) {
        activeVideoConsultation.prescription_id = data.prescription_id;
        localStorage.setItem(ACTIVE_VIDEO_CONSULTATION_KEY, JSON.stringify(activeVideoConsultation));
      }
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
        <td colspan="5" style="padding: 14px 8px; text-align: center; color: var(--text-mid);">
          🌱 <em>Non-pharmacological supportive care & lifestyle management advised. No prescription medication required.</em>
        </td>
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

// ============================================================
//  8. COMMON HEALTH PROBLEMS & MEDICINES REFERENCE DATABASE
// ============================================================
const HEALTH_CONDITIONS_DATA = [
  {
    id: "HC-01",
    name: "Fever",
    category: "Fever & Flu",
    icon: "🌡️",
    symptoms: ["Body temperature above 37.5°C (99.5°F)", "Chills and shivering", "Sweating & headache", "General weakness & muscle aches"],
    causes: ["Viral infections (Cold, Flu)", "Bacterial infections", "Immunization / Vaccines", "Heat exhaustion"],
    selfCare: ["Drink plenty of fluids (water, clear broths, ORS)", "Get adequate physical rest", "Wear light, breathable clothing", "Use lukewarm water sponge baths if uncomfortable"],
    otcCategory: "Antipyretic / Analgesic",
    genericMedicine: "Paracetamol / Acetaminophen",
    precautions: ["Dosage depends strictly on age, weight, and medical history. Never exceed 4000mg/day for adults.", "Avoid taking multiple products containing paracetamol simultaneously.", "Avoid alcohol while taking paracetamol to prevent liver strain."],
    whoAvoid: ["Individuals with severe liver disease or chronic alcoholism", "Persons with known hypersensitivity to paracetamol"],
    whenDoctor: ["Fever exceeds 39.4°C (103°F) or lasts longer than 3 days", "Accompanied by severe headache, stiff neck, or skin rash"],
    emergencyRedFlags: ["Difficulty breathing, chest pain, confusion, persistent vomiting, or seizures (Seek Immediate Emergency Care 🚨)"]
  },
  {
    id: "HC-02",
    name: "Common Cold",
    category: "Fever & Flu",
    icon: "🤧",
    symptoms: ["Runny or stuffy nose", "Sneezing & watery eyes", "Mild throat irritation", "Low-grade fever & mild headache"],
    causes: ["Rhinovirus or Enterovirus infection", "Seasonal temperature shifts", "Close contact with infected individuals"],
    selfCare: ["Stay hydrated with warm water, tea, or soups", "Steam inhalation or saline nasal sprays", "Rest and sleep to boost immune recovery", "Use extra pillows to elevate head while sleeping"],
    otcCategory: "Decongestants & Saline Nasal Sprays",
    genericMedicine: "Saline Nasal Drops / Oxymetazoline (Short-term)",
    precautions: ["Antibiotics DO NOT cure viral colds and should never be used without a prescription.", "Oral decongestants may elevate blood pressure."],
    whoAvoid: ["Hypertension (high blood pressure) patients should avoid oral decongestants like pseudoephedrine without doctor advice.", "Children under 6 years without pediatric guidance"],
    whenDoctor: ["Symptoms worsen after 7-10 days", "High fever or severe facial sinus pain develops"],
    emergencyRedFlags: ["Shortness of breath, wheezing, or severe chest tightness"]
  },
  {
    id: "HC-03",
    name: "Cough",
    category: "Fever & Flu",
    icon: "🗣️",
    symptoms: ["Dry tickly cough or wet phlegm cough", "Chest discomfort from coughing", "Throat irritation", "Mild hoarseness"],
    causes: ["Post-viral airway irritation", "Upper respiratory tract infection", "Allergies or environmental irritants (smoke/dust)", "Acid reflux (GERD)"],
    selfCare: ["Sip warm honey & lemon water (for adults and children > 1 yr)", "Use a cool-mist humidifier in your room", "Avoid exposure to tobacco smoke and pollution"],
    otcCategory: "Expectorants / Mucolytics (Wet Cough) or Antitussives (Dry Cough)",
    genericMedicine: "Guaifenesin (Wet) / Dextromethorphan (Dry Cough)",
    precautions: ["Do not give honey to infants under 12 months (risk of botulism).", "Cough suppressants should not be used for heavy productive phlegm."],
    whoAvoid: ["Asthma patients without doctor consultation", "Pregnant women without medical approval"],
    whenDoctor: ["Cough lasts longer than 2-3 weeks", "Coughing up yellow/green phlegm with persistent fever"],
    emergencyRedFlags: ["Coughing up blood, severe shortness of breath, or bluish lips"]
  },
  {
    id: "HC-04",
    name: "Headache",
    category: "Pain & Cramps",
    icon: "🧠",
    symptoms: ["Dull aching pain on both sides of head (Tension)", "Throbbing pain on one side (Migraine)", "Sensitivity to light/sound", "Neck tightness"],
    causes: ["Stress & mental fatigue", "Dehydration or skipped meals", "Eye strain from screens", "Lack of sleep or caffeine withdrawal"],
    selfCare: ["Rest in a quiet, dark room", "Apply a cold or warm compress to forehead/neck", "Hydrate immediately with 1-2 glasses of water", "Limit screen time and practice neck stretches"],
    otcCategory: "Analgesic / Pain Reliever",
    genericMedicine: "Paracetamol / Ibuprofen (when appropriate)",
    precautions: ["Avoid overuse of pain relievers (> 3 days/week) to prevent rebound medication-overuse headaches.", "Take NSAIDs like Ibuprofen with food."],
    whoAvoid: ["Patients with stomach ulcers, kidney disease, or bleeding disorders should avoid NSAIDs (Ibuprofen).", "Third-trimester pregnancy (avoid NSAIDs)"],
    whenDoctor: ["Headaches recur frequently (> 2 times a week)", "Headache accompanied by nausea, aura, or vision changes"],
    emergencyRedFlags: ["Sudden 'thunderclap' severe headache, confusion, fainting, high fever, or arm numbness"]
  },
  {
    id: "HC-05",
    name: "Sore Throat",
    category: "General",
    icon: "🥛",
    symptoms: ["Scratchy or painful feeling in throat", "Pain worsened by swallowing", "Swollen glands in neck", "Hoarse voice"],
    causes: ["Viral pharyngitis (Cold/Flu viruses)", "Strep throat (Bacterial infection)", "Dry air or mouth breathing", "Acid reflux irritation"],
    selfCare: ["Gargle with warm salt water (1/2 tsp salt in 1 glass water) 3-4 times daily", "Drink warm soothing liquids (herbal tea, warm broth)", "Use lozenges to keep throat moist"],
    otcCategory: "Antiseptic Throat Gargles & Throat Lozenges",
    genericMedicine: "Povidone-Iodine / Chlorhexidine Gargle & Amylmetacresol Lozenges",
    precautions: ["Do not swallow iodine gargles.", "Avoid hard lozenges in young children due to choking risk."],
    whoAvoid: ["Thyroid disorder patients should consult doctor before using iodine gargles.", "Severe allergy to lozenge ingredients"],
    whenDoctor: ["Sore throat lasts longer than 4-5 days", "White patches visible on tonsils with high fever"],
    emergencyRedFlags: ["Inability to swallow liquids or saliva, difficulty breathing, or drooling"]
  },
  {
    id: "HC-06",
    name: "Body Pain",
    category: "Pain & Cramps",
    icon: "🧍",
    symptoms: ["Generalized dull muscular aching", "Joint stiffness", "Fatigue and heavy feeling in limbs"],
    causes: ["Viral illnesses (Flu, Dengue, Viral fever)", "Unaccustomed physical exertion", "Poor posture or prolonged sitting", "Vitamin D / B12 deficiencies"],
    selfCare: ["Warm baths or warm showers", "Gentle stretching and light walking", "Ensure 7-8 hours of sound sleep", "Maintain adequate hydration and balanced nutrition"],
    otcCategory: "Analgesic / Muscle Relaxant Support",
    genericMedicine: "Paracetamol / Topical Counter-irritants",
    precautions: ["Rest is essential for recovery.", "Avoid heavy lifting or strenuous workouts while experiencing acute generalized pain."],
    whoAvoid: ["Liver impairment patients (limit Paracetamol)", "Severe kidney impairment (avoid NSAIDs)"],
    whenDoctor: ["Body pain persists over 5 days without improvement", "Accompanied by joint swelling, redness, or high fever"],
    emergencyRedFlags: ["Inability to walk, sudden severe muscle weakness, or dark brown urine"]
  },
  {
    id: "HC-07",
    name: "Mild Allergy",
    category: "General",
    icon: "🌿",
    symptoms: ["Itchy skin or mild hives/welts", "Sneezing & itchy runny nose", "Red itchy eyes", "Mild localized swelling"],
    causes: ["Pollen, dust mites, or pet dander", "Certain food items or insect bites", "Cosmetics, detergents, or synthetic fabrics"],
    selfCare: ["Identify and avoid known allergic triggers", "Wash face and hands after outdoor exposure", "Apply cold compresses to itchy skin areas"],
    otcCategory: "Non-drowsy Antihistamines",
    genericMedicine: "Cetirizine / Loratadine / Fexofenadine",
    precautions: ["Some antihistamines may cause mild drowsiness; exercise caution when driving.", "Do not combine multiple antihistamines unless advised."],
    whoAvoid: ["Severe renal impairment (requires dose adjustment)", "Glaucoma or prostate enlargement (consult doctor)"],
    whenDoctor: ["Symptoms do not improve with OTC antihistamines", "Widespread skin rash develops"],
    emergencyRedFlags: ["Swelling of lips, tongue, face, or throat, or difficulty breathing/wheezing (Anaphylaxis - Seek Emergency Care Immediately 🚨)"]
  },
  {
    id: "HC-08",
    name: "Acidity / Heartburn",
    category: "Digestive",
    icon: "🔥",
    symptoms: ["Burning chest pain behind breastbone (Heartburn)", "Sour taste or acid regurgitation in mouth", "Upper abdominal bloating", "Discomfort after eating"],
    causes: ["Spicy, oily, or fried foods", "Lying down immediately after eating", "Excessive caffeine, carbonated drinks, or smoking", "Overeating or stress"],
    selfCare: ["Eat smaller, more frequent meals", "Remain upright for at least 2-3 hours after meals", "Elevate the head of your bed by 6 inches", "Avoid triggering foods (citrus, chocolate, heavy spices)"],
    otcCategory: "Antacids & H2 Blockers / PPIs",
    genericMedicine: "Magnesium Hydroxide + Aluminium Hydroxide Gel / Famotidine / Omeprazole",
    precautions: ["Antacids provide fast temporary relief; do not rely on them long-term without investigating root causes.", "Separate antacids from other medications by 2 hours."],
    whoAvoid: ["Chronic kidney disease (avoid high magnesium/aluminium antacids)", "Pregnant women should consult before taking systemic acid suppressants"],
    whenDoctor: ["Symptoms occur > 2 times a week for more than 2 weeks", "Unexplained weight loss or difficulty swallowing food"],
    emergencyRedFlags: ["Chest pain radiating to arm, jaw, or neck, accompanied by cold sweats or shortness of breath (Possible Cardiac Event 🚨)"]
  },
  {
    id: "HC-09",
    name: "Indigestion",
    category: "Digestive",
    icon: "🤢",
    symptoms: ["Feeling uncomfortably full during or after meals", "Nausea & mild upper stomach discomfort", "Belching & gas", "Bloating"],
    causes: ["Eating too fast or chewing insufficiently", "Greasy or heavy meals", "Emotional stress or anxiety", "Excessive alcohol or tobacco"],
    selfCare: ["Chew food slowly and thoroughly", "Sip peppermint or ginger tea", "Avoid tight clothing around abdomen", "Take a gentle 10-minute walk after meals"],
    otcCategory: "Digestive Enzymes & Anti-flatulents",
    genericMedicine: "Fungal Diastase + Pepsin / Simethicone",
    precautions: ["Simethicone helps break gas bubbles; it does not stop acid production.", "Avoid lying down flat right after eating."],
    whoAvoid: ["Hypersensitivity to digestive enzymes", "Severe pancreatitis patients"],
    whenDoctor: ["Indigestion persists for over a week", "Accompanied by persistent vomiting or dark tarry stools"],
    emergencyRedFlags: ["Severe sharp abdominal pain, high fever, or vomiting blood"]
  },
  {
    id: "HC-10",
    name: "Diarrhea",
    category: "Digestive",
    icon: "🚰",
    symptoms: ["Loose, watery bowel movements (> 3 times/day)", "Abdominal cramps", "Urgent need to evacuate", "Mild thirst"],
    causes: ["Viral or bacterial gastroenteritis ('stomach flu')", "Contaminated food or water", "Food intolerances (e.g. lactose)", "Side effect of antibiotics"],
    selfCare: ["Drink Oral Rehydration Solution (ORS) continuously after every loose stool", "Eat bland BRAT diet foods (Bananas, Rice, Applesauce, Toast)", "Avoid dairy, caffeine, spicy foods, and high-sugar juices"],
    otcCategory: "Oral Rehydration Salts (ORS) & Probiotics",
    genericMedicine: "WHO-Formula ORS & Sacchromyces Boulardii / Lactic Acid Bacillus",
    precautions: ["PREVENT DEHYDRATION FIRST: ORS is essential for all ages.", "DO NOT use anti-motility drugs (like Loperamide) if fever or bloody stools are present."],
    whoAvoid: ["Infants and elderly should be evaluated by a doctor promptly", "Severe kidney failure (monitor potassium in ORS)"],
    whenDoctor: ["Diarrhea lasts more than 48 hours", "Signs of moderate dehydration (dry mouth, little urine, dizziness)"],
    emergencyRedFlags: ["Blood or pus in stools, high fever (> 38.5°C), or signs of severe dehydration / confusion"]
  },
  {
    id: "HC-11",
    name: "Constipation",
    category: "Digestive",
    icon: "🧱",
    symptoms: ["Fewer than 3 bowel movements per week", "Hard, dry, or lumpy stools", "Straining during defecation", "Feeling of incomplete evacuation"],
    causes: ["Low dietary fiber intake", "Insufficient water intake", "Lack of physical activity", "Ignoring the urge to pass stool", "Certain medications (iron supplements, opioids)"],
    selfCare: ["Increase dietary fiber (whole grains, fruits, vegetables, lentils)", "Drink 8-10 glasses of water daily", "Engage in daily exercise like walking or swimming", "Establish a regular bathroom routine"],
    otcCategory: "Bulk-forming & Osmotic Laxatives",
    genericMedicine: "Isabgol (Psyllium Husk) / Lactulose / Polyethylene Glycol (PEG)",
    precautions: ["Always take Psyllium husk with a full glass of water to prevent intestinal blockage.", "Laxatives should be used short-term (under 1 week)."],
    whoAvoid: ["Intestinal obstruction or acute inflammatory bowel disease", "Unexplained sudden severe abdominal pain"],
    whenDoctor: ["Constipation lasts over 2 weeks despite dietary changes", "New onset constipation in individuals > 50 years"],
    emergencyRedFlags: ["Severe abdominal pain, vomiting, inability to pass gas, or blood in stool"]
  },
  {
    id: "HC-12",
    name: "Nausea",
    category: "Digestive",
    icon: "🤢",
    symptoms: ["Queasy stomach sensation", "Urge to vomit", "Excessive salivation", "Cold sweating"],
    causes: ["Motion sickness or travel", "Indigestion or gastritis", "Early pregnancy (morning sickness)", "Migraine or stress"],
    selfCare: ["Sip ginger tea or fresh lemon water", "Eat small bland snacks (crackers, dry toast)", "Get fresh air and avoid strong odors/perfumes", "Sit upright; avoid lying flat right after eating"],
    otcCategory: "Antiemetics & Ginger Supplements",
    genericMedicine: "Vitamin B6 (Pyridoxine) / Dimenhydrinate (Motion Sickness)",
    precautions: ["Stay hydrated with small, frequent sips of water.", "Avoid greasy, fried, or overly sweet foods."],
    whoAvoid: ["Dimenhydrinate should be used cautiously in glaucoma or urinary retention.", "Consult doctor before using any antiemetic during pregnancy"],
    whenDoctor: ["Nausea persists over 48 hours preventing fluid intake", "Accompanied by persistent vomiting"],
    emergencyRedFlags: ["Nausea with chest pain, severe headache, confusion, or stiff neck"]
  },
  {
    id: "HC-13",
    name: "Vomiting",
    category: "Digestive",
    icon: "🤮",
    symptoms: ["Forced expulsion of stomach contents", "Nausea & abdominal cramping", "Sweating & pale skin"],
    causes: ["Gastroenteritis (Food poisoning)", "Excessive alcohol consumption", "Pregnancy", "Motion sickness"],
    selfCare: ["Do not eat solid food for 2-3 hours after vomiting", "Rest the stomach, then sip small amounts of ORS or water every 15 mins", "Reintroduce bland foods (rice, bananas, toast) slowly"],
    otcCategory: "Oral Electrolytes & Probiotics",
    genericMedicine: "Oral Rehydration Salts (ORS)",
    precautions: ["Preventing dehydration is the primary goal.", "Do not force solid foods until vomiting subsides."],
    whoAvoid: ["Inability to keep any liquids down for > 12 hours requires IV fluids in clinic"],
    whenDoctor: ["Vomiting lasts more than 24 hours", "Inability to retain liquids for more than 12 hours"],
    emergencyRedFlags: ["Vomiting blood or dark coffee-ground material, severe head injury prior, or extreme lethargy"]
  },
  {
    id: "HC-14",
    name: "Mild Dehydration",
    category: "General",
    icon: "💧",
    symptoms: ["Increased thirst & dry mouth", "Dark yellow or concentrated urine", "Mild dizziness or lightheadedness upon standing", "Dry skin & fatigue"],
    causes: ["Hot weather & sweating", "Inadequate fluid intake", "Vomiting, diarrhea, or fever", "Excessive exercise"],
    selfCare: ["Drink WHO-Formula ORS, coconut water, or clear broth immediately", "Rest in a cool, shaded environment", "Sip liquids continuously in small amounts rather than chugging large volumes"],
    otcCategory: "Oral Rehydration Salts (ORS)",
    genericMedicine: "WHO Electrolyte ORS Powder",
    precautions: ["Commercial sugary energy drinks or sodas are NOT proper oral rehydration solutions.", "ORS should be reconstituted in clean drinking water according to packet directions."],
    whoAvoid: ["Severe kidney failure patients must monitor potassium and fluid intake under doctor supervision"],
    whenDoctor: ["Dizziness or thirst persists despite 24 hours of ORS hydration", "No urination for over 8 hours"],
    emergencyRedFlags: ["Extreme confusion, sunken eyes, rapid heart rate, fainting, or inability to stay awake (Severe Dehydration 🚨)"]
  },
  {
    id: "HC-15",
    name: "Menstrual Cramps",
    category: "Pain & Cramps",
    icon: "🩸",
    symptoms: ["Throbbing or cramping pain in lower abdomen", "Dull ache in lower back & thighs", "Mild nausea or loose stools during period"],
    causes: ["Prostaglandin release causing uterine muscle contraction", "Primary dysmenorrhea", "Secondary causes (Endometriosis, Fibroids - requires gynae check)"],
    selfCare: ["Apply a heating pad or hot water bottle to lower abdomen", "Perform gentle pelvic stretches or yoga", "Warm baths and relaxation techniques", "Stay hydrated and reduce salt intake to decrease bloating"],
    otcCategory: "Analgesic / Antispasmodic (NSAIDs)",
    genericMedicine: "Ibuprofen / Mefenamic Acid (when prescribed/appropriate)",
    precautions: ["Take pain relievers with meals to minimize stomach upset.", "Do not exceed recommended dose."],
    whoAvoid: ["History of stomach ulcers or aspirin allergy", "Renal impairment"],
    whenDoctor: ["Cramps suddenly worsen significantly in intensity", "Pain persists outside of menstrual period days"],
    emergencyRedFlags: ["Abnormally heavy bleeding (soaking > 2 pads/hour for consecutive hours), severe fever, or sudden severe sharp pelvic pain"]
  },
  {
    id: "HC-16",
    name: "Muscle Pain",
    category: "Pain & Cramps",
    icon: "💪",
    symptoms: ["Localized muscular soreness & tenderness", "Stiffness & tight muscle knots", "Pain aggravated by movement"],
    causes: ["Delayed Onset Muscle Soreness (DOMS) after exercise", "Muscle strain or sprain", "Overuse or awkward posture"],
    selfCare: ["Apply R.I.C.E protocol (Rest, Ice for first 48 hours, Compression, Elevation)", "Switch to warm compress after 48 hours to relax muscle", "Gentle passive stretching", "Stay hydrated"],
    otcCategory: "Topical Pain Relief Gels & Oral Analgesics",
    genericMedicine: "Diclofenac / Methyl Salicylate Gel & Paracetamol",
    precautions: ["Wash hands after applying topical gels; avoid contact with eyes and broken skin.", "Do not apply heat pads directly over freshly applied topical ointments."],
    whoAvoid: ["Hypersensitivity to topical NSAIDs", "Open wounds or eczema skin"],
    whenDoctor: ["Pain does not improve after 7 days of self-care", "Accompanied by visible joint deformity or inability to bear weight"],
    emergencyRedFlags: ["Inability to move limb, sudden severe swelling, or dark brown urine after extreme workout"]
  },
  {
    id: "HC-17",
    name: "Toothache",
    category: "Pain & Cramps",
    icon: "🦷",
    symptoms: ["Sharp, throbbing, or constant tooth pain", "Swallowing or chewing discomfort", "Sensitivity to hot or cold foods", "Gum swelling"],
    causes: ["Dental caries (Tooth decay)", "Gum infection (Gingivitis/Periodontitis)", "Cracked tooth or loose filling", "Impacted wisdom tooth"],
    selfCare: ["Rinse mouth with warm salt water", "Floss gently to remove any trapped food debris", "Apply cold compress to outer cheek", "Avoid very hot, cold, or sugary foods"],
    otcCategory: "Topical Analgesics & Oral Pain Relievers",
    genericMedicine: "Clove Oil (Topical) / Paracetamol (Short-term pain control)",
    precautions: ["OTC remedies provide TEMPORARY relief only; dental treatment is required to fix the underlying cause.", "Do not place aspirin tablets directly against gums (causes chemical burn)."],
    whoAvoid: ["Undiagnosed allergy to clove oil", "Patients with severe bleeding disorders"],
    whenDoctor: ["Schedule a dentist visit promptly for any tooth pain lasting > 1 day"],
    emergencyRedFlags: ["Swelling extending to jaw, eye, or neck, difficulty breathing/swallowing, or high fever (Dental Abscess 🚨)"]
  },
  {
    id: "HC-18",
    name: "Minor Cuts / Wounds",
    category: "General",
    icon: "🩹",
    symptoms: ["Small surface skin break", "Mild bleeding that stops with pressure", "Slight redness & tenderness around cut"],
    causes: ["Kitchen knife slips, paper cuts, minor scrapes", "Abrasions from outdoor falls"],
    selfCare: ["Wash hands thoroughly before touching wound", "Rinse wound under cool running water and mild soap", "Apply gentle direct pressure with clean gauze to stop bleeding", "Apply thin layer of petroleum jelly or antiseptic ointment and cover with sterile bandage"],
    otcCategory: "Topical Antiseptics & Wound Dressings",
    genericMedicine: "Povidone-Iodine Ointment / Petroleum Jelly & Sterile Bandages",
    precautions: ["Change bandage daily or whenever it becomes wet or dirty.", "Ensure Tetanus vaccination status is up to date (within 5-10 years)."],
    whoAvoid: ["Deep punctures, animal/human bites, or heavily contaminated wounds require medical care immediately."],
    whenDoctor: ["Wound was caused by dirty/rusty object or animal bite", "Signs of infection develop (pus, increasing redness, warmth)"],
    emergencyRedFlags: ["Uncontrolled spurting bleeding that does not stop after 10 minutes of direct pressure (Seek Emergency Medical Care 🚨)"]
  },
  {
    id: "HC-19",
    name: "Seasonal Allergies",
    category: "Fever & Flu",
    icon: "🌸",
    symptoms: ["Repetitive sneezing bursts", "Itchy nose, roof of mouth, & throat", "Clear runny nose & nasal congestion", "Red, watery, itchy eyes (Allergic Conjunctivitis)"],
    causes: ["Pollen from trees, grasses, and weeds", "Seasonal mold spores"],
    selfCare: ["Check daily pollen counts and stay indoors on high pollen days", "Keep windows closed and use air conditioning with clean filters", "Rinse nasal passages with saline nasal spray or neti pot", "Shower and change clothes after returning from outdoors"],
    otcCategory: "Antihistamines & Saline Nasal Sprays",
    genericMedicine: "Fexofenadine / Loratadine & Saline Nasal Spray",
    precautions: ["Antihistamines work best when taken regularly during allergy season.", "Saline sprays help flush out pollen without rebound risk."],
    whoAvoid: ["Patients with severe kidney impairment (consult doctor for dosage)", "Children under 2 years without pediatric prescription"],
    whenDoctor: ["Symptoms interfere significantly with sleep or work", "Complicated by sinus pain or wheezing"],
    emergencyRedFlags: ["Difficulty breathing, chest tightness, or facial swelling"]
  },
  {
    id: "HC-20",
    name: "Common Flu-like Symptoms",
    category: "Fever & Flu",
    icon: "🤒",
    symptoms: ["Sudden onset fever & chills", "Significant muscle & body aches", "Profound fatigue & weakness", "Dry cough, sore throat, & congestion"],
    causes: ["Influenza viruses (Type A/B)", "Other acute respiratory viruses"],
    selfCare: ["Strict bed rest to support immune function", "Maintain high fluid intake (water, ORS, warm broths)", "Isolate at home to prevent spreading virus to family and colleagues", "Use steam inhalation for congestion"],
    otcCategory: "Antipyretic / Analgesics & Saline Sprays",
    genericMedicine: "Paracetamol & Saline Nasal Drops",
    precautions: ["Antibiotics have NO effect on flu viruses.", "High-risk groups (elderly, pregnant, chronic disease) should consult a doctor early for antiviral evaluation."],
    whoAvoid: ["Children and teenagers recovering from flu should NEVER take Aspirin (risk of fatal Reye's Syndrome)."],
    whenDoctor: ["Fever persists > 3-4 days", "High risk individuals (elderly, asthma, diabetes, heart disease)"],
    emergencyRedFlags: ["Shortness of breath, persistent chest pain/pressure, confusion, dizziness, or inability to keep fluids down"]
  }
];

// Health Library State
let activeHealthCategory = "All";
let activeHealthSearch = "";

function renderHealthConditions() {
  const grid = document.getElementById("healthConditionsGrid");
  if (!grid) return;

  const filtered = HEALTH_CONDITIONS_DATA.filter(item => {
    // Category match
    const matchCat = (activeHealthCategory === "All") || (item.category === activeHealthCategory);
    
    // Search match (name, symptoms, generic medicine, or causes)
    const q = activeHealthSearch.trim().toLowerCase();
    if (!q) return matchCat;

    const matchName = item.name.toLowerCase().includes(q);
    const matchCategory = item.category.toLowerCase().includes(q);
    const matchMed = item.genericMedicine.toLowerCase().includes(q) || item.otcCategory.toLowerCase().includes(q);
    const matchSymptoms = item.symptoms.some(s => s.toLowerCase().includes(q));
    const matchCauses = item.causes.some(c => c.toLowerCase().includes(q));

    return matchCat && (matchName || matchCategory || matchMed || matchSymptoms || matchCauses);
  });

  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: var(--bg); border-radius: var(--radius-lg); border: 1.5px dashed var(--border);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 0.4rem;">No matching health conditions found</h3>
        <p style="font-size: 0.9rem; color: var(--text-mid);">Try searching for terms like "fever", "headache", "cough", "paracetamol", or select a category above.</p>
        <button class="btn btn-outline-nav" style="margin-top: 1rem;" onclick="window.resetHealthFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "health-card";
    card.style.cssText = "background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 1.4rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1rem; transition: box-shadow 0.2s, border-color 0.2s;";

    card.innerHTML = `
      <!-- Card Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem; background: var(--bg); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);">${item.icon}</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-dark); margin: 0;">${item.name}</h3>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--blue); background: var(--blue-light); padding: 2px 8px; border-radius: 10px;">${item.category}</span>
          </div>
        </div>
      </div>

      <!-- Symptoms -->
      <div>
        <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-mid); margin-bottom: 0.4rem;">
          🩺 Common Symptoms
        </div>
        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.88rem; color: var(--text-dark); line-height: 1.5;">
          ${item.symptoms.map(s => `<li>${s}</li>`).join("")}
        </ul>
      </div>

      <!-- Causes -->
      <div>
        <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-mid); margin-bottom: 0.4rem;">
          🔍 Common Causes
        </div>
        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.88rem; color: var(--text-mid); line-height: 1.5;">
          ${item.causes.map(c => `<li>${c}</li>`).join("")}
        </ul>
      </div>

      <!-- Basic Self Care -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 0.8rem 1rem;">
        <div style="font-size: 0.82rem; font-weight: 700; color: #166534; margin-bottom: 0.4rem;">
          🌱 Basic Self-Care &amp; General Care
        </div>
        <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.85rem; color: #14532d; line-height: 1.45;">
          ${item.selfCare.map(sc => `<li>${sc}</li>`).join("")}
        </ul>
      </div>

      <!-- OTC Medicine Info -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.8rem 1rem;">
        <div style="font-size: 0.82rem; font-weight: 700; color: #1e40af; margin-bottom: 0.3rem;">
          💊 Commonly Used OTC Medicine Category
        </div>
        <div style="font-size: 0.9rem; font-weight: 800; color: var(--blue); margin-bottom: 0.2rem;">
          ${item.otcCategory}
        </div>
        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.4rem;">
          Generic Reference: <strong>${item.genericMedicine}</strong>
        </div>
        <div style="font-size: 0.78rem; color: #1e3a8a; line-height: 1.4; border-top: 1px dashed #93c5fd; padding-top: 0.4rem;">
          ⚠️ <em>Dosage depends on age, weight, medical history, pregnancy status, allergies, and existing drugs. Consult a healthcare provider before use. Never use antibiotics automatically.</em>
        </div>
      </div>

      <!-- Precautions & Who Avoid -->
      <div style="font-size: 0.84rem; color: var(--text-mid); line-height: 1.45; background: var(--bg); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
        <strong style="color: var(--text-dark);">⚠️ Important Precautions &amp; Who Should Avoid:</strong>
        <ul style="margin: 0.3rem 0 0 0; padding-left: 1.1rem;">
          ${item.precautions.map(p => `<li>${p}</li>`).join("")}
          ${item.whoAvoid.map(w => `<li style="color:#b91c1c;"><strong>Caution:</strong> ${w}</li>`).join("")}
        </ul>
      </div>

      <!-- Emergency Red Flags -->
      <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: var(--radius-sm); padding: 0.8rem 1rem;">
        <div style="font-size: 0.82rem; font-weight: 800; color: #dc2626; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 6px;">
          🚨 Emergency Warning Signs (Seek Immediate Medical Care):
        </div>
        <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.83rem; color: #991b1b; font-weight: 600; line-height: 1.45;">
          ${item.emergencyRedFlags.map(e => `<li>${e}</li>`).join("")}
        </ul>
      </div>

      <!-- Action Button -->
      <div style="margin-top: auto; padding-top: 0.5rem;">
        <button class="btn btn-cta" onclick="window.consultDoctorForCondition('${item.name.replace(/'/g, "\\'")}')" style="width: 100%; justify-content: center; padding: 0.75rem; font-size: 0.92rem;">
          👨‍⚕️ Consult Doctor for ${item.name}
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function initHealthLibrary() {
  const searchInput = document.getElementById("healthSearchInput");
  const pillsContainer = document.getElementById("healthCategoryPills");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      activeHealthSearch = e.target.value;
      renderHealthConditions();
    });
  }

  if (pillsContainer) {
    pillsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button.cat-pill");
      if (!btn) return;

      Array.from(pillsContainer.querySelectorAll("button.cat-pill")).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      activeHealthCategory = btn.getAttribute("data-cat") || "All";
      renderHealthConditions();
    });
  }

  renderHealthConditions();
}

window.resetHealthFilters = function() {
  activeHealthCategory = "All";
  activeHealthSearch = "";
  const searchInput = document.getElementById("healthSearchInput");
  if (searchInput) searchInput.value = "";
  const pillsContainer = document.getElementById("healthCategoryPills");
  if (pillsContainer) {
    Array.from(pillsContainer.querySelectorAll("button.cat-pill")).forEach(b => {
      if (b.getAttribute("data-cat") === "All") b.classList.add("active");
      else b.classList.remove("active");
    });
  }
  renderHealthConditions();
};

window.consultDoctorForCondition = function(conditionName) {
  const consultSec = document.getElementById("consult");
  if (consultSec) consultSec.scrollIntoView({ behavior: "smooth" });

  const docSearchInput = document.getElementById("docSearchInput");
  if (docSearchInput) {
    docSearchInput.value = conditionName;
    docSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  if (window.showToast) {
    window.showToast(`🔍 Filtered doctors for ${conditionName}. Click "Book Consultation" or "Start Video" to connect.`, false);
  }
};

async function restoreActiveVideoConsultation() {
  const activeUser = getActiveUser();
  if (!activeUser) return;

  try {
    const stored = JSON.parse(localStorage.getItem(ACTIVE_VIDEO_CONSULTATION_KEY) || "null");
    if (!stored || stored.user_id !== activeUser.uid) return;
    const res = await fetch(apiUrl(`/api/consultations?user_id=${encodeURIComponent(activeUser.uid)}`));
    if (!res.ok) return;
    const consultations = await res.json();
    const consultation = consultations.find(c => c.consultation_id === stored.consultation_id);
    if (!consultation || consultation.consultation_type !== "Video Call") return;

    activeConsultationId = consultation.consultation_id;
    activeVideoConsultation = { ...stored, ...consultation };
    selectedDoctor = {
      id: consultation.doctor_id,
      name: consultation.doctor_name,
      specialization: consultation.specialization,
      image: selectedDoctor.image
    };
    if (consultation.status === "Completed" && !stored.prescription_id) {
      showToast("Completed consultation restored. Digital Prescription is ready.");
      window.openCreatePrescriptionModal(
        consultation.doctor_id,
        consultation.doctor_name,
        consultation.specialization,
        `Video Consultation Assessment: Acute Illness & Treatment (${consultation.specialization})`
      );
    }
  } catch (err) {
    console.warn("Consultation restore notice:", err);
  }
}

// Initialize Health Library on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initHealthLibrary();
    restoreActiveVideoConsultation();
  });
} else {
  initHealthLibrary();
  restoreActiveVideoConsultation();
}


