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

const frases = ["O sucesso é a soma de pequenos esforços repetidos dia após dia.", "A empatia é a medicina que o mundo mais precisa.", "Juntos, fazemos a diferença na vida de cada paciente.", "Trabalho em equipe divide as tarefas e multiplica o sucesso.", "A excelência não é um ato, mas um hábito."];

const configuracaoAbas = {
    'colaboradores': { titulo: 'Colaborador (Equipe)', campos: ['Nome Completo do Colaborador', 'Setor ou Cargo'] },
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
    'boletins': { titulo: 'Boletim Informativo', campos: ['Título do Informativo', 'Tipo (Urgente, Norma, Regra, etc)', 'Data de Publicação', 'Link do Arquivo', 'Motivo ou Observação'] },
    'boletins-privados': { titulo: 'Informativo Direto (Privado)', campos: ['Para qual Colaborador?', 'Título do Documento', 'Link do Arquivo', 'Data de Publicação'] }
};

setInterval(() => { document.getElementById('relogio').innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);
document.getElementById('frase-dia').innerText = frases[Math.floor(Math.random() * frases.length)];

document.getElementById('btn-login').addEventListener('click', () => { signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('senha').value).catch(err => alert("Erro: " + err.message)); });
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// --- CORREÇÃO DE SEGURANÇA E BOTÕES ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'flex';
        isAdmin = (user.email === EMAIL_GESTAO);
        
        document.getElementById('user-role-badge').textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        
        // Esconde ou mostra os botões ativamente baseados em quem logou!
        if(isAdmin) {
            document.getElementById('user-role-badge').classList.add('admin');
            document.getElementById('btn-nav-privados').style.display = 'flex';
            document.getElementById('btn-nav-colaboradores').style.display = 'flex';
            document.getElementById('btn-editar-banner').style.display = 'block';
        } else {
            document.getElementById('user-role-badge').classList.remove('admin');
            document.getElementById('btn-nav-privados').style.display = 'none';
            document.getElementById('btn-nav-colaboradores').style.display = 'none';
            document.getElementById('btn-editar-banner').style.display = 'none';
        }
        
        document.getElementById('btn-novo').style.display = (isAdmin && abaAtual !== 'home') ? 'flex' : 'none';
        
        Object.keys(configuracaoAbas).forEach(idColecao => renderizarCards(idColecao));
        carregarHistorico();
        carregarBanner();
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
        document.getElementById('btn-novo').style.display = (isAdmin && abaAtual !== 'home') ? 'flex' : 'none';
        document.getElementById('search-box').style.display = (abaAtual !== 'home') ? 'flex' : 'none';
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
        
        const nomeAcao = dados[config.campos[0]] || "Item Atualizado";
        await addDoc(collection(db, "historico_sistema"), { mensagem: `${docId ? 'Editou' : 'Cadastrou'} em ${config.titulo}: <b>${nomeAcao}</b>`, data: Date.now() });
        document.getElementById('modal-cadastro').style.display = 'none';
    } catch(e) { alert("Erro: " + e); }
});

// --- LÓGICA DO BANNER MÚLTIPLAS IMAGENS ---
document.getElementById('btn-editar-banner').addEventListener('click', () => document.getElementById('modal-banner').style.display = 'flex');
document.getElementById('btn-fechar-banner').addEventListener('click', () => document.getElementById('modal-banner').style.display = 'none');

document.getElementById('btn-salvar-banner').addEventListener('click', async () => {
    if(!isAdmin) return;
    const link = document.getElementById('input-banner-link').value;
    const texto = document.getElementById('input-banner-texto').value;
    await setDoc(doc(db, "configuracoes", "banner_home"), { link: link, texto: texto });
    document.getElementById('modal-banner').style.display = 'none';
});

