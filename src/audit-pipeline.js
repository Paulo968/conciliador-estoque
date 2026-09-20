        function aplicarDicionario(nomeNormalizado, stats = null) {
            let atual = nomeNormalizado;
            let usouMemoria = false;
            const visitados = new Set();
            while (dicionarioMescla[atual] && !visitados.has(atual)) {
                visitados.add(atual);
                const proximo = dicionarioMescla[atual];
                if (!proximo || proximo === atual) break;
                atual = proximo;
                usouMemoria = true;
            }
            if (usouMemoria && stats) stats.unioesMemoria++;
            return atual;
        }
        
        function arredondarQuantidade(valor) {
            const fator = 10 ** PRECISAO_QUANTIDADE;
            return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
        }

        function normalizarNumero(valor) {
            if (valor === undefined || valor === null || valor === '') return 0;
            if (typeof valor === 'number') return Number.isFinite(valor) ? arredondarQuantidade(valor) : 0;

            let s = String(valor).trim().replace(/\s+/g, '');
            if (!s) return 0;
            s = s.replace(/[^0-9+\-.,]/g, '');
            if (!s || !/[0-9]/.test(s)) return 0;

            const ultimaVirgula = s.lastIndexOf(',');
            const ultimoPonto = s.lastIndexOf('.');
            if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
                const separadorDecimal = ultimaVirgula > ultimoPonto ? ',' : '.';
                const posDecimal = Math.max(ultimaVirgula, ultimoPonto);
                const inteiro = s.slice(0, posDecimal).replace(/[.,]/g, '');
                const decimal = s.slice(posDecimal + 1).replace(/[.,]/g, '');
                s = `${inteiro}.${decimal}`;
            } else if (ultimaVirgula !== -1) {
                const partes = s.split(',');
                const decimal = partes.pop();
                s = `${partes.join('')}.${decimal}`;
            } else if (ultimoPonto !== -1) {
                const partes = s.split('.');
                const decimal = partes.pop();
                s = `${partes.join('')}.${decimal}`;
            }

            const n = Number(s);
            return Number.isFinite(n) ? arredondarQuantidade(n) : 0;
        }

        function quantidadesIguais(a, b) {
            return Math.abs(normalizarNumero(a) - normalizarNumero(b)) <= TOLERANCIA_QUANTIDADE;
        }

        function formatarQuantidade(valor) {
            return normalizarNumero(valor).toLocaleString('pt-BR', { maximumFractionDigits: PRECISAO_QUANTIDADE });
        }

        function escapeHTML(str) {
            if (str === undefined || str === null) return "";
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        function esc(str) { return str ? String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""; }

        function criarHashRejeicao(a, b) {
            return JSON.stringify([a, b]);
        }

        function salvarRejeicaoIA(a, b) {
            if (!a || !b || a === b) return;

            const hash1 = criarHashRejeicao(a, b);
            const hash2 = criarHashRejeicao(b, a);

            if (!rejeicoesIA.includes(hash1)) rejeicoesIA.push(hash1);
            if (!rejeicoesIA.includes(hash2)) rejeicoesIA.push(hash2);

            localStorage.setItem('rejeicoesIAV1', JSON.stringify(rejeicoesIA));
        }

        function obterGrupoMescla(origem) {
            const destino = dicionarioMescla[origem];
            if (!destino) return [origem];

            const grupo = new Set([origem, destino]);

            Object.keys(dicionarioMescla).forEach(chave => {
                const valor = dicionarioMescla[chave];

                if (valor === destino || chave === destino || valor === origem) {
                    grupo.add(chave);
                    grupo.add(valor);
                }
            });

            return Array.from(grupo).filter(Boolean);
        }

        function mostrarNotificacao(titulo, mensagem) {
            let toast = document.getElementById('toastNotificacao');
            document.getElementById('toastTitulo').innerText = titulo; document.getElementById('toastMsg').innerText = mensagem;
            toast.classList.remove('translate-x-full', 'opacity-0');
            setTimeout(() => toast.classList.add('translate-x-full', 'opacity-0'), 5000);
        }

        function salvarObservacoesLocal() {
            localStorage.setItem('observacoesV1', JSON.stringify(observacoes));
        }

        function obterObservacao(chave) {
            return observacoes[chave] || null;
        }

        function combinarTextosObservacao(registros) {
            const textos = registros
                .map(r => r?.texto?.trim())
                .filter(Boolean)
                .filter((texto, indice, lista) => lista.indexOf(texto) === indice);
            return textos.join('\n\n');
        }

        function migrarObservacoesParaChave(chaves, destino) {
            const candidatos = [...new Set([...(chaves || []), destino].filter(Boolean))];
            const registros = candidatos.map(chave => observacoes[chave]).filter(Boolean);
            if (!registros.length) return;
            const texto = combinarTextosObservacao(registros);
            candidatos.forEach(chave => { if (chave !== destino) delete observacoes[chave]; });
            observacoes[destino] = {
                texto,
                atualizadoEm: new Date().toISOString()
            };
            salvarObservacoesLocal();
        }

        function replicarObservacaoParaGrupo(grupo, chaveOrigem) {
            const registro = observacoes[chaveOrigem] || (grupo || []).map(chave => observacoes[chave]).find(Boolean);
            if (!registro) return;
            (grupo || []).forEach(chave => {
                observacoes[chave] = { ...registro, atualizadoEm: new Date().toISOString() };
            });
            salvarObservacoesLocal();
        }

        function abrirModalObservacao(chaveCodificada) {
            const chave = decodeURIComponent(chaveCodificada);
            chaveObservacaoAtual = chave;
            const iA = processedData.dictA[chave];
            const iB = processedData.dictB[chave];
            const contexto = [];
            if (iA) contexto.push(`Lado A: ${iA.descOriginal} (${formatarQuantidade(iA.qtd)} ${iA.um || ''})`);
            if (iB) contexto.push(`Lado B: ${iB.descOriginal} (${formatarQuantidade(iB.qtd)} ${iB.um || ''})`);
            document.getElementById('observacaoContexto').innerText = contexto.join('\n') || chave;

            const registro = obterObservacao(chave);
            document.getElementById('observacaoTexto').value = registro?.texto || '';
            document.getElementById('btnApagarObservacao').classList.toggle('hidden', !registro?.texto);
            document.getElementById('observacaoModal').classList.remove('hidden');
            setTimeout(() => document.getElementById('observacaoTexto').focus(), 50);
        }

        function fecharModalObservacao() {
            document.getElementById('observacaoModal').classList.add('hidden');
            chaveObservacaoAtual = null;
        }

        function fecharObservacaoAoClicarFora(event) {
            if (event.target?.id === 'observacaoModal') fecharModalObservacao();
        }

        function salvarObservacaoAtual() {
            if (!chaveObservacaoAtual) return;
            const texto = document.getElementById('observacaoTexto').value.trim();
            if (texto) {
                observacoes[chaveObservacaoAtual] = { texto, atualizadoEm: new Date().toISOString() };
                mostrarNotificacao('📝 Observação salva', 'A tratativa ficou registrada neste Status.');
            } else {
                delete observacoes[chaveObservacaoAtual];
                mostrarNotificacao('Observação removida', 'O Status voltou a ficar sem anotação.');
            }
            salvarObservacoesLocal();
            fecharModalObservacao();
            renderizarMatriz(processedData.listaFinal, processedData.dictA, processedData.dictB);
        }

        function apagarObservacaoAtual() {
            if (!chaveObservacaoAtual) return;
            delete observacoes[chaveObservacaoAtual];
            salvarObservacoesLocal();
            fecharModalObservacao();
            renderizarMatriz(processedData.listaFinal, processedData.dictA, processedData.dictB);
            mostrarNotificacao('Observação apagada', 'A anotação foi removida deste Status.');
        }

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !document.getElementById('observacaoModal').classList.contains('hidden')) fecharModalObservacao();
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !document.getElementById('observacaoModal').classList.contains('hidden')) salvarObservacaoAtual();
        });

        function classificarEExtrairDados(rows, idLado) {
            if (rows.length === 0) return [];
            let headerRowIndex = -1; let map = { cod: -1, desc: -1, qtd: -1, um: -1 };
            const vocUM = ['UN','KG','LT','ML','GR','CX','SC','PCT','KT','PR','GL','BD','FD','TN','BAG','GD','FR','PT','BB','IBC','BS','DS','BO','PC','MT','DZ'];

            for (let i = 0; i < Math.min(10, rows.length); i++) {
                let linha = rows[i]; if (!linha || !Array.isArray(linha)) continue;
                linha.forEach((val, cIdx) => {
                    if (!val) return; let v = String(val).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (v.includes("cod") || v.includes("sku") || v.includes("ref") || v === "id") map.cod = cIdx;
                    else if (v.includes("desc") || v.includes("prod") || v.includes("nome") || v.includes("mat")) map.desc = cIdx;
                    else if (v.includes("qtd") || v.includes("quant") || v.includes("saldo") || v.includes("est")) map.qtd = cIdx;
                    else if (v === "um" || v.includes("unid") || v.includes("medida")) map.um = cIdx;
                });
                if (map.desc !== -1 && map.qtd !== -1) { headerRowIndex = i; break; }
            }

            if (headerRowIndex === -1) {
                let numCols = rows.reduce((max, r) => Math.max(max, r.length || 0), 0);
                let pts = Array.from({length: numCols}, (_, c) => ({ col: c, q: 0, d: 0, c: 0, u: 0 }));
                for (let i = 0; i < Math.min(30, rows.length); i++) {
                    rows[i]?.forEach((val, c) => {
                        let s = String(val).trim(); if (!s) return;
                        if (vocUM.includes(s.toUpperCase())) pts[c].u += 10;
                        if (!isNaN(s.replace(',', '.'))) {
                            if (s.includes('.') || s.includes(',')) pts[c].q += 50; else pts[c].q += 2;
                        } else {
                            if (s.length > 8 && s.includes(' ')) pts[c].d += s.length;
                            if (s.length >= 2 && s.length <= 15 && !s.includes(' ')) pts[c].c += 10;
                        }
                    });
                }
                map.desc = pts.reduce((a, b) => a.d > b.d ? a : b).col;
                map.qtd = pts.filter(p => p.col !== map.desc).reduce((a, b) => a.q > b.q ? a : b).col;
                map.um = pts.filter(p => p.col !== map.desc && p.col !== map.qtd).reduce((a, b) => a.u > b.u ? a : b).col;
                map.cod = pts.filter(p => p.col !== map.desc && p.col !== map.qtd && p.col !== map.um).reduce((a, b) => a.c > b.c ? a : b).col;
            }

            let extraido = []; let startRow = headerRowIndex === -1 ? 0 : headerRowIndex + 1;
            for (let i = startRow; i < rows.length; i++) {
                let linha = rows[i]; if (!linha || !Array.isArray(linha)) continue;
                let original = map.desc !== -1 ? linha[map.desc] : "";
                if (!original || String(original).trim().length < 2) continue; 
                extraido.push({
                    codigo: map.cod !== -1 && linha[map.cod] !== undefined ? String(linha[map.cod]).trim() : "-",
                    descOriginal: String(original).trim(),
                    um: map.um !== -1 && linha[map.um] ? String(linha[map.um]).trim().toUpperCase() : "UN",
                    qtdRaw: map.qtd !== -1 ? linha[map.qtd] : 0
                });
            }
            return extraido;
        }

        function estruturarLado(dadosPadronizados, idLado, stats = null) {
            let mapa = {};
            dadosPadronizados.forEach(item => {
                let normal = normalizarTexto(item.descOriginal);
                // EXCLUSÃO AUTOMÁTICA DESATIVADA - exclusão agora é apenas manual
                // if (palavrasExcluidasFixas.some(p => normal.includes(p))) { if(stats) stats.excluidos++; return; }
                let finalDesc = aplicarDicionario(normal, stats);
                if (exclusoes[idLado].includes(finalDesc)) { if(stats) stats.excluidos++; return; }
                if (mapa[finalDesc]) { 
                    mapa[finalDesc].qtd = arredondarQuantidade(mapa[finalDesc].qtd + normalizarNumero(item.qtdRaw));
                    if (item.codigo !== "-" && !mapa[finalDesc].codigo.includes(item.codigo)) mapa[finalDesc].codigo += " / " + item.codigo;
                    if (!mapa[finalDesc].origens.includes(normal)) mapa[finalDesc].origens.push(normal);
                } else {
                    mapa[finalDesc] = { codigo: item.codigo, descOriginal: item.descOriginal, um: item.um, qtd: normalizarNumero(item.qtdRaw), origens: [normal] };
                }
            });
            return mapa;
        }

        function iniciarCruzamento(exibirFeedback = false) {
            if (dadosRawA.length === 0 && dadosRawB.length === 0) return;
            const btn = document.getElementById('btnProcessar'); btn.innerHTML = `Limpando e Cruzando...`; btn.disabled = true;
            
            setTimeout(() => {
                let startT = performance.now();
                let statsProcesso = { excluidos: 0, unioesMemoria: 0, novasUnioes: 0 };

                try {
                    // FASE 1: Dicionários temporários apenas para a IA varrer, aprender e encontrar correlações
                    let dictTempA = estruturarLado(dadosRawA, 'A'); 
                    let dictTempB = estruturarLado(dadosRawB, 'B');
                    
                    // União automática somente quando a confiança é muito alta.
                    // Quantidade igual ajuda na explicação, mas nunca autoriza uma união sozinha.
                    statsProcesso.novasUnioes += aprenderPadroes(dictTempA, dictTempB);
                    
                    // Salva possíveis novas uniões descobertas pela IA no storage
                    localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));

                    // FASE 2: Com a memória 100% enriquecida, constrói as listas definitivas
                    let dictA = estruturarLado(dadosRawA, 'A', statsProcesso); 
                    let dictB = estruturarLado(dadosRawB, 'B', statsProcesso);

                    let todasChaves = new Set([...Object.keys(dictA), ...Object.keys(dictB)]);
                    let listaFinal = Array.from(todasChaves).sort();
                    processedData = { dictA, dictB, listaFinal };
                    
                    renderizarMatriz(listaFinal, dictA, dictB);
                    
                    document.getElementById('btnIA').classList.remove('hidden');
                    document.getElementById('btnExportExcel').classList.remove('hidden');

                    let endT = performance.now();
                    if (exibirFeedback) {
                        mostrarFeedbackModal(statsProcesso, listaFinal.length, (endT - startT));
                    }

                } catch (e) { 
                    console.error(e); 
                    mostrarNotificacao('Erro no Processamento', e.message || 'Ocorreu um erro inesperado. Verifique o console.');
                    // Mostrar erro no modal de feedback
                    document.getElementById('fbTotalLidos').innerText = 'Erro';
                    document.getElementById('fbItensFinais').innerText = '0';
                    document.getElementById('fbMemoria').innerText = '0';
                    document.getElementById('fbTempo').innerText = '0s';
                    let modal = document.getElementById('feedbackModal');
                    modal.classList.remove('hidden');
                    document.querySelector('#feedbackModalContent h3').innerText = 'Erro na Auditoria';
                    document.querySelector('#feedbackModalContent p').innerText = 'Ocorreu um erro: ' + (e.message || 'desconhecido');
                } finally { btn.innerHTML = `Processar Auditoria`; btn.disabled = false; }
            }, 100);
        }

