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
        campos: ['Título da Atividade', 'Pasta / Módulo', 'Tipo (Vídeo, PDF, Tarefa, Prova)', 'Link do Material (Se houver)', 'Colaborador Específico (Opcional)', 'Para quais Setores?', 'Pontos Valendo', 'Configuração da Avaliação'], 
        campoAgrupador: 'Pasta / Módulo', 
        icone: 'ri-book-read-fill' 
    },

    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA', 'Exibir Logo do Convenio', 'Link da Foto do Profissional'], campoAgrupador: 'Especialidade', icone: 'ri-team-fill' }, 
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Aceita o Servico?', 'Observações'], campoAgrupador: 'Convênio', icone: 'ri-shield-cross-fill' },
    
    // 👇 NOVOS CAMPOS DE PROFISSIONAIS AQUI 👇
    'ultrassom': { titulo: 'Exame de Ultrassom', campos: ['Exame', 'Código', 'Profissionais que realizam (Opcional)', 'Restrição de Idade', 'Observação'], campoAgrupador: 'Exame', icone: 'ri-pulse-line' },
    'consultas': { titulo: 'Consulta / Procedimento', campos: ['Tipo', 'Código', 'Descrição', 'Valor', 'Profissionais que realizam (Opcional)', 'Observações'], campoAgrupador: 'Tipo', icone: 'ri-stethoscope-line' },
    'exames-imagem': { titulo: 'Exame de Imagem', campos: ['Categoria do Exame', 'Código', 'Descrição', 'Valor', 'Prazo de Laudo', 'Profissionais que realizam (Opcional)', 'Onde encontrar resultado', 'Observações', 'Convênios'], campoAgrupador: 'Categoria do Exame', icone: 'ri-body-scan-line' },
    
    'pacotes': { titulo: 'Pacote PS', campos: ['Descrição', 'Valor ou Informacao', 'O que está incluso', 'Observações', 'Pacotes', 'Kit'] },
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

window.db = db; window.updateDoc = updateDoc; window.doc = doc; window.arrayUnion = arrayUnion; window.arrayRemove = arrayRemove; window.addDoc = addDoc; window.collection = collection; window.deleteDoc = deleteDoc; window.onSnapshot = onSnapshot;

let isAdmin = false; let abaAtual = 'home'; const EMAIL_GESTAO = "gestao@clinica.com";

let listaColaboradoresGlobal = []; let locaisGlobais = []; let setoresGlobais = []; let especialidadesGlobais = []; let motivosGlobais = []; let imagemPadraoPastas = ""; 

window.todosBoletinsData = []; window.todosPrivadosData = []; window.todosTreinamentosData = []; 
window.todosPesquisasRH = []; window.todosRespostasRH = []; 

window.dadosGlobaisAbas = {}; window.todosOsDadosDoSistema = {}; window.dadosBoletins = {}; 
window.pastaBoletimAtual = null; window.pastaPrivadoAtual = null; window.alunoLogado = null; 

window.corStatusPendente = "#e53e3e"; window.corStatusConcluido = "#38a169";

let chartBoletinsInst = null; let chartPrivadosInst = null; let chartHomeInst = null; let chartPrivadosGeralInst = null;   

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW não registrado:', err));
    });
}

const paletaGradientes = [
    { valor: "#ffffff", nome: "Branco Padrão", dark: false }, { valor: "#e53e3e", nome: "Vermelho Sólido", dark: true }, { valor: "#3182ce", nome: "Azul Sólido", dark: true },
    { valor: "#38a169", nome: "Verde Sólido", dark: true }, { valor: "#ecc94b", nome: "Amarelo Sólido", dark: false }, { valor: "#805ad5", nome: "Roxo Sólido", dark: true },
    { valor: "linear-gradient(to right, #fc6076, #ff9a44, #ef9d43, #e75516)", nome: "Laranja", dark: true }, { valor: "linear-gradient(to right, #0ba360, #3cba92, #30dd8a, #2bb673)", nome: "Verde Claro", dark: true },
    { valor: "linear-gradient(to right, #6253e1, #852D91, #A3A1FF, #F24645)", nome: "Roxo/Azul", dark: true }, { valor: "linear-gradient(to right, #29323c, #485563, #2b5876, #4e4376)", nome: "Escuro", dark: true },
    { valor: "linear-gradient(to right, #eb3941, #f15e64, #e14e53, #e2373f)", nome: "Vermelho HD", dark: true }
];

