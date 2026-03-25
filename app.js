window.abrirMidaFlutuante = function(url) {
    let u = url;
    if(u.includes("drive.google.com") && u.includes("/view")) u = u.replace("/view", "/preview");
    if(u.includes("youtube.com/watch?v=")) u = `https://www.youtube.com/embed/${u.split("v=")[1].split("&")[0]}`;
    else if (u.includes("youtu.be/")) u = `https://www.youtube.com/embed/${u.split("youtu.be/")[1].split("?")[0]}`;
    const iframe = document.getElementById('iframe-media');
    const modalMedia = document.getElementById('modal-media');
    if(iframe) iframe.src = u; 
    if(modalMedia) modalMedia.style.display = 'flex';
};

window.desfazerLeitura = async function(docId, nomeColab, colecao) {
    if(!isAdmin) return;
    if(!confirm(`Tem certeza que deseja remover a assinatura/conclusão de ${nomeColab}?`)) return;
    let docData = colecao === 'treinamentos' ? window.todosTreinamentosData.find(i=>i.id===docId)?.data : window.dadosBoletins[docId];
    if(!docData || !docData.leituras) return;
    const str = docData.leituras.find(txt => txt.startsWith(nomeColab));
    if(str) { await window.updateDoc(window.doc(window.db, colecao, docId), { leituras: window.arrayRemove(str) }); document.getElementById('modal-leituras').style.display = 'none'; }
};