function carregarBanner() {
    onSnapshot(doc(db, "configuracoes", "banner_home"), (docSnap) => {
        const area = document.getElementById('banner-content');
        if (docSnap.exists()) {
            const data = docSnap.data();
            let html = '';
            
            if(data.link && data.link.trim() !== '') {
                // Divide por linhas (Enter) para pegar múltiplos links
                const links = data.link.split('\n').filter(l => l.trim() !== '');
                
                links.forEach(l => {
                    let link = l.trim();
                    if(link.includes("youtube.com") || link.includes("youtu.be") || link.includes("drive.google.com")) {
                        if(link.includes("/view")) link = link.replace("/view", "/preview");
                        if(link.includes("watch?v=")) link = `https://www.youtube.com/embed/${link.split("v=")[1].split("&")[0]}`;
                        else if(link.includes("youtu.be/")) link = `https://www.youtube.com/embed/${link.split("youtu.be/")[1].split("?")[0]}`;
                        html += `<iframe src="${link}" allowfullscreen></iframe>`;
                    } else {
                        html += `<img src="${link}" alt="Banner">`;
                    }
                });
            } else if (data.texto && data.texto.trim() !== '') {
                html = `<div style="background:var(--surface-color); padding:30px; border-radius:15px; width:100%; border:1px dashed var(--border-color);"><h2>${data.texto}</h2></div>`;
            } else {
                html = `<div style="background:var(--surface-color); padding:20px; border-radius:15px; width:100%; border:1px dashed var(--border-color); color:var(--text-muted);">Espaço reservado para Banner de Comunicação</div>`;
            }
            
            if(document.getElementById('input-banner-link')) document.getElementById('input-banner-link').value = data.link || '';
            if(document.getElementById('input-banner-texto')) document.getElementById('input-banner-texto').value = data.texto || '';
            area.innerHTML = html;
        }
    });
}

