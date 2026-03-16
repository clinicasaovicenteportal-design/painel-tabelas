import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Dicionário de Formulários (Quais campos aparecem em qual aba)
const configuracaoAbas = {
    'corpo-clinico': { titulo: 'Médico', campos: ['Nome/Médico', 'Segmento', 'Especialidade', 'Unimed', 'CRM', 'CBO', 'URA'] },
    'convenios': { titulo: 'Convênio', campos: ['Convênio', 'Código', 'Serviço', 'Observações'] },
    'ultrassom': { titulo: 'Ultrassom', campos: ['Código', 'Exame', 'Profissional', 'Restrição de Idade', 'Observação'] },
    'consultas': { titulo: 'Consulta/Procedimento', campos: ['Código', 'Tipo (Consulta, Exame, Pacote, Outros)', 'Descrição', 'Observações'] },
    'pacotes': { titulo: 'Pacote PS', campos: ['Descrição', 'Valor/Informação', 'O que está incluso', 'Observações', 'Pacotes', 'Kit'] },
    'exames-imagem': { titulo: 'Exame de Imagem', campos: ['Código', 'Descrição', 'Valor', 'Prazo de Laudo', 'Onde encontrar resultado', 'Observações', 'Convênios'] },
    'institutos': { titulo: 'Instituto', campos: ['Número da Tabela', 'Profissional', 'Especialidade', 'Restrição de Idade', 'CRM', 'CBO', 'URA', 'Outros'] },
    'remocoes': { titulo: 'Remoção', campos: ['Nome do Lugar', 'Números (Separe por vírgula)', 'Local/Link Maps', 'Observações Importantes'] },
    // Sub-abas de contatos
    'ramais': { titulo: 'Ramal', campos: ['Local/Prédio', 'Setor', 'Número do Ramal', 'Observações'] },
    'emails': { titulo: 'E-mail', campos: ['Descrição do E-mail', 'Setor'] },
    'contatos-gerais': { titulo: 'Contato Geral', campos: ['Descrição (Lugar/Pessoa)', 'Número'] },
    'contatos-convenios': { titulo: 'Contato Convênio', campos: ['Nome do Convênio', 'Número'] },
    'senhas': { titulo: 'Senha de Acesso', campos: ['Convênio/Sistema', 'Link de Acesso', 'Senha', 'Local de Acesso Permitido'] }
};

// Autenticação
document.getElementById('btn-login').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('senha').value)
    .catch(err => alert("Erro: " + err.message));
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
        
        // Carrega todas as abas automaticamente ao logar
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
        
        // Se saiu de contatos, reseta as sub-abas
        if(abaAtual !== 'contatos') window.voltarSubAba();
    });
});

// --- LÓGICA DO MODAL DINÂMICO ---
const modal = document.getElementById('modal-cadastro');

document.getElementById('btn-novo').addEventListener('click', () => {
    let abaParaCadastrar = abaAtual;
    
    // Se estiver na aba contatos, pega qual sub-aba está aberta
    if(abaAtual === 'contatos') {
        const subAba = document.getElementById('btn-novo').getAttribute('data-sub-aba');
        if(!subAba) return alert("Abra uma categoria de contato primeiro!");
        abaParaCadastrar = subAba;
    }

    const config = configuracaoAbas[abaParaCadastrar];
    document.getElementById('modal-title').textContent = `Novo(a) ${config.titulo}`;
    
    // Cria os inputs dinamicamente com base na lista de campos
    let htmlCampos = '';
    config.campos.forEach(campo => {
        // Se a aba for Consultas e o campo for Tipo, cria um select
        if(abaParaCadastrar === 'consultas' && campo.includes('Tipo')) {
            htmlCampos += `
            <select id="input-${campo}" class="form-input" style="margin-bottom:15px; width:100%; padding:12px; border-radius:10px;">
                <option value="">Selecione o Tipo...</option>
                <option value="Consulta">Consulta</option>
                <option value="Exame">Exame</option>
                <option value="Pacotes">Pacotes</option>
                <option value="Outros">Outros</option>
            </select>`;
        } else {
            htmlCampos += `<input type="text" id="input-${campo}" placeholder="${campo}" class="form-input">`;
        }
    });
    
    document.getElementById('modal-form-area').innerHTML = htmlCampos;
    document.getElementById('btn-salvar-dados').setAttribute('data-colecao', abaParaCadastrar);
    modal.style.display = 'flex';
});

document.getElementById('btn-fechar-modal').addEventListener('click', () => modal.style.display = 'none');

// Salvar Dados
document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    if(!isAdmin) return;
    const colecaoNome = document.getElementById('btn-salvar-dados').getAttribute('data-colecao');
    const config = configuracaoAbas[colecaoNome];
    
    let dadosParaSalvar = {};
    let temDado = false;

    // Coleta os valores digitados
    config.campos.forEach(campo => {
        const valor = document.getElementById(`input-${campo}`).value.trim();
        if(valor) {
            dadosParaSalvar[campo] = valor;
            temDado = true;
        }
    });

    if(!temDado) return alert("Preencha pelo menos um campo!");

    document.getElementById('btn-salvar-dados').textContent = "Salvando...";
    try {
        await addDoc(collection(db, colecaoNome), dadosParaSalvar);
        modal.style.display = 'none';
    } catch(e) {
        alert("Erro ao salvar: " + e);
    }
    document.getElementById('btn-salvar-dados').textContent = "Salvar Dados";
});
// --- RENDERIZADOR UNIVERSAL DE CARDS ---
function renderizarCards(colecaoNome) {
    const gridId = `grid-${colecaoNome}`;
    const grid = document.getElementById(gridId);
    if(!grid) return; // Segurança

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        grid.innerHTML = '';
        if(snapshot.empty) return;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const campoTitulo = configuracaoAbas[colecaoNome].campos[0]; // Pega qual deve ser o título
            
            // Abre o card
            let cardHtml = `<div class="card" style="display:flex; flex-direction:column; gap:8px;">`;
            
            // Coloca o título primeiro (maior)
            if (data[campoTitulo]) {
                cardHtml += `<div class="card-title" style="margin-bottom:10px; font-size:18px; color:var(--text-main); font-weight:600;">${data[campoTitulo]}</div>`;
            }
            
            // Faz o loop para o restante das informações
            for (const [chave, valor] of Object.entries(data)) {
                if (chave !== campoTitulo) {
                    cardHtml += `<div class="card-info" style="font-size:14px; color:var(--text-muted);"><strong style="color:var(--primary-color)">${chave}:</strong> ${valor}</div>`;
                }
            }
            
            // Fecha o card
            cardHtml += `</div>`;
            
            // Joga na tela
            grid.innerHTML += cardHtml;
        });
    });
}
