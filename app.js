// ==========================================
// 1. IMPORTAÇÕES E CONFIGURAÇÕES GLOBAIS
// ==========================================
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
// 2. FUNÇÕES GLOBAIS BLINDADAS (HOISTING SEGURO)
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

function obterPublicoAlvo(setoresAlvoString) {
    if (!setoresAlvoString || setoresAlvoString.includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
    const setoresMarcados = String(setoresAlvoString).split(',').map(s => s.trim());
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
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
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

function irParaAba(aba) { 
    const btn = document.querySelector(`.nav-btn[data-tab='${aba}']`); 
    if(btn) btn.click(); 
}

function abrirSubAba(subAbaId) { 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'none'; 
    const sub = document.getElementById('sub-' + subAbaId); if(sub) sub.style.display = 'block'; 
}

function voltarSubAba() { 
    ['ramais', 'emails', 'contatos-gerais', 'contatos-convenios', 'senhas'].forEach(id => {
        const sub = document.getElementById('sub-' + id); if(sub) sub.style.display = 'none';
    }); 
    const menu = document.getElementById('menu-contatos'); if(menu) menu.style.display = 'grid'; 
}

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

function fecharPastaGenerica(colecao) {
    window[`pasta_${colecao}_Atual`] = null;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    if(listEl) listEl.style.display = 'none';
    if(foldEl) foldEl.style.display = 'block';
    renderizarPastasGenericas(colecao);
}

function abrirPastaBoletim(pasta) {
    window.pastaBoletimAtual = pasta;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    const title = document.getElementById('titulo-pasta-boletins');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-open-line"></i> Setor: ${pasta}`;
    renderizarListaBoletins();
}

function fecharPastaBoletim() {
    window.pastaBoletimAtual = null;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    renderizarPastasBoletins();
}

function abrirPastaPrivado(colabNome) {
    window.pastaPrivadoAtual = colabNome;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    const title = document.getElementById('titulo-pasta-privados');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-user-line"></i> ${colabNome}`;
    renderizarListaPrivados();
}

function fecharPastaPrivado() {
    window.pastaPrivadoAtual = null;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    renderizarPastasPrivados();
}

function atualizarGrafico(canvasId, refInstancia, dados, labelGrafico) {
    const ctx = document.getElementById(canvasId);
    if(!ctx) return refInstancia;
    const contagemMotivos = {};
    dados.forEach(b => { const m = b.data['Motivo'] || 'Sem Motivo'; contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; });
    if(refInstancia) refInstancia.destroy(); 
    return new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(contagemMotivos), datasets: [{ label: labelGrafico, data: Object.values(contagemMotivos), backgroundColor: '#8B252C', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function fecharModal() {
    const modalEl = document.getElementById('modal-cadastro');
    if(modalEl) modalEl.style.display = 'none';
}

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
}

function abrirMidaFlutuante(url) {
    let u = url;
    if(u.includes("drive.google.com") && u.includes("/view")) u = u.replace("/view", "/preview");
    if(u.includes("youtube.com/watch?v=")) u = `https://www.youtube.com/embed/${u.split("v=")[1].split("&")[0]}`;
    else if (u.includes("youtu.be/")) u = `https://www.youtube.com/embed/${u.split("youtu.be/")[1].split("?")[0]}`;
    const iframe = document.getElementById('iframe-media');
    const modalMedia = document.getElementById('modal-media');
    if(iframe) iframe.src = u; 
    if(modalMedia) modalMedia.style.display = 'flex';
}

async function desfazerLeitura(docId, nomeColab, colecao) {
    if(!isAdmin) return;
    if(!confirm(`Tem certeza que deseja remover a assinatura de ${nomeColab}?`)) return;
    
    const docData = window.dadosBoletins[docId];
    if(!docData || !docData.leituras) return;
    
    const stringExata = docData.leituras.find(txt => txt.startsWith(nomeColab));
    if(stringExata) {
        await updateDoc(doc(db, colecao, docId), { leituras: arrayRemove(stringExata) });
        const modalLeituras = document.getElementById('modal-leituras');
        if(modalLeituras) modalLeituras.style.display = 'none';
    }
}

function abrirListaLeituras(docId, colecaoOrigem = 'boletins') {
    const data = window.dadosBoletins[docId];
    if(!data) return;
    const titleEl = document.getElementById('modal-leitura-titulo');
    if(titleEl) titleEl.textContent = data['Título do Informativo'] || data['Título do Documento'] || 'Status';
    
    let publicoAlvoNomes = [];
    if(colecaoOrigem === 'boletins') publicoAlvoNomes = obterPublicoAlvo(data['Para quais Setores?']);
    else publicoAlvoNomes = [data['Para qual Colaborador?']]; 

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
    
    if(lidosContent) lidosContent.innerHTML = htmlLidos || '<p style="color:var(--text-muted);">Ninguém assinou ainda.</p>';
    if(faltaContent) faltaContent.innerHTML = htmlNaoLidos || '<p style="color:#38a169;">Todos assinaram!</p>';
    
    const modalEl = document.getElementById('modal-leituras');
    if(modalEl) modalEl.style.display = 'flex';
}

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
            if (String(chave).includes('Valor') || (chave === 'Descrição' && typeof valor === 'string' && (valor.toUpperCase().includes('REAIS') || valor.toUpperCase().includes('R$')))) {
                badgeValorHtml = `<div class="badge-valor"><i class="ri-money-dollar-circle-line"></i> ${valor}</div>`;
            }
        }
    });

    let cardClass = isDark && colecaoNome !== 'ramais' ? 'has-gradient' : '';
    let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;
    
    if(config.campoAgrupador && (data[config.campoAgrupador] || 'Geral (Sem Categoria)')) {
        cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA: ${data[config.campoAgrupador] || 'Geral (Sem Categoria)'}</div>`;
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
            if (String(chave).includes('Valor') || chave === 'Link da Logo do Convênio' || chave === 'Exibir Logo do Convenio' || chave === 'Link da Foto do Profissional' || chave === 'Link da Imagem Ilustrativa') return; 
            
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
    
    if(hasFlexLayout) cardHtml += `</div></div>`; 
    if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
    cardHtml += `</div>`;
    return cardHtml;
}

function renderizarListaGenerica(colecao) {
    const grid = document.getElementById(`grid-${colecao}-list`); 
    if(!grid) return;
    grid.innerHTML = '';
    const nomePasta = window[`pasta_${colecao}_Atual`];
    const itensExibir = (window.dadosGlobaisAbas[colecao] || []).filter(i => (i.data[configuracaoAbas[colecao].campoAgrupador] || 'Geral (Sem Categoria)') === nomePasta);
    itensExibir.forEach(item => { grid.innerHTML += gerarHTMLCard(colecao, item.id, item.data); });
}

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

function renderizarPastasBoletins() {
    const gridFolders = document.getElementById('grid-boletins-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    let todosOsSetores = new Set(['Geral', ...setoresGlobais]);
    window.todosBoletinsData.forEach(b => {
        let setoresDoBoletim = b.data['Para quais Setores?'];
        if(setoresDoBoletim) {
            String(setoresDoBoletim).split(',').forEach(s => todosOsSetores.add(s.trim()));
        }
    });

    Array.from(todosOsSetores).sort().forEach(pasta => {
        const boletinsDaPasta = window.todosBoletinsData.filter(item => {
            let s = String(item.data['Para quais Setores?'] || 'Geral');
            return s.includes(pasta);
        });
        
        if(boletinsDaPasta.length === 0) return; 
        
        let totalLidos = 0; let totalFaltam = 0;
        boletinsDaPasta.forEach(b => {
            const publicoDaqui = obterPublicoAlvo(b.data['Para quais Setores?'] || 'Geral');
            const lidosNames = (b.data.leituras || []).map(txt => txt.split(' (')[0]);
            const leram = publicoDaqui.filter(n => lidosNames.includes(n)).length;
            totalLidos += leram; totalFaltam += Math.max(0, publicoDaqui.length - leram);
        });
        const icone = pasta === 'Geral' ? 'ri-global-line' : 'ri-folder-user-line';
        const corStatusPasta = totalFaltam > 0 ? window.corStatusPendente : window.corStatusConcluido;

        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaBoletim('${pasta}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: var(--primary-color); font-size: 24px; flex-shrink:0;"><i class="${icone}"></i></div><div style="font-size: 16px; font-weight: 600; line-height:1.2; word-wrap:break-word;">${pasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Boletins Ativos: <b style="color: var(--text-main);">${boletinsDaPasta.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos Acumulados: <b>${totalLidos}</b></div><div style="color: #e53e3e;">Pendências: <b>${totalFaltam}</b></div></div></div>`;
    });
}

