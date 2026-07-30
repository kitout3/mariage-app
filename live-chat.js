(() => {
  const CHAT_ID = "wedding-live-chat";
  const EVENT_ID = "mariage-2026";
  const COLLECTION = "liveChatMessages";
  let unsubscribe = null;

  const esc = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

  function lang() {
    const value = localStorage.getItem("mariage-lang") || "fr";
    return ["fr", "en", "vi"].includes(value) ? value : "fr";
  }

  const TEXTS = {
    fr: { title: "Discussion en direct", name: "Votre prénom", message: "Écrire un message…", send: "Envoyer", empty: "Soyez le premier à écrire un message.", error: "Le chat ne peut pas être chargé.", sending: "Envoi…" },
    en: { title: "Live chat", name: "Your name", message: "Write a message…", send: "Send", empty: "Be the first to write a message.", error: "The chat could not be loaded.", sending: "Sending…" },
    vi: { title: "Trò chuyện trực tiếp", name: "Tên của bạn", message: "Viết tin nhắn…", send: "Gửi", empty: "Hãy là người đầu tiên gửi tin nhắn.", error: "Không thể tải trò chuyện.", sending: "Đang gửi…" }
  };

  const t = key => TEXTS[lang()][key];

  async function firebase() {
    const [{ initializeApp, getApps }, fs] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
    ]);
    const cfg = window.__FIREBASE_CONFIG__ || {};
    if (!cfg.apiKey || !cfg.projectId) throw new Error("Firebase configuration missing");
    const app = getApps()[0] || initializeApp(cfg);
    return { db: fs.getFirestore(app), fs };
  }

  function formatTime(value) {
    const date = value?.toDate?.() || new Date();
    return date.toLocaleTimeString(lang() === "fr" ? "fr-FR" : lang() === "vi" ? "vi-VN" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  async function mount(panel) {
    if (!panel || panel.querySelector(`#${CHAT_ID}`)) return;

    const chat = document.createElement("section");
    chat.id = CHAT_ID;
    chat.style.cssText = "background:#fffdf9;border-top:1px solid #f5ddd4;padding:12px 14px;display:grid;grid-template-rows:auto minmax(100px,1fr) auto;gap:9px;height:min(40vh,360px);min-height:245px;box-sizing:border-box;color:#3d2010";
    chat.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <h2 style="margin:0;font:600 1.25rem 'Cormorant Garamond',Georgia,serif;color:#5c2a1e">💬 ${t("title")}</h2>
        <span data-chat-count style="font-size:.75rem;color:#9e7060"></span>
      </div>
      <div data-chat-list style="overflow:auto;display:grid;align-content:start;gap:8px;padding:2px 2px 4px"></div>
      <form data-chat-form style="display:grid;grid-template-columns:minmax(90px,130px) 1fr auto;gap:7px;align-items:center">
        <input data-chat-name maxlength="30" placeholder="${t("name")}" style="min-width:0;padding:10px 11px;border:1px solid #f5ddd4;border-radius:12px;background:#fdf8f4;font:inherit" />
        <input data-chat-message maxlength="300" placeholder="${t("message")}" required style="min-width:0;padding:10px 11px;border:1px solid #f5ddd4;border-radius:12px;background:#fdf8f4;font:inherit" />
        <button data-chat-send type="submit" style="border:0;border-radius:999px;padding:10px 15px;background:#5c2a1e;color:white;font-weight:600;cursor:pointer">${t("send")}</button>
      </form>`;

    panel.appendChild(chat);

    const list = chat.querySelector("[data-chat-list]");
    const count = chat.querySelector("[data-chat-count]");
    const form = chat.querySelector("[data-chat-form]");
    const nameInput = chat.querySelector("[data-chat-name]");
    const messageInput = chat.querySelector("[data-chat-message]");
    const sendButton = chat.querySelector("[data-chat-send]");
    nameInput.value = localStorage.getItem("wedding-chat-name") || "";

    try {
      const { db, fs } = await firebase();
      const q = fs.query(
        fs.collection(db, COLLECTION),
        fs.where("eventId", "==", EVENT_ID),
        fs.orderBy("createdAt", "asc"),
        fs.limit(150)
      );

      unsubscribe?.();
      unsubscribe = fs.onSnapshot(q, snap => {
        list.innerHTML = "";
        count.textContent = `${snap.size}`;
        if (!snap.size) {
          list.innerHTML = `<p style="margin:auto;color:#9e7060;font-size:.85rem">${t("empty")}</p>`;
          return;
        }
        snap.docs.forEach(doc => {
          const item = doc.data();
          const row = document.createElement("article");
          row.style.cssText = "background:#fdf8f4;border:1px solid #f5ddd4;border-radius:12px;padding:8px 10px";
          row.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><strong style="color:#5c2a1e;font-size:.88rem">${esc(item.name || "Invité")}</strong><time style="color:#9e7060;font-size:.7rem">${formatTime(item.createdAt)}</time></div><p style="margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem">${esc(item.message)}</p>`;
          list.appendChild(row);
        });
        list.scrollTop = list.scrollHeight;
      }, error => {
        console.error("Live chat:", error);
        list.innerHTML = `<p style="margin:auto;color:#b83232">${t("error")}</p>`;
      });

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const name = nameInput.value.trim().slice(0, 30);
        const message = messageInput.value.trim().slice(0, 300);
        if (!message) return;
        sendButton.disabled = true;
        sendButton.textContent = t("sending");
        try {
          localStorage.setItem("wedding-chat-name", name);
          await fs.addDoc(fs.collection(db, COLLECTION), {
            eventId: EVENT_ID,
            name: name || "Invité",
            message,
            createdAt: fs.serverTimestamp()
          });
          messageInput.value = "";
        } catch (error) {
          console.error("Send chat message:", error);
          alert(t("error"));
        } finally {
          sendButton.disabled = false;
          sendButton.textContent = t("send");
          messageInput.focus();
        }
      });
    } catch (error) {
      console.error("Live chat init:", error);
      list.innerHTML = `<p style="margin:auto;color:#b83232">${t("error")}</p>`;
    }
  }

  function scan() {
    const panel = document.getElementById("wedding-live-panel");
    if (panel) mount(panel);
    else if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }

  const observer = new MutationObserver(() => setTimeout(scan, 30));
  document.addEventListener("DOMContentLoaded", () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.addEventListener("hashchange", () => setTimeout(scan, 50));
})();