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

function formatarLinkImagem(link) {
    if (!link || link.includes('file:///')) return null;
    if (link.includes("drive.google.com")) {
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return link;
}

setInterval(() => { const rl = document.getElementById('relogio'); if(rl) rl.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
const frases = ["O sucesso é a soma de pequenos esforços.", "A empatia é a medicina que o mundo precisa.", "Trabalho em equipe multiplica o sucesso."];
const fm = document.getElementById('frase-dia'); if(fm) fm.innerText = frases[Math.floor(Math.random() * frases.length)];

document.getElementById('btn-login').addEventListener('click', () => { signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('senha').value).catch(err => alert("Erro: " + err.message)); });
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'flex';
        isAdmin = (user.email === EMAIL_GESTAO);
        
        document.getElementById('user-role-badge').textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        if(isAdmin) {
            document.getElementById('user-role-badge').classList.add('admin');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        } else {
            document.getElementById('user-role-badge').classList.remove('admin');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
        
        Object.keys(configuracaoAbas).forEach(idColecao => renderizarCards(idColecao));
        carregarConfiguracoes(); buscarClimaAraucaria(); 
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard-screen').style.display = 'none';
    }
});

// LÓGICA DE NAVEGAÇÃO
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        abaAtual = btn.getAttribute('data-tab');
        const tabEl = document.getElementById(`tab-${abaAtual}`);
        if(tabEl) tabEl.style.display = 'block';
        
        document.getElementById('page-title').textContent = btn.textContent.trim();
        document.getElementById('search-box').style.display = (abaAtual !== 'home' && abaAtual !== 'ajustes') ? 'flex' : 'none';
        document.getElementById('input-pesquisa').value = ''; 
        
        if(abaAtual === 'boletins' && typeof window.fecharPastaBoletim === 'function') window.fecharPastaBoletim(); 
        if(abaAtual === 'boletins-privados' && typeof window.fecharPastaPrivado === 'function') window.fecharPastaPrivado();
        ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico'].forEach(col => {
            if(abaAtual === col && typeof window.fecharPastaGenerica === 'function') window.fecharPastaGenerica(col);
        });
    });
});

