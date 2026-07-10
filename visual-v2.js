document.addEventListener("DOMContentLoaded", () => {
  const login = document.getElementById("login-screen");
  const bot = document.getElementById("csv-bot");
  const area = document.querySelector(".csv-bot-area");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const botao = document.getElementById("btn-login");
  const mostrar = document.getElementById("csv-show-password");
  const status = document.getElementById("csv-login-status");
  const transicao = document.getElementById("csv-transition");

  if (!login || !bot) return;

  function estado(nome = "") {
    bot.classList.remove("password", "waiting", "error");
    if (nome) bot.classList.add(nome);
  }

  function loginVisivel() {
    return getComputedStyle(login).display !== "none";
  }

  function conexao() {
    if (!status) return;

    if (navigator.onLine) {
      status.className = "csv-login-status online";
      status.innerHTML = '<i class="ri-wifi-line"></i> Sistema conectado';
    } else {
      status.className = "csv-login-status offline";
      status.innerHTML = '<i class="ri-wifi-off-line"></i> Modo offline disponível';
    }
  }

  conexao();
  window.addEventListener("online", conexao);
  window.addEventListener("offline", conexao);

  if (area) {
    area.addEventListener("pointermove", event => {
      if (bot.classList.contains("password")) return;

      const box = area.getBoundingClientRect();
      const x = Math.max(-6, Math.min(6, (event.clientX - box.left - box.width / 2) / 25));
      const y = Math.max(-4, Math.min(5, (event.clientY - box.top - box.height / 2) / 30));

      bot.style.setProperty("--eye-x", `${x}px`);
      bot.style.setProperty("--eye-y", `${y}px`);
    });

    area.addEventListener("pointerleave", () => {
      bot.style.setProperty("--eye-x", "0px");
      bot.style.setProperty("--eye-y", "0px");
    });
  }

  if (email) {
    email.addEventListener("focus", () => estado(""));
  }

  if (senha) {
    senha.addEventListener("focus", () => {
      estado(senha.type === "password" ? "password" : "");
    });
  }

  if (mostrar && senha) {
    mostrar.addEventListener("click", () => {
      senha.type = senha.type === "password" ? "text" : "password";

      mostrar.innerHTML = senha.type === "password"
        ? '<i class="ri-eye-line"></i>'
        : '<i class="ri-eye-off-line"></i>';

      estado(senha.type === "password" ? "password" : "");
      senha.focus();
    });
  }

  if (botao) {
    botao.addEventListener("click", () => {
      if (!email?.value.trim() || !senha?.value.trim()) return;

      estado("waiting");

      if (status) {
        status.className = "csv-login-status";
        status.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verificando acesso...';
      }

      setTimeout(() => {
        if (loginVisivel() && !botao.disabled) {
          estado("error");

          if (status) {
            status.className = "csv-login-status error";
            status.innerHTML = "Confira o e-mail e a senha";
          }

          setTimeout(() => {
            estado("");
            conexao();
          }, 1800);
        }
      }, 1400);
    }, true);
  }

  const observer = new MutationObserver(() => {
    if (!loginVisivel()) {
      estado("");
      transicao?.classList.add("active");

      setTimeout(() => {
        transicao?.classList.remove("active");
      }, 1200);
    } else {
      conexao();
    }
  });

  observer.observe(login, {
    attributes: true,
    attributeFilter: ["style", "class"]
  });
});
