// ==========================================
// BLOQUEIO NUCLEAR CONTRA PISCADAS DE TELA
// ==========================================
window.addEventListener('submit', function(e) {
    e.preventDefault(); 
}, true);

// ==========================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ==========================================
const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor da Clínica', 'PIN de Acesso (Treinamentos)'] },
    
    'treinamentos': { 
        titulo: 'Material de Ensino', 
        campos: ['Título da Atividade', 'Pasta / Módulo', 'Tipo (Vídeo, PDF, Tarefa, Prova)', 'Link do Material (Se houver)', 'Colaborador Específico (Opcional)', 'Enunciado ou Perguntas (Provas/Tarefas)', 'Para quais Setores?', 'Pontos Valendo', 'Configuração da Avaliação'], 
        campoAgrupador: 'Pasta / Módulo', 
        icone: 'ri-book-read-fill' 
    },

    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA', 'Exibir Logo do Convenio', 'Link da Foto do Profissional'], campoAgrupador: 'Especialidade', icone: 'ri-team-fill' }, 
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Aceita o Servico?', 'Observações'], campoAgrupador: 'Convênio', icone: 'ri-shield-cross-fill' },
    'ultrassom': { titulo: 'Exame de Ultrassom', campos: ['Exame', 'Código', 'Profissional', 'Restrição de Idade', 'Observação'], campoAgrupador: 'Exame', icone: 'ri-pulse-line' },
    'consultas': { titulo: 'Consulta / Procedimento', campos: ['Tipo', 'Outro Subtítulo da Pasta (Opcional)', 'Código', 'Descrição', 'Procedimentos Inclusos (1 por linha)', 'Valor', 'Observações'], campoAgrupador: 'Tipo', icone: 'ri-stethoscope-line' },
    'pacotes': { titulo: 'Pacote PS', campos: ['Descrição', 'Valor ou Informacao', 'O que está incluso', 'Observações', 'Pacotes', 'Kit'] },
    'exames-imagem': { titulo: 'Exame de Imagem', campos: ['Categoria do Exame', 'Código', 'Descrição', 'Valor', 'Prazo de Laudo', 'Onde encontrar resultado', 'Observações', 'Convênios'], campoAgrupador: 'Categoria do Exame', icone: 'ri-body-scan-line' },
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
import { initializeFirestore, persistentLocalCache, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVphiwmF-SBFyYYkjV-QvTvSFIigzIsoc",
    authDomain: "painel-tabelas.firebaseapp.com",
    projectId: "painel-tabelas",
    storageBucket: "painel-tabelas.firebasestorage.app",
    messagingSenderId: "189251122569",
    appId: "1:189251122569:web:2902e8c47235d826af9d58"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { localCache: persistentLocalCache() });
const auth = getAuth(app);

window.db = db;
window.updateDoc = updateDoc;
window.doc = doc;
window.arrayUnion = arrayUnion;
window.arrayRemove = arrayRemove;

let isAdmin = false;
let abaAtual = 'home'; 
const EMAIL_GESTAO = "gestao@clinica.com";

let listaColaboradoresGlobal = []; 
let locaisGlobais = []; 
let setoresGlobais = [];
let especialidadesGlobais = []; 
let motivosGlobais = [];
let imagemPadraoPastas = ""; 

window.todosBoletinsData = [];
window.todosPrivadosData = [];
window.todosTreinamentosData = []; 
window.dadosGlobaisAbas = {}; 
window.todosOsDadosDoSistema = {}; 
window.dadosBoletins = {}; 
window.pastaBoletimAtual = null;
window.pastaPrivadoAtual = null;

window.alunoLogado = null; 

window.corStatusPendente = "#e53e3e";
window.corStatusConcluido = "#38a169";

let chartBoletinsInst = null;
let chartPrivadosInst = null;
let chartHomeInst = null;            
let chartPrivadosGeralInst = null;   

const paletaGradientes = [
    { valor: "#ffffff", nome: "Branco Padrão", dark: false },
    { valor: "#e53e3e", nome: "Vermelho Sólido", dark: true },
    { valor: "#3182ce", nome: "Azul Sólido", dark: true },
    { valor: "#38a169", nome: "Verde Sólido", dark: true },
    { valor: "#ecc94b", nome: "Amarelo Sólido", dark: false },
    { valor: "#805ad5", nome: "Roxo Sólido", dark: true },
    { valor: "linear-gradient(to right, #fc6076, #ff9a44, #ef9d43, #e75516)", nome: "Laranja", dark: true },
    { valor: "linear-gradient(to right, #0ba360, #3cba92, #30dd8a, #2bb673)", nome: "Verde Claro", dark: true },
    { valor: "linear-gradient(to right, #6253e1, #852D91, #A3A1FF, #F24645)", nome: "Roxo/Azul", dark: true },
    { valor: "linear-gradient(to right, #29323c, #485563, #2b5876, #4e4376)", nome: "Escuro", dark: true },
    { valor: "linear-gradient(to right, #eb3941, #f15e64, #e14e53, #e2373f)", nome: "Vermelho HD", dark: true }
];

// ==========================================
// 2. LÓGICA DE LOGIN BLINDADA
// ==========================================

window.efetuarLogin = function(e) {
    if(e && e.preventDefault) e.preventDefault(); 
    
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const btn = document.getElementById('btn-login');
    
    if(!email || !senha) {
        alert("Por favor, preencha o e-mail e a senha.");
        return;
    }
    
    const textoOriginal = btn ? btn.innerHTML : "Entrar";
    if(btn) btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Autenticando...";
    
    signInWithEmailAndPassword(auth, email, senha)
        .then(() => {
            if(btn) btn.innerHTML = textoOriginal;
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao entrar: E-mail ou Senha incorretos.\nDetalhe: " + err.message);
            if(btn) btn.innerHTML = textoOriginal;
        });
}

const chatFabInit = document.getElementById('chat-fab');
const chatWinInit = document.getElementById('chat-window');
if(chatFabInit) chatFabInit.style.display = 'none';
if(chatWinInit) chatWinInit.style.display = 'none';

const btnLoginInit = document.getElementById('btn-login');
const formLoginInit = document.getElementById('form-login');
if(btnLoginInit) btnLoginInit.onclick = window.efetuarLogin;
if(formLoginInit) formLoginInit.onsubmit = window.efetuarLogin;

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const chatFab = document.getElementById('chat-fab');
    const chatWin = document.getElementById('chat-window');
    
    if (user) {
        if(loginScreen) loginScreen.style.display = 'none';
        if(dashboardScreen) dashboardScreen.style.display = 'flex';
        
        if(chatFab) chatFab.style.display = 'flex';
        
        isAdmin = (user.email === EMAIL_GESTAO);
        
        const badge = document.getElementById('user-role-badge');
        if(badge) badge.textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        
        if(isAdmin) {
            if(badge) badge.classList.add('admin');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        } else {
            if(badge) badge.classList.remove('admin');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
        
        Object.keys(configuracaoAbas).forEach(idColecao => window.renderizarCards(idColecao));
        window.carregarConfiguracoes(); 
        window.buscarClimaAraucaria(); 
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(dashboardScreen) dashboardScreen.style.display = 'none';
        if(chatFab) chatFab.style.display = 'none';
        if(chatWin) chatWin.style.display = 'none';
    }
});


// ==========================================
// 3. DECLARAÇÃO DE TODAS AS FUNÇÕES GLOBAIS
// ==========================================

setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
const frases = ["O sucesso é a soma de pequenos esforços.", "A empatia é a medicina que o mundo precisa.", "Trabalho em equipe multiplica o sucesso."];
const fm = document.getElementById('frase-dia'); if(fm) fm.innerText = frases[Math.floor(Math.random() * frases.length)];

window.formatarLinkImagem = function(link) {
    if (!link || link.includes('file:///')) return null;
    if (link.includes("drive.google.com")) {
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return link;
};

window.buscarClimaAraucaria = async function() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.59&longitude=-49.41&current_weather=true');
        const data = await response.json();
        const clima = data.current_weather;
        const wDeg = document.getElementById('weather-deg');
        if(wDeg) wDeg.textContent = Math.round(clima.temperature);
        let desc = "Céu Limpo"; let icon = "ri-sun-fill";
        if(clima.weathercode >= 1 && clima.weathercode <= 3) { desc = "Parcialmente Nublado"; icon = "ri-sun-cloudy-fill"; }
        if(clima.weathercode === 45 || clima.weathercode === 48) { desc = "Neblina"; icon = "ri-foggy-fill"; }
        if(clima.weathercode >= 51 && clima.weathercode <= 67) { desc = "Chuva Leve"; icon = "ri-drizzle-fill"; }
        if(clima.weathercode >= 71 && clima.weathercode <= 77) { desc = "Chuva/Neve"; icon = "ri-snowy-line"; }
        if(clima.weathercode >= 80 && clima.weathercode <= 82) { desc = "Pancadas de Chuva"; icon = "ri-showers-fill"; }
        if(clima.weathercode >= 95) { desc = "Tempestade"; icon = "ri-thunderstorms-fill"; }
        
        const wDesc = document.getElementById('weather-desc');
        const wIcon = document.getElementById('weather-icon-class');
        if(wDesc) wDesc.textContent = desc; 
        if(wIcon) wIcon.className = icon;
    } catch(e) { 
        const wDesc = document.getElementById('weather-desc');
        if(wDesc) wDesc.textContent = "Clima indisponível"; 
    }
};

window.obterPublicoAlvo = function(setoresAlvoString, colabEsp = '') {
    if(colabEsp && String(colabEsp).trim() !== '' && !String(colabEsp).includes('Nenhum')) return [String(colabEsp).trim()];
    if (!setoresAlvoString || String(setoresAlvoString).includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
    const setoresMarcados = String(setoresAlvoString).split(',').map(s => s.trim());
    return listaColaboradoresGlobal.filter(c => setoresMarcados.includes(c.setor)).map(c => c.nome);
};

window.verificarUrgentesHome = function() {
    const area = document.getElementById('area-alertas-home');
    if(!area) return;
    area.innerHTML = '';
    let totalUrgentesPendentes = 0;

    const verificarItens = (lista, ehPrivado) => {
        lista.forEach(item => {
            const data = item.data;
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
            if(!isUrgente) return;
            const publico = ehPrivado ? [data['Para qual Colaborador?']] : window.obterPublicoAlvo(data['Para quais Setores?']);
            const lidosNomes = (data.leituras || []).map(txt => txt.split(' (')[0]);
            const faltam = publico.filter(n => !lidosNomes.includes(n)).length;
            if (faltam > 0) totalUrgentesPendentes++;
        });
    };

    verificarItens(window.todosBoletinsData, false);
    if(isAdmin) verificarItens(window.todosPrivadosData, true);

    if(totalUrgentesPendentes > 0) {
        area.innerHTML = `<div class="alerta-urgente-home" onclick="window.irParaAba('boletins')"><i class="ri-alarm-warning-fill"></i><div><strong>Atenção! Informativos Urgentes</strong><span>Existem <b>${totalUrgentesPendentes}</b> informativos com prioridade urgente aguardando assinatura.</span></div></div>`;
    }
};

window.irParaAba = function(aba) { 
    const btn = document.querySelector(`.nav-btn[data-tab='${aba}']`); 
    if(btn) btn.click(); 
};

window.abrirSubAba = function(subAbaId) { 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'none'; 
    const sub = document.getElementById('sub-' + subAbaId); if(sub) sub.style.display = 'block'; 
};

window.voltarSubAba = function() { 
    ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(id => {
        const sub = document.getElementById('sub-' + id); if(sub) sub.style.display = 'none';
    }); 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'grid'; 
};

window.abrirPastaGenerica = function(colecao, valorPasta) {
    window[`pasta_${colecao}_Atual`] = valorPasta;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    const titleEl = document.getElementById(`titulo-pasta-${colecao}`);
    if(foldEl) foldEl.style.display = 'none';
    if(listEl) listEl.style.display = 'block';
    if(titleEl && configuracaoAbas[colecao]) titleEl.innerHTML = `<i class="${configuracaoAbas[colecao].icone}"></i> Pasta: ${valorPasta}`;
    window.renderizarListaGenerica(colecao);
};

window.fecharPastaGenerica = function(colecao) {
    window[`pasta_${colecao}_Atual`] = null;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    if(listEl) listEl.style.display = 'none';
    if(foldEl) foldEl.style.display = 'block';
    window.renderizarPastasGenericas(colecao);
};

window.abrirPastaBoletim = function(pasta) {
    window.pastaBoletimAtual = pasta;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    const title = document.getElementById('titulo-pasta-boletins');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-open-line"></i> Setor: ${pasta}`;
    window.renderizarListaBoletins();
};

window.fecharPastaBoletim = function() {
    window.pastaBoletimAtual = null;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    window.renderizarPastasBoletins();
};

window.abrirPastaPrivado = function(colabNome) {
    window.pastaPrivadoAtual = colabNome;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    const title = document.getElementById('titulo-pasta-privados');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-user-line"></i> ${colabNome}`;
    window.renderizarListaPrivados();
};

window.fecharPastaPrivado = function() {
    window.pastaPrivadoAtual = null;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    window.renderizarPastasPrivados();
};

window.atualizarGrafico = function(canvasId, refInstancia, dados, labelGrafico) {
    const ctx = document.getElementById(canvasId);
    if(!ctx) return refInstancia;
    const contagemMotivos = {};
    dados.forEach(b => { const m = b.data['Motivo'] || 'Sem Motivo'; contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; });
    
    const paletaGrafico = [
        '#3182ce', '#38a169', '#ecc94b', '#e53e3e', '#805ad5', '#38b2ac', 
        '#dd6b20', '#ed64a6', '#4a5568', '#667eea', '#48bb78', '#ed8936'
    ];

    if(refInstancia) refInstancia.destroy(); 
    return new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: Object.keys(contagemMotivos), 
            datasets: [{ 
                label: labelGrafico, 
                data: Object.values(contagemMotivos), 
                backgroundColor: paletaGrafico, 
                borderRadius: 5 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } 
        }
    });
};

window.renderizarGraficoHome = function() {
    const dtInicio = document.getElementById('home-data-inicio') ? document.getElementById('home-data-inicio').value : '';
    const dtFim = document.getElementById('home-data-fim') ? document.getElementById('home-data-fim').value : '';
    
    let dadosFiltrados = window.todosBoletinsData;
    
    if (dtInicio || dtFim) {
        dadosFiltrados = window.todosBoletinsData.filter(item => {
            const d = item.data['Data de Publicação'];
            if (!d) return false; 
            if (dtInicio && d < dtInicio) return false;
            if (dtFim && d > dtFim) return false;
            return true;
        });
    }
    
    chartHomeInst = window.atualizarGrafico('chart-home', chartHomeInst, dadosFiltrados, 'Motivos Gerais (Empresa)');
};

