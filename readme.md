# 📦 Conciliador de Estoque PRO

Uma aplicação web robusta, construída com arquitetura **Client-Side (Serverless)**, focada em eliminar o gargalo logístico da auditoria de estoques.

O sistema realiza **ingestão, limpeza (ETL) e cruzamento de milhares de linhas de planilhas** exportadas de diferentes ERPs — tudo instantaneamente e direto no navegador.

---

## 🔗 Testar a Aplicação Ao Vivo

👉 https://paulo968.github.io/conciliador-estoque/

---

## 🎯 O Problema

A conciliação de inventário (físico vs. sistêmico ou entre sistemas distintos) normalmente depende de Excel com PROCV (VLOOKUP), o que gera vários problemas:

- Nomes inconsistentes  
  > "Adubo NPK" vs "Adubo N.P.K"

- Códigos internos diferentes  
- Falta de padronização (espaços, formatação, unidades)

Resultado: **horas perdidas + alto risco de erro humano**

---

## 🚀 A Solução

O **Conciliador PRO** automatiza todo esse processo usando **inteligência heurística + análise de similaridade**, reduzindo trabalho manual e aumentando a confiabilidade dos dados.

---

## ⚙️ Principais Funcionalidades

### 🤖 Motor Heurístico (Schema-less)
- Detecta automaticamente colunas mesmo sem cabeçalho  
- Analisa padrão das primeiras linhas  
- Identifica:
  - Código (zeros à esquerda)
  - Quantidade (valores numéricos)
  - Descrição (texto)

---

### 🧠 Fuzzy Matching (IA de Similaridade)
- Usa algoritmo **Sørensen–Dice**
- Detecta similaridade de até **87%**
- Sugere unificação automática de produtos

---

### 💾 Memória Persistente
- Correlações manuais ficam salvas no navegador
- Sistema “aprende” com o usuário
- **Não altera os dados originais**

---

### ☁️ Backup Inteligente (JSON)
- Exporta toda a “memória” do sistema
- Importa em outro computador
- Portabilidade total

---

### 📊 Dashboard Interativo
- KPIs em tempo real
- Filtros instantâneos por clique:
  - OK
  - Divergências
  - Só no A
  - Só no B

---

### 🔒 100% Privacidade
- Processamento direto no navegador
- Nenhum dado enviado para servidor
- Uso de memória RAM local

---

### 🌙 UI/UX Premium
- Interface responsiva (Mobile-First)
- Dark Mode
- Design moderno com Tailwind CSS

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, Tailwind CSS (CDN)
- **Lógica:** Vanilla JavaScript (ES6+)
- **Processamento de arquivos:** SheetJS (xlsx)
- **Armazenamento:** localStorage + Blob API

---

## 💻 Como rodar o projeto localmente

Sem backend. Sem instalação. Sem dor de cabeça.

```bash
git clone https://github.com/paulo968/conciliador-estoque.git
```

Depois:

1. Abra a pasta do projeto  
2. Dê duplo clique no `index.html`

Opcional:
- Use **Live Server (VSCode)** para desenvolvimento

---

## 📖 Como usar

1. Faça upload das planilhas:
   - Estoque A
   - Estoque B

2. Clique em **Processar Auditoria**

3. Analise a matriz gerada

4. Use os filtros do topo para:
   - Ver divergências
   - Encontrar sobras
   - Validar itens OK

5. Para corrigir produtos duplicados:
   - Clique no botão 🔗 em ambos
   - O sistema unifica e aprende automaticamente

---

## 💡 Diferencial

Esse sistema não é só uma ferramenta.

Ele é:
- um **acelerador operacional**
- um **redutor de erro humano**
- um **motor de padronização de dados**

---

## 👨‍💻 Autor

**Paulo Zaqueu**

- 🔗 LinkedIn: https://www.linkedin.com/in/paulo-zaqueu-762459187/
- 🎓 Estudante de ADS  
- 🚀 Focado em Logística + Engenharia de Software

---

## ⭐ Apoie o projeto

Se esse projeto te ajudou ou te deu alguma ideia:

👉 deixa uma estrela no repositório

Isso ajuda muito a crescer o projeto 🚀
