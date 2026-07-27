(() => {
  const translations = {
    fr: { liveTitle: "Accéder au live", liveDesc: "Suivre la cérémonie en direct" },
    en: { liveTitle: "Watch live", liveDesc: "Watch the ceremony live" },
    vi: { liveTitle: "Xem trực tiếp", liveDesc: "Theo dõi lễ cưới trực tiếp" }
  };

  const saved = localStorage.getItem("mariage-lang");
  const browser = (navigator.language || "fr").slice(0, 2).toLowerCase();
  let currentLanguage = translations[saved] ? saved : (translations[browser] ? browser : "fr");

  const basePath = () => {
    const path = window.location.pathname;
    return path.endsWith("/") ? path : path.substring(0, path.lastIndexOf("/") + 1);
  };
  const liveUrl = () => `${window.location.origin}${basePath()}live.html`;

  const firebase = window.__FIREBASE_CONFIG__ || {};
  const firestoreDocumentUrl = () => {
    if (!firebase.projectId || !firebase.apiKey) return null;
    return `https://firestore.googleapis.com/v1/projects/${firebase.projectId}/databases/(default)/documents/events/mariage-live?key=${encodeURIComponent(firebase.apiKey)}`;
  };

  const youtubeToEmbed = value => {
    try {
      const url = new URL(value.trim());
      let id = "";
      if (url.hostname.includes("youtu.be")) id = url.pathname.split("/").filter(Boolean)[0] || "";
      else if (url.pathname.startsWith("/live/")) id = url.pathname.split("/live/")[1]?.split("/")[0] || "";
      else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      else id = url.searchParams.get("v") || "";
      return id ? `https://www.youtube.com/embed/${id}` : "";
    } catch { return ""; }
  };

  const decodeFirestore = fields => {
    const out = {};
    Object.entries(fields || {}).forEach(([key, value]) => {
      out[key] = value.stringValue ?? value.booleanValue ?? value.integerValue ?? value.doubleValue ?? null;
    });
    return out;
  };

  async function readLiveSettings() {
    const fallback = JSON.parse(localStorage.getItem("mariage-live-settings") || "null") || {};
    const endpoint = firestoreDocumentUrl();
    if (!endpoint) return fallback;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return fallback;
      const json = await response.json();
      return { ...fallback, ...decodeFirestore(json.fields) };
    } catch { return fallback; }
  }

  async function saveLiveSettings(settings) {
    localStorage.setItem("mariage-live-settings", JSON.stringify(settings));
    const endpoint = firestoreDocumentUrl();
    if (!endpoint) throw new Error("Configuration Firebase absente");
    const fields = {};
    Object.entries(settings).forEach(([key, value]) => {
      fields[key] = { stringValue: String(value ?? "") };
    });
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!response.ok) throw new Error(`Firestore ${response.status}`);
  }

  function updateActiveLanguage() {
    document.querySelectorAll("#wedding-language-switcher button").forEach(button => {
      const active = button.dataset.lang === currentLanguage;
      button.style.background = active ? "#5c2a1e" : "transparent";
      button.style.color = active ? "white" : "#5c2a1e";
    });
    const t = translations[currentLanguage];
    const title = document.querySelector("#wedding-live-access [data-title]");
    const desc = document.querySelector("#wedding-live-access [data-desc]");
    if (title) title.textContent = t.liveTitle;
    if (desc) desc.textContent = t.liveDesc;
  }

  function addGlobalControls() {
    if (!document.body) return;
    if (!document.getElementById("wedding-language-switcher")) {
      const switcher = document.createElement("div");
      switcher.id = "wedding-language-switcher";
      Object.assign(switcher.style, {
        position: "fixed", top: "12px", right: "12px", zIndex: "2147483647",
        display: "flex", gap: "4px", padding: "5px", borderRadius: "999px",
        background: "#fffdf9", border: "1px solid #f5ddd4", boxShadow: "0 5px 24px rgba(92,42,30,.25)"
      });
      ["fr", "en", "vi"].forEach(code => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = code.toUpperCase();
        button.dataset.lang = code;
        Object.assign(button.style, { border: "0", borderRadius: "999px", padding: "8px 11px", cursor: "pointer", fontWeight: "700" });
        button.onclick = () => {
          currentLanguage = code;
          localStorage.setItem("mariage-lang", code);
          updateActiveLanguage();
        };
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
        color: "white", background: "#8f302d", boxShadow: "0 7px 28px rgba(92,42,30,.38)", whiteSpace: "nowrap"
      });
      live.onclick = () => { window.location.href = liveUrl(); };
      document.body.appendChild(live);
    }
    updateActiveLanguage();
  }

  async function addAdminLiveEditor() {
    if (document.getElementById("admin-live-editor")) return;
    const headings = [...document.querySelectorAll("h3")];
    const eventHeading = headings.find(h => h.textContent.trim() === "Événement");
    if (!eventHeading) return;
    const eventCard = eventHeading.parentElement;
    if (!eventCard?.parentElement) return;

    const card = document.createElement("div");
    card.id = "admin-live-editor";
    Object.assign(card.style, {
      background: "#fffdf9", borderRadius: "18px", padding: "1.5rem",
      boxShadow: "0 2px 10px rgba(92,42,30,.12)", display: "grid", gap: "9px"
    });
    card.innerHTML = `
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:#5c2a1e;margin:0 0 5px">🎥 Diffusion en direct</h3>
      <label for="admin-youtube-url" style="font-size:.75rem;color:#9e7060">Lien YouTube du live</label>
      <input id="admin-youtube-url" type="url" placeholder="https://youtube.com/live/..." style="width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #f5ddd4;background:#fdf8f4;font-size:.93rem" />
      <p style="font-size:.74rem;color:#9e7060;line-height:1.45">Utilise une vidéo ou un direct YouTube en mode <strong>Non répertorié</strong>. Le lien sera sauvegardé dans Firebase et repris automatiquement par la page Live.</p>
      <button id="admin-save-youtube" type="button" style="padding:12px;border:0;border-radius:999px;background:linear-gradient(135deg,#c97a6a,#5c2a1e);color:white;font-weight:600;cursor:pointer">💾 Sauvegarder le lien du live</button>
      <div id="admin-live-status" style="font-size:.78rem;min-height:18px;color:#1e8449"></div>`;

    eventCard.insertAdjacentElement("afterend", card);
    const input = card.querySelector("#admin-youtube-url");
    const button = card.querySelector("#admin-save-youtube");
    const status = card.querySelector("#admin-live-status");
    const current = await readLiveSettings();
    input.value = current.liveUrl || "https://youtube.com/live/GOXPaYOleEM?feature=share";

    button.onclick = async () => {
      const value = input.value.trim();
      const embed = youtubeToEmbed(value);
      if (!embed) {
        status.style.color = "#c0392b";
        status.textContent = "Lien YouTube invalide.";
        return;
      }
      button.disabled = true;
      status.style.color = "#9e7060";
      status.textContent = "Sauvegarde en cours…";
      try {
        await saveLiveSettings({
          liveUrl: value,
          playerUrl: embed,
          eventName: "Huyen & Quentin",
          eventDate: "13 septembre 2026",
          eventDateISO: "2026-09-13T15:30:00+02:00",
          eventTime: "15:30",
          location: "La Faisanderie d’Arcueil",
          updatedAt: new Date().toISOString()
        });
        status.style.color = "#1e8449";
        status.textContent = "✓ Lien sauvegardé dans Firebase.";
      } catch (error) {
        status.style.color = "#c0392b";
        status.textContent = "Échec Firebase. Vérifie les règles Firestore et les secrets GitHub.";
        console.error(error);
      } finally {
        button.disabled = false;
      }
    };
  }

  const refresh = () => {
    addGlobalControls();
    addAdminLiveEditor();
  };
  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("load", refresh);
  setTimeout(refresh, 100);
  setInterval(refresh, 1200);
})();
