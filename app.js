import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, orderBy, limit, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let motivosGlobais = [];

window.todosBoletinsData = [];
window.todosPrivadosData = [];
window.todosConveniosData = [];
window.dadosBoletins = {}; 
window.pastaBoletimAtual = null;
window.pastaPrivadoAtual = null;
window.pastaConvenioAtual = null;

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
    { valor: "linear-gradient(135deg, #f40076, #df98fa)", nome: "Rosa/Roxo", dark: true },
    { valor: "linear-gradient(135deg, #f06966, #fad6a6)", nome: "Pêssego/Amarelo", dark: false },
    { valor: "linear-gradient(135deg, #9055ff, #13e2da)", nome: "Azul/Ciano", dark: true },
    { valor: "linear-gradient(135deg, #0b63f6, #003cc5)", nome: "Azul Escuro", dark: true },
    { valor: "linear-gradient(135deg, #d6ff7f, #00b3cc)", nome: "Verde/Azul", dark: true }
];

const frases = ["O sucesso é a soma de pequenos esforços repetidos dia após dia.", "A empatia é a medicina que o mundo mais precisa.", "Juntos, fazemos a diferença na vida de cada paciente.", "Trabalho em equipe divide as tarefas e multiplica o sucesso.", "A excelência não é um ato, mas um hábito."];

const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor da Clínica'] },
    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA'] }, 
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Observações'] },
    'ultrassom': { titulo: 'Ultrassom', campos: ['Código', 'Exame', 'Profissional', 'Restrição de Idade', 'Observação'] },
    'consultas': { titulo: 'Consulta ou Procedimento', campos: ['Código', 'Tipo', 'Descrição', 'Observações'] },
    'pacotes': { titulo: 'Pacote PS', campos: ['Descrição', 'Valor ou Informacao', 'O que está incluso', 'Observações', 'Pacotes', 'Kit'] },
    'exames-imagem': { titulo: 'Exame de Imagem', campos: ['Código', 'Descrição', 'Valor', 'Prazo de Laudo', 'Onde encontrar resultado', 'Observações', 'Convênios'] },
    'institutos': { titulo: 'Instituto', campos: ['Número da Tabela', 'Profissional', 'Especialidade', 'Restrição de Idade', 'CRM', 'CBO', 'URA', 'Outros'] },
    'remocoes': { titulo: 'Remoção', campos: ['Nome do Lugar', 'Números (Separe por vírgula)', 'Local e Link Maps', 'Observações Importantes'] },
    'ramais': { titulo: 'Ramal', campos: ['Local ou Prédio', 'Setor', 'Número do Ramal', 'Observações'] },
    'emails': { titulo: 'E-mail', campos: ['Descrição do E-mail', 'Setor'] },
    'contatos-gerais': { titulo: 'Contato Geral', campos: ['Descrição (Lugar ou Pessoa)', 'Número'] },
    'contatos-convenios': { titulo: 'Contato Convênio', campos: ['Nome do Convênio', 'Número'] },
    'senhas': { titulo: 'Senha de Acesso', campos: ['Convênio ou Sistema', 'Link de Acesso', 'Senha', 'Local de Acesso Permitido'] },
    'boletins': { titulo: 'Boletim Informativo', campos: ['Título do Informativo', 'Para quais Setores?', 'Tipo (Urgente, Norma, Regra, etc)', 'Data de Publicação', 'Motivo', 'Links dos Materiais (1 por linha)'] },
    'boletins-privados': { titulo: 'Informativo Direto (Privado)', campos: ['Para qual Colaborador?', 'Título do Documento', 'Data de Publicação', 'Tipo (Urgente, Norma, Regra, etc)', 'Motivo', 'Links dos Materiais (1 por linha)'] }
};