window.renderizarGraficoPrivadosGeral = function() {
    const dtInicio = document.getElementById('privado-data-inicio') ? document.getElementById('privado-data-inicio').value : '';
    const dtFim = document.getElementById('privado-data-fim') ? document.getElementById('privado-data-fim').value : '';
    
    let dadosFiltrados = window.todosPrivadosData;
    
    if (dtInicio || dtFim) {
        dadosFiltrados = window.todosPrivadosData.filter(item => {
            const d = item.data['Data de Publicação'];
            if (!d) return false; 
            if (dtInicio && d < dtInicio) return false;
            if (dtFim && d > dtFim) return false;
            return true;
        });
    }
    
    chartPrivadosGeralInst = window.atualizarGrafico('chart-privados-geral', chartPrivadosGeralInst, dadosFiltrados, 'Motivos Diretos (Equipe)');
};


window.fecharModal = function() {
    const modalEl = document.getElementById('modal-cadastro');
    if(modalEl) modalEl.style.display = 'none';
};
window.toggleConsultaTipoCustom = function(valor) {
    const input = document.getElementById('input-Tipo-Custom');
    if(!input) return;
    input.style.display = valor === 'Outros' ? '' : 'none';
    if(valor !== 'Outros') input.value = '';
};


window.adicionarPerguntaBuilder = function(tipo, objAntigo = null) {
    const container = document.getElementById('quiz-questions-list');
    if(!container) return;

    const div = document.createElement('div');
    div.className = 'quiz-item-box';
    div.style = "background: white; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px; position: relative;";

    let html = `<button type="button" onclick="this.parentElement.remove(); window.sincronizarQuizJSON();" style="position:absolute; top:10px; right:10px; background:none; border:none; color:red; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>`;
    html += `<input type="hidden" class="quiz-tipo" value="${tipo}">`;
    html += `<label style="font-size:12px; font-weight:600;">Pergunta / Enunciado (${tipo === 'descritiva' ? 'Resposta em Texto' : 'Múltipla Escolha'}):</label>`;
    html += `<textarea class="form-input quiz-pergunta" style="height:60px; margin-bottom:10px;" onkeyup="window.sincronizarQuizJSON()">${objAntigo ? (objAntigo.p || '') : ''}</textarea>`;

    if(tipo === 'multipla') {
        const ops = objAntigo && Array.isArray(objAntigo.ops) ? objAntigo.ops : ['', '', '', ''];
        const corr = objAntigo && objAntigo.correta !== undefined ? String(objAntigo.correta) : '0';
        html += `<label style="font-size:12px; font-weight:600;">Opções de Resposta:</label>`;
        ['A', 'B', 'C', 'D'].forEach((letra, idx) => {
            html += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;"><span style="font-weight:bold; width:20px;">${letra})</span><input type="text" class="form-input quiz-op" style="margin:0;" value="${ops[idx] || ''}" onkeyup="window.sincronizarQuizJSON()"></div>`;
        });
        html += `<label style="font-size:12px; font-weight:600; margin-top:10px; display:block;">Qual é a opção correta?</label>`;
        html += `<select class="form-input quiz-correta" onchange="window.sincronizarQuizJSON()"><option value="0" ${corr==='0'?'selected':''}>Opção A</option><option value="1" ${corr==='1'?'selected':''}>Opção B</option><option value="2" ${corr==='2'?'selected':''}>Opção C</option><option value="3" ${corr==='3'?'selected':''}>Opção D</option></select>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
};

window.carregarPerguntasBuilder = function() {
    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    const lista = document.getElementById('quiz-questions-list');
    if(!lista) return;
    lista.innerHTML = '';
    if(!inputOculto || !inputOculto.value || inputOculto.value === '') return;

    try {
        const jsonStr = inputOculto.value.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const arr = JSON.parse(jsonStr);
        if(Array.isArray(arr)) arr.forEach(q => window.adicionarPerguntaBuilder(q.tipo || 'descritiva', q));
    } catch(e) {
        console.error('Erro ao ler JSON de avaliações:', e);
    }
};

window.sincronizarQuizJSON = function() {
    const blocos = document.querySelectorAll('.quiz-item-box');
    const arrayFinal = [];

    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.quiz-tipo')?.value || 'descritiva';
        const p = (bloco.querySelector('.quiz-pergunta')?.value || '').replace(/"/g, "'");
        if(tipo === 'descritiva') {
            arrayFinal.push({ tipo, p });
        } else {
            const opsInputs = bloco.querySelectorAll('.quiz-op');
            const ops = Array.from(opsInputs).map(inpt => (inpt.value || '').replace(/"/g, "'"));
            const correta = bloco.querySelector('.quiz-correta')?.value || '0';
            arrayFinal.push({ tipo, p, ops, correta });
        }
    });

    const inputOculto = document.getElementById('input-Configuração da Avaliação');
    if(inputOculto) inputOculto.value = JSON.stringify(arrayFinal).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    if(!config) return;
    const titleEl = document.getElementById('modal-title');
    if(titleEl) titleEl.textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;

    const corSalva = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : '#ffffff';
    const colorInput = document.getElementById('card-color');
    if(colorInput) colorInput.value = corSalva;

    let htmlGradientes = '';
    paletaGradientes.forEach(grad => {
        const isSelected = corSalva === grad.valor ? 'selected' : '';
        htmlGradientes += `<div class="color-swatch ${isSelected}" style="background: ${grad.valor};" data-color="${grad.valor}" title="${grad.nome}"></div>`;
    });

    const picker = document.getElementById('gradient-picker');
    if(picker) {
        picker.innerHTML = htmlGradientes;
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');
                if(colorInput) colorInput.value = e.target.getAttribute('data-color');
            });
        });
    }

    const docIdInput = document.getElementById('modal-doc-id');
    if(docIdInput) docIdInput.value = docId || '';

    let htmlCampos = '';
    config.campos.forEach(campo => {
        const valorAntigo = (dadosAntigos && dadosAntigos[campo]) ? dadosAntigos[campo] : '';

        if(colecao === 'colaboradores' && campo === 'Setor da Clínica') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Geral">Setor Padrão (Geral)</option>`;
            setoresGlobais.forEach(s => { htmlCampos += `<option value="${s}" ${valorAntigo === s ? 'selected' : ''}>${s}</option>`; });
            htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Tipo (Vídeo, PDF, Tarefa, Prova)') {
            const opcoes = ['Vídeo', 'PDF/Documento', 'Tarefa Prática', 'Prova Múltipla Escolha'];
            htmlCampos += `<select id="input-${campo}" class="form-input">`;
            opcoes.forEach(op => { htmlCampos += `<option value="${op}" ${valorAntigo === op ? 'selected' : ''}>${op}</option>`; });
            htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Colaborador Específico (Opcional)') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Nenhum (vai para todo o setor marcado)</option>`;
            listaColaboradoresGlobal.forEach(c => { htmlCampos += `<option value="${c.nome}" ${valorAntigo === c.nome ? 'selected' : ''}>${c.nome}</option>`; });
            htmlCampos += `</select>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Enunciado ou Perguntas (Provas/Tarefas)') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px; color:var(--text-muted);">Texto livre de apoio / compatibilidade com atividades antigas:</label>`;
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:120px; resize:vertical;" placeholder="Use este campo para texto livre. Para provas estruturadas, utilize o construtor abaixo.">${valorAntigo}</textarea>`;
        }
        else if(colecao === 'treinamentos' && campo === 'Configuração da Avaliação') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Construtor da avaliação:</label>`;
            htmlCampos += `<input type="hidden" id="input-${campo}" value="${valorAntigo}">`;
            htmlCampos += `<div id="quiz-questions-list"></div>`;
            htmlCampos += `<div style="display:flex; gap:10px; margin-bottom:15px;"><button type="button" onclick="window.adicionarPerguntaBuilder('descritiva'); window.sincronizarQuizJSON();" class="btn-hover color-8" style="flex:1; height:35px; font-size:11px;">+ Adicionar Texto/Tarefa</button><button type="button" onclick="window.adicionarPerguntaBuilder('multipla'); window.sincronizarQuizJSON();" class="btn-hover color-5" style="flex:1; height:35px; font-size:11px;">+ Adicionar Múltipla Escolha</button></div>`;
        }
        else if(colecao === 'corpo-clinico' && campo === 'Especialidade') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Geral (Sem Categoria)">Selecione a Especialidade...</option>`;
            especialidadesGlobais.forEach(s => { htmlCampos += `<option value="${s}" ${valorAntigo === s ? 'selected' : ''}>${s}</option>`; });
            htmlCampos += `</select>`;
        }
        else if(colecao === 'boletins-privados' && campo === 'Para qual Colaborador?') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Colaborador...</option>`;
            listaColaboradoresGlobal.forEach(c => { htmlCampos += `<option value="${c.nome}" ${valorAntigo === c.nome ? 'selected' : ''}>${c.nome}</option>`; });
            htmlCampos += `</select>`;
        }
        else if((colecao === 'boletins' || colecao === 'treinamentos') && campo === 'Para quais Setores?') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Para quais setores? (Marque 1 ou mais)</label><div class="checkbox-group" style="margin-bottom:15px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">`;
            const valoresSalvos = valorAntigo ? String(valorAntigo).split(', ') : ['Geral'];
            ['Geral', ...setoresGlobais].forEach(setor => {
                const checked = valoresSalvos.includes(setor) ? 'checked' : '';
                htmlCampos += `<label style="font-size:13px; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="check-setor" value="${setor}" ${checked}> ${setor}</label>`;
            });
            htmlCampos += `</div>`;
        }
        else if(campo === 'Motivo') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Motivo...</option>`;
            motivosGlobais.forEach(m => { htmlCampos += `<option value="${m}" ${valorAntigo === m ? 'selected' : ''}>${m}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if(campo === 'Links dos Materiais (1 por linha)') {
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:80px; resize:vertical;" placeholder="Cole os links de vídeos ou documentos (um por linha)">${valorAntigo}</textarea>`;
        }
        else if(campo === 'Aceita o Servico?') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Sim" ${valorAntigo === 'Sim' ? 'selected' : ''}>Sim, aceita.</option><option value="Não" ${valorAntigo === 'Não' ? 'selected' : ''}>Não aceita.</option></select>`;
        }
        else if(colecao === 'consultas' && campo === 'Tipo') {
            const tiposPadrao = ['Consulta', 'Exame', 'Pacotes', 'Outros'];
            const valorTipo = String(valorAntigo || '').trim();
            const tipoSelecionado = valorTipo && tiposPadrao.includes(valorTipo) ? valorTipo : (valorTipo ? 'Outros' : '');
            const valorCustom = valorTipo && !tiposPadrao.includes(valorTipo) ? valorTipo : '';
            htmlCampos += `<select id="input-${campo}" class="form-input" onchange="window.toggleConsultaTipoCustom(this.value)" style="margin-bottom:10px;"><option value="">Selecione...</option><option value="Consulta" ${tipoSelecionado === 'Consulta' ? 'selected' : ''}>Consulta</option><option value="Exame" ${tipoSelecionado === 'Exame' ? 'selected' : ''}>Exame</option><option value="Pacotes" ${tipoSelecionado === 'Pacotes' ? 'selected' : ''}>Pacotes</option><option value="Outros" ${tipoSelecionado === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
            htmlCampos += `<input type="text" id="input-Tipo-Custom" class="form-input" placeholder="Digite um novo subtítulo / pasta personalizada" value="${valorCustom}" style="${tipoSelecionado === 'Outros' ? '' : 'display:none;'}">`;
        }
        else if(colecao === 'consultas' && campo === 'Descrição') {
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:90px; resize:vertical;" placeholder="Descrição principal do card">${valorAntigo}</textarea>`;
        }
        else if(colecao === 'consultas' && campo === 'Procedimentos Inclusos (1 por linha)') {
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:110px; resize:vertical;" placeholder="Digite um procedimento por linha para agrupar vários itens no mesmo card">${valorAntigo}</textarea>`;
        }
        else if(campo === 'Local ou Prédio') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Local...</option>`;
            locaisGlobais.forEach(loc => { const l = loc.trim(); if(l) htmlCampos += `<option value="${l}" ${valorAntigo === l ? 'selected' : ''}>${l}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if (campo.includes('Data')) {
            htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`;
        } else if (campo.includes('Link') || campo.includes('URL')) {
            htmlCampos += `<input type="url" id="input-${campo}" placeholder="Link ou URL" value="${valorAntigo}" class="form-input">`;
        } else {
            htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`;
        }
    });

    const formArea = document.getElementById('modal-form-area');
    if(formArea) formArea.innerHTML = htmlCampos;
    if(colecao === 'treinamentos' && document.getElementById('quiz-questions-list')) {
        window.carregarPerguntasBuilder();
    }

    const btnSalvar = document.getElementById('btn-salvar-dados');
    if(btnSalvar) {
        btnSalvar.setAttribute('data-colecao', colecao);
        btnSalvar.innerHTML = docId ? '<i class="ri-save-3-line"></i> Atualizar Dados no Servidor' : '<i class="ri-save-3-line"></i> Salvar Dados no Servidor';
    }

    if(colecao === 'consultas') {
        const seletorTipo = document.getElementById('input-Tipo');
        if(seletorTipo) window.toggleConsultaTipoCustom(seletorTipo.value);
    }

    const modalEl = document.getElementById('modal-cadastro');
    if(modalEl) modalEl.style.display = 'flex';
};

window.abrirMidaFlutuante = function(url) {
    let u = url;
    if(u.includes("drive.google.com") && u.includes("/view")) u = u.replace("/view", "/preview");
    if(u.includes("youtube.com/watch?v=")) u = `https://www.youtube.com/embed/${u.split("v=")[1].split("&")[0]}`;
    else if (u.includes("youtu.be/")) u = `https://www.youtube.com/embed/${u.split("youtu.be/")[1].split("?")[0]}`;
    const iframe = document.getElementById('iframe-media');
    const modalMedia = document.getElementById('modal-media');
    if(iframe) iframe.src = u; 
    if(modalMedia) modalMedia.style.display = 'flex';
};

window.desfazerLeitura = async function(docId, nomeColab, colecao) {
    if(!isAdmin) return;
    if(!confirm(`Tem certeza que deseja remover a assinatura de ${nomeColab}?`)) return;
    
    let docData = null;
    if(colecao === 'treinamentos') docData = window.todosTreinamentosData.find(i=>i.id===docId)?.data;
    else docData = window.dadosBoletins[docId];

    if(!docData || !docData.leituras) return;
    
    const stringExata = docData.leituras.find(txt => txt.startsWith(nomeColab));
    if(stringExata) {
        await window.updateDoc(window.doc(window.db, colecao, docId), { leituras: window.arrayRemove(stringExata) });
        const modalLeituras = document.getElementById('modal-leituras');
        if(modalLeituras) modalLeituras.style.display = 'none';
    }
};

