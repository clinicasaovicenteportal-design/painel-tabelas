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
        campos: ['Título da Atividade', 'Pasta / Módulo', 'Tipo (Vídeo, PDF, Tarefa, Prova)', 'Link do Material (Se houver)', 'Enunciado ou Perguntas (Provas/Tarefas)', 'Para quais Setores?', 'Pontos Valendo'], 
        campoAgrupador: 'Pasta / Módulo', 
        icone: 'ri-book-read-fill' 
    },

    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA', 'Exibir Logo do Convenio', 'Link da Foto do Profissional'], campoAgrupador: 'Especialidade', icone: 'ri-team-fill' }, 
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Aceita o Servico?', 'Observações'], campoAgrupador: 'Convênio', icone: 'ri-shield-cross-fill' },
    'ultrassom': { titulo: 'Exame de Ultrassom', campos: ['Exame', 'Código', 'Profissional', 'Restrição de Idade', 'Observação'], campoAgrupador: 'Exame', icone: 'ri-pulse-line' },
    'consultas': { titulo: 'Consulta / Procedimento', campos: ['Tipo', 'Código', 'Descrição', 'Valor', 'Observações'], campoAgrupador: 'Tipo', icone: 'ri-stethoscope-line' },
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

window.obterPublicoAlvo = function(setoresAlvoString) {
    if (!setoresAlvoString || setoresAlvoString.includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
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

window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    if(!config) return;
    const titleEl = document.getElementById('modal-title');
    if(titleEl) titleEl.textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
    
    const corSalva = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : "#ffffff";
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
    if(docIdInput) docIdInput.value = docId || "";

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
        else if(colecao === 'treinamentos' && campo === 'Enunciado ou Perguntas (Provas/Tarefas)') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px; color:var(--text-muted);">Escreva o texto da tarefa ou as perguntas da prova aqui:</label>`;
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:120px; resize:vertical;" placeholder="Exemplo para Prova:&#10;Q: O que fazer em caso de febre? | A: Medicação | B: Alta | Correta: A">${valorAntigo}</textarea>`;
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
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:80px; resize:vertical;" placeholder="Cole os links de Vídeos ou Documentos (um por linha)">${valorAntigo}</textarea>`;
        }
        else if(campo === 'Aceita o Servico?') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Sim" ${valorAntigo === 'Sim' ? 'selected' : ''}>Sim, aceita.</option><option value="Não" ${valorAntigo === 'Não' ? 'selected' : ''}>Não aceita.</option></select>`;
        }
        else if(colecao === 'consultas' && campo === 'Tipo') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione...</option><option value="Consulta" ${valorAntigo === 'Consulta' ? 'selected' : ''}>Consulta</option><option value="Exame" ${valorAntigo === 'Exame' ? 'selected' : ''}>Exame</option><option value="Pacotes" ${valorAntigo === 'Pacotes' ? 'selected' : ''}>Pacotes</option><option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        } 
        else if(campo === 'Local ou Prédio') {
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="">Selecione o Local...</option>`;
            locaisGlobais.forEach(loc => { const l = loc.trim(); if(l) htmlCampos += `<option value="${l}" ${valorAntigo === l ? 'selected' : ''}>${l}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if (campo.includes('Data')) { htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`;
        } else if (campo.includes('Link') || campo.includes('URL')) { htmlCampos += `<input type="url" id="input-${campo}" placeholder="Link ou URL" value="${valorAntigo}" class="form-input">`;
        } else { htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`; }
    });
    
    const formArea = document.getElementById('modal-form-area');
    if(formArea) formArea.innerHTML = htmlCampos;
    
    const btnSalvar = document.getElementById('btn-salvar-dados');
    if(btnSalvar) btnSalvar.setAttribute('data-colecao', colecao);
    
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
    if(colecaoOrigem === 'treinamentos') {
        data = window.todosTreinamentosData.find(i=>i.id===docId)?.data;
    } else {
        data = window.dadosBoletins[docId];
    }
    
    if(!data) return;
    
    const titleEl = document.getElementById('modal-leitura-titulo');
    if(titleEl) titleEl.textContent = data['Título do Informativo'] || data['Título da Atividade'] || data['Título do Documento'] || 'Status';
    
    let publicoAlvoNomes = [];
    if(colecaoOrigem === 'boletins' || colecaoOrigem === 'treinamentos') {
        publicoAlvoNomes = window.obterPublicoAlvo(data['Para quais Setores?']);
    } else {
        publicoAlvoNomes = [data['Para qual Colaborador?']]; 
    }

    const lidosTextos = data.leituras || [];
    const lidosNomes = lidosTextos.map(txt => txt.split(' (')[0]); 

    let htmlLidos = ''; let htmlNaoLidos = '';
    publicoAlvoNomes.forEach(nome => {
        const registroCompleto = lidosTextos.find(txt => txt.startsWith(nome));
        if (registroCompleto) {
            let btnDesfazer = isAdmin ? `<button onclick="window.desfazerLeitura('${docId}', '${nome}', '${colecaoOrigem}')" class="btn-desfazer"><i class="ri-arrow-go-back-line"></i> Desfazer</button>` : '';
            htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center;"><span><i class="ri-check-line"></i> ${registroCompleto}</span> ${btnDesfazer}</div>`;
        } else { htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`; }
    });

    const lidosContent = document.getElementById('lista-lidos-content');
    const faltaContent = document.getElementById('lista-falta-content');
    
    if(lidosContent) lidosContent.innerHTML = htmlLidos || '<p style="color:var(--text-muted);">Ninguém concluiu ainda.</p>';
    if(faltaContent) faltaContent.innerHTML = htmlNaoLidos || '<p style="color:#38a169;">Todos concluíram!</p>';
    
    const modalEl = document.getElementById('modal-leituras');
    if(modalEl) modalEl.style.display = 'flex';
};

window.colecaoUsaCardRecolhivel = function(colecaoNome) {
    return !['ramais','emails','contatos-gerais','contatos-convenios','senhas'].includes(colecaoNome);
};

window.toggleCardExpand = function(btnEl) {
    const cardEl = btnEl && btnEl.closest ? btnEl.closest('.card-collapsible') : null;
    if(!cardEl) return;
    cardEl.classList.toggle('expanded');
    const expanded = cardEl.classList.contains('expanded');
    const btn = cardEl.querySelector('.card-toggle');
    if(btn) {
        btn.innerHTML = expanded ? '<i class="ri-close-line"></i>' : '<i class="ri-add-line"></i>';
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        btn.title = expanded ? 'Recolher card' : 'Expandir card';
    }
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
    const cardRecolhivel = window.colecaoUsaCardRecolhivel(colecaoNome);

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
    if(cardRecolhivel) cardClass += ' card-collapsible';
    let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; height:auto; min-height:unset; border-left: 6px solid var(--primary-color);">`;

    const folderHtml = (config.campoAgrupador && (data[config.campoAgrupador] || 'Geral (Sem Categoria)'))
        ? `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA/MÓDULO: ${data[config.campoAgrupador] || 'Geral (Sem Categoria)'}</div>`
        : '';

    cardHtml += `<div class="card-summary">
                    <div class="card-summary-main">
                        <div class="card-title" style="font-size:18px; font-weight:600; line-height:1.2; flex:1; margin-bottom:0;">${tituloDesteCard}</div>
                        ${badgeValorHtml}
                    </div>
                    ${cardRecolhivel ? `<button type="button" class="card-toggle" aria-expanded="false" title="Expandir card" onclick="window.toggleCardExpand(this)"><i class="ri-add-line"></i></button>` : ''}
                 </div>`;

    let detailsHtml = '';
    if(folderHtml) detailsHtml += folderHtml;

    let hasFlexLayout = (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']);
    if(hasFlexLayout) {
        detailsHtml += `<div class="medico-wrapper">`;
        if (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']) {
            let fotoUrl = window.formatarLinkImagem(data['Link da Foto do Profissional']);
            if(fotoUrl) detailsHtml += `<img src="${fotoUrl}" class="medico-foto" onerror="this.style.display='none'">`;
        }
        detailsHtml += `<div class="content-info-flex">`;
    }

    camposOrdem.forEach(chave => {
        const valor = data[chave];
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo) {
            if (String(chave).includes('Valor') || chave === 'Link da Logo do Convênio' || chave === 'Exibir Logo do Convenio' || chave === 'Link da Foto do Profissional' || chave === 'Link da Imagem Ilustrativa' || chave === 'Enunciado ou Perguntas (Provas/Tarefas)') return;

            if (chave === 'Aceita o Servico?') {
                const badgeClass = valor === 'Não' ? 'status-negado' : 'status-aceito';
                const iconClass = valor === 'Não' ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill';
                const text = valor === 'Não' ? 'Serviço Não Coberto' : 'Serviço Coberto';
                detailsHtml += `<div style="margin: 8px 0;"><span class="${badgeClass}"><i class="${iconClass}"></i> ${text}</span></div>`;
            } else if(chave === 'Local e Link Maps' && String(valor).includes('http')) {
                const urlMatch = String(valor).match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : valor;
                const textoSemUrl = String(valor).replace(url, '').trim();
                detailsHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span>${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 5px;"><i class="ri-map-pin-user-fill"></i> Ver no Mapa</button></div>`;
            } else {
                const estiloTexto = (colecaoNome === 'pacotes' && (chave === 'Descrição' || chave === 'O que está incluso' || chave === 'Observações' || chave === 'Kit' || chave === 'Procedimentos Inclusos (1 por linha)'))
                    ? 'white-space: pre-line; display:block; line-height:1.55;'
                    : '';
                detailsHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span style="${estiloTexto}">${valor}</span></div>`;
            }
        }
    });

    if(colecaoNome === 'treinamentos' && data['Enunciado ou Perguntas (Provas/Tarefas)']) {
        detailsHtml += `<div class="card-info" style="font-size:13px; margin-top: 10px; padding:10px; background:rgba(0,0,0,0.03); border-radius:8px;"><strong>Enunciado/Perguntas:</strong><br><span style="white-space: pre-wrap;">${data['Enunciado ou Perguntas (Provas/Tarefas)']}</span></div>`;
    }

    if(hasFlexLayout) detailsHtml += `</div></div>`;

    if(colecaoNome === 'colaboradores' && data['PIN de Acesso (Treinamentos)']) {
         detailsHtml += `<div style="margin-top:10px; background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:12px; border: 1px dashed var(--border-color);"><strong>🔑 PIN de Acesso:</strong> ${data['PIN de Acesso (Treinamentos)']}</div>`;
    }

    if(colecaoNome === 'treinamentos' && isAdmin) {
        const concluidosCount = (data.leituras || []).length;
        detailsHtml += `<div style="margin-top:15px; padding-top:15px; border-top: 1px dashed rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:12px; color:var(--primary-color);"><b>Conclusões:</b> ${concluidosCount} colaborador(es).</div>
                        <button onclick="window.abrirListaLeituras('${docId}', 'treinamentos')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-team-line"></i> Detalhes</button>
                     </div>`;
    }

    if (isAdmin) {
        detailsHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    }

    if(cardRecolhivel) cardHtml += `<div class="card-details">${detailsHtml}</div>`;
    else cardHtml += detailsHtml;
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
            <div class="modal-body" style="overflow-y: auto; flex:1;">
                <div style="background: rgba(0,0,0,0.03); padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px;">
                    <strong>Enunciado/Perguntas:</strong><br>
                    <span id="resposta-enunciado" style="white-space: pre-wrap; display:block; margin-top:5px;"></span>
                </div>
                <label style="font-size:13px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:8px;">Sua Resposta:</label>
                <textarea id="resposta-texto" class="form-input" style="height: 150px; resize: vertical;" placeholder="Digite sua resposta aqui..."></textarea>
                <input type="hidden" id="resposta-docid">
            </div>
            <button onclick="window.enviarRespostaTreinamento()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #3182ce; color:white; border:none;"><i class="ri-send-plane-fill"></i> Enviar Resposta para Correção</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
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
        const alvo = String(item.data['Para quais Setores?'] || 'Geral');
        return alvo.includes('Geral') || alvo.includes(setorAluno);
    });

    if(treinamentosAluno.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); background: white; padding: 20px; border-radius: 10px;">Você não possui nenhum treinamento pendente no momento. Parabéns! 🎉</p>';
    }

    treinamentosAluno.forEach(item => {
        const d = item.data;
        const docId = item.id;
        
        // 1. Verifica se é Prova/Tarefa e se o aluno já respondeu
        const respostas = d.respostas_alunos || [];
        let minhaResposta = null;
        respostas.forEach(r => {
            try { 
                let obj = JSON.parse(r); 
                if(obj.nome === nomeAluno) minhaResposta = obj;
            } catch(e){}
        });

        // 2. Verifica se é Vídeo/PDF e se o aluno já leu
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
                if(minhaResposta.nota && minhaResposta.nota !== "") {
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
                const enunciado = d['Enunciado ou Perguntas (Provas/Tarefas)'] || 'Sem enunciado.';
                btnAcao += `<button onclick="window.abrirModalResposta('${docId}', \`${enunciado.replace(/'/g, "&apos;").replace(/"/g, "&quot;")}\`)" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> Responder Atividade</button>`;
            } else {
                btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
            }
        } else if (precisaResponder && minhaResposta && minhaResposta.nota !== "") {
            btnAcao += `<button onclick="window.verFeedback('${minhaResposta.nota}', \`${(minhaResposta.feedback || 'Sem comentários.').replace(/'/g, "&apos;")}\`)" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
        }

        let cardHtml = `
            <div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;">
                <div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> MÓDULO: ${d['Pasta / Módulo']} | TIPO: ${tipo}</div>
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
    if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?\nAo confirmar, os pontos serão computados na sua jornada.`)) return;

    const registro = `${nomeAluno} (Concluído em: ${new Date().toLocaleString('pt-BR')})`;
    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registro) });
        alert("Material concluído com sucesso! +XP 🎉");
    } catch(e) {
        alert("Erro ao salvar: " + e.message);
    }
};

window.abrirModalResposta = function(docId, enunciado) {
    document.getElementById('resposta-docid').value = docId;
    document.getElementById('resposta-enunciado').textContent = enunciado;
    document.getElementById('resposta-texto').value = '';
    document.getElementById('modal-resposta-aluno').style.display = 'flex';
};

window.enviarRespostaTreinamento = async function() {
    if(!window.alunoLogado) return;
    const docId = document.getElementById('resposta-docid').value;
    const respostaTexto = document.getElementById('resposta-texto').value.trim();
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];

    if(!respostaTexto) return alert("Digite sua resposta antes de enviar!");

    const respostaObj = {
        nome: nomeAluno,
        data: new Date().toLocaleString('pt-BR'),
        resposta: respostaTexto,
        nota: "",
        feedback: ""
    };

    try {
        await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { 
            respostas_alunos: window.arrayUnion(JSON.stringify(respostaObj)) 
        });
        alert("Sua resposta foi enviada para correção do supervisor! 🚀");
        document.getElementById('modal-resposta-aluno').style.display = 'none';
        window.renderizarTrilhaAluno(); 
    } catch(e) {
        alert("Erro ao enviar resposta: " + e.message);
    }
};

window.verFeedback = function(nota, feedback) {
    document.getElementById('feedback-nota').textContent = nota;
    document.getElementById('feedback-texto').textContent = feedback;
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
            if (btnEditar && isAdmin) window.abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, JSON.parse(btnEditar.dataset.info));
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

/* ===== RH & PEOPLE ANALYTICS INTEGRADO ===== */
/* RH & People Analytics Module - Drop-in addon for Painel Clínico */
(() => {
  const RH_TAB_ID = 'rh-analytics';
  const SURVEYS_COLLECTION = 'rh-pesquisas';
  const RESPONSES_COLLECTION = 'rh-respostas-pesquisa';

  const state = {
    surveys: [],
    responses: [],
    charts: {},
    firestore: null,
    unsubscribeSurveys: null,
    unsubscribeResponses: null,
  };

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safeText = (v) => String(v ?? '').replace(/[<>&"]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[m]));
  const slug = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const byNameKey = (name) => slug(name).replace(/\s+/g, ' ');
  const average = (arr) => arr.length ? (arr.reduce((a,b) => a + b, 0) / arr.length) : 0;
  const toNumber = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const formatDateTime = (iso) => {
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return ''; }
  };
  const getCollabs = () => window.todosOsDadosDoSistema?.['colaboradores'] || [];
  const getTrainings = () => window.todosTreinamentosData || window.todosOsDadosDoSistema?.['treinamentos'] || [];
  const getPublicBulletins = () => window.todosBoletinsData || window.todosOsDadosDoSistema?.['boletins'] || [];
  const getPrivateBulletins = () => window.todosPrivadosData || window.todosOsDadosDoSistema?.['boletins-privados'] || [];

  async function ensureFirestore() {
    if (state.firestore) return state.firestore;
    const mod = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
    state.firestore = mod;
    return mod;
  }

  function injectNavButton() {
    const nav = q('.sidebar-nav');
    if (!nav || q(`.nav-btn[data-tab="${RH_TAB_ID}"]`)) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn admin-only';
    btn.dataset.tab = RH_TAB_ID;
    btn.style.display = 'none';
    btn.innerHTML = '<i class="ri-team-fill"></i> RH & Analytics';
    const ensinoBtn = q('.nav-btn[data-tab="ensino"]', nav) || q('.nav-btn[data-tab="escalas"]', nav);
    if (ensinoBtn && ensinoBtn.parentNode) ensinoBtn.parentNode.insertBefore(btn, ensinoBtn.nextSibling);
    else nav.appendChild(btn);

    btn.addEventListener('click', () => {
      qa('.tab-content').forEach(el => el.style.display = 'none');
      const tab = document.getElementById(`tab-${RH_TAB_ID}`);
      if (tab) tab.style.display = 'block';
      qa('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashboard();
    });
  }

  function injectTabContent() {
    if (document.getElementById(`tab-${RH_TAB_ID}`)) return;
    const main = q('.main-content') || q('main');
    if (!main) return;

    const section = document.createElement('section');
    section.id = `tab-${RH_TAB_ID}`;
    section.className = 'tab-content';
    section.style.display = 'none';
    section.innerHTML = `
      <div class="rh-shell">
        <div class="rh-header">
          <div>
            <h2><i class="ri-team-fill"></i> RH & People Analytics</h2>
            <p>Indicadores de desempenho, clima organizacional e talentos usando dados do portal atual.</p>
          </div>
          <div class="rh-header-actions">
            <button id="btn-rh-nova-pesquisa" class="btn-hover color-11 admin-only" style="display:none;">
              <i class="ri-file-list-3-line"></i> Nova Pesquisa
            </button>
            <button id="btn-rh-atualizar" class="btn-hover color-8">
              <i class="ri-refresh-line"></i> Atualizar
            </button>
          </div>
        </div>

        <div class="rh-filters card">
          <div class="rh-filter-grid">
            <input id="rh-filter-search" class="form-input" placeholder="Buscar colaborador">
            <select id="rh-filter-setor" class="form-input"><option value="">Todos os setores</option></select>
            <select id="rh-filter-fit" class="form-input">
              <option value="">Fit cultural</option>
              <option value="8">Maior que 8</option>
              <option value="7">Maior que 7</option>
              <option value="6">Maior que 6</option>
            </select>
            <select id="rh-filter-ranking" class="form-input">
              <option value="">Ranking / nota</option>
              <option value="top">Top performers</option>
              <option value="risco">Em atenção</option>
            </select>
          </div>
        </div>

        <div class="rh-overview-grid">
          <div class="rh-stat-card">
            <span>Total Colaboradores</span>
            <strong id="rh-stat-total">0</strong>
          </div>
          <div class="rh-stat-card">
            <span>Média Geral</span>
            <strong id="rh-stat-media">0,0</strong>
          </div>
          <div class="rh-stat-card">
            <span>Fit Cultural Médio</span>
            <strong id="rh-stat-fit">0,0</strong>
          </div>
          <div class="rh-stat-card">
            <span>Clima Organizacional</span>
            <strong id="rh-stat-clima">0,0</strong>
          </div>
          <div class="rh-stat-card">
            <span>Top Performers</span>
            <strong id="rh-stat-top">0</strong>
          </div>
          <div class="rh-stat-card">
            <span>Em Atenção</span>
            <strong id="rh-stat-risco">0</strong>
          </div>
        </div>

        <div class="rh-panels-grid">
          <div class="card rh-panel">
            <div class="rh-panel-title"><i class="ri-bar-chart-2-fill"></i> Top Performers</div>
            <canvas id="rh-chart-top"></canvas>
          </div>
          <div class="card rh-panel">
            <div class="rh-panel-title"><i class="ri-emotion-happy-fill"></i> Clima & Fit Cultural</div>
            <canvas id="rh-chart-clima"></canvas>
          </div>
        </div>

        <div class="card rh-panel">
          <div class="rh-panel-title"><i class="ri-survey-line"></i> Pesquisas de Clima / Fit</div>
          <div id="rh-surveys-list" class="rh-surveys-list"></div>
        </div>

        <div class="card rh-panel">
          <div class="rh-panel-title"><i class="ri-user-star-fill"></i> Colaboradores</div>
          <div id="rh-collabs-grid" class="rh-collabs-grid"></div>
        </div>
      </div>
    `;
    main.appendChild(section);

    q('#btn-rh-atualizar', section)?.addEventListener('click', renderDashboard);
    q('#btn-rh-nova-pesquisa', section)?.addEventListener('click', openSurveyBuilder);
    ['#rh-filter-search', '#rh-filter-setor', '#rh-filter-fit', '#rh-filter-ranking'].forEach(sel => {
      q(sel, section)?.addEventListener('input', renderDashboard);
      q(sel, section)?.addEventListener('change', renderDashboard);
    });
  }

  function injectModals() {
    if (document.getElementById('rh-modal-survey-builder')) return;
    const host = document.body;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="rh-modal-survey-builder" class="modal-overlay" style="display:none;">
        <div class="modal-box rh-modal-box">
          <div class="rh-modal-header">
            <h3><i class="ri-file-list-3-line"></i> Nova Pesquisa RH</h3>
            <button class="rh-close" data-close-rh="survey-builder">&times;</button>
          </div>
          <div class="rh-form-grid">
            <input id="rh-survey-title" class="form-input" placeholder="Título da pesquisa">
            <select id="rh-survey-category" class="form-input">
              <option value="CLIMA">Clima Organizacional</option>
              <option value="FIT">Fit Cultural</option>
              <option value="ENGAJAMENTO">Engajamento</option>
            </select>
            <select id="rh-survey-target-mode" class="form-input">
              <option value="GERAL">Toda a empresa</option>
              <option value="SETOR">Por setor</option>
              <option value="COLABORADOR">Individual</option>
            </select>
            <input id="rh-survey-target-value" class="form-input" placeholder="Nome do setor ou colaborador (se aplicável)">
          </div>
          <textarea id="rh-survey-thanks" class="form-input rh-textarea" placeholder="Mensagem de agradecimento"></textarea>
          <textarea id="rh-survey-questions" class="form-input rh-textarea" placeholder="Perguntas (1 por linha)&#10;Exemplo: Como você avalia sua liderança? | escala&#10;Como está seu ambiente de trabalho? | escala&#10;Comentário livre | texto"></textarea>
          <div class="rh-actions">
            <button id="rh-btn-save-survey" class="btn-hover color-11"><i class="ri-save-line"></i> Salvar Pesquisa</button>
          </div>
        </div>
      </div>

      <div id="rh-modal-answer-survey" class="modal-overlay" style="display:none;">
        <div class="modal-box rh-modal-box">
          <div class="rh-modal-header">
            <h3 id="rh-answer-title"><i class="ri-chat-check-fill"></i> Responder Pesquisa</h3>
            <button class="rh-close" data-close-rh="answer-survey">&times;</button>
          </div>
          <div id="rh-answer-body"></div>
          <div class="rh-actions">
            <button id="rh-btn-send-answer" class="btn-hover color-11"><i class="ri-send-plane-2-line"></i> Enviar Respostas</button>
          </div>
        </div>
      </div>

      <div id="rh-modal-thanks" class="modal-overlay" style="display:none;">
        <div class="modal-box rh-modal-box rh-thanks-box">
          <div class="rh-thanks-icon"><i class="ri-heart-3-fill"></i></div>
          <h3>Muito obrigado!</h3>
          <p id="rh-thanks-message">Sua participação foi registrada.</p>
          <div class="rh-actions">
            <button class="btn-hover color-11" data-close-rh="thanks">Fechar</button>
          </div>
        </div>
      </div>
    `;
    host.appendChild(wrap);

    qa('[data-close-rh]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-close-rh');
        const id = key === 'survey-builder' ? 'rh-modal-survey-builder'
          : key === 'answer-survey' ? 'rh-modal-answer-survey'
          : 'rh-modal-thanks';
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    });

    q('#rh-btn-save-survey')?.addEventListener('click', saveSurvey);
    q('#rh-btn-send-answer')?.addEventListener('click', submitSurveyResponse);
  }

  function ensurePortalWidget() {
    const dash = document.getElementById('ensino-dashboard-area');
    if (!dash || document.getElementById('rh-pending-surveys-widget')) return;

    const box = document.createElement('div');
    box.id = 'rh-pending-surveys-widget';
    box.className = 'card rh-portal-widget';
    box.innerHTML = `
      <div class="rh-panel-title"><i class="ri-survey-line"></i> Pesquisas RH</div>
      <div id="rh-pending-surveys-list">
        <p style="color:var(--text-muted); margin:0;">Sem pesquisas pendentes no momento.</p>
      </div>
    `;
    dash.appendChild(box);
  }

  function getCollaboratorName() {
    return window.alunoLogado?.['Nome Completo do Colaborador'] || window.alunoLogado?.nome || '';
  }
  function getCollaboratorSector() {
    return window.alunoLogado?.['Setor da Clínica'] || window.alunoLogado?.setor || '';
  }

  function buildSurveyQuestions(raw) {
    return String(raw || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const parts = line.split('|').map(v => v.trim());
        const text = parts[0] || `Pergunta ${idx + 1}`;
        const type = slug(parts[1] || 'escala').includes('texto') ? 'TEXTO' : 'ESCALA';
        return {
          id: `q_${Date.now()}_${idx}`,
          text,
          type,
          options: type === 'ESCALA' ? [1,2,3,4,5,6,7,8,9,10] : []
        };
      });
  }

  async function saveSurvey() {
    const title = q('#rh-survey-title')?.value.trim();
    const category = q('#rh-survey-category')?.value;
    const targetMode = q('#rh-survey-target-mode')?.value;
    const targetValue = q('#rh-survey-target-value')?.value.trim();
    const thanks = q('#rh-survey-thanks')?.value.trim() || 'Obrigado por contribuir com o nosso clima organizacional.';
    const questions = buildSurveyQuestions(q('#rh-survey-questions')?.value || '');

    if (!title) return alert('Informe o título da pesquisa.');
    if (!questions.length) return alert('Cadastre ao menos uma pergunta.');
    if ((targetMode === 'SETOR' || targetMode === 'COLABORADOR') && !targetValue) return alert('Informe o alvo da pesquisa.');

    const { collection, addDoc, serverTimestamp } = await ensureFirestore();
    await addDoc(collection(window.db, SURVEYS_COLLECTION), {
      titulo: title,
      categoria: category,
      targetMode,
      targetValue: targetValue || '',
      thanksMessage: thanks,
      status: 'ATIVA',
      ativa: true,
      perguntas: questions,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp ? serverTimestamp() : null
    });

    q('#rh-modal-survey-builder').style.display = 'none';
    q('#rh-survey-title').value = '';
    q('#rh-survey-target-value').value = '';
    q('#rh-survey-thanks').value = '';
    q('#rh-survey-questions').value = '';
    alert('Pesquisa RH criada com sucesso.');
  }

  function openSurveyBuilder() {
    q('#rh-modal-survey-builder').style.display = 'flex';
  }

  function surveyMatchesCurrentUser(survey) {
    const nome = byNameKey(getCollaboratorName());
    const setor = byNameKey(getCollaboratorSector());
    if (!survey?.ativa || survey?.status !== 'ATIVA') return false;
    if (survey.targetMode === 'GERAL') return true;
    if (survey.targetMode === 'SETOR') return byNameKey(survey.targetValue) === setor;
    if (survey.targetMode === 'COLABORADOR') return byNameKey(survey.targetValue) === nome;
    return false;
  }

  function hasUserResponded(surveyId) {
    const nome = byNameKey(getCollaboratorName());
    return state.responses.some(r => String(r.surveyId) === String(surveyId) && byNameKey(r.colaboradorNome) === nome);
  }

  function renderPortalSurveys() {
    ensurePortalWidget();
    const host = q('#rh-pending-surveys-list');
    if (!host) return;
    const nome = getCollaboratorName();
    if (!nome) {
      host.innerHTML = '<p style="color:var(--text-muted); margin:0;">Faça login no portal do aluno para visualizar suas pesquisas.</p>';
      return;
    }
    const pending = state.surveys.filter(s => surveyMatchesCurrentUser(s) && !hasUserResponded(s.id));
    if (!pending.length) {
      host.innerHTML = '<p style="color:var(--text-muted); margin:0;">Sem pesquisas pendentes no momento.</p>';
      return;
    }
    host.innerHTML = pending.map(s => `
      <div class="rh-portal-survey-item">
        <div>
          <strong>${safeText(s.titulo)}</strong>
          <span>${safeText(s.categoria || 'Pesquisa')}</span>
        </div>
        <button class="btn-hover color-11 rh-btn-answer" data-survey-id="${safeText(s.id)}">
          <i class="ri-chat-check-line"></i> Responder
        </button>
      </div>
    `).join('');

    qa('.rh-btn-answer', host).forEach(btn => {
      btn.addEventListener('click', () => openAnswerModal(btn.dataset.surveyId));
    });
  }

  function openAnswerModal(surveyId) {
    const survey = state.surveys.find(s => String(s.id) === String(surveyId));
    if (!survey) return;
    q('#rh-answer-title').innerHTML = `<i class="ri-chat-check-fill"></i> ${safeText(survey.titulo)}`;
    const body = q('#rh-answer-body');
    body.dataset.surveyId = survey.id;
    body.innerHTML = (survey.perguntas || []).map((pergunta, idx) => {
      if (pergunta.type === 'TEXTO') {
        return `
          <div class="rh-answer-block">
            <label>${idx + 1}. ${safeText(pergunta.text)}</label>
            <textarea class="form-input rh-textarea rh-answer-input" data-question-id="${safeText(pergunta.id)}" data-question-type="TEXTO"></textarea>
          </div>
        `;
      }
      return `
        <div class="rh-answer-block">
          <label>${idx + 1}. ${safeText(pergunta.text)}</label>
          <div class="rh-scale-row">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <label class="rh-scale-option">
                <input type="radio" name="q_${safeText(pergunta.id)}" value="${n}" data-question-id="${safeText(pergunta.id)}" data-question-type="ESCALA">
                <span>${n}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    q('#rh-modal-answer-survey').style.display = 'flex';
  }

  async function submitSurveyResponse() {
    const body = q('#rh-answer-body');
    const surveyId = body?.dataset?.surveyId;
    const survey = state.surveys.find(s => String(s.id) === String(surveyId));
    if (!survey) return alert('Pesquisa não encontrada.');

    const answers = [];
    const numericValues = [];
    for (const pergunta of (survey.perguntas || [])) {
      if (pergunta.type === 'TEXTO') {
        const el = q(`.rh-answer-input[data-question-id="${pergunta.id}"]`, body);
        answers.push({ questionId: pergunta.id, text: el?.value?.trim() || '', numeric: null });
      } else {
        const checked = q(`input[name="q_${pergunta.id}"]:checked`, body);
        if (!checked) return alert('Responda todas as perguntas de escala antes de enviar.');
        const val = Number(checked.value);
        answers.push({ questionId: pergunta.id, text: '', numeric: val });
        numericValues.push(val);
      }
    }

    const score = average(numericValues);
    const { collection, addDoc, serverTimestamp } = await ensureFirestore();

    await addDoc(collection(window.db, RESPONSES_COLLECTION), {
      surveyId: survey.id,
      surveyTitle: survey.titulo,
      categoria: survey.categoria,
      colaboradorNome: getCollaboratorName(),
      colaboradorSetor: getCollaboratorSector(),
      answers,
      score,
      submittedAt: new Date().toISOString(),
      submittedAtServer: serverTimestamp ? serverTimestamp() : null
    });

    q('#rh-modal-answer-survey').style.display = 'none';
    q('#rh-thanks-message').textContent = survey.thanksMessage || 'Obrigado por participar.';
    q('#rh-modal-thanks').style.display = 'flex';
  }

  function extractTrainingGrades() {
    const gradeMap = new Map();
    for (const item of getTrainings()) {
      const data = item.data || item;
      const respostas = Array.isArray(data.respostas_alunos) ? data.respostas_alunos : [];
      respostas.forEach(raw => {
        let obj = null;
        try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
        if (!obj || !obj.nome) return;
        const nome = byNameKey(obj.nome);
        if (!gradeMap.has(nome)) gradeMap.set(nome, []);
        const nota = toNumber(obj.nota);
        if (nota > 0) gradeMap.get(nome).push({ nota });
      });
    }
    return gradeMap;
  }

  function extractBulletinWeights() {
    const publicList = getPublicBulletins().map(i => i.data || i);
    const privateList = getPrivateBulletins().map(i => i.data || i);
    return { publicList, privateList };
  }

  function computeSurveyAggregates() {
    const climaResponses = state.responses.filter(r => (r.categoria || '').toUpperCase() === 'CLIMA');
    const fitResponses = state.responses.filter(r => (r.categoria || '').toUpperCase() === 'FIT');
    return {
      clima: average(climaResponses.map(r => toNumber(r.score))),
      fit: average(fitResponses.map(r => toNumber(r.score))),
    };
  }

  function buildCollaboratorAnalytics() {
    const collabs = getCollabs();
    const gradeMap = extractTrainingGrades();
    const { publicList, privateList } = extractBulletinWeights();
    const aggregates = computeSurveyAggregates();

    return collabs.map(entry => {
      const d = entry.data || entry;
      const nome = d['Nome Completo do Colaborador'] || d.nome || d['Nome'] || 'Sem nome';
      const setor = d['Setor da Clínica'] || d.setor || d['Setor'] || 'Não informado';
      const cargo = d['Cargo'] || d.cargo || d['Função'] || '';
      const foto = d['Foto'] || d['Foto do Colaborador'] || d.foto || '';
      const notas = (gradeMap.get(byNameKey(nome)) || []).map(g => g.nota);
      const mediaTreinamento = average(notas);
      const fitColab = average(state.responses
        .filter(r => (r.categoria || '').toUpperCase() === 'FIT' && byNameKey(r.colaboradorNome) === byNameKey(nome))
        .map(r => toNumber(r.score)));
      const climaColab = average(state.responses
        .filter(r => (r.categoria || '').toUpperCase() === 'CLIMA' && byNameKey(r.colaboradorNome) === byNameKey(nome))
        .map(r => toNumber(r.score)));
      const privCount = privateList.filter(b => byNameKey(b['Para qual Colaborador?']) === byNameKey(nome)).length;
      const groupCount = publicList.filter(b => {
        const setores = String(b['Para quais Setores?'] || 'Geral');
        return setores.includes('Geral') || setores.split(',').map(v => byNameKey(v)).includes(byNameKey(setor));
      }).length;
      const mediaGeral = average([mediaTreinamento || 0, fitColab || aggregates.fit || 0, climaColab || aggregates.clima || 0].filter(v => v > 0));
      const risco = (mediaGeral && mediaGeral < 6.5) || privCount >= 3;
      const destaque = mediaTreinamento >= 8.5 && (fitColab || aggregates.fit) >= 8;
      const crescimento = mediaTreinamento >= 7.5 && groupCount >= 1 && !risco;

      return {
        nome, setor, cargo, foto, mediaGeral, mediaTreinamento,
        fit: fitColab || aggregates.fit || 0,
        clima: climaColab || aggregates.clima || 0,
        boletinsIndividuais: privCount,
        boletinsGrupo: groupCount,
        risco, destaque, crescimento
      };
    });
  }

  function populateSectorFilter(rows) {
    const select = q('#rh-filter-setor');
    if (!select) return;
    const current = select.value;
    const setores = [...new Set(rows.map(r => r.setor).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    select.innerHTML = '<option value="">Todos os setores</option>' + setores.map(s => `<option value="${safeText(s)}">${safeText(s)}</option>`).join('');
    select.value = current;
  }

  function applyFilters(rows) {
    const text = slug(q('#rh-filter-search')?.value || '');
    const setor = q('#rh-filter-setor')?.value || '';
    const fitMin = Number(q('#rh-filter-fit')?.value || 0);
    const rankingMode = q('#rh-filter-ranking')?.value || '';

    return rows.filter(r => {
      if (text && !slug(`${r.nome} ${r.cargo} ${r.setor}`).includes(text)) return false;
      if (setor && r.setor !== setor) return false;
      if (fitMin && r.fit < fitMin) return false;
      if (rankingMode === 'top' && !(r.mediaTreinamento >= 8)) return false;
      if (rankingMode === 'risco' && !r.risco) return false;
      return true;
    });
  }

  function renderOverview(rows) {
    const ag = computeSurveyAggregates();
    const mediaGeral = average(rows.map(r => r.mediaGeral).filter(v => v > 0));
    const topCount = rows.filter(r => r.destaque).length;
    const riscoCount = rows.filter(r => r.risco).length;

    q('#rh-stat-total').textContent = String(rows.length);
    q('#rh-stat-media').textContent = mediaGeral.toFixed(1).replace('.', ',');
    q('#rh-stat-fit').textContent = (ag.fit || 0).toFixed(1).replace('.', ',');
    q('#rh-stat-clima').textContent = (ag.clima || 0).toFixed(1).replace('.', ',');
    q('#rh-stat-top').textContent = String(topCount);
    q('#rh-stat-risco').textContent = String(riscoCount);
  }

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      state.charts[key] = null;
    }
  }

  function renderCharts(rows) {
    if (!window.Chart) return;
    const topRows = [...rows].sort((a,b) => b.mediaTreinamento - a.mediaTreinamento).slice(0, 8);
    const clima = computeSurveyAggregates();

    destroyChart('top');
    destroyChart('clima');

    const ctxTop = q('#rh-chart-top');
    const ctxClima = q('#rh-chart-clima');

    if (ctxTop) {
      state.charts.top = new Chart(ctxTop, {
        type: 'bar',
        data: {
          labels: topRows.map(r => r.nome.split(' ').slice(0,2).join(' ')),
          datasets: [{ label: 'Prova / Treinamento', data: topRows.map(r => Number(r.mediaTreinamento.toFixed(2))) }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    if (ctxClima) {
      state.charts.clima = new Chart(ctxClima, {
        type: 'doughnut',
        data: {
          labels: ['Clima', 'Fit Cultural'],
          datasets: [{ data: [Number((clima.clima || 0).toFixed(2)), Number((clima.fit || 0).toFixed(2))] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  function renderCollaborators(rows) {
    const grid = q('#rh-collabs-grid');
    if (!grid) return;
    grid.innerHTML = rows.map(r => {
      const initials = r.nome.split(' ').map(v => v[0]).slice(0,2).join('').toUpperCase();
      const photo = r.foto && !String(r.foto).includes('file:///') ? (window.formatarLinkImagem ? window.formatarLinkImagem(r.foto) : r.foto) : '';
      const riscoClass = r.risco ? 'risco' : r.destaque ? 'destaque' : 'neutro';
      const insight = r.risco
        ? 'Em atenção'
        : r.destaque
          ? 'Alto potencial'
          : r.crescimento
            ? 'Chance de crescimento'
            : 'Em desenvolvimento';

      return `
        <div class="rh-collab-card ${riscoClass}">
          <div class="rh-collab-header">
            <div class="rh-avatar">
              ${photo ? `<img src="${safeText(photo)}" alt="${safeText(r.nome)}">` : `<span>${safeText(initials)}</span>`}
            </div>
            <div class="rh-collab-meta">
              <h4>${safeText(r.nome)}</h4>
              <p>${safeText(r.cargo || 'Colaborador')} • ${safeText(r.setor)}</p>
            </div>
            <div class="rh-score-badge">${r.mediaGeral ? r.mediaGeral.toFixed(1).replace('.', ',') : '0,0'}</div>
          </div>
          <div class="rh-collab-grid">
            <div><span>Prova / Treino</span><strong>${r.mediaTreinamento.toFixed(1).replace('.', ',')}</strong></div>
            <div><span>Fit Cultural</span><strong>${r.fit.toFixed(1).replace('.', ',')}</strong></div>
            <div><span>Boletim Individual</span><strong>${r.boletinsIndividuais}</strong></div>
            <div><span>Boletim Grupo</span><strong>${r.boletinsGrupo}</strong></div>
          </div>
          <div class="rh-collab-footer">
            <span class="rh-chip ${riscoClass}">${safeText(insight)}</span>
          </div>
        </div>
      `;
    }).join('') || '<p style="color:var(--text-muted); margin:0;">Nenhum colaborador encontrado.</p>';
  }

  function renderSurveysAdmin() {
    const box = q('#rh-surveys-list');
    if (!box) return;
    box.innerHTML = state.surveys.map(s => {
      const resp = state.responses.filter(r => String(r.surveyId) === String(s.id));
      const media = average(resp.map(r => toNumber(r.score)));
      const target = s.targetMode === 'GERAL' ? 'Empresa inteira' : `${s.targetMode}: ${s.targetValue}`;
      return `
        <div class="rh-survey-card">
          <div>
            <h4>${safeText(s.titulo)}</h4>
            <p>${safeText(s.categoria)} • ${safeText(target)} • ${resp.length} resposta(s)</p>
            <small>Atualizado em ${safeText(formatDateTime(s.createdAt))}</small>
          </div>
          <div class="rh-survey-stats">
            <span>Média: <strong>${media ? media.toFixed(1).replace('.', ',') : '0,0'}</strong></span>
          </div>
        </div>
      `;
    }).join('') || '<p style="color:var(--text-muted); margin:0;">Nenhuma pesquisa RH cadastrada ainda.</p>';
  }

  function renderDashboard() {
    const rows = buildCollaboratorAnalytics();
    populateSectorFilter(rows);
    const filtered = applyFilters(rows);
    renderOverview(filtered);
    renderCharts(filtered);
    renderCollaborators(filtered);
    renderSurveysAdmin();
    renderPortalSurveys();
  }

  async function watchCollections() {
    const { collection, onSnapshot } = await ensureFirestore();
    if (state.unsubscribeSurveys) state.unsubscribeSurveys();
    if (state.unsubscribeResponses) state.unsubscribeResponses();

    state.unsubscribeSurveys = onSnapshot(collection(window.db, SURVEYS_COLLECTION), snap => {
      state.surveys = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderDashboard();
    });
    state.unsubscribeResponses = onSnapshot(collection(window.db, RESPONSES_COLLECTION), snap => {
      state.responses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderDashboard();
    });
  }

  function patchPortalLifecycle() {
    if (window.__rhPatchedPortal) return;
    window.__rhPatchedPortal = true;

    const oldRender = window.renderizarTrilhaAluno;
    if (typeof oldRender === 'function') {
      window.renderizarTrilhaAluno = function(...args) {
        const out = oldRender.apply(this, args);
        setTimeout(renderPortalSurveys, 50);
        return out;
      };
    }

    const oldEntrar = window.entrarPortalAluno;
    if (typeof oldEntrar === 'function') {
      window.entrarPortalAluno = function(...args) {
        const out = oldEntrar.apply(this, args);
        setTimeout(renderPortalSurveys, 150);
        return out;
      };
    }

    const oldSair = window.sairPortalAluno;
    if (typeof oldSair === 'function') {
      window.sairPortalAluno = function(...args) {
        const out = oldSair.apply(this, args);
        setTimeout(renderPortalSurveys, 50);
        return out;
      };
    }
  }

  function init() {
    injectNavButton();
    injectTabContent();
    injectModals();
    ensurePortalWidget();
    patchPortalLifecycle();
    watchCollections().catch(err => console.error('RH module Firestore:', err));
    renderDashboard();

    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.nav-btn[data-tab]');
      if (navBtn) {
        setTimeout(() => {
          if (navBtn.dataset.tab === RH_TAB_ID) renderDashboard();
          else renderPortalSurveys();
        }, 50);
      }
    });

    const observer = new MutationObserver(() => {
      ensurePortalWidget();
      renderPortalSurveys();
    });
    const dash = document.getElementById('dashboard-screen');
    if (dash) observer.observe(dash, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ===== PATCH LEVE DE CARDS + ESTABILIDADE ===== */
(() => {
  // Mantém apenas o card clicado aberto/fechado, sem animar os demais
  window.toggleCardExpand = function(btnEl) {
    const cardEl = btnEl && btnEl.closest ? btnEl.closest('.card-collapsible') : null;
    if (!cardEl) return;
    const expanded = !cardEl.classList.contains('expanded');
    cardEl.classList.toggle('expanded', expanded);
    const btn = cardEl.querySelector('.card-toggle');
    if (btn) {
      btn.innerHTML = expanded ? '<i class="ri-close-line"></i>' : '<i class="ri-add-line"></i>';
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.title = expanded ? 'Recolher card' : 'Expandir card';
    }
  };

  // Reforço para evitar cards "esticando" a linha do grid
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cards-grid').forEach(grid => {
      grid.style.alignItems = 'start';
    });
  });

  // Cache-bust visual de tema/role quando alterna login
  const oldIrParaAba = window.irParaAba;
  if (typeof oldIrParaAba === 'function') {
    window.irParaAba = function(aba) {
      const res = oldIrParaAba.apply(this, arguments);
      requestAnimationFrame(() => {
        document.querySelectorAll('.cards-grid').forEach(grid => {
          grid.style.alignItems = 'start';
        });
      });
      return res;
    };
  }
})();
