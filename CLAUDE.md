# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

Este é um sistema de automação para o PJE (Processo Judicial Eletrônico) construído com Electron, projetado para automatizar o processo de vinculação de peritos e servidores aos órgãos julgadores do sistema judiciário brasileiro. A aplicação oferece uma interface gráfica moderna para gerenciar e executar fluxos automatizados usando Playwright para automação do navegador.

## Comandos Essenciais de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar aplicação em modo de desenvolvimento
npm run dev

# Iniciar aplicação em modo produção
npm start

# Construir aplicação para distribuição
npm run build
```

## Visão Geral da Arquitetura

### Componentes Principais

**Processo Principal do Electron (`src/main.js`)**:
- Ponto de entrada que cria a janela principal e gerencia comunicação IPC
- Orquestra automação do navegador usando Playwright
- Gerencia persistência de dados para peritos e servidores
- Manipula funcionalidade de import/export de arquivos
- Contém dois motores de automação: legado (v1) e moderno (v2)

**Processo Renderer (`src/renderer/`)**:
- `index.html`: Interface principal com abas (Peritos, Servidores, Configurações, Automação)
- `script.js`: Lógica frontend para gerenciamento de formulários, exibição de dados e controles de automação
- `styles.css`: Estilização CSS moderna com aparência profissional

**Módulos de Automação**:
- `login.js`: Gerencia autenticação PDPJ com 9 estratégias de seletor diferentes
- `navigate.js`: Navega para gerenciamento de pessoas com 13 seletores de menu e 29 seletores de ícone de edição
- `vincularOJ.js`: Vincula órgãos julgadores aos usuários com lógica de retry
- `verificarOJVinculado.js`: Verifica vínculos existentes para prevenir duplicatas
- `util.js`: Gerenciamento de configuração e funções utilitárias

**Automação de Servidores**:
- `src/main/servidor-automation.js`: Motor de automação legado para servidores (v1)
- `src/main/servidor-automation-v2.js`: Motor de automação moderno com tratamento de erro aprimorado e relatórios

### Estrutura de Dados

**Dados de Peritos (`data/perito.json`)**:
```json
[
  {
    "cpf": "000.000.000-00",
    "nome": "Nome do Perito",
    "ojs": ["Órgão Julgador 1", "Órgão Julgador 2"]
  }
]
```

**Dados de Servidores (`data/servidores.json`)**:
```json
[
  {
    "nome": "Nome do Servidor",
    "cpf": "000.000.000-00",
    "perfil": "Secretário de Audiência",
    "localizacoes": ["Localização do Tribunal"]
  }
]
```

## Padrões Técnicos Principais

### Estratégia de Automação do Navegador
O sistema usa múltiplos seletores de fallback para máxima compatibilidade:
- **Login**: 9 seletores PDPJ + 8 seletores de botão de login
- **Navegação**: 13 seletores de menu + 11 seletores de pessoa
- **Edição**: 29 seletores diferentes de ícone de edição (evitando ícones de exclusão)
- **Debug**: Captura automática de elementos quando seletores falham

### Tratamento de Erros e Resiliência
- Lógica de retry para login (3 tentativas)
- Gerenciamento de timeout (10-60 segundos baseado na operação)
- Detecção e prevenção de duplicatas
- Relatórios de status em tempo real com rastreamento de progresso
- Modo não-headless para debug (navegador permanece aberto)

### Comunicação IPC
O processo principal expõe handlers para:
- `load-peritos`, `save-peritos`: Gerenciamento de dados de peritos
- `load-data`, `save-data`: Persistência genérica de dados
- `start-automation`, `stop-automation`: Controle de automação de peritos
- `start-servidor-automation-v2`: Automação moderna de servidores
- `import-file`, `export-file`: Import/export de dados

### Implementação de Segurança
- Isolamento de contexto habilitado (`contextIsolation: true`)
- Integração com Node desabilitada (`nodeIntegration: false`)
- Credenciais armazenadas em arquivo `.env` (não commitado)
- Script preload seguro para comunicação IPC

## Fluxo de Desenvolvimento

### Adicionando Novas Funcionalidades de Automação
1. Criar módulo no diretório `src/` seguindo padrões existentes
2. Adicionar múltiplas estratégias de seletor para robustez
3. Implementar logging de debug e captura de elementos
4. Adicionar handlers IPC em `main.js`
5. Atualizar interface renderer em `script.js`

### Testando Automação
- Usar modo de desenvolvimento (`npm run dev`) para abrir DevTools
- Automação do navegador roda em modo visível para debug
- Verificar logs do console para informações de debug de seletores
- Painel de status fornece feedback em tempo real

### Gerenciamento de Dados
- Arquivos JSON no diretório `data/` para persistência
- Funcionalidade de import/export para backup e migração
- Handlers genéricos de dados suportam múltiplos tipos de dados

## Gerenciamento de Configuração

**Variáveis de Ambiente (`.env`)**:
```env
PJE_URL=https://pje.trt15.jus.br/primeirograu/login.seam
LOGIN=seu_cpf
PASSWORD=sua_senha
```

**Órgãos Julgadores**: Definidos em `src/renderer/orgaos_pje.json` com 400+ localizações de tribunais

## Fluxo de Automação

1. **Autenticação**: Login PDPJ com manipulação automática de credenciais
2. **Navegação**: Travessia de menu para seção de gerenciamento de pessoas
3. **Busca**: Navegação direta por URL com filtro de CPF
4. **Modo de Edição**: Clicar ícone de edição e navegar para aba de perito/servidor
5. **Vinculação**: Adicionar associações de órgãos julgadores com configuração de papel
6. **Validação**: Verificar vínculos existentes para prevenir duplicatas
7. **Relatórios**: Gerar relatórios detalhados de sucesso/falha

## Considerações de Performance

- Timeouts otimizados (5ms slowMo, 10-60s esperas de elementos)
- Processamento paralelo para múltiplos usuários
- Consultas DOM eficientes com estratégias de fallback
- Rastreamento de progresso para operações de longa duração
- Gerenciamento de recursos do navegador (instância única, fechamento manual)

## Debug e Solução de Problemas

- Habilitar flag `--dev` para acesso ao DevTools
- Logging do console captura todas as interações do navegador
- Sistema de debug de elementos mostra seletores disponíveis quando falhas ocorrem
- Sistema de relatório de status fornece feedback detalhado da operação
- Navegador permanece aberto após conclusão para inspeção manual