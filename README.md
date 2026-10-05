# Triagem Inteligente PJe — Versão 2.0

Ferramenta client-side de alto desempenho para apoio à triagem processual, agrupamento temático e identificação de incidentes no 2º Grau da Justiça do Trabalho (TRT-2).

- Acesso em Produção (GitHub Pages): https://paulodca.github.io/triagempje/
- Ambiente de Execução: 100% no navegador (Client-Side ES Modules, IndexedDB, PWA)
- Dependências Externas: Nenhuma (zero telemetria, zero backend centralizado, zero chamadas a LLMs)
- Conformidade Normativa: Lei Geral de Proteção de Dados (Lei 13.709/2018, art. 6º, III e art. 23)

---

## 1. Visão Geral

No 2º Grau dos Tribunais Regionais do Trabalho, gabinetes recebem centenas de novos recursos semanalmente na tarefa de triagem inicial (Agrupamento 12 do PJe). A interface nativa apresenta esses processos em listas lineares e paginadas, sem consolidação prévia de matérias idênticas, partes recorrentes ou alertas de requisitos formais.

A Triagem Inteligente PJe resolve esse gargalo ao prover uma camada analítica e visual avançada sobre os dados da pauta. A solução é composta por dois elementos desacoplados:

1. Bookmarklet Universal de Coleta: script executável diretamente na barra de favoritos que roda sob a sessão autenticada do usuário no PJe, consulta os endpoints oficiais da API (`/pje-comum-api/`), aplica minimização de dados sensíveis e gera um arquivo de trabalho estruturado (.txt em formato NDJSON).
2. Progressive Web App (PWA) de Triagem: aplicação estática em JavaScript modular que processa o arquivo localmente, permitindo inspeção em grade de alta velocidade, detecção de contencioso repetitivo, filtros combinados e exportação de relatórios.

---

## 2. Capacidades da Versão 2.0+

### Data Grid de Alta Performance (Tabulator v6 ESM)
- Renderização virtualizada com suporte fluido a lotes volumosos de centenas ou milhares de processos.
- Paginação configurável (25, 50, 100 ou 200 itens por página).
- Seleção em lote com checkbox mestre bidirecional, incluindo suporte nativo ao estado indeterminado (tri-state) ao navegar entre páginas.
- Ordenação cronológica real por timestamp da data de entrada na tarefa ("Em triagem desde").
- Atalho global de teclado: pressionar a tecla `C` copia instantaneamente para a área de transferência todos os números de processo (CNJ) selecionados no grid.

### Interface com Revelação Progressiva
A interface foi projetada para minimizar a carga cognitiva do operador judicial, priorizando a listagem imediata de processos e distribuindo análises densas em quatro abas funcionais:

- Aba 1 - Processos: Visão primária e desobstruída do grid de processos, com seletores rápidos, dados das partes, classes, alertas e tags temáticas.
- Aba 2 - Concentração por Reclamada: Mapeamento de grandes litigantes do lote, consolidando múltiplos CNPJs vinculados a cada pessoa jurídica e disponibilizando botão de filtro instantâneo no grid.
- Aba 3 - Lotes Semelhantes: Agrupamento determinístico de contencioso em escala (processos patrocinados pelo mesmo patrono/OAB com teses jurídicas idênticas), permitindo despacho ou julgamento em bloco.
- Aba 4 - Métricas e Relatórios: Quadro executivo com indicadores quantitativos do acervo e módulo de emissão de relatório formal.

### Gaveta Retrátil de Filtros Avançados
- Barra de comando primária mantida sempre visível com campo de busca textual ampla (CNJ, partes, advogados e assuntos) e alternador de rotas processuais (Todas, Conhecimento, Execução).
- Gaveta retrátil de filtros com indicador numérico de facetas ativas, permitindo combinar classes processuais específicas e critérios booleanos especializados.

