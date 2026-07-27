(() => {
  const LANG_KEY = "mariage-lang";
  const COLLECTION = "videoTestimonials";

  const TEXTS = {
    fr: {
      title: "Galerie vidéos",
      description: "Regardez les témoignages vidéo",
      heading: "Galerie vidéos",
      subtitle: "Les messages vidéo de nos proches",
      back: "Retour à l’accueil",
      loading: "Chargement des vidéos…",
      empty: "Aucune vidéo validée pour le moment.",
      playAll: "Lire toutes les vidéos",
      stop: "Fermer",
      previous: "Précédente",
      next: "Suivante",
      videoBy: "Vidéo de",
      error: "Impossible de charger les vidéos."
    },
    en: {
      title: "Video gallery",
      description: "Watch the video messages",
      heading: "Video gallery",
      subtitle: "Video messages from our loved ones",
      back: "Back to home",
      loading: "Loading videos…",
      empty: "No approved videos yet.",
      playAll: "Play all videos",
      stop: "Close",
      previous: "Previous",
      next: "Next",
      videoBy: "Video by",
      error: "Unable to load the videos."
    },
    vi: {
      title: "Thư viện video",
      description: "Xem các lời chúc bằng video",
      heading: "Thư viện video",
      subtitle: "Những lời chúc từ người thân và bạn bè",
      back: "Về trang chủ",
      loading: "Đang tải video…",
      empty: "Hiện chưa có video nào được duyệt.",
      playAll: "Phát tất cả video",
      stop: "Đóng",
      previous: "Trước",
      next: "Tiếp",
      videoBy: "Video của",
      error: "Không thể tải video."
    }
  };

  const currentLang = () => {
    const value = localStorage.getItem(LANG_KEY);
    return TEXTS[value] ? value : "fr";
  };
  const t = key => TEXTS[currentLang()][key] || TEXTS.fr[key] || key;

  const css = `
    .vg-card{background:#fffdf9;border:1.5px solid #f5ddd4;border-radius:18px;padding:1.5rem 1.25rem;text-align:left;box-shadow:0 3px 16px rgba(92,42,30,.12);cursor:pointer;transition:.2s}
    .vg-card:hover{transform:translateY(-1px);filter:brightness(1.02)}
    .vg-overlay{position:fixed;inset:0;z-index:2147483645;background:linear-gradient(160deg,#fdf8f4,#f5ddd4);overflow:auto;padding:24px 16px;font-family:Jost,Arial,sans-serif;color:#3d2010}
    .vg-shell{max-width:1000px;margin:0 auto}.vg-header{text-align:center;margin:22px 0 28px}.vg-header h1{font:300 clamp(2.2rem,7vw,4rem) 'Cormorant Garamond',serif;color:#5c2a1e}.vg-header p{color:#9e7060}
    .vg-btn{border:0;border-radius:999px;padding:12px 18px;cursor:pointer;font-weight:600;font-family:inherit}.vg-primary{background:linear-gradient(135deg,#c97a6a,#5c2a1e);color:#fff}.vg-secondary{background:#f5ddd4;color:#5c2a1e}
    .vg-toolbar{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:24px}.vg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
    .vg-item{background:#fffdf9;border:1.5px solid #f5ddd4;border-radius:18px;overflow:hidden;box-shadow:0 3px 16px rgba(92,42,30,.12)}.vg-item video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}.vg-info{padding:14px 16px}.vg-author{font:600 1.25rem 'Cormorant Garamond',serif;color:#5c2a1e}.vg-message{margin-top:5px;color:#6f5045;font-size:.9rem;white-space:pre-wrap}
    .vg-player{position:fixed;inset:0;z-index:2147483647;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center}.vg-player video{width:100%;height:calc(100% - 86px);object-fit:contain;background:#000}.vg-player-bar{height:86px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;background:#111;flex-wrap:wrap}.vg-player-title{color:#fff;min-width:170px;text-align:center}.vg-player .vg-btn:disabled{opacity:.45;cursor:not-allowed}
  `;

  if (!document.getElementById("vg-style")) {
    const style = document.createElement("style");
    style.id = "vg-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  let firebasePromise;
  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const config = window.__FIREBASE_CONFIG__ || {};
      if (!config.apiKey || !config.projectId) throw new Error("Firebase config missing");
      const [{ initializeApp, getApps }, fs] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
      ]);
      const app = getApps()[0] || initializeApp(config);
      return { db: fs.getFirestore(app), fs };
    })();
    return firebasePromise;
  }

  async function getApprovedVideos() {
    const { db, fs } = await firebase();
    const q = fs.query(fs.collection(db, COLLECTION), fs.orderBy("createdAt", "asc"));
    const snapshot = await fs.getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(video => video.status === "approved" && video.url);
  }

  function safeText(value) {
    return String(value || "").replace(/[<>]/g, "");
  }

  function closeGallery() {
    document.getElementById("vg-overlay")?.remove();
    history.replaceState(null, "", location.pathname + location.search);
  }

  function openPlaylist(items, startIndex = 0) {
    if (!items.length) return;
    document.getElementById("vg-player")?.remove();
    const player = document.createElement("section");
    player.id = "vg-player";
    player.className = "vg-player";
    player.innerHTML = `
      <video controls playsinline></video>
      <div class="vg-player-bar">
        <button class="vg-btn vg-secondary" data-prev>⏮ ${t("previous")}</button>
        <div class="vg-player-title" data-title></div>
        <button class="vg-btn vg-secondary" data-next>${t("next")} ⏭</button>
        <button class="vg-btn vg-primary" data-close>✕ ${t("stop")}</button>
      </div>`;
    document.body.appendChild(player);

    const video = player.querySelector("video");
    const title = player.querySelector("[data-title]");
    const previous = player.querySelector("[data-prev]");
    const next = player.querySelector("[data-next]");
    let index = Math.max(0, Math.min(startIndex, items.length - 1));

    const play = () => {
      const item = items[index];
      video.src = item.url;
      video.muted = false;
      video.volume = 1;
      title.textContent = `${index + 1}/${items.length} — ${item.author ? `${t("videoBy")} ${item.author}` : t("heading")}`;
      previous.disabled = items.length < 2;
      next.disabled = items.length < 2;
      video.play().catch(() => {});
    };

    previous.onclick = () => { index = (index - 1 + items.length) % items.length; play(); };
    next.onclick = () => { index = (index + 1) % items.length; play(); };
    video.onended = () => {
      if (index < items.length - 1) {
        index += 1;
        play();
      }
    };
    player.querySelector("[data-close]").onclick = () => player.remove();
    play();
  }

  async function openGallery() {
    document.getElementById("vg-overlay")?.remove();
    history.replaceState(null, "", `${location.pathname}${location.search}#video-gallery`);
    const overlay = document.createElement("section");
    overlay.id = "vg-overlay";
    overlay.className = "vg-overlay";
    overlay.innerHTML = `
      <div class="vg-shell">
        <button class="vg-btn vg-secondary" data-back>← ${t("back")}</button>
        <header class="vg-header"><div style="font-size:46px">🎞️</div><h1>${t("heading")}</h1><p>${t("subtitle")}</p></header>
        <div class="vg-toolbar" data-toolbar style="display:none"><button class="vg-btn vg-primary" data-play-all>▶ ${t("playAll")}</button></div>
        <div data-content style="text-align:center;color:#9e7060">${t("loading")}</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("[data-back]").onclick = closeGallery;

    const content = overlay.querySelector("[data-content]");
    const toolbar = overlay.querySelector("[data-toolbar]");
    try {
      const items = await getApprovedVideos();
      if (!items.length) {
        content.textContent = t("empty");
        return;
      }
      toolbar.style.display = "flex";
      toolbar.querySelector("[data-play-all]").onclick = () => openPlaylist(items, 0);
      content.style.textAlign = "left";
      content.innerHTML = '<div class="vg-grid"></div>';
      const grid = content.firstElementChild;
      items.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "vg-item";
        card.innerHTML = `
          <video controls playsinline preload="metadata" src="${item.url}"></video>
          <div class="vg-info">
            <div class="vg-author">${safeText(item.author) || t("heading")}</div>
            ${item.message ? `<div class="vg-message">${safeText(item.message)}</div>` : ""}
            <button class="vg-btn vg-primary" style="margin-top:12px" data-play>▶ ${t("playAll")}</button>
          </div>`;
        card.querySelector("[data-play]").onclick = () => openPlaylist(items, index);
        grid.appendChild(card);
      });
    } catch (error) {
      console.error("Video gallery:", error);
      content.textContent = t("error");
    }
  }

  function addGalleryCard() {
    if (document.getElementById("vg-home-card")) return;
    const admin = [...document.querySelectorAll("button")].find(button => /Administration|Quản trị/.test(button.textContent));
    const grid = admin?.parentElement;
    if (!grid || getComputedStyle(grid).display !== "grid") return;
    const card = document.createElement("button");
    card.id = "vg-home-card";
    card.className = "vg-card";
    card.innerHTML = `<div style="font-size:28px;margin-bottom:8px">🎞️</div><div style="font:1.25rem 'Cormorant Garamond',serif;color:#6a4b8a;margin-bottom:2px">${t("title")}</div><div style="color:#9e7060;font-size:.82rem">${t("description")}</div>`;
    card.onclick = openGallery;
    grid.insertBefore(card, admin);
  }

  function refresh() {
    addGalleryCard();
    if (location.hash === "#video-gallery" && !document.getElementById("vg-overlay")) openGallery();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#wedding-language-switcher")) {
      setTimeout(() => {
        document.getElementById("vg-home-card")?.remove();
        refresh();
      }, 50);
    }
  });
  const observer = new MutationObserver(() => setTimeout(refresh, 30));
  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.addEventListener("load", refresh);
  window.addEventListener("hashchange", refresh);
  setTimeout(refresh, 400);
})();