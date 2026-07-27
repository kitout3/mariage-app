(() => {
  const EVENT_ID = "mariage-2026";
  const MAX_SECONDS = 300;
  const MAX_BYTES = 500 * 1024 * 1024;
  const LANG_KEY = "mariage-lang";

  const TXT = {
    fr: {
      title: "Témoignage vidéo",
      intro: "Enregistrez un message pour Huyen & Quentin",
      name: "Votre prénom (optionnel)",
      message: "Un petit mot (optionnel)",
      start: "Démarrer l’enregistrement",
      stop: "Arrêter l’enregistrement",
      choose: "Choisir une vidéo existante",
      send: "Envoyer la vidéo",
      back: "Retour à l’accueil",
      ready: "Caméra et micro prêts.",
      recording: "Enregistrement en cours",
      processing: "Préparation de la vidéo…",
      uploading: "Envoi en cours…",
      success: "Merci ! Votre vidéo a bien été envoyée.",
      permissions: "Autorisez l’accès à la caméra et au microphone.",
      unsupported: "L’enregistrement intégré n’est pas disponible sur ce navigateur. Utilisez « Choisir une vidéo existante ».",
      tooLong: "La vidéo dépasse 5 minutes.",
      tooLarge: "La vidéo dépasse 500 Mo.",
      invalid: "Choisissez une vidéo MP4, MOV ou WebM.",
      error: "L’envoi a échoué. Vérifiez votre connexion puis réessayez.",
      note: "Durée maximale : 5 minutes. Taille maximale : 500 Mo. Pour un meilleur son, parlez près du téléphone et évitez de couvrir le microphone."
    },
    en: {
      title: "Video message", intro: "Record a message for Huyen & Quentin", name: "Your first name (optional)", message: "A short message (optional)", start: "Start recording", stop: "Stop recording", choose: "Choose an existing video", send: "Upload video", back: "Back to home", ready: "Camera and microphone ready.", recording: "Recording", processing: "Preparing video…", uploading: "Uploading…", success: "Thank you! Your video has been uploaded.", permissions: "Allow access to the camera and microphone.", unsupported: "Built-in recording is not available in this browser. Use “Choose an existing video”.", tooLong: "The video is longer than 5 minutes.", tooLarge: "The video is larger than 500 MB.", invalid: "Choose an MP4, MOV or WebM video.", error: "Upload failed. Check your connection and try again.", note: "Maximum duration: 5 minutes. Maximum size: 500 MB. For better sound, speak close to the phone and do not cover the microphone."
    },
    vi: {
      title: "Lời chúc bằng video", intro: "Quay lời nhắn dành cho Huyen & Quentin", name: "Tên của bạn (không bắt buộc)", message: "Lời nhắn ngắn (không bắt buộc)", start: "Bắt đầu quay", stop: "Dừng quay", choose: "Chọn video có sẵn", send: "Gửi video", back: "Về trang chủ", ready: "Máy ảnh và micrô đã sẵn sàng.", recording: "Đang quay", processing: "Đang chuẩn bị video…", uploading: "Đang tải lên…", success: "Cảm ơn! Video của bạn đã được gửi.", permissions: "Hãy cho phép truy cập máy ảnh và micrô.", unsupported: "Trình duyệt này không hỗ trợ quay trực tiếp. Hãy chọn video có sẵn.", tooLong: "Video dài hơn 5 phút.", tooLarge: "Video vượt quá 500 MB.", invalid: "Hãy chọn video MP4, MOV hoặc WebM.", error: "Không thể tải lên. Hãy kiểm tra kết nối và thử lại.", note: "Thời lượng tối đa: 5 phút. Dung lượng tối đa: 500 MB. Để âm thanh tốt hơn, hãy nói gần điện thoại và không che micrô."
    }
  };

  const lang = () => TXT[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : "fr";
  const t = key => TXT[lang()][key] || TXT.fr[key] || key;
  let firebasePromise;

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      const [{ initializeApp, getApps }, fs, st] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js")
      ]);
      const app = getApps()[0] || initializeApp(cfg);
      return { db: fs.getFirestore(app), storage: st.getStorage(app), fs, st };
    })();
    return firebasePromise;
  }

  function durationOf(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.preload = "metadata";
      video.onloadedmetadata = () => { const d = video.duration; URL.revokeObjectURL(url); resolve(d); };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("metadata")); };
      video.src = url;
    });
  }

  async function upload(file, author, message, progress) {
    const { db, storage, fs, st } = await firebase();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = (file.name?.split(".").pop() || (file.type.includes("mp4") ? "mp4" : "webm")).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const path = `events/${EVENT_ID}/videos/${id}.${ext}`;
    const task = st.uploadBytesResumable(st.ref(storage, path), file, { contentType: file.type || "video/webm", customMetadata: { eventId: EVENT_ID } });
    const snap = await new Promise((resolve, reject) => task.on("state_changed", s => progress(Math.round(s.bytesTransferred / s.totalBytes * 100)), reject, () => resolve(task.snapshot)));
    const url = await st.getDownloadURL(snap.ref);
    const duration = Math.round(await durationOf(file));
    await fs.addDoc(fs.collection(db, "videoTestimonials"), { eventId: EVENT_ID, url, path, author: author || null, message: message || null, duration, size: file.size, mimeType: file.type, status: "pending", createdAt: fs.serverTimestamp(), selectedForTv: false });
  }

  function close(stream) {
    stream?.getTracks().forEach(track => track.stop());
    document.getElementById("vt-enhanced-overlay")?.remove();
    history.replaceState(null, "", location.pathname + location.search);
  }

  async function openEnhanced(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    document.getElementById("vt-overlay")?.remove();
    close();
    history.replaceState(null, "", `${location.pathname}${location.search}#video`);

    const overlay = document.createElement("section");
    overlay.id = "vt-enhanced-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:linear-gradient(160deg,#fdf8f4,#f5ddd4);overflow:auto;padding:24px 16px;font-family:Jost,Arial,sans-serif;color:#3d2010";
    overlay.innerHTML = `<div style="max-width:640px;margin:auto"><button data-back style="border:0;border-radius:999px;padding:12px 18px;background:#f5ddd4;color:#5c2a1e;font-weight:600">← ${t("back")}</button><div style="height:14px"></div><div style="background:#fffdf9;border-radius:22px;padding:22px;box-shadow:0 6px 30px rgba(92,42,30,.16);display:grid;gap:12px"><div style="text-align:center"><div style="font-size:42px">🎬</div><h1 style="font:300 2.2rem 'Cormorant Garamond',serif;color:#5c2a1e;margin:.3rem">${t("title")}</h1><p style="color:#9e7060">${t("intro")}</p></div><input data-name placeholder="${t("name")}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #f5ddd4;border-radius:12px"><textarea data-message rows="3" placeholder="${t("message")}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #f5ddd4;border-radius:12px"></textarea><video data-preview playsinline controls style="width:100%;max-height:420px;border-radius:15px;background:#000"></video><input data-file type="file" accept="video/mp4,video/quicktime,video/webm" hidden><div style="display:flex;gap:10px;flex-wrap:wrap"><button data-start style="border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#c97a6a,#5c2a1e);color:#fff;font-weight:600">🎥 ${t("start")}</button><button data-stop disabled style="border:0;border-radius:999px;padding:12px 18px;background:#f5ddd4;color:#5c2a1e;font-weight:600">⏹ ${t("stop")}</button><button data-choose style="border:0;border-radius:999px;padding:12px 18px;background:#f5ddd4;color:#5c2a1e;font-weight:600">📁 ${t("choose")}</button></div><p style="font-size:.82rem;color:#9e7060;margin:0">${t("note")}</p><div data-progress style="height:10px;border-radius:999px;background:#f5ddd4;overflow:hidden;display:none"><div style="height:100%;width:0;background:#5c2a1e"></div></div><button data-send disabled style="border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#c97a6a,#5c2a1e);color:#fff;font-weight:600">⬆️ ${t("send")}</button><p data-status style="text-align:center;min-height:22px"></p></div></div>`;
    document.body.appendChild(overlay);

    const preview = overlay.querySelector("[data-preview]");
    const status = overlay.querySelector("[data-status]");
    const start = overlay.querySelector("[data-start]");
    const stop = overlay.querySelector("[data-stop]");
    const send = overlay.querySelector("[data-send]");
    const fileInput = overlay.querySelector("[data-file]");
    const progress = overlay.querySelector("[data-progress]");
    const fill = progress.firstElementChild;
    let stream = null;
    let recorder = null;
    let chunks = [];
    let file = null;
    let timer = null;
    let startedAt = 0;

    const selectFile = async chosen => {
      if (!chosen) return;
      if (chosen.size > MAX_BYTES) { status.textContent = t("tooLarge"); return; }
      try {
        const duration = await durationOf(chosen);
        if (duration > MAX_SECONDS + 1) { status.textContent = t("tooLong"); return; }
      } catch { status.textContent = t("invalid"); return; }
      file = chosen;
      preview.srcObject = null;
      preview.src = URL.createObjectURL(chosen);
      preview.muted = false;
      send.disabled = false;
      status.textContent = "";
    };

    overlay.querySelector("[data-back]").onclick = () => close(stream);
    overlay.querySelector("[data-choose]").onclick = () => fileInput.click();
    fileInput.onchange = e => selectFile(e.target.files?.[0]);

    start.onclick = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { status.textContent = t("unsupported"); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }
        });
        preview.src = "";
        preview.srcObject = stream;
        preview.muted = true;
        await preview.play();
        const preferred = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
        recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 } : undefined);
        chunks = [];
        recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        recorder.onstop = async () => {
          clearInterval(timer);
          status.textContent = t("processing");
          const type = recorder.mimeType || "video/webm";
          const blob = new Blob(chunks, { type });
          const ext = type.includes("mp4") ? "mp4" : "webm";
          const recorded = new File([blob], `temoignage-${Date.now()}.${ext}`, { type });
          stream?.getTracks().forEach(track => track.stop());
          stream = null;
          start.disabled = false;
          stop.disabled = true;
          await selectFile(recorded);
        };
        recorder.start(1000);
        startedAt = Date.now();
        start.disabled = true;
        stop.disabled = false;
        status.textContent = `${t("recording")} 0:00 / 5:00`;
        timer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const min = Math.floor(elapsed / 60);
          const sec = String(elapsed % 60).padStart(2, "0");
          status.textContent = `${t("recording")} ${min}:${sec} / 5:00`;
          if (elapsed >= MAX_SECONDS && recorder?.state === "recording") recorder.stop();
        }, 500);
      } catch (error) {
        console.error(error);
        status.textContent = t("permissions");
      }
    };

    stop.onclick = () => { if (recorder?.state === "recording") recorder.stop(); };
    send.onclick = async () => {
      if (!file) return;
      send.disabled = true;
      progress.style.display = "block";
      status.textContent = t("uploading");
      try {
        await upload(file, overlay.querySelector("[data-name]").value.trim(), overlay.querySelector("[data-message]").value.trim(), value => { fill.style.width = `${value}%`; status.textContent = `${t("uploading")} ${value}%`; });
        status.textContent = t("success");
        setTimeout(() => close(stream), 1800);
      } catch (error) {
        console.error(error);
        status.textContent = t("error");
        send.disabled = false;
      }
    };
  }

  function patchCard() {
    const card = document.getElementById("vt-home-card");
    if (!card || card.dataset.enhancedCapture === "1") return;
    card.dataset.enhancedCapture = "1";
    card.onclick = openEnhanced;
  }

  const observer = new MutationObserver(() => setTimeout(patchCard, 10));
  document.addEventListener("DOMContentLoaded", () => { patchCard(); observer.observe(document.body, { childList: true, subtree: true }); });
  window.addEventListener("load", patchCard);
  setTimeout(patchCard, 500);
})();