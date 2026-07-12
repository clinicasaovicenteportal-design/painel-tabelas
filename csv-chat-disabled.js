const VERSION = "7.5.6";

function injectStyles() {
  if (document.getElementById("csv-chat-disabled-style")) return;

  const style = document.createElement("style");
  style.id = "csv-chat-disabled-style";
  style.textContent = `
    #chat-fab,
    #chat-window,
    .chat-fab,
    .chat-window,
    [data-chat-widget],
    [data-ai-assistant] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function disableChat() {
  [
    document.getElementById("chat-fab"),
    document.getElementById("chat-window")
  ].filter(Boolean).forEach((element) => {
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
    element.style.setProperty("display", "none", "important");
  });

  window.toggleChat = () => false;
  window.sendChat = () => false;

  const avatarField = document.querySelector(
    '#csv-admin-settings-form [name="chatAvatar"]'
  );
  avatarField?.closest("label")?.remove();

  const legacyField = document.getElementById("tab-input-chat-logo");
  legacyField?.closest(".settings-group")?.querySelectorAll(
    'label, input[id="tab-input-chat-logo"]'
  ).forEach((element) => element.remove());

  document.querySelectorAll(".csv-admin-settings-card-title p").forEach((paragraph) => {
    if (/chatbot/i.test(paragraph.textContent || "")) {
      paragraph.textContent = "Configurações usadas em pastas, filtros e cadastros internos.";
    }
  });
}

function init() {
  injectStyles();
  disableChat();

  const observer = new MutationObserver(() => {
    disableChat();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log(`CSV Chat removido ${VERSION}.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

