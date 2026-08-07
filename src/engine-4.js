        function cliqueBotaoCorrelacionar(p, tr) {
            if (!produtoAguardandoCorrelacao) {
                produtoAguardandoCorrelacao = p;
                idLinhaAguardando = tr;

                document.getElementById(tr).classList.add('linha-selecionada');
                document.getElementById('nomeSelecionado').innerText = p;
                document.getElementById('barraCorrelação').classList.replace('opacity-0', 'opacity-100');
                document.getElementById('barraCorrelação').classList.replace('-translate-y-32', 'translate-y-0');
            } else {
                let o = produtoAguardandoCorrelacao;

                if (o !== p) {
                    migrarObservacoesParaChave([o, p], p);
                    dicionarioMescla[o] = p;

                    // Se o usuário uniu manualmente, remove possível bloqueio anterior desse par
                    const hashAB = criarHashRejeicao(o, p);
                    const hashBA = criarHashRejeicao(p, o);
                    rejeicoesIA = rejeicoesIA.filter(h => h !== hashAB && h !== hashBA);

                    localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
                    localStorage.setItem('rejeicoesIAV1', JSON.stringify(rejeicoesIA));

                    mostrarNotificacao('🔗 União criada', 'Regra manual salva na memória.');
                }

                cancelarCorrelacao();
                iniciarCruzamento();
            }
        }
        function cancelarCorrelacao() { if (idLinhaAguardando && document.getElementById(idLinhaAguardando)) document.getElementById(idLinhaAguardando).classList.remove('linha-selecionada'); produtoAguardandoCorrelacao = null; document.getElementById('barraCorrelação').classList.replace('opacity-100', 'opacity-0'); document.getElementById('barraCorrelação').classList.replace('translate-y-0', '-translate-y-32'); }
        function excluirManual(p, l) { if (!exclusoes[l].includes(p)) { exclusoes[l].push(p); localStorage.setItem('exclusoesV6', JSON.stringify(exclusoes)); } iniciarCruzamento(); }
        function renderizarRegrasMescla() {
            let tbody = document.getElementById('tbodyRegras');
            tbody.innerHTML = '';

            const chaves = Object.keys(dicionarioMescla);

            if (chaves.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td class="p-6 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                            Nenhuma união ativa no momento.
                        </td>
                    </tr>
                `;
                return;
            }

            chaves.forEach(o => {
                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div class="flex flex-col gap-1">
                            <span class="text-slate-400 uppercase text-[9px] tracking-widest">Origem</span>
                            <span>${escapeHTML(o)}</span>
                            <span class="text-indigo-500 font-black">➔ ${escapeHTML(dicionarioMescla[o])}</span>
                        </div>
                    </td>
                    <td class="p-3 text-right align-middle">
                        <button
                            onclick="removerMescla('${esc(o)}')"
                            class="text-red-500 hover:text-red-700 font-black uppercase text-[10px] transition-colors bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                            Desfazer e Bloquear IA
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        function renderizarListaExclusoes() {
            let tbA = document.getElementById('tbodyExcluidosA');
            let tbB = document.getElementById('tbodyExcluidosB');
            tbA.innerHTML = '';
            tbB.innerHTML = '';
            exclusoes.A.forEach(item => {
                tbA.innerHTML += `<tr><td class="p-3 text-xs flex justify-between font-bold dark:text-slate-300">${escapeHTML(item)} <button onclick="restaurarExclusao('${esc(item)}', 'A')" class="text-indigo-500 font-black transition-colors">VOLTAR</button></td></tr>`;
            });
            exclusoes.B.forEach(item => {
                tbB.innerHTML += `<tr><td class="p-3 text-xs flex justify-between font-bold dark:text-slate-300">${escapeHTML(item)} <button onclick="restaurarExclusao('${esc(item)}', 'B')" class="text-indigo-500 font-black transition-colors">VOLTAR</button></td></tr>`;
            });
        }
        function removerMescla(o) {
            let origemReal = o;

            // Se o item clicado for o destino/canônico, encontra uma origem que aponta para ele
            if (!dicionarioMescla[origemReal]) {
                origemReal = Object.keys(dicionarioMescla).find(chave => dicionarioMescla[chave] === o);
            }

            const destino = dicionarioMescla[origemReal];

            if (!origemReal || !destino) {
                mostrarNotificacao('Aviso', 'Essa união não existe mais na memória.');
                renderizarRegrasMescla();
                iniciarCruzamento();
                return;
            }

            const grupo = obterGrupoMescla(origemReal);
            replicarObservacaoParaGrupo(grupo, destino);

            // Ensina a IA que todos os itens desse grupo não devem ser unidos automaticamente de novo
            for (let i = 0; i < grupo.length; i++) {
                for (let j = i + 1; j < grupo.length; j++) {
                    salvarRejeicaoIA(grupo[i], grupo[j]);
                }
            }

            // Remove todas as entradas que fazem parte desse grupo
            Object.keys(dicionarioMescla).forEach(chave => {
                const valor = dicionarioMescla[chave];

                if (grupo.includes(chave) || grupo.includes(valor)) {
                    delete dicionarioMescla[chave];
                }
            });

            localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));

            renderizarRegrasMescla();
            iniciarCruzamento();

            mostrarNotificacao(
                '↩️ União desfeita',
                'A união foi removida e a IA aprendeu a não repetir esse cruzamento.'
            );
        }
        function restaurarExclusao(i, l) { exclusoes[l] = exclusoes[l].filter(x => x !== i); localStorage.setItem('exclusoesV6', JSON.stringify(exclusoes)); renderizarListaExclusoes(); iniciarCruzamento(); }
        function exportarBackup() {
            const backup = {
                versao: "10.2-motor-confiavel-observacoes",
                geradoEm: new Date().toISOString(),
                dicionarioMescla,
                exclusoes,
                rejeicoesIA,
                observacoes,
                familias: JSON.parse(localStorage.getItem('familiasV1') || '{}')
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "Inteligencia_Auditoria_PRO_Backup.json";
            a.click();
        }
        function processarImportacaoBackup(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = evt => {
                try {
                    const d = JSON.parse(evt.target.result);

                    dicionarioMescla = d.dicionarioMescla || {};
                    exclusoes = d.exclusoes || {"A":[],"B":[]};
                    rejeicoesIA = d.rejeicoesIA || [];
                    observacoes = d.observacoes || {};

                    localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
                    localStorage.setItem('exclusoesV6', JSON.stringify(exclusoes));
                    localStorage.setItem('rejeicoesIAV1', JSON.stringify(rejeicoesIA));
                    localStorage.setItem('observacoesV1', JSON.stringify(observacoes));

                    if (d.familias) {
                        localStorage.setItem('familiasV1', JSON.stringify(d.familias));
                    }

                    mostrarNotificacao('Backup importado', 'Memória restaurada com sucesso.');
                    setTimeout(() => location.reload(), 800);

                } catch (erro) {
                    console.error(erro);
                    mostrarNotificacao('Erro no backup', 'Arquivo inválido ou corrompido.');
                }
            };

            reader.readAsText(file);
        }

        function tokensComparaveis(nome) {
            return extrairFamilia(nome).split(' ')
                .filter(token => token.length > 2 && !unidadesLogisticas.includes(token));
        }

        function construirIndiceCandidatos(dict) {
            const indice = new Map();
            Object.keys(dict).forEach(nome => {
                tokensComparaveis(nome).forEach(token => {
                    if (!indice.has(token)) indice.set(token, new Set());
                    indice.get(token).add(nome);
                });
            });
            return indice;
        }

        async function buscarSugestoesIA() {
            const container = document.getElementById('aiSugestoesLista');
            mesclasEmLote = {};
            document.getElementById('aiModal').classList.remove('hidden');
            container.innerHTML = '<p class="p-8 text-center text-indigo-600 font-black animate-pulse uppercase tracking-widest text-sm">IA analisando candidatos seguros...</p>';

            const dictA = estruturarLado(dadosRawA, 'A');
            const dictB = estruturarLado(dadosRawB, 'B');
            const nomesA = Object.keys(dictA);
            const nomesB = Object.keys(dictB);
            const indiceB = construirIndiceCandidatos(dictB);
            const suggestions = [];
            const paresVistos = new Set();

            for (let indiceA = 0; indiceA < nomesA.length; indiceA++) {
                const itemA = nomesA[indiceA];
                const candidatos = new Set();
                tokensComparaveis(itemA).forEach(token => {
                    (indiceB.get(token) || []).forEach(itemB => candidatos.add(itemB));
                });

                // Em listas pequenas, mantém uma rede de segurança para erros de digitação sem palavra idêntica.
                if (!candidatos.size && nomesB.length <= 500) {
                    nomesB.forEach(itemB => {
                        if (itemA[0] === itemB[0]) candidatos.add(itemB);
                    });
                }

                candidatos.forEach(itemB => {
                    if (itemA === itemB || aplicarDicionario(itemA) === aplicarDicionario(itemB)) return;
                    const par = [itemA, itemB].sort().join('\u0000');
                    if (paresVistos.has(par)) return;
                    paresVistos.add(par);

                    const hashAB = criarHashRejeicao(itemA, itemB);
                    const hashBA = criarHashRejeicao(itemB, itemA);
                    if (rejeicoesIA.includes(hashAB) || rejeicoesIA.includes(hashBA)) return;

                    const avaliacao = avaliarCorrespondencia(itemA, itemB, dictA[itemA], dictB[itemB]);
                    if (avaliacao.nivel === 'sugestao') suggestions.push({ itemA, itemB, ...avaliacao });
                });

                if (indiceA % 25 === 0) {
                    container.innerHTML = `<p class="p-8 text-center text-indigo-600 font-black uppercase tracking-widest text-sm">Analisando ${indiceA + 1} de ${nomesA.length}...</p>`;
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            const melhores = suggestions.sort((a, b) => b.score - a.score).slice(0, 300);
            container.innerHTML = melhores.length ? '' : '<p class="p-8 text-center text-slate-400 py-6 font-bold uppercase tracking-widest text-xs">Nenhuma nova variação pendente encontrada.</p>';
            melhores.forEach((s, idx) => {
                const d = document.createElement('div');
                d.id = `card-sug-${idx}`;
                d.className = 'bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl flex justify-between items-center gap-4 border border-slate-100 dark:border-slate-700 transition-all duration-300';
                d.innerHTML = `
                    <div class="text-xs font-bold leading-relaxed flex-1">
                        Lado A: ${escapeHTML(s.itemA)}<br>Lado B: ${escapeHTML(s.itemB)}<br>
                        <span class="text-indigo-500 font-black text-[10px]">CONFIANÇA: ${Math.round(s.score * 100)}%</span><br>
                        <span class="text-slate-400 text-[9px]">${escapeHTML(s.motivos.join(' • '))}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="rejeitarSugestaoIA('${esc(s.itemA)}', '${esc(s.itemB)}', 'card-sug-${idx}')" class="w-10 h-10 bg-white dark:bg-slate-700 border border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-2xl font-black text-lg hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors flex items-center justify-center" title="Rejeitar e nunca mais sugerir">✕</button>
                        <button id="b-at-${idx}" onclick="agendarMesclaLote('${esc(s.itemA)}', '${esc(s.itemB)}', 'b-at-${idx}')" class="bg-white dark:bg-slate-700 border dark:border-slate-600 px-6 h-10 rounded-2xl font-black text-[10px] transition-colors uppercase flex items-center justify-center">Unir</button>
                    </div>`;
                container.appendChild(d);
            });
        }

        function rejeitarSugestaoIA(a, b, cardId) {
            salvarRejeicaoIA(a, b);

            if (mesclasEmLote[a]) delete mesclasEmLote[a];
            
            let card = document.getElementById(cardId);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            }

            mostrarNotificacao(
                '🧠 IA Treinada',
                'Sugestão bloqueada nos dois sentidos. A IA não vai insistir nesse cruzamento.'
            );
        }

        function agendarMesclaLote(a, b, id) { let btn = document.getElementById(id); if (mesclasEmLote[a]) { delete mesclasEmLote[a]; btn.className = "bg-white dark:bg-slate-700 border dark:border-slate-600 px-6 h-10 rounded-2xl font-black text-[10px] shrink-0 transition-colors uppercase flex items-center justify-center"; btn.innerText="Unir"; } else { mesclasEmLote[a] = b; btn.className = "bg-emerald-600 text-white px-6 h-10 rounded-2xl font-black text-[10px] shrink-0 shadow-lg transition-colors uppercase flex items-center justify-center"; btn.innerText="Selecionado"; } }
        function aplicarMesclasEmLote() {
            const total = Object.keys(mesclasEmLote).length;

            if (total === 0) {
                mostrarNotificacao('Aviso', 'Nenhuma sugestão selecionada para unir.');
                return;
            }

            Object.keys(mesclasEmLote).forEach(a => {
                const b = mesclasEmLote[a];

                migrarObservacoesParaChave([a, b], b);
                dicionarioMescla[a] = b;

                // Se antes esse par estava rejeitado, remove a rejeição,
                // porque o usuário confirmou manualmente que quer unir.
                const hashAB = criarHashRejeicao(a, b);
                const hashBA = criarHashRejeicao(b, a);

                rejeicoesIA = rejeicoesIA.filter(h => h !== hashAB && h !== hashBA);
            });

            localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
            localStorage.setItem('rejeicoesIAV1', JSON.stringify(rejeicoesIA));

            mesclasEmLote = {};

            fecharModalIA();
            iniciarCruzamento();

            mostrarNotificacao(
                'Uniões aplicadas',
                `${total} união(ões) foram aplicadas com sucesso.`
            );
        }
        function fecharModalIA() { document.getElementById('aiModal').classList.add('hidden'); }

        // Notificar dados carregados da persistência
        // (Desativado: dados brutos agora ficam apenas na memória RAM para evitar QuotaExceededError)
    