// ==========================================
// ABA DE CORREÇÃO ADMIN PARA TREINAMENTOS
// ==========================================
window.abrirListaLeituras = function(docId, colecaoOrigem = 'boletins') {
    let data = colecaoOrigem === 'treinamentos' ? window.todosTreinamentosData.find(i=>i.id===docId)?.data : window.dadosBoletins[docId];
    if(!data) return;
    
    document.getElementById('modal-leitura-titulo').textContent = data['Título do Informativo'] || data['Título da Atividade'] || 'Status';
    
    let publicoAlvoNomes = window.obterPublicoAlvo(data['Para quais Setores?'], data['Colaborador Específico (Opcional)']);
    if(colecaoOrigem === 'boletins-privados') publicoAlvoNomes = [data['Para qual Colaborador?']]; 

    const precisaResponder = colecaoOrigem === 'treinamentos' && (data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Tarefa') || data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Prova'));

    let htmlLidos = ''; let htmlNaoLidos = '';
    
    if(precisaResponder) {
        const respostas = data.respostas_alunos || [];
        publicoAlvoNomes.forEach(nome => {
            let respostaAlunoObj = null;
            respostas.forEach(r => { try{ let obj = JSON.parse(r); if(obj.nome === nome) respostaAlunoObj = obj; }catch(e){} });
            
            if(respostaAlunoObj) {
                let statusNota = respostaAlunoObj.nota !== "" ? `<b style="color:#38a169;">Nota: ${respostaAlunoObj.nota}</b>` : `<b style="color:#ecc94b;">Aguardando Nota</b>`;
                let btnCorrigir = isAdmin ? `<button onclick="window.abrirCorrecaoAdmin('${docId}', '${nome}')" style="background:#3182ce; color:white; border:none; padding:4px 8px; border-radius:5px; font-size:11px; cursor:pointer;"><i class="ri-edit-2-fill"></i> Corrigir</button>` : '';
                htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span><i class="ri-user-line"></i> ${nome}<br><span style="font-size:10px;">${statusNota}</span></span> ${btnCorrigir}</div>`;
            } else {
                htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`;
            }
        });
    } else {
        const lidosTextos = data.leituras || [];
        publicoAlvoNomes.forEach(nome => {
            const registroCompleto = lidosTextos.find(txt => txt.startsWith(nome));
            if (registroCompleto) {
                let btnDesfazer = isAdmin ? `<button onclick="window.desfazerLeitura('${docId}', '${nome}', '${colecaoOrigem}')" class="btn-desfazer"><i class="ri-arrow-go-back-line"></i></button>` : '';
                htmlLidos += `<div class="item-lido" style="display:flex; justify-content:space-between; align-items:center;"><span><i class="ri-check-line"></i> ${registroCompleto}</span> ${btnDesfazer}</div>`;
            } else { htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`; }
        });
    }

    document.getElementById('lista-lidos-content').innerHTML = htmlLidos || '<p style="color:var(--text-muted); font-size:12px;">Nenhum registro.</p>';
    document.getElementById('lista-falta-content').innerHTML = htmlNaoLidos || '<p style="color:#38a169; font-size:12px;">Todos completaram!</p>';
    document.getElementById('modal-leituras').style.display = 'flex';
};

window.gerarHTMLCard = function(colecaoNome, docId, data) {
    const config = configuracaoAbas[colecaoNome]; if(!config) return '';
    let campoTitulo = config.campos[0]; if(config.campoAgrupador) campoTitulo = config.campos.find(c => c !== config.campoAgrupador) || config.campos[0];
    
    const tituloDesteCard = data[campoTitulo] || data['Nome/Médico'] || data['Nome'] || 'Detalhes do Cadastro';
    const corSalva = data.corCard && data.corCard !== "transparent" ? data.corCard : "#ffffff";
    const configCor = paletaGradientes.find(p => p.valor === corSalva);
    const cardClass = (configCor && configCor.dark) && colecaoNome !== 'ramais' ? 'has-gradient' : '';

    let cardHtml = `<div class="card ${cardClass}" style="position: relative; display:flex; flex-direction:column; background: ${corSalva}; min-height: 100%; border-left: 6px solid var(--primary-color);">`;
    if(config.campoAgrupador) cardHtml += `<div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--text-main);"><i class="${config.icone || 'ri-folder-line'}"></i> PASTA/MÓDULO: ${data[config.campoAgrupador] || 'Geral'}</div>`;
    cardHtml += `<div style="font-size:18px; font-weight:600; line-height:1.2; margin-bottom:15px;">${tituloDesteCard}</div>`;
    
    config.campos.forEach(chave => {
        const valor = data[chave];
        if (valor && chave !== config.campoAgrupador && chave !== campoTitulo && chave !== 'Configuração da Avaliação' && !String(chave).includes('Link') && chave !== 'PIN de Acesso (Treinamentos)') {
            cardHtml += `<div class="card-info" style="font-size:13px; margin-bottom: 8px;"><strong>${chave}:</strong> <span>${valor}</span></div>`; 
        }
    });

    if(colecaoNome === 'colaboradores' && data['PIN de Acesso (Treinamentos)']) {
         cardHtml += `<div style="margin-top:10px; background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:12px; border: 1px dashed var(--border-color);"><strong>🔑 PIN de Acesso:</strong> ${data['PIN de Acesso (Treinamentos)']}</div>`;
    }

    if(colecaoNome === 'treinamentos' && isAdmin) {
        const precisaResponder = data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Tarefa') || data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Prova');
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
window.renderizarPastasBoletins = function() {}; 
window.renderizarListaBoletins = function() {}; 
window.renderizarPastasPrivados = function() {}; 
window.renderizarListaPrivados = function() {}; 

window.renderizarCards = function(colecaoNome) {
    const grid = document.getElementById(`grid-${colecaoNome}`);
    if(!grid && colecaoNome !== 'boletins' && colecaoNome !== 'boletins-privados' && !configuracaoAbas[colecaoNome]?.campoAgrupador) return;

    onSnapshot(collection(db, colecaoNome), (snapshot) => {
        if(snapshot.empty) {
            if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = []; if(window.alunoLogado) window.renderizarTrilhaAluno(); }
            if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador) { window.dadosGlobaisAbas[colecaoNome] = []; if(abaAtual === colecaoNome) window.renderizarPastasGenericas(colecaoNome); }
            if(grid) { grid.style.display = 'block'; grid.innerHTML = ''; }
            return;
        }
        let itens = []; snapshot.forEach(doc => itens.push({ id: doc.id, data: doc.data() })); window.todosOsDadosDoSistema[colecaoNome] = itens;
        if(colecaoNome === 'colaboradores') { listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome)); if(abaAtual === 'colaboradores') window.renderizarListaGenerica(colecaoNome); }
        if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = itens; if(window.alunoLogado) window.renderizarTrilhaAluno(); }
        if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador && colecaoNome !== 'colaboradores') { window.dadosGlobaisAbas[colecaoNome] = itens; if(abaAtual === colecaoNome) { if(window[`pasta_${colecaoNome}_Atual`]) window.renderizarListaGenerica(colecaoNome); else window.renderizarPastasGenericas(colecaoNome); } return; }
        if(!grid) return; grid.style.display = 'grid'; grid.innerHTML = '';
        itens.sort((a, b) => { return String(a.data[configuracaoAbas[colecaoNome].campos[0]]).localeCompare(String(b.data[configuracaoAbas[colecaoNome].campos[0]])); }).forEach((item) => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
};

