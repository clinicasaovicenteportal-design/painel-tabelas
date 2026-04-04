// ==========================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ==========================================
const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor da Clínica', 'PIN de Acesso (Treinamentos)'] },
    
    'treinamentos': { 
        titulo: 'Material de Ensino', 
        campos: ['Título da Atividade', 'Pasta / Módulo', 'Tipo (Vídeo, PDF, Tarefa, Prova)', 'Link do Material (Se houver)', 'Colaborador Específico (Opcional)', 'Para quais Setores?', 'Pontos Valendo', 'Configuração da Avaliação'], 
        campoAgrupador: 'Pasta / Módulo', 
        icone: 'ri-book-read-fill' 
    },

    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA', 'Exibir Logo do Convenio', 'Link da Foto do Profissional'], campoAgrupador: 'Especialidade', icone: 'ri-team-fill' }, 
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Aceita o Servico?', 'Observações'], campoAgrupador: 'Convênio', icone: 'ri-shield-cross-fill' },
    
    'ultrassom': { titulo: 'Exame de Ultrassom', campos: ['Exame', 'Código', 'Profissionais que realizam (Opcional)', 'Restrição de Idade', 'Observação'], campoAgrupador: 'Exame', icone: 'ri-pulse-line' },
    'consultas': { titulo: 'Consulta / Procedimento', campos: ['Tipo', 'Código', 'Descrição', 'Valor', 'Profissionais que realizam (Opcional)', 'Observações'], campoAgrupador: 'Tipo', icone: 'ri-stethoscope-line' },
    'exames-imagem': { titulo: 'Exame de Imagem', campos: ['Categoria do Exame', 'Código', 'Descrição', 'Valor', 'Prazo de Laudo', 'Profissionais que realizam (Opcional)', 'Onde encontrar resultado', 'Observações', 'Convênios'], campoAgrupador: 'Categoria do Exame', icone: 'ri-body-scan-line' },
    
    'pacotes': { titulo: 'Pacote PS', campos: ['Descrição', 'Valor ou Informacao', 'O que está incluso', 'Observações', 'Pacotes', 'Kit'], campoAgrupador: 'Pacotes', icone: 'ri-first-aid-kit-line' },
    'institutos': { titulo: 'Instituto Tabela', campos: ['Número da Tabela', 'Valor da Tabela', 'Profissional', 'Especialidade', 'Restrição de Idade', 'CRM', 'CBO', 'URA', 'Outros'], campoAgrupador: 'Número da Tabela', icone: 'ri-building-line' },
    'remocoes': { titulo: 'Remoção', campos: ['Nome do Lugar', 'Números (Separe por vírgula)', 'Local e Link Maps', 'Observações Importantes'] },
    'ramais': { titulo: 'Ramal', campos: ['Local ou Prédio', 'Setor', 'Número do Ramal', 'Observações'] },
    'emails': { titulo: 'E-mail', campos: ['Descrição do E-mail', 'Setor'] },
    'contatos-gerais': { titulo: 'Contato Geral', campos: ['Descrição (Lugar ou Pessoa)', 'Número'] },
    'contatos-convenios': { titulo: 'Contato Convênio', campos: ['Nome do Convênio', 'Número'] },
    'senhas': { titulo: 'Senha de Acesso', campos: ['Convênio ou Sistema', 'Link de Acesso', 'Senha', 'Local de Acesso Permitido'] },
    'boletins': { titulo: 'Boletim Informativo', campos: ['Título do Informativo', 'Para quais Setores?', 'Tipo (Urgente, Norma, Regra, etc)', 'Data de Publicação', 'Motivo', 'Links dos Materiais (1 por linha)'] },
    'boletins-privados': { titulo: 'Informativo Privado', campos: ['Para qual Colaborador?', 'Título do Documento', 'Data de Publicação', 'Tipo (Urgente, Norma, Regra, etc)', 'Motivo', 'Links dos Materiais (1 por linha)'] }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVphiwmF-SBFyYYkjV-QvTvSFIigzIsoc",
    authDomain: "painel-tabelas.firebaseapp.com",
    projectId: "painel-tabelas",
    storageBucket: "painel-tabelas.firebasestorage.app",
    messagingSenderId: "189251122569",
    appId: "1:189251122569:web:2902e8c47235d826af9d58"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {});
