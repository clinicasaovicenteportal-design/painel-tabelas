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

let isAdmin = false; let abaAtual = 'home'; const EMAIL_GESTAO = "gestao@clinica.com";

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

        const registro = `${nomeLeitor} (${new Date().toLocaleString('pt-BR')})`;
        await window.updateDoc(window.doc(window.db, colecao, docId), { leituras: window.arrayUnion(registro) });

        if (colecao === 'boletins') window.renderizarListaBoletins();
        if (colecao === 'boletins-privados') window.renderizarListaPrivados();
        if (typeof window.verificarUrgentesHome === 'function') window.verificarUrgentesHome();
        alert('Assinatura registrada com sucesso!');
    } catch (e) { alert('Erro ao registrar assinatura: ' + (e?.message || 'falha desconhecida')); }
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
const APP_VERSION = '3.2.6';
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
        isAdmin = (user.email === EMAIL_GESTAO);
        const badge = document.getElementById('user-role-badge');
        if(badge) badge.textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        if(isAdmin) { if(badge) badge.classList.add('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = ''); } 
        else { if(badge) badge.classList.remove('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); }
        Object.keys(configuracaoAbas).forEach(idColecao => window.renderizarCards(idColecao));
        window.carregarConfiguracoes(); window.buscarClimaAraucaria();
        if(window.escutarRH) window.escutarRH();
        if (window.atualizarBottomQuickbar) window.atualizarBottomQuickbar();
    } else {
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
window.abrirSubAba = function(subAbaId) { document.getElementById('menu-contatos').style.display = 'none'; document.getElementById('sub-' + subAbaId).style.display = 'block'; };
window.voltarSubAba = function() { ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(id => { const sub = document.getElementById('sub-' + id); if(sub) sub.style.display = 'none'; }); document.getElementById('menu-contatos').style.display = 'grid'; };

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
    
    // MÁGICA: Alterar o título principal se for da aba de ramais
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
        
        // MÁGICA: Ocultar o Local e Setor do corpo do card de Ramal (já que já agrupamos e usamos no título)
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

window.renderizarListaGenerica = function(colecao) { const grid = document.getElementById(`grid-${colecao}-list`); if(!grid) return; grid.innerHTML = ''; const nomePasta = window[`pasta_${colecao}_Atual`]; const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral') === nomePasta); itensExibir.forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); }); };
window.renderizarPastasGenericas = function(colecao) {
    const grid = document.getElementById(`grid-${colecao}-folders`); if(!grid) return; grid.innerHTML = '';
    const config = configuracaoAbas[colecao]; const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];
    if (dadosAtuais.length === 0) { grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma pasta/módulo encontrado. Clique em "Novo" para criar.</p>'; return; }
    const obterNomePasta = (item) => { const bruto = item?.data?.[config.campoAgrupador] || item?.data?.Pacotes || item?.data?.['Pasta / Módulo'] || item?.data?.Especialidade || item?.data?.Convênio || item?.data?.Exame || item?.data?.Tipo || item?.data?.['Categoria do Exame'] || item?.data?.['Número da Tabela'] || 'Geral'; return String(bruto || 'Geral').trim() || 'Geral'; };
    const pastasUnicas = [...new Set(dadosAtuais.map(obterNomePasta))].sort((a,b)=>String(a).localeCompare(String(b))); 
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
    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = []; if(window.alunoLogado) window.renderizarTrilhaAluno(); }
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; window.verificarUrgentesHome(); window.renderizarGraficoHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; window.verificarUrgentesHome(); window.renderizarGraficoPrivadosGeral(); }
            if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) { window.dadosGlobaisAbas[colecaoNome] = []; if(abaAtual === colecaoNome) window.renderizarPastasGenericas(colecaoNome); }
            if(grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }
        let itens = []; snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() })); window.todosOsDadosDoSistema[colecaoNome] = itens;
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

        // ===== NOVA LÓGICA: AGRUPAR RAMAIS POR PRÉDIO =====
        if (colecaoNome === 'ramais') {
            grid.style.display = 'block'; 
            grid.innerHTML = '';
            const grupos = {};
            itens.forEach(item => {
                const local = item.data['Local ou Prédio'] || 'Outros Locais';
                if (!grupos[local]) grupos[local] = [];
                grupos[local].push(item);
            });

            Object.keys(grupos).sort().forEach(local => {
                let htmlGrupo = `<div style="margin: 25px 0 15px 0; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                    <div style="background: var(--primary-color); color: white; width: 35px; height: 35px; border-radius: 10px; display: flex; align-items: center; justify-content: center;"><i class="ri-building-4-fill" style="font-size: 18px;"></i></div>
                    <h3 style="color: var(--text-main); margin: 0; font-size: 18px; font-weight: 600;">${local}</h3>
                </div>
                <div class="cards-grid">`;
                
                grupos[local].sort((a,b) => String(a.data['Setor'] || '').localeCompare(String(b.data['Setor'] || ''))).forEach(item => {
                    htmlGrupo += window.gerarHTMLCard(colecaoNome, item.id, item.data);
                });
                
                htmlGrupo += `</div>`;
                grid.innerHTML += htmlGrupo;
            });
            return;
        }
        // ==================================================

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
    if (texto === 'oi' || texto === 'ol' || texto === 'ola' || texto.includes('bom dia') || texto.includes('boa tarde')) return "Ol! Sou a assistente virtual da clínica. Como posso ajudar? Busque por especialidades, médicos ou exames!";
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
    m.innerHTML = `<div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;"><header class="modal-header"><h3 id="resposta-titulo">Responder Atividade</h3><button onclick="document.getElementById('modal-resposta-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body" style="overflow-y: auto; flex:1;" id="area-perguntas-dinamicas"></div><input type="hidden" id="resposta-docid"><button onclick="window.enviarRespostaTreinamento()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #3182ce; color:white; border:none;"><i class="ri-send-plane-fill"></i> Enviar Resposta para Correção</button></div>`;
    document.body.appendChild(m);
}