window.efetuarLogin = function(e) {
    if(e && e.preventDefault) e.preventDefault(); 
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const btn = document.getElementById('btn-login');
    if(!email || !senha) return alert("Por favor, preencha o e-mail e a senha.");
    const textoOriginal = btn ? btn.innerHTML : "Entrar";
    if(btn) btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Autenticando...";
    signInWithEmailAndPassword(auth, email, senha).then(() => { if(btn) btn.innerHTML = textoOriginal; }).catch(err => {
        console.error(err); alert("Erro ao entrar: E-mail ou Senha incorretos."); if(btn) btn.innerHTML = textoOriginal;
    });
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
        if(isAdmin) {
            if(badge) badge.classList.add('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        } else {
            if(badge) badge.classList.remove('admin'); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
        Object.keys(configuracaoAbas).forEach(idColecao => window.renderizarCards(idColecao));
        window.carregarConfiguracoes(); window.buscarClimaAraucaria(); 
        if(window.escutarRH) window.escutarRH(); 
    } else {
        if(loginScreen) loginScreen.style.display = 'flex'; if(dashboardScreen) dashboardScreen.style.display = 'none';
        if(chatFab) chatFab.style.display = 'none';
    }
});

setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
window.formatarLinkImagem = function(link) {
    if (!link || link.includes('file:///')) return null;
    if (link.includes("drive.google.com")) { const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`; }
    return link;
};

window.buscarClimaAraucaria = async function() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.59&longitude=-49.41&current_weather=true'); const data = await response.json(); const clima = data.current_weather;
        const wDeg = document.getElementById('weather-deg'); if(wDeg) wDeg.textContent = Math.round(clima.temperature);
        let desc = "Céu Limpo"; let icon = "ri-sun-fill";
        if(clima.weathercode >= 1 && clima.weathercode <= 3) { desc = "Parcialmente Nublado"; icon = "ri-sun-cloudy-fill"; }
        if(clima.weathercode === 45 || clima.weathercode === 48) { desc = "Neblina"; icon = "ri-foggy-fill"; }
        if(clima.weathercode >= 51 && clima.weathercode <= 67) { desc = "Chuva Leve"; icon = "ri-drizzle-fill"; }
        if(clima.weathercode >= 71 && clima.weathercode <= 77) { desc = "Chuva/Neve"; icon = "ri-snowy-line"; }
        if(clima.weathercode >= 80 && clima.weathercode <= 82) { desc = "Pancadas de Chuva"; icon = "ri-showers-fill"; }
        if(clima.weathercode >= 95) { desc = "Tempestade"; icon = "ri-thunderstorms-fill"; }
        const wDesc = document.getElementById('weather-desc'); const wIcon = document.getElementById('weather-icon-class');
        if(wDesc) wDesc.textContent = desc; if(wIcon) wIcon.className = icon;
    } catch(e) { const wDesc = document.getElementById('weather-desc'); if(wDesc) wDesc.textContent = "Clima indisponível"; }
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

// 💡 DESTAQUE DE CARD (PISCAR)
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
        const arr = JSON.parse(jsonStr);
        arr.forEach(q => window.adicionarPerguntaBuilder(q.tipo, q));
    } catch(e) { console.error("Erro ao ler JSON de provas:", e); }
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

    // Geração dinâmica dos inputs e listas suspensas (Inclui os exames dinâmicos)
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
        
        // 👇 A MÁGICA DOS EXAMES/MÉDICOS AQUI 👇
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
    
    const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'] || 'Detalhes do Cadastro';
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
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo && chave !== 'Configuração da Avaliação' && !String(chave).includes('Link da Foto') && !String(chave).includes('Link da Logo') && chave !== 'PIN de Acesso (Treinamentos)') {
            
            if (chave === 'Aceita o Servico?') {
                const badgeClass = valor === 'Não' ? 'status-negado' : 'status-aceito';
                const iconClass = valor === 'Não' ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill';
                const text = valor === 'Não' ? 'Serviço Não Coberto' : 'Serviço Coberto';
                cardHtml += `<div style="margin: 8px 0;"><span class="${badgeClass}"><i class="${iconClass}"></i> ${text}</span></div>`;
            } 
            // Lógica do Mapa de Remoções e Quebra de Linhas
            else if(chave === 'Local e Link Maps') {
                if(String(valor).includes('<iframe')) {
                    cardHtml += `<div class="card-info" style="font-size:13px; margin-top: 10px;"><strong>${chave}:</strong><div style="margin-top:5px; border-radius:10px; overflow:hidden;">${valor}</div></div>`;
                } else if(String(valor).includes('http')) {
                    const urlMatch = String(valor).match(/https?:\/\/[^\s]+/);
                    const url = urlMatch ? urlMatch[0] : valor;
                    const textoSemUrl = String(valor).replace(url, '').trim();
                    cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span style="white-space: pre-wrap;">${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 5px;"><i class="ri-map-pin-user-fill"></i> Abrir Mapa</button></div>`;
                } else {
                    cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span style="white-space: pre-wrap;">${valor}</span></div>`; 
                }
            } else {
                // 👇 AQUI APLICAMOS A QUEBRA DE LINHA GERAL 👇
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span style="white-space: pre-wrap;">${valor}</span></div>`; 
            }
        }
    });

    if(hasFlexLayout) cardHtml += `</div></div>`;

    if(colecaoNome === 'colaboradores' && data['PIN de Acesso (Treinamentos)']) {
         cardHtml += `<div style="margin-top:10px; background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:12px; border: 1px dashed var(--border-color);"><strong>🔑 PIN de Acesso:</strong> ${data['PIN de Acesso (Treinamentos)']}</div>`;
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
    const pastasUnicas = [...new Set(dadosAtuais.map(i => i.data[config.campoAgrupador] || 'Geral'))].sort();
    pastasUnicas.forEach(nomePasta => {
        const itensPasta = dadosAtuais.filter(i => (i.data[config.campoAgrupador] || 'Geral') === nomePasta);
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
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="window.abrirMidaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
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
    const boletinsExibir = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === colabAtual);
    if(typeof window.atualizarGrafico === 'function') chartPrivadosInst = window.atualizarGrafico('chart-privados', chartPrivadosInst, boletinsExibir, `Motivos de ${colabAtual}`);

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
        if(!grid) return; grid.style.display = 'grid'; grid.innerHTML = '';
        itens.sort((a, b) => { return String(a.data[configuracaoAbas[colecaoNome].campos[0]]).localeCompare(String(b.data[configuracaoAbas[colecaoNome].campos[0]])); }).forEach((item) => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
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
                'tab-input-chat-logo': 'chat_logo', 'tab-color-chat': 'chat_cor', 'tab-color-pendente': 'cor_pendente', 'tab-color-concluido': 'cor_concluido'
            };

            Object.keys(mapIds).forEach(id => {
                const el = document.getElementById(id);
                if(el && data[mapIds[id]] !== undefined) el.value = data[mapIds[id]];
            });

            const chatLogo = data.chat_logo || "https://cdn-icons-png.flaticon.com/512/8943/8943377.png";
            const chatCor = data.chat_cor || "#0ba360";
            document.documentElement.style.setProperty('--chat-primary', chatCor);
            
            const fabImg = document.getElementById('chat-fab-img'); const headerImg = document.getElementById('chat-header-img');
            if(fabImg) fabImg.src = window.formatarLinkImagem(chatLogo) || chatLogo; if(headerImg) headerImg.src = window.formatarLinkImagem(chatLogo) || chatLogo;

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
    const win = document.getElementById('chat-window'); const fab = document.getElementById('chat-fab'); if(!win || !fab) return;
    if (win.style.display === 'none' || win.style.display === '') {
        win.style.display = 'flex'; const tooltip = fab.querySelector('.chatbot-tooltip'); if(tooltip) tooltip.style.display = 'none';
        const termosPopulares = ['Cardiologia', 'Ultrassom', 'Unimed', 'Raio-X', 'Pediatria', 'Ortopedia', 'Consulta', 'Boletim'];
        termosPopulares.sort(() => 0.5 - Math.random());
        const top3 = termosPopulares.slice(0, 3);
        const quickRepliesDiv = document.querySelector('.chat-quick-replies');
        if(quickRepliesDiv) { quickRepliesDiv.innerHTML = ''; top3.forEach(termo => { quickRepliesDiv.innerHTML += `<button onclick="window.sendQuickMsg('${termo}')">${termo}</button>`; }); }
        setTimeout(() => { document.getElementById('chat-input').focus(); }, 100);
    } else { win.style.display = 'none'; }
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
    if (resposta === 'sim') { window.addChatBubble("Pode escrever aqui abaixo que estou aqui para te ajudar! 😊", 'bot'); } else {
        const frasesMotivacionais = ["Ter uma inteligência artificial para ajudar é ótimo, mas lembre-se: conte sempre com o seu colega ao lado. O trabalho em equipe nos leva mais longe! 🚀", "Que você tenha um excelente turno! A tecnologia agiliza, mas é o calor humano da nossa equipe que faz a clínica brilhar. 💙", "Agradeço a consulta! Juntos somos mais fortes. O sucesso é a soma do esforço de toda a equipe. Um abraço virtual! 🤖"];
        window.addChatBubble(frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)], 'bot');
    }
};

