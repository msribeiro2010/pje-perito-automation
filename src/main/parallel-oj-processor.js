/**
 * Processador Paralelo de Órgãos Julgadores (OJs)
 * Implementa estratégias de busca e processamento paralelo para otimizar performance
 */

const ContextualDelayManager = require('./contextual-delay-manager');
const SmartRetryManager = require('./smart-retry-manager');

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
      strategies.map(strategy => this.executeWithTimeout(strategy, 2000))
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
      const timeout = this.timeoutManager.obterTimeout('vincularOJ');
      
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
      this.timeoutManager.registrarPerformance('vincularOJ', duration, true);
      
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
      this.timeoutManager.registrarPerformance('vincularOJ', duration, false);
      throw error;
    }
  }

  // === ESTRATÉGIAS DE CARREGAMENTO DE OJs ===
  
  async loadFromTable() {
    const ojs = new Set();
    try {
      const rows = this.domCache ? await this.domCache.findElements('table tbody tr') : await this.page.$$('table tbody tr');
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
      const rows = this.domCache ? await this.domCache.findElements('.mat-table .mat-row') : await this.page.$$('.mat-table .mat-row');
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
      const rows = this.domCache ? await this.domCache.findElements('.datatable tbody tr') : await this.page.$$('.datatable tbody tr');
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
      const rows = this.domCache ? await this.domCache.findElements('[role="row"]') : await this.page.$$('[role="row"]');
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
    const selectors = [
      'button:has-text("Adicionar")',
      '.btn-adicionar',
      '[data-action="add"]',
      '.mat-button:has-text("Adicionar")',
      'button[title*="Adicionar"]'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await this.retryManager.retryElementSearch(
          async (sel) => await this.page.waitForSelector(sel, { 
            timeout: this.timeoutManager.obterTimeout('interacao') 
          }),
          selector
        );
        if (element && await element.isVisible()) {
          await element.click();
          await this.delayManager.smartDelay('click', { priority: 'critical' });
          return;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Botão Adicionar não encontrado');
  }
  
  async selectOrgaoJulgadorOptimized(orgao) {
    // Implementação otimizada da seleção de OJ
    const timeout = this.timeoutManager.obterTimeout('dropdown');
    
    try {
      // Aguardar dropdown aparecer
      await this.retryManager.retryElementSearch(
        async (sel) => await this.page.waitForSelector(sel, { timeout }),
        'select, .mat-select, .dropdown'
      );
      
      // Tentar diferentes estratégias de seleção
      const strategies = [
        () => this.selectByValue(orgao),
        () => this.selectByText(orgao),
        () => this.selectByPartialMatch(orgao)
      ];
      
      for (const strategy of strategies) {
        try {
          await strategy();
          return;
        } catch (error) {
          continue;
        }
      }
      
      throw new Error(`OJ ${orgao} não encontrado no dropdown`);
      
    } catch (error) {
      throw new Error(`Erro ao selecionar OJ ${orgao}: ${error.message}`);
    }
  }
  
  async configurePapelVisibilidadeOptimized() {
    // Configuração rápida de papel e visibilidade
    const timeout = this.timeoutManager.obterTimeout('interacao');
    
    try {
      // Selecionar papel (se necessário)
      const papelSelector = 'select[name*="papel"], .papel-select';
      const papelElement = await this.page.$(papelSelector);
      if (papelElement) {
        await papelElement.selectOption({ label: this.config.perfil || 'Servidor' });
      }
      
      // Configurar visibilidade (se necessário)
      const visibilidadeSelector = 'select[name*="visibilidade"], .visibilidade-select';
      const visibilidadeElement = await this.page.$(visibilidadeSelector);
      if (visibilidadeElement) {
        await visibilidadeElement.selectOption({ index: 0 }); // Primeira opção
      }
      
      await this.delayManager.smartDelay('dropdown', { priority: 'high' });
      
    } catch (error) {
      throw new Error(`Erro ao configurar papel/visibilidade: ${error.message}`);
    }
  }
  
  async saveConfigurationOptimized() {
    const selectors = [
      'button:has-text("Salvar")',
      'button:has-text("Confirmar")',
      '.btn-salvar',
      '.mat-button-primary',
      '[data-action="save"]'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await this.retryManager.retryElementSearch(
          async (sel) => await this.page.waitForSelector(sel, { 
            timeout: this.timeoutManager.obterTimeout('interacao') 
          }),
          selector
        );
        if (element && await element.isVisible()) {
          await element.click();
          await this.delayManager.smartDelay('modalClose', { priority: 'high' });
          return;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Botão Salvar não encontrado');
  }
  
  async verifySuccessOptimized() {
    const timeout = this.timeoutManager.obterTimeout('networkIdle');
    
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
  
  // Métodos de seleção de OJ
  async selectByValue(orgao) {
    await this.page.selectOption('select', { value: orgao });
  }
  
  async selectByText(orgao) {
    await this.page.selectOption('select', { label: orgao });
  }
  
  async selectByPartialMatch(orgao) {
    const options = await this.page.$$('select option');
    for (const option of options) {
      const text = await option.textContent();
      if (text && text.includes(orgao)) {
        const value = await option.getAttribute('value');
        await this.page.selectOption('select', { value });
        return;
      }
    }
    throw new Error('Opção não encontrada');
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