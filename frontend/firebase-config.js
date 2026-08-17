// ============================================================
//  Antigravity Health – Firebase Configuration
//  Project: health-tech-55f1f
// ============================================================

import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth,
         setPersistence,
         browserLocalPersistence,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore,
         collection,
         addDoc,
         getDocs,
         serverTimestamp }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase project settings ──────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDaEAk68sKRX78v5fS8OX_W_SiadyWaL0o",
  authDomain:        "health-tech-55f1f.firebaseapp.com",
  projectId:         "health-tech-55f1f",
  storageBucket:     "health-tech-55f1f.firebasestorage.app",
  messagingSenderId: "185557473097",
  appId:             "1:185557473097:web:6a77d937ba7153f32b2c98",
  measurementId:     "G-VMQC4NTEDX"
};

// ── Initialize services ────────────────────────────────────
let app = null;
let analytics = null;
let auth = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  try { analytics = getAnalytics(app); } catch (e) {}
  try { auth = getAuth(app); } catch (e) {}
  try { db = getFirestore(app); } catch (e) {}
} catch (err) {
  console.warn("Firebase init notice:", err);
}

// Dummy auth object fallback if SDK failed
if (!auth) {
  auth = { currentUser: null };
}

// ── Export everything needed by script.js ─────────────────
export {
  app, analytics, auth, db,
  // Auth helpers
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  // Firestore helpers
  collection, addDoc, getDocs, serverTimestamp
};
