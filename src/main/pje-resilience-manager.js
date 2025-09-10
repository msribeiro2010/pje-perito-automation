const PJEAvailabilityMonitor = require('../../pje-availability-monitor.js');

class PJEResilienceManager {
  constructor() {
    this.monitor = new PJEAvailabilityMonitor();
    this.maxRetries = 3;
    this.baseDelay = 30000; // 30 segundos
    this.maxDelay = 300000; // 5 minutos
    this.backoffMultiplier = 2;
    this.availabilityCheckInterval = 60000; // 1 minuto
    this.lastAvailabilityCheck = 0;
    this.isServerAvailable = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'warn': '⚠️',
      'error': '❌',
      'success': '✅'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkServerAvailability(force = false) {
    const now = Date.now();
    
    // Verificar se precisamos fazer uma nova verificação
    if (!force && this.lastAvailabilityCheck && 
        (now - this.lastAvailabilityCheck) < this.availabilityCheckInterval) {
      return this.isServerAvailable;
    }

    this.log('Verificando disponibilidade do servidor PJE...');
    
    try {
      this.isServerAvailable = await this.monitor.singleCheck();
      this.lastAvailabilityCheck = now;
      
      if (this.isServerAvailable) {
        this.log('Servidor PJE está disponível', 'success');
      } else {
        this.log('Servidor PJE está indisponível (Gateway Timeout)', 'warn');
      }
      
      return this.isServerAvailable;
    } catch (error) {
      this.log(`Erro ao verificar disponibilidade: ${error.message}`, 'error');
      this.isServerAvailable = false;
      return false;
    }
  }

  async waitForServerAvailability(maxWaitTime = 600000) { // 10 minutos
    const startTime = Date.now();
    let attempt = 1;
    
    this.log(`Aguardando disponibilidade do servidor (máximo ${maxWaitTime/1000}s)...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      this.log(`Tentativa ${attempt} de verificação de disponibilidade...`);
      
      const isAvailable = await this.checkServerAvailability(true);
      
      if (isAvailable) {
        this.log('Servidor disponível! Prosseguindo com a automação.', 'success');
        return true;
      }
      
      const waitTime = Math.min(this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1), this.maxDelay);
      this.log(`Servidor indisponível. Aguardando ${waitTime/1000}s antes da próxima verificação...`, 'warn');
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempt++;
    }
    
    this.log('Timeout aguardando disponibilidade do servidor', 'error');
    return false;
  }

  async executeWithResilience(operation, operationName, context = {}) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`Executando ${operationName} (tentativa ${attempt}/${this.maxRetries})...`);
        
        // Verificar disponibilidade antes de cada tentativa
        const isAvailable = await this.checkServerAvailability();
        
        if (!isAvailable) {
          this.log('Servidor indisponível. Aguardando disponibilidade...', 'warn');
          const serverReady = await this.waitForServerAvailability();
          
          if (!serverReady) {
            throw new Error('Servidor PJE permanece indisponível após tempo limite');
          }
        }
        
        // Executar a operação
        const result = await operation();
        this.log(`${operationName} executado com sucesso`, 'success');
        return result;
        
      } catch (error) {
        lastError = error;
        this.log(`Falha na tentativa ${attempt}: ${error.message}`, 'error');
        
        // Verificar se é um erro relacionado ao servidor
        if (this.isServerError(error)) {
          this.log('Erro relacionado ao servidor detectado', 'warn');
          this.isServerAvailable = false; // Forçar nova verificação
          
          if (attempt < this.maxRetries) {
            const waitTime = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
            this.log(`Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else if (this.isPageClosedError(error)) {
          this.log('Erro de página fechada detectado - pode ser devido à indisponibilidade do servidor', 'warn');
          this.isServerAvailable = false;
          
          if (attempt < this.maxRetries) {
            // Para erros de página fechada, aguardar mais tempo
            const waitTime = this.baseDelay * 2 * Math.pow(this.backoffMultiplier, attempt - 1);
            this.log(`Aguardando ${waitTime/1000}s para recuperação...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // Para outros tipos de erro, não fazer retry
          this.log('Erro não relacionado ao servidor - não fazendo retry', 'error');
          throw error;
        }
      }
    }
    
    throw new Error(`${operationName} falhou após ${this.maxRetries} tentativas. Último erro: ${lastError.message}`);
  }

  isServerError(error) {
    const serverErrorPatterns = [
      'net::ERR_HTTP_RESPONSE_CODE_FAILURE',
      'Gateway Timeout',
      '504',
      'fetch failed',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'socket hang up',
      'wrong_secret',
      'GCM',
      'GPU process',
      'Navigation timeout',
      'Protocol error',
      'Connection closed'
    ];
    
    return serverErrorPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  isPageClosedError(error) {
    const pageClosedPatterns = [
      'Target page, context or browser has been closed',
      'page.goto: Target closed',
      'page.click: Target closed',
      'page.waitForSelector: Target closed',
      'Browser has been closed',
      'Session closed',
      'Connection terminated',
      'Context disposed',
      'Page crashed'
    ];
    
    return pageClosedPatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  async wrapBrowserOperation(browserOperation, operationName) {
    return this.executeWithResilience(async () => {
      // Verificar se o navegador/página ainda está ativo antes da operação
      if (browserOperation.page && browserOperation.page.isClosed()) {
        throw new Error('Página foi fechada - necessário reinicializar');
      }
      
      return await browserOperation();
    }, operationName);
  }

  async wrapNavigationOperation(page, url, options = {}) {
    return this.executeWithResilience(async () => {
      this.log(`Navegando para: ${url}`);
      
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        ...options
      });
      
      if (response.status() === 504) {
        throw new Error('Gateway Timeout (504) - servidor indisponível');
      }
      
      if (response.status() >= 400) {
        throw new Error(`Erro HTTP ${response.status()} ao navegar para ${url}`);
      }
      
      return response;
    }, `Navegação para ${url}`);
  }

  getResilienceStats() {
    return {
      lastAvailabilityCheck: this.lastAvailabilityCheck,
      isServerAvailable: this.isServerAvailable,
      checkInterval: this.availabilityCheckInterval,
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay
    };
  }
}

module.exports = PJEResilienceManager;