if (!document.getElementById('modal-correcao-admin')) {
    const c = document.createElement('div'); c.id = 'modal-correcao-admin'; c.className = 'modal-overlay'; c.style.display = 'none'; c.style.zIndex = '10005';
    c.innerHTML = `<div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;"><header class="modal-header"><h3>Corrigir Resposta</h3><button onclick="document.getElementById('modal-correcao-admin').style.display='none'; document.getElementById('modal-leituras').style.display='flex';" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body" style="overflow-y: auto; flex:1;"><div id="correcao-respostas-aluno" style="margin-bottom:15px; background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; font-size:13px; white-space:pre-wrap;"></div><label style="font-size:12px; font-weight:600;">Nota Atribuída (XP):</label><input type="number" id="correcao-nota" class="form-input" style="margin-bottom:10px;"><label style="font-size:12px; font-weight:600;">Feedback / Observação do Gestor:</label><textarea id="correcao-feedback" class="form-input" style="height:80px; resize:vertical;"></textarea><input type="hidden" id="correcao-docid"><input type="hidden" id="correcao-nomealuno"></div><button onclick="window.salvarCorrecaoAdmin()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #38a169; color:white; border:none;"><i class="ri-check-line"></i> Salvar Correção</button></div>`;
    document.body.appendChild(c);
}

if (!document.getElementById('modal-feedback-aluno')) {
    const fb = document.createElement('div'); fb.id = 'modal-feedback-aluno'; fb.className = 'modal-overlay'; fb.style.display = 'none'; fb.style.zIndex = '10002';
    fb.innerHTML = `<div class="modal-box glass-effect" style="max-width: 500px;"><header class="modal-header"><h3>Feedback do Supervisor</h3><button onclick="document.getElementById('modal-feedback-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body"><div style="text-align:center; margin-bottom:15px;"><div style="font-size:40px; color:#38a169;"><i class="ri-award-fill"></i></div><h2 style="color:var(--primary-color);">Nota: <span id="feedback-nota"></span></h2></div><div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; color: var(--text-main); border-left: 4px solid var(--primary-color);"><span id="feedback-texto" style="white-space: pre-wrap;"></span></div></div></div>`;
    document.body.appendChild(fb);
}


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
            : renderEmpty('Todos os colaboradores do público-alvo j responderam.');
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
            ? lidos.map(nome => cardBase(`<strong style="display:block; color:var(--text-main);">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:var(--text-muted);">${window.escapeHTML(lidosMap.get(nome) || '')}</span>`, '#38a169')).join('')
            : renderEmpty('Nenhuma leitura registrada até o momento.');

        areaPend.innerHTML = faltantes.length
            ? faltantes.map(nome => cardBase(`<strong style="display:block; color:var(--text-main);">${window.escapeHTML(nome)}</strong><span style="font-size:12px; color:var(--text-muted);">Leitura pendente.</span>`, '#e53e3e')).join('')
            : renderEmpty('Nenhuma pendência restante.');
    }

    modal.style.display = 'flex';
};

