// ==========================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ==========================================
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
    'boletins-privados': { titulo: 'Informativo Privado', campos: ['Para qual Colaborador?', 'Título do Documento', 'Data de Publicação', 'Tipo (Urgente, Norma, Regra, etc)', 'Motivo', 'Links dos Materiais (1 por linha)'] },
    
    // --- NOVO MÓDULO: CONTROLE DE ATIVOS ---
    'ativos': { 
        titulo: 'Ativo / Equipamento', 
        campos: ['Nome do Equipamento', 'Categoria', 'Número de Patrimônio', 'Localização / Setor', 'Responsável', 'Status do Ativo', 'Observações'], 
        campoAgrupador: 'Categoria', 
        icone: 'ri-qr-code-line' 
    }
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
const APP_VERSION = '3.3.1';
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
    if(!grid) return; 
    grid.innerHTML = ''; 
    const nomePasta = window[`pasta_${colecao}_Atual`]; 
    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral') === nomePasta); 
    itensExibir.sort((a, b) => String(a.data[configuracaoAbas[colecao].campos[0]] || '').toLowerCase().localeCompare(String(b.data[configuracaoAbas[colecao].campos[0]] || '').toLowerCase()));
    itensExibir.forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); }); 
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
                    await window.updateDoc(window.doc(window.db, colecao, docId), dados); 
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
