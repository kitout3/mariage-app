(() => {
  const EVENT_ID = "mariage-2026";
  const COLLECTION = "liveChatMessages";

  const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

  function getLang() {
    const value = localStorage.getItem("mariage-lang") || "fr";
    return ["fr", "en", "vi"].includes(value) ? value : "fr";
  }

  const texts = {
    fr: { title: "Discussion en direct", name: "Votre prénom", message: "Écrire un message…", send: "Envoyer", empty: "Soyez le premier à écrire un message.", error: "Le chat ne peut pas être chargé.", sending: "Envoi…" },
    en: { title: "Live chat", name: "Your name", message: "Write a message…", send: "Send", empty: "Be the first to write a message.", error: "The chat could not be loaded.", sending: "Sending…" },
    vi: { title: "Trò chuyện trực tiếp", name: "Tên của bạn", message: "Viết tin nhắn…", send: "Gửi", empty: "Hãy là người đầu tiên gửi tin nhắn.", error: "Không thể tải trò chuyện.", sending: "Đang gửi…" }
  };

  const t = key => texts[getLang()][key];

  function formatTime(timestamp) {
    const date = timestamp?.toDate?.() || new Date();
    const locale = getLang() === "fr" ? "fr-FR" : getLang() === "vi" ? "vi-VN" : "en-GB";
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  async function init() {
    const host = document.getElementById("liveChat");
    if (!host) return;

    host.innerHTML = `
      <div class="chat-head">
        <h2>💬 ${t("title")}</h2>
        <span id="chatCount"></span>
      </div>
      <div id="chatList" class="chat-list"><p class="chat-empty">${t("empty")}</p></div>
      <form id="chatForm" class="chat-form">
        <input id="chatName" maxlength="30" placeholder="${t("name")}" autocomplete="name" />
        <input id="chatMessage" maxlength="300" placeholder="${t("message")}" required autocomplete="off" />
        <button id="chatSend" type="submit">${t("send")}</button>
      </form>`;

    const list = document.getElementById("chatList");
    const count = document.getElementById("chatCount");
    const form = document.getElementById("chatForm");
    const nameInput = document.getElementById("chatName");
    const messageInput = document.getElementById("chatMessage");
    const sendButton = document.getElementById("chatSend");
    nameInput.value = localStorage.getItem("wedding-chat-name") || "";

    try {
      const [{ initializeApp, getApps }, fs] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
      ]);

      const config = window.__FIREBASE_CONFIG__ || {};
      if (!config.apiKey || !config.projectId) throw new Error("Firebase configuration missing");

      const app = getApps()[0] || initializeApp(config);
      const db = fs.getFirestore(app);
      const query = fs.query(
        fs.collection(db, COLLECTION),
        fs.orderBy("createdAt", "asc"),
        fs.limit(300)
      );

      fs.onSnapshot(query, snapshot => {
        const messages = snapshot.docs
          .map(documentSnapshot => documentSnapshot.data())
          .filter(item => item.eventId === EVENT_ID)
          .slice(-150);

        count.textContent = messages.length ? String(messages.length) : "";
        list.innerHTML = "";

        if (!messages.length) {
          list.innerHTML = `<p class="chat-empty">${t("empty")}</p>`;
          return;
        }

        messages.forEach(item => {
          const row = document.createElement("article");
          row.className = "chat-message";
          row.innerHTML = `
            <div class="chat-message-head">
              <strong>${escapeHtml(item.name || "Invité")}</strong>
              <time>${formatTime(item.createdAt)}</time>
            </div>
            <p>${escapeHtml(item.message)}</p>`;
          list.appendChild(row);
        });

        list.scrollTop = list.scrollHeight;
      }, error => {
        console.error("Live chat:", error);
        list.innerHTML = `<p class="chat-error">${t("error")}</p>`;
      });

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const name = nameInput.value.trim().slice(0, 30) || "Invité";
        const message = messageInput.value.trim().slice(0, 300);
        if (!message) return;

        sendButton.disabled = true;
        sendButton.textContent = t("sending");

        try {
          localStorage.setItem("wedding-chat-name", name === "Invité" ? "" : name);
          await fs.addDoc(fs.collection(db, COLLECTION), {
            eventId: EVENT_ID,
            name,
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
      list.innerHTML = `<p class="chat-error">${t("error")}</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();