window.abrirModal = function(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    if(!config) return;
    document.getElementById('modal-title').textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
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
            htmlCampos += `<select id="input-${campo}" class="form-input"><option value="Geral">Selecione a Especialidade...</option>`;
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

window.abrirPastaGenerica = function(colecao, valorPasta) {
    window[`pasta_${colecao}_Atual`] = valorPasta;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    const titleEl = document.getElementById(`titulo-pasta-${colecao}`);
    if(foldEl) foldEl.style.display = 'none';
    if(listEl) listEl.style.display = 'block';
    if(titleEl && configuracaoAbas[colecao]) titleEl.innerHTML = `<i class="${configuracaoAbas[colecao].icone}"></i> Pasta: ${valorPasta}`;
    renderizarListaGenerica(colecao);
}

window.fecharPastaGenerica = function(colecao) {
    window[`pasta_${colecao}_Atual`] = null;
    const foldEl = document.getElementById(`${colecao}-view-folders`);
    const listEl = document.getElementById(`${colecao}-view-list`);
    if(listEl) listEl.style.display = 'none';
    if(foldEl) foldEl.style.display = 'block';
    renderizarPastasGenericas(colecao);
}

function renderizarPastasGenericas(colecao) {
    const grid = document.getElementById(`grid-${colecao}-folders`);
    if(!grid) return; 
    grid.innerHTML = '';
    const config = configuracaoAbas[colecao];
    const dadosAtuais = window.dadosGlobaisAbas[colecao] || [];
    
    if (dadosAtuais.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma pasta encontrada.</p>';
        return;
    }

    const pastasUnicas = [...new Set(dadosAtuais.map(i => i.data[config.campoAgrupador] || 'Geral (Sem Categoria)'))].sort();
    
    pastasUnicas.forEach(nomePasta => {
        const itensPasta = dadosAtuais.filter(i => (i.data[config.campoAgrupador] || 'Geral (Sem Categoria)') === nomePasta);
        const qtd = itensPasta.length;
        const corIcone = itensPasta[0].data.corCard && itensPasta[0].data.corCard !== "transparent" ? itensPasta[0].data.corCard : "var(--primary-color)";
        const iconeHtml = `<div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: ${corIcone}; font-size: 24px;"><i class="${config.icone}"></i></div>`;
        
        grid.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaGenerica('${colecao}', '${nomePasta}')" style="text-align: left; padding: 20px; border-left: 6px solid ${corIcone};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">${iconeHtml}<div style="font-size: 16px; font-weight: 600;">${nomePasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;">Cadastros na pasta: <b style="color:var(--text-main);">${qtd}</b></div></div>`;
    });
}

function gerarHTMLCard(colecaoNome, docId, data) {
    const config = configuracaoAbas[colecaoNome];
    if(!config) return '';
    const camposOrdem = config.campos;
    
    let campoTitulo = camposOrdem[0];
    if(config.campoAgrupador) {
        campoTitulo = camposOrdem.find(c => c !== config.campoAgrupador) || camposOrdem[0];
    }
    
    const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'] || 'Detalhes';
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

    let cardHtml = `<div class="card ${isDark ? 'has-gradient' : ''}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;
    
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
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span>${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--primary-color); transition:0.2s;"><i class="ri-map-pin-user-fill"></i> Ver no Mapa</button></div>`;
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

// MOTOR DE BUSCA GLOBAL ATUALIZADO
document.getElementById('input-pesquisa-global').addEventListener('keyup', (e) => {
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
            if(valoresStr.includes(texto)) {
                areaRes.innerHTML += gerarHTMLCard(colecao, item.id, item.data);
                encontrou = true;
            }
        });
    });

    if(!encontrou) areaRes.innerHTML += '<p style="color:var(--text-muted); font-size:14px; grid-column: 1/-1;">Nenhum resultado encontrado no sistema.</p>';
});

document.getElementById('input-pesquisa').addEventListener('keyup', (e) => {
    const texto = e.target.value.toLowerCase();
    const abaContainer = document.getElementById(`tab-${abaAtual}`);
    if(!abaContainer) return;
    
    abaContainer.querySelectorAll('.card, .shortcut-card, .mini-card').forEach(card => {
        if(card.innerText.toLowerCase().includes(texto)) card.style.display = 'flex';
        else card.style.display = 'none';
    });
});

// LÓGICA DE SALVAMENTO E MODAL
document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    if(!isAdmin) return;
    const colecaoNome = document.getElementById('btn-salvar-dados').getAttribute('data-colecao');
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
        document.getElementById('modal-cadastro').style.display = 'none';
    } catch(e) { alert("Erro: " + e); }
});

document.getElementById('btn-salvar-ajustes').addEventListener('click', async () => {
    if(!isAdmin) return;
    const texto = document.getElementById('tab-input-banner').value;
    const locaisTexto = document.getElementById('tab-input-locais').value; 
    const setoresTexto = document.getElementById('tab-input-setores').value; 
    const especialidadesTexto = document.getElementById('tab-input-especialidades').value; 
    const motivosTexto = document.getElementById('tab-input-motivos').value; 
    const corPend = document.getElementById('tab-color-pendente').value; 
    const corConc = document.getElementById('tab-color-concluido').value; 
    
    document.getElementById('btn-salvar-ajustes').innerHTML = "Salvando...";
    try {
        await setDoc(doc(db, "configuracoes", "gerais"), { 
            banner_texto: texto, 
            locais: locaisTexto, 
            setores: setoresTexto, 
            especialidades: especialidadesTexto,
            motivos: motivosTexto, 
            cor_pendente: corPend, 
            cor_concluido: corConc 
        });
        alert("Configurações salvas com sucesso!");
    } catch(e) { alert("Erro ao salvar configurações."); }
    document.getElementById('btn-salvar-ajustes').innerHTML = '<i class="ri-save-line"></i> Salvar Alterações';
});

