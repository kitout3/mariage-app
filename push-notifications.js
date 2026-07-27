(() => {
  const COLLECTION = "pushSubscriptions";
  const LANG_KEY = "mariage-lang";
  const texts = {
    fr: { title:"Notifications vidéo", desc:"Recevez une notification lorsqu’une nouvelle vidéo attend votre validation.", enable:"Activer les notifications", enabled:"Notifications activées sur cet appareil", denied:"Les notifications sont bloquées dans les réglages du navigateur.", missing:"Ajoutez d’abord la clé VAPID Firebase dans firebase-config.js.", error:"Impossible d’activer les notifications.", ios:"Sur iPhone, ajoutez d’abord le site à l’écran d’accueil, puis ouvrez-le depuis son icône." },
    en: { title:"Video notifications", desc:"Receive a notification when a new video is awaiting approval.", enable:"Enable notifications", enabled:"Notifications enabled on this device", denied:"Notifications are blocked in your browser settings.", missing:"First add the Firebase VAPID key to firebase-config.js.", error:"Unable to enable notifications.", ios:"On iPhone, first add the site to your Home Screen, then open it from its icon." },
    vi: { title:"Thông báo video", desc:"Nhận thông báo khi có video mới đang chờ duyệt.", enable:"Bật thông báo", enabled:"Đã bật thông báo trên thiết bị này", denied:"Thông báo đang bị chặn trong cài đặt trình duyệt.", missing:"Trước tiên hãy thêm khóa VAPID Firebase vào firebase-config.js.", error:"Không thể bật thông báo.", ios:"Trên iPhone, hãy thêm trang web vào Màn hình chính rồi mở từ biểu tượng đó." }
  };
  const lang=()=>texts[localStorage.getItem(LANG_KEY)]?localStorage.getItem(LANG_KEY):"fr";
  const t=k=>texts[lang()][k];

  async function firebase() {
    const cfg=window.__FIREBASE_CONFIG__||{};
    if(!cfg.apiKey||!cfg.projectId||!cfg.messagingSenderId||!cfg.appId) throw new Error("config");
    const [{initializeApp,getApps},fs,msg]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js")
    ]);
    const app=getApps()[0]||initializeApp(cfg);
    return {cfg,db:fs.getFirestore(app),fs,messaging:msg.getMessaging(app),msg};
  }

  async function enable(button,status){
    try{
      if(!("serviceWorker" in navigator)||!("Notification" in window)) throw new Error("unsupported");
      if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.matchMedia("(display-mode: standalone)").matches){status.textContent=t("ios");return;}
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){status.textContent=t("denied");return;}
      const {cfg,db,fs,messaging,msg}=await firebase();
      const vapidKey=cfg.vapidKey||localStorage.getItem("firebase-vapid-key");
      if(!vapidKey){status.textContent=t("missing");return;}
      const registration=await navigator.serviceWorker.register("./firebase-messaging-sw.js",{scope:"./"});
      await navigator.serviceWorker.ready;
      const token=await msg.getToken(messaging,{vapidKey,serviceWorkerRegistration:registration});
      if(!token) throw new Error("token");
      await fs.setDoc(fs.doc(db,COLLECTION,token),{token,eventId:"mariage-2026",enabled:true,platform:navigator.userAgent,updatedAt:fs.serverTimestamp()},{merge:true});
      localStorage.setItem("video-push-enabled","1");
      button.disabled=true;button.textContent="✓ "+t("enabled");status.textContent="";
    }catch(e){console.error(e);status.textContent=t("error");}
  }

  function inject(){
    if(document.getElementById("push-video-settings"))return;
    const heading=[...document.querySelectorAll("h1,h2,h3")].find(x=>/Paramètres|Settings|Cài đặt/.test(x.textContent));
    if(!heading)return;
    const save=[...document.querySelectorAll("button")].find(x=>/Sauvegarder|Save|Lưu/.test(x.textContent));
    const parent=save?.parentElement;if(!parent)return;
    const box=document.createElement("section");box.id="push-video-settings";
    box.style.cssText="background:#fffdf9;border-radius:18px;padding:1.5rem;box-shadow:0 2px 10px rgba(92,42,30,.12);display:grid;gap:10px";
    const enabled=localStorage.getItem("video-push-enabled")==="1";
    box.innerHTML=`<h3 style="font:600 1.3rem 'Cormorant Garamond',serif;color:#5c2a1e">🔔 ${t("title")}</h3><p style="color:#9e7060;font-size:.84rem">${t("desc")}</p><button type="button" data-enable style="border:0;border-radius:999px;padding:12px 18px;background:#5c2a1e;color:#fff;font-weight:600;cursor:pointer" ${enabled?"disabled":""}>${enabled?"✓ "+t("enabled"):t("enable")}</button><p data-status style="min-height:20px;color:#9e7060;font-size:.78rem"></p>`;
    parent.insertBefore(box,save);
    const button=box.querySelector("[data-enable]"),status=box.querySelector("[data-status]");button.onclick=()=>enable(button,status);
  }
  const observer=new MutationObserver(()=>setTimeout(inject,30));
  document.addEventListener("DOMContentLoaded",()=>{inject();observer.observe(document.body,{childList:true,subtree:true});});
  window.addEventListener("wedding-language-change",()=>{document.getElementById("push-video-settings")?.remove();setTimeout(inject,20);});
})();