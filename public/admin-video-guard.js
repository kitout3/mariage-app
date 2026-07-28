(() => {
  const isAdminAuthenticated = () =>
    [...document.querySelectorAll("button")].some(button =>
      /^(Déco\.|Déconnexion|Logout|Đăng xuất)$/i.test(button.textContent.trim())
    );

  const protectVideoModeration = () => {
    const authenticated = location.hash === "#admin" && isAdminAuthenticated();

    document.querySelectorAll(".vt-admin").forEach(panel => {
      panel.style.display = authenticated ? "block" : "none";
      panel.setAttribute("aria-hidden", authenticated ? "false" : "true");
    });
  };

  const observer = new MutationObserver(protectVideoModeration);

  document.addEventListener("DOMContentLoaded", () => {
    protectVideoModeration();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.addEventListener("hashchange", protectVideoModeration);
  window.addEventListener("load", protectVideoModeration);
})();
