/**
 * Processador Paralelo de Órgãos Julgadores (OJs)
 * Implementa estratégias de busca e processamento paralelo para otimizar performance
 */

const ContextualDelayManager = require('./contextual-delay-manager');
const SmartRetryManager = require('./smart-retry-manager');
const TimeoutManager = require('../utils/timeouts.js');

class ParallelOJProcessor {
  constructor(page, timeoutManager, config, domCache = null) {
    this.page = page;
    this.timeoutManager = timeoutManager;
    this.config = config;
    this.delayManager = new ContextualDelayManager(timeoutManager);
    this.retryManager = new SmartRetryManager(timeoutManager);
    this.domCache = domCache;
    this.ojCache = new Set();
    this.results = [];
    this.maxConcurrency = 3; // Máximo de OJs processados simultaneamente
    this.batchSize = 5; // Tamanho do lote para processamento
  }

  /**
   * Processa OJs em paralelo com controle de concorrência
   */
  async processOJsInParallel(orgaos) {
    console.log(`🚀 Iniciando processamento paralelo de ${orgaos.length} OJs`);
    
    // Normalizar e filtrar OJs
    const ojsNormalizados = orgaos.map(orgao => ({
      original: orgao,
      normalized: this.normalizeOrgaoName(orgao)
    }));
    
    // Verificar OJs já cadastrados em paralelo
    await this.loadExistingOJsParallel();
    
    // Filtrar OJs que precisam ser processados
    const ojsToProcess = ojsNormalizados.filter(oj => !this.ojCache.has(oj.normalized));
    
    console.log(`📊 ${ojsToProcess.length} OJs para processar, ${this.ojCache.size} já cadastrados`);
    
    if (ojsToProcess.length === 0) {
      console.log('✅ Todos os OJs já estão cadastrados');
      return this.results;
    }
    
    // Processar em lotes com concorrência controlada
    const batches = this.createBatches(ojsToProcess, this.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Processando lote ${i + 1}/${batches.length} (${batch.length} OJs)`);
      
      await this.processBatchWithConcurrency(batch);
      
      // Pausa entre lotes para não sobrecarregar o sistema
      if (i < batches.length - 1) {
        await this.delayManager.smartDelay('betweenOJs', { priority: 'high' });
      }
    }
    
    return this.results;
  }

  /**
   * Carrega OJs existentes usando múltiplas estratégias em paralelo
   */
  async loadExistingOJsParallel() {
    console.log('🔍 Carregando OJs existentes em paralelo...');
    
    const strategies = [
      this.loadFromTable.bind(this),
      this.loadFromMaterialTable.bind(this),
      this.loadFromDataTable.bind(this),
      this.loadFromAriaRows.bind(this)
    ];
    
    // Executar estratégias em paralelo
    const results = await Promise.allSettled(
      strategies.map(strategy => this.executeWithTimeout(strategy, 8000))
    );
    
    // Consolidar resultados
    const allOJs = new Set();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        result.value.forEach(oj => allOJs.add(oj));
        console.log(`✅ Estratégia ${index + 1}: ${result.value.size} OJs encontrados`);
      } else {
        console.log(`⚠️ Estratégia ${index + 1} falhou: ${result.reason?.message || 'Timeout'}`);
      }
    });
    
    // Atualizar cache
    allOJs.forEach(oj => this.ojCache.add(oj));
    console.log(`🎯 Total de OJs já cadastrados: ${this.ojCache.size}`);
  }

  /**
   * Processa um lote de OJs com controle de concorrência
   */
  async processBatchWithConcurrency(batch) {
    const semaphore = new Semaphore(this.maxConcurrency);
    
    const promises = batch.map(async (oj) => {
      await semaphore.acquire();
      try {
        return await this.processOJWithRetry(oj);
      } finally {
        semaphore.release();
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    // Processar resultados
    results.forEach((result, index) => {
      const oj = batch[index];
      if (result.status === 'fulfilled') {
        this.results.push(result.value);
        this.ojCache.add(oj.normalized);
        console.log(`✅ OJ processado: ${oj.original}`);
      } else {
        console.error(`❌ Erro ao processar OJ ${oj.original}:`, result.reason);
        this.results.push({
          orgao: oj.original,
          status: 'Erro',
          erro: result.reason.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Processa um OJ individual com retry inteligente
   */
  async processOJWithRetry(oj, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎯 Processando OJ ${oj.original} (tentativa ${attempt}/${maxRetries})`);
        
        const result = await this.processOJOptimized(oj);
        
        if (attempt > 1) {
          console.log(`✅ OJ processado com sucesso na tentativa ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Tentativa ${attempt} falhou para OJ ${oj.original}: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Backoff exponencial
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await this.delay(delay);
          
          // Tentar recuperação rápida
          await this.quickRecovery();
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Processamento otimizado de OJ individual
   */
  async processOJOptimized(oj) {
    const startTime = Date.now();
    
    try {
      // Usar timeouts adaptativos
      const timeout = TimeoutManager.obterTimeout('pje', 'vincularOJ');
      
      // Executar ações em sequência otimizada
      await this.executeWithTimeout(async () => {
        await this.clickAddLocationButtonOptimized();
        await this.selectOrgaoJulgadorOptimized(oj.original);
        await this.configurePapelVisibilidadeOptimized();
        await this.saveConfigurationOptimized();
        await this.verifySuccessOptimized();
      }, timeout);
      
      const duration = Date.now() - startTime;
      
      // Registrar performance para timeouts adaptativos
      TimeoutManager.registrarPerformance('vincularOJ', startTime, true);
      
      return {
        orgao: oj.original,
        status: 'Vinculado com Sucesso',
        erro: null,
        perfil: this.config.perfil,
        cpf: this.config.cpf,
        timestamp: new Date().toISOString(),
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      TimeoutManager.registrarPerformance('vincularOJ', startTime, false);
      throw error;
    }
  }

  // === ESTRATÉGIAS DE CARREGAMENTO DE OJs ===
  
  async loadFromTable() {
    const ojs = new Set();
    try {
      const rows = await this.page.$$('table tbody tr');
      for (const row of rows.slice(0, 20)) { // Limitar para performance
        const text = await row.textContent();
        this.extractOJsFromText(text, ojs);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar da tabela padrão:', error.message);
    }
    return ojs;
  }
  
  async loadFromMaterialTable() {
    const ojs = new Set();
    try {
      const rows = await this.page.$$('.mat-table .mat-row');
      for (const row of rows.slice(0, 20)) {
        const text = await row.textContent();
        this.extractOJsFromText(text, ojs);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar da tabela Material:', error.message);
    }
    return ojs;
  }
  
  async loadFromDataTable() {
    const ojs = new Set();
    try {
      const rows = await this.page.$$('.datatable tbody tr');
      for (const row of rows.slice(0, 20)) {
        const text = await row.textContent();
        this.extractOJsFromText(text, ojs);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar da DataTable:', error.message);
    }
    return ojs;
  }
  
  async loadFromAriaRows() {
    const ojs = new Set();
    try {
      const rows = await this.page.$$('[role="row"]');
      for (const row of rows.slice(0, 20)) {
        const text = await row.textContent();
        this.extractOJsFromText(text, ojs);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar das ARIA rows:', error.message);
    }
    return ojs;
  }

  // === AÇÕES OTIMIZADAS ===
  
  async clickAddLocationButtonOptimized() {
    console.log('🎯 ASSERTIVO: Verificando se modal já está aberto...');
    
    // 1. PRIMEIRO: Verificar se o modal já está aberto
    const modalJaAberto = await this.page.locator('mat-dialog-container, [role="dialog"]').isVisible();
    if (modalJaAberto) {
      console.log('✅ Modal já está aberto - PULANDO clique no botão');
      return;
    }
    
    console.log('🎯 Modal fechado - clicando botão Adicionar UMA VEZ...');
    
    // 2. SEGUNDO: Clicar UMA ÚNICA VEZ no botão mais específico
    const seletorEspecifico = 'button:has-text("Adicionar Localização/Visibilidade"):not([disabled])';
    
    try {
      // Aguardar elemento específico aparecer
      await this.page.waitForSelector(seletorEspecifico, { timeout: 3000 });
      
      // Clicar UMA vez apenas usando retry manager
      await this.retryManager.retryClick(
          async (selector) => {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
            } else {
              throw new Error('Element not found');
            }
          },
          seletorEspecifico
        );
      console.log('✅ CLIQUE ÚNICO realizado no botão Adicionar');
      
      // 3. TERCEIRO: Aguardar modal abrir de forma assertiva
      console.log('🎯 Aguardando modal abrir...');
      await this.page.waitForSelector('mat-dialog-container, [role="dialog"]', { timeout: 5000 });
      console.log('✅ Modal CONFIRMADO aberto');
      
      return;
      
    } catch (error) {
      console.log(`❌ Falha no clique assertivo: ${error.message}`);
      throw new Error(`Botão Adicionar não encontrado: ${error.message}`);
    }
  }
  
  async clickAddLocationButtonOptimizedFallback() {
    // Verificar se a página foi fechada
    if (this.page.isClosed()) {
      throw new Error('Página foi fechada antes de clicar no botão Adicionar');
    }
    
    console.log('🔄 Procurando botão "Adicionar Localização/Visibilidade"...');
    
    // Aguardar estabilização da página
    await this.delayManager.smartDelay('pageStabilization', { priority: 'medium' });
    
    const selectors = [
      'button:has-text("Adicionar Localização/Visibilidade"):not([disabled])',
      'button:has-text("Adicionar Localização"):not([disabled])',
      'button:has-text("Adicionar"):not([disabled]):visible',
      '.btn-adicionar:not([disabled])',
      '[data-action="add"]:not([disabled])',
      '.mat-button:has-text("Adicionar"):not([disabled])',
      'button[title*="Adicionar"]:not([disabled])',
      'input[value*="Adicionar"]:not([disabled])',
      // Seletores mais específicos para o PJE
      'button.btn.btn-primary:has-text("Adicionar"):not([disabled])',
      'button.mat-raised-button:has-text("Adicionar"):not([disabled])',
      'button[type="button"]:has-text("Adicionar"):not([disabled])',
      // Seletores por posição e contexto
      'fieldset:has-text("Órgãos Julgadores") button:has-text("Adicionar"):not([disabled])',
      'div:has-text("Órgãos Julgadores") button:has-text("Adicionar"):not([disabled])',
      // Seletores alternativos
      'button:contains("Adicionar"):not([disabled])',
      '[role="button"]:has-text("Adicionar"):not([disabled])'
    ];
    
    let addButton = null;
    
    for (const selector of selectors) {
      try {
        // Verificar se a página ainda está aberta
        if (this.page.isClosed()) {
          throw new Error('Página foi fechada durante a busca do botão');
        }
        
        console.log(`🔍 Testando seletor: ${selector}`);
        
        const element = await this.retryManager.retryElementSearch(
          async (sel) => {
            // Verificar novamente se a página está aberta
            if (this.page.isClosed()) {
              throw new Error('Página fechada durante waitForSelector');
            }
            return await this.page.waitForSelector(sel, { 
              timeout: TimeoutManager.obterTimeout('interacao', 'aguardarElemento'),
              state: 'visible'
            });
          },
          selector
        );
        
        if (element && await element.isVisible()) {
          addButton = element;
          console.log(`✅ Botão encontrado: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Seletor ${selector} falhou: ${error.message}`);
        continue;
      }
    }
    
    if (!addButton) {
      console.log('🔍 Botão não encontrado com seletores padrão, tentando estratégias de fallback...');
      
      // Estratégia de fallback 1: Buscar por qualquer botão com texto "Adicionar"
      try {
        const fallbackButtons = await this.page.$$('button');
        for (const button of fallbackButtons) {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          if (text && text.toLowerCase().includes('adicionar') && isVisible && isEnabled) {
            console.log(`✅ Botão encontrado via fallback: "${text}"`);
            addButton = button;
            break;
          }
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback 1 falhou: ${fallbackError.message}`);
      }
      
      // Estratégia de fallback 2: Buscar por inputs com value "Adicionar"
      if (!addButton) {
        try {
          const fallbackInputs = await this.page.$$('input[type="button"], input[type="submit"]');
          for (const input of fallbackInputs) {
            const value = await input.getAttribute('value');
            const isVisible = await input.isVisible();
            const isEnabled = await input.isEnabled();
            
            if (value && value.toLowerCase().includes('adicionar') && isVisible && isEnabled) {
              console.log(`✅ Input encontrado via fallback: "${value}"`);
              addButton = input;
              break;
            }
          }
        } catch (fallbackError) {
          console.log(`❌ Fallback 2 falhou: ${fallbackError.message}`);
        }
      }
      
      if (!addButton) {
        // Debug: listar todos os botões visíveis
        try {
          console.log('🔍 DEBUG: Listando todos os botões visíveis na página...');
          const allButtons = await this.page.$$('button:visible, input[type="button"]:visible, input[type="submit"]:visible');
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            try {
              const text = await allButtons[i].textContent() || await allButtons[i].getAttribute('value');
              const classes = await allButtons[i].getAttribute('class');
              console.log(`  Botão ${i + 1}: "${text}" [${classes}]`);
            } catch (e) {
              console.log(`  Botão ${i + 1}: Erro ao obter informações`);
            }
          }
        } catch (debugError) {
          console.log(`⚠️ Erro no debug: ${debugError.message}`);
        }
        
        throw new Error('Botão "Adicionar Localização/Visibilidade" não encontrado após todas as tentativas');
      }
    }
    
    // Verificar se a página ainda está aberta antes de clicar
    if (this.page.isClosed()) {
      throw new Error('Página foi fechada antes do clique no botão');
    }
    
    console.log('🖱️ Tentando clicar no botão Adicionar...');
    
    // Múltiplas estratégias de clique
    const clickStrategies = [
      {
        name: 'click normal',
        action: async () => {
          await addButton.click({ timeout: 8000 });
        }
      },
      {
        name: 'click com force',
        action: async () => {
          await addButton.click({ force: true, timeout: 8000 });
        }
      },
      {
        name: 'click após scroll',
        action: async () => {
          await addButton.scrollIntoViewIfNeeded();
          await this.delayManager.smartDelay('scroll', { priority: 'low' });
          await addButton.click({ timeout: 8000 });
        }
      },
      {
        name: 'click via JavaScript',
        action: async () => {
          await addButton.evaluate(button => button.click());
        }
      }
    ];
    
    let clickSuccessful = false;
    let lastError = null;
    
    for (const strategy of clickStrategies) {
      try {
        // Verificar se a página ainda está aberta
        if (this.page.isClosed()) {
          throw new Error('Página foi fechada antes da estratégia de clique');
        }
        
        console.log(`🔄 Tentando: ${strategy.name}...`);
        await strategy.action();
        clickSuccessful = true;
        console.log(`✅ ${strategy.name} bem-sucedido!`);
        break;
      } catch (clickError) {
        console.log(`❌ ${strategy.name} falhou: ${clickError.message}`);
        lastError = clickError;
        
        // Aguardar um pouco antes da próxima tentativa
        await this.delayManager.smartDelay('retryClick', { priority: 'low' });
      }
    }
    
    if (!clickSuccessful) {
      throw new Error(`Falha ao clicar no botão Adicionar: ${lastError?.message}`);
    }
    
    // Aguardar modal/formulário carregar
    await this.delayManager.smartDelay('modalLoad', { priority: 'medium' });
    console.log('✅ Botão Adicionar clicado com sucesso');
  }
  
  async selectOrgaoJulgadorOptimized(orgao) {
    console.log(`🎯 ASSERTIVO: Seleção direta de OJ: ${orgao}`);
    
    try {
      // Verificar se a página foi fechada
      if (this.page.isClosed()) {
        throw new Error('Página foi fechada antes de selecionar o Órgão Julgador');
      }
      
      // 1. DIRETO: Encontrar e clicar no mat-select de Órgão Julgador
      console.log('🎯 Procurando mat-select de Órgão Julgador...');
      
      // Seletores expandidos para maior compatibilidade (copiado da versão sequencial)
      const matSelectSelectors = [
        'mat-dialog-container mat-select[placeholder="Órgão Julgador"]',
        'mat-dialog-container mat-select[placeholder="Orgao Julgador"]',
        '[role="dialog"] mat-select[placeholder="Órgão Julgador"]',
        'mat-dialog-container mat-select[name="idOrgaoJulgadorSelecionado"]',
        'mat-dialog-container mat-select[placeholder*="Órgão"]',
        '[role="dialog"] mat-select[placeholder*="Órgão"]',
        'mat-dialog-container mat-select',
        '[role="dialog"] mat-select'
      ];
      
      let matSelectElement = null;
      for (const selector of matSelectSelectors) {
        try {
          console.log(`🔍 Testando seletor: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 2000 });
          matSelectElement = selector;
          console.log(`✅ Mat-select encontrado: ${selector}`);
          break;
        } catch (e) {
          console.log(`❌ Seletor falhou: ${selector}`);
        }
      }
      
      if (!matSelectElement) {
        throw new Error('Mat-select de Órgão Julgador não encontrado no modal');
      }
      
      // Verificar se a página ainda está aberta antes de clicar
      if (this.page.isClosed()) {
        throw new Error('Página foi fechada antes de clicar no mat-select');
      }
      
      // Clicar no mat-select usando retry manager
      await this.retryManager.retryClick(
        async (selector) => {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
          } else {
            throw new Error('Element not found');
          }
        },
        matSelectElement
      );
      console.log('✅ Mat-select de OJ clicado');
      
      // 2. AGUARDAR: Opções aparecerem
      console.log('🎯 Aguardando opções do dropdown...');
      await this.page.waitForSelector('mat-option', { timeout: 3000 });
      
      // Verificar se a página ainda está aberta
      if (this.page.isClosed()) {
        throw new Error('Página foi fechada após aguardar opções');
      }
      
      // 3. SELECIONAR: Buscar opção exata
      console.log(`🎯 Procurando opção: ${orgao}`);
      const opcoes = this.page.locator('mat-option');
      const numOpcoes = await opcoes.count();
      
      console.log(`📋 ${numOpcoes} opções disponíveis`);
      
      let opcaoEncontrada = false;
      for (let i = 0; i < numOpcoes; i++) {
        // Verificar se a página ainda está aberta a cada iteração
        if (this.page.isClosed()) {
          throw new Error('Página foi fechada durante busca de opções');
        }
        
        const textoOpcao = await opcoes.nth(i).textContent();
        if (textoOpcao && textoOpcao.includes(orgao)) {
          await opcoes.nth(i).click();
          console.log(`✅ OJ selecionado: ${textoOpcao.trim()}`);
          opcaoEncontrada = true;
          break;
        }
      }
      
      if (!opcaoEncontrada) {
        throw new Error(`OJ "${orgao}" não encontrado nas opções disponíveis`);
      }
      
      // 4. AGUARDAR: Processamento da seleção com delay contextual
      await this.delay(1000); // Delay simples para processamento da seleção
      console.log('✅ Seleção de OJ concluída');
      
    } catch (error) {
      console.error(`❌ Erro na seleção assertiva de OJ: ${error.message}`);
      throw error;
    }
  }
  
  async configurePapelVisibilidadeOptimized() {
    // Verificar se a página foi fechada
    if (this.page.isClosed()) {
      throw new Error('Página foi fechada antes de configurar papel e visibilidade');
    }
    
    console.log('🔧 Configurando papel e visibilidade...');
    
    try {
      // Aguardar modal carregar
      await this.page.waitForTimeout(1500);
      
      // 1. CONFIGURAR PAPEL (Assessor) com múltiplas tentativas
      console.log('🎯 Configurando papel: Assessor');
      const seletoresPapel = [
        'mat-dialog-container mat-select[placeholder*="Papel"]',
        'mat-dialog-container mat-select[formcontrolname*="papel"]',
        'mat-dialog-container mat-select[aria-label*="Papel"]',
        'mat-select[placeholder*="Papel"]',
        'mat-select:has-text("Papel")',
        '.mat-select-trigger:has-text("Papel")',
        // Seletores adicionais da versão sequencial
        'mat-select[formcontrolname="papel"]',
        'mat-select[ng-reflect-name="papel"]',
        'select[name="papel"]',
        'mat-select:has(mat-option:has-text("Assessor"))',
        '[placeholder*="Papel"]',
        'mat-select[aria-label*="papel"]',
        'mat-select[placeholder*="papel" i]',
        '.mat-select:has(.mat-select-placeholder:contains("Papel"))',
        '.mat-form-field:has(mat-label:contains("Papel")) mat-select'
      ];
      
      let matSelectPapel = null;
      let tentativasPapel = 0;
      const maxTentativasPapel = 3;
      
      while (!matSelectPapel && tentativasPapel < maxTentativasPapel) {
        tentativasPapel++;
        console.log(`🔄 Tentativa ${tentativasPapel} de encontrar campo de papel...`);
        
        for (const seletor of seletoresPapel) {
          try {
            if (this.page.isClosed()) {
              throw new Error('Página fechada durante busca do papel');
            }
            
            const elemento = await this.page.waitForSelector(seletor, { timeout: 3000 });
            if (elemento && await elemento.isVisible() && await elemento.isEnabled()) {
              matSelectPapel = elemento;
              console.log(`✅ Campo Papel encontrado: ${seletor}`);
              break;
            }
          } catch (error) {
            console.log(`⚠️ Seletor papel não encontrado: ${seletor}`);
          }
        }
        
        if (!matSelectPapel) {
          console.log(`⚠️ Tentativa ${tentativasPapel} falhou, aguardando antes da próxima...`);
          await this.delayManager.smartDelay('retryPapel', { priority: 'medium' });
        }
      }
      
      if (matSelectPapel) {
        // Clicar no mat-select usando retry manager
        await this.retryManager.retryClick(
          async () => {
            await matSelectPapel.click();
          },
          'campo de papel'
        );
        await this.page.waitForTimeout(1000);
        
        // Procurar opção "Assessor" com múltiplas estratégias
        const opcoesPapel = this.page.locator('mat-option');
        const totalOpcoes = await opcoesPapel.count();
        console.log(`📋 ${totalOpcoes} opções de papel disponíveis`);
        
        let perfilSelecionado = false;
        
        // Estratégia 1: Busca exata por "Assessor"
        for (let i = 0; i < totalOpcoes; i++) {
          if (this.page.isClosed()) {
            throw new Error('Página fechada durante seleção do papel');
          }
          
          const opcao = opcoesPapel.nth(i);
          const texto = await opcao.textContent();
          
          if (texto && texto.trim().toLowerCase() === 'assessor') {
            await opcao.click();
            console.log(`✅ Papel selecionado (busca exata): ${texto.trim()}`);
            perfilSelecionado = true;
            break;
          }
        }
        
        // Estratégia 2: Busca por inclusão
        if (!perfilSelecionado) {
          for (let i = 0; i < totalOpcoes; i++) {
            const opcao = opcoesPapel.nth(i);
            const texto = await opcao.textContent();
            
            if (texto && texto.toLowerCase().includes('assessor')) {
              await opcao.click();
              console.log(`✅ Papel selecionado (busca por inclusão): ${texto.trim()}`);
              perfilSelecionado = true;
              break;
            }
          }
        }
        
        // Estratégia 3: Busca por palavras-chave
        if (!perfilSelecionado) {
          const palavrasChave = ['assessor', 'servidor', 'funcionario'];
          for (const palavra of palavrasChave) {
            for (let i = 0; i < totalOpcoes; i++) {
              const opcao = opcoesPapel.nth(i);
              const texto = await opcao.textContent();
              if (texto && texto.trim().toLowerCase().includes(palavra)) {
                await opcao.click();
                console.log(`✅ Papel selecionado (palavra-chave '${palavra}'): ${texto.trim()}`);
                perfilSelecionado = true;
                break;
              }
            }
            if (perfilSelecionado) break;
          }
        }
        
        // Estratégia 4: Selecionar primeira opção como fallback
        if (!perfilSelecionado && totalOpcoes > 0) {
          const primeiraOpcao = opcoesPapel.first();
          await primeiraOpcao.click();
          const textoSelecionado = await primeiraOpcao.textContent();
          console.log(`⚠️ Papel específico não encontrado, selecionando primeira opção: "${textoSelecionado?.trim()}"`);
        }
      } else {
        console.log('⚠️ Campo Papel não encontrado após múltiplas tentativas');
      }
      
      await this.page.waitForTimeout(1000);
      
      // 2. VERIFICAR VISIBILIDADE (otimizado - pula se já for "TODOS")
      console.log('🎯 Verificando se visibilidade precisa ser configurada...');
      
      // Verificar se campo de visibilidade existe e qual seu valor
      const seletoresVisibilidade = [
        'mat-dialog-container mat-select[placeholder*="Localização"]',
        'mat-dialog-container mat-select[placeholder*="Visibilidade"]',
        '[role="dialog"] mat-select[placeholder*="Localização"]',
        '[role="dialog"] mat-select[placeholder*="Visibilidade"]',
        'mat-dialog-container mat-select[name*="visibilidade"]',
        'mat-dialog-container mat-select[name*="localizacao"]',
        'mat-select[formcontrolname="visibilidade"]',
        'mat-select[formcontrolname="localizacao"]'
      ];
      
      let precisaConfigurarVisibilidade = false;
      
      // Busca rápida pelo campo de visibilidade
      for (const seletor of seletoresVisibilidade) {
        try {
          if (this.page.isClosed()) {
            throw new Error('Página fechada durante verificação da visibilidade');
          }
          
          const elemento = await this.page.waitForSelector(seletor, { timeout: 1500 });
          if (elemento && await elemento.isVisible()) {
            const valorAtual = await elemento.textContent();
            console.log(`🔍 Valor atual da visibilidade: "${valorAtual?.trim()}"`);
            
            // Se já está como "TODOS" ou "Todos", não precisa configurar
            if (valorAtual && (valorAtual.trim().toLowerCase() === 'todos' || valorAtual.trim().toLowerCase().includes('todos'))) {
              console.log('✅ Visibilidade já configurada como "TODOS" - pulando configuração');
              precisaConfigurarVisibilidade = false;
            } else {
              console.log('🔧 Visibilidade precisa ser configurada');
              precisaConfigurarVisibilidade = true;
            }
            break;
          }
        } catch (error) {
          // Continua tentando outros seletores
          continue;
        }
      }
      
      // Só configura visibilidade se necessário
      if (precisaConfigurarVisibilidade) {
        console.log('🔧 Configurando visibilidade...');
        
        let matSelectVisibilidade = null;
        
        // Encontrar campo de visibilidade para configurar
        for (const seletor of seletoresVisibilidade) {
          try {
            const elemento = await this.page.waitForSelector(seletor, { timeout: 2000 });
            if (elemento && await elemento.isVisible() && await elemento.isEnabled()) {
              matSelectVisibilidade = elemento;
              console.log(`✅ Campo Visibilidade encontrado para configuração: ${seletor}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (matSelectVisibilidade) {
          try {
            // Clicar no mat-select
            await this.retryManager.retryClick(
              async () => {
                await matSelectVisibilidade.click({ timeout: 8000 });
              },
              'campo de visibilidade'
            );
            await this.page.waitForTimeout(800);
            
            // Selecionar "Público" ou "Todos" ou primeira opção disponível
            const opcoesVisibilidade = this.page.locator('mat-option');
            const totalOpcoesVis = await opcoesVisibilidade.count();
            let visibilidadeSelecionada = false;
            
            // Tentar encontrar "Público" ou "Todos"
            for (let i = 0; i < totalOpcoesVis; i++) {
              const opcao = opcoesVisibilidade.nth(i);
              const texto = await opcao.textContent();
              if (texto && (texto.trim().toLowerCase().includes('público') || texto.trim().toLowerCase().includes('todos'))) {
                await opcao.click();
                console.log(`✅ Visibilidade selecionada: ${texto.trim()}`);
                visibilidadeSelecionada = true;
                break;
              }
            }
            
            // Fallback: selecionar primeira opção
            if (!visibilidadeSelecionada && totalOpcoesVis > 0) {
              const primeiraOpcaoVis = opcoesVisibilidade.first();
              await primeiraOpcaoVis.click();
              const textoVis = await primeiraOpcaoVis.textContent();
              console.log(`⚠️ "Público/Todos" não encontrado, selecionando primeira opção: ${textoVis?.trim()}`);
            }
          } catch (error) {
            console.log(`⚠️ Erro ao configurar visibilidade: ${error.message}`);
          }
        } else {
          console.log('⚠️ Campo Visibilidade não encontrado para configuração');
        }
      }
      
      await this.page.waitForTimeout(1000);
      console.log('✅ Configuração de papel e visibilidade concluída');
      
    } catch (error) {
      throw new Error(`Erro ao configurar papel/visibilidade: ${error.message}`);
    }
  }
  
  async saveConfigurationOptimized() {
    console.log('🎯 ASSERTIVO: Salvamento direto...');
    
    try {
      if (this.page.isClosed()) {
        throw new Error('Página fechada durante salvamento');
      }
      
      // 1. DIRETO: Botão Gravar com estrutura HTML específica
      console.log('🎯 Procurando botão Gravar com estrutura específica...');
      const botaoGravar = 'mat-dialog-container button:has(.mat-button-wrapper:has-text("Gravar")):not([disabled])';
      
      // Debug: listar todos os botões disponíveis
      const todosBotoes = await this.page.locator('mat-dialog-container button').all();
      console.log(`🔍 [DEBUG] Total de botões no modal: ${todosBotoes.length}`);
      
      for (let i = 0; i < todosBotoes.length; i++) {
        const botaoTexto = await todosBotoes[i].textContent();
        const botaoDisabled = await todosBotoes[i].isDisabled();
        console.log(`🔍 [DEBUG] Botão ${i + 1}: "${botaoTexto?.trim()}" (disabled: ${botaoDisabled})`);
      }
      
      console.log(`🔍 [DEBUG] Aguardando seletor: ${botaoGravar}`);
      await this.page.waitForSelector(botaoGravar, { timeout: 3000 });
      console.log('🔍 [DEBUG] Seletor encontrado, executando clique...');
      
      // Usar retryManager como na versão sequencial
      await this.retryManager.retryPJEOperation(
        async () => {
          const element = await this.page.$(botaoGravar);
          if (element) {
            console.log('🔍 [DEBUG] Elemento encontrado, clicando...');
            await element.click();
            console.log('🔍 [DEBUG] Clique executado com sucesso');
          } else {
            throw new Error('Save button not found');
          }
        },
        'saveConfiguration'
      );
      
      console.log('✅ CLIQUE no botão Gravar realizado');
      
      // 2. AGUARDAR: Modal fechar ou sucesso
      console.log('🎯 Aguardando processamento...');
      
      // Aguardar uma das condições: modal fechar OU mensagem de sucesso
      await Promise.race([
        this.page.waitForSelector('mat-dialog-container', { state: 'detached', timeout: 5000 }),
        this.page.waitForSelector(':has-text("sucesso"), :has-text("salvo"), :has-text("cadastrado")', { timeout: 5000 })
      ]);
      
      console.log('✅ Salvamento confirmado');
      
    } catch (error) {
      console.log(`⚠️ Erro no salvamento assertivo: ${error.message}`);
      console.log(`🔍 [DEBUG] Stack trace:`, error.stack);
      
      // Fallback: tentar outros botões com estruturas específicas
      const fallbackSelectors = [
        'button:has(.mat-button-wrapper:has-text("Gravar"))',
        '[role="dialog"] button:has(.mat-button-wrapper:has-text("Gravar"))',
        'button:has(.mat-button-wrapper:has-text("Salvar"))',
        'button:has(.mat-button-wrapper:has-text("Confirmar"))',
        '[role="dialog"] button:has-text("Gravar")',
        'button:has-text("Salvar")',
        'button:has-text("Confirmar")',
        'mat-dialog-container button[type="submit"]',
        'mat-dialog-container button:not([disabled])'
      ];
      
      console.log('🔍 [DEBUG] Tentando fallback selectors...');
      for (const selector of fallbackSelectors) {
        try {
          console.log(`🔍 [DEBUG] Testando selector: ${selector}`);
          const botao = this.page.locator(selector);
          const count = await botao.count();
          console.log(`🔍 [DEBUG] Elementos encontrados para "${selector}": ${count}`);
          
          if (count > 0) {
            const textoFallback = await botao.first().textContent();
            console.log(`🔍 [DEBUG] Texto do botão fallback: "${textoFallback?.trim()}"`);
            await botao.first().click();
            console.log(`✅ Fallback: ${selector} clicado`);
            return;
          }
        } catch (fallbackError) {
          console.log(`🔍 [DEBUG] Erro no fallback "${selector}": ${fallbackError.message}`);
          continue;
        }
      }
      
      throw new Error('Nenhum botão de salvamento encontrado');
    }
  }
  
  async verifySuccessOptimized() {
    const timeout = TimeoutManager.obterTimeout('pje', 'aguardarProcessamento');
    
    try {
      // Aguardar indicadores de sucesso
      const successSelectors = [
        '.success-message',
        '.alert-success',
        '.mat-snack-bar-container',
        '[role="alert"]:has-text("sucesso")',
        '.notification-success'
      ];
      
      const successPromise = Promise.race(
        successSelectors.map(selector => 
          this.page.waitForSelector(selector, { timeout })
        )
      );
      
      await successPromise;
      await this.delayManager.smartDelay('verification', { priority: 'medium' });
      
    } catch (error) {
      // Se não encontrar mensagem de sucesso, verificar se não há erro
      const errorSelectors = [
        '.error-message',
        '.alert-danger',
        '.mat-error',
        '[role="alert"]:has-text("erro")'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = await this.page.$(selector);
        if (errorElement && await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          throw new Error(`Erro na operação: ${errorText}`);
        }
      }
      
      // Se não há erro visível, assumir sucesso
      console.log('⚠️ Mensagem de sucesso não encontrada, mas sem erros detectados');
    }
  }

  // === UTILITÁRIOS ===
  
  extractOJsFromText(text, ojSet) {
    if (!text) return;
    
    const patterns = [
      /EXE\d+/gi,
      /LIQ\d+/gi,
      /CON\d+/gi,
      /DIVEX/gi,
      /[\dº]+ª?\s*Vara\s+do\s+Trabalho/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const normalized = this.normalizeOrgaoName(match.trim());
          ojSet.add(normalized);
        });
      }
    });
  }
  
  normalizeOrgaoName(orgao) {
    return orgao
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/[^A-Z0-9\s]/g, '');
  }
  
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  
  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operação excedeu timeout de ${timeout}ms`));
      }, timeout);
      
      fn().then(resolve).catch(reject).finally(() => {
        clearTimeout(timer);
      });
    });
  }
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async quickRecovery() {
    try {
      // Fechar modais abertos
      const modalSelectors = [
        '.modal-backdrop',
        '.mat-dialog-container',
        '.overlay'
      ];
      
      for (const selector of modalSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.page.keyboard.press('Escape');
          await this.delayManager.smartDelay('recovery', { priority: 'low' });
          break;
        }
      }
    } catch (error) {
      // Ignorar erros de recuperação
    }
  }
  
  // Métodos de seleção de OJ (mantidos para compatibilidade)
  async selectByValue(orgao) {
    // Para mat-select do Angular Material
    try {
      // Aguardar mat-select ficar habilitado
      await this.waitForMatSelectEnabled();
      
      // Primeiro clicar no mat-select para abrir
      await this.page.click('mat-select');
      await this.page.waitForTimeout(1000);
      
      // Procurar pela opção com o valor
      const option = this.page.locator(`mat-option:has-text("${orgao}")`);
      await option.click();
    } catch (error) {
      throw new Error(`Erro ao selecionar por valor: ${error.message}`);
    }
  }
  
  async selectByText(orgao) {
    // Para mat-select do Angular Material
    try {
      // Aguardar mat-select ficar habilitado
      await this.waitForMatSelectEnabled();
      
      // Primeiro clicar no mat-select para abrir
      const matSelect = this.page.locator('mat-select').first();
      await matSelect.click();
      await this.page.waitForTimeout(1000);
      
      // Procurar pela opção com o texto exato
      const option = this.page.locator(`mat-option:has-text("${orgao}")`);
      await option.click();
    } catch (error) {
      throw new Error(`Erro ao selecionar por texto: ${error.message}`);
    }
  }
  
  async selectByPartialMatch(orgao) {
    try {
      // Aguardar mat-select ficar habilitado
      await this.waitForMatSelectEnabled();
      
      // Primeiro clicar no mat-select para abrir
      const matSelect = this.page.locator('mat-select').first();
      await matSelect.click();
      await this.page.waitForTimeout(1000);
      
      // Procurar por todas as opções
      const options = await this.page.locator('mat-option').all();
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes(orgao)) {
          await option.click();
          return;
        }
      }
      throw new Error('Opção não encontrada');
    } catch (error) {
      throw new Error(`Erro ao selecionar por correspondência parcial: ${error.message}`);
    }
  }
  
  async waitForMatSelectEnabled() {
    console.log('🔄 Aguardando mat-select ficar habilitado...');
    
    try {
      // Aguardar até 15 segundos para o mat-select ficar habilitado
      await this.page.waitForFunction(
        () => {
          const matSelect = document.querySelector('mat-select');
          if (!matSelect) return false;
          
          // Verificações mais rigorosas compatíveis com Playwright
          const isAriaDisabled = matSelect.getAttribute('aria-disabled') === 'true';
          const isDisabledAttr = matSelect.hasAttribute('disabled');
          const isVisible = matSelect.offsetParent !== null;
          const computedStyle = window.getComputedStyle(matSelect);
          const isDisplayed = computedStyle.display !== 'none';
          const isVisibilityHidden = computedStyle.visibility === 'hidden';
          const isPointerEventsNone = computedStyle.pointerEvents === 'none';
          const tabIndex = matSelect.getAttribute('tabindex');
          const isTabIndexNegative = tabIndex && parseInt(tabIndex) < 0;
          
          // Verificar se o elemento está realmente interativo
          const isInteractive = !isAriaDisabled && 
                               !isDisabledAttr && 
                               isVisible && 
                               isDisplayed && 
                               !isVisibilityHidden && 
                               !isPointerEventsNone && 
                               !isTabIndexNegative;
          
          console.log('Mat-select estado detalhado:', {
            ariaDisabled: isAriaDisabled,
            disabledAttr: isDisabledAttr,
            visible: isVisible,
            displayed: isDisplayed,
            visibilityHidden: isVisibilityHidden,
            pointerEvents: computedStyle.pointerEvents,
            tabIndex: tabIndex,
            isInteractive: isInteractive,
            id: matSelect.id,
            classes: matSelect.className
          });
          
          return isInteractive;
        },
        { timeout: 15000 }
      );
      
      console.log('✅ Mat-select está habilitado e pronto para interação');
      
      // Aguardar um pouco mais para garantir estabilidade
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      console.log('⚠️ Timeout aguardando mat-select ficar habilitado, verificando estado atual...');
      
      // Verificar estado atual do mat-select
      const currentState = await this.page.evaluate(() => {
        const matSelect = document.querySelector('mat-select');
        if (!matSelect) return { found: false };
        
        const computedStyle = window.getComputedStyle(matSelect);
        return {
          found: true,
          ariaDisabled: matSelect.getAttribute('aria-disabled'),
          disabled: matSelect.hasAttribute('disabled'),
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          pointerEvents: computedStyle.pointerEvents,
          tabIndex: matSelect.getAttribute('tabindex'),
          classes: matSelect.className
        };
      });
      
      console.log('Estado atual do mat-select:', currentState);
      
      // Aguardar um pouco mais e tentar prosseguir
      await this.page.waitForTimeout(3000);
    }
  }
}

/**
 * Semáforo para controle de concorrência
 */
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }
  
  async acquire() {
    return new Promise((resolve) => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }
  
  release() {
    this.currentConcurrency--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.currentConcurrency++;
      next();
    }
  }
}

module.exports = ParallelOJProcessor;