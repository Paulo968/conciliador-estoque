// Conciliador PRO v10.4 — higiene segura da memória e versionamento do backup
// Esta camada NÃO altera regras de correspondência do motor.
(() => {
    'use strict';

    const BACKUP_VERSION = '10.4-motor-confiavel-performance-theme';

    function higienizarDicionario(origem) {
        const entrada = origem && typeof origem === 'object' && !Array.isArray(origem) ? origem : {};
        const limpo = {};
        let autoapontamentosRemovidos = 0;
        let entradasInvalidasRemovidas = 0;

        Object.entries(entrada).forEach(([chave, destino]) => {
            if (typeof destino !== 'string' || !destino.trim()) {
                entradasInvalidasRemovidas++;
                return;
            }

            // A -> A não muda o resultado de aplicarDicionario e só ocupa memória.
            if (chave === destino) {
                autoapontamentosRemovidos++;
                return;
            }

            limpo[chave] = destino;
        });

        return {
            dicionario: limpo,
            autoapontamentosRemovidos,
            entradasInvalidasRemovidas,
            totalAntes: Object.keys(entrada).length,
            totalDepois: Object.keys(limpo).length
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
                if (posicoes.has(atual)) {
                    const ciclo = caminho.slice(posicoes.get(atual));
                    if (ciclo.length > 1) {
                        ciclos.add([...ciclo].sort().join('\u0000'));
                    }
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

        if (resultado.autoapontamentosRemovidos || resultado.entradasInvalidasRemovidas) {
            dicionarioMescla = resultado.dicionario;
            localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
        }

        return resultado;
    }

    function relatorioIntegridade() {
        const higiene = higienizarDicionario(dicionarioMescla);
        return {
            mesclasReais: Object.keys(higiene.dicionario).length,
            autoapontamentos: higiene.autoapontamentosRemovidos,
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

    // Substitui apenas a camada de exportação. Nenhuma regra do motor é tocada.
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
                redundanciasRemovidasNestaExportacao:
                    higiene.autoapontamentosRemovidos + higiene.entradasInvalidasRemovidas
            }
        };

        baixarJSON(backup, 'Inteligencia_Auditoria_PRO_Backup.json');
    };

    // Importa backups antigos e novos. Só remove redundâncias sem efeito operacional.
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

                const removidos = higiene.autoapontamentosRemovidos + higiene.entradasInvalidasRemovidas;
                mostrarNotificacao(
                    'Backup importado',
                    removidos
                        ? `Memória restaurada com sucesso. ${removidos} redundância${removidos === 1 ? '' : 's'} sem efeito foram removidas.`
                        : 'Memória restaurada com sucesso.'
                );
                setTimeout(() => location.reload(), 800);
            } catch (erro) {
                console.error(erro);
                mostrarNotificacao('Erro no backup', 'Arquivo inválido ou corrompido.');
            }
        };

        reader.readAsText(file);
    };

    // Faz a limpeza segura uma vez ao carregar a aplicação.
    const higieneInicial = higienizarMemoriaAtual();
    if (higieneInicial.autoapontamentosRemovidos || higieneInicial.entradasInvalidasRemovidas) {
        console.info(
            `[Conciliador PRO] Memória higienizada: ${higieneInicial.autoapontamentosRemovidos} autoapontamentos e ${higieneInicial.entradasInvalidasRemovidas} entradas inválidas removidas.`
        );
    }

    window.ConciliadorMemoria = Object.freeze({
        versaoBackup: BACKUP_VERSION,
        higienizarDicionario,
        contarCiclos,
        relatorioIntegridade
    });
})();
