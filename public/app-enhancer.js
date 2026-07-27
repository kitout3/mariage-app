(() => {
  const translations = {
    fr: {
      liveTitle: "Regarder le live",
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
      copied: "Lien copié",
      photos: "photos",
      reactions: "réactions",
      latest: "Dernière",
      guestQr: "QR Code invités"
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
      copied: "Link copied",
      photos: "photos",
      reactions: "reactions",
      latest: "Latest",
      guestQr: "Guest QR code"
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
      copied: "Đã sao chép liên kết",
      photos: "ảnh",
      reactions: "cảm xúc",
      latest: "Mới nhất",
      guestQr: "Mã QR dành cho khách"
    }
  };

  const detectLanguage = () => {
    const saved = localStorage.getItem("mariage-lang");
    if (saved && translations[saved]) return saved;
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    return translations[browser] ? browser : "en";
  };

  let currentLanguage = detectLanguage();

  const getBasePath = () => {
    const path = window.location.pathname;
    return path.endsWith("/") ? path : path.substring(0, path.lastIndexOf("/") + 1);
  };

  const liveUrl = () => `${window.location.origin}${getBasePath()}live.html`;

  const translateText = (root = document.body) => {
    const t = translations[currentLanguage];
    const replacements = new Map([
      ["Envoyer une photo", t.upload],
      ["Partager un souvenir", t.uploadDesc],
      ["Galerie & réactions", t.gallery],
      ["Voir toutes les photos", t.galleryDesc],
      ["Affichage TV", t.tv],
      ["Diaporama plein écran", t.tvDesc],
      ["Administration", t.admin],
      ["Modérer & exporter", t.adminDesc],
      ["Copier le lien", t.copy],
      ["QR Code invités", t.guestQr],
      ["Dernière", t.latest]
    ]);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const trimmed = node.nodeValue.trim();
      if (replacements.has(trimmed)) {
        node.nodeValue = node.nodeValue.replace(trimmed, replacements.get(trimmed));
      }
      if (/^📸\s+\d+\s+photos?$/.test(trimmed)) {
        node.nodeValue = trimmed.replace(/photos?$/, t.photos);
      }
      if (/^❤️\s+\d+\s+réactions?$/.test(trimmed)) {
        node.nodeValue = trimmed.replace(/réactions?$/, t.reactions);
      }
    });
  };

  const makeLanguageSwitcher = () => {
    if (document.getElementById("wedding-language-switcher")) return;
    const wrapper = document.createElement("div");
    wrapper.id = "wedding-language-switcher";
    Object.assign(wrapper.style, {
      position: "fixed", top: "14px", right: "14px", zIndex: "10000",
      display: "flex", gap: "5px", padding: "5px", borderRadius: "999px",
      background: "rgba(255,253,249,.92)", boxShadow: "0 4px 18px rgba(92,42,30,.18)",
      backdropFilter: "blur(12px)"
    });
    ["fr", "en", "vi"].forEach(code => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = code.toUpperCase();
      button.setAttribute("aria-label", code);
      Object.assign(button.style, {
        border: "0", borderRadius: "999px", padding: "7px 10px", cursor: "pointer",
        fontFamily: "Jost, sans-serif", fontSize: "12px", fontWeight: "600"
      });
      const refresh = () => {
        const active = currentLanguage === code;
        button.style.background = active ? "#5c2a1e" : "transparent";
        button.style.color = active ? "white" : "#5c2a1e";
      };
      refresh();
      button.addEventListener("click", () => {
        currentLanguage = code;
        localStorage.setItem("mariage-lang", code);
        wrapper.querySelectorAll("button").forEach((b, index) => {
          const selected = ["fr", "en", "vi"][index] === code;
          b.style.background = selected ? "#5c2a1e" : "transparent";
          b.style.color = selected ? "white" : "#5c2a1e";
        });
        translateText();
        injectLiveCard(true);
      });
      wrapper.appendChild(button);
    });
    document.body.appendChild(wrapper);
  };

  const injectLiveCard = (refreshOnly = false) => {
    const existing = document.getElementById("wedding-live-card");
    const t = translations[currentLanguage];
    if (existing) {
      existing.querySelector("[data-live-title]").textContent = t.liveTitle;
      existing.querySelector("[data-live-desc]").textContent = t.liveDesc;
      return;
    }
    if (refreshOnly) return;

    const tvText = Array.from(document.querySelectorAll("div")).find(el => el.textContent.trim() === translations.fr.tv || el.textContent.trim() === translations.en.tv || el.textContent.trim() === translations.vi.tv);
    const grid = tvText?.closest("button")?.parentElement;
    if (!grid || grid.querySelector("#wedding-live-card")) return;

    const card = document.createElement("button");
    card.id = "wedding-live-card";
    card.type = "button";
    card.className = "btn";
    card.innerHTML = `<div style="font-size:28px;margin-bottom:8px">🎥</div><div data-live-title style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;color:#b34d4d;margin-bottom:2px">${t.liveTitle}</div><div data-live-desc style="color:#9e7060;font-size:.82rem">${t.liveDesc}</div>`;
    Object.assign(card.style, {
      background: "#fffdf9", border: "1.5px solid #f5ddd4", borderRadius: "18px",
      padding: "1.5rem 1.25rem", textAlign: "left", boxShadow: "0 3px 16px rgba(92,42,30,.12)",
      transition: "all .2s ease"
    });
    card.addEventListener("mouseenter", () => { card.style.transform = "translateY(-1px)"; });
    card.addEventListener("mouseleave", () => { card.style.transform = "translateY(0)"; });
    card.addEventListener("click", () => { window.location.href = liveUrl(); });

    const tvButton = tvText.closest("button");
    grid.insertBefore(card, tvButton);
  };

  const enhance = () => {
    makeLanguageSwitcher();
    translateText();
    injectLiveCard();
  };

  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhance);
  window.addEventListener("load", enhance);
  setTimeout(enhance, 500);
})();