/**
 * Gerenciador de Processamento Paralelo de Servidores
 * 
 * Esta classe permite processar múltiplos servidores simultaneamente
 * usando instâncias separadas do navegador para melhorar a performance.
 * 
 * @author Sistema PJe Automação
 * @version 1.0.0
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ServidorAutomationV2 = require('./servidor-automation-v2');

class ParallelServerManager {
  constructor(maxInstances = 2, eventEmitter = null) {
    this.maxInstances = maxInstances;
    this.instances = [];
    this.serverQueue = [];
    this.results = new Map();
    this.isRunning = false;
    this.mainWindow = null;
    this.eventEmitter = eventEmitter;
    this.startTime = null;
    this.completedServers = 0;
    this.totalServers = 0;
  }

  /**
   * Inicializa as instâncias paralelas do navegador
   */
  async initialize() {
    console.log(`🚀 Inicializando ${this.maxInstances} instâncias paralelas...`);
    
    try {
      for (let i = 0; i < this.maxInstances; i++) {
        const instance = await this.createInstance(i);
        this.instances.push(instance);
        console.log(`✅ Instância ${i + 1} criada com sucesso`);
      }
      
      console.log(`🎉 ${this.instances.length} instâncias prontas para processamento`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar instâncias:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Cria uma instância individual do navegador
   */
  async createInstance(id) {
    const userDataDir = path.join(__dirname, '..', '..', 'temp', `pje-parallel-${id}-${Date.now()}`);
    
    // Limpar diretório se existir e criar novo
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(userDataDir, { recursive: true });
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--window-position=${id * 420},${id * 120}`,
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ],
      viewport: { width: 1200, height: 800 }
    });
    
    const page = await context.newPage();
    
    // Configurar timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    return {
      id,
      context,
      page,
      busy: false,
      currentServer: null,
      automation: null, // Será criado quando necessário
      results: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Distribui servidores entre as instâncias disponíveis
   */
  distributeServers(servers) {
    if (!servers || servers.length === 0) {
      return [];
    }

    const distribution = [];
    const serversPerInstance = Math.ceil(servers.length / this.maxInstances);
    
    for (let i = 0; i < this.maxInstances && i * serversPerInstance < servers.length; i++) {
      const start = i * serversPerInstance;
      const end = Math.min(start + serversPerInstance, servers.length);
      distribution.push(servers.slice(start, end));
    }
    
    return distribution;
  }

  /**
   * Processa uma lista de servidores em paralelo
   */
  async processServersInParallel(servers, config = {}) {
    // Verificar se já está em execução
    if (this.isRunning) {
      return {
        success: false,
        error: 'Processamento paralelo já está em execução'
      };
    }
    
    this.serverQueue = [...servers];
    this.totalServers = servers.length;
    this.completedServers = 0;
    this.isRunning = true;
    this.startTime = Date.now();
    this.keepBrowserOpen = config.keepBrowserOpen !== false; // Default: manter aberto
    
    this.sendStatusUpdate({
      type: 'parallel-start',
      totalServers: this.totalServers,
      instances: this.maxInstances,
      message: `Iniciando processamento paralelo de ${this.totalServers} servidores com ${this.maxInstances} instâncias`
    });
    
    try {
      // Iniciar processamento em todas as instâncias
      const promises = this.instances.map(instance => 
        this.processWithInstance(instance, config)
      );
      
      await Promise.all(promises);
      
      const results = this.consolidateResults();
      
      // Verificar se houve erros críticos
      const totalErrors = this.instances.reduce((total, instance) => total + (instance.errors?.length || 0), 0);
      const hasOnlyErrors = totalErrors > 0 && this.completedServers === 0;
      
      if (hasOnlyErrors) {
        return {
          success: false,
          error: 'Processing failed'
        };
      }
      
      // Mostrar modal de resultados se configurado para manter navegador aberto
      if (this.keepBrowserOpen) {
        await this.showResultsModal(results);
      }
      
      this.sendStatusUpdate({
        type: 'parallel-complete',
        results,
        message: `Processamento paralelo concluído em ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`
      });
      
      return {
        success: true,
        results
      };
      
    } catch (error) {
      console.error('❌ Erro no processamento paralelo:', error);
      this.sendStatusUpdate({
        type: 'parallel-error',
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Processa servidores com uma instância específica
   */
  async processWithInstance(instance, config) {
    while (this.serverQueue.length > 0 && this.isRunning) {
      const server = this.serverQueue.shift();
      if (!server) break;
      
      instance.busy = true;
      instance.currentServer = server;
      instance.startTime = Date.now();
      
      this.sendStatusUpdate({
        type: 'instance-start',
        instanceId: instance.id,
        server: server.nome || server.cpf,
        remaining: this.serverQueue.length
      });
      
      try {
        const result = await this.processServerWithInstance(instance, server, config);
        instance.results.push(result);
        this.completedServers++;
        
        this.sendStatusUpdate({
          type: 'instance-success',
          instanceId: instance.id,
          server: server.nome || server.cpf,
          result,
          completed: this.completedServers,
          total: this.totalServers
        });
        
        // Emitir evento de progresso
        this.sendProgressUpdate();
        
      } catch (error) {
        console.error(`❌ Erro na instância ${instance.id} processando ${server.nome}:`, error);
        
        const errorResult = {
          servidor: server,
          erro: error.message,
          timestamp: new Date().toISOString()
        };
        
        instance.errors.push(errorResult);
        this.completedServers++;
        
        this.sendStatusUpdate({
          type: 'instance-error',
          instanceId: instance.id,
          server: server.nome || server.cpf,
          error: error.message,
          completed: this.completedServers,
          total: this.totalServers
        });
      } finally {
        instance.busy = false;
        instance.currentServer = null;
        instance.endTime = Date.now();
      }
    }
  }

  /**
   * Processa um servidor específico com uma instância
   */
  async processServerWithInstance(instance, server, config) {
    // Usar automação externa se fornecida (para testes) ou criar nova
    const automation = config.automationInstance || instance.automation;
    
    if (!automation) {
      instance.automation = new ServidorAutomationV2();
      instance.automation.page = instance.page;
      instance.automation.mainWindow = this.mainWindow;
    }
    
    const startTime = Date.now();
    
    try {
      if (config.automationInstance) {
        // Usar automação externa (para testes)
        const result = await config.automationInstance.processServers([server]);
        
        return {
          servidor: server,
          instancia: instance.id,
          tempoProcessamento: Date.now() - startTime,
          sucessos: result.resultados ? result.resultados.filter(r => r.sucessos > 0).length : 1,
          erros: result.errors ? result.errors.length : 0,
          detalhes: result.resultados || [],
          timestamp: new Date().toISOString()
        };
      } else {
        // Usar automação real
        const realAutomation = instance.automation;
        
        // Realizar login se necessário
        await realAutomation.performLogin();
        
        // Navegar para o servidor
        await realAutomation.navigateDirectlyToPerson(server.cpf);
        
        // Navegar para a aba de servidores
        await realAutomation.navigateToServerTab();
        
        // Configurar OJs para este servidor
        realAutomation.config = { 
          orgaos: server.orgaos || config.orgaos || [] 
        };
        
        // Processar órgãos julgadores
        await realAutomation.processOrgaosJulgadores();
        
        const endTime = Date.now();
        
        return {
          servidor: server,
          instancia: instance.id,
          tempoProcessamento: endTime - startTime,
          sucessos: realAutomation.results?.filter(r => r.status === 'Incluído com Sucesso').length || 0,
          erros: realAutomation.results?.filter(r => r.status !== 'Incluído com Sucesso').length || 0,
          detalhes: realAutomation.results || [],
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error(`Erro processando servidor ${server.nome} na instância ${instance.id}:`, error);
      throw error;
    }
  }

  /**
   * Consolida os resultados de todas as instâncias
   */
  consolidateResults() {
    const allResults = [];
    const allErrors = [];
    let totalProcessingTime = 0;
    
    for (const instance of this.instances) {
      allResults.push(...instance.results);
      allErrors.push(...instance.errors);
      
      if (instance.startTime && instance.endTime) {
        totalProcessingTime += (instance.endTime - instance.startTime);
      }
    }
    
    const totalTime = Date.now() - this.startTime;
    const averageTimePerServer = allResults.length > 0 ? totalTime / allResults.length : 0;
    
    return {
      totalServidores: this.totalServers,
      servidoresProcessados: allResults.length,
      sucessos: allResults.reduce((total, r) => total + (r.sucessos || 0), 0),
      erros: allErrors.length,
      tempoTotal: totalTime,
      tempoMedioServidor: averageTimePerServer,
      instanciasUtilizadas: this.maxInstances,
      eficienciaParalela: this.calculateParallelEfficiency(totalTime, totalProcessingTime),
      resultados: allResults,
      errosDetalhados: allErrors,
      estatisticas: this.generateStatistics(allResults)
    };
  }

  /**
   * Calcula a eficiência do processamento paralelo
   */
  calculateParallelEfficiency(totalTime, totalProcessingTime) {
    if (totalProcessingTime === 0) return 0;
    
    const theoreticalSequentialTime = totalProcessingTime;
    const actualParallelTime = totalTime;
    
    return {
      speedup: theoreticalSequentialTime / actualParallelTime,
      efficiency: (theoreticalSequentialTime / actualParallelTime) / this.maxInstances,
      timeReduction: ((theoreticalSequentialTime - actualParallelTime) / theoreticalSequentialTime) * 100
    };
  }

  /**
   * Gera estatísticas detalhadas
   */
  generateStatistics(results) {
    if (results.length === 0) return {};
    
    const processingTimes = results.map(r => r.tempoProcessamento);
    const successCounts = results.map(r => r.sucessos);
    
    return {
      tempoProcessamento: {
        minimo: Math.min(...processingTimes),
        maximo: Math.max(...processingTimes),
        media: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      },
      sucessosPorServidor: {
        minimo: Math.min(...successCounts),
        maximo: Math.max(...successCounts),
        media: successCounts.reduce((a, b) => a + b, 0) / successCounts.length,
        total: successCounts.reduce((a, b) => a + b, 0)
      }
    };
  }

  /**
   * Envia atualizações de status para a interface
   */
  sendStatusUpdate(status) {
    const statusWithTimestamp = {
      ...status,
      timestamp: new Date().toISOString()
    };
    
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('parallel-status-update', statusWithTimestamp);
    }
    
    if (this.eventEmitter) {
      this.eventEmitter.emit('parallel-status-update', statusWithTimestamp);
    }
    
    console.log(`📊 [Parallel] ${status.type}:`, status.message || JSON.stringify(status));
  }
  
  /**
   * Envia eventos de progresso durante o processamento
   */
  sendProgressUpdate() {
    const progressData = {
      instances: this.instances.map(instance => ({
        id: instance.id,
        busy: instance.busy,
        currentServer: instance.currentServer ? instance.currentServer.nome || instance.currentServer.cpf : null,
        results: instance.results.length,
        errors: instance.errors.length
      })),
      overallProgress: {
        completed: this.completedServers,
        total: this.totalServers,
        percentage: this.totalServers > 0 ? (this.completedServers / this.totalServers) * 100 : 0
      },
      timestamp: new Date().toISOString()
    };
    
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('parallel-progress', progressData);
    }
    
    if (this.eventEmitter) {
      this.eventEmitter.emit('parallel-progress', progressData);
    }
  }

  /**
   * Para o processamento paralelo
   */
  async stop() {
    console.log('⏹️ Parando processamento paralelo...');
    this.isRunning = false;
    
    // Parar todas as automações em execução
    for (const instance of this.instances) {
      if (instance.automation && instance.automation.isRunning) {
        try {
          await instance.automation.stop();
        } catch (error) {
          console.error(`Erro ao parar automação da instância ${instance.id}:`, error);
        }
      }
      
      // Call stop method on instance if it exists (for testing)
      if (typeof instance.stop === 'function') {
        try {
          await instance.stop();
        } catch (error) {
          console.error(`Erro ao parar instância ${instance.id}:`, error);
        }
      }
    }
    
    // Clear instances array
    this.instances = [];
    
    // Emitir evento de parada
    if (this.mainWindow) {
      this.mainWindow.webContents.send('parallel-stopped');
    }
    if (this.eventEmitter) {
      this.eventEmitter.emit('parallel-stopped');
    }
  }

  /**
   * Pausa todas as instâncias em execução
   */
  pauseAll() {
    for (const instance of this.instances) {
      if (instance.status === 'running' && typeof instance.pause === 'function') {
        try {
          instance.pause();
        } catch (error) {
          console.error(`Erro ao pausar instância ${instance.id}:`, error);
        }
      }
    }
    
    // Emitir evento de pausa
    if (this.eventEmitter) {
      this.eventEmitter.emit('parallel-paused');
    }
  }

  /**
   * Resume todas as instâncias pausadas
   */
  resumeAll() {
    for (const instance of this.instances) {
      if (instance.status === 'paused' && typeof instance.resume === 'function') {
        try {
          instance.resume();
        } catch (error) {
          console.error(`Erro ao resumir instância ${instance.id}:`, error);
        }
      }
    }
    
    // Emitir evento de resumo
    if (this.eventEmitter) {
      this.eventEmitter.emit('parallel-resumed');
    }
  }

  /**
   * Mostra modal de resultados no navegador
   */
  async showResultsModal(results) {
    console.log('📊 Exibindo modal de resultados...');
    
    // Encontrar uma instância ativa para mostrar o modal
    const activeInstance = this.instances.find(instance => {
      try {
        return instance.context && instance.page && instance.context.browser().isConnected();
      } catch (error) {
        return false;
      }
    });
    
    if (!activeInstance || !activeInstance.page) {
      console.log('⚠️ Nenhuma instância ativa encontrada para mostrar modal');
      return;
    }
    
    try {
      const modalHTML = this.generateResultsModalHTML(results);
      
      // Injetar modal na página
      await activeInstance.page.evaluate((html) => {
        // Remover modal existente se houver
        const existingModal = document.getElementById('pje-automation-results-modal');
        if (existingModal) {
          existingModal.remove();
        }
        
        // Criar e inserir novo modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = html;
        document.body.appendChild(modalContainer.firstElementChild);
      }, modalHTML);
      
      console.log('✅ Modal de resultados exibido com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao exibir modal de resultados:', error);
    }
  }
  
  /**
   * Gera HTML do modal de resultados
   */
  generateResultsModalHTML(results) {
    const sucessos = results.sucessos || 0;
    const erros = results.erros || 0;
    const total = results.servidoresProcessados || 0;
    const tempo = ((results.tempoTotal || 0) / 1000).toFixed(1);
    
    const successDetails = results.resultados?.filter(r => r.sucessos > 0) || [];
    const errorDetails = results.errosDetalhados || [];
    
    return `
      <div id="pje-automation-results-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="document.getElementById('pje-automation-results-modal').remove()" style="
            position: absolute;
            top: 15px;
            right: 20px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          ">×</button>
          
          <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">
            🎉 Processamento Paralelo Concluído!
          </h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">✅ Sucessos</h3>
              <div style="font-size: 24px; font-weight: bold; color: #28a745;">${sucessos}</div>
            </div>
            
            <div style="background: #ffeaea; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #dc3545; margin: 0 0 10px 0;">❌ Erros</h3>
              <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${erros}</div>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #1976d2; margin: 0 0 10px 0;">📊 Total</h3>
              <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${total}</div>
            </div>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #f57c00; margin: 0 0 10px 0;">⏱️ Tempo</h3>
              <div style="font-size: 24px; font-weight: bold; color: #f57c00;">${tempo}s</div>
            </div>
          </div>
          
          ${successDetails.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #28a745; margin-bottom: 15px;">✅ Servidores Processados com Sucesso:</h3>
              <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${successDetails.map(s => `
                  <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #28a745;">
                    <strong>${s.servidor?.nome || 'Servidor'}</strong> - ${s.sucessos} OJ(s) vinculado(s) em ${(s.tempoProcessamento / 1000).toFixed(1)}s
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${errorDetails.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #dc3545; margin-bottom: 15px;">❌ Erros Encontrados:</h3>
              <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${errorDetails.map(e => `
                  <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #dc3545;">
                    <strong>Erro:</strong> ${e.message || e.error || 'Erro desconhecido'}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="document.getElementById('pje-automation-results-modal').remove()" style="
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
            ">Fechar</button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Limpa todas as instâncias e recursos
   */
  async cleanup(forceClose = false) {
    console.log('🧹 Limpando instâncias paralelas...');
    
    // Se configurado para manter navegador aberto e não forçar fechamento, manter uma instância
    if (this.keepBrowserOpen && !forceClose && this.instances.length > 0) {
      console.log('🔄 Mantendo uma instância do navegador aberta para visualização dos resultados...');
      
      // Manter apenas a primeira instância ativa
      const instanceToKeep = this.instances[0];
      
      // Fechar outras instâncias
      for (let i = 1; i < this.instances.length; i++) {
        const instance = this.instances[i];
        try {
          if (instance.context) {
            await instance.context.close();
          }
        } catch (error) {
          console.error(`Erro ao fechar instância ${instance.id}:`, error);
        }
      }
      
      // Manter apenas a instância principal
      this.instances = [instanceToKeep];
      
    } else {
      // Fechar todas as instâncias
      for (const instance of this.instances) {
        try {
          if (instance.context) {
            await instance.context.close();
          }
        } catch (error) {
          console.error(`Erro ao fechar instância ${instance.id}:`, error);
        }
      }
      
      this.instances = [];
    }
    
    this.isRunning = false;
    
    // Limpar diretórios temporários
    try {
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Erro ao limpar diretórios temporários:', error);
    }
    
    console.log('✅ Limpeza concluída');
  }

  /**
   * Retorna o status atual do processamento
   */
  getStatus() {
    // Use servidores length if available, otherwise use totalServers
    const totalServers = this.servidores?.length || this.totalServers || 0;
    
    // Calculate completed servers from instances if available
    const completedFromInstances = this.instances.reduce((total, instance) => {
      return total + (instance.results?.length || 0);
    }, 0);
    
    const completedServers = completedFromInstances || this.completedServers || 0;
    
    const overallProgress = totalServers > 0 ? (completedServers / totalServers) * 100 : 0;
    const elapsedTime = this.startTime ? Date.now() - this.startTime : 0;
    const speed = elapsedTime > 0 ? (completedServers / (elapsedTime / 1000)) : 0;
    const estimatedTime = speed > 0 ? ((totalServers - completedServers) / speed) : 0;
    
    return {
      isRunning: this.isRunning,
      totalServers,
      completedServers,
      overallProgress,
      speed: parseFloat(speed.toFixed(2)),
      elapsedTime: Math.floor(elapsedTime / 1000),
      estimatedTime: Math.floor(estimatedTime),
      instances: this.instances.map(instance => {
        const resultsCount = instance.results?.length || 0;
        const errorsCount = instance.errors?.length || 0;
        const totalProcessed = resultsCount + errorsCount;
        
        return {
          id: instance.id,
          busy: instance.busy || false,
          currentServer: instance.currentServer?.nome || instance.currentServer?.cpf || null,
          resultsCount,
          errorsCount,
          progress: totalProcessed > 0 ? (resultsCount / totalProcessed) * 100 : 0
        };
      }),
      progress: overallProgress
    };
  }
}

module.exports = ParallelServerManager;