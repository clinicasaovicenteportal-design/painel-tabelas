import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// IMPORTAMOS AGORA AS FUNÇÕES DE EDITAR E EXCLUIR (doc, updateDoc, deleteDoc)
import { initializeFirestore, persistentLocalCache, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let abaAtual = 'corpo-clinico'; 
const EMAIL_GESTAO = "gestao@clinica.com";

const configuracaoAbas = {
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
    'senhas': { titulo: 'Senha de Acesso', campos: ['Convênio ou Sistema', 'Link de Acesso', 'Senha', 'Local de Acesso Permitido'] }
};

// Autenticação
document.getElementById('btn-login').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('senha').value).catch(err => alert("Erro: " + err.message));
});
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'flex';
        isAdmin = (user.email === EMAIL_GESTAO);
        document.getElementById('user-role-badge').textContent = isAdmin ? "Gestão Administrador" : "Acesso Geral";
        if(isAdmin) document.getElementById('user-role-badge').classList.add('admin');
        document.getElementById('btn-novo').style.display = isAdmin ? 'flex' : 'none';
        
        Object.keys(configuracaoAbas).forEach(idColecao => renderizarCards(idColecao));
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard-screen').style.display = 'none';
    }
});

// Navegação do Menu
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        abaAtual = btn.getAttribute('data-tab');
        document.getElementById(`tab-${abaAtual}`).style.display = 'block';
        document.getElementById('page-title').textContent = btn.textContent.trim();
        if(abaAtual !== 'contatos') window.voltarSubAba();
    });
});

// --- FUNÇÃO PARA ABRIR O MODAL (CRIAR OU EDITAR) ---
const modal = document.getElementById('modal-cadastro');

function abrirModal(colecao, docId = null, dadosAntigos = null) {
    const config = configuracaoAbas[colecao];
    document.getElementById('modal-title').textContent = docId ? `Editar ${config.titulo}` : `Novo(a) ${config.titulo}`;
    
    // Limpa ou preenche ID escondido e Cor
    document.getElementById('modal-doc-id').value = docId || "";
    document.getElementById('card-color').value = (dadosAntigos && dadosAntigos.corCard) ? dadosAntigos.corCard : "#8B252C";

    // Cria os inputs dinamicamente
    let htmlCampos = '';
    config.campos.forEach(campo => {
        const valorAntigo = (dadosAntigos && dadosAntigos[campo]) ? dadosAntigos[campo] : '';
        
        if(colecao === 'consultas' && campo.includes('Tipo')) {
            htmlCampos += `
            <select id="input-${campo}" class="form-input" style="margin-bottom:15px; width:100%; padding:12px; border-radius:10px;">
                <option value="">Selecione o Tipo...</option>
                <option value="Consulta" ${valorAntigo === 'Consulta' ? 'selected' : ''}>Consulta</option>
                <option value="Exame" ${valorAntigo === 'Exame' ? 'selected' : ''}>Exame</option>
                <option value="Pacotes" ${valorAntigo === 'Pacotes' ? 'selected' : ''}>Pacotes</option>
                <option value="Outros" ${valorAntigo === 'Outros' ? 'selected' : ''}>Outros</option>
            </select>`;
        } else {
            htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" value="${valorAntigo}" class="form-input">`;
        }
    });
    
    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', colecao);
    modal.style.display = 'flex';
}

// Botão Adicionar Novo (Abre Modal Vazio)
document.getElementById('btn-novo').addEventListener('click', () => {
    let abaParaCadastrar = abaAtual;
    if(abaAtual === 'contatos') {
        const subAba = document.getElementById('btn-novo').getAttribute('data-sub-aba');
        if(!subAba) return alert("Abra uma categoria de contato primeiro!");
        abaParaCadastrar = subAba;
    }
    abrirModal(abaParaCadastrar);
});

document.getElementById('btn-fechar-modal').addEventListener('click', () => modal.style.display = 'none');