setInterval(() => { document.getElementById('relogio').innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
document.getElementById('frase-dia').innerText = frases[Math.floor(Math.random() * frases.length)];

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
            document.getElementById('btn-nav-privados').style.display = 'flex';
            document.getElementById('btn-nav-colaboradores').style.display = 'flex';
            document.getElementById('btn-nav-ajustes').style.display = 'flex';
        } else {
            document.getElementById('user-role-badge').classList.remove('admin');
            document.getElementById('btn-nav-privados').style.display = 'none';
            document.getElementById('btn-nav-colaboradores').style.display = 'none';
            document.getElementById('btn-nav-ajustes').style.display = 'none';
        }
        
        document.getElementById('btn-novo').style.display = (isAdmin && abaAtual !== 'home' && abaAtual !== 'ajustes') ? 'flex' : 'none';
        Object.keys(configuracaoAbas).forEach(idColecao => renderizarCards(idColecao));
        carregarConfiguracoes();
        buscarClimaAraucaria(); 
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard-screen').style.display = 'none';
    }
});

document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        abaAtual = btn.getAttribute('data-tab');
        document.getElementById(`tab-${abaAtual}`).style.display = 'block';
        document.getElementById('page-title').textContent = btn.textContent.trim();
        document.getElementById('btn-novo').style.display = (isAdmin && abaAtual !== 'home' && abaAtual !== 'ajustes') ? 'flex' : 'none';
        document.getElementById('search-box').style.display = (abaAtual !== 'home' && abaAtual !== 'ajustes') ? 'flex' : 'none';
        document.getElementById('input-pesquisa').value = ''; 
        
        if(abaAtual === 'boletins') window.fecharPastaBoletim(); 
        if(abaAtual === 'boletins-privados') window.fecharPastaPrivado();
        if(abaAtual === 'convenios') window.fecharPastaConvenio();
    });
});

document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    if(!isAdmin) return;
    const colecaoNome = document.getElementById('btn-salvar-dados').getAttribute('data-colecao');
    const docId = document.getElementById('modal-doc-id').value;
    const config = configuracaoAbas[colecaoNome];
    
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
    const motivosTexto = document.getElementById('tab-input-motivos').value; 
    const corPend = document.getElementById('tab-color-pendente').value; 
    const corConc = document.getElementById('tab-color-concluido').value; 
    
    document.getElementById('btn-salvar-ajustes').textContent = "Salvando...";
    try {
        await setDoc(doc(db, "configuracoes", "gerais"), { banner_texto: texto, locais: locaisTexto, setores: setoresTexto, motivos: motivosTexto, cor_pendente: corPend, cor_concluido: corConc });
        alert("Configurações salvas com sucesso!");
    } catch(e) { alert("Erro ao salvar configurações."); }
    document.getElementById('btn-salvar-ajustes').innerHTML = '<i class="ri-save-line"></i> Salvar Alterações';
});

function carregarConfiguracoes() {
    onSnapshot(doc(db, "configuracoes", "gerais"), (docSnap) => {
        const area = document.getElementById('banner-content');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.banner_texto && data.banner_texto.trim() !== '') area.innerHTML = `<h2>${data.banner_texto.replace(/\n/g, '<br>')}</h2>`;
            else area.innerHTML = `<h2>Bem-vindo ao Painel CSV</h2>`;
            
            if(document.getElementById('tab-input-banner')) document.getElementById('tab-input-banner').value = data.banner_texto || '';
            if(document.getElementById('tab-input-locais')) document.getElementById('tab-input-locais').value = data.locais || '';
            if(document.getElementById('tab-input-setores')) document.getElementById('tab-input-setores').value = data.setores || '';
            if(document.getElementById('tab-input-motivos')) document.getElementById('tab-input-motivos').value = data.motivos || '';
            
            window.corStatusPendente = data.cor_pendente || '#e53e3e';
            window.corStatusConcluido = data.cor_concluido || '#38a169';
            if(document.getElementById('tab-color-pendente')) document.getElementById('tab-color-pendente').value = window.corStatusPendente;
            if(document.getElementById('tab-color-concluido')) document.getElementById('tab-color-concluido').value = window.corStatusConcluido;
            
            locaisGlobais = data.locais ? data.locais.split('\n').filter(l => l.trim() !== '') : [];
            setoresGlobais = data.setores ? data.setores.split('\n').filter(s => s.trim() !== '') : [];
            motivosGlobais = data.motivos ? data.motivos.split('\n').filter(m => m.trim() !== '') : [];
            
            if(abaAtual === 'boletins' && !window.pastaBoletimAtual) renderizarPastasBoletins();
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual) renderizarPastasPrivados();
        }
    });
}

