# Fluxo de Automação PJe - Perito

## Visão Geral

Este documento descreve o fluxo completo de automação implementado para o sistema PJe, que permite navegar automaticamente desde o login até a edição de cadastros de peritos.

## Fluxo Implementado

### 1. Login Automático (login.js)

**Página inicial:** `https://pje.trt15.jus.br/primeirograu/login.seam`

**Passos:**
1. Navega para a página de login
2. Procura e clica no botão "Entrar com PDPJ"
3. Aguarda as credenciais serem preenchidas automaticamente pelo sistema
4. Procura e clica no botão "ENTRAR"
5. Aguarda o login ser processado

**Seletores implementados:**
- Botão PDPJ: 9 seletores diferentes para máxima compatibilidade
- Botão ENTRAR: 8 seletores diferentes para máxima compatibilidade
- Sistema de debug que captura todos os botões da página em caso de falha

### 2. Navegação para Pessoa Física (navigate.js)

**Passos:**
1. **Menu Completo:** Procura e clica no "Menu completo" no canto superior esquerdo
2. **Pessoa Física:** Procura e clica na opção "Pessoa Física" no menu
3. **Filtro por CPF:** Navega diretamente para a URL com o CPF já filtrado
4. **Validação:** Verifica se há resultados na tabela
5. **Edição:** Procura e clica no ícone de lápis (editar)
6. **Aba Perito:** Navega para a aba "Perito"

**Seletores implementados:**
- Menu completo: 13 seletores diferentes
- Pessoa Física: 11 seletores diferentes
- Ícone de edição: 29 seletores específicos para o lápis (evitando lixeira)
- Sistema de debug que captura elementos em caso de falha

### 3. Vinculação de OJs (vincularOJ.js)

**Passos:**
1. Procura e clica no botão "Adicionar"
2. Preenche o campo de OJ
3. Clica em "Salvar"
4. Repete para cada OJ do perito

## Características Técnicas

### Robustez
- **Múltiplos seletores:** Cada elemento possui vários seletores alternativos
- **Sistema de debug:** Captura elementos da página em caso de falha
- **Timeouts configuráveis:** 60 segundos para operações críticas
- **Retry automático:** 3 tentativas para o login
- **Validação de resultados:** Verifica se o CPF foi encontrado

### Navegação Otimizada
- **URL direta:** Navega diretamente para a página com CPF filtrado
- **Eliminação de passos:** Não precisa preencher campos manualmente
- **Aguarda carregamento:** Espera elementos aparecerem antes de interagir

### Logs e Debug
- **Console detalhado:** Logs de cada passo da automação
- **Interface visual:** Status em tempo real na interface do usuário
- **Captura de elementos:** Debug automático quando elementos não são encontrados

## Fluxo de Dados

```
Início da Automação
        ↓
    Login (PDPJ)
        ↓
   Menu Completo
        ↓
   Pessoa Física
        ↓
Filtro por CPF (URL direta)
        ↓
  Validação de Resultados
        ↓
   Clique no Lápis
        ↓
    Aba Perito
        ↓
  Vinculação de OJs
        ↓
   Próximo Perito
```

## Tratamento de Erros

### Cenários Cobertos
- **CPF não encontrado:** Erro específico com mensagem clara
- **Elementos não encontrados:** Debug automático com captura de elementos
- **Timeout de rede:** Retry automático e mensagens específicas
- **Falha no login:** Até 3 tentativas com intervalo

### Mensagens de Status
- **Info:** Progresso normal da automação
- **Success:** Operações concluídas com sucesso
- **Warning:** Problemas não críticos (ex: OJ não vinculado)
- **Error:** Falhas que impedem o progresso

## Configurações

### Timeouts
- **Página:** 60 segundos (padrão)
- **Elementos:** 10-45 segundos (dependendo da criticidade)
- **Rede:** 30-60 segundos

### Browser
- **Modo:** Não-headless (visível)
- **Timeout de inicialização:** 60 segundos
- **Console logging:** Ativado para debug

## Melhorias Implementadas

### Versão Atual vs Anterior
- ✅ **Login automático via PDPJ** (novo)
- ✅ **Navegação via menu completo** (novo)
- ✅ **URL direta com CPF** (otimização)
- ✅ **Validação de resultados** (robustez)
- ✅ **29 seletores para ícone de edição** (compatibilidade)
- ✅ **Sistema de debug avançado** (manutenibilidade)
- ✅ **Logs detalhados** (monitoramento)

## Uso

1. **Configurar credenciais** no arquivo de configuração
2. **Adicionar peritos** com CPF e OJs
3. **Executar automação** - o sistema fará todo o fluxo automaticamente
4. **Monitorar logs** na interface para acompanhar o progresso

## Manutenção

Para adicionar novos seletores ou modificar o comportamento:

1. **login.js:** Adicionar seletores nos arrays `pdpjSelectors` e `loginSelectors`
2. **navigate.js:** Adicionar seletores nos arrays correspondentes
3. **Debug:** Os sistemas de debug automático ajudam a identificar novos seletores necessários

O sistema foi projetado para ser facilmente extensível e manutenível.