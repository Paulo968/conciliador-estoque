// Conciliador PRO v10.5 — integridade conservadora da memória e versionamento do backup
// Esta camada NÃO altera regras de correspondência do motor e NÃO remove A -> A.
(() => {
    'use strict';

    const BACKUP_VERSION = '10.5-arquitetura-auditavel';

    function higienizarDicionario(origem) {
        const entrada = origem && typeof origem === 'object' && !Array.isArray(origem) ? origem : {};
        const preservado = {};
        let autoapontamentosPreservados = 0;
        let entradasInvalidasRemovidas = 0;

        Object.entries(entrada).forEach(([chave, destino]) => {
            if (typeof destino !== 'string' || !destino.trim()) {
                entradasInvalidasRemovidas++;
                return;
            }

            // A -> A pode representar uma decisão/marca operacional válida no histórico.
            // Portanto é contado para diagnóstico, mas NUNCA removido automaticamente.
            if (chave === destino) autoapontamentosPreservados++;

            preservado[chave] = destino;
        });

        return {
            dicionario: preservado,
            autoapontamentosPreservados,
            entradasInvalidasRemovidas,
            totalAntes: Object.keys(entrada).length,
            totalDepois: Object.keys(preservado).length
        };
    }

    function contarCiclos(dicionario) {
        const ciclos = new Set();
        const finalizados = new Set();

        Object.keys(dicionario || {}).forEach(inicio => {
            if (finalizados.has(inicio)) return;

            const caminho = [];
            const posicoes = new Map();
            let atual = inicio;

            while (atual && dicionario[atual] && !finalizados.has(atual)) {
                // Autoapontamento é tratado como terminal válido, não como ciclo problemático.
                if (dicionario[atual] === atual) {
                    caminho.push(atual);
                    break;
                }

                if (posicoes.has(atual)) {
                    const ciclo = caminho.slice(posicoes.get(atual));
                    if (ciclo.length > 1) ciclos.add([...ciclo].sort().join('\u0000'));
                    break;
                }

                posicoes.set(atual, caminho.length);
                caminho.push(atual);
                atual = dicionario[atual];
            }

            caminho.forEach(item => finalizados.add(item));
        });

        return ciclos.size;
    }

    function listaSegura(valor) {
        if (!Array.isArray(valor)) return [];
        return [...new Set(valor.filter(item => typeof item === 'string' && item.trim()))];
    }

    function objetoSeguro(valor, fallback = {}) {
        return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : fallback;
    }

    function higienizarMemoriaAtual() {
        const resultado = higienizarDicionario(dicionarioMescla);

        // Só elimina entradas tecnicamente inválidas; nunca elimina A -> A nem A -> B.
        if (resultado.entradasInvalidasRemovidas) {
            dicionarioMescla = resultado.dicionario;
            localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
        }

        return resultado;
    }

    function relatorioIntegridade() {
        const higiene = higienizarDicionario(dicionarioMescla);
        return {
            entradasDicionario: Object.keys(higiene.dicionario).length,
            autoapontamentosPreservados: higiene.autoapontamentosPreservados,
            entradasInvalidas: higiene.entradasInvalidasRemovidas,
            ciclosDetectados: contarCiclos(higiene.dicionario),
            exclusoesA: Array.isArray(exclusoes?.A) ? exclusoes.A.length : 0,
            exclusoesB: Array.isArray(exclusoes?.B) ? exclusoes.B.length : 0,
            rejeicoesIA: Array.isArray(rejeicoesIA) ? rejeicoesIA.length : 0,
            observacoes: observacoes && typeof observacoes === 'object' ? Object.keys(observacoes).length : 0
        };
    }

    function baixarJSON(conteudo, nomeArquivo) {
        const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    // Substitui apenas a camada de exportação. Nenhuma regra/memória válida do motor é tocada.
    window.exportarBackup = function () {
        const higiene = higienizarMemoriaAtual();
        const integridade = relatorioIntegridade();

        const backup = {
            versao: BACKUP_VERSION,
            geradoEm: new Date().toISOString(),
            dicionarioMescla,
            exclusoes,
            rejeicoesIA,
            observacoes,
            familias: JSON.parse(localStorage.getItem('familiasV1') || '{}'),
            integridade: {
                ...integridade,
                entradasInvalidasRemovidasNestaExportacao: higiene.entradasInvalidasRemovidas
            },
            // A arquitetura v10.5 é carregada depois desta camada, mas na hora do clique já está disponível.
            arquitetura: window.ConciliadorArquitetura?.obterResumoBackup?.() || null
        };

        baixarJSON(backup, 'Inteligencia_Auditoria_PRO_Backup.json');
    };

    // Importa backups antigos e novos preservando integralmente A -> A e A -> B.
    window.processarImportacaoBackup = function (event) {
        const file = event?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const dados = JSON.parse(evt.target.result);
                const higiene = higienizarDicionario(dados.dicionarioMescla);

                dicionarioMescla = higiene.dicionario;
                exclusoes = {
                    A: listaSegura(dados.exclusoes?.A),
                    B: listaSegura(dados.exclusoes?.B)
                };
                rejeicoesIA = listaSegura(dados.rejeicoesIA);
                observacoes = objetoSeguro(dados.observacoes, {});

                localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
                localStorage.setItem('exclusoesV6', JSON.stringify(exclusoes));
                localStorage.setItem('rejeicoesIAV1', JSON.stringify(rejeicoesIA));
                localStorage.setItem('observacoesV1', JSON.stringify(observacoes));

                if (dados.familias && typeof dados.familias === 'object' && !Array.isArray(dados.familias)) {
                    localStorage.setItem('familiasV1', JSON.stringify(dados.familias));
                }

                mostrarNotificacao(
                    'Backup importado',
                    higiene.entradasInvalidasRemovidas
                        ? `Memória restaurada. ${higiene.entradasInvalidasRemovidas} entrada${higiene.entradasInvalidasRemovidas === 1 ? '' : 's'} tecnicamente inválida${higiene.entradasInvalidasRemovidas === 1 ? '' : 's'} foi/foram descartada${higiene.entradasInvalidasRemovidas === 1 ? '' : 's'}.`
                        : 'Memória restaurada integralmente com sucesso.'
                );
                setTimeout(() => location.reload(), 800);
            } catch (erro) {
                console.error(erro);
                mostrarNotificacao('Erro no backup', 'Arquivo inválido ou corrompido.');
            }
        };

        reader.readAsText(file);
    };

    // Diagnóstico conservador ao carregar: A -> A permanece intacto.
    const higieneInicial = higienizarMemoriaAtual();
    console.info(
        `[Conciliador PRO] Integridade: ${higieneInicial.autoapontamentosPreservados} autoapontamento(s) preservado(s), ${higieneInicial.entradasInvalidasRemovidas} entrada(s) inválida(s) removida(s).`
    );

    window.ConciliadorMemoria = Object.freeze({
        versaoBackup: BACKUP_VERSION,
        higienizarDicionario,
        contarCiclos,
        relatorioIntegridade
    });
})();
