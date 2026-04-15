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

    // --- MÓDULO DE ATIVOS: Botão de QR Code ---
    if (colecaoNome === 'ativos' && isAdmin) {
        cardHtml += `<button type="button" onclick="window.imprimirEtiquetaAtivo('${docId}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 12px; margin-top: 12px; border: 1px solid var(--border-color);"><i class="ri-qr-code-line"></i> Imprimir Etiqueta QR</button>`;
    }
    
    // --- MÓDULO DE ATIVOS: Exibir o Histórico de alterações ---
    if (colecaoNome === 'ativos' && data.historico) {
        cardHtml += `<div style="margin-top:10px; font-size:11px; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0; max-height:80px; overflow-y:auto;"><strong><i class="ri-history-line"></i> Histórico:</strong><br>`;
        [...data.historico].reverse().forEach(h => { cardHtml += `<div style="border-bottom:1px dashed #cbd5e1; padding:3px 0;">${h}</div>`; });
        cardHtml += `</div>`;
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
window.verResultadosPesquisaRH = function(pesquisaId) {
    const p = window.todosPesquisasRH.find(x => x.id === pesquisaId);
    const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === pesquisaId);
    if(!p) return;

    let html = `<h4 style="margin-bottom:15px; color:var(--primary-color); font-size:18px;">${p.data.titulo}</h4>`;
    html += `<p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; background:#f8fafc; padding:10px; border-radius:8px;">Total de respostas coletadas: <b>${resps.length}</b></p>`;

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
    if(incompleto) return alert('Responda todas as perguntas para enviar a avaliação.');
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
        <div class="rh-profile-summary-card"><span>Avaliações Respondidas</span><strong>${resumo.totalAvaliacoes}</strong><small>coletas válidas</small></div>
        <div class="rh-profile-summary-card"><span>Média Global do Perfil</span><strong>${mediaGeral}</strong><small>escala 0 a 5</small></div>
        <div class="rh-profile-summary-card"><span>Qualidades / Skills</span><strong>${(resumo.medias['Qualidades'] || 0).toFixed(1)} / ${(resumo.medias['Skills'] || 0).toFixed(1)}</strong><small>forças-chave</small></div>
    `;
};

// ==========================================
// FUNÇÕES DO MÓDULO DE ATIVOS (QR Code, Gráfico e Câmera)
// ==========================================

let chartAtivosInst = null;
window.renderizarGraficoAtivos = function() {
    const ctx = document.getElementById('chart-ativos-status');
    if (!ctx) return;
    const ativos = window.dadosGlobaisAbas['ativos'] || [];
    const contagem = {};
    ativos.forEach(item => {
        const status = item.data['Status do Ativo'] || 'Não Informado';
        contagem[status] = (contagem[status] || 0) + 1;
    });

    if(chartAtivosInst) chartAtivosInst.destroy(); 
    chartAtivosInst = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: Object.keys(contagem), 
            datasets: [{ 
                data: Object.values(contagem), 
                backgroundColor: ['#38a169', '#ecc94b', '#e53e3e', '#3182ce', '#805ad5'] 
            }] 
        }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } 
    });
};

let html5QrcodeScanner = null;

window.iniciarLeitorQR = function() {
    const modal = document.getElementById('modal-camera-qr');
    if(modal) modal.style.display = 'flex';
    
    if (window.location.protocol === 'file:') {
        alert("⚠️ ATENÇÃO: A câmara foi bloqueada pelo navegador.\n\nPara a câmara funcionar, o sistema precisa estar a correr num ambiente seguro (HTTPS). Suba esta atualização para o seu GitHub Pages para poder testar o leitor de QR Code!");
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

                if (confirm("Tem certeza que deseja excluir permanentemente este item?")) {
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
        btnSalvar.addEventListener('click', async () => {
            if (btnSalvar.getAttribute('data-colecao') === 'treinamentos' && document.getElementById('quiz-questions-list')) {
                window.sincronizarQuizJSON();
            }
            
            const colecao = btnSalvar.getAttribute('data-colecao');
            const docId = document.getElementById('modal-doc-id').value;
            const config = configuracaoAbas[colecao];
            if(!config) return;
            
            const btnOriginal = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> A guardar...';
            
            let dados = { corCard: document.getElementById('card-color') ? document.getElementById('card-color').value : '#ffffff' };
            
            config.campos.forEach(c => {
                const val = document.getElementById('input-'+c);
                if((colecao === 'boletins' || colecao === 'treinamentos') && c === 'Para quais Setores?') {
                    const checks = Array.from(document.querySelectorAll('.check-setor:checked')).map(el => el.value);
                    dados[c] = checks.join(', ');
                } else if(val) { dados[c] = val.value; }
            });
            
            // --- HISTÓRICO DE ATIVOS ---
            if (colecao === 'ativos') {
                const acao = docId ? 'Editado/Movimentado' : 'Cadastrado';
                const logTexto = `${acao} em ${new Date().toLocaleString('pt-BR')} por ${emailLogado || 'Gestor'}`;
                if (docId) { dados.historico = window.arrayUnion(logTexto); } 
                else { dados.historico = [logTexto]; }
            }
            
            try {
                if(docId) { await window.updateDoc(window.doc(window.db, colecao, docId), dados); } else { await window.addDoc(window.collection(window.db, colecao), dados); }
                window.fecharModal();
            } catch(e) { alert("Erro ao guardar: " + e.message); }
            btnSalvar.innerHTML = btnOriginal;
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
    <p>Gerado em: <b>${new Date().toLocaleString('pt-BR')}</b></p>
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
