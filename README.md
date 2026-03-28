📦 Conciliador de Estoque PRO

Uma aplicação web robusta, desenvolvida com arquitetura Client-Side (Serverless), focada em resolver o gargalo logístico da auditoria de estoques. O sistema faz a ingestão, limpeza (ETL) e o cruzamento de milhares de linhas de planilhas exportadas de diferentes ERPs instantaneamente.

🔗 Testar a Aplicação Ao Vivo

🎯 O Problema

A conciliação de inventário físico vs. sistêmico (ou entre dois sistemas distintos) geralmente é feita em Excel usando PROCV (VLOOKUP). Isso esbarra em problemas clássicos:

Nomes de produtos cadastrados de forma ligeiramente diferente ("Adubo NPK" vs "Adubo N.P.K").

Códigos internos divergentes.

Falta de padronização de formatação e espaços.

🚀 A Solução

O Conciliador PRO automatiza esse processo utilizando inteligência heurística e análise de similaridade semântica, eliminando horas de trabalho braçal e garantindo rastreabilidade contábil.

Principais Funcionalidades (Features)

🤖 Motor Heurístico (Schema-less): Se a planilha for importada sem cabeçalhos, a IA interna lê o padrão matemático das primeiras 30 linhas para deduzir automaticamente o que é Código (zeros à esquerda, sem decimais), Quantidade (números e decimais) e Descrição (strings longas).

🧠 Fuzzy Matching (IA de Similaridade): Utiliza o algoritmo de Sørensen–Dice para identificar produtos com nomes até 87% semelhantes e sugerir a unificação em lote.

💾 Memória Persistente Não-Destrutiva: O usuário pode correlacionar produtos manualmente. O sistema aprende a regra e guarda em localStorage. A planilha original nunca é alterada.

☁️ Cloud Backup (JSON): Toda a inteligência ensinada ao sistema pode ser exportada num arquivo .json e importada em qualquer outro computador.

📊 Dashboard Interativo (Drill-down): KPIs em tempo real. Clicar em um cartão do Dashboard (ex: "Divergências") aplica um filtro visual na tabela usando CSS render-blocking para máxima performance.

🔒 100% Privacidade (In-Browser): Utiliza a biblioteca SheetJS para processar as planilhas diretamente na memória RAM do usuário. Nenhum dado de estoque é enviado para servidores externos.

🌙 UI/UX Premium: Interface Mobile-First responsiva com Tailwind CSS, incluindo paleta Slate para Dark Mode.

🛠️ Tecnologias Utilizadas

Front-end: HTML5, Tailwind CSS (via CDN).

Lógica e ETL: Vanilla JavaScript (ES6+).

Processamento de Arquivos: SheetJS (xlsx).

Armazenamento de Estado: Web Storage API (localStorage) e Blob API para exportação de arquivos.

💻 Como rodar o projeto localmente

Como o projeto não possui dependências de backend ou Node.js, rodá-lo é extremamente simples:

Clone o repositório:

git clone [https://github.com/paulo968/conciliador-estoque.git](https://github.com/paulo968/conciliador-estoque.git)


Abra a pasta do projeto.

Dê um duplo clique no arquivo index.html para abri-lo diretamente no seu navegador.

(Opcional) Utilize a extensão Live Server do VSCode para testar modificações em tempo real.

📖 Como usar a ferramenta

Na tela principal, faça o upload das planilhas de Estoque A e Estoque B.

Clique em Processar Auditoria.

O sistema gerará a matriz de cruzamento.

Use os cartões no topo para filtrar rapidamente as Divergências ou itens que estão sobrando.

Se dois produtos forem a mesma coisa com nomes diferentes, clique no botão 🔗 ao lado de ambos para unificá-los. O sistema somará as quantidades, unirá os códigos internos e gravará essa regra para sempre.

👨‍💻 Autor

Desenvolvido com foco na interseção entre Logística e Engenharia de Software.

Paulo Zaqueu

LinkedIn: Conecte-se comigo no LinkedIn

Estudante de Análise e Desenvolvimento de Sistemas (ADS).

Se este projeto te ajudou ou inspirou, não se esqueça de dar uma ⭐ no repositório!
