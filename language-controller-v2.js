(() => {
  const KEY='mariage-lang';
  const groups=[
    ['Envoyer une photo','Upload a photo','Gửi ảnh'],['Partager un souvenir','Share a memory','Chia sẻ kỷ niệm'],
    ['Galerie & réactions','Gallery & reactions','Thư viện ảnh và cảm xúc'],['Voir toutes les photos','View all photos','Xem tất cả ảnh'],
    ['Affichage TV','TV display','Màn hình trình chiếu'],['Diaporama plein écran','Full-screen slideshow','Trình chiếu toàn màn hình'],
    ['Administration','Administration','Quản trị'],['Modérer et exporter','Moderate and export','Kiểm duyệt và xuất dữ liệu'],
    ['Regarder le live','Watch live','Xem trực tiếp'],['Suivre la cérémonie en direct','Watch the ceremony live','Theo dõi lễ cưới trực tiếp'],
    ['Retour à l’accueil','Back to home','Về trang chủ'],['Votre prénom (optionnel)','Your first name (optional)','Tên của bạn (không bắt buộc)'],
    ['Un petit mot (optionnel)','A short message (optional)','Lời nhắn ngắn (không bắt buộc)'],['Choisir une photo','Choose a photo','Chọn ảnh'],
    ['Prendre une photo','Take a photo','Chụp ảnh'],['Envoyer','Send','Gửi'],['Annuler','Cancel','Hủy'],
    ['Galerie vidéos','Video gallery','Thư viện video'],['Regardez les témoignages vidéo validés','Watch approved video messages','Xem các video đã được duyệt'],
    ['Laisser un témoignage vidéo','Leave a video message','Gửi lời chúc bằng video'],['Enregistrez un message pour Huyen & Quentin','Record a message for Huyen & Quentin','Quay lời nhắn dành cho Huyen & Quentin'],
    ['Témoignage vidéo','Video message','Lời chúc bằng video'],['Enregistrer une vidéo','Record a video','Quay video'],
    ['Choisir une vidéo','Choose a video','Chọn video'],['Démarrer l’enregistrement','Start recording','Bắt đầu quay'],
    ['Arrêter l’enregistrement','Stop recording','Dừng quay'],['Recommencer','Record again','Quay lại'],
    ['Envoyer la vidéo','Upload video','Gửi video'],['Les vidéos sont limitées à 5 minutes et 500 Mo. Elles doivent être validées avant diffusion.','Videos are limited to 5 minutes and 500 MB. They must be approved before publication.','Video giới hạn 5 phút và 500 MB. Video phải được duyệt trước khi hiển thị.'],
    ['Paramètres','Settings','Cài đặt'],['Photos','Photos','Ảnh'],['Statistiques','Statistics','Thống kê'],['Export','Export','Xuất dữ liệu'],
    ['Événement','Event','Sự kiện'],['Nom des mariés','Couple’s names','Tên cô dâu và chú rể'],['Date','Date','Ngày'],
    ['Message d’accueil','Welcome message','Lời chào'],['Mot de passe administrateur','Admin password','Mật khẩu quản trị'],
    ['Modération','Moderation','Kiểm duyệt'],['Immédiate','Immediate','Ngay lập tức'],['Modérée','Moderated','Có kiểm duyệt'],
    ['Différée','Delayed','Trì hoãn'],['Sauvegarder','Save','Lưu'],['Diffusion en direct','Live streaming','Phát trực tiếp'],
    ['Lien YouTube du live','YouTube live link','Liên kết YouTube trực tiếp'],['Sauvegarder le lien du live','Save live link','Lưu liên kết trực tiếp'],
    ['Notifications vidéo','Video notifications','Thông báo video'],['Activer les notifications','Enable notifications','Bật thông báo'],
    ['Recevez une notification lorsqu’une nouvelle vidéo attend votre validation.','Receive a notification when a new video is awaiting approval.','Nhận thông báo khi có video mới đang chờ duyệt.']
  ];
  const index=new Map();groups.forEach(g=>g.forEach(v=>index.set(v,g)));
  const langIndex=()=>({fr:0,en:1,vi:2}[localStorage.getItem(KEY)]??0);

  function translate(root=document.body){
    if(!root)return;const target=langIndex();
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{if(n.parentElement?.closest('#wedding-language-switcher'))return;const raw=n.nodeValue;const trimmed=raw.trim();const group=index.get(trimmed);if(group)n.nodeValue=raw.replace(trimmed,group[target]);});
    root.querySelectorAll?.('input,textarea').forEach(el=>{const p=el.placeholder;const group=index.get(p);if(group)el.placeholder=group[target];});
    document.documentElement.lang=['fr','en','vi'][target];
  }

  function rebuildDynamic(){
    const hash=location.hash;
    ['vt-overlay','vtg-overlay','wedding-live-panel','inline-live-panel'].forEach(id=>document.getElementById(id)?.remove());
    window.dispatchEvent(new CustomEvent('wedding-language-change',{detail:{lang:localStorage.getItem(KEY)||'fr'}}));
    window.dispatchEvent(new HashChangeEvent('hashchange',{oldURL:location.href,newURL:location.href}));
    if(hash==='#video'||hash==='#video-gallery'||hash==='#live'){
      history.replaceState(null,'',location.pathname+location.search);
      setTimeout(()=>{history.replaceState(null,'',location.pathname+location.search+hash);window.dispatchEvent(new HashChangeEvent('hashchange'));document.body.appendChild(document.createComment('language-refresh'));},10);
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('#wedding-language-switcher button[data-lang]');if(!b)return;
    localStorage.setItem(KEY,b.dataset.lang);
    setTimeout(()=>{translate();rebuildDynamic();setTimeout(()=>translate(),80);},0);
  },true);

  const obs=new MutationObserver(()=>{clearTimeout(window.__langV2Timer);window.__langV2Timer=setTimeout(()=>translate(),30);});
  document.addEventListener('DOMContentLoaded',()=>{translate();obs.observe(document.body,{childList:true,subtree:true});});
  window.addEventListener('load',translate);
})();