window.sairPortalAluno = function() { window.alunoLogado = null; document.getElementById('ensino-dashboard-area').style.display = 'none'; document.getElementById('ensino-login-area').style.display = 'block'; document.getElementById('login-aluno-pin').value = ''; };

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
        let minhaResposta = null; respostas.forEach(r => { try { let obj = window.safeParseJSON(r, null); if(obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });

        const concluidos = d.leituras || []; const jaLeu = concluidos.some(txt => txt.startsWith(nomeAluno));
        const tipo = d['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo';
        const precisaResponder = tipo && (tipo.includes('Tarefa') || tipo.includes('Prova'));
        const pontosItem = parseInt(d['Pontos Valendo']) || 0;
        
        let jaFez = false; let statusTexto = 'Pendente'; let corStatus = '#e53e3e'; let iconeStatus = 'ri-time-line';

        if(precisaResponder) {
            if(minhaResposta) {
                jaFez = true;
                if(minhaResposta.nota && minhaResposta.nota !== "") { statusTexto = `Corrigido (Nota: ${minhaResposta.nota})`; corStatus = '#38a169'; iconeStatus = 'ri-award-fill'; pontos += parseInt(minhaResposta.nota) || 0; } 
                else { statusTexto = 'Aguardando Correção'; corStatus = '#ecc94b'; iconeStatus = 'ri-hourglass-line'; }
            } else { pendentes++; }
        } else {
            if(jaLeu) { jaFez = true; statusTexto = 'Concluído'; corStatus = '#38a169'; iconeStatus = 'ri-check-double-line'; pontos += pontosItem; } 
            else { pendentes++; }
        }

        let btnAcao = '';
        if(d['Link do Material (Se houver)']) btnAcao += `<button onclick="window.abrirMidiaFlutuante('${String(d['Link do Material (Se houver)']).trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-bottom: 8px;"><i class="ri-eye-line"></i> Acessar Material</button>`;

        if(!jaFez) {
            if(precisaResponder) {
                const confJSON = (d['Configuração da Avaliação'] || '[]').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                btnAcao += `<button onclick="window.abrirModalResposta('${docId}', '${confJSON}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> Responder Atividade</button>`;
            } else {
                btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
            }
        } else if (precisaResponder && minhaResposta && minhaResposta.nota !== "") {
            btnAcao += `<button onclick="window.verFeedback('${minhaResposta.nota}', \`${(minhaResposta.feedback || 'Sem comentrios.').replace(/'/g, "&apos;")}\`)" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
        }

        grid.innerHTML += `<div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;"><div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> MDULO: ${d['Pasta / Módulo']} | TIPO: ${tipo}</div><div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade']}</div><div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;"><b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br><b>Status:</b> <span style="color:${corStatus}; font-weight:600;"><i class="${iconeStatus}"></i> ${statusTexto}</span></div>${btnAcao}</div>`;
    });

    const ptsEl = document.getElementById('aluno-pontos'); const pendEl = document.getElementById('aluno-tarefas-pendentes');
    if(ptsEl) ptsEl.textContent = pontos; if(pendEl) pendEl.textContent = pendentes;
    
    if(window.renderizarPesquisasAluno) window.renderizarPesquisasAluno(); 
};

window.concluirTreinamento = async function(docId) {
    if(!window.alunoLogado) return;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?\nAo confirmar, os pontos serão computados na sua jornada.`)) return;
    const registro = `${nomeAluno} (Concluído em: ${new Date().toLocaleString('pt-BR')})`;
    try { await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registro) }); alert("Concluído com sucesso! +XP "); } catch(e) { alert("Erro ao salvar: " + e.message); }
};

