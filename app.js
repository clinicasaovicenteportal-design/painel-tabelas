// Importar as ferramentas do Firebase (Versão Modular v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// COLE OS SEUS DADOS DO FIREBASE AQUI DENTRO:
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// 1. Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializar o Banco de Dados com Persistência Offline (O Segredo para quando a net cair!)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

// 3. Inicializar a Autenticação
const auth = getAuth(app);

// 4. Capturar os elementos do ecrã
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');

// 5. Função para Iniciar Sessão
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const senha = senhaInput.value;
    
    // Tenta fazer o login com o Firebase
    signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
        alert("Sessão iniciada com sucesso!");
    })
    .catch((error) => {
        alert("Erro ao entrar. Verifique os dados: " + error.message);
    });
});

// 6. Função para Terminar Sessão (Sair)
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// 7. Observador (Fica a vigiar se há alguém com sessão iniciada)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Se estiver logado: esconde o login e mostra o painel das tabelas
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        
        // Futuramente, é aqui que vamos separar o que a Supervisão e o Geral podem ver
        if(user.email === "supervisao@suaclinica.com") {
            console.log("Bem-vindo, Supervisão! Acesso total concedido.");
        } else {
            console.log("Bem-vindo, Geral! Acesso de visualização concedido.");
        }
    } else {
        // Se não estiver logado: mostra o ecrã de login
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});