function carregarConfiguracoes() {
    onSnapshot(doc(db, "configuracoes", "gerais"), (docSnap) => {
        const area = document.getElementById('banner-content');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(area) {
                if(data.banner_texto && data.banner_texto.trim() !== '') area.innerHTML = `<h2>${data.banner_texto.replace(/\n/g, '<br>')}</h2>`;
                else area.innerHTML = `<h2>Bem-vindo ao Painel Clínico</h2>`;
            }
            
            if(document.getElementById('tab-input-banner')) document.getElementById('tab-input-banner').value = data.banner_texto || '';
            if(document.getElementById('tab-input-locais')) document.getElementById('tab-input-locais').value = data.locais || '';
            if(document.getElementById('tab-input-setores')) document.getElementById('tab-input-setores').value = data.setores || '';
            if(document.getElementById('tab-input-especialidades')) document.getElementById('tab-input-especialidades').value = data.especialidades || '';
            if(document.getElementById('tab-input-motivos')) document.getElementById('tab-input-motivos').value = data.motivos || '';
            
            window.corStatusPendente = data.cor_pendente || '#e53e3e';
            window.corStatusConcluido = data.cor_concluido || '#38a169';
            if(document.getElementById('tab-color-pendente')) document.getElementById('tab-color-pendente').value = window.corStatusPendente;
            if(document.getElementById('tab-color-concluido')) document.getElementById('tab-color-concluido').value = window.corStatusConcluido;
            
            locaisGlobais = data.locais ? data.locais.split('\n').filter(l => l.trim() !== '') : [];
            setoresGlobais = data.setores ? data.setores.split('\n').filter(s => s.trim() !== '') : [];
            especialidadesGlobais = data.especialidades ? data.especialidades.split('\n').filter(s => s.trim() !== '') : [];
            motivosGlobais = data.motivos ? data.motivos.split('\n').filter(m => m.trim() !== '') : [];
            
            if(abaAtual === 'boletins' && !window.pastaBoletimAtual && typeof window.renderizarPastasBoletins === 'function') window.renderizarPastasBoletins();
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual && typeof window.renderizarPastasPrivados === 'function') window.renderizarPastasPrivados();
        }
    });
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