function renderizarListaBoletins() {
    const grid = document.getElementById('grid-boletins'); 
    if(!grid) return;
    grid.innerHTML = '';
    const pasta = window.pastaBoletimAtual;
    const boletinsExibir = window.todosBoletinsData.filter(item => {
        let s = String(item.data['Para quais Setores?'] || 'Geral');
        return s.includes(pasta);
    });
    
    if(typeof atualizarGrafico === 'function') chartBoletinsInst = atualizarGrafico('chart-boletins', chartBoletinsInst, boletinsExibir, `Motivos em ${pasta}`);

    const camposOrdem = configuracaoAbas['boletins'].campos;
    const campoTitulo = camposOrdem[0];

    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data[campoTitulo] || 'Boletim';
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && String(data['Tipo (Urgente, Norma, Regra, etc)']).toLowerCase().includes('urgente');
        const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
        const configCor = paletaGradientes.find(p => p.valor === corSalva);
        const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : ''; 
        
        const publicoAlvoNomes = obterPublicoAlvo(data['Para quais Setores?']);
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
            if(faltamAssinar.length === 0) cardHtml += `<option value="">Todos já leram!</option>`;
            else { cardHtml += `<option value="">Selecionar Pendente...</option>`; faltamAssinar.forEach(nome => { cardHtml += `<option value="${nome}">${nome}</option>`; }); }
            cardHtml += `</select><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="boletins" style="background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer;"><i class="ri-check-line"></i></button></div>`;
        }
        cardHtml += `</div>`;
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="boletins" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="boletins" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
}

