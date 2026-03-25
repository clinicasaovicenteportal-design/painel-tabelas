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
            } else { htmlNaoLidos += `<div class="item-falta"><i class="ri-time-line"></i> ${nome}</div>`; }
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
        const precisaResponder = data['Tipo (Vídeo, PDF, Tarefa, Prova)'] && (data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Tarefa') || data['Tipo (Vídeo, PDF, Tarefa, Prova)'].includes('Prova'));
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
        if(colecaoNome === 'colaboradores') { 
            listaColaboradoresGlobal = itens.map(item => { return { nome: item.data['Nome Completo do Colaborador'], setor: item.data['Setor da Clínica'] || 'Geral' }; }).filter(c => c.nome).sort((a,b) => a.nome.localeCompare(b.nome)); 
            if(abaAtual === 'colaboradores') window.renderizarListaGenerica(colecaoNome); 
            if(isAdmin && abaAtual === 'rh') window.renderizarDashboardRH(); // NOVO: Atualiza RH
        }
        if(colecaoNome === 'treinamentos') { window.todosTreinamentosData = itens; if(window.alunoLogado) window.renderizarTrilhaAluno(); if(isAdmin && abaAtual === 'rh') window.renderizarDashboardRH(); }
        if(configuracaoAbas[colecaoNome] && configuracaoAbas[colecaoNome].campoAgrupador && colecaoNome !== 'colaboradores') { window.dadosGlobaisAbas[colecaoNome] = itens; if(abaAtual === colecaoNome) { if(window[`pasta_${colecaoNome}_Atual`]) window.renderizarListaGenerica(colecaoNome); else window.renderizarPastasGenericas(colecaoNome); } return; }
        if(!grid) return; grid.style.display = 'grid'; grid.innerHTML = '';
        itens.sort((a, b) => { return String(a.data[configuracaoAbas[colecaoNome].campos[0]]).localeCompare(String(b.data[configuracaoAbas[colecaoNome].campos[0]])); }).forEach((item) => { grid.innerHTML += window.gerarHTMLCard(colecaoNome, item.id, item.data); });
    });
};

window.carregarConfiguracoes = function() { /* ... Código omitido ... */ };
window.toggleChat = function() { /* ... Código omitido ... */ };
window.sendQuickMsg = function() {}; window.sendChat = function() {}; window.processarLogicaDoBot = function() {};

