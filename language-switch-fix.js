(() => {
  const LANG_KEY = "mariage-lang";

  const groups = [
    { fr:"Retour à l’accueil", en:"Back to home", vi:"Về trang chủ" },
    { fr:"Retour à l'accueil", en:"Back to home", vi:"Về trang chủ" },
    { fr:"Envoyer une photo", en:"Upload a photo", vi:"Gửi ảnh" },
    { fr:"Partager un souvenir", en:"Share a memory", vi:"Chia sẻ kỷ niệm" },
    { fr:"Galerie & réactions", en:"Gallery & reactions", vi:"Thư viện ảnh và cảm xúc" },
    { fr:"Voir toutes les photos", en:"View all photos", vi:"Xem tất cả ảnh" },
    { fr:"Affichage TV", en:"TV display", vi:"Màn hình trình chiếu" },
    { fr:"Diaporama plein écran", en:"Full-screen slideshow", vi:"Trình chiếu toàn màn hình" },
    { fr:"Administration", en:"Administration", vi:"Quản trị" },
    { fr:"Modérer et exporter", en:"Moderate and export", vi:"Kiểm duyệt và xuất dữ liệu" },
    { fr:"Regarder le live", en:"Watch live", vi:"Xem trực tiếp" },
    { fr:"Suivre la cérémonie en direct", en:"Watch the ceremony live", vi:"Theo dõi lễ cưới trực tiếp" },
    { fr:"Témoignage vidéo", en:"Video message", vi:"Lời chúc bằng video" },
    { fr:"Laissez un souvenir vidéo à Huyen & Quentin", en:"Leave a video memory for Huyen & Quentin", vi:"Gửi một kỷ niệm bằng video tới Huyen & Quentin" },
    { fr:"Enregistrer une vidéo", en:"Record a video", vi:"Quay video" },
    { fr:"Choisir une vidéo", en:"Choose a video", vi:"Chọn video" },
    { fr:"Démarrer l’enregistrement", en:"Start recording", vi:"Bắt đầu quay" },
    { fr:"Arrêter l’enregistrement", en:"Stop recording", vi:"Dừng quay" },
    { fr:"Recommencer", en:"Record again", vi:"Quay lại" },
    { fr:"Envoyer la vidéo", en:"Upload video", vi:"Gửi video" },
    { fr:"Les vidéos sont limitées à 5 minutes et 500 Mo. Elles doivent être validées avant diffusion.", en:"Videos are limited to 5 minutes and 500 MB. They must be approved before publication.", vi:"Video giới hạn 5 phút và 500 MB. Video phải được duyệt trước khi hiển thị." },
    { fr:"Galerie vidéos", en:"Video gallery", vi:"Thư viện video" },
    { fr:"Regardez les témoignages vidéo validés", en:"Watch approved video messages", vi:"Xem các video đã được duyệt" },
    { fr:"Lire toutes les vidéos", en:"Play all videos", vi:"Phát tất cả video" },
    { fr:"Photos", en:"Photos", vi:"Ảnh" },
    { fr:"Statistiques", en:"Statistics", vi:"Thống kê" },
    { fr:"Stats", en:"Statistics", vi:"Thống kê" },
    { fr:"Paramètres", en:"Settings", vi:"Cài đặt" },
    { fr:"Événement", en:"Event", vi:"Sự kiện" },
    { fr:"Nom des mariés", en:"Couple’s names", vi:"Tên cô dâu và chú rể" },
    { fr:"Date", en:"Date", vi:"Ngày" },
    { fr:"Message d’accueil", en:"Welcome message", vi:"Lời chào" },
    { fr:"Message d'accueil", en:"Welcome message", vi:"Lời chào" },
    { fr:"Mot de passe administrateur", en:"Admin password", vi:"Mật khẩu quản trị" },
    { fr:"Mot de passe admin", en:"Admin password", vi:"Mật khẩu quản trị" },
    { fr:"Modération", en:"Moderation", vi:"Kiểm duyệt" },
    { fr:"Immédiate", en:"Immediate", vi:"Ngay lập tức" },
    { fr:"Modérée", en:"Moderated", vi:"Có kiểm duyệt" },
    { fr:"Différée", en:"Delayed", vi:"Trì hoãn" },
    { fr:"Validation manuelle", en:"Manual approval", vi:"Duyệt thủ công" },
    { fr:"Sauvegarder", en:"Save", vi:"Lưu" },
    { fr:"Diffusion en direct", en:"Live streaming", vi:"Phát trực tiếp" },
    { fr:"Lien YouTube du live", en:"YouTube live link", vi:"Liên kết YouTube trực tiếp" },
    { fr:"Sauvegarder le lien du live", en:"Save live link", vi:"Lưu liên kết trực tiếp" },
    { fr:"Supprimer le lien", en:"Remove link", vi:"Xóa liên kết" },
    { fr:"Aucun live configuré", en:"No live stream configured", vi:"Chưa cấu hình phát trực tiếp" },
    { fr:"Cérémonie en direct", en:"Live ceremony", vi:"Lễ cưới trực tiếp" },
    { fr:"Le direct n’est pas encore configuré", en:"The live stream is not configured yet", vi:"Buổi phát trực tiếp chưa được cấu hình" },
    { fr:"Touchez la vidéo pour activer le son.", en:"Tap the video to enable sound.", vi:"Chạm vào video để bật âm thanh." },
    { fr:"Ouvrir sur YouTube", en:"Open on YouTube", vi:"Mở trên YouTube" }
  ];

  const placeholders = [
    { fr:"Votre prénom (optionnel)", en:"Your first name (optional)", vi:"Tên của bạn (không bắt buộc)" },
    { fr:"Un petit mot (optionnel)", en:"A short message (optional)", vi:"Lời nhắn ngắn (không bắt buộc)" },
    { fr:"Mot de passe", en:"Password", vi:"Mật khẩu" },
    { fr:"Collez ici le lien YouTube du live", en:"Paste the YouTube live link here", vi:"Dán liên kết YouTube trực tiếp tại đây" }
  ];

  const allValues = group => Object.values(group);
  const normalizeLang = value => ["fr","en","vi"].includes(value) ? value : "fr";

  function translateText(text, lang) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    for (const group of groups) {
      if (allValues(group).includes(trimmed)) {
        return text.replace(trimmed, group[lang]);
      }
    }
    return text;
  }

  function applyLanguage(lang) {
    lang = normalizeLang(lang);
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest("script,style,#wedding-language-switcher")) return;
      const next = translateText(node.nodeValue, lang);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    document.querySelectorAll("input,textarea").forEach(el => {
      const value = el.getAttribute("placeholder");
      if (!value) return;
      for (const group of placeholders) {
        if (allValues(group).includes(value)) {
          el.setAttribute("placeholder", group[lang]);
          break;
        }
      }
    });

    document.querySelectorAll("#wedding-language-switcher button,[data-lang]").forEach(button => {
      const active = button.dataset.lang === lang;
      button.classList.toggle("active", active);
      if (button.closest("#wedding-language-switcher")) {
        button.style.background = active ? "#5c2a1e" : "transparent";
        button.style.color = active ? "white" : "#5c2a1e";
      }
    });

    window.dispatchEvent(new CustomEvent("mariage-language-change", { detail:{ lang } }));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("#wedding-language-switcher button,[data-lang]");
    if (!button?.dataset.lang) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyLanguage(button.dataset.lang);
  }, true);

  const observer = new MutationObserver(() => {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(() => applyLanguage(localStorage.getItem(LANG_KEY) || "fr"), 30);
  });

  const start = () => {
    applyLanguage(localStorage.getItem(LANG_KEY) || "fr");
    observer.observe(document.body, { childList:true, subtree:true });
  };

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
