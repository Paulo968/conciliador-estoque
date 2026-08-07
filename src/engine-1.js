
        // --- ESTADO GLOBAL ---
        let processedData = { dictA: {}, dictB: {}, listaFinal: [] };
        let dadosRawA = []; // Alterado para memória para evitar QuotaExceededError (Limite 5MB)
        let dadosRawB = []; // Alterado para memória para evitar QuotaExceededError (Limite 5MB)
        let dicionarioMescla = JSON.parse(localStorage.getItem('dicMesclaV6')) || {};
        let exclusoes = JSON.parse(localStorage.getItem('exclusoesV6') || '{"A":[],"B":[]}');
        let rejeicoesIA = JSON.parse(localStorage.getItem('rejeicoesIAV1') || '[]'); // Memória de aprendizado negativo da IA
        let observacoes = JSON.parse(localStorage.getItem('observacoesV1') || '{}');
        let chaveObservacaoAtual = null;
        const PRECISAO_QUANTIDADE = 6;
        const TOLERANCIA_QUANTIDADE = 0.000001;
        const cacheNormalizacao = new Map();
        const cacheSimilaridade = new Map();
        /* EXCLUSÃO AUTOMÁTICA DESATIVADA - Agora exclusão é apenas manual via botão 🗑️
   const palavrasExcluidasFixas = ["BICO", "FILTRO"];
*/
const palavrasExcluidasFixas = []; // vazio = nenhuma exclusão automática 
        let produtoAguardandoCorrelacao = null; let idLinhaAguardando = null; 
        let filtroStatus = 'all'; let filtroBusca = '';
        let mesclasEmLote = {};
        let paginaAtual = 1;
        const limiteExibicao = 200;
        let dadosFiltradosMatriz = [];

        // 🟢 DICIONÁRIO GENÉRICO DE RUÍDO (Stopwords Comerciais)
        const stopwordsLogistica = [
            'DE', 'DO', 'DA', 'COM', 'C/', 'P/', 'PARA', 'E', 'OU', 
            'TROCA', 'BONUS', 'BRINDE', 'AMOSTRA', 'PROMOCAO', 'LOTE', 
            'VENC', 'VENCIDO', 'AVARIA', 'NOVO', 'VELHO', 'USO', 'CONSUMO'
        ];

        // --- HEURÍSTICA SEMÂNTICA ---
        function padronizarLinguagemLogistica(texto) {
            let t = texto;
            const sinonimos = {
                'LITRO': 'LT', 'LITROS': 'LT', 'L': 'LT', 'LT': 'LT', 'LTS': 'LT',
                'MILILITRO': 'ML', 'MILILITROS': 'ML', 'MILLILITRO': 'ML', 'MILLILITROS': 'ML', 'ML': 'ML', 'MLS': 'ML',
                'QUILO': 'KG', 'KILO': 'KG', 'KILOS': 'KG', 'QUILOS': 'KG', 'KG': 'KG', 'KGS': 'KG', 'K': 'KG',
                'GRAMAS': 'GR', 'GRAMA': 'GR', 'GR': 'GR', 'GRS': 'GR', 'G': 'GR',
                'UNIDADE': 'UN', 'UNIDADES': 'UN', 'UNID': 'UN', 'UNIDS': 'UN', 'UND': 'UN', 'UNS': 'UN', 'PC': 'UN', 'PCS': 'UN',
                'CAIXA': 'CX', 'CAIXAS': 'CX', 'CX': 'CX', 'CXS': 'CX',
                'SACO': 'SC', 'SACOS': 'SC', 'SC': 'SC', 'SCS': 'SC',
                'PACOTE': 'PCT', 'PACOTES': 'PCT', 'PACK': 'PCT', 'PCT': 'PCT', 'PCTS': 'PCT', 'PK': 'PCT',
                'KIT': 'KT', 'KITS': 'KT', 'KT': 'KT',
                'PAR': 'PR', 'PARES': 'PR', 'PR': 'PR',
                'GALAO': 'GL', 'GALOES': 'GL', 'GALÕES': 'GL', 'GL': 'GL', 'GLS': 'GL',
                'BALDE': 'BD', 'BALDES': 'BD', 'BD': 'BD',
                'FARDO': 'FD', 'FARDOS': 'FD', 'FD': 'FD',
                'TONELADA': 'TN', 'TONELADAS': 'TN', 'TON': 'TN', 'TN': 'TN', 'T': 'TN',
                'BAG': 'BAG', 'BAGS': 'BAG',
                'BIGBAG': 'BB', 'BIG BAG': 'BB', 'BIGBAGS': 'BB', 'BB': 'BB',
                'GRADE': 'GD', 'GRADES': 'GD', 'GD': 'GD',
                'FRASCO': 'FR', 'FRASCOS': 'FR', 'FR': 'FR',
                'POTE': 'PT', 'POTES': 'PT', 'PT': 'PT',
                'BISNAGA': 'BS', 'BISNAGAS': 'BS', 'BS': 'BS',
                'DISPLAY': 'DS', 'DISPLAYS': 'DS', 'DS': 'DS',
                'BOMBONA': 'BO', 'BOMBONAS': 'BO', 'BO': 'BO',
                'IBC': 'IBC', 'I.B.C': 'IBC', 'I.B.C.': 'IBC'
            };
            Object.keys(sinonimos).forEach(k => { t = t.replace(new RegExp('\\b' + k + '\\b', 'gi'), sinonimos[k]); });
            t = t.replace(/(\d+(?:[.,]\d+)?)\s+(LT|ML|KG|GR|UN|CX|SC|PCT|KT|PR|GL|BD|FD|TN|BAG|GD|FR|PT|BB|IBC|BS|DS|BO)\b/g, '$1$2');
            let palavras = t.split(' ');
            for (let i = 0; i < palavras.length; i++) {
                if (['LT', 'ML', 'KG', 'GR', 'UN', 'CX', 'SC', 'PCT', 'KT', 'PR', 'GL', 'BD', 'FD', 'TN', 'BAG', 'GD', 'FR', 'PT', 'BB', 'IBC', 'BS', 'DS', 'BO'].includes(palavras[i])) {
                    if (i === 0 || isNaN(parseFloat(palavras[i - 1]))) { palavras[i] = '1' + palavras[i]; }
                }
            }
            return palavras.join(' ');
        }

        function removerStopwords(texto) {
            let regexStopwords = new RegExp('\\b(' + stopwordsLogistica.join('|') + ')\\b', 'g');
            return texto.replace(regexStopwords, ' ').replace(/\s+/g, ' ').trim();
        }

        function normalizarTexto(texto) { 
            if (!texto) return "";
            const chaveCache = String(texto);
            if (cacheNormalizacao.has(chaveCache)) return cacheNormalizacao.get(chaveCache);
            let base = chaveCache.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); 
            base = base.replace(/[-_(){}[\]]/g, ' ').trim().replace(/\s+/g, ' ');
            base = removerStopwords(padronizarLinguagemLogistica(base));
            cacheNormalizacao.set(chaveCache, base);
            return base; 
        }

        function toggleDarkMode() {
            const html = document.documentElement;
            html.classList.add('theme-transition');
            html.classList.toggle('dark');
            localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
            setTimeout(() => html.classList.remove('theme-transition'), 250);
        }

        // --- MOTOR DE CORRESPONDÊNCIA CONFIÁVEL ---
        const unidadesLogisticas = ['LT','ML','KG','GR','UN','CX','SC','PCT','KT','PR','GL','BD','FD','TN','BAG','GD','FR','PT','BB','IBC','BS','DS','BO','MT','DZ'];

        function extrairNumeros(nome) {
            return (String(nome || '').match(/\d+(?:[.,/]\d+)?/g) || [])
                .map(v => v.replace(',', '.'))
                .join('|');
        }

        function extrairFamilia(nome) {
            let limpo = String(nome || '');
            limpo = limpo.replace(/\b(\d+(?:[.,/]\d+)?)\s*(LT|ML|KG|GR|UN|CX|PC|MT|SC|BD|GL|PCT|KT|PR|FD|TN|BAG|GD|FR|PT|BB|IBC|BS|DS|BO|DZ)\b/gi, '$2');
            limpo = limpo.replace(/\b(LTS?|KGS?|UNS?)\b/gi, '');
            return limpo.replace(/\s+/g, ' ').trim() || 'SEM_FAMILIA';
        }

        function extrairMedidas(nome) {
            const medidas = [];
            const regex = /(\d+(?:[.,]\d+)?)\s*(LT|ML|KG|GR|UN|CX|SC|PCT|KT|PR|GL|BD|FD|TN|BAG|GD|FR|PT|BB|IBC|BS|DS|BO|MT|DZ)\b/gi;
            let match;
            while ((match = regex.exec(String(nome || ''))) !== null) {
                const numero = match[1].replace(',', '.').replace(/^0+(?=\d)/, '');
                medidas.push(`${numero}${match[2].toUpperCase()}`);
            }
            return [...new Set(medidas)].sort();
        }

        function extrairUnidadesNome(nome) {
            const regex = new RegExp(`\\b(${unidadesLogisticas.join('|')})\\b`, 'gi');
            return [...new Set((String(nome || '').match(regex) || []).map(v => v.toUpperCase()))].sort();
        }

        function normalizarUnidadeMedida(um) {
            const unidade = normalizarTexto(um || 'UN').replace(/^1/, '');
            const equivalencias = { PC: 'UN', PCS: 'UN', UND: 'UN', UNID: 'UN', L: 'LT', K: 'KG', G: 'GR', TON: 'TN' };
            return equivalencias[unidade] || unidade || 'UN';
        }

        function detectarConflitoDeVarianteGenerico(nuc1, nuc2) {
            const w1 = String(nuc1 || '').split(' ').filter(Boolean);
            const w2 = String(nuc2 || '').split(' ').filter(Boolean);
            const exclusivosA = w1.filter(w => !w2.includes(w));
            const exclusivosB = w2.filter(w => !w1.includes(w));
            const emComum = w1.filter(w => w2.includes(w));
            if (emComum.length === 0 || exclusivosA.length === 0 || exclusivosB.length === 0) return false;

            const todosParecemErroDigitacao = exclusivosA.every(exA =>
                exclusivosB.some(exB => levenshtein(exA, exB) >= 0.78)
            );
            return !todosParecemErroDigitacao;
        }

        function detectarConflitoCritico(nomeA, nomeB, itemA = null, itemB = null) {
            const medidasA = extrairMedidas(nomeA);
            const medidasB = extrairMedidas(nomeB);
            if (medidasA.length && medidasB.length && medidasA.join('|') !== medidasB.join('|')) return true;

            const unidadesNomeA = extrairUnidadesNome(nomeA);
            const unidadesNomeB = extrairUnidadesNome(nomeB);
            if (unidadesNomeA.length && unidadesNomeB.length && unidadesNomeA.join('|') !== unidadesNomeB.join('|')) return true;

            if (itemA?.um && itemB?.um) {
                const umA = normalizarUnidadeMedida(itemA.um);
                const umB = normalizarUnidadeMedida(itemB.um);
                if (umA && umB && umA !== umB) return true;
            }

            const nuc1 = extrairFamilia(nomeA);
            const nuc2 = extrairFamilia(nomeB);
            return detectarConflitoDeVarianteGenerico(nuc1, nuc2);
        }

        function levenshtein(s1, s2) {
            s1 = String(s1 || '').toLowerCase();
            s2 = String(s2 || '').toLowerCase();
            if (s1 === s2) return 1;
            if (!s1.length || !s2.length) return 0;
            if (s1.length > s2.length) [s1, s2] = [s2, s1];

            let anterior = Array.from({ length: s1.length + 1 }, (_, i) => i);
            for (let j = 1; j <= s2.length; j++) {
                const atual = [j];
                for (let i = 1; i <= s1.length; i++) {
                    atual[i] = s1[i - 1] === s2[j - 1]
                        ? anterior[i - 1]
                        : Math.min(atual[i - 1] + 1, anterior[i] + 1, anterior[i - 1] + 1);
                }
                anterior = atual;
            }
            return 1 - (anterior[s1.length] / Math.max(s1.length, s2.length));
        }

        function calcularIntersecaoPalavras(s1, s2) {
            const arr1 = String(s1 || '').split(' ').filter(w => w.length > 2 && !unidadesLogisticas.includes(w));
            const arr2 = String(s2 || '').split(' ').filter(w => w.length > 2 && !unidadesLogisticas.includes(w));
            if (!arr1.length || !arr2.length) return 0;
            let matches = 0;
            const usados = new Set();
            for (const w1 of arr1) {
                for (let i = 0; i < arr2.length; i++) {
                    if (usados.has(i)) continue;
                    const w2 = arr2[i];
                    if (w1 === w2 || levenshtein(w1, w2) >= 0.78) {
                        matches++;
                        usados.add(i);
                        break;
                    }
                }
            }
            return (2 * matches) / (arr1.length + arr2.length);
        }

        function calcularScoreBase(s1, s2) {
            s1 = String(s1 || '');
            s2 = String(s2 || '');
            if (s1 === s2) return 1;
            if (s1.length < 2 || s2.length < 2) return levenshtein(s1, s2);
            const bigrams1 = new Map();
            for (let i = 0; i < s1.length - 1; i++) {
                const big = s1.slice(i, i + 2);
                bigrams1.set(big, (bigrams1.get(big) || 0) + 1);
            }
            let intersection = 0;
            for (let i = 0; i < s2.length - 1; i++) {
                const big = s2.slice(i, i + 2);
                const count = bigrams1.get(big) || 0;
                if (count > 0) {
                    intersection++;
                    bigrams1.set(big, count - 1);
                }
            }
            const denominador = s1.length + s2.length - 2;
            const bigramsScore = denominador > 0 ? (2 * intersection) / denominador : 0;
            return bigramsScore * 0.6 + levenshtein(s1, s2) * 0.4;
        }

        function calcularSimilaridade(s1, s2) {
            if (s1 === s2) return 1;
            const chaveCache = [s1, s2].sort().join('\u0000');
            if (cacheSimilaridade.has(chaveCache)) return cacheSimilaridade.get(chaveCache);

            if (detectarConflitoCritico(s1, s2)) {
                cacheSimilaridade.set(chaveCache, 0.1);
                return 0.1;
            }

            const nuc1 = extrairFamilia(s1);
            const nuc2 = extrairFamilia(s2);
            if (nuc1.length < 2 || nuc2.length < 2) return 0;

            const nums1 = extrairNumeros(s1);
            const nums2 = extrairNumeros(s2);
            const penalidadeNumerica = nums1 === nums2 ? 1 : 0.3;
            const scoreOriginal = calcularScoreBase(nuc1, nuc2);
            const scoreOrdenado = calcularScoreBase(nuc1.split(' ').sort().join(' '), nuc2.split(' ').sort().join(' '));
            let notaBase = Math.max(scoreOriginal, scoreOrdenado);
            if (nuc1.length > 4 && nuc2.length > 4 && (nuc1.includes(nuc2) || nuc2.includes(nuc1))) {
                notaBase = Math.max(notaBase, 0.9);
            }

            const palavrasEmComum = calcularIntersecaoPalavras(nuc1, nuc2);
            const penalidadeSemantica = palavrasEmComum === 0 ? 0.15 : (palavrasEmComum < 0.35 ? 0.75 : 1);
            const resultado = Math.max(0, Math.min(1, notaBase * penalidadeNumerica * penalidadeSemantica));
            cacheSimilaridade.set(chaveCache, resultado);
            return resultado;
        }

        function limparCodigo(codigo) {
            const c = String(codigo || '').trim().toUpperCase();
            return c && c !== '-' && c !== '0' ? c : '';
        }

        function avaliarCorrespondencia(nomeA, nomeB, itemA = null, itemB = null) {
            const conflito = detectarConflitoCritico(nomeA, nomeB, itemA, itemB);
            const score = conflito ? 0.1 : calcularSimilaridade(nomeA, nomeB);
            const palavras = calcularIntersecaoPalavras(extrairFamilia(nomeA), extrairFamilia(nomeB));
            const numsIguais = extrairNumeros(nomeA) === extrairNumeros(nomeB);
            const codA = limparCodigo(itemA?.codigo);
            const codB = limparCodigo(itemB?.codigo);
            const codigoIgual = Boolean(codA && codB && codA === codB);
            const quantidadeIgual = itemA && itemB ? quantidadesIguais(itemA.qtd, itemB.qtd) : false;

            let nivel = 'nenhum';
            if (!conflito && ((score >= 0.94 && palavras >= 0.65 && numsIguais) || (codigoIgual && score >= 0.82 && palavras >= 0.5))) {
                nivel = 'automatico';
            } else if (!conflito && score >= 0.62 && palavras >= 0.25) {
                nivel = 'sugestao';
            }

            const motivos = [];
            if (conflito) motivos.push('conflito de medida, unidade ou variante');
            if (codigoIgual) motivos.push('mesmo código');
            if (numsIguais) motivos.push('números compatíveis');
            if (quantidadeIgual) motivos.push('mesma quantidade (apenas evidência)');
            motivos.push(`${Math.round(score * 100)}% de afinidade`);
            return { score, palavras, conflito, codigoIgual, quantidadeIgual, nivel, motivos };
        }

        function registrarUniaoAutomatica(nomeA, nomeB) {
            const canon = nomeA.localeCompare(nomeB, 'pt-BR') <= 0 ? nomeA : nomeB;
            if (nomeA !== canon) dicionarioMescla[nomeA] = canon;
            if (nomeB !== canon) dicionarioMescla[nomeB] = canon;
            migrarObservacoesParaChave([nomeA, nomeB], canon);
            return canon;
        }

        function aprenderPadroes(dictA, dictB) {
            const familias = JSON.parse(localStorage.getItem('familiasV1') || '{}');
            const indiceB = new Map();
            let novosMatches = 0;

            Object.keys(dictB).forEach(nomeB => {
                const assinatura = `${extrairFamilia(nomeB).split(' ').sort().join(' ')}||${extrairNumeros(nomeB)}`;
                if (!indiceB.has(assinatura)) indiceB.set(assinatura, []);
                indiceB.get(assinatura).push(nomeB);
            });

            Object.keys(dictA).forEach(nomeA => {
                const familiaA = extrairFamilia(nomeA);
                if (familiaA === 'SEM_FAMILIA') return;
                const assinatura = `${familiaA.split(' ').sort().join(' ')}||${extrairNumeros(nomeA)}`;
                const candidatos = indiceB.get(assinatura) || [];

                candidatos.forEach(nomeB => {
                    if (nomeA === nomeB || dicionarioMescla[nomeA] || dicionarioMescla[nomeB]) return;
                    const hashAB = criarHashRejeicao(nomeA, nomeB);
                    const hashBA = criarHashRejeicao(nomeB, nomeA);
                    if (rejeicoesIA.includes(hashAB) || rejeicoesIA.includes(hashBA)) return;

                    const avaliacao = avaliarCorrespondencia(nomeA, nomeB, dictA[nomeA], dictB[nomeB]);
                    if (avaliacao.nivel !== 'automatico') return;

                    if (!familias[familiaA]) familias[familiaA] = [];
                    [nomeA, nomeB].forEach(nome => {
                        if (!familias[familiaA].includes(nome)) familias[familiaA].push(nome);
                    });
                    registrarUniaoAutomatica(nomeA, nomeB);
                    novosMatches++;
                });
            });

            if (novosMatches > 0) {
                localStorage.setItem('dicMesclaV6', JSON.stringify(dicionarioMescla));
                localStorage.setItem('familiasV1', JSON.stringify(familias));
            }
            return novosMatches;
        }

