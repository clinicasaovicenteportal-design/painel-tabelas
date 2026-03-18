import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, query, orderBy, limit, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
window.dadosBoletins = {}; // Salva os dados para o popup de leituras

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
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor ou Cargo'] },
    'corpo-clinico': { titulo: 'Médico', campos: ['Nome do Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA'] }, // LOGO REMOVIDA
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
    'boletins': { titulo: 'Boletim Informativo', campos: ['Título do Informativo', 'Tipo (Urgente, Norma, Regra, etc)', 'Data de Publicação', 'Motivo ou Observação', 'Link do Arquivo'] },
    'boletins-privados': { titulo: 'Informativo Direto (Privado)', campos: ['Para qual Colaborador?', 'Título do Documento', 'Data de Publicação', 'Link do Arquivo'] }
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
        buscarClimaAraucaria(); // Busca o clima ao logar!
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
    });
});

document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    if(!isAdmin) return;
    const colecaoNome = document.getElementById('btn-salvar-dados').getAttribute('data-colecao');
    const docId = document.getElementById('modal-doc-id').value;
    const config = configuracaoAbas[colecaoNome];
    
    let dados = {};
    config.campos.forEach(campo => {
        const valor = document.getElementById(`input-${campo}`).value.trim();
        if(valor) dados[campo] = valor;
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
    
    document.getElementById('btn-salvar-ajustes').textContent = "Salvando...";
    try {
        await setDoc(doc(db, "configuracoes", "gerais"), { banner_texto: texto, locais: locaisTexto });
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
            locaisGlobais = data.locais ? data.locais.split('\n').filter(l => l.trim() !== '') : [];
        }
    });
}

// --- WIDGET DO CLIMA EM TEMPO REAL (ARAUCÁRIA) ---
async function buscarClimaAraucaria() {
    try {
        // Busca do satélite pelo Open-Meteo (Gratuito e super rápido) para a lat/long de Araucária
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.59&longitude=-49.41&current_weather=true');
        const data = await response.json();
        const clima = data.current_weather;
        
        document.getElementById('weather-deg').textContent = Math.round(clima.temperature);
        
        // Traduz os códigos da OMM para texto e ícone lindo
        let desc = "Céu Limpo"; let icon = "ri-sun-fill";
        if(clima.weathercode >= 1 && clima.weathercode <= 3) { desc = "Parcialmente Nublado"; icon = "ri-sun-cloudy-fill"; }
        if(clima.weathercode === 45 || clima.weathercode === 48) { desc = "Neblina"; icon = "ri-foggy-fill"; }
        if(clima.weathercode >= 51 && clima.weathercode <= 67) { desc = "Chuva Leve"; icon = "ri-drizzle-fill"; }
        if(clima.weathercode >= 71 && clima.weathercode <= 77) { desc = "Chuva/Neve"; icon = "ri-snowy-line"; }
        if(clima.weathercode >= 80 && clima.weathercode <= 82) { desc = "Pancadas de Chuva"; icon = "ri-showers-fill"; }
        if(clima.weathercode >= 95) { desc = "Tempestade"; icon = "ri-thunderstorms-fill"; }

        document.getElementById('weather-desc').textContent = desc;
        document.getElementById('weather-icon-class').className = icon;
    } catch(e) {
        document.getElementById('weather-desc').textContent = "Clima indisponível no momento";
    }
}

document.getElementById('input-pesquisa-global').addEventListener('keyup', (e) => {
    const texto = e.target.value.toLowerCase();
    const areaRes = document.getElementById('resultados-globais');
    if(texto.length < 2) { areaRes.style.display = 'none'; return; }
    areaRes.style.display = 'grid';
    areaRes.innerHTML = '<h3 style="grid-column: 1/-1; margin-bottom: 10px;">Resultados da Busca:</h3>';
    const todosCards = document.querySelectorAll('.tab-content:not(#tab-home) .card');
    let encontrou = false;
    todosCards.forEach(card => {
        if(card.innerText.toLowerCase().includes(texto)) { areaRes.appendChild(card.cloneNode(true)); encontrou = true; }
    });
    if(!encontrou) areaRes.innerHTML += '<p>Nenhum resultado encontrado.</p>';
});

