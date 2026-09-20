        function mostrarFeedbackModal(stats, totalFinais, tempoMs) {
            let totalLidos = dadosRawA.length + dadosRawB.length;
            document.getElementById('fbTotalLidos').innerText = totalLidos.toLocaleString('pt-BR');
            document.getElementById('fbItensFinais').innerText = totalFinais.toLocaleString('pt-BR');
            document.getElementById('fbMemoria').innerText = (stats.unioesMemoria + stats.novasUnioes).toLocaleString('pt-BR');
            document.getElementById('fbTempo').innerText = (tempoMs / 1000).toFixed(2) + 's';

            let modal = document.getElementById('feedbackModal');
            let modalContent = document.getElementById('feedbackModalContent');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalContent.classList.replace('scale-95', 'scale-100');
            }, 10);
        }

        function fecharFeedbackModal() {
            let modal = document.getElementById('feedbackModal');
            let modalContent = document.getElementById('feedbackModalContent');
            modal.classList.add('opacity-0');
            modalContent.classList.replace('scale-100', 'scale-95');
            setTimeout(() => { modal.classList.add('hidden'); }, 300);
        }

        function renderizarMatriz(listaOrdenada, dictA, dictB) {
            const tbody = document.getElementById('tbodyMatriz');
            tbody.innerHTML = '';
            document.getElementById('areaTabela').classList.remove('hidden');
            
            let cTotal = 0, cOk = 0, cDiv = 0, cSoA = 0, cSoB = 0;
            dadosFiltradosMatriz = [];

            listaOrdenada.forEach((descFinal) => {
                let iA = dictA[descFinal];
                let iB = dictB[descFinal];
                let qA = iA ? iA.qtd : 0;
                let qB = iB ? iB.qtd : 0;
                let diff = normalizarNumero(qA - qB);
                
                let tp = "all";
                if (iA && iB && quantidadesIguais(qA, qB)) { cOk++; tp = "ok"; }
                else if (!iA) { cSoB++; tp = "sob"; }
                else if (!iB) { cSoA++; tp = "soa"; }
                else { cDiv++; tp = "div"; }
                cTotal++;

                const searchTxt = (iA?.descOriginal || "") + (iB?.descOriginal || "") + (iA?.codigo || "") + (iB?.codigo || "");
                if (filtroBusca && !searchTxt.toUpperCase().includes(filtroBusca.toUpperCase())) return;

                const matchFiltro = (filtroStatus === 'all') || (tp === filtroStatus) || (filtroStatus === 'sobras' && (tp === 'soa' || tp === 'sob'));
                if (matchFiltro) {
                    dadosFiltradosMatriz.push({ descFinal, iA, iB, qA, qB, diff, tp });
                }
            });

            document.getElementById('kpiTotal').innerText = cTotal;
            document.getElementById('kpiOk').innerText = cOk;
            document.getElementById('kpiDiv').innerText = cDiv;
            document.getElementById('kpiSobras').innerText = cSoA + cSoB;
            document.getElementById('kpiSoA').innerText = cSoA;
            document.getElementById('kpiSoB').innerText = cSoB;

            // Renderiza primeira página
            renderizarPaginaMatriz(0, Math.min(dadosFiltradosMatriz.length, paginaAtual * limiteExibicao));
            
            // Gerencia botão de carregar mais
            const btnContainer = document.getElementById('btnCarregarMaisContainer');
            if (dadosFiltradosMatriz.length > paginaAtual * limiteExibicao) {
                btnContainer.classList.remove('hidden');
            } else {
                btnContainer.classList.add('hidden');
            }
        }

        function renderizarPaginaMatriz(inicio, fim) {
            const tbody = document.getElementById('tbodyMatriz');
            const fragmento = document.createDocumentFragment();
            
            for (let idx = inicio; idx < fim; idx++) {
                const item = dadosFiltradosMatriz[idx];
                const { descFinal, iA, iB, qA, qB, diff, tp } = item;
                
                let stIcon = "";
                if (tp === 'ok') { stIcon = `<span class="badge badge-ok scale-90 md:scale-100 origin-center">Bateu</span>`; }
                else if (tp === 'sob') { stIcon = `<span class="badge badge-falta scale-90 md:scale-100 origin-center">Só no B</span>`; }
                else if (tp === 'soa') { stIcon = `<span class="badge badge-sobra scale-90 md:scale-100 origin-center">Só no A</span>`; }
                else { stIcon = `<span class="badge badge-sobra scale-90 md:scale-100 origin-center">${formatarQuantidade(Math.abs(diff))} Diferença</span>`; }
                const temObservacao = Boolean(obterObservacao(descFinal)?.texto);
                const chaveObservacaoCodificada = encodeURIComponent(descFinal);

                let tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 row-item transition-colors";
                tr.setAttribute('data-status', tp);
                tr.id = `row-${idx}`;
                
                const temMescla = dicionarioMescla[descFinal] || Object.values(dicionarioMescla).includes(descFinal);

                let btnDesfazer = temMescla
                    ? `<button
                            onclick="removerMescla('${esc(descFinal)}')"
                            class="btn-acao w-7 h-7 md:w-9 md:h-9 text-[10px] md:text-sm text-amber-500"
                            title="Desfazer união e bloquear IA">
                            ↩️
                       </button>`
                    : '';

                let acA = iA ? `
                    <div class="flex gap-1 justify-center">
                        <button
                            onclick="cliqueBotaoCorrelacionar('${esc(descFinal)}', 'row-${idx}')"
                            class="btn-acao w-7 h-7 md:w-9 md:h-9 text-[10px] md:text-sm"
                            title="Unir produto">
                            🔗
                        </button>

                        ${btnDesfazer}

                        <button
                            onclick="excluirManual('${esc(descFinal)}', 'A')"
                            class="btn-acao w-7 h-7 md:w-9 md:h-9 text-[10px] md:text-sm text-rose-500"
                            title="Excluir do Lado A">
                            🗑️
                        </button>
                    </div>` : '';

                let acB = iB ? `
                    <div class="flex gap-1 justify-center">
                        <button
                            onclick="cliqueBotaoCorrelacionar('${esc(descFinal)}', 'row-${idx}')"
                            class="btn-acao w-7 h-7 md:w-9 md:h-9 text-[10px] md:text-sm"
                            title="Unir produto">
                            🔗
                        </button>

                        ${btnDesfazer}

                        <button
                            onclick="excluirManual('${esc(descFinal)}', 'B')"
                            class="btn-acao w-7 h-7 md:w-9 md:h-9 text-[10px] md:text-sm text-rose-500"
                            title="Excluir do Lado B">
                            🗑️
                        </button>
                    </div>` : '';

                tr.innerHTML = `
                    <td class="p-1 md:p-3 align-middle">${acA}</td>
                    <td class="p-1 md:p-3 align-middle">
                        <div class="flex flex-wrap items-center gap-1 mb-0.5 md:mb-1">
                            <span class="text-[8px] md:text-[9px] text-indigo-600 dark:text-indigo-400 font-black px-1 md:px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-100 dark:border-indigo-800/50">${iA ? escapeHTML(iA.codigo) : '-'}</span>
                            <span class="text-[8px] md:text-[9px] text-slate-500 font-bold">${iA ? escapeHTML(iA.um) : '-'}</span>
                        </div>
                        <div class="font-bold text-[10px] md:text-sm text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 md:line-clamp-none md:truncate min-w-[120px] max-w-[150px] md:min-w-[220px] md:max-w-[280px]" title="${iA ? escapeHTML(iA.descOriginal) : '-'}">${iA ? escapeHTML(iA.descOriginal) : '-'}</div>
                    </td>
                    <td class="p-1 md:p-3 text-center align-middle font-black text-[11px] md:text-base border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">${iA ? iA.qtd : '-'}</td>
                    <td class="p-1 md:p-3 text-center align-middle bg-slate-50/80 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">
                        <button onclick="abrirModalObservacao('${chaveObservacaoCodificada}')" class="status-clicavel ${temObservacao ? 'status-com-observacao' : ''}" title="${temObservacao ? 'Clique para ver ou editar a observação' : 'Clique para adicionar uma observação'}" aria-label="Abrir observação do status">
                            ${stIcon}
                        </button>
                    </td>
                    <td class="p-1 md:p-3 text-center align-middle font-black text-[11px] md:text-base bg-slate-50/30 dark:bg-slate-800/20">${iB ? iB.qtd : '-'}</td>
                    <td class="p-1 md:p-3 align-middle">
                        <div class="flex flex-wrap items-center gap-1 mb-0.5 md:mb-1">
                            <span class="text-[8px] md:text-[9px] text-blue-600 dark:text-blue-400 font-black px-1 md:px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800/50">${iB ? escapeHTML(iB.codigo) : '-'}</span>
                            <span class="text-[8px] md:text-[9px] text-slate-500 font-bold">${iB ? escapeHTML(iB.um) : '-'}</span>
                        </div>
                        <div class="font-bold text-[10px] md:text-sm text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 md:line-clamp-none md:truncate min-w-[120px] max-w-[150px] md:min-w-[220px] md:max-w-[280px]" title="${iB ? escapeHTML(iB.descOriginal) : '-'}">${iB ? escapeHTML(iB.descOriginal) : '-'}</div>
                    </td>
                    <td class="p-1 md:p-3 align-middle">${acB}</td>
                `;
                fragmento.appendChild(tr);
            }
            tbody.appendChild(fragmento);
        }

        function carregarMaisItens() {
            const inicio = paginaAtual * limiteExibicao;
            paginaAtual++;
            const fim = Math.min(dadosFiltradosMatriz.length, paginaAtual * limiteExibicao);
            
            renderizarPaginaMatriz(inicio, fim);
            
            const btnContainer = document.getElementById('btnCarregarMaisContainer');
            if (dadosFiltradosMatriz.length > paginaAtual * limiteExibicao) {
                btnContainer.classList.remove('hidden');
            } else {
                btnContainer.classList.add('hidden');
            }
        }

        function aplicarFiltro(tipo) {
            filtroStatus = tipo;
            document.querySelectorAll('.card-kpi').forEach(c => c.classList.remove('ring-2', 'ring-indigo-500', 'active', 'scale-105'));
            const card = document.getElementById(`card-${tipo}`); if(card) card.classList.add('ring-2', 'ring-indigo-500', 'active', 'scale-105');
            
            paginaAtual = 1; // Reseta paginação
            renderizarMatriz(processedData.listaFinal, processedData.dictA, processedData.dictB);
        }

        function debounceBusca() { clearTimeout(window.searchT); window.searchT = setTimeout(() => { filtroBusca = document.getElementById('inputBusca').value; paginaAtual = 1; renderizarMatriz(processedData.listaFinal, processedData.dictA, processedData.dictB); }, 300); }

        function exportarExcelResultado() {
            let dadosExport = [["STATUS", "COD A", "PRODUTO A", "QTD A", "COD B", "PRODUTO B", "QTD B", "DIFERENÇA", "OBSERVAÇÃO"]];
            const { dictA, dictB, listaFinal } = processedData;
            listaFinal.forEach(chave => {
                const iA = dictA[chave]; const iB = dictB[chave];
                const searchTxt = (iA?.descOriginal || "") + (iB?.descOriginal || "") + (iA?.codigo || "") + (iB?.codigo || "");
                if (filtroBusca && !searchTxt.toUpperCase().includes(filtroBusca.toUpperCase())) return;
                const qA = iA ? iA.qtd : 0; const qB = iB ? iB.qtd : 0;
                const diff = normalizarNumero(qA - qB);
                const currentStatus = iA && iB && quantidadesIguais(qA, qB) ? "ok" : (!iA ? "sob" : (!iB ? "soa" : "div"));
                let isMatch = (filtroStatus === 'all') || (currentStatus === filtroStatus) || (filtroStatus === 'sobras' && (currentStatus === 'soa' || currentStatus === 'sob'));
                if (!isMatch) return;
                const statusTexto = currentStatus === 'ok' ? "BATEU" : (currentStatus === 'sob' ? "SO NO B" : (currentStatus === 'soa' ? "SO NO A" : "DIVERGENCIA"));
                dadosExport.push([statusTexto, iA?.codigo || "-", iA?.descOriginal || "-", qA, iB?.codigo || "-", iB?.descOriginal || "-", qB, diff, obterObservacao(chave)?.texto || ""]);
            });
            const ws = XLSX.utils.aoa_to_sheet(dadosExport); const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Resultado Auditoria"); XLSX.writeFile(wb, `Auditoria_PRO_v10.2.xlsx`);
        }

        function abrirManual() { document.getElementById('manualModal').classList.remove('hidden'); }
        function fecharManual() { document.getElementById('manualModal').classList.add('hidden'); }
        function abrirGerenciador() { document.getElementById('regrasModal').classList.remove('hidden'); renderizarRegrasMescla(); renderizarListaExclusoes(); }
        function fecharGerenciador() { document.getElementById('regrasModal').classList.add('hidden'); }
        function mudarAba(aba) { let isM = aba === 'mesclas'; document.getElementById('conteudoMesclas').classList.toggle('hidden', !isM); document.getElementById('conteudoExclusoes').classList.toggle('hidden', isM); }
        function abrirConfirmacaoLimpeza() { document.getElementById('confirmModal').classList.remove('hidden'); }
        function fecharConfirmacao() { document.getElementById('confirmModal').classList.add('hidden'); }
        function executarLimpezaTotal() { 
            localStorage.removeItem('dadosRawAV1'); 
            localStorage.removeItem('dadosRawBV1');
            localStorage.removeItem('dicMesclaV6');
            localStorage.removeItem('exclusoesV6');
            localStorage.removeItem('rejeicoesIAV1');
            localStorage.removeItem('familiasV1');
            localStorage.removeItem('observacoesV1');
            dadosRawA = []; dadosRawB = [];
            location.reload(); 
        }

        function lerArquivoExcel(file, idLado) { 
            // Validação: verifica se é o mesmo arquivo do outro lado
            const outroLado = idLado === 'A' ? 'B' : 'A';
            const inputOutro = document.getElementById('file' + outroLado);
            if (inputOutro.files[0] && inputOutro.files[0].name === file.name && inputOutro.files[0].size === file.size) {
                mostrarNotificacao("Aviso", "Este arquivo ja foi carregado no Lado " + outroLado + ". Use arquivos diferentes.");
                return;
            }
            
            const loader = document.getElementById('loading' + idLado); loader.classList.remove('hidden');
            const r = new FileReader(); 
            r.onload = function(e) { 
                try {
                    const w = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); 
                    const rows = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1, defval: ""});
                    let pad = classificarEExtrairDados(rows, idLado);
                    if (idLado === 'A') { 
                        dadosRawA = pad; 
                    } else { 
                        dadosRawB = pad; 
                    }
                    mostrarNotificacao("Sucesso", "Ficheiro lido: " + pad.length + " itens.");
                } catch (err) { mostrarNotificacao("Erro", "Ficheiro corrompido ou formato inválido."); }
                finally { loader.classList.add('hidden'); }
            }; r.readAsArrayBuffer(file); 
        }
        document.getElementById('fileA').addEventListener('change', e => lerArquivoExcel(e.target.files[0], 'A'));
        document.getElementById('fileB').addEventListener('change', e => lerArquivoExcel(e.target.files[0], 'B'));