const auth = getAuth(app);

window.db = db; window.updateDoc = updateDoc; window.doc = doc; window.arrayUnion = arrayUnion; window.arrayRemove = arrayRemove; window.addDoc = addDoc; window.collection = collection; window.deleteDoc = deleteDoc; window.onSnapshot = onSnapshot; window.setDoc = setDoc;

let isAdmin = false; let abaAtual = 'home'; let emailLogado = ""; 

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
        if (!nomeLeitor) { alert('Selecione ou informe o colaborador para registrar a leitura.'); return; }

        const base = colecao === 'boletins' ? (window.todosBoletinsData || []) : (window.todosPrivadosData || []);
        const item = base.find(i => i.id === docId);
        if (!item) { alert('Documento não encontrado.'); return; }

        const leituras = Array.isArray(item.data?.leituras) ? item.data.leituras : [];
        const jaExiste = leituras.some(reg => window.extrairNomeRegistro(reg) === nomeLeitor);
        if (jaExiste) { alert('Essa leitura já foi registrada.'); return; }

        const registro = `${nomeLeitor} (${new Date().toLocaleString('pt-BR')} | Por: ${emailLogado})`;
        await window.updateDoc(window.doc(window.db, colecao, docId), { leituras: window.arrayUnion(registro) });

        if (colecao === 'boletins') window.renderizarListaBoletins();
        if (colecao === 'boletins-privados') window.renderizarListaPrivados();
        if (typeof window.verificarUrgentesHome === 'function') window.verificarUrgentesHome();
        alert('Assinatura registrada com sucesso!');
    } catch (e) { alert('Erro ao registrar assinatura: ' + (e?.message || 'falha desconhecida')); }
};

