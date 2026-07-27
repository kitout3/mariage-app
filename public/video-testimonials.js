(() => {
  const LANG_KEY = "mariage-lang";
  const EVENT_ID = "mariage-2026";
  const MAX_BYTES = 150 * 1024 * 1024;
  const MAX_SECONDS = 90;
  const I18N = {
    fr: {
      cardTitle: "Laisser un témoignage vidéo", cardDesc: "Enregistrez un message pour Huyen & Quentin",
      title: "Témoignage vidéo", subtitle: "Laissez un souvenir vidéo à Huyen & Quentin",
      record: "Enregistrer une vidéo", choose: "Choisir une vidéo", firstName: "Votre prénom (optionnel)", message: "Un petit mot (optionnel)",
      send: "Envoyer la vidéo", cancel: "Annuler", back: "Retour à l’accueil", uploading: "Envoi en cours…", success: "Merci ! Votre témoignage a bien été envoyé.",
      tooLarge: "La vidéo dépasse 150 Mo.", tooLong: "La vidéo dépasse 90 secondes.", invalid: "Choisissez une vidéo MP4, MOV ou WebM.", error: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
      adminTitle: "Témoignages vidéo", pending: "En attente", approved: "Validée", rejected: "Refusée", approve: "Valider", reject: "Refuser", remove: "Supprimer", download: "Télécharger", play: "Lire", empty: "Aucun témoignage vidéo.",
      tvTitle: "Diffuser les témoignages", tvStart: "Lancer les vidéos validées", tvStop: "Arrêter la diffusion", noApproved: "Aucune vidéo validée à diffuser.", moderationNote: "Les vidéos sont limitées à 90 secondes et 150 Mo. Elles doivent être validées avant diffusion."
    },
    en: {
      cardTitle: "Leave a video message", cardDesc: "Record a message for Huyen & Quentin",
      title: "Video message", subtitle: "Leave a video memory for Huyen & Quentin",
      record: "Record a video", choose: "Choose a video", firstName: "Your first name (optional)", message: "A short message (optional)",
      send: "Upload video", cancel: "Cancel", back: "Back to home", uploading: "Uploading…", success: "Thank you! Your video has been uploaded.",
      tooLarge: "The video is larger than 150 MB.", tooLong: "The video is longer than 90 seconds.", invalid: "Choose an MP4, MOV or WebM video.", error: "Upload failed. Check your connection and try again.",
      adminTitle: "Video messages", pending: "Pending", approved: "Approved", rejected: "Rejected", approve: "Approve", reject: "Reject", remove: "Delete", download: "Download", play: "Play", empty: "No video messages.",
      tvTitle: "Play video messages", tvStart: "Play approved videos", tvStop: "Stop playback", noApproved: "No approved videos to play.", moderationNote: "Videos are limited to 90 seconds and 150 MB. They must be approved before playback."
    },
    vi: {
      cardTitle: "Gửi lời chúc bằng video", cardDesc: "Quay lời nhắn dành cho Huyen & Quentin",
      title: "Lời chúc bằng video", subtitle: "Gửi một kỷ niệm bằng video tới Huyen & Quentin",
      record: "Quay video", choose: "Chọn video", firstName: "Tên của bạn (không bắt buộc)", message: "Lời nhắn ngắn (không bắt buộc)",
      send: "Gửi video", cancel: "Hủy", back: "Về trang chủ", uploading: "Đang tải lên…", success: "Cảm ơn! Video của bạn đã được gửi.",
      tooLarge: "Video vượt quá 150 MB.", tooLong: "Video dài hơn 90 giây.", invalid: "Hãy chọn video MP4, MOV hoặc WebM.", error: "Không thể tải lên. Hãy kiểm tra kết nối và thử lại.",
      adminTitle: "Lời chúc bằng video", pending: "Đang chờ", approved: "Đã duyệt", rejected: "Đã từ chối", approve: "Duyệt", reject: "Từ chối", remove: "Xóa", download: "Tải xuống", play: "Phát", empty: "Chưa có video.",
      tvTitle: "Phát lời chúc video", tvStart: "Phát các video đã duyệt", tvStop: "Dừng phát", noApproved: "Chưa có video đã duyệt để phát.", moderationNote: "Video giới hạn 90 giây và 150 MB. Video phải được duyệt trước khi phát."
    }
  };

  const lang = () => I18N[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : "fr";
  const t = key => I18N[lang()][key] || I18N.fr[key] || key;
  const css = `
    .vt-card{background:#fffdf9;border:1.5px solid #f5ddd4;border-radius:18px;padding:1.5rem 1.25rem;text-align:left;box-shadow:0 3px 16px rgba(92,42,30,.12);cursor:pointer;transition:.2s}
    .vt-card:hover{transform:translateY(-1px);filter:brightness(1.02)}
    .vt-overlay{position:fixed;inset:0;z-index:2147483645;background:linear-gradient(160deg,#fdf8f4,#f5ddd4);overflow:auto;padding:24px 16px;font-family:Jost,Arial,sans-serif;color:#3d2010}
    .vt-shell{max-width:620px;margin:0 auto}.vt-panel{background:#fffdf9;border-radius:22px;padding:22px;box-shadow:0 6px 30px rgba(92,42,30,.16)}
    .vt-btn{border:0;border-radius:999px;padding:12px 18px;cursor:pointer;font-weight:600}.vt-primary{background:linear-gradient(135deg,#c97a6a,#5c2a1e);color:#fff}.vt-secondary{background:#f5ddd4;color:#5c2a1e}
    .vt-input{width:100%;padding:12px 14px;border:1.5px solid #f5ddd4;border-radius:12px;background:#fdf8f4;font:inherit}.vt-grid{display:grid;gap:12px}.vt-progress{height:10px;border-radius:999px;background:#f5ddd4;overflow:hidden}.vt-progress>div{height:100%;background:#5c2a1e;transition:width .2s}
    .vt-admin{margin-top:16px;background:#fffdf9;border-radius:18px;padding:18px;box-shadow:0 2px 12px rgba(92,42,30,.12)}.vt-item{border:1px solid #f5ddd4;border-radius:14px;padding:12px;display:grid;gap:9px;margin-top:10px}.vt-actions{display:flex;gap:7px;flex-wrap:wrap}.vt-mini{border:0;border-radius:999px;padding:7px 11px;cursor:pointer}
    .vt-tv{position:fixed;inset:0;z-index:2147483647;background:#000;display:flex;align-items:center;justify-content:center}.vt-tv video{width:100%;height:100%;object-fit:contain}.vt-close{position:fixed;top:16px;right:16px;z-index:2;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:10px 15px;cursor:pointer}
  `;
  if (!document.getElementById("vt-style")) { const s=document.createElement("style"); s.id="vt-style"; s.textContent=css; document.head.appendChild(s); }

  let firebasePromise;
  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      if (!cfg.apiKey || !cfg.projectId || !cfg.storageBucket) throw new Error("Firebase config missing");
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

  function getDuration(file) {
    return new Promise((resolve, reject) => {
      const v=document.createElement("video"); const url=URL.createObjectURL(file); v.preload="metadata";
      v.onloadedmetadata=()=>{ const d=v.duration; URL.revokeObjectURL(url); resolve(d); };
      v.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error("metadata")); }; v.src=url;
    });
  }

  async function uploadVideo(file, author, message, onProgress) {
    const { db, storage, fs, st } = await firebase();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const ext=(file.name.split(".").pop()||"mp4").replace(/[^a-z0-9]/gi,"").toLowerCase();
    const path=`events/${EVENT_ID}/videos/${id}.${ext}`;
    const task=st.uploadBytesResumable(st.ref(storage,path),file,{contentType:file.type,customMetadata:{eventId:EVENT_ID}});
    const snap=await new Promise((resolve,reject)=>task.on("state_changed",s=>onProgress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,()=>resolve(task.snapshot)));
    const url=await st.getDownloadURL(snap.ref);
    const doc=await fs.addDoc(fs.collection(db,"videoTestimonials"),{eventId:EVENT_ID,url,path,author:author||null,message:message||null,duration:Math.round(await getDuration(file)),size:file.size,mimeType:file.type,status:"pending",createdAt:fs.serverTimestamp(),selectedForTv:false});
    return {id:doc.id,url};
  }

  async function listVideos() {
    const { db, fs }=await firebase();
    const q=fs.query(fs.collection(db,"videoTestimonials"),fs.orderBy("createdAt","desc"));
    const snap=await fs.getDocs(q); return snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  async function updateVideo(id,patch){const {db,fs}=await firebase();await fs.updateDoc(fs.doc(db,"videoTestimonials",id),patch);}
  async function deleteVideo(item){const {db,storage,fs,st}=await firebase();if(item.path){try{await st.deleteObject(st.ref(storage,item.path));}catch{}}await fs.deleteDoc(fs.doc(db,"videoTestimonials",item.id));}

  function closeOverlay(){document.getElementById("vt-overlay")?.remove();history.replaceState(null,"",location.pathname+location.search);}
  function openGuest() {
    closeOverlay(); history.replaceState(null,"",`${location.pathname}${location.search}#video`);
    const el=document.createElement("section"); el.id="vt-overlay"; el.className="vt-overlay";
    el.innerHTML=`<div class="vt-shell"><button class="vt-btn vt-secondary" data-close>← ${t("back")}</button><div style="height:14px"></div><div class="vt-panel vt-grid"><div style="text-align:center"><div style="font-size:42px">🎬</div><h1 style="font:300 2.2rem 'Cormorant Garamond',serif;color:#5c2a1e">${t("title")}</h1><p style="color:#9e7060">${t("subtitle")}</p></div><input class="vt-input" data-name placeholder="${t("firstName")}"><textarea class="vt-input" data-message rows="3" placeholder="${t("message")}"></textarea><input data-file type="file" accept="video/mp4,video/quicktime,video/webm" capture="user" hidden><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="vt-btn vt-primary" data-record>🎥 ${t("record")}</button><button class="vt-btn vt-secondary" data-choose>📁 ${t("choose")}</button></div><video data-preview controls playsinline style="display:none;width:100%;max-height:360px;border-radius:15px;background:#000"></video><p data-info style="font-size:.8rem;color:#9e7060">${t("moderationNote")}</p><div class="vt-progress" style="display:none"><div style="width:0"></div></div><button class="vt-btn vt-primary" data-send disabled>⬆️ ${t("send")}</button><p data-status style="min-height:22px;text-align:center"></p></div></div>`;
    document.body.appendChild(el);
    const fileInput=el.querySelector("[data-file]"), preview=el.querySelector("[data-preview]"), send=el.querySelector("[data-send]"), status=el.querySelector("[data-status]"), bar=el.querySelector(".vt-progress"), fill=bar.firstElementChild;
    let file=null;
    const pick=async f=>{status.textContent="";if(!f)return;if(!["video/mp4","video/quicktime","video/webm"].includes(f.type)){status.textContent=t("invalid");return;}if(f.size>MAX_BYTES){status.textContent=t("tooLarge");return;}try{const d=await getDuration(f);if(d>MAX_SECONDS+0.5){status.textContent=t("tooLong");return;}file=f;preview.src=URL.createObjectURL(f);preview.style.display="block";send.disabled=false;}catch{status.textContent=t("invalid");}};
    el.querySelector("[data-close]").onclick=closeOverlay; el.querySelector("[data-record]").onclick=()=>{fileInput.setAttribute("capture","user");fileInput.click();}; el.querySelector("[data-choose]").onclick=()=>{fileInput.removeAttribute("capture");fileInput.click();}; fileInput.onchange=e=>pick(e.target.files?.[0]);
    send.onclick=async()=>{if(!file)return;send.disabled=true;bar.style.display="block";status.textContent=t("uploading");try{await uploadVideo(file,el.querySelector("[data-name]").value.trim(),el.querySelector("[data-message]").value.trim(),p=>{fill.style.width=`${p}%`;status.textContent=`${t("uploading")} ${p}%`;});status.textContent=t("success");preview.removeAttribute("src");setTimeout(closeOverlay,1800);}catch(e){console.error(e);status.textContent=t("error");send.disabled=false;}};
  }

  async function renderAdmin(container) {
    if (container.dataset.vtReady) return; container.dataset.vtReady="1";
    const box=document.createElement("div"); box.className="vt-admin"; box.innerHTML=`<h3 style="font:600 1.35rem 'Cormorant Garamond',serif;color:#5c2a1e">🎬 ${t("adminTitle")}</h3><p style="font-size:.8rem;color:#9e7060;margin-top:4px">${t("moderationNote")}</p><div data-list style="margin-top:10px">${t("uploading")}</div>`; container.appendChild(box);
    const list=box.querySelector("[data-list]");
    const refresh=async()=>{try{const items=await listVideos();list.innerHTML=items.length?"":`<p>${t("empty")}</p>`;items.forEach(item=>{const row=document.createElement("div");row.className="vt-item";const statusLabel=t(item.status||"pending");row.innerHTML=`<video controls preload="metadata" src="${item.url}" style="width:100%;max-height:230px;border-radius:10px;background:#000"></video><div><strong>${item.author||"—"}</strong> · ${Math.round(item.duration||0)} s · ${Math.round((item.size||0)/1048576)} Mo</div>${item.message?`<p>${item.message.replace(/[<>]/g,"")}</p>`:""}<div style="font-size:.78rem;color:#9e7060">${statusLabel}</div><div class="vt-actions"><button class="vt-mini" data-ok style="background:#dff3e4">✓ ${t("approve")}</button><button class="vt-mini" data-no style="background:#fff0d8">✕ ${t("reject")}</button><a class="vt-mini" href="${item.url}" download target="_blank" rel="noopener" style="background:#e9eefb;text-decoration:none;color:#243b66">⬇ ${t("download")}</a><button class="vt-mini" data-del style="background:#f8dddd">🗑 ${t("remove")}</button></div>`;row.querySelector("[data-ok]").onclick=async()=>{await updateVideo(item.id,{status:"approved",selectedForTv:true});refresh();};row.querySelector("[data-no]").onclick=async()=>{await updateVideo(item.id,{status:"rejected",selectedForTv:false});refresh();};row.querySelector("[data-del]").onclick=async()=>{if(confirm(`${t("remove")}?`)){await deleteVideo(item);refresh();}};list.appendChild(row);});}catch(e){console.error(e);list.textContent=t("error");}};refresh();
  }

  async function startTv() {
    let items;try{items=(await listVideos()).filter(v=>v.status==="approved"&&v.url);}catch{return alert(t("error"));}if(!items.length)return alert(t("noApproved"));
    const tv=document.createElement("div");tv.className="vt-tv";tv.id="vt-tv";tv.innerHTML=`<button class="vt-close">✕ ${t("tvStop")}</button><video autoplay controls playsinline></video>`;document.body.appendChild(tv);const video=tv.querySelector("video");let i=0;const play=()=>{video.src=items[i%items.length].url;video.play().catch(()=>{});};video.onended=()=>{i++;play();};tv.querySelector("button").onclick=()=>tv.remove();play();
  }

  function addCard() {
    if(document.getElementById("vt-home-card"))return;
    const admin=[...document.querySelectorAll("button")].find(b=>/Administration|Quản trị/.test(b.textContent));const grid=admin?.parentElement;if(!grid||getComputedStyle(grid).display!=="grid")return;
    const card=document.createElement("button");card.id="vt-home-card";card.className="vt-card";card.innerHTML=`<div style="font-size:28px;margin-bottom:8px">🎬</div><div style="font:1.25rem 'Cormorant Garamond',serif;color:#b83232;margin-bottom:2px">${t("cardTitle")}</div><div style="color:#9e7060;font-size:.82rem">${t("cardDesc")}</div>`;card.onclick=openGuest;grid.insertBefore(card,admin);
  }
  function addAdmin(){const heading=[...document.querySelectorAll("h1,h2,h3")].find(h=>/Administration|Quản trị/.test(h.textContent));if(!heading)return;const root=heading.closest("div")?.parentElement||document.body;renderAdmin(root);}
  function addTvButton(){if(document.getElementById("vt-tv-button"))return;const isTv=location.hash==="#live"||[...document.querySelectorAll("button")].some(b=>/Quitter|Accueil/.test(b.textContent))&&document.querySelector("img");if(!isTv)return;const b=document.createElement("button");b.id="vt-tv-button";b.className="vt-btn vt-primary";b.style.cssText="position:fixed;left:20px;bottom:20px;z-index:2147483644";b.textContent=`🎬 ${t("tvTitle")}`;b.onclick=startTv;document.body.appendChild(b);}
  function refresh(){addCard();if(location.hash==="#admin")addAdmin();if(location.hash==="#live")addTvButton();if(location.hash==="#video"&&!document.getElementById("vt-overlay"))openGuest();}
  document.addEventListener("click",e=>{if(e.target.closest("#wedding-language-switcher"))setTimeout(()=>{document.getElementById("vt-home-card")?.remove();document.querySelectorAll(".vt-admin").forEach(x=>x.remove());document.getElementById("vt-tv-button")?.remove();refresh();},30);});
  const obs=new MutationObserver(()=>setTimeout(refresh,20));document.addEventListener("DOMContentLoaded",()=>{refresh();obs.observe(document.body,{childList:true,subtree:true});});window.addEventListener("load",refresh);setTimeout(refresh,300);
})();