window.abrirListaLeituras = function(docId, colecaoOrigem = 'boletins') {
    let data = null;
    if(colecaoOrigem === 'treinamentos') data = window.todosTreinamentosData.find(i => i.id === docId)?.data;
    else data = window.dadosBoletins[docId];
    if(!data) return;

    const titleEl = document.getElementById('modal-leitura-titulo');
    if(titleEl) titleEl.textContent = data['Título do Informativo'] || data['Título da Atividade'] || data['Título do Documento'] || 'Status';

    let publicoAlvoNomes = [];
    if(colecaoOrigem === 'boletins-privados') publicoAlvoNomes = [data['Para qual Colaborador?']];
    else publicoAlvoNomes = window.obterPublicoAlvo(data['Para quais Setores?'], data['Colaborador Específico (Opcional)']);

    const tipoTreino = String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '');
    const precisaResponder = colecaoOrigem === 'treinamentos' && (tipoTreino.includes('Tarefa') || tipoTreino.includes('Prova'));

    let htmlLidos = '';
    let htmlNaoLidos = '';

    if(precisaResponder) {
        const respostas = data.respostas_alunos || [];
        publicoAlvoNomes.forEach(nome => {
            let respostaAlunoObj = null;
            respostas.forEach(r => { try { const obj = JSON.parse(r); if(obj.nome === nome) respostaAlunoObj = obj; } catch(e) {} });
            if(respostaAlunoObj) {
                const statusNota = respostaAlunoObj.nota !== '' ? `<b style="color:#38a169;">Nota: ${respostaAlunoObj.nota}</b>` : `<b style="color:#ecc94b;">Aguardando nota</b>`;
                const btnCorrigir = isAdmin ? `<button onclick="window.abrirCorrecaoAdmin('${docId}', '${nome.replace(/'/g, "\'")}')" style="background:#3182ce; color:white; border:none; padding:4px 8px; border-radius:5px; font-size:11px; cursor:pointer;"><i class="ri-edit-2-fill"></i> Corrigir</button>` : '';
                htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span><i class="ri-user-line"></i> ${nome}<br><span style="font-size:10px;">${statusNota}</span></span>${btnCorrigir}</div>`;
            } else {
                htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`;
            }
        });
    } else {
        const lidosTextos = data.leituras || [];
        publicoAlvoNomes.forEach(nome => {
            const registroCompleto = lidosTextos.find(txt => txt.startsWith(nome));
            if(registroCompleto) {
                const btnDesfazer = isAdmin ? `<button onclick="window.desfazerLeitura('${docId}', '${nome.replace(/'/g, "\'")}', '${colecaoOrigem}')" class="btn-desfazer"><i class="ri-arrow-go-back-line"></i> Desfazer</button>` : '';
                htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center;"><span><i class="ri-check-line"></i> ${registroCompleto}</span>${btnDesfazer}</div>`;
            } else {
                htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`;
            }
        });
    }

    const lidosContent = document.getElementById('lista-lidos-content');
    const faltaContent = document.getElementById('lista-falta-content');
    if(lidosContent) lidosContent.innerHTML = htmlLidos || '<p style="color:var(--text-muted); font-size:12px;">Nenhum registro.</p>';
    if(faltaContent) faltaContent.innerHTML = htmlNaoLidos || '<p style="color:#38a169; font-size:12px;">Todos completaram!</p>';
    const modalEl = document.getElementById('modal-leituras');
    if(modalEl) modalEl.style.display = 'flex';
};

window.gerarHTMLCard = function(colecaoNome, docId, data) {
    const config = configuracaoAbas[colecaoNome];
    if(!config) return '';
    const camposOrdem = config.campos;
    
    let campoTitulo = camposOrdem[0];
    if(config.campoAgrupador) {
        campoTitulo = camposOrdem.find(c => c !== config.campoAgrupador) || camposOrdem[0];
    }
    
    const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'] || 'Detalhes do Cadastro';
    const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
    const configCor = paletaGradientes.find(p => p.valor === corSalva);
    const isDark = configCor ? configCor.dark : false;
    
    let badgeValorHtml = '';
    camposOrdem.forEach(chave => {
        const valor = data[chave];
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo) {
            if (String(chave).includes('Valor') || (chave === 'Descrição' && typeof valor === 'string' && (valor.toUpperCase().includes('REAIS') || valor.toUpperCase().includes('R$')))) {
                badgeValorHtml = `<div class="badge-valor"><i class="ri-money-dollar-circle-line"></i> ${valor}</div>`;
            }
        }
    });

    let cardClass = isDark && colecaoNome !== 'ramais' ? 'has-gradient' : '';
    let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;
    
    if(config.campoAgrupador && (data[config.campoAgrupador] || 'Geral (Sem Categoria)')) {
        cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA/MÓDULO: ${data[config.campoAgrupador] || 'Geral (Sem Categoria)'}</div>`;
    }

    cardHtml += `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap:10px;">
                    <div class="card-title" style="font-size:18px; font-weight:600; line-height:1.2; flex:1; margin-bottom:0;">${tituloDesteCard}</div>
                    ${badgeValorHtml}
                 </div>`;
    
    let hasFlexLayout = (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']);
    if(hasFlexLayout) {
        cardHtml += `<div class="medico-wrapper">`;
        if (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']) {
            let fotoUrl = window.formatarLinkImagem(data['Link da Foto do Profissional']);
            if(fotoUrl) cardHtml += `<img src="${fotoUrl}" class="medico-foto" onerror="this.style.display='none'">`;
        }
        cardHtml += `<div class="content-info-flex">`;
    }

    camposOrdem.forEach(chave => {
        const valor = data[chave];
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo) {
            if (String(chave).includes('Valor') || chave === 'Link da Logo do Convênio' || chave === 'Exibir Logo do Convenio' || chave === 'Link da Foto do Profissional' || chave === 'Link da Imagem Ilustrativa' || chave === 'Enunciado ou Perguntas (Provas/Tarefas)') return; 
            
            if (chave === 'Aceita o Servico?') {
                const badgeClass = valor === 'Não' ? 'status-negado' : 'status-aceito';
                const iconClass = valor === 'Não' ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill';
                const text = valor === 'Não' ? 'Serviço Não Coberto' : 'Serviço Coberto';
                cardHtml += `<div style="margin: 8px 0;"><span class="${badgeClass}"><i class="${iconClass}"></i> ${text}</span></div>`;
            } else if(chave === 'Local e Link Maps' && String(valor).includes('http')) {
                const urlMatch = String(valor).match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : valor;
                const textoSemUrl = String(valor).replace(url, '').trim();
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span>${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 5px;"><i class="ri-map-pin-user-fill"></i> Ver no Mapa</button></div>`;
            } else {
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span>${valor}</span></div>`; 
            }
        }
    });

    if(colecaoNome === 'treinamentos' && data['Enunciado ou Perguntas (Provas/Tarefas)']) {
        cardHtml += `<div class="card-info" style="font-size:13px; margin-top: 10px; padding:10px; background:rgba(0,0,0,0.03); border-radius:8px;"><strong>Enunciado/Perguntas:</strong><br><span style="white-space: pre-wrap;">${data['Enunciado ou Perguntas (Provas/Tarefas)']}</span></div>`;
    }
    
    if(hasFlexLayout) cardHtml += `</div></div>`; 
    
    if(colecaoNome === 'colaboradores' && data['PIN de Acesso (Treinamentos)']) {
         cardHtml += `<div style="margin-top:10px; background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:12px; border: 1px dashed var(--border-color);"><strong>🔑 PIN de Acesso:</strong> ${data['PIN de Acesso (Treinamentos)']}</div>`;
    }

    if(colecaoNome === 'treinamentos' && isAdmin) {
        const concluidosCount = (data.leituras || []).length;
        cardHtml += `<div style="margin-top:15px; padding-top:15px; border-top: 1px dashed rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:12px; color:var(--primary-color);"><b>Conclusões:</b> ${concluidosCount} colaborador(es).</div>
                        <button onclick="window.abrirListaLeituras('${docId}', 'treinamentos')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-team-line"></i> Detalhes</button>
                     </div>`;
    }

    if (isAdmin) {
        const payloadEdicao = window.encodeInlinePayload(JSON.stringify(data || {}));
        cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info-b64="${payloadEdicao}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    }
    cardHtml += `</div>`;
    return cardHtml;
};

window.renderizarListaGenerica = function(colecao) {
    const grid = document.getElementById(`grid-${colecao}-list`); 
    if(!grid) return;
    grid.innerHTML = '';
    const nomePasta = window[`pasta_${colecao}_Atual`];
    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral (Sem Categoria)') === nomePasta);
    itensExibir.forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); });
};

window.renderizarPastasGenericas = function(colecao) {
    const grid = document.getElementById(`grid-${colecao}-folders`);
    if(!grid) return; 
    grid.innerHTML = '';
    const config = configuracaoAbas[colecao];
    const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];
    
    if (dadosAtuais.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma pasta/módulo encontrado. Clique em "Novo" para criar.</p>';
        return;
    }

    const pastasUnicas = [...new Set(dadosAtuais.map(i => i.data[config.campoAgrupador] || 'Geral (Sem Categoria)'))].sort();
    
    pastasUnicas.forEach(nomePasta => {
        const itensPasta = dadosAtuais.filter(i => (i.data[config.campoAgrupador] || 'Geral (Sem Categoria)') === nomePasta);
        const qtd = itensPasta.length;
        
        const corIcone = itensPasta[0].data.corCard && itensPasta[0].data.corCard !== "transparent" ? itensPasta[0].data.corCard : "var(--primary-color)";
        
        let iconeHtml = `<div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: ${corIcone}; font-size: 24px;"><i class="${config.icone}"></i></div>`;
        if (imagemPadraoPastas) {
            iconeHtml = `<div style="background: white; padding: 10px; border-radius: 12px; box-shadow: var(--shadow-soft); display:flex; align-items:center; justify-content:center; height: 55px; width: 65px;"><img src="${imagemPadraoPastas}" style="max-height:100%; max-width:100%; object-fit:contain;" onerror="this.style.display='none'"></div>`;
        }
        
        grid.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaGenerica('${colecao}', '${nomePasta}')" style="text-align: left; padding: 20px; border-left: 6px solid ${corIcone};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">${iconeHtml}<div style="font-size: 16px; font-weight: 600;">${nomePasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;">Cadastros na pasta: <b style="color:var(--text-main);">${qtd}</b></div></div>`;
    });
};

window.renderizarPastasBoletins = function() {
    const gridFolders = document.getElementById('grid-boletins-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    if (window.todosBoletinsData.length === 0) {
        gridFolders.innerHTML = '<div style="grid-column: 1/-1; background: #fff5f5; color: #c53030; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; font-size:14px; text-align:center;">Nenhum Boletim cadastrado ou regras de segurança bloqueando o acesso.</div>';
        return;
    }

    let todosOsSetores = new Set(['Geral', ...setoresGlobais]);
    window.todosBoletinsData.forEach(b => {
        let setoresDoBoletim = b.data['Para quais Setores?'];
        if(setoresDoBoletim) {
            String(setoresDoBoletim).split(',').forEach(s => todosOsSetores.add(s.trim()));
        }
    });

    let desenhouAlgum = false;

    Array.from(todosOsSetores).sort().forEach(pasta => {
        const boletinsDaPasta = window.todosBoletinsData.filter(item => {
            let s = String(item.data['Para quais Setores?'] || 'Geral');
            return s.includes(pasta);
        });
        
        if(boletinsDaPasta.length === 0) return; 
        desenhouAlgum = true;
        
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
    
    if (!desenhouAlgum) {
        gridFolders.innerHTML = '<div style="grid-column: 1/-1; padding: 15px; color: var(--text-muted); text-align:center;">Nenhuma pasta com boletins encontrada.</div>';
    }
};

window.renderizarListaBoletins = function() {
    const grid = document.getElementById('grid-boletins'); 
    if(!grid) return;
    grid.innerHTML = '';
    const pasta = window.pastaBoletimAtual;
    const boletinsExibir = window.todosBoletinsData.filter(item => {
        let s = String(item.data['Para quais Setores?'] || 'Geral');
        return s.includes(pasta);
    });
    
    if(typeof window.atualizarGrafico === 'function') chartBoletinsInst = window.atualizarGrafico('chart-boletins', chartBoletinsInst, boletinsExibir, `Motivos em ${pasta}`);

    const camposOrdem = configuracaoAbas['boletins'].campos;
    const campoTitulo = camposOrdem[0];

    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data[campoTitulo] || 'Boletim';
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
        const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
        const configCor = paletaGradientes.find(p => p.valor === corSalva);
        const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : ''; 
        
        const publicoAlvoNomes = window.obterPublicoAlvo(pasta);
        const lidosNomes = (data.leituras || []).map(txt => txt.split(' (')[0]);
        const faltamAssinar = publicoAlvoNomes.filter(n => !lidosNomes.includes(n));
        const qtdLidos = publicoAlvoNomes.filter(n => lidosNomes.includes(n)).length;
        const qtdFaltam = faltamAssinar.length;

        const corStatus = qtdFaltam > 0 ? window.corStatusPendente : window.corStatusConcluido;
        const classeUrgente = (isUrgente && qtdFaltam > 0) ? 'card-urgente' : ''; 

        let cardHtml = `<div class="card ${classeUrgente} ${gradientClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border: 3px solid ${corStatus};"><div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600; line-height:1.2;">${titulo}</div>`;
        
        let botaoLinkHtml = '';
        camposOrdem.forEach(chave => {
            const valor = data[chave];
            if (valor && chave !== campoTitulo) {
                if(chave === 'Links dos Materiais (1 por linha)') {
                    const links = String(valor).split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="window.abrirMidaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { 
                    cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && String(chave).includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span style="font-weight: ${(isUrgente && String(chave).includes('Tipo')) ? '700' : '500'};">${valor}</span></div>`; 
                }
            }
        });
        cardHtml += botaoLinkHtml;
        
        cardHtml += `<div class="leituras-lista" style="margin-top: auto; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 13px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 8px;"><div style="font-size: 11px;">Lidos: <b style="color:#38a169; font-size:13px;">${qtdLidos}</b> | Faltam: <b style="color:#e53e3e; font-size:13px;">${qtdFaltam}</b></div><button onclick="window.abrirListaLeituras('${docId}', 'boletins')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-team-line"></i> Detalhes</button></div>`;
        
        if(isAdmin) {
            cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 5px;"><select id="leitor-${docId}" style="flex:1; padding:8px; border-radius:8px; border:none; font-size:12px; background:rgba(255,255,255,0.9); outline:none;">`;
            if(faltamAssinar.length === 0) cardHtml += `<option value="">Todos da pasta já leram!</option>`;
            else { cardHtml += `<option value="">Selecionar Pendente...</option>`; faltamAssinar.forEach(nome => { cardHtml += `<option value="${nome}">${nome}</option>`; }); }
            cardHtml += `</select><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="boletins" style="background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer;"><i class="ri-check-line"></i></button></div>`;
        }
        cardHtml += `</div>`;
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="boletins" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="boletins" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
};

window.renderizarPastasPrivados = function() {
    const gridFolders = document.getElementById('grid-privados-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    if (window.todosPrivadosData.length === 0) {
        gridFolders.innerHTML = '<div style="grid-column: 1/-1; background: #fff5f5; color: #c53030; padding: 15px; border-radius: 8px; border-left: 4px solid #e53e3e; font-size:14px; text-align:center;">Nenhum documento privado encontrado.</div>';
        return;
    }
    
    let todosOsNomes = new Set(listaColaboradoresGlobal.map(c => c.nome));
    window.todosPrivadosData.forEach(b => {
        if(b.data['Para qual Colaborador?']) todosOsNomes.add(String(b.data['Para qual Colaborador?']));
    });
    
    let desenhouAlgum = false;

    Array.from(todosOsNomes).sort().forEach(nome => {
        const boletinsDele = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === nome);
        if(boletinsDele.length === 0) return; 
        desenhouAlgum = true;
        
        let lidos = 0; let faltam = 0;
        boletinsDele.forEach(b => {
            const leitor = (b.data.leituras || []).find(txt => txt.startsWith(nome));
            if(leitor) lidos++; else faltam++;
        });

        let corStatusPasta = faltam > 0 ? window.corStatusPendente : window.corStatusConcluido;
        const nomeSeguro = nome.replace(/'/g, "\\'");

        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaPrivado('${nomeSeguro}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: #e2e8f0; padding: 15px; border-radius: 12px; color: var(--text-main); font-size: 24px; flex-shrink:0;"><i class="ri-user-star-fill"></i></div><div style="font-size: 16px; font-weight: 600; line-height:1.2; word-wrap:break-word;">${nome}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Documentos: <b style="color: var(--text-main);">${boletinsDele.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos: <b>${lidos}</b></div><div style="color: #e53e3e;">Pendentes: <b>${faltam}</b></div></div></div>`;
    });
    
    if (!desenhouAlgum) {
        gridFolders.innerHTML = '<div style="grid-column: 1/-1; padding: 15px; color: var(--text-muted); text-align:center;">Nenhuma pasta privada encontrada.</div>';
    }
};

window.renderizarListaPrivados = function() {
    const grid = document.getElementById('grid-boletins-privados-list'); 
    if(!grid) return;
    grid.innerHTML = '';
    const colabAtual = window.pastaPrivadoAtual;
    const boletinsExibir = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === colabAtual);
    
    if(typeof window.atualizarGrafico === 'function') chartPrivadosInst = window.atualizarGrafico('chart-privados', chartPrivadosInst, boletinsExibir, `Motivos de ${colabAtual}`);

    const camposOrdem = configuracaoAbas['boletins-privados'].campos;
    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data['Título do Documento'] || 'Documento Privado';
        
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
        const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
        const configCor = paletaGradientes.find(p => p.valor === corSalva);
        const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : ''; 

        const jaLeu = (data.leituras || []).find(txt => txt.startsWith(colabAtual));
        const corStatus = jaLeu ? window.corStatusConcluido : window.corStatusPendente;
        const classeUrgente = (isUrgente && !jaLeu) ? 'card-urgente' : ''; 

        let cardHtml = `<div class="card ${classeUrgente} ${gradientClass}" style="display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border: 3px solid ${corStatus};"><div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600;">${titulo}</div>`;
        
        let botaoLinkHtml = '';
        camposOrdem.forEach(chave => {
            const valor = data[chave];
            if (valor && chave !== 'Título do Documento' && chave !== 'Para qual Colaborador?') {
                if(chave === 'Links dos Materiais (1 por linha)') {
                    const links = String(valor).split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="window.abrirMidaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
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
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; window.verificarUrgentesHome(); window.renderizarGraficoHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; window.verificarUrgentesHome(); window.renderizarGraficoPrivadosGeral(); }
            if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = []; if(window.alunoLogado) window.renderizarTrilhaAluno(); }
            if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) {
                window.dadosGlobaisAbas[colecaoNome] = [];
                if(abaAtual === colecaoNome) window.renderizarPastasGenericas(colecaoNome);
            }
            if(grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }

        let itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() }));
        window.todosOsDadosDoSistema[colecaoNome] = itens;

        if(colecaoNome === 'colaboradores') {
            listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome));
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual) window.renderizarPastasPrivados(); 
            if(abaAtual === 'colaboradores') window.renderizarListaGenerica(colecaoNome); // Renderiza a lista direto!
        }

        if(colecaoNome === 'boletins') {
            window.todosBoletinsData = itens;
            if(abaAtual === 'boletins') { if(window.pastaBoletimAtual) window.renderizarListaBoletins(); else window.renderizarPastasBoletins(); }
            window.verificarUrgentesHome(); 
            window.renderizarGraficoHome();
            return;
        }

        if(colecaoNome === 'boletins-privados') {
            window.todosPrivadosData = itens;
            if(abaAtual === 'boletins-privados') { if(window.pastaPrivadoAtual) window.renderizarListaPrivados(); else window.renderizarPastasPrivados(); }
            window.verificarUrgentesHome(); 
            window.renderizarGraficoPrivadosGeral();
            return;
        }
        
        if(colecaoNome === 'treinamentos') {
            window.todosTreinamentosData = itens;
            if(window.alunoLogado) window.renderizarTrilhaAluno();
        }

        if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador && colecaoNome !== 'colaboradores') {
            window.dadosGlobaisAbas[colecaoNome] = itens;
            if(abaAtual === colecaoNome) {
                if(window[`pasta_${colecaoNome}_Atual`]) window.renderizarListaGenerica(colecaoNome);
                else window.renderizarPastasGenericas(colecaoNome);
            }
            return; 
        }

        if(!grid) return; 

        if (colecaoNome === 'ramais') {
            grid.style.display = 'block'; grid.innerHTML = '';
            const locaisMap = {};
            itens.forEach(item => { const local = item.data['Local ou Prédio'] || 'Sem Local Definido'; if (!locaisMap[local]) locaisMap[local] = []; locaisMap[local].push(item); });
            Object.keys(locaisMap).sort().forEach(local => {
                let groupHtml = `<div class="local-group"><h3 class="local-title"><i class="ri-map-pin-2-fill"></i> ${local}</h3><div class="mini-cards-grid">`;
                locaisMap[local].sort((a,b) => (String(a.data['Setor'])||'').localeCompare(String(b.data['Setor'])||'')).forEach(item => {
                    const data = item.data; const docId = item.id;
                    const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
                    const configCor = paletaGradientes.find(p => p.valor === corSalva);
                    const isDark = configCor ? configCor.dark : false;
                    const gradientClass = isDark ? 'has-gradient' : ''; 

                    let cardHtml = `<div class="mini-card ${gradientClass}" style="background: ${corSalva};"><div class="mini-card-main"><div class="mini-card-title">${data['Setor'] || '-'}</div><div class="mini-card-number"><i class="ri-phone-line"></i> ${data['Número do Ramal'] || '-'}</div></div><div class="mini-card-details"><p><strong>Observações:</strong> ${data['Observações'] || 'Nenhuma observação.'}</p></div>`;
                    if (isAdmin) { const dadosSeguros = JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;"); cardHtml += `<div class="mini-card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${dadosSeguros}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`; }
                    cardHtml += `</div>`; groupHtml += cardHtml;
                });
                groupHtml += `</div></div>`; grid.innerHTML += groupHtml;
            });
            return; 
        }
        
        grid.style.display = 'grid'; grid.innerHTML = '';
        itens.sort((a, b) => {
            const tituloA = String(a.data[configuracaoAbas[colecaoNome].campos[0]] || a.data['Nome/Médico'] || a.data['Nome'] || "");
            const tituloB = String(b.data[configuracaoAbas[colecaoNome].campos[0]] || b.data['Nome/Médico'] || b.data['Nome'] || "");
            return tituloA.toUpperCase().localeCompare(tituloB.toUpperCase());
        });

        itens.forEach((item) => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
};

window.carregarConfiguracoes = function() {
    onSnapshot(doc(db, "configuracoes", "gerais"), (docSnap) => {
        const area = document.getElementById('banner-content');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(area) {
                if(data.banner_texto && data.banner_texto.trim() !== '') area.innerHTML = `<h2>${data.banner_texto.replace(/\n/g, '<br>')}</h2>`;
                else area.innerHTML = `<h2>Bem-vindo ao Painel Clínico</h2>`;
            }
            
            const inputs = ['tab-input-banner', 'tab-input-locais', 'tab-input-setores', 'tab-input-especialidades', 'tab-input-motivos'];
            const dataKeys = ['banner_texto', 'locais', 'setores', 'especialidades', 'motivos'];
            inputs.forEach((id, idx) => {
                const el = document.getElementById(id);
                if(el) el.value = data[dataKeys[idx]] || '';
            });

            const chatLogo = data.chat_logo || "https://cdn-icons-png.flaticon.com/512/8943/8943377.png";
            const chatCor = data.chat_cor || "#0ba360";
            
            document.documentElement.style.setProperty('--chat-primary', chatCor);
            
            const fabImg = document.getElementById('chat-fab-img');
            const headerImg = document.getElementById('chat-header-img');
            if(fabImg) fabImg.src = window.formatarLinkImagem(chatLogo) || chatLogo;
            if(headerImg) headerImg.src = window.formatarLinkImagem(chatLogo) || chatLogo;
            
            const inChatLogo = document.getElementById('tab-input-chat-logo');
            const inChatCor = document.getElementById('tab-color-chat');
            if(inChatLogo) inChatLogo.value = data.chat_logo || '';
            if(inChatCor) inChatCor.value = chatCor;

            window.corStatusPendente = data.cor_pendente || '#e53e3e';
            window.corStatusConcluido = data.cor_concluido || '#38a169';
            const pendInput = document.getElementById('tab-color-pendente');
            const concInput = document.getElementById('tab-color-concluido');
            if(pendInput) pendInput.value = window.corStatusPendente;
            if(concInput) concInput.value = window.corStatusConcluido;
            
            locaisGlobais = data.locais ? data.locais.split('\n').filter(l => l.trim() !== '') : [];
            setoresGlobais = data.setores ? data.setores.split('\n').filter(s => s.trim() !== '') : [];
            especialidadesGlobais = data.especialidades ? data.especialidades.split('\n').filter(s => s.trim() !== '') : [];
            motivosGlobais = data.motivos ? data.motivos.split('\n').filter(m => m.trim() !== '') : [];
            
            if(abaAtual === 'boletins' && !window.pastaBoletimAtual && typeof window.renderizarPastasBoletins === 'function') window.renderizarPastasBoletins();
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual && typeof window.renderizarPastasPrivados === 'function') window.renderizarPastasPrivados();
        }
    });
};

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    const fab = document.getElementById('chat-fab');
    if(!win || !fab) return;
    
    if (win.style.display === 'none' || win.style.display === '') {
        win.style.display = 'flex';
        const tooltip = fab.querySelector('.chatbot-tooltip');
        if(tooltip) tooltip.style.display = 'none';

        const termosPopulares = ['Cardiologia', 'Ultrassom', 'Unimed', 'Raio-X', 'Pediatria', 'Ortopedia', 'Consulta', 'Boletim'];
        termosPopulares.sort(() => 0.5 - Math.random());
        const top3 = termosPopulares.slice(0, 3);
        
        const quickRepliesDiv = document.querySelector('.chat-quick-replies');
        if(quickRepliesDiv) {
            quickRepliesDiv.innerHTML = '';
            top3.forEach(termo => {
                quickRepliesDiv.innerHTML += `<button onclick="window.sendQuickMsg('${termo}')">${termo}</button>`;
            });
        }

        setTimeout(() => { document.getElementById('chat-input').focus(); }, 100);
    } else {
        win.style.display = 'none';
    }
};

window.sendQuickMsg = function(texto) {
    const input = document.getElementById('chat-input');
    if(input) {
        input.value = texto;
        window.sendChat();
    }
};

window.sendChat = function() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const msg = input.value.trim();
    if (!msg) return;

    window.addChatBubble(msg, 'user');
    input.value = '';

    setTimeout(() => {
        const resposta = window.processarLogicaDoBot(msg);
        window.addChatBubble(resposta, 'bot');
    }, 600);
};

window.addChatBubble = function(text, sender) {
    const chatArea = document.getElementById('chat-body');
    if(!chatArea) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = text; 
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
};

window.handleChatFollowUp = function(resposta, btnElement) {
    if(btnElement && btnElement.parentElement) {
        btnElement.parentElement.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">Opção selecionada: ${resposta === 'sim' ? 'Sim' : 'Não'}</span>`;
    }

    if (resposta === 'sim') {
        window.addChatBubble("Pode escrever aqui abaixo que estou aqui para te ajudar! 😊", 'bot');
    } else {
        const frasesMotivacionais = [
            "Ter uma inteligência artificial para ajudar é ótimo, mas lembre-se: conte sempre com o seu colega ao lado. O trabalho em equipe nos leva mais longe! 🚀",
            "Que você tenha um excelente turno! A tecnologia agiliza, mas é o calor humano da nossa equipe que faz a clínica brilhar. 💙",
            "Agradeço a consulta! Juntos somos mais fortes. O sucesso é a soma do esforço de toda a equipe. Um abraço virtual! 🤖"
        ];
        const fraseAleatoria = frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)];
        window.addChatBubble(fraseAleatoria, 'bot');
    }
};

window.processarLogicaDoBot = function(mensagemUser) {
    const texto = mensagemUser.toLowerCase().trim();
    
    if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto.includes('bom dia') || texto.includes('boa tarde')) {
        return "Olá! Sou a assistente virtual da clínica. Como posso ajudar? Busque por especialidades, convênios, médicos ou boletins!";
    }

    let resultadosUnicos = {};
    const colecoesBusca = ['corpo-clinico', 'ultrassom', 'exames-imagem', 'consultas', 'convenios', 'ramais', 'pacotes', 'institutos', 'boletins'];
    
    colecoesBusca.forEach(colecao => {
        const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
        
        itens.forEach(item => {
            let textoItem = "";
            Object.entries(item.data).forEach(([key, val]) => { textoItem += `${key} ${val} `; });
            textoItem = textoItem.toLowerCase();

            let matches = false;
            
            if (texto === 'unimed' || texto === 'convênio' || texto === 'convenio') {
                if ((item.data['Unimed'] && item.data['Unimed'].toString().toLowerCase() !== 'não' && item.data['Unimed'].toString().toLowerCase() !== 'nao') || 
                    (item.data['Convênios Aceitos'] && String(item.data['Convênios Aceitos']).toLowerCase().includes('unimed')) ||
                    (item.data['Convênios'] && String(item.data['Convênios']).toLowerCase().includes('unimed')) ||
                    colecao === 'convenios') {
                    matches = true;
                }
            } else if (textoItem.includes(texto)) {
                matches = true;
            }

            if(colecao === 'boletins' && (
                String(item.data['Título do Informativo'] || '').toLowerCase().includes(texto) ||
                String(item.data['Motivo'] || '').toLowerCase().includes(texto) ||
                String(item.data['Para quais Setores?'] || '').toLowerCase().includes(texto)
            )) {
                matches = true;
            }

            if (matches) {
                const config = configuracaoAbas[colecao];
                let tituloItem = item.data[config.campos[0]] || 'Detalhes';
                let detalhesStr = '';
                
                if(colecao === 'boletins') tituloItem = `Boletim: ${item.data['Título do Informativo']}`;
                
                let cont = 0;
                Object.entries(item.data).forEach(([k, v]) => {
                    if(v && k !== config.campos[0] && k !== 'corCard' && !String(k).includes('Link') && cont < 3) {
                        detalhesStr += `<b>${k}:</b> ${v}<br>`;
                        cont++;
                    }
                });

                let pastaAgrupadora = config.campoAgrupador ? item.data[config.campoAgrupador] : null;
                let btnAction = '';

                if (pastaAgrupadora && colecao !== 'colaboradores') {
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.abrirPastaGenerica('${colecao}', '${pastaAgrupadora}') }, 200); window.toggleChat();" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-folder-open-line"></i> Abrir Pasta</button>`;
                } else if (colecao === 'boletins') {
                    const setorBoletim = item.data['Para quais Setores?'] ? String(item.data['Para quais Setores?']).split(',')[0] : 'Geral';
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.abrirPastaBoletim('${setorBoletim}') }, 200); window.toggleChat();" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-folder-open-line"></i> Abrir Boletim</button>`;
                } else {
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); window.toggleChat();" class="btn-hover color-8" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-arrow-right-circle-line"></i> Ir para Aba</button>`;
                }

                resultadosUnicos[item.id] = `
                    <div style="background: white; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                        <div style="font-weight: 700; color: var(--primary-color); margin-bottom: 5px; font-size: 14px; line-height: 1.2;">${tituloItem}</div>
                        <div style="font-size: 12px; color: var(--text-main); line-height: 1.4;">${detalhesStr}</div>
                        ${btnAction}
                    </div>
                `;
            }
        });
    });

    let resultadosEncontrados = Object.values(resultadosUnicos);

    if (resultadosEncontrados.length > 0) {
        let respostaFormatada = `Encontrei isso no sistema para <b>"${mensagemUser}"</b>:<br><br>`;
        const limite = resultadosEncontrados.slice(0, 3); 
        respostaFormatada += limite.join('');
        
        if (resultadosEncontrados.length > 3) {
            respostaFormatada += `<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:5px;">+${resultadosEncontrados.length - 3} resultados ocultos.</div><br>`;
        }

        const dicas = [
            "Você sabia que pode pesquisar por nomes de médicos específicos ou especialidades (ex: Ortopedia)?",
            "Dica: Se o paciente precisar de exames, tente pesquisar por 'Ultrassom' ou 'Raio-X'.",
            "Você também pode pesquisar por Convênios para ver as regras de atendimento!",
            "Lembre-se: Na aba de 'Boletins Gerais' estão os avisos mais importantes da semana."
        ];
        const dicaAleatoria = dicas[Math.floor(Math.random() * dicas.length)];
        respostaFormatada += `<div style="background: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 11px; margin-top: 10px; border-left: 3px solid var(--primary-color);">💡 <b>Dica:</b> ${dicaAleatoria}</div>`;

        respostaFormatada += `<div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 10px; text-align: center;">
            <p style="margin-bottom: 8px; font-weight: 600;">Precisa de algo mais?</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.handleChatFollowUp('sim', this)" style="flex: 1; padding: 8px; border: none; background: #38a169; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Sim</button>
                <button onclick="window.handleChatFollowUp('nao', this)" style="flex: 1; padding: 8px; border: none; background: #e53e3e; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Não</button>
            </div>
        </div>`;

        return respostaFormatada;
    }

    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. 🤔<br><br>Tente pesquisar por uma palavra-chave mais simples, como o nome de um exame ou especialidade!";
};

// ==========================================
// 6. LÓGICA DA JORNADA DE APRENDIZADO (ENSINO) - FASE 3
// ==========================================

window.sairPortalAluno = function() {
    window.alunoLogado = null;
    document.getElementById('ensino-dashboard-area').style.display = 'none';
    document.getElementById('ensino-login-area').style.display = 'block';
    document.getElementById('login-aluno-pin').value = '';
};

// 💡 CONSTRUTOR DINÂMICO DOS MODAIS DO ALUNO (Protege o seu HTML!)
if (!document.getElementById('modal-resposta-aluno')) {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'modal-resposta-aluno';
    modalDiv.className = 'modal-overlay';
    modalDiv.style.display = 'none';
    modalDiv.style.zIndex = '10001';
    modalDiv.innerHTML = `
        <div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;">
            <header class="modal-header">
                <h3 id="resposta-titulo">Responder Atividade</h3>
                <button onclick="document.getElementById('modal-resposta-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button>
            </header>
            <div class="modal-body" style="overflow-y: auto; flex:1;" id="area-perguntas-dinamicas"></div>
            <input type="hidden" id="resposta-docid">
            <button onclick="window.enviarRespostaTreinamento()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #3182ce; color:white; border:none;"><i class="ri-send-plane-fill"></i> Enviar Resposta para Correção</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

if (!document.getElementById('modal-correcao-admin')) {
    const c = document.createElement('div');
    c.id = 'modal-correcao-admin';
    c.className = 'modal-overlay';
    c.style.display = 'none';
    c.style.zIndex = '10005';
    c.innerHTML = `
        <div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;">
            <header class="modal-header"><h3>Corrigir Resposta</h3><button onclick="document.getElementById('modal-correcao-admin').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header>
            <div class="modal-body" style="overflow-y: auto; flex:1;">
                <div id="correcao-respostas-aluno" style="margin-bottom:15px; background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; font-size:13px; white-space:pre-wrap;"></div>
                <label style="font-size:12px; font-weight:600;">Nota atribuída (XP):</label><input type="number" id="correcao-nota" class="form-input" style="margin-bottom:10px;">
                <label style="font-size:12px; font-weight:600;">Feedback / Observação do gestor:</label><textarea id="correcao-feedback" class="form-input" style="height:80px; resize:vertical;"></textarea>
                <input type="hidden" id="correcao-docid"><input type="hidden" id="correcao-nomealuno">
            </div>
            <button onclick="window.salvarCorrecaoAdmin()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #38a169; color:white; border:none;"><i class="ri-check-line"></i> Salvar Correção</button>
        </div>
    `;
    document.body.appendChild(c);
}

if (!document.getElementById('modal-feedback-aluno')) {
    const fbDiv = document.createElement('div');
    fbDiv.id = 'modal-feedback-aluno';
    fbDiv.className = 'modal-overlay';
    fbDiv.style.display = 'none';
    fbDiv.style.zIndex = '10002';
    fbDiv.innerHTML = `
        <div class="modal-box glass-effect" style="max-width: 500px;">
            <header class="modal-header">
                <h3>Feedback do Supervisor</h3>
                <button onclick="document.getElementById('modal-feedback-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button>
            </header>
            <div class="modal-body">
                <div style="text-align:center; margin-bottom:15px;">
                    <div style="font-size:40px; color:#38a169;"><i class="ri-award-fill"></i></div>
                    <h2 style="color:var(--primary-color);">Nota: <span id="feedback-nota"></span></h2>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; color: var(--text-main); border-left: 4px solid var(--primary-color);">
                    <span id="feedback-texto" style="white-space: pre-wrap;"></span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(fbDiv);
}

window.renderizarTrilhaAluno = function() {
    if(!window.alunoLogado) return;
    const grid = document.getElementById('grid-trilha-aluno');
    if(!grid) return;
    grid.innerHTML = '';

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

    let pontos = 0;
    let pendentes = 0;

    const treinamentosAluno = window.todosTreinamentosData.filter(item => {
        const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
        const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
        if (colabAlvo && colabAlvo !== '' && !colabAlvo.includes('Nenhum')) return colabAlvo === nomeAluno;
        return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
    });

    if(treinamentosAluno.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); background: white; padding: 20px; border-radius: 10px;">Você não possui nenhum treinamento pendente no momento. Parabéns! 🎉</p>';
    }

    treinamentosAluno.forEach(item => {
        const d = item.data;
        const docId = item.id;
        const respostas = d.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => { try { const obj = JSON.parse(r); if(obj.nome === nomeAluno) minhaResposta = obj; } catch(e) {} });

        const concluidos = d.leituras || [];
        const jaLeu = concluidos.some(txt => txt.startsWith(nomeAluno));
        const tipo = d['Tipo (Vídeo, PDF, Tarefa, Prova)'] || 'Vídeo';
        const precisaResponder = tipo.includes('Tarefa') || tipo.includes('Prova');
        const pontosItem = parseInt(d['Pontos Valendo']) || 0;

        let jaFez = false;
        let statusTexto = 'Pendente';
        let corStatus = '#e53e3e';
        let iconeStatus = 'ri-time-line';

        if(precisaResponder) {
            if(minhaResposta) {
                jaFez = true;
                if(minhaResposta.nota && minhaResposta.nota !== '') {
                    statusTexto = `Corrigido (Nota: ${minhaResposta.nota})`;
                    corStatus = '#38a169';
                    iconeStatus = 'ri-award-fill';
                    pontos += parseInt(minhaResposta.nota) || 0;
                } else {
                    statusTexto = 'Aguardando Correção';
                    corStatus = '#ecc94b';
                    iconeStatus = 'ri-hourglass-line';
                }
            } else {
                pendentes++;
            }
        } else {
            if(jaLeu) {
                jaFez = true;
                statusTexto = 'Concluído';
                corStatus = '#38a169';
                iconeStatus = 'ri-check-double-line';
                pontos += pontosItem;
            } else {
                pendentes++;
            }
        }

        let btnAcao = '';
        if(d['Link do Material (Se houver)']) {
            btnAcao += `<button onclick="window.abrirMidaFlutuante('${String(d['Link do Material (Se houver)']).trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-bottom: 8px;"><i class="ri-eye-line"></i> Acessar Material</button>`;
        }

        if(!jaFez) {
            if(precisaResponder) {
                let confJSON = d['Configuração da Avaliação'] || '';
                if(!confJSON && d['Enunciado ou Perguntas (Provas/Tarefas)']) {
                    confJSON = JSON.stringify([{ tipo: 'descritiva', p: d['Enunciado ou Perguntas (Provas/Tarefas)'] }]);
                }
                confJSON = String(confJSON).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
                btnAcao += `<button onclick="window.abrirModalResposta('${docId}', '${confJSON}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> Responder Atividade</button>`;
            } else {
                btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
            }
        } else if (precisaResponder && minhaResposta && minhaResposta.nota !== '') {
            btnAcao += `<button onclick="window.verFeedback('${minhaResposta.nota}', \`${(minhaResposta.feedback || 'Sem comentários.').replace(/'/g, '&apos;')}\`)" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
        }

        const subtitulo = d['Colaborador Específico (Opcional)'] ? `COLABORADOR: ${d['Colaborador Específico (Opcional)']}` : `MÓDULO: ${d['Pasta / Módulo']} | TIPO: ${tipo}`;
        const cardHtml = `
            <div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;">
                <div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> ${subtitulo}</div>
                <div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade']}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;">
                    <b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br>
                    <b>Status:</b> <span style="color:${corStatus}; font-weight:600;"><i class="${iconeStatus}"></i> ${statusTexto}</span>
                </div>
                ${btnAcao}
            </div>
        `;
        grid.innerHTML += cardHtml;
    });

    const ptsEl = document.getElementById('aluno-pontos');
    const pendEl = document.getElementById('aluno-tarefas-pendentes');
    if(ptsEl) ptsEl.textContent = pontos;
    if(pendEl) pendEl.textContent = pendentes;
};

window.concluirTreinamento = async function(docId) {
    if(!window.alunoLogado) return;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?
Ao confirmar, os pontos serão computados na sua jornada.`)) return;

    const registro = `${nomeAluno} (Concluído em: ${new Date().toLocaleString('pt-BR')})`;
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registro) });
        alert('Material concluído com sucesso! +XP 🎉');
    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

window.abrirModalResposta = function(docId, configJSON) {
    const docIdInput = document.getElementById('resposta-docid');
    const area = document.getElementById('area-perguntas-dinamicas');
    if(docIdInput) docIdInput.value = docId;
    if(!area) return;
    area.innerHTML = '';

    try {
        const jsonTratado = String(configJSON || '[]').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const perguntas = JSON.parse(jsonTratado);
        perguntas.forEach((q, idx) => {
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">`;
            html += `<div style="font-weight:600; font-size:13px; margin-bottom:10px;">${idx+1}. ${q.p || 'Pergunta'}</div>`;
            html += `<input type="hidden" class="resp-tipo" value="${q.tipo || 'descritiva'}">`;
            html += `<input type="hidden" class="resp-pergunta-txt" value="${(q.p || '').replace(/"/g, '&quot;')}">`;
            if((q.tipo || 'descritiva') === 'descritiva') {
                html += `<textarea class="form-input resp-valor" style="height:80px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            } else {
                (q.ops || []).forEach((op, oIdx) => {
                    if(String(op).trim() !== '') html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:5px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${String(op).replace(/"/g, '&quot;')}"> ${op}</label>`;
                });
            }
            html += `</div>`;
            area.innerHTML += html;
        });
    } catch(e) {
        area.innerHTML = '<p>Erro ao carregar perguntas do sistema.</p>';
    }

    document.getElementById('modal-resposta-aluno').style.display = 'flex';
};

window.enviarRespostaTreinamento = async function() {
    if(!window.alunoLogado) return;
    const docId = document.getElementById('resposta-docid').value;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];

    const blocos = document.querySelectorAll('.pergunta-aluno-bloco');
    const respostasFinais = [];

    blocos.forEach(bloco => {
        const tipo = bloco.querySelector('.resp-tipo')?.value || 'descritiva';
        const p = bloco.querySelector('.resp-pergunta-txt')?.value || '';
        let r = '';
        if(tipo === 'descritiva') r = bloco.querySelector('.resp-valor')?.value.trim() || '';
        else {
            const checked = bloco.querySelector('.resp-radio:checked');
            r = checked ? checked.value : 'Nenhuma opção selecionada';
        }
        respostasFinais.push({ pergunta: p, resposta: r });
    });

    if(!respostasFinais.some(item => String(item.resposta || '').trim() !== '')) {
        alert('Preencha ao menos uma resposta antes de enviar.');
        return;
    }

    const respostaObj = { nome: nomeAluno, data: new Date().toLocaleString('pt-BR'), respostas: respostasFinais, nota: '', feedback: '' };
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { respostas_alunos: window.arrayUnion(JSON.stringify(respostaObj)) });
        alert('Sua resposta foi enviada para correção do supervisor! 🚀');
        document.getElementById('modal-resposta-aluno').style.display = 'none';
        window.renderizarTrilhaAluno();
    } catch(e) {
        alert('Erro ao enviar resposta: ' + e.message);
    }
};

