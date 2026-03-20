// --- CONFIGURAÇÃO DE CAMPOS E PASTAS DO SISTEMA ---
const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor da Clínica'] },
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
window.dadosGlobaisAbas = {}; 
window.todosOsDadosDoSistema = {}; 
window.dadosBoletins = {}; 
window.pastaBoletimAtual = null;
window.pastaPrivadoAtual = null;

window.corStatusPendente = "#e53e3e";
window.corStatusConcluido = "#38a169";

let chartBoletinsInst = null;
let chartPrivadosInst = null;

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
// DECLARAÇÃO DE TODAS AS FUNÇÕES GLOBAIS BLINDADAS
// ==========================================

function formatarLinkImagem(link) {
    if (!link || link.includes('file:///')) return null;
    if (link.includes("drive.google.com")) {
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return link;
}

async function buscarClimaAraucaria() {
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
}
window.buscarClimaAraucaria = buscarClimaAraucaria;

function obterPublicoAlvo(setoresAlvoString) {
    if (!setoresAlvoString || setoresAlvoString.includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
    const setoresMarcados = setoresAlvoString.split(', ');
    return listaColaboradoresGlobal.filter(c => setoresMarcados.includes(c.setor)).map(c => c.nome);
}

function verificarUrgentesHome() {
    const area = document.getElementById('area-alertas-home');
    if(!area) return;
    area.innerHTML = '';
    let totalUrgentesPendentes = 0;

    const verificarItens = (lista, ehPrivado) => {
        lista.forEach(item => {
            const data = item.data;
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && data['Tipo (Urgente, Norma, Regra, etc)'].toLowerCase().includes('urgente');
            if(!isUrgente) return;
            const publico = ehPrivado ? [data['Para qual Colaborador?']] : obterPublicoAlvo(data['Para quais Setores?']);
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
}
window.verificarUrgentesHome = verificarUrgentesHome;

function irParaAba(aba) { 
    const btn = document.querySelector(`.nav-btn[data-tab='${aba}']`); 
    if(btn) btn.click(); 
}
window.irParaAba = irParaAba;

function abrirSubAba(subAbaId) { 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'none'; 
    const sub = document.getElementById('sub-' + subAbaId); if(sub) sub.style.display = 'block'; 
}
window.abrirSubAba = abrirSubAba;

function voltarSubAba() { 
    ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(id => {
        const sub = document.getElementById('sub-' + id); if(sub) sub.style.display = 'none';
    }); 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'grid'; 
}
window.voltarSubAba = voltarSubAba;

// ================= LÓGICA DE LOGIN COM PROTEÇÃO =================
setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
const frases = ["O sucesso é a soma de pequenos esforços.", "A empatia é a medicina que o mundo precisa.", "Trabalho em equipe multiplica o sucesso."];
const fm = document.getElementById('frase-dia'); if(fm) fm.innerText = frases[Math.floor(Math.random() * frases.length)];

// AQUI ESTÁ A CORREÇÃO DO LOGIN (Prevenindo o Reload da Página)
const formLogin = document.getElementById('form-login');
if(formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); // <-- Impede a página de piscar/recarregar!
        
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const textoOriginal = btn.innerHTML;
        
        btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Autenticando...";
        
        signInWithEmailAndPassword(auth, email, senha)
            .catch(err => {
                alert("Erro: " + err.message);
                btn.innerHTML = textoOriginal;
            });
    });
}

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    
    if (user) {
        if(loginScreen) loginScreen.style.display = 'none';
        if(dashboardScreen) dashboardScreen.style.display = 'flex';
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
        
        Object.keys(configuracaoAbas).forEach(idColecao => renderizarCards(idColecao));
        carregarConfiguracoes(); window.buscarClimaAraucaria(); 
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(dashboardScreen) dashboardScreen.style.display = 'none';
        const btnLogin = document.getElementById('btn-login');
        if(btnLogin) btnLogin.innerHTML = "Entrar no Painel";
    }
});

// LÓGICA DE NAVEGAÇÃO ENTRE ABAS
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
        
        const inputPesq = document.getElementById('input-pesquisa');
        if(inputPesq) inputPesq.value = ''; 
        
        if(abaAtual === 'boletins' && typeof window.fecharPastaBoletim === 'function') window.fecharPastaBoletim(); 
        if(abaAtual === 'boletins-privados' && typeof window.fecharPastaPrivado === 'function') window.fecharPastaPrivado();
        ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico'].forEach(col => {
            if(abaAtual === col && typeof window.fecharPastaGenerica === 'function') window.fecharPastaGenerica(col);
        });
    });
});

