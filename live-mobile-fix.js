(() => {
  const STYLE_ID = "wedding-live-mobile-style";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #wedding-live-panel > header {
        box-sizing: border-box;
      }

      @media (max-width: 640px) {
        #wedding-live-panel > header {
          height: 112px !important;
          min-height: 112px !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 138px !important;
          grid-template-rows: 48px 44px !important;
          align-items: center !important;
          gap: 0 8px !important;
          padding: 8px 12px !important;
        }

        #wedding-live-panel > header [data-live-back] {
          position: static !important;
          grid-column: 1 !important;
          grid-row: 1 !important;
          justify-self: start !important;
          max-width: 100% !important;
          padding: 9px 13px !important;
          font-size: 12px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        #wedding-live-panel > header > strong {
          position: static !important;
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          justify-self: center !important;
          transform: none !important;
          max-width: calc(100vw - 24px) !important;
          font-size: 20px !important;
          line-height: 1.1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
      }

      @media (max-width: 380px) {
        #wedding-live-panel > header {
          grid-template-columns: minmax(0, 1fr) 128px !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
        }

        #wedding-live-panel > header [data-live-back] {
          padding: 8px 10px !important;
          font-size: 11px !important;
        }

        #wedding-live-panel > header > strong {
          font-size: 18px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  installStyle();
  document.addEventListener("DOMContentLoaded", installStyle);
})();