window.abrirCorrecaoAdmin = function(docId, nomeAluno) {
    const data = window.todosTreinamentosData.find(i => i.id === docId)?.data;
    if(!data) return;
    const respostas = data.respostas_alunos || [];
    let respObj = null;
    let respStrAntiga = null;
    respostas.forEach(r => { try { const o = JSON.parse(r); if(o.nome === nomeAluno) { respObj = o; respStrAntiga = r; } } catch(e) {} });
    if(!respObj) return;

    let html = `<b>Aluno:</b> ${nomeAluno}<br><b>Enviado em:</b> ${respObj.data}<br><br>`;
    const respostasRender = Array.isArray(respObj.respostas) && respObj.respostas.length > 0 ? respObj.respostas : [{ pergunta: 'Resposta enviada', resposta: respObj.resposta || '' }];
    respostasRender.forEach((r, i) => {
        html += `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><b>Q${i+1}:</b> ${r.pergunta}<br><span style="color:#3182ce;">R: ${r.resposta}</span></div>`;
    });

    document.getElementById('correcao-respostas-aluno').innerHTML = html;
    document.getElementById('correcao-nota').value = respObj.nota || '';
    document.getElementById('correcao-feedback').value = respObj.feedback || '';
    document.getElementById('correcao-docid').value = docId;
    document.getElementById('correcao-nomealuno').value = nomeAluno;
    document.getElementById('modal-correcao-admin').style.display = 'flex';
    const modalLeituras = document.getElementById('modal-leituras');
    if(modalLeituras) modalLeituras.style.display = 'none';
};