async function buscarClimaAraucaria() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.59&longitude=-49.41&current_weather=true');
        const data = await response.json();
        const clima = data.current_weather;
        document.getElementById('weather-deg').textContent = Math.round(clima.temperature);
        let desc = "Céu Limpo"; let icon = "ri-sun-fill";
        if(clima.weathercode >= 1 && clima.weathercode <= 3) { desc = "Parcialmente Nublado"; icon = "ri-sun-cloudy-fill"; }
        if(clima.weathercode === 45 || clima.weathercode === 48) { desc = "Neblina"; icon = "ri-foggy-fill"; }
        if(clima.weathercode >= 51 && clima.weathercode <= 67) { desc = "Chuva Leve"; icon = "ri-drizzle-fill"; }
        if(clima.weathercode >= 71 && clima.weathercode <= 77) { desc = "Chuva/Neve"; icon = "ri-snowy-line"; }
        if(clima.weathercode >= 80 && clima.weathercode <= 82) { desc = "Pancadas de Chuva"; icon = "ri-showers-fill"; }
        if(clima.weathercode >= 95) { desc = "Tempestade"; icon = "ri-thunderstorms-fill"; }
        document.getElementById('weather-desc').textContent = desc; document.getElementById('weather-icon-class').className = icon;
    } catch(e) { document.getElementById('weather-desc').textContent = "Clima indisponível no momento"; }
}

document.getElementById('input-pesquisa-global').addEventListener('keyup', (e) => {
    const texto = e.target.value.toLowerCase();
    const areaRes = document.getElementById('resultados-globais');
    if(texto.length < 2) { areaRes.style.display = 'none'; return; }
    
    areaRes.style.display = 'grid'; 
    areaRes.innerHTML = '<h3 style="grid-column: 1/-1; margin-bottom: 10px;">Resultados da Busca:</h3>';
    let encontrou = false;
    
    document.querySelectorAll('.tab-content:not(#tab-home):not(#tab-ajustes) .card, .mini-card').forEach(card => {
        const abaPai = card.closest('.tab-content');
        if(!isAdmin && abaPai && (abaPai.id === 'tab-boletins-privados' || abaPai.id === 'tab-colaboradores')) return;
        
        if(card.innerText.toLowerCase().includes(texto)) { 
            let clone = card.cloneNode(true);
            clone.style.display = 'flex'; 
            areaRes.appendChild(clone); 
            encontrou = true; 
        }
    });
    if(!encontrou) areaRes.innerHTML += '<p>Nenhum resultado encontrado.</p>';
});

document.getElementById('input-pesquisa').addEventListener('keyup', (e) => {
    const texto = e.target.value.toLowerCase();
    const abaContainer = document.getElementById(`tab-${abaAtual}`);
    if(!abaContainer) return;
    
    abaContainer.querySelectorAll('.card, .mini-card').forEach(card => {
        if(card.classList.contains('shortcut-card')) return;
        if(card.innerText.toLowerCase().includes(texto)) card.style.display = 'flex';
        else card.style.display = 'none';
    });
});

