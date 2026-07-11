import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, getDocs,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "6.1.0";
const INTERNAL_DOMAIN = "acesso.csv.app";

const AREAS = [
  ["boletins","Boletins e informativos","ri-megaphone-line"],
  ["corpo-clinico","Corpo clínico","ri-team-line"],
  ["convenios","Convênios","ri-shield-cross-line"],
  ["ultrassom","Ultrassom","ri-pulse-line"],
  ["consultas","Consultas e procedimentos","ri-stethoscope-line"],
  ["pacotes","Pacotes do pronto-socorro","ri-first-aid-kit-line"],
  ["exames-imagem","Exames de imagem","ri-body-scan-line"],
  ["institutos","Tabela Instituto","ri-building-line"],
  ["contatos","Contatos úteis","ri-contacts-book-line"],
  ["remocoes","Remoções","ri-ambulance-line"],
  ["agenda-trabalho","Agenda de trabalho","ri-calendar-event-line"]
];

const app = getApp();
const db = getFirestore(app);
const creatorName = "csv-polish-account-creator";
const creatorApp = getApps().find(x => x.name === creatorName) ||
  initializeApp(app.options, creatorName);
const creatorAuth = getAuth(creatorApp);

const esc = (v="") => String(v).replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const normalize = (v="") => String(v).normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()
  .replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"").slice(0,40);

function currentTheme() {
  return localStorage.getItem("csv_theme") ||
    (matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light");
}

function applyTheme(theme) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem("csv_theme", resolved);
  const b = document.getElementById("csv-polish-theme-toggle");
  if (b) {
    const dark = resolved === "dark";
    b.innerHTML = dark
      ? '<i class="ri-sun-line"></i><span>Modo claro</span>'
      : '<i class="ri-moon-clear-line"></i><span>Modo escuro</span>';
    b.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
  }
}

function ensureThemeToggle() {
  const header = document.querySelector(".top-header");
  if (!header) return;
  let b = document.getElementById("csv-polish-theme-toggle");
  if (!b) {
    b = document.createElement("button");
    b.type = "button";
    b.id = "csv-polish-theme-toggle";
    b.className = "csv-polish-theme-toggle";
    const search = header.querySelector("#search-box");
    search ? header.insertBefore(b,search) : header.appendChild(b);
    b.addEventListener("click",()=>applyTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark"
    ));
  }
  applyTheme(document.documentElement.dataset.theme || currentTheme());
}

function animateTab() {
  const active = [...document.querySelectorAll(".tab-content")]
    .find(t=>getComputedStyle(t).display!=="none" && t.classList.contains("active")) ||
    [...document.querySelectorAll(".tab-content")]
      .find(t=>getComputedStyle(t).display!=="none");
  if (!active) return;
  active.classList.remove("csv-polish-enter");
  void active.offsetWidth;
  active.classList.add("csv-polish-enter");
}

function forceTeam() {
  if (!window.csvPhase2State?.isAdmin) return;
  try {
    window.csv2EnsureTeamManager?.();
    window.csv2RenderTeamManager?.();
  } catch (e) {
    console.warn("Falha ao atualizar equipe:",e);
  }
}

function bindNav() {
  document.querySelectorAll(".sidebar-nav .nav-btn[data-tab]").forEach(b=>{
    if (b.dataset.csvPolishBound) return;
    b.dataset.csvPolishBound="1";
    b.addEventListener("click",()=>{
      setTimeout(animateTab,25);
      if (b.dataset.tab==="colaboradores") {
        [40,280,850].forEach(ms=>setTimeout(forceTeam,ms));
      }
    },true);
  });
}

function permissionsMarkup() {
  return AREAS.map(([id,label,icon])=>`
    <label class="csv-polish-permission">
      <input type="checkbox" name="csv-polish-permission"
        value="${id}" ${id==="boletins"?"checked":""}>
      <i class="${icon}"></i><span>${esc(label)}</span>
    </label>`).join("");
}

function ensureModal() {
  let m=document.getElementById("csv-polish-collaborator-modal");
  if (!m) {
    m=document.createElement("div");
    m.id="csv-polish-collaborator-modal";
    m.className="csv-polish-modal";
    document.body.appendChild(m);
    m.addEventListener("click",e=>{if(e.target===m) closeModal()});
  }
  return m;
}

function closeModal() {
  document.getElementById("csv-polish-collaborator-modal")
    ?.classList.remove("is-open");
}
window.csvPolishCloseCollaborator=closeModal;