window.desfazerLeitura = async function(docId, nomeColab, colecao) {
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

window.abrirListaLeituras = function(docId, colecaoOrigem = 'boletins') {
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

window.abrirPastaBoletim = function(pasta) {
    window.pastaBoletimAtual = pasta;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    const title = document.getElementById('titulo-pasta-boletins');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-open-line"></i> Setor: ${pasta}`;
    if(typeof window.renderizarListaBoletins === 'function') window.renderizarListaBoletins();
}

window.fecharPastaBoletim = function() {
    window.pastaBoletimAtual = null;
    const viewFold = document.getElementById('boletins-view-folders');
    const viewList = document.getElementById('boletins-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    if(typeof window.renderizarPastasBoletins === 'function') window.renderizarPastasBoletins();
}

window.renderizarPastasBoletins = function() {
    const gridFolders = document.getElementById('grid-boletins-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    ['Geral', ...setoresGlobais].forEach(pasta => {
        const boletinsDaPasta = window.todosBoletinsData.filter(item => (item.data['Para quais Setores?'] || 'Geral').includes(pasta));
        let totalLidos = 0; let totalFaltam = 0;
        boletinsDaPasta.forEach(b => {
            const publicoDaqui = obterPublicoAlvo(b.data['Para quais Setores?'] || 'Geral');
            const lidosNames = (b.data.leituras || []).map(txt => txt.split(' (')[0]);
            const leram = publicoDaqui.filter(n => lidosNames.includes(n)).length;
            totalLidos += leram; totalFaltam += Math.max(0, publicoDaqui.length - leram);
        });
        const icone = pasta === 'Geral' ? 'ri-global-line' : 'ri-folder-user-line';
        const corStatusPasta = totalFaltam > 0 ? window.corStatusPendente : window.corStatusConcluido;

        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaBoletim('${pasta}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: var(--primary-color); font-size: 24px;"><i class="${icone}"></i></div><div style="font-size: 16px; font-weight: 600;">${pasta}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Boletins Ativos: <b style="color: var(--text-main);">${boletinsDaPasta.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos Acumulados: <b>${totalLidos}</b></div><div style="color: #e53e3e;">Pendências: <b>${totalFaltam}</b></div></div></div>`;
    });
}

window.renderizarListaBoletins = function() {
    const grid = document.getElementById('grid-boletins'); 
    if(!grid) return;
    grid.innerHTML = '';
    const pasta = window.pastaBoletimAtual;
    const boletinsExibir = window.todosBoletinsData.filter(item => (item.data['Para quais Setores?'] || 'Geral').includes(pasta));
    
    chartBoletinsInst = atualizarGrafico('chart-boletins', chartBoletinsInst, boletinsExibir, `Motivos em ${pasta}`);

    const camposOrdem = configuracaoAbas['boletins'].campos;
    const campoTitulo = camposOrdem[0];

    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data[campoTitulo] || 'Boletim';
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && data['Tipo (Urgente, Norma, Regra, etc)'].toLowerCase().includes('urgente');
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
                    const links = valor.split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="abrirMidaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { 
                    cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && chave.includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span style="font-weight: ${(isUrgente && chave.includes('Tipo')) ? '700' : '500'};">${valor}</span></div>`; 
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

window.abrirPastaPrivado = function(colabNome) {
    window.pastaPrivadoAtual = colabNome;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    const title = document.getElementById('titulo-pasta-privados');
    if(viewFold) viewFold.style.display = 'none';
    if(viewList) viewList.style.display = 'block';
    if(title) title.innerHTML = `<i class="ri-folder-user-line"></i> ${colabNome}`;
    if(typeof window.renderizarListaPrivados === 'function') window.renderizarListaPrivados();
}

window.fecharPastaPrivado = function() {
    window.pastaPrivadoAtual = null;
    const viewFold = document.getElementById('privados-view-folders');
    const viewList = document.getElementById('privados-view-list');
    if(viewList) viewList.style.display = 'none';
    if(viewFold) viewFold.style.display = 'block';
    if(typeof window.renderizarPastasPrivados === 'function') window.renderizarPastasPrivados();
}

window.renderizarPastasPrivados = function() {
    const gridFolders = document.getElementById('grid-privados-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    const todosOsNomes = listaColaboradoresGlobal.map(c => c.nome).sort();
    
    todosOsNomes.forEach(nome => {
        const boletinsDele = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === nome);
        let lidos = 0; let faltam = 0;
        boletinsDele.forEach(b => {
            const leitor = (b.data.leituras || []).find(txt => txt.startsWith(nome));
            if(leitor) lidos++; else faltam++;
        });

        let corStatusPasta = "var(--border-color)";
        if(boletinsDele.length > 0) corStatusPasta = faltam > 0 ? window.corStatusPendente : window.corStatusConcluido;

        gridFolders.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaPrivado('${nome}')" style="text-align: left; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border-left: 6px solid ${corStatusPasta};"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;"><div style="background: #e2e8f0; padding: 15px; border-radius: 12px; color: var(--text-main); font-size: 24px;"><i class="ri-user-star-fill"></i></div><div style="font-size: 15px; font-weight: 600;">${nome}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;"><div>Documentos: <b style="color: var(--text-main);">${boletinsDele.length}</b></div><div style="margin-top: 5px; color: #38a169;">Lidos: <b>${lidos}</b></div><div style="color: #e53e3e;">Pendentes: <b>${faltam}</b></div></div></div>`;
    });
}

window.renderizarListaPrivados = function() {
    const grid = document.getElementById('grid-boletins-privados-list'); 
    if(!grid) return;
    grid.innerHTML = '';
    const colabAtual = window.pastaPrivadoAtual;
    const boletinsExibir = window.todosPrivadosData.filter(item => item.data['Para qual Colaborador?'] === colabAtual);
    
    chartPrivadosInst = atualizarGrafico('chart-privados', chartPrivadosInst, boletinsExibir, `Motivos de ${colabAtual}`);

    const camposOrdem = configuracaoAbas['boletins-privados'].campos;
    boletinsExibir.forEach(item => {
        const data = item.data; const docId = item.id; window.dadosBoletins[docId] = data;
        const titulo = data['Título do Documento'] || 'Documento Privado';
        
        const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && data['Tipo (Urgente, Norma, Regra, etc)'].toLowerCase().includes('urgente');
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
                    const links = valor.split('\n').filter(l => l.trim() !== '');
                    if(links.length > 0) {
                        botaoLinkHtml += `<div class="boletim-media" style="margin-top: 15px; display:flex; flex-direction:column; gap:5px;">`;
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="abrirMidaFlutuante('${lk.trim()}')" class="btn-hover color-8" style="width: 100%; height: 35px; border-radius: 8px; font-size: 13px;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && chave.includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span>${valor}</span></div>`; }
            }
        });
        cardHtml += botaoLinkHtml;
        
        cardHtml += `<div class="leituras-lista" style="margin-top: auto; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 13px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 8px;"><div style="font-size: 13px; font-weight:600; color: ${jaLeu ? '#38a169' : '#e53e3e'};">${jaLeu ? '<i class="ri-check-double-line"></i> Lido' : '<i class="ri-time-line"></i> Pendente'}</div><button onclick="window.abrirListaLeituras('${docId}', 'boletins-privados')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color);"><i class="ri-list-check"></i> Detalhes</button></div>`;
        
        if(isAdmin && !jaLeu) {
            cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 5px;"><input type="hidden" id="leitor-${docId}" value="${colabAtual}"><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="boletins-privados" style="width:100%; background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer; font-size: 13px; font-weight: 500;"><i class="ri-check-line"></i> Confirmar Assinatura do Colaborador</button></div>`;
        }
        cardHtml += `</div>`;
        
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="boletins-privados" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="boletins-privados" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
}

// RENDERIZADOR GLOBAL
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
            if(grid) {
                grid.style.display = 'block'; 
                grid.innerHTML = '';
            }
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
                locaisMap[local].sort((a,b) => (a.data['Setor']||'').localeCompare(b.data['Setor']||'')).forEach(item => {
                    const data = item.data; const docId = item.id;
                    const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
                    const configCor = paletaGradientes.find(p => p.valor === corSalva);
                    const gradientClass = (configCor ? configCor.dark : false) ? 'has-gradient' : ''; 
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

document.querySelector('.main-content').addEventListener('click', async (e) => {
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

window.abrirMidaFlutuante = function(url) {
    let u = url;
    if(u.includes("drive.google.com") && u.includes("/view")) u = u.replace("/view", "/preview");
    if(u.includes("youtube.com/watch?v=")) u = `https://www.youtube.com/embed/${u.split("v=")[1].split("&")[0]}`;
    else if (u.includes("youtu.be/")) u = `https://www.youtube.com/embed/${u.split("youtu.be/")[1].split("?")[0]}`;
    const iframe = document.getElementById('iframe-media');
    const modalMedia = document.getElementById('modal-media');
    if(iframe) iframe.src = u; 
    if(modalMedia) modalMedia.style.display = 'flex';
}

document.getElementById('btn-fechar-media').addEventListener('click', () => { 
    const modalMedia = document.getElementById('modal-media');
    const iframe = document.getElementById('iframe-media');
    if(modalMedia) modalMedia.style.display = 'none'; 
    if(iframe) iframe.src = ""; 
});
// ================== LÓGICA DO CHATBOT ASSISTENTE ==================

window.toggleChatbot = function() {
    const win = document.getElementById('chatbot-window');
    const bubble = document.getElementById('chatbot-bubble');
    if (win.style.display === 'none' || win.style.display === '') {
        win.style.display = 'flex';
        bubble.querySelector('.chatbot-tooltip').style.display = 'none'; // esconde o aviso
        document.getElementById('chatbot-input-field').focus();
    } else {
        win.style.display = 'none';
    }
}

window.handleChatKeyPress = function(e) {
    if (e.key === 'Enter') enviarMensagemChat();
}

window.enviarMensagemRapida = function(texto) {
    document.getElementById('chatbot-input-field').value = texto;
    enviarMensagemChat();
}

window.enviarMensagemChat = function() {
    const input = document.getElementById('chatbot-input-field');
    const msg = input.value.trim();
    if (!msg) return;

    // 1. Adiciona msg do usuário
    addChatBubble(msg, 'user');
    input.value = '';

    // 2. Simula "Digitando..."
    setTimeout(() => {
        const resposta = processarLogicaDoBot(msg);
        addChatBubble(resposta, 'bot');
    }, 600); // pequeno delay para parecer natural
}

function addChatBubble(text, sender) {
    const chatArea = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = `msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
    div.innerHTML = text; // innerHTML permite colocar <b> e <br>
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight; // rola para baixo
}

function processarLogicaDoBot(mensagemUser) {
    const texto = mensagemUser.toLowerCase();
    
    // Respostas Sociais Básicas
    if (texto === 'oi' || texto === 'olá' || texto === 'ola' || texto.includes('bom dia') || texto.includes('boa tarde')) {
        return "Olá! Tudo bem? Sou a inteligência de busca do painel. Me pergunte sobre algum <b>Exame, Especialidade, Médico ou Convênio</b>!";
    }

    if (texto.includes('obrigado') || texto.includes('valeu')) {
        return "Por nada! Estou sempre aqui no cantinho se precisar de mais alguma informação rápida. 😉";
    }

    // LÓGICA DE BUSCA NOS DADOS DO SISTEMA
    let resultadosEncontrados = [];
    
    // Onde o bot vai procurar?
    const colecoesBusca = ['corpo-clinico', 'ultrassom', 'exames-imagem', 'consultas', 'convenios', 'ramais'];
    
    colecoesBusca.forEach(colecao => {
        const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
        
        itens.forEach(item => {
            // Junta todos os valores do card numa string gigante para procurar
            const valoresStr = Object.values(item.data).join(' ').toLowerCase();
            
            if (valoresStr.includes(texto)) {
                const config = configuracaoAbas[colecao];
                let tituloItem = item.data[config.campos[0]] || 'Item';
                
                // Se for corpo clínico, mostra a especialidade do lado
                if(colecao === 'corpo-clinico') {
                    tituloItem = `Dr(a) ${item.data['Nome do Médico']} (${item.data['Especialidade']})`;
                } else if(colecao === 'ramais') {
                    tituloItem = `Ramal: ${item.data['Número do Ramal']} (${item.data['Setor']})`;
                }
                
                resultadosEncontrados.push(`• <b>${tituloItem}</b> <i>(em ${config.titulo})</i>`);
            }
        });
    });

    // Filtra e remove duplicados para não spammar
    resultadosEncontrados = [...new Set(resultadosEncontrados)];

    // Montando a resposta
    if (resultadosEncontrados.length > 0) {
        // Mostrar no máximo 6 resultados para não travar o chat
        let respostaFormatada = `Aqui está o que encontrei no nosso sistema sobre <b>"${mensagemUser}"</b>:<br><br>`;
        const limite = resultadosEncontrados.slice(0, 6);
        respostaFormatada += limite.join('<br>');
        
        if (resultadosEncontrados.length > 6) {
            respostaFormatada += `<br><br><span style="color:var(--text-muted); font-size:11px;">Encontrei mais ${resultadosEncontrados.length - 6} itens. Seja mais específico se precisar!</span>`;
        }
        
        return respostaFormatada;
    }

    // Se não encontrou no banco, cai na resposta padrão / recusa
    return "Desculpe, não localizei nenhuma informação no sistema sobre isso. 🤔<br><br>Lembre-se: eu busco apenas informações cadastradas internamente (Médicos, Exames, Ramais e Convênios). Tente usar uma palavra-chave mais curta!";
}