function renderizarPastasPrivados() {
    const gridFolders = document.getElementById('grid-privados-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    let todosOsNomes = new Set(listaColaboradoresGlobal.map(c => c.nome));
    window.todosPrivadosData.forEach(b => {
        if(b.data['Para qual Colaborador?']) todosOsNomes.add(String(b.data['Para qual Colaborador?']));
    });
    
    Array.from(todosOsNomes).sort().forEach(nome => {
        const boletinsDele = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === nome);
        if(boletinsDele.length === 0) return; 
        
        let lidos = 0; let faltam = 0;
        boletinsDele.forEach(b => {
            const leitor = (b.data.leituras || []).find(txt => txt.startsWith(nome));
            if(leitor) lidos++; else faltam++;
        });

        let corStatusPasta = faltam > 0 ? window.corStatusPendente : window.corStatusConcluido;

        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaPrivado('${nome}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: #e2e8f0; padding: 15px; border-radius: 12px; color: var(--text-main); font-size: 24px; flex-shrink:0;"><i class="ri-user-star-fill"></i></div><div style="font-size: 16px; font-weight: 600; line-height:1.2; word-wrap:break-word;">${nome}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Documentos: <b style="color: var(--text-main);">${boletinsDele.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos: <b>${lidos}</b></div><div style="color: #e53e3e;">Pendentes: <b>${faltam}</b></div></div></div>`;
    });
}

function renderizarListaPrivados() {
    const grid = document.getElementById('grid-boletins-privados-list'); 
    if(!grid) return;
    grid.innerHTML = '';
    const colabAtual = window.pastaPrivadoAtual;
    const boletinsExibir = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === colabAtual);
    
    if(typeof atualizarGrafico === 'function') chartPrivadosInst = atualizarGrafico('chart-privados', chartPrivadosInst, boletinsExibir, `Motivos de ${colabAtual}`);

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
}

function renderizarCards(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);
    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; verificarUrgentesHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; verificarUrgentesHome(); }
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
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual) renderizarPastasPrivados(); 
        }

        if(colecaoNome === 'boletins') {
            window.todosBoletinsData = itens;
            if(abaAtual === 'boletins') { if(window.pastaBoletimAtual) renderizarListaBoletins(); else renderizarPastasBoletins(); }
            verificarUrgentesHome(); return;
        }

        if(colecaoNome === 'boletins-privados') {
            window.todosPrivadosData = itens;
            if(abaAtual === 'boletins-privados') { if(window.pastaPrivadoAtual) renderizarListaPrivados(); else renderizarPastasPrivados(); }
            verificarUrgentesHome(); return;
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

        itens.forEach((item) => { grid.innerHTML += gerarHTMLCard(colecaoNome, item.id, item.data); });
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
            
            if(abaAtual === 'boletins' && !window.pastaBoletimAtual && typeof renderizarPastasBoletins === 'function') renderizarPastasBoletins();
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual && typeof renderizarPastasPrivados === 'function') renderizarPastasPrivados();
        }
    });
}

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