async function usernameExists(username) {
  const snap=await getDocs(query(collection(db,"usuarios"),
    where("usuario","==",username)));
  return !snap.empty;
}

async function saveCollaborator(e) {
  e.preventDefault();
  if (!window.csvPhase2State?.isAdmin) return alert("Somente a gestão pode cadastrar.");

  const name=document.getElementById("csv-polish-name")?.value.trim()||"";
  const sector=document.getElementById("csv-polish-sector")?.value.trim()||"";
  const createAccess=document.getElementById("csv-polish-create-access")?.checked;
  const username=normalize(document.getElementById("csv-polish-username")?.value||name);
  const password=document.getElementById("csv-polish-password")?.value||"";
  const active=document.getElementById("csv-polish-active")?.checked!==false;
  const permissions=[...document.querySelectorAll(
    'input[name="csv-polish-permission"]:checked')].map(i=>i.value);
  const message=document.getElementById("csv-polish-form-message");
  const button=document.getElementById("csv-polish-save-collaborator");

  if (!name||!sector) {
    message.textContent="Informe o nome completo e o setor.";
    message.className="csv-polish-form-message error"; return;
  }
  if (createAccess&&(!username||password.length<8||!permissions.length)) {
    message.textContent="Informe usuário, senha de 8 caracteres e ao menos uma área.";
    message.className="csv-polish-form-message error"; return;
  }

  const original=button.innerHTML;
  button.disabled=true;
  button.innerHTML='<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    if (createAccess&&await usernameExists(username))
      throw new Error("Este usuário já está cadastrado.");

    const ref=await addDoc(collection(db,"colaboradores"),{
      "Nome Completo do Colaborador":name,
      "Setor da Clínica":sector,
      ativo:active,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()
    });

    if (createAccess) {
      const email=`${username}@${INTERNAL_DOMAIN}`;
      let credential;
      try {
        credential=await createUserWithEmailAndPassword(creatorAuth,email,password);
      } finally {
        try {await signOut(creatorAuth)} catch (_) {}
      }
      const uid=credential.user.uid;
      await setDoc(doc(db,"usuarios",uid),{
        nome:name,usuario:username,email,setor:sector,ativo:active,
        admin:false,permissoes:permissions,
        criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()
      },{merge:true});
      await setDoc(doc(db,"colaboradores",ref.id),{
        usuarioAuth:username,uidAuth:uid,ativo:active,
        atualizadoEm:serverTimestamp()
      },{merge:true});
    }

    message.textContent=createAccess
      ? `Colaborador e login @${username} criados com sucesso.`
      : "Colaborador cadastrado com sucesso.";
    message.className="csv-polish-form-message success";
    setTimeout(()=>{closeModal();forceTeam()},700);
  } catch (error) {
    console.error(error);
    const known={
      "auth/email-already-in-use":"Este usuário já existe.",
      "auth/weak-password":"A senha é muito fraca.",
      "auth/operation-not-allowed":"Ative login por e-mail e senha no Firebase."
    };
    message.textContent=known[error.code]||error.message||"Não foi possível salvar.";
    message.className="csv-polish-form-message error";
  } finally {
    button.disabled=false;
    button.innerHTML=original;
  }
}