// ABRIR POPUP DE LEITURAS (NOVO)
window.abrirListaLeituras = function(docId) {
    const data = window.dadosBoletins[docId];
    if(!data) return;
    
    document.getElementById('modal-leitura-titulo').textContent = data['Título do Informativo'] || 'Status do Documento';
    
    const lidosTextos = data.leituras || [];
    // Pega só o primeiro nome de quem leu para comparar
    const lidosNomes = lidosTextos.map(txt => txt.split(' (')[0]); 

    let htmlLidos = '';
    let htmlNaoLidos = '';

    listaColaboradoresGlobal.forEach(nome => {
        const registroCompleto = lidosTextos.find(txt => txt.startsWith(nome));
        if (registroCompleto) {
            htmlLidos += `<div class="item-lido"><i class="ri-check-line"></i> ${registroCompleto}</div>`;
        } else {
            htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`;
        }
    });

    document.getElementById('lista-lidos-content').innerHTML = htmlLidos || '<p style="color:var(--text-muted);">Ninguém leu ainda.</p>';
    document.getElementById('lista-falta-content').innerHTML = htmlNaoLidos || '<p style="color:#38a169;">Todos já leram!</p>';
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
        if(colecao === 'boletins-privados' && campo === 'Para qual Colaborador?') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px; width:100%; padding:12px; border-radius:10px;"><option value="">Selecione o Colaborador...</option>`;
            listaColaboradoresGlobal.forEach(nome => { htmlCampos += `<option value="${nome}" ${valorAntigo === nome ? 'selected' : ''}>${nome}</option>`; });
            htmlCampos += `</select>`;
        } 
        else if(colecao === 'consultas' && campo === 'Tipo') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px; width:100%; padding:12px; border-radius:10px;"><option value="">Selecione...</option><option value="Consulta" ${valorAntigo === 'Consulta' ? 'selected' : ''}>Consulta</option><option value="Exame" ${valorAntigo === 'Exame' ? 'selected' : ''}>Exame</option><option value="Pacotes" ${valorAntigo === 'Pacotes' ? 'selected' : ''}>Pacotes</option><option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        } 
        else if(campo === 'Local ou Prédio') {
            htmlCampos += `<select id="input-${campo}" class="form-input" style="margin-bottom:15px; width:100%; padding:12px; border-radius:10px;"><option value="">Selecione o Local...</option>`;
            locaisGlobais.forEach(loc => { const l = loc.trim(); if(l) htmlCampos += `<option value="${l}" ${valorAntigo === l ? 'selected' : ''}>${l}</option>`; });
            htmlCampos += `<option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option></select>`;
        }
        else if (campo.includes('Data')) { htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`;
        } else if (campo.includes('Link')) { htmlCampos += `<input type="url" id="input-${campo}" placeholder="Link (URL)" value="${valorAntigo}" class="form-input">`;
        } else { htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`; }
    });
    
    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', colecao);
    document.getElementById('modal-cadastro').style.display = 'flex';
}

document.getElementById('btn-novo').addEventListener('click', () => { let aba = abaAtual; if(aba === 'contatos') aba = document.getElementById('btn-novo').getAttribute('data-sub-aba') || alert("Abra uma categoria!"); if(aba !== 'contatos') abrirModal(aba); });
document.getElementById('btn-fechar-modal').addEventListener('click', () => document.getElementById('modal-cadastro').style.display = 'none');