window.processarLogicaDoBot = function(mensagemUser) {
    const texto = mensagemUser.toLowerCase().trim();
    if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto.includes('bom dia') || texto.includes('boa tarde')) return "Olá! Sou a assistente virtual da clínica. Como posso ajudar? Busque por especialidades, médicos ou exames!";
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
                
                // 👇 A MÁGICA: O BOT PROCURA QUEM FAZ O EXAME 👇
                let profissionais = item.data['Profissionais que realizam (Opcional)'];
                if(profissionais && profissionais.trim() !== '') {
                    detalhesStr += `<div style="background:#eefbf4; padding:8px; border-radius:8px; margin-bottom:8px; border-left:3px solid #38a169;"><b>👨‍⚕️ Quem realiza:</b> ${profissionais}</div>`;
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
        const dicas = [
            "Dica: Se o paciente precisar de exames, pesquise o nome do exame que eu te digo qual médico faz! 🩺",
            "Você sabia que pode pesquisar por nomes de médicos específicos ou especialidades (ex: Ortopedia)?",
            "Você também pode pesquisar por Convênios para ver as regras de atendimento!",
            "Na dúvida? Pesquise pelo setor e eu te mostro os ramais."
        ];
        respostaFormatada += `<div style="background: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 11px; margin-top: 10px; border-left: 3px solid var(--primary-color);">💡 <b>Dica:</b> ${dicas[Math.floor(Math.random() * dicas.length)]}</div>`;
        respostaFormatada += `<div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 10px; text-align: center;"><p style="margin-bottom: 8px; font-weight: 600;">Precisa de algo mais?</p><div style="display: flex; gap: 10px; justify-content: center;"><button onclick="window.handleChatFollowUp('sim', this)" style="flex: 1; padding: 8px; border: none; background: #38a169; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Sim</button><button onclick="window.handleChatFollowUp('nao', this)" style="flex: 1; padding: 8px; border: none; background: #e53e3e; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Não</button></div></div>`;
        return respostaFormatada;
    }
    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. 🤔<br><br>Tente pesquisar por uma palavra-chave mais simples, como o nome de um exame ou especialidade!";
};