function openModal() {
  const state=window.csvPhase2State;
  if (!state?.isAdmin) return alert("Somente a gestão pode cadastrar.");

  const sectors=[...new Set((state.collaborators||[]).map(i=>
    i.data?.["Setor da Clínica"]||i.data?.setor||"").filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"pt-BR"));

  const m=ensureModal();
  m.innerHTML=`
    <div class="csv-polish-modal-card">
      <header class="csv-polish-modal-head">
        <div>
          <span class="csv2-eyebrow"><i class="ri-user-add-line"></i>Novo cadastro</span>
          <h2>Adicionar colaborador</h2>
          <p>Cadastre a pessoa e, quando necessário, já crie o login individual com as áreas permitidas.</p>
        </div>
        <button type="button" class="csv-polish-close"
          onclick="window.csvPolishCloseCollaborator()">
          <i class="ri-close-line"></i>
        </button>
      </header>

      <form id="csv-polish-collaborator-form" class="csv-polish-form">
        <section class="csv-polish-form-section">
          <div class="csv-polish-form-section-title">
            <i class="ri-user-3-line"></i>Informações do colaborador
          </div>
          <div class="csv-polish-grid">
            <label class="csv-polish-field">
              <span>Nome completo</span>
              <input id="csv-polish-name" required placeholder="Ex.: Maria da Silva">
            </label>
            <label class="csv-polish-field">
              <span>Setor da clínica</span>
              <input id="csv-polish-sector" list="csv-polish-sector-list"
                required placeholder="Ex.: Recepção">
              <datalist id="csv-polish-sector-list">
                ${sectors.map(s=>`<option value="${esc(s)}">`).join("")}
              </datalist>
            </label>
          </div>
        </section>

        <section class="csv-polish-form-section">
          <label class="csv-polish-switch">
            <input type="checkbox" id="csv-polish-create-access" checked>
            <span><strong>Criar login individual agora</strong>
            <small>A pessoa verá somente as áreas selecionadas.</small></span>
          </label>

          <div id="csv-polish-access-fields">
            <div class="csv-polish-grid" style="margin-top:15px">
              <label class="csv-polish-field">
                <span>Usuário de acesso</span>
                <input id="csv-polish-username" placeholder="Ex.: maria.silva">
              </label>
              <label class="csv-polish-field">
                <span>Senha inicial</span>
                <input id="csv-polish-password" type="password" minlength="8"
                  placeholder="Mínimo de 8 caracteres">
              </label>
            </div>

            <div class="csv-polish-form-section-title" style="margin-top:20px">
              <i class="ri-apps-2-line"></i>Áreas permitidas
            </div>

            <label class="csv-polish-switch" style="margin-bottom:10px">
              <input type="checkbox" id="csv-polish-select-all">
              <span><strong>Selecionar todas as áreas</strong>
              <small>Libera todas as áreas operacionais.</small></span>
            </label>

            <div class="csv-polish-permissions">${permissionsMarkup()}</div>

            <label class="csv-polish-switch" style="margin-top:12px">
              <input type="checkbox" id="csv-polish-active" checked>
              <span><strong>Conta ativa</strong>
              <small>Desmarque para cadastrar sem liberar imediatamente.</small></span>
            </label>
          </div>
        </section>

        <div class="csv-polish-form-actions">
          <button type="button" class="csv-polish-button secondary"
            onclick="window.csvPolishCloseCollaborator()">Cancelar</button>
          <button type="submit" id="csv-polish-save-collaborator"
            class="csv-polish-button primary">
            <i class="ri-save-line"></i>Salvar colaborador
          </button>
        </div>
        <div id="csv-polish-form-message" class="csv-polish-form-message"></div>
      </form>
    </div>`;

  m.classList.add("is-open");

  document.getElementById("csv-polish-create-access")
    ?.addEventListener("change",e=>{
      document.getElementById("csv-polish-access-fields").style.display=
        e.target.checked?"block":"none";
    });

  document.getElementById("csv-polish-select-all")
    ?.addEventListener("change",e=>{
      document.querySelectorAll('input[name="csv-polish-permission"]')
        .forEach(i=>i.checked=e.target.checked);
    });

  document.getElementById("csv-polish-name")?.addEventListener("input",e=>{
    const u=document.getElementById("csv-polish-username");
    if (u&&!u.dataset.edited) u.value=normalize(e.target.value);
  });
  document.getElementById("csv-polish-username")?.addEventListener("input",e=>{
    e.target.dataset.edited="1";e.target.value=normalize(e.target.value);
  });
  document.getElementById("csv-polish-collaborator-form")
    ?.addEventListener("submit",saveCollaborator);

  setTimeout(()=>document.getElementById("csv-polish-name")?.focus(),80);
}
window.csvPolishOpenCollaborator=openModal;

function init() {
  applyTheme(currentTheme());
  ensureThemeToggle();
  bindNav();

  const dashboard=document.getElementById("dashboard-screen");
  if (dashboard) {
    new MutationObserver(()=>{
      if (getComputedStyle(dashboard).display!=="none") {
        ensureThemeToggle();bindNav();
        if (window.csvPhase2State?.isAdmin) forceTeam();
      }
    }).observe(dashboard,{attributes:true,attributeFilter:["style","class"]});
  }

  document.getElementById("btn-nav-colaboradores")
    ?.addEventListener("click",()=>[40,350,900].forEach(ms=>setTimeout(forceTeam,ms)),true);

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;ensureThemeToggle();bindNav();
    if (window.csvPhase2State?.isAdmin) forceTeam();
    if (attempts>=20) clearInterval(timer);
  },500);

  console.log(`CSV Polish ${VERSION} carregado.`);
}

if (document.readyState==="loading") {
  document.addEventListener("DOMContentLoaded",init);
} else init();