window.abrirModalResposta = function(docId, configJSON) {
    document.getElementById('resposta-docid').value = docId;
    const area = document.getElementById('area-perguntas-dinamicas'); area.innerHTML = '';
    try {
        const jsonStr = String(configJSON).replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const perguntas = window.safeParseJSON(jsonStr, []);
        perguntas.forEach((q, idx) => {
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">`;
            html += `<div style="font-weight:600; font-size:13px; margin-bottom:10px;">${idx+1}. ${q.p}</div>`;
            html += `<input type="hidden" class="resp-tipo" value="${q.tipo}">`;
            html += `<input type="hidden" class="resp-pergunta-txt" value="${q.p}">`;
            if(q.tipo === 'descritiva') {
                html += `<textarea class="form-input resp-valor" style="height:80px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            } else {
                q.ops.forEach((op, oIdx) => {
                    if(op.trim() !== '') { html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:5px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${op}"> ${op}</label>`; }
                });
            }
            html += `</div>`; area.innerHTML += html;
        });
    } catch(e) { area.innerHTML = '<p>Erro ao carregar perguntas do sistema.</p>'; }
    document.getElementById('modal-resposta-aluno').style.display = 'flex';
};

window.enviarRespostaTreinamento = async function() {
    if(!window.alunoLogado) return;
    const docId = document.getElementById('resposta-docid').value;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const blocos = document.querySelectorAll('.pergunta-aluno-bloco');
    let respostasFinais = [];
    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.resp-tipo').value;
        const p = bloco.querySelector('.resp-pergunta-txt').value;
        let r = '';
        if(tipo === 'descritiva') { r = bloco.querySelector('.resp-valor').value.trim(); } 
        else { const checked = bloco.querySelector('.resp-radio:checked'); r = checked ? checked.value : 'Nenhuma opção selecionada'; }
        respostasFinais.push({ pergunta: p, resposta: r });
    });
    const respostaObj = { nome: nomeAluno, data: new Date().toLocaleString('pt-BR'), respostas: respostasFinais, nota: "", feedback: "" };
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { respostas_alunos: window.arrayUnion(JSON.stringify(respostaObj)) });
        alert("Sua resposta foi enviada para correção do supervisor! ");
        document.getElementById('modal-resposta-aluno').style.display = 'none';
        window.renderizarTrilhaAluno(); 
    } catch(e) { alert("Erro ao enviar resposta: " + e.message); }
};

window.verFeedback = function(nota, feedback) {
    document.getElementById('feedback-nota').textContent = nota; document.getElementById('feedback-texto').textContent = feedback;
    document.getElementById('modal-feedback-aluno').style.display = 'flex';
};

window.abrirCorrecaoAdmin = function(docId, nomeAluno) {
    const data = window.todosTreinamentosData.find(i=>i.id===docId)?.data;
    if(!data) return;
    const respostas = data.respostas_alunos || [];
    let respObj = null; let respStr = null;
    respostas.forEach(r => { try { let o = window.safeParseJSON(r, null); if(o && o.nome === nomeAluno) { respObj = o; respStr = r; } } catch(e){} });
    if(!respObj) return;
    
    let html = `<b>Aluno:</b> ${nomeAluno} <br><b>Enviado em:</b> ${respObj.data}<br><br>`;
    (respObj.respostas || []).forEach((r, i) => { html += `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><b>Q${i+1}:</b> ${r.pergunta}<br><span style="color:#3182ce;">R: ${r.resposta}</span></div>`; });
    
    document.getElementById('correcao-respostas-aluno').innerHTML = html;
    document.getElementById('correcao-nota').value = respObj.nota || '';
    document.getElementById('correcao-feedback').value = respObj.feedback || '';
    document.getElementById('correcao-docid').value = docId;
    document.getElementById('correcao-nomealuno').value = nomeAluno;
    
    document.getElementById('modal-correcao-admin').style.display = 'flex';
    document.getElementById('modal-leituras').style.display = 'none';
};