### Regras de Negócio Especializadas da Justiça do Trabalho (TRT-2)
- Segregação de Rotas Processuais: Classificação imediata entre fase de Conhecimento (ex.: Recurso Ordinário Trabalhista - ROT, Ação Rescisória) e fase de Execução (ex.: Agravo de Petição - AP).
- Alerta de Fazenda Pública sem MPT: Identificação de feitos envolvendo entes públicos da administração direta, autárquica ou fundacional sem registro de cadastramento do Ministério Público do Trabalho, prevenindo nulidades processuais.
- Prerrogativas Falimentares e Recuperacionais: Reconhecimento de partes em Recuperação Judicial (CLT, art. 899, § 10) e Massa Falida (Súmula 86 do TST) para verificação de depósito recursal e custas.
- Detecção de Entidades Sindicais: Classificação automática de sindicatos, federações e confederações no polo ativo ou passivo.
- Critério Determinístico para Processos Físicos Migrados:
  - Processos cujo sequencial numérico do CNJ inicia pelo dígito `0` (ex.: `0000123-45.2010.5.02.0001`) são classificados como processos originários do acervo físico e migrados para o PJe.
  - Processos com sequencial iniciado pelo dígito `1` (faixa eletrônica `1000000+`) são identificados como nativos digitais, eliminando falsos positivos decorrentes de redistribuições recentes.
  - Feitos com certidão formal de conversão/migração registrada nos metadados são sinalizados independentemente do sequencial.

### Detecção de Contencioso em Escala
Algoritmo de correlação que analisa o cruzamento do número de inscrição na OAB dos patronos constituídos com as assinaturas temáticas da Tabela Processual Unificada (TPU/CNJ). O sistema isola grupos idênticos de demandas repetitivas, viabilizando minutas padronizadas e celeridade na tramitação.

### Minimização de Dados e Privacidade (LGPD)
Em conformidade com os princípios da finalidade, adequação e necessidade (art. 6º, III e art. 23 da Lei 13.709/2018):
- O script de coleta higieniza os dados brutos ainda na memória do navegador antes de exportar o arquivo de triagem.
- São eliminados CPFs de pessoas físicas, números de telefone residencial/celular e endereços de correio eletrônico pessoal.
- São mantidos estritamente os identificadores públicos indispensáveis ao processamento judicial: número CNJ, nomes e papéis das partes, registros societários (CNPJ), inscrições na OAB e códigos TPU/CNJ.

### Impressão Limpa sem Bloqueio de Popups
O relatório executivo para impressão ou exportação em PDF é gerado via elemento `<iframe>` embutido de forma invisível no DOM com estilo de folha A4 formatada. O acionamento do diálogo de impressão ocorre internamente no contexto do frame, contornando bloqueadores de popup e dispensando rotinas legadas de manipulação de janelas.

---

## 3. Fluxo de Trabalho e Guia de Uso

O procedimento de operação divide-se em três etapas diretas:

```
[ 1. Instalação ]  -->  Arrastar o botão do Bookmarklet para a barra de favoritos.
        |
[ 2. Coleta ]      -->  Na tela do PJe (Agrupamento 12), clicar no favorito.
        |
[ 3. Análise ]     -->  Abrir o PWA e carregar o arquivo .txt gerado.
```

### Passo 1: Instalação do Bookmarklet
1. Acesse a aplicação web em https://paulodca.github.io/triagempje/.
2. Na tela inicial, localize a seção de instalação do Bookmarklet.
3. Clique e arraste o botão do Bookmarklet diretamente para a barra de favoritos do navegador (Ctrl+Shift+B exibe a barra no Google Chrome e Microsoft Edge).

### Passo 2: Coleta de Dados no PJe
1. Faça login no ambiente do PJe 2º Grau do seu Tribunal.
2. Navegue até o painel de tarefas e selecione a tarefa de triagem desejada (ex.: "Triagem sem responsável" - Agrupamento 12).
3. Clique no atalho do Bookmarklet na barra de favoritos.
4. O script iniciará a leitura automatizada e paralela da pauta, exibindo o progresso em tela.
5. Ao concluir, o navegador realizará o download automático de um arquivo estruturado com nome no padrão `triagem_pje_AAAA-MM-DD.txt`.

### Passo 3: Triagem no Aplicativo
1. Retorne à aba da Triagem Inteligente PJe.
2. Arraste e solte o arquivo `.txt` na área de carregamento (ou use o botão de seleção manual).
3. Os processos serão imediatamente analisados, classificados e exibidos no painel.
4. Utilize a busca, as gavetas de filtros e as abas para selecionar os processos de interesse.
5. Pressione a tecla `C` para copiar os CNJs selecionados ou acione o botão de relatório formal para impressão.

---

## 4. Como Executar

### Opção A: Acesso Direto (Sem Instalação)
A aplicação está hospedada e disponível publicamente via GitHub Pages no endereço:
https://paulodca.github.io/triagempje/

Por ser uma aplicação 100% estática baseada em tecnologias web nativas, nenhum dado trafega para servidores externos. O processamento ocorre exclusivamente na CPU e memória do navegador da estação local.

