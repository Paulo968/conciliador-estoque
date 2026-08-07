// Conciliador PRO v10.5 — arquitetura auditável A×A → B×B → A×B
// IMPORTANTE: esta camada NÃO decide conciliações e NÃO substitui o motor.
// Ela reconstrói o caminho em paralelo e valida se códigos/quantidades chegaram intactos ao resultado.
(() => {
    'use strict';

    const VERSAO_ARQUITETURA = '10.5';
    const TAMANHO_LOTE = 600;
    let ultimoDiagnostico = null;
    let geracaoDiagnostico = 0;

    const cederAoNavegador = () => new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
    });

    function resolverCanonico(nome, dicionario = dicionarioMescla) {
        let atual = nome;
        const visitados = new Set();
        while (dicionario?.[atual] && !visitados.has(atual)) {
            visitados.add(atual);
            const proximo = dicionario[atual];
            if (!proximo || proximo === atual) break;
            atual = proximo;
        }
        return atual;
    }

    function codigoValido(codigo) {
        const valor = String(codigo ?? '').trim();
        return valor && valor !== '-' ? valor : null;
    }

    function somarQuantidade(atual, valor) {
        return arredondarQuantidade(normalizarNumero(atual) + normalizarNumero(valor));
    }

    async function consolidarLadoReferencia(dados, lado, opcoes = {}) {
        const lista = Array.isArray(dados) ? dados : [];
        const dicionario = opcoes.dicionario || dicionarioMescla;
        const listaExclusoes = Array.isArray(opcoes.exclusoes?.[lado])
            ? opcoes.exclusoes[lado]
            : (Array.isArray(exclusoes?.[lado]) ? exclusoes[lado] : []);
        const exclusoesSet = new Set(listaExclusoes);
        const cooperativo = opcoes.cooperativo !== false;
        const grupos = Object.create(null);
        let linhasIncluidas = 0;
        let linhasExcluidas = 0;

        for (let inicio = 0; inicio < lista.length; inicio += TAMANHO_LOTE) {
            const fim = Math.min(lista.length, inicio + TAMANHO_LOTE);
            for (let i = inicio; i < fim; i++) {
                const item = lista[i] || {};
                const normal = normalizarTexto(item.descOriginal || '');
                if (!normal) continue;
                const chave = resolverCanonico(normal, dicionario);

                if (exclusoesSet.has(chave)) {
                    linhasExcluidas++;
                    continue;
                }

                linhasIncluidas++;
                if (!grupos[chave]) {
                    grupos[chave] = {
                        chave,
                        quantidade: 0,
                        linhas: 0,
                        codigos: [],
                        origens: [],
                        unidade: item.um || 'UN'
                    };
                }

                const grupo = grupos[chave];
                grupo.quantidade = somarQuantidade(grupo.quantidade, item.qtdRaw);
                grupo.linhas++;

                const codigo = codigoValido(item.codigo);
                if (codigo && !grupo.codigos.includes(codigo)) grupo.codigos.push(codigo);
                if (!grupo.origens.includes(normal)) grupo.origens.push(normal);
            }

            if (cooperativo && fim < lista.length) await cederAoNavegador();
        }

        const chaves = Object.keys(grupos).sort();
        const gruposMulticodigo = chaves.filter(chave => grupos[chave].codigos.length > 1);
        const gruposMultilinha = chaves.filter(chave => grupos[chave].linhas > 1);

        return {
            lado,
            totalLinhasRaw: lista.length,
            linhasIncluidas,
            linhasExcluidas,
            totalGrupos: chaves.length,
            totalGruposMulticodigo: gruposMulticodigo.length,
            totalGruposMultilinha: gruposMultilinha.length,
            chaves,
            grupos
        };
    }

    function statusCruzado(grupoA, grupoB) {
        if (grupoA && grupoB && quantidadesIguais(grupoA.quantidade, grupoB.quantidade)) return 'ok';
        if (!grupoA) return 'sob';
        if (!grupoB) return 'soa';
        return 'div';
    }

    function conciliarConsolidados(consolidacaoA, consolidacaoB) {
        const gruposA = consolidacaoA?.grupos || {};
        const gruposB = consolidacaoB?.grupos || {};
        const listaFinal = Array.from(new Set([
            ...Object.keys(gruposA),
            ...Object.keys(gruposB)
        ])).sort();

        const contadores = { total: 0, ok: 0, div: 0, soa: 0, sob: 0 };
        const statusPorChave = Object.create(null);

        listaFinal.forEach(chave => {
            const status = statusCruzado(gruposA[chave], gruposB[chave]);
            statusPorChave[chave] = status;
            contadores.total++;
            contadores[status]++;
        });

        return { listaFinal, contadores, statusPorChave };
    }

    function compararLadoComMotor(consolidacao, dictMotor) {
        const grupos = consolidacao?.grupos || {};
        const motor = dictMotor || {};
        const todas = new Set([...Object.keys(grupos), ...Object.keys(motor)]);
        const diferencas = [];

        todas.forEach(chave => {
            const referencia = grupos[chave];
            const real = motor[chave];
            if (!referencia || !real) {
                diferencas.push({
                    chave,
                    tipo: !referencia ? 'somente-no-motor' : 'ausente-no-motor',
                    referencia: referencia?.quantidade ?? null,
                    motor: real?.qtd ?? null
                });
                return;
            }

            if (!quantidadesIguais(referencia.quantidade, real.qtd)) {
                diferencas.push({
                    chave,
                    tipo: 'quantidade',
                    referencia: referencia.quantidade,
                    motor: normalizarNumero(real.qtd)
                });
            }
        });

        return {
            ok: diferencas.length === 0,
            totalDiferencas: diferencas.length,
            diferencas: diferencas.slice(0, 50)
        };
    }

    function compararCruzamentoComMotor(cruzamento, dadosProcessados) {
        const listaMotor = Array.isArray(dadosProcessados?.listaFinal)
            ? [...dadosProcessados.listaFinal].sort()
            : [];
        const listaRef = cruzamento?.listaFinal || [];
        const setMotor = new Set(listaMotor);
        const setRef = new Set(listaRef);
        const ausentesNoMotor = listaRef.filter(chave => !setMotor.has(chave));
        const extrasNoMotor = listaMotor.filter(chave => !setRef.has(chave));
        const statusDiferentes = [];

        listaRef.forEach(chave => {
            if (!setMotor.has(chave)) return;
            const iA = dadosProcessados?.dictA?.[chave];
            const iB = dadosProcessados?.dictB?.[chave];
            const statusMotor = iA && iB && quantidadesIguais(iA.qtd, iB.qtd)
                ? 'ok'
                : (!iA ? 'sob' : (!iB ? 'soa' : 'div'));
            const statusRef = cruzamento.statusPorChave[chave];
            if (statusMotor !== statusRef) {
                statusDiferentes.push({ chave, referencia: statusRef, motor: statusMotor });
            }
        });

        return {
            ok: !ausentesNoMotor.length && !extrasNoMotor.length && !statusDiferentes.length,
            ausentesNoMotor: ausentesNoMotor.slice(0, 50),
            extrasNoMotor: extrasNoMotor.slice(0, 50),
            statusDiferentes: statusDiferentes.slice(0, 50),
            totalDiferencas: ausentesNoMotor.length + extrasNoMotor.length + statusDiferentes.length
        };
    }

    function amostrasMulticodigo(consolidacao, limite = 20) {
        return Object.values(consolidacao?.grupos || {})
            .filter(grupo => grupo.codigos.length > 1)
            .slice(0, limite)
            .map(grupo => ({
                produto: grupo.chave,
                codigos: [...grupo.codigos],
                linhas: grupo.linhas,
                quantidadeConsolidada: grupo.quantidade
            }));
    }

    async function validarEstrutura(opcoes = {}) {
        const cooperativo = opcoes.cooperativo !== false;
        const [consolidacaoA, consolidacaoB] = await Promise.all([
            consolidarLadoReferencia(dadosRawA, 'A', { cooperativo }),
            consolidarLadoReferencia(dadosRawB, 'B', { cooperativo })
        ]);

        const cruzamento = conciliarConsolidados(consolidacaoA, consolidacaoB);
        const validacaoA = compararLadoComMotor(consolidacaoA, processedData?.dictA);
        const validacaoB = compararLadoComMotor(consolidacaoB, processedData?.dictB);
        const validacaoCruzada = compararCruzamentoComMotor(cruzamento, processedData);
        const ok = validacaoA.ok && validacaoB.ok && validacaoCruzada.ok;

        return {
            versao: VERSAO_ARQUITETURA,
            geradoEm: new Date().toISOString(),
            pipeline: ['A×A', 'B×B', 'A×B', 'VALIDAÇÃO'],
            ok,
            consolidacaoA: {
                totalLinhasRaw: consolidacaoA.totalLinhasRaw,
                linhasIncluidas: consolidacaoA.linhasIncluidas,
                linhasExcluidas: consolidacaoA.linhasExcluidas,
                totalGrupos: consolidacaoA.totalGrupos,
                gruposMulticodigo: consolidacaoA.totalGruposMulticodigo,
                gruposMultilinha: consolidacaoA.totalGruposMultilinha,
                amostrasMulticodigo: amostrasMulticodigo(consolidacaoA)
            },
            consolidacaoB: {
                totalLinhasRaw: consolidacaoB.totalLinhasRaw,
                linhasIncluidas: consolidacaoB.linhasIncluidas,
                linhasExcluidas: consolidacaoB.linhasExcluidas,
                totalGrupos: consolidacaoB.totalGrupos,
                gruposMulticodigo: consolidacaoB.totalGruposMulticodigo,
                gruposMultilinha: consolidacaoB.totalGruposMultilinha,
                amostrasMulticodigo: amostrasMulticodigo(consolidacaoB)
            },
            conciliacaoCruzada: {
                totalProdutos: cruzamento.contadores.total,
                bateu: cruzamento.contadores.ok,
                divergencia: cruzamento.contadores.div,
                somenteA: cruzamento.contadores.soa,
                somenteB: cruzamento.contadores.sob
            },
            conservacao: {
                ladoA: validacaoA,
                ladoB: validacaoB,
                cruzamento: validacaoCruzada
            }
        };
    }

    async function rastrearGrupo(lado, chaveFinal) {
        const dados = lado === 'B' ? dadosRawB : dadosRawA;
        const resultado = [];
        for (const item of dados || []) {
            const normal = normalizarTexto(item?.descOriginal || '');
            if (!normal) continue;
            const final = resolverCanonico(normal);
            if (final !== chaveFinal) continue;
            resultado.push({
                codigo: item.codigo,
                descricao: item.descOriginal,
                descricaoNormalizada: normal,
                quantidade: normalizarNumero(item.qtdRaw),
                unidade: item.um || 'UN'
            });
        }
        return resultado;
    }

    function resumoBackup() {
        if (!ultimoDiagnostico) return null;
        return {
            versao: ultimoDiagnostico.versao,
            geradoEm: ultimoDiagnostico.geradoEm,
            pipeline: ultimoDiagnostico.pipeline,
            ok: ultimoDiagnostico.ok,
            consolidacaoA: {
                totalLinhasRaw: ultimoDiagnostico.consolidacaoA.totalLinhasRaw,
                totalGrupos: ultimoDiagnostico.consolidacaoA.totalGrupos,
                gruposMulticodigo: ultimoDiagnostico.consolidacaoA.gruposMulticodigo
            },
            consolidacaoB: {
                totalLinhasRaw: ultimoDiagnostico.consolidacaoB.totalLinhasRaw,
                totalGrupos: ultimoDiagnostico.consolidacaoB.totalGrupos,
                gruposMulticodigo: ultimoDiagnostico.consolidacaoB.gruposMulticodigo
            },
            conciliacaoCruzada: ultimoDiagnostico.conciliacaoCruzada,
            diferencasEstruturais:
                ultimoDiagnostico.conservacao.ladoA.totalDiferencas +
                ultimoDiagnostico.conservacao.ladoB.totalDiferencas +
                ultimoDiagnostico.conservacao.cruzamento.totalDiferencas
        };
    }

    async function executarDiagnosticoAutomatico(minhaGeracao) {
        try {
            const diagnostico = await validarEstrutura({ cooperativo: true });
            if (minhaGeracao !== geracaoDiagnostico) return;
            ultimoDiagnostico = diagnostico;

            if (diagnostico.ok) {
                console.info(
                    `[Conciliador PRO v10.5] Arquitetura validada: A×A ${diagnostico.consolidacaoA.totalLinhasRaw}→${diagnostico.consolidacaoA.totalGrupos}, ` +
                    `B×B ${diagnostico.consolidacaoB.totalLinhasRaw}→${diagnostico.consolidacaoB.totalGrupos}, A×B ${diagnostico.conciliacaoCruzada.totalProdutos}.`
                );
            } else {
                console.error('[Conciliador PRO v10.5] Divergência estrutural detectada.', diagnostico);
                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(
                        '⚠️ Validação estrutural',
                        'O resultado foi mantido, mas a conferência A×A → B×B → A×B encontrou uma diferença interna. Consulte o diagnóstico antes de exportar.'
                    );
                }
            }
        } catch (erro) {
            console.error('[Conciliador PRO v10.5] Falha no diagnóstico estrutural.', erro);
        }
    }

    // A camada é instalada DEPOIS da performance-v103 no index.
    // O processamento original continua sendo a autoridade; o diagnóstico roda depois.
    const iniciarCruzamentoMotor = window.iniciarCruzamento;
    if (typeof iniciarCruzamentoMotor === 'function') {
        window.iniciarCruzamento = async function (...args) {
            const minhaGeracao = ++geracaoDiagnostico;
            const retorno = await iniciarCruzamentoMotor.apply(this, args);
            setTimeout(() => executarDiagnosticoAutomatico(minhaGeracao), 0);
            return retorno;
        };
    }

    window.ConciliadorArquitetura = Object.freeze({
        versao: VERSAO_ARQUITETURA,
        pipeline: Object.freeze(['A×A', 'B×B', 'A×B', 'VALIDAÇÃO']),
        resolverCanonico,
        consolidarLadoReferencia,
        conciliarConsolidados,
        compararLadoComMotor,
        compararCruzamentoComMotor,
        validarAgora: async () => {
            ultimoDiagnostico = await validarEstrutura({ cooperativo: true });
            return ultimoDiagnostico;
        },
        obterUltimoDiagnostico: () => ultimoDiagnostico,
        obterResumoBackup: resumoBackup,
        rastrearGrupo
    });
})();