// --- SALVAR DADOS (CRIAR OU ATUALIZAR) ---
document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    if(!isAdmin) return;
    const colecaoNome = document.getElementById('btn-salvar-dados').getAttribute('data-colecao');
    const docId = document.getElementById('modal-doc-id').value; // Pega o ID se estiver editando
    const config = configuracaoAbas[colecaoNome];
    
    let dadosParaSalvar = {};
    let temDado = false;

    config.campos.forEach(campo => {
        const valor = document.getElementById(`input-${campo}`).value.trim();
        if(valor) {
            dadosParaSalvar[campo] = valor;
            temDado = true;
        }
    });

    if(!temDado) return alert("Preencha pelo menos um campo!");

    // Adiciona a cor escolhida aos dados
    dadosParaSalvar.corCard = document.getElementById('card-color').value;

    document.getElementById('btn-salvar-dados').textContent = "Salvando...";
    try {
        if (docId) {
            // Se tem ID, Atualiza!
            await updateDoc(doc(db, colecaoNome, docId), dadosParaSalvar);
        } else {
            // Se não tem ID, Cria novo!
            await addDoc(collection(db, colecaoNome), dadosParaSalvar);
        }
        modal.style.display = 'none';
    } catch(e) {
        alert("Erro ao salvar: " + e);
    }
    document.getElementById('btn-salvar-dados').textContent = "Salvar Dados";
});

// --- DELETAR E ABRIR EDIÇÃO (Ouvinte de cliques no painel) ---
// Escutamos os cliques na tela toda. Se clicar no ícone de lixo ou lápis, aciona a função.
document.querySelector('.main-content').addEventListener('click', async (e) => {
    const btnExcluir = e.target.closest('.btn-delete');
    const btnEditar = e.target.closest('.btn-edit');

    if (btnExcluir && isAdmin) {
        if(confirm("Tem certeza que deseja EXCLUIR permanentemente este cadastro?")) {
            await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
        }
    }

    if (btnEditar && isAdmin) {
        const dados = JSON.parse(btnEditar.dataset.info);
        abrirModal(btnEditar.dataset.colecao, btnEditar.dataset.id, dados);
    }
});

// --- RENDERIZADOR UNIVERSAL DE CARDS ---
function renderizarCards(colecaoNome) {
    const gridId = `grid-${colecaoNome}`;
    const grid = document.getElementById(gridId);
    if(!grid) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        grid.innerHTML = '';
        if(snapshot.empty) return;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id; // Pegamos o ID exclusivo do Firebase
            const campoTitulo = configuracaoAbas[colecaoNome].campos[0];
            
            // Aqui aplicamos a Borda Colorida Elegante baseada na cor escolhida!
            const corEscolhida = data.corCard || "transparent";
            let cardHtml = `<div class="card" style="display:flex; flex-direction:column; gap:8px; border-left: 6px solid ${corEscolhida};">`;
            
            if (data[campoTitulo]) {
                cardHtml += `<div class="card-title" style="margin-bottom:10px; font-size:18px; color:var(--text-main); font-weight:600;">${data[campoTitulo]}</div>`;
            }
            
            for (const [chave, valor] of Object.entries(data)) {
                if (chave !== campoTitulo && chave !== 'corCard') { // Não imprimimos o código da cor no texto
                    cardHtml += `<div class="card-info" style="font-size:14px; color:var(--text-muted);"><strong style="color:var(--text-main)">${chave}:</strong> ${valor}</div>`;
                }
            }
            
            // Adiciona os botões de Ação apenas se for a Gestão
            if (isAdmin) {
                // Prepara os dados para mandar para o Modal de Edição de forma segura
                const dadosSeguros = JSON.stringify(data).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                
                cardHtml += `
                <div class="card-actions">
                    <button class="btn-action btn-edit" data-id="${docId}" data-colecao="${colecaoNome}" data-info="${dadosSeguros}" title="Editar informações"><i class="ri-pencil-line"></i></button>
                    <button class="btn-action btn-delete" data-id="${docId}" data-colecao="${colecaoNome}" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                </div>`;
            }
            
            cardHtml += `</div>`;
            grid.innerHTML += cardHtml;
        });
    });
}
