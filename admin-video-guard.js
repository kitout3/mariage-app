(() => {
  const isAdminAuthenticated = () =>
    [...document.querySelectorAll("button")].some(button =>
      /^(Déco\.|Déconnexion|Logout|Đăng xuất)$/i.test(button.textContent.trim())
    );

  const protectVideoModeration = () => {
    const authenticated = isAdminAuthenticated();

    document.querySelectorAll(".vt-admin").forEach(panel => {
      panel.style.display = authenticated ? "block" : "none";
      panel.setAttribute("aria-hidden", authenticated ? "false" : "true");
    });
  };

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(protectVideoModeration);
  });

  document.addEventListener("DOMContentLoaded", () => {
    protectVideoModeration();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });

  document.addEventListener("click", () => {
    setTimeout(protectVideoModeration, 50);
  });

  window.addEventListener("hashchange", protectVideoModeration);
  window.addEventListener("load", protectVideoModeration);
})();
