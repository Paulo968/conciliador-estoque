// Conciliador PRO v10.3 — camada de fluidez sem alterar regras de auditoria
(() => {
    'use strict';

    const cachePreprocessamento = new WeakMap();
    const cacheMatriz = new WeakMap();
    let execucaoCruzamento = 0;

    const proximoFrame = () => new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
    });

    function atualizarBotaoProcessamento(texto, percentual = null) {
        const btn = document.getElementById('btnProcessar');
        if (!btn) return;
        const pct = Number.isFinite(percentual) ? ` ${Math.max(0, Math.min(100, Math.round(percentual)))}%` : '';
        btn.textContent = `${texto}${pct}`;
    }

    function criarCodigoWorker() {
        return `
            const PRECISAO_QUANTIDADE = ${JSON.stringify(PRECISAO_QUANTIDADE)};
            const stopwordsLogistica = ${JSON.stringify(stopwordsLogistica)};
            const cacheNormalizacao = new Map();
            ${padronizarLinguagemLogistica.toString()}
            ${removerStopwords.toString()}
            ${normalizarTexto.toString()}
            ${arredondarQuantidade.toString()}
            ${normalizarNumero.toString()}

            self.onmessage = event => {
                const dados = Array.isArray(event.data?.dados) ? event.data.dados : [];
                const resultado = new Array(dados.length);
                const passo = Math.max(250, Math.floor(dados.length / 20));

                for (let i = 0; i < dados.length; i++) {
                    const item = dados[i] || {};
                    resultado[i] = {
                        codigo: item.codigo,
                        descOriginal: item.descOriginal,
                        um: item.um,
                        normal: normalizarTexto(item.descOriginal),
                        qtd: normalizarNumero(item.qtdRaw)
                    };

                    if (i > 0 && i % passo === 0) {
                        self.postMessage({ tipo: 'progresso', concluido: i, total: dados.length });
                    }
                }

                self.postMessage({ tipo: 'concluido', resultado });
            };
        `;
    }

    function preprocessarComWorker(dados, aoProgresso) {
        return new Promise((resolve, reject) => {
            let url = null;
            let worker = null;
            try {
                const blob = new Blob([criarCodigoWorker()], { type: 'text/javascript' });
                url = URL.createObjectURL(blob);
                worker = new Worker(url);
            } catch (erro) {
                if (url) URL.revokeObjectURL(url);
                reject(erro);
                return;
            }

            const finalizar = () => {
                try { worker?.terminate(); } catch (_) {}
                if (url) URL.revokeObjectURL(url);
            };

            worker.onmessage = event => {
                const msg = event.data || {};
                if (msg.tipo === 'progresso') {
                    aoProgresso?.(msg.concluido, msg.total);
                    return;
                }
                if (msg.tipo === 'concluido') {
                    finalizar();
                    resolve(msg.resultado || []);
                }
            };

            worker.onerror = erro => {
                finalizar();
                reject(erro);
            };

            worker.postMessage({ dados });
        });
    }

    async function preprocessarNoMainEmLotes(dados, aoProgresso) {
        const resultado = new Array(dados.length);
        const tamanhoLote = 300;

        for (let inicio = 0; inicio < dados.length; inicio += tamanhoLote) {
            const fim = Math.min(dados.length, inicio + tamanhoLote);
            for (let i = inicio; i < fim; i++) {
                const item = dados[i] || {};
                resultado[i] = {
                    codigo: item.codigo,
                    descOriginal: item.descOriginal,
                    um: item.um,
                    normal: normalizarTexto(item.descOriginal),
                    qtd: normalizarNumero(item.qtdRaw)
                };
            }
            aoProgresso?.(fim, dados.length);
            await proximoFrame();
        }
        return resultado;
    }

    async function obterPreprocessado(dados, aoProgresso) {
        if (!Array.isArray(dados)) return [];
        const cache = cachePreprocessamento.get(dados);
        if (cache && cache.tamanho === dados.length) {
            aoProgresso?.(dados.length, dados.length, true);
            return cache.resultado;
        }

        let resultado;
        const podeUsarWorker = typeof Worker === 'function' && typeof Blob === 'function' && typeof URL?.createObjectURL === 'function';

        if (podeUsarWorker && dados.length >= 300) {
            try {
                resultado = await preprocessarComWorker(dados, aoProgresso);
            } catch (erro) {
                console.warn('[v10.3] Worker indisponível; usando processamento em lotes.', erro);
                resultado = await preprocessarNoMainEmLotes(dados, aoProgresso);
            }
        } else {
            resultado = await preprocessarNoMainEmLotes(dados, aoProgresso);
        }

        cachePreprocessamento.set(dados, { tamanho: dados.length, resultado });
        return resultado;
    }

    async function estruturarPreprocessado(itens, idLado, stats = null, aoProgresso = null, verificarExecucao = null) {
        const mapa = {};
        const tamanhoLote = 700;

        for (let inicio = 0; inicio < itens.length; inicio += tamanhoLote) {
            verificarExecucao?.();
            const fim = Math.min(itens.length, inicio + tamanhoLote);

            for (let i = inicio; i < fim; i++) {
                const item = itens[i];
                const normal = item.normal;
                const finalDesc = aplicarDicionario(normal, stats);

                if (exclusoes[idLado].includes(finalDesc)) {
                    if (stats) stats.excluidos++;
                    continue;
                }

                if (mapa[finalDesc]) {
                    mapa[finalDesc].qtd = arredondarQuantidade(mapa[finalDesc].qtd + item.qtd);
                    if (item.codigo !== '-' && !mapa[finalDesc].codigo.includes(item.codigo)) {
                        mapa[finalDesc].codigo += ' / ' + item.codigo;
                    }
                    if (!mapa[finalDesc].origens.includes(normal)) mapa[finalDesc].origens.push(normal);
                } else {
                    mapa[finalDesc] = {
                        codigo: item.codigo,
                        descOriginal: item.descOriginal,
                        um: item.um,
                        qtd: item.qtd,
                        origens: [normal]
                    };
                }
            }

            aoProgresso?.(fim, itens.length);
            if (fim < itens.length) await proximoFrame();
        }

        return mapa;
    }

    function obterBaseMatriz(listaOrdenada, dictA, dictB) {
        const cache = cacheMatriz.get(listaOrdenada);
        if (cache && cache.dictA === dictA && cache.dictB === dictB) return cache;

        let cTotal = 0, cOk = 0, cDiv = 0, cSoA = 0, cSoB = 0;
        const linhas = listaOrdenada.map(descFinal => {
            const iA = dictA[descFinal];
            const iB = dictB[descFinal];
            const qA = iA ? iA.qtd : 0;
            const qB = iB ? iB.qtd : 0;
            const diff = normalizarNumero(qA - qB);
            let tp = 'all';

            if (iA && iB && quantidadesIguais(qA, qB)) { cOk++; tp = 'ok'; }
            else if (!iA) { cSoB++; tp = 'sob'; }
            else if (!iB) { cSoA++; tp = 'soa'; }
            else { cDiv++; tp = 'div'; }
            cTotal++;

            const searchUpper = ((iA?.descOriginal || '') + (iB?.descOriginal || '') + (iA?.codigo || '') + (iB?.codigo || '')).toUpperCase();
            return { descFinal, iA, iB, qA, qB, diff, tp, searchUpper };
        });

        const novo = { dictA, dictB, linhas, cTotal, cOk, cDiv, cSoA, cSoB };
        cacheMatriz.set(listaOrdenada, novo);
        return novo;
    }

    // Classificação e texto de busca ficam cacheados enquanto o resultado da auditoria não muda.
    renderizarMatriz = function (listaOrdenada, dictA, dictB) {
        const tbody = document.getElementById('tbodyMatriz');
        tbody.innerHTML = '';
        document.getElementById('areaTabela').classList.remove('hidden');

        const base = obterBaseMatriz(listaOrdenada, dictA, dictB);
        const busca = String(filtroBusca || '').toUpperCase();

        dadosFiltradosMatriz = base.linhas.filter(item => {
            if (busca && !item.searchUpper.includes(busca)) return false;
            return (filtroStatus === 'all') ||
                (item.tp === filtroStatus) ||
                (filtroStatus === 'sobras' && (item.tp === 'soa' || item.tp === 'sob'));
        });

        document.getElementById('kpiTotal').innerText = base.cTotal;
        document.getElementById('kpiOk').innerText = base.cOk;
        document.getElementById('kpiDiv').innerText = base.cDiv;
        document.getElementById('kpiSobras').innerText = base.cSoA + base.cSoB;
        document.getElementById('kpiSoA').innerText = base.cSoA;
        document.getElementById('kpiSoB').innerText = base.cSoB;

        renderizarPaginaMatriz(0, Math.min(dadosFiltradosMatriz.length, paginaAtual * limiteExibicao));

        const btnContainer = document.getElementById('btnCarregarMaisContainer');
        btnContainer.classList.toggle('hidden', dadosFiltradosMatriz.length <= paginaAtual * limiteExibicao);
    };

    function atualizarIndicadorObservacao(chave) {
        const idx = dadosFiltradosMatriz.findIndex(item => item.descFinal === chave);
        if (idx < 0) return;
        const row = document.getElementById(`row-${idx}`);
        const botao = row?.querySelector('.status-clicavel');
        if (!botao) return;
        const temObservacao = Boolean(obterObservacao(chave)?.texto);
        botao.classList.toggle('status-com-observacao', temObservacao);
        botao.title = temObservacao ? 'Clique para ver ou editar a observação' : 'Clique para adicionar uma observação';
    }

    // Observação altera só o Status visível; não reconstrói a tabela inteira.
    salvarObservacaoAtual = function () {
        if (!chaveObservacaoAtual) return;
        const chave = chaveObservacaoAtual;
        const texto = document.getElementById('observacaoTexto').value.trim();

        if (texto) {
            observacoes[chave] = { texto, atualizadoEm: new Date().toISOString() };
            mostrarNotificacao('📝 Observação salva', 'A tratativa ficou registrada neste Status.');
        } else {
            delete observacoes[chave];
            mostrarNotificacao('Observação removida', 'O Status voltou a ficar sem anotação.');
        }

        salvarObservacoesLocal();
        fecharModalObservacao();
        atualizarIndicadorObservacao(chave);
    };

    apagarObservacaoAtual = function () {
        if (!chaveObservacaoAtual) return;
        const chave = chaveObservacaoAtual;
        delete observacoes[chave];
        salvarObservacoesLocal();
        fecharModalObservacao();
        atualizarIndicadorObservacao(chave);
        mostrarNotificacao('Observação apagada', 'A anotação foi removida deste Status.');
    };

    // Mantém exatamente as mesmas regras de conciliação; muda apenas a execução para etapas cooperativas.
    iniciarCruzamento = async function (exibirFeedback = false) {
        if (dadosRawA.length === 0 && dadosRawB.length === 0) return;

        const minhaExecucao = ++execucaoCruzamento;
        const btn = document.getElementById('btnProcessar');
        btn.disabled = true;
        const inicioTempo = performance.now();
        const statsProcesso = { excluidos: 0, unioesMemoria: 0, novasUnioes: 0 };

        const verificarExecucao = () => {
            if (minhaExecucao !== execucaoCruzamento) {
                const erro = new Error('PROCESSAMENTO_SUBSTITUIDO');
                erro.cancelado = true;
                throw erro;
            }
        };

        try {
            atualizarBotaoProcessamento('Preparando auditoria', 2);
            await proximoFrame();

            let progressoA = 0, progressoB = 0;
            const totalA = Math.max(1, dadosRawA.length);
            const totalB = Math.max(1, dadosRawB.length);
            const atualizarNormalizacao = () => {
                const media = ((progressoA / totalA) + (progressoB / totalB)) / 2;
                atualizarBotaoProcessamento('Normalizando estoques', 5 + media * 35);
            };

            const [preA, preB] = await Promise.all([
                obterPreprocessado(dadosRawA, (feito, total) => { progressoA = total ? feito : 0; atualizarNormalizacao(); }),
                obterPreprocessado(dadosRawB, (feito, total) => { progressoB = total ? feito : 0; atualizarNormalizacao(); })
            ]);
            verificarExecucao();

            atualizarBotaoProcessamento('Montando índices', 43);
            const [dictTempA, dictTempB] = await Promise.all([
                estruturarPreprocessado(preA, 'A', null, null, verificarExecucao),
                estruturarPreprocessado(preB, 'B', null, null, verificarExecucao)
            ]);
            verificarExecucao();

            atualizarBotaoProcessamento('Cruzando correspondências', 58);
            await proximoFrame();
            statsProcesso.novasUnioes += aprenderPadroes(dictTempA, dictTempB);
            localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
            verificarExecucao();

            atualizarBotaoProcessamento('Consolidando resultados', 70);
            let finalA = 0, finalB = 0;
            const atualizarFinal = () => {
                const media = ((finalA / totalA) + (finalB / totalB)) / 2;
                atualizarBotaoProcessamento('Consolidando resultados', 70 + media * 18);
            };

            const [dictA, dictB] = await Promise.all([
                estruturarPreprocessado(preA, 'A', statsProcesso, (feito) => { finalA = feito; atualizarFinal(); }, verificarExecucao),
                estruturarPreprocessado(preB, 'B', statsProcesso, (feito) => { finalB = feito; atualizarFinal(); }, verificarExecucao)
            ]);
            verificarExecucao();

            atualizarBotaoProcessamento('Preparando tabela', 92);
            await proximoFrame();
            const listaFinal = Array.from(new Set([...Object.keys(dictA), ...Object.keys(dictB)])).sort();
            processedData = { dictA, dictB, listaFinal };
            renderizarMatriz(listaFinal, dictA, dictB);

            document.getElementById('btnIA').classList.remove('hidden');
            document.getElementById('btnExportExcel').classList.remove('hidden');
            atualizarBotaoProcessamento('Auditoria pronta', 100);

            const fimTempo = performance.now();
            if (exibirFeedback) mostrarFeedbackModal(statsProcesso, listaFinal.length, fimTempo - inicioTempo);
        } catch (erro) {
            if (!erro?.cancelado) {
                console.error(erro);
                mostrarNotificacao('Erro no Processamento', erro.message || 'Ocorreu um erro inesperado.');
            }
        } finally {
            if (minhaExecucao === execucaoCruzamento) {
                btn.textContent = 'Processar Auditoria';
                btn.disabled = false;
            }
        }
    };

    // Dica ao navegador: a tabela já é paginada; este isolamento reduz repinturas sem alterar layout.
    const estilo = document.createElement('style');
    estilo.id = 'performance-v103-estilos';
    estilo.textContent = `
        #tbodyMatriz { contain: style; }
        .table-container { contain: paint; }
    `;
    document.head.appendChild(estilo);

    console.info('[Conciliador PRO] Camada de fluidez v10.3 ativa.');
})();
