// Memória v10.6 — rolagem da lixeira + contadores de exclusões e produtos ligados
(() => {
    function obterExclusoes() {
        if (typeof exclusoes === 'undefined' || !exclusoes) return { A: [], B: [] };
        return {
            A: Array.isArray(exclusoes.A) ? exclusoes.A : [],
            B: Array.isArray(exclusoes.B) ? exclusoes.B : []
        };
    }

    function obterResumoLigacoes() {
        const dicionario = typeof dicionarioMescla !== 'undefined' && dicionarioMescla && typeof dicionarioMescla === 'object'
            ? dicionarioMescla
            : {};
        const produtos = new Set();
        let ligacoes = 0;

        Object.entries(dicionario).forEach(([origem, destino]) => {
            if (typeof origem !== 'string' || !origem.trim()) return;
            if (typeof destino !== 'string' || !destino.trim()) return;

            ligacoes++;
            produtos.add(origem.trim());
            produtos.add(destino.trim());
        });

        return { produtos: produtos.size, ligacoes };
    }

    function prepararContadorLigacoes() {
        const aba = document.getElementById('abaMesclas');
        if (!aba) return;

        if (!document.getElementById('contadorLigacoesTotal')) {
            aba.innerHTML = `Uniões Ativas <span id="contadorLigacoesTotal" class="ml-1 inline-flex min-w-6 h-6 px-1.5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">0</span>`;
        }
    }

    function atualizarContadorLigacoes() {
        prepararContadorLigacoes();
        const resumo = obterResumoLigacoes();
        const contador = document.getElementById('contadorLigacoesTotal');
        if (!contador) return;

        contador.textContent = String(resumo.produtos);
        contador.title = `${resumo.produtos} produto${resumo.produtos === 1 ? '' : 's'} envolvido${resumo.produtos === 1 ? '' : 's'} em ${resumo.ligacoes} ligação${resumo.ligacoes === 1 ? '' : 'ões'} ativa${resumo.ligacoes === 1 ? '' : 's'}`;
        contador.setAttribute('aria-label', contador.title);
    }

    function prepararLixeira() {
        const container = document.getElementById('conteudoExclusoes');
        const aba = document.getElementById('abaExclusoes');
        if (!container || !aba) return;

        // O modal já possui altura limitada. A área da lixeira não rola como um bloco só:
        // cada lado recebe sua própria rolagem, mantendo o cabeçalho visível.
        container.classList.add('min-h-0');

        const colunas = Array.from(container.children).slice(0, 2);
        colunas.forEach((coluna, indice) => {
            coluna.classList.add('lixeira-coluna', 'min-h-0');
            const cabecalho = coluna.firstElementChild;
            if (!cabecalho) return;

            cabecalho.classList.add('lixeira-cabecalho', 'flex', 'items-center', 'justify-between', 'gap-2');
            const lado = indice === 0 ? 'A' : 'B';
            cabecalho.innerHTML = `
                <span>Lado ${lado}</span>
                <span id="contadorExcluidos${lado}" class="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[9px] font-black normal-case tracking-normal">0 excluídos</span>
            `;
        });

        if (!document.getElementById('contadorExclusoesTotal')) {
            aba.innerHTML = `Lixeira <span id="contadorExclusoesTotal" class="ml-1 inline-flex min-w-6 h-6 px-1.5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black">0</span>`;
        }
    }

    function preencherEstadoVazio(tbodyId, vazio) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody || !vazio || tbody.children.length) return;
        tbody.innerHTML = `
            <tr>
                <td class="p-6 text-center text-xs font-bold text-slate-400">
                    Nenhum item excluído manualmente.
                </td>
            </tr>
        `;
    }

    function atualizarContadoresLixeira() {
        prepararLixeira();
        const listas = obterExclusoes();
        const totalA = listas.A.length;
        const totalB = listas.B.length;
        const total = totalA + totalB;

        const contadorA = document.getElementById('contadorExcluidosA');
        const contadorB = document.getElementById('contadorExcluidosB');
        const contadorTotal = document.getElementById('contadorExclusoesTotal');

        if (contadorA) contadorA.textContent = `${totalA} excluído${totalA === 1 ? '' : 's'}`;
        if (contadorB) contadorB.textContent = `${totalB} excluído${totalB === 1 ? '' : 's'}`;
        if (contadorTotal) {
            contadorTotal.textContent = String(total);
            contadorTotal.title = `${total} item${total === 1 ? '' : 's'} excluído${total === 1 ? '' : 's'} manualmente`;
        }

        preencherEstadoVazio('tbodyExcluidosA', totalA === 0);
        preencherEstadoVazio('tbodyExcluidosB', totalB === 0);
    }

    // Complementa a renderização existente sem alterar as regras do motor.
    if (typeof window.renderizarListaExclusoes === 'function') {
        const renderizarOriginal = window.renderizarListaExclusoes;
        window.renderizarListaExclusoes = function (...args) {
            const retorno = renderizarOriginal.apply(this, args);
            atualizarContadoresLixeira();
            return retorno;
        };
    }

    if (typeof window.renderizarRegrasMescla === 'function') {
        const renderizarMesclasOriginal = window.renderizarRegrasMescla;
        window.renderizarRegrasMescla = function (...args) {
            const retorno = renderizarMesclasOriginal.apply(this, args);
            atualizarContadorLigacoes();
            return retorno;
        };
    }

    if (typeof window.excluirManual === 'function') {
        const excluirOriginal = window.excluirManual;
        window.excluirManual = function (...args) {
            const retorno = excluirOriginal.apply(this, args);
            atualizarContadoresLixeira();
            return retorno;
        };
    }

    const style = document.createElement('style');
    style.id = 'estilo-lixeira-v1021';
    style.textContent = `
        #conteudoExclusoes {
            min-height: 0;
            overflow: hidden !important;
        }
        #conteudoExclusoes .lixeira-coluna {
            overflow-y: auto !important;
            overscroll-behavior-y: contain;
            scrollbar-gutter: stable;
        }
        #conteudoExclusoes .lixeira-cabecalho {
            position: sticky;
            top: 0;
            z-index: 6;
        }
        @media (max-width: 767px) {
            #conteudoExclusoes .lixeira-coluna {
                min-height: 12rem;
            }
        }
    `;
    document.head.appendChild(style);

    prepararContadorLigacoes();
    prepararLixeira();
    atualizarContadorLigacoes();
    atualizarContadoresLixeira();
    window.atualizarContadorLigacoes = atualizarContadorLigacoes;
    window.atualizarContadoresLixeira = atualizarContadoresLixeira;
})();