// ==========================================
// 6. LÓGICA DA JORNADA DE APRENDIZADO E CORREÇÃO ADMIN
// ==========================================
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

    if(treinamentosAluno.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); background: white; padding: 20px; border-radius: 10px;">Sem treinamentos pendentes. Parabéns! 🎉</p>'; }

    treinamentosAluno.forEach(item => {
        const d = item.data; const docId = item.id;
        const respostas = d.respostas_alunos || [];
        let minhaResposta = null; respostas.forEach(r => { try { let obj = JSON.parse(r); if(obj.nome === nomeAluno) minhaResposta = obj; } catch(e){} });

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
        if(d['Link do Material (Se houver)']) btnAcao += `<button onclick="window.abrirMidaFlutuante('${String(d['Link do Material (Se houver)']).trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-bottom: 8px;"><i class="ri-eye-line"></i> Acessar Material</button>`;

        if(!jaFez) {
            if(precisaResponder) {
                const confJSON = (d['Configuração da Avaliação'] || '[]').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                btnAcao += `<button onclick="window.abrirModalResposta('${docId}', '${confJSON}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #3182ce; color:white; border:none;"><i class="ri-pencil-fill"></i> Responder Atividade</button>`;
            } else {
                btnAcao += `<button onclick="window.concluirTreinamento('${docId}')" class="btn-hover color-11" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; background: #38a169; color:white; border:none;"><i class="ri-check-double-line"></i> Marcar como LIDO</button>`;
            }
        } else if (precisaResponder && minhaResposta && minhaResposta.nota !== "") {
            btnAcao += `<button onclick="window.verFeedback('${minhaResposta.nota}', \`${(minhaResposta.feedback || 'Sem comentários.').replace(/'/g, "&apos;")}\`)" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px; margin-top:8px;"><i class="ri-message-3-line"></i> Ver Correção</button>`;
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
    if(!confirm(`Você realmente assistiu/leu este material, ${nomeAluno}?\nAo confirmar, os pontos serão computados na sua jornada.`)) return;
    const registro = `${nomeAluno} (Concluído em: ${new Date().toLocaleString('pt-BR')})`;
    try { await window.updateDoc(window.doc(window.db, 'treinamentos', docId), { leituras: window.arrayUnion(registro) }); alert("Concluído com sucesso! +XP 🎉"); } catch(e) { alert("Erro ao salvar: " + e.message); }
};

window.abrirModalResposta = function(docId, configJSON) {
    document.getElementById('resposta-docid').value = docId;
    const area = document.getElementById('area-perguntas-dinamicas'); area.innerHTML = '';
    try {
        const jsonStr = String(configJSON).replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const perguntas = JSON.parse(jsonStr);
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
        alert("Sua resposta foi enviada para correção do supervisor! 🚀");
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
    respostas.forEach(r => { try { let o = JSON.parse(r); if(o.nome === nomeAluno) { respObj = o; respStr = r; } } catch(e){} });
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
    respostas.forEach(r => { try { let o = JSON.parse(r); if(o.nome === nomeAluno) { respObjAntigo = o; respStrAntiga = r; } } catch(e){} });
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

// ==========================================
// MÓDULO: RH & PEOPLE ANALYTICS
// ==========================================
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
    });
};

window.renderizarDashboardRH = function() {
    const totColab = listaColaboradoresGlobal.length;
    document.getElementById('rh-tot-colab').textContent = totColab;
    
    let totalXP = 0; let topPerformers = 0;
    const colabStats = {};
    listaColaboradoresGlobal.forEach(c => { colabStats[c.nome] = { xp: 0, treinamentos: 0, setor: c.setor }; });

    window.todosTreinamentosData.forEach(t => {
        const pts = parseInt(t.data['Pontos Valendo']) || 0;
        (t.data.leituras || []).forEach(l => {
            const n = l.split(' (')[0]; if(colabStats[n]) { colabStats[n].xp += pts; totalXP += pts; colabStats[n].treinamentos++; }
        });
        (t.data.respostas_alunos || []).forEach(r => {
            try { let o = JSON.parse(r); if(colabStats[o.nome] && o.nota !== "") { let nota = parseInt(o.nota)||0; colabStats[o.nome].xp += nota; totalXP += nota; colabStats[o.nome].treinamentos++; } } catch(e){}
        });
    });

    const avgXp = totColab > 0 ? Math.round(totalXP / totColab) : 0;
    document.getElementById('rh-avg-xp').textContent = avgXp;

    const grid = document.getElementById('rh-grid-colaboradores');
    if(!grid) return; grid.innerHTML = '';
    const search = (document.getElementById('rh-search-colab')?.value || '').toLowerCase();

    let htmlCards = '';
    Object.keys(colabStats).forEach(nome => {
        const stat = colabStats[nome];
        if(search && !nome.toLowerCase().includes(search)) return;
        let statusClass = 'neutro'; let statusText = 'Em Desenvolvimento';
        if(stat.xp >= avgXp && stat.xp > 0) { statusClass = 'destaque'; statusText = 'Alta Performance'; topPerformers++; }
        else if(stat.xp === 0) { statusClass = 'risco'; statusText = 'Em Atenção'; }
        
        htmlCards += `<div class="rh-collab-card ${statusClass}">
            <div class="rh-collab-header">
                <div class="rh-avatar">${nome.substring(0,2).toUpperCase()}</div>
                <div class="rh-collab-meta"><h4>${nome}</h4><p>${stat.setor}</p></div>
                <div class="rh-score-badge">${stat.xp} XP</div>
            </div>
            <div class="rh-collab-grid">
                <div><span>Treinamentos Concluídos</span><strong>${stat.treinamentos}</strong></div>
                <div><span>Status RH</span><span class="rh-chip ${statusClass}" style="margin:0; padding:4px 8px;">${statusText}</span></div>
            </div>
        </div>`;
    });
    grid.innerHTML = htmlCards || '<p style="padding:20px; color:var(--text-muted);">Nenhum colaborador encontrado.</p>';
    document.getElementById('rh-tot-high').textContent = topPerformers;

    // Pesquisas Ativas
    const gridP = document.getElementById('rh-grid-pesquisas');
    if(gridP) {
        gridP.innerHTML = '';
        window.todosPesquisasRH.forEach(p => {
            const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === p.id).length;
            gridP.innerHTML += `<div class="rh-survey-card">
                <div><h4 style="margin:0; color:var(--text-main); font-weight:600;">${p.data.titulo}</h4><p style="margin:0; color:var(--text-muted); font-size:12px;">Categoria: ${p.data.categoria} | Público: ${p.data.alvo}</p></div>
                <div class="rh-survey-stats"><b>${resps}</b> Respostas</div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.verResultadosPesquisaRH('${p.id}')" class="btn-hover color-8" style="height:30px; font-size:11px; padding:0 15px;">Resultados</button>
                    <button onclick="window.excluirPesquisaRH('${p.id}')" style="background:none; border:none; color:#e53e3e; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>`;
        });
        if(window.todosPesquisasRH.length === 0) gridP.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Nenhuma pesquisa ativa.</p>';
    }
};