window.salvarCorrecaoAdmin = async function() {
    const docId = document.getElementById('correcao-docid').value;
    const nomeAluno = document.getElementById('correcao-nomealuno').value;
    const nota = document.getElementById('correcao-nota').value;
    const fb = document.getElementById('correcao-feedback').value;

    const data = window.todosTreinamentosData.find(i => i.id === docId)?.data;
    const respostas = data?.respostas_alunos || [];
    let respObjAntigo = null;
    let respStrAntiga = null;
    respostas.forEach(r => { try { const o = JSON.parse(r); if(o.nome === nomeAluno) { respObjAntigo = o; respStrAntiga = r; } } catch(e) {} });
    if(!respObjAntigo || !respStrAntiga) return;

    const respNovaObj = { ...respObjAntigo, nota: nota, feedback: fb };
    const respStrNova = JSON.stringify(respNovaObj);
    try {
        const ref = window.doc(window.db, 'treinamentos', docId);
        await window.updateDoc(ref, { respostas_alunos: window.arrayRemove(respStrAntiga) });
        await window.updateDoc(ref, { respostas_alunos: window.arrayUnion(respStrNova) });
        alert('Correção salva com sucesso!');
        document.getElementById('modal-correcao-admin').style.display = 'none';
    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

window.entrarPortalAluno = function() {
    const nomeDigitado = document.getElementById('login-aluno-nome')?.value.trim().toLowerCase();
    const pinDigitado = document.getElementById('login-aluno-pin')?.value.trim();
    if(!nomeDigitado || !pinDigitado) return alert('Preencha Nome e PIN!');

    const dadosColaboradores = window.todosOsDadosDoSistema['colaboradores'] || [];
    const colaboradorEncontrado = dadosColaboradores.find(item => String(item.data['Nome Completo do Colaborador'] || '').toLowerCase() === nomeDigitado && String(item.data['PIN de Acesso (Treinamentos)'] || '') === pinDigitado);
    if(colaboradorEncontrado) {
        window.alunoLogado = colaboradorEncontrado.data;
        const loginArea = document.getElementById('ensino-login-area');
        const dashArea = document.getElementById('ensino-dashboard-area');
        const nomeEl = document.getElementById('nome-aluno-logado');
        if(loginArea) loginArea.style.display = 'none';
        if(dashArea) dashArea.style.display = 'block';
        if(nomeEl) nomeEl.textContent = window.alunoLogado['Nome Completo do Colaborador'];
        window.renderizarTrilhaAluno();
    } else {
        alert('Nome ou PIN incorretos. Verifique com a Gestão.');
    }
};

window.verFeedback = function(nota, feedback, payloadCodificado = false) {
    const fb = payloadCodificado ? window.decodeInlinePayload(feedback) : feedback;
    document.getElementById('feedback-nota').textContent = nota;
    document.getElementById('feedback-texto').textContent = fb;
    document.getElementById('modal-feedback-aluno').style.display = 'flex';
};

// ==========================================
// 7. ATRIBUIÇÃO DE EVENTOS GERAIS E NAVEGAÇÃO
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    
    const mainContent = document.querySelector('.main-content');
    if(mainContent) {
        mainContent.addEventListener('click', async (e) => {
            const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit'); const btnAssinar = e.target.closest('.btn-assinar');
            if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
            if (btnEditar && isAdmin) {
                let dadosEdicao = {};
                try {
                    const bruto = btnEditar.dataset.infoB64 ? window.decodeInlinePayload(btnEditar.dataset.infoB64) : (btnEditar.dataset.info || '{}');
                    dadosEdicao = JSON.parse(bruto || '{}');
                } catch(err) {
                    console.error('Falha ao abrir edição:', err);
                    alert('Não foi possível carregar os dados para edição.');
                    return;
                }
                window.abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, dadosEdicao);
            }
            if (btnAssinar && isAdmin) {
                const idDoc = btnAssinar.dataset.id;
                const col = btnAssinar.dataset.colecao;
                const inputLeitor = document.getElementById(`leitor-${idDoc}`);
                if(!inputLeitor) return;
                const nomeColaborador = inputLeitor.value;
                if(!nomeColaborador) return alert("Selecione um colaborador na lista!");
                const registro = `${nomeColaborador} (Lido em: ${new Date().toLocaleString('pt-BR')})`;
                await updateDoc(doc(db, col, idDoc), { leituras: arrayUnion(registro) });
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
            btnSalvar.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';
            
            let dados = { 
                corCard: document.getElementById('card-color') ? document.getElementById('card-color').value : '#ffffff' 
            };
            
            config.campos.forEach(c => {
                const val = document.getElementById('input-'+c);
                if((colecao === 'boletins' || colecao === 'treinamentos') && c === 'Para quais Setores?') {
                    const checks = Array.from(document.querySelectorAll('.check-setor:checked')).map(el => el.value);
                    dados[c] = checks.join(', ');
                } else if(colecao === 'consultas' && c === 'Tipo') {
                    const tipoBase = document.getElementById('input-Tipo')?.value || '';
                    const tipoCustom = document.getElementById('input-Tipo-Custom')?.value?.trim() || '';
                    dados[c] = tipoBase === 'Outros' ? (tipoCustom || 'Outros') : tipoBase;
                } else if(val) {
                    dados[c] = val.value;
                }
            });
            
            try {
                if(docId) {
                    await updateDoc(doc(db, colecao, docId), dados);
                } else {
                    await addDoc(collection(db, colecao), dados);
                }
                window.fecharModal();
            } catch(e) {
                alert("Erro ao salvar: " + e.message);
            }
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
            
            const imgPastaInput = document.getElementById('tab-input-imagem-pastas');
            const imgPastasTexto = imgPastaInput ? imgPastaInput.value : "";

            const chatLogoInput = document.getElementById('tab-input-chat-logo');
            const chatLogoTexto = chatLogoInput ? chatLogoInput.value : "";
            
            const chatCorInput = document.getElementById('tab-color-chat');
            const chatCorVal = chatCorInput ? chatCorInput.value : "#0ba360";
            
            btnSalvarAjustes.innerHTML = "Salvando...";
            try {
                await setDoc(doc(db, "configuracoes", "gerais"), { 
                    banner_texto: texto, 
                    locais: locaisTexto, 
                    setores: setoresTexto, 
                    especialidades: especialidadesTexto,
                    motivos: motivosTexto, 
                    cor_pendente: corPend, 
                    cor_concluido: corConc,
                    imagem_padrao_pastas: imgPastasTexto,
                    chat_logo: chatLogoTexto,
                    chat_cor: chatCorVal
                });
                alert("Configurações salvas com sucesso!");
            } catch(e) { alert("Erro ao salvar configurações."); }
            btnSalvarAjustes.innerHTML = 'Salvar Alterações';
        });
    }

    const inputPesqGlobal = document.getElementById('input-pesquisa-global');
    if(inputPesqGlobal) {
        inputPesqGlobal.addEventListener('keyup', (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const areaRes = document.getElementById('resultados-globais');
            if(!areaRes) return;
            if(texto.length < 2) { areaRes.style.display = 'none'; return; }
            
            areaRes.style.display = 'grid'; 
            areaRes.innerHTML = '<h3 style="grid-column: 1/-1; margin-bottom: 10px; border-bottom: 2px solid var(--border-color); padding-bottom: 5px; color: var(--primary-color);">Resultados da Busca Global:</h3>';
            let encontrou = false;
            
            const colecoesBusca = ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'pacotes', 'remocoes', 'colaboradores'];
            
            colecoesBusca.forEach(colecao => {
                const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
                itens.forEach(item => {
                    const valoresStr = Object.values(item.data).join(' ').toLowerCase();
                    const chavesStr = Object.keys(item.data).join(' ').toLowerCase();
                    if(valoresStr.includes(texto) || chavesStr.includes(texto)) {
                        areaRes.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data);
                        encontrou = true;
                    }
                });
            });

            if(!encontrou) areaRes.innerHTML += '<p style="color:var(--text-muted); font-size:14px; grid-column: 1/-1;">Nenhum resultado encontrado no sistema.</p>';
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

    const btnEntrarAluno = document.getElementById('btn-entrar-aluno');
    if(btnEntrarAluno) btnEntrarAluno.addEventListener('click', window.entrarPortalAluno);
    const btnSairAluno = document.getElementById('btn-sair-aluno');
    if(btnSairAluno) btnSairAluno.addEventListener('click', window.sairPortalAluno);

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
            
            const searchBox = document.getElementById('search-box');
            if(searchBox) searchBox.style.display = (abaAtual !== 'home' && abaAtual !== 'ajustes') ? 'flex' : 'none';
            
            const inputPesqLocal = document.getElementById('input-pesquisa');
            if(inputPesqLocal) inputPesqLocal.value = ''; 
            
            if(abaAtual === 'boletins' && typeof window.fecharPastaBoletim === 'function') window.fecharPastaBoletim(); 
            if(abaAtual === 'boletins-privados' && typeof window.fecharPastaPrivado === 'function') window.fecharPastaPrivado();
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'treinamentos'].forEach(col => {
                if(abaAtual === col && typeof window.fecharPastaGenerica === 'function') window.fecharPastaGenerica(col);
            });
            
            if(abaAtual === 'home') {
                window.verificarUrgentesHome();
            }
        });
    });
});