window.carregarConfiguracoes = function() { /* ... Código inalterado ... */ };
window.toggleChat = function() { /* ... Código inalterado ... */ };
window.sendQuickMsg = function() {}; window.sendChat = function() {}; window.processarLogicaDoBot = function() {};

// ==========================================
// MÓDULOS DE RESPOSTA (ALUNO) E CORREÇÃO (ADMIN)
// ==========================================
if (!document.getElementById('modal-resposta-aluno')) {
    const m = document.createElement('div'); m.id = 'modal-resposta-aluno'; m.className = 'modal-overlay'; m.style.display = 'none'; m.style.zIndex = '10001';
    m.innerHTML = `<div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;">
        <header class="modal-header"><h3 id="resposta-titulo">Responder Atividade</h3><button onclick="document.getElementById('modal-resposta-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header>
        <div class="modal-body" style="overflow-y: auto; flex:1;" id="area-perguntas-dinamicas"></div>
        <input type="hidden" id="resposta-docid">
        <button onclick="window.enviarRespostaTreinamento()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #3182ce; color:white; border:none;"><i class="ri-send-plane-fill"></i> Enviar Resposta para Correção</button></div>`;
    document.body.appendChild(m);
}

if (!document.getElementById('modal-correcao-admin')) {
    const c = document.createElement('div'); c.id = 'modal-correcao-admin'; c.className = 'modal-overlay'; c.style.display = 'none'; c.style.zIndex = '10005';
    c.innerHTML = `<div class="modal-box glass-effect" style="max-width: 600px; max-height: 90vh; display:flex; flex-direction:column;">
        <header class="modal-header"><h3>Corrigir Resposta</h3><button onclick="document.getElementById('modal-correcao-admin').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header>
        <div class="modal-body" style="overflow-y: auto; flex:1;">
            <div id="correcao-respostas-aluno" style="margin-bottom:15px; background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; font-size:13px; white-space:pre-wrap;"></div>
            <label style="font-size:12px; font-weight:600;">Nota Atribuída (XP):</label><input type="number" id="correcao-nota" class="form-input" style="margin-bottom:10px;">
            <label style="font-size:12px; font-weight:600;">Feedback / Observação do Gestor:</label><textarea id="correcao-feedback" class="form-input" style="height:80px; resize:vertical;"></textarea>
            <input type="hidden" id="correcao-docid"><input type="hidden" id="correcao-nomealuno">
        </div>
        <button onclick="window.salvarCorrecaoAdmin()" class="btn-hover color-11" style="width: 100%; margin-top: 15px; background: #38a169; color:white; border:none;"><i class="ri-check-line"></i> Salvar Correção</button></div>`;
    document.body.appendChild(c);
}

if (!document.getElementById('modal-feedback-aluno')) {
    const fb = document.createElement('div'); fb.id = 'modal-feedback-aluno'; fb.className = 'modal-overlay'; fb.style.display = 'none'; fb.style.zIndex = '10002';
    fb.innerHTML = `<div class="modal-box glass-effect" style="max-width: 500px;"><header class="modal-header"><h3>Feedback do Supervisor</h3><button onclick="document.getElementById('modal-feedback-aluno').style.display='none'" class="btn-icon"><i class="ri-close-line"></i></button></header><div class="modal-body"><div style="text-align:center; margin-bottom:15px;"><div style="font-size:40px; color:#38a169;"><i class="ri-award-fill"></i></div><h2 style="color:var(--primary-color);">Nota: <span id="feedback-nota"></span></h2></div><div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; color: var(--text-main); border-left: 4px solid var(--primary-color);"><span id="feedback-texto" style="white-space: pre-wrap;"></span></div></div></div>`;
    document.body.appendChild(fb);
}

