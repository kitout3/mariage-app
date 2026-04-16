import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// FIREBASE CONFIG — remplace par tes vraies clés Firebase
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isRealConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;
let _firebaseApp = null, _db = null, _firebaseReady = false;

async function initFirebase() {
  if (!isRealConfig || _firebaseReady) return _firebaseReady;
  try {
    const [{ initializeApp }, { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment, setDoc }] =
      await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
      ]);
    _firebaseApp = initializeApp(FIREBASE_CONFIG);
    _db = getFirestore(_firebaseApp);
    window.__fb = { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment, setDoc };
    _firebaseReady = true;
    return true;
  } catch (e) { console.error("Firebase:", e); return false; }
}

// ============================================================
// MOCK — photos de démo
// ============================================================
let mockPhotos = [
  { id: "d1", url: "https://picsum.photos/seed/wed1/800/600", author: "Sophie", message: "Tellement belle journée ! 💕", status: "approved", createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 4 },
  { id: "d2", url: "https://picsum.photos/seed/wed2/800/1000", author: "Marc", message: "Félicitations !", status: "approved", createdAt: new Date(Date.now() - 1800000).toISOString(), likes: 9 },
  { id: "d3", url: "https://picsum.photos/seed/wed3/900/600", author: "Lucie", message: "Quelle émotion 🥹", status: "approved", createdAt: new Date(Date.now() - 1200000).toISOString(), likes: 2 },
  { id: "d4", url: "https://picsum.photos/seed/wed4/700/900", author: "Pierre", message: "", status: "approved", createdAt: new Date(Date.now() - 600000).toISOString(), likes: 5 },
  { id: "d5", url: "https://picsum.photos/seed/wed5/800/600", author: null, message: "Un moment magique", status: "approved", createdAt: new Date(Date.now() - 120000).toISOString(), likes: 1 },
  { id: "d6", url: "https://picsum.photos/seed/wed6/900/700", author: "Emma", message: "", status: "pending", createdAt: new Date(Date.now() - 60000).toISOString(), likes: 0 },
];
let mockListeners = [];
let mockEvent = {
  id: "mariage-2025", name: "Marie & Thomas", date: "21 Juin 2025", slug: "marie-thomas-2025",
  moderationMode: "immediate", displayMode: "mixed", active: true,
  adminPassword: "admin123", coverMessage: "Partagez vos plus beaux souvenirs",
};

const MockDB = {
  addPhoto: (p) => {
    const n = { ...p, id: `p_${Date.now()}`, createdAt: new Date().toISOString(), status: mockEvent.moderationMode === "moderated" ? "pending" : "approved", likes: 0 };
    mockPhotos = [n, ...mockPhotos];
    mockListeners.forEach(cb => cb([...mockPhotos]));
    return n;
  },
  updatePhoto: (id, u) => { mockPhotos = mockPhotos.map(p => p.id === id ? { ...p, ...u } : p); mockListeners.forEach(cb => cb([...mockPhotos])); },
  deletePhoto: (id) => { mockPhotos = mockPhotos.filter(p => p.id !== id); mockListeners.forEach(cb => cb([...mockPhotos])); },
  likePhoto: (id) => { mockPhotos = mockPhotos.map(p => p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p); mockListeners.forEach(cb => cb([...mockPhotos])); },
  onPhotos: (cb) => { mockListeners.push(cb); cb([...mockPhotos]); return () => { mockListeners = mockListeners.filter(l => l !== cb); }; },
  getEvent: () => ({ ...mockEvent }),
  updateEvent: (u) => { mockEvent = { ...mockEvent, ...u }; },
};

// Cache event local
let cachedEvent = { ...mockEvent };
let eventListeners = [];

const DB = {
  // ✅ Photos stockées dans Firestore (pas Storage — gratuit)
  addPhoto: async (p) => {
    if (!_firebaseReady) return MockDB.addPhoto(p);
    const { collection, addDoc, serverTimestamp } = window.__fb;
    // Compression max 500Ko pour Firestore (limite doc = 1Mo)
    const d = await addDoc(collection(_db, "photos"), {
      url: p.url, // data URL compressée
      author: p.author || null,
      message: p.message || null,
      eventId: p.eventId,
      status: cachedEvent.moderationMode === "moderated" ? "pending" : "approved",
      likes: 0,
      createdAt: serverTimestamp(),
    });
    return { id: d.id, ...p };
  },
  updatePhoto: async (id, u) => {
    if (!_firebaseReady) return MockDB.updatePhoto(id, u);
    const { doc, updateDoc } = window.__fb;
    await updateDoc(doc(_db, "photos", id), u);
  },
  deletePhoto: async (id) => {
    if (!_firebaseReady) return MockDB.deletePhoto(id);
    const { doc, deleteDoc } = window.__fb;
    await deleteDoc(doc(_db, "photos", id));
  },
  likePhoto: async (id) => {
    if (!_firebaseReady) return MockDB.likePhoto(id);
    const { doc, updateDoc, increment } = window.__fb;
    await updateDoc(doc(_db, "photos", id), { likes: increment(1) });
  },
  onPhotos: (cb) => {
    if (!_firebaseReady) return MockDB.onPhotos(cb);
    const { collection, query, orderBy, onSnapshot } = window.__fb;
    const q = query(collection(_db, "photos"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({
      id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString()
    }))));
  },
  // ✅ Événement en temps réel depuis Firestore
  getEvent: () => cachedEvent,
  onEvent: (cb) => {
    if (!_firebaseReady) { cb(MockDB.getEvent()); return () => {}; }
    const { doc, onSnapshot } = window.__fb;
    return onSnapshot(doc(_db, "events", "mariage-2025"), snap => {
      if (snap.exists()) cachedEvent = { ...mockEvent, ...snap.data() };
      else cachedEvent = { ...mockEvent };
      cb({ ...cachedEvent });
    });
  },
  updateEvent: async (u) => {
    MockDB.updateEvent(u);
    cachedEvent = { ...cachedEvent, ...u };
    if (!_firebaseReady) return;
    const { doc, setDoc } = window.__fb;
    await setDoc(doc(_db, "events", "mariage-2025"), u, { merge: true });
  },
};

// ============================================================
// HELPERS
// ============================================================
const compressImage = (file, maxWidth = 800, quality = 0.7) =>
  new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas"), r = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * r; canvas.height = img.height * r;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); const fr = new FileReader(); fr.onloadend = () => resolve(fr.result); fr.readAsDataURL(blob); }, "image/jpeg", quality);
    };
    img.src = url;
  });

// URL réelle de la page (sans hash) — QR codes pointent vers ici
const APP_URL = window.location.href.split("#")[0].replace(/\/$/, "");

const QRCode = ({ value, size = 160 }) => (
  <img
    src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=fff5f0&color=5c2a1e&margin=2`}
    alt={`QR: ${value}`}
    style={{ width: size, height: size, borderRadius: 12, display: "block" }}
    onError={e => { e.target.style.display = "none"; }}
  />
);

// ============================================================
// STYLES
// ============================================================
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --cream: #fdf8f4; --blush: #f5ddd4; --rose: #c97a6a;
      --burgundy: #5c2a1e; --gold: #b89a6a; --text: #3d2010;
      --muted: #9e7060; --white: #fffdf9; --shadow: rgba(92,42,30,0.12);
    }
    html, body { font-family: 'Jost', sans-serif; background: var(--cream); color: var(--text); min-height: 100vh; }
    h1,h2,h3 { font-family: 'Cormorant Garamond', serif; }
    button { cursor: pointer; border: none; outline: none; font-family: 'Jost', sans-serif; }
    input, textarea, select { font-family: 'Jost', sans-serif; outline: none; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: var(--blush); border-radius: 3px; }

    @keyframes fadeIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes photoIn  { from{opacity:0;transform:scale(.9) rotate(-1deg)} to{opacity:1;transform:scale(1) rotate(0)} }
    @keyframes heartPop { 0%{transform:scale(1)} 35%{transform:scale(1.55)} 65%{transform:scale(.9)} 100%{transform:scale(1)} }
    @keyframes newBadge { 0%{opacity:0;transform:scale(.7)} 60%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
    @keyframes kb1 { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.1) translate(-2%,-1.5%)} }
    @keyframes kb2 { 0%{transform:scale(1.08) translate(-1.5%,0)} 100%{transform:scale(1) translate(2%,2%)} }
    @keyframes kb3 { 0%{transform:scale(1) translate(1.5%,1%)} 100%{transform:scale(1.1) translate(-1%,-2%)} }
    @keyframes toastIn  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
    @keyframes starFloat { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }

    .fade-in  { animation: fadeIn  .5s ease forwards; }
    .fade-up  { animation: fadeUp  .55s ease forwards; }
    .photo-in { animation: photoIn .45s cubic-bezier(.175,.885,.32,1.275) forwards; }
    .btn { transition: all .2s ease; }
    .btn:hover  { filter: brightness(1.07); transform: translateY(-1px); }
    .btn:active { filter: brightness(.95); transform: translateY(0); }
  `}</style>
);