function renderizarCards(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);
    if(!grid) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        grid.innerHTML = '';
        if(snapshot.empty) return;

        let itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() }));

        if(colecaoNome === 'colaboradores') listaColaboradoresGlobal = itens.map(item => item.data['Nome Completo do Colaborador']).filter(Boolean).sort();

        // RENDER DE RAMAIS AGRUPADOS
        if (colecaoNome === 'ramais') {
            grid.style.display = 'block'; 
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
        
        grid.style.display = 'grid'; 

        const camposOrdem = configuracaoAbas[colecaoNome].campos;
        const campoTitulo = camposOrdem[0];
        
        itens.sort((a, b) => {
            const tituloA = a.data[campoTitulo] || a.data['Nome/Médico'] || a.data['Nome'] || "";
            const tituloB = b.data[campoTitulo] || b.data['Nome/Médico'] || b.data['Nome'] || "";
            return tituloA.toUpperCase().localeCompare(tituloB.toUpperCase());
        });

        const dataHoje = new Date().toISOString().split('T')[0];
        const areaNotificacoes = document.getElementById('area-notificacoes');
        if(colecaoNome === 'boletins') areaNotificacoes.innerHTML = ''; 

        itens.forEach((item) => {
            const data = item.data;
            const docId = item.id;
            const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'];
            
            if(colecaoNome === 'boletins' && data['Data de Publicação'] === dataHoje) {
                areaNotificacoes.innerHTML += `<div class="notificacao-dia" onclick="window.irParaAba('boletins')" style="cursor:pointer;"><i class="ri-notification-3-line"></i><div><strong style="display:block; color:#2c5282;">Novo Boletim Hoje!</strong><span style="font-size:13px; color:#4a5568;">${tituloDesteCard} foi publicado. Clique para ler.</span></div></div>`;
            }
            
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && data['Tipo (Urgente, Norma, Regra, etc)'].toLowerCase().includes('urgente');
            const classeUrgente = isUrgente ? 'card-urgente' : '';
            const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
            const configCor = paletaGradientes.find(p => p.valor === corSalva);
            const isDark = configCor ? configCor.dark : false;
            
            const gradientClass = isDark ? 'has-gradient' : ''; 
            const bordaUrgente = isUrgente ? 'border: 2px solid #e53e3e;' : '';
            const bordaEsqNormal = (!isUrgente && !isDark) ? 'border-left: 6px solid var(--primary-color);' : '';

            let cardHtml = `<div class="card ${classeUrgente} ${gradientClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; ${bordaUrgente} ${bordaEsqNormal}">`;

            if (tituloDesteCard) cardHtml += `<div class="card-title" style="margin-bottom:15px; font-size:18px; font-weight:600; padding-right: 35px; line-height:1.2;">${tituloDesteCard}</div>`;
            
            let botaoLinkHtml = '';
            
            camposOrdem.forEach(chave => {
                const valor = data[chave];
                if (valor && chave !== campoTitulo) {
                    if(typeof valor === 'string' && valor.includes('file:///')) return; 

                    if(chave.includes('Link')) {
                        botaoLinkHtml = `<div class="boletim-media" style="margin-top: 15px;"><button onclick="abrirMidaFlutuante('${valor}')" style="width: 100%; background: var(--primary-color); color: white; border:none; cursor:pointer; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"><i class="ri-eye-line"></i> Acessar Material</button></div>`;
                    } else { 
                        const corTexto = (isUrgente && chave.includes('Tipo')) ? '#e53e3e' : ''; 
                        const pesoTexto = (isUrgente && chave.includes('Tipo')) ? '700' : '500';
                        cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px; line-height: 1.4; color: ${corTexto};"><strong>${chave}:</strong> <span style="font-weight: ${pesoTexto};">${valor}</span></div>`; 
                    }
                }
            });
            
            cardHtml += botaoLinkHtml;
            
            // --- NOVA LÓGICA DE RESUMO DE LEITURAS E POPUP ---
            if(colecaoNome.includes('boletins')) {
                window.dadosBoletins[docId] = data; // Salva para o Pop-up consultar
                const lidos = data.leituras || [];
                const total = listaColaboradoresGlobal.length;
                const qtdLidos = lidos.length;
                const qtdFaltam = Math.max(0, total - qtdLidos);

                cardHtml += `<div class="leituras-lista" style="margin-top: auto; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 13px;">`;
                
                // Resumo Inteligente com Botão
                cardHtml += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 8px;">
                                <div style="font-size: 11px;">Visualizações: <b style="color:#38a169; font-size:13px;">${qtdLidos}</b> <br> Faltam: <b style="color:#e53e3e; font-size:13px;">${qtdFaltam}</b></div>
                                <button onclick="window.abrirListaLeituras('${docId}')" style="background: white; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; cursor:pointer; font-size: 12px; font-weight: 500; color: var(--primary-color); box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s;"><i class="ri-team-line"></i> Detalhes</button>
                             </div>`;
                
                // Seção de Assinatura
                if(isAdmin) {
                    cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 5px;"><select id="leitor-${docId}" style="flex:1; padding:8px; border-radius:8px; border:none; font-size:12px; background:rgba(255,255,255,0.9); outline:none;"><option value="">Assinar como...</option>`;
                    listaColaboradoresGlobal.forEach(colab => { cardHtml += `<option value="${colab}">${colab}</option>`; });
                    cardHtml += `</select><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="${colecaoNome}" style="background:#38a169; color:white; padding:8px 12px; border-radius:8px; cursor:pointer; font-size: 13px; font-weight: 500;"><i class="ri-check-line"></i></button></div>`;
                }
                cardHtml += `</div>`;
            }
            
            if (isAdmin) {
                const dadosSeguros = JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                cardHtml += `<div class="card-actions"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${dadosSeguros}" title="Editar"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
            }
            cardHtml += `</div>`; grid.innerHTML += cardHtml;
        });
    });
}

document.querySelector('.main-content').addEventListener('click', async (e) => {
    const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit'); const btnAssinar = e.target.closest('.btn-assinar');
    if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
    if (btnEditar && isAdmin) abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, JSON.parse(btnEditar.dataset.info));
    if (btnAssinar && isAdmin) {
        const idDoc = btnAssinar.dataset.id;
        const nomeColaborador = document.getElementById(`leitor-${idDoc}`).value;
        if(!nomeColaborador) return alert("Selecione um colaborador na lista!");
        const registro = `${nomeColaborador} (Lido em: ${new Date().toLocaleString('pt-BR')})`;
        await updateDoc(doc(db, btnAssinar.dataset.colecao, idDoc), { leituras: arrayUnion(registro) });
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
