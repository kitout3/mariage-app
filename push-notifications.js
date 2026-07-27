(() => {
  const COLLECTION = "pushSubscriptions";
  const LANG_KEY = "mariage-lang";
  const VAPID_KEY = "BF_FutOslaft75leK3ToH9EwsogNxgvPFzNSyUvTOliqs07nnXpEe7rcn6KnycfJhjUjFyhSjjRhok-bwKLb1Ug";

  const texts = {
    fr: {
      title: "Notifications vidéo",
      desc: "Recevez une notification lorsqu’une nouvelle vidéo attend votre validation.",
      enable: "Activer les notifications",
      enabled: "Notifications activées sur cet appareil",
      denied: "Les notifications sont bloquées dans les réglages du navigateur.",
      error: "Impossible d’activer les notifications. Vérifiez la configuration Firebase et les règles Firestore.",
      ios: "Sur iPhone, ajoutez d’abord le site à l’écran d’accueil, puis ouvrez-le depuis son icône."
    },
    en: {
      title: "Video notifications",
      desc: "Receive a notification when a new video is awaiting approval.",
      enable: "Enable notifications",
      enabled: "Notifications enabled on this device",
      denied: "Notifications are blocked in your browser settings.",
      error: "Unable to enable notifications. Check Firebase configuration and Firestore rules.",
      ios: "On iPhone, first add the site to your Home Screen, then open it from its icon."
    },
    vi: {
      title: "Thông báo video",
      desc: "Nhận thông báo khi có video mới đang chờ duyệt.",
      enable: "Bật thông báo",
      enabled: "Đã bật thông báo trên thiết bị này",
      denied: "Thông báo đang bị chặn trong cài đặt trình duyệt.",
      error: "Không thể bật thông báo. Hãy kiểm tra cấu hình Firebase và quy tắc Firestore.",
      ios: "Trên iPhone, hãy thêm trang web vào Màn hình chính rồi mở từ biểu tượng đó."
    }
  };

  const lang = () => texts[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : "fr";
  const t = key => texts[lang()][key];

  async function getFirebase() {
    const [{ initializeApp, getApps }, fs, msg] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js")
    ]);

    let app = getApps()[0];
    if (!app) {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      if (!cfg.apiKey || !cfg.projectId || !cfg.messagingSenderId || !cfg.appId) {
        throw new Error("Firebase configuration unavailable");
      }
      app = initializeApp(cfg);
    }

    return {
      app,
      cfg: app.options || window.__FIREBASE_CONFIG__ || {},
      db: fs.getFirestore(app),
      fs,
      messaging: msg.getMessaging(app),
      msg
    };
  }

  async function enable(button, status) {
    try {
      status.textContent = "";
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        throw new Error("Notifications unsupported");
      }

      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches) {
        status.textContent = t("ios");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        status.textContent = t("denied");
        return;
      }

      const { cfg, db, fs, messaging, msg } = await getFirebase();
      const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", { scope: "./" });
      await navigator.serviceWorker.ready;

      (registration.active || registration.waiting || registration.installing)?.postMessage({
        type: "FIREBASE_CONFIG",
        config: cfg
      });

      const token = await msg.getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) throw new Error("No FCM token returned");

      await fs.setDoc(
        fs.doc(db, COLLECTION, token),
        {
          token,
          eventId: "mariage-2026",
          enabled: true,
          platform: navigator.userAgent,
          updatedAt: fs.serverTimestamp()
        },
        { merge: true }
      );

      localStorage.setItem("video-push-enabled", "1");
      button.disabled = true;
      button.textContent = "✓ " + t("enabled");
      status.textContent = "";
    } catch (error) {
      console.error("Push notifications:", error);
      status.textContent = t("error");
    }
  }

  function createPanel() {
    const box = document.createElement("section");
    box.id = "push-video-settings";
    box.setAttribute("data-language-dynamic", "true");
    box.style.cssText = "background:#fffdf9;border-radius:18px;padding:1.5rem;box-shadow:0 2px 10px rgba(92,42,30,.12);display:grid;gap:10px;width:100%;";

    const enabled = localStorage.getItem("video-push-enabled") === "1";
    box.innerHTML = `
      <h3 style="font:600 1.3rem 'Cormorant Garamond',serif;color:#5c2a1e;margin:0">🔔 ${t("title")}</h3>
      <p style="color:#9e7060;font-size:.84rem;margin:0">${t("desc")}</p>
      <button type="button" data-enable style="border:0;border-radius:999px;padding:12px 18px;background:#5c2a1e;color:#fff;font-weight:600;cursor:pointer;width:100%" ${enabled ? "disabled" : ""}>
        ${enabled ? "✓ " + t("enabled") : t("enable")}
      </button>
      <p data-status style="min-height:20px;color:#9e7060;font-size:.78rem;margin:0"></p>
    `;

    const button = box.querySelector("[data-enable]");
    const status = box.querySelector("[data-status]");
    button.addEventListener("click", () => enable(button, status));
    return box;
  }

  function inject() {
    if (document.getElementById("push-video-settings")) return;
    if (window.location.hash.toLowerCase() !== "#admin") return;

    const saveButton = [...document.querySelectorAll("button")].find(button =>
      /Sauvegarder|Save|Lưu/i.test((button.textContent || "").trim())
    );

    if (saveButton?.parentElement) {
      saveButton.parentElement.insertBefore(createPanel(), saveButton);
      return;
    }

    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      const adminColumn = passwordInput.closest("div[style*='display: grid']")?.parentElement?.parentElement;
      if (adminColumn) {
        adminColumn.appendChild(createPanel());
      }
    }
  }

  function refresh() {
    document.getElementById("push-video-settings")?.remove();
    setTimeout(inject, 50);
  }

  const observer = new MutationObserver(() => setTimeout(inject, 40));
  document.addEventListener("DOMContentLoaded", () => {
    inject();
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(inject, 800);
  });

  window.addEventListener("hashchange", () => setTimeout(inject, 80));
  window.addEventListener("wedding-language-change", refresh);
})();