function sendQuickMsg(texto) {
    const input = document.getElementById('chat-input');
    if(input) {
        input.value = texto;
        sendChat();
    }
}

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
                    (item.data['Convênios Aceitos'] && String(item.data['Convênios Aceitos']).toLowerCase().includes('unimed')) ||
                    (item.data['Convênios'] && String(item.data['Convênios']).toLowerCase().includes('unimed')) ||
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
                    if(v && k !== config.campos[0] && k !== 'corCard' && !String(k).includes('Link') && cont < 3) {
                        detalhesStr += `<b>${k}:</b> ${v}<br>`;
                        cont++;
                    }
                });

                let pastaAgrupadora = config.campoAgrupador ? item.data[config.campoAgrupador] : null;
                let btnAction = '';

                if (pastaAgrupadora) {
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
        const limite = resultadosEncontrados.slice(0, 4); 
        respostaFormatada += limite.join('');
        
        if (resultadosEncontrados.length > 4) {
            respostaFormatada += `<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:5px;">+${resultadosEncontrados.length - 4} resultados ocultos.<br>Seja mais específico se não achou o que procura!</div>`;
        }
        return respostaFormatada;
    }

    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. 🤔<br><br>Tente pesquisar pelo nome de um exame ou especialidade!";
}


// ==========================================
// 4. EXPORTANDO FUNÇÕES PARA O WINDOW (HTML INLINE FIX)
// ==========================================
window.formatarLinkImagem = formatarLinkImagem;
window.buscarClimaAraucaria = buscarClimaAraucaria;
window.obterPublicoAlvo = obterPublicoAlvo;
window.verificarUrgentesHome = verificarUrgentesHome;
window.irParaAba = irParaAba;
window.abrirSubAba = abrirSubAba;
window.voltarSubAba = voltarSubAba;
window.abrirPastaGenerica = abrirPastaGenerica;
window.fecharPastaGenerica = fecharPastaGenerica;
window.abrirPastaBoletim = abrirPastaBoletim;
window.fecharPastaBoletim = fecharPastaBoletim;
window.abrirPastaPrivado = abrirPastaPrivado;
window.fecharPastaPrivado = fecharPastaPrivado;
window.atualizarGrafico = atualizarGrafico;
window.fecharModal = fecharModal;
window.abrirModal = abrirModal;
window.abrirMidaFlutuante = abrirMidaFlutuante;
window.desfazerLeitura = desfazerLeitura;
window.abrirListaLeituras = abrirListaLeituras;
window.gerarHTMLCard = gerarHTMLCard;
window.renderizarListaGenerica = renderizarListaGenerica;
window.renderizarPastasGenericas = renderizarPastasGenericas;
window.renderizarPastasBoletins = renderizarPastasBoletins;
window.renderizarListaBoletins = renderizarListaBoletins;
window.renderizarPastasPrivados = renderizarPastasPrivados;
window.renderizarListaPrivados = renderizarListaPrivados;
window.renderizarCards = renderizarCards;
window.carregarConfiguracoes = carregarConfiguracoes;
window.toggleChat = toggleChat;
window.sendQuickMsg = sendQuickMsg;
window.sendChat = sendChat;
window.addChatBubble = addChatBubble;
window.processarLogicaDoBot = processarLogicaDoBot;


// ==========================================
// 5. ATRIBUIÇÃO DE EVENTOS E NAVEGAÇÃO
// ==========================================

const mainContent = document.querySelector('.main-content');
if(mainContent) {
    mainContent.addEventListener('click', async (e) => {
        const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit'); const btnAssinar = e.target.closest('.btn-assinar');
        if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
        if (btnEditar && isAdmin) abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, JSON.parse(btnEditar.dataset.info));
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
        
        if(abaAtual === 'boletins' && typeof fecharPastaBoletim === 'function') fecharPastaBoletim(); 
        if(abaAtual === 'boletins-privados' && typeof fecharPastaPrivado === 'function') fecharPastaPrivado();
        ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico'].forEach(col => {
            if(abaAtual === col && typeof fecharPastaGenerica === 'function') fecharPastaGenerica(col);
        });
        
        // Resolve o bug da tela branca no Início
        if(abaAtual === 'home') {
            verificarUrgentesHome();
        }
    });
});