// Lógica de Renderização do Aluno
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
        const precisaResponder = tipo.includes('Tarefa') || tipo.includes('Prova');
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

        grid.innerHTML += `<div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;"><div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> MÓDULO: ${d['Pasta / Módulo']}</div><div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade']}</div><div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;"><b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br><b>Status:</b> <span style="color:${corStatus}; font-weight:600;"><i class="${iconeStatus}"></i> ${statusTexto}</span></div>${btnAcao}</div>`;
    });

    const ptsEl = document.getElementById('aluno-pontos'); const pendEl = document.getElementById('aluno-tarefas-pendentes');
    if(ptsEl) ptsEl.textContent = pontos; if(pendEl) pendEl.textContent = pendentes;
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
        const perguntas = JSON.parse(configJSON);
        perguntas.forEach((q, idx) => {
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">`;
            html += `<div style="font-weight:600; font-size:13px; margin-bottom:10px;">${idx+1}. ${q.p}</div>`;
            html += `<input type="hidden" class="resp-tipo" value="${q.tipo}">`;
            html += `<input type="hidden" class="resp-pergunta-txt" value="${q.p}">`;
            
            if(q.tipo === 'descritiva') {
                html += `<textarea class="form-input resp-valor" style="height:80px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            } else {
                q.ops.forEach((op, oIdx) => {
                    if(op.trim() !== '') {
                        html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:5px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${op}"> ${op}</label>`;
                    }
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
        if(tipo === 'descritiva') {
            r = bloco.querySelector('.resp-valor').value.trim();
        } else {
            const checked = bloco.querySelector('.resp-radio:checked');
            r = checked ? checked.value : 'Nenhuma opção selecionada';
        }
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
    let respStr = null; let respObj = null;
    respostas.forEach(r => { try { let o = JSON.parse(r); if(o.nome === nomeAluno) { respObj = o; respStr = r; } } catch(e){} });
    
    if(!respObj) return;
    
    let html = `<b>Aluno:</b> ${nomeAluno} <br><b>Enviado em:</b> ${respObj.data}<br><br>`;
    (respObj.respostas || []).forEach((r, i) => {
        html += `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><b>Q${i+1}:</b> ${r.pergunta}<br><span style="color:#3182ce;">R: ${r.resposta}</span></div>`;
    });
    
    document.getElementById('correcao-respostas-aluno').innerHTML = html;
    document.getElementById('correcao-nota').value = respObj.nota || '';
    document.getElementById('correcao-feedback').value = respObj.feedback || '';
    document.getElementById('correcao-docid').value = docId;
    document.getElementById('correcao-nomealuno').value = nomeAluno;
    
    document.getElementById('modal-correcao-admin').style.display = 'flex';
    document.getElementById('modal-leituras').style.display = 'none'; // Esconde a lista de alunos temporariamente
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
        await window.updateDoc(ref, { respostas_alunos: window.arrayRemove(respStrAntiga) }); // Remove antiga
        await window.updateDoc(ref, { respostas_alunos: window.arrayUnion(respStrNova) }); // Salva nova
        alert("Correção salva com sucesso!");
        document.getElementById('modal-correcao-admin').style.display = 'none';
    } catch(e) { alert("Erro ao salvar: "+e.message); }
};

window.entrarPortalAluno = function() {
    const nomeDigitado = document.getElementById('login-aluno-nome').value.trim().toLowerCase();
    const pinDigitado = document.getElementById('login-aluno-pin').value.trim();
    if(!nomeDigitado || !pinDigitado) return alert("Preencha Nome e PIN!");
    const dadosColaboradores = window.todosOsDadosDoSistema['colaboradores'] || [];
    const colaboradorEncontrado = dadosColaboradores.find(item => {
        return String(item.data['Nome Completo do Colaborador'] || "").toLowerCase() === nomeDigitado && String(item.data['PIN de Acesso (Treinamentos)'] || "") === pinDigitado;
    });
    if(colaboradorEncontrado) {
        window.alunoLogado = colaboradorEncontrado.data;
        document.getElementById('ensino-login-area').style.display = 'none'; document.getElementById('ensino-dashboard-area').style.display = 'block';
        document.getElementById('nome-aluno-logado').textContent = window.alunoLogado['Nome Completo do Colaborador'];
        window.renderizarTrilhaAluno(); 
    } else { alert("Nome ou PIN incorretos. Verifique com a Gestão."); }
};