### Opção B: Execução Local
Por utilizar ES Modules nativos (`import` / `export`), os navegadores modernos exigem que os arquivos sejam servidos a partir de uma origem HTTP ou HTTPS (o protocolo `file:///` bloqueia a importação modular por restrição de segurança CORS).

Para rodar localmente, utilize qualquer servidor web estático:

Com Python:
```bash
python -m http.server 8000
```
Em seguida, acesse no navegador: `http://localhost:8000`

Com Node.js:
```bash
npx serve .
```

---

## 5. Arquitetura Técnica e Estrutura de Código

A solução utiliza JavaScript Vanilla moderno (ES2022+), folhas de estilo com CSS Custom Properties e persistência transacional via IndexedDB.

```text
PROJETO_TRIAGEM/
|-- index.html                   # Entrada principal do PWA (carregador de ES Modules)
|-- manifest.json                # Manifesto PWA para instalação standalone no SO
|-- sw.js                        # Service Worker para suporte a cache e operação offline
|-- icon.svg                     # Identidade visual em vetor SVG
|
|-- css/
|   `-- tabulator_simple.min.css # Folha de estilos limpa e compacta do Tabulator v6
|
|-- lib/                         # Dependências estáticas empacotadas localmente
|   |-- tabulator_esm.min.js     # Data Grid Tabulator v6.3.0 (distribuição ES Module)
|   `-- purify.min.js            # DOMPurify v3.1.7 para sanitização de strings no DOM
|
|-- src/                         # Código-fonte modular da aplicação
|   |-- hub_triagem.js           # Orquestrador de estado, filtros e ciclo de vida
|   |
|   |-- classificadores/         # Heurísticas de direito material e processual do trabalho
|   |   |-- classes_trabalhistas.js     # Mapeamento de rotas e siglas do PJe/CNJ
|   |   |-- assuntos_cnj.js             # Dicionário de assuntos TPU/CNJ e temas
|   |   |-- pessoas_juridicas.js        # Catálogo de entes públicos, estatais e falimentares
|   |   |-- sindicatos.js               # Reconhecimento de entidades sindicais
|   |   |-- partes_representantes.js    # Extração de polos, documentos e OABs válidas
|   |   `-- temporalidade_gap.js        # Heurística estrita do dígito 0 para processos físicos
|   |
|   |-- heuristicas/
|   |   `-- correlacao_patrono_assunto.js # Detecção de contencioso em escala e teses repetitivas
|   |
|   |-- coleta/
|   |   |-- bookmarklet.js              # Script base injetado na sessão do PJe
|   |   |-- gerador_bookmarklet.js      # Gerador dinâmico de URL de bookmarklet universal
|   |   `-- sanitizacao_lgpd.js         # Filtro preventivo de descarte de dados pessoais
|   |
|   |-- persistencia/
|   |   |-- db.js                       # Driver IndexedDB para armazenamento da sessão
|   |   `-- transporte.js               # Leitor e validador do formato NDJSON (.txt)
|   |
|   |-- plugins/
|   |   `-- verificador_tempestividade.js # Cálculo de prazos e tempestividade recursal
|   |
|   |-- relatorios/
|   |   `-- exportar_relatorio.js       # Renderizador de relatório executivo via iframe oculto
|   |
|   `-- ui/                             # Componentes da interface com o usuário
|       |-- app.js                      # Inicializador e acoplador de eventos da aplicação
|       |-- painel_abas.js              # Gerenciador das 4 abas de revelação progressiva
|       |-- painel_agrupamentos.js      # Visão analítica de litigantes frequentes (polo passivo)
|       |-- painel_lotes_semelhantes.js # Visão analítica de contencioso em escala
|       |-- tabela.js                   # Camada de integração com Tabulator v6 ESM
|       |-- filtros.js                  # Gerenciador da barra primária e gaveta retrátil
|       |-- barra_metricas.js           # Micro-KPIs e contadores da pauta
|       |-- card_tutorial_bookmarklet.js # Tutorial interativo com botão arrastável
|       |-- modal_privacidade.js        # Modal de documentação de conformidade LGPD
|       `-- estilos.css                 # Design system com variáveis CSS (:root)
|
`-- tests/                       # Suíte de testes automatizados
    |-- bookmarklet_pwa.test.mjs
    |-- classes_trabalhistas.test.mjs
    |-- integracao_322_processos.test.mjs
    |-- pessoas_juridicas.test.mjs
    |-- plugin_tempestividade.test.mjs
    |-- polos_contextuais.test.mjs
    |-- sanitizacao_lgpd.test.mjs
    |-- sindicatos.test.mjs
    `-- temporalidade_gap.test.mjs
```