// ==========================================
// MÓDULOS DE RESPOSTA (ALUNO) E CORREÇÃO (ADMIN)
// ==========================================
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
        const precisaResponder = tipo && (tipo.includes('Tarefa') || tipo.includes('Prova'));
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

        grid.innerHTML += `<div class="card" style="border: 2px solid ${corStatus}; display:flex; flex-direction:column; background: white; border-radius: 10px; padding: 15px;"><div style="font-size:10px; opacity:0.7; text-transform:uppercase; font-weight:700; margin-bottom:5px; color: var(--primary-color);"><i class="ri-book-open-line"></i> MÓDULO: ${d['Pasta / Módulo']} | TIPO: ${tipo}</div><div style="font-size:16px; font-weight:600; margin-bottom:10px; line-height: 1.2;">${d['Título da Atividade']}</div><div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; flex:1;"><b>Pontos Base:</b> <span style="color:#e75516; font-weight:700;">+${pontosItem} XP</span><br><b>Status:</b> <span style="color:${corStatus}; font-weight:600;"><i class="${iconeStatus}"></i> ${statusTexto}</span></div>${btnAcao}</div>`;
    });

    const ptsEl = document.getElementById('aluno-pontos'); const pendEl = document.getElementById('aluno-tarefas-pendentes');
    if(ptsEl) ptsEl.textContent = pontos; if(pendEl) pendEl.textContent = pendentes;
    
    // NOVO: Chama a renderização das pesquisas
    window.renderizarPesquisasAluno();
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
        const jsonStr = String(configJSON).replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const perguntas = JSON.parse(jsonStr);
        perguntas.forEach((q, idx) => {
            let html = `<div class="pergunta-aluno-bloco" style="margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">`;
            html += `<div style="font-weight:600; font-size:13px; margin-bottom:10px;">${idx+1}. ${q.p}</div>`;
            html += `<input type="hidden" class="resp-tipo" value="${q.tipo}">`;
            html += `<input type="hidden" class="resp-pergunta-txt" value="${q.p}">`;
            if(q.tipo === 'descritiva') {
                html += `<textarea class="form-input resp-valor" style="height:80px; resize:vertical;" placeholder="Sua resposta..."></textarea>`;
            } else {
                q.ops.forEach((op, oIdx) => {
                    if(op.trim() !== '') { html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:5px; cursor:pointer;"><input type="radio" name="q_${idx}" class="resp-radio" value="${op}"> ${op}</label>`; }
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
        if(tipo === 'descritiva') { r = bloco.querySelector('.resp-valor').value.trim(); } 
        else { const checked = bloco.querySelector('.resp-radio:checked'); r = checked ? checked.value : 'Nenhuma opção selecionada'; }
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
    let respObj = null; let respStr = null;
    respostas.forEach(r => { try { let o = JSON.parse(r); if(o.nome === nomeAluno) { respObj = o; respStr = r; } } catch(e){} });
    if(!respObj) return;
    
    let html = `<b>Aluno:</b> ${nomeAluno} <br><b>Enviado em:</b> ${respObj.data}<br><br>`;
    (respObj.respostas || []).forEach((r, i) => { html += `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><b>Q${i+1}:</b> ${r.pergunta}<br><span style="color:#3182ce;">R: ${r.resposta}</span></div>`; });
    
    document.getElementById('correcao-respostas-aluno').innerHTML = html;
    document.getElementById('correcao-nota').value = respObj.nota || '';
    document.getElementById('correcao-feedback').value = respObj.feedback || '';
    document.getElementById('correcao-docid').value = docId;
    document.getElementById('correcao-nomealuno').value = nomeAluno;
    
    document.getElementById('modal-correcao-admin').style.display = 'flex';
    document.getElementById('modal-leituras').style.display = 'none';
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
        await window.updateDoc(ref, { respostas_alunos: window.arrayRemove(respStrAntiga) });
        await window.updateDoc(ref, { respostas_alunos: window.arrayUnion(respStrNova) });
        alert("Correção salva com sucesso!");
        document.getElementById('modal-correcao-admin').style.display = 'none';
        document.getElementById('modal-leituras').style.display = 'flex'; // Volta pra lista
    } catch(e) { alert("Erro ao salvar: "+e.message); }
};

window.entrarPortalAluno = function() {
    const nomeDigitado = document.getElementById('login-aluno-nome').value.trim().toLowerCase();
    const pinDigitado = document.getElementById('login-aluno-pin').value.trim();
    if(!nomeDigitado || !pinDigitado) return alert("Preencha Nome e PIN!");
    const dadosColaboradores = window.todosOsDadosDoSistema['colaboradores'] || [];
    const colaboradorEncontrado = dadosColaboradores.find(item => { return String(item.data['Nome Completo do Colaborador'] || "").toLowerCase() === nomeDigitado && String(item.data['PIN de Acesso (Treinamentos)'] || "") === pinDigitado; });
    if(colaboradorEncontrado) {
        window.alunoLogado = colaboradorEncontrado.data;
        document.getElementById('ensino-login-area').style.display = 'none'; document.getElementById('ensino-dashboard-area').style.display = 'block';
        document.getElementById('nome-aluno-logado').textContent = window.alunoLogado['Nome Completo do Colaborador'];
        window.renderizarTrilhaAluno(); 
        if(window.renderizarPesquisasAluno) window.renderizarPesquisasAluno(); // RH
    } else { alert("Nome ou PIN incorretos. Verifique com a Gestão."); }
};

// ==========================================
// MÓDULO: RH & PEOPLE ANALYTICS
// ==========================================
window.escutarRH = function() {
    if(!isAdmin) return;
    window.onSnapshot(window.collection(window.db, 'rh-pesquisas'), (snap) => {
        window.todosPesquisasRH = []; snap.forEach(d => window.todosPesquisasRH.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
        if(window.alunoLogado) window.renderizarPesquisasAluno();
    });
    window.onSnapshot(window.collection(window.db, 'rh-respostas-pesquisa'), (snap) => {
        window.todosRespostasRH = []; snap.forEach(d => window.todosRespostasRH.push({id: d.id, data: d.data()}));
        if(abaAtual === 'rh') window.renderizarDashboardRH();
    });
};

window.renderizarDashboardRH = function() {
    const totColab = listaColaboradoresGlobal.length;
    document.getElementById('rh-tot-colab').textContent = totColab;
    
    let totalXP = 0; let topPerformers = 0;
    const colabStats = {};
    listaColaboradoresGlobal.forEach(c => { colabStats[c.nome] = { xp: 0, treinamentos: 0, setor: c.setor }; });

    window.todosTreinamentosData.forEach(t => {
        const pts = parseInt(t.data['Pontos Valendo']) || 0;
        (t.data.leituras || []).forEach(l => {
            const n = l.split(' (')[0]; if(colabStats[n]) { colabStats[n].xp += pts; totalXP += pts; colabStats[n].treinamentos++; }
        });
        (t.data.respostas_alunos || []).forEach(r => {
            try { let o = JSON.parse(r); if(colabStats[o.nome] && o.nota !== "") { let nota = parseInt(o.nota)||0; colabStats[o.nome].xp += nota; totalXP += nota; colabStats[o.nome].treinamentos++; } } catch(e){}
        });
    });

    const avgXp = totColab > 0 ? Math.round(totalXP / totColab) : 0;
    document.getElementById('rh-avg-xp').textContent = avgXp;

    const grid = document.getElementById('rh-grid-colaboradores');
    if(!grid) return; grid.innerHTML = '';
    const search = (document.getElementById('rh-search-colab')?.value || '').toLowerCase();

    let htmlCards = '';
    Object.keys(colabStats).forEach(nome => {
        const stat = colabStats[nome];
        if(search && !nome.toLowerCase().includes(search)) return;
        let statusClass = 'neutro'; let statusText = 'Em Desenvolvimento';
        if(stat.xp >= avgXp && stat.xp > 0) { statusClass = 'destaque'; statusText = 'Alta Performance'; topPerformers++; }
        else if(stat.xp === 0) { statusClass = 'risco'; statusText = 'Em Atenção'; }
        
        htmlCards += `<div class="rh-collab-card ${statusClass}">
            <div class="rh-collab-header">
                <div class="rh-avatar">${nome.substring(0,2).toUpperCase()}</div>
                <div class="rh-collab-meta"><h4>${nome}</h4><p>${stat.setor}</p></div>
                <div class="rh-score-badge">${stat.xp} XP</div>
            </div>
            <div class="rh-collab-grid">
                <div><span>Treinamentos Concluídos</span><strong>${stat.treinamentos}</strong></div>
                <div><span>Status RH</span><span class="rh-chip ${statusClass}" style="margin:0; padding:4px 8px;">${statusText}</span></div>
            </div>
        </div>`;
    });
    grid.innerHTML = htmlCards || '<p style="padding:20px; color:var(--text-muted);">Nenhum colaborador encontrado.</p>';
    document.getElementById('rh-tot-high').textContent = topPerformers;

    // Pesquisas Ativas
    const gridP = document.getElementById('rh-grid-pesquisas');
    if(gridP) {
        gridP.innerHTML = '';
        window.todosPesquisasRH.forEach(p => {
            const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === p.id).length;
            gridP.innerHTML += `<div class="rh-survey-card">
                <div><h4 style="margin:0; color:var(--text-main); font-weight:600;">${p.data.titulo}</h4><p style="margin:0; color:var(--text-muted); font-size:12px;">Categoria: ${p.data.categoria} | Público: ${p.data.alvo}</p></div>
                <div class="rh-survey-stats"><b>${resps}</b> Respostas</div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.verResultadosPesquisaRH('${p.id}')" class="btn-hover color-8" style="height:30px; font-size:11px; padding:0 15px;">Resultados</button>
                    <button onclick="window.excluirPesquisaRH('${p.id}')" style="background:none; border:none; color:#e53e3e; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>`;
        });
        if(window.todosPesquisasRH.length === 0) gridP.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Nenhuma pesquisa ativa.</p>';
    }
};

window.abrirModalCriarPesquisa = function() {
    document.getElementById('rh-pesq-titulo').value = '';
    document.getElementById('rh-pesq-perguntas-list').innerHTML = '';
    const alvo = document.getElementById('rh-pesq-alvo');
    alvo.innerHTML = '<option value="Geral">Todos (Geral)</option>';
    setoresGlobais.forEach(s => alvo.innerHTML += `<option value="${s}">Setor: ${s}</option>`);
    document.getElementById('modal-criar-pesquisa').style.display = 'flex';
};

window.adicionarPerguntaRH = function(tipo) {
    const area = document.getElementById('rh-pesq-perguntas-list');
    const div = document.createElement('div');
    div.className = 'rh-pergunta-item';
    div.style = 'background:#f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px; position:relative;';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; color:red; background:none; border:none; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
        <input type="hidden" class="rh-p-tipo" value="${tipo}">
        <label style="font-size:12px; font-weight:600;">Pergunta (${tipo === 'escala' ? 'Escala 1 a 5' : 'Texto Aberto'}):</label>
        <input type="text" class="form-input rh-p-texto" style="margin-bottom:0;" placeholder="Digite a pergunta...">
    `;
    area.appendChild(div);
};

window.salvarPesquisaRH = async function() {
    const titulo = document.getElementById('rh-pesq-titulo').value.trim();
    const categoria = document.getElementById('rh-pesq-categoria').value;
    const alvo = document.getElementById('rh-pesq-alvo').value;
    const blocos = document.querySelectorAll('.rh-pergunta-item');
    
    if(!titulo || blocos.length === 0) return alert("Preencha o título e adicione pelo menos uma pergunta!");

    let perguntas = [];
    blocos.forEach(b => {
        perguntas.push({
            tipo: b.querySelector('.rh-p-tipo').value,
            texto: b.querySelector('.rh-p-texto').value.trim()
        });
    });

    try {
        await window.addDoc(window.collection(window.db, 'rh-pesquisas'), {
            titulo, categoria, alvo, perguntas, dataCriacao: new Date().toISOString()
        });
        alert("Pesquisa enviada com sucesso!");
        document.getElementById('modal-criar-pesquisa').style.display = 'none';
    } catch(e) { alert("Erro ao criar pesquisa: " + e.message); }
};

window.excluirPesquisaRH = async function(id) {
    if(!confirm("Excluir esta pesquisa e todas as respostas?")) return;
    try { await window.deleteDoc(window.doc(window.db, 'rh-pesquisas', id)); alert("Excluída!"); } catch(e) {}
};

window.renderizarPesquisasAluno = function() {
    if(!window.alunoLogado) return;
    const area = document.getElementById('aluno-pesquisas-pendentes');
    const lista = document.getElementById('lista-pesquisas-aluno');
    if(!area || !lista) return;

    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    const setorAluno = window.alunoLogado['Setor da Clínica'] || 'Geral';

    const minhasPesquisas = window.todosPesquisasRH.filter(p => {
        const alvo = p.data.alvo;
        return alvo === 'Geral' || alvo === setorAluno;
    });

    let pendentes = [];
    minhasPesquisas.forEach(p => {
        const jaRespondeu = window.todosRespostasRH.some(r => r.data.pesquisaId === p.id && r.data.nome === nomeAluno);
        if(!jaRespondeu) pendentes.push(p);
    });

    if(pendentes.length > 0) {
        lista.innerHTML = '';
        pendentes.forEach(p => {
            lista.innerHTML += `
                <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-soft);">
                    <div>
                        <strong style="color: var(--primary-color); display:block; font-size:15px;">${p.data.titulo}</strong>
                        <span style="font-size:12px; color:var(--text-muted);"><i class="ri-survey-fill"></i> ${p.data.categoria}</span>
                    </div>
                    <button onclick="window.responderPesquisaRH('${p.id}')" class="btn-hover color-11" style="height:35px; font-size:12px; padding:0 15px;">Responder Agora</button>
                </div>
            `;
        });
        area.style.display = 'block';
    } else {
        area.style.display = 'none';
    }
};

window.responderPesquisaRH = function(pesquisaId) {
    const p = window.todosPesquisasRH.find(x => x.id === pesquisaId);
    if(!p) return;

    document.getElementById('rh-resp-titulo').textContent = p.data.titulo;
    document.getElementById('rh-resp-id').value = pesquisaId;

    let html = '';
    p.data.perguntas.forEach((q, idx) => {
        html += `<div class="rh-resp-bloco" style="margin-bottom:15px; background:#f8fafc; padding:15px; border-radius:8px; border: 1px solid var(--border-color);">
            <label style="font-weight:600; font-size:13px; display:block; margin-bottom:10px; color:var(--text-main);">${idx+1}. ${q.texto}</label>
            <input type="hidden" class="resp-q-texto" value="${q.texto}">
            <input type="hidden" class="resp-q-tipo" value="${q.tipo}">
        `;
        if(q.tipo === 'escala') {
            html += `<div style="display:flex; gap:10px; justify-content:space-between;">`;
            [1,2,3,4,5].forEach(n => {
                html += `<label style="flex:1; text-align:center; background:white; border:1px solid #cbd5e1; padding:10px; border-radius:8px; cursor:pointer; transition:0.2s;">
                            <input type="radio" name="p_${pesquisaId}_q_${idx}" value="${n}" class="resp-q-val" style="margin-bottom:5px;">
                            <div style="font-weight:bold; color:var(--primary-color);">${n}</div>
                         </label>`;
            });
            html += `</div>`;
        } else {
            html += `<textarea class="form-input resp-q-val" style="height:80px; resize:vertical; margin:0;" placeholder="Sua resposta franca e sincera..."></textarea>`;
        }
        html += `</div>`;
    });
    
    document.getElementById('rh-resp-area').innerHTML = html;
    document.getElementById('modal-responder-pesquisa').style.display = 'flex';
};

window.enviarRespostaRH = async function() {
    if(!window.alunoLogado) return;
    const pesquisaId = document.getElementById('rh-resp-id').value;
    const nomeAluno = window.alunoLogado['Nome Completo do Colaborador'];
    
    const blocos = document.querySelectorAll('.rh-resp-bloco');
    let respostas = [];
    let ok = true;

    blocos.forEach(b => {
        const textoP = b.querySelector('.resp-q-texto').value;
        const tipo = b.querySelector('.resp-q-tipo').value;
        let val = '';
        if(tipo === 'escala') {
            const checked = b.querySelector('input[type="radio"]:checked');
            if(!checked) ok = false;
            else val = checked.value;
        } else {
            val = b.querySelector('textarea').value.trim();
            if(!val) ok = false;
        }
        respostas.push({ pergunta: textoP, resposta: val, tipo });
    });

    if(!ok) return alert("Por favor, responda todas as perguntas antes de enviar!");

    try {
        await window.addDoc(window.collection(window.db, 'rh-respostas-pesquisa'), {
            pesquisaId, nome: nomeAluno, respostas, data: new Date().toISOString()
        });
        alert("Muito obrigado pelas suas respostas! Isso nos ajuda a crescer juntos.");
        document.getElementById('modal-responder-pesquisa').style.display = 'none';
        window.renderizarPesquisasAluno();
    } catch(e) { alert("Erro ao enviar: " + e.message); }
};

window.verResultadosPesquisaRH = function(pesquisaId) {
    const p = window.todosPesquisasRH.find(x => x.id === pesquisaId);
    const resps = window.todosRespostasRH.filter(r => r.data.pesquisaId === pesquisaId);
    if(!p) return;

    let html = `<h4 style="margin-bottom:15px; color:var(--primary-color); font-size:18px;">${p.data.titulo}</h4>`;
    html += `<p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; background:#f8fafc; padding:10px; border-radius:8px;">Total de respostas coletadas: <b>${resps.length}</b></p>`;

    p.data.perguntas.forEach(q => {
        html += `<div style="margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                    <strong style="display:block; margin-bottom:10px; font-size:14px; color:var(--text-main);">${q.texto}</strong>`;
        
        if(q.tipo === 'escala') {
            let soma = 0; let qtd = 0;
            resps.forEach(r => {
                const ans = r.data.respostas.find(x => x.pergunta === q.texto);
                if(ans && ans.resposta) { soma += parseInt(ans.resposta); qtd++; }
            });
            const media = qtd > 0 ? (soma / qtd).toFixed(1) : 0;
            html += `<div style="font-size:28px; font-weight:700; color:#38a169;"><i class="ri-star-fill" style="color:#ecc94b;"></i> ${media} <span style="font-size:14px; font-weight:500; color:var(--text-muted);">/ 5</span></div>`;
        } else {
            html += `<div style="max-height:200px; overflow-y:auto; font-size:13px; background:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">`;
            if(resps.length === 0) html += `<span style="color:var(--text-muted);">Nenhuma resposta ainda.</span>`;
            resps.forEach(r => {
                const ans = r.data.respostas.find(x => x.pergunta === q.texto);
                if(ans && ans.resposta) {
                    html += `<div style="margin-bottom:10px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px;"><b>${r.data.nome}:</b> <span style="color:var(--text-muted);">${ans.resposta}</span></div>`;
                }
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    document.getElementById('rh-resultados-area').innerHTML = html;
    document.getElementById('modal-ver-respostas-rh').style.display = 'flex';
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
            
            const imgPastaInput = document.getElementById('tab-input-imagem-pastas'); const imgPastasTexto = imgPastaInput ? imgPastaInput.value : "";
            const chatLogoInput = document.getElementById('tab-input-chat-logo'); const chatLogoTexto = chatLogoInput ? chatLogoInput.value : "";
            const chatCorInput = document.getElementById('tab-color-chat'); const chatCorVal = chatCorInput ? chatCorInput.value : "#0ba360";
            
            btnSalvarAjustes.innerHTML = "Salvando...";
            try {
                await setDoc(doc(db, "configuracoes", "gerais"), { 
                    banner_texto: texto, locais: locaisTexto, setores: setoresTexto, especialidades: especialidadesTexto, motivos: motivosTexto, 
                    cor_pendente: corPend, cor_concluido: corConc, imagem_padrao_pastas: imgPastasTexto, chat_logo: chatLogoTexto, chat_cor: chatCorVal
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
            
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'pacotes', 'remocoes', 'colaboradores'].forEach(colecao => {
                const itens = window.todosOsDadosDoSistema[colecao] || window.dadosGlobaisAbas[colecao] || [];
                itens.forEach(item => {
                    if(Object.values(item.data).join(' ').toLowerCase().includes(texto)) { areaRes.innerHTML += window.gerarHTMLCard(colecao, item.id, item.data); encontrou = true; }
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
            const inputPesqLocal = document.getElementById('input-pesquisa');
            if(inputPesqLocal) inputPesqLocal.value = ''; 
            
            if(abaAtual === 'boletins') window.fecharPastaBoletim(); 
            if(abaAtual === 'boletins-privados') window.fecharPastaPrivado();
            ['convenios', 'ultrassom', 'consultas', 'exames-imagem', 'institutos', 'corpo-clinico', 'treinamentos'].forEach(col => { if(abaAtual === col) window.fecharPastaGenerica(col); });
            if(abaAtual === 'rh' && isAdmin) window.renderizarDashboardRH();
        });
    });
});

/* ===== PATCH HOME LEVE + SEM RECOLHÍVEL PESADO ===== */
(() => {
  function simplificarTelaInicial() {
    const buscaGlobal = document.getElementById('input-pesquisa-global');
    if (buscaGlobal) { const wrap = buscaGlobal.closest('.search-container'); if (wrap) wrap.remove(); }
    const resultados = document.getElementById('resultados-globais'); if (resultados) resultados.remove();
    const alertas = document.getElementById('area-alertas-home'); if (alertas) alertas.remove();
    const chartHome = document.getElementById('chart-home');
    if (chartHome) { const bloco = chartHome.closest('div[style*="height: 300px;"]')?.parentElement; if (bloco) bloco.remove(); }

    const secoesHome = document.querySelectorAll('#tab-home > h2, #tab-home > .home-grid');
    secoesHome.forEach(el => {
      if (el.textContent && el.textContent.includes('Acesso Rápido')) el.remove();
      else if (el.classList && el.classList.contains('home-grid')) el.remove();
    });

    document.querySelectorAll('.card-collapsible').forEach(card => {
      card.classList.remove('expanded');
      const details = card.querySelector('.card-details'); if (details) details.style.display = 'block';
      const toggle = card.querySelector('.card-toggle'); if (toggle) toggle.remove();
    });
  }

  window.toggleCardExpand = function(cardElOrBtn) {
    const card = cardElOrBtn?.closest ? (cardElOrBtn.closest('.card-collapsible') || cardElOrBtn.closest('.card')) : null;
    if (!card) return;
    const details = card.querySelector('.card-details'); if (details) details.style.display = 'block';
    const toggle = card.querySelector('.card-toggle'); if (toggle) toggle.remove();
    card.classList.remove('expanded');
  };

  const oldIrParaAba = window.irParaAba;
  if (typeof oldIrParaAba === 'function') {
    window.irParaAba = function() { const out = oldIrParaAba.apply(this, arguments); setTimeout(simplificarTelaInicial, 30); return out; };
  }

  const oldRenderHomeGraph = window.renderizarGraficoHome;
  if (typeof oldRenderHomeGraph === 'function') {
    window.renderizarGraficoHome = function() { return null; };
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', simplificarTelaInicial); } 
  else { simplificarTelaInicial(); }
})();