window.abrirModalCriarPesquisa = function() {
    document.getElementById('rh-pesq-titulo').value = '';
    document.getElementById('rh-pesq-perguntas-list').innerHTML = '';
    const alvo = document.getElementById('rh-pesq-alvo');
    alvo.innerHTML = '<option value="Geral">Todos (Geral)</option>';
    setoresGlobais.forEach(s => alvo.innerHTML += `<option value="${s}">Setor: ${s}</option>`);
    document.getElementById('modal-criar-pesquisa').style.display = 'flex';
};

window.adicionarPerguntaRH = function(tipo) {
    const area = document.getElementById('rh-pesq-perguntas-list');
    const div = document.createElement('div');
    div.className = 'rh-pergunta-item';
    div.style = 'background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px; position:relative;';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; color:red; background:none; border:none; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
        <input type="hidden" class="rh-p-tipo" value="${tipo}">
        <label style="font-size:12px; font-weight:600;">Pergunta (${tipo === 'escala' ? 'Escala 1 a 5' : 'Texto Aberto'}):</label>
        <input type="text" class="form-input rh-p-texto" style="margin-bottom:0;" placeholder="Digite a pergunta...">
    `;
    area.appendChild(div);
};

window.salvarPesquisaRH = async function() {
    const titulo = document.getElementById('rh-pesq-titulo').value.trim();
    const categoria = document.getElementById('rh-pesq-categoria').value;
    const alvo = document.getElementById('rh-pesq-alvo').value;
    const blocos = document.querySelectorAll('.rh-pergunta-item');
    
    if(!titulo || blocos.length === 0) return alert("Preencha o título e adicione pelo menos uma pergunta!");

    let perguntas = [];
    blocos.forEach(b => {
        perguntas.push({
            tipo: b.querySelector('.rh-p-tipo').value,
            texto: b.querySelector('.rh-p-texto').value.trim()
        });
    });

    try {
        await window.addDoc(window.collection(window.db, 'rh-pesquisas'), {
            titulo, categoria, alvo, perguntas, dataCriacao: new Date().toISOString()
        });
        alert("Pesquisa enviada com sucesso!");
        document.getElementById('modal-criar-pesquisa').style.display = 'none';
    } catch(e) { alert("Erro ao criar pesquisa: " + e.message); }
};

window.excluirPesquisaRH = async function(id) {
    if(!confirm("Excluir esta pesquisa e todas as respostas?")) return;
    try { await window.deleteDoc(window.doc(window.db, 'rh-pesquisas', id)); alert("Excluída!"); } catch(e) {}
};

window.renderizarPesquisasAluno = function() {
    if(!window.alunoLogado) return;
    const area = document.getElementById('aluno-pesquisas-pendentes');
    const lista = document.getElementById('lista-pesquisas-aluno');
    if(!area || !lista) return;

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

    const minhasPesquisas = window.todosPesquisasRH.filter(p => {
        const alvo = p.data.alvo;
        return alvo === 'Geral' || alvo === setorAluno;
    });

    let pendentes = [];
    minhasPesquisas.forEach(p => {
        const jaRespondeu = window.todosRespostasRH.some(r => r.data.pesquisaId === p.id && r.data.nome === nomeAluno);
        if(!jaRespondeu) pendentes.push(p);
    });

    if(pendentes.length > 0) {
        lista.innerHTML = '';
        pendentes.forEach(p => {
            lista.innerHTML += `
                <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-soft);">
                    <div>
                        <strong style="color: var(--primary-color); display:block; font-size:15px;">${p.data.titulo}</strong>
                        <span style="font-size:12px; color:var(--text-muted);"><i class="ri-survey-fill"></i> ${p.data.categoria}</span>
                    </div>
                    <button onclick="window.responderPesquisaRH('${p.id}')" class="btn-hover color-11" style="height:35px; font-size:12px; padding:0 15px;">Responder Agora</button>
                </div>
            `;
        });
        area.style.display = 'block';
    } else {
        area.style.display = 'none';
    }
};

window.responderPesquisaRH = function(pesquisaId) {
    const p = window.todosPesquisasRH.find(x => x.id === pesquisaId);
    if(!p) return;

    document.getElementById('rh-resp-titulo').textContent = p.data.titulo;
    document.getElementById('rh-resp-id').value = pesquisaId;

    let html = '';
    p.data.perguntas.forEach((q, idx) => {
        html += `<div class="rh-resp-bloco" style="margin-bottom:15px; background:#f8fafc; padding:15px; border-radius:8px; border: 1px solid var(--border-color);">
            <label style="font-weight:600; font-size:13px; display:block; margin-bottom:10px; color:var(--text-main);">${idx+1}. ${q.texto}</label>
            <input type="hidden" class="resp-q-texto" value="${q.texto}">
            <input type="hidden" class="resp-q-tipo" value="${q.tipo}">
        `;
        if(q.tipo === 'escala') {
            html += `<div style="display:flex; gap:10px; justify-content:space-between;">`;
            [1,2,3,4,5].forEach(n => {
                html += `<label style="flex:1; text-align:center; background:white; border:1px solid #cbd5e1; padding:10px; border-radius:8px; cursor:pointer; transition:0.2s;">
                            <input type="radio" name="p_${pesquisaId}_q_${idx}" value="${n}" class="resp-q-val" style="margin-bottom:5px;">
                            <div style="font-weight:bold; color:var(--primary-color);">${n}</div>
                         </label>`;
            });
            html += `</div>`;
        } else {
            html += `<textarea class="form-input resp-q-val" style="height:80px; resize:vertical; margin:0;" placeholder="Sua resposta franca e sincera..."></textarea>`;
        }
        html += `</div>`;
    });
    
    document.getElementById('rh-resp-area').innerHTML = html;
    document.getElementById('modal-responder-pesquisa').style.display = 'flex';
};

window.enviarRespostaRH = async function() {
    if(!window.alunoLogado) return;
    const pesquisaId = document.getElementById('rh-resp-id').value;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    
    const blocos = document.querySelectorAll('.rh-resp-bloco');
    let respostas = [];
    let ok = true;

    blocos.forEach(b => {
        const textoP = b.querySelector('.resp-q-texto').value;
        const tipo = b.querySelector('.resp-q-tipo').value;
        let val = '';
        if(tipo === 'escala') {
            const checked = b.querySelector('input[type="radio"]:checked');
            if(!checked) ok = false;
            else val = checked.value;
        } else {
            val = b.querySelector('textarea').value.trim();
            if(!val) ok = false;
        }
        respostas.push({ pergunta: textoP, resposta: val, tipo });
    });

    if(!ok) return alert("Por favor, responda todas as perguntas antes de enviar!");

    try {
        await window.addDoc(window.collection(window.db, 'rh-respostas-pesquisa'), {
            pesquisaId, nome: nomeAluno, respostas, data: new Date().toISOString()
        });
        alert("Muito obrigado pelas suas respostas! Isso nos ajuda a crescer juntos.");
        document.getElementById('modal-responder-pesquisa').style.display = 'none';
        window.renderizarPesquisasAluno();
    } catch(e) { alert("Erro ao enviar: " + e.message); }
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
                if(ans && ans.resposta) {
                    html += `<div style="margin-bottom:10px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px;"><b>${r.data.nome}:</b> <span style="color:var(--text-muted);">${ans.resposta}</span></div>`;
                }
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    document.getElementById('rh-resultados-area').innerHTML = html;
    document.getElementById('modal-ver-respostas-rh').style.display = 'flex';
};

// ==========================================
// 8. ATRIBUIÇÃO DE EVENTOS DE CLIQUES E INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    const mainContent = document.querySelector('.main-content');
    if(mainContent) {
        mainContent.addEventListener('click', async (e) => {
            const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit');
            if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await window.deleteDoc(window.doc(window.db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
            if (btnEditar && isAdmin) window.abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, JSON.parse(btnEditar.dataset.info));
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
            
            let dados = { corCard: document.getElementById('card-color') ? document.getElementById('card-color').value : '#ffffff' };
            
            config.campos.forEach(c => {
                const val = document.getElementById('input-'+c);
                if((colecao === 'boletins' || colecao === 'treinamentos') && c === 'Para quais Setores?') {
                    const checks = Array.from(document.querySelectorAll('.check-setor:checked')).map(el => el.value);
                    dados[c] = checks.join(', ');
                } else if(val) { dados[c] = val.value; }
            });
            
            try {
                if(docId) { await window.updateDoc(window.doc(window.db, colecao, docId), dados); } else { await window.addDoc(window.collection(window.db, colecao), dados); }
                window.fecharModal();
            } catch(e) { alert("Erro ao salvar: " + e.message); }
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
            
            btnSalvarAjustes.innerHTML = "Salvando...";
            try {
                await window.setDoc(window.doc(window.db, "configuracoes", "gerais"), { 
                    banner_texto: texto, locais: locaisTexto, setores: setoresTexto, especialidades: especialidadesTexto, motivos: motivosTexto, 
                    cor_pendente: corPend, cor_concluido: corConc, imagem_padrao_pastas: imgPastasTexto, chat_logo: chatLogoTexto, chat_cor: chatCorVal
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
            
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'pacotes', 'remocoes', 'colaboradores'].forEach(colecao => {
                const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
                itens.forEach(item => {
                    if(Object.values(item.data).join(' ').toLowerCase().includes(texto)) { 
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
            const inputPesqLocal = document.getElementById('input-pesquisa');
            if(inputPesqLocal) inputPesqLocal.value = ''; 
            
            if(abaAtual === 'boletins') window.fecharPastaBoletim(); 
            if(abaAtual === 'boletins-privados') window.fecharPastaPrivado();
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'treinamentos'].forEach(col => { if(abaAtual === col) window.fecharPastaGenerica(col); });
            if(abaAtual === 'rh' && isAdmin) window.renderizarDashboardRH();
        });
    });
});

/* ===== PATCH HOME LEVE + SEM RECOLHÍVEL PESADO ===== */
(() => {
  function simplificarTelaInicial() {
    const buscaGlobal = document.getElementById('input-pesquisa-global');
    if (buscaGlobal) { const wrap = buscaGlobal.closest('.search-container'); if (wrap) wrap.remove(); }
    const resultados = document.getElementById('resultados-globais'); if (resultados) resultados.remove();
    const alertas = document.getElementById('area-alertas-home'); if (alertas) alertas.remove();
    const chartHome = document.getElementById('chart-home');
    if (chartHome) { const bloco = chartHome.closest('div[style*="height: 300px;"]')?.parentElement; if (bloco) bloco.remove(); }

    const secoesHome = document.querySelectorAll('#tab-home > h2, #tab-home > .home-grid');
    secoesHome.forEach(el => {
      if (el.textContent && el.textContent.includes('Acesso Rápido')) el.remove();
      else if (el.classList && el.classList.contains('home-grid')) el.remove();
    });

    document.querySelectorAll('.card-collapsible').forEach(card => {
      card.classList.remove('expanded');
      const details = card.querySelector('.card-details'); if (details) details.style.display = 'block';
      const toggle = card.querySelector('.card-toggle'); if (toggle) toggle.remove();
    });
  }

  window.toggleCardExpand = function(cardElOrBtn) {
    const card = cardElOrBtn?.closest ? (cardElOrBtn.closest('.card-collapsible') || cardElOrBtn.closest('.card')) : null;
    if (!card) return;
    const details = card.querySelector('.card-details'); if (details) details.style.display = 'block';
    const toggle = card.querySelector('.card-toggle'); if (toggle) toggle.remove();
    card.classList.remove('expanded');
  };

  const oldIrParaAba = window.irParaAba;
  if (typeof oldIrParaAba === 'function') {
    window.irParaAba = function() { const out = oldIrParaAba.apply(this, arguments); setTimeout(simplificarTelaInicial, 30); return out; };
  }

  const oldRenderHomeGraph = window.renderizarGraficoHome;
  if (typeof oldRenderHomeGraph === 'function') {
    window.renderizarGraficoHome = function() { return null; };
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', simplificarTelaInicial); } 
  else { simplificarTelaInicial(); }
})();