// ============================================================
// TOAST
// ============================================================
function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: type === "error" ? "#c0392b" : "var(--burgundy)",
      color: "white", padding: "12px 20px", borderRadius: 14,
      boxShadow: "0 4px 24px rgba(0,0,0,.3)", animation: "toastIn .3s ease",
      fontSize: ".9rem", display: "flex", alignItems: "center", gap: 8, maxWidth: 300,
    }}>
      {type === "error" ? "✗" : "✓"} {msg}
    </div>
  );
}
function useToast() {
  const [t, setT] = useState(null);
  const show = useCallback((msg, type = "success") => {
    setT({ msg, type }); setTimeout(() => setT(null), 2800);
  }, []);
  return [t, show];
}

// ============================================================
// BOUTON ACCUEIL FIXE — visible partout sauf TV
// ============================================================
function HomeButton({ setView, dark = false }) {
  return (
    <button
      onClick={() => setView(VIEWS.HOME)}
      className="btn"
      title="Retour à l'accueil"
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 500,
        width: 52, height: 52, borderRadius: "50%",
        background: dark ? "rgba(255,255,255,.15)" : "var(--burgundy)",
        color: "white", fontSize: "1.4rem",
        boxShadow: "0 4px 20px rgba(0,0,0,.25)",
        backdropFilter: dark ? "blur(12px)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: dark ? "1px solid rgba(255,255,255,.2)" : "none",
      }}
    >
      🏠
    </button>
  );
}

// ============================================================
// NAVIGATION
// ============================================================
const VIEWS = { HOME: "home", UPLOAD: "upload", GALLERY: "gallery", LIVE: "live", ADMIN: "admin" };

export default function App() {
  const [view, setView] = useState(VIEWS.HOME);
  const [adminAuth, setAdminAuth] = useState(false);
  const [fbReady, setFbReady] = useState(!isRealConfig);

  // Routing par hash — les QR codes pointent vers /#upload, /#gallery, /#live
  const navigate = useCallback((v) => {
    setView(v);
    window.history.replaceState(null, "", v === VIEWS.HOME ? APP_URL : `${APP_URL}#${v}`);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1).toLowerCase();
    const map = { upload: VIEWS.UPLOAD, gallery: VIEWS.GALLERY, live: VIEWS.LIVE, admin: VIEWS.ADMIN };
    if (map[hash]) setView(map[hash]);
    if (isRealConfig) initFirebase().then(ok => setFbReady(ok));
  }, []);

  if (!fbReady && isRealConfig) return (
    <><GlobalStyles />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48, animation: "spin 1.4s linear infinite", display: "inline-block" }}>💍</div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", color: "var(--burgundy)" }}>Connexion…</p>
      </div>
    </>
  );

  const setView2 = (v) => navigate(v);

  if (view === VIEWS.LIVE)    return <><GlobalStyles /><LiveTV   setView={setView2} /></>;
  if (view === VIEWS.UPLOAD)  return <><GlobalStyles /><UploadPage  setView={setView2} /></>;
  if (view === VIEWS.GALLERY) return <><GlobalStyles /><GalleryPage setView={setView2} /></>;
  if (view === VIEWS.ADMIN)   return <><GlobalStyles /><AdminPage   auth={adminAuth} setAuth={setAdminAuth} setView={setView2} /></>;
  return <><GlobalStyles /><HomePage setView={setView2} /></>;
}

// ============================================================
// HOME PAGE
// ============================================================
function HomePage({ setView }) {
  const [event, setEvent] = useState(DB.getEvent());
  const [photos, setPhotos] = useState([]);
  useEffect(() => DB.onEvent(setEvent), []);
  useEffect(() => DB.onPhotos(all => setPhotos(all.filter(p => p.status === "approved"))), []);

  const latest = photos[0];
  const topLiked = [...photos].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #fdf8f4 0%, #f5ddd4 55%, #fdf8f4 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1.5rem", gap: "1.75rem",
    }}>
      {/* Hero */}
      <div style={{ textAlign: "center", animation: "fadeUp .6s ease" }}>
        <div style={{ fontSize: 42, marginBottom: 10 }}>💍</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(2.4rem,7vw,4.5rem)", fontWeight: 300, color: "var(--burgundy)", lineHeight: 1.05, marginBottom: 6 }}>
          {event.name}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: ".95rem", letterSpacing: 3, textTransform: "uppercase" }}>{event.date}</p>
        {photos.length > 0 && (
          <div style={{ marginTop: 12, display: "inline-flex", gap: 8 }}>
            <span style={{ background: "var(--blush)", borderRadius: 50, padding: "4px 14px", fontSize: ".82rem", color: "var(--burgundy)" }}>
              📸 {photos.length} photo{photos.length > 1 ? "s" : ""}
            </span>
            <span style={{ background: "#fce8e8", borderRadius: 50, padding: "4px 14px", fontSize: ".82rem", color: "#b03020" }}>
              ❤️ {photos.reduce((s, p) => s + (p.likes || 0), 0)} réaction{photos.reduce((s, p) => s + (p.likes || 0), 0) > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Aperçu dernière photo + top liked */}
      {(latest || topLiked) && (
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 680, animation: "fadeUp .6s .1s ease both" }}>
          {latest && (
            <div style={{ flex: 1, borderRadius: 18, overflow: "hidden", position: "relative", aspectRatio: "4/3", background: "#1a1008", cursor: "pointer" }}
              onClick={() => setView(VIEWS.GALLERY)}>
              <img src={latest.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.6) 0%, transparent 55%)" }} />
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(201,122,106,.9)", color: "white", borderRadius: 50, padding: "3px 12px", fontSize: ".72rem", animation: "newBadge .5s ease" }}>
                ✨ Dernière
              </div>
              {latest.author && <p style={{ position: "absolute", bottom: 10, left: 12, color: "white", fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontStyle: "italic" }}>{latest.author}</p>}
            </div>
          )}
          {topLiked && topLiked.id !== latest?.id && (topLiked.likes || 0) > 0 && (
            <div style={{ flex: 1, borderRadius: 18, overflow: "hidden", position: "relative", aspectRatio: "4/3", background: "#1a1008", cursor: "pointer" }}
              onClick={() => setView(VIEWS.GALLERY)}>
              <img src={topLiked.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.6) 0%, transparent 55%)" }} />
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(180,60,60,.85)", color: "white", borderRadius: 50, padding: "3px 12px", fontSize: ".72rem" }}>
                ❤️ {topLiked.likes} likes
              </div>
              {topLiked.author && <p style={{ position: "absolute", bottom: 10, left: 12, color: "white", fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontStyle: "italic" }}>{topLiked.author}</p>}
            </div>
          )}
        </div>
      )}

      {/* Cards navigation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, width: "100%", maxWidth: 680 }}>
        {[
          { icon: "📸", title: "Envoyer une photo", desc: "Partager un souvenir", v: VIEWS.UPLOAD, accent: "var(--rose)", delay: ".15s" },
          { icon: "🖼️", title: "Galerie & réactions", desc: "Voir toutes les photos", v: VIEWS.GALLERY, accent: "var(--gold)", delay: ".22s" },
          { icon: "📺", title: "Affichage TV", desc: "Diaporama plein écran", v: VIEWS.LIVE, accent: "#6a8a5a", delay: ".29s" },
          { icon: "⚙️", title: "Administration", desc: "Modérer & exporter", v: VIEWS.ADMIN, accent: "var(--burgundy)", delay: ".36s" },
        ].map(c => (
          <button key={c.v} onClick={() => setView(c.v)} className="btn" style={{
            background: "var(--white)", border: "1.5px solid var(--blush)", borderRadius: 18,
            padding: "1.5rem 1.25rem", textAlign: "left",
            boxShadow: "0 3px 16px var(--shadow)", animation: `fadeUp .55s ${c.delay} ease both`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem", color: c.accent, marginBottom: 2 }}>{c.title}</div>
            <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>{c.desc}</div>
          </button>
        ))}
      </div>

      {/* QR Code */}
      <div style={{
        background: "var(--white)", borderRadius: 20, padding: "1.5rem",
        boxShadow: "0 3px 16px var(--shadow)", textAlign: "center",
        animation: "fadeUp .55s .4s ease both", maxWidth: 280, width: "100%",
      }}>
        <p style={{ color: "var(--muted)", fontSize: ".72rem", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>QR Code invités</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <QRCode value={`${APP_URL}#upload`} size={140} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".72rem", marginTop: 10, wordBreak: "break-all", opacity: .65 }}>{APP_URL}#upload</p>
        <button onClick={() => { navigator.clipboard?.writeText(`${APP_URL}#upload`); }} className="btn"
          style={{ marginTop: 10, background: "var(--blush)", color: "var(--burgundy)", borderRadius: 50, padding: "6px 18px", fontSize: ".78rem" }}>
          Copier le lien
        </button>
      </div>

      {!isRealConfig && (
        <p style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "8px 16px", fontSize: ".78rem", color: "#856404", maxWidth: 500, textAlign: "center" }}>
          ⚠️ Mode démo — photos locales. Renseigne FIREBASE_CONFIG pour la prod.
        </p>
      )}
    </div>
  );
}

