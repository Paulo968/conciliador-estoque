import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname, '..');

function criarClassList() {
  const valores = new Set();
  return {
    add: (...itens) => itens.forEach(item => valores.add(item)),
    remove: (...itens) => itens.forEach(item => valores.delete(item)),
    toggle: (item, forcar) => {
      if (forcar === true) { valores.add(item); return true; }
      if (forcar === false) { valores.delete(item); return false; }
      if (valores.has(item)) { valores.delete(item); return false; }
      valores.add(item); return true;
    },
    contains: item => valores.has(item),
    replace: (de, para) => { valores.delete(de); valores.add(para); }
  };
}

function criarElemento() {
  return {
    classList: criarClassList(),
    innerText: '',
    innerHTML: '',
    value: '',
    style: {},
    children: [],
    appendChild() {},
    remove() {},
    click() {},
    focus() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return criarElemento(); }
  };
}

function criarLocalStorage(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  return {
    getItem(chave) { return store.has(chave) ? store.get(chave) : null; },
    setItem(chave, valor) { store.set(chave, String(valor)); },
    removeItem(chave) { store.delete(chave); },
    clear() { store.clear(); },
    dump() { return Object.fromEntries(store); }
  };
}

function criarSandbox() {
  const localStorage = criarLocalStorage({
    dicMesclaV6: JSON.stringify({
      'CANONICO': 'CANONICO',
      'ORIGEM REAL': 'DESTINO REAL'
    }),
    exclusoesV6: JSON.stringify({ A: [], B: [] }),
    rejeicoesIAV1: JSON.stringify([]),
    observacoesV1: JSON.stringify({})
  });

  const elementos = new Map();
  const documento = {
    documentElement: criarElemento(),
    body: criarElemento(),
    addEventListener() {},
    querySelector() { return criarElemento(); },
    querySelectorAll() { return []; },
    createElement() { return criarElemento(); },
    createDocumentFragment() { return criarElemento(); },
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, criarElemento());
      return elementos.get(id);
    }
  };

  const sandbox = {
    console,
    localStorage,
    document: documento,
    performance,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: cb => setTimeout(cb, 0),
    cancelAnimationFrame: id => clearTimeout(id),
    location: { reload() {} },
    navigator: {},
    Blob: globalThis.Blob,
    URL: globalThis.URL,
    FileReader: class FileReader {},
    Map,
    Set,
    WeakMap,
    WeakSet,
    JSON,
    Math,
    Number,
    String,
    Array,
    Object,
    Date,
    RegExp,
    Intl,
    Promise,
    Error,
    encodeURIComponent,
    decodeURIComponent
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function carregarArquivo(contexto, relativo) {
  const codigo = fs.readFileSync(path.join(raiz, relativo), 'utf8');
  vm.runInContext(codigo, contexto, { filename: relativo });
}

function executar(contexto, expressao) {
  return vm.runInContext(expressao, contexto);
}

const sandbox = criarSandbox();
const contexto = vm.createContext(sandbox);

for (const arquivo of [
  'src/engine-1.js',
  'src/engine-2.js',
  'src/engine-3.js',
  'src/engine-4.js',
  'src/memory-integrity-v104.js',
  'src/architecture-v105.js'
]) {
  carregarArquivo(contexto, arquivo);
}

const testes = [];
function teste(nome, fn) { testes.push({ nome, fn }); }

teste('preserva número decimal nativo', () => {
  assert.equal(executar(contexto, 'normalizarNumero(1.234)'), 1.234);
});

teste('interpreta ponto e vírgula únicos como separadores decimais', () => {
  assert.equal(executar(contexto, 'normalizarNumero("1.234")'), 1.234);
  assert.equal(executar(contexto, 'normalizarNumero("1,234")'), 1.234);
});

teste('interpreta números com dois separadores mantendo a parte decimal', () => {
  assert.equal(executar(contexto, 'normalizarNumero("1.234,500")'), 1234.5);
  assert.equal(executar(contexto, 'normalizarNumero("1,234.500")'), 1234.5);
});

teste('quantidades equivalentes batem e diferença real não some', () => {
  assert.equal(executar(contexto, 'quantidadesIguais("12,750", "12.750")'), true);
  assert.equal(executar(contexto, 'quantidadesIguais("1.000", "1.001")'), false);
});

teste('embalagens 1LT e 5LT geram conflito e nunca união automática', () => {
  const resultado = JSON.parse(executar(contexto, `JSON.stringify(avaliarCorrespondencia(
    "PRODUTO TESTE 1LT",
    "PRODUTO TESTE 5LT",
    { codigo: "A1", um: "LT", qtd: 10 },
    { codigo: "B1", um: "LT", qtd: 10 }
  ))`));
  assert.equal(resultado.conflito, true);
  assert.notEqual(resultado.nivel, 'automatico');
});

teste('mesma quantidade é evidência, não autorização automática', () => {
  const resultado = JSON.parse(executar(contexto, `JSON.stringify(avaliarCorrespondencia(
    "ADJUVANTE ALFA 5LT",
    "ADJUVANTE ALFA PLUS 5LT",
    { codigo: "A1", um: "LT", qtd: 25 },
    { codigo: "B9", um: "LT", qtd: 25 }
  ))`));
  assert.equal(resultado.quantidadeIgual, true);
  assert.notEqual(resultado.nivel, 'automatico');
});

teste('integridade preserva A -> A e A -> B; remove apenas entrada inválida', () => {
  const resultado = JSON.parse(executar(contexto, `JSON.stringify(
    ConciliadorMemoria.higienizarDicionario({
      "A": "A",
      "B": "C",
      "D": ""
    })
  )`));
  assert.deepEqual(resultado.dicionario, { A: 'A', B: 'C' });
  assert.equal(resultado.autoapontamentosPreservados, 1);
  assert.equal(resultado.entradasInvalidasRemovidas, 1);
});

teste('integridade inicial preserva autoapontamento e união real do localStorage', () => {
  const dicionario = JSON.parse(executar(contexto, 'JSON.stringify(dicionarioMescla)'));
  assert.deepEqual(dicionario, {
    'CANONICO': 'CANONICO',
    'ORIGEM REAL': 'DESTINO REAL'
  });
});

teste('autoapontamento não é contado como ciclo problemático', () => {
  assert.equal(executar(contexto, 'ConciliadorMemoria.contarCiclos({ A: "A" })'), 0);
});

teste('detector de integridade reconhece ciclo real sem alterar o dicionário', () => {
  assert.equal(executar(contexto, 'ConciliadorMemoria.contarCiclos({ A: "B", B: "A" })'), 1);
  const original = JSON.parse(executar(contexto, 'JSON.stringify(ConciliadorMemoria.higienizarDicionario({ A: "B", B: "A" }).dicionario)'));
  assert.deepEqual(original, { A: 'B', B: 'A' });
});

teste('A×A consolida vários códigos sem perder quantidade', async () => {
  executar(contexto, `
    dicionarioMescla = { "CALARIS 5LT": "CALARIS 5LT" };
    exclusoes = { A: [], B: [] };
  `);
  const resultado = JSON.parse(await executar(contexto, `(async () => JSON.stringify(
    await ConciliadorArquitetura.consolidarLadoReferencia([
      { codigo: "A100", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "10,500" },
      { codigo: "A200", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "4,250" }
    ], "A", { cooperativo: false })
  ))()`));

  assert.equal(resultado.totalGrupos, 1);
  assert.equal(resultado.totalGruposMulticodigo, 1);
  assert.equal(resultado.grupos['CALARIS 5LT'].quantidade, 14.75);
  assert.deepEqual(resultado.grupos['CALARIS 5LT'].codigos, ['A100', 'A200']);
});

teste('B×B consolida vários códigos e A×B compara os consolidados', async () => {
  executar(contexto, `
    dicionarioMescla = {
      "CALARIS 5LT": "CALARIS 5LT",
      "CALARIS 05LT": "CALARIS 5LT"
    };
    exclusoes = { A: [], B: [] };
  `);

  const resultado = JSON.parse(await executar(contexto, `(async () => {
    const a = await ConciliadorArquitetura.consolidarLadoReferencia([
      { codigo: "A100", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "10,500" },
      { codigo: "A200", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "4,250" }
    ], "A", { cooperativo: false });
    const b = await ConciliadorArquitetura.consolidarLadoReferencia([
      { codigo: "B010", descOriginal: "CALARIS 05LT", um: "LT", qtdRaw: "12,750" },
      { codigo: "B020", descOriginal: "CALARIS 05LT", um: "LT", qtdRaw: "2,000" }
    ], "B", { cooperativo: false });
    return JSON.stringify({ a, b, cruzamento: ConciliadorArquitetura.conciliarConsolidados(a, b) });
  })()`));

  assert.equal(resultado.a.grupos['CALARIS 5LT'].quantidade, 14.75);
  assert.equal(resultado.b.grupos['CALARIS 5LT'].quantidade, 14.75);
  assert.equal(resultado.b.totalGruposMulticodigo, 1);
  assert.equal(resultado.cruzamento.contadores.total, 1);
  assert.equal(resultado.cruzamento.contadores.ok, 1);
  assert.equal(resultado.cruzamento.statusPorChave['CALARIS 5LT'], 'ok');
});

teste('arquitetura espelho reproduz o mesmo resultado do motor', async () => {
  const validacao = JSON.parse(await executar(contexto, `(async () => {
    dicionarioMescla = {
      "CALARIS 5LT": "CALARIS 5LT",
      "CALARIS 05LT": "CALARIS 5LT"
    };
    exclusoes = { A: [], B: [] };
    dadosRawA = [
      { codigo: "A100", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "10,500" },
      { codigo: "A200", descOriginal: "CALARIS 5LT", um: "LT", qtdRaw: "4,250" }
    ];
    dadosRawB = [
      { codigo: "B010", descOriginal: "CALARIS 05LT", um: "LT", qtdRaw: "12,750" },
      { codigo: "B020", descOriginal: "CALARIS 05LT", um: "LT", qtdRaw: "2,000" }
    ];
    const dictA = estruturarLado(dadosRawA, 'A');
    const dictB = estruturarLado(dadosRawB, 'B');
    processedData = {
      dictA,
      dictB,
      listaFinal: Array.from(new Set([...Object.keys(dictA), ...Object.keys(dictB)])).sort()
    };
    return JSON.stringify(await ConciliadorArquitetura.validarAgora());
  })()`));

  assert.equal(validacao.ok, true);
  assert.equal(validacao.conservacao.ladoA.totalDiferencas, 0);
  assert.equal(validacao.conservacao.ladoB.totalDiferencas, 0);
  assert.equal(validacao.conservacao.cruzamento.totalDiferencas, 0);
  assert.equal(validacao.consolidacaoA.gruposMulticodigo, 1);
  assert.equal(validacao.consolidacaoB.gruposMulticodigo, 1);
});

teste('validação estrutural acusa quantidade perdida em vez de escondê-la', async () => {
  const resultado = JSON.parse(await executar(contexto, `(async () => {
    dicionarioMescla = { "PRODUTO X": "PRODUTO X" };
    exclusoes = { A: [], B: [] };
    const referencia = await ConciliadorArquitetura.consolidarLadoReferencia([
      { codigo: "1", descOriginal: "PRODUTO X", um: "UN", qtdRaw: 10 },
      { codigo: "2", descOriginal: "PRODUTO X", um: "UN", qtdRaw: 5 }
    ], "A", { cooperativo: false });
    return JSON.stringify(ConciliadorArquitetura.compararLadoComMotor(
      referencia,
      { "PRODUTO X": { qtd: 14 } }
    ));
  })()`));

  assert.equal(resultado.ok, false);
  assert.equal(resultado.totalDiferencas, 1);
  assert.equal(resultado.diferencas[0].tipo, 'quantidade');
  assert.equal(resultado.diferencas[0].referencia, 15);
  assert.equal(resultado.diferencas[0].motor, 14);
});

let falhas = 0;
for (const { nome, fn } of testes) {
  try {
    await fn();
    console.log(`✓ ${nome}`);
  } catch (erro) {
    falhas++;
    console.error(`✗ ${nome}`);
    console.error(erro);
  }
}

console.log(`\n${testes.length - falhas}/${testes.length} testes aprovados.`);
if (falhas) process.exitCode = 1;