// ================= LÓGICA DO MODAL (FORMULÁRIOS) =================
function fecharModal() {
    const modalEl = document.getElementById('modal-cadastro');
    if(modalEl) modalEl.style.display = 'none';
}
window.fecharModal = fecharModal;
const btnFecharModal = document.getElementById('btn-fechar-modal');
if(btnFecharModal) btnFecharModal.addEventListener('click', window.fecharModal);

function abrirModal(colecao, docId = null, dadosAntigos = null) {
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
        else if(colecao === 'boletins' && campo === 'Para quais Setores?') {
            htmlCampos += `<label style="font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Para quais setores? (Marque 1 ou mais)</label><div class="checkbox-group" style="margin-bottom:15px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">`;
            const valoresSalvos = valorAntigo ? valorAntigo.split(', ') : ['Geral'];
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
}
window.abrirModal = abrirModal;

// SALVAR DADOS DE CADASTRO
const btnSalvarDados = document.getElementById('btn-salvar-dados');
if(btnSalvarDados) {
    btnSalvarDados.addEventListener('click', async () => {
        if(!isAdmin) return;
        const colecaoNome = btnSalvarDados.getAttribute('data-colecao');
        const docId = document.getElementById('modal-doc-id').value;
        const config = configuracaoAbas[colecaoNome];
        if(!config) return;
        
        let dados = {};
        config.campos.forEach(campo => {
            if (campo === 'Para quais Setores?') {
                const checks = Array.from(document.querySelectorAll('.check-setor:checked')).map(cb => cb.value);
                if(checks.length > 0) dados[campo] = checks.join(', ');
            } else {
                const el = document.getElementById(`input-${campo}`);
                if(el && el.value.trim() !== '') dados[campo] = el.value.trim();
            }
        });
        dados.corCard = document.getElementById('card-color').value;
        
        try {
            if (docId) await updateDoc(doc(db, colecaoNome, docId), dados);
            else await addDoc(collection(db, colecaoNome), dados);
            window.fecharModal();
        } catch(e) { alert("Erro: " + e); }
    });
}

// ================= PASTAS GENÉRICAS E RENDERIZAÇÃO =================
function abrirPastaGenerica(colecao, valorPasta) {
    window[`pasta_${colecao}_Atual`] = valorPasta;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    const titleEl = document.getElementById(`titulo-pasta-${colecao}`);
    if(foldEl) foldEl.style.display = 'none';
    if(listEl) listEl.style.display = 'block';
    if(titleEl && configuracaoAbas[colecao]) titleEl.innerHTML = `<i class="${configuracaoAbas[colecao].icone}"></i> Pasta: ${valorPasta}`;
    renderizarListaGenerica(colecao);
}
window.abrirPastaGenerica = abrirPastaGenerica;

function fecharPastaGenerica(colecao) {
    window[`pasta_${colecao}_Atual`] = null;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    if(listEl) listEl.style.display = 'none';
    if(foldEl) foldEl.style.display = 'block';
    renderizarPastasGenericas(colecao);
}
window.fecharPastaGenerica = fecharPastaGenerica;

function renderizarPastasGenericas(colecao) {
    const grid = document.getElementById(`grid-${colecao}-folders`);
    if(!grid) return; 
    grid.innerHTML = '';
    const config = configuracaoAbas[colecao];
    const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];
    
    if (dadosAtuais.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma pasta encontrada ou os dados estão carregando...</p>';
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
}
window.renderizarPastasGenericas = renderizarPastasGenericas;

function renderizarListaGenerica(colecao) {
    const grid = document.getElementById(`grid-${colecao}-list`); 
    if(!grid) return;
    grid.innerHTML = '';
    const nomePasta = window[`pasta_${colecao}_Atual`];
    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral (Sem Categoria)') === nomePasta);
    itensExibir.forEach(item => { grid.innerHTML += gerarHTMLCard(colecao, item.id, item.data); });
}
window.renderizarListaGenerica = renderizarListaGenerica;

function gerarHTMLCard(colecaoNome, docId, data) {
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
            if (chave.includes('Valor') || (chave === 'Descrição' && typeof valor === 'string' && (valor.toUpperCase().includes('REAIS') || valor.toUpperCase().includes('R$')))) {
                badgeValorHtml = `<div class="badge-valor"><i class="ri-money-dollar-circle-line"></i> ${valor}</div>`;
            }
        }
    });

    let cardClass = isDark && colecaoNome !== 'ramais' ? 'has-gradient' : '';
    let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;
    
    if(config.campoAgrupador && (data[config.campoAgrupador] || 'Geral (Sem Categoria)')) {
        cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px;"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA: ${data[config.campoAgrupador] || 'Geral (Sem Categoria)'}</div>`;
    }

    cardHtml += `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap:10px;">
                    <div class="card-title" style="font-size:18px; font-weight:600; line-height:1.2; flex:1; margin-bottom:0;">${tituloDesteCard}</div>
                    ${badgeValorHtml}
                 </div>`;
    
    let hasFlexLayout = (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']);
    if(hasFlexLayout) {
        cardHtml += `<div class="medico-wrapper">`;
        if (colecaoNome === 'corpo-clinico' && data['Link da Foto do Profissional']) {
            let fotoUrl = formatarLinkImagem(data['Link da Foto do Profissional']);
            if(fotoUrl) cardHtml += `<img src="${fotoUrl}" class="medico-foto" onerror="this.style.display='none'">`;
        }
        cardHtml += `<div class="content-info-flex">`;
    }

    camposOrdem.forEach(chave => {
        const valor = data[chave];
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo) {
            if (chave.includes('Valor') || chave === 'Link da Logo do Convênio' || chave === 'Exibir Logo do Convenio' || chave === 'Link da Foto do Profissional' || chave === 'Link da Imagem Ilustrativa') return; 
            
            if (chave === 'Aceita o Servico?') {
                const badgeClass = valor === 'Não' ? 'status-negado' : 'status-aceito';
                const iconClass = valor === 'Não' ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill';
                const text = valor === 'Não' ? 'Serviço Não Coberto' : 'Serviço Coberto';
                cardHtml += `<div style="margin: 8px 0;"><span class="${badgeClass}"><i class="${iconClass}"></i> ${text}</span></div>`;
            } else if(chave === 'Local e Link Maps' && valor.includes('http')) {
                const urlMatch = valor.match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : valor;
                const textoSemUrl = valor.replace(url, '').trim();
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span>${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 5px;"><i class="ri-map-pin-user-fill"></i> Ver no Mapa</button></div>`;
            } else {
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span>${valor}</span></div>`; 
            }
        }
    });
    
    if(hasFlexLayout) cardHtml += `</div></div>`; 
    if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    cardHtml += `</div>`;
    return cardHtml;
}
window.gerarHTMLCard = gerarHTMLCard;

function renderizarCards(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);
    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; window.verificarUrgentesHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; window.verificarUrgentesHome(); }
            if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) {
                window.dadosGlobaisAbas[colecaoNome] = [];
                if(abaAtual === colecaoNome) renderizarPastasGenericas(colecaoNome);
            }
            if(grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }

        let itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() }));
        window.todosOsDadosDoSistema[colecaoNome] = itens;

        if(colecaoNome === 'colaboradores') {
            listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome));
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual && typeof window.renderizarPastasPrivados === 'function') window.renderizarPastasPrivados(); 
        }

        if(colecaoNome === 'boletins') {
            window.todosBoletinsData = itens;
            if(abaAtual === 'boletins') { if(window.pastaBoletimAtual) window.renderizarListaBoletins(); else window.renderizarPastasBoletins(); }
            window.verificarUrgentesHome(); return;
        }

        if(colecaoNome === 'boletins-privados') {
            window.todosPrivadosData = itens;
            if(abaAtual === 'boletins-privados') { if(window.pastaPrivadoAtual) window.renderizarListaPrivados(); else window.renderizarPastasPrivados(); }
            window.verificarUrgentesHome(); return;
        }
        
        if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) {
            window.dadosGlobaisAbas[colecaoNome] = itens;
            if(abaAtual === colecaoNome) {
                if(window[`pasta_${colecaoNome}_Atual`]) renderizarListaGenerica(colecaoNome);
                else renderizarPastasGenericas(colecaoNome);
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
                locaisMap[local].sort((a,b) => (a.data['Setor']||'').localeCompare(b.data['Setor']||'')).forEach(item => {
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
            const tituloA = a.data[configuracaoAbas[colecaoNome].campos[0]] || a.data['Nome/Médico'] || a.data['Nome'] || "";
            const tituloB = b.data[configuracaoAbas[colecaoNome].campos[0]] || b.data['Nome/Médico'] || b.data['Nome'] || "";
            return tituloA.toUpperCase().localeCompare(tituloB.toUpperCase());
        });

        itens.forEach((item) => { grid.innerHTML += gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
}
window.renderizarCards = renderizarCards;

// ================= EVENTOS DA MAIN CONTENT =================
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

// ================= LÓGICA DE SALVAR CONFIGURAÇÕES =================
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

function carregarConfiguracoes() {
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
            
            imagemPadraoPastas = data.imagem_padrao_pastas ? formatarLinkImagem(data.imagem_padrao_pastas) : "";
            const imgInput = document.getElementById('tab-input-imagem-pastas');
            if(imgInput) imgInput.value = data.imagem_padrao_pastas || '';

            // CHATBOT SETTINGS
            const chatLogo = data.chat_logo || "https://cdn-icons-png.flaticon.com/512/8943/8943377.png";
            const chatCor = data.chat_cor || "#0ba360";
            
            document.documentElement.style.setProperty('--chat-primary', chatCor);
            
            const fabImg = document.getElementById('chat-fab-img');
            const headerImg = document.getElementById('chat-header-img');
            if(fabImg) fabImg.src = formatarLinkImagem(chatLogo) || chatLogo;
            if(headerImg) headerImg.src = formatarLinkImagem(chatLogo) || chatLogo;
            
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
}
window.carregarConfiguracoes = carregarConfiguracoes;

// ================== CHATBOT LÓGICA AVANÇADA BLINDADA ==================
function toggleChat() {
    const win = document.getElementById('chat-window');
    const fab = document.getElementById('chat-fab');
    if(!win || !fab) return;
    
    if (win.style.display === 'none' || win.style.display === '') {
        win.style.display = 'flex';
        const tooltip = fab.querySelector('.chatbot-tooltip');
        if(tooltip) tooltip.style.display = 'none';
        setTimeout(() => { document.getElementById('chat-input').focus(); }, 100);
    } else {
        win.style.display = 'none';
    }
}
window.toggleChat = toggleChat;

function sendQuickMsg(texto) {
    const input = document.getElementById('chat-input');
    if(input) {
        input.value = texto;
        window.sendChat();
    }
}
window.sendQuickMsg = sendQuickMsg;

function sendChat() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const msg = input.value.trim();
    if (!msg) return;

    addChatBubble(msg, 'user');
    input.value = '';

    setTimeout(() => {
        const resposta = processarLogicaDoBot(msg);
        addChatBubble(resposta, 'bot');
    }, 600);
}
window.sendChat = sendChat;

function addChatBubble(text, sender) {
    const chatArea = document.getElementById('chat-body');
    if(!chatArea) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = text; 
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function processarLogicaDoBot(mensagemUser) {
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
                    (item.data['Convênios Aceitos'] && item.data['Convênios Aceitos'].toLowerCase().includes('unimed')) ||
                    (item.data['Convênios'] && item.data['Convênios'].toLowerCase().includes('unimed')) ||
                    colecao === 'convenios') {
                    matches = true;
                }
            } else if (textoItem.includes(texto)) {
                matches = true;
            }

            if (matches) {
                const config = configuracaoAbas[colecao];
                let tituloItem = item.data[config.campos[0]] || 'Detalhes';
                let detalhesStr = '';
                
                if(colecao === 'boletins') tituloItem = `Boletim: ${item.data['Título do Informativo']}`;
                
                let cont = 0;
                Object.entries(item.data).forEach(([k, v]) => {
                    if(v && k !== config.campos[0] && k !== 'corCard' && !k.includes('Link') && cont < 3) {
                        detalhesStr += `<b>${k}:</b> ${v}<br>`;
                        cont++;
                    }
                });

                let pastaAgrupadora = config.campoAgrupador ? item.data[config.campoAgrupador] : null;
                let btnAction = '';

                if (pastaAgrupadora) {
                    btnAction = `<button onclick="window.irParaAba('${colecao}'); setTimeout(() => { window.abrirPastaGenerica('${colecao}', '${pastaAgrupadora}') }, 200); window.toggleChat();" class="btn-hover color-5" style="height: 30px; font-size: 11px; padding: 0 15px; margin-top: 8px; width: 100%; border-radius: 6px;"><i class="ri-folder-open-line"></i> Abrir Pasta</button>`;
                } else if (colecao === 'boletins') {
                    const setorBoletim = item.data['Para quais Setores?'] ? item.data['Para quais Setores?'].split(',')[0] : 'Geral';
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
        const limite = resultadosEncontrados.slice(0, 4); 
        respostaFormatada += limite.join('');
        
        if (resultadosEncontrados.length > 4) {
            respostaFormatada += `<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:5px;">+${resultadosEncontrados.length - 4} resultados ocultos.<br>Seja mais específico se não achou o que procura!</div>`;
        }
        return respostaFormatada;
    }

    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. 🤔<br><br>Tente pesquisar pelo nome de um exame ou especialidade!";
}

// ================= MOTOR DE BUSCA GLOBAL E EVENTOS GERAIS =================
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
                    areaRes.innerHTML += gerarHTMLCard(colecao, item.id, item.data);
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