window.salvarCorrecaoAdmin = async function() {
    const docId = document.getElementById('correcao-docid').value;
    const nomeAluno = document.getElementById('correcao-nomealuno').value;
    const nota = document.getElementById('correcao-nota').value;
    const fb = document.getElementById('correcao-feedback').value;
    
    const data = window.todosTreinamentosData.find(i=>i.id===docId)?.data;
    const respostas = data.respostas_alunos || [];
    let respObjAntigo = null; let respStrAntiga = null;
    respostas.forEach(r => { try { let o = window.safeParseJSON(r, null); if(o && o.nome === nomeAluno) { respObjAntigo = o; respStrAntiga = r; } } catch(e){} });
    if(!respObjAntigo) return;
    
    let respNovaObj = { ...respObjAntigo, nota: nota, feedback: fb };
    let respStrNova = JSON.stringify(respNovaObj);
    try {
        const ref = window.doc(window.db, 'treinamentos', docId);
        await window.updateDoc(ref, { respostas_alunos: window.arrayRemove(respStrAntiga) });
        await window.updateDoc(ref, { respostas_alunos: window.arrayUnion(respStrNova) });
        alert("Correção salva com sucesso!");
        document.getElementById('modal-correcao-admin').style.display = 'none';
        document.getElementById('modal-leituras').style.display = 'flex'; // Volta pra lista
    } catch(e) { alert("Erro ao salvar: "+e.message); }
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
            html += `<textarea class="form-input resp-q-val" style="height:90px; resize:vertical; margin:0;" placeholder="Sua resposta franca e sincera."></textarea>`;
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
            alert('Por favor, responda todas as perguntas antes de enviar!');
            return;
        }

        const antiga = (window.todosRespostasRH || []).find(item => item?.data?.pesquisaId === pesquisaId && item?.data?.nome === nomeAluno);

        const payload = { pesquisaId, nome: nomeAluno, respostas, data: new Date().toISOString() };

        if (antiga?.id) { await window.updateDoc(window.doc(window.db, 'rh-respostas-pesquisa', antiga.id), payload); } 
        else { await window.addDoc(window.collection(window.db, 'rh-respostas-pesquisa'), payload); }

        alert('Muito obrigado pelas suas respostas! Isso nos ajuda a crescer juntos.');
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
    
    return medias;
};

// ==========================================
// RENDERIZAÇÃO DO GRÁFICO DE RADAR (PERFIL)
// ==========================================
window.renderizarGraficoPerfilProfissional = function(nome) {
    const resumo = window.obterResumoPerfilColaborador(nome);
    const ctx = document.getElementById('chart-perfil-profissional');
    if(!ctx) return;
    
    // Destrói o gráfico anterior se existir para não sobrepor
    if(window.rhPerfilRadarChart) window.rhPerfilRadarChart.destroy();
    
    window.rhPerfilRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{
                label: `Média de Perfil: ${nome}`,
                data: Object.values(resumo),
                backgroundColor: 'rgba(49, 130, 206, 0.2)', // Cor primária transparente (Azul)
                borderColor: 'rgba(49, 130, 206, 1)',
                pointBackgroundColor: 'rgba(49, 130, 206, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(49, 130, 206, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 5,
                    ticks: { stepSize: 1, backdropColor: 'transparent' }
                }
            },
            plugins: {
                legend: { display: true, position: 'bottom' }
            }
        }
    });
};

// ==========================================
// EVENTOS GERAIS E FECHAMENTO DE MODAIS
// ==========================================

// Fechar modais ao clicar fora da caixa (no overlay escuro)
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        
        // Se fechar o modal de mídia flutuante ou navegador interno, limpa o iframe para parar vídeos/áudios
        if (event.target.id === 'modal-media') {
            const iframe = document.getElementById('iframe-media');
            if(iframe) iframe.src = 'about:blank';
        }
    }
};

// Ocultar a janela de chat caso o usuário aperte "Esc"
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        const modais = document.querySelectorAll('.modal-overlay');
        modais.forEach(modal => {
            if(modal.style.display === 'flex' || modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
        
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow && chatWindow.style.display === 'flex') {
            window.toggleChat();
        }
    }
});
