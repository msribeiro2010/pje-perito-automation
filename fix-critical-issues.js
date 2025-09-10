/**
 * Script de Correção de Problemas Críticos
 * Identifica e corrige problemas que causam interrupções no processamento
 */

const fs = require('fs');
const path = require('path');

class CriticalIssuesFixer {
  constructor() {
    this.fixes = [];
    this.backupDir = path.join(__dirname, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'warn': '⚠️',
      'error': '❌',
      'success': '✅',
      'fix': '🔧'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async createBackup(filePath) {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const fileName = path.basename(filePath);
      const backupPath = path.join(this.backupDir, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        this.log(`Backup criado: ${backupPath}`, 'info');
      }
    } catch (error) {
      this.log(`Erro ao criar backup de ${filePath}: ${error.message}`, 'error');
    }
  }

  async fixBrowserStability() {
    this.log('Corrigindo configurações de estabilidade do navegador...', 'fix');
    
    const serverAutomationPath = path.join(__dirname, 'src/main/servidor-automation-v2.js');
    await this.createBackup(serverAutomationPath);
    
    try {
      let content = fs.readFileSync(serverAutomationPath, 'utf8');
      
      // Melhorar configurações do navegador
      const oldBrowserOptions = `const browserOptions = {
      headless: this.isProduction,
      slowMo: this.isProduction ? 0 : 50,
      timeout: 30000
    };`;
    
      const newBrowserOptions = `const browserOptions = {
      headless: this.isProduction,
      slowMo: this.isProduction ? 0 : 50,
      timeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--max_old_space_size=4096'
      ]
    };`;
    
      if (content.includes(oldBrowserOptions)) {
        content = content.replace(oldBrowserOptions, newBrowserOptions);
        this.fixes.push('Configurações de navegador melhoradas para estabilidade');
      }
      
      // Melhorar timeouts
      content = content.replace(
        'this.page.setDefaultTimeout(30000); // 30s para elementos',
        'this.page.setDefaultTimeout(45000); // 45s para elementos'
      );
      
      content = content.replace(
        'this.page.setDefaultNavigationTimeout(60000); // 60s para navegação',
        'this.page.setDefaultNavigationTimeout(90000); // 90s para navegação'
      );
      
      fs.writeFileSync(serverAutomationPath, content);
      this.log('Configurações de navegador atualizadas', 'success');
      
    } catch (error) {
      this.log(`Erro ao corrigir configurações do navegador: ${error.message}`, 'error');
    }
  }

  async fixParallelManagerStability() {
    this.log('Corrigindo estabilidade do gerenciador paralelo...', 'fix');
    
    const parallelManagerPath = path.join(__dirname, 'src/main/parallel-server-manager.js');
    await this.createBackup(parallelManagerPath);
    
    try {
      let content = fs.readFileSync(parallelManagerPath, 'utf8');
      
      // Adicionar tratamento de sinais do sistema
      const signalHandling = `
  // Tratamento de sinais do sistema para cleanup graceful
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(\`🛑 Recebido sinal \${signal}, iniciando shutdown graceful...\`);
      try {
        await this.stop();
        await this.cleanup(true);
        process.exit(0);
      } catch (error) {
        console.error('Erro durante shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
    
    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não capturado:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
`;
      
      // Adicionar o método após o constructor
      if (!content.includes('setupSignalHandlers')) {
        content = content.replace(
          'this.eventEmitter = eventEmitter;\n  }',
          `this.eventEmitter = eventEmitter;
    this.setupSignalHandlers();
  }
${signalHandling}`
        );
        this.fixes.push('Tratamento de sinais do sistema adicionado');
      }
      
      // Melhorar args do navegador
      const oldArgs = `args: [
          \`--window-position=\${id * 420},\${id * 120}\`,
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]`;
      
      const newArgs = `args: [
          \`--window-position=\${id * 420},\${id * 120}\`,
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--max_old_space_size=4096',
          '--disable-extensions',
          '--disable-plugins'
        ]`;
      
      if (content.includes(oldArgs)) {
        content = content.replace(oldArgs, newArgs);
        this.fixes.push('Args do navegador paralelo melhorados');
      }
      
      fs.writeFileSync(parallelManagerPath, content);
      this.log('Gerenciador paralelo atualizado', 'success');
      
    } catch (error) {
      this.log(`Erro ao corrigir gerenciador paralelo: ${error.message}`, 'error');
    }
  }

  async fixResilienceManager() {
    this.log('Melhorando gerenciador de resiliência...', 'fix');
    
    const resiliencePath = path.join(__dirname, 'src/main/pje-resilience-manager.js');
    await this.createBackup(resiliencePath);
    
    try {
      let content = fs.readFileSync(resiliencePath, 'utf8');
      
      // Adicionar detecção de mais tipos de erro
      const oldServerErrorPatterns = `const serverErrorPatterns = [
      'net::ERR_HTTP_RESPONSE_CODE_FAILURE',
      'Gateway Timeout',
      '504',
      'fetch failed',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'socket hang up'
    ];`;
    
      const newServerErrorPatterns = `const serverErrorPatterns = [
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
    ];`;
    
      if (content.includes(oldServerErrorPatterns)) {
        content = content.replace(oldServerErrorPatterns, newServerErrorPatterns);
        this.fixes.push('Padrões de erro do servidor expandidos');
      }
      
      // Adicionar detecção de mais erros de página fechada
      const oldPageClosedPatterns = `const pageClosedPatterns = [
      'Target page, context or browser has been closed',
      'page.goto: Target closed',
      'page.click: Target closed',
      'page.waitForSelector: Target closed',
      'Browser has been closed'
    ];`;
    
      const newPageClosedPatterns = `const pageClosedPatterns = [
      'Target page, context or browser has been closed',
      'page.goto: Target closed',
      'page.click: Target closed',
      'page.waitForSelector: Target closed',
      'Browser has been closed',
      'Session closed',
      'Connection terminated',
      'Context disposed',
      'Page crashed'
    ];`;
    
      if (content.includes(oldPageClosedPatterns)) {
        content = content.replace(oldPageClosedPatterns, newPageClosedPatterns);
        this.fixes.push('Padrões de página fechada expandidos');
      }
      
      fs.writeFileSync(resiliencePath, content);
      this.log('Gerenciador de resiliência melhorado', 'success');
      
    } catch (error) {
      this.log(`Erro ao melhorar gerenciador de resiliência: ${error.message}`, 'error');
    }
  }

  async addMemoryMonitoring() {
    this.log('Adicionando monitoramento de memória...', 'fix');
    
    const memoryMonitorPath = path.join(__dirname, 'src/utils/memory-monitor.js');
    
    const memoryMonitorContent = `/**
 * Monitor de Memória
 * Monitora uso de memória e força garbage collection quando necessário
 */

class MemoryMonitor {
  constructor(options = {}) {
    this.maxMemoryMB = options.maxMemoryMB || 2048; // 2GB
    this.checkInterval = options.checkInterval || 30000; // 30s
    this.gcThreshold = options.gcThreshold || 0.8; // 80% da memória máxima
    this.monitoring = false;
    this.intervalId = null;
  }

  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('🔍 Iniciando monitoramento de memória...');
    
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);
  }

  stop() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Monitoramento de memória parado');
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    const memoryPercentage = heapUsedMB / this.maxMemoryMB;
    
    if (memoryPercentage > this.gcThreshold) {
      console.log(\`⚠️ Uso de memória alto: \${heapUsedMB}MB (\${Math.round(memoryPercentage * 100)}%)\`);
      this.forceGarbageCollection();
    }
    
    // Log periódico do uso de memória
    if (Date.now() % (5 * 60 * 1000) < this.checkInterval) { // A cada 5 minutos
      console.log(\`📊 Memória: Heap \${heapUsedMB}/\${heapTotalMB}MB, RSS \${rssMB}MB\`);
    }
  }

  forceGarbageCollection() {
    if (global.gc) {
      console.log('🗑️ Forçando garbage collection...');
      global.gc();
      
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      console.log(\`✅ Garbage collection concluído. Memória atual: \${heapUsedMB}MB\`);
    } else {
      console.log('⚠️ Garbage collection não disponível (execute com --expose-gc)');
    }
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024)
    };
  }
}

module.exports = MemoryMonitor;
`;
    
    try {
      fs.writeFileSync(memoryMonitorPath, memoryMonitorContent);
      this.fixes.push('Monitor de memória criado');
      this.log('Monitor de memória criado', 'success');
    } catch (error) {
      this.log(`Erro ao criar monitor de memória: ${error.message}`, 'error');
    }
  }

  async createStartupScript() {
    this.log('Criando script de inicialização otimizado...', 'fix');
    
    const startupScriptPath = path.join(__dirname, 'start-optimized.js');
    
    const startupContent = `#!/usr/bin/env node
/**
 * Script de Inicialização Otimizado
 * Inicia o processamento com configurações otimizadas para estabilidade
 */

const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');
const MemoryMonitor = require('./src/utils/memory-monitor');
const { loadConfig } = require('./src/util');

// Configurações otimizadas para estabilidade
process.env.NODE_OPTIONS = '--max-old-space-size=4096 --expose-gc';

async function startOptimized() {
  console.log('🚀 Iniciando processamento otimizado...');
  
  // Iniciar monitor de memória
  const memoryMonitor = new MemoryMonitor({
    maxMemoryMB: 3072, // 3GB
    checkInterval: 30000, // 30s
    gcThreshold: 0.75 // 75%
  });
  memoryMonitor.start();
  
  // Configurar tratamento de sinais
  const gracefulShutdown = async (signal) => {
    console.log(\`🛑 Recebido sinal \${signal}, iniciando shutdown graceful...\`);
    memoryMonitor.stop();
    process.exit(0);
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  
  try {
    const config = await loadConfig();
    const automation = new ServidorAutomationV2();
    
    // Configurações otimizadas
    config.maxInstances = Math.min(config.maxInstances || 2, 2); // Máximo 2 instâncias
    config.batchSize = 3; // Lotes menores
    config.delayBetweenBatches = 2000; // 2s entre lotes
    
    console.log('📋 Configurações otimizadas aplicadas');
    console.log(\`   - Máximo de instâncias: \${config.maxInstances}\`);
    console.log(\`   - Tamanho do lote: \${config.batchSize}\`);
    console.log(\`   - Delay entre lotes: \${config.delayBetweenBatches}ms\`);
    
    await automation.startAutomation(config);
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error);
    memoryMonitor.stop();
    process.exit(1);
  }
}

if (require.main === module) {
  startOptimized().catch(console.error);
}

module.exports = { startOptimized };
`;
    
    try {
      fs.writeFileSync(startupScriptPath, startupContent);
      fs.chmodSync(startupScriptPath, '755'); // Tornar executável
      this.fixes.push('Script de inicialização otimizado criado');
      this.log('Script de inicialização criado', 'success');
    } catch (error) {
      this.log(`Erro ao criar script de inicialização: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🔧 Iniciando correção de problemas críticos...', 'fix');
    
    await this.fixBrowserStability();
    await this.fixParallelManagerStability();
    await this.fixResilienceManager();
    await this.addMemoryMonitoring();
    await this.createStartupScript();
    
    this.log('📊 Resumo das correções aplicadas:', 'success');
    this.fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
    
    this.log('✅ Correções concluídas! Use o script start-optimized.js para iniciar com as melhorias.', 'success');
    this.log(`📁 Backups salvos em: ${this.backupDir}`, 'info');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const fixer = new CriticalIssuesFixer();
  fixer.run().catch(console.error);
}

module.exports = CriticalIssuesFixer;