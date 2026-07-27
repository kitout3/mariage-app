(() => {
  const translations = {
    fr: {
      liveTitle: "Accéder au live",
      liveDesc: "Suivre la cérémonie en direct",
      upload: "Envoyer une photo",
      uploadDesc: "Partager un souvenir",
      gallery: "Galerie & réactions",
      galleryDesc: "Voir toutes les photos",
      tv: "Affichage TV",
      tvDesc: "Diaporama plein écran",
      admin: "Administration",
      adminDesc: "Modérer & exporter",
      copy: "Copier le lien",
      guestQr: "QR Code invités",
      latest: "Dernière"
    },
    en: {
      liveTitle: "Watch live",
      liveDesc: "Watch the ceremony live",
      upload: "Upload a photo",
      uploadDesc: "Share a memory",
      gallery: "Gallery & reactions",
      galleryDesc: "See all photos",
      tv: "TV display",
      tvDesc: "Full-screen slideshow",
      admin: "Administration",
      adminDesc: "Moderate & export",
      copy: "Copy link",
      guestQr: "Guest QR code",
      latest: "Latest"
    },
    vi: {
      liveTitle: "Xem trực tiếp",
      liveDesc: "Theo dõi lễ cưới trực tiếp",
      upload: "Gửi ảnh",
      uploadDesc: "Chia sẻ kỷ niệm",
      gallery: "Thư viện & cảm xúc",
      galleryDesc: "Xem tất cả ảnh",
      tv: "Màn hình trình chiếu",
      tvDesc: "Trình chiếu toàn màn hình",
      admin: "Quản trị",
      adminDesc: "Kiểm duyệt và xuất dữ liệu",
      copy: "Sao chép liên kết",
      guestQr: "Mã QR dành cho khách",
      latest: "Mới nhất"
    }
  };

  const codes = ["fr", "en", "vi"];
  const saved = localStorage.getItem("mariage-lang");
  const browser = (navigator.language || "fr").slice(0, 2).toLowerCase();
  let currentLanguage = translations[saved] ? saved : (translations[browser] ? browser : "fr");

  const basePath = () => {
    const path = window.location.pathname;
    return path.endsWith("/") ? path : path.substring(0, path.lastIndexOf("/") + 1);
  };

  const liveUrl = () => `${window.location.origin}${basePath()}live.html`;

  function translatePage() {
    const t = translations[currentLanguage];
    const replacements = {
      "Envoyer une photo": t.upload,
      "Upload a photo": t.upload,
      "Gửi ảnh": t.upload,
      "Partager un souvenir": t.uploadDesc,
      "Share a memory": t.uploadDesc,
      "Chia sẻ kỷ niệm": t.uploadDesc,
      "Galerie & réactions": t.gallery,
      "Gallery & reactions": t.gallery,
      "Thư viện & cảm xúc": t.gallery,
      "Voir toutes les photos": t.galleryDesc,
      "See all photos": t.galleryDesc,
      "Xem tất cả ảnh": t.galleryDesc,
      "Affichage TV": t.tv,
      "TV display": t.tv,
      "Màn hình trình chiếu": t.tv,
      "Diaporama plein écran": t.tvDesc,
      "Full-screen slideshow": t.tvDesc,
      "Trình chiếu toàn màn hình": t.tvDesc,
      "Administration": t.admin,
      "Quản trị": t.admin,
      "Modérer & exporter": t.adminDesc,
      "Moderate & export": t.adminDesc,
      "Kiểm duyệt và xuất dữ liệu": t.adminDesc,
      "Copier le lien": t.copy,
      "Copy link": t.copy,
      "Sao chép liên kết": t.copy,
      "QR Code invités": t.guestQr,
      "Guest QR code": t.guestQr,
      "Mã QR dành cho khách": t.guestQr,
      "Dernière": t.latest,
      "Latest": t.latest,
      "Mới nhất": t.latest
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest("#wedding-language-switcher,#wedding-live-access")) return;
      const value = node.nodeValue.trim();
      if (replacements[value]) node.nodeValue = node.nodeValue.replace(value, replacements[value]);
    });

    document.documentElement.lang = currentLanguage;
    const title = document.querySelector("#wedding-live-access [data-title]");
    const desc = document.querySelector("#wedding-live-access [data-desc]");
    if (title) title.textContent = t.liveTitle;
    if (desc) desc.textContent = t.liveDesc;
  }

  function addControls() {
    if (!document.body) return;

    if (!document.getElementById("wedding-language-switcher")) {
      const switcher = document.createElement("div");
      switcher.id = "wedding-language-switcher";
      switcher.setAttribute("role", "group");
      switcher.setAttribute("aria-label", "Language");
      Object.assign(switcher.style, {
        position: "fixed", top: "12px", right: "12px", zIndex: "2147483647",
        display: "flex", gap: "4px", padding: "5px", borderRadius: "999px",
        background: "#fffdf9", border: "1px solid #f5ddd4",
        boxShadow: "0 5px 24px rgba(92,42,30,.25)"
      });
      codes.forEach(code => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = code.toUpperCase();
        button.dataset.lang = code;
        Object.assign(button.style, {
          border: "0", borderRadius: "999px", padding: "8px 11px", cursor: "pointer",
          fontFamily: "Arial,sans-serif", fontSize: "12px", fontWeight: "700"
        });
        button.addEventListener("click", () => {
          currentLanguage = code;
          localStorage.setItem("mariage-lang", code);
          updateActiveLanguage();
          translatePage();
        });
        switcher.appendChild(button);
      });
      document.body.appendChild(switcher);
    }

    if (!document.getElementById("wedding-live-access")) {
      const live = document.createElement("button");
      live.id = "wedding-live-access";
      live.type = "button";
      live.innerHTML = '<span style="font-size:22px">🎥</span><span style="display:flex;flex-direction:column;text-align:left"><strong data-title style="font-size:14px"></strong><small data-desc style="font-size:11px;opacity:.85"></small></span>';
      Object.assign(live.style, {
        position: "fixed", left: "50%", bottom: "18px", transform: "translateX(-50%)",
        zIndex: "2147483647", display: "flex", alignItems: "center", gap: "10px",
        padding: "11px 18px", border: "0", borderRadius: "999px", cursor: "pointer",
        color: "white", background: "#8f302d", boxShadow: "0 7px 28px rgba(92,42,30,.38)",
        fontFamily: "Arial,sans-serif", whiteSpace: "nowrap"
      });
      live.addEventListener("click", () => { window.location.href = liveUrl(); });
      document.body.appendChild(live);
    }

    updateActiveLanguage();
    translatePage();
  }

  function updateActiveLanguage() {
    document.querySelectorAll("#wedding-language-switcher button").forEach(button => {
      const active = button.dataset.lang === currentLanguage;
      button.style.background = active ? "#5c2a1e" : "transparent";
      button.style.color = active ? "white" : "#5c2a1e";
    });
  }

  document.addEventListener("DOMContentLoaded", addControls);
  window.addEventListener("load", addControls);
  setTimeout(addControls, 50);
  setTimeout(addControls, 500);
  setInterval(() => {
    addControls();
  }, 1500);
})();