---

## 6. Qualidade de Software e Suíte de Testes

O projeto adota testes automatizados com o Node.js Test Runner nativo (`node --test`), cobrindo integridade de classes, regras de competência e regressões jurídicas:

```bash
node --test tests/*.test.mjs
```

### Resultados da Suíte Automatizada (28 Testes / 100% de Aprovação)

| Categoria | Descrição do Teste | Status |
| :--- | :--- | :--- |
| Coleta e Infraestrutura | Geração de bookmarklet universal sem domínio hardcoded | [OK] |
| Coleta e Infraestrutura | Validação de origens seguras (.jus.br e localhost) | [OK] |
| Classes Processuais | Mapeamento estrito de classes de Conhecimento | [OK] |
| Classes Processuais | Mapeamento estrito de classes de Execução | [OK] |
| Classes Processuais | Inferência dinâmica para siglas não catalogadas | [OK] |
| Integração Real | Processamento de lote real de 322 feitos com validação de métricas | [OK] |
| Entidades e Prerrogativas | Identificação de Fazenda Pública com isenção integral | [OK] |
| Entidades e Prerrogativas | Identificação de Recuperação Judicial (CLT art. 899, § 10) | [OK] |
| Entidades e Prerrogativas | Identificação de Massa Falida (Súmula 86 do TST) | [OK] |
| Entidades e Prerrogativas | Diferenciação de Estatais em regime de direito privado | [OK] |
| Entidades e Prerrogativas | Caso de regressão: VASP S/A versus Estado de São Paulo | [OK] |
| Tempestividade | Identificação de dias úteis e finais de semana | [OK] |
| Tempestividade | Projeção de termo ad quem saltando feriados bancários e forenses | [OK] |
| Tempestividade | Caso Real 1: Recurso tempestivo no 7º dia útil | [OK] |
| Tempestividade | Caso Real 2: Fazenda Pública com prazo em dobro (16 dias úteis) | [OK] |
| Tempestividade | Caso Real 3: Recurso prematuro protocolado antes da certidão DJEN | [OK] |
| Tempestividade | Caso Real 4: Recurso intempestivo após expiração do prazo legal | [OK] |
| Polos Processuais | Rótulos contextuais Agravante / Agravado para Agravos | [OK] |
| Polos Processuais | Rótulos contextuais Recorrente / Recorrido para Recursos Ordinários | [OK] |
| Polos Processuais | Rótulos contextuais Reclamante / Reclamada para rito de origem | [OK] |
| Polos Processuais | Rótulos contextuais Impetrante / Impetrado para Mandado de Segurança | [OK] |
| Privacidade | Sanitização LGPD (remoção de CPF, e-mail e telefone) | [OK] |
| Entidades Sindicais | Detecção de sindicato formal no polo ativo | [OK] |
| Entidades Sindicais | Detecção de federações e siglas conhecidas (ex.: SINPRO) | [OK] |
| Entidades Sindicais | Exclusão de falsos positivos em entidades não sindicais | [OK] |
| Temporalidade | Detecção de processo físico migrado por sequencial iniciado em 0 | [OK] |
| Temporalidade | Exclusão de processo digital nativo iniciado em 1 | [OK] |
| Temporalidade | Detecção de processo físico com certidão explícita de migração | [OK] |

### Validação em Lote de Produção (322 Processos Reais do TRT-2)
- Tempo Total de Processamento: inferior a 150 milissegundos para 322 feitos completos.
- Divisão de Fases: 199 processos de Conhecimento e 123 processos de Execução (117 Agravos de Petição).
- Risco de Nulidade: 24 Agravos de Petição com Fazenda Pública sem intervenção do MPT isolados.
- Contencioso Serial: 14 agrupamentos temáticos identificados (35 feitos conexos).
- Processos Migrados: 38 feitos com histórico físico e dígito inicial `0` catalogados.

---

## 7. Licença e Considerações Finais

Este projeto foi construído para servir de ferramenta aberta de apoio judiciário, simplificando rotinas de triagem e promovendo eficiência, transparência e segurança jurídica na prestação jurisdicional.

Disponibilizado sob licença de uso para o ecossistema do Poder Judiciário e comunidade de tecnologia aplicada ao direito.