// ==========================================
// PATCH TREINAMENTOS V2 - RESPOSTAS, CORREÇÃO E PASTAS POR DESTINO
// ==========================================
(() => {
    window.todosTreinamentosLeiturasData = window.todosTreinamentosLeiturasData || [];
    window.todosTreinamentosRespostasData = window.todosTreinamentosRespostasData || [];
    window.treinamentosLeiturasIndex = window.treinamentosLeiturasIndex || {};
    window.treinamentosRespostasIndex = window.treinamentosRespostasIndex || {};
    window.pasta_treinamentos_TipoAtual = window.pasta_treinamentos_TipoAtual || null;

    const originalAbrirMidia = window.abrirMidaFlutuante;
    const originalGerarHTMLCard = window.gerarHTMLCard;
    const originalRenderizarPastasGenericas = window.renderizarPastasGenericas;
    const originalRenderizarListaGenerica = window.renderizarListaGenerica;
    const originalAbrirPastaGenerica = window.abrirPastaGenerica;
    const originalFecharPastaGenerica = window.fecharPastaGenerica;
    const originalAbrirListaLeituras = window.abrirListaLeituras;

    window.escapeJsSafe = function(valor) {
        return String(valor || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\r/g, ' ');
    };

    window.encodeInlinePayload = function(valor) {
        try {
            return btoa(unescape(encodeURIComponent(String(valor ?? ''))));
        } catch(e) {
            return String(valor ?? '')
                .replace(/&/g, '&amp;')
                .replace(/'/g, '&#39;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    };

    window.decodeInlinePayload = function(valor) {
        const bruto = String(valor ?? '');
        try {
            return decodeURIComponent(escape(atob(bruto)));
        } catch(e) {
            return bruto
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&apos;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
        }
    };

    window.parseTreinamentoJSONSeguro = function(valor, fallback = []) {
        const bruto = String(valor ?? '').trim();
        if(!bruto) return fallback;
        const tentativas = [
            bruto,
            bruto.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
        ];
        try {
            tentativas.push(window.decodeInlinePayload(bruto));
        } catch(e) {
            pass
        }
        for (const tentativa of tentativas) {
            try {
                const parsed = JSON.parse(tentativa);
                return Array.isArray(parsed) ? parsed : fallback;
            } catch(e) {}
        }
        return fallback;
    };

    window.slugTreinamento = function(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'sem_nome';
    };

    window.getTrainingUserKey = function(treinamentoId, nomeAluno) {
        return `${treinamentoId}__${window.slugTreinamento(nomeAluno)}`;
    };

    window.getTreinamentoById = function(docId) {
        return window.todosTreinamentosData.find(i => i.id === docId) || null;
    };

    window.getTreinamentoConfigArray = function(trainingData) {
        const bruto = String(trainingData?.['Configuração da Avaliação'] || '').trim();
        return window.parseTreinamentoJSONSeguro(bruto, []);
    };

    window.treinoTemQuestoes = function(trainingData) {
        const enunciado = String(trainingData?.['Enunciado ou Perguntas (Provas/Tarefas)'] || '').trim();
        const perguntas = window.getTreinamentoConfigArray(trainingData);
        return !!enunciado || perguntas.some(q => String(q?.p || '').trim() !== '' || (Array.isArray(q?.ops) && q.ops.some(op => String(op || '').trim() !== '')));
    };

    window.treinoPrecisaResposta = function(trainingData) {
        const tipo = String(trainingData?.['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '');
        return /Tarefa|Prova/i.test(tipo) || window.treinoTemQuestoes(trainingData);
    };

    window.obterPublicoTreinamento = function(trainingData) {
        return window.obterPublicoAlvo(trainingData?.['Para quais Setores?'], trainingData?.['Colaborador Específico (Opcional)']);
    };

    window.obterRespostaTreinamento = function(docId, nomeAluno, trainingData = null) {
        const key = window.getTrainingUserKey(docId, nomeAluno);
        if(window.treinamentosRespostasIndex[key]) return window.treinamentosRespostasIndex[key];
        const respostasLegadas = trainingData?.respostas_alunos || [];
        let achou = null;
        respostasLegadas.forEach(r => {
            try {
                const obj = JSON.parse(r);
                if(obj.nome === nomeAluno) achou = obj;
            } catch(e) {}
        });
        return achou;
    };

    window.obterLeituraTreinamento = function(docId, nomeAluno, trainingData = null) {
        const key = window.getTrainingUserKey(docId, nomeAluno);
        if(window.treinamentosLeiturasIndex[key]) return window.treinamentosLeiturasIndex[key];
        const leiturasLegadas = trainingData?.leituras || [];
        const registro = leiturasLegadas.find(txt => String(txt).startsWith(nomeAluno));
        return registro ? { treinamentoId: docId, nomeAluno, textoRegistro: registro, status: 'concluido' } : null;
    };

    window.obterStatusTreinamentoAluno = function(docId, trainingData, nomeAluno) {
        const pontosItem = parseInt(trainingData?.['Pontos Valendo']) || 0;
        if(window.treinoPrecisaResposta(trainingData)) {
            const resp = window.obterRespostaTreinamento(docId, nomeAluno, trainingData);
            if(resp) {
                if(String(resp.nota ?? '') !== '') {
                    return { status: 'corrigido', texto: `Corrigido (Nota: ${resp.nota})`, cor: '#38a169', icone: 'ri-award-fill', pontos: parseInt(resp.nota) || 0, resposta: resp };
                }
                return { status: 'aguardando_correcao', texto: 'Aguardando Correção', cor: '#ecc94b', icone: 'ri-hourglass-line', pontos: 0, resposta: resp };
            }
            return { status: 'pendente', texto: 'Pendente', cor: '#e53e3e', icone: 'ri-time-line', pontos: 0, resposta: null };
        }
        const leitura = window.obterLeituraTreinamento(docId, nomeAluno, trainingData);
        if(leitura) {
            return { status: 'concluido', texto: 'Concluído', cor: '#38a169', icone: 'ri-check-double-line', pontos: pontosItem, leitura };
        }
        return { status: 'pendente', texto: 'Pendente', cor: '#e53e3e', icone: 'ri-time-line', pontos: 0, leitura: null };
    };

    window.obterResumoTreinamentoAdmin = function(docId, trainingData) {
        const publico = window.obterPublicoTreinamento(trainingData);
        const resumo = { totalAlvo: publico.length, concluidos: 0, pendentes: 0, aguardandoCorrecao: 0 };
        publico.forEach(nome => {
            const status = window.obterStatusTreinamentoAluno(docId, trainingData, nome);
            if(status.status === 'corrigido' || status.status === 'concluido') resumo.concluidos += 1;
            else if(status.status === 'aguardando_correcao') resumo.aguardandoCorrecao += 1;
            else resumo.pendentes += 1;
        });
        return resumo;
    };

    window.getPastasTreinamentoDestino = function(trainingData) {
        const colab = String(trainingData?.['Colaborador Específico (Opcional)'] || '').trim();
        if(colab) return [{ tipo: 'colaborador', nome: colab }];
        const setores = String(trainingData?.['Para quais Setores?'] || 'Geral')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const unicos = [...new Set(setores.length ? setores : ['Geral'])];
        return unicos.map(nome => ({ tipo: 'setor', nome }));
    };

    window.recarregarUITrainingsPatch = function() {
        if(window.alunoLogado) window.renderizarTrilhaAluno();
        if(abaAtual === 'treinamentos') {
            if(window[`pasta_treinamentos_Atual`]) window.renderizarListaGenerica('treinamentos');
            else window.renderizarPastasGenericas('treinamentos');
        }
    };

    window.iniciarSnapshotsTreinamentoAuxiliares = function() {
        if(window._snapTreinoAuxIniciado) return;
        window._snapTreinoAuxIniciado = true;

        onSnapshot(collection(db, 'treinamentos_respostas'), (snapshot) => {
            const itens = [];
            const index = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data() || {};
                itens.push({ id: docSnap.id, data });
                const key = window.getTrainingUserKey(data.treinamentoId || '', data.nomeAluno || '');
                if(data.treinamentoId && data.nomeAluno) index[key] = data;
            });
            window.todosTreinamentosRespostasData = itens;
            window.treinamentosRespostasIndex = index;
            window.recarregarUITrainingsPatch();
        }, (err) => {
            console.warn('Snapshot treinamentos_respostas bloqueado:', err?.message || err);
        });

        onSnapshot(collection(db, 'treinamentos_leituras'), (snapshot) => {
            const itens = [];
            const index = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data() || {};
                itens.push({ id: docSnap.id, data });
                const key = window.getTrainingUserKey(data.treinamentoId || '', data.nomeAluno || '');
                if(data.treinamentoId && data.nomeAluno) index[key] = data;
            });
            window.todosTreinamentosLeiturasData = itens;
            window.treinamentosLeiturasIndex = index;
            window.recarregarUITrainingsPatch();
        }, (err) => {
            console.warn('Snapshot treinamentos_leituras bloqueado:', err?.message || err);
        });
    };

    onAuthStateChanged(auth, (user) => {
        if(user) {
            window.iniciarSnapshotsTreinamentoAuxiliares();
        } else {
            window.todosTreinamentosRespostasData = [];
            window.todosTreinamentosLeiturasData = [];
            window.treinamentosRespostasIndex = {};
            window.treinamentosLeiturasIndex = {};
        }
    });

    window.abrirMidaFlutuante = function(url) {
        let u = String(url || '').trim();
        if(!u) return;

        if(/docs\.google\.com\/(document|spreadsheets|presentation|forms)/i.test(u) || /drive\.google\.com\/drive\/folders/i.test(u)) {
            window.open(u, '_blank');
            return;
        }

        if(u.includes('drive.google.com/open?id=')) {
            const match = u.match(/id=([a-zA-Z0-9_-]+)/);
            if(match && match[1]) u = `https://drive.google.com/file/d/${match[1]}/preview`;
        }

        if(u.includes('drive.google.com/file/d/') && u.includes('/view')) {
            u = u.replace('/view', '/preview');
        }

        if(originalAbrirMidia) originalAbrirMidia(u);
        else window.open(u, '_blank');
    };

    window.renderizarTrilhaAluno = function() {
        if(!window.alunoLogado) return;
        const grid = document.getElementById('grid-trilha-aluno');
        if(!grid) return;
        grid.innerHTML = '';

        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

        let pontos = 0;
        let pendentes = 0;

        const treinamentosAluno = window.todosTreinamentosData.filter(item => {
            const setorAlvo = String(item.data['Para quais Setores?'] || 'Geral');
            const colabAlvo = String(item.data['Colaborador Específico (Opcional)'] || '');
            if(colabAlvo && colabAlvo.trim() !== '') return colabAlvo === nomeAluno;
            return setorAlvo.includes('Geral') || setorAlvo.includes(setorAluno);
        });

        if(treinamentosAluno.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); background: white; padding: 20px; border-radius: 10px;">Você não possui nenhum treinamento pendente no momento. Parabéns! 🎉</p>';
        }

        treinamentosAluno.forEach(item => {
            const d = item.data;
            const docId = item.id;
            const status = window.obterStatusTreinamentoAluno(docId, d, nomeAluno);
            const pontosItem = parseInt(d['Pontos Valendo']) || 0;
            const precisaResponder = window.treinoPrecisaResposta(d);
            const tipoBase = String(d['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').trim();
            const tipoExibir = precisaResponder ? (tipoBase || 'Atividade com Resposta') : (tipoBase || 'Material');

            if(status.status === 'pendente') pendentes += 1;
            pontos += status.pontos || 0;

            let btnAcao = '';
            if(d['Link do Material (Se houver)']) {
                btnAcao += `<button onclick="window.abrirMidaFlutuante('${window.escapeJsSafe(String(d['Link do Material (Se houver)']).trim())}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-bottom: 8px;"><i class="ri-eye-line"></i> Acessar Material</button>`;
            }

            if(status.status === 'pendente') {
                if(precisaResponder) {
                    let confArray = window.getTreinamentoConfigArray(d);
                    if(confArray.length === 0 && d['Enunciado ou Perguntas (Provas/Tarefas)']) {
                        confArray = [{ tipo: 'descritiva', p: d['Enunciado ou Perguntas (Provas/Tarefas)'] }];
                    }
                    const confJSON = window.encodeInlinePayload(JSON.stringify(confArray));
                    btnAcao += `<button onclick="window.abrirModalResposta('${docId}', '${confJSON}', true)" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> Responder Atividade</button>`;
                } else {
                    btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
                }
            } else if(status.status === 'corrigido' && status.resposta && String(status.resposta.nota ?? '') !== '') {
                const feedbackSeguro = window.encodeInlinePayload(status.resposta.feedback || 'Sem comentários.');
                btnAcao += `<button onclick="window.verFeedback('${window.escapeJsSafe(status.resposta.nota)}', '${feedbackSeguro}', true)" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
            }

            const subtitulo = d['Colaborador Específico (Opcional)']
                ? `COLABORADOR: ${d['Colaborador Específico (Opcional)']}`
                : `SETORES: ${d['Para quais Setores?'] || 'Geral'} | TIPO: ${tipoExibir}`;

            grid.innerHTML += `
                <div class="card" style="border: 2px solid ${status.cor}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;">
                    <div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> ${subtitulo}</div>
                    <div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade'] || 'Atividade sem título'}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;">
                        <b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br>
                        <b>Status:</b> <span style="color:${status.cor}; font-weight:600;"><i class="${status.icone}"></i> ${status.texto}</span>
                    </div>
                    ${btnAcao}
                </div>
            `;
        });

        const ptsEl = document.getElementById('aluno-pontos');
        const pendEl = document.getElementById('aluno-tarefas-pendentes');
        if(ptsEl) ptsEl.textContent = pontos;
        if(pendEl) pendEl.textContent = pendentes;
    };

    window.concluirTreinamento = async function(docId) {
        if(!window.alunoLogado) return;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';
        const treinamento = window.getTreinamentoById(docId);
        if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?\nAo confirmar, os pontos serão computados na sua jornada.`)) return;

        const key = window.getTrainingUserKey(docId, nomeAluno);
        const payload = {
            treinamentoId: docId,
            nomeAluno,
            setorAluno,
            tituloAtividade: treinamento?.data?.['Título da Atividade'] || '',
            status: 'concluido',
            concluidoEmTexto: new Date().toLocaleString('pt-BR'),
            concluidoEmIso: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'treinamentos_leituras', key), payload, { merge: true });
            alert('Material concluído com sucesso! +XP 🎉');
        } catch(e) {
            alert('Erro ao salvar: ' + e.message);
        }
    };

    window.abrirModalResposta = function(docId, configJSON, payloadCodificado = false) {
        const docIdInput = document.getElementById('resposta-docid');
        const area = document.getElementById('area-perguntas-dinamicas');
        if(docIdInput) docIdInput.value = docId;
        if(!area) return;
        area.innerHTML = '';

        let perguntas = [];
        try {
            const bruto = payloadCodificado ? window.decodeInlinePayload(configJSON) : String(configJSON || '[]');
            perguntas = JSON.parse(String(bruto || '[]').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
        } catch(e) {}

        if(!Array.isArray(perguntas) || perguntas.length === 0) {
            const treinamento = window.getTreinamentoById(docId);
            const textoLivre = String(treinamento?.data?.['Enunciado ou Perguntas (Provas/Tarefas)'] || 'Descreva sua resposta.');
            perguntas = [{ tipo: 'descritiva', p: textoLivre }];
        }

        perguntas.forEach((q, idx) => {
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">`;
            html += `<div style="font-weight:600; font-size:13px; margin-bottom:10px;">${idx + 1}. ${q.p || 'Pergunta'}</div>`;
            html += `<input type="hidden" class="resp-tipo" value="${q.tipo || 'descritiva'}">`;
            html += `<input type="hidden" class="resp-pergunta-txt" value="${String(q.p || '').replace(/"/g, '&quot;')}">`;
            if((q.tipo || 'descritiva') === 'descritiva') {
                html += `<textarea class="form-input resp-valor" style="height:80px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            } else {
                (q.ops || []).forEach((op, oIdx) => {
                    if(String(op).trim() !== '') {
                        html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:5px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${String(op).replace(/"/g, '&quot;')}"> ${op}</label>`;
                    }
                });
            }
            html += `</div>`;
            area.innerHTML += html;
        });

        document.getElementById('modal-resposta-aluno').style.display = 'flex';
    };

    window.enviarRespostaTreinamento = async function() {
        if(!window.alunoLogado) return;
        const docId = document.getElementById('resposta-docid').value;
        const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
        const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';
        const treinamento = window.getTreinamentoById(docId);

        const blocos = document.querySelectorAll('.pergunta-aluno-bloco');
        const respostasFinais = [];

        blocos.forEach(bloco => {
            const tipo = bloco.querySelector('.resp-tipo')?.value || 'descritiva';
            const p = bloco.querySelector('.resp-pergunta-txt')?.value || '';
            let r = '';
            if(tipo === 'descritiva') {
                r = bloco.querySelector('.resp-valor')?.value.trim() || '';
            } else {
                const checked = bloco.querySelector('.resp-radio:checked');
                r = checked ? checked.value : '';
            }
            respostasFinais.push({ pergunta: p, resposta: r });
        });

        if(!respostasFinais.some(item => String(item.resposta || '').trim() !== '')) {
            alert('Preencha ao menos uma resposta antes de enviar.');
            return;
        }

        const key = window.getTrainingUserKey(docId, nomeAluno);
        const respostaObj = {
            treinamentoId: docId,
            nomeAluno,
            setorAluno,
            tituloAtividade: treinamento?.data?.['Título da Atividade'] || '',
            nome: nomeAluno,
            data: new Date().toLocaleString('pt-BR'),
            dataIso: new Date().toISOString(),
            respostas: respostasFinais,
            nota: '',
            feedback: '',
            status: 'aguardando_correcao'
        };

        try {
            await setDoc(doc(db, 'treinamentos_respostas', key), respostaObj, { merge: true });
            alert('Sua resposta foi enviada para correção do supervisor! 🚀');
            document.getElementById('modal-resposta-aluno').style.display = 'none';
            window.renderizarTrilhaAluno();
        } catch(e) {
            alert('Erro ao enviar resposta: ' + e.message);
        }
    };

    window.abrirListaLeituras = function(docId, colecaoOrigem = 'boletins') {
        if(colecaoOrigem !== 'treinamentos') {
            return originalAbrirListaLeituras(docId, colecaoOrigem);
        }

        const treinamento = window.getTreinamentoById(docId);
        const data = treinamento?.data;
        if(!data) return;

        const titleEl = document.getElementById('modal-leitura-titulo');
        if(titleEl) titleEl.textContent = data['Título da Atividade'] || 'Status';

        const publicoAlvoNomes = window.obterPublicoTreinamento(data);
        const precisaResponder = window.treinoPrecisaResposta(data);

        let htmlLidos = '';
        let htmlNaoLidos = '';

        publicoAlvoNomes.forEach(nome => {
            const status = window.obterStatusTreinamentoAluno(docId, data, nome);
            if(status.status === 'corrigido' || status.status === 'concluido' || status.status === 'aguardando_correcao') {
                let legenda = '';
                if(status.status === 'corrigido') legenda = `<b style="color:#38a169;">Corrigido - Nota: ${status.resposta?.nota ?? ''}</b>`;
                else if(status.status === 'aguardando_correcao') legenda = `<b style="color:#ecc94b;">Aguardando correção</b>`;
                else legenda = `<b style="color:#38a169;">Concluído</b>`;
                const btnCorrigir = (isAdmin && precisaResponder)
                    ? `<button onclick="window.abrirCorrecaoAdmin('${docId}', '${window.escapeJsSafe(nome)}')" style="background:#3182ce; color:white; border:none; padding:4px 8px; border-radius:5px; font-size:11px; cursor:pointer;"><i class="ri-edit-2-fill"></i> Corrigir</button>`
                    : '';
                htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span><i class="ri-user-line"></i> ${nome}<br><span style="font-size:10px;">${legenda}</span></span>${btnCorrigir}</div>`;
            } else {
                htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`;
            }
        });

        const lidosContent = document.getElementById('lista-lidos-content');
        const faltaContent = document.getElementById('lista-falta-content');
        if(lidosContent) lidosContent.innerHTML = htmlLidos || '<p style="color:var(--text-muted); font-size:12px;">Nenhum registro.</p>';
        if(faltaContent) faltaContent.innerHTML = htmlNaoLidos || '<p style="color:#38a169; font-size:12px;">Todos completaram!</p>';
        document.getElementById('modal-leituras').style.display = 'flex';
    };

    window.abrirCorrecaoAdmin = function(docId, nomeAluno) {
        if(!isAdmin) return alert('Somente supervisor/gestão pode corrigir atividades.');
        const treinamento = window.getTreinamentoById(docId);
        const data = treinamento?.data;
        if(!data) return;

        const respObj = window.obterRespostaTreinamento(docId, nomeAluno, data);
        if(!respObj) return alert('Nenhuma resposta encontrada para esse colaborador.');

        let html = `<b>Aluno:</b> ${nomeAluno}<br><b>Enviado em:</b> ${respObj.data || respObj.dataEnvioTexto || '-'}<br><br>`;
        const respostasRender = Array.isArray(respObj.respostas) && respObj.respostas.length > 0
            ? respObj.respostas
            : [{ pergunta: 'Resposta enviada', resposta: respObj.resposta || '' }];

        respostasRender.forEach((r, i) => {
            html += `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><b>Q${i + 1}:</b> ${r.pergunta}<br><span style="color:#3182ce;">R: ${r.resposta}</span></div>`;
        });

        document.getElementById('correcao-respostas-aluno').innerHTML = html;
        document.getElementById('correcao-nota').value = respObj.nota || '';
        document.getElementById('correcao-feedback').value = respObj.feedback || '';
        document.getElementById('correcao-docid').value = docId;
        document.getElementById('correcao-nomealuno').value = nomeAluno;
        document.getElementById('modal-correcao-admin').style.display = 'flex';
        const modalLeituras = document.getElementById('modal-leituras');
        if(modalLeituras) modalLeituras.style.display = 'none';
    };

    window.salvarCorrecaoAdmin = async function() {
        if(!isAdmin) return alert('Somente supervisor/gestão pode corrigir atividades.');
        const docId = document.getElementById('correcao-docid').value;
        const nomeAluno = document.getElementById('correcao-nomealuno').value;
        const nota = document.getElementById('correcao-nota').value;
        const fb = document.getElementById('correcao-feedback').value;

        const treinamento = window.getTreinamentoById(docId);
        const data = treinamento?.data;
        const respAnterior = window.obterRespostaTreinamento(docId, nomeAluno, data);
        if(!respAnterior) return alert('Resposta original não encontrada.');

        const key = window.getTrainingUserKey(docId, nomeAluno);
        const payload = {
            ...respAnterior,
            treinamentoId: docId,
            nomeAluno,
            nome: nomeAluno,
            nota,
            feedback: fb,
            status: String(nota).trim() !== '' ? 'corrigido' : 'aguardando_correcao',
            corrigidoPor: auth.currentUser?.email || 'Supervisor',
            corrigidoEmTexto: new Date().toLocaleString('pt-BR'),
            corrigidoEmIso: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'treinamentos_respostas', key), payload, { merge: true });
            alert('Correção salva com sucesso!');
            document.getElementById('modal-correcao-admin').style.display = 'none';
        } catch(e) {
            alert('Erro ao salvar: ' + e.message);
        }
    };

    window.gerarHTMLCard = function(colecaoNome, docId, data) {
        if(colecaoNome !== 'treinamentos') {
            return originalGerarHTMLCard(colecaoNome, docId, data);
        }

        const tipoExibir = window.treinoPrecisaResposta(data)
            ? (String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').trim() || 'Atividade com Resposta')
            : (String(data['Tipo (Vídeo, PDF, Tarefa, Prova)'] || '').trim() || 'Material');
        const resumo = window.obterResumoTreinamentoAdmin(docId, data);
        const corSalva = data.corCard && data.corCard !== 'transparent' ? data.corCard : '#ffffff';
        const configCor = paletaGradientes.find(p => p.valor === corSalva);
        const cardClass = (configCor && configCor.dark) ? 'has-gradient' : '';
        const borderColor = resumo.aguardandoCorrecao > 0 ? '#ecc94b' : (resumo.pendentes > 0 ? '#e53e3e' : '#38a169');
        const publico = window.obterPublicoTreinamento(data);

        let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid ${borderColor};">`;
        cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="ri-book-read-fill"></i> DESTINO: ${data['Colaborador Específico (Opcional)'] ? data['Colaborador Específico (Opcional)'] : (data['Para quais Setores?'] || 'Geral')}</div>`;
        cardHtml += `<div style="font-size:18px; font-weight:600; line-height:1.2; margin-bottom:12px;">${data['Título da Atividade'] || 'Treinamento sem título'}</div>`;
        cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>Tipo:</strong> <span>${tipoExibir}</span></div>`;
        cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>Módulo/Referência:</strong> <span>${data['Pasta / Módulo'] || 'Geral'}</span></div>`;
        if(data['Para quais Setores?']) cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>Setores:</strong> <span>${data['Para quais Setores?']}</span></div>`;
        if(data['Colaborador Específico (Opcional)']) cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>Colaborador:</strong> <span>${data['Colaborador Específico (Opcional)']}</span></div>`;
        if(data['Pontos Valendo']) cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>Pontos:</strong> <span>${data['Pontos Valendo']}</span></div>`;
        if(data['Enunciado ou Perguntas (Provas/Tarefas)']) {
            cardHtml += `<div class="card-info" style="font-size:13px; margin-top: 10px; padding:10px; background:rgba(0,0,0,0.03); border-radius:8px;"><strong>Enunciado/Apoio:</strong><br><span style="white-space: pre-wrap;">${data['Enunciado ou Perguntas (Provas/Tarefas)']}</span></div>`;
        }
        if(data['Link do Material (Se houver)']) {
            cardHtml += `<button onclick="window.abrirMidaFlutuante('${window.escapeJsSafe(String(data['Link do Material (Se houver)']).trim())}')" class="btn-hover color-8" style="width:100%; height:35px; border-radius:8px; font-size:13px; margin-top:10px;"><i class="ri-eye-line"></i> Acessar Material</button>`;
        }

        cardHtml += `<div style="margin-top:15px; padding-top:15px; border-top: 1px dashed rgba(0,0,0,0.1); display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
            <div style="background:#f8fafc; padding:10px; border-radius:8px;"><b>Alvos:</b> ${publico.length}</div>
            <div style="background:#f8fafc; padding:10px; border-radius:8px;"><b>Itens:</b> 1</div>
            <div style="background:#fffaf0; padding:10px; border-radius:8px; color:#975a16;"><b>Para corrigir:</b> ${resumo.aguardandoCorrecao}</div>
            <div style="background:#f0fff4; padding:10px; border-radius:8px; color:#276749;"><b>Concluídos:</b> ${resumo.concluidos}</div>
            <div style="grid-column:1/-1; background:#fff5f5; padding:10px; border-radius:8px; color:#c53030;"><b>Pendentes:</b> ${resumo.pendentes}</div>
        </div>`;

        if(isAdmin) {
            cardHtml += `<div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <button onclick="window.abrirListaLeituras('${docId}', 'treinamentos')" class="btn-hover color-8" style="flex:1; padding: 8px 12px; font-size: 12px;"><i class="ri-team-line"></i> Status / Corrigir</button>
            </div>`;
            cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, '&apos;').replace(/"/g, '&quot;')}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        }
        cardHtml += `</div>`;
        return cardHtml;
    };

    window.abrirPastaGenerica = function(colecao, valorPasta, tipoDestino = null) {
        if(colecao !== 'treinamentos') return originalAbrirPastaGenerica(colecao, valorPasta);
        window[`pasta_${colecao}_Atual`] = valorPasta;
        window.pasta_treinamentos_TipoAtual = tipoDestino || window.pasta_treinamentos_TipoAtual || 'setor';
        const foldEl = document.getElementById(`${colecao}-view-folders`);
        const listEl = document.getElementById(`${colecao}-view-list`);
        const titleEl = document.getElementById(`titulo-pasta-${colecao}`);
        if(foldEl) foldEl.style.display = 'none';
        if(listEl) listEl.style.display = 'block';
        if(titleEl) titleEl.innerHTML = `<i class="ri-folder-open-line"></i> ${window.pasta_treinamentos_TipoAtual === 'colaborador' ? 'Colaborador' : 'Setor'}: ${valorPasta}`;
        window.renderizarListaGenerica(colecao);
    };

    window.fecharPastaGenerica = function(colecao) {
        if(colecao !== 'treinamentos') return originalFecharPastaGenerica(colecao);
        window[`pasta_${colecao}_Atual`] = null;
        window.pasta_treinamentos_TipoAtual = null;
        const foldEl = document.getElementById(`${colecao}-view-folders`);
        const listEl = document.getElementById(`${colecao}-view-list`);
        if(listEl) listEl.style.display = 'none';
        if(foldEl) foldEl.style.display = 'block';
        window.renderizarPastasGenericas(colecao);
    };

    window.renderizarListaGenerica = function(colecao) {
        if(colecao !== 'treinamentos') return originalRenderizarListaGenerica(colecao);
        const grid = document.getElementById(`grid-${colecao}-list`);
        if(!grid) return;
        grid.innerHTML = '';
        const nomePasta = window[`pasta_${colecao}_Atual`];
        const tipoPasta = window.pasta_treinamentos_TipoAtual || 'setor';
        const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(item => {
            const destinos = window.getPastasTreinamentoDestino(item.data);
            return destinos.some(d => d.nome === nomePasta && d.tipo === tipoPasta);
        });
        if(itensExibir.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma atividade encontrada nesta pasta.</p>';
            return;
        }
        itensExibir.forEach(item => { grid.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); });
    };

    window.renderizarPastasGenericas = function(colecao) {
        if(colecao !== 'treinamentos') return originalRenderizarPastasGenericas(colecao);
        const grid = document.getElementById(`grid-${colecao}-folders`);
        if(!grid) return;
        grid.innerHTML = '';
        const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];

        if(dadosAtuais.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma atividade encontrada. Clique em "Novo" para criar.</p>';
            return;
        }

        const mapa = {};
        dadosAtuais.forEach(item => {
            const destinos = window.getPastasTreinamentoDestino(item.data);
            destinos.forEach(dest => {
                const chave = `${dest.tipo}::${dest.nome}`;
                if(!mapa[chave]) {
                    mapa[chave] = {
                        tipo: dest.tipo,
                        nome: dest.nome,
                        atividades: 0,
                        pendentes: 0,
                        concluidos: 0,
                        aguardandoCorrecao: 0,
                        cor: item.data.corCard && item.data.corCard !== 'transparent' ? item.data.corCard : 'var(--primary-color)'
                    };
                }
                mapa[chave].atividades += 1;
                const resumo = window.obterResumoTreinamentoAdmin(item.id, item.data);
                mapa[chave].pendentes += resumo.pendentes;
                mapa[chave].concluidos += resumo.concluidos;
                mapa[chave].aguardandoCorrecao += resumo.aguardandoCorrecao;
            });
        });

        const pastas = Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        pastas.forEach(pasta => {
            const corStatus = pasta.aguardandoCorrecao > 0 ? '#ecc94b' : (pasta.pendentes > 0 ? '#e53e3e' : '#38a169');
            const icone = pasta.tipo === 'colaborador' ? 'ri-user-star-line' : 'ri-community-line';
            const nomeSeguro = encodeURIComponent(pasta.nome);
            grid.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaGenerica('treinamentos', decodeURIComponent('${nomeSeguro}'), '${pasta.tipo}')" style="text-align: left; padding: 20px; border-left: 6px solid ${corStatus};">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: ${corStatus}; font-size: 24px;"><i class="${icone}"></i></div>
                    <div>
                        <div style="font-size: 16px; font-weight: 600; line-height:1.2;">${pasta.nome}</div>
                        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-top:4px;">${pasta.tipo === 'colaborador' ? 'Pasta por colaborador' : 'Pasta por setor'}</div>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px; display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                    <div>Atividades: <b style="color:var(--text-main);">${pasta.atividades}</b></div>
                    <div style="color:#975a16;">Para corrigir: <b>${pasta.aguardandoCorrecao}</b></div>
                    <div style="color:#38a169;">Concluídos: <b>${pasta.concluidos}</b></div>
                    <div style="color:#e53e3e;">Pendentes: <b>${pasta.pendentes}</b></div>
                </div>
            </div>`;
        });
    };
})();