function carregarHistorico() {
    const q = query(collection(db, "historico_sistema"), orderBy("data", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById('lista-historico');
        lista.innerHTML = '';
        if(snapshot.empty) { lista.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center;">Nenhuma atualização recente.</p>'; return; }
        snapshot.forEach(doc => {
            const data = new Date(doc.data().data).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
            lista.innerHTML += `<div class="historico-item"><span>${doc.data().mensagem}</span><span class="historico-badge">${data}</span></div>`;
        });
    });
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

function abrirModal(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    document.getElementById('modal-title').textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
    document.getElementById('modal-doc-id').value = docId || "";
    document.getElementById('card-color').value = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : "#8B252C";

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
        } else if (campo.includes('Data')) { htmlCampos += `<input type="date" id="input-${campo}" value="${valorAntigo}" class="form-input">`;
        } else if (campo.includes('Link')) { htmlCampos += `<input type="url" id="input-${campo}" placeholder="Link (URL)" value="${valorAntigo}" class="form-input">`;
        } else { htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`; }
    });
    
    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', colecao);
    document.getElementById('modal-cadastro').style.display = 'flex';
}

document.getElementById('btn-novo').addEventListener('click', () => {
    let aba = abaAtual;
    if(aba === 'contatos') aba = document.getElementById('btn-novo').getAttribute('data-sub-aba') || alert("Abra uma categoria!");
    if(aba !== 'contatos') abrirModal(aba);
});
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

        const campoTitulo = configuracaoAbas[colecaoNome].campos[0];
        itens.sort((a, b) => {
            const tA = a.data[campoTitulo] ? a.data[campoTitulo].toUpperCase() : "";
            const tB = b.data[campoTitulo] ? b.data[campoTitulo].toUpperCase() : "";
            return tA.localeCompare(tB);
        });

        const dataHoje = new Date().toISOString().split('T')[0];
        const areaNotificacoes = document.getElementById('area-notificacoes');
        if(colecaoNome === 'boletins') areaNotificacoes.innerHTML = ''; 

        itens.forEach((item) => {
            const data = item.data;
            const docId = item.id;
            
            if(colecaoNome === 'boletins' && data['Data de Publicação'] === dataHoje) {
                areaNotificacoes.innerHTML += `<div class="notificacao-dia" onclick="document.querySelector('[data-tab=\\'boletins\\']').click()" style="cursor:pointer;"><i class="ri-notification-3-line"></i><div><strong style="display:block; color:#2c5282;">Novo Boletim Hoje!</strong><span style="font-size:13px; color:#4a5568;">${data[campoTitulo]} foi publicado. Clique para ler.</span></div></div>`;
            }
            
            const isUrgente = data['Tipo (Urgente, Norma, Regra, etc)'] && data['Tipo (Urgente, Norma, Regra, etc)'].toLowerCase().includes('urgente');
            const classeUrgente = isUrgente ? 'card-urgente' : '';
            const corEscolhida = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
            const fundoColorido = corEscolhida !== "#ffffff" ? corEscolhida + "1A" : "var(--surface-color)";
            
            let cardHtml = `<div class="card ${classeUrgente}" style="display:flex; flex-direction:column; gap:8px; border-left: 6px solid ${corEscolhida}; background-color: ${fundoColorido};">`;
            if (data[campoTitulo]) cardHtml += `<div class="card-title" style="margin-bottom:10px; font-size:18px; font-weight:600;">${data[campoTitulo]}</div>`;
            
            for (const [chave, valor] of Object.entries(data)) {
                if (chave !== campoTitulo && chave !== 'corCard' && chave !== 'leituras') {
                    if(chave.includes('Link')) cardHtml += `<div class="boletim-media"><button onclick="abrirMidaFlutuante('${valor}')" style="background: var(--primary-color); color: white; border:none; cursor:pointer; padding: 8px 16px; border-radius: 8px; font-size: 13px; margin-top: 10px;"><i class="ri-eye-line"></i> Acessar Material</button></div>`;
                    else { const corTexto = (isUrgente && chave.includes('Tipo')) ? '#e53e3e; font-weight:bold;' : 'var(--text-main)'; cardHtml += `<div class="card-info" style="font-size:14px; color:${corTexto};"><strong style="color:var(--primary-color)">${chave}:</strong> ${valor}</div>`; }
                }
            }
            
            if(colecaoNome.includes('boletins')) {
                cardHtml += `<div class="leituras-lista" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color); font-size: 13px;"><strong>Status de Leitura/Ciente:</strong>`;
                if(data.leituras && data.leituras.length > 0) { data.leituras.forEach(leitura => { cardHtml += `<div class="leitura-item" style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.6); padding: 6px 10px; border-radius: 6px; margin-top: 6px;"><i class="ri-check-double-line" style="color:#38a169;"></i> <span style="color: #38a169; font-weight: 600; font-size:11px;">${leitura}</span></div>`; }); } 
                else { cardHtml += `<div style="color:var(--text-muted); font-size: 12px; margin-top:5px;">Nenhuma assinatura registrada.</div>`; }
                
                if(isAdmin) {
                    cardHtml += `<div class="add-leitura-box" style="display: flex; gap: 8px; margin-top: 10px;"><select id="leitor-${docId}" style="flex:1; padding:6px; border-radius:4px; border:1px solid #ccc; font-size:12px; background:white;"><option value="">Selecionar quem leu...</option>`;
                    listaColaboradoresGlobal.forEach(colab => { cardHtml += `<option value="${colab}">${colab}</option>`; });
                    cardHtml += `</select><button class="btn-action btn-assinar" data-id="${docId}" data-colecao="${colecaoNome}" style="background:#38a169; color:white; padding:4px 10px; border-radius:4px; cursor:pointer;"><i class="ri-check-line"></i> Carimbar</button></div>`;
                }
                cardHtml += `</div>`;
            }
            
            if (isAdmin) {
                const dadosSeguros = JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                cardHtml += `<div class="card-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 15px; padding-top: 12px; border-top: 1px solid var(--border-color);"><button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${dadosSeguros}" title="Editar" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #3182ce;"><i class="ri-pencil-line"></i></button><button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #e53e3e;"><i class="ri-delete-bin-line"></i></button></div>`;
            }
            cardHtml += `</div>`;
            grid.innerHTML += cardHtml;
        });
    });
}

document.querySelector('.main-content').addEventListener('click', async (e) => {
    const btnExcluir = e.target.closest('.btn-delete');
    const btnEditar = e.target.closest('.btn-edit');
    const btnAssinar = e.target.closest('.btn-assinar');

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
    document.getElementById('iframe-media').src = u;
    document.getElementById('modal-media').style.display = 'flex';
}
document.getElementById('btn-fechar-media').addEventListener('click', () => { document.getElementById('modal-media').style.display = 'none'; document.getElementById('iframe-media').src = ""; });
