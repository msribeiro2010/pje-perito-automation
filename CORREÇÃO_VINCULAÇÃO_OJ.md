# Correção da Vinculação de OJ para Peritos

## Problemas Identificados

Baseado na análise do código e arquivos de debug, identifiquei os seguintes problemas na vinculação de OJ para peritos:

### 1. **Falhas no Mat-Select**
- Cliques não estavam sendo direcionados especificamente ao trigger do mat-select
- Overlay do dropdown não estava abrindo consistentemente
- Seleção de opções falhava por timeouts insuficientes

### 2. **Botão "Adicionar" Não Encontrado**
- Seletores limitados para encontrar o botão de adicionar OJ
- Falta de fallbacks para diferentes layouts do sistema

### 3. **Estratégias de Seleção Inadequadas**
- Busca de opções muito restritiva (apenas match exato)
- Não considerava variações no texto dos OJs
- Filtragem por teclado não funcionava adequadamente

### 4. **Validação e Confirmação Frágeis**
- Verificação de sucesso dependia de elementos específicos
- Não havia fallbacks para diferentes tipos de modais de confirmação

## Soluções Implementadas

### 1. **Múltiplas Estratégias de Clique no Mat-Select**

```javascript
// Estratégia 1: Clicar no trigger
const trigger = matSelectEspecifico.locator('.mat-select-trigger');
await trigger.click({ force: true });

// Estratégia 2: Clicar diretamente no mat-select
await matSelectEspecifico.click({ force: true });

// Estratégia 3: Clicar via JavaScript
await page.evaluate((selectId) => {
    const element = document.getElementById(selectId);
    if (element) element.click();
}, matSelectId);
```

### 2. **Busca Robusta do Botão Adicionar**

```javascript
const seletoresBotaoAdicionar = [
    'button:has-text("Adicionar")',
    'button:has-text("+")',
    'button[title*="Adicionar"]',
    'button[aria-label*="Adicionar"]',
    '.btn:has-text("Adicionar")',
    '.btn-add',
    'button.mat-icon-button:has(mat-icon:has-text("add"))',
    // ... mais seletores
];
```

### 3. **Estratégias Melhoradas de Seleção de Opções**

```javascript
// Estratégia 1: Match exato
const opcaoExata = page.locator('mat-option')
    .filter({ hasText: new RegExp(`^\\s*${alvoOJ}\\s*$`, 'i') });

// Estratégia 2: Palavras-chave
const palavrasChave = alvoOJ.split(' ').filter(palavra => 
    palavra.length > 2 && 
    !['de', 'da', 'do'].includes(palavra.toLowerCase())
);

// Estratégia 3: Match parcial
const opcaoParcial = page.locator('mat-option')
    .filter({ hasText: new RegExp(alvoOJ, 'i') });

// Estratégia 4: Filtragem por teclado
await page.keyboard.type(alvoOJ, { delay: 100 });
```

### 4. **Verificação Robusta de Overlay**

```javascript
const seletoresOverlay = [
    '.cdk-overlay-pane .mat-select-panel',
    '.mat-select-panel',
    '.cdk-overlay-pane mat-option',
    'mat-option'
];

let overlayAberto = false;
for (const seletor of seletoresOverlay) {
    try {
        await page.locator(seletor).first().waitFor({ state: 'visible', timeout: 3000 });
        overlayAberto = true;
        break;
    } catch (e) {
        continue;
    }
}
```

### 5. **Confirmação e Validação Aprimoradas**

```javascript
// Múltiplos seletores para botão de confirmação
const seletoresSim = [
    'button:has-text("Sim")',
    'button:has-text("OK")',
    'button:has-text("Confirmar")',
    'button[class*="confirm"]',
    '.btn-success:has-text("Sim")'
];

// Verificação na tabela de vínculos
const ojNaTabela = await page.waitForFunction(
    (painelId, nomeOJ) => {
        const painel = document.getElementById(painelId);
        const tabela = painel?.querySelector('table, .table, [role="table"]');
        return tabela?.textContent?.toLowerCase().includes(nomeOJ.toLowerCase());
    },
    painelId,
    nomeOJ,
    { timeout: 10000 }
);
```

## Melhorias de Timeout e Estabilidade

- **Timeouts aumentados**: De 500ms para 1000-2000ms em operações críticas
- **Aguardar estabilização**: Espera adicional após cliques e antes de validações
- **Force clicks**: Uso de `{ force: true }` para elementos que podem estar parcialmente ocultos
- **Scroll automático**: `scrollIntoViewIfNeeded()` para garantir visibilidade

## Logs de Debug Aprimorados

```javascript
// Listagem de opções disponíveis
const opcoesDisponiveis = await page.locator('mat-option').allTextContents();
console.log(`Opções disponíveis (${opcoesDisponiveis.length} total):`, opcoesDisponiveis);

// Validação de seleção
const valorSelecionado = await matSelectEspecifico.textContent();
console.log(`Valor selecionado: "${valorSelecionado}"`);
```

## Fluxo de Execução Otimizado

1. **Expansão do Acordeão**: Localização determinística do header correto
2. **Modo de Inclusão**: Múltiplas estratégias para botão "Adicionar"
3. **Aguardar Mat-Select**: Verificação de habilitação e visibilidade
4. **Seleção de OJ**: 4 estratégias progressivas de busca
5. **Confirmação**: Detecção e tratamento de modais diversos
6. **Validação**: Verificação na tabela de vínculos

## Como Testar

1. Execute a aplicação em modo desenvolvimento:
   ```bash
   npm run dev
   ```

2. Carregue um perito com OJs para vincular

3. Execute a automação e observe os logs detalhados no console

4. Verifique se:
   - O mat-select abre corretamente
   - As opções são listadas
   - A seleção é feita com sucesso
   - A confirmação funciona
   - O OJ aparece na tabela de vínculos

## Observações

- O código mantém compatibilidade com o fluxo tradicional como fallback
- Logs detalhados ajudam na identificação de problemas específicos
- Timeouts são adaptativos baseados na complexidade da operação
- A função `vincularOJMelhorado` é tentada primeiro, com fallback para o método tradicional

Esta correção deve resolver os problemas de vinculação de OJ para peritos, tornando o processo mais confiável e robusto.