// ============================================================
// FILTRES — multi-sélection, compatible iOS Safari
// ============================================================
const FILTERS = [
  { id: "none",     label: "Original", emoji: "🖼️", type: "color" },
  { id: "bw",       label: "N&B",      emoji: "⬛", type: "color" },
  { id: "sepia",    label: "Sépia",    emoji: "🟤", type: "color" },
  { id: "warm",     label: "Chaud",    emoji: "🌅", type: "color" },
  { id: "cool",     label: "Froid",    emoji: "🩵", type: "color" },
  { id: "vignette", label: "Vignette", emoji: "🔲", type: "color" },
  { id: "heart",    label: "Coeurs",   emoji: "💕", type: "overlay" },
  { id: "border",   label: "Cadre",    emoji: "💍", type: "overlay" },
];

// Applique un filtre couleur pixel par pixel (compatible tous mobiles)
function applyColorFilter(imageData, filterId) {
  const d = imageData.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    if (filterId === "bw") {
      const gr = r * 0.299 + g * 0.587 + b * 0.114;
      d[i] = d[i+1] = d[i+2] = gr;
    } else if (filterId === "sepia") {
      d[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
      d[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
      d[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
    } else if (filterId === "warm") {
      d[i]   = Math.min(255, r * 1.12);
      d[i+1] = Math.min(255, g * 1.02);
      d[i+2] = Math.min(255, b * 0.88);
    } else if (filterId === "cool") {
      d[i]   = Math.min(255, r * 0.88);
      d[i+1] = Math.min(255, g * 1.02);
      d[i+2] = Math.min(255, b * 1.14);
    } else if (filterId === "vignette") {
      // vignette appliqué après, pas pixel par pixel
    }
  }
  return imageData;
}

// Applique une vignette sur le canvas
function applyVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.85);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// Applique tous les filtres sélectionnés et retourne une data URL
async function applyFilters(dataUrl, filterIds, eventName, eventDate) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 800 / Math.max(img.width, img.height));
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;

      // 1. Dessiner l'image
      ctx.drawImage(img, 0, 0, W, H);

      // 2. Filtres couleur pixel par pixel
      const colorFilters = filterIds.filter(id => ["bw","sepia","warm","cool"].includes(id));
      if (colorFilters.length > 0) {
        let imgData = ctx.getImageData(0, 0, W, H);
        colorFilters.forEach(id => { imgData = applyColorFilter(imgData, id); });
        ctx.putImageData(imgData, 0, 0);
      }

      // 3. Vignette
      if (filterIds.includes("vignette")) applyVignette(ctx, W, H);

      // 4. Overlay coeurs
      if (filterIds.includes("heart")) {
        const hearts = ["💕","❤️","🩷","💖","💗"];
        ctx.font = (W * 0.06) + "px serif";
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 18; i++) {
          ctx.fillText(hearts[i % hearts.length],
            Math.random() * W * 0.9 + W * 0.05,
            Math.random() * H * 0.85 + H * 0.05);
        }
        ctx.globalAlpha = 1;
      }

      // 5. Bandeau cadre — noir, texte blanc
      if (filterIds.includes("border")) {
        const isPortrait = H >= W;
        const bandeauH = Math.round(H * (isPortrait ? 0.13 : 0.14));
        const bandeauY = H - bandeauH;
        ctx.fillStyle = "black";
        ctx.fillRect(0, bandeauY, W, bandeauH);
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        if (isPortrait) {
          const fs1 = Math.max(16, W * 0.048);
          ctx.font = "300 " + fs1 + "px Georgia, serif";
          ctx.fillText(eventName, W / 2, bandeauY + bandeauH * 0.42);
          const fs2 = Math.max(12, W * 0.034);
          ctx.font = "300 " + fs2 + "px Georgia, serif";
          ctx.globalAlpha = 0.65;
          ctx.fillText(eventDate, W / 2, bandeauY + bandeauH * 0.78);
          ctx.globalAlpha = 1;
        } else {
          const fs = Math.max(14, H * 0.048);
          ctx.font = "300 " + fs + "px Georgia, serif";
          ctx.fillText(eventName + "  ·  " + eventDate, W / 2, bandeauY + bandeauH * 0.62);
        }
      }

      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = dataUrl;
  });
}

// ============================================================
// UPLOAD PAGE
// ============================================================