window.desfazerLeitura = async function(docId, nomeColab, colecao) {
    if(!isAdmin) return;
    if(!confirm(`Tem certeza que deseja remover a assinatura de ${nomeColab}?`)) return;
    
    const docData = window.dadosBoletins[docId];
    if(!docData || !docData.leituras) return;
    
    const stringExata = docData.leituras.find(txt => txt.startsWith(nomeColab));
    if(stringExata) {
        await updateDoc(doc(db, colecao, docId), { leituras: arrayRemove(stringExata) });
        document.getElementById('modal-leituras').style.display = 'none';
    }
}

function obterPublicoAlvo(setoresAlvoString) {
    if (!setoresAlvoString || setoresAlvoString.includes('Geral')) return listaColaboradoresGlobal.map(c => c.nome);
    const setoresMarcados = setoresAlvoString.split(', ');
    return listaColaboradoresGlobal.filter(c => setoresMarcados.includes(c.setor)).map(c => c.nome);
}

function verificarUrgentesHome() {
    const area = document.getElementById('area-alertas-home');
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
    document.getElementById('modal-leitura-titulo').textContent = data['Título do Informativo'] || data['Título do Documento'] || 'Status';
    
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

    document.getElementById('lista-lidos-content').innerHTML = htmlLidos || '<p style="color:var(--text-muted);">Ninguém assinou ainda.</p>';
    document.getElementById('lista-falta-content').innerHTML = htmlNaoLidos || '<p style="color:#38a169;">Todos assinaram!</p>';
    document.getElementById('modal-leituras').style.display = 'flex';
}