// ==========================================
// 8. ATRIBUIÇÃO DE EVENTOS DE CLIQUES E INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    const mainContent = document.querySelector('.main-content');
    if(mainContent) {
        mainContent.addEventListener('click', async (e) => {
            const btnExcluir = e.target.closest('.btn-delete'); const btnEditar = e.target.closest('.btn-edit');
            if (btnExcluir && isAdmin && confirm("Excluir permanentemente?")) await deleteDoc(doc(db, btnExcluir.dataset.colecao, btnExcluir.dataset.id));
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
                if(docId) { await updateDoc(doc(db, colecao, docId), dados); } else { await addDoc(collection(db, colecao), dados); }
                window.fecharModal();
            } catch(e) { alert("Erro ao salvar: " + e.message); }
            btnSalvar.innerHTML = btnOriginal;
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
                    if(Object.values(item.data).join(' ').toLowerCase().includes(texto)) { areaRes.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); encontrou = true; }
                });
            });
            if(!encontrou) areaRes.innerHTML += '<p style="color:var(--text-muted); font-size:14px; grid-column: 1/-1;">Nenhum resultado encontrado no sistema.</p>';
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
        });
    });
});

/* CARD RECOLHÍVEL LEVE */
.cards-grid { align-items: start; }
.card.card-collapsible { padding: 18px; height: auto !important; min-height: unset !important; align-self: start; }
.card.card-collapsible:hover { transform: none; box-shadow: 0 6px 18px rgba(0,0,0,0.05); }
.card-summary { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.card-summary-main { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex:1; }
.card-toggle {
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.28);
  color: currentColor;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  cursor: pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.card:not(.has-gradient) .card-toggle { background:#f8fafc; border-color: var(--border-color); }
.card-details { display:none; margin-top: 14px; }
.card-collapsible.expanded .card-details { display:block; }
.card-collapsible .card-actions { margin-top: 14px; }

/* ===== PATCH HOME LEVE + SEM RECOLHÍVEL PESADO ===== */
(() => {
  function simplificarTelaInicial() {
    // Remove busca global da home
    const buscaGlobal = document.getElementById('input-pesquisa-global');
    if (buscaGlobal) {
      const wrap = buscaGlobal.closest('.search-container');
      if (wrap) wrap.remove();
    }

    const resultados = document.getElementById('resultados-globais');
    if (resultados) resultados.remove();

    const alertas = document.getElementById('area-alertas-home');
    if (alertas) alertas.remove();

    const chartHome = document.getElementById('chart-home');
    if (chartHome) {
      const bloco = chartHome.closest('div[style*="height: 300px;"]')?.parentElement;
      if (bloco) bloco.remove();
    }

    const secoesHome = document.querySelectorAll('#tab-home > h2, #tab-home > .home-grid');
    secoesHome.forEach(el => {
      if (el.textContent && el.textContent.includes('Acesso Rápido')) el.remove();
      else if (el.classList && el.classList.contains('home-grid')) el.remove();
    });

    // Se existir algum resquício de card recolhível premium, deixa tudo aberto e leve
    document.querySelectorAll('.card-collapsible').forEach(card => {
      card.classList.remove('expanded');
      const details = card.querySelector('.card-details');
      if (details) details.style.display = 'block';
      const toggle = card.querySelector('.card-toggle');
      if (toggle) toggle.remove();
    });
  }

  // No-op: se alguma versão chamar esse método, não anima nada
  window.toggleCardExpand = function(cardElOrBtn) {
    const card = cardElOrBtn?.closest ? (cardElOrBtn.closest('.card-collapsible') || cardElOrBtn.closest('.card')) : null;
    if (!card) return;
    const details = card.querySelector('.card-details');
    if (details) details.style.display = 'block';
    const toggle = card.querySelector('.card-toggle');
    if (toggle) toggle.remove();
    card.classList.remove('expanded');
  };

  const oldIrParaAba = window.irParaAba;
  if (typeof oldIrParaAba === 'function') {
    window.irParaAba = function() {
      const out = oldIrParaAba.apply(this, arguments);
      setTimeout(simplificarTelaInicial, 30);
      return out;
    };
  }

  const oldRenderHomeGraph = window.renderizarGraficoHome;
  if (typeof oldRenderHomeGraph === 'function') {
    window.renderizarGraficoHome = function() {
      // gráfico da home removido para deixar a tela inicial mais leve
      return null;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', simplificarTelaInicial);
  } else {
    simplificarTelaInicial();
  }
})();
