// ==========================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ==========================================
console.log('APP NOVO 3.5.2 CARREGADO');
const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor da Clínica', 'PIN de Acesso (Treinamentos)'] },

    'treinamentos': {
        titulo: 'Material de Ensino',
        campos: ['Título da Atividade', 'Pasta / Módulo', 'Tipo (Vídeo, PDF, Tarefa, Prova)', 'Link do Material (Se houver)', 'Colaborador Específico (Opcional)', 'Para quais Setores?', 'Pontos Valendo', 'Modo de Controle', 'Permite Pausa?', 'Limite de Infrações', 'Regra ao Sair', 'Configuração da Avaliação'],
        campoAgrupador: 'Pasta / Módulo',
        icone: 'ri-book-read-fill'
    },

    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA', 'Exibir Logo do Convenio', 'Link da Foto do Profissional'], campoAgrupador: 'Especialidade', icone: 'ri-team-fill' },
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Aceita o Servico?', 'Observações'], campoAgrupador: 'Convênio', icone: 'ri-shield-cross-fill' },
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, setDoc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVphiwmF-SBFyYYkjV-QvTvSFIigzIsoc",
    authDomain: "painel-tabelas.firebaseapp.com",
    projectId: "painel-tabelas",
    storageBucket: "painel-tabelas.firebasestorage.app",
    messagingSenderId: "189251122569",
    appId: "1:189251122569:web:2902e8c47235d826af9d58"
};

const app = initializeApp(firebaseConfig);
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (firestoreCacheError) {
    console.warn('Não foi possível ativar o cache persistente do Firestore. Seguindo com cache em memória.', firestoreCacheError);
    db = initializeFirestore(app, {});
}
const auth = getAuth(app);

window.db = db; window.updateDoc = updateDoc; window.doc = doc; window.arrayUnion = arrayUnion; window.arrayRemove = arrayRemove; window.addDoc = addDoc; window.collection = collection; window.deleteDoc = deleteDoc; window.onSnapshot = onSnapshot; window.setDoc = setDoc; window.getDoc = getDoc; window.runTransaction = runTransaction;

let isAdmin = false; let abaAtual = 'home'; let emailLogado = "";
const EMAILS_ABAS_RESTRITAS = ['gerencia@clinica.com', 'marketing@clinica.com', 'gestao@clinica.com'];

let listaColaboradoresGlobal = []; let locaisGlobais = []; let setoresGlobais = []; let especialidadesGlobais = []; let motivosGlobais = []; let imagemPadraoPastas = "";

window.todosBoletinsData = []; window.todosPrivadosData = []; window.todosTreinamentosData = [];
window.todosPesquisasRH = []; window.todosRespostasRH = [];
window.todosPerfilAvaliacoes = []; window.todosRespostasPerfil = [];
window.rhFiltroAtual = { setor: '', colaborador: '' };
window.rhPerfilRadarChart = null;

window.dadosGlobaisAbas = {}; window.todosOsDadosDoSistema = {}; window.dadosBoletins = {};
window.pastaBoletimAtual = null; window.pastaPrivadoAtual = null; window.alunoLogado = null;

window.corStatusPendente = "#e53e3e"; window.corStatusConcluido = "#38a169";

window.safeParseJSON = function(raw, fallback = null) {
    if (raw === undefined || raw === null || raw === '' || raw === 'undefined' || raw === 'null') return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch(e) { return fallback; }
};
window.escapeHTML = function(value = '') { return String(value).replace(/[&<>"']/g, chr => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[chr])); };
window.extrairNomeRegistro = function(registro = '') { return String(registro).split(' (')[0].trim(); };

window.confirmarAssinaturaLeitura = async function(docId, colecao) {
    try {
        const inputLeitor = document.getElementById(`leitor-${docId}`);
        const nomeLeitor = inputLeitor ? String(inputLeitor.value || '').trim() : '';
        if (!nomeLeitor) { alert('Selecione ou informe o colaborador para registar a leitura.'); return; }

        const base = colecao === 'boletins' ? (window.todosBoletinsData || []) : (window.todosPrivadosData || []);
        const item = base.find(i => i.id === docId);
        if (!item) { alert('Documento não encontrado.'); return; }

        const leituras = Array.isArray(item.data?.leituras) ? item.data.leituras : [];
        const jaExiste = leituras.some(reg => window.extrairNomeRegistro(reg) === nomeLeitor);
        if (jaExiste) { alert('Esta leitura já foi registada.'); return; }

        const registro = `${nomeLeitor} (${new Date().toLocaleString('pt-PT')} | Por: ${emailLogado})`;
        await window.updateDoc(window.doc(window.db, colecao, docId), { leituras: window.arrayUnion(registro) });

        if (colecao === 'boletins') window.renderizarListaBoletins();
        if (colecao === 'boletins-privados') window.renderizarListaPrivados();
        if (typeof window.verificarUrgentesHome === 'function') window.verificarUrgentesHome();
        alert('Assinatura registada com sucesso!');
    } catch (e) { alert('Erro ao registar assinatura: ' + (e?.message || 'falha desconhecida')); }
};

window.removerAssinaturaLeitura = async function(docId, colecao, registroExato) {
    if(!confirm('Tem a certeza de que deseja DESFAZER esta assinatura?')) return;
    try {
        await window.updateDoc(window.doc(window.db, colecao, docId), {
            leituras: window.arrayRemove(registroExato)
        });
        alert('Assinatura desfeita com sucesso!');
        window.abrirListaLeituras(docId, colecao);
        if (colecao === 'boletins') window.renderizarListaBoletins();
        if (colecao === 'boletins-privados') window.renderizarListaPrivados();
        if (typeof window.verificarUrgentesHome === 'function') window.verificarUrgentesHome();
    } catch (e) {
        alert('Erro ao remover assinatura: ' + e.message);
    }
};

window.filtrarPorDataPublicacao = function(lista = [], dtInicio = '', dtFim = '') {
    return (lista || []).filter(item => {
        const d = String(item?.data?.['Data de Publicação'] || '').trim();
        if (!d) return !dtInicio && !dtFim;
        if (dtInicio && d < dtInicio) return false;
        if (dtFim && d > dtFim) return false;
        return true;
    });
};
window.getSetoresRHDisponiveis = function() {
    const setFromConfig = Array.isArray(setoresGlobais) ? setoresGlobais.filter(Boolean) : [];
    const setFromPeople = listaColaboradoresGlobal.map(c => c.setor).filter(Boolean);
    return Array.from(new Set([...setFromConfig, ...setFromPeople])).sort((a,b) => a.localeCompare(b));
};
window.getColaboradoresFiltradosPorSetor = function(setor = '') {
    return listaColaboradoresGlobal.filter(c => !setor || c.setor === setor).sort((a,b) => a.nome.localeCompare(b.nome));
};
window.isTreinamentoAvaliativo = function(itemData = {}) {
    const tipo = String(itemData['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '');
    return tipo.includes('Tarefa') || tipo.includes('Prova');
};
window.obterPublicoPesquisaRH = function(itemData, nomeColaborador = '', setorColaborador = '') {
    const alvoTipo = itemData.alvoTipo || (String(itemData.alvo || '').startsWith('Setor: ') ? 'Setor' : 'Geral');
    const alvoValor = itemData.alvoValor || String(itemData.alvo || '').replace('Setor: ', '').trim();
    if (nomeColaborador) {
        if (alvoTipo === 'Colaborador') return alvoValor === nomeColaborador;
        if (alvoTipo === 'Setor') return alvoValor === setorColaborador;
        return true;
    }
    if (alvoTipo === 'Colaborador') return [alvoValor].filter(Boolean);
    if (alvoTipo === 'Setor') return listaColaboradoresGlobal.filter(c => c.setor === alvoValor).map(c => c.nome);
    return listaColaboradoresGlobal.map(c => c.nome);
};
window.obterAvaliacoesPerfilDisponiveis = function(nomeColaborador = '', setorColaborador = '') {
    return window.todosPerfilAvaliacoes.filter(item => {
        const tipo = item.data.alvoTipo || 'Geral';
        const valor = item.data.alvoValor || '';
        if (nomeColaborador) {
            if (tipo === 'Colaborador') return valor === nomeColaborador;
            if (tipo === 'Setor') return valor === setorColaborador;
            return true;
        }
        return true;
    });
};

let chartBoletinsInst = null; let chartPrivadosInst = null; let chartHomeInst = null; let chartPrivadosGeralInst = null;
const APP_VERSION = '7.9.3';
let loginEmAndamento = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './'
            });

            console.log('Modo offline ativado:', registration.scope);

            registration.addEventListener('updatefound', () => {
                console.log('Nova versão offline encontrada.');
            });
        } catch (error) {
            console.error('Erro ao ativar o modo offline:', error);
        }
    });
}

const paletaGradientes = [
    { valor: "#ffffff", nome: "Branco Padrão", dark: false }, { valor: "#e53e3e", nome: "Vermelho Sólido", dark: true }, { valor: "#3182ce", nome: "Azul Sólido", dark: true },
    { valor: "#38a169", nome: "Verde Sólido", dark: true }, { valor: "#ecc94b", nome: "Amarelo Sólido", dark: false }, { valor: "#805ad5", nome: "Roxo Sólido", dark: true },
    { valor: "linear-gradient(to right, #fc6076, #ff9a44, #ef9d43, #e75516)", nome: "Laranja", dark: true }, { valor: "linear-gradient(to right, #0ba360, #3cba92, #30dd8a, #2bb673)", nome: "Verde Claro", dark: true },
    { valor: "linear-gradient(to right, #6253e1, #852D91, #A3A1FF, #F24645)", nome: "Roxo/Azul", dark: true }, { valor: "linear-gradient(to right, #29323c, #485563, #2b5876, #4e4376)", nome: "Escuro", dark: true },
    { valor: "linear-gradient(to right, #eb3941, #f15e64, #e14e53, #e2373f)", nome: "Vermelho HD", dark: true }
];

window.efetuarLogin = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (loginEmAndamento) return;

    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const btn = document.getElementById('btn-login');
    const email = emailInput ? emailInput.value.trim() : '';
    const senha = senhaInput ? senhaInput.value.trim() : '';

    if (!email || !senha) { alert('Por favor, preencha o e-mail e a senha.'); return; }

    const textoOriginal = btn ? btn.innerHTML : 'Entrar';
    loginEmAndamento = true; document.body.classList.add('is-auth-loading');
    if (btn) { btn.disabled = true; btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> A autenticar..."; }

    try { await signInWithEmailAndPassword(auth, email, senha); } catch (err) { alert('Erro ao entrar: e-mail ou senha incorretos.'); }
    finally {
        loginEmAndamento = false; document.body.classList.remove('is-auth-loading');
        if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
    }
}

const btnLoginInit = document.getElementById('btn-login'); const formLoginInit = document.getElementById('form-login');
if(btnLoginInit) btnLoginInit.onclick = window.efetuarLogin; if(formLoginInit) formLoginInit.onsubmit = window.efetuarLogin;

const btnLogout = document.getElementById('btn-logout'); if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen'); const dashboardScreen = document.getElementById('dashboard-screen');
    const chatFab = document.getElementById('chat-fab');
    if (user) {
        if(loginScreen) loginScreen.style.display = 'none'; if(dashboardScreen) dashboardScreen.style.display = 'flex';
        if(chatFab) chatFab.style.display = 'flex';

        emailLogado = user.email || "";
        isAdmin = emailLogado.includes('@clinica');

        const badge = document.getElementById('user-role-badge');
        if(badge) badge.textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        if(isAdmin) { if(badge) badge.classList.add('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = ''); }
        else { if(badge) badge.classList.remove('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); }
        Object.keys(configuracaoAbas).forEach(idColecao => window.renderizarCards(idColecao));
        window.carregarConfiguracoes(); window.buscarClimaAraucaria();
        if(window.escutarRH) window.escutarRH();
        if (window.atualizarBottomQuickbar) window.atualizarBottomQuickbar();
    } else {
        emailLogado = ""; isAdmin = false;
        if(loginScreen) loginScreen.style.display = 'flex'; if(dashboardScreen) dashboardScreen.style.display = 'none';
        if(chatFab) chatFab.style.display = 'none';
        const chatWindow = document.getElementById('chat-window'); const floatingWindow = document.getElementById('floating-window-persistent');
        if (chatWindow) chatWindow.style.display = 'none';
        if (floatingWindow) { floatingWindow.style.display = 'none'; const iframe = document.getElementById('fw-iframe'); if (iframe) iframe.src = 'about:blank'; }
    }
});

setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-PT'); }, 1000);

window.formatarLinkImagem = function(link) {
    const raw = String(link || '').trim();
    if (!raw || raw.includes('file:///')) return null;
    if (raw.includes('drive.google.com')) { const match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/id=([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`; }
    return raw;
};

window.obterUrlPreviewGoogleDrive = function(link = '') {
    const raw = String(link || '').trim();
    const match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match && match[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : raw;
};

window.obterUrlEmbedMaterial = function(link = '') {
    const raw = String(link || '').trim();
    if (!raw) return '';
    if (/drive\.google\.com/i.test(raw)) return window.obterUrlPreviewGoogleDrive(raw);
    if (/\.(pdf)(\?|#|$)/i.test(raw)) return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(raw)}`;
    if (/\.(doc|docx|ppt|pptx|xls|xlsx)(\?|#|$)/i.test(raw)) return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(raw)}`;
    if (raw.includes('youtube.com/watch?v=')) return raw.replace('watch?v=', 'embed/');
    if (raw.includes('youtu.be/')) return raw.replace('youtu.be/', 'youtube.com/embed/');
    return raw;
};

window.fecharMidiaFlutuante = function() {
    const modal = document.getElementById('modal-media');
    const iframe = document.getElementById('iframe-media');
    if (iframe) iframe.src = 'about:blank';
    if (modal) modal.style.display = 'none';
};

window.abrirMidiaFlutuante = function(url = '', titulo = 'Visualização de Material') {
    const link = String(url || '').trim();
    if (!link || ['#','_','null','undefined','-'].includes(link.toLowerCase())) { alert('Link do material não informado.'); return; }
    const modal = document.getElementById('modal-media');
    const iframe = document.getElementById('iframe-media');
    const titleEl = document.getElementById('modal-media-title');
    if (!modal || !iframe) { window.open(link, '_blank', 'noopener,noreferrer'); return; }
    const embedUrl = window.obterUrlEmbedMaterial(link);
    iframe.src = embedUrl || link;
    if (titleEl) titleEl.textContent = titulo;
    modal.style.display = 'flex';
};
window.abrirMidaFlutuante = window.abrirMidiaFlutuante;

window.imprimirMidiaAtual = function() {
    const iframe = document.getElementById('iframe-media');
    if (!iframe || !iframe.src || iframe.src === 'about:blank') return;
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { window.open(iframe.src, '_blank', 'noopener,noreferrer'); }
};

window.buscarClimaAraucaria = async function() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.59&longitude=-49.41&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&forecast_days=1');
        const data = await response.json(); const clima = data.current_weather || {};
        const wDeg = document.getElementById('weather-deg'); const wDesc = document.getElementById('weather-desc');
        const wIcon = document.getElementById('weather-icon-class'); const wHumidity = document.getElementById('weather-humidity');
        const wWind = document.getElementById('weather-wind'); const wFeel = document.getElementById('weather-feel'); const wStatus = document.getElementById('weather-status');

        if (wDeg) wDeg.textContent = Math.round(clima.temperature ?? 0);
        let desc = "Céu Limpo"; let icon = "ri-sun-fill"; let status = "Agradável";
        if (clima.weathercode >= 1 && clima.weathercode <= 3) { desc = "Parcialmente Nublado"; icon = "ri-sun-cloudy-fill"; status = "Estável"; }
        if (clima.weathercode === 45 || clima.weathercode === 48) { desc = "Neblina"; icon = "ri-foggy-fill"; status = "Neblina"; }
        if (clima.weathercode >= 51 && clima.weathercode <= 67) { desc = "Chuva Leve"; icon = "ri-drizzle-fill"; status = "Úmido"; }
        if (clima.weathercode >= 71 && clima.weathercode <= 77) { desc = "Chuva/Neve"; icon = "ri-snowy-line"; status = "Instável"; }
        if (clima.weathercode >= 80 && clima.weathercode <= 82) { desc = "Pancadas de Chuva"; icon = "ri-showers-fill"; status = "Chuvoso"; }
        if (clima.weathercode >= 95) { desc = "Tempestade"; icon = "ri-thunderstorms-fill"; status = "Atenção"; }

        if (wDesc) wDesc.textContent = desc; if (wIcon) wIcon.className = icon; if (wStatus) wStatus.textContent = status;
        if (wWind) { wWind.textContent = `${Math.round(clima.windspeed ?? 0)} km/h`; }

        const hourlyTimes = data.hourly?.time || []; const humidityValues = data.hourly?.relativehumidity_2m || []; const apparentValues = data.hourly?.apparent_temperature || [];
        const idx = hourlyTimes.indexOf(clima.time);
        if (wHumidity) wHumidity.textContent = idx >= 0 ? `${humidityValues[idx]}%` : '--%';
        if (wFeel) wFeel.textContent = idx >= 0 ? `${Math.round(apparentValues[idx])} °C` : `${Math.round(clima.temperature ?? 0)} °C`;
    } catch (e) {}
};

window.obterPublicoAlvo = function(setoresAlvoString, colabEsp = '') {
    if(colabEsp && colabEsp.trim() !== '' && !colabEsp.includes('Nenhum')) return [colabEsp];
    if (!setoresAlvoString || setoresAlvoString.includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
    const setoresMarcados = String(setoresAlvoString).split(',').map(s => s.trim());
    return listaColaboradoresGlobal.filter(c => setoresMarcados.includes(c.setor)).map(c => c.nome);
};

window.verificarUrgentesHome = function() {
    const area = document.getElementById('area-alertas-home'); if(!area) return; area.innerHTML = '';
    let totalUrgentesPendentes = 0;
    const verificarItens = (lista, ehPrivado) => {
        lista.forEach(item => {
            const data = item.data;
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
            if(!isUrgente) return;
            const publico = ehPrivado ? [data['Para qual Colaborador?']] : window.obterPublicoAlvo(data['Para quais Setores?']);
            const lidosNomes = (data.leituras || []).map(txt => txt.split(' (')[0]);
            if (publico.filter(n => !lidosNomes.includes(n)).length > 0) totalUrgentesPendentes++;
        });
    };
    verificarItens(window.todosBoletinsData, false); if(isAdmin) verificarItens(window.todosPrivadosData, true);
    if(totalUrgentesPendentes > 0) area.innerHTML = `<div class="alerta-urgente-home" onclick="window.irParaAba('boletins')"><i class="ri-alarm-warning-fill"></i><div><strong>Atenção! Informativos Urgentes</strong><span>Existem <b>${totalUrgentesPendentes}</b> pendentes.</span></div></div>`;
};

window.destacarCard = function(docId) {
    setTimeout(() => {
        const card = document.getElementById(`card-${docId}`);
        if(card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('piscar-destaque');
            setTimeout(() => { card.classList.remove('piscar-destaque'); }, 6000);
        }
    }, 500);
};

window.irParaAba = function(aba) { const btn = document.querySelector(`.nav-btn[data-tab='${aba}']`); if(btn) btn.click(); };

window.abrirSubAba = function(subAbaId) {
    const menu = document.getElementById('menu-contatos');
    const sub = document.getElementById('sub-' + subAbaId);
    if (menu) menu.style.display = 'none';
    if (sub) sub.style.display = 'block';
    if (subAbaId === 'ramais') { window.renderizarRamaisAgrupados(); }
};

window.voltarSubAba = function() {
    ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(id => {
        const sub = document.getElementById('sub-' + id);
        if(sub) sub.style.display = 'none';
    });
    const menu = document.getElementById('menu-contatos');
    if(menu) menu.style.display = 'grid';
};

window.renderizarRamaisAgrupados = function() {
    const grid = document.getElementById('grid-ramais-agrupado');
    if(!grid) return;

    const itens = window.todosOsDadosDoSistema['ramais'] || [];
    if (itens.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted);">Nenhum ramal cadastrado no momento.</p>';
        return;
    }

    const grupos = {};
    itens.forEach(item => {
        const local = item.data['Local ou Prédio'] || 'Outros Locais';
        if (!grupos[local]) grupos[local] = [];
        grupos[local].push(item);
    });

    let htmlFinal = '';
    Object.keys(grupos).sort().forEach(local => {
        let htmlGrupo = `
        <div class="ramal-unidade-bloco">
            <div class="ramal-unidade-titulo">
                <div style="background: var(--primary-color); color: white; width: 35px; height: 35px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <i class="ri-building-4-fill" style="font-size: 18px;"></i>
                </div>
                ${local}
            </div>
            <div class="ramal-unidade-grid">`;

        grupos[local].sort((a,b) => String(a.data['Setor'] || '').localeCompare(String(b.data['Setor'] || ''))).forEach(item => {
            htmlGrupo += window.gerarHTMLCard('ramais', item.id, item.data);
        });

        htmlGrupo += `</div></div>`;
        htmlFinal += htmlGrupo;
    });
    grid.innerHTML = htmlFinal;
};

window.abrirPastaGenerica = function(colecao, valorPasta, docIdDestino = null) {
    window[`pasta_${colecao}_Atual`] = valorPasta;
    document.getElementById(`${colecao}-view-folders`).style.display = 'none';
    document.getElementById(`${colecao}-view-list`).style.display = 'block';
    const titleEl = document.getElementById(`titulo-pasta-${colecao}`);
    if (titleEl && configuracaoAbas[colecao]) {
        titleEl.innerHTML = `<i class="${configuracaoAbas[colecao].icone}"></i> Pasta: ${valorPasta}`;
    }
    window.renderizarListaGenerica(colecao);
    if (docIdDestino) window.destacarCard(docIdDestino);

    if (colecao === 'ativos') {
        setTimeout(window.renderizarGraficoAtivos, 300);
    }
};

window.fecharPastaGenerica = function(colecao) {
    window[`pasta_${colecao}_Atual`] = null;
    document.getElementById(`${colecao}-view-folders`).style.display = 'block';
    document.getElementById(`${colecao}-view-list`).style.display = 'none';
    window.renderizarPastasGenericas(colecao);
    if (colecao === 'ativos' && typeof window.renderizarGraficoAtivos === 'function') {
        setTimeout(window.renderizarGraficoAtivos, 120);
    }
};
window.abrirPastaBoletim = function(pasta, docIdDestino = null) { window.pastaBoletimAtual = pasta; document.getElementById('boletins-view-folders').style.display = 'none'; document.getElementById('boletins-view-list').style.display = 'block'; document.getElementById('titulo-pasta-boletins').innerHTML = `<i class="ri-folder-open-line"></i> Setor: ${pasta}`; window.renderizarListaBoletins(); if(docIdDestino) window.destacarCard(docIdDestino); };
window.fecharPastaBoletim = function() { window.pastaBoletimAtual = null; document.getElementById('boletins-view-list').style.display = 'none'; document.getElementById('boletins-view-folders').style.display = 'block'; window.renderizarPastasBoletins(); };
window.abrirPastaPrivado = function(colabNome, docIdDestino = null) { window.pastaPrivadoAtual = colabNome; document.getElementById('privados-view-folders').style.display = 'none'; document.getElementById('privados-view-list').style.display = 'block'; document.getElementById('titulo-pasta-privados').innerHTML = `<i class="ri-folder-user-line"></i> ${colabNome}`; window.renderizarListaPrivados(); if(docIdDestino) window.destacarCard(docIdDestino); };
window.fecharPastaPrivado = function() { window.pastaPrivadoAtual = null; document.getElementById('privados-view-list').style.display = 'none'; document.getElementById('privados-view-folders').style.display = 'block'; window.renderizarPastasPrivados(); };

window.atualizarGrafico = function(canvasId, refInstancia, dados, labelGrafico) {
    const ctx = document.getElementById(canvasId); if(!ctx) return refInstancia;
    const contagemMotivos = {}; dados.forEach(b => { const m = b.data['Motivo'] || 'Sem Motivo'; contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; });
    const paletaGrafico = ['#3182ce', '#38a169', '#ecc94b', '#e53e3e', '#805ad5', '#38b2ac', '#dd6b20', '#ed64a6', '#4a5568', '#667eea', '#48bb78', '#ed8936'];
    if(refInstancia) refInstancia.destroy();
    return new Chart(ctx, { type: 'bar', data: { labels: Object.keys(contagemMotivos), datasets: [{ label: labelGrafico, data: Object.values(contagemMotivos), backgroundColor: paletaGrafico, borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
};

window.renderizarGraficoHome = function() {
    const dtInicio = document.getElementById('home-data-inicio') ? document.getElementById('home-data-inicio').value : ''; const dtFim = document.getElementById('home-data-fim') ? document.getElementById('home-data-fim').value : '';
    let dadosFiltrados = window.todosBoletinsData;
    if (dtInicio || dtFim) dadosFiltrados = window.todosBoletinsData.filter(item => { const d = item.data['Data de Publicação']; if (!d) return false; if (dtInicio && d < dtInicio) return false; if (dtFim && d > dtFim) return false; return true; });
    chartHomeInst = window.atualizarGrafico('chart-home', chartHomeInst, dadosFiltrados, 'Motivos Gerais (Empresa)');
};

window.renderizarGraficoPrivadosGeral = function() {
    const dtInicio = document.getElementById('privado-data-inicio') ? document.getElementById('privado-data-inicio').value : ''; const dtFim = document.getElementById('privado-data-fim') ? document.getElementById('privado-data-fim').value : '';
    let dadosFiltrados = window.todosPrivadosData;
    if (dtInicio || dtFim) dadosFiltrados = window.todosPrivadosData.filter(item => { const d = item.data['Data de Publicação']; if (!d) return false; if (dtInicio && d < dtInicio) return false; if (dtFim && d > dtFim) return false; return true; });
    chartPrivadosGeralInst = window.atualizarGrafico('chart-privados-geral', chartPrivadosGeralInst, dadosFiltrados, 'Motivos Diretos (Equipe)');
};

window.fecharModal = function() { document.getElementById('modal-cadastro').style.display = 'none'; };

window.escapeAttr = function(value = '') {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

window.normalizarPerguntaBuilder = function(q = {}) {
    const tipoBruto = String(q.tipo || 'descritiva').trim().toLowerCase();
    const tipo = (tipoBruto === 'multipla_escolha' || tipoBruto === 'multipla' || tipoBruto === 'objetiva') ? 'multipla' : 'descritiva';
    return {
        tipo,
        p: q.p || q.pergunta || '',
        apoio: q.apoio || q.textoApoio || '',
        mediaUrl: q.mediaUrl || q.linkMidia || '',
        mediaLegenda: q.mediaLegenda || q.legendaMidia || '',
        mediaTipo: q.mediaTipo || 'auto',
        pontosQuestao: q.pontosQuestao || q.pontos || '',
        ops: Array.isArray(q.ops) ? q.ops : (Array.isArray(q.opcoes) ? q.opcoes : ['', '', '', '']),
        correta: q.correta !== undefined ? String(q.correta) : (q.respostaCorreta !== undefined ? String(q.respostaCorreta) : '0')
    };
};

window.decodificarConfigAvaliacao = function(config = '[]') {
    const bruto = typeof config === 'string' ? config : JSON.stringify(config || []);
    return bruto.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
};

window.calcularResultadoAutomaticoTreinamento = function(itemData = {}, respostasAluno = []) {
    const perguntas = window.safeParseJSON(window.decodificarConfigAvaliacao(itemData['Configuração da Avaliação'] || '[]'), []);
    let notaAuto = 0;
    let pontosObjetivos = 0;
    let pontosSubjetivos = 0;
    let pendentes = 0;
    const detalhes = [];

    perguntas.forEach((questaoBruta, idx) => {
        const q = window.normalizarPerguntaBuilder(questaoBruta || {});
        const pontos = parseFloat(String(q.pontosQuestao || '0').replace(',', '.')) || 0;
        const resp = respostasAluno[idx]?.resposta || '';
        if (q.tipo === 'multipla') {
            pontosObjetivos += pontos;
            const correta = Array.isArray(q.ops) ? String(q.ops[parseInt(q.correta || '0', 10)] || '') : '';
            const acertou = String(resp || '').trim() !== '' && String(resp).trim() === correta.trim();
            if (acertou) notaAuto += pontos;
            detalhes.push({ idx: idx + 1, tipo: 'multipla', pontos, acertou, resposta: resp, correta });
        } else {
            pontosSubjetivos += pontos;
            pendentes += 1;
            detalhes.push({ idx: idx + 1, tipo: 'descritiva', pontos, resposta: resp });
        }
    });

    return {
        notaAuto: Number(notaAuto.toFixed(2)),
        pontosObjetivos: Number(pontosObjetivos.toFixed(2)),
        pontosSubjetivos: Number(pontosSubjetivos.toFixed(2)),
        pendentesSubjetivas: pendentes,
        detalhes
    };
};

window.adicionarPerguntaBuilder = function(tipo, objAntigo = null) {
    const container = document.getElementById('quiz-questions-list');
    if (!container) return;

    const q = window.normalizarPerguntaBuilder({ ...(objAntigo || {}), tipo: (objAntigo?.tipo || tipo || 'descritiva') });
    const div = document.createElement('div');
    div.className = 'quiz-item-box';
    div.style = 'background: white; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px; position: relative; box-shadow: var(--shadow-soft);';

    let html = `<button type="button" onclick="this.parentElement.remove(); window.sincronizarQuizJSON();" style="position:absolute; top:10px; right:10px; background:none; border:none; color:red; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>`;
    html += `<input type="hidden" class="quiz-tipo" value="${window.escapeAttr(q.tipo)}">`;
    html += `<div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px; align-items:center;">
        <div style="font-size:12px; font-weight:700; color:var(--primary-color); text-transform:uppercase;">${q.tipo === 'descritiva' ? 'Questão dissertativa' : 'Questão múltipla escolha'}</div>
        <div style="display:flex; gap:8px; align-items:center;">
            <label style="font-size:12px; font-weight:600;">Pontos da questão</label>
            <input type="number" min="0" step="0.5" class="form-input quiz-pontos" value="${window.escapeAttr(q.pontosQuestao)}" style="width:90px; margin:0;" oninput="window.sincronizarQuizJSON()">
        </div>
    </div>`;
    html += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:6px;">Pergunta / Enunciado</label>`;
    html += `<textarea class="form-input quiz-pergunta" style="height:70px; margin-bottom:10px; resize:vertical;" oninput="window.sincronizarQuizJSON()">${window.escapeHTML(q.p)}</textarea>`;
    html += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:6px;">Texto de apoio / instrução complementar (opcional)</label>`;
    html += `<textarea class="form-input quiz-apoio" style="height:60px; margin-bottom:10px; resize:vertical;" oninput="window.sincronizarQuizJSON()">${window.escapeHTML(q.apoio)}</textarea>`;
    html += `<div style="display:grid; grid-template-columns:1fr 170px; gap:10px; margin-bottom:10px;">
        <div>
            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:6px;">Link da mídia (opcional)</label>
            <input type="url" class="form-input quiz-media-url" value="${window.escapeAttr(q.mediaUrl)}" placeholder="Imagem, vídeo, YouTube, Drive, PDF..." oninput="window.sincronizarQuizJSON()">
        </div>
        <div>
            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:6px;">Tipo da mídia</label>
            <select class="form-input quiz-media-tipo" onchange="window.sincronizarQuizJSON()">
                <option value="auto" ${q.mediaTipo === 'auto' ? 'selected' : ''}>Automático</option>
                <option value="imagem" ${q.mediaTipo === 'imagem' ? 'selected' : ''}>Imagem</option>
                <option value="video" ${q.mediaTipo === 'video' ? 'selected' : ''}>Vídeo</option>
                <option value="documento" ${q.mediaTipo === 'documento' ? 'selected' : ''}>Documento</option>
            </select>
        </div>
    </div>`;
    html += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:6px;">Legenda da mídia (opcional)</label>`;
    html += `<input type="text" class="form-input quiz-media-legenda" value="${window.escapeAttr(q.mediaLegenda)}" placeholder="Ex.: Observe a imagem abaixo" oninput="window.sincronizarQuizJSON()">`;

    if (q.tipo === 'multipla') {
        html += `<label style="font-size:12px; font-weight:600; display:block; margin:12px 0 6px;">Opções de Resposta</label>`;
        ['A', 'B', 'C', 'D'].forEach((letra, idx) => {
            html += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;"><span style="font-weight:bold; width:20px;">${letra})</span><input type="text" class="form-input quiz-op" style="margin:0;" value="${window.escapeAttr(q.ops[idx] || '')}" oninput="window.sincronizarQuizJSON()"></div>`;
        });
        html += `<label style="font-size:12px; font-weight:600; display:block; margin-top:10px;">Qual é a opção CORRETA?</label>`;
        html += `<select class="form-input quiz-correta" onchange="window.sincronizarQuizJSON()"><option value="0" ${q.correta==='0'?'selected':''}>Opção A</option><option value="1" ${q.correta==='1'?'selected':''}>Opção B</option><option value="2" ${q.correta==='2'?'selected':''}>Opção C</option><option value="3" ${q.correta==='3'?'selected':''}>Opção D</option></select>`;
    }

    html += `<div class="quiz-preview-mini" style="margin-top:12px; padding:10px; border-radius:10px; background:#f8fafc; border:1px dashed #cbd5e1; font-size:12px; color:var(--text-muted);">Prévia da mídia será exibida para o aluno automaticamente, se o link for válido.</div>`;
    div.innerHTML = html;
    container.appendChild(div);
};

window.carregarPerguntasBuilder = function() {
    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    if (!inputOculto || !inputOculto.value || inputOculto.value === '') return;
    try {
        const jsonStr = inputOculto.value.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const arr = window.safeParseJSON(jsonStr, []);
        arr.forEach(q => window.adicionarPerguntaBuilder(q.tipo, q));
    } catch (e) {}
};

window.sincronizarQuizJSON = function() {
    const blocos = document.querySelectorAll('.quiz-item-box');
    const arrayFinal = [];
    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.quiz-tipo')?.value || 'descritiva';
        const p = (bloco.querySelector('.quiz-pergunta')?.value || '').replace(/"/g, "'");
        const apoio = (bloco.querySelector('.quiz-apoio')?.value || '').replace(/"/g, "'");
        const mediaUrl = (bloco.querySelector('.quiz-media-url')?.value || '').trim();
        const mediaLegenda = (bloco.querySelector('.quiz-media-legenda')?.value || '').replace(/"/g, "'");
        const mediaTipo = bloco.querySelector('.quiz-media-tipo')?.value || 'auto';
        const pontosQuestao = (bloco.querySelector('.quiz-pontos')?.value || '').trim();

        if (tipo === 'descritiva') {
            arrayFinal.push({ tipo, p, apoio, mediaUrl, mediaLegenda, mediaTipo, pontosQuestao });
        } else {
            const opsInputs = bloco.querySelectorAll('.quiz-op');
            const ops = Array.from(opsInputs).map(inpt => (inpt.value || '').replace(/"/g, "'"));
            const correta = bloco.querySelector('.quiz-correta')?.value || '0';
            arrayFinal.push({ tipo, p, apoio, mediaUrl, mediaLegenda, mediaTipo, pontosQuestao, ops, correta });
        }
    });
    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    if (inputOculto) inputOculto.value = JSON.stringify(arrayFinal).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

window.obterHtmlMidiaQuestao = function(q = {}, opts = {}) {
    const link = String(q.mediaUrl || '').trim();
    if (!link) return '';
    const tipoBruto = String(q.mediaTipo || 'auto').toLowerCase();
    const tipo = tipoBruto === 'auto'
        ? (/youtube|youtu\.be|\.mp4|video/i.test(link) ? 'video' : (/\.png|\.jpg|\.jpeg|\.gif|\.webp|image/i.test(link) ? 'imagem' : 'documento'))
        : tipoBruto;
    const legenda = q.mediaLegenda ? `<div style="font-size:12px; color:var(--text-muted); margin-top:6px;">${window.escapeHTML(q.mediaLegenda)}</div>` : '';
    const compacta = !!opts.compacta;
    if (tipo === 'imagem') {
        return `<div style="margin:10px 0; text-align:center;"><img src="${window.escapeAttr(link)}" alt="Mídia da questão" style="max-width:100%; ${compacta ? 'max-height:180px;' : 'max-height:320px;'} border-radius:12px; border:1px solid #e2e8f0; object-fit:contain; background:#fff;" onerror="this.outerHTML='<div style=&quot;padding:12px;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;&quot;>Não foi possível carregar a imagem desta questão.</div>'">${legenda}</div>`;
    }
    if (tipo === 'video') {
        const embed = window.obterUrlEmbedMaterial(link);
        return `<div style="margin:10px 0;"><div style="position:relative; padding-top:56.25%; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; background:#000;"><iframe src="${window.escapeAttr(embed)}" allowfullscreen style="position:absolute; inset:0; width:100%; height:100%; border:none;"></iframe></div>${legenda}</div>`;
    }
    return `<div style="margin:10px 0;"><button type="button" onclick="window.abrirMidiaFlutuante('${window.escapeAttr(link)}')" class="btn-hover color-8" style="width:100%; height:36px; border-radius:10px; font-size:12px;"><i class="ri-attachment-2"></i> Abrir material de apoio</button>${legenda}</div>`;
};

window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao]; if(!config) return;
    document.getElementById('modal-title').textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
    const corSalva = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : "#ffffff";
    document.getElementById('card-color').value = corSalva;

    let htmlGradientes = '';
    paletaGradientes.forEach(grad => { htmlGradientes += `<div class="color-swatch ${corSalva === grad.valor ? 'selected' : ''}" style="background: ${grad.valor};" data-color="${grad.valor}"></div>`; });
    const picker = document.getElementById('gradient-picker');
    if(picker) {
        picker.innerHTML = htmlGradientes;
        document.querySelectorAll('.color-swatch').forEach(swatch => { swatch.addEventListener('click', (e) => { document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); e.target.classList.add('selected'); document.getElementById('card-color').value = e.target.getAttribute('data-color'); }); });
    }
    document.getElementById('modal-doc-id').value = docId || "";

    let htmlCampos = '';
    config.campos.forEach(campo => {
        const valorAntigo = (dadosAntigos && dadosAntigos[campo]) ? dadosAntigos[campo] : '';

        if(colecao === 'colaboradores' && campo === 'Setor da Clínica') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Geral">Setor Padrão (Geral)</option>`; setoresGlobais.forEach(s => { htmlCampos += `<option value="${s}" ${valorAntigo === s ? 'selected' : ''}>${s}</option>`; }); htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Tipo (Vídeo, PDF, Tarefa, Prova)') {
            htmlCampos += `<select id="input-${campo}" class="form-input">`; ['Vídeo', 'PDF/Documento', 'Tarefa Prática', 'Prova Múltipla Escolha'].forEach(op => { htmlCampos += `<option value="${op}" ${valorAntigo === op ? 'selected' : ''}>${op}</option>`; }); htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Colaborador Específico (Opcional)') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Nenhum (Vai para todo o Setor marcado)</option>`; listaColaboradoresGlobal.forEach(c => { htmlCampos += `<option value="${c.nome}" ${valorAntigo === c.nome ? 'selected' : ''}>${c.nome}</option>`; }); htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Modo de Controle') {
            const valorAtual = valorAntigo || (String(dadosAntigos?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').includes('Prova') ? 'prova_bloqueada' : (String(dadosAntigos?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').includes('Tarefa') ? 'atividade_com_pausa' : 'material_apenas_leitura'));
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="material_apenas_leitura" ${valorAtual === 'material_apenas_leitura' ? 'selected' : ''}>Material apenas leitura</option><option value="atividade_livre" ${valorAtual === 'atividade_livre' ? 'selected' : ''}>Atividade livre</option><option value="atividade_com_pausa" ${valorAtual === 'atividade_com_pausa' ? 'selected' : ''}>Atividade com pausa</option><option value="prova_bloqueada" ${valorAtual === 'prova_bloqueada' ? 'selected' : ''}>Prova bloqueada</option></select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Permite Pausa?') {
            const valorAtual = valorAntigo || (String(dadosAntigos?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').includes('Tarefa') ? 'Sim' : 'Não');
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Sim" ${valorAtual === 'Sim' ? 'selected' : ''}>Sim</option><option value="Não" ${valorAtual === 'Não' ? 'selected' : ''}>Não</option></select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Limite de Infrações') {
            htmlCampos += `<input type="number" min="1" max="10" id="input-${campo}" value="${valorAntigo || 3}" class="form-input">`;
        }
        else if(colecao === 'treinamentos' && campo === 'Regra ao Sair') {
            const valorAtual = valorAntigo || (String(dadosAntigos?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').includes('Prova') ? 'zerada_por_saida' : 'inconclusa');
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="inconclusa" ${valorAtual === 'inconclusa' ? 'selected' : ''}>Marcar como inconclusa</option><option value="zerada_por_saida" ${valorAtual === 'zerada_por_saida' ? 'selected' : ''}>Finalizar e zerar tentativa</option></select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Configuração da Avaliação') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Perguntas da Prova ou Enunciado da Tarefa:</label>`;
            htmlCampos += `<input type="hidden" id="input-${campo}" value="${valorAntigo}">`;
            htmlCampos += `<div style="background:#f8fafc; border:1px dashed #cbd5e1; padding:12px; border-radius:12px; margin-bottom:12px; font-size:12px; color:var(--text-muted);"><strong style="color:var(--primary-color);">Construtor avançado:</strong> adicione quantas questões quiser, com texto de apoio, link de imagem/vídeo/documento e pontuação por questão.</div>`;
            htmlCampos += `<div id="quiz-questions-list"></div>`;
            htmlCampos += `<div style="display:flex; gap:10px; margin-bottom: 15px; flex-wrap:wrap;"><button type="button" onclick="window.adicionarPerguntaBuilder('descritiva')" class="btn-hover color-8" style="flex:1; height:38px; font-size:11px; min-width:220px;">+ Adicionar Dissertativa</button><button type="button" onclick="window.adicionarPerguntaBuilder('multipla')" class="btn-hover color-5" style="flex:1; height:38px; font-size:11px; min-width:220px;">+ Adicionar Múltipla Escolha</button></div>`;
        }
        else if(colecao === 'corpo-clinico' && campo === 'Especialidade') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Geral (Sem Categoria)">Selecione a Especialidade...</option>`; especialidadesGlobais.forEach(s => { htmlCampos += `<option value="${s}" ${valorAntigo === s ? 'selected' : ''}>${s}</option>`; }); htmlCampos += `</select>`;
        }
        else if(colecao === 'boletins-privados' && campo === 'Para qual Colaborador?') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Colaborador...</option>`; listaColaboradoresGlobal.forEach(c => { htmlCampos += `<option value="${c.nome}" ${valorAntigo === c.nome ? 'selected' : ''}>${c.nome}</option>`; }); htmlCampos += `</select>`;
        }
        else if((colecao === 'boletins' || colecao === 'treinamentos') && campo === 'Para quais Setores?') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Para quais setores? (Marque 1 ou mais)</label><div class="checkbox-group" style="margin-bottom:15px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">`;
            const valoresSalvos = valorAntigo ? String(valorAntigo).split(', ') : ['Geral'];
            ['Geral', ...setoresGlobais].forEach(setor => { const checked = valoresSalvos.includes(setor) ? 'checked' : ''; htmlCampos += `<label style="font-size:13px; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="check-setor" value="${setor}" ${checked}> ${setor}</label>`; }); htmlCampos += `</div>`;
        }
        else if(campo === 'Motivo') { htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Motivo...</option>`; motivosGlobais.forEach(m => { htmlCampos += `<option value="${m}" ${valorAntigo === m ? 'selected' : ''}>${m}</option>`; }); htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`; }
        else if(campo === 'Links dos Materiais (1 por linha)') { htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:80px; resize:vertical;" placeholder="Cole os links">${valorAntigo}</textarea>`; }
        else if(campo === 'Aceita o Servico?') { htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Sim" ${valorAntigo === 'Sim' ? 'selected' : ''}>Sim</option><option value="Não" ${valorAntigo === 'Não' ? 'selected' : ''}>Não</option></select>`; }
        else if(colecao === 'consultas' && campo === 'Tipo') { htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Consulta" ${valorAntigo === 'Consulta' ? 'selected' : ''}>Consulta</option><option value="Exame" ${valorAntigo === 'Exame' ? 'selected' : ''}>Exame</option><option value="Pacotes" ${valorAntigo === 'Pacotes' ? 'selected' : ''}>Pacotes</option></select>`; }
        else if(campo === 'Local ou Prédio') { htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Local...</option>`; locaisGlobais.forEach(loc => { const l = loc.trim(); if(l) htmlCampos += `<option value="${l}" ${valorAntigo === l ? 'selected' : ''}>${l}</option>`; }); htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`; }
        else if (campo.includes('Data')) { htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`; }
        else if (campo.includes('Link') || campo.includes('URL')) { htmlCampos += `<input type="url" id="input-${campo}" placeholder="Link ou URL" value="${valorAntigo}" class="form-input">`; }
        else if (campo === 'Profissionais que realizam (Opcional)') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px; color:var(--text-muted);">Quais médicos realizam isso?</label>`;
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:80px; resize:vertical;" placeholder="Ex: Dr. João, Dra. Maria...">${valorAntigo}</textarea>`;
        }
        else if (campo.includes('Descrição') || campo.includes('Observação') || campo.includes('Observações') || campo.includes('O que está incluso') || campo.includes('Informacao') || campo.includes('Informações')) {
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:100px; resize:vertical;" placeholder="${campo}">${valorAntigo}</textarea>`;
        }
        else { htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`; }
    });

    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', colecao);
    document.getElementById('modal-cadastro').style.display = 'flex';
};

window.gerarHTMLCard = function(colecaoNome, docId, data) {
    const config = configuracaoAbas[colecaoNome]; if(!config) return '';
    let campoTitulo = config.campos[0]; if(config.campoAgrupador) campoTitulo = config.campos.find(c => c !== config.campoAgrupador) || config.campos[0];

    let tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'] || 'Detalhes do Cadastro';

    if (colecaoNome === 'ramais') {
        tituloDesteCard = data['Setor'] || 'Ramal Geral';
    }

    const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
    const configCor = paletaGradientes.find(p => p.valor === corSalva);
    const cardClass = (configCor && configCor.dark) && colecaoNome !== 'ramais' ? 'has-gradient' : '';

    let cardHtml = `<div class="card ${cardClass}" id="card-${docId}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;

    if(config.campoAgrupador) cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA/MÓDULO: ${data[config.campoAgrupador] || 'Geral'}</div>`;
    cardHtml += `<div style="font-size:18px; font-weight:600; line-height:1.2; margin-bottom:15px;">${tituloDesteCard}</div>`;

    let hasFlexLayout = (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']);
    if(hasFlexLayout) {
        cardHtml += `<div class="medico-wrapper">`;
        if (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']) {
            let fotoUrl = window.formatarLinkImagem(data['Link da Foto do Profissional']);
            if(fotoUrl) cardHtml += `<img src="${fotoUrl}" class="medico-foto" onerror="this.style.display='none'">`;
        }
        cardHtml += `<div class="content-info-flex">`;
    }

    config.campos.forEach(chave => {
        const valor = data[chave];

        if (colecaoNome === 'ramais' && (chave === 'Setor' || chave === 'Local ou Prédio')) return;

        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo && chave !== 'Configuração da Avaliação' && !String(chave).includes('Link da Foto') && !String(chave).includes('Link da Logo') && chave !== 'PIN de Acesso (Treinamentos)') {

            if (chave === 'Aceita o Servico?') {
                const badgeClass = valor === 'Não' ? 'status-negado' : 'status-aceito';
                const iconClass = valor === 'Não' ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill';
                const text = valor === 'Não' ? 'Serviço Não Coberto' : 'Serviço Coberto';
                cardHtml += `<div style="margin: 8px 0;"><span class="${badgeClass}"><i class="${iconClass}"></i> ${text}</span></div>`;
            }
            else if(String(valor).includes('http')) {
                const urlMatch = String(valor).match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : valor;
                const textoSemUrl = String(valor).replace(url, '').trim();

                let btnTexto = "Acessar Link Externo";
                let btnIcone = "ri-external-link-line";
                let btnAcao = `window.open('${url}', '_blank')`;
                let colorClass = "color-9";

                if (chave.includes('Acesso') || chave.includes('Link') || colecaoNome === 'senhas') {
                    btnTexto = "Navegador Interno";
                    btnIcone = "ri-layout-window-line";
                    colorClass = "color-11";
                    const safeTitle = String(tituloDesteCard).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                    btnAcao = `window.abrirJanelaFlutuante('${url}', '${safeTitle}')`;
                }
                else if (chave.includes('Maps') || chave.includes('Local e Link')) {
                    btnTexto = "Abrir Mapa"; btnIcone = "ri-map-pin-user-fill"; colorClass = "color-5";
                }

                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span style="white-space: pre-wrap;">${textoSemUrl}</span><br><button type="button" onclick="${btnAcao}" class="btn-hover ${colorClass}" style="height: 32px; font-size: 11px; padding: 0 15px; margin-top: 5px; border-radius: 8px; width: 100%;"><i class="${btnIcone}"></i> ${btnTexto}</button></div>`;
            } else {
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span style="white-space: pre-wrap;">${valor}</span></div>`;
            }
        }
    });

    if(hasFlexLayout) cardHtml += `</div></div>`;

    if(colecaoNome === 'colaboradores' && data['PIN de Acesso (Treinamentos)']) {
         cardHtml += `<div style="margin-top:10px; background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:12px; border: 1px dashed var(--border-color);"><strong> PIN de Acesso:</strong> ${data['PIN de Acesso (Treinamentos)']}</div>`;
    }

    if(colecaoNome === 'treinamentos' && isAdmin) {
        const precisaResponder = data['Tipo (Vídeo, PDF, Tarefa, Prova)'] && (data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Tarefa') || data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Prova'));
        const count = precisaResponder ? (data.respostas_alunos || []).length : (data.leituras || []).length;
        cardHtml += `<div style="margin-top:15px; padding-top:15px; border-top: 1px dashed rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:12px; color:var(--primary-color);"><b>Conclusões:</b> ${count} aluno(s).</div>
                        <button onclick="window.abrirListaLeituras('${docId}', 'treinamentos')" class="btn-hover color-8" style="padding: 6px 12px; font-size: 12px;"><i class="ri-team-line"></i> Respostas</button>
                     </div>`;
    }

    // --- MÓDULO DE ATIVOS ---
   if (colecaoNome === 'ativos' && isAdmin) {
    cardHtml += `
        <div style="display:flex; gap:8px; margin-top:12px;">
            <button type="button"
                onclick="window.visualizarEtiquetaAtivo('${docId}')"
                class="btn-hover color-11"
                style="flex:1; height:35px; border-radius:8px; font-size:12px; border:1px solid var(--border-color);">
                <i class="ri-eye-line"></i> Ver QR Code
            </button>
            <button type="button"
                onclick="window.imprimirEtiquetaAtivo('${docId}')"
                class="btn-hover color-8"
                style="flex:1; height:35px; border-radius:8px; font-size:12px; border:1px solid var(--border-color);">
                <i class="ri-printer-line"></i> Imprimir
            </button>
        </div>
    `;
}
    if (colecaoNome === 'ativos' && data.historico) {
        cardHtml += `<div style="margin-top:10px; font-size:11px; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0; max-height:80px; overflow-y:auto;"><strong><i class="ri-history-line"></i> Histórico:</strong><br>`;
        [...data.historico].reverse().forEach(h => { cardHtml += `<div style="border-bottom:1px dashed #cbd5e1; padding:3px 0;">${h}</div>`; });
        cardHtml += `</div>`;
    }

    if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    cardHtml += `</div>`; return cardHtml;
};

window.visualizarEtiquetaAtivo = function(docId) {
    try {
        if (typeof QRCode === 'undefined') {
            alert('A biblioteca de QR Code não foi carregada.');
            return;
        }

        const ativos = window.dadosGlobaisAbas['ativos'] || [];
        const ativo = ativos.find(item => item.id === docId);

        if (!ativo) {
            alert('Ativo não encontrado.');
            return;
        }

        const data = ativo.data || {};
        const nome = data['Nome do Equipamento'] || 'Equipamento';
        const patrimonio = data['Número de Patrimônio'] || docId;
        const categoria = data['Categoria'] || 'Sem categoria';
        const local = data['Localização / Setor'] || 'Sem localização';
        const status = data['Status do Ativo'] || 'Não informado';

        const modal = document.getElementById('modal-visualizar-qr');
        const qrArea = document.getElementById('visualizar-qr-area');
        const info = document.getElementById('visualizar-qr-info');

        if (!modal || !qrArea || !info) {
            alert('Modal de visualização do QR não encontrado no HTML.');
            return;
        }

        qrArea.innerHTML = '';
        info.innerHTML = `
            <div style="font-size:16px; font-weight:700; margin-bottom:6px;">${window.escapeHTML(nome)}</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Patrimônio:</strong> ${window.escapeHTML(patrimonio)}</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Categoria:</strong> ${window.escapeHTML(categoria)}</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Setor:</strong> ${window.escapeHTML(local)}</div>
            <div style="font-size:13px;"><strong>Status:</strong> ${window.escapeHTML(status)}</div>
        `;

        new QRCode(qrArea, {
            text: String(patrimonio || docId),
            width: 220,
            height: 220
        });

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao visualizar QR Code:', error);
        alert('Erro ao visualizar o QR Code.');
    }
};

window.fecharVisualizacaoQR = function() {
    const modal = document.getElementById('modal-visualizar-qr');
    const qrArea = document.getElementById('visualizar-qr-area');
    const info = document.getElementById('visualizar-qr-info');

    if (qrArea) qrArea.innerHTML = '';
    if (info) info.innerHTML = '';
    if (modal) modal.style.display = 'none';
};

window.imprimirEtiquetaAtivo = function(docId) {
    try {
        if (typeof QRCode === 'undefined') {
            alert('A biblioteca de QR Code não foi carregada.');
            return;
        }

        const ativos = window.dadosGlobaisAbas['ativos'] || [];
        const ativo = ativos.find(item => item.id === docId);

        if (!ativo) {
            alert('Ativo não encontrado para gerar a etiqueta.');
            return;
        }

        const data = ativo.data || {};
        const nome = data['Nome do Equipamento'] || 'Equipamento';
        const patrimonio = data['Número de Patrimônio'] || docId;
        const categoria = data['Categoria'] || 'Sem categoria';
        const local = data['Localização / Setor'] || 'Sem localização';
        const responsavel = data['Responsável'] || 'Não informado';

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.padding = '20px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.width = '320px';
        container.style.background = '#fff';
        container.style.color = '#111';

        container.innerHTML = `
            <div style="border:1px solid #ccc; border-radius:12px; padding:16px;">
                <div style="font-size:18px; font-weight:700; margin-bottom:8px; color:#8B252C;">
                    Etiqueta do Ativo
                </div>
                <div style="font-size:14px; margin-bottom:6px;"><strong>Equipamento:</strong> ${window.escapeHTML(nome)}</div>
                <div style="font-size:14px; margin-bottom:6px;"><strong>Patrimônio:</strong> ${window.escapeHTML(patrimonio)}</div>
                <div style="font-size:14px; margin-bottom:6px;"><strong>Categoria:</strong> ${window.escapeHTML(categoria)}</div>
                <div style="font-size:14px; margin-bottom:6px;"><strong>Local:</strong> ${window.escapeHTML(local)}</div>
                <div style="font-size:14px; margin-bottom:12px;"><strong>Responsável:</strong> ${window.escapeHTML(responsavel)}</div>
                <div id="qr-print-area" style="display:flex; justify-content:center; margin:14px 0;"></div>
                <div style="font-size:12px; color:#555; text-align:center;">
                    Código: ${window.escapeHTML(docId)}
                </div>
            </div>
        `;

        document.body.appendChild(container);

        const qrArea = container.querySelector('#qr-print-area');
        new QRCode(qrArea, {
            text: String(patrimonio || docId),
            width: 160,
            height: 160
        });

        setTimeout(() => {
            const win = window.open('', '_blank', 'width=420,height=650');
            if (!win) {
                document.body.removeChild(container);
                alert('O navegador bloqueou a janela de impressão. Permita popups e tente novamente.');
                return;
            }

            win.document.write(`
                <html>
                <head>
                    <title>Etiqueta do Ativo</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            margin: 0;
                            background: #fff;
                        }
                    </style>
                </head>
                <body>${container.innerHTML}</body>
                </html>
            `);

            win.document.close();
            win.focus();

            setTimeout(() => {
                win.print();
                win.close();
                document.body.removeChild(container);
            }, 500);
        }, 300);
    } catch (error) {
        console.error('Erro ao imprimir etiqueta do ativo:', error);
        alert('Erro ao gerar a etiqueta QR do ativo.');
    }
};

window.obterTamanhoEtiquetaAtivo = function(valor = 'medio') {
    const mapa = {
        pequeno: { larguraMm: 35, alturaMm: 22, qrPx: 78, fonteNome: 9, fonteInfo: 8 },
        medio: { larguraMm: 50, alturaMm: 30, qrPx: 104, fonteNome: 10, fonteInfo: 8.5 },
        grande: { larguraMm: 62, alturaMm: 40, qrPx: 128, fonteNome: 11, fonteInfo: 9 }
    };
    return mapa[valor] || mapa.medio;
};

window.filtrarAtivosParaEtiquetas = function() {
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const setorEl = document.getElementById('etiqueta-filtro-setor');
    const categoriaEl = document.getElementById('etiqueta-filtro-categoria');
    const produtoEl = document.getElementById('etiqueta-filtro-produto');
    const statusEl = document.getElementById('etiqueta-filtro-status');
    const apenasPastaEl = document.getElementById('etiqueta-apenas-pasta-atual');

    const setor = setorEl ? String(setorEl.value || '').trim().toLowerCase() : '';
    const categoria = categoriaEl ? String(categoriaEl.value || '').trim().toLowerCase() : '';
    const status = statusEl ? String(statusEl.value || '').trim().toLowerCase() : '';
    const produtoRaw = produtoEl ? String(produtoEl.value || '').trim().toLowerCase() : '';
    const termosProduto = produtoRaw ? produtoRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const apenasPasta = apenasPastaEl ? !!apenasPastaEl.checked : false;
    const pastaAtual = String(window.pasta_ativos_Atual || '').trim().toLowerCase();

    return ativos.filter(item => {
        const data = item.data || {};
        const nome = String(data['Nome do Equipamento'] || '').toLowerCase();
        const itemSetor = String(data['Localização / Setor'] || '').toLowerCase();
        const itemCategoria = String(data['Categoria'] || '').toLowerCase();
        const itemStatus = String(data['Status do Ativo'] || '').toLowerCase();

        if (setor && itemSetor !== setor) return false;
        if (categoria && itemCategoria !== categoria) return false;
        if (status && itemStatus !== status) return false;
        if (apenasPasta && pastaAtual && itemCategoria !== pastaAtual) return false;
        if (termosProduto.length && !termosProduto.some(termo => nome.includes(termo))) return false;

        return true;
    });
};

window.atualizarOpcoesEtiquetasAtivos = function() {
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const setores = Array.from(new Set(ativos.map(item => String(item.data?.['Localização / Setor'] || '').trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b));
    const categorias = Array.from(new Set(ativos.map(item => String(item.data?.['Categoria'] || '').trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b));
    const statusList = Array.from(new Set(ativos.map(item => String(item.data?.['Status do Ativo'] || '').trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b));

    const preencherSelect = (id, values, placeholder) => {
        const select = document.getElementById(id);
        if (!select) return;
        const valorAtual = select.value;
        select.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${window.escapeHTML(v)}">${window.escapeHTML(v)}</option>`).join('');
        if (values.includes(valorAtual)) select.value = valorAtual;
    };

    preencherSelect('etiqueta-filtro-setor', setores, 'Todos os setores');
    preencherSelect('etiqueta-filtro-categoria', categorias, 'Todas as categorias');
    preencherSelect('etiqueta-filtro-status', statusList, 'Todos os status');

    const ativosFiltrados = window.filtrarAtivosParaEtiquetas();
    const contador = document.getElementById('etiqueta-resultado-contador');
    if (contador) {
        contador.textContent = `${ativosFiltrados.length} ativo(s) encontrado(s)`;
    }
};

window.abrirModalEtiquetasAtivos = function() {
    const modal = document.getElementById('modal-etiquetas-ativos');
    if (!modal) {
        alert('Modal de etiquetas em lote não encontrado no HTML.');
        return;
    }
    window.atualizarOpcoesEtiquetasAtivos();
    modal.style.display = 'flex';
};

window.fecharModalEtiquetasAtivos = function() {
    const modal = document.getElementById('modal-etiquetas-ativos');
    if (modal) modal.style.display = 'none';
};

window.gerarHTMLFolhaEtiquetasAtivos = function(itens = [], tamanhoKey = 'medio', titulo = 'Etiquetas de Ativos') {
    const conf = window.obterTamanhoEtiquetaAtivo(tamanhoKey);
    return `
        <html>
        <head>
            <title>${titulo}</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10mm;
                    background: #fff;
                    color: #111;
                }
                .sheet-header {
                    margin-bottom: 8mm;
                }
                .sheet-header h1 {
                    margin: 0 0 4px;
                    font-size: 16px;
                    color: #8B252C;
                }
                .sheet-header p {
                    margin: 0;
                    font-size: 12px;
                    color: #475569;
                }
                .sheet {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 3mm;
                    align-content: flex-start;
                }
                .label {
                    width: ${conf.larguraMm}mm;
                    min-height: ${conf.alturaMm}mm;
                    border: 1px solid #d1d5db;
                    border-radius: 2.5mm;
                    padding: 2mm;
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    overflow: hidden;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                .label-qr {
                    width: ${conf.qrPx}px;
                    min-width: ${conf.qrPx}px;
                    height: ${conf.qrPx}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .label-info {
                    flex: 1;
                    min-width: 0;
                }
                .label-title {
                    font-size: ${conf.fonteNome}px;
                    font-weight: 700;
                    line-height: 1.15;
                    margin-bottom: 1.4mm;
                    word-break: break-word;
                }
                .label-line {
                    font-size: ${conf.fonteInfo}px;
                    line-height: 1.2;
                    color: #334155;
                    word-break: break-word;
                }
                @media print {
                    body { padding: 6mm; }
                }
            </style>
        </head>
        <body>
            <div class="sheet-header">
                <h1>${window.escapeHTML(titulo)}</h1>
                <p>Total de etiquetas: ${itens.length}</p>
            </div>
            <div class="sheet">
                ${itens.map(item => {
                    const data = item.data || {};
                    const nome = window.escapeHTML(data['Nome do Equipamento'] || 'Equipamento');
                    const patrimonio = window.escapeHTML(data['Número de Patrimônio'] || item.id);
                    const setor = window.escapeHTML(data['Localização / Setor'] || 'Sem setor');
                    const status = window.escapeHTML(data['Status do Ativo'] || 'Sem status');
                    return `
                        <div class="label">
                            <div class="label-qr" data-code="${patrimonio}"></div>
                            <div class="label-info">
                                <div class="label-title">${nome}</div>
                                <div class="label-line"><strong>Série:</strong> ${patrimonio}</div>
                                <div class="label-line"><strong>Setor:</strong> ${setor}</div>
                                <div class="label-line"><strong>Status:</strong> ${status}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
            <script>
                document.querySelectorAll('.label-qr').forEach(el => {
                    const code = el.getAttribute('data-code') || '';
                    new QRCode(el, {
                        text: code,
                        width: ${conf.qrPx},
                        height: ${conf.qrPx}
                    });
                });
                setTimeout(() => window.print(), 500);
            <\/script>
        </body>
        </html>
    `;
};

window.imprimirEtiquetasAtivosEmLote = function() {
    try {
        const itens = window.filtrarAtivosParaEtiquetas();
        const tamanhoEl = document.getElementById('etiqueta-tamanho-impressao');
        const tamanho = tamanhoEl ? tamanhoEl.value : 'medio';

        if (!itens.length) {
            alert('Nenhum ativo encontrado com os filtros selecionados.');
            return;
        }

        const win = window.open('', '_blank', 'width=1200,height=900');
        if (!win) {
            alert('O navegador bloqueou a janela de impressão. Permita popups e tente novamente.');
            return;
        }

        win.document.open();
        win.document.write(window.gerarHTMLFolhaEtiquetasAtivos(itens, tamanho, 'Etiquetas de Ativos'));
        win.document.close();
    } catch (error) {
        console.error('Erro ao imprimir etiquetas em lote:', error);
        alert('Erro ao gerar a impressão em lote.');
    }
};


window.renderizarListaGenerica = function(colecao) {
    const grid = document.getElementById(`grid-${colecao}-list`);
    if (!grid) return;

    grid.innerHTML = '';

    const nomePasta = String(window[`pasta_${colecao}_Atual`] || '').trim().toLowerCase();
    const config = configuracaoAbas[colecao];

    const obterNomePasta = (item) => {
        const bruto =
            item?.data?.[config.campoAgrupador] ||
            item?.data?.Pacotes ||
            item?.data?.['Pasta / Módulo'] ||
            item?.data?.Especialidade ||
            item?.data?.Convênio ||
            item?.data?.Exame ||
            item?.data?.Tipo ||
            item?.data?.['Categoria do Exame'] ||
            item?.data?.['Número da Tabela'] ||
            'Geral';

        return String(bruto || 'Geral').trim();
    };

    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => {
        return obterNomePasta(i).toLowerCase() === nomePasta;
    });

    itensExibir.sort((a, b) =>
        String(a.data[config.campos[0]] || '').toLowerCase()
            .localeCompare(String(b.data[config.campos[0]] || '').toLowerCase())
    );

    if (!itensExibir.length) {
        grid.innerHTML = `<div style="grid-column:1/-1; color: var(--text-muted); font-size:14px; padding: 10px 0;">
            Nenhum cadastro encontrado nesta pasta.
        </div>`;
        return;
    }

    itensExibir.forEach(item => {
        grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data);
    });
};

window.renderizarPastasGenericas = function(colecao) {
    const grid = document.getElementById(`grid-${colecao}-folders`); if(!grid) return; grid.innerHTML = '';
    const config = configuracaoAbas[colecao]; const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];
    if (dadosAtuais.length === 0) { grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma pasta/módulo encontrado. Clique em "Novo" para criar.</p>'; return; }
    const obterNomePasta = (item) => { const bruto = item?.data?.[config.campoAgrupador] || item?.data?.Pacotes || item?.data?.['Pasta / Módulo'] || item?.data?.Especialidade || item?.data?.Convênio || item?.data?.Exame || item?.data?.Tipo || item?.data?.['Categoria do Exame'] || item?.data?.['Número da Tabela'] || 'Geral'; return String(bruto || 'Geral').trim() || 'Geral'; };
    const pastasUnicas = [...new Set(dadosAtuais.map(obterNomePasta))].sort((a,b)=>String(a).toLowerCase().localeCompare(String(b).toLowerCase()));
    pastasUnicas.forEach(nomePasta => {
        const itensPasta = dadosAtuais.filter(i => obterNomePasta(i) === nomePasta);
        const qtd = itensPasta.length;
        const corIcone = itensPasta[0].data.corCard && itensPasta[0].data.corCard !== "transparent" ? itensPasta[0].data.corCard : "var(--primary-color)";
        let iconeHtml = `<div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: ${corIcone}; font-size: 24px;"><i class="${config.icone}"></i></div>`;
        grid.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaGenerica('${colecao}', '${nomePasta.replace(/'/g, "\\'")}')" style="text-align: left; padding: 20px; border-left: 6px solid ${corIcone};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">${iconeHtml}<div style="font-size: 16px; font-weight: 600;">${nomePasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;">Itens na pasta: <b style="color:var(--text-main);">${qtd}</b></div></div>`;
    });
};

window.renderizarPastasBoletins = function() {
    const gridFolders = document.getElementById('grid-boletins-folders'); if(!gridFolders) return; gridFolders.innerHTML = '';
    if (window.todosBoletinsData.length === 0) { gridFolders.innerHTML = '<div style="grid-column: 1/-1; background: #fff5f5; color: #c53030; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; font-size:14px; text-align:center;">Nenhum Boletim cadastrado ou regras de segurança bloqueando o acesso.</div>'; return; }
    let todosOsSetores = new Set(['Geral', ...setoresGlobais]);
    window.todosBoletinsData.forEach(b => { let setoresDoBoletim = b.data['Para quais Setores?']; if(setoresDoBoletim) { String(setoresDoBoletim).split(',').forEach(s => todosOsSetores.add(s.trim())); } });
    let desenhouAlgum = false;
    Array.from(todosOsSetores).sort().forEach(pasta => {
        const boletinsDaPasta = window.todosBoletinsData.filter(item => { return String(item.data['Para quais Setores?'] || 'Geral').includes(pasta); });
        if(boletinsDaPasta.length === 0) return;  desenhouAlgum = true;
        let totalLidos = 0; let totalFaltam = 0;
        boletinsDaPasta.forEach(b => {
            const publicoDaqui = window.obterPublicoAlvo(pasta);
            const lidosNames = (b.data.leituras || []).map(txt => txt.split(' (')[0]);
            const leram = publicoDaqui.filter(n => lidosNames.includes(n)).length;
            totalLidos += leram; totalFaltam += Math.max(0, publicoDaqui.length - leram);
        });
        const icone = pasta === 'Geral' ? 'ri-global-line' : 'ri-folder-user-line';
        const corStatusPasta = totalFaltam > 0 ? window.corStatusPendente : window.corStatusConcluido;
        const pastaSegura = pasta.replace(/'/g, "\\'");
        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaBoletim('${pastaSegura}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: var(--primary-color); font-size: 24px; flex-shrink:0;"><i class="${icone}"></i></div><div style="font-size: 16px; font-weight: 600; line-height:1.2; word-wrap:break-word;">${pasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Boletins Ativos: <b style="color: var(--text-main);">${boletinsDaPasta.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos Acumulados: <b>${totalLidos}</b></div><div style="color: #e53e3e;">Pendências: <b>${totalFaltam}</b></div></div></div>`;
    });
    if (!desenhouAlgum) gridFolders.innerHTML = '<div style="grid-column: 1/-1; padding: 15px; color: var(--text-muted); text-align:center;">Nenhuma pasta com boletins encontrada.</div>';
};

window.renderizarListaBoletins = function() {
    const grid = document.getElementById('grid-boletins'); if(!grid) return; grid.innerHTML = '';
    const pasta = window.pastaBoletimAtual;
    const boletinsExibir = window.todosBoletinsData.filter(item => { return String(item.data['Para quais Setores?'] || 'Geral').includes(pasta); });
    if(typeof window.atualizarGrafico === 'function') chartBoletinsInst = window.atualizarGrafico('chart-boletins', chartBoletinsInst, boletinsExibir, `Motivos em ${pasta}`);
    const camposOrdem = configuracaoAbas['boletins'].campos; const campoTitulo = camposOrdem[0];
    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data[campoTitulo] || 'Boletim';
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
        const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
        const configCor = paletaGradientes.find(p => p.valor === corSalva); const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : '';
        const publicoAlvoNomes = window.obterPublicoAlvo(pasta);
        const lidosNomes = (data.leituras || []).map(txt => txt.split(' (')[0]);
        const faltamAssinar = publicoAlvoNomes.filter(n => !lidosNomes.includes(n));
        const qtdLidos = publicoAlvoNomes.filter(n => lidosNomes.includes(n)).length;
        const qtdFaltam = faltamAssinar.length;
        const corStatus = qtdFaltam > 0 ? window.corStatusPendente : window.corStatusConcluido;
        const classeUrgente = (isUrgente && qtdFaltam > 0) ? 'card-urgente' : '';
        let cardHtml = `<div class="card ${classeUrgente} ${gradientClass}" id="card-${docId}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border: 3px solid ${corStatus};"><div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600; line-height:1.2;">${titulo}</div>`;
        let botaoLinkHtml = '';
        camposOrdem.forEach(chave => {
            const valor = data[chave];
            if (valor && chave !== campoTitulo) {
                if(chave === 'Links dos Materiais (1 por linha)') {
                    const links = String(valor).split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="window.abrirMidiaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && String(chave).includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span style="font-weight: ${(isUrgente && String(chave).includes('Tipo')) ? '700' : '500'};">${valor}</span></div>`; }
            }
        });
        cardHtml += botaoLinkHtml;
        cardHtml += `<div class="leituras-lista" style="margin-top: auto; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 13px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 8px;"><div style="font-size: 11px;">Lidos: <b style="color:#38a169; font-size:13px;">${qtdLidos}</b> | Faltam: <b style="color:#e53e3e; font-size:13px;">${qtdFaltam}</b></div><button onclick="window.abrirListaLeituras('${docId}', 'boletins')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-team-line"></i> Detalhes</button></div>`;
        if(isAdmin) {
            cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 5px;"><select id="leitor-${docId}" style="flex:1; padding:8px; border-radius:8px; border:none; font-size:12px; background:rgba(255,255,255,0.9); outline:none;">`;
            if(faltamAssinar.length === 0) cardHtml += `<option value="">Todos da pasta já leram!</option>`; else { cardHtml += `<option value="">Selecionar Pendente...</option>`; faltamAssinar.forEach(nome => { cardHtml += `<option value="${nome}">${nome}</option>`; }); }
            cardHtml += `</select><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="boletins" style="background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer;"><i class="ri-check-line"></i></button></div>`;
        }
        cardHtml += `</div>`;
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="boletins" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="boletins" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
};

window.renderizarPastasPrivados = function() {
    const gridFolders = document.getElementById('grid-privados-folders'); if(!gridFolders) return; gridFolders.innerHTML = '';
    if (window.todosPrivadosData.length === 0) { gridFolders.innerHTML = '<div style="grid-column: 1/-1; background: #fff5f5; color: #c53030; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; font-size:14px; text-align:center;">Nenhum documento privado encontrado.</div>'; return; }
    let todosOsNomes = new Set(listaColaboradoresGlobal.map(c => c.nome));
    window.todosPrivadosData.forEach(b => { if(b.data['Para qual Colaborador?']) todosOsNomes.add(String(b.data['Para qual Colaborador?'])); });
    let desenhouAlgum = false;
    Array.from(todosOsNomes).sort().forEach(nome => {
        const boletinsDele = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === nome);
        if(boletinsDele.length === 0) return;  desenhouAlgum = true;
        let lidos = 0; let faltam = 0;
        boletinsDele.forEach(b => { const leitor = (b.data.leituras || []).find(txt => txt.startsWith(nome)); if(leitor) lidos++; else faltam++; });
        let corStatusPasta = faltam > 0 ? window.corStatusPendente : window.corStatusConcluido;
        const nomeSeguro = nome.replace(/'/g, "\\'");
        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaPrivado('${nomeSeguro}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: #e2e8f0; padding: 15px; border-radius: 12px; color: var(--text-main); font-size: 24px; flex-shrink:0;"><i class="ri-user-star-fill"></i></div><div style="font-size: 16px; font-weight: 600; line-height:1.2; word-wrap:break-word;">${nome}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Documentos: <b style="color: var(--text-main);">${boletinsDele.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos: <b>${lidos}</b></div><div style="color: #e53e3e;">Pendentes: <b>${faltam}</b></div></div></div>`;
    });
    if (!desenhouAlgum) gridFolders.innerHTML = '<div style="grid-column: 1/-1; padding: 15px; color: var(--text-muted); text-align:center;">Nenhuma pasta privada encontrada.</div>';
};

window.renderizarListaPrivados = function() {
    const grid = document.getElementById('grid-boletins-privados-list'); if(!grid) return; grid.innerHTML = '';
    const colabAtual = window.pastaPrivadoAtual;
    const dtInicio = document.getElementById('privado-lista-data-inicio') ? document.getElementById('privado-lista-data-inicio').value : '';
    const dtFim = document.getElementById('privado-lista-data-fim') ? document.getElementById('privado-lista-data-fim').value : '';
    const boletinsBase = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === colabAtual);
    const boletinsExibir = window.filtrarPorDataPublicacao(boletinsBase, dtInicio, dtFim);
    if(typeof window.atualizarGrafico === 'function') chartPrivadosInst = window.atualizarGrafico('chart-privados', chartPrivadosInst, boletinsExibir, `Motivos de ${colabAtual}`);
    if (boletinsExibir.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; background:#fff; padding:18px; border-radius:14px; color:var(--text-muted); border:1px solid var(--border-color);">Nenhum informativo encontrado para esse colaborador no período selecionado.</div>';
        return;
    }

    const camposOrdem = configuracaoAbas['boletins-privados'].campos;
    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data['Título do Documento'] || 'Documento Privado';
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
        const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
        const configCor = paletaGradientes.find(p => p.valor === corSalva); const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : '';
        const jaLeu = (data.leituras || []).find(txt => txt.startsWith(colabAtual));
        const corStatus = jaLeu ? window.corStatusConcluido : window.corStatusPendente;
        const classeUrgente = (isUrgente && !jaLeu) ? 'card-urgente' : '';

        let cardHtml = `<div class="card ${classeUrgente} ${gradientClass}" id="card-${docId}" style="display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border: 3px solid ${corStatus};"><div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600;">${titulo}</div>`;
        let botaoLinkHtml = '';
        camposOrdem.forEach(chave => {
            const valor = data[chave];
            if (valor && chave !== 'Título do Documento' && chave !== 'Para qual Colaborador?') {
                if(chave === 'Links dos Materiais (1 por linha)') {
                    const links = String(valor).split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="window.abrirMidiaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && String(chave).includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span>${valor}</span></div>`; }
            }
        });
        cardHtml += botaoLinkHtml;
        cardHtml += `<div class="leituras-lista" style="margin-top: auto; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 13px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 8px;"><div style="font-size: 13px; font-weight:600; color: ${jaLeu ? '#38a169' : '#e53e3e'};">${jaLeu ? '<i class="ri-check-double-line"></i> Lido' : '<i class="ri-time-line"></i> Pendente'}</div><button onclick="window.abrirListaLeituras('${docId}', 'boletins-privados')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-list-check"></i> Detalhes</button></div>`;
        if(isAdmin && !jaLeu) {
            cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 5px;"><input type="hidden" id="leitor-${docId}" value="${colabAtual}"><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="boletins-privados" style="width:100%; background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer; font-size: 13px; font-weight: 500;"><i class="ri-check-line"></i> Confirmar Assinatura</button></div>`;
        }
        cardHtml += `</div>`;
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="boletins-privados" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="boletins-privados" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
};

window.renderizarCards = function(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);

    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && colecaoNome !== 'ramais' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = []; if(window.alunoLogado) window.renderizarTrilhaAluno(); }
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; window.verificarUrgentesHome(); window.renderizarGraficoHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; window.verificarUrgentesHome(); window.renderizarGraficoPrivadosGeral(); }
            if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) { window.dadosGlobaisAbas[colecaoNome] = []; if(abaAtual === colecaoNome) window.renderizarPastasGenericas(colecaoNome); }
            if(colecaoNome === 'ramais') { window.todosOsDadosDoSistema['ramais'] = []; window.renderizarRamaisAgrupados(); }
            if(grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }

        let itens = []; snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() }));
        window.todosOsDadosDoSistema[colecaoNome] = itens;

        if (colecaoNome === 'ramais') {
            if (abaAtual === 'contatos' || document.getElementById('sub-ramais')?.style.display !== 'none') {
                window.renderizarRamaisAgrupados();
            }
            return;
        }

        if(colecaoNome === 'colaboradores') {
            listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome));
            if(abaAtual === 'colaboradores') window.renderizarListaGenerica(colecaoNome);
            if(isAdmin && abaAtual === 'rh') window.renderizarDashboardRH();
        }
        if(colecaoNome === 'boletins') { window.todosBoletinsData = itens; if(abaAtual === 'boletins') { if(window.pastaBoletimAtual) window.renderizarListaBoletins(); else window.renderizarPastasBoletins(); } window.verificarUrgentesHome(); window.renderizarGraficoHome(); return; }
        if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = itens; if(abaAtual === 'boletins-privados') { if(window.pastaPrivadoAtual) window.renderizarListaPrivados(); else window.renderizarPastasPrivados(); } window.verificarUrgentesHome(); window.renderizarGraficoPrivadosGeral(); return; }
        if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = itens; if(window.alunoLogado) window.renderizarTrilhaAluno(); if(isAdmin && abaAtual === 'rh') window.renderizarDashboardRH(); }
        if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador && colecaoNome !== 'colaboradores') { window.dadosGlobaisAbas[colecaoNome] = itens; if(abaAtual === colecaoNome) { if(window[`pasta_${colecaoNome}_Atual`]) window.renderizarListaGenerica(colecaoNome); else window.renderizarPastasGenericas(colecaoNome); } return; }

        if(!grid) return;

        grid.style.display = 'grid'; grid.innerHTML = '';
        itens.sort((a, b) => { return String(a.data[configuracaoAbas[colecaoNome].campos[0]]).localeCompare(String(b.data[configuracaoAbas[colecaoNome].campos[0]])); }).forEach((item) => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
};

window.aplicarImagemClimaHome = function(imageUrl = '') {
    const weatherWidget = document.querySelector('.weather-widget');
    if (!weatherWidget) return;
    const bruto = window.formatarLinkImagem ? window.formatarLinkImagem(imageUrl) : imageUrl;
    const urlFormatada = String(bruto || '').trim();
    if (!urlFormatada) {
        weatherWidget.style.backgroundImage = '';
        weatherWidget.style.backgroundSize = '';
        weatherWidget.style.backgroundPosition = '';
        weatherWidget.style.backgroundRepeat = '';
        return;
    }
    weatherWidget.style.backgroundImage = `linear-gradient(rgba(30,60,114,0.72), rgba(30,60,114,0.72)), url("${urlFormatada}")`;
    weatherWidget.style.backgroundSize = 'cover';
    weatherWidget.style.backgroundPosition = 'center';
    weatherWidget.style.backgroundRepeat = 'no-repeat';
};

window.carregarConfiguracoes = function() {
    onSnapshot(doc(db, "configuracoes", "gerais"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const area = document.getElementById('banner-content');
            if(area) { if(data.banner_texto && data.banner_texto.trim() !== '') area.innerHTML = `<h2>${data.banner_texto.replace(/\n/g, '<br>')}</h2>`; else area.innerHTML = `<h2>Bem-vindo ao Painel Clínico</h2>`; }

            const mapIds = {
                'tab-input-banner': 'banner_texto', 'tab-input-locais': 'locais', 'tab-input-setores': 'setores',
                'tab-input-especialidades': 'especialidades', 'tab-input-motivos': 'motivos', 'tab-input-imagem-pastas': 'imagem_padrao_pastas',
                'tab-input-chat-logo': 'chat_logo', 'tab-color-chat': 'chat_cor', 'tab-color-pendente': 'cor_pendente', 'tab-color-concluido': 'cor_concluido', 'tab-input-weather-image': 'weather_image'
            };

            Object.keys(mapIds).forEach(id => {
                const el = document.getElementById(id);
                if(el && data[mapIds[id]] !== undefined) el.value = data[mapIds[id]];
            });

            const chatLogo = data.chat_logo || "https://cdn-icons-png.flaticon.com/512/8943/8943377.png";
            const chatCor = data.chat_cor || "#0ba360";
            document.documentElement.style.setProperty('--chat-primary', chatCor);

            const fabImg = document.getElementById('chat-fab-img'); const headerImg = document.getElementById('chat-header-img');
            const _chatLogoFinal = window.formatarLinkImagem(chatLogo) || chatLogo || './logo.png';
            if(fabImg){ fabImg.src = _chatLogoFinal; fabImg.onerror = () => { fabImg.src = './logo.png'; }; }
            if(headerImg){ headerImg.src = _chatLogoFinal; headerImg.onerror = () => { headerImg.src = './logo.png'; }; }
            window.aplicarImagemClimaHome(data.weather_image || '');

            window.corStatusPendente = data.cor_pendente || '#e53e3e'; window.corStatusConcluido = data.cor_concluido || '#38a169';

            locaisGlobais = data.locais ? data.locais.split('\n').filter(l => l.trim() !== '') : [];
            setoresGlobais = data.setores ? data.setores.split('\n').filter(s => s.trim() !== '') : [];
            especialidadesGlobais = data.especialidades ? data.especialidades.split('\n').filter(s => s.trim() !== '') : [];
            motivosGlobais = data.motivos ? data.motivos.split('\n').filter(m => m.trim() !== '') : [];

            if(abaAtual === 'boletins' && !window.pastaBoletimAtual) window.renderizarPastasBoletins();
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual) window.renderizarPastasPrivados();
        }
    });
};

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    const fab = document.getElementById('chat-fab');
    const input = document.getElementById('chat-input');
    if (!win || !fab) return;

    const abrindo = (win.style.display === 'none' || win.style.display === '');
    if (abrindo) {
        win.style.display = 'flex';
        if (typeof window.ocultarTooltipChatbot === 'function') window.ocultarTooltipChatbot();

        if (!window.chatJaInicializado) {
            if (typeof window.abrirSaudacaoChat === 'function') window.abrirSaudacaoChat();
            window.chatJaInicializado = true;
        } else {
            const body = document.getElementById('chat-body');
            if (body && body.innerHTML.trim() === '') {
                if (typeof window.abrirSaudacaoChat === 'function') window.abrirSaudacaoChat();
            }
        }
    } else {
        win.style.display = 'none';
    }
};

window.renderizarSugestoesChat = function() {
    const quickRepliesDiv = document.querySelector('.chat-quick-replies');
    if (!quickRepliesDiv) return;

    const termosPopulares = [
        { label: 'Cardiologia', icon: 'ri-heart-pulse-line' },
        { label: 'Ultrassom', icon: 'ri-pulse-line' },
        { label: 'Unimed', icon: 'ri-shield-cross-line' },
        { label: 'Raio-X', icon: 'ri-scan-2-line' },
        { label: 'Pediatria', icon: 'ri-user-heart-line' },
        { label: 'Ortopedia', icon: 'ri-wheelchair-line' },
        { label: 'Consulta', icon: 'ri-stethoscope-line' },
        { label: 'Boletim', icon: 'ri-newspaper-line' }
    ];

    termosPopulares.sort(() => 0.5 - Math.random());
    const top4 = termosPopulares.slice(0, 4);

    quickRepliesDiv.innerHTML = top4.map(item =>
        `<button type="button" onclick="window.sendQuickMsg('${item.label.replace(/'/g, "\\'")}')">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
        </button>`
    ).join('');
};

window.sendQuickMsg = function(texto) { const input = document.getElementById('chat-input'); if(input) { input.value = texto; window.sendChat(); } };
window.sendChat = function() {
    const input = document.getElementById('chat-input'); if(!input) return;
    const msg = input.value.trim(); if (!msg) return;
    window.addChatBubble(msg, 'user'); input.value = '';
    setTimeout(() => { const resposta = window.processarLogicaDoBot(msg); window.addChatBubble(resposta, 'bot'); }, 600);
};

window.addChatBubble = function(text, sender) { const chatArea = document.getElementById('chat-body'); if(!chatArea) return; const div = document.createElement('div'); div.className = `chat-msg ${sender}`; div.innerHTML = text; chatArea.appendChild(div); chatArea.scrollTop = chatArea.scrollHeight; };
window.handleChatFollowUp = function(resposta, btnElement) {
    if(btnElement && btnElement.parentElement) { btnElement.parentElement.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">Opção selecionada: ${resposta === 'sim' ? 'Sim' : 'Não'}</span>`; }
    if (resposta === 'sim') { window.addChatBubble("Pode escrever aqui abaixo que estou aqui para te ajudar! ", 'bot'); } else {
        const frasesMotivacionais = ["Ter uma inteligência artificial para ajudar é ótimo, mas lembre-se: conte sempre com o seu colega ao lado. O trabalho em equipe nos leva mais longe! ", "Que você tenha um excelente turno! A tecnologia agiliza, mas é o calor humano da nossa equipe que faz a clínica brilhar. ", "Agradeço a consulta! Juntos somos mais fortes. O sucesso é a soma do esforço de toda a equipe. Um abraço virtual! "];
        window.addChatBubble(frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)], 'bot');
    }
};

window.processarLogicaDoBot = function(mensagemUser) {
    const texto = mensagemUser.toLowerCase().trim();
    if (texto === 'oi' || texto === 'ol' || texto === 'ola' || texto.includes('bom dia') || texto.includes('boa tarde')) return "Olá! Sou a assistente virtual da clínica. Como posso ajudar? Busque por especialidades, médicos ou exames!";
    let resultadosUnicos = {};
    ['corpo-clinico', 'ultrassom', 'exames-imagem', 'consultas', 'convenios', 'ramais', 'pacotes', 'institutos', 'boletins'].forEach(colecao => {
        const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
        itens.forEach(item => {
            let textoItem = ""; Object.entries(item.data).forEach(([key, val]) => { textoItem += `${key} ${val} `; }); textoItem = textoItem.toLowerCase();
            let matches = false;
            if (texto === 'unimed' || texto === 'convênio' || texto === 'convenio') {
                if ((item.data['Unimed'] && item.data['Unimed'].toString().toLowerCase() !== 'não' && item.data['Unimed'].toString().toLowerCase() !== 'nao') || (item.data['Convênios Aceitos'] && String(item.data['Convênios Aceitos']).toLowerCase().includes('unimed')) || (item.data['Convênios'] && String(item.data['Convênios']).toLowerCase().includes('unimed')) || colecao === 'convenios') matches = true;
            } else if (textoItem.includes(texto)) { matches = true; }

            if(colecao === 'boletins' && (String(item.data['Título do Informativo'] || '').toLowerCase().includes(texto) || String(item.data['Motivo'] || '').toLowerCase().includes(texto) || String(item.data['Para quais Setores?'] || '').toLowerCase().includes(texto))) matches = true;

            if (matches) {
                const config = configuracaoAbas[colecao];
                let tituloItem = item.data[config.campos[0]] || 'Detalhes'; let detalhesStr = '';
                if(colecao === 'boletins') tituloItem = `Boletim: ${item.data['Título do Informativo']}`;

                let profissionais = item.data['Profissionais que realizam (Opcional)'];
                if(profissionais && profissionais.trim() !== '') {
                    detalhesStr += `<div style="background:#eefbf4; padding:8px; border-radius:8px; margin-bottom:8px; border-left:3px solid #38a169;"><b>️ Quem realiza:</b> ${profissionais}</div>`;
                }

                let cont = 0;
                Object.entries(item.data).forEach(([k, v]) => { if(v && k !== config.campos[0] && k !== 'corCard' && !String(k).includes('Link') && k !== 'Profissionais que realizam (Opcional)' && cont < 2) { detalhesStr += `<b>${k}:</b> ${v}<br>`; cont++; } });

                let pastaAgrupadora = config.campoAgrupador ? item.data[config.campoAgrupador] : null; let btnAction = '';

                if (pastaAgrupadora && colecao !== 'colaboradores') {
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.abrirPastaGenerica('${colecao}', '${pastaAgrupadora.replace(/'/g, "\\'")}', '${item.id}') }, 200); window.toggleChat();" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-folder-open-line"></i> Ver na Pasta</button>`;
                }
                else if (colecao === 'boletins') {
                    const setorBoletim = item.data['Para quais Setores?'] ? String(item.data['Para quais Setores?']).split(',')[0] : 'Geral';
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.abrirPastaBoletim('${setorBoletim.replace(/'/g, "\\'")}', '${item.id}') }, 200); window.toggleChat();" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-folder-open-line"></i> Abrir Boletim</button>`;
                }
                else {
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.destacarCard('${item.id}') }, 300); window.toggleChat();" class="btn-hover color-8" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-arrow-right-circle-line"></i> Localizar na Aba</button>`;
                }

                resultadosUnicos[item.id] = `<div style="background: white; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);"><div style="font-weight: 700; color: var(--primary-color); margin-bottom: 5px; font-size: 14px; line-height: 1.2;">${tituloItem}</div><div style="font-size: 12px; color: var(--text-main); line-height: 1.4;">${detalhesStr}</div>${btnAction}</div>`;
            }
        });
    });

    let resultadosEncontrados = Object.values(resultadosUnicos);
    if (resultadosEncontrados.length > 0) {
        let respostaFormatada = `Encontrei isso no sistema para <b>"${mensagemUser}"</b>:<br><br>`;
        const limite = resultadosEncontrados.slice(0, 3); respostaFormatada += limite.join('');
        if (resultadosEncontrados.length > 3) { respostaFormatada += `<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:5px;">+${resultadosEncontrados.length - 3} resultados ocultos.</div><br>`; }
        const dicas = ["Dica: Se o paciente precisar de exames, pesquise o nome do exame que eu te digo qual médico faz! ", "Você também pode pesquisar por Convênios para ver as regras de atendimento!", "Na dúvida? Pesquise pelo setor e eu te mostro os ramais."];
        respostaFormatada += `<div style="background: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 11px; margin-top: 10px; border-left: 3px solid var(--primary-color);"> <b>Dica:</b> ${dicas[Math.floor(Math.random() * dicas.length)]}</div>`;
        return respostaFormatada;
    }
    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. <br><br>Tente pesquisar por uma palavra-chave mais simples, como o nome de um exame ou especialidade!";
};

if (!document.getElementById('modal-resposta-aluno')) {
    const m = document.createElement('div'); m.id = 'modal-resposta-aluno'; m.className = 'modal-overlay'; m.style.display = 'none'; m.style.zIndex = '10001';
    m.innerHTML = `<div class="modal-box glass-effect" style="max-width: 720px; max-height: 90vh; display:flex; flex-direction:column;"><header class="modal-header"><h3 id="resposta-titulo">Responder Atividade</h3><button id="btn-fechar-resposta-aluno" onclick="window.tentarFecharModalRespostaAluno()" class="btn-icon"><i class="ri-close-line"></i></button></header><div id="aviso-prova-bloqueada" style="display:none; padding: 0 20px;"></div><div class="modal-body" style="overflow-y: auto; flex:1;" id="area-perguntas-dinamicas"></div><input type="hidden" id="resposta-docid"><div style="display:flex; gap:10px; margin-top: 15px;"><button id="btn-pausar-treinamento" onclick="window.pausarSessaoTreinamento()" class="btn-hover color-8" style="display:none; flex:1; background:#dd6b20; color:white; border:none;"><i class="ri-pause-circle-line"></i> Pausar</button><button id="btn-enviar-resposta-treinamento" onclick="window.enviarRespostaTreinamento()" class="btn-hover color-11" style="flex:2; background: #3182ce; color:white; border:none;"><i class="ri-send-plane-fill"></i> Enviar Resposta para Correção</button></div></div>`;
    document.body.appendChild(m);
}

if (!document.getElementById('modal-correcao-admin')) {
    const c = document.createElement('div'); c.id = 'modal-correcao-admin'; c.className = 'modal-overlay'; c.style.display = 'none'; c.style.zIndex = '10005';
    c.innerHTML = `<div class="modal-box glass-effect" style="max-width: 680px; max-height: 90vh; display:flex; flex-direction:column;"><header class="modal-header"><h3>Corrigir Resposta</h3><button onclick="document.getElementById('modal-correcao-admin').style.display='none'; document.getElementById('modal-leituras').style.display='flex';" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body" style="overflow-y: auto; flex:1;"><div id="correcao-resumo-auto" style="display:none; margin-bottom:12px; background:#eff6ff; border:1px solid #93c5fd; padding:12px; border-radius:10px; font-size:13px; color:#1d4ed8;"></div><div id="correcao-respostas-aluno" style="margin-bottom:15px; background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; font-size:13px; white-space:pre-wrap;"></div><label style="font-size:12px; font-weight:600;">Pontos manuais / ajuste do gestor:</label><input type="number" id="correcao-nota" class="form-input" step="0.5" style="margin-bottom:10px;"><label style="font-size:12px; font-weight:600;">Feedback / Observação do Gestor:</label><textarea id="correcao-feedback" class="form-input" style="height:80px; resize:vertical;"></textarea><input type="hidden" id="correcao-docid"><input type="hidden" id="correcao-nomealuno"><input type="hidden" id="correcao-auto-base" value="0"></div><button onclick="window.salvarCorrecaoAdmin()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #38a169; color:white; border:none;"><i class="ri-check-line"></i> Salvar Correção</button></div>`;
    document.body.appendChild(c);
}

if (!document.getElementById('modal-feedback-aluno')) {
    const fb = document.createElement('div'); fb.id = 'modal-feedback-aluno'; fb.className = 'modal-overlay'; fb.style.display = 'none'; fb.style.zIndex = '10002';
    fb.innerHTML = `<div class="modal-box glass-effect" style="max-width: 500px;"><header class="modal-header"><h3>Feedback do Supervisor</h3><button onclick="document.getElementById('modal-feedback-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body"><div style="text-align:center; margin-bottom:15px;"><div style="font-size:40px; color:#38a169;"><i class="ri-award-fill"></i></div><h2 style="color:var(--primary-color);">Nota: <span id="feedback-nota"></span></h2></div><div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; color: var(--text-main); border-left: 4px solid var(--primary-color);"><span id="feedback-texto" style="white-space: pre-wrap;"></span></div></div></div>`;
    document.body.appendChild(fb);
}


window.verFeedback = function(nota, feedback) {
    const notaEl = document.getElementById('feedback-nota');
    const textoEl = document.getElementById('feedback-texto');
    const modal = document.getElementById('modal-feedback-aluno');

    if (!notaEl || !textoEl || !modal) {
        alert('Modal de feedback não encontrado.');
        return;
    }

    notaEl.textContent = nota ?? '-';
    textoEl.innerHTML = String(feedback || 'Sem comentários.').replace(/\n/g, '<br>');
    modal.style.display = 'flex';
};

window.verCorrecaoAluno = function(docId) {
    if (!window.alunoLogado) return;

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const atividade = window.todosTreinamentosData.find(i => i.id === docId)?.data;
    if (!atividade) return alert('Atividade não encontrada.');

    let minhaResposta = null;
    (atividade.respostas_alunos || []).forEach(raw => {
        const obj = window.safeParseJSON(raw, null);
        if (obj && obj.nome === nomeAluno) minhaResposta = obj;
    });

    if (!minhaResposta) return alert('Correção não encontrada.');

    const notaEl = document.getElementById('feedback-nota');
    const textoEl = document.getElementById('feedback-texto');
    const modal = document.getElementById('modal-feedback-aluno');

    if (!notaEl || !textoEl || !modal) {
        alert('Modal de feedback não encontrado.');
        return;
    }

    notaEl.textContent = minhaResposta.nota ?? '-';

    let html = `
        <div style="margin-bottom:12px;">
            <strong>Nota final:</strong> ${minhaResposta.nota ?? '-'}<br>
            <strong>Feedback:</strong><br>${window.escapeHTML(minhaResposta.feedback || 'Sem comentários.').replace(/\n/g, '<br>')}
        </div>
    `;

    (minhaResposta.respostas || []).forEach((r, i) => {
        const detalhe = (minhaResposta.correcao_detalhes || [])[i] || {};
        html += `
            <div style="margin-top:10px; padding:10px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc;">
                <div><strong>Questão ${i + 1}:</strong> ${window.escapeHTML(r.pergunta || '-')}</div>
                <div style="margin-top:6px;"><strong>Sua resposta:</strong> ${window.escapeHTML(r.resposta || '-')}</div>
                ${
                    detalhe.tipo === 'multipla'
                        ? `<div style="margin-top:6px;"><strong>Gabarito:</strong> ${window.escapeHTML(detalhe.correta || '-')} | <strong>Resultado:</strong> ${detalhe.acertou ? 'Correta' : 'Incorreta'}</div>`
                        : ''
                }
            </div>
        `;
    });

    textoEl.innerHTML = html;
    modal.style.display = 'flex';
};

window.sessaoTreinamentoAtiva = null;
window._timerAutosaveTreinamento = null;
window._ultimoEventoInfracaoTreinamento = 0;

window.obterTipoTreinamento = function(data = {}) { return String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo'); };
window.obterModoControleTreinamento = function(data = {}) {
    const modoExpl = String(data['Modo de Controle'] || '').trim();
    if (modoExpl) return modoExpl;
    const tipo = window.obterTipoTreinamento(data);
    if (tipo.includes('Prova')) return 'prova_bloqueada';
    if (tipo.includes('Tarefa')) return 'atividade_com_pausa';
    return 'material_apenas_leitura';
};
window.permitePausaTreinamento = function(data = {}) {
    const campo = String(data['Permite Pausa?'] || '').trim();
    if (campo) return campo === 'Sim';
    return window.obterModoControleTreinamento(data) === 'atividade_com_pausa';
};
window.obterLimiteInfracoesTreinamento = function(data = {}) {
    const n = parseInt(data['Limite de Infrações'], 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
};
window.obterRegraSaidaTreinamento = function(data = {}) {
    const regra = String(data['Regra ao Sair'] || '').trim();
    if (regra === 'zerada_por_saida' || regra === 'inconclusa') return regra;
    return window.obterModoControleTreinamento(data) === 'prova_bloqueada' ? 'zerada_por_saida' : 'inconclusa';
};
window.listarProgressoTreinamento = function(data = {}) {
    return (Array.isArray(data.progresso_alunos) ? data.progresso_alunos : []).map(raw => window.safeParseJSON(raw, null)).filter(Boolean);
};
window.obterProgressoAlunoTreinamento = function(data = {}, nome = '') {
    return window.listarProgressoTreinamento(data).find(p => String(p.nome || '') === String(nome || '')) || null;
};
window._atualizarCacheLocalProgressoTreinamento = function(docId, nome, novoObj) {
    const item = window.todosTreinamentosData.find(i => i.id === docId);
    if (!item) return;
    const rawNovo = JSON.stringify(novoObj);
    let lista = Array.isArray(item.data.progresso_alunos) ? item.data.progresso_alunos.slice() : [];
    let achou = false;
    lista = lista.map(raw => {
        const obj = window.safeParseJSON(raw, null);
        if (obj && String(obj.nome || '') === String(nome || '')) { achou = true; return rawNovo; }
        return raw;
    });
    if (!achou) lista.push(rawNovo);
    item.data.progresso_alunos = lista;
};
window.salvarProgressoTreinamento = async function(docId, nome, patch = {}) {
    const item = window.todosTreinamentosData.find(i => i.id === docId);
    const data = item?.data || {};
    const listaRaw = Array.isArray(data.progresso_alunos) ? data.progresso_alunos : [];
    let antigoRaw = null; let antigoObj = null;
    listaRaw.forEach(raw => {
        const obj = window.safeParseJSON(raw, null);
        if (obj && String(obj.nome || '') === String(nome || '')) { antigoRaw = raw; antigoObj = obj; }
    });
    const atualizado = { nome, status: 'pendente', tentativas: 0, infracoes: 0, ultima_interacao_em: new Date().toLocaleString('pt-BR'), ...antigoObj, ...patch, ultima_interacao_em: patch.ultima_interacao_em || new Date().toLocaleString('pt-BR') };
    const ref = window.doc(window.db, 'treinamentos', docId);
    if (antigoRaw) await window.updateDoc(ref, { progresso_alunos: window.arrayRemove(antigoRaw) });
    await window.updateDoc(ref, { progresso_alunos: window.arrayUnion(JSON.stringify(atualizado)) });
    window._atualizarCacheLocalProgressoTreinamento(docId, nome, atualizado);
    return atualizado;
};
window.capturarRespostasModalTreinamento = function() {
    const blocos = document.querySelectorAll('.pergunta-aluno-bloco');
    const respostas = [];
    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.resp-tipo')?.value || 'descritiva';
        const pergunta = bloco.querySelector('.resp-pergunta-txt')?.value || '';
        let resposta = '';
        if (tipo === 'descritiva') resposta = bloco.querySelector('.resp-valor')?.value.trim() || '';
        else {
            const checked = bloco.querySelector('.resp-radio:checked');
            resposta = checked ? checked.value : '';
        }
        respostas.push({ pergunta, resposta });
    });
    return respostas;
};
window.preencherRascunhoTreinamento = function(rascunho = []) {
    const blocos = document.querySelectorAll('.pergunta-aluno-bloco');
    blocos.forEach((bloco, idx) => {
        const item = rascunho[idx]; if (!item) return;
        const tipo = bloco.querySelector('.resp-tipo')?.value || 'descritiva';
        if (tipo === 'descritiva') {
            const ta = bloco.querySelector('.resp-valor'); if (ta) ta.value = item.resposta || '';
        } else {
            bloco.querySelectorAll('.resp-radio').forEach(r => { if (r.value === item.resposta) r.checked = true; });
        }
    });
};
window.atualizarAvisoSessaoTreinamentoUI = function(itemData = null, progresso = null) {
    const aviso = document.getElementById('aviso-prova-bloqueada');
    const btnPausar = document.getElementById('btn-pausar-treinamento');
    const btnFechar = document.getElementById('btn-fechar-resposta-aluno');
    const btnEnviar = document.getElementById('btn-enviar-resposta-treinamento');
    if (!aviso || !btnPausar || !btnFechar || !btnEnviar) return;
    if (!itemData) {
        aviso.style.display = 'none'; btnPausar.style.display = 'none'; btnFechar.style.display = 'inline-flex'; btnEnviar.innerHTML = '<i class="ri-send-plane-fill"></i> Enviar Resposta para Correção';
        return;
    }
    const modo = window.obterModoControleTreinamento(itemData);
    const limite = window.obterLimiteInfracoesTreinamento(itemData);
    const infracoes = progresso?.infracoes || 0;
    const podePausar = window.permitePausaTreinamento(itemData);
    if (modo === 'prova_bloqueada') {
        aviso.style.display = 'block';
        aviso.innerHTML = `<div style="background:#fff7ed; border:1px solid #fdba74; color:#9a3412; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:12px;"><b>Modo prova bloqueada:</b> trocar de aba, minimizar ou navegar pelo sistema gera advertência. Limite: <b>${limite}</b>. Advertências: <b>${infracoes}</b>.</div>`;
        btnPausar.style.display = 'none'; btnFechar.style.display = 'none'; btnEnviar.innerHTML = '<i class="ri-shield-check-line"></i> Finalizar Prova';
    } else {
        aviso.style.display = 'block';
        aviso.innerHTML = `<div style="background:#eff6ff; border:1px solid #93c5fd; color:#1d4ed8; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:12px;"><b>Atividade controlada:</b> seu progresso é salvo automaticamente.${podePausar ? ' Você pode pausar e retomar depois.' : ''}</div>`;
        btnPausar.style.display = podePausar ? 'inline-flex' : 'none'; btnFechar.style.display = 'inline-flex'; btnEnviar.innerHTML = '<i class="ri-send-plane-fill"></i> Enviar Resposta para Correção';
    }
};
window.desativarSessaoTreinamento = function() {
    window.sessaoTreinamentoAtiva = null;
    if (window._timerAutosaveTreinamento) { clearTimeout(window._timerAutosaveTreinamento); window._timerAutosaveTreinamento = null; }
    window.atualizarAvisoSessaoTreinamentoUI();
};
window.agendarAutosaveTreinamento = function() {
    if (!window.sessaoTreinamentoAtiva) return;
    if (window._timerAutosaveTreinamento) clearTimeout(window._timerAutosaveTreinamento);
    window._timerAutosaveTreinamento = setTimeout(() => window.salvarRascunhoTreinamento(), 500);
};
window.salvarRascunhoTreinamento = async function() {
    const sessao = window.sessaoTreinamentoAtiva;
    if (!sessao || !window.alunoLogado) return;
    try {
        const progresso = await window.salvarProgressoTreinamento(sessao.docId, sessao.nomeAluno, { status: sessao.modoControle === 'prova_bloqueada' ? 'em_andamento' : (sessao.progresso?.status === 'pausada' ? 'pausada' : 'em_andamento'), tentativas: sessao.progresso?.tentativas || 1, infracoes: sessao.progresso?.infracoes || 0, rascunho: window.capturarRespostasModalTreinamento() });
        sessao.progresso = progresso;
    } catch(e) { console.error('Erro ao salvar rascunho', e); }
};
window.inicializarGuardaTreinamento = function() {
    if (window.__guardaTreinamentoInit) return;
    window.__guardaTreinamentoInit = true;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') window.registrarInfracaoTreinamento('Mudou de aba ou minimizou a janela'); });
    window.addEventListener('beforeunload', function(e) {
        const sessao = window.sessaoTreinamentoAtiva;
        if (!sessao || sessao.modoControle !== 'prova_bloqueada') return;
        e.preventDefault(); e.returnValue = ''; return '';
    });
    document.addEventListener('click', function(e) {
        const sessao = window.sessaoTreinamentoAtiva;
        if (!sessao || sessao.modoControle !== 'prova_bloqueada') return;
        const nav = e.target.closest('.nav-btn, #btn-logout');
        if (nav) {
            const tab = nav.getAttribute('data-tab');
            if (tab !== 'ensino') {
                e.preventDefault(); e.stopPropagation();
                alert('Você não pode sair da prova antes de concluir.');
                window.registrarInfracaoTreinamento('Tentou navegar para outra aba do sistema');
            }
        }
    }, true);
};
window.registrarInfracaoTreinamento = async function(motivo = 'Saiu da prova') {
    const sessao = window.sessaoTreinamentoAtiva;
    if (!sessao || sessao.modoControle !== 'prova_bloqueada') return;
    const modal = document.getElementById('modal-resposta-aluno');
    if (!modal || modal.style.display === 'none') return;
    const agora = Date.now();
    if (sessao.guardGraceUntil && agora < sessao.guardGraceUntil) return;
    if (agora - window._ultimoEventoInfracaoTreinamento < 1500) return;
    window._ultimoEventoInfracaoTreinamento = agora;
    const novoTotal = (sessao.progresso?.infracoes || 0) + 1;
    const progresso = await window.salvarProgressoTreinamento(sessao.docId, sessao.nomeAluno, { status: 'em_andamento', tentativas: sessao.progresso?.tentativas || 1, infracoes: novoTotal, ultimo_evento: motivo, rascunho: window.capturarRespostasModalTreinamento() });
    sessao.progresso = progresso;
    window.atualizarAvisoSessaoTreinamentoUI(sessao.itemData, progresso);
    if (novoTotal >= sessao.limiteInfracoes) await window.finalizarSessaoTreinamentoPorSaida(`Limite de advertências atingido. ${motivo}`);
    else alert(`Advertência ${novoTotal}/${sessao.limiteInfracoes}. Motivo: ${motivo}`);
};
window.finalizarSessaoTreinamentoPorSaida = async function(motivo = 'Saiu da atividade') {
    const sessao = window.sessaoTreinamentoAtiva;
    if (!sessao) return;
    await window.salvarProgressoTreinamento(sessao.docId, sessao.nomeAluno, { status: sessao.regraSaida, tentativas: sessao.progresso?.tentativas || 1, infracoes: sessao.progresso?.infracoes || 0, motivo_saida: motivo, rascunho: window.capturarRespostasModalTreinamento() });
    document.getElementById('modal-resposta-aluno').style.display = 'none';
    window.desativarSessaoTreinamento();
    window.renderizarTrilhaAluno();
    alert(sessao.regraSaida === 'zerada_por_saida' ? 'A tentativa foi zerada por saída indevida.' : 'A atividade foi marcada como inconclusa.');
};
window.pausarSessaoTreinamento = async function() {
    const sessao = window.sessaoTreinamentoAtiva;
    if (!sessao) return;
    if (!sessao.permitePausa) return alert('Esta atividade não permite pausa.');
    await window.salvarProgressoTreinamento(sessao.docId, sessao.nomeAluno, { status: 'pausada', tentativas: sessao.progresso?.tentativas || 1, infracoes: sessao.progresso?.infracoes || 0, rascunho: window.capturarRespostasModalTreinamento() });
    document.getElementById('modal-resposta-aluno').style.display = 'none';
    window.desativarSessaoTreinamento();
    window.renderizarTrilhaAluno();
    alert('Atividade pausada com sucesso.');
};
window.tentarFecharModalRespostaAluno = async function() {
    const sessao = window.sessaoTreinamentoAtiva;
    if (!sessao) { document.getElementById('modal-resposta-aluno').style.display = 'none'; return; }
    if (sessao.modoControle === 'prova_bloqueada') {
        if (!confirm('Sair agora encerrará esta prova conforme a regra configurada. Deseja continuar?')) return;
        await window.finalizarSessaoTreinamentoPorSaida('Fechou a prova antes de concluir');
        return;
    }
    if (sessao.permitePausa) { await window.pausarSessaoTreinamento(); return; }
    document.getElementById('modal-resposta-aluno').style.display = 'none';
    window.desativarSessaoTreinamento();
};
window.abrirCadastroProva = function() {
    window.abrirModal('treinamentos');
    setTimeout(() => {
        const tipo = document.getElementById('input-Tipo (Vídeo, PDF, Tarefa, Prova)');
        const modo = document.getElementById('input-Modo de Controle');
        const pausa = document.getElementById('input-Permite Pausa?');
        const limite = document.getElementById('input-Limite de Infrações');
        const regra = document.getElementById('input-Regra ao Sair');
        if (tipo) tipo.value = 'Prova Múltipla Escolha';
        if (modo) modo.value = 'prova_bloqueada';
        if (pausa) pausa.value = 'Não';
        if (limite) limite.value = '3';
        if (regra) regra.value = 'zerada_por_saida';
        const lista = document.getElementById('quiz-questions-list');
        if (lista && !lista.children.length) {
            window.adicionarPerguntaBuilder('multipla');
        }
    }, 80);
};
window.inicializarGuardaTreinamento();

window.abrirListaLeituras = function(docId, colecao) {
    const modal = document.getElementById('modal-leituras');
    const titulo = document.getElementById('modal-leitura-titulo');
    const areaOk = document.getElementById('lista-lidos-content');
    const areaPend = document.getElementById('lista-falta-content');
    if(!modal || !titulo || !areaOk || !areaPend) return;

    let data = null;
    if(colecao === 'treinamentos') data = window.todosTreinamentosData.find(item => item.id === docId)?.data || null;
    else if(colecao === 'boletins') data = window.todosBoletinsData.find(item => item.id === docId)?.data || null;
    else if(colecao === 'boletins-privados') data = window.todosPrivadosData.find(item => item.id === docId)?.data || null;
    if(!data) return alert('Não localizei este registro atualizado.');

    const renderEmpty = (texto) => `<div style="padding:12px; border:1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); background:#f8fafc;">${texto}</div>`;
    const cardBase = (conteudo, cor='#cbd5e1') => `<div style="padding:12px; border-radius:12px; background:#fff; border-left:4px solid ${cor}; margin-bottom:10px; box-shadow:var(--shadow-soft);">${conteudo}</div>`;

    areaOk.innerHTML = '';
    areaPend.innerHTML = '';

    if(colecao === 'treinamentos') {
        titulo.textContent = `Respostas da atividade: ${data['Título da Atividade'] || 'Treinamento'}`;
        const publico = window.obterPublicoAlvo(data['Para quais Setores?'], data['Colaborador Específico (Opcional)']);
        const respostas = (data.respostas_alunos || []).map(item => window.safeParseJSON(item)).filter(Boolean);
        const respondidos = new Set();

        respostas.forEach(resp => {
            respondidos.add(resp.nome);
            const nota = (resp.nota !== '' && resp.nota !== undefined && resp.nota !== null) ? `<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:700;">Nota: ${resp.nota}</span>` : `<span style="background:#fef3c7; color:#92400e; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:700;">Aguardando correção</span>`;
            const nomeEscapado = String(resp.nome || '').replace(/'/g, "\\'");
            const btnCorrigir = isAdmin ? `<button onclick="window.abrirCorrecaoAdmin('${docId}', '${nomeEscapado}')" class="btn-hover color-8" style="height:32px; font-size:11px; padding:0 14px; margin-top:10px;"><i class="ri-edit-2-line"></i> ${resp.nota !== '' ? 'Revisar correção' : 'Corrigir resposta'}</button>` : '';
            areaOk.innerHTML += cardBase(`
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                    <div>
                        <strong style="display:block; color:var(--text-main);">${window.escapeHTML(resp.nome || 'Colaborador')}</strong>
                        <span style="font-size:12px; color:var(--text-muted);">Enviado em: ${window.escapeHTML(resp.data || '-')}</span>
                    </div>
                    ${nota}
                </div>
                <div style="margin-top:10px; font-size:12px; color:var(--text-muted);">${(resp.respostas || []).length} resposta(s) enviada(s).</div>
                ${btnCorrigir}
            `, '#38a169');
        });

        if(!respostas.length) areaOk.innerHTML = renderEmpty('Nenhuma resposta enviada ainda.');

        const faltantes = publico.filter(nome => !respondidos.has(nome));
        areaPend.innerHTML = faltantes.length
            ? faltantes.map(nome => cardBase(`<strong style="display:block; color:var(--text-main);">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:var(--text-muted);">Ainda não enviou a atividade.</span>`, '#e53e3e')).join('')
            : renderEmpty('Todos os colaboradores do público-alvo já responderam.');
    } else {
        const publico = colecao === 'boletins-privados'
            ? [String(data['Para qual Colaborador?'] || '').trim()].filter(Boolean)
            : window.obterPublicoAlvo(data['Para quais Setores?']);
        titulo.textContent = `${colecao === 'boletins-privados' ? 'Leitura do informativo direto' : 'Leitura do boletim'}: ${data['Título do Documento'] || data['Título do Informativo'] || 'Documento'}`;
        const leituras = (data.leituras || []).filter(Boolean);
        const lidosMap = new Map();
        leituras.forEach(registro => lidosMap.set(window.extrairNomeRegistro(registro), registro));

        const lidos = publico.filter(nome => lidosMap.has(nome));
        const faltantes = publico.filter(nome => !lidosMap.has(nome));

        areaOk.innerHTML = lidos.length
            ? lidos.map(nome => {
                const registroCompleto = lidosMap.get(nome) || '';
                const btnDesfazer = isAdmin ? `<button onclick="window.removerAssinaturaLeitura('${docId}', '${colecao}', '${registroCompleto.replace(/'/g, "\\'")}')" style="margin-top:5px; background:none; border:none; color:#e53e3e; cursor:pointer; font-size:11px; text-decoration:underline;"><i class="ri-arrow-go-back-line"></i> Desfazer assinatura</button>` : '';
                return cardBase(`<strong style="display:block; color:var(--text-main);">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:var(--text-muted);">${window.escapeHTML(registroCompleto)}</span><br>${btnDesfazer}`, '#38a169');
            }).join('')
            : renderEmpty('Nenhuma leitura registrada até o momento.');

        areaPend.innerHTML = faltantes.length
            ? faltantes.map(nome => cardBase(`<strong style="display:block; color:var(--text-main);">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:var(--text-muted);">Leitura pendente.</span>`, '#e53e3e')).join('')
            : renderEmpty('Nenhuma pendência restante.');
    }

    modal.style.display = 'flex';
};

window.sairPortalAluno = async function() {
    if (window.sessaoTreinamentoAtiva && window.sessaoTreinamentoAtiva.modoControle === 'prova_bloqueada') {
        alert('Finalize a prova antes de sair do Portal do Aluno.');
        return;
    }
    if (window.sessaoTreinamentoAtiva && window.sessaoTreinamentoAtiva.permitePausa) {
        await window.pausarSessaoTreinamento();
    }
    window.alunoLogado = null;
    document.getElementById('ensino-dashboard-area').style.display = 'none';
    document.getElementById('ensino-login-area').style.display = 'block';
    document.getElementById('login-aluno-pin').value = '';
};

window.renderizarTrilhaAluno = function() {
    if(!window.alunoLogado) return;
    const grid = document.getElementById('grid-trilha-aluno'); if(!grid) return; grid.innerHTML = '';
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

    let pontos = 0; let pendentes = 0;
    const treinamentosAluno = window.todosTreinamentosData.filter(item => {
        const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
        const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
        if (colabAlvo && colabAlvo !== '' && !colabAlvo.includes('Nenhum')) return colabAlvo === nomeAluno;
        return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
    });

    if(treinamentosAluno.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); background: white; padding: 20px; border-radius: 10px;">Sem treinamentos pendentes. Parabéns! </p>'; }

    treinamentosAluno.forEach(item => {
        const d = item.data; const docId = item.id;
        const respostas = d.respostas_alunos || [];
        let minhaResposta = null; respostas.forEach(r => { try { let obj = window.safeParseJSON(r, null); if(obj && obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });
        const progresso = window.obterProgressoAlunoTreinamento(d, nomeAluno);
        const statusProgresso = String(progresso?.status || 'pendente');
        const concluidos = d.leituras || []; const jaLeu = concluidos.some(txt => txt.startsWith(nomeAluno));
        const tipo = d['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo';
        const precisaResponder = tipo && (tipo.includes('Tarefa') || tipo.includes('Prova'));
        const pontosItem = parseInt(d['Pontos Valendo']) || 0;
        const modoControle = window.obterModoControleTreinamento(d);
        const limite = window.obterLimiteInfracoesTreinamento(d);

        let statusTexto = 'Pendente'; let corStatus = '#e53e3e'; let iconeStatus = 'ri-time-line'; let bloqueado = false;
        if(precisaResponder) {
            if (statusProgresso === 'zerada_por_saida') { statusTexto = 'Zerada por saída'; corStatus = '#c53030'; iconeStatus = 'ri-close-circle-fill'; bloqueado = true; }
            else if (statusProgresso === 'inconclusa') { statusTexto = 'Inconclusa'; corStatus = '#dd6b20'; iconeStatus = 'ri-error-warning-line'; bloqueado = modoControle === 'prova_bloqueada'; if (!bloqueado) pendentes++; }
            else if(minhaResposta) {
                if((minhaResposta.nota !== '' && minhaResposta.nota !== undefined && minhaResposta.nota !== null) || (minhaResposta.nota_total_calculada !== '' && minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== null)) { const notaExibir = minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== '' ? minhaResposta.nota_total_calculada : minhaResposta.nota; statusTexto = `Corrigido (Nota: ${notaExibir})`; corStatus = '#38a169'; iconeStatus = 'ri-award-fill'; pontos += parseFloat(notaExibir) || 0; }
                else { statusTexto = 'Aguardando Correção'; corStatus = '#ecc94b'; iconeStatus = 'ri-hourglass-line'; }
            } else if (statusProgresso === 'pausada') { statusTexto = 'Pausada'; corStatus = '#dd6b20'; iconeStatus = 'ri-pause-circle-line'; pendentes++; }
            else if (statusProgresso === 'em_andamento') { statusTexto = modoControle === 'prova_bloqueada' ? `Em andamento (${progresso?.infracoes || 0}/${limite} advert.)` : 'Em andamento'; corStatus = '#3182ce'; iconeStatus = 'ri-play-circle-line'; pendentes++; }
            else { pendentes++; }
        } else {
            if(jaLeu) { statusTexto = 'Concluído'; corStatus = '#38a169'; iconeStatus = 'ri-check-double-line'; pontos += pontosItem; }
            else { pendentes++; }
        }

        let btnAcao = '';
        if(d['Link do Material (Se houver)']) btnAcao += `<button onclick="window.abrirMidiaFlutuante('${String(d['Link do Material (Se houver)']).trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-bottom: 8px;"><i class="ri-eye-line"></i> Acessar Material</button>`;

        if(precisaResponder) {
            if (!minhaResposta && !bloqueado) {
                const label = statusProgresso === 'pausada' || statusProgresso === 'em_andamento'
                    ? (modoControle === 'prova_bloqueada' ? 'Retomar Prova' : 'Continuar Atividade')
                    : (modoControle === 'prova_bloqueada' ? 'Iniciar Prova' : 'Responder Atividade');
                btnAcao += `<button onclick="window.abrirModalResposta('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> ${label}</button>`;
            } else if (bloqueado) {
                btnAcao += `<div style="font-size:12px; padding:10px; border-radius:8px; background:#fff5f5; color:#c53030; border:1px solid #fed7d7;"><i class="ri-alert-line"></i> Tentativa encerrada. Procure a gestão caso precise de liberação.</div>`;
            } else if (minhaResposta && ((minhaResposta.nota !== '' && minhaResposta.nota !== undefined && minhaResposta.nota !== null) || (minhaResposta.nota_total_calculada !== '' && minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== null))) {
                btnAcao += `<button onclick="window.verCorrecaoAluno('${docId}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
            }
        } else if (!jaLeu) {
            btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
        }

        grid.innerHTML += `<div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;"><div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> MÓDULO: ${d['Pasta / Módulo']} | TIPO: ${tipo}</div><div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade']}</div><div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;"><b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br><b>Status:</b> <span style="color:${corStatus}; font-weight:600;"><i class="${iconeStatus}"></i> ${statusTexto}</span></div>${btnAcao}</div>`;
    });

    const ptsEl = document.getElementById('aluno-pontos'); const pendEl = document.getElementById('aluno-tarefas-pendentes');
    if(ptsEl) ptsEl.textContent = pontos; if(pendEl) pendEl.textContent = pendentes;
    if(window.renderizarPesquisasAluno) window.renderizarPesquisasAluno();
};

window.concluirTreinamento = async function(docId) {
    if(!window.alunoLogado) return;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?
Ao confirmar, os pontos serão computados na sua jornada.`)) return;
    const registro = `${nomeAluno} (Concluído em: ${new Date().toLocaleString('pt-BR')})`;
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registro) });
        await window.salvarProgressoTreinamento(docId, nomeAluno, { status: 'concluida' });
        alert("Concluído com sucesso! +XP ");
    } catch(e) { alert("Erro ao salvar: " + e.message); }
};

window.abrirModalResposta = async function(docId) {
    if (!window.alunoLogado) return;
    if (window.sessaoTreinamentoAtiva && window.sessaoTreinamentoAtiva.docId !== docId) {
        alert('Finalize ou pause a atividade atual antes de abrir outra.');
        return;
    }
    document.getElementById('resposta-docid').value = docId;
    const area = document.getElementById('area-perguntas-dinamicas'); area.innerHTML = '';
    const item = window.todosTreinamentosData.find(i => i.id === docId);
    if(!item) { area.innerHTML = '<p>Treinamento não encontrado.</p>'; return; }

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const modoControle = window.obterModoControleTreinamento(item.data);
    const permitePausa = window.permitePausaTreinamento(item.data);
    const limiteInfracoes = window.obterLimiteInfracoesTreinamento(item.data);
    const regraSaida = window.obterRegraSaidaTreinamento(item.data);
    const progressoAtual = window.obterProgressoAlunoTreinamento(item.data, nomeAluno);
    if (progressoAtual && (progressoAtual.status === 'zerada_por_saida' || (progressoAtual.status === 'inconclusa' && modoControle === 'prova_bloqueada'))) {
        alert('Esta tentativa já foi encerrada e não pode ser retomada.');
        return;
    }

    const configJSON = item.data['Configuração da Avaliação'] || '[]';
    const perguntas = window.safeParseJSON(window.decodificarConfigAvaliacao(configJSON), []);
    if (!Array.isArray(perguntas) || !perguntas.length) {
        area.innerHTML = '<div style="padding:14px; background:#fff7ed; border:1px solid #fdba74; border-radius:10px; color:#9a3412;">Esta prova/atividade ainda não possui perguntas configuradas.</div>';
        document.getElementById('resposta-titulo').textContent = 'Atividade sem perguntas';
        document.getElementById('modal-resposta-aluno').style.display = 'flex';
        window.desativarSessaoTreinamento();
        return;
    }

    const tentativas = progressoAtual && progressoAtual.status !== 'pendente' ? (progressoAtual.tentativas || 1) : ((progressoAtual?.tentativas || 0) + 1);
    const progressoSalvo = await window.salvarProgressoTreinamento(docId, nomeAluno, { status: 'em_andamento', tentativas, infracoes: progressoAtual?.infracoes || 0, modo_controle: modoControle, regra_saida: regraSaida, limite_infracoes: limiteInfracoes });
    window.sessaoTreinamentoAtiva = { docId, nomeAluno, itemData: item.data, modoControle, permitePausa, limiteInfracoes, regraSaida, progresso: progressoSalvo, guardGraceUntil: Date.now() + 4000 };
    document.getElementById('resposta-titulo').textContent = modoControle === 'prova_bloqueada' ? 'Prova em andamento' : 'Responder Atividade';
    window.atualizarAvisoSessaoTreinamentoUI(item.data, progressoSalvo);

    try {
        perguntas.forEach((questaoBruta, idx) => {
            const q = window.normalizarPerguntaBuilder(questaoBruta);
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0;">`;
            html += `<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; align-items:flex-start;"><div style="font-weight:700; font-size:14px; color:var(--text-main);">${idx+1}. ${window.escapeHTML(q.p)}</div>${q.pontosQuestao ? `<span style="background:#dbeafe; color:#1d4ed8; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:700;">${window.escapeHTML(q.pontosQuestao)} pts</span>` : ''}</div>`;
            if (q.apoio) html += `<div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; white-space:pre-wrap;">${window.escapeHTML(q.apoio)}</div>`;
            html += window.obterHtmlMidiaQuestao(q, { compacta: false });
            html += `<input type="hidden" class="resp-tipo" value="${window.escapeAttr(q.tipo)}"><input type="hidden" class="resp-pergunta-txt" value="${window.escapeAttr(q.p)}">`;
            if (q.tipo === 'descritiva') html += `<textarea class="form-input resp-valor" style="height:90px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            else (q.ops || []).forEach(op => { if (String(op || '').trim() !== '') html += `<label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${window.escapeAttr(op)}"> <span>${window.escapeHTML(op)}</span></label>`; });
            html += `</div>`; area.innerHTML += html;
        });
    } catch(e) { area.innerHTML = '<p>Erro ao carregar perguntas do sistema.</p>'; }

    if (Array.isArray(progressoAtual?.rascunho) && progressoAtual.rascunho.length) window.preencherRascunhoTreinamento(progressoAtual.rascunho);
    area.querySelectorAll('.resp-valor, .resp-radio').forEach(el => { el.addEventListener('input', window.agendarAutosaveTreinamento); el.addEventListener('change', window.agendarAutosaveTreinamento); });
    document.getElementById('modal-resposta-aluno').style.display = 'flex';
};

window.enviarRespostaTreinamento = async function() {
    if(!window.alunoLogado) return;
    const docId = document.getElementById('resposta-docid').value;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const respostasFinais = window.capturarRespostasModalTreinamento();
    if(!respostasFinais.some(item => String(item.resposta || '').trim() !== '')) { alert('Preencha ao menos uma resposta antes de enviar.'); return; }
    const item = window.todosTreinamentosData.find(i => i.id === docId);
    const resultadoAuto = window.calcularResultadoAutomaticoTreinamento(item?.data || {}, respostasFinais);
    const respostaObj = { nome: nomeAluno, data: new Date().toLocaleString('pt-BR'), respostas: respostasFinais, nota: "", feedback: "", nota_auto: resultadoAuto.notaAuto, pontos_objetivos: resultadoAuto.pontosObjetivos, pontos_subjetivos: resultadoAuto.pontosSubjetivos, pendentes_subjetivas: resultadoAuto.pendentesSubjetivas, correcao_detalhes: resultadoAuto.detalhes, nota_total_calculada: resultadoAuto.pendentesSubjetivas ? "" : resultadoAuto.notaAuto };
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { respostas_alunos: window.arrayUnion(JSON.stringify(respostaObj)) });
        await window.salvarProgressoTreinamento(docId, nomeAluno, { status: 'concluida', rascunho: [], tentativas: window.sessaoTreinamentoAtiva?.progresso?.tentativas || 1, infracoes: window.sessaoTreinamentoAtiva?.progresso?.infracoes || 0 });
        const msgAuto = resultadoAuto.pontosObjetivos > 0 ? ` Pontos automáticos: ${resultadoAuto.notaAuto}.` : '';
        alert(`Sua resposta foi enviada para correção do supervisor!${msgAuto}`);
        document.getElementById('modal-resposta-aluno').style.display = 'none';
        window.desativarSessaoTreinamento();
        window.renderizarTrilhaAluno();
    } catch(e) { alert("Erro ao enviar resposta: " + e.message); }
};

window.abrirCorrecaoAdmin = function(docId, nomeAluno) {
    const data = window.todosTreinamentosData.find(i=>i.id===docId)?.data;
    if(!data) return;
    const respostas = data.respostas_alunos || [];
    let respObj = null; let respStr = null;
    respostas.forEach(r => { try { let o = window.safeParseJSON(r, null); if(o && o.nome === nomeAluno) { respObj = o; respStr = r; } } catch(e){} });
    if(!respObj) return;

    let html = `<b>Aluno:</b> ${window.escapeHTML(nomeAluno)} <br><b>Enviado em:</b> ${window.escapeHTML(respObj.data || '-')}<br><br>`;
    const perguntasConfiguradas = window.safeParseJSON(window.decodificarConfigAvaliacao(data['Configuração da Avaliação'] || '[]'), []);
    (respObj.respostas || []).forEach((r, i) => {
        const qCfg = window.normalizarPerguntaBuilder(perguntasConfiguradas[i] || { p: r.pergunta, tipo: r.tipo });
        html += `<div style="margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">`;
        html += `<b>Q${i+1}:</b> ${window.escapeHTML(r.pergunta || qCfg.p || 'Pergunta')}<br>`;
        if (qCfg.apoio) html += `<div style="font-size:12px; color:#64748b; margin:6px 0; white-space:pre-wrap;">${window.escapeHTML(qCfg.apoio)}</div>`;
        html += window.obterHtmlMidiaQuestao(qCfg, { compacta: true });
        if (qCfg.tipo === 'multipla') {
            const correta = Array.isArray(qCfg.ops) ? String(qCfg.ops[parseInt(qCfg.correta || '0', 10)] || '') : '';
            const acertou = String(r.resposta || '').trim() === String(correta).trim();
            html += `<div style="margin-top:6px; font-size:12px; color:${acertou ? '#166534' : '#b91c1c'};"><b>${acertou ? 'Correta' : 'Incorreta'}</b>${correta ? ` | Gabarito: ${window.escapeHTML(correta)}` : ''}</div>`;
        }
        html += `<span style="color:#3182ce; white-space:pre-wrap;">R: ${window.escapeHTML(r.resposta || '-')}</span>`;
        html += `</div>`;
    });

    const notaAuto = parseFloat(respObj.nota_auto || respObj.nota_total_calculada || 0) || 0;
    const pontosSubj = parseFloat(respObj.pontos_subjetivos || 0) || 0;
    const pendentes = parseInt(respObj.pendentes_subjetivas || 0, 10) || 0;
    const resumo = document.getElementById('correcao-resumo-auto');
    if (resumo) {
        resumo.style.display = 'block';
        resumo.innerHTML = `<b>Correção automática:</b> ${notaAuto} ponto(s) já apurados nas questões objetivas.<br><b>Questões subjetivas pendentes:</b> ${pendentes} | <b>Pontos subjetivos possíveis:</b> ${pontosSubj}.`;
    }
    document.getElementById('correcao-respostas-aluno').innerHTML = html;
    document.getElementById('correcao-auto-base').value = String(notaAuto);
    document.getElementById('correcao-nota').value = respObj.nota_manual !== undefined ? respObj.nota_manual : '';
    document.getElementById('correcao-feedback').value = respObj.feedback || '';
    document.getElementById('correcao-docid').value = docId;
    document.getElementById('correcao-nomealuno').value = nomeAluno;

    document.getElementById('modal-correcao-admin').style.display = 'flex';
    document.getElementById('modal-leituras').style.display = 'none';
};

window.salvarCorrecaoAdmin = async function() {
    const docId = document.getElementById('correcao-docid').value;
    const nomeAluno = document.getElementById('correcao-nomealuno').value;
    const notaManual = parseFloat(document.getElementById('correcao-nota').value || '0') || 0;
    const fb = document.getElementById('correcao-feedback').value;

    const data = window.todosTreinamentosData.find(i => i.id === docId)?.data;
    if (!data) return alert('Atividade não encontrada.');

    const respostas = data.respostas_alunos || [];
    let respObjAntigo = null;
    let respStrAntiga = null;

    respostas.forEach(r => {
        try {
            const o = window.safeParseJSON(r, null);
            if (o && o.nome === nomeAluno) {
                respObjAntigo = o;
                respStrAntiga = r;
            }
        } catch (e) {}
    });

    if (!respObjAntigo || !respStrAntiga) return alert('Resposta do aluno não encontrada.');

    const notaAuto = parseFloat(respObjAntigo.nota_auto || '0') || 0;
    const pontosObjetivos = parseFloat(respObjAntigo.pontos_objetivos || '0') || 0;
    const pontosSubjetivos = parseFloat(respObjAntigo.pontos_subjetivos || '0') || 0;
    const pontosMaximos = pontosObjetivos + pontosSubjetivos;
    const pontosObtidos = notaAuto + notaManual;
    const notaMaximaDaAtividade = parseFloat(String(data['Pontos Valendo'] || '10').replace(',', '.')) || 10;

    const notaFinal = pontosMaximos > 0
        ? Number(((pontosObtidos / pontosMaximos) * notaMaximaDaAtividade).toFixed(2))
        : 0;

    const respNovaObj = {
        ...respObjAntigo,
        nota_manual: notaManual,
        nota_auto: notaAuto,
        nota: notaFinal,
        nota_total_calculada: notaFinal,
        feedback: fb
    };

    const respStrNova = JSON.stringify(respNovaObj);

    try {
        const ref = window.doc(window.db, 'treinamentos', docId);
        await window.updateDoc(ref, { respostas_alunos: window.arrayRemove(respStrAntiga) });
        await window.updateDoc(ref, { respostas_alunos: window.arrayUnion(respStrNova) });
        alert(`Correção salva com sucesso! Nota final: ${notaFinal}`);
        document.getElementById('modal-correcao-admin').style.display = 'none';
        document.getElementById('modal-leituras').style.display = 'flex';
        window.renderizarTrilhaAluno();
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

window.entrarPortalAluno = function() {
    const nomeDigitado = document.getElementById('login-aluno-nome').value.trim().toLowerCase();
    const pinDigitado = document.getElementById('login-aluno-pin').value.trim();
    if(!nomeDigitado || !pinDigitado) return alert("Preencha Nome e PIN!");
    const dadosColaboradores = window.todosOsDadosDoSistema['colaboradores'] || [];
    const colaboradorEncontrado = dadosColaboradores.find(item => { return String(item.data['Nome Completo do Colaborador'] || "").toLowerCase() === nomeDigitado && String(item.data['PIN de Acesso (Treinamentos)'] || "") === pinDigitado; });
    if(colaboradorEncontrado) {
        window.alunoLogado = colaboradorEncontrado.data;
        document.getElementById('ensino-login-area').style.display = 'none'; document.getElementById('ensino-dashboard-area').style.display = 'block';
        document.getElementById('nome-aluno-logado').textContent = window.alunoLogado['Nome Completo do Colaborador'];
        window.renderizarTrilhaAluno();
    } else { alert("Nome ou PIN incorretos. Verifique com a Gestão."); }
};

window.escutarRH = function() {
    if(!isAdmin) return;
    window.onSnapshot(window.collection(window.db, 'rh-pesquisas'), (snap) => {
        window.todosPesquisasRH = []; snap.forEach(d => window.todosPesquisasRH.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
        if(window.alunoLogado) window.renderizarPesquisasAluno();
    });
    window.onSnapshot(window.collection(window.db, 'rh-respostas-pesquisa'), (snap) => {
        window.todosRespostasRH = []; snap.forEach(d => window.todosRespostasRH.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
        if(window.alunoLogado) window.renderizarPesquisasAluno();
    });
    window.onSnapshot(window.collection(window.db, 'rh-perfil-avaliacoes'), (snap) => {
        window.todosPerfilAvaliacoes = []; snap.forEach(d => window.todosPerfilAvaliacoes.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
        if(window.alunoLogado) window.renderizarPesquisasAluno();
    });
    window.onSnapshot(window.collection(window.db, 'rh-perfil-respostas'), (snap) => {
        window.todosRespostasPerfil = []; snap.forEach(d => window.todosRespostasPerfil.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
    });
};

window.atualizarOpcoesFiltrosRH = function() {
    const setorSel = document.getElementById('rh-filter-setor');
    const colSel = document.getElementById('rh-filter-colaborador');
    if(setorSel) {
        const atual = window.rhFiltroAtual.setor || '';
        const setores = window.getSetoresRHDisponiveis();
        setorSel.innerHTML = `<option value="">Visão Geral</option>` + setores.map(setor => `<option value="${setor}">${setor}</option>`).join('');
        setorSel.value = atual;
    }
    if(colSel) {
        const colaboradores = window.getColaboradoresFiltradosPorSetor(window.rhFiltroAtual.setor || '');
        const atual = window.rhFiltroAtual.colaborador || '';
        colSel.innerHTML = `<option value="">Todos os colaboradores</option>` + colaboradores.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        if(atual && !colaboradores.some(c => c.nome === atual)) window.rhFiltroAtual.colaborador = '';
        colSel.value = window.rhFiltroAtual.colaborador || '';
    }
};

window.aplicarFiltrosRH = function() {
    const setorSel = document.getElementById('rh-filter-setor');
    const colSel = document.getElementById('rh-filter-colaborador');
    window.rhFiltroAtual.setor = setorSel ? setorSel.value : '';
    window.rhFiltroAtual.colaborador = colSel ? colSel.value : '';
    window.atualizarOpcoesFiltrosRH();
    window.renderizarDashboardRH();
};

window.limparFiltrosRH = function() {
    window.rhFiltroAtual = { setor: '', colaborador: '' };
    window.atualizarOpcoesFiltrosRH();
    window.renderizarDashboardRH();
};

window.selecionarColaboradorRH = function(nome) {
    window.rhFiltroAtual.colaborador = nome || '';
    const colSel = document.getElementById('rh-filter-colaborador');
    if(colSel) colSel.value = window.rhFiltroAtual.colaborador;
    window.renderizarDashboardRH();
};

window.calcularEstatisticasRH = function() {
    const filtroSetor = window.rhFiltroAtual.setor || '';
    const filtroColaborador = window.rhFiltroAtual.colaborador || '';
    const colaboradoresBase = listaColaboradoresGlobal.filter(c => (!filtroSetor || c.setor === filtroSetor) && (!filtroColaborador || c.nome === filtroColaborador));
    const colabStats = {};
    colaboradoresBase.forEach(c => { colabStats[c.nome] = { xp: 0, treinamentos: 0, setor: c.setor, mediaNota: 0, respostas: 0 }; });

    window.todosTreinamentosData.forEach(t => {
        const data = t.data || {};
        const avaliativo = window.isTreinamentoAvaliativo(data);
        const pontosBase = parseInt(data['Pontos Valendo']) || 0;
        if(avaliativo) {
            (data.respostas_alunos || []).forEach(raw => {
                const resp = window.safeParseJSON(raw);
                if(!resp || !colabStats[resp.nome]) return;
                const nota = Number(resp.nota);
                if(String(resp.nota).trim() === '' || !Number.isFinite(nota)) return;
                colabStats[resp.nome].xp += nota;
                colabStats[resp.nome].treinamentos += 1;
                colabStats[resp.nome].respostas += 1;
            });
        } else {
            (data.leituras || []).forEach(raw => {
                const nome = window.extrairNomeRegistro(raw);
                if(!colabStats[nome]) return;
                colabStats[nome].xp += pontosBase;
                colabStats[nome].treinamentos += 1;
            });
        }
    });

    const nomes = Object.keys(colabStats);
    const totalXP = nomes.reduce((acc, nome) => acc + (colabStats[nome].xp || 0), 0);
    const mediaGeral = nomes.length ? Math.round(totalXP / nomes.length) : 0;
    let altaPerformance = 0;
    nomes.forEach(nome => {
        const stat = colabStats[nome];
        stat.mediaNota = stat.respostas ? Number((stat.xp / stat.respostas).toFixed(1)) : 0;
        if(stat.xp > 0 && stat.xp >= mediaGeral) altaPerformance += 1;
    });
    return { totalColaboradores: nomes.length, mediaGeral, altaPerformance, colabStats };
};

window.renderizarDashboardRH = function() {
    window.atualizarOpcoesFiltrosRH();
    const resumo = window.calcularEstatisticasRH();
    const search = (document.getElementById('rh-search-colab')?.value || '').toLowerCase();

    const elTot = document.getElementById('rh-tot-colab');
    const elAvg = document.getElementById('rh-avg-xp');
    const elHigh = document.getElementById('rh-tot-high');
    if(elTot) elTot.textContent = resumo.totalColaboradores;
    if(elAvg) elAvg.textContent = resumo.mediaGeral;
    if(elHigh) elHigh.textContent = resumo.altaPerformance;

    const scope = document.getElementById('rh-scope-label');
    if(scope) {
        if(window.rhFiltroAtual.colaborador) scope.textContent = `Visão individual: ${window.rhFiltroAtual.colaborador}`;
        else if(window.rhFiltroAtual.setor) scope.textContent = `Visão por setor: ${window.rhFiltroAtual.setor}`;
        else scope.textContent = 'Visão geral da empresa';
    }

    const grid = document.getElementById('rh-grid-colaboradores');
    if(grid) {
        const nomes = Object.keys(resumo.colabStats).filter(nome => !search || nome.toLowerCase().includes(search)).sort((a,b) => a.localeCompare(b));
        grid.innerHTML = nomes.length ? nomes.map(nome => {
            const stat = resumo.colabStats[nome];
            let statusClass = 'neutro';
            let statusText = 'Em Desenvolvimento';
            if(stat.xp > 0 && stat.xp >= resumo.mediaGeral) { statusClass = 'destaque'; statusText = 'Alta Performance'; }
            else if(stat.xp === 0) { statusClass = 'risco'; statusText = 'Em Atenção'; }
            const ativo = window.rhFiltroAtual.colaborador === nome ? ' box-shadow:0 0 0 3px rgba(139,37,44,.15); transform:translateY(-2px);' : '';
            const nomeEscapado = String(nome).replace(/'/g, "\'");
            return `<div class="rh-collab-card ${statusClass}" onclick="window.selecionarColaboradorRH('${nomeEscapado}')" style="cursor:pointer;${ativo}">
                <div class="rh-collab-header">
                    <div class="rh-avatar">${nome.substring(0,2).toUpperCase()}</div>
                    <div class="rh-collab-meta"><h4>${window.escapeHTML(nome)}</h4><p>${window.escapeHTML(stat.setor || 'Geral')}</p></div>
                    <div class="rh-score-badge">${stat.xp} XP</div>
                </div>
                <div class="rh-collab-grid">
                    <div><span>Treinamentos Concluídos</span><strong>${stat.treinamentos}</strong></div>
                    <div><span>Status RH</span><span class="rh-chip ${statusClass}" style="margin:0; padding:4px 8px;">${statusText}</span></div>
                    <div><span>Média Individual</span><strong>${stat.mediaNota || 0}</strong></div>
                    <div><span>Setor</span><strong>${window.escapeHTML(stat.setor || 'Geral')}</strong></div>
                </div>
            </div>`;
        }).join('') : '<p style="padding:20px; color:var(--text-muted);">Nenhum colaborador encontrado para o filtro selecionado.</p>';
    }

    const gridP = document.getElementById('rh-grid-pesquisas');
    if(gridP) {
        gridP.innerHTML = '';
        window.todosPesquisasRH.slice().sort((a,b) => String(b.data.dataCriacao || '').localeCompare(String(a.data.dataCriacao || ''))).forEach(p => {
            const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === p.id).length;
            gridP.innerHTML += `<div class="rh-survey-card">
                <div>
                    <h4 style="margin:0; color:var(--text-main); font-weight:600;">${window.escapeHTML(p.data.titulo || 'Pesquisa')}</h4>
                    <p style="margin:0; color:var(--text-muted); font-size:12px;">Categoria: ${window.escapeHTML(p.data.categoria || 'Clima')} | Público: ${window.escapeHTML(p.data.alvoValor || p.data.alvo || 'Geral')}</p>
                </div>
                <div class="rh-survey-stats"><b>${resps}</b> Respostas</div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="window.verResultadosPesquisaRH('${p.id}')" class="btn-hover color-8" style="height:30px; font-size:11px; padding:0 15px;">Resultados</button>
                    <button onclick="window.abrirModalCriarPesquisa('${p.id}')" class="btn-action btn-edit" title="Editar pesquisa"><i class="ri-pencil-line"></i></button>
                    <button onclick="window.excluirPesquisaRH('${p.id}')" class="btn-action btn-delete" title="Excluir pesquisa"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>`;
        });
        if(window.todosPesquisasRH.length === 0) gridP.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Nenhuma pesquisa ativa.</p>';
    }

    const gridPerfis = document.getElementById('rh-grid-perfis');
    if(gridPerfis) {
        gridPerfis.innerHTML = '';
        window.todosPerfilAvaliacoes.slice().sort((a,b) => String(b.data.dataCriacao || '').localeCompare(String(a.data.dataCriacao || ''))).forEach(item => {
            const resps = window.todosRespostasPerfil.filter(r => r.data.avaliacaoId === item.id).length;
            gridPerfis.innerHTML += `<div class="rh-survey-card">
                <div>
                    <h4 style="margin:0; color:var(--text-main); font-weight:600;">${window.escapeHTML(item.data.titulo || 'Avaliação de perfil')}</h4>
                    <p style="margin:0; color:var(--text-muted); font-size:12px;">Alvo: ${window.escapeHTML(item.data.alvoTipo || 'Geral')}${item.data.alvoValor ? ' | ' + window.escapeHTML(item.data.alvoValor) : ''}</p>
                </div>
                <div class="rh-survey-stats"><b>${resps}</b> Respostas</div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="window.abrirModalPerfilProfissional()" class="btn-hover color-8" style="height:30px; font-size:11px; padding:0 15px;">Radar</button>
                    <button onclick="window.abrirModalCriarPerfil('${item.id}')" class="btn-action btn-edit" title="Editar avaliação"><i class="ri-pencil-line"></i></button>
                    <button onclick="window.excluirAvaliacaoPerfil('${item.id}')" class="btn-action btn-delete" title="Excluir avaliação"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>`;
        });
        if(window.todosPerfilAvaliacoes.length === 0) gridPerfis.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Nenhuma avaliação de perfil ativa.</p>';
    }
};

window.abrirModalCriarPesquisa = function(pesquisaId = '') {
    const editId = document.getElementById('rh-pesq-edit-id');
    if(editId) editId.value = pesquisaId || '';
    document.getElementById('rh-pesq-titulo').value = '';
    document.getElementById('rh-pesq-perguntas-list').innerHTML = '';
    const alvoTipo = document.getElementById('rh-pesq-alvo-tipo');
    const alvoValor = document.getElementById('rh-pesq-alvo');
    if(alvoTipo) alvoTipo.value = 'Geral';
    if(alvoValor) alvoValor.innerHTML = '<option value="">Todos (Geral)</option>';
    window.atualizarAlvoPesquisaRHFormulario();

    if(pesquisaId) {
        const pesquisa = window.todosPesquisasRH.find(item => item.id === pesquisaId);
        if(pesquisa) {
            document.getElementById('rh-pesq-titulo').value = pesquisa.data.titulo || '';
            document.getElementById('rh-pesq-categoria').value = pesquisa.data.categoria || 'Clima';
            if(alvoTipo) alvoTipo.value = pesquisa.data.alvoTipo || (String(pesquisa.data.alvo || '').startsWith('Setor: ') ? 'Setor' : 'Geral');
            window.atualizarAlvoPesquisaRHFormulario();
            if(alvoValor) alvoValor.value = pesquisa.data.alvoValor || String(pesquisa.data.alvo || '').replace('Setor: ', '').trim();
            (pesquisa.data.perguntas || []).forEach(pergunta => window.adicionarPerguntaRH(pergunta.tipo || 'escala', pergunta));
        }
    }

    const tituloModal = document.getElementById('rh-modal-pesquisa-titulo');
    if(tituloModal) tituloModal.innerHTML = pesquisaId ? '<i class="ri-pencil-line"></i> Editar Pesquisa (RH)' : '<i class="ri-survey-line"></i> Criar Nova Pesquisa (RH)';
    document.getElementById('modal-criar-pesquisa').style.display = 'flex';
};

window.atualizarAlvoPesquisaRHFormulario = function() {
    const alvoTipo = document.getElementById('rh-pesq-alvo-tipo');
    const alvoValor = document.getElementById('rh-pesq-alvo');
    if(!alvoTipo || !alvoValor) return;
    if(alvoTipo.value === 'Setor') {
        alvoValor.innerHTML = `<option value="">Selecione o setor</option>` + window.getSetoresRHDisponiveis().map(setor => `<option value="${setor}">${setor}</option>`).join('');
        alvoValor.disabled = false;
    } else if(alvoTipo.value === 'Colaborador') {
        alvoValor.innerHTML = `<option value="">Selecione o colaborador</option>` + listaColaboradoresGlobal.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        alvoValor.disabled = false;
    } else {
        alvoValor.innerHTML = `<option value="">Todos (Geral)</option>`;
        alvoValor.disabled = true;
        alvoValor.value = '';
    }
};

window.adicionarPerguntaRH = function(tipo, perguntaAntiga = null) {
    const area = document.getElementById('rh-pesq-perguntas-list');
    const div = document.createElement('div');
    div.className = 'rh-pergunta-item';
    div.style = 'background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px; position:relative;';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; color:red; background:none; border:none; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
        <input type="hidden" class="rh-p-tipo" value="${tipo}">
        <label style="font-size:12px; font-weight:600;">Pergunta (${tipo === 'escala' ? 'Escala 1 a 5' : 'Texto Aberto'}):</label>
        <input type="text" class="form-input rh-p-texto" style="margin-bottom:0;" placeholder="Digite a pergunta..." value="${window.escapeHTML(perguntaAntiga?.texto || '')}">
    `;
    area.appendChild(div);
};

window.salvarPesquisaRH = async function() {
    const editId = document.getElementById('rh-pesq-edit-id')?.value || '';
    const titulo = document.getElementById('rh-pesq-titulo').value.trim();
    const categoria = document.getElementById('rh-pesq-categoria').value;
    const alvoTipo = document.getElementById('rh-pesq-alvo-tipo').value;
    const alvoValor = document.getElementById('rh-pesq-alvo').value;
    const blocos = document.querySelectorAll('.rh-pergunta-item');
    if(!titulo || blocos.length === 0) return alert('Preencha o título e adicione pelo menos uma pergunta!');
    if(alvoTipo !== 'Geral' && !alvoValor) return alert('Selecione o alvo da pesquisa.');

    const perguntas = Array.from(blocos).map(b => ({ tipo: b.querySelector('.rh-p-tipo').value, texto: b.querySelector('.rh-p-texto').value.trim() })).filter(item => item.texto);
    if(!perguntas.length) return alert('Adicione pelo menos uma pergunta válida.');

    const payload = {
        titulo, categoria, perguntas,
        alvoTipo,
        alvoValor: alvoTipo === 'Geral' ? '' : alvoValor,
        alvo: alvoTipo === 'Setor' ? `Setor: ${alvoValor}` : (alvoTipo === 'Colaborador' ? alvoValor : 'Geral'),
        dataCriacao: new Date().toISOString()
    };

    try {
        if(editId) {
            await window.updateDoc(window.doc(window.db, 'rh-pesquisas', editId), payload);
            alert('Pesquisa atualizada com sucesso!');
        } else {
            await window.addDoc(window.collection(window.db, 'rh-pesquisas'), payload);
            alert('Pesquisa enviada com sucesso!');
        }
        document.getElementById('modal-criar-pesquisa').style.display = 'none';
    } catch(e) { alert('Erro ao salvar pesquisa: ' + e.message); }
};

window.excluirPesquisaRH = async function(id) {
    if(!confirm("Excluir esta pesquisa e todas as respostas?")) return;
    try { await window.deleteDoc(window.doc(window.db, 'rh-pesquisas', id)); alert("Excluída!"); } catch(e) {}
};

window.renderizarPesquisasAluno = function() {
    if(!window.alunoLogado) return;
    const area = document.getElementById('aluno-pesquisas-pendentes');
    const lista = document.getElementById('lista-pesquisas-aluno');
    const areaPerfil = document.getElementById('aluno-perfil-pendentes');
    const listaPerfil = document.getElementById('lista-perfis-aluno');
    if(!area || !lista) return;

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

    const minhasPesquisas = window.todosPesquisasRH.filter(p => window.obterPublicoPesquisaRH(p.data, nomeAluno, setorAluno));
    const pendentes = minhasPesquisas.filter(p => !window.todosRespostasRH.some(r => r.data.pesquisaId === p.id && r.data.nome === nomeAluno));

    if(pendentes.length > 0) {
        lista.innerHTML = pendentes.map(p => `
            <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-soft); gap:12px; flex-wrap:wrap;">
                <div>
                    <strong style="color: var(--primary-color); display:block; font-size:15px;">${window.escapeHTML(p.data.titulo || 'Pesquisa RH')}</strong>
                    <span style="font-size:12px; color:var(--text-muted);"><i class="ri-survey-fill"></i> ${window.escapeHTML(p.data.categoria || 'Clima')}</span>
                </div>
                <button onclick="window.responderPesquisaRH('${p.id}')" class="btn-hover color-11" style="height:35px; font-size:12px; padding:0 15px;">Responder Agora</button>
            </div>
        `).join('');
        area.style.display = 'block';
    } else {
        area.style.display = 'none';
    }

    if(areaPerfil && listaPerfil) {
        const perfisPendentes = window.obterAvaliacoesPerfilDisponiveis(nomeAluno, setorAluno).filter(item => !window.todosRespostasPerfil.some(resp => resp.data.avaliacaoId === item.id && resp.data.nome === nomeAluno));
        if(perfisPendentes.length) {
            listaPerfil.innerHTML = perfisPendentes.map(item => `
                <div style="background: #eff6ff; border-left: 4px solid #3182ce; padding: 15px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-soft); gap:12px; flex-wrap:wrap;">
                    <div>
                        <strong style="color: #1e3a5f; display:block; font-size:15px;">${window.escapeHTML(item.data.titulo || 'Avaliação de Perfil')}</strong>
                        <span style="font-size:12px; color:var(--text-muted);"><i class="ri-radar-line"></i> Perfil Profissional</span>
                    </div>
                    <button onclick="window.responderPerfilRH('${item.id}')" class="btn-hover color-9" style="height:35px; font-size:12px; padding:0 15px;">Responder Agora</button>
                </div>
            `).join('');
            areaPerfil.style.display = 'block';
        } else {
            areaPerfil.style.display = 'none';
        }
    }
};
window.responderPesquisaRH = function(pesquisaId) {
    const p = (window.todosPesquisasRH || []).find(x => x.id === pesquisaId);
    if (!p || !p.data) { return; }

    const tituloEl = document.getElementById('rh-resp-titulo');
    const idEl = document.getElementById('rh-resp-id');
    const areaEl = document.getElementById('rh-resp-area');
    const modalEl = document.getElementById('modal-responder-pesquisa');

    if (!tituloEl || !idEl || !areaEl || !modalEl) { return; }

    tituloEl.textContent = p.data.titulo || 'Responder Pesquisa';
    idEl.value = pesquisaId;

    const perguntas = Array.isArray(p.data.perguntas) ? p.data.perguntas : [];
    let html = '';

    perguntas.forEach((q, idx) => {
        const textoSeguro = window.escapeHTML(String(q?.texto || 'Pergunta'));
        const tipoSeguro = String(q?.tipo || 'texto');

        html += `
            <div class="rh-resp-bloco" style="margin-bottom:15px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color);">
                <input type="hidden" class="resp-q-texto" value="${textoSeguro}">
                <input type="hidden" class="resp-q-tipo" value="${tipoSeguro}">
                <label style="font-weight:600; font-size:13px; display:block; margin-bottom:10px; color:var(--text-main);">
                    ${idx + 1}. ${textoSeguro}
                </label>
        `;

        if (tipoSeguro === 'escala') {
            html += `<div style="display:flex; gap:10px; justify-content:space-between; flex-wrap:wrap;">`;
            [1,2,3,4,5].forEach(n => {
                html += `
                    <label style="flex:1; min-width:56px; text-align:center; background:white; border:1px solid #cbd5e1; padding:10px; border-radius:8px; cursor:pointer;">
                        <input type="radio" name="p_${pesquisaId}_q_${idx}" value="${n}" class="resp-q-val" style="margin-bottom:5px;">
                        <div style="font-weight:bold; color:var(--primary-color);">${n}</div>
                    </label>
                `;
            });
            html += `</div>`;
        } else {
            html += `<textarea class="form-input resp-q-val" style="height:90px; resize:vertical; margin:0;" placeholder="A sua resposta franca e sincera."></textarea>`;
        }

        html += `</div>`;
    });

    areaEl.innerHTML = html;
    modalEl.style.display = 'flex';
};

window.enviarRespostaRH = async function() {
    try {
        if (!window.alunoLogado) { return; }

        const pesquisaId = document.getElementById('rh-resp-id')?.value?.trim();
        if (!pesquisaId) { return; }

        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'] || window.alunoLogado.nome || window.alunoLogado.Nome || 'Colaborador';

        const blocos = Array.from(document.querySelectorAll('#rh-resp-area .rh-resp-bloco'));
        if (!blocos.length) { return; }

        const respostas = [];
        let ok = true;

        blocos.forEach((b, idx) => {
            const textoEl = b.querySelector('.resp-q-texto');
            const tipoEl = b.querySelector('.resp-q-tipo');

            const textoP = textoEl ? textoEl.value : `Pergunta ${idx + 1}`;
            const tipo = tipoEl ? tipoEl.value : 'texto';

            let val = '';

            if (tipo === 'escala') {
                const checked = b.querySelector('input[type="radio"]:checked');
                if (!checked) { ok = false; return; }
                val = checked.value;
            } else {
                const textarea = b.querySelector('textarea');
                if (!textarea) { ok = false; return; }
                val = textarea.value.trim();
                if (!val) { ok = false; return; }
            }

            respostas.push({ pergunta: textoP, resposta: val, tipo });
        });

        if (!ok || respostas.length !== blocos.length) {
            alert('Por favor, responda a todas as perguntas antes de enviar!');
            return;
        }

        const antiga = (window.todosRespostasRH || []).find(item => item?.data?.pesquisaId === pesquisaId && item?.data?.nome === nomeAluno);

        const payload = { pesquisaId, nome: nomeAluno, respostas, data: new Date().toISOString() };

        if (antiga?.id) { await window.updateDoc(window.doc(window.db, 'rh-respostas-pesquisa', antiga.id), payload); }
        else { await window.addDoc(window.collection(window.db, 'rh-respostas-pesquisa'), payload); }

        alert('Muito obrigado pelas suas respostas! Isso ajuda-nos a crescer juntos.');
        const modal = document.getElementById('modal-responder-pesquisa');
        if (modal) modal.style.display = 'none';

        if (typeof window.renderizarPesquisasAluno === 'function') { window.renderizarPesquisasAluno(); }
    } catch (e) { alert('Erro ao enviar: ' + (e?.message || 'falha desconhecida')); }
};

window.verResultadosPesquisaRH = function(pesquisaId) {
    const p = window.todosPesquisasRH.find(x => x.id === pesquisaId);
    const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === pesquisaId);
    if(!p) return;

    let html = `<h4 style="margin-bottom:15px; color:var(--primary-color); font-size:18px;">${p.data.titulo}</h4>`;
    html += `<p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; background:#f8fafc; padding:10px; border-radius:8px;">Total de respostas recolhidas: <b>${resps.length}</b></p>`;

    p.data.perguntas.forEach(q => {
        html += `<div style="margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                    <strong style="display:block; margin-bottom:10px; font-size:14px; color:var(--text-main);">${q.texto}</strong>`;

        if(q.tipo === 'escala') {
            let soma = 0; let qtd = 0;
            resps.forEach(r => {
                const ans = r.data.respostas.find(x => x.pergunta === q.texto);
                if(ans && ans.resposta) { soma += parseInt(ans.resposta); qtd++; }
            });
            const media = qtd > 0 ? (soma / qtd).toFixed(1) : 0;
            html += `<div style="font-size:28px; font-weight:700; color:#38a169;"><i class="ri-star-fill" style="color:#ecc94b;"></i> ${media} <span style="font-size:14px; font-weight:500; color:var(--text-muted);">/ 5</span></div>`;
        } else {
            html += `<div style="max-height:200px; overflow-y:auto; font-size:13px; background:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">`;
            if(resps.length === 0) html += `<span style="color:var(--text-muted);">Nenhuma resposta ainda.</span>`;
            resps.forEach(r => {
                const ans = r.data.respostas.find(x => x.pergunta === q.texto);
                if(ans && ans.resposta) { html += `<div style="margin-bottom:10px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px;"><b>${r.data.nome}:</b> <span style="color:var(--text-muted);">${ans.resposta}</span></div>`; }
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    document.getElementById('rh-resultados-area').innerHTML = html;
    document.getElementById('modal-ver-respostas-rh').style.display = 'flex';
};

window.abrirModalCriarPerfil = function(avaliacaoId = '') {
    const editId = document.getElementById('rh-perfil-edit-id');
    if(editId) editId.value = avaliacaoId || '';
    const titulo = document.getElementById('rh-perfil-titulo');
    const tipoSel = document.getElementById('rh-perfil-alvo-tipo');
    const valorSel = document.getElementById('rh-perfil-alvo-valor');
    const perguntasArea = document.getElementById('rh-perfil-perguntas-list');
    if(titulo) titulo.value = '';
    if(tipoSel) tipoSel.value = 'Geral';
    if(perguntasArea) perguntasArea.innerHTML = '';
    window.atualizarAlvoPerfilFormulario();

    if(avaliacaoId) {
        const avaliacao = window.todosPerfilAvaliacoes.find(item => item.id === avaliacaoId);
        if(avaliacao) {
            if(titulo) titulo.value = avaliacao.data.titulo || '';
            if(tipoSel) tipoSel.value = avaliacao.data.alvoTipo || 'Geral';
            window.atualizarAlvoPerfilFormulario();
            if(valorSel) valorSel.value = avaliacao.data.alvoValor || '';
            (avaliacao.data.perguntas || []).forEach(pergunta => window.adicionarPerguntaPerfil(pergunta));
        }
    }

    const titleEl = document.getElementById('rh-modal-perfil-titulo');
    if(titleEl) titleEl.innerHTML = avaliacaoId ? '<i class="ri-pencil-line"></i> Editar Avaliação de Perfil' : '<i class="ri-radar-line"></i> Nova Avaliação de Perfil';
    document.getElementById('modal-criar-perfil').style.display = 'flex';
};

window.atualizarAlvoPerfilFormulario = function() {
    const tipo = document.getElementById('rh-perfil-alvo-tipo');
    const valor = document.getElementById('rh-perfil-alvo-valor');
    if(!tipo || !valor) return;
    if(tipo.value === 'Setor') {
        valor.innerHTML = `<option value="">Selecione o setor</option>` + window.getSetoresRHDisponiveis().map(setor => `<option value="${setor}">${setor}</option>`).join('');
        valor.disabled = false;
    } else if(tipo.value === 'Colaborador') {
        valor.innerHTML = `<option value="">Selecione o colaborador</option>` + listaColaboradoresGlobal.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        valor.disabled = false;
    } else {
        valor.innerHTML = `<option value="">Todos (Geral)</option>`;
        valor.value = '';
        valor.disabled = true;
    }
};

window.adicionarPerguntaPerfil = function(perguntaAntiga = null) {
    const area = document.getElementById('rh-perfil-perguntas-list');
    if(!area) return;
    const div = document.createElement('div');
    div.className = 'rh-perfil-pergunta-item';
    div.style = 'background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px; position:relative;';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; color:red; background:none; border:none; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
        <div class="rh-form-grid">
            <div>
                <label style="font-size:12px; font-weight:600;">Categoria do Radar</label>
                <select class="form-input rh-perfil-categoria">
                    <option value="Qualidades" ${perguntaAntiga?.categoria === 'Qualidades' ? 'selected' : ''}>Qualidades</option>
                    <option value="Pontos Fortes" ${perguntaAntiga?.categoria === 'Pontos Fortes' ? 'selected' : ''}>Pontos Fortes</option>
                    <option value="Pontos Fracos" ${perguntaAntiga?.categoria === 'Pontos Fracos' ? 'selected' : ''}>Pontos Fracos</option>
                    <option value="Skills" ${perguntaAntiga?.categoria === 'Skills' ? 'selected' : ''}>Skills</option>
                </select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:600;">Pergunta</label>
                <input type="text" class="form-input rh-perfil-texto" value="${window.escapeHTML(perguntaAntiga?.texto || '')}" placeholder="Ex: Demonstra iniciativa no dia a dia?">
            </div>
        </div>
    `;
    area.appendChild(div);
};

window.salvarAvaliacaoPerfil = async function() {
    const editId = document.getElementById('rh-perfil-edit-id')?.value || '';
    const titulo = document.getElementById('rh-perfil-titulo').value.trim();
    const alvoTipo = document.getElementById('rh-perfil-alvo-tipo').value;
    const alvoValor = document.getElementById('rh-perfil-alvo-valor').value;
    const perguntas = Array.from(document.querySelectorAll('.rh-perfil-pergunta-item')).map(item => ({
        categoria: item.querySelector('.rh-perfil-categoria').value,
        texto: item.querySelector('.rh-perfil-texto').value.trim(),
        tipo: 'escala'
    })).filter(item => item.texto);

    if(!titulo || !perguntas.length) return alert('Preencha o título e adicione pelo menos uma pergunta.');
    if(alvoTipo !== 'Geral' && !alvoValor) return alert('Selecione o alvo da avaliação.');

    const payload = { titulo, alvoTipo, alvoValor: alvoTipo === 'Geral' ? '' : alvoValor, perguntas, dataCriacao: new Date().toISOString() };
    try {
        if(editId) {
            await window.updateDoc(window.doc(window.db, 'rh-perfil-avaliacoes', editId), payload);
            alert('Avaliação de perfil atualizada com sucesso!');
        } else {
            await window.addDoc(window.collection(window.db, 'rh-perfil-avaliacoes'), payload);
            alert('Avaliação de perfil enviada com sucesso!');
        }
        document.getElementById('modal-criar-perfil').style.display = 'none';
    } catch(e) { alert('Erro ao salvar avaliação: ' + e.message); }
};

window.excluirAvaliacaoPerfil = async function(id) {
    if(!confirm('Excluir esta avaliação de perfil?')) return;
    try { await window.deleteDoc(window.doc(window.db, 'rh-perfil-avaliacoes', id)); alert('Avaliação excluída!'); } catch(e) { alert('Erro ao excluir: ' + e.message); }
};

window.responderPerfilRH = function(avaliacaoId) {
    const avaliacao = window.todosPerfilAvaliacoes.find(item => item.id === avaliacaoId);
    if(!avaliacao) return;
    document.getElementById('rh-perfil-resp-id').value = avaliacaoId;
    document.getElementById('rh-perfil-resp-titulo').textContent = avaliacao.data.titulo || 'Avaliação de Perfil';
    const area = document.getElementById('rh-perfil-resp-area');
    if(!area) return;
    area.innerHTML = (avaliacao.data.perguntas || []).map((pergunta, idx) => `
        <div class="rh-resp-bloco" style="margin-bottom:15px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color);">
            <label style="font-weight:600; font-size:13px; display:block; margin-bottom:10px; color:var(--text-main);">${idx+1}. ${window.escapeHTML(pergunta.texto)} <span style="display:inline-block; margin-left:8px; padding:4px 8px; border-radius:999px; font-size:11px; background:#eef2ff; color:#4338ca;">${window.escapeHTML(pergunta.categoria)}</span></label>
            <input type="hidden" class="rh-perfil-pergunta-texto" value="${window.escapeHTML(pergunta.texto)}">
            <input type="hidden" class="rh-perfil-pergunta-categoria" value="${window.escapeHTML(pergunta.categoria)}">
            <div class="rh-scale-row">${[1,2,3,4,5].map(n => `<label class="rh-scale-option"><input type="radio" name="perfil_${avaliacaoId}_${idx}" value="${n}"><span>${n}</span></label>`).join('')}</div>
        </div>
    `).join('');
    document.getElementById('modal-responder-perfil').style.display = 'flex';
};

window.enviarRespostaPerfilRH = async function() {
    if(!window.alunoLogado) return;
    const avaliacaoId = document.getElementById('rh-perfil-resp-id').value;
    const nome = window.alunoLogado['Nome Completo do Colaborador'];
    const setor = window.alunoLogado['Setor da Clínica'] || 'Geral';
    const blocos = Array.from(document.querySelectorAll('#rh-perfil-resp-area .rh-resp-bloco'));
    const respostas = [];
    let incompleto = false;
    blocos.forEach(bloco => {
        const texto = bloco.querySelector('.rh-perfil-pergunta-texto').value;
        const categoria = bloco.querySelector('.rh-perfil-pergunta-categoria').value;
        const marcado = bloco.querySelector('input[type="radio"]:checked');
        if(!marcado) incompleto = true;
        respostas.push({ pergunta: texto, categoria, resposta: marcado ? Number(marcado.value) : null });
    });
    if(incompleto) return alert('Responda a todas as perguntas para enviar a avaliação.');
    try {
        const antiga = window.todosRespostasPerfil.find(item => item.data.avaliacaoId === avaliacaoId && item.data.nome === nome);
        if(antiga) {
            await window.updateDoc(window.doc(window.db, 'rh-perfil-respostas', antiga.id), { respostas, data: new Date().toISOString(), setor });
        } else {
            await window.addDoc(window.collection(window.db, 'rh-perfil-respostas'), { avaliacaoId, nome, setor, respostas, data: new Date().toISOString() });
        }
        alert('Avaliação de perfil enviada com sucesso!');
        document.getElementById('modal-responder-perfil').style.display = 'none';
        window.renderizarPesquisasAluno();
    } catch(e) { alert('Erro ao enviar avaliação: ' + e.message); }
};

window.abrirModalPerfilProfissional = function() {
    const modal = document.getElementById('modal-perfil-profissional');
    const select = document.getElementById('rh-perfil-select-colaborador');
    if(!modal || !select) return;
    select.innerHTML = `<option value="">Selecione um colaborador</option>` + listaColaboradoresGlobal.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    if(window.rhFiltroAtual.colaborador) select.value = window.rhFiltroAtual.colaborador;
    modal.style.display = 'flex';
    if(select.value) window.renderizarGraficoPerfilProfissional(select.value);
};

window.obterResumoPerfilColaborador = function(nome) {
    const respostas = window.todosRespostasPerfil.filter(item => item.data.nome === nome);
    const buckets = { 'Qualidades': [], 'Pontos Fortes': [], 'Pontos Fracos': [], 'Skills': [] };
    respostas.forEach(item => {
        (item.data.respostas || []).forEach(resp => {
            if(resp && buckets[resp.categoria] && Number.isFinite(Number(resp.resposta))) buckets[resp.categoria].push(Number(resp.resposta));
        });
    });
    const medias = Object.fromEntries(Object.entries(buckets).map(([categoria, valores]) => [categoria, valores.length ? Number((valores.reduce((a,b) => a+b, 0) / valores.length).toFixed(1)) : 0]));
    return { medias, totalAvaliacoes: respostas.length, totalRespostas: Object.values(buckets).reduce((acc, arr) => acc + arr.length, 0) };
};

window.renderizarGraficoPerfilProfissional = function(nome) {
    const resumo = window.obterResumoPerfilColaborador(nome);
    const canvas = document.getElementById('rh-perfil-radar-chart');
    const info = document.getElementById('rh-perfil-radar-info');
    if(!canvas || !info) return;
    const colaborador = listaColaboradoresGlobal.find(item => item.nome === nome);
    const labels = ['Qualidades', 'Pontos Fortes', 'Pontos Fracos', 'Skills'];
    const data = labels.map(label => resumo.medias[label] || 0);
    if(window.rhPerfilRadarChart) window.rhPerfilRadarChart.destroy();
    window.rhPerfilRadarChart = new Chart(canvas, {
        type: 'radar',
        data: { labels, datasets: [{ label: nome, data, fill: true, backgroundColor: 'rgba(139, 37, 44, 0.18)', borderColor: '#8B252C', pointBackgroundColor: '#8B252C', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#8B252C' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, min: 0, max: 5, ticks: { stepSize: 1, backdropColor: 'transparent' }, pointLabels: { font: { size: 13, weight: '600' } }, grid: { color: 'rgba(148,163,184,.35)' }, angleLines: { color: 'rgba(148,163,184,.25)' } } }, plugins: { legend: { display: false } } }
    });
    const mediaGeral = data.filter(v => v > 0).length ? (data.reduce((a,b)=>a+b,0) / data.filter(v => v > 0).length).toFixed(1) : '0.0';
    info.innerHTML = `
        <div class="rh-profile-summary-card"><span>Colaborador</span><strong>${window.escapeHTML(nome)}</strong><small>${window.escapeHTML(colaborador?.setor || 'Geral')}</small></div>
        <div class="rh-profile-summary-card"><span>Avaliações Respondidas</span><strong>${resumo.totalAvaliacoes}</strong><small>recolhas válidas</small></div>
        <div class="rh-profile-summary-card"><span>Média Global do Perfil</span><strong>${mediaGeral}</strong><small>escala 0 a 5</small></div>
        <div class="rh-profile-summary-card"><span>Qualidades / Skills</span><strong>${(resumo.medias['Qualidades'] || 0).toFixed(1)} / ${(resumo.medias['Skills'] || 0).toFixed(1)}</strong><small>forças-chave</small></div>
    `;
};

// ==========================================
// FUNÇÕES DO MÓDULO DE ATIVOS (QR Code, Gráfico e Câmara)
// ==========================================

let chartAtivosInst = null;
window.renderizarGraficoAtivos = function() {
    const ctx = document.getElementById('chart-ativos-status');
    if (!ctx) return;

    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const contagem = {};
    ativos.forEach(item => {
        const statusBruto = String(item.data?.['Status do Ativo'] || 'Não Informado').trim();
        const status = statusBruto || 'Não Informado';
        contagem[status] = (contagem[status] || 0) + 1;
    });

    const labels = Object.keys(contagem);
    const values = Object.values(contagem);

    if (chartAtivosInst) chartAtivosInst.destroy();

    chartAtivosInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: ['#38a169', '#ecc94b', '#e53e3e', '#3182ce', '#805ad5', '#a0aec0', '#0ea5e9', '#f97316']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    const resumoEl = document.getElementById('ativos-status-resumo');
    if (resumoEl) {
        resumoEl.innerHTML = labels.length
            ? labels.map((label, idx) => `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:120px;">
                    <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">${window.escapeHTML(label)}</div>
                    <div style="font-size:20px; color:#0f172a; font-weight:800;">${values[idx]}</div>
                </div>
            `).join('')
            : '<div style="color:#64748b; font-size:13px;">Nenhum ativo cadastrado ainda.</div>';
    }

    if (typeof window.atualizarOpcoesEtiquetasAtivos === 'function') {
        window.atualizarOpcoesEtiquetasAtivos();
    }
};

let html5QrcodeScanner = null;

window.iniciarLeitorQR = function() {
    const modal = document.getElementById('modal-camera-qr');
    if(modal) modal.style.display = 'flex';

    if (window.location.protocol === 'file:') {
        alert("⚠️ ATENÇÃO: A câmara foi bloqueada pelo navegador.\n\nPara a câmara funcionar, o sistema precisa estar a correr num ambiente seguro (HTTPS). Suba esta atualização para o seu GitHub Pages!");
    }

    try {
        if (typeof Html5QrcodeScanner === 'undefined') {
            alert("A biblioteca do leitor QR ainda está a carregar. Aguarde alguns segundos ou recarregue a página.");
            return;
        }

        html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
        }, false);

        html5QrcodeScanner.render(window.onScanSuccess, window.onScanFailure);
    } catch (error) {
        console.error("Erro ao iniciar câmara:", error);
        alert("Erro ao tentar aceder à câmara. Verifique se concedeu as permissões necessárias no seu navegador.");
    }
};

window.fecharLeitorQR = function() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            document.getElementById('modal-camera-qr').style.display = 'none';
        }).catch(error => { console.error("Falha ao fechar câmara.", error); });
    } else {
        document.getElementById('modal-camera-qr').style.display = 'none';
    }
};

window.onScanSuccess = function(decodedText, decodedResult) {
    window.fecharLeitorQR();
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const ativoEncontrado = ativos.find(a => a.id === decodedText || a.data['Número de Patrimônio'] === decodedText);

    if(ativoEncontrado) {
        alert("Equipamento localizado com sucesso!");
        window.abrirModal('ativos', ativoEncontrado.id, ativoEncontrado.data);
    } else {
        alert("QR Code lido: " + decodedText + "\n\nInfelizmente, este equipamento não foi encontrado no sistema ou não pertence à nossa base.");
    }
};

window.onScanFailure = function(error) {
    // Silencioso para evitar span de erros enquanto tenta focar no QR
};

// ==========================================
// 8. ATRIBUIÇÃO DE EVENTOS DE CLIQUES E INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {

    const mainContent = document.querySelector('.main-content');
    if(mainContent) {
        mainContent.addEventListener('click', async (e) => {
            const btnExcluir = e.target?.closest('.btn-delete');
            const btnEditar = e.target?.closest('.btn-edit');
            const btnAssinar = e.target?.closest('.btn-assinar');

            if (btnAssinar) {
                const id = btnAssinar?.getAttribute('data-id');
                const colecao = btnAssinar?.getAttribute('data-colecao');
                if (id && colecao) {
                    await window.confirmarAssinaturaLeitura(id, colecao);
                }
                return;
            }

            if (btnExcluir && isAdmin) {
                const colecao = btnExcluir?.getAttribute('data-colecao');
                const id = btnExcluir?.getAttribute('data-id');

                if (!colecao || !id) return;

                if (confirm("Tem a certeza que deseja excluir permanentemente este item?")) {
                    try {
                        await window.deleteDoc(window.doc(window.db, colecao, id));
                    } catch(err) {
                        alert("Erro ao tentar excluir: " + err.message);
                    }
                }
                return;
            }

            if (btnEditar && isAdmin) {
                const colecao = btnEditar?.getAttribute('data-colecao');
                const id = btnEditar?.getAttribute('data-id');
                const info = btnEditar?.getAttribute('data-info');

                if (colecao && id && info) {
                    window.abrirModal(colecao, id, window.safeParseJSON(info, {}));
                }
            }
        });
    }

    const btnSalvar = document.getElementById('btn-salvar-dados');
    if(btnSalvar) {
        // Recriar o botão para remover os event listeners antigos, se existirem
        const novoBtnSalvar = btnSalvar.cloneNode(true);
        btnSalvar.parentNode.replaceChild(novoBtnSalvar, btnSalvar);

        novoBtnSalvar.addEventListener('click', async () => {
            if (novoBtnSalvar.getAttribute('data-colecao') === 'treinamentos' && document.getElementById('quiz-questions-list')) {
                window.sincronizarQuizJSON();
            }

            const colecao = novoBtnSalvar.getAttribute('data-colecao');
            const docId = document.getElementById('modal-doc-id').value;
            const config = configuracaoAbas[colecao];
            if(!config) return;

            const btnOriginal = novoBtnSalvar.innerHTML;
            novoBtnSalvar.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> A guardar...';

            let dados = { corCard: document.getElementById('card-color') ? document.getElementById('card-color').value : '#ffffff' };

            config.campos.forEach(c => {
                const val = document.getElementById('input-'+c);
                if((colecao === 'boletins' || colecao === 'treinamentos') && c === 'Para quais Setores?') {
                    const checks = Array.from(document.querySelectorAll('.check-setor:checked')).map(el => el.value);
                    dados[c] = checks.join(', ');
                } else if(val) { dados[c] = val.value; }
            });

            if (colecao === 'treinamentos') {
                const tipoTreino = String(dados['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '');
                if (!dados['Modo de Controle']) dados['Modo de Controle'] = tipoTreino.includes('Prova') ? 'prova_bloqueada' : (tipoTreino.includes('Tarefa') ? 'atividade_com_pausa' : 'material_apenas_leitura');
                if (!dados['Permite Pausa?']) dados['Permite Pausa?'] = dados['Modo de Controle'] === 'atividade_com_pausa' ? 'Sim' : 'Não';
                if (!dados['Limite de Infrações']) dados['Limite de Infrações'] = '3';
                if (!dados['Regra ao Sair']) dados['Regra ao Sair'] = dados['Modo de Controle'] === 'prova_bloqueada' ? 'zerada_por_saida' : 'inconclusa';
            }

            if (colecao === 'ativos') {
                if (!dados['Setor'] && dados['Localização / Setor']) dados['Setor'] = dados['Localização / Setor'];
                if (!dados['Localização / Setor'] && dados['Setor']) dados['Localização / Setor'] = dados['Setor'];

                const patrimonioInformado = String(dados['Número de Patrimônio'] || '').trim();
                if (!docId && !patrimonioInformado) {
                    const contadorRef = window.doc(window.db, 'configuracoes', 'contador_patrimonio');
                    try {
                        const novoNumero = await runTransaction(window.db, async (transaction) => {
                            const contadorSnap = await transaction.get(contadorRef);
                            const ultimoNumero = contadorSnap.exists() ? Number(contadorSnap.data().ultimoNumero || 0) : 0;
                            const proximoNumero = ultimoNumero + 1;
                            transaction.set(contadorRef, {
                                ultimoNumero: proximoNumero,
                                atualizadoEm: new Date().toISOString(),
                                atualizadoPor: emailLogado || 'Gestor'
                            }, { merge: true });
                            return proximoNumero;
                        });
                        dados['Número de Patrimônio'] = String(novoNumero);
                    } catch (errorPatrimonio) {
                        throw new Error('Falha ao gerar o número de patrimônio automático: ' + errorPatrimonio.message);
                    }
                }
            }

            // --- HISTÓRICO DE ATIVOS ---
            if (colecao === 'ativos') {
                const acao = docId ? 'Editado/Movimentado' : 'Cadastrado';
                const dataAntiga = docId ? (window.dadosGlobaisAbas['ativos']?.find(a => a.id === docId)?.data || {}) : {};
                const logTexto = `${acao} em ${new Date().toLocaleString('pt-PT')} por ${emailLogado || 'Gestor'}`;

                if (docId) {
                    const histAntigo = Array.isArray(dataAntiga.historico) ? dataAntiga.historico : [];
                    dados.historico = [...histAntigo, logTexto];
                }
                else { dados.historico = [logTexto]; }
            }

            try {
                if(docId) {
                    await window.setDoc(window.doc(window.db, colecao, docId), dados, { merge: true });
                } else {
                    await window.addDoc(window.collection(window.db, colecao), dados);
                }
                window.fecharModal();

                if (colecao === 'ativos') {
                    setTimeout(() => { if(typeof window.renderizarGraficoAtivos === 'function') window.renderizarGraficoAtivos(); }, 500);
                }
            } catch(e) { alert("Erro ao guardar: " + e.message); }
            novoBtnSalvar.innerHTML = btnOriginal;
        });
    }

    const btnSalvarAjustes = document.getElementById('btn-salvar-ajustes');
    if(btnSalvarAjustes) {
        btnSalvarAjustes.addEventListener('click', async () => {
            if(!isAdmin) return;
            const texto = document.getElementById('tab-input-banner').value;
            const locaisTexto = document.getElementById('tab-input-locais').value;
            const setoresTexto = document.getElementById('tab-input-setores').value;
            const especialidadesTexto = document.getElementById('tab-input-especialidades').value;
            const motivosTexto = document.getElementById('tab-input-motivos').value;
            const corPend = document.getElementById('tab-color-pendente').value;
            const corConc = document.getElementById('tab-color-concluido').value;

            const imgPastaInput = document.getElementById('tab-input-imagem-pastas'); const imgPastasTexto = imgPastaInput ? imgPastaInput.value : "";
            const chatLogoInput = document.getElementById('tab-input-chat-logo'); const chatLogoTexto = chatLogoInput ? chatLogoInput.value : "";
            const chatCorInput = document.getElementById('tab-color-chat'); const chatCorVal = chatCorInput ? chatCorInput.value : "#0ba360";

            btnSalvarAjustes.innerHTML = "A guardar...";
            try {
                await window.setDoc(window.doc(window.db, "configuracoes", "gerais"), {
                    banner_texto: texto, locais: locaisTexto, setores: setoresTexto, especialidades: especialidadesTexto, motivos: motivosTexto,
                    cor_pendente: corPend, cor_concluido: corConc, imagem_padrao_pastas: imgPastasTexto, chat_logo: chatLogoTexto, chat_cor: chatCorVal
                }, { merge: true });
                alert("Configurações guardadas com sucesso!");
            } catch(e) { alert("Erro ao guardar configurações: " + e.message); }
            btnSalvarAjustes.innerHTML = 'Salvar Alterações';
        });
    }

    const inputPesqGlobal = document.getElementById('input-pesquisa-global');
    if(inputPesqGlobal) {
        inputPesqGlobal.addEventListener('keyup', (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const areaRes = document.getElementById('resultados-globais');
            if(!areaRes) return;
            if(texto.length < 2) { areaRes.style.display = 'none'; areaRes.innerHTML = ''; return; }

            const colecoesBusca = ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'pacotes', 'remocoes', 'colaboradores', 'ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'boletins', 'boletins-privados', 'treinamentos', 'ativos'];
            const vistos = new Set();
            let htmlResultados = '';
            let encontrou = false;

            colecoesBusca.forEach(colecao => {
                const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
                itens.forEach(item => {
                    const textoItem = Object.values(item.data || {}).join(' ').toLowerCase();
                    const chave = `${colecao}:${item.id}`;
                    if(textoItem.includes(texto) && !vistos.has(chave)) {
                        vistos.add(chave);
                        htmlResultados += window.gerarHTMLCard(colecao, item.id, item.data);
                        encontrou = true;
                    }
                });
            });

            areaRes.style.display = 'grid';
            areaRes.innerHTML = '<h3 style="grid-column: 1/-1; margin-bottom: 10px; border-bottom: 2px solid var(--border-color); padding-bottom: 5px; color: var(--primary-color);">Resultados da Busca Global:</h3>' + (encontrou ? htmlResultados : '<p style="color:var(--text-muted); font-size:14px; grid-column: 1/-1;">Nenhum resultado encontrado no sistema.</p>');
        });
    }

    const inputPesqAba = document.getElementById('input-pesquisa');
    if(inputPesqAba) {
        inputPesqAba.addEventListener('keyup', (e) => {
            const texto = e.target.value.toLowerCase();
            const abaContainer = document.getElementById(`tab-${abaAtual}`);
            if(!abaContainer) return;
            abaContainer.querySelectorAll('.card, .shortcut-card, .mini-card').forEach(card => {
                if(card.innerText.toLowerCase().includes(texto)) card.style.display = 'flex';
                else card.style.display = 'none';
            });
        });
    }

    ['privado-lista-data-inicio', 'privado-lista-data-fim'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => window.renderizarListaPrivados());
    });
    const btnLimparFiltroPrivado = document.getElementById('btn-limpar-filtro-privado-lista');
    if (btnLimparFiltroPrivado) {
        btnLimparFiltroPrivado.addEventListener('click', () => {
            const dtInicioPriv = document.getElementById('privado-lista-data-inicio');
            const dtFimPriv = document.getElementById('privado-lista-data-fim');
            if (dtInicioPriv) dtInicioPriv.value = '';
            if (dtFimPriv) dtFimPriv.value = '';
            window.renderizarListaPrivados();
        });
    }

    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            abaAtual = btn.getAttribute('data-tab');
            const tabEl = document.getElementById(`tab-${abaAtual}`);
            if(tabEl) tabEl.style.display = 'block';

            const titleEl = document.getElementById('page-title');
            if(titleEl) titleEl.textContent = btn.textContent.trim();
            const inputPesqLocal = document.getElementById('input-pesquisa');
            if(inputPesqLocal) inputPesqLocal.value = '';

            if(abaAtual === 'boletins') window.fecharPastaBoletim();
            if(abaAtual === 'boletins-privados') window.fecharPastaPrivado();
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'treinamentos', 'pacotes', 'ativos'].forEach(col => { if(abaAtual === col) window.fecharPastaGenerica(col); });
            if(abaAtual === 'rh' && isAdmin) { window.atualizarOpcoesFiltrosRH(); window.renderizarDashboardRH(); }
            if (window.atualizarBottomQuickbar) window.atualizarBottomQuickbar();
        });
    });
});

window.efetuarLogin = window.efetuarLogin;
window.safeParseJSON = window.safeParseJSON;
window.aplicarImagemClimaHome = window.aplicarImagemClimaHome;
window.abrirMidiaFlutuante = window.abrirMidiaFlutuante;
window.abrirMidaFlutuante = window.abrirMidiaFlutuante;
window.fecharMidiaFlutuante = window.fecharMidiaFlutuante;
window.abrirListaLeituras = window.abrirListaLeituras;
window.fecharModalImpressao = window.fecharModalImpressao;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.info('Novo service worker ativo.');
    });
}
window.fecharModalImpressao = function() {
    const modal = document.getElementById('modal-imprimir-boletim');
    if (modal) modal.style.display = 'none';
};
window.abrirModalImpressao = function(tipo = 'boletins') {
    const modal = document.getElementById('modal-imprimir-boletim');
    const inputTipo = document.getElementById('print-boletim-id');
    const selectColab = document.getElementById('print-colaborador');

    if (!modal) {
        alert('Modal de impressão não encontrado.');
        return;
    }

    if (inputTipo) inputTipo.value = tipo;

    if (selectColab) {
        selectColab.innerHTML = '<option value="">Todos os Colaboradores</option>' +
            listaColaboradoresGlobal.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    }

    modal.style.display = 'flex';
};

window.gerarImpressaoBoletim = function() {
    const incluirNome = document.getElementById('print-chk-nome')?.checked;
    const incluirData = document.getElementById('print-chk-data')?.checked;
    const incluirTema = document.getElementById('print-chk-tema')?.checked;
    const incluirMotivo = document.getElementById('print-chk-motivo')?.checked;
    const incluirPublicacao = document.getElementById('print-chk-publicacao')?.checked;

    const tipo = document.getElementById('print-boletim-id')?.value || 'boletins';

    const dataInicio = document.getElementById('print-data-inicio')?.value;
    const dataFim = document.getElementById('print-data-fim')?.value;
    const colabFiltro = document.getElementById('print-colaborador')?.value;

    let boletins = tipo === 'boletins-privados'
        ? (Array.isArray(window.todosPrivadosData) ? [...window.todosPrivadosData] : [])
        : (Array.isArray(window.todosBoletinsData) ? [...window.todosBoletinsData] : []);

    if (!boletins.length) {
        alert('Não há dados carregados para gerar o relatório.');
        return;
    }

    if (dataInicio || dataFim) {
        boletins = boletins.filter(item => {
            const d = item.data['Data de Publicação'] || item.data['Publicado em'];
            if (!d) return false;
            if (dataInicio && d < dataInicio) return false;
            if (dataFim && d > dataFim) return false;
            return true;
        });
    }

    const linhas = [];

    boletins.forEach(item => {
        const data = item.data || {};
        const leituras = Array.isArray(data.leituras) ? data.leituras : [];
        const titulo = data['Título do Documento'] || data['Título do Informativo'] || 'Sem título';
        const motivo = data['Motivo do Informativo'] || data['Motivo'] || '-';
        const dataPublicacao = data['Data de Publicação'] || data['Publicado em'] || '-';

        if (tipo === 'boletins-privados' && colabFiltro) {
            if (data['Para qual Colaborador?'] !== colabFiltro) return;
        }

        if (!leituras.length) {
            if (!colabFiltro) {
                linhas.push({
                    nome: 'Nenhuma assinatura registada', dataHora: '-', tema: titulo, motivo, publicacao: dataPublicacao
                });
            }
            return;
        }

        leituras.forEach(registro => {
            const texto = String(registro || '').trim();
            let nomeColaborador = texto;
            let dataHora = '-';

            const matchParenteses = texto.match(/^(.*?)\s*\((.*?)\)$/);
            const matchHifen = texto.match(/^(.*?)\s*-\s*(\d{2}\/\d{2}\/\d{4}.*)$/);
            if (matchParenteses) {
                nomeColaborador = matchParenteses[1].trim();
                dataHora = matchParenteses[2].trim();
            } else if (matchHifen) {
                nomeColaborador = matchHifen[1].trim();
                dataHora = matchHifen[2].trim();
            }

            if (colabFiltro && nomeColaborador !== colabFiltro) return;

            linhas.push({
                nome: nomeColaborador || '-',
                dataHora,
                tema: titulo,
                motivo,
                publicacao: dataPublicacao
            });
        });
    });

    if (linhas.length === 0) {
        alert('Nenhuma assinatura encontrada para os filtros selecionados.');
        return;
    }

    const ths = [];
    if (incluirNome) ths.push('<th>Nome do Colaborador</th>');
    if (incluirData) ths.push('<th>Data/Hora da Assinatura</th>');
    if (incluirTema) ths.push('<th>Tema</th>');
    if (incluirMotivo) ths.push('<th>Motivo</th>');
    if (incluirPublicacao) ths.push('<th>Data de Publicação</th>');

    const escape = (valor) => String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

    const trs = linhas.map(linha => {
        const cols = [];
        if (incluirNome) cols.push(`<td>${escape(linha.nome)}</td>`);
        if (incluirData) cols.push(`<td>${escape(linha.dataHora)}</td>`);
        if (incluirTema) cols.push(`<td>${escape(linha.tema)}</td>`);
        if (incluirMotivo) cols.push(`<td>${escape(linha.motivo)}</td>`);
        if (incluirPublicacao) cols.push(`<td>${escape(linha.publicacao)}</td>`);
        return `<tr>${cols.join('')}</tr>`;
    }).join('');

    const janela = window.open('', '_blank', 'width=1200,height=800');
    if (!janela) { alert('O navegador bloqueou a janela de impressão. Permita os pop-ups para este site.'); return; }

    const subtituloFiltro = colabFiltro ? `<p>Filtrado por Colaborador: <b>${colabFiltro}</b></p>` : '';
    const periodoFiltro = (dataInicio || dataFim) ? `<p>Período: <b>${dataInicio ? dataInicio.split('-').reverse().join('/') : 'Início'} até ${dataFim ? dataFim.split('-').reverse().join('/') : 'Hoje'}</b></p>` : '';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Assinaturas</title>
<style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { color: #8B252C; margin-bottom: 8px; }
    p { margin: 0 0 5px; color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; vertical-align: top; }
    th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background-color: #f9fafb; }
    @media print { @page { margin: 1.5cm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
    <h1>Relatório de Assinaturas e Leituras</h1>
    <p>Gerado em: <b>${new Date().toLocaleString('pt-PT')}</b></p>
    ${subtituloFiltro}
    ${periodoFiltro}

    <table>
        <thead><tr>${ths.join('')}</tr></thead>
        <tbody>${trs}</tbody>
    </table>

    <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 300); };
    </script>
</body>
</html>`;

    janela.document.write(html);
    janela.document.close();
    janela.focus();
};


// ==========================================
// FASE 1 - CONTROLE DE ATIVOS: UNIDADES > SETORES > ATIVOS + INVENTÁRIO
// ==========================================

configuracaoAbas['ativos'] = configuracaoAbas['ativos'] || {
    titulo: 'Ativo da Empresa',
    campos: [],
    icone: 'ri-qr-code-line'
};

configuracaoAbas['ativos'].campos = [
    'Nome do Equipamento',
    'Categoria',
    'Número de Patrimônio',
    'Unidade Local',
    'Setor',
    'Localização / Setor',
    'Responsável',
    'Status do Ativo',
    'Observações'
];

window.ativosUnidadeAtual = null;
window.ativosSetorAtual = null;
window.inventariosAtivosData = [];
window.inventarioAtivoSession = null;
window.html5QrcodeInventario = null;
window._inventarioUltimoCodigo = '';
window._inventarioUltimaLeituraEm = 0;
window._inventariosAtivosEscutando = false;

window.obterUnidadeAtivo = function(data = {}) {
    const unidade = String(data['Unidade Local'] || '').trim();
    if (unidade) return unidade;
    const legado = String(data['Localização / Setor'] || '').trim();
    return legado ? 'Sem Unidade Definida' : 'Sem Unidade';
};

window.obterSetorAtivo = function(data = {}) {
    const setor = String(data['Setor'] || '').trim();
    if (setor) return setor;
    const legado = String(data['Localização / Setor'] || '').trim();
    return legado || 'Sem Setor';
};

window.obterNomeAtivo = function(data = {}) {
    return String(data['Nome do Equipamento'] || 'Ativo sem nome').trim() || 'Ativo sem nome';
};

window.obterStatusInventarioBadge = function(status = '') {
    const s = String(status || '').toLowerCase();
    if (s === 'concluido') return { cor: '#38a169', texto: 'Concluído' };
    if (s === 'pendente' || s === 'pausado') return { cor: '#d97706', texto: 'Pendente' };
    if (s === 'em_andamento') return { cor: '#2563eb', texto: 'Em andamento' };
    return { cor: '#64748b', texto: 'Sem inventário' };
};

window.obterResumoInventarioLocal = function(unidade = '', setor = '') {
    const docs = (window.inventariosAtivosData || []).filter(item => {
        const data = item.data || {};
        if (String(data.unidade || '') !== String(unidade || '')) return false;
        if (setor && String(data.setor || '') !== String(setor || '')) return false;
        return true;
    });

    if (!docs.length) {
        return {
            status: 'sem_inventario',
            badge: window.obterStatusInventarioBadge(''),
            totalEsperado: 0,
            totalLido: 0,
            pendentes: 0,
            divergencias: 0,
            atualizadoEm: ''
        };
    }

    docs.sort((a, b) => String(b.data?.atualizado_em || b.data?.iniciado_em || '').localeCompare(String(a.data?.atualizado_em || a.data?.iniciado_em || '')));
    const ultimo = docs[0].data || {};
    const totalEsperado = Array.isArray(ultimo.itensEsperadosIds) ? ultimo.itensEsperadosIds.length : Number(ultimo.totalEsperado || 0);
    const totalLido = Array.isArray(ultimo.itensLidosIds) ? ultimo.itensLidosIds.length : Number(ultimo.totalLido || 0);
    const pendentes = Array.isArray(ultimo.itensPendentesIds) ? ultimo.itensPendentesIds.length : Math.max(0, totalEsperado - totalLido);
    const divergencias = Array.isArray(ultimo.itensDivergentes) ? ultimo.itensDivergentes.length : 0;
    return {
        status: ultimo.status || '',
        badge: window.obterStatusInventarioBadge(ultimo.status || ''),
        totalEsperado,
        totalLido,
        pendentes,
        divergencias,
        atualizadoEm: ultimo.atualizado_em || ultimo.iniciado_em || ''
    };
};

window.obterUnidadesAtivos = function() {
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const set = new Set();
    ativos.forEach(item => set.add(window.obterUnidadeAtivo(item.data || {})));
    if (!set.size && Array.isArray(locaisGlobais)) locaisGlobais.filter(Boolean).forEach(l => set.add(String(l).trim()));
    return Array.from(set).filter(Boolean).sort((a,b) => a.localeCompare(b));
};

window.obterSetoresPorUnidadeAtivos = function(unidade = '') {
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const set = new Set();
    ativos.forEach(item => {
        const data = item.data || {};
        if (window.obterUnidadeAtivo(data) === unidade) set.add(window.obterSetorAtivo(data));
    });
    return Array.from(set).filter(Boolean).sort((a,b) => a.localeCompare(b));
};

window.obterAtivosPorUnidadeESetor = function(unidade = '', setor = '') {
    return (window.dadosGlobaisAbas['ativos'] || []).filter(item => {
        const data = item.data || {};
        return window.obterUnidadeAtivo(data) === unidade && window.obterSetorAtivo(data) === setor;
    });
};

window.atualizarCabecalhoAtivosFase1 = function() {
    const infoEl = document.querySelector('#tab-ativos #ativos-view-folders .flex-between p.text-muted');
    const titleEl = document.getElementById('titulo-pasta-ativos');

    if (infoEl) {
        if (!window.ativosUnidadeAtual) infoEl.textContent = 'Selecione a unidade da empresa para navegar pelos setores e ativos.';
        else infoEl.textContent = `Unidade atual: ${window.ativosUnidadeAtual}. Selecione um setor para ver os ativos.`;
    }

    if (titleEl) {
        if (window.ativosUnidadeAtual && window.ativosSetorAtual) titleEl.innerHTML = `<i class="ri-building-4-line"></i> ${window.escapeHTML(window.ativosUnidadeAtual)} / ${window.escapeHTML(window.ativosSetorAtual)}`;
        else titleEl.innerHTML = '<i class="ri-building-4-line"></i> Ativos';
    }
};

window.renderizarOverviewInventarioAtivos = function() {
    const wrap = document.getElementById('ativos-inventario-overview');
    if (!wrap) return;
    const inventarios = window.inventariosAtivosData || [];
    const total = inventarios.length;
    const andamento = inventarios.filter(i => String(i.data?.status || '') === 'em_andamento').length;
    const pendentes = inventarios.filter(i => ['pendente', 'pausado'].includes(String(i.data?.status || ''))).length;
    const concluidos = inventarios.filter(i => String(i.data?.status || '') === 'concluido').length;

    wrap.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:14px;">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:140px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Inventários</div>
                <div style="font-size:20px; color:#0f172a; font-weight:800;">${total}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:140px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Em andamento</div>
                <div style="font-size:20px; color:#2563eb; font-weight:800;">${andamento}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:140px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Pendentes</div>
                <div style="font-size:20px; color:#d97706; font-weight:800;">${pendentes}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:140px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Concluídos</div>
                <div style="font-size:20px; color:#38a169; font-weight:800;">${concluidos}</div>
            </div>
        </div>
    `;
};

window.renderizarPastasAtivosFase1 = function() {
    const grid = document.getElementById('grid-ativos-folders');
    if (!grid) return;

    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    grid.innerHTML = '';
    window.atualizarCabecalhoAtivosFase1();
    window.renderizarOverviewInventarioAtivos();

    if (!ativos.length) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhum ativo cadastrado ainda.</p>';
        return;
    }

    if (!window.ativosUnidadeAtual) {
        const unidades = window.obterUnidadesAtivos();
        unidades.forEach(unidade => {
            const itens = ativos.filter(item => window.obterUnidadeAtivo(item.data || {}) === unidade);
            const setores = new Set(itens.map(item => window.obterSetorAtivo(item.data || {})));
            const resumo = window.obterResumoInventarioLocal(unidade, '');
            grid.innerHTML += `
                <div class="shortcut-card" onclick="window.abrirPastaGenerica('ativos', '${unidade.replace(/'/g, "\\'")}')" style="text-align:left; padding:20px; border-left:6px solid ${resumo.badge.cor};">
                    <div style="display:flex; align-items:center; gap:15px; margin-bottom:12px;">
                        <div style="background:var(--bg-color); padding:15px; border-radius:12px; color:${resumo.badge.cor}; font-size:24px;"><i class="ri-building-4-line"></i></div>
                        <div>
                            <div style="font-size:16px; font-weight:700;">${window.escapeHTML(unidade)}</div>
                            <div style="font-size:12px; color:#64748b;">${itens.length} ativo(s) • ${setores.size} setor(es)</div>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:#f8fafc; padding:10px; border-radius:10px; font-size:12px;">
                        <span style="color:${resumo.badge.cor}; font-weight:700;">${resumo.badge.texto}</span>
                        <span style="color:#475569;">Pendentes: <b>${resumo.pendentes}</b></span>
                    </div>
                </div>
            `;
        });
        return;
    }

    const setores = window.obterSetoresPorUnidadeAtivos(window.ativosUnidadeAtual);
    if (!setores.length) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhum setor com ativos nesta unidade.</p>';
        return;
    }

    setores.forEach(setor => {
        const itens = window.obterAtivosPorUnidadeESetor(window.ativosUnidadeAtual, setor);
        const resumo = window.obterResumoInventarioLocal(window.ativosUnidadeAtual, setor);
        grid.innerHTML += `
            <div class="shortcut-card" onclick="window.abrirPastaGenerica('ativos', '${setor.replace(/'/g, "\\'")}')" style="text-align:left; padding:20px; border-left:6px solid ${resumo.badge.cor};">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:12px;">
                    <div style="background:var(--bg-color); padding:15px; border-radius:12px; color:${resumo.badge.cor}; font-size:24px;"><i class="ri-folder-3-line"></i></div>
                    <div>
                        <div style="font-size:16px; font-weight:700;">${window.escapeHTML(setor)}</div>
                        <div style="font-size:12px; color:#64748b;">${itens.length} ativo(s) neste setor</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:#f8fafc; padding:10px; border-radius:10px; font-size:12px; flex-wrap:wrap;">
                    <span style="color:${resumo.badge.cor}; font-weight:700;">${resumo.badge.texto}</span>
                    <span style="color:#475569;">Lidos: <b>${resumo.totalLido}</b> / ${resumo.totalEsperado || itens.length}</span>
                    <span style="color:#475569;">Pendentes: <b>${resumo.pendentes}</b></span>
                </div>
            </div>
        `;
    });
};

window.renderizarListaAtivosFase1 = function() {
    const grid = document.getElementById('grid-ativos-list');
    if (!grid) return;
    grid.innerHTML = '';
    window.atualizarCabecalhoAtivosFase1();

    if (!window.ativosUnidadeAtual || !window.ativosSetorAtual) {
        grid.innerHTML = '<div style="grid-column:1/-1; color: var(--text-muted); font-size:14px; padding: 10px 0;">Selecione uma unidade e um setor para ver os ativos.</div>';
        return;
    }

    const itens = window.obterAtivosPorUnidadeESetor(window.ativosUnidadeAtual, window.ativosSetorAtual)
        .sort((a,b) => window.obterNomeAtivo(a.data || {}).localeCompare(window.obterNomeAtivo(b.data || {})));

    if (!itens.length) {
        grid.innerHTML = '<div style="grid-column:1/-1; color: var(--text-muted); font-size:14px; padding: 10px 0;">Nenhum ativo encontrado neste setor.</div>';
        return;
    }

    itens.forEach(item => { grid.innerHTML += window.gerarHTMLCard('ativos', item.id, item.data); });
};

(function(){
    const oldRenderPastasGenericas = window.renderizarPastasGenericas;
    const oldRenderizarListaGenerica = window.renderizarListaGenerica;
    const oldAbrirPastaGenerica = window.abrirPastaGenerica;
    const oldFecharPastaGenerica = window.fecharPastaGenerica;
    const oldAbrirModal = window.abrirModal;
    const oldRenderizarGraficoAtivos = window.renderizarGraficoAtivos;

    window.renderizarPastasGenericas = function(colecao) {
        if (colecao === 'ativos') return window.renderizarPastasAtivosFase1();
        return oldRenderPastasGenericas(colecao);
    };

    window.renderizarListaGenerica = function(colecao) {
        if (colecao === 'ativos') return window.renderizarListaAtivosFase1();
        return oldRenderizarListaGenerica(colecao);
    };

    window.abrirPastaGenerica = function(colecao, valorPasta, docIdDestino = null) {
        if (colecao !== 'ativos') return oldAbrirPastaGenerica(colecao, valorPasta, docIdDestino);
        if (!window.ativosUnidadeAtual) {
            window.ativosUnidadeAtual = valorPasta;
            window.ativosSetorAtual = null;
            window.pasta_ativos_Atual = null;
            document.getElementById('ativos-view-folders').style.display = 'block';
            document.getElementById('ativos-view-list').style.display = 'none';
            window.renderizarPastasAtivosFase1();
            return;
        }
        window.ativosSetorAtual = valorPasta;
        window.pasta_ativos_Atual = valorPasta;
        document.getElementById('ativos-view-folders').style.display = 'none';
        document.getElementById('ativos-view-list').style.display = 'block';
        window.renderizarListaAtivosFase1();
        if (docIdDestino) window.destacarCard(docIdDestino);
    };

    window.fecharPastaGenerica = function(colecao) {
        if (colecao !== 'ativos') return oldFecharPastaGenerica(colecao);
        if (window.ativosSetorAtual) {
            window.ativosSetorAtual = null;
            window.pasta_ativos_Atual = null;
            document.getElementById('ativos-view-folders').style.display = 'block';
            document.getElementById('ativos-view-list').style.display = 'none';
            window.renderizarPastasAtivosFase1();
            return;
        }
        window.ativosUnidadeAtual = null;
        window.ativosSetorAtual = null;
        window.pasta_ativos_Atual = null;
        document.getElementById('ativos-view-folders').style.display = 'block';
        document.getElementById('ativos-view-list').style.display = 'none';
        window.renderizarPastasAtivosFase1();
    };

    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        oldAbrirModal(colecao, docId, dadosAntigos);
        if (colecao !== 'ativos') return;

        const unidadeInput = document.getElementById('input-Unidade Local');
        const setorInput = document.getElementById('input-Setor');
        const legadoInput = document.getElementById('input-Localização / Setor');
        const categoriaInput = document.getElementById('input-Categoria');

        const unidades = Array.from(new Set([
            ...(Array.isArray(locaisGlobais) ? locaisGlobais.map(v => String(v).trim()).filter(Boolean) : []),
            ...((window.dadosGlobaisAbas['ativos'] || []).map(item => window.obterUnidadeAtivo(item.data || {})).filter(Boolean))
        ])).sort((a,b) => a.localeCompare(b));

        const setores = Array.from(new Set([
            ...(Array.isArray(setoresGlobais) ? setoresGlobais.map(v => String(v).trim()).filter(Boolean) : []),
            ...((window.dadosGlobaisAbas['ativos'] || []).map(item => window.obterSetorAtivo(item.data || {})).filter(Boolean))
        ])).sort((a,b) => a.localeCompare(b));

        const replaceAsSelect = (input, values, placeholder, valorAtual) => {
            if (!input) return null;
            const select = document.createElement('select');
            select.id = input.id;
            select.className = input.className;
            select.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${window.escapeAttr(v)}">${window.escapeHTML(v)}</option>`).join('');
            select.value = valorAtual || input.value || '';
            input.parentNode.replaceChild(select, input);
            return select;
        };

        const unidadeAtual = (dadosAntigos && (dadosAntigos['Unidade Local'] || '')) || '';
        const setorAtual = (dadosAntigos && (dadosAntigos['Setor'] || dadosAntigos['Localização / Setor'] || '')) || '';

        const unidadeSelect = replaceAsSelect(unidadeInput, unidades, 'Selecione a unidade...', unidadeAtual);
        const setorSelect = replaceAsSelect(setorInput, setores, 'Selecione o setor...', setorAtual);

        if (legadoInput) {
            legadoInput.value = setorAtual || legadoInput.value || '';
            legadoInput.style.display = 'none';
            legadoInput.setAttribute('data-sync-legado', 'true');
        }

        if (setorSelect && legadoInput) {
            setorSelect.addEventListener('change', () => { legadoInput.value = setorSelect.value || ''; });
        }

        if (unidadeSelect) unidadeSelect.setAttribute('title', 'Campo obrigatório para a nova navegação de ativos');
        if (setorSelect) setorSelect.setAttribute('title', 'Campo obrigatório para a nova navegação de ativos');
        if (categoriaInput) categoriaInput.placeholder = 'Categoria / Tipo do ativo';
    };

    window.renderizarGraficoAtivos = function() {
        oldRenderizarGraficoAtivos();
        window.renderizarOverviewInventarioAtivos();
    };
})();

window.criarBotoesFase1InventarioAtivos = function() {
    document.querySelectorAll('#tab-ativos .flex-gap-10').forEach(wrap => {
        if (wrap.querySelector('.btn-inventario-ativos-fase1')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-hover color-5 admin-only btn-inventario-ativos-fase1';
        btn.style.display = 'none';
        btn.innerHTML = '<i class="ri-archive-drawer-line"></i> Inventário';
        btn.onclick = window.abrirModalInventarioAtivos;
        wrap.insertBefore(btn, wrap.firstChild);
    });
};

window.preencherSelectInventarioAtivos = function() {
    const unidadeSel = document.getElementById('inventario-unidade-select');
    const setorSel = document.getElementById('inventario-setor-select');
    if (!unidadeSel || !setorSel) return;

    const unidades = window.obterUnidadesAtivos();
    const unidadeAtual = window.ativosUnidadeAtual || unidadeSel.value || '';
    unidadeSel.innerHTML = '<option value="">Selecione a unidade</option>' + unidades.map(u => `<option value="${window.escapeAttr(u)}">${window.escapeHTML(u)}</option>`).join('');
    if (unidades.includes(unidadeAtual)) unidadeSel.value = unidadeAtual;

    const setores = unidadeSel.value ? window.obterSetoresPorUnidadeAtivos(unidadeSel.value) : [];
    const setorAtual = window.ativosSetorAtual || setorSel.value || '';
    setorSel.innerHTML = '<option value="">Selecione o setor</option>' + setores.map(s => `<option value="${window.escapeAttr(s)}">${window.escapeHTML(s)}</option>`).join('');
    if (setores.includes(setorAtual)) setorSel.value = setorAtual;
};

window.escutarInventariosAtivos = function() {
    const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
    if (!window.podeVerAbasRestritas || !window.podeVerAbasRestritas(emailAtual)) {
        window.inventariosAtivosData = [];
        window._inventariosAtivosEscutando = false;
        return;
    }
    if (window._inventariosAtivosEscutando) return;
    window._inventariosAtivosEscutando = true;
    onSnapshot(collection(db, 'inventarios_ativos'), (snapshot) => {
        const itens = [];
        snapshot.forEach(docSnap => itens.push({ id: docSnap.id, data: docSnap.data() }));
        window.inventariosAtivosData = itens;
        if (abaAtual === 'ativos') {
            window.renderizarOverviewInventarioAtivos();
            window.renderizarPastasAtivosFase1();
        }
        window.renderizarListaInventariosEmAberto();
    }, (error) => {
        console.error('Erro ao escutar inventários de ativos:', error);
        window._inventariosAtivosEscutando = false;
    });
};

window.abrirModalInventarioAtivos = function() {
    window.preencherSelectInventarioAtivos();
    window.renderizarListaInventariosEmAberto();
    const modal = document.getElementById('modal-inventario-ativos');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalInventarioAtivos = function() {
    const modal = document.getElementById('modal-inventario-ativos');
    if (modal) modal.style.display = 'none';
};

window.renderizarListaInventariosEmAberto = function() {
    const box = document.getElementById('inventario-lista-abertos');
    if (!box) return;
    const docs = (window.inventariosAtivosData || []).filter(item => ['em_andamento', 'pausado', 'pendente'].includes(String(item.data?.status || '')));
    if (!docs.length) {
        box.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum inventário em aberto no momento.</div>';
        return;
    }
    box.innerHTML = docs
        .sort((a, b) => String(b.data?.atualizado_em || '').localeCompare(String(a.data?.atualizado_em || '')))
        .map(item => {
            const data = item.data || {};
            const badge = window.obterStatusInventarioBadge(data.status || '');
            const esperado = Array.isArray(data.itensEsperadosIds) ? data.itensEsperadosIds.length : 0;
            const lidos = Array.isArray(data.itensLidosIds) ? data.itensLidosIds.length : 0;
            return `
                <div style="border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#fff; display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px;">
                    <div>
                        <div style="font-weight:700; color:#0f172a;">${window.escapeHTML(data.unidade || '-')} / ${window.escapeHTML(data.setor || '-')}</div>
                        <div style="font-size:12px; color:${badge.cor}; font-weight:700;">${badge.texto}</div>
                        <div style="font-size:12px; color:#64748b;">Lidos ${lidos} de ${esperado}</div>
                    </div>
                    <button type="button" class="btn-hover color-11" style="height:34px; font-size:12px;" onclick="window.retomarInventarioAtivo('${item.id}')"><i class="ri-play-circle-line"></i> Retomar</button>
                </div>
            `;
        }).join('');
};

window.gerarIdInventarioAtivo = function() {
    return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

window.persistirInventarioAtivo = async function() {
    if (!window.inventarioAtivoSession) return;
    const s = window.inventarioAtivoSession;
    s.atualizado_em = new Date().toISOString();
    s.itensPendentesIds = s.itensEsperadosIds.filter(id => !s.itensLidosIds.includes(id));
    s.totalEsperado = s.itensEsperadosIds.length;
    s.totalLido = s.itensLidosIds.length;
    try {
        await window.setDoc(window.doc(window.db, 'inventarios_ativos', s.id), s, { merge: true });
    } catch (error) {
        console.error('Erro ao persistir inventário:', error);
    }
};

window.iniciarInventarioAtivos = async function() {
    const unidadeSel = document.getElementById('inventario-unidade-select');
    const setorSel = document.getElementById('inventario-setor-select');
    const unidade = unidadeSel ? unidadeSel.value : '';
    const setor = setorSel ? setorSel.value : '';

    if (!unidade || !setor) {
        alert('Selecione a unidade e o setor antes de iniciar o inventário.');
        return;
    }

    const itens = window.obterAtivosPorUnidadeESetor(unidade, setor);
    if (!itens.length) {
        alert('Não existem ativos cadastrados para este setor.');
        return;
    }

    const session = {
        id: window.gerarIdInventarioAtivo(),
        unidade,
        setor,
        status: 'em_andamento',
        usuario: emailLogado || 'Gestor',
        iniciado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        itensEsperadosIds: itens.map(item => item.id),
        itensLidosIds: [],
        itensDivergentes: [],
        logs: [`Inventário iniciado em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`],
        totalEsperado: itens.length,
        totalLido: 0,
        itensPendentesIds: itens.map(item => item.id)
    };

    window.inventarioAtivoSession = session;
    await window.persistirInventarioAtivo();
    window.fecharModalInventarioAtivos();
    window.abrirExecucaoInventarioAtivo();
};

window.retomarInventarioAtivo = async function(docId) {
    const registro = (window.inventariosAtivosData || []).find(item => item.id === docId);
    if (!registro) {
        alert('Inventário não encontrado.');
        return;
    }
    window.inventarioAtivoSession = {
        id: registro.id,
        ...(registro.data || {})
    };
    window.inventarioAtivoSession.status = 'em_andamento';
    window.inventarioAtivoSession.logs = Array.isArray(window.inventarioAtivoSession.logs) ? window.inventarioAtivoSession.logs : [];
    window.inventarioAtivoSession.logs.push(`Inventário retomado em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
    await window.persistirInventarioAtivo();
    window.fecharModalInventarioAtivos();
    window.abrirExecucaoInventarioAtivo();
};

window.abrirExecucaoInventarioAtivo = function() {
    if (!window.inventarioAtivoSession) return;
    const modal = document.getElementById('modal-inventario-execucao');
    const titulo = document.getElementById('inventario-execucao-titulo');
    if (titulo) titulo.textContent = `${window.inventarioAtivoSession.unidade} / ${window.inventarioAtivoSession.setor}`;
    if (modal) modal.style.display = 'flex';
    window.renderizarPainelInventarioAtivo();
    setTimeout(() => { window.iniciarScannerInventarioAtivo(); }, 100);
};

window.fecharExecucaoInventarioAtivo = async function() {
    await window.pararScannerInventarioAtivo();
    const modal = document.getElementById('modal-inventario-execucao');
    if (modal) modal.style.display = 'none';
};

window.iniciarScannerInventarioAtivo = async function() {
    if (!window.inventarioAtivoSession) return;
    if (window.html5QrcodeInventario) return;
    if (typeof Html5Qrcode === 'undefined') {
        alert('A biblioteca da câmara ainda não carregou.');
        return;
    }

    const readerId = 'inventario-qr-reader';
    const readerWrap = document.getElementById(readerId);
    if (!readerWrap) return;
    readerWrap.innerHTML = '';

    try {
        const html5QrCode = new Html5Qrcode(readerId);
        await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            window.onScanInventarioAtivoSuccess,
            () => {}
        );
        window.html5QrcodeInventario = html5QrCode;
    } catch (error) {
        console.error('Erro ao iniciar scanner do inventário:', error);
        alert('Não foi possível iniciar a câmera do inventário. Verifique as permissões do navegador.');
    }
};

window.pararScannerInventarioAtivo = async function() {
    if (!window.html5QrcodeInventario) return;
    try {
        await window.html5QrcodeInventario.stop();
        await window.html5QrcodeInventario.clear();
    } catch (error) {
        console.error('Erro ao parar scanner do inventário:', error);
    }
    window.html5QrcodeInventario = null;
};

window.notificarInventarioAtivo = function(texto, cor = '#0f172a') {
    const el = document.getElementById('inventario-aviso-rapido');
    if (!el) return;
    el.textContent = texto;
    el.style.color = cor;
};

window.onScanInventarioAtivoSuccess = async function(decodedText) {
    if (!window.inventarioAtivoSession) return;
    const agora = Date.now();
    if (window._inventarioUltimoCodigo === decodedText && (agora - window._inventarioUltimaLeituraEm) < 1600) return;
    window._inventarioUltimoCodigo = decodedText;
    window._inventarioUltimaLeituraEm = agora;

    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const ativo = ativos.find(item => item.id === decodedText || String(item.data?.['Número de Patrimônio'] || '') === String(decodedText));

    if (!ativo) {
        window.notificarInventarioAtivo('QR Code lido, mas o item não foi encontrado no sistema.', '#dc2626');
        return;
    }

    const codigoBase = ativo.id;
    if (window.inventarioAtivoSession.itensLidosIds.includes(codigoBase)) {
        window.notificarInventarioAtivo('Item já verificado neste inventário.', '#d97706');
        return;
    }

    const data = ativo.data || {};
    const unidadeOrigem = window.obterUnidadeAtivo(data);
    const setorOrigem = window.obterSetorAtivo(data);
    const nome = window.obterNomeAtivo(data);
    const patrimonio = String(data['Número de Patrimônio'] || ativo.id);

    if (unidadeOrigem !== window.inventarioAtivoSession.unidade || setorOrigem !== window.inventarioAtivoSession.setor) {
        const divergencia = {
            id: ativo.id,
            nome,
            patrimonio,
            unidadeOrigem,
            setorOrigem,
            lidoEm: new Date().toISOString(),
            mensagem: `Item de ${unidadeOrigem} / ${setorOrigem} lido em ${window.inventarioAtivoSession.unidade} / ${window.inventarioAtivoSession.setor}`
        };
        const jaExiste = (window.inventarioAtivoSession.itensDivergentes || []).some(item => item.id === divergencia.id);
        if (!jaExiste) window.inventarioAtivoSession.itensDivergentes.push(divergencia);
        window.inventarioAtivoSession.logs.push(`Divergência detectada: ${divergencia.mensagem}`);
        window.notificarInventarioAtivo(`Divergência: ${nome} pertence a ${unidadeOrigem} / ${setorOrigem}.`, '#dc2626');
    } else {
        window.inventarioAtivoSession.itensLidosIds.push(codigoBase);
        window.inventarioAtivoSession.logs.push(`Item verificado: ${nome} (${patrimonio}) em ${new Date().toLocaleString('pt-BR')}`);
        window.notificarInventarioAtivo(`Item confirmado: ${nome}`, '#16a34a');
    }

    await window.persistirInventarioAtivo();
    window.renderizarPainelInventarioAtivo();
};

window.renderizarPainelInventarioAtivo = function() {
    const session = window.inventarioAtivoSession;
    if (!session) return;

    const totalEsperado = Array.isArray(session.itensEsperadosIds) ? session.itensEsperadosIds.length : 0;
    const totalLido = Array.isArray(session.itensLidosIds) ? session.itensLidosIds.length : 0;
    const pendentes = session.itensEsperadosIds.filter(id => !session.itensLidosIds.includes(id));
    const divergencias = Array.isArray(session.itensDivergentes) ? session.itensDivergentes : [];

    const resumo = document.getElementById('inventario-resumo-cards');
    if (resumo) {
        resumo.innerHTML = `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:120px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Esperados</div>
                <div style="font-size:20px; color:#0f172a; font-weight:800;">${totalEsperado}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:120px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Lidos</div>
                <div style="font-size:20px; color:#16a34a; font-weight:800;">${totalLido}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:120px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Pendentes</div>
                <div style="font-size:20px; color:#d97706; font-weight:800;">${pendentes.length}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; min-width:120px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700;">Divergências</div>
                <div style="font-size:20px; color:#dc2626; font-weight:800;">${divergencias.length}</div>
            </div>
        `;
    }

    const listaLidos = document.getElementById('inventario-lista-lidos');
    if (listaLidos) {
        const itens = (window.dadosGlobaisAbas['ativos'] || []).filter(item => session.itensLidosIds.includes(item.id));
        listaLidos.innerHTML = itens.length ? itens.map(item => `<div style="padding:8px 10px; border-bottom:1px dashed #cbd5e1;"><strong>${window.escapeHTML(window.obterNomeAtivo(item.data || {}))}</strong><br><span style="font-size:12px; color:#64748b;">Patrimônio: ${window.escapeHTML(String(item.data?.['Número de Patrimônio'] || item.id))}</span></div>`).join('') : '<div style="color:#64748b; font-size:13px;">Nenhum item lido ainda.</div>';
    }

    const listaPendentes = document.getElementById('inventario-lista-pendentes');
    if (listaPendentes) {
        const itens = (window.dadosGlobaisAbas['ativos'] || []).filter(item => pendentes.includes(item.id));
        listaPendentes.innerHTML = itens.length ? itens.map(item => `<div style="padding:8px 10px; border-bottom:1px dashed #cbd5e1;"><strong>${window.escapeHTML(window.obterNomeAtivo(item.data || {}))}</strong><br><span style="font-size:12px; color:#64748b;">Patrimônio: ${window.escapeHTML(String(item.data?.['Número de Patrimônio'] || item.id))}</span></div>`).join('') : '<div style="color:#16a34a; font-size:13px;">Nenhum pendente.</div>';
    }

    const listaDivergencias = document.getElementById('inventario-lista-divergencias');
    if (listaDivergencias) {
        listaDivergencias.innerHTML = divergencias.length ? divergencias.map(item => `<div style="padding:8px 10px; border-bottom:1px dashed #cbd5e1;"><strong>${window.escapeHTML(item.nome)}</strong><br><span style="font-size:12px; color:#64748b;">Origem: ${window.escapeHTML(item.unidadeOrigem)} / ${window.escapeHTML(item.setorOrigem)}</span></div>`).join('') : '<div style="color:#64748b; font-size:13px;">Nenhuma divergência até agora.</div>';
    }
};

window.pausarInventarioAtivo = async function() {
    if (!window.inventarioAtivoSession) return;
    window.inventarioAtivoSession.status = 'pausado';
    window.inventarioAtivoSession.logs.push(`Inventário pausado em ${new Date().toLocaleString('pt-BR')}`);
    await window.persistirInventarioAtivo();
    await window.pararScannerInventarioAtivo();
    window.renderizarPainelInventarioAtivo();
    window.notificarInventarioAtivo('Inventário pausado com sucesso.', '#d97706');
};

window.finalizarInventarioAtivo = async function() {
    if (!window.inventarioAtivoSession) return;
    const pendentes = window.inventarioAtivoSession.itensEsperadosIds.filter(id => !window.inventarioAtivoSession.itensLidosIds.includes(id));
    window.inventarioAtivoSession.itensPendentesIds = pendentes;
    window.inventarioAtivoSession.status = pendentes.length ? 'pendente' : 'concluido';
    window.inventarioAtivoSession.logs.push(`Inventário finalizado em ${new Date().toLocaleString('pt-BR')} com status ${window.inventarioAtivoSession.status}`);
    await window.persistirInventarioAtivo();
    await window.pararScannerInventarioAtivo();
    window.renderizarPainelInventarioAtivo();
    alert(pendentes.length ? `Inventário finalizado com ${pendentes.length} item(ns) pendente(s).` : 'Inventário finalizado com todos os itens conferidos.');
};

window.inserirEstruturaFase1InventarioAtivos = function() {
    if (!document.getElementById('ativos-inventario-overview')) {
        const resumo = document.getElementById('ativos-status-resumo');
        if (resumo && resumo.parentNode) {
            const div = document.createElement('div');
            div.id = 'ativos-inventario-overview';
            resumo.parentNode.insertBefore(div, resumo.nextSibling);
        }
    }

    if (!document.getElementById('modal-inventario-ativos')) {
        const modal = document.createElement('div');
        modal.id = 'modal-inventario-ativos';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,.58); z-index:99997; align-items:center; justify-content:center; padding:18px;';
        modal.innerHTML = `
            <div style="background:#fff; width:min(760px, 100%); border-radius:20px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,.22); position:relative; max-height:90vh; overflow:auto;">
                <button onclick="window.fecharModalInventarioAtivos()" style="position:absolute; top:12px; right:12px; background:#f1f5f9; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px;">×</button>
                <div style="font-size:22px; font-weight:800; color:#8B252C; margin-bottom:8px;">Inventário por Setor</div>
                <p style="margin:0 0 18px; color:#64748b; font-size:13px;">Selecione a unidade e o setor para iniciar ou retomar um inventário rápido via QR Code.</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:14px;">
                    <div>
                        <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Unidade</label>
                        <select id="inventario-unidade-select" class="form-input" onchange="window.preencherSelectInventarioAtivos()"></select>
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Setor</label>
                        <select id="inventario-setor-select" class="form-input"></select>
                    </div>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-bottom:20px;">
                    <button class="btn-hover color-8" type="button" onclick="window.fecharModalInventarioAtivos()"><i class="ri-close-line"></i> Fechar</button>
                    <button class="btn-hover color-11" type="button" onclick="window.iniciarInventarioAtivos()"><i class="ri-play-circle-line"></i> Iniciar Inventário</button>
                </div>
                <div>
                    <div style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:10px;">Inventários em aberto</div>
                    <div id="inventario-lista-abertos"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    if (!document.getElementById('modal-inventario-execucao')) {
        const modal = document.createElement('div');
        modal.id = 'modal-inventario-execucao';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,.72); z-index:100001; align-items:center; justify-content:center; padding:18px;';
        modal.innerHTML = `
            <div style="background:#fff; width:min(1100px, 100%); border-radius:22px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,.22); position:relative; max-height:94vh; overflow:auto;">
                <button onclick="window.fecharExecucaoInventarioAtivo()" style="position:absolute; top:12px; right:12px; background:#f1f5f9; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px;">×</button>
                <div style="display:flex; justify-content:space-between; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-bottom:14px;">
                    <div>
                        <div style="font-size:22px; font-weight:800; color:#8B252C;">Execução do Inventário</div>
                        <div id="inventario-execucao-titulo" style="font-size:14px; color:#334155; font-weight:700;"></div>
                        <div id="inventario-aviso-rapido" style="font-size:13px; color:#0f172a; margin-top:6px;">Aponte a câmera para o QR Code do ativo.</div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-8" type="button" onclick="window.pausarInventarioAtivo()"><i class="ri-pause-circle-line"></i> Pausar</button>
                        <button class="btn-hover color-11" type="button" onclick="window.finalizarInventarioAtivo()"><i class="ri-check-double-line"></i> Finalizar</button>
                    </div>
                </div>
                <div id="inventario-resumo-cards" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;"></div>
                <div style="display:grid; grid-template-columns:minmax(320px, 380px) 1fr; gap:16px; align-items:start;">
                    <div>
                        <div id="inventario-qr-reader" style="width:100%; min-height:320px; border-radius:16px; overflow:hidden; border:2px solid var(--primary-color); background:#0f172a;"></div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
                            <div style="padding:10px 12px; font-size:13px; font-weight:700; color:#16a34a; background:#f0fdf4;">Encontrados</div>
                            <div id="inventario-lista-lidos" style="max-height:300px; overflow:auto;"></div>
                        </div>
                        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
                            <div style="padding:10px 12px; font-size:13px; font-weight:700; color:#d97706; background:#fffbeb;">Pendentes</div>
                            <div id="inventario-lista-pendentes" style="max-height:300px; overflow:auto;"></div>
                        </div>
                        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; grid-column:1/-1;">
                            <div style="padding:10px 12px; font-size:13px; font-weight:700; color:#dc2626; background:#fef2f2;">Divergências</div>
                            <div id="inventario-lista-divergencias" style="max-height:220px; overflow:auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    window.inserirEstruturaFase1InventarioAtivos();
    window.criarBotoesFase1InventarioAtivos();

    setTimeout(() => {
        if (abaAtual === 'ativos') {
            window.renderizarPastasAtivosFase1();
            window.renderizarOverviewInventarioAtivos();
        }
    }, 400);
});


// ==========================================
// AJUSTE UI - BOTÃO VOLTAR PARA UNIDADES (ATIVOS)
// ==========================================

window.voltarTelaInicialAtivos = function() {
    window.ativosUnidadeAtual = null;
    window.ativosSetorAtual = null;
    window.pasta_ativos_Atual = null;
    const folders = document.getElementById('ativos-view-folders');
    const list = document.getElementById('ativos-view-list');
    if (folders) folders.style.display = 'block';
    if (list) list.style.display = 'none';
    window.renderizarPastasAtivosFase1();
};

window.atualizarBotaoVoltarInicioAtivos = function() {
    const toolbar = document.querySelector('#tab-ativos #ativos-view-folders .flex-between');
    if (!toolbar) return;

    let btn = document.getElementById('btn-voltar-unidades-ativos');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-voltar-unidades-ativos';
        btn.type = 'button';
        btn.className = 'btn-hover color-8';
        btn.style.marginRight = '10px';
        btn.innerHTML = '<i class="ri-arrow-left-line"></i> Voltar para Unidades';
        btn.onclick = window.voltarTelaInicialAtivos;
        const firstChild = toolbar.firstElementChild;
        if (firstChild) {
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.alignItems = 'center';
            wrap.style.gap = '10px';
            toolbar.insertBefore(wrap, firstChild);
            wrap.appendChild(btn);
            wrap.appendChild(firstChild);
        } else {
            toolbar.prepend(btn);
        }
    }

    btn.style.display = window.ativosUnidadeAtual ? 'inline-flex' : 'none';
};

(function() {
    const oldRenderPastasAtivosFase1 = window.renderizarPastasAtivosFase1;
    window.renderizarPastasAtivosFase1 = function() {
        oldRenderPastasAtivosFase1();
        window.atualizarBotaoVoltarInicioAtivos();
    };
})();


// ==========================================
// AJUSTE UI - RECARREGAR GRÁFICOS DOS ATIVOS AO VOLTAR PARA A VISÃO INICIAL
// ==========================================
(function() {
    const oldRenderPastasAtivosFase1Reload = window.renderizarPastasAtivosFase1;
    window.renderizarPastasAtivosFase1 = function() {
        oldRenderPastasAtivosFase1Reload();
        setTimeout(() => {
            if (typeof window.renderizarGraficoAtivos === 'function') {
                window.renderizarGraficoAtivos();
            }
        }, 120);
    };
})();


// ==========================================
// AJUSTE UI - NÚMERO DE PATRIMÔNIO AUTOMÁTICO
// ==========================================
window.preencherPreviewPatrimonioAutomatico = async function() {
    const input = document.getElementById('input-Número de Patrimônio');
    const docId = document.getElementById('modal-doc-id');
    if (!input || (docId && docId.value)) return;
    if (String(input.value || '').trim() !== '') return;

    try {
        input.placeholder = 'Gerando número...';
        const contadorRef = window.doc(window.db, 'configuracoes', 'contador_patrimonio');
        const snap = await window.getDoc(contadorRef);
        const ultimoNumero = snap.exists() ? Number(snap.data().ultimoNumero || 0) : 0;
        input.value = String(ultimoNumero + 1);
        input.setAttribute('data-patrimonio-auto', 'true');
    } catch (error) {
        console.error('Erro ao pré-visualizar patrimônio:', error);
        input.placeholder = 'Número será gerado ao salvar';
    }
};

(function() {
    const oldAbrirModalPatrimonio = window.abrirModal;
    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        oldAbrirModalPatrimonio(colecao, docId, dadosAntigos);
        if (colecao === 'ativos') {
            setTimeout(() => window.preencherPreviewPatrimonioAutomatico(), 80);
        }
    };
})();


// ==========================================
// AJUSTES FASE 1 - LIMPAR INVENTÁRIOS ÓRFÃOS + PATRIMÔNIO SOMENTE LEITURA
// ==========================================
window.obterInventariosAtivosValidos = function() {
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const ativosIds = new Set(ativos.map(item => item.id));

    return (window.inventariosAtivosData || []).filter(item => {
        const data = item.data || {};
        const unidade = String(data.unidade || '').trim();
        const setor = String(data.setor || '').trim();
        const esperados = Array.isArray(data.itensEsperadosIds) ? data.itensEsperadosIds : [];

        if (esperados.some(id => ativosIds.has(id))) return true;
        if (unidade && setor) {
            return ativos.some(ativo => window.obterUnidadeAtivo(ativo.data || {}) === unidade && window.obterSetorAtivo(ativo.data || {}) === setor);
        }
        return false;
    });
};

(function() {
    const oldResumoInventarioLocal = window.obterResumoInventarioLocal;
    window.obterResumoInventarioLocal = function(unidade = '', setor = '') {
        const orig = window.inventariosAtivosData;
        window.inventariosAtivosData = window.obterInventariosAtivosValidos();
        const resp = oldResumoInventarioLocal(unidade, setor);
        window.inventariosAtivosData = orig;
        return resp;
    };

    const oldRenderizarOverviewInventarioAtivos = window.renderizarOverviewInventarioAtivos;
    window.renderizarOverviewInventarioAtivos = function() {
        const orig = window.inventariosAtivosData;
        window.inventariosAtivosData = window.obterInventariosAtivosValidos();
        oldRenderizarOverviewInventarioAtivos();
        window.inventariosAtivosData = orig;
    };

    const oldRenderizarListaInventariosEmAberto = window.renderizarListaInventariosEmAberto;
    window.renderizarListaInventariosEmAberto = function() {
        const orig = window.inventariosAtivosData;
        window.inventariosAtivosData = window.obterInventariosAtivosValidos();
        oldRenderizarListaInventariosEmAberto();
        window.inventariosAtivosData = orig;
    };
})();

window.preencherPreviewPatrimonioAutomatico = async function() {
    const input = document.getElementById('input-Número de Patrimônio');
    const docId = document.getElementById('modal-doc-id');
    if (!input || (docId && docId.value)) return;

    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const maiorExistente = ativos.reduce((acc, item) => {
        const numero = Number(String(item.data?.['Número de Patrimônio'] || '').replace(/\D/g, '')) || 0;
        return Math.max(acc, numero);
    }, 0);

    input.readOnly = true;
    input.style.background = '#f8fafc';
    input.style.cursor = 'not-allowed';
    input.title = 'Número gerado automaticamente pelo sistema';

    if (!String(input.value || '').trim()) {
        input.value = String(maiorExistente + 1 || 1);
    }

    try {
        const contadorRef = window.doc(window.db, 'configuracoes', 'contador_patrimonio');
        const snap = await window.getDoc(contadorRef);
        const ultimoNumero = snap.exists() ? Number(snap.data().ultimoNumero || 0) : 0;
        const proximoNumero = Math.max(maiorExistente, ultimoNumero) + 1;
        input.value = String(proximoNumero);
        input.setAttribute('data-patrimonio-auto', 'true');
    } catch (error) {
        console.error('Erro ao pré-visualizar patrimônio:', error);
        if (!String(input.value || '').trim()) input.value = String(maiorExistente + 1 || 1);
    }
};


// ==========================================
// AJUSTE UI - SUGESTÕES DE NOMES JÁ CADASTRADOS NO NOVO ATIVO
// ==========================================
window.aplicarSugestoesNomeAtivoModal = function() {
    const inputNome = document.getElementById('input-Nome do Equipamento');
    if (!inputNome) return;

    const nomes = Array.from(new Set(
        (window.dadosGlobaisAbas['ativos'] || [])
            .map(item => String(item.data?.['Nome do Equipamento'] || '').trim())
            .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    let datalist = document.getElementById('lista-sugestoes-nomes-ativos');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'lista-sugestoes-nomes-ativos';
        document.body.appendChild(datalist);
    }

    datalist.innerHTML = nomes.map(nome => `<option value="${window.escapeAttr(nome)}"></option>`).join('');
    inputNome.setAttribute('list', 'lista-sugestoes-nomes-ativos');
    inputNome.setAttribute('autocomplete', 'off');
    inputNome.placeholder = nomes.length
        ? 'Digite ou selecione um item já cadastrado'
        : 'Nome do Equipamento';
};

(function() {
    const oldAbrirModalSugestaoAtivo = window.abrirModal;
    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        oldAbrirModalSugestaoAtivo(colecao, docId, dadosAntigos);
        if (colecao === 'ativos') {
            setTimeout(() => window.aplicarSugestoesNomeAtivoModal(), 120);
        }
    };
})();


// ==========================================
// MÓDULO AGENDA DE TRABALHO - FASE 1
// ==========================================
window.todosAgendaTrabalho = [];
window.agendaTrabalhoView = 'calendario';
window.agendaListenerAtivo = false;
window.agendaDragTaskId = null;

window.agendaStatusColunas = ['A fazer', 'Em andamento', 'Em revisão', 'Enviado', 'Publicado', 'Concluído'];
window.agendaStatusConclusivos = ['Enviado', 'Publicado', 'Concluído'];

window.getAgendaMesAtual = function() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
};

window.normalizarAgendaData = function(data = {}) {
    return {
        titulo: String(data.titulo || '').trim(),
        descricao: String(data.descricao || '').trim(),
        responsavel: String(data.responsavel || '').trim(),
        urgencia: String(data.urgencia || 'Média').trim(),
        status: String(data.status || 'A fazer').trim(),
        visibilidade: String(data.visibilidade || 'ambos').trim(),
        dataPrincipal: String(data.dataPrincipal || '').trim(),
        datasExtras: Array.isArray(data.datasExtras) ? data.datasExtras : String(data.datasExtras || '').split(',').map(v => v.trim()).filter(Boolean),
        link: String(data.link || '').trim(),
        iframeUrl: String(data.iframeUrl || '').trim(),
        destaqueEspecial: !!data.destaqueEspecial,
        temaEspecial: String(data.temaEspecial || '').trim(),
        historico: Array.isArray(data.historico) ? data.historico : [],
        criadoEm: data.criadoEm || '',
        atualizadoEm: data.atualizadoEm || ''
    };
};

window.obterDatasAgendaDaTarefa = function(data = {}) {
    const normalizada = window.normalizarAgendaData(data);
    const set = new Set();
    if (normalizada.dataPrincipal) set.add(normalizada.dataPrincipal);
    normalizada.datasExtras.forEach(dt => { if (dt) set.add(dt); });
    return Array.from(set).sort();
};

window.agendaEstaNoMes = function(data = {}, mes = '') {
    const datas = window.obterDatasAgendaDaTarefa(data);
    return datas.some(dt => dt.startsWith(mes));
};

window.agendaCorUrgenciaClass = function(urgencia = '') {
    const u = String(urgencia || '').toLowerCase();
    if (u.includes('crítica') || u.includes('critica')) return 'urgencia-crítica';
    if (u.includes('alta')) return 'urgencia-alta';
    if (u.includes('média') || u.includes('media')) return 'urgencia-média';
    return 'urgencia-baixa';
};

window.escutarAgendaTrabalho = function() {
    const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
    if (!window.podeVerAbasRestritas || !window.podeVerAbasRestritas(emailAtual)) {
        window.todosAgendaTrabalho = [];
        window.agendaListenerAtivo = false;
        return;
    }
    if (window.agendaListenerAtivo) return;
    window.agendaListenerAtivo = true;
    onSnapshot(collection(db, 'agenda_trabalho'), (snapshot) => {
        const itens = [];
        snapshot.forEach(docSnap => itens.push({ id: docSnap.id, data: window.normalizarAgendaData(docSnap.data()) }));
        window.todosAgendaTrabalho = itens;
        if (abaAtual === 'agenda-trabalho') window.renderizarAgendaTrabalho();
    }, (error) => {
        console.error('Erro ao escutar agenda de trabalho:', error);
        window.agendaListenerAtivo = false;
    });
};

onAuthStateChanged(auth, (user) => {
    const emailAtual = String(user?.email || emailLogado || '').toLowerCase().trim();
    if (!(user && window.podeVerAbasRestritas && window.podeVerAbasRestritas(emailAtual))) {
        window.todosAgendaTrabalho = [];
        window.inventariosAtivosData = [];
        window.agendaListenerAtivo = false;
        window._inventariosAtivosEscutando = false;
    }
});

window.preencherResponsaveisAgenda = function(valorAtual = '') {
    const select = document.getElementById('agenda-responsavel');
    if (!select) return;
    const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {});
    const nomes = Array.from(new Set(colaboradores.map(c => String(c['Nome Completo do Colaborador'] || '').trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b));
    select.innerHTML = '<option value="">Responsável</option>' + nomes.map(nome => `<option value="${window.escapeAttr(nome)}">${window.escapeHTML(nome)}</option>`).join('');
    if (valorAtual && nomes.includes(valorAtual)) select.value = valorAtual;
};

window.abrirModalAgendaTrabalho = function(docId = null) {
    const modal = document.getElementById('modal-agenda-trabalho');
    if (!modal) return;
    const item = docId ? (window.todosAgendaTrabalho.find(t => t.id === docId) || null) : null;
    const data = item ? window.normalizarAgendaData(item.data) : window.normalizarAgendaData({ dataPrincipal: new Date().toISOString().slice(0,10) });

    document.getElementById('agenda-doc-id').value = item ? item.id : '';
    document.getElementById('agenda-modal-title').textContent = item ? 'Editar Demanda' : 'Nova Demanda';
    document.getElementById('agenda-titulo').value = data.titulo || '';
    document.getElementById('agenda-descricao').value = data.descricao || '';
    document.getElementById('agenda-urgencia').value = data.urgencia || 'Média';
    document.getElementById('agenda-status').value = data.status || 'A fazer';
    document.getElementById('agenda-visibilidade').value = data.visibilidade || 'ambos';
    document.getElementById('agenda-data-principal').value = data.dataPrincipal || '';
    document.getElementById('agenda-datas-extras').value = (data.datasExtras || []).join(', ');
    document.getElementById('agenda-tema-especial').value = data.temaEspecial || '';
    document.getElementById('agenda-destaque-especial').checked = !!data.destaqueEspecial;
    document.getElementById('agenda-link').value = data.link || '';
    document.getElementById('agenda-iframe').value = data.iframeUrl || '';
    document.getElementById('agenda-historico-preview').value = (data.historico || []).join('\n');
    window.preencherResponsaveisAgenda(data.responsavel || '');
    modal.style.display = 'flex';
};

window.fecharModalAgendaTrabalho = function() {
    const modal = document.getElementById('modal-agenda-trabalho');
    if (modal) modal.style.display = 'none';
};

window.salvarAgendaTrabalho = async function() {
    const docId = document.getElementById('agenda-doc-id').value;
    const titulo = String(document.getElementById('agenda-titulo').value || '').trim();
    if (!titulo) { alert('Informe o título da demanda.'); return; }

    const dataAntiga = docId ? (window.todosAgendaTrabalho.find(t => t.id === docId)?.data || {}) : {};
    const historicoAntigo = Array.isArray(dataAntiga.historico) ? dataAntiga.historico : [];
    const dataAgora = new Date().toISOString();

    const dados = {
        titulo,
        descricao: String(document.getElementById('agenda-descricao').value || '').trim(),
        responsavel: String(document.getElementById('agenda-responsavel').value || '').trim(),
        urgencia: String(document.getElementById('agenda-urgencia').value || 'Média').trim(),
        status: String(document.getElementById('agenda-status').value || 'A fazer').trim(),
        visibilidade: String(document.getElementById('agenda-visibilidade').value || 'ambos').trim(),
        dataPrincipal: String(document.getElementById('agenda-data-principal').value || '').trim(),
        datasExtras: String(document.getElementById('agenda-datas-extras').value || '').split(',').map(v => v.trim()).filter(Boolean),
        temaEspecial: String(document.getElementById('agenda-tema-especial').value || '').trim(),
        destaqueEspecial: !!document.getElementById('agenda-destaque-especial').checked,
        link: String(document.getElementById('agenda-link').value || '').trim(),
        iframeUrl: String(document.getElementById('agenda-iframe').value || '').trim(),
        criadoEm: dataAntiga.criadoEm || dataAgora,
        atualizadoEm: dataAgora
    };

    const novoHistorico = [...historicoAntigo, `${docId ? 'Atualizada' : 'Criada'} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`];
    dados.historico = novoHistorico.slice(-80);

    try {
        if (docId) {
            await window.setDoc(window.doc(window.db, 'agenda_trabalho', docId), dados, { merge: true });
        } else {
            await window.addDoc(window.collection(window.db, 'agenda_trabalho'), dados);
        }
        window.fecharModalAgendaTrabalho();
    } catch (error) {
        alert('Erro ao salvar demanda: ' + error.message);
    }
};

window.alternarViewAgenda = function(view = 'calendario') {
    window.agendaTrabalhoView = view;
    ['calendario', 'board', 'direcao'].forEach(tipo => {
        const el = document.getElementById(`agenda-view-${tipo}`);
        if (el) el.style.display = tipo === view ? 'block' : 'none';
    });
    window.renderizarAgendaTrabalho();
};

window.obterAgendaMesSelecionado = function() {
    const input = document.getElementById('agenda-filtro-mes');
    if (!input) return window.getAgendaMesAtual();
    if (!input.value) input.value = window.getAgendaMesAtual();
    return input.value;
};

window.renderizarCardsColaboradoresAgenda = function() {
    const grid = document.getElementById('agenda-colaboradores-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {});
    if (!colaboradores.length) {
        grid.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum colaborador cadastrado.</div>';
        return;
    }

    grid.innerHTML = colaboradores.map(colab => {
        const nome = String(colab['Nome Completo do Colaborador'] || '').trim();
        const setor = String(colab['Setor da Clínica'] || 'Geral').trim();
        const foto = String(colab['Link da Foto'] || colab['Foto'] || '').trim();
        const aniversario = String(colab['Data de Aniversário'] || colab['Aniversário'] || 'Não informado').trim();
        const info = String(colab['Informações Gerais'] || colab['Observações'] || 'Sem observações').trim();
        const minhas = window.todosAgendaTrabalho.filter(item => item.data.responsavel === nome && window.agendaEstaNoMes(item.data, mes));
        const pendentes = minhas.filter(item => !window.agendaStatusConclusivos.includes(item.data.status)).length;
        return `
            <div class="agenda-colaborador-card">
                <div class="agenda-colaborador-avatar">${foto ? `<img src="${window.escapeAttr(foto)}" alt="${window.escapeAttr(nome)}" onerror="this.parentElement.innerHTML='<i class=\\"ri-user-3-line\\"></i>'">` : '<i class="ri-user-3-line"></i>'}</div>
                <div class="agenda-colaborador-meta">
                    <h4>${window.escapeHTML(nome || 'Colaborador')}</h4>
                    <p><strong>Setor:</strong> ${window.escapeHTML(setor)}</p>
                    <p><strong>Aniversário:</strong> ${window.escapeHTML(aniversario)}</p>
                    <p>${window.escapeHTML(info)}</p>
                    <span class="agenda-badge-pendente"><i class="ri-notification-3-line"></i> ${pendentes} pendente(s) no mês</span>
                </div>
            </div>
        `;
    }).join('');
};

window.gerarDiasDoMesAgenda = function(mes = '') {
    const [ano, mesNum] = mes.split('-').map(Number);
    if (!ano || !mesNum) return [];
    const dias = new Date(ano, mesNum, 0).getDate();
    const arr = [];
    for (let dia = 1; dia <= dias; dia++) {
        const data = new Date(ano, mesNum - 1, dia);
        arr.push({
            iso: `${ano}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
            label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            semana: data.toLocaleDateString('pt-BR', { weekday: 'short' })
        });
    }
    return arr;
};

window.abrirPreviewAgenda = function(url = '', titulo = 'Preview da Demanda') {
    const link = String(url || '').trim();
    if (!link) return;
    if (typeof window.abrirMidiaFlutuante === 'function') window.abrirMidiaFlutuante(link, titulo);
    else window.open(link, '_blank', 'noopener,noreferrer');
};

window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
    const data = window.normalizarAgendaData(item.data || {});
    const podeEditar = opts.podeEditar !== false;
    return `
        <div class="agenda-task-card" draggable="true" data-task-id="${item.id}" style="border-left-color:${data.destaqueEspecial ? '#f59e0b' : 'var(--primary-color)'};">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                <h5>${data.destaqueEspecial ? '<span class="agenda-estrela">★</span> ' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                ${podeEditar ? `<button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')"><i class="ri-pencil-line"></i></button>` : ''}
            </div>
            <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
            ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
            <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
            <div class="agenda-task-meta">
                <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
            </div>
            ${data.link || data.iframeUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                ${data.link ? `<button class="btn-hover color-8" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="window.abrirPreviewAgenda('${window.escapeAttr(data.link)}','${window.escapeAttr(data.titulo)}')"><i class="ri-link"></i> Link</button>` : ''}
                ${data.iframeUrl ? `<button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="window.abrirPreviewAgenda('${window.escapeAttr(data.iframeUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Preview</button>` : ''}
            </div>` : ''}
        </div>
    `;
};

window.aplicarDnDAgenda = function() {
    document.querySelectorAll('.agenda-task-card[data-task-id]').forEach(card => {
        card.addEventListener('dragstart', () => { window.agendaDragTaskId = card.getAttribute('data-task-id'); });
        card.addEventListener('dragend', () => { window.agendaDragTaskId = null; });
    });

    document.querySelectorAll('.agenda-day-column').forEach(col => {
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const taskId = window.agendaDragTaskId;
            const novaData = col.getAttribute('data-date');
            if (!taskId || !novaData) return;
            const item = window.todosAgendaTrabalho.find(t => t.id === taskId);
            if (!item) return;
            const hist = Array.isArray(item.data.historico) ? item.data.historico : [];
            hist.push(`Data principal movida para ${novaData} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
            await window.setDoc(window.doc(window.db, 'agenda_trabalho', taskId), { dataPrincipal: novaData, atualizadoEm: new Date().toISOString(), historico: hist.slice(-80) }, { merge: true });
        });
    });

    document.querySelectorAll('.agenda-board-column').forEach(col => {
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const taskId = window.agendaDragTaskId;
            const novoStatus = col.getAttribute('data-status');
            if (!taskId || !novoStatus) return;
            const item = window.todosAgendaTrabalho.find(t => t.id === taskId);
            if (!item) return;
            const hist = Array.isArray(item.data.historico) ? item.data.historico : [];
            hist.push(`Status alterado para ${novoStatus} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
            await window.setDoc(window.doc(window.db, 'agenda_trabalho', taskId), { status: novoStatus, atualizadoEm: new Date().toISOString(), historico: hist.slice(-80) }, { merge: true });
        });
    });
};

window.renderizarAgendaCalendario = function() {
    const grid = document.getElementById('agenda-calendario-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const dias = window.gerarDiasDoMesAgenda(mes);
    const tarefas = window.todosAgendaTrabalho.filter(item => window.agendaEstaNoMes(item.data, mes));

    grid.innerHTML = dias.map(dia => {
        const tarefasDia = tarefas.filter(item => window.obterDatasAgendaDaTarefa(item.data).includes(dia.iso));
        return `
            <div class="agenda-day-column" data-date="${dia.iso}">
                <div class="agenda-day-header">
                    <strong>${dia.label}</strong>
                    <span>${window.escapeHTML(dia.semana)}</span>
                </div>
                <div>${tarefasDia.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem demandas</p>'}</div>
            </div>
        `;
    }).join('');
    window.aplicarDnDAgenda();
};

window.renderizarAgendaBoard = function() {
    const grid = document.getElementById('agenda-board-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const tarefas = window.todosAgendaTrabalho.filter(item => window.agendaEstaNoMes(item.data, mes));
    grid.innerHTML = window.agendaStatusColunas.map(status => {
        const col = tarefas.filter(item => item.data.status === status);
        return `
            <div class="agenda-board-column" data-status="${window.escapeAttr(status)}">
                <h4>${window.escapeHTML(status)} <span style="color:#94a3b8;">(${col.length})</span></h4>
                ${col.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem itens</p>'}
            </div>
        `;
    }).join('');
    window.aplicarDnDAgenda();
};

window.renderizarAgendaDirecao = function() {
    const grid = document.getElementById('agenda-direcao-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const tarefas = window.todosAgendaTrabalho.filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade) && window.agendaEstaNoMes(item.data, mes));
    const hoje = new Date().toISOString().slice(0,10);
    const feitasHoje = tarefas.filter(item => window.agendaStatusConclusivos.includes(item.data.status) && window.obterDatasAgendaDaTarefa(item.data).includes(hoje));
    const futuras = tarefas.filter(item => item.data.dataPrincipal >= hoje && !window.agendaStatusConclusivos.includes(item.data.status));
    const historico = tarefas.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).sort((a,b) => String(b.data.atualizadoEm || '').localeCompare(String(a.data.atualizadoEm || ''))).slice(0,12);

    const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => `<div class="agenda-direcao-item"><strong>${window.escapeHTML(item.data.titulo)}</strong><br><span style="font-size:12px; color:#64748b;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)}</span></div>`).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhum item nesta visão.</p>';

    grid.innerHTML = `
        <div class="agenda-direcao-card">
            <h4>Feito / enviado hoje</h4>
            ${renderLista(feitasHoje)}
        </div>
        <div class="agenda-direcao-card">
            <h4>Próximas entregas</h4>
            ${renderLista(futuras.slice(0, 12))}
        </div>
        <div class="agenda-direcao-card">
            <h4>Histórico recente</h4>
            ${renderLista(historico)}
        </div>
    `;
};

window.renderizarAgendaTrabalho = function() {
    const inputMes = document.getElementById('agenda-filtro-mes');
    if (inputMes && !inputMes.value) inputMes.value = window.getAgendaMesAtual();
    window.renderizarCardsColaboradoresAgenda();
    if (window.agendaTrabalhoView === 'board') window.renderizarAgendaBoard();
    else if (window.agendaTrabalhoView === 'direcao') window.renderizarAgendaDirecao();
    else window.renderizarAgendaCalendario();
};

window.addEventListener('DOMContentLoaded', () => {
    const filtroMes = document.getElementById('agenda-filtro-mes');
    if (filtroMes) {
        filtroMes.value = window.getAgendaMesAtual();
        filtroMes.addEventListener('change', () => window.renderizarAgendaTrabalho());
    }
});


// ==========================================
// AJUSTES AGENDA - MARKETING + RENDER IMEDIATO
// ==========================================
window.colaboradorEhMarketing = function(colab = {}) {
    const setor = String(colab['Setor da Clínica'] || colab.setor || '').toLowerCase();
    return setor.includes('marketing') || setor.includes('mkt');
};

window.preencherResponsaveisAgenda = function(valorAtual = '') {
    const select = document.getElementById('agenda-responsavel');
    if (!select) return;
    const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {}).filter(window.colaboradorEhMarketing);
    const nomes = Array.from(new Set(colaboradores.map(c => String(c['Nome Completo do Colaborador'] || '').trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b));
    select.innerHTML = '<option value="">Responsável (Marketing)</option>' + nomes.map(nome => `<option value="${window.escapeAttr(nome)}">${window.escapeHTML(nome)}</option>`).join('');
    if (valorAtual && nomes.includes(valorAtual)) select.value = valorAtual;
};

window.renderizarCardsColaboradoresAgenda = function() {
    const grid = document.getElementById('agenda-colaboradores-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {}).filter(window.colaboradorEhMarketing);
    if (!colaboradores.length) {
        grid.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum colaborador do marketing cadastrado.</div>';
        return;
    }

    grid.innerHTML = colaboradores.map(colab => {
        const nome = String(colab['Nome Completo do Colaborador'] || '').trim();
        const setor = String(colab['Setor da Clínica'] || 'Marketing').trim();
        const foto = String(colab['Link da Foto'] || colab['Foto'] || '').trim();
        const aniversario = String(colab['Data de Aniversário'] || colab['Aniversário'] || 'Não informado').trim();
        const info = String(colab['Informações Gerais'] || colab['Observações'] || 'Sem observações').trim();
        const minhas = window.todosAgendaTrabalho.filter(item => item.data.responsavel === nome && window.agendaEstaNoMes(item.data, mes));
        const pendentes = minhas.filter(item => !window.agendaStatusConclusivos.includes(item.data.status)).length;
        return `
            <div class="agenda-colaborador-card">
                <div class="agenda-colaborador-avatar">${foto ? `<img src="${window.escapeAttr(foto)}" alt="${window.escapeAttr(nome)}" onerror="this.parentElement.innerHTML='<i class=\\"ri-user-3-line\\"></i>'">` : '<i class="ri-user-3-line"></i>'}</div>
                <div class="agenda-colaborador-meta">
                    <h4>${window.escapeHTML(nome || 'Colaborador')}</h4>
                    <p><strong>Setor:</strong> ${window.escapeHTML(setor)}</p>
                    <p><strong>Aniversário:</strong> ${window.escapeHTML(aniversario)}</p>
                    <p>${window.escapeHTML(info)}</p>
                    <span class="agenda-badge-pendente"><i class="ri-notification-3-line"></i> ${pendentes} pendente(s) no mês</span>
                </div>
            </div>
        `;
    }).join('');
};

(function() {
    const oldSalvarAgenda = window.salvarAgendaTrabalho;
    window.salvarAgendaTrabalho = async function() {
        const dataInput = document.getElementById('agenda-data-principal');
        if (dataInput && !dataInput.value) dataInput.value = new Date().toISOString().slice(0, 10);
        await oldSalvarAgenda();
        setTimeout(() => window.renderizarAgendaTrabalho(), 180);
    };
})();

window.forcarRenderAgendaAoAbrirAba = function() {
    const btn = document.getElementById('btn-nav-agenda-trabalho');
    if (!btn || btn.dataset.renderHooked === '1') return;
    btn.dataset.renderHooked = '1';
    btn.addEventListener('click', () => {
        setTimeout(() => {
            window.renderizarAgendaTrabalho();
            window.alternarViewAgenda(window.agendaTrabalhoView || 'calendario');
        }, 120);
    });
};

window.addEventListener('DOMContentLoaded', () => {
    window.forcarRenderAgendaAoAbrirAba();
    setTimeout(() => {
        const mesInput = document.getElementById('agenda-filtro-mes');
        if (mesInput && !mesInput.value) mesInput.value = window.getAgendaMesAtual();
        window.renderizarAgendaTrabalho();
    }, 250);
});


// ==========================================
// AJUSTES AGENDA - DIREÇÃO + ERRO AMIGÁVEL DE PERMISSÃO
// ==========================================
window.renderizarAgendaDirecao = function() {
    const grid = document.getElementById('agenda-direcao-grid');
    if (!grid) return;
    const mes = window.obterAgendaMesSelecionado();
    const tarefas = window.todosAgendaTrabalho.filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade) && (window.agendaEstaNoMes(item.data, mes) || !item.data.dataPrincipal));
    const hoje = new Date().toISOString().slice(0,10);
    const feitasHoje = tarefas.filter(item => window.agendaStatusConclusivos.includes(item.data.status) && (window.obterDatasAgendaDaTarefa(item.data).includes(hoje) || String(item.data.atualizadoEm || '').startsWith(hoje)));
    const emProducao = tarefas.filter(item => ['A fazer', 'Em andamento', 'Em revisão', 'Enviado'].includes(item.data.status));
    const futuras = tarefas.filter(item => !window.agendaStatusConclusivos.includes(item.data.status) && (!item.data.dataPrincipal || item.data.dataPrincipal >= hoje));
    const historico = tarefas.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).sort((a,b) => String(b.data.atualizadoEm || '').localeCompare(String(a.data.atualizadoEm || ''))).slice(0,12);

    const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => `<div class="agenda-direcao-item"><strong>${window.escapeHTML(item.data.titulo)}</strong><br><span style="font-size:12px; color:#64748b;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)}${item.data.dataPrincipal ? ` • ${window.escapeHTML(item.data.dataPrincipal)}` : ''}</span></div>`).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhum item nesta visão.</p>';

    grid.innerHTML = `
        <div class="agenda-direcao-card">
            <h4>Em produção / enviado</h4>
            ${renderLista(emProducao.slice(0, 12))}
        </div>
        <div class="agenda-direcao-card">
            <h4>Próximas entregas</h4>
            ${renderLista(futuras.slice(0, 12))}
        </div>
        <div class="agenda-direcao-card">
            <h4>Feito hoje + histórico</h4>
            ${renderLista([...feitasHoje, ...historico].slice(0, 12))}
        </div>
    `;
};

(function() {
    const oldAplicarDnDAgenda = window.aplicarDnDAgenda;
    window.aplicarDnDAgenda = function() {
        oldAplicarDnDAgenda();
        document.querySelectorAll('.agenda-board-column').forEach(col => {
            const novo = col.cloneNode(true);
            if (col.parentNode) col.parentNode.replaceChild(novo, col);
        });
        // reaplica handlers com mensagens mais claras
        document.querySelectorAll('.agenda-task-card[data-task-id]').forEach(card => {
            card.addEventListener('dragstart', () => { window.agendaDragTaskId = card.getAttribute('data-task-id'); });
            card.addEventListener('dragend', () => { window.agendaDragTaskId = null; });
        });
        document.querySelectorAll('.agenda-board-column').forEach(col => {
            col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = window.agendaDragTaskId;
                const novoStatus = col.getAttribute('data-status');
                if (!taskId || !novoStatus) return;
                const item = window.todosAgendaTrabalho.find(t => t.id === taskId);
                if (!item) return;
                const hist = Array.isArray(item.data.historico) ? item.data.historico : [];
                hist.push(`Status alterado para ${novoStatus} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
                try {
                    await window.setDoc(window.doc(window.db, 'agenda_trabalho', taskId), { status: novoStatus, atualizadoEm: new Date().toISOString(), historico: hist.slice(-80) }, { merge: true });
                } catch (error) {
                    console.error(error);
                    alert('O status não foi alterado porque a coleção agenda_trabalho está bloqueada nas Rules do Firestore.');
                }
            });
        });
    };
})();


// ==========================================
// AJUSTES AGENDA - FOTO DO COLABORADOR + PREVIEW SEM IFRAME EMBUTIDO
// ==========================================
configuracaoAbas['colaboradores'].campos = [
    'Nome Completo do Colaborador',
    'Setor da Clínica',
    'PIN de Acesso (Treinamentos)',
    'Data de Aniversário',
    'Link da Foto',
    'Informações Gerais'
];

window.abrirPreviewAgenda = function(url = '', titulo = 'Visualizar Demanda') {
    const link = String(url || '').trim();
    if (!link) {
        alert('Nenhum link de visualização foi informado nesta demanda.');
        return;
    }

    if (typeof window.abrirJanelaFlutuante === 'function') {
        window.abrirJanelaFlutuante(link, titulo);
        return;
    }

    if (typeof window.abrirMidiaFlutuante === 'function') {
        window.abrirMidiaFlutuante(link, titulo);
        return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
};

window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
    const data = window.normalizarAgendaData(item.data || {});
    const podeEditar = opts.podeEditar !== false;
    const visualUrl = data.link || data.iframeUrl || '';
    return `
        <div class="agenda-task-card" draggable="true" data-task-id="${item.id}" style="border-left-color:${data.destaqueEspecial ? '#f59e0b' : 'var(--primary-color)'};">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                <h5>${data.destaqueEspecial ? '<span class="agenda-estrela">★</span> ' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                ${podeEditar ? `<button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')"><i class="ri-pencil-line"></i></button>` : ''}
            </div>
            <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
            ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
            <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
            <div class="agenda-task-meta">
                <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
            </div>
            ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
            </div>` : ''}
        </div>
    `;
};


// ==========================================
// RESTRIÇÃO DE ACESSO: ATIVOS E AGENDA DE TRABALHO (ARQUIVO COMPLETO)
// ==========================================
window.podeVerAbasRestritas = function(email = '') {
    const baseEmail = String(email || emailLogado || auth?.currentUser?.email || '').toLowerCase().trim();
    return (isAdmin || String(baseEmail || "").toLowerCase().endsWith("@clinica.com"));
};

window.atualizarVisibilidadeAbasRestritas = function() {
    const pode = window.podeVerAbasRestritas();
    const btnAtivos = document.getElementById('btn-nav-ativos');
    const btnAgenda = document.getElementById('btn-nav-agenda-trabalho');
    const tabAtivos = document.getElementById('tab-ativos');
    const tabAgenda = document.getElementById('tab-agenda-trabalho');

    if (btnAtivos) btnAtivos.style.display = pode ? '' : 'none';
    if (btnAgenda) btnAgenda.style.display = pode ? '' : 'none';

    if (!pode) {
        if (tabAtivos) tabAtivos.style.display = 'none';
        if (tabAgenda) tabAgenda.style.display = 'none';
        if (abaAtual === 'ativos' || abaAtual === 'agenda-trabalho') {
            const homeBtn = document.querySelector('.nav-btn[data-tab="home"]');
            if (homeBtn) homeBtn.click();
        }
    }
};

(function() {
    const oldEscutarInventariosAtivos = window.escutarInventariosAtivos;
    if (oldEscutarInventariosAtivos) {
        window.escutarInventariosAtivos = function() {
            if (!window.podeVerAbasRestritas()) return;
            return oldEscutarInventariosAtivos();
        };
    }

    const oldEscutarAgendaTrabalho = window.escutarAgendaTrabalho;
    if (oldEscutarAgendaTrabalho) {
        window.escutarAgendaTrabalho = function() {
            if (!window.podeVerAbasRestritas()) return;
            return oldEscutarAgendaTrabalho();
        };
    }
})();

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.atualizarVisibilidadeAbasRestritas(), 120);

    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabDestino = btn.getAttribute('data-tab');
            if (['ativos', 'agenda-trabalho'].includes(tabDestino) && !window.podeVerAbasRestritas()) {
                e.preventDefault();
                e.stopImmediatePropagation();
                alert('Você não tem permissão para acessar esta área.');
                const homeBtn = document.querySelector('.nav-btn[data-tab="home"]');
                if (homeBtn) setTimeout(() => homeBtn.click(), 10);
            }
        }, true);
    });
});

onAuthStateChanged(auth, (user) => {
    setTimeout(() => window.atualizarVisibilidadeAbasRestritas(), 80);
});


// ==========================================
// AGENDA - EXTRAORDINÁRIAS + EXCLUSÃO
// ==========================================
(function() {
    const originalAbrirModalAgendaTrabalho = window.abrirModalAgendaTrabalho;
    const originalFecharModalAgendaTrabalho = window.fecharModalAgendaTrabalho;

    window.excluirAgendaTrabalho = async function(docId = '') {
        const id = String(docId || '').trim();
        if (!id) {
            alert('Nenhuma demanda selecionada para exclusão.');
            return;
        }

        const item = (window.todosAgendaTrabalho || []).find(t => t.id === id);
        const titulo = item?.data?.titulo || 'esta demanda';

        if (!confirm(`Deseja realmente excluir "${titulo}"? Esta ação não poderá ser desfeita.`)) {
            return;
        }

        try {
            await window.deleteDoc(window.doc(window.db, 'agenda_trabalho', id));
            if (typeof originalFecharModalAgendaTrabalho === 'function') {
                originalFecharModalAgendaTrabalho();
            } else {
                const modal = document.getElementById('modal-agenda-trabalho');
                if (modal) modal.style.display = 'none';
            }
            setTimeout(() => {
                if (typeof window.renderizarAgendaTrabalho === 'function') window.renderizarAgendaTrabalho();
            }, 120);
            alert('Demanda excluída com sucesso!');
        } catch (error) {
            alert('Erro ao excluir demanda: ' + (error?.message || 'falha desconhecida'));
        }
    };

    window.excluirAgendaTrabalhoAtual = function() {
        const input = document.getElementById('agenda-doc-id');
        const docId = input ? String(input.value || '').trim() : '';
        if (!docId) {
            alert('Abra uma demanda existente para excluir.');
            return;
        }
        window.excluirAgendaTrabalho(docId);
    };

    window.abrirModalAgendaTrabalho = function(docId = null) {
        if (typeof originalAbrirModalAgendaTrabalho === 'function') {
            originalAbrirModalAgendaTrabalho(docId);
        }

        const btnExcluir = document.getElementById('btn-excluir-agenda');
        if (btnExcluir) {
            btnExcluir.style.display = docId ? 'inline-flex' : 'none';
            btnExcluir.disabled = !docId;
        }

        const tituloModal = document.getElementById('agenda-modal-title');
        if (tituloModal && docId) {
            tituloModal.textContent = 'Editar Demanda / Atividade';
        }

        const checkbox = document.getElementById('agenda-destaque-especial');
        if (checkbox) {
            checkbox.title = 'Use para sinalizar atividades extraordinárias ou de última hora.';
        }
    };

    window.fecharModalAgendaTrabalho = function() {
        const btnExcluir = document.getElementById('btn-excluir-agenda');
        if (btnExcluir) {
            btnExcluir.style.display = 'none';
            btnExcluir.disabled = false;
        }

        if (typeof originalFecharModalAgendaTrabalho === 'function') {
            originalFecharModalAgendaTrabalho();
        } else {
            const modal = document.getElementById('modal-agenda-trabalho');
            if (modal) modal.style.display = 'none';
        }
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''}" draggable="true" data-task-id="${item.id}" style="border-left-color:${extraordinaria ? '#f59e0b' : 'var(--primary-color)'};">
                <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                    <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                    ${podeEditar ? `
                        <div class="agenda-task-actions">
                            <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                <i class="ri-pencil-line"></i>
                            </button>
                            <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                <i class="ri-delete-bin-6-line"></i>
                            </button>
                        </div>` : ''}
                </div>
                <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                <div class="agenda-task-meta">
                    ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                    <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                    <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                    <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                </div>
                ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                </div>` : ''}
            </div>
        `;
    };
})();


// ==========================================
// LAZY LOAD DOS LISTENERS RESTRITOS
// ==========================================
window.inicializarListenersRestritosSobDemanda = function() {
    const btnAtivos = document.querySelector('.nav-btn[data-tab="ativos"]');
    const btnAgenda = document.querySelector('.nav-btn[data-tab="agenda-trabalho"]');

    if (btnAtivos && btnAtivos.dataset.listenerRestritoHooked !== '1') {
        btnAtivos.dataset.listenerRestritoHooked = '1';
        btnAtivos.addEventListener('click', () => {
            const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
            if (window.podeVerAbasRestritas && window.podeVerAbasRestritas(emailAtual) && window.escutarInventariosAtivos) {
                window.escutarInventariosAtivos();
            }
        });
    }

    if (btnAgenda && btnAgenda.dataset.listenerRestritoHooked !== '1') {
        btnAgenda.dataset.listenerRestritoHooked = '1';
        btnAgenda.addEventListener('click', () => {
            const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
            if (window.podeVerAbasRestritas && window.podeVerAbasRestritas(emailAtual) && window.escutarAgendaTrabalho) {
                window.escutarAgendaTrabalho();
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.inicializarListenersRestritosSobDemanda) {
            window.inicializarListenersRestritosSobDemanda();
        }
    }, 150);
});


// ==========================================
// AGENDA 3.5.4 - CALENDÁRIO ALINHADO + CORES + COLLAPSE
// ==========================================
(function() {
    window.aplicarEstilosAgendaAvancados = function() {
        if (document.getElementById('agenda-style-354')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-354';
        style.textContent = `
            #agenda-calendario-grid.agenda-calendario-grid--mes {
                display:grid;
                grid-template-columns:repeat(7, minmax(145px, 1fr));
                gap:14px;
                align-items:start;
            }
            .agenda-weekday-head {
                background:#eef2f7;
                border:1px solid #d8e0ea;
                border-radius:14px;
                padding:10px 12px;
                font-size:12px;
                font-weight:800;
                text-transform:uppercase;
                color:#334155;
                text-align:center;
            }
            .agenda-day-column--blank {
                background:transparent;
                border:1px dashed #e2e8f0;
                min-height:110px;
                box-shadow:none;
            }
            .agenda-day-column {
                min-height:190px;
            }
            .agenda-task-card {
                border-left-width:5px !important;
                transition:all .2s ease;
                overflow:hidden;
            }
            .agenda-task-card:hover {
                transform:translateY(-1px);
                box-shadow:0 8px 18px rgba(15, 23, 42, 0.08);
            }
            .agenda-task-header {
                display:flex;
                justify-content:space-between;
                gap:10px;
                align-items:flex-start;
                cursor:pointer;
            }
            .agenda-task-header-main {
                min-width:0;
                flex:1;
            }
            .agenda-task-header-main h5 {
                margin:0 0 4px 0;
            }
            .agenda-task-header-date {
                font-size:11px;
                font-weight:700;
                color:#64748b;
            }
            .agenda-task-chevron {
                font-size:16px;
                color:#475569;
                transition:transform .2s ease;
                margin-left:6px;
            }
            .agenda-task-card.is-open .agenda-task-chevron {
                transform:rotate(180deg);
            }
            .agenda-task-body-collapsible {
                display:none;
                margin-top:10px;
            }
            .agenda-task-card.is-open .agenda-task-body-collapsible {
                display:block;
            }
            .agenda-task-actions {
                display:flex;
                gap:6px;
                align-items:center;
                flex-shrink:0;
            }
            .agenda-mini-badge-data {
                background:rgba(255,255,255,.75);
                color:#334155;
            }
            .agenda-direcao-list {
                display:flex;
                flex-direction:column;
                gap:10px;
            }
            .agenda-direcao-item {
                border:1px solid rgba(148, 163, 184, 0.25);
                border-left:5px solid #cbd5e1;
                border-radius:14px;
                padding:12px;
                background:#fff;
            }
            .agenda-direcao-item strong {
                display:block;
                margin-bottom:5px;
            }
            .agenda-direcao-item small {
                display:block;
                margin-top:6px;
                color:#64748b;
                font-size:11px;
                font-weight:600;
            }
            .agenda-direcao-item.is-danger,
            .agenda-task-card.is-danger { background:#fef2f2; border-left-color:#dc2626 !important; }
            .agenda-direcao-item.is-warning,
            .agenda-task-card.is-warning { background:#fffbeb; border-left-color:#d97706 !important; }
            .agenda-direcao-item.is-info,
            .agenda-task-card.is-info { background:#eff6ff; border-left-color:#2563eb !important; }
            .agenda-direcao-item.is-success,
            .agenda-task-card.is-success { background:#f0fdf4; border-left-color:#16a34a !important; }
            .agenda-direcao-item.is-dark,
            .agenda-task-card.is-dark { background:#f8fafc; border-left-color:#475569 !important; }
            .agenda-direcao-item.is-purple,
            .agenda-task-card.is-purple { background:#faf5ff; border-left-color:#9333ea !important; }
            @media (max-width: 1200px) {
                #agenda-calendario-grid.agenda-calendario-grid--mes {
                    grid-template-columns:repeat(7, minmax(125px, 1fr));
                    gap:10px;
                }
            }
        `;
        document.head.appendChild(style);
    };

    window.getAgendaStatusVisual = function(status = '') {
        const s = String(status || '').toLowerCase().trim();
        if (s.includes('concluído') || s.includes('concluido') || s.includes('publicado')) {
            return { tone: 'is-success', label: 'Concluído/Publicado' };
        }
        if (s.includes('enviado')) {
            return { tone: 'is-purple', label: 'Enviado' };
        }
        if (s.includes('em revisão') || s.includes('revisao')) {
            return { tone: 'is-warning', label: 'Em revisão' };
        }
        if (s.includes('em andamento')) {
            return { tone: 'is-info', label: 'Em andamento' };
        }
        if (s.includes('a fazer')) {
            return { tone: 'is-danger', label: 'A fazer' };
        }
        return { tone: 'is-dark', label: status || 'Status' };
    };

    window.getAgendaDataExibicao = function(data = {}) {
        const normalizada = window.normalizarAgendaData(data);
        return String(normalizada.dataPrincipal || '').trim();
    };

    window.toggleAgendaCard = function(collapseId) {
        const el = document.getElementById(collapseId);
        const card = el ? el.closest('.agenda-task-card') : null;
        if (!el || !card) return;
        card.classList.toggle('is-open');
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusVisual = window.getAgendaStatusVisual(data.status);
        const collapseId = `agenda-collapse-${item.id}`;
        const dataExibicao = window.getAgendaDataExibicao(data);

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataExibicao ? window.escapeHTML(dataExibicao) : 'Sem data definida'}</div>
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataExibicao ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataExibicao)}</span>` : ''}
                    </div>
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    window.gerarDiasDoMesAgenda = function(mes = '') {
        const [ano, mesNum] = mes.split('-').map(Number);
        if (!ano || !mesNum) return [];
        const dias = new Date(ano, mesNum, 0).getDate();
        const arr = [];
        for (let dia = 1; dia <= dias; dia++) {
            const data = new Date(ano, mesNum - 1, dia);
            arr.push({
                iso: `${ano}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                semana: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
                weekIndex: (data.getDay() + 6) % 7
            });
        }
        return arr;
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = window.todosAgendaTrabalho.filter(item => {
            const dataPrincipal = window.getAgendaDataExibicao(item.data);
            return dataPrincipal && dataPrincipal.startsWith(mes);
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas
                .filter(item => window.getAgendaDataExibicao(item.data) === dia.iso)
                .sort((a, b) => String(a.data.status || '').localeCompare(String(b.data.status || '')));

            return `
                <div class="agenda-day-column" data-date="${dia.iso}">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div>${tarefasDia.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem demandas</p>'}</div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
        window.aplicarDnDAgenda();
    };

    window.renderizarAgendaBoard = function() {
        window.aplicarEstilosAgendaAvancados();
        const grid = document.getElementById('agenda-board-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const tarefas = window.todosAgendaTrabalho
            .filter(item => {
                const dataPrincipal = window.getAgendaDataExibicao(item.data);
                return dataPrincipal && dataPrincipal.startsWith(mes);
            })
            .sort((a, b) => String(window.getAgendaDataExibicao(a.data)).localeCompare(String(window.getAgendaDataExibicao(b.data))));
        grid.innerHTML = window.agendaStatusColunas.map(status => {
            const col = tarefas.filter(item => item.data.status === status);
            return `
                <div class="agenda-board-column" data-status="${window.escapeAttr(status)}">
                    <h4>${window.escapeHTML(status)} <span style="color:#94a3b8;">(${col.length})</span></h4>
                    ${col.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem itens</p>'}
                </div>
            `;
        }).join('');
        window.aplicarDnDAgenda();
    };

    window.renderizarAgendaDirecao = function() {
        window.aplicarEstilosAgendaAvancados();
        const grid = document.getElementById('agenda-direcao-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const hoje = new Date().toISOString().slice(0,10);

        const tarefas = window.todosAgendaTrabalho
            .filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade))
            .filter(item => {
                const dataPrincipal = window.getAgendaDataExibicao(item.data);
                return dataPrincipal && dataPrincipal.startsWith(mes);
            })
            .sort((a, b) => String(window.getAgendaDataExibicao(a.data)).localeCompare(String(window.getAgendaDataExibicao(b.data))));

        const doDia = tarefas.filter(item => window.getAgendaDataExibicao(item.data) === hoje);
        const proximas = tarefas.filter(item => {
            const dataPrincipal = window.getAgendaDataExibicao(item.data);
            return dataPrincipal > hoje && !window.agendaStatusConclusivos.includes(item.data.status);
        }).slice(0, 10);
        const concluidas = tarefas.filter(item => window.agendaStatusConclusivos.includes(item.data.status))
            .sort((a, b) => String(b.data.atualizadoEm || '').localeCompare(String(a.data.atualizadoEm || '')))
            .slice(0, 10);

        const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => {
            const visual = window.getAgendaStatusVisual(item.data.status);
            const dataPrincipal = window.getAgendaDataExibicao(item.data);
            return `<div class="agenda-direcao-item ${visual.tone}">
                <strong>${window.escapeHTML(item.data.titulo)}</strong>
                <span style="font-size:12px; color:#475569;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)} • ${window.escapeHTML(dataPrincipal || 'Sem data')}</span>
                ${item.data.temaEspecial ? `<small>Tema: ${window.escapeHTML(item.data.temaEspecial)}</small>` : ''}
            </div>`;
        }).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhum item nesta visão.</p>';

        grid.innerHTML = `
            <div class="agenda-direcao-card">
                <h4>Demandas do dia</h4>
                ${renderLista(doDia)}
            </div>
            <div class="agenda-direcao-card">
                <h4>Próximas entregas</h4>
                ${renderLista(proximas)}
            </div>
            <div class="agenda-direcao-card">
                <h4>Concluídas / publicadas</h4>
                ${renderLista(concluidas)}
            </div>
        `;
    };

    const _oldRenderAgendaTrabalho354 = window.renderizarAgendaTrabalho;
    window.renderizarAgendaTrabalho = function() {
        window.aplicarEstilosAgendaAvancados();
        if (typeof _oldRenderAgendaTrabalho354 === 'function') {
            return _oldRenderAgendaTrabalho354();
        }
    };
})();


// ==========================================
// AGENDA 3.5.5 - DATA BR + DIREÇÃO SOMENTE DO DIA
// ==========================================
(function() {
    window.formatarDataAgenda = function(valor = '', comAno = true) {
        const raw = String(valor || '').trim();
        if (!raw) return '';
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, ano, mes, dia] = match;
            return comAno ? `${dia}/${mes}/${ano}` : `${dia}/${mes}`;
        }
        const data = new Date(raw);
        if (!Number.isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR', comAno ? { day:'2-digit', month:'2-digit', year:'numeric' } : { day:'2-digit', month:'2-digit' });
        }
        return raw;
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusVisual = window.getAgendaStatusVisual(data.status);
        const collapseId = `agenda-collapse-${item.id}`;
        const dataExibicao = window.getAgendaDataExibicao(data);
        const dataFormatada = window.formatarDataAgenda(dataExibicao);

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataFormatada || 'Sem data definida'}</div>
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataFormatada ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataFormatada)}</span>` : ''}
                    </div>
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    window.renderizarAgendaDirecao = function() {
        window.aplicarEstilosAgendaAvancados();
        const grid = document.getElementById('agenda-direcao-grid');
        if (!grid) return;

        const hoje = new Date().toISOString().slice(0,10);
        const doDia = window.todosAgendaTrabalho
            .filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade))
            .filter(item => window.getAgendaDataExibicao(item.data) === hoje)
            .sort((a, b) => {
                const ordem = {
                    'A fazer': 1,
                    'Em andamento': 2,
                    'Em revisão': 3,
                    'Enviado': 4,
                    'Publicado': 5,
                    'Concluído': 6
                };
                return (ordem[a.data.status] || 99) - (ordem[b.data.status] || 99);
            });

        const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => {
            const visual = window.getAgendaStatusVisual(item.data.status);
            const dataPrincipal = window.formatarDataAgenda(window.getAgendaDataExibicao(item.data));
            return `<div class="agenda-direcao-item ${visual.tone}">
                <strong>${window.escapeHTML(item.data.titulo)}</strong>
                <span style="font-size:12px; color:#475569;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)}${dataPrincipal ? ` • ${window.escapeHTML(dataPrincipal)}` : ''}</span>
                ${item.data.temaEspecial ? `<small>Tema: ${window.escapeHTML(item.data.temaEspecial)}</small>` : ''}
            </div>`;
        }).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhuma demanda programada para hoje.</p>';

        grid.innerHTML = `
            <div class="agenda-direcao-card" style="grid-column:1 / -1;">
                <h4>Demandas do dia</h4>
                ${renderLista(doDia)}
            </div>
        `;
    };
})();


// ==========================================
// AGENDA 3.6.0 - FILTRO POR DATA + DIA + HORÁRIO + CONFERÊNCIA
// ==========================================
(function() {
    window.aplicarEstilosAgendaConferencia = function() {
        if (document.getElementById('agenda-style-360')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-360';
        style.textContent = `
            .agenda-filtro-extra-wrap {
                display:flex;
                gap:10px;
                flex-wrap:wrap;
                align-items:center;
            }
            .agenda-day-summary {
                display:flex;
                flex-direction:column;
                gap:8px;
                margin-top:10px;
            }
            .agenda-day-count {
                display:inline-flex;
                align-items:center;
                gap:6px;
                width:max-content;
                padding:6px 10px;
                border-radius:999px;
                background:#eff6ff;
                color:#1d4ed8;
                font-size:11px;
                font-weight:800;
            }
            .agenda-day-preview {
                font-size:12px;
                color:#64748b;
                line-height:1.45;
            }
            .agenda-day-column.clickable-day {
                cursor:pointer;
            }
            .agenda-day-column.clickable-day:hover {
                border-color:#94a3b8;
                box-shadow:0 8px 18px rgba(15,23,42,.06);
            }
            .agenda-colaborador-resumo {
                display:flex;
                flex-wrap:wrap;
                gap:8px;
                margin-top:8px;
            }
            .agenda-badge-concluido {
                display:inline-flex;
                align-items:center;
                gap:6px;
                padding:5px 9px;
                background:#f0fdf4;
                color:#15803d;
                border-radius:999px;
                font-size:11px;
                font-weight:700;
            }
            .agenda-badge-hoje {
                display:inline-flex;
                align-items:center;
                gap:6px;
                padding:5px 9px;
                background:#eff6ff;
                color:#1d4ed8;
                border-radius:999px;
                font-size:11px;
                font-weight:700;
            }
            .agenda-prazo-chip {
                display:inline-flex;
                align-items:center;
                gap:6px;
                padding:4px 8px;
                border-radius:999px;
                font-size:10px;
                font-weight:800;
            }
            .agenda-prazo-chip.is-danger { background:#fee2e2; color:#b91c1c; }
            .agenda-prazo-chip.is-warning { background:#fef3c7; color:#b45309; }
            .agenda-prazo-chip.is-success { background:#dcfce7; color:#166534; }
            .agenda-prazo-chip.is-info { background:#dbeafe; color:#1d4ed8; }
            .agenda-mini-badge-horario {
                background:rgba(255,255,255,.75);
                color:#0f172a;
            }
            .agenda-dia-modal-overlay {
                position:fixed;
                inset:0;
                background:rgba(15,23,42,.45);
                backdrop-filter:blur(3px);
                z-index:10040;
                display:none;
                align-items:center;
                justify-content:center;
                padding:20px;
            }
            .agenda-dia-modal-box {
                width:min(980px, 96vw);
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:22px;
                padding:22px;
                box-shadow:0 28px 60px rgba(15,23,42,.25);
            }
            .agenda-dia-modal-grid {
                display:grid;
                grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));
                gap:14px;
                margin-top:16px;
            }
        `;
        document.head.appendChild(style);
    };

    const _oldNormalizarAgenda360 = window.normalizarAgendaData;
    window.normalizarAgendaData = function(data = {}) {
        const base = typeof _oldNormalizarAgenda360 === 'function' ? _oldNormalizarAgenda360(data) : { ...(data || {}) };
        return {
            ...base,
            horario: String(data.horario || base.horario || '').trim()
        };
    };

    window.getAgendaDataFiltroExato = function() {
        const input = document.getElementById('agenda-filtro-data');
        return input ? String(input.value || '').trim() : '';
    };

    window.getAgendaPeriodoAtivo = function() {
        const dataExata = window.getAgendaDataFiltroExato();
        if (dataExata) return { tipo: 'data', valor: dataExata };
        return { tipo: 'mes', valor: window.obterAgendaMesSelecionado() };
    };

    window.filtrarAgendaPorPeriodo = function(lista = []) {
        const periodo = window.getAgendaPeriodoAtivo();
        return (lista || []).filter(item => {
            const dataPrincipal = window.getAgendaDataExibicao(item.data);
            if (!dataPrincipal) return false;
            if (periodo.tipo === 'data') return dataPrincipal === periodo.valor;
            return dataPrincipal.startsWith(periodo.valor);
        });
    };

    window.formatarDuracaoRestanteAgenda = function(ms = 0) {
        const totalMin = Math.max(1, Math.round(Math.abs(ms) / 60000));
        const dias = Math.floor(totalMin / (60 * 24));
        const horas = Math.floor((totalMin % (60 * 24)) / 60);
        const minutos = totalMin % 60;
        if (dias > 0) return `${dias}d ${horas}h`;
        if (horas > 0) return `${horas}h ${minutos}min`;
        return `${minutos}min`;
    };

    window.getAgendaPrazoInfo = function(data = {}) {
        const normalizada = window.normalizarAgendaData(data);
        if (!normalizada.dataPrincipal || !normalizada.horario) return null;

        const due = new Date(`${normalizada.dataPrincipal}T${normalizada.horario}:00`);
        if (Number.isNaN(due.getTime())) return null;

        const agora = new Date();
        const diff = due.getTime() - agora.getTime();
        const conclusiva = window.agendaStatusConclusivos.includes(normalizada.status);
        const atualizado = normalizada.atualizadoEm ? new Date(normalizada.atualizadoEm) : null;

        if (conclusiva && atualizado && !Number.isNaN(atualizado.getTime())) {
            if (atualizado.getTime() <= due.getTime()) {
                return { texto: 'Concluída no prazo', tone: 'is-success' };
            }
            if (atualizado.toISOString().slice(0,10) === normalizada.dataPrincipal) {
                return { texto: 'Feita no dia com atraso', tone: 'is-warning' };
            }
            return { texto: 'Concluída com atraso', tone: 'is-danger' };
        }

        if (diff < 0) {
            return { texto: `Atrasada há ${window.formatarDuracaoRestanteAgenda(diff)}`, tone: 'is-danger' };
        }
        if (diff <= 1000 * 60 * 60 * 6) {
            return { texto: `Falta ${window.formatarDuracaoRestanteAgenda(diff)}`, tone: 'is-warning' };
        }
        if (diff <= 1000 * 60 * 60 * 24) {
            return { texto: `Entrega hoje às ${normalizada.horario}`, tone: 'is-info' };
        }
        return { texto: `Entrega às ${normalizada.horario}`, tone: 'is-info' };
    };

    window.garantirCampoHorarioAgenda = function() {
        const dataInput = document.getElementById('agenda-data-principal');
        if (!dataInput || document.getElementById('agenda-horario')) return;
        const horario = document.createElement('input');
        horario.type = 'time';
        horario.id = 'agenda-horario';
        horario.className = 'form-input';
        horario.placeholder = 'Horário da atividade';
        const parent = dataInput.parentElement;
        if (parent) {
            parent.appendChild(horario);
        }
    };

    const _oldAbrirModalAgenda360 = window.abrirModalAgendaTrabalho;
    window.abrirModalAgendaTrabalho = function(docId = null) {
        if (typeof _oldAbrirModalAgenda360 === 'function') _oldAbrirModalAgenda360(docId);
        window.garantirCampoHorarioAgenda();
        const item = docId ? (window.todosAgendaTrabalho.find(t => t.id === docId) || null) : null;
        const data = item ? window.normalizarAgendaData(item.data) : window.normalizarAgendaData({});
        const horarioInput = document.getElementById('agenda-horario');
        if (horarioInput) horarioInput.value = data.horario || '';
    };

    const _oldSalvarAgenda360 = window.salvarAgendaTrabalho;
    window.salvarAgendaTrabalho = async function() {
        window.garantirCampoHorarioAgenda();
        const horarioInput = document.getElementById('agenda-horario');
        const docId = document.getElementById('agenda-doc-id')?.value || '';
        const itemAntigo = docId ? (window.todosAgendaTrabalho.find(t => t.id === docId) || null) : null;
        const horarioAnterior = itemAntigo?.data?.horario || '';
        await _oldSalvarAgenda360();
        try {
            const idAtual = docId || '';
            const horario = String(horarioInput?.value || horarioAnterior || '').trim();
            if (idAtual && horario) {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', idAtual), { horario }, { merge: true });
            }
        } catch (e) {
            console.error('Falha ao salvar horário da demanda:', e);
        }
        setTimeout(() => window.renderizarAgendaTrabalho(), 150);
    };

    window.inicializarFiltrosAvancadosAgenda = function() {
        window.aplicarEstilosAgendaConferencia();
        const filtroMes = document.getElementById('agenda-filtro-mes');
        if (!filtroMes || document.getElementById('agenda-filtro-data')) return;

        const wrap = document.createElement('div');
        wrap.className = 'agenda-filtro-extra-wrap';
        wrap.innerHTML = `
            <input type="date" id="agenda-filtro-data" class="form-input agenda-month-input" style="width:170px; margin-bottom:0;" title="Filtrar por data específica">
            <button type="button" id="agenda-limpar-data" class="btn-hover color-8" style="height:45px; padding:0 14px; font-size:12px;">
                <i class="ri-close-line"></i> Limpar data
            </button>
        `;

        filtroMes.parentElement?.appendChild(wrap);

        const inputData = wrap.querySelector('#agenda-filtro-data');
        const btnLimpar = wrap.querySelector('#agenda-limpar-data');
        if (inputData) inputData.addEventListener('change', () => window.renderizarAgendaTrabalho());
        if (btnLimpar) btnLimpar.addEventListener('click', () => {
            if (inputData) inputData.value = '';
            window.renderizarAgendaTrabalho();
        });
    };

    window.garantirModalDiaAgenda = function() {
        if (document.getElementById('agenda-dia-modal')) return;
        window.aplicarEstilosAgendaConferencia();
        const overlay = document.createElement('div');
        overlay.id = 'agenda-dia-modal';
        overlay.className = 'agenda-dia-modal-overlay';
        overlay.innerHTML = `
            <div class="agenda-dia-modal-box">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <h3 id="agenda-dia-modal-title" style="margin:0;">Demandas do dia</h3>
                    <button type="button" class="btn-icon" onclick="window.fecharDiaAgenda()"><i class="ri-close-line"></i></button>
                </div>
                <div id="agenda-dia-modal-grid" class="agenda-dia-modal-grid"></div>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.fecharDiaAgenda();
        });
        document.body.appendChild(overlay);
    };

    window.abrirDiaAgenda = function(isoDate = '') {
        window.garantirModalDiaAgenda();
        const overlay = document.getElementById('agenda-dia-modal');
        const title = document.getElementById('agenda-dia-modal-title');
        const grid = document.getElementById('agenda-dia-modal-grid');
        if (!overlay || !title || !grid) return;

        const tarefasDia = (window.todosAgendaTrabalho || [])
            .filter(item => window.getAgendaDataExibicao(item.data) === isoDate)
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        title.textContent = `Demandas de ${window.formatarDataAgenda(isoDate) || isoDate}`;
        grid.innerHTML = tarefasDia.length
            ? tarefasDia.map(item => window.gerarCardAgendaTarefa(item)).join('')
            : '<p style="color:#64748b;">Nenhuma demanda para esta data.</p>';
        overlay.style.display = 'flex';
    };

    window.fecharDiaAgenda = function() {
        const overlay = document.getElementById('agenda-dia-modal');
        if (overlay) overlay.style.display = 'none';
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusVisual = window.getAgendaStatusVisual(data.status);
        const collapseId = `agenda-collapse-${item.id}`;
        const dataExibicao = window.getAgendaDataExibicao(data);
        const dataFormatada = window.formatarDataAgenda(dataExibicao);
        const prazo = window.getAgendaPrazoInfo(data);

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataFormatada || 'Sem data definida'}${data.horario ? ` • ${window.escapeHTML(data.horario)}` : ''}</div>
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataFormatada ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataFormatada)}</span>` : ''}
                        ${data.horario ? `<span class="agenda-mini-badge agenda-mini-badge-horario"><i class="ri-time-line"></i> ${window.escapeHTML(data.horario)}</span>` : ''}
                    </div>
                    ${prazo ? `<div style="margin-top:10px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    window.renderizarCardsColaboradoresAgenda = function() {
        const grid = document.getElementById('agenda-colaboradores-grid');
        if (!grid) return;
        const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {}).filter(window.colaboradorEhMarketing);
        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);

        if (!colaboradores.length) {
            grid.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum colaborador do marketing cadastrado.</div>';
            return;
        }

        grid.innerHTML = colaboradores.map(colab => {
            const nome = String(colab['Nome Completo do Colaborador'] || '').trim();
            const setor = String(colab['Setor da Clínica'] || 'Marketing').trim();
            const foto = String(colab['Link da Foto'] || colab['Foto'] || '').trim();
            const aniversario = String(colab['Data de Aniversário'] || colab['Aniversário'] || 'Não informado').trim();
            const info = String(colab['Informações Gerais'] || colab['Observações'] || 'Sem observações').trim();

            const todas = (window.todosAgendaTrabalho || []).filter(item => item.data.responsavel === nome);
            const doDia = todas.filter(item => window.getAgendaDataExibicao(item.data) === dataRef);
            const concluidas = todas.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).length;

            const resumoHoje = doDia.length
                ? doDia.slice(0, 2).map(item => `• ${window.escapeHTML(item.data.titulo)}`).join('<br>')
                : 'Sem demanda para a data selecionada.';

            return `
                <div class="agenda-colaborador-card">
                    <div class="agenda-colaborador-avatar">${foto ? `<img src="${window.escapeAttr(foto)}" alt="${window.escapeAttr(nome)}" onerror="this.parentElement.innerHTML='<i class=\\"ri-user-3-line\\"></i>'">` : '<i class="ri-user-3-line"></i>'}</div>
                    <div class="agenda-colaborador-meta">
                        <h4>${window.escapeHTML(nome || 'Colaborador')}</h4>
                        <p><strong>Setor:</strong> ${window.escapeHTML(setor)}</p>
                        <p><strong>Aniversário:</strong> ${window.escapeHTML(aniversario)}</p>
                        <p>${window.escapeHTML(info)}</p>
                        <div class="agenda-colaborador-resumo">
                            <span class="agenda-badge-hoje"><i class="ri-calendar-check-line"></i> ${doDia.length} do dia</span>
                            <span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>
                        </div>
                        <div style="margin-top:10px; font-size:12px; color:#64748b; line-height:1.5;">${resumoHoje}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const dataPrincipal = window.getAgendaDataExibicao(item.data);
            return dataPrincipal && dataPrincipal.startsWith(mes);
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDataExibicao(item.data) === dia.iso);
            const concluidas = tarefasDia.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).length;
            const preview = tarefasDia.slice(0, 2).map(item => window.escapeHTML(item.data.titulo)).join(' • ');

            return `
                <div class="agenda-day-column clickable-day" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? preview : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };

    window.renderizarAgendaBoard = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-board-grid');
        if (!grid) return;
        const tarefas = window.filtrarAgendaPorPeriodo(window.todosAgendaTrabalho)
            .sort((a, b) => String(window.getAgendaDataExibicao(a.data)).localeCompare(String(window.getAgendaDataExibicao(b.data))));
        grid.innerHTML = window.agendaStatusColunas.map(status => {
            const col = tarefas.filter(item => item.data.status === status);
            return `
                <div class="agenda-board-column" data-status="${window.escapeAttr(status)}">
                    <h4>${window.escapeHTML(status)} <span style="color:#94a3b8;">(${col.length})</span></h4>
                    ${col.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem itens</p>'}
                </div>
            `;
        }).join('');
        window.aplicarDnDAgenda();
    };

    window.renderizarAgendaDirecao = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-direcao-grid');
        if (!grid) return;

        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
        const doDia = (window.todosAgendaTrabalho || [])
            .filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade))
            .filter(item => window.getAgendaDataExibicao(item.data) === dataRef)
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => {
            const visual = window.getAgendaStatusVisual(item.data.status);
            const dataPrincipal = window.formatarDataAgenda(window.getAgendaDataExibicao(item.data));
            const prazo = window.getAgendaPrazoInfo(item.data);
            return `<div class="agenda-direcao-item ${visual.tone}">
                <strong>${window.escapeHTML(item.data.titulo)}</strong>
                <span style="font-size:12px; color:#475569;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)}${dataPrincipal ? ` • ${window.escapeHTML(dataPrincipal)}` : ''}${item.data.horario ? ` • ${window.escapeHTML(item.data.horario)}` : ''}</span>
                ${item.data.temaEspecial ? `<small>Tema: ${window.escapeHTML(item.data.temaEspecial)}</small>` : ''}
                ${prazo ? `<div style="margin-top:8px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
            </div>`;
        }).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhuma demanda programada para esta data.</p>';

        grid.innerHTML = `
            <div class="agenda-direcao-card" style="grid-column:1 / -1;">
                <h4>Demandas do dia — ${window.formatarDataAgenda(dataRef)}</h4>
                ${renderLista(doDia)}
            </div>
        `;
    };

    window.renderizarAgendaTrabalho = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.inicializarFiltrosAvancadosAgenda();
        const inputMes = document.getElementById('agenda-filtro-mes');
        if (inputMes && !inputMes.value) inputMes.value = window.getAgendaMesAtual();
        window.renderizarCardsColaboradoresAgenda();
        if (window.agendaTrabalhoView === 'board') window.renderizarAgendaBoard();
        else if (window.agendaTrabalhoView === 'direcao') window.renderizarAgendaDirecao();
        else window.renderizarAgendaCalendario();
    };

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.inicializarFiltrosAvancadosAgenda();
            window.garantirCampoHorarioAgenda();
            window.garantirModalDiaAgenda();
        }, 160);
    });
})();


// ==========================================
// AGENDA 3.6.1 - SELETOR VISUAL DE MÚLTIPLAS DATAS
// ==========================================
(function() {
    window.aplicarEstilosAgendaDatasExtras = function() {
        if (document.getElementById('agenda-style-361')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-361';
        style.textContent = `
            .agenda-datas-picker-box {
                margin-bottom:16px;
                padding:12px;
                border:1px solid #dbe3ee;
                border-radius:14px;
                background:#f8fafc;
            }
            .agenda-datas-picker-title {
                font-size:12px;
                font-weight:700;
                color:#334155;
                margin-bottom:10px;
            }
            .agenda-datas-picker-row {
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                align-items:center;
            }
            .agenda-datas-picker-row input[type="date"] {
                flex:1;
                min-width:180px;
                margin-bottom:0;
            }
            .agenda-datas-tags {
                display:flex;
                flex-wrap:wrap;
                gap:8px;
                margin-top:12px;
            }
            .agenda-data-tag {
                display:inline-flex;
                align-items:center;
                gap:8px;
                padding:7px 10px;
                border-radius:999px;
                background:#eff6ff;
                color:#1d4ed8;
                font-size:12px;
                font-weight:700;
            }
            .agenda-data-tag button {
                border:none;
                background:none;
                color:#dc2626;
                cursor:pointer;
                font-size:14px;
                line-height:1;
                padding:0;
            }
            .agenda-datas-vazio {
                margin-top:10px;
                font-size:12px;
                color:#64748b;
            }
        `;
        document.head.appendChild(style);
    };

    window.agendaDatasExtrasSelecionadas = [];

    window.sincronizarCampoDatasExtrasAgenda = function() {
        const inputOriginal = document.getElementById('agenda-datas-extras');
        if (!inputOriginal) return;
        inputOriginal.value = (window.agendaDatasExtrasSelecionadas || []).join(', ');
    };

    window.renderizarDatasExtrasAgenda = function() {
        const container = document.getElementById('agenda-datas-tags');
        if (!container) return;
        container.innerHTML = '';

        if (!window.agendaDatasExtrasSelecionadas.length) {
            container.innerHTML = `<div class="agenda-datas-vazio">Nenhuma data extra selecionada.</div>`;
            window.sincronizarCampoDatasExtrasAgenda();
            return;
        }

        container.innerHTML = window.agendaDatasExtrasSelecionadas
            .sort()
            .map(data => `
                <span class="agenda-data-tag">
                    <i class="ri-calendar-line"></i> ${window.formatarDataAgenda ? window.formatarDataAgenda(data) : data}
                    <button type="button" onclick="window.removerDataExtraAgenda('${data}')" title="Remover data">
                        <i class="ri-close-line"></i>
                    </button>
                </span>
            `).join('');

        window.sincronizarCampoDatasExtrasAgenda();
    };

    window.adicionarDataExtraAgenda = function() {
        const inputPicker = document.getElementById('agenda-data-extra-picker');
        if (!inputPicker) return;
        const valor = String(inputPicker.value || '').trim();
        if (!valor) return;
        if (!window.agendaDatasExtrasSelecionadas.includes(valor)) {
            window.agendaDatasExtrasSelecionadas.push(valor);
        }
        inputPicker.value = '';
        window.renderizarDatasExtrasAgenda();
    };

    window.removerDataExtraAgenda = function(data = '') {
        window.agendaDatasExtrasSelecionadas = (window.agendaDatasExtrasSelecionadas || []).filter(item => item !== data);
        window.renderizarDatasExtrasAgenda();
    };

    window.configurarPickerDatasExtrasAgenda = function() {
        window.aplicarEstilosAgendaDatasExtras();

        const inputOriginal = document.getElementById('agenda-datas-extras');
        if (!inputOriginal) return;

        let box = document.getElementById('agenda-datas-picker-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'agenda-datas-picker-box';
            box.className = 'agenda-datas-picker-box';
            box.innerHTML = `
                <div class="agenda-datas-picker-title">Datas extras da atividade</div>
                <div class="agenda-datas-picker-row">
                    <input type="date" id="agenda-data-extra-picker" class="form-input">
                    <button type="button" id="agenda-btn-add-data-extra" class="btn-hover color-9" style="height:45px; padding:0 16px; font-size:12px;">
                        <i class="ri-add-line"></i> Adicionar data
                    </button>
                </div>
                <div id="agenda-datas-tags" class="agenda-datas-tags"></div>
            `;
            inputOriginal.parentElement?.insertBefore(box, inputOriginal.nextSibling);
        }

        inputOriginal.style.display = 'none';

        const addBtn = document.getElementById('agenda-btn-add-data-extra');
        const picker = document.getElementById('agenda-data-extra-picker');

        if (addBtn && addBtn.dataset.bound !== '1') {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', window.adicionarDataExtraAgenda);
        }
        if (picker && picker.dataset.bound !== '1') {
            picker.dataset.bound = '1';
            picker.addEventListener('change', window.adicionarDataExtraAgenda);
        }

        window.agendaDatasExtrasSelecionadas = String(inputOriginal.value || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

        window.renderizarDatasExtrasAgenda();
    };

    const _oldAbrirModalAgenda361 = window.abrirModalAgendaTrabalho;
    window.abrirModalAgendaTrabalho = function(docId = null) {
        if (typeof _oldAbrirModalAgenda361 === 'function') _oldAbrirModalAgenda361(docId);
        setTimeout(() => {
            window.configurarPickerDatasExtrasAgenda();
        }, 40);
    };

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (document.getElementById('agenda-datas-extras')) {
                window.configurarPickerDatasExtrasAgenda();
            }
        }, 180);
    });
})();


// ==========================================
// AGENDA 3.6.2 - INTERVALO DE DATAS + REPETIÇÃO NAS DATAS EXTRAS
// ==========================================
(function() {
    window.getAgendaDatasExecucao = function(data = {}) {
        if (typeof window.obterDatasAgendaDaTarefa === 'function') {
            return window.obterDatasAgendaDaTarefa(data);
        }
        const normalizada = window.normalizarAgendaData(data);
        const set = new Set();
        if (normalizada.dataPrincipal) set.add(normalizada.dataPrincipal);
        (normalizada.datasExtras || []).forEach(dt => { if (dt) set.add(dt); });
        return Array.from(set).sort();
    };

    window.adicionarIntervaloDatasAgenda = function() {
        const inputInicio = document.getElementById('agenda-data-inicio-range');
        const inputFim = document.getElementById('agenda-data-fim-range');
        const inicio = String(inputInicio?.value || '').trim();
        const fim = String(inputFim?.value || '').trim();
        if (!inicio || !fim) return;
        if (inicio > fim) {
            alert('A data inicial não pode ser maior que a data final.');
            return;
        }

        let cursor = new Date(`${inicio}T00:00:00`);
        const limite = new Date(`${fim}T00:00:00`);
        while (cursor <= limite) {
            const iso = cursor.toISOString().slice(0,10);
            if (!window.agendaDatasExtrasSelecionadas.includes(iso)) {
                window.agendaDatasExtrasSelecionadas.push(iso);
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        if (inputInicio) inputInicio.value = '';
        if (inputFim) inputFim.value = '';
        window.renderizarDatasExtrasAgenda();
    };

    window.configurarPickerDatasExtrasAgenda = function() {
        window.aplicarEstilosAgendaDatasExtras();

        const inputOriginal = document.getElementById('agenda-datas-extras');
        if (!inputOriginal) return;

        let box = document.getElementById('agenda-datas-picker-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'agenda-datas-picker-box';
            box.className = 'agenda-datas-picker-box';
            inputOriginal.parentElement?.insertBefore(box, inputOriginal.nextSibling);
        }

        box.innerHTML = `
            <div class="agenda-datas-picker-title">Datas extras da atividade</div>
            <div class="agenda-datas-picker-row">
                <input type="date" id="agenda-data-extra-picker" class="form-input">
                <button type="button" id="agenda-btn-add-data-extra" class="btn-hover color-9" style="height:45px; padding:0 16px; font-size:12px;">
                    <i class="ri-add-line"></i> Adicionar data
                </button>
            </div>
            <div class="agenda-datas-picker-title" style="margin-top:14px;">Adicionar intervalo automático</div>
            <div class="agenda-datas-picker-row">
                <input type="date" id="agenda-data-inicio-range" class="form-input" placeholder="Data inicial">
                <input type="date" id="agenda-data-fim-range" class="form-input" placeholder="Data final">
                <button type="button" id="agenda-btn-add-range" class="btn-hover color-5" style="height:45px; padding:0 16px; font-size:12px;">
                    <i class="ri-calendar-check-line"></i> Adicionar intervalo
                </button>
            </div>
            <div id="agenda-datas-tags" class="agenda-datas-tags"></div>
        `;

        inputOriginal.style.display = 'none';

        const addBtn = document.getElementById('agenda-btn-add-data-extra');
        const picker = document.getElementById('agenda-data-extra-picker');
        const addRangeBtn = document.getElementById('agenda-btn-add-range');

        if (addBtn && addBtn.dataset.bound !== '1') {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', window.adicionarDataExtraAgenda);
        }
        if (picker && picker.dataset.bound !== '1') {
            picker.dataset.bound = '1';
            picker.addEventListener('change', window.adicionarDataExtraAgenda);
        }
        if (addRangeBtn && addRangeBtn.dataset.bound !== '1') {
            addRangeBtn.dataset.bound = '1';
            addRangeBtn.addEventListener('click', window.adicionarIntervaloDatasAgenda);
        }

        window.agendaDatasExtrasSelecionadas = String(inputOriginal.value || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

        window.renderizarDatasExtrasAgenda();
    };

    window.filtrarAgendaPorPeriodo = function(lista = []) {
        const periodo = window.getAgendaPeriodoAtivo();
        return (lista || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data);
            if (!datas.length) return false;
            if (periodo.tipo === 'data') return datas.includes(periodo.valor);
            return datas.some(dt => dt.startsWith(periodo.valor));
        });
    };

    window.renderizarCardsColaboradoresAgenda = function() {
        const grid = document.getElementById('agenda-colaboradores-grid');
        if (!grid) return;
        const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {}).filter(window.colaboradorEhMarketing);
        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);

        if (!colaboradores.length) {
            grid.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum colaborador do marketing cadastrado.</div>';
            return;
        }

        grid.innerHTML = colaboradores.map(colab => {
            const nome = String(colab['Nome Completo do Colaborador'] || '').trim();
            const setor = String(colab['Setor da Clínica'] || 'Marketing').trim();
            const foto = String(colab['Link da Foto'] || colab['Foto'] || '').trim();
            const aniversario = String(colab['Data de Aniversário'] || colab['Aniversário'] || 'Não informado').trim();
            const info = String(colab['Informações Gerais'] || colab['Observações'] || 'Sem observações').trim();

            const todas = (window.todosAgendaTrabalho || []).filter(item => item.data.responsavel === nome);
            const doDia = todas.filter(item => window.getAgendaDatasExecucao(item.data).includes(dataRef));
            const concluidas = todas.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).length;

            const resumoHoje = doDia.length
                ? doDia.slice(0, 2).map(item => `• ${window.escapeHTML(item.data.titulo)}`).join('<br>')
                : 'Sem demanda para a data selecionada.';

            return `
                <div class="agenda-colaborador-card">
                    <div class="agenda-colaborador-avatar">${foto ? `<img src="${window.escapeAttr(foto)}" alt="${window.escapeAttr(nome)}" onerror="this.parentElement.innerHTML='<i class=\\"ri-user-3-line\\"></i>'">` : '<i class="ri-user-3-line"></i>'}</div>
                    <div class="agenda-colaborador-meta">
                        <h4>${window.escapeHTML(nome || 'Colaborador')}</h4>
                        <p><strong>Setor:</strong> ${window.escapeHTML(setor)}</p>
                        <p><strong>Aniversário:</strong> ${window.escapeHTML(aniversario)}</p>
                        <p>${window.escapeHTML(info)}</p>
                        <div class="agenda-colaborador-resumo">
                            <span class="agenda-badge-hoje"><i class="ri-calendar-check-line"></i> ${doDia.length} do dia</span>
                            <span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>
                        </div>
                        <div style="margin-top:10px; font-size:12px; color:#64748b; line-height:1.5;">${resumoHoje}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.abrirDiaAgenda = function(isoDate = '') {
        window.garantirModalDiaAgenda();
        const overlay = document.getElementById('agenda-dia-modal');
        const title = document.getElementById('agenda-dia-modal-title');
        const grid = document.getElementById('agenda-dia-modal-grid');
        if (!overlay || !title || !grid) return;

        const tarefasDia = (window.todosAgendaTrabalho || [])
            .filter(item => window.getAgendaDatasExecucao(item.data).includes(isoDate))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        title.textContent = `Demandas de ${window.formatarDataAgenda(isoDate) || isoDate}`;
        grid.innerHTML = tarefasDia.length
            ? tarefasDia.map(item => window.gerarCardAgendaTarefa(item)).join('')
            : '<p style="color:#64748b;">Nenhuma demanda para esta data.</p>';
        overlay.style.display = 'flex';
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data);
            return datas.some(dt => dt.startsWith(mes));
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDatasExecucao(item.data).includes(dia.iso));
            const concluidas = tarefasDia.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).length;
            const preview = tarefasDia.slice(0, 2).map(item => window.escapeHTML(item.data.titulo)).join(' • ');

            return `
                <div class="agenda-day-column clickable-day" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? preview : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };

    window.renderizarAgendaDirecao = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-direcao-grid');
        if (!grid) return;

        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
        const doDia = (window.todosAgendaTrabalho || [])
            .filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade))
            .filter(item => window.getAgendaDatasExecucao(item.data).includes(dataRef))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => {
            const visual = window.getAgendaStatusVisual(item.data.status);
            const dataPrincipal = window.formatarDataAgenda(window.getAgendaDataExibicao(item.data));
            const prazo = window.getAgendaPrazoInfo(item.data);
            return `<div class="agenda-direcao-item ${visual.tone}">
                <strong>${window.escapeHTML(item.data.titulo)}</strong>
                <span style="font-size:12px; color:#475569;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(item.data.status)}${dataPrincipal ? ` • base ${window.escapeHTML(dataPrincipal)}` : ''}${item.data.horario ? ` • ${window.escapeHTML(item.data.horario)}` : ''}</span>
                ${item.data.temaEspecial ? `<small>Tema: ${window.escapeHTML(item.data.temaEspecial)}</small>` : ''}
                ${prazo ? `<div style="margin-top:8px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
            </div>`;
        }).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhuma demanda programada para esta data.</p>';

        grid.innerHTML = `
            <div class="agenda-direcao-card" style="grid-column:1 / -1;">
                <h4>Demandas do dia — ${window.formatarDataAgenda(dataRef)}</h4>
                ${renderLista(doDia)}
            </div>
        `;
    };
})();


// ==========================================
// AGENDA 3.6.2.1 - RESPONSÁVEL COMPACTO NO CARD
// ==========================================
(function() {
    window.aplicarEstiloResponsavelCompactoAgenda = function() {
        if (document.getElementById('agenda-style-3621')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-3621';
        style.textContent = `
            .agenda-task-responsavel-mini {
                margin-top:2px;
                font-size:10px;
                font-weight:700;
                color:#64748b;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                max-width:100%;
            }
        `;
        document.head.appendChild(style);
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstiloResponsavelCompactoAgenda();

        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusVisual = window.getAgendaStatusVisual(data.status);
        const collapseId = `agenda-collapse-${item.id}`;
        const dataExibicao = window.getAgendaDataExibicao(data);
        const dataFormatada = window.formatarDataAgenda(dataExibicao);
        const prazo = window.getAgendaPrazoInfo(data);

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataFormatada || 'Sem data definida'}${data.horario ? ` • ${window.escapeHTML(data.horario)}` : ''}</div>
                        ${data.responsavel ? `<div class="agenda-task-responsavel-mini">Resp.: ${window.escapeHTML(data.responsavel)}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.status)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataFormatada ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataFormatada)}</span>` : ''}
                        ${data.horario ? `<span class="agenda-mini-badge agenda-mini-badge-horario"><i class="ri-time-line"></i> ${window.escapeHTML(data.horario)}</span>` : ''}
                    </div>
                    ${prazo ? `<div style="margin-top:10px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };
})();


// ==========================================
// AGENDA 3.6.4 - COR POR DIA + BOARD DO DIA
// ==========================================
(function() {
    window.aplicarEstilosResumoDiaAgenda = function() {
        if (document.getElementById('agenda-style-364')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-364';
        style.textContent = `
            .agenda-day-column.day-complete {
                background:#f0fdf4;
                border-color:#86efac;
            }
            .agenda-day-column.day-pending {
                background:#fef2f2;
                border-color:#fca5a5;
            }
            .agenda-day-column.day-neutral {
                background:#f8fafc;
            }
            .agenda-day-status-chip {
                display:inline-flex;
                align-items:center;
                gap:6px;
                width:max-content;
                padding:5px 9px;
                border-radius:999px;
                font-size:11px;
                font-weight:800;
            }
            .agenda-day-status-chip.is-success {
                background:#dcfce7;
                color:#166534;
            }
            .agenda-day-status-chip.is-danger {
                background:#fee2e2;
                color:#b91c1c;
            }
            .agenda-day-status-chip.is-neutral {
                background:#e2e8f0;
                color:#475569;
            }
        `;
        document.head.appendChild(style);
    };

    window.getResumoStatusDiaAgenda = function(tarefasDia = []) {
        if (!tarefasDia.length) {
            return { cardClass: 'day-neutral', chipClass: 'is-neutral', texto: 'Sem demandas' };
        }
        const todasConcluidas = tarefasDia.every(item => window.agendaStatusConclusivos.includes(item.data.status));
        if (todasConcluidas) {
            return { cardClass: 'day-complete', chipClass: 'is-success', texto: 'Tudo concluído' };
        }
        return { cardClass: 'day-pending', chipClass: 'is-danger', texto: 'Há pendências' };
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstilosResumoDiaAgenda();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data);
            return datas.some(dt => dt.startsWith(mes));
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDatasExecucao(item.data).includes(dia.iso));
            const concluidas = tarefasDia.filter(item => window.agendaStatusConclusivos.includes(item.data.status)).length;
            const resumo = window.getResumoStatusDiaAgenda(tarefasDia);

            return `
                <div class="agenda-day-column clickable-day ${resumo.cardClass}" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        <span class="agenda-day-status-chip ${resumo.chipClass}">${window.escapeHTML(resumo.texto)}</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? tarefasDia.slice(0,2).map(item => window.escapeHTML(item.data.titulo)).join(' • ') : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };

    window.renderizarAgendaBoard = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-board-grid');
        if (!grid) return;

        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
        const tarefas = (window.todosAgendaTrabalho || [])
            .filter(item => window.getAgendaDatasExecucao(item.data).includes(dataRef))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        grid.innerHTML = window.agendaStatusColunas.map(status => {
            const col = tarefas.filter(item => item.data.status === status);
            return `
                <div class="agenda-board-column" data-status="${window.escapeAttr(status)}">
                    <h4>${window.escapeHTML(status)} <span style="color:#94a3b8;">(${col.length})</span></h4>
                    ${col.map(item => window.gerarCardAgendaTarefa(item)).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem itens</p>'}
                </div>
            `;
        }).join('');
        window.aplicarDnDAgenda();
    };
})();


// ==========================================
// AGENDA 3.7.0 - REPETIÇÃO POR DIA DA SEMANA + STATUS POR DATA
// ==========================================
(function() {
    window.diasSemanaRecorrenciaAgenda = [
        { valor: '1', label: 'Seg' },
        { valor: '2', label: 'Ter' },
        { valor: '3', label: 'Qua' },
        { valor: '4', label: 'Qui' },
        { valor: '5', label: 'Sex' },
        { valor: '6', label: 'Sáb' },
        { valor: '0', label: 'Dom' }
    ];

    const _oldNormalizarAgenda370 = window.normalizarAgendaData;
    window.normalizarAgendaData = function(data = {}) {
        const base = typeof _oldNormalizarAgenda370 === 'function' ? _oldNormalizarAgenda370(data) : { ...(data || {}) };
        let diasRecorrentes = [];
        if (Array.isArray(data.diasRecorrentes)) diasRecorrentes = data.diasRecorrentes.map(String);
        else if (typeof data.diasRecorrentes === 'string') diasRecorrentes = data.diasRecorrentes.split(',').map(v => String(v).trim()).filter(Boolean);

        const statusPorDataRaw = data.statusPorData && typeof data.statusPorData === 'object' ? data.statusPorData : {};
        return {
            ...base,
            diasRecorrentes,
            statusPorData: statusPorDataRaw
        };
    };

    window.obterMesContextoAgenda = function(dataRef = '') {
        const exata = String(dataRef || (window.getAgendaDataFiltroExato ? window.getAgendaDataFiltroExato() : '') || '').trim();
        if (exata) return exata.slice(0, 7);
        if (typeof window.obterAgendaMesSelecionado === 'function') return window.obterAgendaMesSelecionado();
        return window.getAgendaMesAtual ? window.getAgendaMesAtual() : new Date().toISOString().slice(0, 7);
    };

    window.gerarDatasRecorrentesNoMesAgenda = function(mes = '', diasSemana = []) {
        const [ano, mesNum] = String(mes || '').split('-').map(Number);
        if (!ano || !mesNum || !Array.isArray(diasSemana) || !diasSemana.length) return [];
        const wanted = new Set(diasSemana.map(String));
        const ultimoDia = new Date(ano, mesNum, 0).getDate();
        const datas = [];
        for (let dia = 1; dia <= ultimoDia; dia++) {
            const d = new Date(ano, mesNum - 1, dia);
            if (wanted.has(String(d.getDay()))) {
                datas.push(`${ano}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
            }
        }
        return datas;
    };

    window.getAgendaDatasExecucao = function(data = {}, dataRef = '') {
        const normalizada = window.normalizarAgendaData(data);
        if (Array.isArray(normalizada.diasRecorrentes) && normalizada.diasRecorrentes.length) {
            const mesContexto = window.obterMesContextoAgenda(dataRef);
            return window.gerarDatasRecorrentesNoMesAgenda(mesContexto, normalizada.diasRecorrentes);
        }
        const set = new Set();
        if (normalizada.dataPrincipal) set.add(normalizada.dataPrincipal);
        (normalizada.datasExtras || []).forEach(dt => { if (dt) set.add(dt); });
        return Array.from(set).sort();
    };

    window.getAgendaStatusNaData = function(data = {}, dataRef = '') {
        const normalizada = window.normalizarAgendaData(data);
        const chave = String(dataRef || '').trim();
        if (chave && normalizada.statusPorData && normalizada.statusPorData[chave]) {
            return String(normalizada.statusPorData[chave]).trim();
        }
        return String(normalizada.status || 'A fazer').trim();
    };

    window.estaConcluidaAgendaNaData = function(data = {}, dataRef = '') {
        return window.agendaStatusConclusivos.includes(window.getAgendaStatusNaData(data, dataRef));
    };

    window.aplicarEstilosRecorrenciaAgenda = function() {
        if (document.getElementById('agenda-style-370')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-370';
        style.textContent = `
            .agenda-recorrencia-box {
                margin-bottom:16px;
                padding:12px;
                border:1px solid #dbe3ee;
                border-radius:14px;
                background:#f8fafc;
            }
            .agenda-recorrencia-title {
                font-size:12px;
                font-weight:700;
                color:#334155;
                margin-bottom:10px;
            }
            .agenda-recorrencia-grid {
                display:grid;
                grid-template-columns:repeat(4, minmax(0, 1fr));
                gap:8px;
            }
            .agenda-recorrencia-item {
                display:flex;
                align-items:center;
                gap:6px;
                font-size:12px;
                color:#334155;
                background:#fff;
                border:1px solid #e2e8f0;
                border-radius:10px;
                padding:8px;
            }
        `;
        document.head.appendChild(style);
    };

    window.configurarRecorrenciaAgenda = function(docId = null) {
        window.aplicarEstilosRecorrenciaAgenda();
        const dataInput = document.getElementById('agenda-data-principal');
        if (!dataInput) return;

        let box = document.getElementById('agenda-recorrencia-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'agenda-recorrencia-box';
            box.className = 'agenda-recorrencia-box';
            box.innerHTML = `
                <div class="agenda-recorrencia-title">Repetir por dia da semana</div>
                <div class="agenda-recorrencia-grid">
                    ${window.diasSemanaRecorrenciaAgenda.map(d => `
                        <label class="agenda-recorrencia-item">
                            <input type="checkbox" class="agenda-check-recorrencia" value="${d.valor}">
                            ${d.label}
                        </label>
                    `).join('')}
                </div>
            `;
            dataInput.parentElement?.insertBefore(box, dataInput.nextSibling);
        }

        const item = docId ? (window.todosAgendaTrabalho || []).find(t => t.id === docId) : null;
        const dias = item?.data?.diasRecorrentes || [];
        box.querySelectorAll('.agenda-check-recorrencia').forEach(check => {
            check.checked = dias.includes(check.value);
        });
    };

    const _oldAbrirModalAgenda370 = window.abrirModalAgendaTrabalho;
    window.abrirModalAgendaTrabalho = function(docId = null) {
        if (typeof _oldAbrirModalAgenda370 === 'function') _oldAbrirModalAgenda370(docId);
        setTimeout(() => {
            window.configurarRecorrenciaAgenda(docId);
        }, 60);
    };

    window.salvarAgendaTrabalho = async function() {
        window.garantirCampoHorarioAgenda && window.garantirCampoHorarioAgenda();
        const docId = document.getElementById('agenda-doc-id')?.value || '';
        const titulo = String(document.getElementById('agenda-titulo')?.value || '').trim();
        if (!titulo) {
            alert('Informe o título da demanda.');
            return;
        }

        const itemAntigo = docId ? ((window.todosAgendaTrabalho || []).find(t => t.id === docId) || null) : null;
        const dataAntiga = itemAntigo?.data || {};
        const historicoAntigo = Array.isArray(dataAntiga.historico) ? dataAntiga.historico : [];
        const agoraIso = new Date().toISOString();
        const diasRecorrentes = Array.from(document.querySelectorAll('.agenda-check-recorrencia:checked')).map(el => String(el.value));

        const dados = {
            titulo,
            descricao: String(document.getElementById('agenda-descricao')?.value || '').trim(),
            responsavel: String(document.getElementById('agenda-responsavel')?.value || '').trim(),
            urgencia: String(document.getElementById('agenda-urgencia')?.value || 'Média').trim(),
            status: String(document.getElementById('agenda-status')?.value || 'A fazer').trim(),
            visibilidade: String(document.getElementById('agenda-visibilidade')?.value || 'ambos').trim(),
            dataPrincipal: String(document.getElementById('agenda-data-principal')?.value || '').trim(),
            datasExtras: String(document.getElementById('agenda-datas-extras')?.value || '').split(',').map(v => v.trim()).filter(Boolean),
            horario: String(document.getElementById('agenda-horario')?.value || dataAntiga.horario || '').trim(),
            temaEspecial: String(document.getElementById('agenda-tema-especial')?.value || '').trim(),
            destaqueEspecial: !!document.getElementById('agenda-destaque-especial')?.checked,
            link: String(document.getElementById('agenda-link')?.value || '').trim(),
            iframeUrl: String(document.getElementById('agenda-iframe')?.value || '').trim(),
            diasRecorrentes,
            statusPorData: dataAntiga.statusPorData || {},
            criadoEm: dataAntiga.criadoEm || agoraIso,
            atualizadoEm: agoraIso
        };

        const novoHistorico = [...historicoAntigo, `${docId ? 'Atualizada' : 'Criada'} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`];
        dados.historico = novoHistorico.slice(-80);

        try {
            if (docId) {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', docId), dados, { merge: true });
            } else {
                await window.addDoc(window.collection(window.db, 'agenda_trabalho'), dados);
            }
            if (typeof window.fecharModalAgendaTrabalho === 'function') window.fecharModalAgendaTrabalho();
            setTimeout(() => window.renderizarAgendaTrabalho && window.renderizarAgendaTrabalho(), 120);
        } catch (error) {
            alert('Erro ao salvar demanda: ' + (error?.message || 'falha desconhecida'));
        }
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstiloResponsavelCompactoAgenda && window.aplicarEstiloResponsavelCompactoAgenda();

        const dataRef = String(opts.dataRef || '').trim();
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusAtual = window.getAgendaStatusNaData(data, dataRef);
        const statusVisual = window.getAgendaStatusVisual(statusAtual);
        const collapseId = `agenda-collapse-${item.id}-${dataRef || 'base'}`.replace(/[^a-zA-Z0-9_-]/g, '');
        const dataFormatada = window.formatarDataAgenda(dataRef || window.getAgendaDataExibicao(data));
        const prazo = window.getAgendaPrazoInfo({ ...data, status: statusAtual });

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataFormatada || 'Sem data definida'}${data.horario ? ` • ${window.escapeHTML(data.horario)}` : ''}</div>
                        ${data.responsavel ? `<div class="agenda-task-responsavel-mini">Resp.: ${window.escapeHTML(data.responsavel)}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(statusAtual)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataFormatada ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataFormatada)}</span>` : ''}
                        ${data.horario ? `<span class="agenda-mini-badge agenda-mini-badge-horario"><i class="ri-time-line"></i> ${window.escapeHTML(data.horario)}</span>` : ''}
                    </div>
                    ${prazo ? `<div style="margin-top:10px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    const _oldAplicarDnD370 = window.aplicarDnDAgenda;
    window.aplicarDnDAgenda = function() {
        if (typeof _oldAplicarDnD370 === 'function') _oldAplicarDnD370();

        document.querySelectorAll('.agenda-board-column').forEach(col => {
            const novo = col.cloneNode(true);
            if (col.parentNode) col.parentNode.replaceChild(novo, col);
        });

        document.querySelectorAll('.agenda-task-card[data-task-id]').forEach(card => {
            card.addEventListener('dragstart', () => { window.agendaDragTaskId = card.getAttribute('data-task-id'); });
            card.addEventListener('dragend', () => { window.agendaDragTaskId = null; });
        });

        document.querySelectorAll('.agenda-board-column').forEach(col => {
            col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = window.agendaDragTaskId;
                const novoStatus = col.getAttribute('data-status');
                const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
                if (!taskId || !novoStatus) return;
                const item = (window.todosAgendaTrabalho || []).find(t => t.id === taskId);
                if (!item) return;

                const statusPorData = { ...(item.data.statusPorData || {}) };
                statusPorData[dataRef] = novoStatus;

                const hist = Array.isArray(item.data.historico) ? item.data.historico : [];
                hist.push(`Status em ${dataRef} alterado para ${novoStatus} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);

                try {
                    await window.setDoc(window.doc(window.db, 'agenda_trabalho', taskId), {
                        statusPorData,
                        atualizadoEm: new Date().toISOString(),
                        historico: hist.slice(-80)
                    }, { merge: true });
                } catch (error) {
                    console.error(error);
                    alert('Não foi possível atualizar o status desta ocorrência.');
                }
            });
        });
    };
})();


// ==========================================
// AGENDA 3.7.1 - OCORRÊNCIA DO DIA + RECORRÊNCIA SEM DATA FIXA
// ==========================================
(function() {
    window.agendaDataContextoEdicao = '';

    window.toggleCampoDataPrincipalAgenda = function() {
        const dataInput = document.getElementById('agenda-data-principal');
        const recorrencias = Array.from(document.querySelectorAll('.agenda-check-recorrencia:checked')).map(el => el.value);
        if (!dataInput) return;

        let aviso = document.getElementById('agenda-aviso-recorrencia');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'agenda-aviso-recorrencia';
            aviso.style.cssText = 'display:none; margin-top:8px; font-size:12px; color:#475569; background:#eff6ff; border:1px solid #bfdbfe; padding:10px 12px; border-radius:12px;';
            aviso.textContent = 'Repetição semanal ativa: a data fixa fica desativada para não confundir as ocorrências do mês.';
            dataInput.parentElement?.appendChild(aviso);
        }

        if (recorrencias.length) {
            dataInput.style.display = 'none';
            dataInput.value = '';
            aviso.style.display = 'block';
        } else {
            dataInput.style.display = '';
            aviso.style.display = 'none';
        }
    };

    const _oldConfigurarRecorrencia371 = window.configurarRecorrenciaAgenda;
    window.configurarRecorrenciaAgenda = function(docId = null) {
        if (typeof _oldConfigurarRecorrencia371 === 'function') _oldConfigurarRecorrencia371(docId);
        document.querySelectorAll('.agenda-check-recorrencia').forEach(check => {
            if (check.dataset.boundRecorrencia371 === '1') return;
            check.dataset.boundRecorrencia371 = '1';
            check.addEventListener('change', window.toggleCampoDataPrincipalAgenda);
        });
        setTimeout(window.toggleCampoDataPrincipalAgenda, 20);
    };

    const _oldAbrirModalAgenda371 = window.abrirModalAgendaTrabalho;
    window.abrirModalAgendaTrabalho = function(docId = null, dataRef = '') {
        window.agendaDataContextoEdicao = String(dataRef || '').trim();
        if (typeof _oldAbrirModalAgenda371 === 'function') _oldAbrirModalAgenda371(docId);

        if (!docId) return;

        const item = (window.todosAgendaTrabalho || []).find(t => t.id === docId);
        if (!item) return;

        const data = window.normalizarAgendaData(item.data);
        const statusSelect = document.getElementById('agenda-status');
        const tituloModal = document.getElementById('agenda-modal-title');

        if (statusSelect && window.agendaDataContextoEdicao && data.diasRecorrentes && data.diasRecorrentes.length) {
            statusSelect.value = window.getAgendaStatusNaData(data, window.agendaDataContextoEdicao);
        }

        if (tituloModal && window.agendaDataContextoEdicao) {
            tituloModal.textContent = `Editar ocorrência de ${window.formatarDataAgenda(window.agendaDataContextoEdicao)}`;
        }
    };

    window.abrirDiaAgenda = function(isoDate = '') {
        window.garantirModalDiaAgenda();
        const overlay = document.getElementById('agenda-dia-modal');
        const title = document.getElementById('agenda-dia-modal-title');
        const grid = document.getElementById('agenda-dia-modal-grid');
        if (!overlay || !title || !grid) return;

        const tarefasDia = (window.todosAgendaTrabalho || [])
            .filter(item => window.getAgendaDatasExecucao(item.data, isoDate).includes(isoDate))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        title.textContent = `Demandas de ${window.formatarDataAgenda(isoDate) || isoDate}`;
        grid.innerHTML = tarefasDia.length
            ? tarefasDia.map(item => window.gerarCardAgendaTarefa(item, { dataRef: isoDate })).join('')
            : '<p style="color:#64748b;">Nenhuma demanda para esta data.</p>';
        overlay.style.display = 'flex';
    };

    window.renderizarAgendaBoard = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-board-grid');
        if (!grid) return;

        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
        const tarefas = (window.todosAgendaTrabalho || [])
            .filter(item => window.getAgendaDatasExecucao(item.data, dataRef).includes(dataRef))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        grid.innerHTML = window.agendaStatusColunas.map(status => {
            const col = tarefas.filter(item => window.getAgendaStatusNaData(item.data, dataRef) === status);
            return `
                <div class="agenda-board-column" data-status="${window.escapeAttr(status)}">
                    <h4>${window.escapeHTML(status)} <span style="color:#94a3b8;">(${col.length})</span></h4>
                    ${col.map(item => window.gerarCardAgendaTarefa(item, { dataRef })).join('') || '<p style="font-size:12px; color:#94a3b8;">Sem itens</p>'}
                </div>
            `;
        }).join('');
        window.aplicarDnDAgenda();
    };

    const _oldSalvarAgenda371 = window.salvarAgendaTrabalho;
    window.salvarAgendaTrabalho = async function() {
        const contextoData = String(window.agendaDataContextoEdicao || '').trim();
        const diasRecorrentes = Array.from(document.querySelectorAll('.agenda-check-recorrencia:checked')).map(el => String(el.value));
        const docId = document.getElementById('agenda-doc-id')?.value || '';
        const statusSelecionado = String(document.getElementById('agenda-status')?.value || 'A fazer').trim();

        if (docId && contextoData && diasRecorrentes.length) {
            const item = (window.todosAgendaTrabalho || []).find(t => t.id === docId);
            const dataAntiga = item?.data || {};
            const statusPorData = { ...(dataAntiga.statusPorData || {}) };
            statusPorData[contextoData] = statusSelecionado;

            const historico = Array.isArray(dataAntiga.historico) ? dataAntiga.historico.slice() : [];
            historico.push(`Ocorrência de ${contextoData} atualizada para ${statusSelecionado} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);

            try {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', docId), {
                    statusPorData,
                    atualizadoEm: new Date().toISOString(),
                    historico: historico.slice(-80)
                }, { merge: true });

                const tituloModal = document.getElementById('agenda-modal-title');
                if (tituloModal) tituloModal.textContent = 'Editar Demanda / Atividade';
                window.agendaDataContextoEdicao = '';
                if (typeof window.fecharModalAgendaTrabalho === 'function') window.fecharModalAgendaTrabalho();
                setTimeout(() => window.renderizarAgendaTrabalho && window.renderizarAgendaTrabalho(), 120);
                return;
            } catch (error) {
                alert('Erro ao salvar ocorrência do dia: ' + (error?.message || 'falha desconhecida'));
                return;
            }
        }

        window.agendaDataContextoEdicao = '';
        if (typeof _oldSalvarAgenda371 === 'function') {
            return _oldSalvarAgenda371();
        }
    };
})();


// ==========================================
// AGENDA 3.7.2 - STATUS ISOLADO POR DATA + LIMITE DE MESES NA RECORRÊNCIA
// ==========================================
(function() {
    const _oldNormalizarAgenda372 = window.normalizarAgendaData;
    window.normalizarAgendaData = function(data = {}) {
        const base = typeof _oldNormalizarAgenda372 === 'function' ? _oldNormalizarAgenda372(data) : { ...(data || {}) };
        return {
            ...base,
            recorrenciaMesInicio: String(data.recorrenciaMesInicio || base.recorrenciaMesInicio || '').trim(),
            recorrenciaMesFim: String(data.recorrenciaMesFim || base.recorrenciaMesFim || '').trim()
        };
    };

    window.mesEstaDentroDaRecorrenciaAgenda = function(mesContexto = '', data = {}) {
        const normalizada = window.normalizarAgendaData(data);
        const inicio = String(normalizada.recorrenciaMesInicio || '').trim();
        const fim = String(normalizada.recorrenciaMesFim || '').trim();
        if (!inicio && !fim) return true;
        if (inicio && mesContexto < inicio) return false;
        if (fim && mesContexto > fim) return false;
        return true;
    };

    const _oldGerarDatasRecorrentes372 = window.getAgendaDatasExecucao;
    window.getAgendaDatasExecucao = function(data = {}, dataRef = '') {
        const normalizada = window.normalizarAgendaData(data);
        if (Array.isArray(normalizada.diasRecorrentes) && normalizada.diasRecorrentes.length) {
            const mesContexto = window.obterMesContextoAgenda(dataRef);
            if (!window.mesEstaDentroDaRecorrenciaAgenda(mesContexto, normalizada)) return [];
            return window.gerarDatasRecorrentesNoMesAgenda(mesContexto, normalizada.diasRecorrentes);
        }
        return typeof _oldGerarDatasRecorrentes372 === 'function'
            ? _oldGerarDatasRecorrentes372(normalizada, dataRef)
            : [];
    };

    const _oldStatusNaData372 = window.getAgendaStatusNaData;
    window.getAgendaStatusNaData = function(data = {}, dataRef = '') {
        const normalizada = window.normalizarAgendaData(data);
        const chave = String(dataRef || '').trim();
        if (Array.isArray(normalizada.diasRecorrentes) && normalizada.diasRecorrentes.length) {
            if (chave && normalizada.statusPorData && normalizada.statusPorData[chave]) {
                return String(normalizada.statusPorData[chave]).trim();
            }
            return 'A fazer';
        }
        return typeof _oldStatusNaData372 === 'function'
            ? _oldStatusNaData372(normalizada, dataRef)
            : String(normalizada.status || 'A fazer').trim();
    };

    const _oldConfigurarRecorrencia372 = window.configurarRecorrenciaAgenda;
    window.configurarRecorrenciaAgenda = function(docId = null) {
        if (typeof _oldConfigurarRecorrencia372 === 'function') _oldConfigurarRecorrencia372(docId);
        const box = document.getElementById('agenda-recorrencia-box');
        if (!box || document.getElementById('agenda-recorrencia-meses')) return;

        const item = docId ? (window.todosAgendaTrabalho || []).find(t => t.id === docId) : null;
        const data = item?.data || {};
        const mesBase = window.obterAgendaMesSelecionado ? window.obterAgendaMesSelecionado() : new Date().toISOString().slice(0,7);

        const wrap = document.createElement('div');
        wrap.id = 'agenda-recorrencia-meses';
        wrap.style.marginTop = '12px';
        wrap.innerHTML = `
            <div class="agenda-recorrencia-title">Aplicar a recorrência em quais meses?</div>
            <div class="agenda-datas-picker-row">
                <input type="month" id="agenda-recorrencia-inicio" class="form-input" value="${window.escapeAttr(data.recorrenciaMesInicio || mesBase)}">
                <input type="month" id="agenda-recorrencia-fim" class="form-input" value="${window.escapeAttr(data.recorrenciaMesFim || mesBase)}">
            </div>
        `;
        box.appendChild(wrap);
    };

    const _oldAbrirModalAgenda372 = window.abrirModalAgendaTrabalho;
    window.abrirModalAgendaTrabalho = function(docId = null, dataRef = '') {
        if (typeof _oldAbrirModalAgenda372 === 'function') _oldAbrirModalAgenda372(docId, dataRef);
        setTimeout(() => {
            const item = docId ? (window.todosAgendaTrabalho || []).find(t => t.id === docId) : null;
            const data = item?.data || {};
            const inicio = document.getElementById('agenda-recorrencia-inicio');
            const fim = document.getElementById('agenda-recorrencia-fim');
            const baseMes = window.obterAgendaMesSelecionado ? window.obterAgendaMesSelecionado() : new Date().toISOString().slice(0,7);
            if (inicio && !inicio.value) inicio.value = data.recorrenciaMesInicio || baseMes;
            if (fim && !fim.value) fim.value = data.recorrenciaMesFim || baseMes;
        }, 80);
    };

    const _oldSalvarAgenda372 = window.salvarAgendaTrabalho;
    window.salvarAgendaTrabalho = async function() {
        const docId = document.getElementById('agenda-doc-id')?.value || '';
        const diasRecorrentes = Array.from(document.querySelectorAll('.agenda-check-recorrencia:checked')).map(el => String(el.value));
        const inicioMes = String(document.getElementById('agenda-recorrencia-inicio')?.value || '').trim();
        const fimMes = String(document.getElementById('agenda-recorrencia-fim')?.value || '').trim();

        if (inicioMes && fimMes && inicioMes > fimMes) {
            alert('O mês inicial não pode ser maior que o mês final.');
            return;
        }

        const retorno = typeof _oldSalvarAgenda372 === 'function' ? await _oldSalvarAgenda372() : undefined;

        try {
            const idAtual = docId || '';
            if (idAtual) {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', idAtual), {
                    recorrenciaMesInicio: diasRecorrentes.length ? inicioMes : '',
                    recorrenciaMesFim: diasRecorrentes.length ? fimMes : ''
                }, { merge: true });
            }
        } catch (e) {
            console.error('Falha ao salvar período de recorrência:', e);
        }

        return retorno;
    };
})();


// ==========================================
// AGENDA 3.7.3 - RESUMO DO CALENDÁRIO PELO STATUS DO DIA
// ==========================================
(function() {
    window.getResumoStatusDiaAgenda = function(tarefasDia = [], diaIso = '') {
        if (!tarefasDia.length) {
            return { cardClass: 'day-neutral', chipClass: 'is-neutral', texto: 'Sem demandas' };
        }
        const todasConcluidas = tarefasDia.every(item => {
            const statusDia = window.getAgendaStatusNaData(item.data, diaIso);
            return window.agendaStatusConclusivos.includes(statusDia);
        });
        if (todasConcluidas) {
            return { cardClass: 'day-complete', chipClass: 'is-success', texto: 'Tudo concluído' };
        }
        return { cardClass: 'day-pending', chipClass: 'is-danger', texto: 'Há pendências' };
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstilosResumoDiaAgenda();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data);
            return datas.some(dt => dt.startsWith(mes));
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDatasExecucao(item.data, dia.iso).includes(dia.iso));
            const concluidas = tarefasDia.filter(item => {
                const statusDia = window.getAgendaStatusNaData(item.data, dia.iso);
                return window.agendaStatusConclusivos.includes(statusDia);
            }).length;
            const resumo = window.getResumoStatusDiaAgenda(tarefasDia, dia.iso);

            return `
                <div class="agenda-day-column clickable-day ${resumo.cardClass}" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        <span class="agenda-day-status-chip ${resumo.chipClass}">${window.escapeHTML(resumo.texto)}</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? tarefasDia.slice(0,2).map(item => window.escapeHTML(item.data.titulo)).join(' • ') : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };
})();


// ==========================================
// AGENDA 3.7.4 - COR DO DIA SEGUINDO O ANDAMENTO
// ==========================================
(function() {
    window.aplicarEstilosResumoDiaAgenda = function() {
        if (document.getElementById('agenda-style-374')) return;
        const style = document.createElement('style');
        style.id = 'agenda-style-374';
        style.textContent = `
            .agenda-day-column.day-complete {
                background:#f0fdf4;
                border-color:#86efac;
            }
            .agenda-day-column.day-danger {
                background:#fef2f2;
                border-color:#fca5a5;
            }
            .agenda-day-column.day-info {
                background:#eff6ff;
                border-color:#93c5fd;
            }
            .agenda-day-column.day-warning {
                background:#fffbeb;
                border-color:#fcd34d;
            }
            .agenda-day-column.day-purple {
                background:#faf5ff;
                border-color:#d8b4fe;
            }
            .agenda-day-column.day-success-light {
                background:#ecfdf5;
                border-color:#6ee7b7;
            }
            .agenda-day-column.day-neutral {
                background:#f8fafc;
            }
            .agenda-day-status-chip {
                display:inline-flex;
                align-items:center;
                gap:6px;
                width:max-content;
                padding:5px 9px;
                border-radius:999px;
                font-size:11px;
                font-weight:800;
            }
            .agenda-day-status-chip.is-success {
                background:#dcfce7;
                color:#166534;
            }
            .agenda-day-status-chip.is-danger {
                background:#fee2e2;
                color:#b91c1c;
            }
            .agenda-day-status-chip.is-info {
                background:#dbeafe;
                color:#1d4ed8;
            }
            .agenda-day-status-chip.is-warning {
                background:#fef3c7;
                color:#b45309;
            }
            .agenda-day-status-chip.is-purple {
                background:#f3e8ff;
                color:#7e22ce;
            }
            .agenda-day-status-chip.is-success-light {
                background:#d1fae5;
                color:#065f46;
            }
            .agenda-day-status-chip.is-neutral {
                background:#e2e8f0;
                color:#475569;
            }
        `;
        document.head.appendChild(style);
    };

    window.getResumoStatusDiaAgenda = function(tarefasDia = [], diaIso = '') {
        if (!tarefasDia.length) {
            return { cardClass: 'day-neutral', chipClass: 'is-neutral', texto: 'Sem demandas' };
        }

        const statuses = tarefasDia.map(item => window.getAgendaStatusNaData(item.data, diaIso));

        const allDone = statuses.every(status => ['Concluído', 'Concluido'].includes(status));
        if (allDone) {
            return { cardClass: 'day-complete', chipClass: 'is-success', texto: 'Tudo concluído' };
        }

        const allPublishedOrMore = statuses.every(status => ['Publicado', 'Concluído', 'Concluido'].includes(status));
        if (allPublishedOrMore) {
            return { cardClass: 'day-success-light', chipClass: 'is-success-light', texto: 'Tudo publicado' };
        }

        const allSentOrMore = statuses.every(status => ['Enviado', 'Publicado', 'Concluído', 'Concluido'].includes(status));
        if (allSentOrMore) {
            return { cardClass: 'day-purple', chipClass: 'is-purple', texto: 'Tudo enviado' };
        }

        const allReviewOrMore = statuses.every(status => ['Em revisão', 'Enviado', 'Publicado', 'Concluído', 'Concluido'].includes(status));
        if (allReviewOrMore) {
            return { cardClass: 'day-warning', chipClass: 'is-warning', texto: 'Tudo em revisão' };
        }

        const allProgressOrMore = statuses.every(status => ['Em andamento', 'Em revisão', 'Enviado', 'Publicado', 'Concluído', 'Concluido'].includes(status));
        if (allProgressOrMore) {
            return { cardClass: 'day-info', chipClass: 'is-info', texto: 'Tudo em andamento' };
        }

        return { cardClass: 'day-danger', chipClass: 'is-danger', texto: 'Há pendências' };
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstilosResumoDiaAgenda();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data);
            return datas.some(dt => dt.startsWith(mes));
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            .map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');

        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDatasExecucao(item.data, dia.iso).includes(dia.iso));
            const concluidas = tarefasDia.filter(item => {
                const statusDia = window.getAgendaStatusNaData(item.data, dia.iso);
                return window.agendaStatusConclusivos.includes(statusDia);
            }).length;
            const resumo = window.getResumoStatusDiaAgenda(tarefasDia, dia.iso);

            return `
                <div class="agenda-day-column clickable-day ${resumo.cardClass}" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        <span class="agenda-day-status-chip ${resumo.chipClass}">${window.escapeHTML(resumo.texto)}</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? tarefasDia.slice(0,2).map(item => window.escapeHTML(item.data.titulo)).join(' • ') : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCeldas = offsetInicio + dias.length;
        const resto = totalCeldas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };
})();


// ==========================================
// AGENDA 3.8.0 - CACHE PERSISTENTE + LEITURA SOB DEMANDA + STATUS POR DATA CORRETO
// ==========================================
(function() {
    const essentialCollections = new Set(['colaboradores']);
    window._collectionListeners = window._collectionListeners || {};
    window._rhListening = window._rhListening || false;
    window._agendaUnsub = window._agendaUnsub || null;
    window._inventarioUnsub = window._inventarioUnsub || null;

    window.getAgendaStatusCanonico = function(status = '') {
        const s = String(status || '').toLowerCase().trim();
        if (!s) return 'A fazer';
        if (s.includes('concluído') || s.includes('concluido')) return 'Concluído';
        if (s.includes('publicado')) return 'Publicado';
        if (s.includes('enviado')) return 'Enviado';
        if (s.includes('em revisão') || s.includes('revisao')) return 'Em revisão';
        if (s.includes('em andamento')) return 'Em andamento';
        if (s.includes('a fazer')) return 'A fazer';
        return String(status || 'A fazer').trim();
    };

    window.getAgendaStatusRank = function(status = '') {
        const canon = window.getAgendaStatusCanonico(status);
        return {
            'A fazer': 1,
            'Em andamento': 2,
            'Em revisão': 3,
            'Enviado': 4,
            'Publicado': 5,
            'Concluído': 6
        }[canon] || 1;
    };

    window.pararListenerColecao = function(colecaoNome = '') {
        const key = String(colecaoNome || '').trim();
        if (!key) return;
        if (window._collectionListeners[key]) {
            try { window._collectionListeners[key](); } catch (e) {}
            delete window._collectionListeners[key];
        }
    };

    window._processarSnapshotColecao = function(colecaoNome, snapshot) {
        const grid = document.getElementById(`grid-${colecaoNome}`);
        if (snapshot.empty) {
            if (colecaoNome === 'treinamentos') { window.todosTreinamentosData = []; if (window.alunoLogado) window.renderizarTrilhaAluno(); }
            if (colecaoNome === 'boletins') { window.todosBoletinsData = []; window.verificarUrgentesHome(); window.renderizarGraficoHome(); }
            if (colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; window.verificarUrgentesHome(); window.renderizarGraficoPrivadosGeral(); }
            if (configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) {
                window.dadosGlobaisAbas[colecaoNome] = [];
                if (abaAtual === colecaoNome) window.renderizarPastasGenericas(colecaoNome);
            }
            if (colecaoNome === 'ramais') {
                window.todosOsDadosDoSistema['ramais'] = [];
                if (typeof window.renderizarRamaisAgrupados === 'function') window.renderizarRamaisAgrupados();
            }
            if (grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }

        const itens = [];
        snapshot.forEach(docSnap => itens.push({ id: docSnap.id, data: docSnap.data() }));
        window.todosOsDadosDoSistema[colecaoNome] = itens;

        if (colecaoNome === 'ramais') {
            if (abaAtual === 'contatos' || document.getElementById('sub-ramais')?.style.display !== 'none') {
                window.renderizarRamaisAgrupados();
            }
            return;
        }

        if (colecaoNome === 'colaboradores') {
            listaColaboradoresGlobal = itens
                .map(item => ({ nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }))
                .filter(c => c.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome));
            if (abaAtual === 'colaboradores') window.renderizarListaGenerica(colecaoNome);
            if (abaAtual === 'agenda-trabalho' && typeof window.renderizarCardsColaboradoresAgenda === 'function') window.renderizarCardsColaboradoresAgenda();
            if (isAdmin && abaAtual === 'rh' && typeof window.renderizarDashboardRH === 'function') window.renderizarDashboardRH();
        }
        if (colecaoNome === 'boletins') {
            window.todosBoletinsData = itens;
            if (abaAtual === 'boletins') {
                if (window.pastaBoletimAtual) window.renderizarListaBoletins();
                else window.renderizarPastasBoletins();
            }
            window.verificarUrgentesHome();
            window.renderizarGraficoHome();
            return;
        }
        if (colecaoNome === 'boletins-privados') {
            window.todosPrivadosData = itens;
            if (abaAtual === 'boletins-privados') {
                if (window.pastaPrivadoAtual) window.renderizarListaPrivados();
                else window.renderizarPastasPrivados();
            }
            window.verificarUrgentesHome();
            window.renderizarGraficoPrivadosGeral();
            return;
        }
        if (colecaoNome === 'treinamentos') {
            window.todosTreinamentosData = itens;
            if (window.alunoLogado) window.renderizarTrilhaAluno();
            if (isAdmin && abaAtual === 'rh' && typeof window.renderizarDashboardRH === 'function') window.renderizarDashboardRH();
        }
        if (configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador && colecaoNome !== 'colaboradores') {
            window.dadosGlobaisAbas[colecaoNome] = itens;
            if (abaAtual === colecaoNome) {
                if (window[`pasta_${colecaoNome}_Atual`]) window.renderizarListaGenerica(colecaoNome);
                else window.renderizarPastasGenericas(colecaoNome);
            }
            return;
        }

        if (!grid || !configuracaoAbas[colecaoNome]) return;
        grid.style.display = 'grid';
        grid.innerHTML = '';
        itens.sort((a, b) => String(a.data[configuracaoAbas[colecaoNome].campos[0]] || '').localeCompare(String(b.data[configuracaoAbas[colecaoNome].campos[0]] || '')))
            .forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    };

    window.renderizarCards = function(colecaoNome, opts = {}) {
        const grid = document.getElementById(`grid-${colecaoNome}`);
        if (!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && colecaoNome !== 'ramais' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

        const tabWantsCollection = !!opts.force
            || essentialCollections.has(colecaoNome)
            || abaAtual === colecaoNome
            || (colecaoNome === 'ramais' && abaAtual === 'contatos')
            || (colecaoNome === 'emails' && abaAtual === 'contatos')
            || (colecaoNome === 'contatos-gerais' && abaAtual === 'contatos')
            || (colecaoNome === 'contatos-convenios' && abaAtual === 'contatos')
            || (colecaoNome === 'senhas' && abaAtual === 'contatos')
            || (colecaoNome === 'colaboradores' && ['agenda-trabalho', 'colaboradores', 'rh'].includes(abaAtual));

        if (!tabWantsCollection) return;
        if (window._collectionListeners[colecaoNome]) return;

        window._collectionListeners[colecaoNome] = onSnapshot(collection(db, colecaoNome), (snapshot) => {
            window._processarSnapshotColecao(colecaoNome, snapshot);
        }, (error) => {
            console.error(`Erro ao escutar ${colecaoNome}:`, error);
            window.pararListenerColecao(colecaoNome);
        });
    };

    window.sincronizarListenersPorAba = function(tabDestino = '') {
        const keep = new Set(['colaboradores']);
        const tab = String(tabDestino || abaAtual || '').trim();

        if (configuracaoAbas[tab]) keep.add(tab);
        if (tab === 'contatos') ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(c => keep.add(c));
        if (tab === 'boletins') keep.add('boletins');
        if (tab === 'boletins-privados') keep.add('boletins-privados');
        if (tab === 'agenda-trabalho') keep.add('colaboradores');
        if (tab === 'rh') keep.add('colaboradores');

        Object.keys(window._collectionListeners || {}).forEach(nome => {
            if (!keep.has(nome)) window.pararListenerColecao(nome);
        });

        keep.forEach(nome => {
            if (nome !== 'agenda_trabalho' && nome !== 'inventarios_ativos') window.renderizarCards(nome, { force: true });
        });

        if (tab === 'agenda-trabalho') {
            if (typeof window.escutarAgendaTrabalho === 'function') window.escutarAgendaTrabalho();
        } else if (window._agendaUnsub) {
            try { window._agendaUnsub(); } catch (e) {}
            window._agendaUnsub = null;
            window.agendaListenerAtivo = false;
        }

        if (tab === 'ativos') {
            if (typeof window.escutarInventariosAtivos === 'function') window.escutarInventariosAtivos();
        } else if (window._inventarioUnsub) {
            try { window._inventarioUnsub(); } catch (e) {}
            window._inventarioUnsub = null;
            window._inventariosAtivosEscutando = false;
        }

        if (tab === 'rh' && typeof window.escutarRH === 'function') window.escutarRH(true);
    };

    const _oldEscutarRH380 = window.escutarRH;
    if (typeof _oldEscutarRH380 === 'function') {
        window.escutarRH = function(force = false) {
            if (!isAdmin) return;
            if (!force && abaAtual !== 'rh') return;
            if (window._rhListening) return;
            window._rhListening = true;
            return _oldEscutarRH380();
        };
    }

    window.escutarInventariosAtivos = function() {
        const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
        if (!window.podeVerAbasRestritas || !window.podeVerAbasRestritas(emailAtual)) {
            window.inventariosAtivosData = [];
            window._inventariosAtivosEscutando = false;
            if (window._inventarioUnsub) { try { window._inventarioUnsub(); } catch (e) {} window._inventarioUnsub = null; }
            return;
        }
        if (window._inventariosAtivosEscutando) return;
        window._inventariosAtivosEscutando = true;
        window._inventarioUnsub = onSnapshot(collection(db, 'inventarios_ativos'), (snapshot) => {
            const itens = [];
            snapshot.forEach(docSnap => itens.push({ id: docSnap.id, data: docSnap.data() }));
            window.inventariosAtivosData = itens;
            if (abaAtual === 'ativos') {
                window.renderizarOverviewInventarioAtivos();
                window.renderizarPastasAtivosFase1();
            }
            window.renderizarListaInventariosEmAberto();
        }, (error) => {
            console.error('Erro ao escutar inventários de ativos:', error);
            window._inventariosAtivosEscutando = false;
            if (window._inventarioUnsub) { try { window._inventarioUnsub(); } catch (e) {} window._inventarioUnsub = null; }
        });
    };

    window.escutarAgendaTrabalho = function() {
        const emailAtual = String(auth?.currentUser?.email || emailLogado || '').toLowerCase().trim();
        if (!window.podeVerAbasRestritas || !window.podeVerAbasRestritas(emailAtual)) {
            window.todosAgendaTrabalho = [];
            window.agendaListenerAtivo = false;
            if (window._agendaUnsub) { try { window._agendaUnsub(); } catch (e) {} window._agendaUnsub = null; }
            return;
        }
        if (window.agendaListenerAtivo) return;
        window.agendaListenerAtivo = true;
        window._agendaUnsub = onSnapshot(collection(db, 'agenda_trabalho'), (snapshot) => {
            const itens = [];
            snapshot.forEach(docSnap => itens.push({ id: docSnap.id, data: window.normalizarAgendaData(docSnap.data()) }));
            window.todosAgendaTrabalho = itens;
            if (abaAtual === 'agenda-trabalho') window.renderizarAgendaTrabalho();
        }, (error) => {
            console.error('Erro ao escutar agenda de trabalho:', error);
            window.agendaListenerAtivo = false;
            if (window._agendaUnsub) { try { window._agendaUnsub(); } catch (e) {} window._agendaUnsub = null; }
        });
    };

    const _oldOnAuthSync380 = onAuthStateChanged;
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            Object.keys(window._collectionListeners || {}).forEach(nome => window.pararListenerColecao(nome));
            if (window._agendaUnsub) { try { window._agendaUnsub(); } catch (e) {} window._agendaUnsub = null; }
            if (window._inventarioUnsub) { try { window._inventarioUnsub(); } catch (e) {} window._inventarioUnsub = null; }
            window._rhListening = false;
            return;
        }
        setTimeout(() => window.sincronizarListenersPorAba(abaAtual || 'home'), 120);
    });

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.sincronizarListenersPorAba(abaAtual || 'home'), 500);
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            if (btn.dataset.cacheSync380 === '1') return;
            btn.dataset.cacheSync380 = '1';
            btn.addEventListener('click', () => {
                const tabDestino = btn.getAttribute('data-tab') || '';
                setTimeout(() => window.sincronizarListenersPorAba(tabDestino), 60);
            });
        });
    });

    window.getResumoStatusDiaAgenda = function(tarefasDia = [], diaIso = '') {
        if (!tarefasDia.length) {
            return { cardClass: 'day-neutral', chipClass: 'is-neutral', texto: 'Sem demandas' };
        }
        const ranks = tarefasDia.map(item => window.getAgendaStatusRank(window.getAgendaStatusNaData(item.data, diaIso)));
        const minRank = Math.min(...ranks);
        if (minRank >= 6) return { cardClass: 'day-complete', chipClass: 'is-success', texto: 'Tudo concluído' };
        if (minRank >= 5) return { cardClass: 'day-success-light', chipClass: 'is-success-light', texto: 'Tudo publicado' };
        if (minRank >= 4) return { cardClass: 'day-purple', chipClass: 'is-purple', texto: 'Tudo enviado' };
        if (minRank >= 3) return { cardClass: 'day-warning', chipClass: 'is-warning', texto: 'Tudo em revisão' };
        if (minRank >= 2) return { cardClass: 'day-info', chipClass: 'is-info', texto: 'Tudo em andamento' };
        return { cardClass: 'day-danger', chipClass: 'is-danger', texto: 'Há pendências' };
    };

    window.gerarCardAgendaTarefa = function(item = {}, opts = {}) {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstiloResponsavelCompactoAgenda && window.aplicarEstiloResponsavelCompactoAgenda();

        const dataRef = String(opts.dataRef || '').trim();
        const data = window.normalizarAgendaData(item.data || {});
        const podeEditar = opts.podeEditar !== false;
        const visualUrl = data.link || data.iframeUrl || '';
        const extraordinaria = !!data.destaqueEspecial;
        const statusAtual = window.getAgendaStatusCanonico(window.getAgendaStatusNaData(data, dataRef));
        const statusVisual = window.getAgendaStatusVisual(statusAtual);
        const collapseId = `agenda-collapse-${item.id}-${dataRef || 'base'}`.replace(/[^a-zA-Z0-9_-]/g, '');
        const dataExibir = dataRef || window.getAgendaDataExibicao(data);
        const dataFormatada = window.formatarDataAgenda(dataExibir);
        const prazo = window.getAgendaPrazoInfo({ ...data, status: statusAtual, dataPrincipal: dataExibir });

        return `
            <div class="agenda-task-card ${extraordinaria ? 'agenda-task-card--extraordinaria' : ''} ${statusVisual.tone}" draggable="true" data-task-id="${item.id}">
                <div class="agenda-task-header" onclick="window.toggleAgendaCard('${collapseId}')">
                    <div class="agenda-task-header-main">
                        <h5>${extraordinaria ? '<span class="agenda-raio"><i class="ri-flashlight-fill"></i></span>' : ''}${window.escapeHTML(data.titulo || 'Demanda')}</h5>
                        <div class="agenda-task-header-date">${dataFormatada || 'Sem data definida'}${data.horario ? ` • ${window.escapeHTML(data.horario)}` : ''}</div>
                        ${data.responsavel ? `<div class="agenda-task-responsavel-mini">Resp.: ${window.escapeHTML(data.responsavel)}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        ${podeEditar ? `
                            <div class="agenda-task-actions" onclick="event.stopPropagation()">
                                <button type="button" class="btn-action btn-edit" style="width:28px; height:28px; font-size:14px;" onclick="window.abrirModalAgendaTrabalho('${item.id}','${dataRef}')" title="Editar demanda">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" style="width:28px; height:28px; font-size:14px;" onclick="window.excluirAgendaTrabalho('${item.id}')" title="Excluir demanda">
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                            </div>` : ''}
                        <i class="ri-arrow-down-s-line agenda-task-chevron"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="agenda-task-body-collapsible">
                    <p>${window.escapeHTML(data.descricao || 'Sem descrição.')}</p>
                    ${data.temaEspecial ? `<p><strong>Tema:</strong> ${window.escapeHTML(data.temaEspecial)}</p>` : ''}
                    <p><strong>Responsável:</strong> ${window.escapeHTML(data.responsavel || 'Não definido')}</p>
                    <div class="agenda-task-meta">
                        ${extraordinaria ? `<span class="agenda-mini-badge agenda-mini-badge-extraordinaria"><i class="ri-flashlight-fill"></i> Extraordinária</span>` : ''}
                        <span class="agenda-mini-badge ${window.agendaCorUrgenciaClass(data.urgencia)}">${window.escapeHTML(data.urgencia)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(statusAtual)}</span>
                        <span class="agenda-mini-badge">${window.escapeHTML(data.visibilidade)}</span>
                        ${dataFormatada ? `<span class="agenda-mini-badge agenda-mini-badge-data"><i class="ri-calendar-line"></i> ${window.escapeHTML(dataFormatada)}</span>` : ''}
                        ${data.horario ? `<span class="agenda-mini-badge agenda-mini-badge-horario"><i class="ri-time-line"></i> ${window.escapeHTML(data.horario)}</span>` : ''}
                    </div>
                    ${prazo ? `<div style="margin-top:10px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
                    ${visualUrl ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-hover color-9" style="height:30px; font-size:11px; padding:0 12px;" type="button" onclick="event.stopPropagation(); window.abrirPreviewAgenda('${window.escapeAttr(visualUrl)}','${window.escapeAttr(data.titulo)}')"><i class="ri-layout-window-line"></i> Visualizar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    window.renderizarCardsColaboradoresAgenda = function() {
        const grid = document.getElementById('agenda-colaboradores-grid');
        if (!grid) return;
        const colaboradores = (window.todosOsDadosDoSistema['colaboradores'] || []).map(item => item.data || {}).filter(window.colaboradorEhMarketing);
        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);

        if (!colaboradores.length) {
            grid.innerHTML = '<div style="color:#64748b; font-size:13px;">Nenhum colaborador do marketing cadastrado.</div>';
            return;
        }

        grid.innerHTML = colaboradores.map(colab => {
            const nome = String(colab['Nome Completo do Colaborador'] || '').trim();
            const setor = String(colab['Setor da Clínica'] || 'Marketing').trim();
            const foto = String(colab['Link da Foto'] || colab['Foto'] || '').trim();
            const aniversario = String(colab['Data de Aniversário'] || colab['Aniversário'] || 'Não informado').trim();
            const info = String(colab['Informações Gerais'] || colab['Observações'] || 'Sem observações').trim();

            const tarefasDaData = (window.todosAgendaTrabalho || [])
                .filter(item => item.data.responsavel === nome)
                .filter(item => window.getAgendaDatasExecucao(item.data, dataRef).includes(dataRef));

            const concluidas = tarefasDaData.filter(item => {
                const statusDia = window.getAgendaStatusNaData(item.data, dataRef);
                return window.agendaStatusConclusivos.includes(statusDia) || window.getAgendaStatusRank(statusDia) >= 5;
            }).length;

            const pendentes = tarefasDaData.filter(item => {
                const rank = window.getAgendaStatusRank(window.getAgendaStatusNaData(item.data, dataRef));
                return rank < 5;
            });

            const resumoHoje = pendentes.length
                ? pendentes.slice(0, 2).map(item => `• ${window.escapeHTML(item.data.titulo)}`).join('<br>')
                : (tarefasDaData.length ? 'Tudo certo para a data selecionada.' : 'Sem demanda para a data selecionada.');

            return `
                <div class="agenda-colaborador-card">
                    <div class="agenda-colaborador-avatar">${foto ? `<img src="${window.escapeAttr(foto)}" alt="${window.escapeAttr(nome)}" onerror="this.parentElement.innerHTML='<i class=\\"ri-user-3-line\\"></i>'">` : '<i class="ri-user-3-line"></i>'}</div>
                    <div class="agenda-colaborador-meta">
                        <h4>${window.escapeHTML(nome || 'Colaborador')}</h4>
                        <p><strong>Setor:</strong> ${window.escapeHTML(setor)}</p>
                        <p><strong>Aniversário:</strong> ${window.escapeHTML(aniversario)}</p>
                        <p>${window.escapeHTML(info)}</p>
                        <div class="agenda-colaborador-resumo">
                            <span class="agenda-badge-hoje"><i class="ri-calendar-check-line"></i> ${tarefasDaData.length} do dia</span>
                            <span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>
                        </div>
                        <div style="margin-top:10px; font-size:12px; color:#64748b; line-height:1.5;">${resumoHoje}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.renderizarAgendaDirecao = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        const grid = document.getElementById('agenda-direcao-grid');
        if (!grid) return;

        const dataRef = window.getAgendaDataFiltroExato() || new Date().toISOString().slice(0,10);
        const doDia = (window.todosAgendaTrabalho || [])
            .filter(item => ['direcao', 'ambos'].includes(item.data.visibilidade))
            .filter(item => window.getAgendaDatasExecucao(item.data, dataRef).includes(dataRef))
            .sort((a, b) => String(a.data.horario || '').localeCompare(String(b.data.horario || '')));

        const renderLista = (lista) => lista.length ? `<div class="agenda-direcao-list">${lista.map(item => {
            const statusDia = window.getAgendaStatusCanonico(window.getAgendaStatusNaData(item.data, dataRef));
            const visual = window.getAgendaStatusVisual(statusDia);
            const prazo = window.getAgendaPrazoInfo({ ...item.data, status: statusDia, dataPrincipal: dataRef });
            return `<div class="agenda-direcao-item ${visual.tone}">
                <strong>${window.escapeHTML(item.data.titulo)}</strong>
                <span style="font-size:12px; color:#475569;">${window.escapeHTML(item.data.responsavel || 'Sem responsável')} • ${window.escapeHTML(statusDia)}${item.data.horario ? ` • ${window.escapeHTML(item.data.horario)}` : ''}</span>
                ${item.data.temaEspecial ? `<small>Tema: ${window.escapeHTML(item.data.temaEspecial)}</small>` : ''}
                ${prazo ? `<div style="margin-top:8px;"><span class="agenda-prazo-chip ${prazo.tone}"><i class="ri-alarm-warning-line"></i> ${window.escapeHTML(prazo.texto)}</span></div>` : ''}
            </div>`;
        }).join('')}</div>` : '<p style="font-size:12px; color:#94a3b8;">Nenhuma demanda programada para esta data.</p>';

        grid.innerHTML = `
            <div class="agenda-direcao-card" style="grid-column:1 / -1;">
                <h4>Demandas do dia — ${window.formatarDataAgenda(dataRef)}</h4>
                ${renderLista(doDia)}
            </div>
        `;
    };

    window.renderizarAgendaCalendario = function() {
        window.aplicarEstilosAgendaAvancados();
        window.aplicarEstilosAgendaConferencia();
        window.aplicarEstilosResumoDiaAgenda();
        const grid = document.getElementById('agenda-calendario-grid');
        if (!grid) return;
        const mes = window.obterAgendaMesSelecionado();
        const dias = window.gerarDiasDoMesAgenda(mes);
        const [ano, mesNum] = mes.split('-').map(Number);
        const primeiroDia = new Date(ano, mesNum - 1, 1);
        const offsetInicio = (primeiroDia.getDay() + 6) % 7;
        const tarefas = (window.todosAgendaTrabalho || []).filter(item => {
            const datas = window.getAgendaDatasExecucao(item.data, `${mes}-01`);
            return datas.some(dt => dt.startsWith(mes));
        });

        const weekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => `<div class="agenda-weekday-head">${label}</div>`).join('');
        const blanksInicio = Array.from({ length: offsetInicio }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');

        const cellsDias = dias.map(dia => {
            const tarefasDia = tarefas.filter(item => window.getAgendaDatasExecucao(item.data, dia.iso).includes(dia.iso));
            const concluidas = tarefasDia.filter(item => window.getAgendaStatusRank(window.getAgendaStatusNaData(item.data, dia.iso)) >= 5).length;
            const resumo = window.getResumoStatusDiaAgenda(tarefasDia, dia.iso);
            return `
                <div class="agenda-day-column clickable-day ${resumo.cardClass}" data-date="${dia.iso}" onclick="window.abrirDiaAgenda('${dia.iso}')">
                    <div class="agenda-day-header">
                        <strong>${dia.label}</strong>
                        <span>${window.escapeHTML(dia.semana)}</span>
                    </div>
                    <div class="agenda-day-summary">
                        <span class="agenda-day-count"><i class="ri-stack-line"></i> ${tarefasDia.length} demanda(s)</span>
                        <span class="agenda-day-status-chip ${resumo.chipClass}">${window.escapeHTML(resumo.texto)}</span>
                        ${concluidas ? `<span class="agenda-badge-concluido"><i class="ri-checkbox-circle-line"></i> ${concluidas} concluída(s)</span>` : ''}
                        <div class="agenda-day-preview">${tarefasDia.length ? tarefasDia.slice(0,2).map(item => window.escapeHTML(item.data.titulo)).join(' • ') : 'Sem demandas'}</div>
                    </div>
                </div>
            `;
        }).join('');

        const totalCelulas = offsetInicio + dias.length;
        const resto = totalCelulas % 7;
        const blanksFim = resto === 0 ? '' : Array.from({ length: 7 - resto }).map(() => `<div class="agenda-day-column agenda-day-column--blank"></div>`).join('');
        grid.classList.add('agenda-calendario-grid--mes');
        grid.innerHTML = weekHeaders + blanksInicio + cellsDias + blanksFim;
    };
})();


// ==========================================
// AGENDA 3.8.1 - RECORRÊNCIA LIMITADA AO MÊS ESCOLHIDO + SALVAMENTO CORRETO
// ==========================================
(function() {
    window.salvarAgendaTrabalho = async function() {
        window.garantirCampoHorarioAgenda && window.garantirCampoHorarioAgenda();
        const docId = document.getElementById('agenda-doc-id')?.value || '';
        const contextoData = String(window.agendaDataContextoEdicao || '').trim();
        const titulo = String(document.getElementById('agenda-titulo')?.value || '').trim();
        const dataPrincipalInput = String(document.getElementById('agenda-data-principal')?.value || '').trim();
        const diasRecorrentes = Array.from(document.querySelectorAll('.agenda-check-recorrencia:checked')).map(el => String(el.value));
        const inicioMes = String(document.getElementById('agenda-recorrencia-inicio')?.value || '').trim();
        const fimMes = String(document.getElementById('agenda-recorrencia-fim')?.value || '').trim();
        const statusSelecionado = window.getAgendaStatusCanonico(String(document.getElementById('agenda-status')?.value || 'A fazer').trim());

        if (!titulo) {
            alert('Informe o título da demanda.');
            return;
        }

        if (diasRecorrentes.length && (!inicioMes || !fimMes)) {
            alert('Informe o mês inicial e o mês final da recorrência.');
            return;
        }
        if (inicioMes && fimMes && inicioMes > fimMes) {
            alert('O mês inicial não pode ser maior que o mês final.');
            return;
        }
        if (!diasRecorrentes.length && !dataPrincipalInput) {
            alert('Informe a data da atividade.');
            return;
        }

        const itemAntigo = docId ? ((window.todosAgendaTrabalho || []).find(t => t.id === docId) || null) : null;
        const dataAntiga = itemAntigo?.data || {};
        const historicoAntigo = Array.isArray(dataAntiga.historico) ? dataAntiga.historico.slice() : [];
        const agoraIso = new Date().toISOString();

        if (docId && contextoData && diasRecorrentes.length) {
            const statusPorData = { ...(dataAntiga.statusPorData || {}) };
            statusPorData[contextoData] = statusSelecionado;
            historicoAntigo.push(`Ocorrência de ${contextoData} atualizada para ${statusSelecionado} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
            try {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', docId), {
                    statusPorData,
                    atualizadoEm: agoraIso,
                    historico: historicoAntigo.slice(-80)
                }, { merge: true });
                window.agendaDataContextoEdicao = '';
                if (typeof window.fecharModalAgendaTrabalho === 'function') window.fecharModalAgendaTrabalho();
                setTimeout(() => window.renderizarAgendaTrabalho && window.renderizarAgendaTrabalho(), 120);
                return;
            } catch (error) {
                alert('Erro ao salvar ocorrência do dia: ' + (error?.message || 'falha desconhecida'));
                return;
            }
        }

        const dados = {
            titulo,
            descricao: String(document.getElementById('agenda-descricao')?.value || '').trim(),
            responsavel: String(document.getElementById('agenda-responsavel')?.value || '').trim(),
            urgencia: String(document.getElementById('agenda-urgencia')?.value || 'Média').trim(),
            status: statusSelecionado,
            visibilidade: String(document.getElementById('agenda-visibilidade')?.value || 'ambos').trim(),
            dataPrincipal: diasRecorrentes.length ? '' : dataPrincipalInput,
            datasExtras: String(document.getElementById('agenda-datas-extras')?.value || '').split(',').map(v => v.trim()).filter(Boolean),
            horario: String(document.getElementById('agenda-horario')?.value || dataAntiga.horario || '').trim(),
            temaEspecial: String(document.getElementById('agenda-tema-especial')?.value || '').trim(),
            destaqueEspecial: !!document.getElementById('agenda-destaque-especial')?.checked,
            link: String(document.getElementById('agenda-link')?.value || '').trim(),
            iframeUrl: String(document.getElementById('agenda-iframe')?.value || '').trim(),
            diasRecorrentes,
            recorrenciaMesInicio: diasRecorrentes.length ? inicioMes : '',
            recorrenciaMesFim: diasRecorrentes.length ? fimMes : '',
            statusPorData: dataAntiga.statusPorData || {},
            criadoEm: dataAntiga.criadoEm || agoraIso,
            atualizadoEm: agoraIso
        };

        historicoAntigo.push(`${docId ? 'Atualizada' : 'Criada'} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`);
        dados.historico = historicoAntigo.slice(-80);

        try {
            if (docId) {
                await window.setDoc(window.doc(window.db, 'agenda_trabalho', docId), dados, { merge: true });
            } else {
                await window.addDoc(window.collection(window.db, 'agenda_trabalho'), dados);
            }
            window.agendaDataContextoEdicao = '';
            if (typeof window.fecharModalAgendaTrabalho === 'function') window.fecharModalAgendaTrabalho();
            setTimeout(() => window.renderizarAgendaTrabalho && window.renderizarAgendaTrabalho(), 120);
        } catch (error) {
            alert('Erro ao salvar demanda: ' + (error?.message || 'falha desconhecida'));
        }
    };
})();


// ==========================================
// AGENDA 3.8.2 - TRAVA DE RECORRÊNCIA LEGADA NO MÊS BASE
// ==========================================
(function() {
    window.getAgendaMesBaseLegado = function(data = {}) {
        const normalizada = window.normalizarAgendaData ? window.normalizarAgendaData(data) : (data || {});
        const candidates = [
            String(normalizada.recorrenciaMesInicio || '').trim(),
            String(normalizada.recorrenciaMesFim || '').trim(),
            String(normalizada.dataPrincipal || '').trim().slice(0, 7),
            String(normalizada.criadoEm || '').trim().slice(0, 7),
            String(normalizada.atualizadoEm || '').trim().slice(0, 7)
        ].filter(v => /^\d{4}-\d{2}$/.test(v));
        return candidates[0] || '';
    };

    window.mesEstaDentroDaRecorrenciaAgenda = function(mesContexto = '', data = {}) {
        const normalizada = window.normalizarAgendaData ? window.normalizarAgendaData(data) : (data || {});
        const inicio = String(normalizada.recorrenciaMesInicio || '').trim();
        const fim = String(normalizada.recorrenciaMesFim || '').trim();
        const base = window.getAgendaMesBaseLegado(normalizada);

        if (!inicio && !fim && Array.isArray(normalizada.diasRecorrentes) && normalizada.diasRecorrentes.length) {
            return !!base && mesContexto === base;
        }
        if (inicio && mesContexto < inicio) return false;
        if (fim && mesContexto > fim) return false;
        return true;
    };
})();


// ==========================================
// CERTIFICADOS ENSINO 3.9.0 - PARTICIPAÇÃO / CONCLUSÃO
// ==========================================
(function() {
    const CERT_CONFIG = {
        empresa: 'Clínica Médica São Vicente',
        slogan: 'Saúde Cuidado & Bem-estar',
        cidadeUf: 'Araucária PR',
        diretorNome: 'Dr. Emerson Aparecido Albertasse Alves',
        diretorCargo: 'Diretor Técnico',
        logo: './logo.png'
    };
    window.CERT_CONFIG = CERT_CONFIG;

    const camposTreino = configuracaoAbas?.treinamentos?.campos || [];
    [
        'Tipo de Certificado',
        'Carga Horária (Certificado)',
        'Texto Personalizado do Certificado',
        'Criado Por Email'
    ].forEach(campo => {
        if (!camposTreino.includes(campo)) camposTreino.push(campo);
    });

    window.getTipoCertificadoTreinamento = function(data = {}) {
        return String(data['Tipo de Certificado'] || 'Nenhum').trim();
    };

    window.getCargaHorariaCertificado = function(data = {}) {
        return String(data['Carga Horária (Certificado)'] || '').trim();
    };

    window.getTextoBaseCertificado = function(data = {}, tipoCert = 'participacao', nomeAluno = '') {
        const nome = nomeAluno || 'COLABORADOR';
        const tema = String(data['Título da Atividade'] || 'Atividade').trim();
        const carga = window.getCargaHorariaCertificado(data);
        const textoCustom = String(data['Texto Personalizado do Certificado'] || '').trim();
        if (textoCustom) return textoCustom;
        if (tipoCert === 'conclusao') {
            return `Certificamos que ${nome} concluiu com êxito ${tema}${carga ? `, com carga horária de ${carga}` : ''}.`;
        }
        return `Certificamos que ${nome} participou de ${tema}${carga ? `, com carga horária de ${carga}` : ''}.`;
    };

    window.obterElegibilidadeCertificadoTreinamento = function(item = {}, nomeAluno = '') {
        const data = item.data || {};
        const tipoCert = window.getTipoCertificadoTreinamento(data).toLowerCase();
        const respostas = data.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => { try { const obj = window.safeParseJSON(r, null); if (obj && obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });
        const progresso = window.obterProgressoAlunoTreinamento ? window.obterProgressoAlunoTreinamento(data, nomeAluno) : null;
        const jaLeu = (data.leituras || []).some(txt => String(txt).startsWith(nomeAluno));
        const tipoTreino = String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo');
        const precisaResponder = tipoTreino.includes('Tarefa') || tipoTreino.includes('Prova');
        const temCorrecao = !!(minhaResposta && ((minhaResposta.nota !== '' && minhaResposta.nota !== undefined && minhaResposta.nota !== null) || (minhaResposta.nota_total_calculada !== '' && minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== null)));
        const submeteu = !!minhaResposta;
        const concluiuFluxo = jaLeu || String(progresso?.status || '') === 'concluida';
        const participacao = (tipoCert === 'participação' || tipoCert === 'participacao' || tipoCert === 'ambos')
            && (precisaResponder ? (submeteu || concluiuFluxo) : concluiuFluxo);
        const conclusao = (tipoCert === 'conclusão' || tipoCert === 'conclusao' || tipoCert === 'ambos')
            && (precisaResponder ? (temCorrecao || concluiuFluxo) : concluiuFluxo);
        return { participacao, conclusao };
    };

    const oldAbrirModalCertFields = window.abrirModal;
    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        if (typeof oldAbrirModalCertFields === 'function') oldAbrirModalCertFields(colecao, docId, dadosAntigos);
        if (colecao !== 'treinamentos') return;
        setTimeout(() => {
            const tipoInput = document.getElementById('input-Tipo de Certificado');
            if (tipoInput && tipoInput.tagName !== 'SELECT') {
                const val = String(tipoInput.value || 'Nenhum');
                const sel = document.createElement('select');
                sel.id = tipoInput.id; sel.className = tipoInput.className;
                sel.innerHTML = `
                    <option value="Nenhum">Tipo de Certificado: Nenhum</option>
                    <option value="Participação">Participação</option>
                    <option value="Conclusão">Conclusão</option>
                    <option value="Ambos">Ambos</option>
                `;
                sel.value = ['Nenhum','Participação','Conclusão','Ambos'].includes(val) ? val : 'Nenhum';
                tipoInput.replaceWith(sel);
            }
            const cargaInput = document.getElementById('input-Carga Horária (Certificado)');
            if (cargaInput) cargaInput.placeholder = 'Carga Horária (Ex: 4 horas)';
            const textoInput = document.getElementById('input-Texto Personalizado do Certificado');
            if (textoInput && textoInput.tagName !== 'TEXTAREA') {
                const txt = document.createElement('textarea');
                txt.id = textoInput.id; txt.className = textoInput.className;
                txt.style.height = '90px'; txt.style.resize = 'vertical';
                txt.placeholder = 'Texto personalizado do certificado (opcional)';
                txt.value = textoInput.value || '';
                textoInput.replaceWith(txt);
            }
            const criadoPorInput = document.getElementById('input-Criado Por Email');
            if (criadoPorInput) {
                criadoPorInput.value = String(dadosAntigos?.['Criado Por Email'] || emailLogado || '').trim();
                criadoPorInput.type = 'hidden';
                criadoPorInput.style.display = 'none';
            }
        }, 40);
    };

    window.garantirEstilosCertificadoTreinamento = function() {
        if (document.getElementById('certificado-style-runtime')) return;
        const style = document.createElement('style');
        style.id = 'certificado-style-runtime';
        style.textContent = `
            .certificado-modal-grid{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
            .certificado-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:16px}
            .certificado-preview-shell{background:#fff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,.08);overflow:hidden}
            .certificado-doc{min-height:720px;padding:34px 42px;position:relative;background:#fff;display:flex;flex-direction:column;gap:18px}
            .certificado-doc.tipo-participacao{border:10px solid #8B252C}
            .certificado-doc.tipo-conclusao{border:10px solid #0f766e}
            .certificado-top{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}
            .certificado-logo{max-width:210px;max-height:90px;object-fit:contain}
            .certificado-selo{padding:10px 16px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border:2px solid currentColor}
            .certificado-doc.tipo-participacao .certificado-selo{color:#8B252C;background:#fff5f5}
            .certificado-doc.tipo-conclusao .certificado-selo{color:#0f766e;background:#ecfdf5}
            .certificado-org{text-align:center}
            .certificado-org h2{font-size:36px;line-height:1.1;margin:8px 0 0;color:#0f172a}
            .certificado-org p{font-size:14px;color:#64748b;margin:0}
            .certificado-title{text-align:center;font-size:20px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#334155}
            .certificado-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;text-align:center}
            .certificado-body p{font-size:17px;line-height:1.7;color:#334155;margin:0}
            .certificado-aluno{font-size:42px;font-weight:800;color:#111827;line-height:1.15}
            .certificado-curso{font-size:21px;font-weight:700;color:#8B252C}
            .certificado-doc.tipo-conclusao .certificado-curso{color:#0f766e}
            .certificado-meta{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
            .certificado-meta span{background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;color:#334155}
            .certificado-footer{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:end;margin-top:10px}
            .certificado-city{font-size:13px;color:#64748b}
            .certificado-sign{text-align:center}
            .certificado-sign-line{height:1px;background:#1f2937;margin:0 auto 10px;max-width:260px}
            .certificado-sign-name{font-size:16px;font-weight:700;color:#0f172a}
            .certificado-sign-role{font-size:12px;color:#64748b}
            .certificado-sign-mode{font-size:11px;color:#8B252C;font-weight:700;margin-top:6px}
            .certificado-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
            .certificado-empty-note{font-size:12px;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:12px;padding:12px}
            .certificado-alert{background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:14px 16px;border-radius:16px;margin-bottom:16px;font-size:13px;font-weight:600}
            @media (max-width: 980px){.certificado-modal-grid{grid-template-columns:1fr}.certificado-doc{padding:26px 20px}.certificado-aluno{font-size:30px}.certificado-org h2{font-size:28px}.certificado-footer{grid-template-columns:1fr}}
            @media print {.certificado-no-print{display:none !important} body *{visibility:hidden !important} #certificado-print-root, #certificado-print-root *{visibility:visible !important} #certificado-print-root{position:absolute;left:0;top:0;width:100%}}
        `;
        document.head.appendChild(style);
    };

    window.garantirModalCertificadoTreinamento = function() {
        window.garantirEstilosCertificadoTreinamento();
        if (document.getElementById('modal-certificado-treinamento')) return;
        const overlay = document.createElement('div');
        overlay.id = 'modal-certificado-treinamento';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        overlay.style.zIndex = '10020';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:1220px; width:96vw;">
                <div class="modal-header certificado-no-print">
                    <h3>Certificado</h3>
                    <button type="button" class="btn-icon" onclick="window.fecharModalCertificadoTreinamento()"><i class="ri-close-line"></i></button>
                </div>
                <div class="modal-body">
                    <div class="certificado-modal-grid">
                        <div class="certificado-panel certificado-no-print">
                            <input type="hidden" id="cert-docid">
                            <label class="form-label">Modelo</label>
                            <select id="cert-tipo" class="form-input"></select>
                            <label class="form-label">Assinatura</label>
                            <select id="cert-assinatura" class="form-input">
                                <option value="digital">Digital</option>
                                <option value="manual">Manual</option>
                            </select>
                            <label class="form-label">Texto personalizado (opcional)</label>
                            <textarea id="cert-texto-extra" class="form-input" style="height:110px;resize:vertical;" placeholder="Escreva uma frase complementar para este certificado."></textarea>
                            <div id="cert-manual-note" class="certificado-empty-note" style="display:none;">No modo manual, o certificado não imprime na hora. O sistema envia uma solicitação para assinatura física ao responsável do material.</div>
                            <div class="certificado-actions">
                                <button type="button" class="btn-hover color-9" onclick="window.atualizarPreviewCertificadoTreinamento()"><i class="ri-eye-line"></i> Atualizar prévia</button>
                                <button type="button" id="btn-print-certificado" class="btn-hover color-5" onclick="window.imprimirCertificadoTreinamento()"><i class="ri-printer-line"></i> Imprimir / PDF</button>
                                <button type="button" id="btn-manual-certificado" class="btn-hover color-11" onclick="window.solicitarAssinaturaManualCertificado()" style="display:none;"><i class="ri-notification-2-line"></i> Solicitar assinatura manual</button>
                            </div>
                        </div>
                        <div id="certificado-print-root" class="certificado-preview-shell"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('cert-assinatura').addEventListener('change', () => {
            const manual = document.getElementById('cert-assinatura').value === 'manual';
            document.getElementById('cert-manual-note').style.display = manual ? 'block' : 'none';
            document.getElementById('btn-print-certificado').style.display = manual ? 'none' : 'inline-flex';
            document.getElementById('btn-manual-certificado').style.display = manual ? 'inline-flex' : 'none';
            window.atualizarPreviewCertificadoTreinamento();
        });
        document.getElementById('cert-tipo').addEventListener('change', window.atualizarPreviewCertificadoTreinamento);
        document.getElementById('cert-texto-extra').addEventListener('input', window.atualizarPreviewCertificadoTreinamento);
    };

    window.fecharModalCertificadoTreinamento = function() {
        const modal = document.getElementById('modal-certificado-treinamento');
        if (modal) modal.style.display = 'none';
    };

    window.abrirModalCertificadoTreinamento = function(docId = '', tipoPreferido = '') {
        if (!window.alunoLogado) return;
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const eleg = window.obterElegibilidadeCertificadoTreinamento(item, nomeAluno);
        const opcoes = [];
        if (eleg.participacao) opcoes.push({ value: 'participacao', label: 'Certificado de Participação' });
        if (eleg.conclusao) opcoes.push({ value: 'conclusao', label: 'Certificado de Conclusão' });
        if (!opcoes.length) {
            alert('Este certificado ainda não está disponível para a sua situação atual.');
            return;
        }
        window.garantirModalCertificadoTreinamento();
        const select = document.getElementById('cert-tipo');
        const texto = document.getElementById('cert-texto-extra');
        document.getElementById('cert-docid').value = docId;
        select.innerHTML = opcoes.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        const prefer = opcoes.find(o => o.value === tipoPreferido)?.value || opcoes[0].value;
        select.value = prefer;
        texto.value = String(item.data['Texto Personalizado do Certificado'] || '').trim();
        document.getElementById('cert-assinatura').value = 'digital';
        document.getElementById('cert-manual-note').style.display = 'none';
        document.getElementById('btn-print-certificado').style.display = 'inline-flex';
        document.getElementById('btn-manual-certificado').style.display = 'none';
        window.atualizarPreviewCertificadoTreinamento();
        document.getElementById('modal-certificado-treinamento').style.display = 'flex';
    };

    window.gerarHTMLCertificadoTreinamento = function(item = {}, opts = {}) {
        const data = item.data || {};
        const nomeAluno = opts.nomeAluno || 'COLABORADOR';
        const tipo = opts.tipo || 'participacao';
        const assinaturaModo = opts.assinatura || 'digital';
        const tema = String(data['Título da Atividade'] || 'Atividade').trim();
        const carga = window.getCargaHorariaCertificado(data);
        const textoExtra = String(opts.textoExtra || '').trim();
        const textoBase = textoExtra || window.getTextoBaseCertificado(data, tipo, nomeAluno);
        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        const selo = tipo === 'conclusao' ? 'Certificado de Conclusão' : 'Certificado de Participação';
        const classeTipo = tipo === 'conclusao' ? 'tipo-conclusao' : 'tipo-participacao';
        const assinaturaLabel = assinaturaModo === 'manual' ? 'Aguardando assinatura manual' : 'Assinado digitalmente';
        return `
            <div class="certificado-doc ${classeTipo}">
                <div class="certificado-top">
                    <img src="${window.escapeAttr(CERT_CONFIG.logo)}" alt="Logo" class="certificado-logo" onerror="this.style.display='none'">
                    <div class="certificado-selo">${window.escapeHTML(selo)}</div>
                </div>
                <div class="certificado-org">
                    <p>${window.escapeHTML(CERT_CONFIG.empresa)}</p>
                    <h2>${window.escapeHTML(selo)}</h2>
                    <p>${window.escapeHTML(CERT_CONFIG.slogan)}</p>
                </div>
                <div class="certificado-body">
                    <div class="certificado-title">Certificamos que</div>
                    <div class="certificado-aluno">${window.escapeHTML(nomeAluno)}</div>
                    <p>${window.escapeHTML(textoBase)}</p>
                    <div class="certificado-curso">${window.escapeHTML(tema)}</div>
                    <div class="certificado-meta">
                        ${carga ? `<span><i class="ri-time-line"></i> ${window.escapeHTML(carga)}</span>` : ''}
                        <span><i class="ri-calendar-check-line"></i> ${window.escapeHTML(dataEmissao)}</span>
                        <span><i class="ri-map-pin-line"></i> ${window.escapeHTML(CERT_CONFIG.cidadeUf)}</span>
                    </div>
                </div>
                <div class="certificado-footer">
                    <div class="certificado-city">${window.escapeHTML(CERT_CONFIG.cidadeUf)}, ${window.escapeHTML(dataEmissao)}</div>
                    <div class="certificado-sign">
                        <div class="certificado-sign-line"></div>
                        <div class="certificado-sign-name">${window.escapeHTML(CERT_CONFIG.diretorNome)}</div>
                        <div class="certificado-sign-role">${window.escapeHTML(CERT_CONFIG.diretorCargo)}</div>
                        <div class="certificado-sign-mode">${window.escapeHTML(assinaturaLabel)}</div>
                    </div>
                </div>
            </div>`;
    };

    window.atualizarPreviewCertificadoTreinamento = function() {
        const docId = document.getElementById('cert-docid')?.value || '';
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item || !window.alunoLogado) return;
        const html = window.gerarHTMLCertificadoTreinamento(item, {
            nomeAluno: window.alunoLogado['Nome Completo do Colaborador'],
            tipo: document.getElementById('cert-tipo')?.value || 'participacao',
            assinatura: document.getElementById('cert-assinatura')?.value || 'digital',
            textoExtra: document.getElementById('cert-texto-extra')?.value || ''
        });
        const root = document.getElementById('certificado-print-root');
        if (root) root.innerHTML = html;
    };

    window.imprimirCertificadoTreinamento = function() {
        const root = document.getElementById('certificado-print-root');
        if (!root) return;
        const w = window.open('', '_blank', 'width=1100,height=860');
        if (!w) { alert('Permita pop-ups para imprimir o certificado.'); return; }
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificado</title><style>${document.getElementById('certificado-style-runtime')?.innerHTML || ''} body{margin:0;padding:20px;background:#f1f5f9;} .certificado-doc{min-height:auto}</style></head><body>${root.innerHTML}<script>window.onload=function(){window.print();};<\/script></body></html>`);
        w.document.close();
    };

    window.solicitarAssinaturaManualCertificado = async function() {
        const docId = document.getElementById('cert-docid')?.value || '';
        const tipo = document.getElementById('cert-tipo')?.value || 'participacao';
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item || !window.alunoLogado) return;
        const solicitacao = JSON.stringify({
            aluno: window.alunoLogado['Nome Completo do Colaborador'],
            tipo,
            assinatura: 'manual',
            em: new Date().toISOString(),
            status: 'pendente'
        });
        try {
            await window.updateDoc(window.doc(window.db, 'treinamentos', docId), {
                solicitacoes_certificado: window.arrayUnion(solicitacao)
            });
            alert('Solicitação enviada para impressão e assinatura manual.');
            window.fecharModalCertificadoTreinamento();
        } catch (e) {
            alert('Erro ao solicitar assinatura manual: ' + e.message);
        }
    };

    window.getSolicitacoesCertificadoPendentes = function() {
        if (!isAdmin) return [];
        const email = String(emailLogado || '').trim().toLowerCase();
        const itens = [];
        (window.todosTreinamentosData || []).forEach(item => {
            const criadoPor = String(item.data['Criado Por Email'] || '').trim().toLowerCase();
            if (criadoPor && criadoPor !== email) return;
            (item.data.solicitacoes_certificado || []).forEach(raw => {
                const obj = window.safeParseJSON(raw, null);
                if (obj && String(obj.status || 'pendente') === 'pendente') {
                    itens.push({ docId: item.id, titulo: item.data['Título da Atividade'] || 'Treinamento', ...obj });
                }
            });
        });
        return itens;
    };

    window.renderizarAlertasCertificadosPendentes = function() {
        if (!isAdmin) return;
        const itens = window.getSolicitacoesCertificadoPendentes();
        const html = itens.length
            ? `<div class="certificado-alert"><i class="ri-notification-3-line"></i> Você tem <strong>${itens.length}</strong> solicitação(ões) de certificado manual pendente(s).</div>`
            : '';
        ['tab-home', 'tab-treinamentos'].forEach(id => {
            const host = document.getElementById(id);
            if (!host) return;
            let box = host.querySelector('.certificado-alert-host');
            if (!box) {
                box = document.createElement('div');
                box.className = 'certificado-alert-host';
                host.insertBefore(box, host.firstChild.nextSibling || host.firstChild);
            }
            box.innerHTML = html;
        });
        if (itens.length && !window._alertaCertificadoJaMostrado) {
            window._alertaCertificadoJaMostrado = true;
            setTimeout(() => alert(`Há ${itens.length} solicitação(ões) de certificado manual pendente(s).`), 500);
        }
    };

    const oldProcessarSnapshotCert = window._processarSnapshotColecao;
    if (typeof oldProcessarSnapshotCert === 'function') {
        window._processarSnapshotColecao = function(colecaoNome, snapshot) {
            oldProcessarSnapshotCert(colecaoNome, snapshot);
            if (colecaoNome === 'treinamentos') setTimeout(window.renderizarAlertasCertificadosPendentes, 50);
        };
    }

    const oldRenderizarTrilhaAlunoCert = window.renderizarTrilhaAluno;
    window.renderizarTrilhaAluno = function() {
        if (typeof oldRenderizarTrilhaAlunoCert === 'function') oldRenderizarTrilhaAlunoCert();
        if (!window.alunoLogado) return;
        const grid = document.getElementById('grid-trilha-aluno');
        if (!grid) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';
        const treinamentosAluno = window.todosTreinamentosData.filter(item => {
            const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
            const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
            if (colabAlvo && !colabAlvo.includes('Nenhum')) return colabAlvo === nomeAluno;
            return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
        });
        Array.from(grid.children).forEach((card, idx) => {
            const item = treinamentosAluno[idx];
            if (!item || card.querySelector('.certificado-btn-wrap')) return;
            const eleg = window.obterElegibilidadeCertificadoTreinamento(item, nomeAluno);
            const botoes = [];
            if (eleg.participacao) botoes.push(`<button onclick="window.abrirModalCertificadoTreinamento('${item.id}','participacao')" class="btn-hover color-8" style="width:100%;height:34px;border-radius:8px;font-size:12px;margin-top:8px;"><i class="ri-award-line"></i> Certificado de participação</button>`);
            if (eleg.conclusao) botoes.push(`<button onclick="window.abrirModalCertificadoTreinamento('${item.id}','conclusao')" class="btn-hover color-5" style="width:100%;height:34px;border-radius:8px;font-size:12px;margin-top:8px;"><i class="ri-medal-line"></i> Certificado de conclusão</button>`);
            if (botoes.length) {
                const wrap = document.createElement('div');
                wrap.className = 'certificado-btn-wrap';
                wrap.innerHTML = botoes.join('');
                card.appendChild(wrap);
            }
        });
    };

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (isAdmin && typeof window.renderizarCards === 'function') {
                window.renderizarCards('treinamentos', { force: true });
            }
            window.garantirModalCertificadoTreinamento();
        }, 400);
    });

    onAuthStateChanged(auth, (user) => {
        if (user && String(user.email || '').includes('@clinica') && typeof window.renderizarCards === 'function') {
            setTimeout(() => window.renderizarCards('treinamentos', { force: true }), 300);
        }
    });
})();


// ==========================================
// CERTIFICADOS ENSINO 3.9.1 - NOTA MÍNIMA + CENTRAL DE IMPRESSÃO + BLOQUEIO APÓS CONCLUSÃO
// ==========================================
(function() {
    const camposTreino = configuracaoAbas?.treinamentos?.campos || [];
    if (!camposTreino.includes('Nota Mínima para Certificado')) camposTreino.push('Nota Mínima para Certificado');

    window.obterNotaMinimaCertificado = function(data = {}) {
        const raw = String(data['Nota Mínima para Certificado'] || '').replace(',', '.').trim();
        const val = parseFloat(raw);
        return Number.isFinite(val) ? val : null;
    };

    window.obterNotaAlunoTreinamento = function(item = {}, nomeAluno = '') {
        const respostas = item?.data?.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => { try { const obj = window.safeParseJSON(r, null); if (obj && obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });
        if (!minhaResposta) return null;
        const notaBruta = minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== ''
            ? minhaResposta.nota_total_calculada
            : minhaResposta.nota;
        const nota = parseFloat(String(notaBruta).replace(',', '.'));
        return Number.isFinite(nota) ? nota : null;
    };

    const oldAbrirModalCert391 = window.abrirModal;
    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        if (typeof oldAbrirModalCert391 === 'function') oldAbrirModalCert391(colecao, docId, dadosAntigos);
        if (colecao !== 'treinamentos') return;
        setTimeout(() => {
            const notaMinInput = document.getElementById('input-Nota Mínima para Certificado');
            if (notaMinInput) {
                notaMinInput.type = 'number';
                notaMinInput.step = '0.5';
                notaMinInput.min = '0';
                notaMinInput.placeholder = 'Nota mínima para liberar certificado (opcional)';
            }
        }, 40);
    };

    window.obterElegibilidadeCertificadoTreinamento = function(item = {}, nomeAluno = '') {
        const data = item.data || {};
        const tipoCert = window.getTipoCertificadoTreinamento(data).toLowerCase();
        const respostas = data.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => { try { const obj = window.safeParseJSON(r, null); if (obj && obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });
        const progresso = window.obterProgressoAlunoTreinamento ? window.obterProgressoAlunoTreinamento(data, nomeAluno) : null;
        const jaLeu = (data.leituras || []).some(txt => String(txt).startsWith(nomeAluno));
        const tipoTreino = String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo');
        const precisaResponder = tipoTreino.includes('Tarefa') || tipoTreino.includes('Prova');
        const temCorrecao = !!(minhaResposta && ((minhaResposta.nota !== '' && minhaResposta.nota !== undefined && minhaResposta.nota !== null) || (minhaResposta.nota_total_calculada !== '' && minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== null)));
        const submeteu = !!minhaResposta;
        const concluiuFluxo = jaLeu || String(progresso?.status || '') === 'concluida';
        const notaMinima = window.obterNotaMinimaCertificado(data);
        const notaAluno = window.obterNotaAlunoTreinamento(item, nomeAluno);
        const atendeNota = notaMinima === null || !precisaResponder || (notaAluno !== null && notaAluno >= notaMinima);

        const participacao = (tipoCert === 'participação' || tipoCert === 'participacao' || tipoCert === 'ambos')
            && (precisaResponder ? (submeteu || concluiuFluxo) : concluiuFluxo)
            && atendeNota;
        const conclusao = (tipoCert === 'conclusão' || tipoCert === 'conclusao' || tipoCert === 'ambos')
            && (precisaResponder ? (temCorrecao || concluiuFluxo) : concluiuFluxo)
            && atendeNota;
        return { participacao, conclusao, notaMinima, notaAluno, atendeNota };
    };

    const oldAbrirModalResposta391 = window.abrirModalResposta;
    window.abrirModalResposta = async function(docId) {
        if (!window.alunoLogado) return;
        const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!item) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const progresso = window.obterProgressoAlunoTreinamento ? window.obterProgressoAlunoTreinamento(item.data, nomeAluno) : null;
        const respostas = item.data?.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => { try { const obj = window.safeParseJSON(r, null); if (obj && obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });
        const jaLeu = (item.data?.leituras || []).some(txt => String(txt).startsWith(nomeAluno));
        const notaFechada = !!(minhaResposta && ((minhaResposta.nota !== '' && minhaResposta.nota !== undefined && minhaResposta.nota !== null) || (minhaResposta.nota_total_calculada !== '' && minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== null)));
        const concluido = jaLeu || String(progresso?.status || '') === 'concluida' || notaFechada;
        if (concluido) {
            alert('Esta atividade já foi finalizada. O aluno não pode editar nem refazer após a conclusão.');
            return;
        }
        return oldAbrirModalResposta391(docId);
    };

    const oldConcluirTreinamento391 = window.concluirTreinamento;
    window.concluirTreinamento = async function(docId) {
        if (!window.alunoLogado) return;
        const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!item) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const jaLeu = (item.data?.leituras || []).some(txt => String(txt).startsWith(nomeAluno));
        if (jaLeu) {
            alert('Este material já foi concluído.');
            return;
        }
        return oldConcluirTreinamento391(docId);
    };

    window.garantirModalSolicitacoesCertificado = function() {
        if (document.getElementById('modal-solicitacoes-certificado')) return;
        const overlay = document.createElement('div');
        overlay.id = 'modal-solicitacoes-certificado';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        overlay.style.zIndex = '10021';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:1040px; width:95vw;">
                <div class="modal-header">
                    <h3>Solicitações de Certificado Manual</h3>
                    <button type="button" class="btn-icon" onclick="document.getElementById('modal-solicitacoes-certificado').style.display='none'"><i class="ri-close-line"></i></button>
                </div>
                <div class="modal-body"><div id="lista-solicitacoes-certificado"></div></div>
            </div>`;
        document.body.appendChild(overlay);
    };

    window.abrirCentralSolicitacoesCertificado = function() {
        window.garantirModalSolicitacoesCertificado();
        const lista = document.getElementById('lista-solicitacoes-certificado');
        const itens = window.getSolicitacoesCertificadoPendentes();
        lista.innerHTML = itens.length ? itens.map((item, idx) => `
            <div class="card" style="margin-bottom:14px; border-left:4px solid #f97316;">
                <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; align-items:center;">
                    <div>
                        <strong>${window.escapeHTML(item.titulo)}</strong>
                        <div style="font-size:13px; color:#64748b; margin-top:6px;">Aluno: ${window.escapeHTML(item.aluno || '---')} • Tipo: ${window.escapeHTML(item.tipo || 'participacao')} • Solicitação em ${window.formatarDataAgenda(String(item.em || '').slice(0,10)) || ''}</div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button type="button" class="btn-hover color-8" style="height:36px; font-size:12px;" onclick="window.imprimirSolicitacaoCertificado('${item.docId}','${window.escapeAttr(item.aluno || '')}','${window.escapeAttr(item.tipo || 'participacao')}')"><i class="ri-printer-line"></i> Imprimir</button>
                        <button type="button" class="btn-hover color-5" style="height:36px; font-size:12px;" onclick="window.marcarSolicitacaoCertificadoComoAtendida('${item.docId}','${idx}')"><i class="ri-check-line"></i> Marcar atendida</button>
                    </div>
                </div>
            </div>`).join('') : '<p style="color:#64748b;">Sem solicitações pendentes.</p>';
        document.getElementById('modal-solicitacoes-certificado').style.display = 'flex';
    };

    window.imprimirSolicitacaoCertificado = function(docId = '', aluno = '', tipo = 'participacao') {
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item) return;
        const htmlCert = window.gerarHTMLCertificadoTreinamento(item, {
            nomeAluno: aluno,
            tipo,
            assinatura: 'manual',
            textoExtra: String(item.data['Texto Personalizado do Certificado'] || '').trim()
        });
        const w = window.open('', '_blank', 'width=1100,height=860');
        if (!w) { alert('Permita pop-ups para imprimir o certificado.'); return; }
        const cssCert = document.getElementById('certificado-style-runtime')?.innerHTML || '';
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificado</title><style>${cssCert} body{margin:0;padding:20px;background:#f1f5f9;} .certificado-doc{min-height:auto;} @media print { body{background:#fff;padding:0;} .certificado-doc{page-break-after:avoid;} }</style></head><body><div id="certificado-print-root">${htmlCert}</div><script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script></body></html>`);
        w.document.close();
    };

    window.marcarSolicitacaoCertificadoComoAtendida = async function(docId = '', idx = -1) {
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item) return;
        const atual = Array.isArray(item.data.solicitacoes_certificado) ? item.data.solicitacoes_certificado.slice() : [];
        const pendentes = atual.map(raw => {
            const obj = window.safeParseJSON(raw, null);
            return obj;
        });
        let alvo = pendentes.filter(Boolean)[idx];
        if (!alvo) return;
        const novos = atual.map(raw => {
            const obj = window.safeParseJSON(raw, null);
            if (!obj) return raw;
            if (obj.aluno === alvo.aluno && obj.em === alvo.em && obj.tipo === alvo.tipo && String(obj.status || 'pendente') === 'pendente') {
                obj.status = 'atendida';
                obj.atendidaEm = new Date().toISOString();
                return JSON.stringify(obj);
            }
            return raw;
        });
        try {
            await window.setDoc(window.doc(window.db, 'treinamentos', docId), { solicitacoes_certificado: novos }, { merge: true });
            window.abrirCentralSolicitacoesCertificado();
        } catch (e) {
            alert('Erro ao marcar solicitação como atendida: ' + e.message);
        }
    };

    const oldRenderAlertCert391 = window.renderizarAlertasCertificadosPendentes;
    window.renderizarAlertasCertificadosPendentes = function() {
        if (typeof oldRenderAlertCert391 === 'function') oldRenderAlertCert391();
        if (!isAdmin) return;
        const itens = window.getSolicitacoesCertificadoPendentes();
        const html = itens.length
            ? `<div class="certificado-alert"><i class="ri-notification-3-line"></i> Você tem <strong>${itens.length}</strong> solicitação(ões) de certificado manual pendente(s). <button type="button" class="btn-hover color-8" style="height:32px;font-size:11px;padding:0 12px;margin-left:10px;" onclick="window.abrirCentralSolicitacoesCertificado()"><i class="ri-printer-line"></i> Abrir central</button></div>`
            : '';
        ['tab-home', 'tab-treinamentos'].forEach(id => {
            const host = document.getElementById(id);
            if (!host) return;
            let box = host.querySelector('.certificado-alert-host');
            if (!box) {
                box = document.createElement('div');
                box.className = 'certificado-alert-host';
                host.insertBefore(box, host.firstChild.nextSibling || host.firstChild);
            }
            box.innerHTML = html;
        });
    };

    window.imprimirCertificadoTreinamento = function() {
        const docId = document.getElementById('cert-docid')?.value || '';
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item || !window.alunoLogado) return;
        const htmlCert = window.gerarHTMLCertificadoTreinamento(item, {
            nomeAluno: window.alunoLogado['Nome Completo do Colaborador'],
            tipo: document.getElementById('cert-tipo')?.value || 'participacao',
            assinatura: 'digital',
            textoExtra: document.getElementById('cert-texto-extra')?.value || ''
        });
        const w = window.open('', '_blank', 'width=1100,height=860');
        if (!w) { alert('Permita pop-ups para imprimir o certificado.'); return; }
        const cssCert = document.getElementById('certificado-style-runtime')?.innerHTML || '';
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificado</title><style>${cssCert} body{margin:0;padding:20px;background:#f1f5f9;} .certificado-doc{min-height:auto;} @media print { body{background:#fff;padding:0;} .certificado-doc{page-break-after:avoid;} }</style></head><body><div id="certificado-print-root">${htmlCert}</div><script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script></body></html>`);
        w.document.close();
    };

    window.renderizarPainelCursosInternos = function() {
        const tab = document.getElementById('tab-treinamentos');
        if (!tab || !isAdmin) return;
        let host = document.getElementById('painel-cursos-internos');
        if (!host) {
            host = document.createElement('div');
            host.id = 'painel-cursos-internos';
            host.className = 'card';
            host.style.marginBottom = '18px';
            const alvo = tab.querySelector('#treinamentos-view-folders') || tab.firstElementChild;
            tab.insertBefore(host, alvo);
        }
        const itens = (window.todosTreinamentosData || []).slice().sort((a,b) => String(a.data['Pasta / Módulo'] || '').localeCompare(String(b.data['Pasta / Módulo'] || '')) || String(a.data['Título da Atividade'] || '').localeCompare(String(b.data['Título da Atividade'] || '')));
        host.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
                <div>
                    <h3 style="margin:0;color:#0f172a;"><i class="ri-building-4-line"></i> Cursos Internos da Clínica</h3>
                    <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Visão geral dos módulos, certificados e quem já concluiu.</p>
                </div>
                ${window.getSolicitacoesCertificadoPendentes().length ? `<button type="button" class="btn-hover color-8" style="height:38px;font-size:12px;" onclick="window.abrirCentralSolicitacoesCertificado()"><i class="ri-printer-line"></i> Solicitações manuais</button>` : ''}
            </div>
            <div class="cards-grid">${itens.map(item => {
                const data = item.data || {};
                const concluidos = [];
                (data.leituras || []).forEach(txt => concluidos.push(String(txt).split(' (')[0]));
                (data.respostas_alunos || []).forEach(raw => { const obj = window.safeParseJSON(raw, null); if (obj?.nome && !concluidos.includes(obj.nome)) concluidos.push(obj.nome); });
                return `<div class="card" style="border-left:4px solid #8B252C;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px;">${window.escapeHTML(data['Pasta / Módulo'] || 'Módulo')}</div>
                    <div style="font-size:18px;font-weight:700;color:#0f172a;line-height:1.25;margin-bottom:10px;">${window.escapeHTML(data['Título da Atividade'] || 'Curso')}</div>
                    <div style="font-size:13px;color:#475569;line-height:1.7;">
                        <div><strong>Tipo:</strong> ${window.escapeHTML(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '---')}</div>
                        <div><strong>Certificado:</strong> ${window.escapeHTML(data['Tipo de Certificado'] || 'Nenhum')}</div>
                        <div><strong>Carga Horária:</strong> ${window.escapeHTML(data['Carga Horária (Certificado)'] || '---')}</div>
                        <div><strong>Nota mínima:</strong> ${window.escapeHTML(data['Nota Mínima para Certificado'] || '---')}</div>
                        <div><strong>Concluintes:</strong> ${concluidos.length}</div>
                    </div>
                    <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">${concluidos.length ? concluidos.slice(0,6).map(nome => `• ${window.escapeHTML(nome)}`).join('<br>') : 'Ainda sem concluintes registrados.'}</div>
                </div>`;
            }).join('')}</div>`;
    };

    const oldProcessarSnapshotCert391 = window._processarSnapshotColecao;
    if (typeof oldProcessarSnapshotCert391 === 'function') {
        window._processarSnapshotColecao = function(colecaoNome, snapshot) {
            oldProcessarSnapshotCert391(colecaoNome, snapshot);
            if (colecaoNome === 'treinamentos') {
                setTimeout(() => {
                    window.renderizarAlertasCertificadosPendentes();
                    window.renderizarPainelCursosInternos();
                }, 60);
            }
        };
    }
})();


// ==========================================
// CERTIFICADOS ENSINO 3.9.2 - DEDUP SOLICITAÇÃO MANUAL + FECHAR MODAL AO ATENDER
// ==========================================
(function() {
    window.getChaveSolicitacaoCertificado = function(docId = '', aluno = '', tipo = '') {
        return [String(docId || '').trim(), String(aluno || '').trim().toLowerCase(), String(tipo || '').trim().toLowerCase()].join('|');
    };

    window.getSolicitacoesCertificadoPendentes = function() {
        if (!isAdmin) return [];
        const email = String(emailLogado || '').trim().toLowerCase();
        const mapa = new Map();
        (window.todosTreinamentosData || []).forEach(item => {
            const criadoPor = String(item.data['Criado Por Email'] || '').trim().toLowerCase();
            if (criadoPor && criadoPor !== email) return;
            (item.data.solicitacoes_certificado || []).forEach(raw => {
                const obj = window.safeParseJSON(raw, null);
                if (!obj || String(obj.status || 'pendente') !== 'pendente') return;
                const chave = window.getChaveSolicitacaoCertificado(item.id, obj.aluno, obj.tipo);
                const atual = mapa.get(chave);
                const emAtual = atual ? new Date(atual.em || 0).getTime() : 0;
                const emNovo = new Date(obj.em || 0).getTime();
                if (!atual || emNovo >= emAtual) {
                    mapa.set(chave, { docId: item.id, titulo: item.data['Título da Atividade'] || 'Treinamento', _requestKey: chave, ...obj });
                }
            });
        });
        return Array.from(mapa.values()).sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
    };

    window.solicitarAssinaturaManualCertificado = async function() {
        const docId = document.getElementById('cert-docid')?.value || '';
        const tipo = document.getElementById('cert-tipo')?.value || 'participacao';
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item || !window.alunoLogado) return;
        const aluno = window.alunoLogado['Nome Completo do Colaborador'];
        const chave = window.getChaveSolicitacaoCertificado(docId, aluno, tipo);
        const jaExiste = (item.data.solicitacoes_certificado || []).some(raw => {
            const obj = window.safeParseJSON(raw, null);
            return obj && String(obj.status || 'pendente') === 'pendente' && window.getChaveSolicitacaoCertificado(docId, obj.aluno, obj.tipo) === chave;
        });
        if (jaExiste) {
            alert('Já existe uma solicitação manual pendente para este certificado.');
            return;
        }
        const solicitacao = JSON.stringify({
            requestId: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            aluno,
            tipo,
            assinatura: 'manual',
            em: new Date().toISOString(),
            status: 'pendente'
        });
        try {
            await window.updateDoc(window.doc(window.db, 'treinamentos', docId), {
                solicitacoes_certificado: window.arrayUnion(solicitacao)
            });
            alert('Solicitação enviada para impressão e assinatura manual.');
            window.fecharModalCertificadoTreinamento();
        } catch (e) {
            alert('Erro ao solicitar assinatura manual: ' + e.message);
        }
    };

    window.marcarSolicitacaoCertificadoComoAtendida = async function(docId = '', idx = -1) {
        const pendentes = window.getSolicitacoesCertificadoPendentes();
        const alvo = pendentes[idx];
        if (!alvo) return;
        const item = (window.todosTreinamentosData || []).find(t => t.id === docId);
        if (!item) return;
        const atual = Array.isArray(item.data.solicitacoes_certificado) ? item.data.solicitacoes_certificado.slice() : [];
        const chaveAlvo = alvo._requestKey || window.getChaveSolicitacaoCertificado(docId, alvo.aluno, alvo.tipo);
        const novos = atual.map(raw => {
            const obj = window.safeParseJSON(raw, null);
            if (!obj) return raw;
            const chaveAtual = window.getChaveSolicitacaoCertificado(docId, obj.aluno, obj.tipo);
            if (String(obj.status || 'pendente') === 'pendente' && chaveAtual === chaveAlvo) {
                obj.status = 'atendida';
                obj.atendidaEm = new Date().toISOString();
                return JSON.stringify(obj);
            }
            return raw;
        });
        try {
            await window.setDoc(window.doc(window.db, 'treinamentos', docId), { solicitacoes_certificado: novos }, { merge: true });
            setTimeout(() => {
                const restantes = window.getSolicitacoesCertificadoPendentes();
                if (!restantes.length) {
                    const modal = document.getElementById('modal-solicitacoes-certificado');
                    if (modal) modal.style.display = 'none';
                } else {
                    window.abrirCentralSolicitacoesCertificado();
                }
                window.renderizarAlertasCertificadosPendentes();
            }, 120);
        } catch (e) {
            alert('Erro ao marcar solicitação como atendida: ' + e.message);
        }
    };
})();


// ==========================================
// CURSO SEQUENCIAL 4.0.0 - TRILHA OBRIGATÓRIA COM ETAPAS, PERGUNTA E CERTIFICADO
// ==========================================
(function() {
    const COURSE_TYPE = 'Curso Sequencial';
    const COURSE_FIELD = 'Configuração do Curso';
    const COURSE_DESC_FIELD = 'Descrição do Curso';
    const COURSE_NOTE_FIELD = 'Nota Mínima para Certificado';
    const COURSE_CERT_TEXT_FIELD = 'Texto Personalizado do Certificado';
    const COURSE_PROGRESS_KEY = 'curso_sequencial';

    window.isCursoSequencialTreinamento = function(data = {}) {
        return String(data?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').trim() === COURSE_TYPE || !!String(data?.[COURSE_FIELD] || '').trim();
    };

    window.normalizarEtapaCurso = function(step = {}, idx = 0) {
        const tipoRaw = String(step.tipoConteudo || step.tipo || 'video').trim().toLowerCase();
        const tipoConteudo = ['video', 'documento', 'texto'].includes(tipoRaw) ? tipoRaw : 'video';
        const ops = Array.isArray(step.opcoes) ? step.opcoes : (Array.isArray(step.ops) ? step.ops : ['', '', '', '']);
        const opcoes = [0, 1, 2, 3].map(i => String(ops[i] || '').trim());
        return {
            id: step.id || `etapa_${idx + 1}`,
            titulo: String(step.titulo || step.nome || `Etapa ${idx + 1}`).trim(),
            tipoConteudo,
            link: String(step.link || step.url || '').trim(),
            texto: String(step.texto || step.conteudo || '').trim(),
            pergunta: String(step.pergunta || '').trim(),
            opcoes,
            correta: String(step.correta !== undefined ? step.correta : '0'),
            tempoMinimoSegundos: Math.max(5, parseInt(step.tempoMinimoSegundos || step.tempoMinimo || (tipoConteudo === 'video' ? 30 : 20), 10) || (tipoConteudo === 'video' ? 30 : 20)),
            exigirVisualizacaoCompleta: step.exigirVisualizacaoCompleta !== false,
            observacao: String(step.observacao || '').trim()
        };
    };

    window.lerConfiguracaoCursoSequencial = function(raw = '[]') {
        const decodificado = window.decodificarConfigAvaliacao ? window.decodificarConfigAvaliacao(raw) : String(raw || '[]');
        const arr = window.safeParseJSON(decodificado, []);
        return Array.isArray(arr) ? arr.map((step, idx) => window.normalizarEtapaCurso(step, idx)).filter(step => step.titulo) : [];
    };

    window.criarEtapaCursoPadrao = function(idx = 0) {
        return window.normalizarEtapaCurso({
            titulo: `Etapa ${idx + 1}`,
            tipoConteudo: 'video',
            pergunta: '',
            opcoes: ['', '', '', ''],
            correta: '0',
            tempoMinimoSegundos: 30,
            exigirVisualizacaoCompleta: true
        }, idx);
    };

    window.obterProgressoCursoSequencial = function(item = {}, nomeAluno = '') {
        const base = window.obterProgressoAlunoTreinamento ? (window.obterProgressoAlunoTreinamento(item.data || item || {}, nomeAluno) || {}) : {};
        const curso = base?.[COURSE_PROGRESS_KEY] || {};
        const steps = window.lerConfiguracaoCursoSequencial(item?.data?.[COURSE_FIELD] || item?.[COURSE_FIELD] || '[]');
        const total = steps.length;
        const concluidas = Array.isArray(curso.etapasConcluidas) ? curso.etapasConcluidas.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
        const respostas = Array.isArray(curso.respostas) ? curso.respostas : [];
        const acertos = parseInt(curso.acertos || 0, 10) || 0;
        const notaFinal = Number.isFinite(parseFloat(curso.notaFinal)) ? parseFloat(curso.notaFinal) : (total ? Number(((acertos / total) * 10).toFixed(2)) : 0);
        const etapaAtual = Number.isFinite(parseInt(curso.etapaAtual, 10)) ? parseInt(curso.etapaAtual, 10) : 0;
        return {
            etapaAtual: Math.min(Math.max(0, etapaAtual), Math.max(total - 1, 0)),
            etapasConcluidas: concluidas,
            respostas,
            acertos,
            total,
            notaFinal,
            percentual: total ? Math.round((concluidas.length / total) * 100) : 0,
            finalizado: !!curso.finalizado,
            liberouCertificado: !!curso.liberouCertificado,
            ultimoAcessoEm: curso.ultimoAcessoEm || '',
            resumo: curso.resumo || ''
        };
    };

    window.salvarProgressoCursoSequencial = async function(docId = '', nomeAluno = '', patchCurso = {}) {
        const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!item || !nomeAluno) return null;
        const atual = window.obterProgressoCursoSequencial(item, nomeAluno);
        const merged = {
            ...atual,
            ...patchCurso,
            ultimoAcessoEm: new Date().toLocaleString('pt-BR')
        };
        if (!Array.isArray(merged.etapasConcluidas)) merged.etapasConcluidas = [];
        if (!Array.isArray(merged.respostas)) merged.respostas = [];
        merged.etapasConcluidas = Array.from(new Set(merged.etapasConcluidas.map(n => parseInt(n, 10)).filter(Number.isFinite))).sort((a, b) => a - b);
        merged.acertos = parseInt(merged.acertos || 0, 10) || 0;
        merged.total = parseInt(merged.total || item?.data?.totalEtapas || 0, 10) || merged.total || 0;
        if (merged.total > 0 && (patchCurso.notaFinal === undefined || patchCurso.notaFinal === null || patchCurso.notaFinal === '')) {
            merged.notaFinal = Number(((merged.acertos / merged.total) * 10).toFixed(2));
        }
        const status = merged.finalizado ? 'concluida' : (merged.etapasConcluidas.length ? 'em_andamento' : 'pendente');
        return window.salvarProgressoTreinamento(docId, nomeAluno, {
            status,
            [COURSE_PROGRESS_KEY]: merged
        });
    };

    window.removerEntradaArrayStringPorNome = async function(docId = '', campo = '', nome = '') {
        const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!item) return;
        const lista = Array.isArray(item.data?.[campo]) ? item.data[campo] : [];
        const antigo = lista.find(raw => {
            const obj = window.safeParseJSON(raw, null);
            if (obj && obj.nome) return String(obj.nome) === String(nome);
            return String(raw || '').startsWith(String(nome));
        });
        if (antigo) {
            await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { [campo]: window.arrayRemove(antigo) });
            item.data[campo] = (item.data[campo] || []).filter(v => v !== antigo);
        }
    };

    window.upsertResumoCursoSequencial = async function(docId = '', item = null, nomeAluno = '', progresso = null) {
        const cursoItem = item || (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!cursoItem || !nomeAluno || !progresso?.finalizado) return;
        const steps = window.lerConfiguracaoCursoSequencial(cursoItem.data?.[COURSE_FIELD] || '[]');
        const total = steps.length || progresso.total || 0;
        const resumoObj = {
            nome: nomeAluno,
            data: new Date().toLocaleString('pt-BR'),
            curso_sequencial: true,
            etapa_atual: progresso.etapaAtual,
            etapas_concluidas: progresso.etapasConcluidas.length,
            total_etapas: total,
            acertos: progresso.acertos,
            nota: progresso.notaFinal,
            nota_total_calculada: progresso.notaFinal,
            feedback: progresso.liberouCertificado ? 'Curso concluído com aproveitamento.' : 'Curso concluído. Nota abaixo da mínima para certificado.',
            respostas: progresso.respostas || []
        };
        await window.removerEntradaArrayStringPorNome(docId, 'respostas_alunos', nomeAluno);
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), {
            respostas_alunos: window.arrayUnion(JSON.stringify(resumoObj))
        });
        cursoItem.data.respostas_alunos = [...(cursoItem.data.respostas_alunos || []).filter(raw => {
            const obj = window.safeParseJSON(raw, null);
            return !(obj && String(obj.nome || '') === String(nomeAluno));
        }), JSON.stringify(resumoObj)];

        const registroLeitura = `${nomeAluno} (Curso concluído em: ${new Date().toLocaleString('pt-BR')})`;
        const leituras = Array.isArray(cursoItem.data.leituras) ? cursoItem.data.leituras : [];
        const antigoRegistro = leituras.find(txt => String(txt || '').startsWith(`${nomeAluno} (`));
        if (antigoRegistro) {
            await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayRemove(antigoRegistro) });
            cursoItem.data.leituras = cursoItem.data.leituras.filter(txt => txt !== antigoRegistro);
        }
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registroLeitura) });
        cursoItem.data.leituras = [...(cursoItem.data.leituras || []), registroLeitura];
    };

    window.garantirBotoesCursoSequencialAdmin = function() {
        const areas = [
            ...document.querySelectorAll('#tab-treinamentos .flex-gap-10'),
            ...document.querySelectorAll('#tab-treinamentos .flex-between')
        ];
        areas.forEach(area => {
            if (!area || area.querySelector('.btn-cadastrar-curso-sequencial')) return;
            const alvo = area.classList.contains('flex-gap-10') ? area : area.querySelector('.admin-only')?.parentElement;
            const destino = alvo || area.querySelector('.flex-gap-10') || area;
            if (!destino || destino.querySelector('.btn-cadastrar-curso-sequencial')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-hover color-5 admin-only btn-cadastrar-curso-sequencial';
            btn.style.display = isAdmin ? 'inline-flex' : 'none';
            btn.innerHTML = '<i class="ri-graduation-cap-fill"></i> Cadastrar Curso';
            btn.onclick = () => window.abrirModalCursoSequencial();
            destino.prepend(btn);
        });
    };

    window.garantirModalCursoSequencial = function() {
        if (document.getElementById('modal-curso-sequencial')) return;
        const overlay = document.createElement('div');
        overlay.id = 'modal-curso-sequencial';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        overlay.style.zIndex = '10030';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:1180px; width:96vw; max-height:94vh;">
                <div class="modal-header">
                    <h3 id="curso-sequencial-title">Cadastrar Curso Sequencial</h3>
                    <button type="button" class="btn-icon" onclick="window.fecharModalCursoSequencial()"><i class="ri-close-line"></i></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="curso-seq-doc-id">
                    <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px;">
                        <input id="curso-seq-titulo" class="form-input" placeholder="Título do curso">
                        <input id="curso-seq-pasta" class="form-input" placeholder="Pasta / módulo">
                        <input id="curso-seq-carga" class="form-input" placeholder="Carga horária (certificado)">
                    </div>
                    <textarea id="curso-seq-descricao" class="form-input" style="height:86px; resize:vertical;" placeholder="Descrição / objetivo do curso"></textarea>
                    <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px;">
                        <input id="curso-seq-pontos" class="form-input" type="number" min="0" step="1" placeholder="XP total do curso">
                        <input id="curso-seq-nota-minima" class="form-input" type="number" min="0" max="10" step="0.5" placeholder="Nota mínima para certificado">
                        <select id="curso-seq-certificado" class="form-input">
                            <option value="Nenhum">Certificado: nenhum</option>
                            <option value="Participação">Certificado de participação</option>
                            <option value="Conclusão">Certificado de conclusão</option>
                            <option value="Ambos">Ambos</option>
                        </select>
                        <select id="curso-seq-colaborador" class="form-input"></select>
                    </div>
                    <textarea id="curso-seq-texto-cert" class="form-input" style="height:70px; resize:vertical;" placeholder="Texto personalizado do certificado (opcional)"></textarea>
                    <label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Para quais setores?</label>
                    <div id="curso-seq-setores" style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:14px; padding:12px; margin-bottom:14px;"></div>
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin:14px 0 10px; flex-wrap:wrap;">
                        <div style="font-size:13px; color:#475569;"><strong style="color:#8B252C;">Etapas do curso:</strong> cada etapa contém material + pergunta objetiva.</div>
                        <button type="button" class="btn-hover color-9" onclick="window.adicionarEtapaCursoBuilder()"><i class="ri-add-line"></i> Adicionar etapa</button>
                    </div>
                    <div id="curso-seq-builder-list"></div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
                    <button type="button" class="btn-hover color-8" onclick="window.fecharModalCursoSequencial()"><i class="ri-close-line"></i> Cancelar</button>
                    <button type="button" class="btn-hover color-11" id="btn-salvar-curso-sequencial" onclick="window.salvarCursoSequencial()"><i class="ri-save-line"></i> Salvar curso</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    };

    window.preencherSetoresCursoSequencial = function(valoresMarcados = ['Geral']) {
        const host = document.getElementById('curso-seq-setores');
        if (!host) return;
        const marcados = Array.isArray(valoresMarcados) && valoresMarcados.length ? valoresMarcados : ['Geral'];
        host.innerHTML = '';
        ['Geral', ...setoresGlobais].forEach(setor => {
            const label = document.createElement('label');
            label.style.cssText = 'font-size:13px; display:flex; align-items:center; gap:6px;';
            label.innerHTML = `<input type="checkbox" class="curso-seq-check-setor" value="${window.escapeAttr(setor)}" ${marcados.includes(setor) ? 'checked' : ''}> ${window.escapeHTML(setor)}`;
            host.appendChild(label);
        });
    };

    window.preencherSelectColaboradorCursoSequencial = function(valorAtual = '') {
        const select = document.getElementById('curso-seq-colaborador');
        if (!select) return;
        select.innerHTML = '<option value="">Colaborador específico: nenhum</option>';
        (listaColaboradoresGlobal || []).slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `Colaborador: ${c.nome}`;
            if (valorAtual === c.nome) opt.selected = true;
            select.appendChild(opt);
        });
    };

    window.adicionarEtapaCursoBuilder = function(stepData = null) {
        const host = document.getElementById('curso-seq-builder-list');
        if (!host) return;
        const idx = host.children.length;
        const step = window.normalizarEtapaCurso(stepData || window.criarEtapaCursoPadrao(idx), idx);
        const wrap = document.createElement('div');
        wrap.className = 'curso-step-builder';
        wrap.style.cssText = 'background:#fff; border:1px solid #e2e8f0; border-left:5px solid var(--primary-color); border-radius:18px; padding:16px; margin-bottom:14px; box-shadow:var(--shadow-soft);';
        wrap.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
                <div style="font-weight:700; color:#8B252C; font-size:14px;"><i class="ri-play-list-2-line"></i> Etapa <span class="curso-step-order">${idx + 1}</span></div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn-hover color-8" style="height:34px; font-size:11px; padding:0 12px;" onclick="window.moverEtapaCursoBuilder(this, -1)"><i class="ri-arrow-up-line"></i> Subir</button>
                    <button type="button" class="btn-hover color-8" style="height:34px; font-size:11px; padding:0 12px;" onclick="window.moverEtapaCursoBuilder(this, 1)"><i class="ri-arrow-down-line"></i> Descer</button>
                    <button type="button" class="btn-hover color-11" style="height:34px; font-size:11px; padding:0 12px;" onclick="window.removerEtapaCursoBuilder(this)"><i class="ri-delete-bin-6-line"></i> Remover</button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px;">
                <input class="form-input curso-step-titulo" placeholder="Título da etapa" value="${window.escapeAttr(step.titulo)}">
                <select class="form-input curso-step-tipo">
                    <option value="video" ${step.tipoConteudo === 'video' ? 'selected' : ''}>Vídeo</option>
                    <option value="documento" ${step.tipoConteudo === 'documento' ? 'selected' : ''}>Documento / PDF</option>
                    <option value="texto" ${step.tipoConteudo === 'texto' ? 'selected' : ''}>Texto / instrução</option>
                </select>
                <input class="form-input curso-step-tempo" type="number" min="5" step="5" value="${window.escapeAttr(step.tempoMinimoSegundos)}" placeholder="Tempo mínimo (s)">
            </div>
            <input class="form-input curso-step-link" placeholder="Link do vídeo / documento (se houver)" value="${window.escapeAttr(step.link)}">
            <textarea class="form-input curso-step-texto" style="height:80px; resize:vertical;" placeholder="Texto complementar ou conteúdo da etapa (use para leitura interna)">${window.escapeHTML(step.texto)}</textarea>
            <textarea class="form-input curso-step-pergunta" style="height:70px; resize:vertical;" placeholder="Pergunta obrigatória de múltipla escolha ao final da etapa">${window.escapeHTML(step.pergunta)}</textarea>
            <div style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px;">
                <input class="form-input curso-step-op0" placeholder="Opção A" value="${window.escapeAttr(step.opcoes[0] || '')}">
                <input class="form-input curso-step-op1" placeholder="Opção B" value="${window.escapeAttr(step.opcoes[1] || '')}">
                <input class="form-input curso-step-op2" placeholder="Opção C" value="${window.escapeAttr(step.opcoes[2] || '')}">
                <input class="form-input curso-step-op3" placeholder="Opção D" value="${window.escapeAttr(step.opcoes[3] || '')}">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center;">
                <select class="form-input curso-step-correta">
                    <option value="0" ${step.correta === '0' ? 'selected' : ''}>Resposta correta: A</option>
                    <option value="1" ${step.correta === '1' ? 'selected' : ''}>Resposta correta: B</option>
                    <option value="2" ${step.correta === '2' ? 'selected' : ''}>Resposta correta: C</option>
                    <option value="3" ${step.correta === '3' ? 'selected' : ''}>Resposta correta: D</option>
                </select>
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:#334155;"><input type="checkbox" class="curso-step-fullwatch" ${step.exigirVisualizacaoCompleta ? 'checked' : ''}> Exigir visualização completa / tempo mínimo</label>
            </div>
            <input class="form-input curso-step-observacao" placeholder="Observação opcional ao aluno" value="${window.escapeAttr(step.observacao || '')}">
        `;
        host.appendChild(wrap);
        window.renumerarEtapasCursoBuilder();
    };

    window.renumerarEtapasCursoBuilder = function() {
        document.querySelectorAll('#curso-seq-builder-list .curso-step-builder').forEach((box, idx) => {
            const order = box.querySelector('.curso-step-order');
            if (order) order.textContent = idx + 1;
        });
    };

    window.moverEtapaCursoBuilder = function(btn, direcao = 0) {
        const box = btn.closest('.curso-step-builder');
        const host = document.getElementById('curso-seq-builder-list');
        if (!box || !host) return;
        if (direcao < 0 && box.previousElementSibling) host.insertBefore(box, box.previousElementSibling);
        if (direcao > 0 && box.nextElementSibling) host.insertBefore(box.nextElementSibling, box);
        window.renumerarEtapasCursoBuilder();
    };

    window.removerEtapaCursoBuilder = function(btn) {
        const box = btn.closest('.curso-step-builder');
        if (box) box.remove();
        if (!document.querySelector('#curso-seq-builder-list .curso-step-builder')) window.adicionarEtapaCursoBuilder();
        window.renumerarEtapasCursoBuilder();
    };

    window.coletarEtapasCursoBuilder = function() {
        return Array.from(document.querySelectorAll('#curso-seq-builder-list .curso-step-builder')).map((box, idx) => window.normalizarEtapaCurso({
            titulo: box.querySelector('.curso-step-titulo')?.value || `Etapa ${idx + 1}`,
            tipoConteudo: box.querySelector('.curso-step-tipo')?.value || 'video',
            tempoMinimoSegundos: box.querySelector('.curso-step-tempo')?.value || '30',
            link: box.querySelector('.curso-step-link')?.value || '',
            texto: box.querySelector('.curso-step-texto')?.value || '',
            pergunta: box.querySelector('.curso-step-pergunta')?.value || '',
            opcoes: [
                box.querySelector('.curso-step-op0')?.value || '',
                box.querySelector('.curso-step-op1')?.value || '',
                box.querySelector('.curso-step-op2')?.value || '',
                box.querySelector('.curso-step-op3')?.value || ''
            ],
            correta: box.querySelector('.curso-step-correta')?.value || '0',
            exigirVisualizacaoCompleta: !!box.querySelector('.curso-step-fullwatch')?.checked,
            observacao: box.querySelector('.curso-step-observacao')?.value || ''
        }, idx));
    };

    window.abrirModalCursoSequencial = function(docId = '', dadosAntigos = null) {
        if (!isAdmin) return;
        window.garantirModalCursoSequencial();
        const data = dadosAntigos || {};
        document.getElementById('curso-sequencial-title').textContent = docId ? 'Editar Curso Sequencial' : 'Cadastrar Curso Sequencial';
        document.getElementById('curso-seq-doc-id').value = docId || '';
        document.getElementById('curso-seq-titulo').value = data['Título da Atividade'] || '';
        document.getElementById('curso-seq-pasta').value = data['Pasta / Módulo'] || '';
        document.getElementById('curso-seq-descricao').value = data[COURSE_DESC_FIELD] || '';
        document.getElementById('curso-seq-pontos').value = data['Pontos Valendo'] || '';
        document.getElementById('curso-seq-nota-minima').value = data[COURSE_NOTE_FIELD] || '';
        document.getElementById('curso-seq-certificado').value = data['Tipo de Certificado'] || 'Nenhum';
        document.getElementById('curso-seq-carga').value = data['Carga Horária (Certificado)'] || '';
        document.getElementById('curso-seq-texto-cert').value = data[COURSE_CERT_TEXT_FIELD] || '';
        window.preencherSelectColaboradorCursoSequencial(data['Colaborador Específico (Opcional)'] || '');
        const setoresMarcados = String(data['Para quais Setores?'] || 'Geral').split(',').map(s => s.trim()).filter(Boolean);
        window.preencherSetoresCursoSequencial(setoresMarcados.length ? setoresMarcados : ['Geral']);
        const host = document.getElementById('curso-seq-builder-list');
        if (host) host.innerHTML = '';
        const steps = window.lerConfiguracaoCursoSequencial(data[COURSE_FIELD] || '[]');
        (steps.length ? steps : [window.criarEtapaCursoPadrao(0)]).forEach(step => window.adicionarEtapaCursoBuilder(step));
        document.getElementById('modal-curso-sequencial').style.display = 'flex';
    };

    window.fecharModalCursoSequencial = function() {
        const modal = document.getElementById('modal-curso-sequencial');
        if (modal) modal.style.display = 'none';
    };

    window.salvarCursoSequencial = async function() {
        const btn = document.getElementById('btn-salvar-curso-sequencial');
        const original = btn ? btn.innerHTML : '';
        try {
            const docId = document.getElementById('curso-seq-doc-id')?.value || '';
            const titulo = String(document.getElementById('curso-seq-titulo')?.value || '').trim();
            const pasta = String(document.getElementById('curso-seq-pasta')?.value || '').trim() || 'Cursos';
            const descricao = String(document.getElementById('curso-seq-descricao')?.value || '').trim();
            const pontos = String(document.getElementById('curso-seq-pontos')?.value || '').trim() || '0';
            const notaMinima = String(document.getElementById('curso-seq-nota-minima')?.value || '').trim();
            const certificado = String(document.getElementById('curso-seq-certificado')?.value || 'Nenhum').trim();
            const carga = String(document.getElementById('curso-seq-carga')?.value || '').trim();
            const textoCert = String(document.getElementById('curso-seq-texto-cert')?.value || '').trim();
            const colabEsp = String(document.getElementById('curso-seq-colaborador')?.value || '').trim();
            const setores = Array.from(document.querySelectorAll('.curso-seq-check-setor:checked')).map(el => el.value);
            const steps = window.coletarEtapasCursoBuilder();

            if (!titulo) return alert('Informe o título do curso.');
            if (!steps.length) return alert('Adicione ao menos uma etapa ao curso.');
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (!step.titulo) return alert(`A etapa ${i + 1} está sem título.`);
                if ((step.tipoConteudo === 'video' || step.tipoConteudo === 'documento') && !step.link && !step.texto) return alert(`A etapa ${i + 1} precisa de um link ou texto de apoio.`);
                if (!step.pergunta) return alert(`A etapa ${i + 1} precisa de uma pergunta.`);
                if (step.opcoes.filter(Boolean).length < 2) return alert(`A etapa ${i + 1} precisa de pelo menos 2 opções.`);
                const correta = parseInt(step.correta, 10);
                if (!Number.isFinite(correta) || !step.opcoes[correta]) return alert(`Defina uma resposta correta válida na etapa ${i + 1}.`);
            }
            if (btn) btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando curso...';

            const dados = {
                'Título da Atividade': titulo,
                'Pasta / Módulo': pasta,
                'Tipo (Vídeo, PDF, Tarefa, Prova)': COURSE_TYPE,
                'Link do Material (Se houver)': '',
                'Colaborador Específico (Opcional)': colabEsp,
                'Para quais Setores?': (setores.length ? setores : ['Geral']).join(', '),
                'Pontos Valendo': pontos,
                'Modo de Controle': 'curso_sequencial',
                'Permite Pausa?': 'Sim',
                'Limite de Infrações': '3',
                'Regra ao Sair': 'inconclusa',
                'Configuração da Avaliação': '[]',
                [COURSE_FIELD]: JSON.stringify(steps),
                [COURSE_DESC_FIELD]: descricao,
                [COURSE_NOTE_FIELD]: notaMinima,
                'Tipo de Certificado': certificado,
                'Carga Horária (Certificado)': carga,
                [COURSE_CERT_TEXT_FIELD]: textoCert,
                totalEtapas: steps.length,
                atualizadoEmCurso: new Date().toISOString(),
                atualizadoPorCurso: emailLogado || 'Gestor'
            };

            if (docId) {
                const atual = (window.todosTreinamentosData || []).find(i => i.id === docId);
                if (atual?.data?.progresso_alunos) dados.progresso_alunos = atual.data.progresso_alunos;
                if (atual?.data?.leituras) dados.leituras = atual.data.leituras;
                if (atual?.data?.respostas_alunos) dados.respostas_alunos = atual.data.respostas_alunos;
                await window.updateDoc(window.doc(window.db, 'treinamentos', docId), dados);
            } else {
                await window.addDoc(window.collection(window.db, 'treinamentos'), dados);
            }
            alert(docId ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!');
            window.fecharModalCursoSequencial();
        } catch (e) {
            alert('Erro ao salvar o curso: ' + (e?.message || e));
        } finally {
            if (btn) btn.innerHTML = original;
        }
    };

    window.garantirModalCursoAluno = function() {
        if (document.getElementById('modal-curso-aluno')) return;
        const overlay = document.createElement('div');
        overlay.id = 'modal-curso-aluno';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        overlay.style.zIndex = '10040';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:1100px; width:96vw; max-height:94vh;">
                <div class="modal-header">
                    <h3 id="curso-aluno-titulo">Curso</h3>
                    <button type="button" class="btn-icon" onclick="window.fecharModalCursoAluno()"><i class="ri-close-line"></i></button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
                            <div id="curso-aluno-subtitulo" style="font-size:13px; color:#64748b;">Etapa atual</div>
                            <div id="curso-aluno-meta" style="font-size:12px; color:#334155; font-weight:700;"></div>
                        </div>
                        <div style="height:12px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                            <div id="curso-aluno-progressbar" style="height:100%; width:0%; background:linear-gradient(90deg, #8B252C, #e53e3e);"></div>
                        </div>
                    </div>
                    <div id="curso-aluno-resumo-final" style="display:none; margin-bottom:14px;"></div>
                    <div style="display:grid; grid-template-columns:280px minmax(0,1fr); gap:16px; align-items:start;">
                        <div id="curso-aluno-trilha" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:18px; padding:14px; max-height:65vh; overflow:auto;"></div>
                        <div>
                            <div id="curso-aluno-etapa-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:18px; box-shadow:var(--shadow-soft);"></div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    };

    window.fecharModalCursoAluno = function() {
        const modal = document.getElementById('modal-curso-aluno');
        if (modal) modal.style.display = 'none';
        if (window._cursoAlunoTimer) { clearInterval(window._cursoAlunoTimer); window._cursoAlunoTimer = null; }
        window._cursoAlunoSessao = null;
    };

    window.htmlConteudoCursoAluno = function(step = {}) {
        if (step.tipoConteudo === 'texto') {
            return `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; white-space:pre-wrap; line-height:1.6; color:#334155;">${window.escapeHTML(step.texto || 'Conteúdo de leitura.')}</div>`;
        }
        if (step.tipoConteudo === 'documento') {
            const src = step.link ? window.obterUrlEmbedMaterial(step.link) : '';
            return `${step.texto ? `<div style="white-space:pre-wrap; line-height:1.6; color:#334155; margin-bottom:12px;">${window.escapeHTML(step.texto)}</div>` : ''}${src ? `<div style="position:relative; padding-top:66%; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; background:#fff;"><iframe src="${window.escapeAttr(src)}" style="position:absolute; inset:0; width:100%; height:100%; border:none;" allowfullscreen></iframe></div>` : `<div style="padding:16px; border:1px dashed #cbd5e1; border-radius:14px; color:#64748b;">Documento sem link configurado.</div>`}`;
        }
        if (step.link && /\.(mp4|webm|ogg)(\?|#|$)/i.test(step.link)) {
            return `<video id="curso-video-player" controls controlsList="nodownload noplaybackrate" disablepictureinpicture style="width:100%; max-height:420px; background:#000; border-radius:14px; border:1px solid #e2e8f0;" src="${window.escapeAttr(step.link)}"></video>${step.texto ? `<div style="white-space:pre-wrap; line-height:1.6; color:#334155; margin-top:12px;">${window.escapeHTML(step.texto)}</div>` : ''}`;
        }
        const embed = step.link ? window.obterUrlEmbedMaterial(step.link) : '';
        return `${step.texto ? `<div style="white-space:pre-wrap; line-height:1.6; color:#334155; margin-bottom:12px;">${window.escapeHTML(step.texto)}</div>` : ''}${embed ? `<div style="position:relative; padding-top:56.25%; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; background:#000;"><iframe src="${window.escapeAttr(embed)}" allow="autoplay; fullscreen" allowfullscreen style="position:absolute; inset:0; width:100%; height:100%; border:none;"></iframe></div>` : `<div style="padding:16px; border:1px dashed #cbd5e1; border-radius:14px; color:#64748b;">Vídeo sem link configurado.</div>`}`;
    };

    window.atualizarNavegacaoCursoAluno = function(sessao = null) {
        const s = sessao || window._cursoAlunoSessao;
        if (!s) return;
        const trilha = document.getElementById('curso-aluno-trilha');
        const bar = document.getElementById('curso-aluno-progressbar');
        const sub = document.getElementById('curso-aluno-subtitulo');
        const meta = document.getElementById('curso-aluno-meta');
        if (!trilha || !bar || !sub || !meta) return;
        trilha.innerHTML = s.steps.map((step, idx) => {
            const done = s.progress.etapasConcluidas.includes(idx);
            const active = idx === s.progress.etapaAtual && !s.progress.finalizado;
            const locked = !done && idx > s.progress.etapaAtual;
            const cor = done ? '#38a169' : active ? '#3182ce' : '#94a3b8';
            return `<div style="padding:12px; border-radius:14px; border:1px solid ${active ? '#93c5fd' : '#e2e8f0'}; margin-bottom:10px; background:${active ? '#eff6ff' : '#fff'}; opacity:${locked ? '0.7' : '1'};"><div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;"><div><div style="font-size:12px; color:${cor}; font-weight:700; text-transform:uppercase;">Etapa ${idx + 1}</div><div style="font-size:13px; font-weight:700; color:#0f172a; line-height:1.35;">${window.escapeHTML(step.titulo)}</div></div><div style="font-size:18px; color:${cor};"><i class="${done ? 'ri-check-double-line' : active ? 'ri-play-circle-line' : 'ri-lock-line'}"></i></div></div></div>`;
        }).join('');
        const total = s.steps.length || 1;
        const pct = s.progress.finalizado ? 100 : Math.round((s.progress.etapasConcluidas.length / total) * 100);
        bar.style.width = `${pct}%`;
        sub.textContent = s.progress.finalizado ? 'Curso concluído' : `Etapa ${Math.min(s.progress.etapaAtual + 1, total)} de ${total}`;
        meta.textContent = `Progresso ${pct}% • Acertos ${s.progress.acertos}/${total}`;
    };

    window.inicializarControleVideoCursoAluno = function(step = {}, idx = 0) {
        const video = document.getElementById('curso-video-player');
        if (!video) {
            window.iniciarContagemConteudoCursoAluno(step, idx, false);
            return;
        }
        const notice = document.getElementById('curso-conteudo-status');
        let maxAssistido = 0;
        let bloqueado = false;
        const desbloquear = () => {
            if (bloqueado) return;
            bloqueado = true;
            if (notice) notice.innerHTML = '<span style="color:#166534; font-weight:700;"><i class="ri-checkbox-circle-fill"></i> Vídeo concluído. A pergunta foi liberada.</span>';
            window.liberarPerguntaEtapaCursoAluno(idx);
        };
        video.addEventListener('timeupdate', () => {
            if (video.currentTime > maxAssistido + 1.5 && !video.seeking) {
                video.currentTime = maxAssistido;
                return;
            }
            maxAssistido = Math.max(maxAssistido, video.currentTime || 0);
            if (notice && !bloqueado) {
                notice.innerHTML = `<span style="color:#9a3412; font-weight:700;"><i class="ri-time-line"></i> Assista sem avançar o vídeo para liberar a pergunta.</span>`;
            }
            if (video.duration && maxAssistido >= Math.max(video.duration - 0.6, 1)) desbloquear();
        });
        video.addEventListener('seeking', () => {
            if (video.currentTime > maxAssistido + 1.5) video.currentTime = maxAssistido;
        });
        video.addEventListener('ratechange', () => {
            if (video.playbackRate !== 1) video.playbackRate = 1;
        });
        video.addEventListener('ended', desbloquear);
    };

    window.iniciarContagemConteudoCursoAluno = function(step = {}, idx = 0, renderizarMensagem = true) {
        if (window._cursoAlunoTimer) clearInterval(window._cursoAlunoTimer);
        const status = document.getElementById('curso-conteudo-status');
        const btn = document.getElementById('btn-liberar-pergunta-curso');
        let restante = Math.max(1, parseInt(step.tempoMinimoSegundos || 20, 10) || 20);
        if (btn) btn.disabled = true;
        const tick = () => {
            if (status && renderizarMensagem) status.innerHTML = `<span style="color:#9a3412; font-weight:700;"><i class="ri-timer-line"></i> Permaneça no material por mais <b>${restante}s</b> para liberar a pergunta.</span>`;
            if (restante <= 0) {
                clearInterval(window._cursoAlunoTimer);
                window._cursoAlunoTimer = null;
                if (btn) btn.disabled = false;
                if (status) status.innerHTML = '<span style="color:#166534; font-weight:700;"><i class="ri-checkbox-circle-fill"></i> Conteúdo concluído. Clique para responder a pergunta.</span>';
                return;
            }
            restante -= 1;
        };
        tick();
        window._cursoAlunoTimer = setInterval(tick, 1000);
    };

    window.liberarPerguntaEtapaCursoAluno = function(idx = 0) {
        const s = window._cursoAlunoSessao;
        if (!s) return;
        if (s.stepPerguntaLiberada === idx) return;
        s.stepPerguntaLiberada = idx;
        const question = document.getElementById('curso-aluno-question-box');
        if (question) question.style.display = 'block';
        const btn = document.getElementById('btn-liberar-pergunta-curso');
        if (btn) btn.style.display = 'none';
    };

    window.renderizarEtapaAtualCursoAluno = function() {
        const s = window._cursoAlunoSessao;
        if (!s) return;
        const box = document.getElementById('curso-aluno-etapa-box');
        const resumoFinal = document.getElementById('curso-aluno-resumo-final');
        if (!box || !resumoFinal) return;
        window.atualizarNavegacaoCursoAluno(s);
        if (s.progress.finalizado) {
            const notaMin = window.obterNotaMinimaCertificado ? window.obterNotaMinimaCertificado(s.item.data || {}) : null;
            const aprovado = notaMin === null || s.progress.notaFinal >= notaMin;
            const eleg = window.obterElegibilidadeCertificadoTreinamento ? window.obterElegibilidadeCertificadoTreinamento(s.item, s.nomeAluno) : { participacao: false, conclusao: false };
            const tipoCert = eleg.conclusao ? 'conclusao' : (eleg.participacao ? 'participacao' : '');
            resumoFinal.style.display = 'block';
            resumoFinal.innerHTML = `<div style="padding:16px; border-radius:16px; border:1px solid ${aprovado ? '#86efac' : '#fdba74'}; background:${aprovado ? '#f0fdf4' : '#fff7ed'};"><div style="font-weight:700; font-size:16px; margin-bottom:8px; color:${aprovado ? '#166534' : '#9a3412'};"><i class="${aprovado ? 'ri-medal-fill' : 'ri-information-line'}"></i> Curso finalizado</div><div style="font-size:14px; color:#334155; line-height:1.6;">Nota final: <b>${s.progress.notaFinal.toFixed(1)}</b> • Acertos: <b>${s.progress.acertos}/${s.steps.length}</b>${notaMin !== null ? ` • Nota mínima: <b>${notaMin}</b>` : ''}</div><div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">${tipoCert ? `<button class="btn-hover color-5" onclick="window.abrirModalCertificadoTreinamento('${s.docId}','${tipoCert}')"><i class="ri-award-line"></i> Certificado</button>` : ''}<button class="btn-hover color-8" onclick="window.fecharModalCursoAluno()"><i class="ri-close-line"></i> Fechar</button></div></div>`;
            box.innerHTML = '<div style="padding:24px; text-align:center; color:#64748b;">Todas as etapas já foram concluídas.</div>';
            return;
        }
        resumoFinal.style.display = 'none';
        const idx = s.progress.etapaAtual;
        const step = s.steps[idx];
        const respostaSalva = Array.isArray(s.progress.respostas) ? s.progress.respostas.find(r => parseInt(r.etapa, 10) === idx) : null;
        const opcoesHtml = step.opcoes.map((op, opIdx) => op ? `<label style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; cursor:pointer;"><input type="radio" name="curso-step-resposta" value="${opIdx}" ${String(respostaSalva?.marcada ?? '') === String(opIdx) ? 'checked' : ''}> <span>${window.escapeHTML(op)}</span></label>` : '').join('');
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:14px;">
                <div>
                    <div style="font-size:12px; text-transform:uppercase; color:#8B252C; font-weight:700; margin-bottom:4px;">${window.escapeHTML(step.tipoConteudo)}</div>
                    <div style="font-size:22px; font-weight:700; color:#0f172a; line-height:1.2;">${window.escapeHTML(step.titulo)}</div>
                </div>
                <div style="font-size:12px; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; border-radius:999px; padding:8px 12px; font-weight:700;">Pergunta liberada após conteúdo</div>
            </div>
            ${step.observacao ? `<div style="margin-bottom:12px; padding:12px; border-radius:12px; background:#fff7ed; border:1px solid #fdba74; color:#9a3412; font-size:13px;">${window.escapeHTML(step.observacao)}</div>` : ''}
            <div>${window.htmlConteudoCursoAluno(step)}</div>
            <div id="curso-conteudo-status" style="margin:14px 0 10px; font-size:13px;"></div>
            <button id="btn-liberar-pergunta-curso" type="button" class="btn-hover color-9" style="display:${step.tipoConteudo === 'video' && step.link && /\.(mp4|webm|ogg)(\?|#|$)/i.test(step.link) ? 'none' : 'inline-flex'}; height:38px; font-size:12px; ${step.exigirVisualizacaoCompleta ? '' : 'display:none;'}" onclick="window.liberarPerguntaEtapaCursoAluno(${idx})"><i class="ri-question-answer-line"></i> Responder pergunta</button>
            <div id="curso-aluno-question-box" style="display:none; margin-top:16px; padding-top:16px; border-top:1px dashed #cbd5e1;">
                <div style="font-weight:700; font-size:15px; color:#0f172a; margin-bottom:12px;">Pergunta da etapa</div>
                <div style="font-size:14px; color:#334155; margin-bottom:12px; line-height:1.5;">${window.escapeHTML(step.pergunta || '')}</div>
                <div>${opcoesHtml}</div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px; flex-wrap:wrap;">
                    <button type="button" class="btn-hover color-11" onclick="window.confirmarRespostaEtapaCursoAluno()"><i class="ri-check-line"></i> Confirmar resposta</button>
                </div>
            </div>`;

        s.stepPerguntaLiberada = null;
        if (!step.exigirVisualizacaoCompleta) {
            document.getElementById('btn-liberar-pergunta-curso').style.display = 'inline-flex';
            document.getElementById('btn-liberar-pergunta-curso').disabled = false;
            document.getElementById('curso-conteudo-status').innerHTML = '<span style="color:#166534; font-weight:700;"><i class="ri-checkbox-circle-fill"></i> Você já pode responder a pergunta desta etapa.</span>';
        } else if (step.tipoConteudo === 'video' && step.link && /\.(mp4|webm|ogg)(\?|#|$)/i.test(step.link)) {
            window.inicializarControleVideoCursoAluno(step, idx);
        } else {
            window.iniciarContagemConteudoCursoAluno(step, idx, true);
        }
    };

    window.confirmarRespostaEtapaCursoAluno = async function() {
        const s = window._cursoAlunoSessao;
        if (!s) return;
        const idx = s.progress.etapaAtual;
        const step = s.steps[idx];
        const marcada = document.querySelector('input[name="curso-step-resposta"]:checked');
        if (!marcada) return alert('Selecione uma resposta para continuar.');
        const correta = String(step.correta) === String(marcada.value);
        const respostas = Array.isArray(s.progress.respostas) ? s.progress.respostas.filter(r => parseInt(r.etapa, 10) !== idx) : [];
        respostas.push({ etapa: idx, marcada: String(marcada.value), correta, titulo: step.titulo, pergunta: step.pergunta, resposta: step.opcoes[parseInt(marcada.value, 10)] || '' });
        const concluidas = Array.from(new Set([...(s.progress.etapasConcluidas || []), idx])).sort((a, b) => a - b);
        const acertos = respostas.filter(r => r.correta).length;
        const finalizado = concluidas.length >= s.steps.length;
        const proxima = finalizado ? idx : Math.min(idx + 1, s.steps.length - 1);
        const notaFinal = Number(((acertos / s.steps.length) * 10).toFixed(2));
        const notaMin = window.obterNotaMinimaCertificado ? window.obterNotaMinimaCertificado(s.item.data || {}) : null;
        const liberouCertificado = finalizado && (notaMin === null || notaFinal >= notaMin);
        const patch = {
            respostas,
            etapasConcluidas: concluidas,
            etapaAtual: proxima,
            acertos,
            total: s.steps.length,
            notaFinal,
            finalizado,
            liberouCertificado,
            percentual: Math.round((concluidas.length / s.steps.length) * 100)
        };
        s.progress = { ...s.progress, ...patch };
        await window.salvarProgressoCursoSequencial(s.docId, s.nomeAluno, patch);
        if (finalizado) {
            await window.upsertResumoCursoSequencial(s.docId, s.item, s.nomeAluno, s.progress);
            alert(`Curso concluído! Nota final: ${notaFinal.toFixed(1)}`);
        } else {
            alert(correta ? 'Resposta correta! Avançando para a próxima etapa.' : 'Resposta registrada. Vamos para a próxima etapa.');
        }
        if (window.renderizarTrilhaAluno) window.renderizarTrilhaAluno();
        window.renderizarEtapaAtualCursoAluno();
    };

    window.abrirCursoSequencialAluno = function(docId = '') {
        if (!window.alunoLogado) return;
        const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
        if (!item) return;
        const steps = window.lerConfiguracaoCursoSequencial(item.data?.[COURSE_FIELD] || '[]');
        if (!steps.length) return alert('Este curso ainda não possui etapas configuradas.');
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const progress = window.obterProgressoCursoSequencial(item, nomeAluno);
        window.garantirModalCursoAluno();
        window._cursoAlunoSessao = { docId, item, steps, nomeAluno, progress, stepPerguntaLiberada: null };
        document.getElementById('curso-aluno-titulo').textContent = item.data?.['Título da Atividade'] || 'Curso';
        document.getElementById('modal-curso-aluno').style.display = 'flex';
        window.renderizarEtapaAtualCursoAluno();
    };

    const oldAbrirModalCursoPatch = window.abrirModal;
    window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
        if (colecao === 'treinamentos' && window.isCursoSequencialTreinamento(dadosAntigos || {})) {
            window.abrirModalCursoSequencial(docId || '', dadosAntigos || {});
            return;
        }
        return oldAbrirModalCursoPatch(colecao, docId, dadosAntigos);
    };

    const oldAbrirListaLeiturasCurso = window.abrirListaLeituras;
    window.abrirListaLeituras = function(docId, colecao) {
        if (colecao === 'treinamentos') {
            const item = (window.todosTreinamentosData || []).find(i => i.id === docId);
            if (item && window.isCursoSequencialTreinamento(item.data || {})) {
                const modal = document.getElementById('modal-leituras');
                const titulo = document.getElementById('modal-leitura-titulo');
                const areaOk = document.getElementById('lista-lidos-content');
                const areaPend = document.getElementById('lista-falta-content');
                if (!modal || !titulo || !areaOk || !areaPend) return;
                const publico = window.obterPublicoAlvo(item.data['Para quais Setores?'], item.data['Colaborador Específico (Opcional)']);
                const progressos = window.listarProgressoTreinamento(item.data || {});
                const concluidos = [];
                const andamento = [];
                progressos.forEach(p => {
                    const curso = p?.[COURSE_PROGRESS_KEY];
                    if (!curso) return;
                    const totalEtapas = parseInt(curso.total || item.data.totalEtapas || 0, 10) || 0;
                    const qtd = Array.isArray(curso.etapasConcluidas) ? curso.etapasConcluidas.length : 0;
                    const nota = Number.isFinite(parseFloat(curso.notaFinal)) ? parseFloat(curso.notaFinal).toFixed(1) : '--';
                    const baseHtml = `<strong style="display:block; color:#0f172a;">${window.escapeHTML(p.nome || 'Colaborador')}</strong><span style="font-size:12px; color:#64748b;">${qtd}/${totalEtapas} etapa(s) concluída(s) • Nota: ${nota}</span><div style="margin-top:8px; font-size:12px; color:#475569;">Último acesso: ${window.escapeHTML(curso.ultimoAcessoEm || p.ultima_interacao_em || '-')}</div>`;
                    if (curso.finalizado) concluidos.push(`<div style="padding:12px; border-radius:12px; background:#fff; border-left:4px solid #38a169; margin-bottom:10px; box-shadow:var(--shadow-soft);">${baseHtml}</div>`);
                    else andamento.push(`<div style="padding:12px; border-radius:12px; background:#fff; border-left:4px solid #3182ce; margin-bottom:10px; box-shadow:var(--shadow-soft);">${baseHtml}</div>`);
                });
                const nomesRegistrados = new Set(progressos.map(p => p.nome));
                const faltantes = publico.filter(nome => !nomesRegistrados.has(nome));
                titulo.textContent = `Progresso do curso: ${item.data['Título da Atividade'] || 'Curso'}`;
                areaOk.innerHTML = concluidos.length || andamento.length ? [...concluidos, ...andamento].join('') : '<div style="padding:12px; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b; background:#f8fafc;">Nenhum progresso registrado ainda.</div>';
                areaPend.innerHTML = faltantes.length ? faltantes.map(nome => `<div style="padding:12px; border-radius:12px; background:#fff; border-left:4px solid #e53e3e; margin-bottom:10px; box-shadow:var(--shadow-soft);"><strong style="display:block; color:#0f172a;">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:#64748b;">Ainda não iniciou o curso.</span></div>`).join('') : '<div style="padding:12px; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b; background:#f8fafc;">Todos já iniciaram o curso.</div>';
                modal.style.display = 'flex';
                return;
            }
        }
        return oldAbrirListaLeiturasCurso(docId, colecao);
    };

    const oldObterNotaAlunoCurso = window.obterNotaAlunoTreinamento;
    window.obterNotaAlunoTreinamento = function(item = {}, nomeAluno = '') {
        if (window.isCursoSequencialTreinamento(item.data || item || {})) {
            const progresso = window.obterProgressoCursoSequencial(item, nomeAluno);
            return Number.isFinite(parseFloat(progresso.notaFinal)) ? parseFloat(progresso.notaFinal) : null;
        }
        return typeof oldObterNotaAlunoCurso === 'function' ? oldObterNotaAlunoCurso(item, nomeAluno) : null;
    };

    const oldElegibilidadeCurso = window.obterElegibilidadeCertificadoTreinamento;
    window.obterElegibilidadeCertificadoTreinamento = function(item = {}, nomeAluno = '') {
        if (window.isCursoSequencialTreinamento(item.data || item || {})) {
            const data = item.data || item || {};
            const tipoCert = String(data['Tipo de Certificado'] || 'Nenhum').toLowerCase();
            const progresso = window.obterProgressoCursoSequencial(item, nomeAluno);
            const notaMinima = window.obterNotaMinimaCertificado ? window.obterNotaMinimaCertificado(data) : null;
            const notaAluno = Number.isFinite(parseFloat(progresso.notaFinal)) ? parseFloat(progresso.notaFinal) : null;
            const atendeNota = notaMinima === null || (notaAluno !== null && notaAluno >= notaMinima);
            const participacao = ['participação', 'participacao', 'ambos'].includes(tipoCert) && progresso.finalizado && atendeNota;
            const conclusao = ['conclusão', 'conclusao', 'ambos'].includes(tipoCert) && progresso.finalizado && atendeNota;
            return { participacao, conclusao, notaMinima, notaAluno, atendeNota };
        }
        return typeof oldElegibilidadeCurso === 'function' ? oldElegibilidadeCurso(item, nomeAluno) : { participacao: false, conclusao: false };
    };

    window.recalcularResumoAlunoTrilha = function() {
        if (!window.alunoLogado) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';
        let pontos = 0;
        let pendentes = 0;
        const treinamentosAluno = (window.todosTreinamentosData || []).filter(item => {
            const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
            const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
            if (colabAlvo && !colabAlvo.includes('Nenhum')) return colabAlvo === nomeAluno;
            return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
        });
        treinamentosAluno.forEach(item => {
            const d = item.data || {};
            if (window.isCursoSequencialTreinamento(d)) {
                const p = window.obterProgressoCursoSequencial(item, nomeAluno);
                if (p.finalizado) pontos += parseFloat(d['Pontos Valendo'] || p.notaFinal || 0) || 0;
                else pendentes += 1;
                return;
            }
            const respostas = d.respostas_alunos || [];
            let minhaResposta = null; respostas.forEach(r => { const obj = window.safeParseJSON(r, null); if (obj && obj.nome === nomeAluno) minhaResposta = obj; });
            const progresso = window.obterProgressoAlunoTreinamento ? window.obterProgressoAlunoTreinamento(d, nomeAluno) : null;
            const statusProgresso = String(progresso?.status || 'pendente');
            const jaLeu = (d.leituras || []).some(txt => String(txt).startsWith(nomeAluno));
            const tipo = d['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo';
            const precisaResponder = tipo.includes('Tarefa') || tipo.includes('Prova');
            const pontosItem = parseInt(d['Pontos Valendo'], 10) || 0;
            if (precisaResponder) {
                if (statusProgresso === 'zerada_por_saida') return;
                if (minhaResposta) {
                    const nota = minhaResposta.nota_total_calculada !== undefined && minhaResposta.nota_total_calculada !== '' ? minhaResposta.nota_total_calculada : minhaResposta.nota;
                    if (nota !== '' && nota !== undefined && nota !== null) pontos += parseFloat(nota) || 0;
                } else pendentes += 1;
            } else {
                if (jaLeu) pontos += pontosItem;
                else pendentes += 1;
            }
        });
        const ptsEl = document.getElementById('aluno-pontos');
        const pendEl = document.getElementById('aluno-tarefas-pendentes');
        if (ptsEl) ptsEl.textContent = String(Number(pontos.toFixed(1)).toString().replace('.0', ''));
        if (pendEl) pendEl.textContent = String(pendentes);
    };

    const oldRenderTrilhaCurso = window.renderizarTrilhaAluno;
    window.renderizarTrilhaAluno = function() {
        if (typeof oldRenderTrilhaCurso === 'function') oldRenderTrilhaCurso();
        if (!window.alunoLogado) return;
        const grid = document.getElementById('grid-trilha-aluno');
        if (!grid) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';
        const treinamentosAluno = (window.todosTreinamentosData || []).filter(item => {
            const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
            const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
            if (colabAlvo && !colabAlvo.includes('Nenhum')) return colabAlvo === nomeAluno;
            return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
        });
        Array.from(grid.children).forEach((card, idx) => {
            const item = treinamentosAluno[idx];
            if (!item || !window.isCursoSequencialTreinamento(item.data || {})) return;
            const data = item.data || {};
            const steps = window.lerConfiguracaoCursoSequencial(data[COURSE_FIELD] || '[]');
            const progress = window.obterProgressoCursoSequencial(item, nomeAluno);
            const notaMin = window.obterNotaMinimaCertificado ? window.obterNotaMinimaCertificado(data) : null;
            const okNota = notaMin === null || progress.notaFinal >= notaMin;
            const statusTexto = progress.finalizado ? (okNota ? `Concluído • Nota ${progress.notaFinal.toFixed(1)}` : `Concluído • Nota ${progress.notaFinal.toFixed(1)} (sem certificado)`) : `${progress.etapasConcluidas.length}/${steps.length} etapa(s) concluídas`;
            const cor = progress.finalizado ? (okNota ? '#38a169' : '#dd6b20') : '#3182ce';
            const descricao = String(data[COURSE_DESC_FIELD] || '').trim();
            const eleg = window.obterElegibilidadeCertificadoTreinamento ? window.obterElegibilidadeCertificadoTreinamento(item, nomeAluno) : { participacao: false, conclusao: false };
            const tipoCert = eleg.conclusao ? 'conclusao' : (eleg.participacao ? 'participacao' : '');
            card.innerHTML = `
                <div style="font-size:10px; opacity:.8; text-transform:uppercase; font-weight:700; margin-bottom:6px; color: var(--primary-color);"><i class="ri-graduation-cap-line"></i> CURSO SEQUENCIAL • ${window.escapeHTML(data['Pasta / Módulo'] || 'Cursos')}</div>
                <div style="font-size:18px; font-weight:700; line-height:1.25; margin-bottom:8px; color:#0f172a;">${window.escapeHTML(data['Título da Atividade'] || 'Curso')}</div>
                ${descricao ? `<div style="font-size:13px; color:#64748b; margin-bottom:12px; line-height:1.5;">${window.escapeHTML(descricao)}</div>` : ''}
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                    <span style="font-size:12px; font-weight:700; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 10px; border-radius:999px;">${steps.length} etapa(s)</span>
                    ${data['Pontos Valendo'] ? `<span style="font-size:12px; font-weight:700; color:#92400e; background:#fff7ed; border:1px solid #fdba74; padding:6px 10px; border-radius:999px;">${window.escapeHTML(data['Pontos Valendo'])} XP</span>` : ''}
                    ${notaMin !== null ? `<span style="font-size:12px; font-weight:700; color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; padding:6px 10px; border-radius:999px;">Nota mín.: ${window.escapeHTML(String(notaMin))}</span>` : ''}
                </div>
                <div style="margin-bottom:10px;">
                    <div style="height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden;"><div style="height:100%; width:${progress.finalizado ? 100 : progress.percentual}%; background:linear-gradient(90deg, #8B252C, #e53e3e);"></div></div>
                </div>
                <div style="font-size:13px; color:#334155; margin-bottom:14px;"><b>Status:</b> <span style="color:${cor}; font-weight:700;">${window.escapeHTML(statusTexto)}</span></div>
                <button onclick="window.abrirCursoSequencialAluno('${item.id}')" class="btn-hover color-11" style="width:100%; height:38px; border-radius:10px; font-size:13px; background:#3182ce; border:none;"> <i class="ri-play-circle-line"></i> ${progress.finalizado ? 'Ver resultado do curso' : progress.etapasConcluidas.length ? 'Continuar curso' : 'Iniciar curso'} </button>
                ${tipoCert ? `<button onclick="window.abrirModalCertificadoTreinamento('${item.id}','${tipoCert}')" class="btn-hover color-5" style="width:100%; height:36px; border-radius:10px; font-size:12px; margin-top:8px;"><i class="ri-award-line"></i> Certificado</button>` : ''}`;
            card.style.border = `2px solid ${cor}`;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.background = '#fff';
            card.style.borderRadius = '12px';
            card.style.padding = '16px';
        });
        window.recalcularResumoAlunoTrilha();
    };

    const oldRenderizarCardsCurso = window.renderizarCards;
    window.renderizarCards = function(colecaoNome, opts = {}) {
        const retorno = oldRenderizarCardsCurso(colecaoNome, opts);
        if (colecaoNome === 'treinamentos') {
            setTimeout(() => {
                window.garantirBotoesCursoSequencialAdmin();
                if (typeof window.renderizarAlertasCertificadosPendentes === 'function') window.renderizarAlertasCertificadosPendentes();
            }, 80);
        }
        return retorno;
    };

    window.abrirCadastroCurso = function() { window.abrirModalCursoSequencial(); };

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.garantirModalCursoSequencial();
            window.garantirModalCursoAluno();
            window.garantirBotoesCursoSequencialAdmin();
        }, 500);
    });
})();