function abrirModal(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    document.getElementById('modal-title').textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
    const corSalva = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : "#ffffff";
    document.getElementById('card-color').value = corSalva;
    
    let htmlGradientes = '';
    paletaGradientes.forEach(grad => {
        const isSelected = corSalva === grad.valor ? 'selected' : '';
        htmlGradientes += `<div class="color-swatch ${isSelected}" style="background: ${grad.valor};" data-color="${grad.valor}" title="${grad.nome}"></div>`;
    });
    document.getElementById('gradient-picker').innerHTML = htmlGradientes;
    document.querySelectorAll('.color-swatch').forEach(swatch => { swatch.addEventListener('click', (e) => { document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); e.target.classList.add('selected'); document.getElementById('card-color').value = e.target.getAttribute('data-color'); }); });
    document.getElementById('modal-doc-id').value = docId || "";

    let htmlCampos = '';
    config.campos.forEach(campo => {
        const valorAntigo = (dadosAntigos && dadosAntigos[campo]) ? dadosAntigos[campo] : '';
        
        if(colecao === 'colaboradores' && campo === 'Setor da Clínica') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px;"><option value="Geral">Setor Padrão (Geral)</option>`;
            setoresGlobais.forEach(s => { htmlCampos += `<option value="${s}" ${valorAntigo === s ? 'selected' : ''}>${s}</option>`; });
            htmlCampos += `</select>`;
        }
        else if(colecao === 'boletins-privados' && campo === 'Para qual Colaborador?') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px;"><option value="">Selecione o Colaborador...</option>`;
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
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px;"><option value="">Selecione o Motivo...</option>`;
            motivosGlobais.forEach(m => { htmlCampos += `<option value="${m}" ${valorAntigo === m ? 'selected' : ''}>${m}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if(campo === 'Links dos Materiais (1 por linha)') {
            htmlCampos += `<textarea id="input-${campo}" class="form-input" style="height:80px; resize:vertical;" placeholder="Cole os links de Vídeos ou Documentos (um por linha)">${valorAntigo}</textarea>`;
        }
        else if(colecao === 'consultas' && campo === 'Tipo') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px;"><option value="">Selecione...</option><option value="Consulta" ${valorAntigo === 'Consulta' ? 'selected' : ''}>Consulta</option><option value="Exame" ${valorAntigo === 'Exame' ? 'selected' : ''}>Exame</option><option value="Pacotes" ${valorAntigo === 'Pacotes' ? 'selected' : ''}>Pacotes</option><option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        } 
        else if(campo === 'Local ou Prédio') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px;"><option value="">Selecione o Local...</option>`;
            locaisGlobais.forEach(loc => { const l = loc.trim(); if(l) htmlCampos += `<option value="${l}" ${valorAntigo === l ? 'selected' : ''}>${l}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if (campo.includes('Data')) { htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`;
        } else { htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`; }
    });
    
    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', colecao);
    document.getElementById('modal-cadastro').style.display = 'flex';
}

document.getElementById('btn-novo').addEventListener('click', () => { let aba = abaAtual; if(aba === 'contatos') aba = document.getElementById('btn-novo').getAttribute('data-sub-aba') || alert("Abra uma categoria!"); if(aba !== 'contatos') abrirModal(aba); });
document.getElementById('btn-fechar-modal').addEventListener('click', () => document.getElementById('modal-cadastro').style.display = 'none');

// --- GRÁFICOS CHART.JS ---
function atualizarGrafico(canvasId, refInstancia, dados, labelGrafico) {
    const ctx = document.getElementById(canvasId);
    if(!ctx) return refInstancia;
    
    const contagemMotivos = {};
    dados.forEach(b => {
        const m = b.data['Motivo'] || 'Sem Motivo';
        contagemMotivos[m] = (contagemMotivos[m] || 0) + 1;
    });

    const labels = Object.keys(contagemMotivos);
    const valores = Object.values(contagemMotivos);

    if(refInstancia) refInstancia.destroy(); 

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: labelGrafico,
                data: valores,
                backgroundColor: '#8B252C',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// --- PASTAS DE BOLETINS GERAIS ---
window.abrirPastaBoletim = function(pasta) {
    window.pastaBoletimAtual = pasta;
    document.getElementById('boletins-view-folders').style.display = 'none';
    document.getElementById('boletins-view-list').style.display = 'block';
    document.getElementById('titulo-pasta-boletins').innerHTML = `<i class="ri-folder-open-line"></i> Setor: ${pasta}`;
    renderizarListaBoletins();
}
window.fecharPastaBoletim = function() {
    window.pastaBoletimAtual = null;
    document.getElementById('boletins-view-list').style.display = 'none';
    document.getElementById('boletins-view-folders').style.display = 'block';
    renderizarPastasBoletins();
}
function renderizarPastasBoletins() {
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
function renderizarListaBoletins() {
    const grid = document.getElementById('grid-boletins'); grid.innerHTML = '';
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
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="abrirMidaFlutuante('${lk.trim()}')" style="width: 100%; background: var(--primary-color); color: white; border:none; cursor:pointer; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; transition: 0.2s;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
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

// --- PASTAS DE INFORMATIVOS PRIVADOS ---
window.abrirPastaPrivado = function(colabNome) {
    window.pastaPrivadoAtual = colabNome;
    document.getElementById('privados-view-folders').style.display = 'none';
    document.getElementById('privados-view-list').style.display = 'block';
    document.getElementById('titulo-pasta-privados').innerHTML = `<i class="ri-folder-user-line"></i> ${colabNome}`;
    renderizarListaPrivados();
}
window.fecharPastaPrivado = function() {
    window.pastaPrivadoAtual = null;
    document.getElementById('privados-view-list').style.display = 'none';
    document.getElementById('privados-view-folders').style.display = 'block';
    renderizarPastasPrivados();
}
function renderizarPastasPrivados() {
    const gridFolders = document.getElementById('grid-privados-folders');
    if(!gridFolders) return;
    gridFolders.innerHTML = '';
    
    // Mostra todos os colaboradores cadastrados para sempre ter a pasta!
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

function renderizarListaPrivados() {
    const grid = document.getElementById('grid-boletins-privados-list'); grid.innerHTML = '';
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
                        links.forEach((lk, i) => { botaoLinkHtml += `<button onclick="abrirMidaFlutuante('${lk.trim()}')" style="width: 100%; background: var(--primary-color); color: white; border:none; cursor:pointer; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; transition: 0.2s;"><i class="ri-eye-line"></i> Acessar Material ${links.length > 1 ? i+1 : ''}</button>`; });
                        botaoLinkHtml += `</div>`;
                    }
                } else { cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${(isUrgente && chave.includes('Tipo')) ? '#e53e3e' : ''};"><strong>${chave}:</strong> <span style="font-weight: ${(isUrgente && chave.includes('Tipo')) ? '700' : '500'};">${valor}</span></div>`; }
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

// --- CONVÊNIOS (COM PASTAS) ---
window.abrirPastaConvenio = function(convenio) {
    window.pastaConvenioAtual = convenio;
    document.getElementById('convenios-view-folders').style.display = 'none';
    document.getElementById('convenios-view-list').style.display = 'block';
    document.getElementById('titulo-pasta-convenios').innerHTML = `<i class="ri-shield-cross-line"></i> ${convenio}`;
    renderizarListaConvenios();
}
window.fecharPastaConvenio = function() {
    window.pastaConvenioAtual = null;
    document.getElementById('convenios-view-list').style.display = 'none';
    document.getElementById('convenios-view-folders').style.display = 'block';
    renderizarPastasConvenios();
}
function renderizarPastasConvenios() {
    const grid = document.getElementById('grid-convenios-folders');
    if(!grid) return;
    grid.innerHTML = '';
    const conveniosUnicos = [...new Set(window.todosConveniosData.map(i => i.data['Convênio']).filter(Boolean))].sort();
    conveniosUnicos.forEach(conv => {
        const qtd = window.todosConveniosData.filter(i => i.data['Convênio'] === conv).length;
        grid.innerHTML += `<div class="shortcut-card" onclick="window.abrirPastaConvenio('${conv}')" style="text-align: left; padding: 20px; border-left: 6px solid var(--primary-color);"><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;"><div style="background: var(--bg-color); padding: 15px; border-radius: 12px; color: var(--primary-color); font-size: 24px;"><i class="ri-shield-cross-fill"></i></div><div style="font-size: 16px; font-weight: 600;">${conv}</div></div><div style="font-size: 12px; color: var(--text-muted); background: #f8fafc; padding: 10px; border-radius: 8px;">Serviços cadastrados: <b style="color:var(--text-main);">${qtd}</b></div></div>`;
    });
}
function renderizarListaConvenios() {
    const grid = document.getElementById('grid-convenios-list'); grid.innerHTML = '';
    const itensExibir = window.todosConveniosData.filter(i => i.data['Convênio'] === window.pastaConvenioAtual);
    const camposOrdem = configuracaoAbas['convenios'].campos;
    
    itensExibir.forEach(item => {
        const data = item.data; const docId = item.id;
        let cardHtml = `<div class="card" style="display:flex; flex-direction:column; background: #ffffff; border-left: 6px solid var(--primary-color);"><div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600;">${data[camposOrdem[0]] || 'Serviço'}</div>`;
        camposOrdem.forEach(chave => {
            if (data[chave] && chave !== camposOrdem[0]) {
                cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span>${data[chave]}</span></div>`; 
            }
        });
        if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="convenios" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="convenios" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        grid.innerHTML += cardHtml + `</div>`;
    });
}

// RENDERIZADOR GERAL
function renderizarCards(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);
    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && colecaoNome !== 'convenios') return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'boletins') { window.todosBoletinsData = []; verificarUrgentesHome(); }
            if(colecaoNome === 'boletins-privados') { window.todosPrivadosData = []; verificarUrgentesHome(); }
            if(colecaoNome === 'convenios') { window.todosConveniosData = []; }
            if(grid) grid.innerHTML = '';
            return;
        }

        let itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() }));

        if(colecaoNome === 'colaboradores') {
            listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome));
            if(abaAtual === 'boletins-privados' && !window.pastaPrivadoAtual) renderizarPastasPrivados(); // Atualiza pastas privadas se cadastrar novo collab
        }

        if(colecaoNome === 'boletins') {
            window.todosBoletinsData = itens;
            if(abaAtual === 'boletins') { if(window.pastaBoletimAtual) renderizarListaBoletins(); else renderizarPastasBoletins(); }
            verificarUrgentesHome();
            return;
        }

        if(colecaoNome === 'boletins-privados') {
            window.todosPrivadosData = itens;
            if(abaAtual === 'boletins-privados') { if(window.pastaPrivadoAtual) renderizarListaPrivados(); else renderizarPastasPrivados(); }
            verificarUrgentesHome();
            return;
        }
        
        if(colecaoNome === 'convenios') {
            window.todosConveniosData = itens;
            if(abaAtual === 'convenios') { if(window.pastaConvenioAtual) renderizarListaConvenios(); else renderizarPastasConvenios(); }
            return;
        }

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
        const camposOrdem = configuracaoAbas[colecaoNome].campos;
        const campoTitulo = camposOrdem[0];
        
        itens.sort((a, b) => {
            const tituloA = a.data[campoTitulo] || a.data['Nome/Médico'] || a.data['Nome'] || "";
            const tituloB = b.data[campoTitulo] || b.data['Nome/Médico'] || b.data['Nome'] || "";
            return tituloA.toUpperCase().localeCompare(tituloB.toUpperCase());
        });

        itens.forEach((item) => {
            const data = item.data; const docId = item.id;
            const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'];
            const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
            const configCor = paletaGradientes.find(p => p.valor === corSalva);
            const isDark = configCor ? configCor.dark : false;
            
            let cardHtml = `<div class="card ${isDark ? 'has-gradient' : ''}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; ${!isDark ? 'border-left: 6px solid var(--primary-color);' : ''}">`;
            if (tituloDesteCard) cardHtml += `<div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600; padding-right: 35px; line-height:1.2;">${tituloDesteCard}</div>`;
            
            camposOrdem.forEach(chave => {
                const valor = data[chave];
                if (valor && chave !== campoTitulo) {
                    // INTELIGÊNCIA DO GOOGLE MAPS PARA REMOÇÕES E CONTATOS
                    if(chave === 'Local e Link Maps' && valor.includes('http')) {
                        const urlMatch = valor.match(/https?:\/\/[^\s]+/);
                        const url = urlMatch ? urlMatch[0] : valor;
                        const textoSemUrl = valor.replace(url, '').trim();
                        cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span>${textoSemUrl}</span><br><button onclick="window.open('${url}', '_blank')" style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--primary-color); transition:0.2s;"><i class="ri-map-pin-user-fill"></i> Ver no Mapa</button></div>`;
                    } else {
                        cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4;"><strong>${chave}:</strong> <span style="font-weight: 500;">${valor}</span></div>`; 
                    }
                }
            });
            
            if (isAdmin) cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
            grid.innerHTML += cardHtml + `</div>`;
        });
    });
}

document.querySelector('.main-content').addEventListener('click', async (e) => {
    const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit'); const btnAssinar = e.target.closest('.btn-assinar');
    if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
    if (btnEditar && isAdmin) abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, JSON.parse(btnEditar.dataset.info));
    if (btnAssinar && isAdmin) {
        const idDoc = btnAssinar.dataset.id;
        const col = btnAssinar.dataset.colecao;
        const nomeColaborador = document.getElementById(`leitor-${idDoc}`).value;
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
    document.getElementById('iframe-media').src = u; document.getElementById('modal-media').style.display = 'flex';
}
document.getElementById('btn-fechar-media').addEventListener('click', () => { document.getElementById('modal-media').style.display = 'none'; document.getElementById('iframe-media').src = ""; });