window.removerAssinaturaLeitura = async function(docId, colecao, registroExato) {
    if(!confirm('Tem certeza que deseja DESFAZER esta assinatura?')) return;
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
const APP_VERSION = '3.3.0';
let loginEmAndamento = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try { const regs = await navigator.serviceWorker.getRegistrations(); for (const reg of regs) await reg.unregister(); } catch (err) { }
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
    if (btn) { btn.disabled = true; btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Autenticando..."; }

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

setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);

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

window.abrirPastaGenerica = function(colecao, valorPasta, docIdDestino = null) { window[`pasta_${colecao}_Atual`] = valorPasta; document.getElementById(`${colecao}-view-folders`).style.display = 'none'; document.getElementById(`${colecao}-view-list`).style.display = 'block'; const titleEl = document.getElementById(`titulo-pasta-${colecao}`); if(titleEl && configuracaoAbas[colecao]) titleEl.innerHTML = `<i class="${configuracaoAbas[colecao].icone}"></i> Pasta: ${valorPasta}`; window.renderizarListaGenerica(colecao); if(docIdDestino) window.destacarCard(docIdDestino); };
window.fecharPastaGenerica = function(colecao) { window[`pasta_${colecao}_Atual`] = null; document.getElementById(`${colecao}-view-folders`).style.display = 'block'; document.getElementById(`${colecao}-view-list`).style.display = 'none'; window.renderizarPastasGenericas(colecao); };
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

window.adicionarPerguntaBuilder = function(tipo, objAntigo = null) {
    const container = document.getElementById('quiz-questions-list'); if(!container) return;
    const div = document.createElement('div'); div.className = 'quiz-item-box'; div.style = "background: white; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px; position: relative;";
    
    let html = `<button type="button" onclick="this.parentElement.remove(); window.sincronizarQuizJSON();" style="position:absolute; top:10px; right:10px; background:none; border:none; color:red; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>`;
    html += `<input type="hidden" class="quiz-tipo" value="${tipo}">`;
    html += `<label style="font-size:12px; font-weight:600;">Pergunta / Enunciado (${tipo === 'descritiva' ? 'Resposta em Texto' : 'Múltipla Escolha'}):</label>`;
    html += `<textarea class="form-input quiz-pergunta" style="height:60px; margin-bottom:10px;" onkeyup="window.sincronizarQuizJSON()">${objAntigo ? objAntigo.p : ''}</textarea>`;

    if(tipo === 'multipla') {
        const ops = objAntigo ? objAntigo.ops : ['','','','']; const corr = objAntigo ? objAntigo.correta : '0';
        html += `<label style="font-size:12px; font-weight:600;">Opções de Resposta:</label>`;
        ['A', 'B', 'C', 'D'].forEach((letra, idx) => { html += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;"><span style="font-weight:bold; width:20px;">${letra})</span><input type="text" class="form-input quiz-op" style="margin:0;" value="${ops[idx] || ''}" onkeyup="window.sincronizarQuizJSON()"></div>`; });
        html += `<label style="font-size:12px; font-weight:600; margin-top:10px; display:block;">Qual é a opção CORRETA?</label>`;
        html += `<select class="form-input quiz-correta" onchange="window.sincronizarQuizJSON()"><option value="0" ${corr==='0'?'selected':''}>Opção A</option><option value="1" ${corr==='1'?'selected':''}>Opção B</option><option value="2" ${corr==='2'?'selected':''}>Opção C</option><option value="3" ${corr==='3'?'selected':''}>Opção D</option></select>`;
    }
    div.innerHTML = html; container.appendChild(div);
};

window.carregarPerguntasBuilder = function() {
    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    if(!inputOculto || !inputOculto.value || inputOculto.value === '') return;
    try {
        const jsonStr = inputOculto.value.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const arr = window.safeParseJSON(jsonStr, []);
        arr.forEach(q => window.adicionarPerguntaBuilder(q.tipo, q));
    } catch(e) {}
};

window.sincronizarQuizJSON = function() {
    const blocos = document.querySelectorAll('.quiz-item-box');
    const arrayFinal = [];
    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.quiz-tipo').value;
        const p = bloco.querySelector('.quiz-pergunta').value.replace(/"/g, "'");
        if(tipo === 'descritiva') { arrayFinal.push({ tipo, p }); } 
        else {
            const opsInputs = bloco.querySelectorAll('.quiz-op');
            const ops = Array.from(opsInputs).map(inpt => inpt.value.replace(/"/g, "'"));
            const correta = bloco.querySelector('.quiz-correta').value;
            arrayFinal.push({ tipo, p, ops, correta });
        }
    });
    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    if(inputOculto) { inputOculto.value = JSON.stringify(arrayFinal).replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
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
        else if(colecao === 'treinamentos' && campo === 'Configuração da Avaliação') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Perguntas da Prova ou Enunciado da Tarefa:</label>`;
            htmlCampos += `<input type="hidden" id="input-${campo}" value="${valorAntigo}">`;
            htmlCampos += `<div id="quiz-questions-list"></div>`;
            htmlCampos += `<div style="display:flex; gap:10px; margin-bottom: 15px;"><button type="button" onclick="window.adicionarPerguntaBuilder('descritiva')" class="btn-hover color-8" style="flex:1; height:35px; font-size:11px;">+ Adicionar Texto/Tarefa</button><button type="button" onclick="window.adicionarPerguntaBuilder('multipla')" class="btn-hover color-5" style="flex:1; height:35px; font-size:11px;">+ Adicionar Múltipla Escolha</button></div>`;
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

    if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    cardHtml += `</div>`; return cardHtml;
};

window.renderizarListaGenerica = function(colecao) { 
    const grid = document.getElementById(`grid-${colecao}-list`); 
    if(!grid) return; 
    grid.innerHTML = ''; 
    const nomePasta = window[`pasta_${colecao}_Atual`]; 
    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral') === nomePasta); 
    itensExibir.sort((a, b) => String(a.data[configuracaoAbas[colecao].campos[0]] || '').toLowerCase().localeCompare(String(b.data[configuracaoAbas[colecao].campos[0]] || '').toLowerCase()));
    itensExibir.forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); }); 
};

window.renderizarPastasGenericas = function(colecao) {