function UploadPage({ setView }) {
  const [step, setStep] = useState("idle");
  const [rawPreview, setRawPreview] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(new Set());
  const [applyingFilter, setApplyingFilter] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(DB.getEvent());
  const fileRef = useRef();
  useEffect(() => DB.onEvent(setEvent), []);

  const handleFile = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setStep("compressing");
    try {
      const c = await compressImage(file);
      setRawPreview(c);
      setPreview(c);
      setSelectedFilters(new Set());
      setStep("preview");
    } catch { setError("Erreur lecture image"); setStep("idle"); }
  }, []);

  // Toggle un filtre dans la sélection multiple
  const handleFilterToggle = async (filterId) => {
    if (!rawPreview) return;
    setApplyingFilter(true);
    const next = new Set(selectedFilters);
    if (filterId === "none") {
      next.clear();
    } else {
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
    }
    setSelectedFilters(next);
    if (next.size === 0) {
      setPreview(rawPreview);
    } else {
      const filtered = await applyFilters(rawPreview, [...next], event.name, event.date);
      setPreview(filtered);
    }
    setApplyingFilter(false);
  };

  const upload = async () => {
    if (!preview) return;
    setStep("uploading"); setError(null);
    const t = setInterval(() => setProgress(p => Math.min(p + 7, 88)), 110);
    try {
      await DB.addPhoto({ url: preview, thumbnail: preview, author: firstName.trim() || null, message: message.trim() || null, eventId: event.id });
      clearInterval(t); setProgress(100); setTimeout(() => setStep("success"), 250);
    } catch { clearInterval(t); setError("Erreur d'envoi, réessaie !"); setStep("preview"); }
  };

  const reset = () => {
    setStep("idle"); setRawPreview(null); setPreview(null);
    setSelectedFilters(new Set()); setFirstName(""); setMessage(""); setProgress(0); setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #fdf8f4, #f5ddd4)", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1.75rem", width: "100%", maxWidth: 460, animation: "fadeUp .5s ease" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💐</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", fontWeight: 300, color: "var(--burgundy)" }}>{event.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 4 }}>{event.coverMessage}</p>
      </div>

      <div style={{ width: "100%", maxWidth: 460 }}>

        {step === "success" && (
          <div className="fade-up" style={{ background: "var(--white)", borderRadius: 24, padding: "2.5rem 2rem", textAlign: "center", boxShadow: "0 8px 40px var(--shadow)" }}>
            <div style={{ fontSize: 56, marginBottom: 14, animation: "heartPop .6s ease 2" }}>💖</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.9rem", color: "var(--burgundy)", marginBottom: 8 }}>Merci !</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: ".9rem" }}>
              {event.moderationMode === "moderated" ? "Votre photo sera visible après validation." : "Votre photo est maintenant en ligne !"}
            </p>
            <div style={{ width: 110, height: 110, margin: "0 auto 20px", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 18px var(--shadow)" }}>
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={reset} className="btn" style={{ background: "var(--rose)", color: "white", padding: "12px 22px", borderRadius: 50, fontSize: ".95rem", fontWeight: 500 }}>
                📸 Autre photo
              </button>
              <button onClick={() => setView(VIEWS.GALLERY)} className="btn" style={{ background: "var(--white)", border: "1.5px solid var(--blush)", color: "var(--muted)", padding: "12px 22px", borderRadius: 50, fontSize: ".95rem" }}>
                🖼️ Voir la galerie
              </button>
            </div>
          </div>
        )}

        {step === "compressing" && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
            <div style={{ fontSize: 40, animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 12 }}>🔄</div>
            <p>Compression…</p>
          </div>
        )}

        {step === "uploading" && (
          <div className="fade-up" style={{ background: "var(--white)", borderRadius: 24, padding: "2.5rem 2rem", textAlign: "center", boxShadow: "0 8px 40px var(--shadow)" }}>
            <div style={{ fontSize: 38, marginBottom: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>📡</div>
            <p style={{ color: "var(--text)", marginBottom: 20 }}>Envoi en cours…</p>
            <div style={{ background: "var(--blush)", borderRadius: 50, height: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 50, background: "linear-gradient(90deg, var(--rose), var(--gold))", width: `${progress}%`, transition: "width .15s ease" }} />
            </div>
            <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 8 }}>{progress}%</p>
          </div>
        )}

        {step === "preview" && (
          <div className="fade-up" style={{ background: "var(--white)", borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 40px var(--shadow)" }}>
            {/* Aperçu photo avec filtre */}
            <div style={{ position: "relative", aspectRatio: "4/3", background: "#1a1008" }}>
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: applyingFilter ? 0.5 : 1, transition: "opacity .2s" }} />
              {applyingFilter && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>✨</div>
                </div>
              )}
              <button onClick={reset} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.5)", color: "white", borderRadius: 50, width: 34, height: 34, fontSize: "1.1rem", backdropFilter: "blur(8px)" }}>✕</button>
            </div>

            {/* Sélecteur de filtres — multi-sélection */}
            <div style={{ padding: "12px 14px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: ".75rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>✨ Filtres</p>
                {selectedFilters.size > 0 && (
                  <button onClick={() => handleFilterToggle("none")} style={{ background: "none", color: "var(--muted)", fontSize: ".72rem", borderBottom: "1px solid var(--blush)" }}>
                    Tout effacer
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
                {FILTERS.map(f => {
                  const active = f.id === "none" ? selectedFilters.size === 0 : selectedFilters.has(f.id);
                  return (
                    <button key={f.id} onClick={() => handleFilterToggle(f.id)} style={{
                      flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "8px 12px", borderRadius: 12,
                      border: `2px solid ${active ? "var(--rose)" : "var(--blush)"}`,
                      background: active ? "#fff0ed" : "var(--cream)",
                      cursor: "pointer", transition: "all .15s", position: "relative",
                    }}>
                      <span style={{ fontSize: 22 }}>{f.emoji}</span>
                      <span style={{ fontSize: ".65rem", color: active ? "var(--rose)" : "var(--muted)", whiteSpace: "nowrap", fontWeight: active ? 500 : 400 }}>{f.label}</span>
                      {active && f.id !== "none" && (
                        <span style={{ position: "absolute", top: -5, right: -5, background: "var(--rose)", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: ".6rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedFilters.size > 0 && (
                <p style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: 4, opacity: .7 }}>
                  {selectedFilters.size} filtre{selectedFilters.size > 1 ? "s" : ""} actif{selectedFilters.size > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Champs texte + envoi */}
            <div style={{ padding: "10px 14px 14px" }}>
              {error && <p style={{ color: "#c0392b", fontSize: ".82rem", marginBottom: 10 }}>{error}</p>}
              <input placeholder="Votre prénom (optionnel)" value={firstName} onChange={e => setFirstName(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 11, marginBottom: 10, border: "1.5px solid var(--blush)", background: "var(--cream)", fontSize: ".93rem" }} />
              <textarea placeholder="Un message pour les mariés… (optionnel)" value={message} onChange={e => setMessage(e.target.value)} rows={2}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 11, marginBottom: 14, border: "1.5px solid var(--blush)", background: "var(--cream)", fontSize: ".93rem", resize: "none" }} />
              <button onClick={upload} disabled={applyingFilter} className="btn" style={{ width: "100%", padding: "15px", borderRadius: 50, fontSize: "1rem", background: "linear-gradient(135deg, var(--rose), var(--burgundy))", color: "white", fontWeight: 500, boxShadow: "0 5px 22px rgba(92,42,30,.28)", opacity: applyingFilter ? .6 : 1 }}>
                ✨ Envoyer cette photo
              </button>
            </div>
          </div>
        )}

        {step === "idle" && (
          <div className="fade-up">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            <button onClick={() => { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); }} className="btn"
              style={{ width: "100%", padding: "2rem", borderRadius: 22, marginBottom: 12, background: "linear-gradient(135deg, var(--rose), var(--burgundy))", color: "white", fontSize: "1.15rem", fontWeight: 500, boxShadow: "0 10px 30px rgba(92,42,30,.35)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 50 }}>📸</span>
              <span>Prendre une photo</span>
            </button>
            <button onClick={() => { fileRef.current.removeAttribute("capture"); fileRef.current.click(); }} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()} className="btn"
              style={{ width: "100%", padding: "1.4rem", borderRadius: 22, background: "var(--white)", border: "2px dashed var(--blush)", color: "var(--muted)", fontSize: ".97rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 32 }}>🖼️</span>
              <span>Choisir depuis ma galerie</span>
              <span style={{ fontSize: ".76rem", opacity: .6 }}>ou glisser-déposer</span>
            </button>
            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".76rem", marginTop: 18, opacity: .65 }}>Compression automatique · Aucun compte requis</p>
          </div>
        )}
      </div>

      <HomeButton setView={setView} />
    </div>
  );
}

// ============================================================
// GALLERY PAGE — likes live, photo populaire mise en avant
// ============================================================
function GalleryPage({ setView }) {
  const [photos, setPhotos] = useState([]);
  const [liked, setLiked] = useState(() => { try { return JSON.parse(localStorage.getItem("wl") || "{}"); } catch { return {}; } });
  const [lightbox, setLightbox] = useState(null);
  const [sort, setSort] = useState("recent");
  const [event, setEvent] = useState(DB.getEvent());
  useEffect(() => DB.onEvent(setEvent), []);
  useEffect(() => DB.onPhotos(all => setPhotos(all.filter(p => p.status === "approved"))), []);

  const handleLike = async (photo) => {
    if (liked[photo.id]) return;
    const nl = { ...liked, [photo.id]: true };
    setLiked(nl);
    try { localStorage.setItem("wl", JSON.stringify(nl)); } catch {}
    await DB.likePhoto(photo.id);
  };

  const sorted = useMemo(() => {
    const arr = [...photos];
    if (sort === "popular") return arr.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [photos, sort]);

  const topLiked = [...photos].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
  const latest = [...photos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", paddingBottom: "5rem" }}>

      {/* Header */}
      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--blush)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => setView(VIEWS.HOME)} style={{ background: "none", color: "var(--muted)", fontSize: "1.3rem", padding: "4px 8px" }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.45rem", color: "var(--burgundy)" }}>Galerie</h1>
          <p style={{ color: "var(--muted)", fontSize: ".75rem" }}>{photos.length} photo{photos.length > 1 ? "s" : ""} · {event.name}</p>
        </div>
        <button onClick={() => setView(VIEWS.UPLOAD)} className="btn" style={{ background: "var(--rose)", color: "white", padding: "7px 16px", borderRadius: 50, fontSize: ".82rem" }}>
          + Ajouter
        </button>
      </div>

      {/* Tri */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px", background: "var(--white)", borderBottom: "1px solid var(--blush)" }}>
        {[["recent","🕐 Récentes"],["popular","❤️ Populaires"]].map(([v,l]) => (
          <button key={v} onClick={() => setSort(v)} className="btn" style={{
            padding: "6px 16px", borderRadius: 50, fontSize: ".82rem",
            background: sort === v ? "var(--burgundy)" : "var(--cream)",
            color: sort === v ? "white" : "var(--muted)",
            border: `1.5px solid ${sort === v ? "var(--burgundy)" : "var(--blush)"}`,
          }}>{l}</button>
        ))}
      </div>

      {/* Mise en avant : dernière photo + la plus likée */}
      {(latest || topLiked) && photos.length > 0 && (
        <div style={{ padding: "14px 12px 0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Dernière photo */}
            {latest && (
              <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", boxShadow: "0 3px 16px var(--shadow)" }}
                onClick={() => setLightbox(latest)}>
                <img src={latest.url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.6) 0%,transparent 55%)" }} />
                <span style={{ position: "absolute", top: 9, left: 9, background: "rgba(201,122,106,.92)", color: "white", borderRadius: 50, padding: "3px 11px", fontSize: ".7rem", animation: "newBadge .4s ease" }}>
                  ✨ Dernière
                </span>
                {latest.author && <p style={{ position: "absolute", bottom: 9, left: 11, color: "white", fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem", fontStyle: "italic" }}>{latest.author}</p>}
                {/* Bouton like inline */}
                <button onClick={e => { e.stopPropagation(); handleLike(latest); }} style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: liked[latest.id] ? "rgba(220,60,60,.85)" : "rgba(0,0,0,.45)",
                  color: "white", border: "none", borderRadius: 50, padding: "5px 11px", fontSize: ".75rem",
                  backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 4,
                  animation: liked[latest.id] ? "heartPop .4s ease" : "none",
                }}>
                  {liked[latest.id] ? "❤️" : "🤍"} {(latest.likes || 0) + (liked[latest.id] ? 1 : 0)}
                </button>
              </div>
            )}

            {/* Photo la plus likée */}
            {topLiked && (topLiked.likes || 0) > 0 && topLiked.id !== latest?.id && (
              <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", boxShadow: "0 3px 16px var(--shadow)" }}
                onClick={() => setLightbox(topLiked)}>
                <img src={topLiked.url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.6) 0%,transparent 55%)" }} />
                <span style={{ position: "absolute", top: 9, left: 9, background: "rgba(180,40,40,.85)", color: "white", borderRadius: 50, padding: "3px 11px", fontSize: ".7rem" }}>
                  ❤️ {topLiked.likes} likes
                </span>
                {topLiked.author && <p style={{ position: "absolute", bottom: 9, left: 11, color: "white", fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem", fontStyle: "italic" }}>{topLiked.author}</p>}
                <button onClick={e => { e.stopPropagation(); handleLike(topLiked); }} style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: liked[topLiked.id] ? "rgba(220,60,60,.85)" : "rgba(0,0,0,.45)",
                  color: "white", border: "none", borderRadius: 50, padding: "5px 11px", fontSize: ".75rem",
                  backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 4,
                  animation: liked[topLiked.id] ? "heartPop .4s ease" : "none",
                }}>
                  {liked[topLiked.id] ? "❤️" : "🤍"} {(topLiked.likes || 0) + (liked[topLiked.id] ? 1 : 0)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--muted)" }}>
          <div style={{ fontSize: 56, marginBottom: 14, opacity: .35 }}>📷</div>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem" }}>Aucune photo pour l'instant</p>
          <p style={{ marginTop: 8, fontSize: ".88rem" }}>Soyez le premier à partager !</p>
        </div>
      )}

      {/* Grille masonry */}
      {sorted.length > 0 && (
        <div style={{ columnCount: "auto", columnWidth: 260, columnGap: 8, padding: "12px 8px" }}>
          {sorted.map((photo, i) => {
            const isTop = photo.id === topLiked?.id && (topLiked?.likes || 0) > 0;
            return (
              <div key={photo.id} className="photo-in" style={{
                breakInside: "avoid", marginBottom: 8, borderRadius: 14, overflow: "hidden",
                background: "var(--white)", boxShadow: isTop ? "0 4px 20px rgba(200,80,80,.2)" : "0 2px 12px var(--shadow)",
                border: isTop ? "1.5px solid rgba(200,80,80,.25)" : "none",
                animationDelay: `${Math.min(i * 0.035, 0.4)}s`,
              }}>
                <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(photo)}>
                  <img src={photo.url} alt="" style={{ width: "100%", display: "block" }} loading="lazy" />
                  {isTop && <span style={{ position: "absolute", top: 7, left: 7, background: "rgba(180,40,40,.85)", color: "white", borderRadius: 50, padding: "2px 9px", fontSize: ".66rem" }}>❤️ Top</span>}
                </div>
                <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {photo.author && <p style={{ fontSize: ".83rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.author}</p>}
                    {photo.message && <p style={{ fontSize: ".73rem", color: "var(--muted)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{photo.message}"</p>}
                    {!photo.author && !photo.message && (
                      <p style={{ fontSize: ".72rem", color: "var(--muted)" }}>{new Date(photo.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                  </div>
                  <button onClick={() => handleLike(photo)} style={{
                    background: liked[photo.id] ? "#ffe4e4" : "var(--cream)",
                    border: `1.5px solid ${liked[photo.id] ? "#e74c3c" : "var(--blush)"}`,
                    borderRadius: 50, padding: "5px 11px", display: "flex", alignItems: "center", gap: 4,
                    fontSize: ".78rem", color: liked[photo.id] ? "#c0392b" : "var(--muted)",
                    cursor: liked[photo.id] ? "default" : "pointer", flexShrink: 0,
                    animation: liked[photo.id] ? "heartPop .4s ease" : "none",
                  }}>
                    {liked[photo.id] ? "❤️" : "🤍"} {(photo.likes || 0) + (liked[photo.id] ? 1 : 0)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,2,.93)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .22s ease" }}
          onClick={() => setLightbox(null)}>
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", color: "white", borderRadius: 50, width: 38, height: 38, fontSize: "1.2rem", backdropFilter: "blur(10px)" }}>✕</button>
          <div style={{ maxWidth: "92vw", maxHeight: "90vh", position: "relative" }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt="" style={{ maxWidth: "92vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 12, display: "block" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg,rgba(0,0,0,.75),transparent)", color: "white", padding: "1.2rem 1rem .6rem", borderRadius: "0 0 12px 12px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                {lightbox.author && <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem" }}>{lightbox.author}</p>}
                {lightbox.message && <p style={{ fontSize: ".88rem", opacity: .8, fontStyle: "italic" }}>"{lightbox.message}"</p>}
              </div>
              <button onClick={() => handleLike(lightbox)} style={{
                background: liked[lightbox.id] ? "rgba(220,60,60,.85)" : "rgba(255,255,255,.15)",
                color: "white", border: "none", borderRadius: 50, padding: "8px 16px",
                fontSize: ".9rem", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 6,
                animation: liked[lightbox.id] ? "heartPop .4s ease" : "none",
              }}>
                {liked[lightbox.id] ? "❤️" : "🤍"} {(lightbox.likes || 0) + (liked[lightbox.id] ? 1 : 0)}
              </button>
            </div>
          </div>
        </div>
      )}

      <HomeButton setView={setView} />
    </div>
  );
}

// ============================================================
// LIVE TV — diaporama avec photo populaire boostée
// ============================================================

// Construit la file de lecture en dupliquant les photos populaires
function buildPlaylist(photos, boostFactor = 3) {
  if (photos.length === 0) return [];
  const maxLikes = Math.max(...photos.map(p => p.likes || 0), 1);
  const playlist = [];
  photos.forEach(p => {
    // Les photos très likées apparaissent jusqu'à boostFactor fois plus
    const weight = p.likes > 0 ? Math.round(1 + ((p.likes / maxLikes) * (boostFactor - 1))) : 1;
    for (let i = 0; i < weight; i++) playlist.push(p);
  });
  // Mélange en gardant la logique (Fisher-Yates)
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }
  return playlist;
}

function LiveTV({ setView }) {
  const [photos, setPhotos] = useState([]);
  const [mode, setMode] = useState("mixed");
  const [slideIdx, setSlideIdx] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(5000);
  const [newPhoto, setNewPhoto] = useState(null);
  const [event, setEvent] = useState(DB.getEvent());
  const ctTimer = useRef(), prevCount = useRef(0);
  useEffect(() => DB.onEvent(setEvent), []);

  useEffect(() => {
    return DB.onPhotos(all => {
      const approved = all.filter(p => p.status === "approved").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // Notification si nouvelle photo
      if (prevCount.current > 0 && approved.length > prevCount.current) {
        setNewPhoto(approved[0]);
        setTimeout(() => setNewPhoto(null), 5000);
      }
      prevCount.current = approved.length;
      setPhotos(approved);
      setPlaylist(buildPlaylist(approved));
    });
  }, []);

  // Avance dans la playlist (reconstruite périodiquement pour intégrer les nouveaux likes)
  useEffect(() => {
    if (mode !== "slideshow" || playlist.length === 0) return;
    const iv = setInterval(() => {
      setSlideIdx(i => {
        const next = i + 1;
        if (next >= playlist.length) {
          // Reconstruction de la playlist avec les likes mis à jour
          setPlaylist(buildPlaylist(photos));
          return 0;
        }
        return next;
      });
    }, speed);
    return () => clearInterval(iv);
  }, [mode, playlist.length, speed, photos]);

  const resetControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(ctTimer.current);
    ctTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetControls();
    window.addEventListener("mousemove", resetControls);
    window.addEventListener("touchstart", resetControls);
    return () => { window.removeEventListener("mousemove", resetControls); window.removeEventListener("touchstart", resetControls); };
  }, [resetControls]);

  const currentSlide = playlist[slideIdx % Math.max(playlist.length, 1)];

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0d0805", position: "relative" }}>

      {mode === "wall"      && <WallMode      photos={photos} />}
      {mode === "slideshow" && <SlideshowMode photo={currentSlide} index={slideIdx} speed={speed} total={playlist.length} />}
      {mode === "mixed"     && <MixedMode     photos={photos} />}

      {/* Notification nouvelle photo */}
      {newPhoto && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(201,122,106,.92)", color: "white", borderRadius: 16, padding: "10px 20px",
          backdropFilter: "blur(12px)", animation: "newBadge .4s ease",
          zIndex: 200, fontSize: ".9rem", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 28 }}>📸</span>
          <div>
            <p style={{ fontWeight: 500 }}>Nouvelle photo !</p>
            {newPhoto.author && <p style={{ fontSize: ".78rem", opacity: .85 }}>par {newPhoto.author}</p>}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", gap: 16 }}>
          <div style={{ fontSize: 80, opacity: .3 }}>💍</div>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2.2rem", fontWeight: 300 }}>{event.name}</p>
          <p style={{ fontSize: "1.1rem", opacity: .5, animation: "pulse 2.5s ease infinite" }}>En attente des premières photos…</p>
        </div>
      )}

      {/* Controls bar (top) */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, padding: "1.25rem 1.75rem",
        background: "linear-gradient(180deg, rgba(0,0,0,.8) 0%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: showControls ? 1 : 0, transition: "opacity .4s ease",
        zIndex: 100, pointerEvents: showControls ? "auto" : "none",
      }}>
        <div style={{ color: "rgba(255,255,255,.9)", fontFamily: "'Cormorant Garamond',serif" }}>
          <span style={{ fontSize: "1.55rem", fontWeight: 300 }}>{event.name}</span>
          <span style={{ marginLeft: 12, fontSize: ".9rem", opacity: .5, fontFamily: "'Jost',sans-serif" }}>
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {["wall","slideshow","mixed"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "5px 16px", borderRadius: 50, fontSize: ".8rem", fontFamily: "'Jost',sans-serif",
              background: mode === m ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.13)",
              color: mode === m ? "#1a1008" : "rgba(255,255,255,.8)",
              border: "none", transition: "all .2s", backdropFilter: "blur(10px)",
            }}>{{ wall: "🧱 Mur", slideshow: "🎞 Diapo", mixed: "⊞ Mixte" }[m]}</button>
          ))}
          {mode === "slideshow" && (
            <select value={speed} onChange={e => setSpeed(+e.target.value)} style={{ background: "rgba(255,255,255,.13)", color: "white", border: "none", borderRadius: 50, padding: "5px 12px", fontSize: ".8rem", backdropFilter: "blur(10px)" }}>
              {[[2000,"2s"],[4000,"4s"],[6000,"6s"],[10000,"10s"],[15000,"15s"]].map(([v,l]) => <option key={v} value={v} style={{ color: "#333" }}>{l}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Bouton accueil TV (toujours visible discrètement en bas gauche) */}
      <button onClick={() => setView(VIEWS.HOME)} style={{
        position: "fixed", bottom: 20, left: 20, zIndex: 200,
        background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)",
        border: "1px solid rgba(255,255,255,.15)", borderRadius: 50,
        padding: "7px 16px", fontSize: ".78rem", fontFamily: "'Jost',sans-serif",
        backdropFilter: "blur(10px)", transition: "opacity .3s",
        opacity: showControls ? 1 : 0.3,
      }}>
        🏠 Accueil
      </button>

      {/* Date en bas droite */}
      <div style={{ position: "fixed", bottom: 18, right: 20, zIndex: 100, opacity: showControls ? .55 : .2, transition: "opacity .4s", color: "rgba(255,255,255,.7)", fontSize: ".72rem", fontFamily: "'Jost',sans-serif", letterSpacing: 1 }}>
        {event.date}
      </div>
    </div>
  );
}

function WallMode({ photos }) {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gridAutoRows: "250px", gap: 3, padding: 3, alignContent: "start" }}>
      {photos.map((p, i) => (
        <div key={p.id} className="photo-in" style={{ animationDelay: `${Math.min(i * 0.05, 0.6)}s`, position: "relative", borderRadius: 8, overflow: "hidden", background: "#111" }}>
          <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem .75rem .5rem", background: "linear-gradient(0deg,rgba(0,0,0,.72),transparent)" }}>
            {p.author && <span style={{ color: "rgba(255,255,255,.9)", fontSize: ".85rem", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>{p.author}</span>}
            {(p.likes || 0) > 0 && <span style={{ color: "rgba(255,200,200,.8)", fontSize: ".7rem", marginLeft: 8 }}>❤️ {p.likes}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideshowMode({ photo, index, speed, total }) {
  if (!photo) return null;
  const kbs = ["kb1","kb2","kb3"];
  const kb = kbs[index % 3];
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Fond flou */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${photo.url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(26px) brightness(.3) saturate(.5)", transform: "scale(1.1)" }} />
      {/* Image Ken Burns */}
      <img key={photo.id} src={photo.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", animation: `fadeIn .9s ease, ${kb} ${speed / 1000}s ease both`, transformOrigin: "center" }} />
      {/* Badge populaire */}
      {(photo.likes || 0) >= 5 && (
        <div style={{ position: "absolute", top: 24, left: 24, background: "rgba(180,40,40,.8)", color: "white", borderRadius: 50, padding: "5px 16px", fontSize: ".85rem", backdropFilter: "blur(8px)" }}>
          ❤️ {photo.likes} personnes ont aimé cette photo
        </div>
      )}
      {/* Info overlay */}
      {(photo.author || photo.message) && (
        <div style={{ position: "absolute", bottom: "9%", left: "50%", transform: "translateX(-50%)", textAlign: "center", color: "white", animation: "fadeIn .9s ease", background: "rgba(0,0,0,.42)", backdropFilter: "blur(16px)", padding: ".9rem 2.2rem", borderRadius: 18, maxWidth: "72%" }}>
          {photo.author && <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.8rem", fontWeight: 300 }}>— {photo.author}</p>}
          {photo.message && <p style={{ fontSize: ".95rem", opacity: .85, marginTop: 5, fontStyle: "italic" }}>"{photo.message}"</p>}
        </div>
      )}
      {/* Points de progression */}
      <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
        {Array.from({ length: Math.min(total, 9) }, (_, i) => (
          <div key={i} style={{ width: i === (index % Math.min(total, 9)) ? 20 : 5, height: 5, borderRadius: 3, background: i === (index % Math.min(total, 9)) ? "white" : "rgba(255,255,255,.25)", transition: "all .3s ease" }} />
        ))}
      </div>
    </div>
  );
}

function MixedMode({ photos }) {
  // Photo "vedette" : alterne entre la dernière arrivée et la plus likée
  const [featureToggle, setFeatureToggle] = useState(false);
  const latest  = photos[0];
  const topLiked = [...photos].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
  const featured = featureToggle && topLiked && (topLiked.likes || 0) > 0 ? topLiked : (latest || null);

  useEffect(() => {
    const iv = setInterval(() => setFeatureToggle(t => !t), 8000);
    return () => clearInterval(iv);
  }, []);

  const rest = photos.filter(p => p.id !== featured?.id);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", gap: 3, padding: 3 }}>
      {featured && (
        <div style={{ flex: "0 0 56%", position: "relative", borderRadius: 8, overflow: "hidden" }}>
          <img key={featured.id} src={featured.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fadeIn .7s ease" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.75rem" }}>
            {featureToggle && (topLiked?.likes || 0) > 0
              ? <span style={{ background: "rgba(180,40,40,.85)", color: "white", borderRadius: 50, padding: "4px 14px", fontSize: ".78rem", display: "inline-block", marginBottom: 10 }}>❤️ Photo la plus aimée · {topLiked.likes} likes</span>
              : <span style={{ background: "rgba(201,122,106,.85)", color: "white", borderRadius: 50, padding: "4px 14px", fontSize: ".78rem", display: "inline-block", marginBottom: 10 }}>✨ Dernière photo</span>
            }
            {featured.author && <p style={{ color: "white", fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", fontWeight: 300 }}>{featured.author}</p>}
            {featured.message && <p style={{ color: "rgba(255,255,255,.8)", fontSize: ".95rem", fontStyle: "italic", marginTop: 4 }}>"{featured.message}"</p>}
            {(featured.likes || 0) > 0 && !featureToggle && <p style={{ color: "rgba(255,200,200,.75)", fontSize: ".82rem", marginTop: 6 }}>❤️ {featured.likes} réaction{featured.likes > 1 ? "s" : ""}</p>}
          </div>
        </div>
      )}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridAutoRows: "calc(50% - 1.5px)", gap: 3, overflow: "hidden" }}>
        {rest.slice(0, 4).map(p => (
          <div key={p.id} style={{ borderRadius: 8, overflow: "hidden", position: "relative" }}>
            <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {(p.author || (p.likes || 0) > 0) && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: ".4rem .6rem", background: "linear-gradient(0deg,rgba(0,0,0,.65),transparent)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                {p.author && <span style={{ color: "rgba(255,255,255,.9)", fontSize: ".75rem", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>{p.author}</span>}
                {(p.likes || 0) > 0 && <span style={{ color: "rgba(255,190,190,.85)", fontSize: ".68rem" }}>❤️ {p.likes}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PAGE
// ============================================================
function AdminPage({ auth, setAuth, setView }) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [photos, setPhotos]     = useState([]);
  const [tab, setTab]           = useState("photos");
  const [event, setEvent]       = useState(DB.getEvent());
  const [toast, showToast]      = useToast();

  useEffect(() => { if (!auth) return; return DB.onPhotos(setPhotos); }, [auth]);
  useEffect(() => DB.onEvent(e => setEvent(e)), []);

  const login = () => { if (password === event.adminPassword) { setAuth(true); setError(""); } else setError("Mot de passe incorrect"); };
  const updateEvent = async u => { await DB.updateEvent(u); showToast("Paramètres sauvegardés"); };
  const pending = photos.filter(p => p.status === "pending").length;

  if (!auth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #1a1008, #3d2010)", padding: "2rem" }}>
      <div className="fade-up" style={{ background: "var(--white)", borderRadius: 24, padding: "2.5rem", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🔑</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", color: "var(--burgundy)" }}>Administration</h2>
          <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 3 }}>{event.name}</p>
        </div>
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
          style={{ width: "100%", padding: "13px 15px", borderRadius: 12, marginBottom: 10, border: `1.5px solid ${error ? "#e74c3c" : "var(--blush)"}`, background: "var(--cream)", fontSize: "1rem" }} />
        {error && <p style={{ color: "#c0392b", fontSize: ".83rem", marginBottom: 10 }}>{error}</p>}
        <button onClick={login} className="btn" style={{ width: "100%", padding: "13px", borderRadius: 50, background: "linear-gradient(135deg, var(--rose), var(--burgundy))", color: "white", fontSize: "1rem" }}>
          Se connecter
        </button>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".7rem", marginTop: 12, opacity: .5 }}>Démo : admin123</p>
      </div>
      <HomeButton setView={setView} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <Toast msg={toast?.msg} type={toast?.type} />

      {/* Top bar */}
      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--blush)", padding: ".9rem 1.25rem", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", color: "var(--burgundy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</h1>
          <p style={{ color: "var(--muted)", fontSize: ".75rem" }}>{event.date}</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: "#eafaf1", color: "#1e8449", borderRadius: 9, padding: "4px 12px", fontSize: ".78rem" }}>✓ {photos.filter(p => p.status === "approved").length}</span>
          {pending > 0 && <span style={{ background: "#fef9e7", color: "#b7950b", borderRadius: 9, padding: "4px 12px", fontSize: ".78rem", animation: "pulse 2s ease infinite" }}>⏳ {pending}</span>}
          <button onClick={() => setView(VIEWS.HOME)} className="btn" style={{ background: "var(--burgundy)", color: "white", fontSize: ".78rem", padding: "6px 14px", borderRadius: 50 }}>🏠 Accueil</button>
          <button onClick={() => setAuth(false)} style={{ background: "none", color: "var(--muted)", fontSize: ".78rem", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--blush)" }}>Déco.</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "1rem 1.25rem 0", display: "flex", gap: 7, overflowX: "auto" }}>
        {[["photos","📷 Photos"],["stats","📊 Stats"],["settings","⚙️ Paramètres"],["export","📦 Export"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="btn" style={{
            padding: "7px 18px", borderRadius: 50, fontSize: ".85rem", whiteSpace: "nowrap",
            background: tab === k ? "var(--burgundy)" : "var(--white)",
            color: tab === k ? "white" : "var(--muted)",
            border: `1.5px solid ${tab === k ? "var(--burgundy)" : "var(--blush)"}`,
          }}>{l}{k === "photos" && pending > 0 ? ` (${pending})` : ""}</button>
        ))}
      </div>

      <div style={{ padding: "1.25rem" }}>
        {tab === "photos"   && <AdminPhotos   photos={photos} onUpdate={async (id, u) => { await DB.updatePhoto(id, u); showToast("Photo mise à jour"); }} onDelete={async id => { await DB.deletePhoto(id); showToast("Supprimée"); }} />}
        {tab === "stats"    && <AdminStats    photos={photos} />}
        {tab === "settings" && <AdminSettings event={event} onUpdate={updateEvent} />}
        {tab === "export"   && <AdminExport   photos={photos} event={event} />}
      </div>

      <HomeButton setView={setView} />
    </div>
  );
}

function AdminPhotos({ photos, onUpdate, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [lb, setLb] = useState(null);

  const filtered = photos.filter(p => filter === "all" ? true : p.status === filter);
  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["all","Toutes"],["approved","Publiées"],["pending","En attente"],["rejected","Refusées"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className="btn" style={{
            padding: "5px 14px", borderRadius: 50, fontSize: ".8rem",
            background: filter === k ? "var(--text)" : "var(--white)",
            color: filter === k ? "white" : "var(--muted)",
            border: `1.5px solid ${filter === k ? "var(--text)" : "var(--blush)"}`,
          }}>{l} ({k === "all" ? photos.length : photos.filter(p => p.status === k).length})</button>
        ))}
        {selected.size > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
            <button onClick={async () => { for (const id of selected) await onUpdate(id, { status: "approved" }); setSelected(new Set()); }} style={{ background: "#27ae60", color: "white", padding: "5px 14px", borderRadius: 50, fontSize: ".8rem" }}>✓ Publier ({selected.size})</button>
            <button onClick={async () => { if (!confirm("Supprimer ?")) return; for (const id of selected) await onDelete(id); setSelected(new Set()); }} style={{ background: "#e74c3c", color: "white", padding: "5px 14px", borderRadius: 50, fontSize: ".8rem" }}>🗑 ({selected.size})</button>
          </div>
        )}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>Aucune photo ici</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
        {filtered.map(p => (
          <div key={p.id} className="fade-in" style={{ background: "var(--white)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px var(--shadow)", border: selected.has(p.id) ? "2px solid var(--rose)" : p.status === "pending" ? "2px solid #f1c40f" : "2px solid transparent" }}>
            <div style={{ position: "relative", aspectRatio: "1", cursor: "pointer" }} onClick={() => setLb(p)}>
              <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div onClick={e => { e.stopPropagation(); toggle(p.id); }} style={{ position: "absolute", top: 7, left: 7, width: 20, height: 20, borderRadius: 5, background: selected.has(p.id) ? "var(--rose)" : "rgba(255,255,255,.5)", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", color: "white", cursor: "pointer" }}>
                {selected.has(p.id) && "✓"}
              </div>
              <div style={{ position: "absolute", top: 7, right: 7, background: { approved: "#27ae60", pending: "#f39c12", rejected: "#e74c3c" }[p.status], color: "white", padding: "1px 7px", borderRadius: 50, fontSize: ".65rem" }}>
                {{ approved: "✓", pending: "⏳", rejected: "✗" }[p.status]}
              </div>
              {(p.likes || 0) > 0 && <div style={{ position: "absolute", bottom: 7, right: 7, background: "rgba(0,0,0,.5)", color: "white", padding: "1px 7px", borderRadius: 50, fontSize: ".65rem" }}>❤️ {p.likes}</div>}
            </div>
            <div style={{ padding: "7px 9px" }}>
              {p.author && <p style={{ fontSize: ".8rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>👤 {p.author}</p>}
              {p.message && <p style={{ fontSize: ".7rem", color: "var(--muted)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>"{p.message}"</p>}
              <div style={{ display: "flex", gap: 4 }}>
                {p.status !== "approved"  && <button onClick={() => onUpdate(p.id, { status: "approved" })}  style={{ flex: 1, padding: "4px 0", borderRadius: 7, fontSize: ".7rem", background: "#27ae60", color: "white" }}>✓</button>}
                {p.status !== "rejected"  && <button onClick={() => onUpdate(p.id, { status: "rejected" })}  style={{ flex: 1, padding: "4px 0", borderRadius: 7, fontSize: ".7rem", background: "#f39c12", color: "white" }}>⏸</button>}
                <button onClick={() => onDelete(p.id)} style={{ flex: 1, padding: "4px 0", borderRadius: 7, fontSize: ".7rem", background: "#e74c3c", color: "white" }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lb && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,2,.92)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLb(null)}>
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", color: "white", borderRadius: 50, width: 36, height: 36 }}>✕</button>
          <img src={lb.url} alt="" style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function AdminStats({ photos }) {
  const approved = photos.filter(p => p.status === "approved");
  const totalLikes = photos.reduce((s, p) => s + (p.likes || 0), 0);
  const topLiked = [...photos].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  const byHour = useMemo(() => { const m = {}; photos.forEach(p => { const h = new Date(p.createdAt).getHours(); m[h] = (m[h] || 0) + 1; }); return m; }, [photos]);
  const maxH = Math.max(...Object.values(byHour), 1);

  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
        {[["📷", "Total", photos.length, "var(--burgundy)"],["✅","Publiées",approved.length,"#1e8449"],["⏳","En attente",photos.filter(p=>p.status==="pending").length,"#b7950b"],["❤️","Réactions",totalLikes,"#c0392b"]].map(([ic,l,v,c]) => (
          <div key={l} style={{ background: "var(--white)", borderRadius: 14, padding: "1.1rem", boxShadow: "0 2px 10px var(--shadow)", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 5 }}>{ic}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", color: c, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: ".73rem", color: "var(--muted)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--white)", borderRadius: 16, padding: "1.4rem", boxShadow: "0 2px 10px var(--shadow)", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", color: "var(--burgundy)", marginBottom: 14, fontSize: "1.25rem" }}>Photos par heure</h3>
        {photos.length === 0 ? <p style={{ color: "var(--muted)", textAlign: "center" }}>Aucune donnée</p> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90, overflowX: "auto" }}>
            {Array.from({ length: 24 }, (_, h) => {
              const c = byHour[h] || 0;
              return (
                <div key={h} style={{ flex: "0 0 auto", width: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {c > 0 && <span style={{ fontSize: ".58rem", color: "var(--muted)" }}>{c}</span>}
                  <div style={{ width: 13, height: `${Math.max((c / maxH) * 80, c > 0 ? 6 : 0)}px`, background: c > 0 ? "linear-gradient(180deg, var(--rose), var(--burgundy))" : "var(--blush)", borderRadius: "3px 3px 0 0", minHeight: 3 }} />
                  {h % 6 === 0 && <span style={{ fontSize: ".58rem", color: "var(--muted)" }}>{h}h</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {topLiked[0]?.likes > 0 && (
        <div style={{ background: "var(--white)", borderRadius: 16, padding: "1.4rem", boxShadow: "0 2px 10px var(--shadow)" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", color: "var(--burgundy)", marginBottom: 12, fontSize: "1.25rem" }}>❤️ Photos les plus aimées</h3>
          <div style={{ display: "flex", gap: 10 }}>
            {topLiked.filter(p => p.likes > 0).map((p, i) => (
              <div key={p.id} style={{ position: "relative", width: 90, height: 90, borderRadius: 12, overflow: "hidden" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,.6)", color: "white", padding: "1px 6px", borderRadius: 50, fontSize: ".65rem", backdropFilter: "blur(4px)" }}>❤️ {p.likes}</div>
                {i === 0 && <div style={{ position: "absolute", top: 3, left: 3, fontSize: ".85rem" }}>🥇</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSettings({ event, onUpdate }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [mm,   setMm]   = useState(event.moderationMode);
  const [dm,   setDm]   = useState(event.displayMode);
  const [pw,   setPw]   = useState(event.adminPassword);
  const [msg,  setMsg]  = useState(event.coverMessage || "");

  return (
    <div style={{ maxWidth: 560, display: "grid", gap: 12 }}>
      {/* Événement */}
      <div style={{ background: "var(--white)", borderRadius: 18, padding: "1.5rem", boxShadow: "0 2px 10px var(--shadow)" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", color: "var(--burgundy)", marginBottom: 14 }}>Événement</h3>
        <div style={{ display: "grid", gap: 9 }}>
          {[["Nom des mariés", name, setName],["Date", date, setDate],["Message d'accueil", msg, setMsg],["Mot de passe admin", pw, setPw, "password"]].map(([l,v,s,t="text"]) => (
            <div key={l}>
              <label style={{ fontSize: ".75rem", color: "var(--muted)", display: "block", marginBottom: 3 }}>{l}</label>
              <input type={t} value={v} onChange={e => s(e.target.value)} style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid var(--blush)", background: "var(--cream)", fontSize: ".93rem" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Modération */}
      <div style={{ background: "var(--white)", borderRadius: 18, padding: "1.5rem", boxShadow: "0 2px 10px var(--shadow)" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", color: "var(--burgundy)", marginBottom: 12 }}>Modération</h3>
        <div style={{ display: "grid", gap: 7 }}>
          {[["immediate","Immédiate","Photos visibles dès l'envoi"],["moderated","Modérée","Validation manuelle"],["delayed","Différée","Affichage automatique après délai"]].map(([v,l,d]) => (
            <button key={v} onClick={() => setMm(v)} style={{ padding: "11px 13px", borderRadius: 11, textAlign: "left", border: `2px solid ${mm === v ? "var(--rose)" : "var(--blush)"}`, background: mm === v ? "#fff0ed" : "var(--cream)", transition: "all .2s" }}>
              <div style={{ fontWeight: 500, color: "var(--text)", marginBottom: 1 }}>{mm === v ? "◉" : "○"} {l}</div>
              <div style={{ fontSize: ".76rem", color: "var(--muted)" }}>{d}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode TV */}
      <div style={{ background: "var(--white)", borderRadius: 18, padding: "1.5rem", boxShadow: "0 2px 10px var(--shadow)" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", color: "var(--burgundy)", marginBottom: 12 }}>Affichage TV</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[["wall","🧱 Mur"],["slideshow","🎞 Diapo"],["mixed","⊞ Mixte"]].map(([v,l]) => (
            <button key={v} onClick={() => setDm(v)} style={{ padding: "13px", borderRadius: 11, textAlign: "center", border: `2px solid ${dm === v ? "var(--rose)" : "var(--blush)"}`, background: dm === v ? "#fff0ed" : "var(--cream)", color: "var(--text)", fontWeight: dm === v ? 500 : 400, transition: "all .2s" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* QR Codes — URL réelle */}
      <div style={{ background: "var(--white)", borderRadius: 18, padding: "1.5rem", boxShadow: "0 2px 10px var(--shadow)" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", color: "var(--burgundy)", marginBottom: 14 }}>QR Codes</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[["📸 Invités","upload"],["🖼️ Galerie","gallery"],["📺 Écran TV","live"]].map(([l,h]) => {
            const url = `${APP_URL}#${h}`;
            return (
              <div key={h} style={{ textAlign: "center" }}>
                <p style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 9 }}>{l}</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <QRCode value={url} size={85} />
                </div>
                <button onClick={() => navigator.clipboard?.writeText(url)} className="btn" style={{ marginTop: 7, background: "var(--blush)", color: "var(--burgundy)", borderRadius: 50, padding: "4px 12px", fontSize: ".68rem" }}>
                  Copier
                </button>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: 14, wordBreak: "break-all", opacity: .6 }}>
          Base : {APP_URL}
        </p>
      </div>

      <button onClick={() => onUpdate({ name, date, moderationMode: mm, displayMode: dm, adminPassword: pw, coverMessage: msg })} className="btn"
        style={{ width: "100%", padding: "14px", borderRadius: 50, fontSize: ".97rem", background: "linear-gradient(135deg, var(--rose), var(--burgundy))", color: "white", fontWeight: 500, boxShadow: "0 4px 18px rgba(92,42,30,.28)" }}>
        💾 Sauvegarder
      </button>
    </div>
  );
}

function AdminExport({ photos, event }) {
  const [exporting, setExporting] = useState(false);
  const [prog, setProg] = useState(0);

  const exportCSV = () => {
    const h = ["id","author","message","status","likes","createdAt","url"];
    const rows = photos.map(p => h.map(k => JSON.stringify(p[k] ?? "")).join(","));
    const blob = new Blob([[h.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${event.slug || "mariage"}-photos.csv`; a.click();
  };

  const exportZIP = async () => {
    const approved = photos.filter(p => p.status === "approved");
    if (!approved.length) return;
    setExporting(true); setProg(0);
    if (!window.JSZip) {
      await new Promise(r => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload = r; document.head.appendChild(s); });
    }
    const zip = new window.JSZip(), folder = zip.folder("photos");
    for (let i = 0; i < approved.length; i++) {
      const p = approved[i];
      if (p.url.startsWith("data:")) folder.file(`photo_${i+1}_${p.author || "invite"}.jpg`, p.url.split(",")[1], { base64: true });
      else folder.file(`photo_${i+1}_url.txt`, p.url);
      setProg(Math.round(((i+1) / approved.length) * 100));
    }
    zip.file("recap.txt", photos.map(p => `${p.author||"Anonyme"} | ${p.status} | ❤️${p.likes||0} | ${p.message||""} | ${p.createdAt}`).join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${event.slug||"mariage"}-photos.zip`; a.click();
    setExporting(false); setProg(0);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: "var(--white)", borderRadius: 18, padding: "1.75rem", boxShadow: "0 2px 10px var(--shadow)", display: "grid", gap: 12 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", color: "var(--burgundy)" }}>Export</h3>
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>{photos.length} photos · {photos.filter(p=>p.status==="approved").length} publiées</p>
        {[
          { icon: "📊", title: "Export CSV", desc: "Métadonnées complètes (Excel)", fn: exportCSV, loading: false },
          { icon: "📦", title: "Export ZIP", desc: exporting ? `Préparation… ${prog}%` : "Photos + récapitulatif", fn: exportZIP, loading: exporting },
        ].map(c => (
          <button key={c.title} onClick={c.fn} disabled={c.loading} className="btn" style={{ padding: "13px 16px", borderRadius: 13, textAlign: "left", background: "var(--cream)", border: "1.5px solid var(--blush)", display: "flex", alignItems: "center", gap: 12, opacity: c.loading ? .7 : 1 }}>
            <span style={{ fontSize: 26, animation: c.loading ? "spin 1s linear infinite" : "none", display: "inline-block" }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{c.title}</div>
              <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>{c.desc}</div>
              {c.loading && <div style={{ marginTop: 6, background: "var(--blush)", borderRadius: 50, height: 4 }}><div style={{ height: "100%", background: "var(--rose)", width: `${prog}%`, borderRadius: 50, transition: "width .2s" }} /></div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
