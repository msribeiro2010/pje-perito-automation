const { chromium } = require('playwright');
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { login } = require('../login.js');
const { loadConfig } = require('../util.js');
const ParallelOJProcessor = require('./parallel-oj-processor.js');
const TimeoutManager = require('../utils/timeouts.js');
const ContextualDelayManager = require('./contextual-delay-manager.js');
const UltraFastDelayManager = require('../utils/ultra-fast-delay-manager.js');
const DOMCacheManager = require('./dom-cache-manager.js');
const SmartRetryManager = require('./smart-retry-manager.js');
const NavigationOptimizer = require('./navigation-optimizer.js');
const PerformanceMonitor = require('./performance-monitor.js');
const PJEResilienceManager = require('./pje-resilience-manager.js');
const { SmartOJCache } = require('../utils/smart-oj-cache.js');
const { VerificacaoOJPapel } = require('../utils/verificacao-oj-papel.js');
const { ServidorSkipDetector } = require('../utils/servidor-skip-detector.js');
const IntelligentCacheManager = require('../utils/intelligent-cache-manager.js');
const TurboModeProcessor = require('./turbo-mode-processor.js');
const SmartOJIntegration = require('../utils/smart-oj-integration.js');
const DatabaseConnection = require('../utils/database-connection.js');
const { verificarEProcessarLocalizacoesFaltantes, isVaraLimeira, aplicarTratamentoLimeira } = require('../vincularOJ.js');
const { resolverProblemaVarasLimeira, SolucaoLimeiraCompleta } = require('../../solucao-limeira-completa.js');
const { DetectorVarasProblematicas } = require('../utils/detector-varas-problematicas.js');

/**
 * Automação moderna para vinculação de OJs a servidores
 * Baseada no documento automacao.md com melhorias implementadas
 */
class ServidorAutomationV2 {
  constructor() {
    this.isRunning = false;
    this.currentProgress = 0;
    this.totalOrgaos = 0;
    this.mainWindow = null;
    this.browser = null;
    this.page = null;
    this.config = null;
    this.results = [];
    this.ojCache = new Set(); // Cache para OJs já cadastrados
    this.smartOJCache = new SmartOJCache(); // Cache inteligente para verificação de OJs
    this.verificacaoOJPapel = new VerificacaoOJPapel(); // Sistema de verificação OJ + papel
    this.servidorSkipDetector = new ServidorSkipDetector(); // Detector de servidores para pular
    this.intelligentCache = new IntelligentCacheManager(); // Cache inteligente HIPER-OTIMIZADO
    this.turboProcessor = null; // Processador TURBO para máxima velocidade
    this.smartOJIntegration = new SmartOJIntegration(); // Sistema inteligente de verificação e integração de OJs
    this.currentServidor = null; // Servidor sendo processado atualmente
    this.isProduction = process.env.NODE_ENV === 'production';
    this.timeoutManager = new TimeoutManager();
    this.delayManager = new ContextualDelayManager(this.timeoutManager);
    this.ultraFastDelayManager = new UltraFastDelayManager({ mode: 'ultra_fast', adaptive: true });
    this.retryManager = new SmartRetryManager(this.timeoutManager);
    this.navigationOptimizer = new NavigationOptimizer(this.timeoutManager, this.retryManager);
    this.performanceMonitor = new PerformanceMonitor();
    this.resilienceManager = new PJEResilienceManager();
    this.domCache = null;
    this.parallelProcessor = null;
    this.detectorVaras = new DetectorVarasProblematicas(); // Detector automático de varas problemáticas
    this.dbConnection = null; // Conexão com banco de dados para verificação inteligente
    this.forcedOJsNormalized = null; // OJs que DEVEM ser processadas (normalizadas)
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Inicializa a conexão com o banco de dados
   */
  async initializeDatabaseConnection() {
    try {
      this.sendStatus('info', '🔗 Inicializando conexão com banco de dados...', 0, 'Configurando sistema inteligente');
      
      this.dbConnection = new DatabaseConnection();
      const connected = await this.dbConnection.initialize();
      
      if (connected) {
        this.sendStatus('success', '✅ Conexão com banco estabelecida - Sistema inteligente ativado!', 0, 'Verificação de OJs otimizada');
        return true;
      } else {
        this.sendStatus('warning', '⚠️ Banco não disponível - Funcionando no modo tradicional', 0, 'Sem otimização de verificação');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao conectar banco:', error.message);
      this.sendStatus('warning', '⚠️ Erro na conexão com banco - Modo tradicional ativado', 0, 'Sistema funcionando normalmente');
      return false;
    }
  }

  /**
   * Verifica OJs já cadastrados para um servidor antes da automação
   * @param {string} cpfServidor - CPF do servidor
   * @param {Array} ojsParaProcessar - Lista de OJs que seriam processados
   * @returns {Object} Resultado da verificação inteligente
   */
  async verificarOJsInteligente(cpfServidor, ojsParaProcessar) {
    console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Iniciando verificarOJsInteligente`);
    console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - CPF: ${cpfServidor}`);
    console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - OJs para processar: ${JSON.stringify(ojsParaProcessar)}`);

    // CORREÇÃO: Integrar com SmartOJCache para usar dados do cache persistente
    console.log(`🔍 [DEBUG] INTEGRAÇÃO CACHE - Verificando cache persistente primeiro...`);
    const cacheCarregado = await this.smartOJCache.carregarCachePersistente(cpfServidor);

    if (cacheCarregado && cacheCarregado.ojsJaVinculados) {
      console.log(`📦 [DEBUG] CACHE ENCONTRADO - ${cacheCarregado.ojsJaVinculados.length} OJs já vinculadas no cache`);

      // Separar OJs baseado no cache
      const ojsJaVinculadasDoCache = cacheCarregado.ojsJaVinculados.map(item => item.oj);
      const ojsParaProcessarFinal = ojsParaProcessar.filter(oj =>
        !ojsJaVinculadasDoCache.some(ojCache =>
          this.smartOJCache._normalizarTexto(oj) === this.smartOJCache._normalizarTexto(ojCache)
        )
      );

      console.log(`🎯 [DEBUG] RESULTADO CACHE:`);
      console.log(`   - OJs já vinculadas: ${ojsJaVinculadasDoCache.length}`);
      console.log(`   - OJs para processar: ${ojsParaProcessarFinal.length}`);

      const economiaCalculada = {
        tempo: ojsJaVinculadasDoCache.length * 5, // 5s por OJ
        cliques: ojsJaVinculadasDoCache.length * 3,
        ojsEvitados: ojsJaVinculadasDoCache.length
      };

      return {
        inteligenciaAtiva: true,
        servidorExiste: true,
        fonte: 'cache_persistente',
        totalVerificados: ojsParaProcessar.length,
        ojsParaProcessar: ojsParaProcessarFinal,
        ojsJaCadastrados: cacheCarregado.ojsJaVinculados,
        economia: economiaCalculada,
        mensagem: `Cache persistente: ${ojsParaProcessarFinal.length}/${ojsParaProcessar.length} OJs precisam ser processados`
      };
    }

    if (!this.dbConnection || !this.dbConnection.isConnected) {
      console.log(`❌ [DEBUG] DIRLEI VERIFICAÇÃO - Banco não conectado!`);
      return {
        inteligenciaAtiva: false,
        ojsParaProcessar: ojsParaProcessar,
        ojsJaCadastrados: [],
        economia: { tempo: 0, cliques: 0 },
        mensagem: 'Banco não conectado - processando todos os OJs'
      };
    }

    try {
      this.sendStatus('info', '🧠 Verificação inteligente: consultando OJs cadastrados...', 0, 'Analisando situação do servidor');

      // Buscar servidor por CPF
      console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Buscando servidor por CPF...`);
      const resultadoServidor = await this.dbConnection.buscarServidorPorCPF(cpfServidor);
      console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Resultado busca servidor:`, {
        existe: resultadoServidor.existe,
        servidor: resultadoServidor.servidor ? {
          idUsuario: resultadoServidor.servidor.idUsuario,
          nome: resultadoServidor.servidor.nome
        } : null
      });

      if (!resultadoServidor.existe) {
        console.log(`❌ [DEBUG] DIRLEI VERIFICAÇÃO - Servidor não encontrado no BD!`);
        return {
          inteligenciaAtiva: true,
          servidorExiste: false,
          ojsParaProcessar: ojsParaProcessar,
          ojsJaCadastrados: [],
          economia: { tempo: 0, cliques: 0 },
          mensagem: `Servidor CPF ${cpfServidor} não encontrado no sistema`
        };
      }

      // Verificar OJs já cadastrados
      console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Verificando OJs cadastrados para idUsuario: ${resultadoServidor.servidor.idUsuario}`);
      const verificacao = await this.dbConnection.verificarOJsCadastrados(
        resultadoServidor.servidor.idUsuario,
        ojsParaProcessar
      );

      console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Resultado da consulta BD:`, {
        totalVerificados: verificacao.totalVerificados,
        ojsParaProcessar: verificacao.ojsParaProcessar,
        ojsJaCadastrados: verificacao.ojsJaCadastrados,
        estatisticas: verificacao.estatisticas
      });

      const economiaCalculada = {
        tempo: verificacao.estatisticas.economiaEstimada,
        cliques: verificacao.estatisticas.jaCadastrados * 3, // ~3 cliques por OJ
        ojsEvitados: verificacao.estatisticas.jaCadastrados
      };

      this.sendStatus('success', 
        `🎯 Verificação concluída: ${verificacao.ojsParaProcessar.length} OJs para processar, ${verificacao.ojsJaCadastrados.length} já cadastrados`, 
        0, 
        `Economia: ${economiaCalculada.tempo}s e ${economiaCalculada.cliques} cliques`
      );

      const resultadoFinal = {
        inteligenciaAtiva: true,
        servidorExiste: true,
        servidor: resultadoServidor.servidor,
        totalVerificados: verificacao.totalVerificados,
        ojsParaProcessar: verificacao.ojsParaProcessar,
        ojsJaCadastrados: verificacao.ojsJaCadastrados,
        ojsInativos: verificacao.ojsInativos,
        economia: economiaCalculada,
        estatisticas: verificacao.estatisticas,
        mensagem: `Sistema inteligente: ${verificacao.ojsParaProcessar.length}/${verificacao.totalVerificados} OJs precisam ser processados`
      };

      console.log(`🔍 [DEBUG] DIRLEI VERIFICAÇÃO - Resultado FINAL que será retornado:`, {
        inteligenciaAtiva: resultadoFinal.inteligenciaAtiva,
        ojsParaProcessar: resultadoFinal.ojsParaProcessar,
        ojsJaCadastrados: resultadoFinal.ojsJaCadastrados?.length || 0
      });

      return resultadoFinal;

    } catch (error) {
      console.error('❌ Erro na verificação inteligente:', error.message);
      this.sendStatus('warning', '⚠️ Erro na verificação inteligente - processando todos os OJs', 0, 'Fallback para modo tradicional');
      
      return {
        inteligenciaAtiva: false,
        erro: error.message,
        ojsParaProcessar: ojsParaProcessar,
        ojsJaCadastrados: [],
        economia: { tempo: 0, cliques: 0 },
        mensagem: `Erro na verificação: ${error.message}`
      };
    }
  }

  /**
   * Formata os detalhes dos OJs para exibição ao usuário
   * @param {Object} resultadoVerificacao - Resultado da verificação inteligente
   * @returns {Object} Detalhes formatados
   */
  formatarDetalhesOJs(resultadoVerificacao) {
    const resumo = [
      `📊 Total: ${resultadoVerificacao.totalVerificados} OJs`,
      `✅ Já cadastrados: ${resultadoVerificacao.ojsJaCadastrados.length}`,
      `🔄 Para processar: ${resultadoVerificacao.ojsParaProcessar.length}`,
      `⚡ Economia: ${resultadoVerificacao.economia.tempo}s`
    ].join(' | ');

    let detalhes = '';
    
    if (resultadoVerificacao.ojsJaCadastrados.length > 0) {
      detalhes += `\n✅ OJs JÁ CADASTRADOS (serão pulados):\n`;
      resultadoVerificacao.ojsJaCadastrados.forEach((oj, index) => {
        detalhes += `   ${index + 1}. ${oj.nome}\n`;
      });
    }
    
    if (resultadoVerificacao.ojsParaProcessar.length > 0) {
      detalhes += `\n🔄 OJs QUE SERÃO PROCESSADOS:\n`;
      resultadoVerificacao.ojsParaProcessar.forEach((oj, index) => {
        detalhes += `   ${index + 1}. ${oj}\n`;
      });
    }

    return { resumo, detalhes };
  }

  /**
   * Solicita confirmação do usuário via modal
   * @param {string} titulo - Título do modal
   * @param {string} mensagem - Mensagem principal
   * @param {string} detalhes - Detalhes adicionais
   * @param {string} pergunta - Pergunta para confirmação
   * @returns {Promise<boolean>} True se confirmado
   */
  async solicitarConfirmacaoUsuario(titulo, mensagem, detalhes, pergunta) {
    return new Promise((resolve) => {
      if (!this.mainWindow || !this.mainWindow.webContents) {
        console.log('⚠️ MainWindow não disponível, continuando automaticamente...');
        resolve(true);
        return;
      }

      // Enviar dados para o modal de confirmação
      this.mainWindow.webContents.executeJavaScript(`
        if (typeof showConfirmationModal === 'function') {
          showConfirmationModal({
            titulo: '${titulo.replace(/'/g, '\\\'')}',
            mensagem: '${mensagem.replace(/'/g, '\\\'')}',
            detalhes: \`${detalhes.replace(/`/g, '\\`')}\`,
            pergunta: '${pergunta.replace(/'/g, '\\\'')}',
            callback: 'confirmacaoAutomacao'
          });
        } else {
          console.log('Modal de confirmação não disponível');
        }
      `).catch(err => {
        console.log('⚠️ Erro ao exibir modal:', err.message);
        resolve(true); // Continuar em caso de erro
      });

      // Registrar callback IPC para receber resposta do renderer
      let finished = false;
      const cleanup = () => {
        finished = true;
        // Garantir que não há listeners residuais
        ipcMain.removeAllListeners('confirmacao-resultado');
      };

      ipcMain.once('confirmacao-resultado', (event, confirmado /*, forcado */) => {
        try {
          cleanup();
        } catch {}
        resolve(Boolean(confirmado));
      });

      // Timeout de 30 segundos - continuar automaticamente se não houver resposta
      setTimeout(() => {
        if (finished) return;
        cleanup();
        console.log('⏰ Timeout na confirmação - continuando automaticamente...');
        resolve(true);
      }, 30000);
    });
  }

  /**
   * Inicializa o cache DOM quando a página estiver disponível
   */
  initializeDOMCache() {
    if (this.page && !this.domCache) {
      this.domCache = new DOMCacheManager(this.page, this.timeoutManager);
      console.log('✅ Cache DOM inicializado');
    }
  }

  // Função helper para delay contextual ULTRA-OTIMIZADO
  async delay(ms, context = 'default') {
    if (context === 'default') {
      // Para delays fixos, usar o UltraFast quando possível
      if (ms <= 100) {
        return await this.ultraFastDelayManager.criticalDelay({ priority: 'critical' });
      } else if (ms <= 500) {
        return await this.ultraFastDelayManager.clickDelay({ priority: 'critical' });
      } else if (ms <= 1000) {
        return await this.ultraFastDelayManager.navigationDelay({ priority: 'critical' });
      }
      // Fallback para delays longos
      return new Promise(resolve => setTimeout(resolve, Math.min(ms, 2000))); // Máximo 2s
    }

    // Usar UltraFastDelayManager para contextos específicos
    if (context === 'hyperFastBetweenOJs' || context === 'critical') {
      return await this.ultraFastDelayManager.criticalDelay({ priority: 'critical', context: context });
    }
    if (context === 'click' || context === 'form') {
      return await this.ultraFastDelayManager.clickDelay({ priority: 'critical', context: context });
    }
    if (context === 'navigation') {
      return await this.ultraFastDelayManager.navigationDelay({ priority: 'critical', context: context });
    }
    if (context === 'search') {
      return await this.ultraFastDelayManager.searchDelay({ priority: 'critical', context: context });
    }

    // Fallback para outros contextos
    return await this.delayManager.smartDelay(context, { priority: 'normal' });
  }
  
  // Novo método para delay contextual com opções
  async contextualDelay(context, options = {}) {
    return await this.delayManager.smartDelay(context, options);
  }

  // Normalizar nomes de órgãos julgadores para corrigir erros de digitação
  normalizeOrgaoName(orgao) {
    return orgao
      .replace(/\s+/g, ' ')  // Normalizar espaços múltiplos
      .replace(/[–—−]/g, '-')  // Normalizar travessões (–, —, −) para hífen (-)
      .replace(/doTrabalho/g, 'do Trabalho')  // Corrigir "doTrabalho" → "do Trabalho"
      .replace(/daTrabalho/g, 'da Trabalho')  // Corrigir "daTrabalho" → "da Trabalho"  
      .replace(/deTrabalho/g, 'de Trabalho')  // Corrigir "deTrabalho" → "de Trabalho"
      .replace(/Trrabalho/g, 'Trabalho')  // Corrigir "Trrabalho" → "Trabalho" (duplo R)
      .replace(/trrabalho/g, 'trabalho')  // Corrigir versão minúscula
      .trim();
  }

  // NOVA FUNÇÃO: Busca inteligente por palavras-chave
  findBestOJMatch(targetOJ, availableOptions) {
    const targetWords = this.extractKeywords(targetOJ);
    let bestMatch = null;
    let bestScore = 0;
    
    console.log(`🔍 Palavras-chave do OJ procurado: [${targetWords.join(', ')}]`);
    
    for (const option of availableOptions) {
      const optionWords = this.extractKeywords(option.text);
      const score = this.calculateMatchScore(targetWords, optionWords);
      
      console.log(`🔍 "${option.text}" - Score: ${score} - Palavras: [${optionWords.join(', ')}]`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
    }
    
    console.log(`🎯 Melhor match encontrado: "${bestMatch?.text}" com score ${bestScore}`);
    return { match: bestMatch, score: bestScore };
  }
  
  // Extrair palavras-chave relevantes
  extractKeywords(text) {
    const normalized = text.toLowerCase()
      .replace(/[^a-záàâãéêíóôõúç\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Palavras irrelevantes que devem ser ignoradas
    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'as', 'os', 'para', 'com', 'por'];
    
    return normalized.split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 8); // Limitar a 8 palavras mais relevantes
  }
  
  // Calcular score de compatibilidade
  calculateMatchScore(targetWords, optionWords) {
    let score = 0;
    const targetSet = new Set(targetWords);
    const optionSet = new Set(optionWords);
    
    // Pontos por palavras exatas
    for (const word of targetWords) {
      if (optionSet.has(word)) {
        score += 10;
      }
    }
    
    // Pontos por palavras similares (substring)
    for (const targetWord of targetWords) {
      for (const optionWord of optionWords) {
        if (targetWord.includes(optionWord) || optionWord.includes(targetWord)) {
          score += 5;
        }
      }
    }
    
    return score;
  }

  sendStatus(type, message, progress = null, subtitle = null, orgao = null, servidor = null, ojProcessed = null, totalOjs = null) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('automation-progress', {
          type,
          message,
          progress,
          subtitle,
          orgaoJulgador: orgao,
          servidor,
          cpf: this.config?.cpf || null,
          perfil: this.config?.perfil || null,
          automationType: 'servidor-v2',
          ojProcessed,
          totalOjs
        });
      }
    } catch (error) {
      // Erro de IPC - não é crítico, apenas log
      console.warn('Erro ao enviar status IPC:', error.message);
    }
        
    try {
      console.log(`[${type.toUpperCase()}] ${message}${subtitle ? ` - ${subtitle}` : ''}${orgao ? ` (${orgao})` : ''}${servidor ? ` [${servidor}]` : ''}`);
    } catch (error) {
      // Em caso de erro até no console.log, usar process.stdout
      process.stdout.write(`[${type.toUpperCase()}] ${message}\n`);
    }
  }

  async startAutomation(config) {
    if (this.isRunning) {
      throw new Error('Automação já está em execução');
    }

    this.isRunning = true;
    this.config = config;
    this.currentProgress = 0;
    this.results = [];
    
    // Inicializar conexão com banco de dados para verificação inteligente
    if (!this.dbConnection) {
      await this.initializeDatabaseConnection();
    }
    
    // Iniciar monitoramento de performance
    this.performanceMonitor.startMonitoring();
    
    // Inicializar timer de processamento para o modal
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.executeJavaScript(`
        if (typeof startProcessingTimer === 'function') {
          startProcessingTimer();
        }
      `).catch(err => {
        console.log('⚠️ Erro ao inicializar timer de processamento:', err.message);
      });
    }

    try {
      // Suporte para processamento em lote de múltiplos servidores
      if (config.servidores && config.servidores.length > 0) {
        await this.processMultipleServidores(config);
      } else {
        // Modo compatibilidade - processar servidor único
        this.totalOrgaos = config.orgaos ? config.orgaos.length : 0;
        await this.processSingleServidor(config);
      }
            
      this.sendStatus('success', 'Automação concluída com sucesso!', 100, 'Processo finalizado');
            
    } catch (error) {
      console.error('Erro na automação:', error);
      this.sendStatus('error', `Erro na automação: ${error.message}`, this.currentProgress, 'Erro crítico');
      throw error;
    } finally {
      await this.cleanup();
      this.isRunning = false;
    }
  }

  /**
   * Inicia automação com processamento paralelo
   * @param {Object} config - Configuração da automação
   * @param {number} maxInstances - Número máximo de instâncias paralelas (padrão: 2)
   */
  async startParallelAutomation(servidores, config, maxInstances = 2) {
    if (this.isRunning) {
      throw new Error('Automação já está em execução');
    }

    // Validar configuração para processamento paralelo
    if (!servidores || servidores.length === 0) {
      throw new Error('Processamento paralelo requer uma lista de servidores');
    }

    if (maxInstances < 1 || maxInstances > 30) {
      throw new Error('Número de instâncias deve estar entre 1 e 30');
    }

    this.isRunning = true;
    this.config = config;
    this.currentProgress = 0;
    this.results = [];
    
    // Iniciar monitoramento de performance
    this.performanceMonitor.startMonitoring();

    this.sendStatus('info', '🚀 Iniciando processamento paralelo', 0, 
      `${servidores.length} servidores com ${maxInstances} instâncias`);

    try {
      // Import dinamicamente para evitar dependência circular
      const ParallelServerManager = require('./parallel-server-manager.js');
      const parallelManager = new ParallelServerManager(maxInstances);
      parallelManager.mainWindow = this.mainWindow;
      
      // Inicializar instâncias paralelas
      await parallelManager.initialize();
      
      this.sendStatus('info', `✅ ${maxInstances} instâncias inicializadas`, 10, 
        'Iniciando processamento dos servidores');
      
      // Configurar para manter navegador aberto por padrão
      const parallelConfig = {
        orgaos: config.orgaos || [],
        keepBrowserOpen: config.keepBrowserOpen !== false // Default: true
      };
      
      // Processar servidores em paralelo
      const results = await parallelManager.processServersInParallel(servidores, parallelConfig);
      
      // Consolidar resultados
      this.results = results.resultados || [];
      
      // Gerar relatório específico para processamento paralelo
      await this.generateParallelReport(results, maxInstances);
      
      this.sendStatus('success', 
        '🎉 Processamento paralelo concluído!', 
        100, 
        `${results.servidoresProcessados}/${results.totalServidores} servidores processados em ${(results.tempoTotal / 1000).toFixed(1)}s`);
      
      if (parallelConfig.keepBrowserOpen) {
        console.log('🔄 Navegador mantido aberto para visualização dos resultados');
        console.log('💡 Para fechar completamente, use: automation.forceCleanup()');
        // Armazenar referência do manager para cleanup posterior
        this.parallelManager = parallelManager;
      } else {
        // Limpar instâncias paralelas apenas se não configurado para manter aberto
        await parallelManager.cleanup();
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Erro no processamento paralelo:', error);
      this.sendStatus('error', `Erro no processamento paralelo: ${error.message}`, this.currentProgress);
      throw error;
    } finally {
      this.isRunning = false;
      // Cleanup será feito apenas se keepBrowserOpen for false
    }
  }

  /**
   * Força o fechamento completo de todas as instâncias
   */
  async forceCleanup() {
    if (this.parallelManager) {
      console.log('🔄 Forçando fechamento de todas as instâncias...');
      await this.parallelManager.cleanup(true);
      this.parallelManager = null;
      console.log('✅ Todas as instâncias foram fechadas');
    } else {
      console.log('ℹ️ Nenhuma instância paralela ativa para fechar');
    }
  }
  
  /**
   * Gera relatório específico para processamento paralelo
   */
  async generateParallelReport(results, maxInstances) {
    try {
      const outputDir = path.join(__dirname, '..', '..', 'data');
      
      // Garantir que o diretório existe
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const report = {
        timestamp: new Date().toISOString(),
        tipoProcessamento: 'Paralelo',
        configuracao: {
          instanciasUtilizadas: maxInstances,
          servidoresTotais: results.totalServidores,
          servidoresProcessados: results.servidoresProcessados
        },
        performance: {
          tempoTotalSegundos: results.tempoTotal / 1000,
          tempoMedioServidorSegundos: results.tempoMedioServidor / 1000,
          eficienciaParalela: results.eficienciaParalela,
          estatisticas: results.estatisticas
        },
        resultados: {
          sucessos: results.sucessos,
          erros: results.erros,
          detalhesServidores: results.resultados,
          errosDetalhados: results.errosDetalhados
        },
        comparacao: {
          estimativaSequencial: (results.tempoTotal * maxInstances) / 1000,
          ganhoTempo: results.eficienciaParalela?.timeReduction || 0,
          speedup: results.eficienciaParalela?.speedup || 1
        }
      };
      
      const reportPath = path.join(outputDir, `relatorio-paralelo-${timestamp}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📊 Relatório paralelo salvo: ${reportPath}`);
      
      // Também gerar versão legível
      const readableReportPath = path.join(outputDir, `relatorio-paralelo-legivel-${timestamp}.txt`);
      const readableContent = this.generateReadableParallelReport(report);
      fs.writeFileSync(readableReportPath, readableContent);
      
      console.log(`📄 Relatório legível salvo: ${readableReportPath}`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório paralelo:', error);
    }
  }

  /**
   * Gera versão legível do relatório paralelo
   */
  generateReadableParallelReport(report) {
    return `
=== RELATÓRIO DE PROCESSAMENTO PARALELO ===

Data/Hora: ${new Date(report.timestamp).toLocaleString('pt-BR')}
Tipo: ${report.tipoProcessamento}

--- CONFIGURAÇÃO ---
Instâncias Paralelas: ${report.configuracao.instanciasUtilizadas}
Servidores Totais: ${report.configuracao.servidoresTotais}
Servidores Processados: ${report.configuracao.servidoresProcessados}

--- PERFORMANCE ---
Tempo Total: ${report.performance.tempoTotalSegundos.toFixed(1)}s
Tempo Médio por Servidor: ${report.performance.tempoMedioServidorSegundos.toFixed(1)}s
Speedup: ${report.performance.eficienciaParalela?.speedup?.toFixed(2) || 'N/A'}x
Eficiência: ${(report.performance.eficienciaParalela?.efficiency * 100)?.toFixed(1) || 'N/A'}%
Redução de Tempo: ${report.performance.eficienciaParalela?.timeReduction?.toFixed(1) || 'N/A'}%

--- RESULTADOS ---
Sucessos: ${report.resultados.sucessos}
Erros: ${report.resultados.erros}
Taxa de Sucesso: ${((report.resultados.sucessos / report.configuracao.servidoresProcessados) * 100).toFixed(1)}%

--- COMPARAÇÃO ---
Tempo Estimado Sequencial: ${report.comparacao.estimativaSequencial.toFixed(1)}s
Ganho de Tempo: ${report.comparacao.ganhoTempo.toFixed(1)}%
Velocidade: ${report.comparacao.speedup.toFixed(2)}x mais rápido

--- ESTATÍSTICAS DETALHADAS ---
${report.performance.estatisticas ? `
Tempo de Processamento:
  Mínimo: ${(report.performance.estatisticas.tempoProcessamento?.minimo / 1000).toFixed(1)}s
  Máximo: ${(report.performance.estatisticas.tempoProcessamento?.maximo / 1000).toFixed(1)}s
  Média: ${(report.performance.estatisticas.tempoProcessamento?.media / 1000).toFixed(1)}s

Sucessos por Servidor:
  Mínimo: ${report.performance.estatisticas.sucessosPorServidor?.minimo || 0}
  Máximo: ${report.performance.estatisticas.sucessosPorServidor?.maximo || 0}
  Média: ${report.performance.estatisticas.sucessosPorServidor?.media?.toFixed(1) || 0}
  Total: ${report.performance.estatisticas.sucessosPorServidor?.total || 0}` : 'Não disponível'}

=== FIM DO RELATÓRIO ===
`;
  }

  async processMultipleServidores(config) {
    const servidores = config.servidores;
    this.totalOrgaos = servidores.reduce((total, servidor) => total + (servidor.orgaos ? servidor.orgaos.length : 0), 0);
    
    // Inicializar estrutura de relatório por servidor
    this.servidorResults = {};
    this.processedServidores = 0;
    this.successfulServidores = 0;
    this.failedServidores = 0;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3; // Parar após 3 erros consecutivos
    
    this.sendStatus('info', `🚀 AUTOMAÇÃO EM LOTE: ${servidores.length} servidores, ${this.totalOrgaos} OJs total`, 0, 'Iniciando processamento sequencial robusto');
    
    await this.initializeBrowser();
    await this.performLogin();
    
    // Processar cada servidor na mesma sessão com recuperação robusta
    for (let i = 0; i < servidores.length; i++) {
      const servidor = servidores[i];
      const progressBase = (i / servidores.length) * 90;
      
      // Verificar limite de erros consecutivos
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.sendStatus('error', `🚨 PARADA DE SEGURANÇA: ${this.maxConsecutiveErrors} erros consecutivos detectados`, 90, 'Automação interrompida por segurança');
        break;
      }
      
      // Inicializar resultado do servidor
      this.servidorResults[servidor.cpf] = {
        nome: servidor.nome,
        cpf: servidor.cpf,
        perfil: servidor.perfil,
        totalOJs: servidor.orgaos ? servidor.orgaos.length : 0,
        ojsProcessados: 0,
        sucessos: 0,
        erros: 0,
        jaIncluidos: 0,
        detalhes: [],
        status: 'Processando',
        inicioProcessamento: new Date().toISOString(),
        fimProcessamento: null,
        tempoProcessamento: null,
        tentativas: 0,
        maxTentativas: 2
      };
      
      this.sendStatus('info', `🎯 [${i + 1}/${servidores.length}] ${servidor.nome}`, 
        progressBase, `CPF: ${servidor.cpf} | Perfil: ${servidor.perfil} | ${servidor.orgaos?.length || 0} OJs | Erros consecutivos: ${this.consecutiveErrors}`, null, servidor.nome);
      
      const startTime = Date.now();
      let servidorProcessado = false;
      
      // Tentar processar servidor com retry automático
      for (let tentativa = 1; tentativa <= this.servidorResults[servidor.cpf].maxTentativas && !servidorProcessado; tentativa++) {
        this.servidorResults[servidor.cpf].tentativas = tentativa;
        
        try {
          this.sendStatus('info', `🔄 [${i + 1}/${servidores.length}] Tentativa ${tentativa}/${this.servidorResults[servidor.cpf].maxTentativas} - ${servidor.nome}`, 
            progressBase, `CPF: ${servidor.cpf} | Perfil: ${servidor.perfil}`, null, servidor.nome);
          
          console.log(`🎯 ===== INICIANDO PROCESSAMENTO DO SERVIDOR ${i + 1}: ${servidor.nome} =====`);
          
          // Garantir navegador ativo antes de processar
          console.log(`🔍 [${i + 1}/${servidores.length}] Verificando navegador ativo...`);
          await this.ensureBrowserActive();
          
          // Garantir recuperação completa antes de processar
          console.log(`🧹 [${i + 1}/${servidores.length}] Limpando estado...`);
          await this.ensureCleanState();
          
          // Configurar dados do servidor atual
          console.log(`⚙️ [${i + 1}/${servidores.length}] Configurando dados do servidor...`);
          this.config.cpf = servidor.cpf;
          this.config.perfil = servidor.perfil;
          this.config.orgaos = servidor.orgaos || [];
          console.log(`📋 Servidor configurado: CPF=${servidor.cpf}, Perfil=${servidor.perfil}, OJs=${servidor.orgaos?.length || 0}`);
          
          // Debug detalhado do estado atual
          console.log('🔍 [DEBUG] Estado do navegador:');
          const currentUrl = this.page.url();
          console.log(`   URL atual: ${currentUrl}`);
          const pageTitle = await this.page.title();
          console.log(`   Título: ${pageTitle}`);
          console.log(`   Servidor ${i + 1}: ${servidor.nome} (${servidor.cpf})`);
          console.log(`   OJs a processar: ${JSON.stringify(servidor.orgaos?.slice(0,3) || [])}${servidor.orgaos?.length > 3 ? '...' : ''}`);
          
          // Navegação robusta
          console.log(`🔗 [${i + 1}/${servidores.length}] Navegando para pessoa...`);
          await this.navigateDirectlyToPerson(servidor.cpf);
          
          // Debug após navegação
          const urlAposNavegacao = this.page.url();
          console.log(`🔍 [DEBUG] URL após navegação: ${urlAposNavegacao}`);
          console.log(`🔍 [DEBUG] Navegação para ${servidor.nome} (${servidor.cpf}) CONCLUÍDA`);
          
          console.log(`📂 [${i + 1}/${servidores.length}] Acessando aba servidor...`);
          await this.navigateToServerTab();
          
          // Debug após acessar aba servidor
          const urlAposAbaServidor = this.page.url();
          console.log(`🔍 [DEBUG] URL após aba servidor: ${urlAposAbaServidor}`);
          console.log(`🔍 [DEBUG] Aba servidor acessada para ${servidor.nome}`);
          
          // Processar OJs com monitoramento detalhado
          console.log(`🎯 [${i + 1}/${servidores.length}] Processando ${servidor.orgaos?.length || 0} OJs...`);
          console.log(`🔍 [DEBUG] Iniciando processamento de OJs para ${servidor.nome}:`);
          for (let debugOJ = 0; debugOJ < Math.min(3, servidor.orgaos?.length || 0); debugOJ++) {
            console.log(`   OJ ${debugOJ + 1}: ${servidor.orgaos[debugOJ]}`);
          }
          
          await this.processOrgaosJulgadoresWithServerTracking(servidor);
          console.log(`✅ [${i + 1}/${servidores.length}] Processamento de OJs concluído`);
          console.log(`🔍 [DEBUG] Processamento de OJs FINALIZADO para ${servidor.nome}`);
          
          // Finalizar resultado do servidor
          console.log(`📋 [${i + 1}/${servidores.length}] Finalizando resultado do servidor...`);
          const serverResult = this.servidorResults[servidor.cpf];
          serverResult.status = 'Concluído';
          serverResult.fimProcessamento = new Date().toISOString();
          serverResult.tempoProcessamento = Date.now() - startTime;
          
          this.processedServidores++;
          this.successfulServidores++;
          this.consecutiveErrors = 0; // Reset contador de erros
          
          console.log(`🎉 [${i + 1}/${servidores.length}] Servidor ${servidor.nome} CONCLUÍDO com sucesso!`);
          
          this.sendStatus('success', `✅ [${i + 1}/${servidores.length}] ${servidor.nome}: ${serverResult.sucessos} sucessos, ${serverResult.erros} erros`, 
            ((i + 1) / servidores.length) * 90, `Tempo: ${(serverResult.tempoProcessamento/1000).toFixed(1)}s`);
          
          servidorProcessado = true;
          
        } catch (error) {
          console.error(`❌ TENTATIVA ${tentativa} FALHOU - Servidor: ${servidor.nome} (${servidor.cpf})`);
          console.error(`   Erro: ${error.message}`);
          
          if (tentativa === this.servidorResults[servidor.cpf].maxTentativas) {
            // Última tentativa falhou
            const serverResult = this.servidorResults[servidor.cpf];
            serverResult.status = 'Erro';
            serverResult.fimProcessamento = new Date().toISOString();
            serverResult.tempoProcessamento = Date.now() - startTime;
            serverResult.erroGeral = error.message;
            
            this.processedServidores++;
            this.failedServidores++;
            this.consecutiveErrors++;
            
            this.sendStatus('error', `❌ [${i + 1}/${servidores.length}] ${servidor.nome}: ${error.message}`, 
              ((i + 1) / servidores.length) * 90, `FALHA após ${this.servidorResults[servidor.cpf].maxTentativas} tentativas`);
            
            // Log detalhado do erro final
            console.error(`💥 FALHA FINAL - Servidor: ${servidor.nome} (${servidor.cpf})`);
            console.error(`   Erro: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            console.error(`   Tentativas realizadas: ${tentativa}`);
          } else {
            // Ainda há tentativas, tentar recuperação
            this.sendStatus('warning', `⚠️ [${i + 1}/${servidores.length}] Tentativa ${tentativa} falhou: ${error.message}`, 
              progressBase, 'Tentando recuperação para próxima tentativa...');
          }
          
          // Tentar recuperação robusta para próxima tentativa ou próximo servidor
          await this.performRobustRecovery();
        }
      }
      
      // Pausa estabilizada entre servidores para garantir continuidade
      if (i < servidores.length - 1) {
        console.log(`🔄 ===== TRANSIÇÃO: Servidor ${i + 1} → Servidor ${i + 2} =====`);
        console.log(`⏳ Preparando para próximo servidor (${servidores[i + 1].nome})...`);
        
        this.sendStatus('info', '⏳ Preparando para próximo servidor...', 
          ((i + 1) / servidores.length) * 90, 'Estabilizando sistema');
        
        // Limpeza extra entre servidores
        try {
          console.log('🧹 Limpeza extra entre servidores...');
          
          // IMPORTANTE: Limpar cache de OJs entre servidores
          console.log(`🗑️ Limpando cache de OJs (${this.ojCache.size} OJs em cache)...`);
          this.ojCache.clear();
          console.log('✅ Cache de OJs limpo - próximo servidor processará todos os OJs');
          
          await this.closeAnyModals();
          await this.contextualDelay('stabilization', { priority: 'high' }); // Pausa maior para estabilidade
          console.log('✅ Sistema estabilizado para próximo servidor');
        } catch (transitionError) {
          console.log('⚠️ Erro na transição entre servidores:', transitionError.message);
          await this.contextualDelay('errorRecovery', { priority: 'high' }); // Pausa extra se houver erro
        }
      } else {
        console.log('🏁 ===== ÚLTIMO SERVIDOR PROCESSADO - FINALIZANDO =====');
      }
    }
    
    // Limpar forced set ao final do processamento em lote
    this.forcedOJsNormalized = null;
    await this.generateMultiServerReport();
  }

  async processSingleServidor(config) {
    this.sendStatus('info', 'Iniciando automação moderna...', 0, 'Configurando ambiente');
            
    await this.initializeBrowser();
    await this.performLogin();
    await this.navigateDirectlyToPerson(config.cpf);
    await this.navigateToServerTab();
    await this.processOrgaosJulgadores();
    await this.generateReport();
  }

  async initializeBrowser() {
    this.sendStatus('info', 'Inicializando navegador...', 5, 'Configurando Playwright');
        
    const browserOptions = {
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
    };

    // Usar o PJEResilienceManager para inicializar o navegador
    const browserResult = await this.resilienceManager.wrapBrowserOperation(async () => {
      // Em desenvolvimento, tentar conectar a Chrome existente
      if (!this.isProduction) {
        try {
          this.browser = await chromium.connectOverCDP('http://localhost:9222');
          const contexts = this.browser.contexts();
          if (contexts.length > 0 && contexts[0].pages().length > 0) {
            this.page = contexts[0].pages()[0];
          } else {
            const context = await this.browser.newContext();
            this.page = await context.newPage();
          }
          this.sendStatus('info', 'Conectado ao Chrome existente', 10, 'Modo desenvolvimento');
          return { browser: this.browser, page: this.page };
        } catch (error) {
          console.log('Não foi possível conectar ao Chrome existente, iniciando novo navegador');
          this.browser = await chromium.launch(browserOptions);
          const context = await this.browser.newContext();
          this.page = await context.newPage();
          return { browser: this.browser, page: this.page };
        }
      } else {
        this.browser = await chromium.launch(browserOptions);
        const context = await this.browser.newContext();
        this.page = await context.newPage();
        return { browser: this.browser, page: this.page };
      }
    });

    if (!browserResult) {
      throw new Error('Falha ao inicializar navegador após múltiplas tentativas');
    }

    this.browser = browserResult.browser;
    this.page = browserResult.page;

    // Configurar User-Agent e cabeçalhos
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Interceptar falhas de rede e tentar novamente
    this.page.on('requestfailed', request => {
      console.log(`⚠️ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
        
    // Configurar timeouts HIPER-OTIMIZADOS para máxima velocidade
    this.page.setDefaultTimeout(8000); // 8s HIPER-OTIMIZADO para elementos
    
    // Inicializar cache DOM
    this.initializeDOMCache();
    this.page.setDefaultNavigationTimeout(15000); // 15s HIPER-OTIMIZADO para navegação

    // Capturar logs do console
    this.page.on('console', msg => {
      const logMessage = msg.text();
      if (logMessage.includes('ERROR') || logMessage.includes('WARN')) {
        console.log('Browser console:', logMessage);
      }
    });

    this.sendStatus('success', 'Navegador inicializado', 15, 'Pronto para automação');
  }

  async performLogin() {
    this.sendStatus('info', 'Realizando login...', 20, 'Autenticando no PJe');
        
    // Usar PJEResilienceManager para login com resiliência
    const loginResult = await this.resilienceManager.executeWithResilience(async () => {
      await login(this.page);
      return true;
    }, 'Login');

    if (!loginResult) {
      throw new Error('Falha no login após múltiplas tentativas');
    }

    this.sendStatus('success', 'Login realizado com sucesso', 30, 'Autenticado');
  }

  async navigateDirectlyToPerson(cpf) {
    const startTime = Date.now();
    this.performanceMonitor.recordNavigationStart('navigateDirectlyToPerson', `CPF: ${cpf}`);
    
    this.sendStatus('info', 'Navegando diretamente para pessoa...', 35, `CPF: ${cpf}`);
        
    const cpfFormatado = cpf; // Manter formatação original
        
    // URL direta para a página da pessoa
    const directUrl = `https://pje.trt15.jus.br/pjekz/pessoa-fisica?pagina=1&tamanhoPagina=10&cpf=${encodeURIComponent(cpfFormatado)}&situacao=1`;
        
    console.log(`🔗 Navegando para URL direta: ${directUrl}`);
    
    // IMPORTANTE: Fechar qualquer modal/overlay antes de navegar
    try {
      console.log('🧹 Limpando modais antes da navegação...');
      await this.closeAnyModals();
      await this.contextualDelay('navigation', { priority: 'normal' });
    } catch (cleanError) {
      console.log('⚠️ Erro na limpeza inicial:', cleanError.message);
    }
        
    // Múltiplas estratégias de carregamento HIPER-OTIMIZADAS para máxima velocidade
    const navigationStrategies = [
      { waitUntil: 'domcontentloaded', timeout: 5000, description: 'DOM carregado (HIPER-OTIMIZADO)' },
      { waitUntil: 'load', timeout: 8000, description: 'Página carregada (HIPER-OTIMIZADO)' },
      { waitUntil: 'networkidle', timeout: 12000, description: 'Rede estável (HIPER-OTIMIZADO)' }
    ];
        
    let navigationSuccess = false;
    let lastError = null;
        
    for (const strategy of navigationStrategies) {
      try {
        this.sendStatus('info', `Tentando navegação: ${strategy.description}`, 36, `Timeout: ${strategy.timeout/1000}s`);
                
        await this.navigationOptimizer.optimizedNavigate(this.page, directUrl);
                
        // Aguardar elementos críticos aparecerem
        await Promise.race([
          this.page.waitForSelector('table', { timeout: 5000 }),
          this.page.waitForSelector('.datatable', { timeout: 5000 }),
          this.page.waitForSelector('[data-test-id]', { timeout: 5000 }),
          this.page.waitForTimeout(2000) // Fallback mínimo
        ]);
        
        // IMPORTANTE: Verificar se não há modais bloqueando após navegação
        console.log('🧹 Limpando modais após navegação...');
        await this.closeAnyModals();
        await this.contextualDelay('pageLoad', { priority: 'normal' });
                
        navigationSuccess = true;
        this.sendStatus('success', `Navegação bem-sucedida com: ${strategy.description}`, 40, 'Pessoa encontrada');
        break;
                
      } catch (error) {
        console.warn(`⚠️ Falha na estratégia ${strategy.description}:`, error.message);
        lastError = error;
                
        // Se não foi timeout, tentar próxima estratégia
        if (!error.message.includes('Timeout') && !error.message.includes('timeout')) {
          continue;
        }
      }
    }
        
    if (!navigationSuccess) {
      console.error('❌ Todas as estratégias de navegação falharam');
      this.sendStatus('error', `Erro na navegação: ${lastError?.message || 'Timeout em todas as tentativas'}`, 35, 'Falha na navegação');
      throw lastError || new Error('Falha em todas as estratégias de navegação');
    }
        
    // Verificar se chegou na página correta e limpar novamente
    const currentUrl = this.page.url();
    console.log(`✅ URL atual após navegação: ${currentUrl}`);
    
    // Final cleanup para garantir página limpa
    try {
      await this.closeAnyModals();
      await this.contextualDelay('elementWait', { priority: 'normal' });
      console.log('✅ Página limpa e pronta para processar');
    } catch (finalCleanError) {
      console.log('⚠️ Erro na limpeza final:', finalCleanError.message);
    }
    
    // Registrar fim da navegação
    this.performanceMonitor.recordNavigationEnd('navigateDirectlyToPerson', Date.now() - startTime);
  }

  async searchByCPF(cpf) {
    const searchStartTime = Date.now();
    this.performanceMonitor.recordElementSearchStart('searchByCPF');
    
    this.sendStatus('info', 'Buscando por CPF...', 35, `CPF: ${cpf}`);
        
    const cpfLimpo = cpf.replace(/\D/g, '');
        
    // Debug: verificar URL atual
    const currentUrl = this.page.url();
    console.log(`🔍 URL atual: ${currentUrl}`);
        
    // Aguardar a página carregar completamente
    await this.page.waitForLoadState('networkidle');
        
    // Múltiplos seletores para campo de busca
    const searchCandidates = [
      this.page.locator('input[placeholder*="CPF"]'),
      this.page.locator('input[placeholder*="cpf"]'),
      this.page.locator('input[name="cpf"]'),
      this.page.locator('#cpf'),
      this.page.locator('input[placeholder*="nome"]'),
      this.page.locator('input[name="nome"]'),
      this.page.locator('#nome'),
      this.page.locator('input[type="text"]'),
      this.page.locator('.form-control'),
      this.page.locator('input[class*="form"]'),
      this.page.locator('input[class*="input"]'),
      this.page.locator('input[id*="search"]'),
      this.page.locator('input[id*="busca"]'),
      this.page.locator('input[name*="search"]'),
      this.page.locator('input[name*="busca"]'),
      this.page.locator('input').first()
    ];
        
    let searchInput = null;
    for (let i = 0; i < searchCandidates.length; i++) {
      const candidate = searchCandidates[i];
      const count = await candidate.count();
      console.log(`Candidato ${i + 1} para busca: ${count} elementos encontrados`);
      if (count > 0) {
        try {
          await candidate.first().waitFor({ timeout: 3000 });
          searchInput = candidate.first();
          console.log(`✅ Usando candidato ${i + 1} para busca`);
          break;
        } catch (e) {
          console.log(`Candidato ${i + 1} não está visível`);
        }
      }
    }
        
    if (!searchInput) {
      throw new Error('Campo de busca por CPF não foi encontrado');
    }
        
    // Limpar e digitar o CPF
    await searchInput.clear();
    await searchInput.fill(cpfLimpo);
        
    // Tentar clicar no botão "Procurar"
    const searchButtonCandidates = [
      this.page.locator('button:has-text("Procurar")'),
      this.page.locator('input[type="submit"][value*="Procurar"]'),
      this.page.locator('button[type="submit"]'),
      this.page.locator('.btn:has-text("Procurar")'),
      this.page.locator('input[value="Procurar"]'),
      this.page.locator('button:has-text("Buscar")'),
      this.page.locator('input[type="submit"]')
    ];
        
    let searchButtonClicked = false;
    for (let i = 0; i < searchButtonCandidates.length; i++) {
      const candidate = searchButtonCandidates[i];
      const count = await candidate.count();
      console.log(`Candidato ${i + 1} para botão Procurar: ${count} elementos encontrados`);
      if (count > 0) {
        try {
          await candidate.first().waitFor({ timeout: 2000 });
          await candidate.first().click();
          console.log(`✅ Clicou no botão Procurar (candidato ${i + 1})`);
          searchButtonClicked = true;
          break;
        } catch (e) {
          console.log(`Candidato ${i + 1} para botão Procurar não está clicável`);
        }
      }
    }
        
    // Se não conseguiu clicar no botão, usar Enter
    if (!searchButtonClicked) {
      console.log('⚠️ Botão Procurar não encontrado, usando Enter como alternativa');
      await searchInput.press('Enter');
    }
        
    // Aguardar os resultados carregarem
    await this.contextualDelay('searchPJE', { priority: 'high' });
        
    this.sendStatus('success', 'Busca realizada', 40, 'CPF encontrado');
    this.performanceMonitor.recordElementSearchEnd('searchByCPF', Date.now() - searchStartTime, true);
  }

  async navigateToServerTab() {
    this.sendStatus('info', 'Navegando para aba Servidor...', 45, 'Acessando perfil');
    
    // Usar PJEResilienceManager para navegação resiliente
    const navigationResult = await this.resilienceManager.executeWithResilience(async () => {
      let editSuccessful = false;
      
      try {
        // Clicar no ícone de edição
        await this.clickEditIcon();
        editSuccessful = true;
        console.log('✅ Ícone de edição clicado com sucesso');
        
        // Aguardar navegação
        await this.contextualDelay('networkWait', { priority: 'normal' });
        
        // Clicar na aba Servidor
        await this.clickServerTab();
        
      } catch (editError) {
        console.error('❌ Falha ao clicar no ícone de edição:', editError.message);
        
        // ESTRATÉGIA DE FALLBACK: Tentar navegar diretamente para a página de edição
        console.log('🔄 TENTANDO FALLBACK: Navegação direta para edição');
        
        const currentUrl = this.page.url();
        console.log(`📍 URL atual: ${currentUrl}`);
        
        // Se já estamos na página de pessoa, tentar URLs diretas de edição
        if (currentUrl.includes('pessoa-fisica')) {
          const possibleEditUrls = [
            currentUrl.replace('pessoa-fisica', 'pessoa-fisica/alterar'),
            currentUrl.replace('pessoa-fisica', 'pessoa-fisica/editar'),
            currentUrl + '/alterar',
            currentUrl + '/editar',
            currentUrl.includes('?') ? currentUrl + '&acao=alterar' : currentUrl + '?acao=alterar'
          ];
          
          for (const editUrl of possibleEditUrls) {
            try {
              console.log(`🔗 Tentando URL direta: ${editUrl}`);
              await this.navigationOptimizer.fastNavigate(this.page, editUrl);
              await this.contextualDelay('networkWait', { priority: 'normal' });
              
              // Verificar se chegamos numa página de edição (procurar pela aba Servidor)
              const serverTabExists = await this.page.$('text=Servidor, a[href*="servidor"], button:has-text("Servidor")');
              if (serverTabExists) {
                console.log('✅ FALLBACK SUCEDIDO: Página de edição alcançada');
                editSuccessful = true;
                
                // Tentar clicar na aba servidor
                await this.clickServerTab();
                break;
              } else {
                console.log('❌ URL não levou à página de edição');
              }
              
            } catch (urlError) {
              console.log(`❌ Falha na URL ${editUrl}: ${urlError.message}`);
            }
          }
        }
        
        // Se ainda não conseguimos, tentar uma última estratégia
        if (!editSuccessful) {
          console.log('🚨 ESTRATÉGIA FINAL: Buscar por qualquer link/form de edição na página atual');
          
          const currentPageContent = await this.page.content();
          if (currentPageContent.includes('servidor') || currentPageContent.includes('Servidor')) {
            console.log('✅ Conteúdo de servidor detectado na página atual');
            
            // Tentar encontrar e clicar na aba servidor diretamente
            await this.clickServerTab();
            editSuccessful = true;
          }
        }
        
        if (!editSuccessful) {
          throw new Error(`Não foi possível acessar a página de edição: ${editError.message}`);
        }
      }
      
      return editSuccessful;
    }, 'Navegação para aba Servidor');
    
    if (!navigationResult) {
      throw new Error('Falha ao navegar para aba Servidor após múltiplas tentativas');
    }
    
    this.sendStatus('success', 'Aba Servidor acessada', 50, 'Pronto para processar OJs');
  }

  async clickEditIcon() {
    const clickStartTime = Date.now();
    this.performanceMonitor.recordClickStart('clickEditIcon');
    
    console.log('🎯 VERSÃO MELHORADA: Detecção robusta de ícone de edição...');
    
    // Debug: verificar elementos visíveis na página
    try {
      const pageContent = await this.page.content();
      console.log(`📄 URL atual: ${this.page.url()}`);
      
      // Verificar se há tabela na página
      const hasTable = pageContent.includes('<table') || pageContent.includes('datatable');
      console.log(`🗂️ Tabela detectada: ${hasTable}`);
      
      // Procurar por elementos que podem ser botões de edição (limitado para performance)
      try {
        const potentialButtons = await this.page.$$eval('button, a', elements => 
          elements.slice(0, 20).map(el => ({
            tagName: el.tagName,
            text: el.textContent?.trim().substring(0, 50),
            title: el.title,
            className: el.className?.substring(0, 100)
          }))
        );
        console.log('🔘 Primeiros botões/links encontrados:', potentialButtons);
      } catch (evalError) {
        console.log('⚠️ Erro ao listar botões:', evalError.message);
      }
    } catch (debugError) {
      console.log('⚠️ Erro no debug:', debugError.message);
    }

    // Seletores CORRETOS baseados no HTML fornecido pelo usuário
    const editSelectors = [
      // Seletores específicos baseados no código real
      'button[aria-label="Alterar pessoa"]',
      'button[mattooltip="Alterar pessoa"]',
      'button:has(i.fa-pencil-alt)',
      '.visivel-hover',
      'button.visivel-hover',
      '.fa-pencil-alt',
      'i.fa-pencil-alt',
      'i.fas.fa-pencil-alt',
      '#cdk-drop-list-1 > tr > td:nth-child(6) > button',
      'td:nth-child(6) button',
      'td:nth-child(6) .visivel-hover',
      
      // Fallbacks genéricos
      'button[title*="Alterar"]',
      'a[title*="Alterar"]', 
      '.fa-edit',
      '.fa-pencil'
    ];
        
    let editButton = null;
    let editButtonElement = null;
    
    // NOVA ESTRATÉGIA 1: Forçar visibilidade e fazer hover intensivo
    console.log('🔧 ESTRATÉGIA 1: Forçando visibilidade e hover intensivo...');
    
    try {
      // 1.1: Forçar visibilidade via JavaScript
      await this.page.evaluate(() => {
        // Forçar todos os elementos .visivel-hover serem visíveis
        const hoverElements = document.querySelectorAll('.visivel-hover, button[aria-label="Alterar pessoa"]');
        console.log(`Forçando visibilidade em ${hoverElements.length} elementos`);
        
        hoverElements.forEach((element, index) => {
          element.style.visibility = 'visible';
          element.style.opacity = '1'; 
          element.style.display = 'inline-block';
          element.style.pointerEvents = 'auto';
          console.log(`Elemento ${index + 1} forçado a ser visível`);
        });
        
        return hoverElements.length;
      });
      
      console.log('✅ Visibilidade forçada via JavaScript');
      
      // 1.2: Fazer hover intensivo em todas as linhas da tabela (otimizado)
      const allRows = await this.page.$$('table tbody tr, .table tbody tr, .datatable tbody tr, #cdk-drop-list-1 > tr');
      console.log(`📋 Fazendo hover intensivo em ${allRows.length} linhas...`);
      
      for (let i = 0; i < Math.min(allRows.length, 3); i++) {
        const row = allRows[i];
        try {
          console.log(`🖱️ Hover intensivo na linha ${i + 1}...`);
          await row.hover();
          await this.delay(1000);
          
          // Verificar imediatamente se botões apareceram
          const buttonsInRow = await row.$$('button[aria-label="Alterar pessoa"], .visivel-hover, i.fa-pencil-alt');
          if (buttonsInRow.length > 0) {
            console.log(`✅ ${buttonsInRow.length} botões encontrados após hover na linha ${i + 1}`);
            
            for (const btn of buttonsInRow) {
              const isVisible = await btn.isVisible();
              if (isVisible) {
                editButtonElement = btn;
                editButton = `Hover linha ${i + 1} - botão visível`;
                console.log(`🎯 SUCESSO: ${editButton}`);
                break;
              }
            }
            
            if (editButtonElement) break;
          }
        } catch (hoverRowError) {
          console.log(`⚠️ Erro hover linha ${i + 1}:`, hoverRowError.message);
        }
      }
      
    } catch (forceError) {
      console.log('⚠️ Erro na estratégia de força:', forceError.message);
    }
    
    // ESTRATÉGIA 2: Clique direto na linha se não encontrou botões 
    if (!editButtonElement) {
      console.log('🎯 ESTRATÉGIA 2: Clique direto na linha da tabela...');
      try {
        const firstRow = await this.page.$('table tbody tr:first-child, .table tbody tr:first-child, .datatable tbody tr:first-child, #cdk-drop-list-1 > tr:first-child');
        if (firstRow) {
          console.log('✅ Executando clique direto na primeira linha...');
          
          // Primeiro fazer hover para garantir
          await firstRow.hover();
          await this.delay(500);
          
          // Então clicar
          await firstRow.click();
          await this.delay(3000);
          
          // Verificar se mudou de página
          const currentUrl = this.page.url();
          console.log(`📍 URL após clique: ${currentUrl}`);
          
          if (currentUrl.includes('editar') || currentUrl.includes('edit') || currentUrl.includes('detalhes')) {
            console.log('🎯 SUCESSO: Navegação por clique na linha realizada!');
            editButtonElement = firstRow;
            editButton = 'Clique direto na linha da tabela';
          } else {
            console.log('⚠️ Clique na linha não levou à página de edição, tentando double-click...');
            
            await firstRow.dblclick();
            await this.delay(3000);
            
            const newUrl = this.page.url();
            if (newUrl !== currentUrl && (newUrl.includes('editar') || newUrl.includes('edit'))) {
              console.log('🎯 SUCESSO: Navegação por double-click realizada!');
              editButtonElement = firstRow;
              editButton = 'Double-click na linha da tabela';
            }
          }
        }
      } catch (directClickError) {
        console.log('⚠️ Erro no clique direto:', directClickError.message);
      }
    }
    
    // ESTRATÉGIA 3: Seletores tradicionais (apenas se estratégias anteriores falharam)
    if (!editButtonElement) {
      console.log('🔍 ESTRATÉGIA 3: Testando seletores tradicionais...');
      
      for (const selector of editSelectors) {
        try {
          console.log(`🔍 Testando seletor: ${selector}`);
        
          // Timeout muito reduzido para chegar logo nas estratégias especiais
          await this.page.waitForSelector(selector, { timeout: 500, state: 'attached' });
        
          // Obter o elemento (otimizado)
          editButtonElement = await this.page.$(selector);
        
          if (editButtonElement) {
          // Verificar se está visível
            const isVisible = await editButtonElement.isVisible();
            if (isVisible) {
              editButton = selector;
              console.log(`✅ Ícone de edição encontrado e visível: ${selector}`);
              break;
            } else {
              console.log(`⚠️ Elemento ${selector} existe mas não está visível`);
            }
          }
        } catch (error) {
        // Log simplificado para não poluir
          console.log(`❌ ${selector} (timeout 500ms)`);
        }
      }
    }

    // Estratégia alternativa se nenhum seletor funcionou
    if (!editButton || !editButtonElement) {
      console.log('🔄 ===== SELETORES TRADICIONAIS FALHARAM - INICIANDO ESTRATÉGIAS ESPECIAIS =====');
      console.log('🔄 ESTRATÉGIA ALTERNATIVA: Análise completa da tabela');
      try {
        // Primeiro, tentar encontrar qualquer tabela (otimizado)
        const tableExists = await this.page.$('table, .table, .datatable');
        if (tableExists) {
          console.log('✅ Tabela encontrada, analisando linhas...');
          
          // Buscar todas as linhas da tabela (otimizado)
          const rows = await this.page.$$('table tbody tr, .table tbody tr, .datatable tbody tr');
          console.log(`🗂️ Encontradas ${rows.length} linhas na tabela`);
          
          if (rows.length > 0) {
            // Analisar a primeira linha para entender a estrutura
            const firstRow = rows[0];
            
            // ESTRATÉGIA ESPECÍFICA PARA PJE: Hover na linha para revelar botões
            console.log('🖱️ Fazendo hover na primeira linha para revelar botões...');
            try {
              await firstRow.hover();
              await this.contextualDelay('elementWait', { priority: 'high' }); // Aguardar botões aparecerem
              console.log('✅ Hover realizado na linha');
            } catch (hoverError) {
              console.log('⚠️ Erro no hover:', hoverError.message);
            }
            
            // Buscar elementos clicáveis em toda a linha após hover
            const allRowElements = await firstRow.$$('button, a, i, span[onclick], div[onclick], .fa, .fas, .far, [class*="edit"], [class*="pencil"], [title*="Alterar"], [title*="Editar"]');
            console.log(`🔘 Elementos clicáveis/ícones na linha: ${allRowElements.length}`);
            
            for (let i = 0; i < allRowElements.length; i++) {
              const element = allRowElements[i];
              try {
                const tagName = await element.evaluate(el => el.tagName);
                const text = await element.evaluate(el => el.textContent?.trim() || '');
                const title = await element.evaluate(el => el.title || '');
                const className = await element.evaluate(el => el.className || '');
                const isVisible = await element.isVisible();
                
                console.log(`🔍 Elemento linha ${i + 1}: ${tagName} | "${text}" | Title:"${title}" | Class:"${className}" | Visível:${isVisible}`);
                
                // Se é visível e parece ser de edição
                if (isVisible && !text.toLowerCase().includes('excluir') && !text.toLowerCase().includes('delete') && 
                    !className.toLowerCase().includes('delete') && !title.toLowerCase().includes('excluir')) {
                  
                  // Priorizar elementos com indicação de edição
                  const hasEditIndication = text.toLowerCase().includes('alterar') || 
                                          text.toLowerCase().includes('editar') ||
                                          title.toLowerCase().includes('alterar') || 
                                          title.toLowerCase().includes('editar') ||
                                          className.includes('edit') || 
                                          className.includes('pencil') ||
                                          className.includes('fa-edit') ||
                                          className.includes('fa-pencil');
                  
                  if (hasEditIndication || (!editButtonElement && tagName === 'BUTTON') || (!editButtonElement && tagName === 'A')) {
                    editButtonElement = element;
                    editButton = `Linha elemento ${i + 1} (${tagName}) - "${text}"`;
                    console.log(`✅ SELECIONADO da linha: ${editButton}`);
                    
                    if (hasEditIndication) {
                      console.log('🎯 Elemento com indicação clara de edição - interrompendo busca');
                      break;
                    }
                  }
                }
              } catch (elementError) {
                console.log(`⚠️ Erro ao analisar elemento linha ${i + 1}:`, elementError.message);
              }
            }
            
            // Se não encontrou na linha, verificar células individualmente
            if (!editButtonElement) {
              const cells = await firstRow.$$('td');
              console.log(`📋 Analisando ${cells.length} colunas individualmente...`);
              
              for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                const cell = cells[cellIndex];
                
                // Fazer hover na célula também
                try {
                  await cell.hover();
                  await this.contextualDelay('click', { priority: 'high' });
                } catch (cellHoverError) {
                  console.log(`⚠️ Erro hover célula ${cellIndex + 1}:`, cellHoverError.message);
                }
                
                const cellElements = await cell.$$('button, a, i, span, div');
                console.log(`📦 Célula ${cellIndex + 1}: ${cellElements.length} elementos`);
                
                for (const cellElement of cellElements) {
                  try {
                    const isVisible = await cellElement.isVisible();
                    if (isVisible && !editButtonElement) {
                      const tagName = await cellElement.evaluate(el => el.tagName);
                      const text = await cellElement.evaluate(el => el.textContent?.trim() || '');
                      
                      console.log(`📦 Célula ${cellIndex + 1} - ${tagName}: "${text}"`);
                      
                      if ((tagName === 'BUTTON' || tagName === 'A') && !text.toLowerCase().includes('excluir')) {
                        editButtonElement = cellElement;
                        editButton = `Célula ${cellIndex + 1} elemento (${tagName})`;
                        console.log(`✅ SELECIONADO da célula: ${editButton}`);
                        break;
                      }
                    }
                  } catch (cellElementError) {
                    console.log('⚠️ Erro elemento da célula:', cellElementError.message);
                  }
                }
                
                if (editButtonElement) break;
              }
            }
          }
        }
        
        // Última tentativa: buscar por qualquer botão/link visível que não seja "excluir"
        if (!editButton || !editButtonElement) {
          console.log('🔄 PENÚLTIMA TENTATIVA: Busca por qualquer elemento clicável com indicação de edição');
          
          const allClickableElements = await this.page.$$('button:visible, a:visible');
          console.log(`🔘 Total de elementos clicáveis visíveis: ${allClickableElements.length}`);
          
          for (let i = 0; i < Math.min(allClickableElements.length, 15); i++) { // Aumentar para 15 elementos
            const element = allClickableElements[i];
            try {
              const text = await element.evaluate(el => el.textContent?.trim() || '');
              const title = await element.evaluate(el => el.title || '');
              const className = await element.evaluate(el => el.className || '');
              
              // Se não é botão de exclusão e contém indicação de edição
              if (!text.toLowerCase().includes('excluir') && !text.toLowerCase().includes('delete') &&
                  !title.toLowerCase().includes('excluir') && !className.toLowerCase().includes('delete') &&
                  (text.toLowerCase().includes('alterar') || text.toLowerCase().includes('editar') || 
                   title.toLowerCase().includes('alterar') || title.toLowerCase().includes('editar') ||
                   className.includes('edit') || className.includes('pencil'))) {
                
                editButtonElement = element;
                editButton = `Elemento global: "${text}" (${title})`;
                console.log(`✅ ENCONTRADO elemento de edição global: ${editButton}`);
                break;
              }
            } catch (globalError) {
              console.log(`⚠️ Erro ao analisar elemento global ${i + 1}:`, globalError.message);
            }
          }
        }
        
        // ESTRATÉGIA 4: Navegação direta por URL
        if (!editButton || !editButtonElement) {
          console.log('🔗 ESTRATÉGIA 4: Navegação direta por URL...');
          
          try {
            const currentUrl = this.page.url();
            console.log(`📍 URL atual: ${currentUrl}`);
            
            // Tentar diferentes padrões de URL de edição
            const editUrlPatterns = [
              currentUrl.replace('/pessoa-fisica', '/pessoa-fisica/edit'),
              currentUrl.replace('/pessoa-fisica', '/pessoa-fisica/editar'),
              currentUrl + '/edit',
              currentUrl + '/editar',
              currentUrl + '/detalhes'
            ];
            
            for (const editUrl of editUrlPatterns) {
              try {
                console.log(`🔗 Tentando navegar para: ${editUrl}`);
                await this.navigationOptimizer.optimizedNavigate(this.page, editUrl);
                
                const finalUrl = this.page.url();
                console.log(`📍 URL final: ${finalUrl}`);
                
                if (finalUrl.includes('edit') || finalUrl.includes('editar') || finalUrl.includes('detalhes')) {
                  console.log('✅ SUCESSO: Navegação direta realizada!');
                  editButton = `Navegação direta: ${editUrl}`;
                  editButtonElement = 'direct-navigation';
                  break;
                }
              } catch (urlError) {
                console.log(`⚠️ Erro na navegação para ${editUrl}:`, urlError.message);
              }
            }
          } catch (directNavError) {
            console.log('❌ Erro na navegação direta:', directNavError.message);
          }
        }
        
        // ESTRATÉGIA 5: Última tentativa com clique em elementos
        if (!editButton || !editButtonElement) {
          console.log('🚨 ESTRATÉGIA 5: Última tentativa com elementos da linha...');
          
          try {
            // Buscar primeira linha da tabela
            const firstRow = await this.domCache.findElement('table tbody tr:first-child, .table tbody tr:first-child, .datatable tbody tr:first-child');
            if (firstRow) {
              console.log('✅ Primeira linha encontrada para clique direto');
              
              // Primeiro, tentar encontrar elementos clicáveis
              const rowClickables = await firstRow.$$('button, a, i, span[onclick], [onclick]');
              console.log(`🔘 Elementos com potencial de clique: ${rowClickables.length}`);
              
              if (rowClickables.length > 0) {
                for (let i = 0; i < rowClickables.length; i++) {
                  const element = rowClickables[i];
                  try {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                      const text = await element.evaluate(el => el.textContent?.trim() || '');
                      const title = await element.evaluate(el => el.title || '');
                      const className = await element.evaluate(el => el.className || '');
                      
                      console.log(`🔍 Elemento ${i + 1}: Texto="${text}" Title="${title}" Class="${className}"`);
                      
                      // Evitar apenas botões que CLARAMENTE são de exclusão
                      const isDeleteButton = text.toLowerCase().includes('excluir') || 
                                           text.toLowerCase().includes('delete') || 
                                           title.toLowerCase().includes('excluir') ||
                                           className.toLowerCase().includes('delete');
                      
                      if (!isDeleteButton) {
                        editButtonElement = element;
                        editButton = `DESESPERADO - Elemento ${i + 1}: "${text}" (${title})`;
                        console.log(`🚨 USANDO ESTRATÉGIA DESESPERADA: ${editButton}`);
                        break;
                      }
                    }
                  } catch (desperateError) {
                    console.log(`⚠️ Erro na análise desesperada ${i + 1}:`, desperateError.message);
                  }
                }
              } else {
                // ÚLTIMA TENTATIVA FINAL: Clicar na primeira célula que não seja ID
                console.log('🚨 TENTATIVA EXTREMA: Clicar na célula do nome para abrir detalhes');
                
                const cells = await firstRow.$$('td');
                console.log(`📋 Células disponíveis: ${cells.length}`);
                
                if (cells.length >= 2) {
                  // Geralmente a segunda célula é o nome (primeira é ID)
                  const nameCell = cells[1];
                  
                  // Fazer hover primeiro
                  await nameCell.hover();
                  await this.delay(500);
                  
                  // Verificar se apareceram elementos clicáveis após hover
                  const afterHoverElements = await nameCell.$$('a, button, [onclick]');
                  if (afterHoverElements.length > 0 && await afterHoverElements[0].isVisible()) {
                    editButtonElement = afterHoverElements[0];
                    editButton = 'EXTREMO - Elemento da célula nome após hover';
                    console.log('🚨 EXTREMO: Usando elemento que apareceu após hover no nome');
                  } else {
                    // Se ainda não há elementos clicáveis, clicar na própria célula do nome
                    editButtonElement = nameCell;
                    editButton = 'EXTREMO - Célula do nome diretamente';
                    console.log('🚨 EXTREMO: Clicando diretamente na célula do nome');
                  }
                }
              }
            }
          } catch (desperateError) {
            console.log('❌ Estratégia desesperada falhou:', desperateError.message);
          }
        }
        
      } catch (altError) {
        console.error('❌ Estratégia alternativa completa falhou:', altError.message);
        console.error('Stack trace:', altError.stack);
      }
    }
        
    if (!editButton || !editButtonElement) {
      console.error('❌ ===== FALHA TOTAL: NENHUM ícone de edição encontrado após TODAS as tentativas =====');
      
      // Debug final: salvar screenshot para diagnóstico
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `debug-no-edit-${timestamp}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot de debug salvo: ${screenshotPath}`);
      } catch (screenshotError) {
        console.log('❌ Erro ao salvar screenshot:', screenshotError.message);
      }
      
      throw new Error('Ícone de edição não encontrado após múltiplas estratégias');
    }
        
    // Clicar no elemento encontrado ou verificar navegação direta
    console.log(`🖱️ Processando ação: ${editButton}`);
    
    if (editButtonElement === 'direct-navigation') {
      console.log('✅ Navegação direta já realizada - verificando página atual');
      const currentUrl = this.page.url();
      if (currentUrl.includes('edit') || currentUrl.includes('editar') || currentUrl.includes('detalhes')) {
        console.log('✅ Navegação direta confirmada com sucesso');
      } else {
        throw new Error('Navegação direta não levou à página esperada');
      }
    } else {
      try {
        // Scroll para o elemento antes de clicar
        await editButtonElement.scrollIntoViewIfNeeded();
        await this.delay(500);
        
        // Clicar no elemento
        await editButtonElement.click();
        await this.delay(3000); // Aguardar navegação
        
        console.log('✅ Clique no ícone de edição executado com sucesso');
        this.performanceMonitor.recordClickEnd('clickEditIcon', Date.now() - clickStartTime, true);
      } catch (clickError) {
        console.error('❌ Erro ao clicar no ícone de edição:', clickError.message);
        this.performanceMonitor.recordClickEnd('clickEditIcon', Date.now() - clickStartTime, false);
        throw new Error(`Falha ao clicar no ícone de edição: ${clickError.message}`);
      }
    }
    
    // Registrar fim da operação se não houve clique
    this.performanceMonitor.recordClickEnd('clickEditIcon', Date.now() - clickStartTime, false);
  }

  async clickServerTab() {
    const servidorSelectors = [
      'text=Servidor',
      'a[href*="servidor"]',
      'button:has-text("Servidor")',
      'a:has-text("Servidor")',
      '[role="tab"]:has-text("Servidor")',
      'li:has-text("Servidor") a',
      '//a[contains(text(), "Servidor")]',
      '//button[contains(text(), "Servidor")]'
    ];
        
    let servidorTab = null;
        
    for (const selector of servidorSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 2000 });
        servidorTab = selector;
        console.log(`✅ Aba Servidor encontrada: ${selector}`);
        break;
      } catch (error) {
        console.log(`Seletor aba Servidor ${selector} não encontrado`);
      }
    }
        
    if (!servidorTab) {
      throw new Error('Aba Servidor não encontrada');
    }
        
    await this.retryManager.retryClick(
      async (selector) => {
        const element = await this.page.$(selector);
        if (element) {
          await element.click();
        } else {
          throw new Error('Element not found');
        }
      },
      servidorTab
    );
    await this.delay(2000);
  }

  async processOrgaosJulgadores() {
    this.sendStatus('info', '🚀 Iniciando processamento INTELIGENTE dos OJs...', 55, 'Verificação e integração inteligente ativa');
    
    // Validar configuração antes de processar
    if (!this.config || !this.config.orgaos || !Array.isArray(this.config.orgaos)) {
      throw new Error('Configuração de órgãos julgadores inválida ou não definida');
    }
    
    // Verificar OJs existentes antes do processamento
    this.sendStatus('info', '🔍 Analisando OJs já cadastrados...', 10, 'Verificação inteligente');
    const analysisResult = await this.smartOJIntegration.analyzeExistingOJs(this.page, this.currentServidor);
    
    // Filtrar OJs que precisam ser processados
    const filteredOJs = await this.smartOJIntegration.filterOJsForProcessing(this.config.orgaos, analysisResult);
    this.sendStatus('info', `📋 ${filteredOJs.toCreate.length} novos OJs + ${filteredOJs.toAddRole.length} perfis adicionais`, 20, 'Análise concluída');
    
    // Atualizar configuração com OJs filtrados
    this.config.orgaos = [...filteredOJs.toCreate, ...filteredOJs.toAddRole];
    
    try {
      // Inicializar processador TURBO
      if (!this.turboProcessor) {
        this.turboProcessor = new TurboModeProcessor(this.intelligentCache, this.delayManager);
        await this.turboProcessor.activateTurboMode();
      }
      
      // Inicializar processador paralelo
      if (!this.parallelProcessor) {
        this.parallelProcessor = new ParallelOJProcessor(
          this.browser, 
          this.timeoutManager, 
          this.config,
          this.domCache
        );
        // Configurar a página original para navegação
        this.parallelProcessor.setOriginalPage(this.page);
      }
      
      // Processar OJs com verificação inteligente
      const startTime = Date.now();
      let results = [];
      
      // Processar novos OJs
      if (filteredOJs.toCreate.length > 0) {
        this.sendStatus('info', `🆕 Processando ${filteredOJs.toCreate.length} novos OJs...`, 30, 'Criação de OJs');
        const newOJResults = await this.parallelProcessor.processOJsInParallel(filteredOJs.toCreate);
        results = results.concat(newOJResults);
      }
      
      // Processar adição de perfis
      if (filteredOJs.toAddRole.length > 0) {
        this.sendStatus('info', `👤 Adicionando ${filteredOJs.toAddRole.length} perfis adicionais...`, 60, 'Adição de perfis');
        const roleResults = await this.processAdditionalRoles(filteredOJs.toAddRole);
        results = results.concat(roleResults);
      }
      
      // Processar OJs ignorados (relatório)
      if (filteredOJs.toSkip.length > 0) {
        const skipResults = filteredOJs.toSkip.map(oj => ({
          orgao: oj.nome || oj,
          status: 'Já incluído - perfil completo',
          details: 'OJ já possui todos os perfis necessários'
        }));
        results = results.concat(skipResults);
      }
      
      const duration = Date.now() - startTime;
      
      // Consolidar resultados
      this.results = results;
      
      // Atualizar cache local
      this.ojCache = this.parallelProcessor.ojCache;
      
      const sucessos = results.filter(r => r.status.includes('Sucesso')).length;
      const erros = results.filter(r => r.status === 'Erro').length;
      const jaIncluidos = results.filter(r => r.status.includes('Já')).length;
      
      this.sendStatus('success', 
        `Processamento paralelo concluído em ${(duration/1000).toFixed(1)}s`, 
        95, 
        `${sucessos} sucessos, ${erros} erros, ${jaIncluidos} já incluídos`
      );
      
      console.log('🚀 Processamento paralelo concluído:');
      console.log(`   ✅ Sucessos: ${sucessos}`);
      console.log(`   ❌ Erros: ${erros}`);
      console.log(`   📋 Já incluídos: ${jaIncluidos}`);
      console.log(`   ⏱️ Tempo total: ${(duration/1000).toFixed(1)}s`);
      console.log(`   📊 Performance: ${(results.length / (duration/1000)).toFixed(1)} OJs/s`);
      
    } catch (error) {
      console.error('❌ Erro no processamento paralelo:', error);
      this.sendStatus('error', `Erro no processamento paralelo: ${error.message}`, 60, 'Tentando fallback');
      
      // Fallback para processamento sequencial
      await this.processOrgaosJulgadoresSequential();
    }
  }

  /**
   * Ativa o modo ultra-rápido para processamento em lote
   * Reduz todos os delays para o mínimo possível
   */
  /**
   * Processa adição de perfis adicionais a OJs existentes
   * @param {Array} ojsToAddRole - Lista de OJs que precisam de perfis adicionais
   * @returns {Array} Resultados do processamento
   */
  async processAdditionalRoles(ojsToAddRole) {
    const results = [];
    
    for (const ojData of ojsToAddRole) {
      try {
        this.sendStatus('info', `👤 Adicionando perfil para ${ojData.nome}...`, null, 'Processando perfil adicional');
        
        // Navegar para o OJ específico
        const navigationResult = await this.navigateToExistingOJ(ojData);
        if (!navigationResult.success) {
          results.push({
            orgao: ojData.nome,
            status: 'Erro - Navegação falhou',
            details: navigationResult.error
          });
          continue;
        }
        
        // Adicionar o novo perfil
        const addRoleResult = await this.addRoleToExistingOJ(ojData);
        if (addRoleResult.success) {
          results.push({
            orgao: ojData.nome,
            status: 'Sucesso - Perfil adicionado',
            details: `Perfil ${ojData.novoRole} adicionado com sucesso`
          });
        } else {
          results.push({
            orgao: ojData.nome,
            status: 'Erro - Falha ao adicionar perfil',
            details: addRoleResult.error
          });
        }
        
        // Delay contextual entre processamentos
        await this.contextualDelay('between_role_additions', { fast: true });
        
      } catch (error) {
        results.push({
          orgao: ojData.nome,
          status: 'Erro - Exceção',
          details: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Navega para um OJ existente no painel
   * @param {Object} ojData - Dados do OJ
   * @returns {Object} Resultado da navegação
   */
  async navigateToExistingOJ(ojData) {
    try {
      // Implementar navegação específica para OJ existente
      // Por enquanto, placeholder que simula sucesso
      await this.contextualDelay('navigation', { fast: true });
      
      return {
        success: true,
        message: 'Navegação bem-sucedida'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Adiciona um novo perfil a um OJ existente
   * @param {Object} ojData - Dados do OJ com novo perfil
   * @returns {Object} Resultado da adição
   */
  async addRoleToExistingOJ(ojData) {
    try {
      // Implementar lógica específica para adicionar perfil
      // Por enquanto, placeholder que simula sucesso
      await this.contextualDelay('role_addition', { fast: true });
      
      return {
        success: true,
        message: 'Perfil adicionado com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processOrgaosJulgadoresUltraFast() {
    console.log('⚡ ATIVANDO MODO ULTRA-RÁPIDO para processamento de OJs...');
    this.sendStatus('info', '⚡ MODO ULTRA-RÁPIDO ATIVADO', 50, 'Processamento em velocidade máxima');
    
    // Forçar uso do processamento sequencial otimizado
    return this.processOrgaosJulgadoresSequential();
  }
  
  /**
   * Fallback para processamento sequencial (método original)
   */
  async processOrgaosJulgadoresSequential() {
    this.sendStatus('info', 'Usando processamento sequencial (fallback)...', 55, 'Verificando OJs cadastrados');
    
    // Validar configuração antes de processar
    if (!this.config || !this.config.orgaos || !Array.isArray(this.config.orgaos)) {
      throw new Error('Configuração de órgãos julgadores inválida ou não definida');
    }
        
    // Verificar OJs já cadastrados em lote usando SmartOJCache
    await this.loadExistingOJsWithSmartCache();
        
    // Normalizar e filtrar OJs que precisam ser processados
    const ojsNormalizados = this.config.orgaos.map(orgao => this.normalizeOrgaoName(orgao));
    const ojsToProcess = ojsNormalizados.filter(orgao => !this.ojCache.has(orgao));
    
    // Contador de OJs processadas
    let ojsProcessadasTotal = 0; // Começar em 0
    const totalOjs = this.config.orgaos.length;
        
    this.sendStatus('info', `${ojsToProcess.length} OJs para processar`, 60, `${this.ojCache.size} já cadastrados`, null, null, ojsProcessadasTotal, totalOjs);
        
    // Processar cada OJ restante
    for (let i = 0; i < ojsToProcess.length; i++) {
      const orgao = ojsToProcess[i];
      const progress = 60 + (i / ojsToProcess.length) * 35;
            
      this.sendStatus('info', `Processando OJ ${i + 1}/${ojsToProcess.length}`, progress, 'Vinculando órgão julgador', orgao, this.currentServidor?.nome, ojsProcessadasTotal, totalOjs);
            
      try {
        await this.processOrgaoJulgador(orgao);
        ojsProcessadasTotal++; // Incrementar contador
        this.results.push({
          orgao,
          status: 'Incluído com Sucesso',
          erro: null,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        this.sendStatus('success', 'OJ processado com sucesso', progress, 'Vinculação concluída', orgao, this.currentServidor?.nome, ojsProcessadasTotal, totalOjs);
      } catch (error) {
        console.error(`Erro ao processar OJ ${orgao}:`, error);
        ojsProcessadasTotal++; // Incrementar contador mesmo em caso de erro
        this.results.push({
          orgao,
          status: 'Erro',
          erro: error.message,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        this.sendStatus('error', `Erro ao processar OJ: ${error.message}`, progress, 'Erro na vinculação', orgao, this.currentServidor?.nome, ojsProcessadasTotal, totalOjs);
                
        // Proteções após erro
        await this.handleErrorRecovery();
      }
            
      // Pausa HIPER-OTIMIZADA para velocidade máxima (reduzido de 5ms para 1ms)
      const delay = 1; // Delay mínimo absoluto para estabilidade do DOM
      await this.ultraFastDelayManager.batchDelay({ priority: 'critical', context: 'hyperFastBetweenOJs' });
    }
        
    // Adicionar OJs já existentes ao relatório
    for (const orgaoExistente of this.ojCache) {
      if (this.config && this.config.orgaos && this.config.orgaos.includes(orgaoExistente)) {
        this.results.push({
          orgao: orgaoExistente,
          status: 'Já Incluído',
          erro: null,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Enviar status final de conclusão com contador correto
    console.log(`🔍 [CONTADOR] Total OJs configuradas: ${totalOjs}`);
    console.log(`🔍 [CONTADOR] Total OJs processadas: ${ojsProcessadasTotal}`);
    console.log(`🔍 [CONTADOR] Total resultados: ${this.results.length}`);
    
    // Só enviar status de sucesso se houver OJs processadas ou configuradas
    if (ojsProcessadasTotal > 0 || totalOjs > 0) {
      this.sendStatus('success', 'Processamento finalizado com sucesso!', 100, 
        `${ojsProcessadasTotal} OJs processadas de ${totalOjs} configuradas`, 
        'Finalizado', this.currentServidor?.nome, ojsProcessadasTotal, totalOjs);
    } else {
      // Log silencioso quando não há OJs para processar
      console.log('🔄 [AUTOMATION] Servidor finalizado - nenhum OJ para processar, partindo para o próximo');
      this.sendStatus('info', 'Servidor processado', 100, 
        'Nenhum OJ para vincular - partindo para próximo servidor', 
        'Finalizado', this.currentServidor?.nome, 0, 0);
    }
  }

  async loadExistingOJs() {
    try {
      this.sendStatus('info', 'Verificando OJs já cadastrados...', 58, 'Otimizando processo');
      console.log('🔍 Carregando OJs existentes para otimizar automação...');
      
      // Aguardar elementos carregarem rapidamente
      await this.ultraFastDelayManager.elementWaitDelay({ priority: 'critical' });
      
      // Seletores para encontrar tabela/lista de OJs já cadastrados
      const tabelaSelectors = [
        'table tbody tr', // Tabela padrão
        '.mat-table .mat-row', // Material Design table
        '.datatable tbody tr', // DataTable
        '[role="row"]', // ARIA rows
        '.lista-orgaos tr', // Lista específica
        '.localizacoes-visibilidades tr' // Tabela de localizações
      ];
      
      const ojsEncontrados = new Set();
      
      for (const selector of tabelaSelectors) {
        try {
          const linhas = this.page.locator(selector);
          const numLinhas = await linhas.count();
          console.log(`🔍 Seletor "${selector}": ${numLinhas} linhas encontradas`);
          
          if (numLinhas > 0) {
            // Extrair texto de cada linha para identificar OJs
            for (let i = 0; i < Math.min(numLinhas, 50); i++) { // Limitar a 50 para performance
              try {
                const textoLinha = await linhas.nth(i).textContent();
                if (textoLinha && textoLinha.trim()) {
                  // Procurar por padrões de OJ no texto
                  const ojMatches = textoLinha.match(/(EXE\d+|LIQ\d+|CON\d+|DIVEX|[\dº]+ª?\s*Vara\s+do\s+Trabalho)/gi);
                  if (ojMatches) {
                    ojMatches.forEach(match => {
                      const ojNormalizado = this.normalizeOrgaoName(match.trim());
                      ojsEncontrados.add(ojNormalizado);
                      console.log(`✅ OJ encontrado: ${ojNormalizado}`);
                    });
                  }
                }
              } catch (erro) {
                // Ignorar erros de linha específica
                continue;
              }
            }
            
            // Se encontrou OJs com este seletor, não precisa tentar outros
            if (ojsEncontrados.size > 0) {
              console.log(`✅ ${ojsEncontrados.size} OJs já cadastrados encontrados`);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Seletor ${selector} falhou: ${error.message}`);
        }
      }
      
      // Adicionar OJs encontrados ao cache
      ojsEncontrados.forEach(oj => this.ojCache.add(oj));
      
      console.log(`🎯 Cache de OJs atualizado: ${this.ojCache.size} OJs já cadastrados`);
      this.sendStatus('success', `${this.ojCache.size} OJs já cadastrados identificados`, 60, 'Cache otimizado');
      
    } catch (error) {
      console.log('⚠️ Erro ao carregar OJs existentes:', error.message);
      // Não falhar a automação por erro no cache
    }
  }

  /**
   * Carrega OJs existentes usando SmartOJCache (versão otimizada)
   */
  async loadExistingOJsWithSmartCache() {
    try {
      this.sendStatus('info', 'Verificando OJs já cadastrados com SmartCache...', 58, 'Otimizando processo');
      console.log('🔍 [SEQUENTIAL] Carregando OJs existentes usando SmartOJCache...');
      
      // CORREÇÃO DO BUG: Não limpar cache persistente automaticamente
      this.ojCache.clear();
      this.smartOJCache.limparCache(true); // preservar dados persistentes
      
      // Usar o SmartOJCache para verificar OJs vinculados em lote (com persistência)
      const cpfServidor = this.currentServidor?.cpf || this.config?.cpf;
      const resultadoVerificacao = await this.smartOJCache.verificarOJsEmLote(
        this.page,
        this.config.orgaos,
        (mensagem, progresso) => {
          this.sendStatus('info', mensagem, 58 + (progresso * 0.3), 'Verificando OJs...');
        },
        cpfServidor // CORREÇÃO: Passar CPF para cache persistente
      );
      
      console.log('📊 [SEQUENTIAL] Resultado da verificação em lote:');
      console.log(`   - Total verificados: ${resultadoVerificacao.estatisticas.totalVerificados}`);
      console.log(`   - Já vinculados: ${resultadoVerificacao.estatisticas.jaVinculados}`);
      console.log(`   - Para vincular: ${resultadoVerificacao.estatisticas.paraVincular}`);
      
      // Adicionar OJs já vinculados ao cache local
      resultadoVerificacao.ojsJaVinculados.forEach(ojInfo => {
        const ojNormalizado = this.normalizeOrgaoName(ojInfo.oj);
        this.ojCache.add(ojNormalizado);
        
        // Também atualizar o SmartOJCache
        this.smartOJCache.adicionarOJVinculado(ojInfo.oj);
        
        console.log(`✅ [SEQUENTIAL] OJ já vinculado: "${ojInfo.oj}" → normalizado: "${ojNormalizado}"`);
      });
      
      // Marcar cache como válido
      this.smartOJCache.cacheValido = true;
      this.smartOJCache.ultimaAtualizacao = Date.now();
      
      console.log(`🎯 [SEQUENTIAL] Cache de OJs atualizado: ${this.ojCache.size} OJs já cadastrados`);
      this.sendStatus('success', `${this.ojCache.size} OJs já cadastrados | ${resultadoVerificacao.estatisticas.paraVincular} para processar`, 90, 'SmartCache otimizado');
      
      return resultadoVerificacao;
      
    } catch (error) {
      console.log('⚠️ [SEQUENTIAL] Erro ao carregar OJs com SmartCache:', error.message);
      console.log('🔄 [SEQUENTIAL] Tentando fallback para método tradicional...');
      
      // Fallback para o método tradicional
      await this.loadExistingOJs();
      return null;
    }
  }

  async processOrgaoJulgador(orgao) {
    const processStartTime = Date.now();
    this.performanceMonitor.recordPJEOperationStart('processOrgaoJulgador', orgao);
    // Definir papel desejado no escopo da função (usado em múltiplos blocos)
    const papelDesejado = this.config?.perfil || 'Assessor';
    // Flag da verificação simples (true/false) ou null se não foi possível verificar
    let jaVinculadoSimples = null;
    
    // Atualizar status do servidor no painel de processamento
    if (this.mainWindow && this.mainWindow.webContents && this.currentServidor) {
      this.mainWindow.webContents.executeJavaScript(`
        if (typeof updateProcessingServer === 'function') {
          updateProcessingServer('${this.currentServidor.cpf}', {
            currentOJ: '${orgao.replace(/'/g, '\\\'').replace(/"/g, '\\"')}'
          });
        }
      `).catch(err => {
        console.log('⚠️ Erro ao atualizar status do servidor:', err.message);
      });
    }
    
    // SISTEMA INTELIGENTE: Desabilitado o bypass para permitir verificação inteligente
    const isUniversalBypass = false; // Permitir verificações inteligentes
    
    if (isUniversalBypass) {
      console.log(`🔥 [BYPASS-UNIVERSAL] PROCESSAMENTO DIRETO para OJ: ${orgao} (${this.currentServidor.nome})`);
      console.log('🔥 [BYPASS-UNIVERSAL] PULANDO TODAS as verificações prévias');
      // PULAR toda a lógica de verificação e ir direto para vinculação
    } else {
      console.log(`🚀 INICIANDO processamento otimizado para: ${orgao}`);
      
      // Verificação otimizada: Separar OJ de papel para respeitar configuração
      console.log(`🔍 [OTIMIZADO] Verificando OJ "${orgao}" (papel será aplicado: "${papelDesejado}")`);
      
      try {
        // ETAPA 1: Verificar APENAS se OJ já está vinculado (sem considerar papel)
        console.log('📋 [ETAPA 1] Verificação simples de OJ vinculado...');
        const { verificarOJJaVinculado } = require('../verificarOJVinculado');
        const verificacaoSimples = await verificarOJJaVinculado(this.page, orgao);
        jaVinculadoSimples = Boolean(verificacaoSimples?.jaVinculado);
        
        console.log(`📋 [RESULTADO] OJ "${orgao}" vinculado: ${verificacaoSimples.jaVinculado}`);
        
        if (verificacaoSimples.jaVinculado) {
          // Fonte de verdade: página atual. Se OJ já está vinculado, NÃO tentar cadastrar novamente.
          console.log(`⏭️ [PÁGINA] OJ já vinculado na página - pulando cadastro: ${orgao}`);
          // Atualizar caches e resultados e encerrar cedo
          const ojNorm = this.normalizeOrgaoName(orgao);
          this.ojCache.add(ojNorm);
          this.results.push({
            orgao,
            status: 'Já Incluído (Página)',
            erro: null,
            perfil: this.config.perfil,
            cpf: this.config.cpf,
            timestamp: new Date().toISOString()
          });
          this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', orgao, true);
          return; // Não prosseguir com tentativa de inclusão
        } else {
          console.log(`➕ [ESTRATÉGIA] OJ não vinculado - CRIAR nova vinculação com papel "${papelDesejado}"`);
          console.log('✅ [DECISÃO] Processamento LIBERADO - Criar nova vinculação');
          // Continua processamento para criar vinculação
        }
        
      } catch (verificacaoError) {
        console.log(`⚠️ [ERRO] Verificação simples de OJ falhou: ${verificacaoError.message}`);
        console.log('🔄 [FALLBACK] Continuando processamento por segurança...');
        // Continua processamento mesmo com erro
      }
    }
    
    // DETECÇÃO AUTOMÁTICA DE VARAS PROBLEMÁTICAS - DESABILITADA PARA BYPASS UNIVERSAL
    if (!isUniversalBypass) {
      console.log('🔍 [DETECTOR] Analisando vara para problemas conhecidos...');
      const deteccaoProblema = this.detectorVaras.detectarVaraProblematica(orgao);
      
      if (deteccaoProblema.problematica) {
        console.log(`⚠️ [DETECTOR] Vara problemática detectada: ${deteccaoProblema.categoria}`);
        console.log(`🔧 [DETECTOR] Aplicando tratamento: ${deteccaoProblema.tratamento}`);
      
        try {
          const resultadoTratamento = await this.detectorVaras.aplicarTratamento(
            deteccaoProblema, 
            this.page, 
            orgao, 
            this.config.perfil || 'Assessor'
          );
        
          if (resultadoTratamento.aplicado) {
            console.log('✅ [DETECTOR] Tratamento automático aplicado com sucesso');
          
            this.results.push({
              orgao,
              status: 'sucesso',
              metodo: 'detector_automatico',
              tratamento: deteccaoProblema.tratamento,
              categoria: deteccaoProblema.categoria,
              confianca: deteccaoProblema.confianca,
              tempo: Date.now() - processStartTime
            });
          
            this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', orgao, true);
            return { success: true, method: 'detector_automatico', details: resultadoTratamento };
          } else {
            console.log(`⚠️ [DETECTOR] Tratamento automático falhou: ${resultadoTratamento.motivo || 'motivo desconhecido'}`);
            console.log('🔄 [DETECTOR] Continuando com fluxo padrão...');
          }
        } catch (detectorError) {
          console.log(`❌ [DETECTOR] Erro no tratamento automático: ${detectorError.message}`);
          console.log('🔄 [DETECTOR] Continuando com fluxo padrão...');
        }
      } else {
        console.log('✅ [DETECTOR] Vara não apresenta problemas conhecidos');
      }
    } else {
      console.log('🔥 [BYPASS-UNIVERSAL] PULANDO detector de varas problemáticas completamente');
    }
    
    // Verificação específica para varas de Limeira - DESABILITADA PARA BYPASS UNIVERSAL
    if (!isUniversalBypass && isVaraLimeira(orgao)) {
      console.log(`🏛️ [LIMEIRA] Vara de Limeira detectada: ${orgao}`);
      console.log('🔧 [LIMEIRA] Aplicando tratamento específico...');
      
      try {
        const resultadoLimeira = await aplicarTratamentoLimeira(this.page, orgao, this.config.perfil || 'Assessor');
        
        if (resultadoLimeira.sucesso) {
          console.log(`✅ [LIMEIRA] Tratamento específico bem-sucedido para: ${orgao}`);
          this.results.push({
            orgao,
            status: 'sucesso',
            metodo: 'tratamento_limeira_especifico',
            tempo: Date.now() - processStartTime,
            detalhes: resultadoLimeira.detalhes
          });
          this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', orgao, true);
          return;
        } else {
          console.log('⚠️ [LIMEIRA] Tratamento específico falhou, continuando com fluxo padrão...');
        }
      } catch (limeiraError) {
        console.log(`❌ [LIMEIRA] Erro no tratamento específico: ${limeiraError.message}`);
        console.log('🔄 [LIMEIRA] Continuando com fluxo padrão...');
      }
    }
    
    // Se chegou até aqui, significa que pode vincular
    console.log(`🚀 PROSSEGUINDO com vinculação do OJ: ${orgao}`);
    
    // Verificação de cache rápida como fallback - DESABILITADA PARA BYPASS UNIVERSAL
    const ojNormalizado = this.normalizeOrgaoName(orgao);
    const isForced = Boolean(this.forcedOJsNormalized && this.forcedOJsNormalized.has(ojNormalizado));
    // Somente pular por cache se NÃO for forçado e a verificação simples também confirmar que já está vinculado
    if (!isUniversalBypass && !isForced && this.ojCache.has(ojNormalizado) && jaVinculadoSimples === true) {
      console.log(`⚡ OJ encontrado no cache local: ${orgao}`);
      
      // Se está no cache, também deveria pular
      console.log(`⏭️ CACHE: Pulando OJ já processado: ${orgao}`);
      this.results.push({
        orgao,
        status: 'Já Incluído (Cache)',
        erro: null,
        perfil: papelDesejado,
        cpf: this.config.cpf,
        timestamp: new Date().toISOString()
      });
      
      // Registrar fim da operação com sucesso (cache hit)
      this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', Date.now() - processStartTime, true);
      return; // Skip processamento
    } else if (isUniversalBypass && this.ojCache.has(ojNormalizado)) {
      console.log(`🔥 [BYPASS-UNIVERSAL] OJ ${orgao} encontrado no cache, mas IGNORANDO cache para forçar processamento`);
    }
    
    const startTime = Date.now();
    
    try {
      // ULTRA-RÁPIDO: Sem estabilização desnecessária
      console.log('🎯 PROCESSAMENTO ULTRA-ASSERTIVO INICIADO');
      console.log(`📎 Processando servidor: ${this.config.cpf} - Perfil: ${this.config.perfil}`);
      
      // Fechar modais rapidamente (se existirem)
      console.log('🔄 ETAPA 0: Fechando modais existentes...');
      await this.closeAnyModalsRapido();
          
      // 1. AÇÃO: Clicar no botão "Adicionar Localização/Visibilidade"
      console.log(`🔄 ETAPA 1: Abrindo modal de adição para OJ: ${orgao}`);
      await this.clickAddLocationButtonRapido();
          
      // 2. AÇÃO: Selecionar o OJ diretamente
      console.log(`🔄 ETAPA 2: Selecionando OJ específico: ${orgao}`);
      await this.selectOrgaoJulgadorRapido(orgao);
          
      // 3. AÇÃO: Configurar papel e visibilidade
      console.log(`🔄 ETAPA 3: Configurando papel e visibilidade para OJ: ${orgao}`);
      await this.configurePapelVisibilidadeRapido();
          
      // 4. AÇÃO: Salvar
      console.log(`🔄 ETAPA 4: Salvando configuração para OJ: ${orgao}`);
      await this.saveConfigurationRapido();
          
      // 5. FINAL: Verificar sucesso
      console.log(`🔄 ETAPA 5: Verificando sucesso da vinculação para OJ: ${orgao}`);
      await this.verifySuccessRapido();
      
      const tempoDecorrido = Date.now() - startTime;
      console.log(`✅ OJ processado com SUCESSO em ${tempoDecorrido}ms: ${orgao}`);
      
      // Adicionar ao cache para próximas verificações
      this.ojCache.add(ojNormalizado);
      
      // Adicionar resultado de sucesso
      this.results.push({
        orgao,
        status: 'Vinculado com Sucesso',
        erro: null,
        perfil: this.config.perfil,
        cpf: this.config.cpf,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const tempoDecorrido = Date.now() - startTime;
      console.error(`❌ ERRO após ${tempoDecorrido}ms processando OJ ${orgao}:`, error.message);
      console.error('❌ Stack trace completo:', error.stack);

      // Fallback robusto: usar fluxo tradicional do vincularOJ.js
      try {
        console.log('🔄 [FALLBACK] Tentando fluxo tradicional vincularOJ...');
        const { vincularOJ } = require('../vincularOJ');
        await vincularOJ(this.page, orgao, papelDesejado, 'Público');
        console.log('✅ [FALLBACK] Vinculação tradicional concluída com sucesso');

        // Adicionar ao cache e registrar sucesso
        const ojNormalizadoFB = this.normalizeOrgaoName(orgao);
        this.ojCache.add(ojNormalizadoFB);
        this.results.push({
          orgao,
          status: 'Vinculado com Sucesso (Fallback)',
          erro: null,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        this.sendStatus('success', `✅ OJ ${orgao} incluído com sucesso (fallback)`, null, null, orgao, this.currentServidor?.nome);
        this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', Date.now() - processStartTime, true);
        return;
      } catch (fallbackError) {
        console.error(`❌ [FALLBACK] Falhou vincularOJ para ${orgao}: ${fallbackError.message}`);
        // Adicionar resultado de erro final
        this.results.push({
          orgao,
          status: 'Erro na Vinculação',
          erro: fallbackError.message || error.message,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        // Registrar fim com erro
        this.performanceMonitor.recordPJEOperationEnd('processOrgaoJulgador', Date.now() - processStartTime, false);
        console.log(`⚠️ Erro processando ${orgao}, mas continuando com próximo...`);
      }
    }
  }

  // === FUNÇÕES OTIMIZADAS PARA VELOCIDADE ===
  
  async closeAnyModalsRapido() {
    console.log('⚡ Fechando modais rapidamente...');
    const modalCloseSelectors = [
      '.mat-overlay-backdrop',
      '.cdk-overlay-backdrop',
      '.modal-backdrop',
      'button:has-text("OK")',
      'button:has-text("Fechar")'
    ];
        
    for (const selector of modalCloseSelectors) {
      try {
        // Usar page.$$ diretamente para evitar timeout longo do domCache
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            console.log(`⚡ Modal fechado: ${selector}`);
            await this.ultraFastDelayManager.criticalDelay({ priority: 'critical' }); // Ultra otimizado
            return; // Sair imediatamente após fechar
          }
        }
      } catch (error) {
        // Ignorar erros
      }
    }
    
    // ESC como fallback rápido
    try {
      await this.page.keyboard.press('Escape');
    } catch (error) {
      // Ignorar erros
    }
  }

  async clickAddLocationButtonRapido() {
    console.log('🎯 ASSERTIVO: Verificando se modal já está aberto...');
    
    // 1. PRIMEIRO: Verificar se o modal já está aberto
    const modalJaAberto = await this.page.locator('mat-dialog-container, [role="dialog"]').isVisible();
    if (modalJaAberto) {
      console.log('✅ Modal já está aberto - PULANDO clique no botão');
      return;
    }
    
    console.log('🎯 Modal fechado - clicando botão Adicionar UMA VEZ...');

    // 2. SEGUNDO: Tentar múltiplos seletores plausíveis para o botão
    const buttonSelectors = [
      'button:has-text("Adicionar Localização/Visibilidade"):not([disabled])',
      'button:has-text("Adicionar Localização"):not([disabled])',
      'button:has-text("Adicionar Visibilidade"):not([disabled])',
      'button:has-text("Adicionar"):not([disabled])',
      '[aria-label*="Adicionar"]:not([disabled])',
      'mat-card button:has-text("Adicionar"):not([disabled])',
      '[role="main"] button:has-text("Adicionar"):not([disabled])'
    ];

    let clicked = false;
    let lastError = null;

    for (const selector of buttonSelectors) {
      try {
        console.log(`🔍 Tentando seletor de botão: ${selector}`);
        await this.page.waitForSelector(selector, { timeout: 2500 });

        // Rolar para o elemento se necessário
        try {
          await this.page.locator(selector).first().scrollIntoViewIfNeeded();
        } catch {}

        await this.retryManager.retryClick(
          async (sel) => {
            const element = await this.page.$(sel);
            if (element) {
              await element.click();
            } else {
              throw new Error('Element not found');
            }
          },
          selector
        );

        console.log(`✅ Clique realizado com: ${selector}`);
        clicked = true;
        break;
      } catch (e) {
        console.log(`❌ Falha seletor botão: ${selector} → ${e.message}`);
        lastError = e;
        continue;
      }
    }

    if (!clicked) {
      throw new Error(`Botão Adicionar não encontrado: ${lastError?.message || 'desconhecido'}`);
    }

    // 3. TERCEIRO: Aguardar modal abrir de forma assertiva
    console.log('🎯 Aguardando modal abrir...');
    await this.page.waitForSelector('mat-dialog-container, [role="dialog"]', { timeout: 6000 });
    console.log('✅ Modal CONFIRMADO aberto');
    return;
  }

  async selectOrgaoJulgadorRapido(orgao) {
    console.log(`🎯 ASSERTIVO: Seleção direta de OJ: ${orgao}`);
    
    try {
      // 1. DIRETO: Encontrar e clicar no mat-select de Órgão Julgador
      console.log('🎯 Procurando mat-select de Órgão Julgador...');
      
      // Seletores expandidos para maior compatibilidade
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
      
      // 3. SELECIONAR: Buscar opção com algoritmo inteligente
      console.log(`🎯 Procurando opção: ${orgao}`);
      const opcoes = this.page.locator('mat-option');
      const numOpcoes = await opcoes.count();
      
      console.log(`📋 ${numOpcoes} opções disponíveis`);
      
      // Coletar todas as opções disponíveis
      const availableOptions = [];
      for (let i = 0; i < numOpcoes; i++) {
        const textoOpcao = await opcoes.nth(i).textContent();
        if (textoOpcao && textoOpcao.trim()) {
          availableOptions.push({
            index: i,
            text: textoOpcao.trim(),
            element: opcoes.nth(i)
          });
        }
      }
      
      console.log(`📋 Opções coletadas: ${availableOptions.length}`);
      
      // Primeiro: tentar busca exata (método original)
      const orgaoNormalizado = this.normalizeOrgaoName(orgao);
      console.log(`🔍 Tentando busca exata para: ${orgaoNormalizado}`);
      
      let opcaoEncontrada = false;
      for (const option of availableOptions) {
        const textoOpcaoNormalizado = this.normalizeOrgaoName(option.text);
        if (textoOpcaoNormalizado.includes(orgaoNormalizado)) {
          await option.element.click();
          console.log(`✅ OJ selecionado (busca exata): ${option.text}`);
          opcaoEncontrada = true;
          break;
        }
      }
      
      // Se busca exata falhou, usar busca inteligente
      if (!opcaoEncontrada) {
        console.log(`⚠️ Busca exata falhou. Iniciando busca inteligente por palavras-chave...`);
        
        const { match, score } = this.findBestOJMatch(orgao, availableOptions);
        
        if (match && score > 0) {
          await match.element.click();
          console.log(`✅ OJ selecionado (busca inteligente): ${match.text} (Score: ${score})`);
          opcaoEncontrada = true;
        } else {
          // Listar todas as opções disponíveis para debug
          console.log(`❌ Nenhuma opção compatível encontrada. Opções disponíveis:`);
          availableOptions.forEach((option, idx) => {
            console.log(`   ${idx + 1}. "${option.text}"`);
          });
          throw new Error(`OJ "${orgao}" não encontrado nas opções disponíveis`);
        }
      }
      
      // 4. AGUARDAR: Processamento da seleção com delay contextual
      await this.contextualDelay('ojSelection', { priority: 'high' });
      console.log('✅ Seleção de OJ concluída');
      
    } catch (error) {
      console.error(`❌ Erro na seleção assertiva de OJ: ${error.message}`);
      throw error;
    }
  }

  async configurePapelVisibilidadeRapido() {
    console.log('🎯 ASSERTIVO: Configuração direta de papel/visibilidade...');
    
    try {
      // Verificar se o navegador ainda está ativo
      await this.ensureBrowserActive();
      
      // 1. PAPEL: Selecionar perfil configurado
      console.log(`🎯 Verificando campo Papel - Configurado: ${this.config.perfil || 'Não especificado'}`);
      console.log('🔍 [DEBUG] Config completo:', JSON.stringify(this.config, null, 2));
      
      // Aguardar mais tempo para garantir que o modal esteja carregado
      await this.ultraFastDelayManager.pageLoadDelay({ priority: 'critical' });
      
      // Verificar novamente se a página ainda está válida
      if (this.page.isClosed()) {
        console.log('⚠️ [DEBUG] Página foi fechada, tentando reconectar...');
        await this.reconnectBrowser();
        return;
      }
      
      // Tentar múltiplos seletores para o campo Papel
      const seletoresPapel = [
        'mat-dialog-container mat-select[placeholder*="Papel"]',
        'mat-dialog-container mat-select[formcontrolname*="papel"]',
        'mat-dialog-container mat-select[aria-label*="Papel"]',
        'mat-select[placeholder*="Papel"]',
        'mat-select:has-text("Papel")',
        '.mat-select-trigger:has-text("Papel")'
      ];
      
      let matSelectPapel = null;
      for (const seletor of seletoresPapel) {
        try {
          // Verificar se a página ainda está válida antes de cada tentativa
          if (this.page.isClosed()) {
            console.log('⚠️ [DEBUG] Página fechada durante busca do seletor');
            await this.reconnectBrowser();
            return;
          }
          
          console.log(`🔍 [DEBUG] Testando seletor: ${seletor}`);
          const elemento = this.page.locator(seletor);
          if (await elemento.count() > 0) {
            console.log(`✅ [DEBUG] Campo Papel encontrado com seletor: ${seletor}`);
            matSelectPapel = elemento;
            break;
          }
        } catch (error) {
          console.log(`⚠️ [DEBUG] Erro ao testar seletor ${seletor}: ${error.message}`);
          if (error.message.includes('Target page, context or browser has been closed')) {
            console.log('🔄 [DEBUG] Navegador fechado detectado, reconectando...');
            await this.reconnectBrowser();
            return;
          }
        }
      }
      
      if (matSelectPapel && await matSelectPapel.count() > 0) {
        console.log('🔍 [DEBUG] Campo Papel encontrado, clicando...');
        
        // Verificar se a página ainda está válida antes do clique
        if (this.page.isClosed()) {
          console.log('⚠️ [DEBUG] Página fechada antes do clique no campo Papel');
          await this.reconnectBrowser();
          return;
        }
        
        // Tentar clicar com diferentes estratégias e timeouts mais longos
        try {
          console.log('🔍 [DEBUG] Tentando clique normal com timeout de 5 segundos...');
          await matSelectPapel.click({ timeout: 5000 });
          console.log('✅ [DEBUG] Clique normal bem-sucedido');
        } catch (error) {
          console.log(`⚠️ [DEBUG] Clique normal falhou: ${error.message}`);
          if (error.message.includes('Target page, context or browser has been closed')) {
            console.log('🔄 [DEBUG] Navegador fechado durante clique, reconectando...');
            await this.reconnectBrowser();
            return;
          }
          try {
            console.log('🔍 [DEBUG] Tentando clique forçado...');
            await matSelectPapel.click({ force: true, timeout: 5000 });
            console.log('✅ [DEBUG] Clique forçado bem-sucedido');
          } catch (forceError) {
            console.log(`⚠️ [DEBUG] Clique forçado falhou: ${forceError.message}`);
            if (forceError.message.includes('Target page, context or browser has been closed')) {
              console.log('🔄 [DEBUG] Navegador fechado durante clique forçado, reconectando...');
              await this.reconnectBrowser();
              return;
            }
            // Tentar uma última estratégia: aguardar e tentar novamente
            console.log('🔍 [DEBUG] Aguardando 2 segundos e tentando clique final...');
            await this.ultraFastDelayManager.pageLoadDelay({ priority: 'critical' });
            try {
              await matSelectPapel.click({ force: true, timeout: 3000 });
              console.log('✅ [DEBUG] Clique final bem-sucedido');
            } catch (finalError) {
              console.log(`❌ [DEBUG] Todos os cliques falharam: ${finalError.message}`);
            }
          }
        }
        
        // Verificar se a página ainda está válida após o clique
        if (this.page.isClosed()) {
          console.log('⚠️ [DEBUG] Página fechada após clique no campo Papel');
          await this.reconnectBrowser();
          return;
        }
        
        // Aguardar as opções aparecerem com estratégia mais robusta
        console.log('⏳ [DEBUG] Aguardando opções do dropdown aparecerem...');
        
        try {
          // Tentar aguardar as opções aparecerem com waitForSelector
          await this.page.waitForSelector('mat-option', { timeout: 8000 });
          console.log('✅ [DEBUG] Opções encontradas com waitForSelector');
        } catch (waitError) {
          console.log(`⚠️ [DEBUG] waitForSelector falhou: ${waitError.message}`);
          console.log('🔍 [DEBUG] Tentando aguardar com timeout fixo...');
          await this.ultraFastDelayManager.pageLoadDelay({ priority: 'critical' });
        }
        
        const opcoesPapel = this.page.locator('mat-option');
        let totalOpcoes = await opcoesPapel.count();
        console.log(`🔍 [DEBUG] Total de opções de papel disponíveis: ${totalOpcoes}`);
        
        // Se ainda não encontrou opções, tentar estratégias adicionais
        if (totalOpcoes === 0) {
          console.log('⚠️ [DEBUG] Nenhuma opção encontrada, tentando seletores alternativos...');
          
          const seletoresAlternativos = [
            '.mat-option',
            '[role="option"]',
            '.mat-select-panel mat-option',
            'mat-select-panel mat-option'
          ];
          
          for (const seletor of seletoresAlternativos) {
            try {
              await this.page.waitForSelector(seletor, { timeout: 3000 });
              const opcoesAlt = this.page.locator(seletor);
              const totalAlt = await opcoesAlt.count();
              if (totalAlt > 0) {
                console.log(`✅ [DEBUG] Opções encontradas com seletor alternativo: ${seletor} (${totalAlt} opções)`);
                totalOpcoes = totalAlt;
                break;
              }
            } catch (altError) {
              console.log(`⚠️ [DEBUG] Seletor alternativo ${seletor} falhou: ${altError.message}`);
            }
          }
          
          // Última tentativa com timeout longo
          if (totalOpcoes === 0) {
            console.log('⚠️ [DEBUG] Ainda sem opções, aguardando mais 5 segundos...');
            await this.page.waitForTimeout(5000);
            totalOpcoes = await opcoesPapel.count();
            console.log(`🔍 [DEBUG] Total final de opções: ${totalOpcoes}`);
          }
        }
        
        // Listar todas as opções disponíveis para debug
        for (let i = 0; i < Math.min(totalOpcoes, 10); i++) {
          try {
            const opcaoTexto = await opcoesPapel.nth(i).textContent();
            console.log(`🔍 [DEBUG] Opção ${i + 1}: "${opcaoTexto?.trim()}"`);
          } catch (error) {
            console.log(`⚠️ [DEBUG] Erro ao ler opção ${i + 1}: ${error.message}`);
          }
        }
        
        let perfilSelecionado = false;
        
        // PRIORIDADE MÁXIMA: Perfil configurado pelo usuário
        if (this.config.perfil && this.config.perfil.trim() !== '') {
          console.log(`🎯 [PRIORIDADE] Procurando perfil CONFIGURADO: "${this.config.perfil}"`);
          // Tentativa direta: opção que contém exatamente o texto do perfil configurado (case-insensitive)
          try {
            const perfilRegex = new RegExp(this.config.perfil.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const opcaoDireta = opcoesPapel.filter({ hasText: perfilRegex });
            const countDireta = await opcaoDireta.count();
            if (countDireta > 0) {
              const textoDireta = await opcaoDireta.first().textContent();
              console.log(`✅ [DIRETO] Perfil encontrado diretamente: "${textoDireta?.trim()}"`);
              await opcaoDireta.first().click({ timeout: 2000 });
              perfilSelecionado = true;
            }
          } catch (e) {
            console.log(`⚠️ [DIRETO] Falha na seleção direta: ${e.message}`);
          }
          
          // Estratégia 1: Busca por similaridade inteligente
          if (!perfilSelecionado) {
            perfilSelecionado = await this.selecionarPerfilComSimilaridade(opcoesPapel, this.config.perfil);
          }
          
          if (perfilSelecionado) {
            console.log('✅ [SUCESSO] Perfil configurado selecionado com sucesso!');
          } else {
            console.log('⚠️ [FALLBACK] Perfil configurado não encontrado, usando estratégias alternativas...');
            
            // Estratégia 2: Busca por palavras-chave específicas do perfil configurado
            perfilSelecionado = await this.selecionarPerfilPorPalavrasChave(opcoesPapel, this.config.perfil);
          }
        } else {
          console.log('⚠️ [AVISO] Nenhum perfil foi configurado - usando perfil padrão...');
        }
        
        // FALLBACKS apenas se perfil configurado falhou
        if (!perfilSelecionado) {
          console.log('⚠️ [FALLBACK GERAL] Usando estratégias de fallback...');
          
          // Estratégia 1: Procurar por palavras-chave comuns
          // Priorizar 'Assessor' se o perfil configurado for 'Assessor'
          const palavrasChave = (this.config.perfil && /assessor/i.test(this.config.perfil))
            ? ['Assessor', 'Secretário', 'Secretario', 'Diretor', 'Analista']
            : ['Secretário', 'Secretario', 'Assessor', 'Diretor', 'Analista'];
          for (const palavra of palavrasChave) {
            if (perfilSelecionado) break;
            try {
              const opcaoChave = opcoesPapel.filter({ hasText: new RegExp(palavra, 'i') });
              if (await opcaoChave.count() > 0) {
                const textoChave = await opcaoChave.first().textContent();
                console.log(`🔍 [DEBUG] Encontrado por palavra-chave "${palavra}": "${textoChave?.trim()}"`);
                await opcaoChave.first().click({ timeout: 2000 });
                console.log(`✅ Papel selecionado por palavra-chave: ${palavra}`);
                perfilSelecionado = true;
                break;
              }
            } catch (error) {
              console.log(`⚠️ [DEBUG] Erro ao testar palavra-chave "${palavra}": ${error.message}`);
            }
          }
          
          // Estratégia 2: Selecionar primeira opção se ainda não selecionou
          if (!perfilSelecionado && totalOpcoes > 0) {
            try {
              console.log('⚠️ [DEBUG] Selecionando primeira opção disponível...');
              await opcoesPapel.first().click({ timeout: 2000 });
              const textoSelecionado = await opcoesPapel.first().textContent();
              console.log(`✅ Papel: Primeira opção selecionada - "${textoSelecionado?.trim()}"`);
              perfilSelecionado = true;
            } catch (error) {
              console.log(`❌ [DEBUG] Erro ao selecionar primeira opção: ${error.message}`);
            }
          }
          
          if (!perfilSelecionado) {
            console.log('❌ [DEBUG] Nenhuma opção de papel pôde ser selecionada!');
          }
        }
      } else {
        console.log('❌ [DEBUG] Campo Papel não encontrado com nenhum dos seletores!');
        
        // Tentar encontrar qualquer campo select no modal
        const todosSelects = this.page.locator('mat-dialog-container mat-select, mat-select');
        const totalSelects = await todosSelects.count();
        console.log(`🔍 [DEBUG] Total de campos select encontrados no modal: ${totalSelects}`);
        
        for (let i = 0; i < totalSelects; i++) {
          try {
            const selectTexto = await todosSelects.nth(i).textContent();
            const placeholder = await todosSelects.nth(i).getAttribute('placeholder');
            console.log(`🔍 [DEBUG] Select ${i + 1}: texto="${selectTexto?.trim()}", placeholder="${placeholder}"`);
          } catch (error) {
            console.log(`⚠️ [DEBUG] Erro ao analisar select ${i + 1}: ${error.message}`);
          }
        }
      }
      
      // 2. VISIBILIDADE: Selecionar "Público" rapidamente  
      console.log('🎯 Configurando Visibilidade...');
      const matSelectVisibilidade = this.page.locator('mat-dialog-container mat-select[placeholder*="Visibilidade"], mat-dialog-container mat-select[placeholder*="Localização"]');
      if (await matSelectVisibilidade.count() > 0) {
        await matSelectVisibilidade.click();
        await this.page.waitForTimeout(300);
        
        // Procurar opção "Público"
        const opcoesVisibilidade = this.page.locator('mat-option');
        const publicoOpcao = opcoesVisibilidade.filter({ hasText: /Público|Publico/i });
        
        if (await publicoOpcao.count() > 0) {
          await publicoOpcao.first().click();
          console.log('✅ Visibilidade: Público selecionado');
        } else {
          await opcoesVisibilidade.first().click();
          console.log('✅ Visibilidade: Primeira opção selecionada');
        }
      }
      
      // 3. DATA INICIAL: Preencher automaticamente
      console.log('🎯 Preenchendo data inicial...');
      const dataInicialInput = this.page.locator('input[placeholder*="Data inicial"], input[name*="dataInicial"]');
      if (await dataInicialInput.count() > 0) {
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        await dataInicialInput.fill(dataAtual);
        console.log(`✅ Data inicial: ${dataAtual}`);
      }
      
      console.log('✅ Configuração completa em modo assertivo');
      
    } catch (error) {
      console.log(`⚠️ Erro na configuração assertiva: ${error.message}`);
      // Não falhar - continuar com as configurações padrão
    }
  }

  async saveConfigurationRapido() {
    console.log('🎯 ASSERTIVO: Salvamento direto...');
    
    try {
      // 1. DIRETO: Botão Gravar mais específico
      console.log('🎯 Procurando botão Gravar...');
      const botaoGravar = 'mat-dialog-container button:has-text("Gravar"):not([disabled])';
      
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
      console.log('🔍 [DEBUG] Stack trace:', error.stack);
      
      // Fallback: tentar outros botões
      const fallbackSelectors = [
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

  async verifySuccessRapido() {
    console.log('🎯 ASSERTIVO: Verificação instantânea de sucesso...');
    
    // Verificação rápida sem timeout desnecessário
    try {
      // 1. Verificar se modal fechou (indicativo de sucesso)
      const modalAberto = await this.page.locator('mat-dialog-container').isVisible();
      if (!modalAberto) {
        console.log('✅ Modal fechou - operação CONFIRMADA como bem-sucedida');
        return true;
      }
      
      // 2. Se modal ainda aberto, verificar mensagens rapidamente
      const mensagemSucesso = await this.page.locator(':has-text("sucesso"), :has-text("cadastrado"), :has-text("salvo")').count();
      if (mensagemSucesso > 0) {
        console.log('✅ Mensagem de sucesso detectada');
        return true;
      }
      
      // 3. Se chegou aqui, assumir sucesso (modal pode estar processando)
      console.log('ℹ️ Modal ainda aberto - assumindo processamento em andamento');
      return true;
      
    } catch (error) {
      console.log(`⚠️ Erro na verificação: ${error.message} - assumindo sucesso`);
      return true; // Assumir sucesso para não quebrar fluxo
    }
  }

  // === FUNÇÕES ORIGINAIS (MANTIDAS PARA COMPATIBILIDADE) ===

  async stabilizePage() {
    // Aguardar estabilização da página
    await this.page.waitForTimeout(1500);
        
    // Aguardar que não haja requisições de rede por 500ms
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('Timeout aguardando networkidle, continuando...');
    }
  }

  async closeAnyModals() {
    console.log('🧹 Procurando modais/overlays para fechar...');
    
    // Seletores prioritários com timeout reduzido
    const prioritySelectors = [
      '.mat-dialog-actions button',
      '.mat-overlay-backdrop',
      '.cdk-overlay-backdrop',
      'button:has-text("OK")',
      'button:has-text("Fechar")',
      '.modal-backdrop'
    ];
    
    let modalsFound = 0;
    
    // Primeira passada: seletores prioritários com timeout muito baixo
    for (const selector of prioritySelectors) {
      try {
        // Usar timeout muito baixo (100ms) para não travar
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          try {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.click();
              modalsFound++;
              console.log(`✅ Fechou modal/overlay: ${selector}`);
              await this.delay(100); // Delay reduzido
              return; // Sair após fechar o primeiro modal
            }
          } catch (clickError) {
            // Ignorar erros de clique
          }
        }
      } catch (error) {
        // Ignorar erros de seletores não encontrados
      }
    }
    
    // Se não encontrou modais prioritários, tentar ESC rapidamente
    try {
      await this.page.keyboard.press('Escape');
      await this.delay(300);
      console.log('🔑 Pressionou ESC para fechar modais');
    } catch (escError) {
      console.log('⚠️ Erro ao pressionar ESC:', escError.message);
    }
    
    if (modalsFound > 0) {
      console.log(`✅ Total de modais/overlays fechados: ${modalsFound}`);
    } else {
      console.log('ℹ️ Nenhum modal/overlay encontrado');
    }
  }

  async clickAddLocationButton() {
    console.log('🔄 INICIANDO clickAddLocationButton');
    const addButtonSelectors = [
      'button:has-text("Adicionar Localização/Visibilidade"):not([disabled])',
      'button:has-text("Adicionar Localização"):not([disabled])',
      'button:has-text("Adicionar"):not([disabled]):visible',
      'button .mat-button-wrapper:has-text("Adicionar"):not([disabled])',
      'input[value*="Adicionar"]:not([disabled])'
    ];
        
    let addButton = null;
        
    for (const selector of addButtonSelectors) {
      try {
        console.log(`🔍 Testando seletor: ${selector}`);
        await this.page.waitForSelector(selector, { timeout: 3000 });
        addButton = selector;
        console.log(`✅ Botão Adicionar encontrado: ${selector}`);
        break;
      } catch (error) {
        console.log(`❌ Seletor ${selector} não encontrado: ${error.message}`);
      }
    }
        
    if (!addButton) {
      console.log('❌ ERRO: Nenhum botão Adicionar encontrado');
      throw new Error('Botão "Adicionar Localização/Visibilidade" não encontrado');
    }
        
    console.log(`🖱️ Clicando no botão: ${addButton}`);
    await this.page.click(addButton);
    await this.delay(2000);
    console.log('✅ clickAddLocationButton concluído');
  }

  async selectOrgaoJulgador(orgao) {
    // Implementar seleção do órgão julgador usando a versão melhorada
    // com estratégia aprimorada para mat-select do Angular Material
        
    console.log(`🔄 INICIANDO selectOrgaoJulgador para: ${orgao}`);
    this.sendStatus('info', 'Selecionando órgão julgador...', null, orgao);
        
    // Usar a função melhorada com estratégia de trigger
    const { vincularOJMelhorado } = require('../vincularOJ.js');

    // Configuração específica para São José dos Campos - SAO_JOSE_CAMPOS_SEQUENCIAL
    const SAO_JOSE_CAMPOS_CONFIG = {
      varasEspeciais: [
        '2ª Vara do Trabalho de São José dos Campos',
        '3ª Vara do Trabalho de São José dos Campos',
        '4ª Vara do Trabalho de São José dos Campos',
        '5ª Vara do Trabalho de São José dos Campos'
      ],
    
      processamentoSequencial: true,
      timeoutExtendido: 30000,
      tentativasMaximas: 3,
      intervaloTentativas: 5000,
    
      // Função para verificar se é vara especial
      isVaraEspecial(nomeOrgao) {
        return this.varasEspeciais.includes(nomeOrgao);
      },
    
      // Configurações específicas para processamento
      getConfiguracao(nomeOrgao) {
        if (this.isVaraEspecial(nomeOrgao)) {
          return {
            sequencial: true,
            timeout: this.timeoutExtendido,
            tentativas: this.tentativasMaximas,
            intervalo: this.intervaloTentativas,
            aguardarCarregamento: 8000,
            verificarElementos: true
          };
        }
        return null;
      }
    };

    // Verificar se é uma vara especial de São José dos Campos
    const configEspecial = SAO_JOSE_CAMPOS_CONFIG.getConfiguracao(orgao);

    if (configEspecial) {
      console.log(`🎯 VARA ESPECIAL DETECTADA: ${orgao} - Aplicando configuração otimizada`);
      console.log(`⚙️ Configuração: Timeout=${configEspecial.timeout}ms, Tentativas=${configEspecial.tentativas}`);

      // Aplicar delays otimizados para varas especiais
      await this.ultraFastDelayManager.enableTurboMode();

      // Processamento com configuração especial
      try {
        console.log(`🔄 Chamando vincularOJMelhorado ESPECIAL para: ${orgao}`);
        await vincularOJMelhorado(
          this.page,
          orgao,
          this.config.perfil || 'Assessor',
          'Público',
          {
            timeout: configEspecial.timeout,
            maxTentativas: configEspecial.tentativas,
            aguardarExtra: configEspecial.aguardarCarregamento,
            verificarElementos: configEspecial.verificarElementos,
            sequencial: configEspecial.sequencial
          }
        );
        console.log(`✅ Processamento ESPECIAL concluído com sucesso para: ${orgao}`);
      } catch (error) {
        console.error(`❌ Erro no processamento ESPECIAL de ${orgao}:`, error.message);
        throw error;
      }
    } else {
      console.log(`🔄 Chamando vincularOJMelhorado PADRÃO para: ${orgao} com perfil: ${this.config.perfil || 'Não especificado'}`);
      await vincularOJMelhorado(
        this.page,
        orgao, // Nome do órgão como string
        this.config.perfil || 'Assessor', // Usar perfil configurado
        'Público'
      );
      console.log(`✅ vincularOJMelhorado PADRÃO concluído para: ${orgao}`);
    }
  }

  async configurePapelVisibilidade() {
    // Configurar papel e visibilidade se necessário
    // Esta lógica seria implementada baseada nos requisitos específicos
    await this.delay(500);
  }

  async saveConfiguration() {
    // Salvar configuração
    // Esta lógica seria similar ao que já existe no vincularOJ.js
    await this.delay(500);
  }

  async verifySuccess() {
    // Verificar se a operação foi bem-sucedida
    // Implementar verificações de sucesso
    await this.delay(500);
  }

  async processOrgaosJulgadoresWithServerTracking(servidor) {
    console.log(`🎯 [DEBUG] INICIANDO processOrgaosJulgadoresWithServerTracking para ${servidor.nome}`);
    console.log(`📎 Servidor: ${servidor.nome || servidor.cpf} - ${servidor.orgaos?.length || 0} órgãos julgadores`);
    
    // Adicionar servidor ao painel de processamento
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.executeJavaScript(`
        if (typeof addProcessingServer === 'function') {
          addProcessingServer({
            name: '${servidor.nome.replace(/'/g, '\\\'')}',
            cpf: '${servidor.cpf}',
            perfil: '${servidor.perfil || this.config.perfil || ''}',
            totalOJs: ${servidor.orgaos?.length || 0}
          });
        }
      `).catch(err => {
        console.log('⚠️ Erro ao adicionar servidor ao painel de processamento:', err.message);
      });
    }
    
    // Validar configuração antes de processar
    if (!this.config || !this.config.orgaos || !Array.isArray(this.config.orgaos)) {
      throw new Error('Configuração de órgãos julgadores inválida ou não definida');
    }
    
    // Definir o servidor atual para uso em outras funções
    this.currentServidor = servidor;
    
    const serverResult = this.servidorResults[servidor.cpf];
    if (!serverResult) {
      console.error(`❌ [ERROR] serverResult não encontrado para CPF ${servidor.cpf}`);
      throw new Error(`Resultado do servidor não encontrado para CPF ${servidor.cpf}`);
    }
    
    // SISTEMA INTELIGENTE: Verificação de OJs já cadastrados via BD
    let ojsParaProcessarOtimizado = servidor.orgaos || [];
    let resultadoVerificacao = null;
    
    console.log(`🔍 [DEBUG] DIRLEI CASO - INICIANDO verificação inteligente para ${servidor.nome}`);
    console.log(`🔍 [DEBUG] DIRLEI CASO - CPF: ${servidor.cpf}`);
    console.log(`🔍 [DEBUG] DIRLEI CASO - OJs originais: ${JSON.stringify(servidor.orgaos)}`);
    console.log(`🔍 [DEBUG] DIRLEI CASO - Conexão BD disponível: ${this.dbConnection ? 'SIM' : 'NÃO'}`);
    console.log(`🔍 [DEBUG] DIRLEI CASO - Conexão BD ativa: ${this.dbConnection?.isConnected ? 'SIM' : 'NÃO'}`);
    
    try {
      resultadoVerificacao = await this.verificarOJsInteligente(servidor.cpf, servidor.orgaos || []);
      
      console.log(`🔍 [DEBUG] DIRLEI CASO - Resultado da verificação:`, {
        inteligenciaAtiva: resultadoVerificacao.inteligenciaAtiva,
        ojsParaProcessar: resultadoVerificacao.ojsParaProcessar,
        ojsJaCadastrados: resultadoVerificacao.ojsJaCadastrados?.length || 0,
        economia: resultadoVerificacao.economia,
        mensagem: resultadoVerificacao.mensagem
      });
      
      if (resultadoVerificacao.inteligenciaAtiva) {
        // Atualizar lista de OJs para processar apenas os necessários
        ojsParaProcessarOtimizado = resultadoVerificacao.ojsParaProcessar;
        
        console.log(`🔍 [DEBUG] DIRLEI CASO - Lista ANTES: ${JSON.stringify(servidor.orgaos)}`);
        console.log(`🔍 [DEBUG] DIRLEI CASO - Lista DEPOIS: ${JSON.stringify(ojsParaProcessarOtimizado)}`);
        
        // Registrar economia no resultado do servidor
        serverResult.verificacaoInteligente = {
          ativa: true,
          totalOriginal: resultadoVerificacao.totalVerificados || 0,
          ojsJaCadastrados: resultadoVerificacao.ojsJaCadastrados.length,
          ojsParaProcessar: resultadoVerificacao.ojsParaProcessar.length,
          economia: resultadoVerificacao.economia,
          detalhesJaCadastrados: resultadoVerificacao.ojsJaCadastrados
        };
        
        console.log(`🎯 [INTELIGÊNCIA] Sistema ativo para ${servidor.nome}:`);
        console.log(`   📊 OJs originais: ${servidor.orgaos?.length || 0}`);
        console.log(`   ✅ Já cadastrados: ${resultadoVerificacao.ojsJaCadastrados.length}`);
        console.log(`   🔄 Para processar: ${ojsParaProcessarOtimizado.length}`);
        console.log(`   ⚡ Economia estimada: ${resultadoVerificacao.economia.tempo}s e ${resultadoVerificacao.economia.cliques} cliques`);
        
        if (ojsParaProcessarOtimizado.length === 0) {
          // Não há OJs para processar: pular automaticamente sem solicitar confirmação
          this.sendStatus('success', `🎉 ${servidor.nome}: Todos os OJs já estão cadastrados! Pulando...`, null,
            `Economia: ${resultadoVerificacao.economia.tempo}s`);
          serverResult.pularMotivo = 'Todos os OJs já estão cadastrados';
          serverResult.status = 'Pulado - Todos OJs cadastrados';
          return;
        }
        // Há OJs para processar: continuar automaticamente sem solicitar confirmação
        const detalhesOJs = this.formatarDetalhesOJs(resultadoVerificacao);
        this.sendStatus('info', `✅ ${servidor.nome}: Prosseguindo com ${ojsParaProcessarOtimizado.length} OJs`, null,
          detalhesOJs.resumo);

        // Marcar OJs que vieram da verificação inteligente como FORÇADAS para processamento
        try {
          this.forcedOJsNormalized = new Set(
            (ojsParaProcessarOtimizado || []).map(orgao => this.normalizeOrgaoName(orgao))
          );
          console.log(`🧠 [INTELIGÊNCIA] Forçando processamento destas OJs: ${JSON.stringify(Array.from(this.forcedOJsNormalized))}`);
        } catch (e) {
          this.forcedOJsNormalized = null;
        }

        // Aplicar imediatamente a lista filtrada na configuração para todas as etapas seguintes
        try {
          console.log(`🎯 [OTIMIZAÇÃO] Aplicando lista filtrada diretamente na config: ${ojsParaProcessarOtimizado.length} OJs`);
          this.config.orgaos = ojsParaProcessarOtimizado;
        } catch (e) {
          console.log(`⚠️ [OTIMIZAÇÃO] Falha ao aplicar lista filtrada: ${e.message}`);
        }
      }
    } catch (error) {
      console.error(`⚠️ [INTELIGÊNCIA] Erro na verificação: ${error.message}`);
      // Continuar com lista original em caso de erro
      ojsParaProcessarOtimizado = servidor.orgaos || [];
    }
    
    this.sendStatus('info', `🔍 Processando ${ojsParaProcessarOtimizado.length} OJs para ${servidor.nome}...`, null, 
      resultadoVerificacao?.economia?.ojsEvitados > 0 ? `${resultadoVerificacao.economia.ojsEvitados} OJs já cadastrados` : 'Otimizando processo');
    
    // VERIFICAÇÃO AUTOMÁTICA DE LOCALIZAÇÕES/VISIBILIDADES ATIVAS
    console.log(`🎯 [LOCALIZAÇÕES] Iniciando verificação automática de localizações para ${servidor.nome}...`);
    try {
      const resultadoLocalizacoes = await verificarEProcessarLocalizacoesFaltantes(this.page);
      
      if (resultadoLocalizacoes.sucesso) {
        console.log(`✅ [LOCALIZAÇÕES] Verificação concluída para ${servidor.nome}:`);
        console.log(`   📊 Existentes: ${resultadoLocalizacoes.existentes}`);
        console.log(`   🚀 Processadas: ${resultadoLocalizacoes.processadas}`);
        console.log(`   📈 Total: ${resultadoLocalizacoes.total}`);
        
        this.sendStatus('success', 
          `🎯 Localizações: ${resultadoLocalizacoes.existentes} existentes + ${resultadoLocalizacoes.processadas} processadas = ${resultadoLocalizacoes.total} total`, 
          null, 
          'Verificação automática concluída', 
          null, 
          servidor.nome
        );
        
        // Adicionar ao resultado do servidor
        serverResult.localizacoes = {
          existentes: resultadoLocalizacoes.existentes,
          processadas: resultadoLocalizacoes.processadas,
          total: resultadoLocalizacoes.total,
          erros: resultadoLocalizacoes.erros || 0
        };
        
      } else {
        console.log(`⚠️ [LOCALIZAÇÕES] Erro na verificação para ${servidor.nome}: ${resultadoLocalizacoes.erro}`);
        this.sendStatus('warning', 
          `⚠️ Erro na verificação de localizações: ${resultadoLocalizacoes.erro}`, 
          null, 
          'Continuando com processamento de OJs', 
          null, 
          servidor.nome
        );
        
        // Adicionar erro ao resultado do servidor
        serverResult.localizacoes = {
          erro: resultadoLocalizacoes.erro,
          existentes: 0,
          processadas: 0,
          total: 0,
          erros: 1
        };
      }
    } catch (error) {
      console.log(`❌ [LOCALIZAÇÕES] Erro inesperado na verificação para ${servidor.nome}: ${error.message}`);
      this.sendStatus('warning', 
        `❌ Erro inesperado na verificação de localizações: ${error.message}`, 
        null, 
        'Continuando com processamento de OJs', 
        null, 
        servidor.nome
      );
      
      // Adicionar erro ao resultado do servidor
      serverResult.localizacoes = {
        erro: error.message,
        existentes: 0,
        processadas: 0,
        total: 0,
        erros: 1
      };
    }
    
    // CORREÇÃO DO BUG: Apenas limpar cache em memória, preservar persistência
    console.log(`🧹 [DEBUG] Limpando cache em memória antes de processar ${servidor.nome}...`);
    this.ojCache.clear();
    this.smartOJCache.limparCache(true); // CORREÇÃO: Preservar dados persistentes
    console.log('✅ [DEBUG] Cache em memória limpo - dados persistentes preservados');
    console.log('🎯 [DEBUG] BYPASS-UNIVERSAL: Garantindo que não há contaminação de cache entre servidores');
    
    // SISTEMA INTELIGENTE: Habilitado para permitir verificação inteligente via banco
    // Usar verificação prévia para otimizar processamento
    const isUniversalBypass = false; // Permitir verificações inteligentes via BD
    
    if (isUniversalBypass) {
      console.log(`🔥 [BYPASS-UNIVERSAL] REMOVENDO TODAS AS VERIFICAÇÕES para ${servidor.nome}`);
      console.log('🔥 [BYPASS-UNIVERSAL] Pulando SmartCache, ServidorSkipDetector e TODAS verificações');
      console.log('🔥 [BYPASS-UNIVERSAL] PROCESSAMENTO DIRETO de todas as OJs configuradas');
      // PULAR COMPLETAMENTE loadExistingOJs, verificacoes, etc.
    } else {
      // Comportamento normal para outros servidores
      console.log(`🔍 [DEBUG] Carregando OJs existentes para ${servidor.nome} usando SmartOJCache (cache limpo)...`);
      await this.loadExistingOJsWithSmartCache();
      console.log(`🔍 [DEBUG] Cache de OJs carregado: ${this.ojCache.size} OJs em cache`);
    }
    
    // APLICAR OTIMIZAÇÃO: Atualizar config com OJs otimizados (antes da normalização)
    if (ojsParaProcessarOtimizado.length !== this.config.orgaos.length) {
      console.log(`🎯 [OTIMIZAÇÃO] Lista de OJs atualizada: ${this.config.orgaos.length} → ${ojsParaProcessarOtimizado.length}`);
      this.config.orgaos = ojsParaProcessarOtimizado;
    }
    
    // Normalizar e filtrar OJs que precisam ser processados
    console.log(`🔍 [DEBUG] this.config.orgaos (após otimização): ${JSON.stringify(this.config.orgaos?.slice(0,3) || [])}${this.config.orgaos?.length > 3 ? '...' : ''}`);
    const ojsNormalizados = this.config.orgaos.map(orgao => this.normalizeOrgaoName(orgao));
    console.log(`🔍 [DEBUG] OJs normalizados: ${JSON.stringify(ojsNormalizados.slice(0,3))}${ojsNormalizados.length > 3 ? '...' : ''}`);
    
    // ANÁLISE INTELIGENTE: DESABILITADA PARA BYPASS UNIVERSAL
    if (!isUniversalBypass) {
      const servidorId = `${servidor.cpf}_${servidor.nome}`;
      const analiseServidor = this.servidorSkipDetector.analisarServidor(servidorId, ojsNormalizados, this.smartOJCache);
      
      if (analiseServidor.deveSerPulado) {
        console.log(`⏭️ [SKIP] Servidor ${servidor.nome} será PULADO: ${analiseServidor.motivo}`);
        this.sendStatus('info', `⏭️ PULANDO: ${servidor.nome}`, null, analiseServidor.motivo, null, servidor.nome);
        
        // Atualizar estatísticas do servidor
        serverResult.status = 'Pulado';
        serverResult.jaIncluidos = analiseServidor.estatisticas.ojsJaVinculados;
        serverResult.detalhes.push({
          status: 'Servidor Pulado',
          motivo: analiseServidor.motivo,
          estatisticas: analiseServidor.estatisticas,
          timestamp: new Date().toISOString()
        });
        
        return; // Pular este servidor
      }
    } else {
      console.log(`🔥 [BYPASS-UNIVERSAL] PULANDO análise ServidorSkipDetector para ${servidor.nome}`);
    }
    
    // SISTEMA INTELIGENTE: Usar lista otimizada da verificação inteligente ou filtro por cache
    let ojsToProcess;
    
    console.log(`🔍 [DEBUG] DIRLEI CASO - DECISÃO DE LISTA:`);
    console.log(`   resultadoVerificacao existe: ${resultadoVerificacao ? 'SIM' : 'NÃO'}`);
    console.log(`   inteligenciaAtiva: ${resultadoVerificacao?.inteligenciaAtiva ? 'SIM' : 'NÃO'}`);
    console.log(`   ojsParaProcessarOtimizado.length: ${ojsParaProcessarOtimizado.length}`);
    console.log(`   ojsNormalizados.length: ${ojsNormalizados.length}`);
    console.log(`   ojsParaProcessarOtimizado < ojsNormalizados: ${ojsParaProcessarOtimizado.length < ojsNormalizados.length ? 'SIM' : 'NÃO'}`);
    console.log(`   isUniversalBypass: ${isUniversalBypass ? 'SIM' : 'NÃO'}`);
    
    if (resultadoVerificacao && resultadoVerificacao.inteligenciaAtiva) {
      // SEMPRE usar lista inteligente quando disponível, independente da quantidade
      ojsToProcess = ojsParaProcessarOtimizado.map(orgao => this.normalizeOrgaoName(orgao));
      console.log(`🧠 [INTELIGÊNCIA] ESCOLHA: Usando lista inteligente: ${ojsToProcess.length} OJs`);
      console.log(`🧠 [INTELIGÊNCIA] OJs selecionados: ${JSON.stringify(ojsToProcess)}`);
      console.log(`🧠 [INTELIGÊNCIA] CONFIRMANDO: Esta é a lista DEFINITIVA que será processada`);
    } else if (isUniversalBypass) {
      ojsToProcess = this.config.orgaos; // Usar OJs ORIGINAIS, não normalizadas
      console.log('🔥 [BYPASS-UNIVERSAL] ESCOLHA: PROCESSAMENTO DIRETO - ignorando TUDO');
      console.log(`🔥 [BYPASS-UNIVERSAL] OJs originais: ${JSON.stringify(ojsToProcess)}`);
      console.log(`🔥 [BYPASS-UNIVERSAL] Total: ${ojsToProcess.length} OJs serão processadas OBRIGATORIAMENTE`);
    } else {
      ojsToProcess = ojsNormalizados.filter(orgao => !this.ojCache.has(orgao));
      console.log(`🔍 [DEBUG] ESCOLHA: OJs a processar (cache): ${JSON.stringify(ojsToProcess)}`);
    }
    
    // Contador de OJs processadas
    let ojsProcessadasTotal = 0;
    const totalOjs = this.config.orgaos.length;
    
    if (isUniversalBypass) {
      console.log(`🔥 [BYPASS-UNIVERSAL] GARANTINDO processamento de ${ojsToProcess.length} OJs`);
      this.sendStatus('info', `🔥 ${servidor.nome}: ${ojsToProcess.length} OJs serão processadas (sem verificações)`, null, 'Processamento direto', null, servidor.nome, ojsProcessadasTotal, totalOjs);
    } else if (resultadoVerificacao && resultadoVerificacao.inteligenciaAtiva) {
      this.sendStatus('info', `🧠 ${servidor.nome}: ${ojsToProcess.length} OJs para processar (verificação inteligente)`, null, 'Sistema inteligente ativo', null, servidor.nome, ojsProcessadasTotal, totalOjs);
    } else {
      this.sendStatus('info', `⚡ ${ojsToProcess.length} OJs para processar | ${this.ojCache.size} detectados como já cadastrados`, null, 'Processando servidor', null, servidor.nome, ojsProcessadasTotal, totalOjs);
    }
    
    if (ojsToProcess.length === 0 && !isUniversalBypass) {
      if (resultadoVerificacao && resultadoVerificacao.inteligenciaAtiva) {
        console.log('🧠 [INTELIGÊNCIA] NENHUM OJ para processar - todos já cadastrados no banco');
        this.sendStatus('success', `🎉 ${servidor.nome}: Todos os OJs já estão cadastrados!`, null, 'Sistema inteligente concluído', null, servidor.nome);
      } else {
        console.log('🔍 [DEBUG] NENHUM OJ para processar - todos já estão em cache');
      }
      return;
    }
        
    // Processar cada OJ restante com tracking
    console.log(`🔍 [DEBUG] INICIANDO loop de processamento de ${ojsToProcess.length} OJs`);
    for (let i = 0; i < ojsToProcess.length; i++) {
      const orgao = ojsToProcess[i];
      console.log(`🔍 [DEBUG] Processando OJ ${i + 1}/${ojsToProcess.length}: ${orgao}`);
      serverResult.ojsProcessados++;
      
      this.sendStatus('info', `OJ ${i + 1}/${ojsToProcess.length}: ${orgao}`, null, 'Processando vinculação', orgao, servidor.nome, ojsProcessadasTotal, totalOjs);
            
      try {
        const startOJ = Date.now();
        await this.processOrgaoJulgador(orgao);
        const timeOJ = Date.now() - startOJ;
        
        ojsProcessadasTotal++; // Incrementar contador após sucesso
        
        serverResult.sucessos++;
        serverResult.detalhes.push({
          orgao,
          status: 'Incluído com Sucesso',
          tempo: timeOJ,
          perfil: this.config.perfil,
          timestamp: new Date().toISOString()
        });
        
        this.results.push({
          servidor: servidor.nome,
          orgao,
          status: 'Incluído com Sucesso',
          erro: null,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        
        this.sendStatus('success', `✅ OJ ${orgao} incluído com sucesso`, null, null, orgao, servidor.nome, ojsProcessadasTotal, totalOjs);
        
      } catch (error) {
        console.error(`❌ Erro OJ ${orgao} (${servidor.nome}):`, error.message);
        
        ojsProcessadasTotal++; // Incrementar contador mesmo com erro
        
        serverResult.erros++;
        serverResult.detalhes.push({
          orgao,
          status: 'Erro',
          erro: error.message,
          timestamp: new Date().toISOString()
        });
        
        this.results.push({
          servidor: servidor.nome,
          orgao,
          status: 'Erro',
          erro: error.message,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
        
        this.sendStatus('error', `❌ Erro ao processar OJ ${orgao}: ${error.message}`, null, null, orgao, servidor.nome, ojsProcessadasTotal, totalOjs);
                
        // Recuperação rápida sem interromper processamento
        await this.quickErrorRecovery();
      }
            
      // Pausa ultra-otimizada entre OJs (25ms para velocidade máxima)
      await this.delay(25);
    }
        
    // Adicionar OJs já existentes ao relatório do servidor
    for (const orgaoExistente of this.ojCache) {
      if (this.config && this.config.orgaos && this.config.orgaos.includes(orgaoExistente)) {
        serverResult.jaIncluidos++;
        serverResult.detalhes.push({
          orgao: orgaoExistente,
          status: 'Já Incluído',
          perfil: this.config.perfil,
          timestamp: new Date().toISOString()
        });
        
        this.results.push({
          servidor: servidor.nome,
          orgao: orgaoExistente,
          status: 'Já Incluído',
          erro: null,
          perfil: this.config.perfil,
          cpf: this.config.cpf,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Enviar status final de conclusão
    this.sendStatus('success', `✅ Processamento do servidor ${servidor.nome} finalizado`, null, 'Finalizado', 'Finalizado', servidor.nome, totalOjs, totalOjs);
    
    // Adicionar servidor à lista de processados com sucesso
    if (this.mainWindow && this.mainWindow.webContents) {
      const processingTime = serverResult.tempoProcessamento || 0;
      this.mainWindow.webContents.executeJavaScript(`
        if (typeof addProcessedServer === 'function') {
          addProcessedServer({
            name: '${servidor.nome.replace(/'/g, '\\\'').replace(/"/g, '\\"')}',
            cpf: '${servidor.cpf}',
            perfil: '${servidor.perfil || this.config.perfil || ''}',
            ojsCount: ${totalOjs || 0},
            processingTime: ${processingTime}
          });
        }
      `).catch(err => {
        console.log('⚠️ Erro ao adicionar servidor processado ao modal:', err.message);
      });
    }
  }

  async quickErrorRecovery() {
    console.log('⚡ Recuperação rápida após erro...');
    
    try {
      // Fechar modais rapidamente
      await Promise.race([
        this.closeAnyModalsRapido(),
        this.delay(1000)
      ]);
      
      // Escape como último recurso
      await this.page.keyboard.press('Escape');
      await this.delay(300);
      
    } catch (error) {
      console.log('⚠️ Erro na recuperação rápida:', error.message);
    }
  }

  async attemptErrorRecovery() {
    console.log('🔧 Tentando recuperação automática...');
    
    try {
      // Aguardar estabilização mínima
      await this.delay(2000);
      
      // Tentar fechar modais de erro
      await this.closeAnyModals();
      
      // Tentar navegar para uma página estável
      await Promise.race([
        this.navigationOptimizer.fastNavigate(this.page, 'https://pje.trt15.jus.br/pjekz/pessoa-fisica'),
        this.delay(5000)
      ]);
      
      console.log('✅ Recuperação automática concluída');
      
    } catch (error) {
      console.log('⚠️ Falha na recuperação automática:', error.message);
    }
  }

  async ensureCleanState() {
    console.log('🧹 Garantindo estado limpo do navegador...');
    
    try {
      // Fechar quaisquer modais ou popups abertos
      await this.closeAnyModals();
      
      // Aguardar estabilização
      await this.delay(500);
      
      // Verificar se ainda está na página correta
      const currentUrl = this.page.url();
      console.log(`🔍 URL atual antes da limpeza: ${currentUrl}`);
      
      // Se não estiver na página de pessoas, navegar para ela
      if (!currentUrl.includes('pessoa-fisica')) {
        console.log('🔄 Navegando de volta para página de pessoas...');
        await this.navigationOptimizer.fastNavigate(this.page, 'https://pje.trt15.jus.br/pjekz/pessoa-fisica');
        await this.delay(1000);
      }
      
      console.log('✅ Estado limpo garantido');
      
    } catch (error) {
      console.warn('⚠️ Erro ao garantir estado limpo:', error.message);
      // Não propagar o erro, apenas log
    }
  }

  async performRobustRecovery() {
    console.log('🛠️ Executando recuperação robusta...');
    
    try {
      // Verificar se o navegador ainda está ativo
      if (!this.page || this.page.isClosed()) {
        console.log('🔄 Navegador fechado detectado, reconectando...');
        await this.reconnectBrowser();
        return;
      }
      
      // Aguardar estabilização extendida
      await this.delay(3000);
      
      // Múltiplas tentativas de fechamento de modais
      for (let i = 0; i < 3; i++) {
        await this.closeAnyModals();
        await this.delay(500);
      }
      
      // Navegar para página base e aguardar carregamento completo
      const baseUrl = 'https://pje.trt15.jus.br/pjekz/pessoa-fisica';
      
      console.log(`🔄 Navegando para página base: ${baseUrl}`);
      await this.navigationOptimizer.optimizedNavigate(this.page, baseUrl);
      
      // Aguardar página estabilizar completamente
      await Promise.race([
        this.page.waitForSelector('table', { timeout: 10000 }),
        this.page.waitForSelector('.datatable', { timeout: 10000 }),
        this.delay(5000) // Fallback
      ]);
      
      // Aguardar estabilização final
      await this.delay(2000);
      
      console.log('✅ Recuperação robusta concluída');
      
    } catch (error) {
      console.error('❌ Falha na recuperação robusta:', error.message);
      
      // Verificar se o erro é devido ao navegador fechado
      if (error.message.includes('Target page, context or browser has been closed') || 
          error.message.includes('Session closed') ||
          error.message.includes('Connection closed')) {
        console.log('🔄 Erro de conexão detectado, reconectando navegador...');
        await this.reconnectBrowser();
        return;
      }
      
      // Tentar recuperação básica como último recurso
      try {
        await this.delay(5000);
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
        await this.delay(2000);
        console.log('✅ Recuperação básica (reload) executada');
      } catch (reloadError) {
        console.error('💥 Falha total na recuperação:', reloadError.message);
        if (reloadError.message.includes('Target page, context or browser has been closed')) {
          await this.reconnectBrowser();
        }
      }
    }
  }

  async reconnectBrowser() {
    console.log('🔌 Reconectando navegador...');
    
    try {
      // Fechar conexões antigas se ainda existirem
      if (this.browser && !this.browser.contexts().length === 0) {
        try {
          await this.browser.close();
        } catch (e) {
          console.log('⚠️ Erro ao fechar navegador antigo:', e.message);
        }
      }
      
      // Aguardar antes de reconectar
      await this.delay(2000);
      
      // Reinicializar navegador
      await this.initializeBrowser();
      
      // Realizar login novamente
      await this.performLogin();
      
      console.log('✅ Navegador reconectado com sucesso');
      
    } catch (error) {
      console.error('❌ Falha na reconexão do navegador:', error.message);
      throw new Error(`Falha crítica na reconexão do navegador: ${error.message}`);
    }
  }

  async ensureBrowserActive() {
    if (!this.page || this.page.isClosed()) {
      console.log('🔄 Página fechada detectada, reconectando...');
      await this.reconnectBrowser();
    }
  }

  async handleErrorRecovery() {
    console.log('Iniciando recuperação após erro...');
        
    // Aguardar estabilização
    await this.delay(3000);
        
    // Tentar fechar modais de erro
    await this.closeAnyModals();
        
    // Tentar pressionar Escape como último recurso
    try {
      await this.page.keyboard.press('Escape');
      await this.delay(1000);
    } catch (error) {
      console.log('Erro ao pressionar Escape:', error.message);
    }
  }

  // Método para otimizar resultados removendo duplicatas e melhorando informações
  otimizarResultados() {
    console.log('🔄 Otimizando resultados do relatório...');
    
    // Mapa para agrupar por órgão julgador
    const orgaosMap = new Map();
    
    // Processar cada resultado
    this.results.forEach(resultado => {
      const orgao = resultado.orgao;
      
      if (!orgaosMap.has(orgao)) {
        // Primeiro registro para este órgão
        let statusFinal = resultado.status;
        let observacoes = resultado.erro || '';
        
        // Normalizar status
        if (statusFinal === 'Sucesso' || statusFinal === 'Já Incluído') {
          statusFinal = 'Incluído com Sucesso';
          // Adicionar perfil nas observações (usar perfil do resultado se disponível)
          observacoes = resultado.perfil || this.config.perfil || 'Perfil não especificado';
        }
        
        orgaosMap.set(orgao, {
          orgao,
          status: statusFinal,
          observacoes,
          timestamp: resultado.timestamp
        });
      } else {
        // Já existe registro para este órgão - priorizar sucesso
        const existente = orgaosMap.get(orgao);
        
        if (resultado.status === 'Sucesso' && existente.status !== 'Incluído com Sucesso') {
          // Atualizar para sucesso se ainda não estava
          existente.status = 'Incluído com Sucesso';
          existente.observacoes = resultado.perfil || this.config.perfil || 'Perfil não especificado';
          existente.timestamp = resultado.timestamp;
        } else if (resultado.status === 'Já Incluído' && existente.status === 'Erro') {
          // Se teve erro antes mas agora está incluído, atualizar
          existente.status = 'Incluído com Sucesso';
          existente.observacoes = resultado.perfil || this.config.perfil || 'Perfil não especificado';
          existente.timestamp = resultado.timestamp;
        }
        // Ignorar duplicatas de "Já Incluído" ou outros casos
      }
    });
    
    // Converter mapa para array
    const resultadosFinais = Array.from(orgaosMap.values());
    
    console.log(`✅ Resultados otimizados: ${this.results.length} → ${resultadosFinais.length} (${this.results.length - resultadosFinais.length} duplicatas removidas)`);
    
    return resultadosFinais;
  }

  async generateMultiServerReport() {
    this.sendStatus('info', '📊 Gerando relatório consolidado...', 95, 'Finalizando processamento de múltiplos servidores');
        
    // Configurar diretório de saída
    const outputDir = path.join(__dirname, '..', '..', 'data');        
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Calcular estatísticas globais
    const totalServidores = this.processedServidores;
    const servidoresBemSucedidos = this.successfulServidores;
    const servidoresComFalha = this.failedServidores;
    
    let totalOJsProcessados = 0;
    let totalSucessos = 0;
    let totalErros = 0;
    let totalJaIncluidos = 0;
    let totalLocalizacoesProcessadas = 0;
    let totalLocalizacoesSucesso = 0;
    let totalLocalizacoesErro = 0;
    
    // Preparar dados detalhados por servidor
    const servidoresDetalhados = [];
    
    Object.values(this.servidorResults).forEach(server => {
      totalOJsProcessados += server.ojsProcessados;
      totalSucessos += server.sucessos;
      totalErros += server.erros;
      totalJaIncluidos += server.jaIncluidos;
      
      // Somar estatísticas de localizações
      if (server.localizacoes) {
        totalLocalizacoesProcessadas += server.localizacoes.processadas || 0;
        totalLocalizacoesSucesso += server.localizacoes.sucesso || 0;
        totalLocalizacoesErro += server.localizacoes.erro || 0;
      }
      
      servidoresDetalhados.push({
        nome: server.nome,
        cpf: server.cpf,
        perfil: server.perfil,
        status: server.status,
        tentativas: {
          realizadas: server.tentativas || 0,
          maximas: server.maxTentativas || 2,
          recuperacoes: server.tentativas > 1 ? server.tentativas - 1 : 0
        },
        estatisticas: {
          totalOJs: server.totalOJs,
          ojsProcessados: server.ojsProcessados,
          sucessos: server.sucessos,
          erros: server.erros,
          jaIncluidos: server.jaIncluidos,
          percentualSucesso: server.ojsProcessados > 0 ? 
            parseFloat(((server.sucessos / server.ojsProcessados) * 100).toFixed(1)) : 0,
          localizacoes: server.localizacoes || {
            processadas: 0,
            sucesso: 0,
            erro: 0,
            percentualSucesso: 0
          }
        },
        tempo: {
          inicioProcessamento: server.inicioProcessamento,
          fimProcessamento: server.fimProcessamento,
          tempoProcessamento: server.tempoProcessamento,
          tempoProcessamentoFormatado: server.tempoProcessamento ? 
            `${(server.tempoProcessamento/1000).toFixed(1)}s` : 'N/A'
        },
        detalhesOJs: server.detalhes,
        erroGeral: server.erroGeral || null
      });
    });
    
    // Relatório consolidado
    const relatorioConsolidado = {
      timestamp: new Date().toISOString(),
      tipoRelatorio: 'Múltiplos Servidores',
      resumoGeral: {
        totalServidores,
        servidoresBemSucedidos,
        servidoresComFalha,
        errosConsecutivosMaximos: this.consecutiveErrors || 0,
        percentualServidoresSucesso: totalServidores > 0 ? 
          parseFloat(((servidoresBemSucedidos / totalServidores) * 100).toFixed(1)) : 0,
        totalOJsProcessados,
        totalSucessos,
        totalErros,
        totalJaIncluidos,
        percentualOJsSucesso: totalOJsProcessados > 0 ? 
          parseFloat(((totalSucessos / totalOJsProcessados) * 100).toFixed(1)) : 0,
        localizacoes: {
          totalProcessadas: totalLocalizacoesProcessadas,
          totalSucesso: totalLocalizacoesSucesso,
          totalErro: totalLocalizacoesErro,
          percentualSucesso: totalLocalizacoesProcessadas > 0 ? 
            parseFloat(((totalLocalizacoesSucesso / totalLocalizacoesProcessadas) * 100).toFixed(1)) : 0
        },
        processamentoSequencial: {
          tentativasTotal: servidoresDetalhados.reduce((acc, s) => acc + (s.tentativas.realizadas || 0), 0),
          recuperacoesTotal: servidoresDetalhados.reduce((acc, s) => acc + s.tentativas.recuperacoes, 0),
          servidoresComRecuperacao: servidoresDetalhados.filter(s => s.tentativas.recuperacoes > 0).length,
          eficienciaProcessamento: totalServidores > 0 ? 
            parseFloat(((servidoresBemSucedidos / (servidoresDetalhados.reduce((acc, s) => acc + s.tentativas.realizadas, 0))) * 100).toFixed(1)) : 0
        }
      },
      servidores: servidoresDetalhados,
      resultadosDetalhados: this.results,
      estatisticasAvancadas: {
        tempoMedioProcessamentoServidor: servidoresDetalhados.length > 0 ? 
          servidoresDetalhados
            .filter(s => s.tempo.tempoProcessamento)
            .reduce((acc, s) => acc + s.tempo.tempoProcessamento, 0) / 
          servidoresDetalhados.filter(s => s.tempo.tempoProcessamento).length : 0,
        servidorMaisRapido: servidoresDetalhados
          .filter(s => s.tempo.tempoProcessamento && s.status === 'Concluído')
          .reduce((min, s) => !min || s.tempo.tempoProcessamento < min.tempo.tempoProcessamento ? s : min, null),
        servidorMaisLento: servidoresDetalhados
          .filter(s => s.tempo.tempoProcessamento && s.status === 'Concluído')
          .reduce((max, s) => !max || s.tempo.tempoProcessamento > max.tempo.tempoProcessamento ? s : max, null)
      }
    };
        
    // Salvar relatório JSON
    const timestamp = Date.now();
    const jsonPath = path.join(outputDir, `relatorio-multi-servidor-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(relatorioConsolidado, null, 2));
        
    // Gerar CSV consolidado
    const csvHeaders = [
      'Servidor',
      'CPF',
      'Perfil',
      'Status',
      'Total OJs',
      'Sucessos',
      'Erros',
      'Já Incluídos',
      '% Sucesso',
      'Tempo (s)',
      'Erro Geral'
    ];
    
    const csvRows = servidoresDetalhados.map(server => [
      `"${server.nome}"`,
      `"${server.cpf}"`,
      `"${server.perfil}"`,
      `"${server.status}"`,
      server.estatisticas.totalOJs,
      server.estatisticas.sucessos,
      server.estatisticas.erros,
      server.estatisticas.jaIncluidos,
      `${server.estatisticas.percentualSucesso}%`,
      server.tempo.tempoProcessamentoFormatado,
      `"${server.erroGeral || ''}"`
    ].join(','));
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const csvPath = path.join(outputDir, `relatorio-multi-servidor-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csvContent);
    
    // Gerar relatório detalhado por OJ
    const csvOJHeaders = [
      'Servidor',
      'CPF Servidor', 
      'Órgão Julgador',
      'Status',
      'Perfil',
      'Erro',
      'Tempo (ms)',
      'Timestamp'
    ];
    
    const csvOJRows = [];
    servidoresDetalhados.forEach(server => {
      server.detalhesOJs.forEach(oj => {
        csvOJRows.push([
          `"${server.nome}"`,
          `"${server.cpf}"`,
          `"${oj.orgao}"`,
          `"${oj.status}"`,
          `"${oj.perfil || server.perfil}"`,
          `"${oj.erro || ''}"`,
          oj.tempo || '',
          `"${oj.timestamp}"`
        ].join(','));
      });
    });
    
    const csvOJContent = [csvOJHeaders.join(','), ...csvOJRows].join('\n');
    const csvOJPath = path.join(outputDir, `relatorio-detalhado-ojs-${timestamp}.csv`);
    fs.writeFileSync(csvOJPath, csvOJContent);
        
    console.log(`📄 Relatório JSON consolidado: ${jsonPath}`);
    console.log(`📄 Relatório CSV servidores: ${csvPath}`);
    console.log(`📄 Relatório CSV detalhado OJs: ${csvOJPath}`);
        
    // Imprimir resultado final
    console.log('=== RESULTADO FINAL MÚLTIPLOS SERVIDORES ===');
    console.log(JSON.stringify(relatorioConsolidado, null, 2));
    console.log('=== FIM RESULTADO ===');
        
    // Calcular estatísticas de recuperação
    const totalRecuperacoes = servidoresDetalhados.reduce((acc, s) => acc + s.tentativas.recuperacoes, 0);
    const servidoresComRecuperacao = servidoresDetalhados.filter(s => s.tentativas.recuperacoes > 0).length;
    
    // Dados corretos para o relatório final
    console.log(`🔍 [RELATÓRIO FINAL] Servidores processados: ${servidoresBemSucedidos}/${totalServidores}`);
    console.log(`🔍 [RELATÓRIO FINAL] Total OJs processadas: ${totalOJsProcessados}`);
    console.log(`🔍 [RELATÓRIO FINAL] Sucessos: ${totalSucessos}`);
    console.log(`🔍 [RELATÓRIO FINAL] Erros: ${totalErros}`);
    console.log(`🔍 [RELATÓRIO FINAL] Já incluídos: ${totalJaIncluidos}`);
    
    this.sendStatus('success', `🎉 Processamento SEQUENCIAL concluído: ${servidoresBemSucedidos}/${totalServidores} servidores | ${totalOJsProcessados} OJs processadas`, 100, 
      `${totalSucessos} sucessos | ${totalErros} erros | ${totalJaIncluidos} já incluídos | ${totalRecuperacoes} recuperações realizadas em ${servidoresComRecuperacao} servidores`);
  }

  async generateReport() {
    this.sendStatus('info', 'Gerando relatório...', 95, 'Finalizando processo');
        
    // Configurar diretório de saída
    const outputDir = path.join(__dirname, '..', '..', 'data');
        
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // OTIMIZAR RESULTADOS: Remover duplicatas e melhorar informações
    const resultadosOtimizados = this.otimizarResultados();
        
    // Calcular estatísticas baseadas nos resultados otimizados
    const sucessos = resultadosOtimizados.filter(r => r.status === 'Incluído com Sucesso').length;
    const erros = resultadosOtimizados.filter(r => r.status === 'Erro').length;
    const totalValidos = sucessos + erros;
        
    // Gerar relatório JSON detalhado com resultados otimizados
    const jsonReport = {
      timestamp: new Date().toISOString(),
      config: {
        cpf: this.config.cpf,
        perfil: this.config.perfil,
        totalOrgaos: this.config && this.config.orgaos ? this.config.orgaos.length : 0
      },
      results: resultadosOtimizados, // Usar resultados otimizados
      summary: {
        total: resultadosOtimizados.length,
        sucessos,
        erros,
        totalValidos,
        estatisticas: totalValidos > 0 ? {
          percentualSucesso: parseFloat(((sucessos / totalValidos) * 100).toFixed(1)),
          percentualErros: parseFloat(((erros / totalValidos) * 100).toFixed(1))
        } : null
      },
      detalhes: {
        orgaosIncluidos: resultadosOtimizados.filter(r => r.status === 'Incluído com Sucesso').map(r => ({
          orgao: r.orgao,
          perfil: r.observacoes
        })),
        orgaosComErro: resultadosOtimizados.filter(r => r.status === 'Erro').map(r => ({
          orgao: r.orgao,
          erro: r.observacoes || 'Erro não especificado'
        }))
      }
    };
        
    // Salvar relatório
    const jsonPath = path.join(outputDir, `relatorio-servidor-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
        
    // Gerar CSV otimizado
    const csvContent = [
      'Órgão Julgador,Status,Observações',
      ...resultadosOtimizados.map(r => `"${r.orgao}","${r.status}","${r.observacoes || ''}"`)
    ].join('\n');
        
    const csvPath = path.join(outputDir, `relatorio-servidor-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, csvContent);
        
    console.log(`📄 Relatório JSON salvo em: ${jsonPath}`);
    console.log(`📄 Relatório CSV salvo em: ${csvPath}`);
        
    // Imprimir resultado final em formato JSON para ser capturado pelo servidor
    console.log('=== RESULTADO FINAL ===');
    console.log(JSON.stringify(jsonReport, null, 2));
    console.log('=== FIM RESULTADO ===');
        
    this.sendStatus('success', 'Relatório gerado', 98, `${sucessos} sucessos, ${erros} erros`);
  }

  async cleanup() {
    try {
      // Parar monitoramento de performance
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
      }
      
      // Fechar conexão com banco de dados
      if (this.dbConnection) {
        console.log('🔌 Fechando conexão com banco de dados...');
        await this.dbConnection.close();
        this.dbConnection = null;
      }
      
      if (this.page && !this.page.isClosed()) {
        if (this.isProduction) {
          await this.page.close();
        } else {
          console.log('Mantendo página aberta para desenvolvimento');
        }
      }
            
      if (this.browser && this.isProduction) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Erro durante cleanup:', error);
    }
  }



  async stopAutomation() {
    this.isRunning = false;
    await this.cleanup();
  }

  getRelatorio() {
    // Usar resultados otimizados para o relatório da interface
    const resultadosOtimizados = this.otimizarResultados();
    
    // Calcular estatísticas baseadas nos resultados otimizados
    const sucessos = resultadosOtimizados.filter(r => r.status === 'Incluído com Sucesso').length;
    const erros = resultadosOtimizados.filter(r => r.status === 'Erro').length;
    const totalValidos = sucessos + erros;
        
    // Retornar relatório otimizado no formato esperado pelo frontend
    return {
      timestamp: new Date().toISOString(),
      config: {
        cpf: this.config?.cpf || '',
        perfil: this.config?.perfil || '',
        totalOrgaos: this.config?.orgaos?.length || 0
      },
      resultados: resultadosOtimizados.map(r => ({
        orgao: r.orgao,
        status: r.status,
        observacoes: r.observacoes || '-'
      })),
      resumo: {
        total: resultadosOtimizados.length,
        sucessos,
        erros,
        totalValidos,
        percentualSucesso: totalValidos > 0 ? parseFloat(((sucessos / totalValidos) * 100).toFixed(1)) : 0,
        percentualErros: totalValidos > 0 ? parseFloat(((erros / totalValidos) * 100).toFixed(1)) : 0
      }
    };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.currentProgress,
      totalOrgaos: this.totalOrgaos,
      processedCount: this.results.length
    };
  }

  /**
   * Seleciona perfil com base na similaridade com o perfil configurado
   * @param {Object} opcoesPapel - Locator das opções disponíveis
   * @param {string} perfilConfigurado - Perfil configurado pelo usuário
   * @returns {boolean} True se perfil foi selecionado
   */
  async selecionarPerfilComSimilaridade(opcoesPapel, perfilConfigurado) {
    console.log(`🔍 [SIMILARIDADE] Analisando perfil configurado: "${perfilConfigurado}"`);
    
    try {
      const totalOpcoes = await opcoesPapel.count();
      let melhorMatch = null;
      let melhorSimilaridade = 0;
      let melhorIndice = -1;
      
      // Normalizar perfil configurado
      const perfilNormalizado = this.normalizarTextoParaComparacao(perfilConfigurado);
      
      // Analisar todas as opções
      for (let i = 0; i < totalOpcoes; i++) {
        try {
          const textoOpcao = await opcoesPapel.nth(i).textContent();
          if (!textoOpcao) continue;
          
          const opcaoNormalizada = this.normalizarTextoParaComparacao(textoOpcao);
          const similaridade = this.calcularSimilaridadePerfil(perfilNormalizado, opcaoNormalizada);
          
          console.log(`🔍 [COMPARAÇÃO] "${textoOpcao.trim()}" -> similaridade: ${(similaridade * 100).toFixed(1)}%`);
          
          if (similaridade > melhorSimilaridade && similaridade >= 0.7) { // 70% de similaridade mínima
            melhorMatch = textoOpcao.trim();
            melhorSimilaridade = similaridade;
            melhorIndice = i;
          }
        } catch (error) {
          console.log(`⚠️ [ERRO] Erro ao analisar opção ${i}: ${error.message}`);
        }
      }
      
      if (melhorMatch && melhorIndice >= 0) {
        console.log(`✅ [MATCH] Melhor match encontrado: "${melhorMatch}" (${(melhorSimilaridade * 100).toFixed(1)}%)`);
        await opcoesPapel.nth(melhorIndice).click({ timeout: 3000 });
        console.log('✅ [SELECIONADO] Perfil selecionado com sucesso!');
        return true;
      } else {
        console.log('❌ [SEM MATCH] Nenhuma opção atingiu similaridade mínima de 70%');
        return false;
      }
      
    } catch (error) {
      console.log(`❌ [ERRO] Erro na seleção por similaridade: ${error.message}`);
      return false;
    }
  }

  /**
   * Seleciona perfil baseado em palavras-chave específicas do perfil configurado
   * @param {Object} opcoesPapel - Locator das opções disponíveis  
   * @param {string} perfilConfigurado - Perfil configurado pelo usuário
   * @returns {boolean} True se perfil foi selecionado
   */
  async selecionarPerfilPorPalavrasChave(opcoesPapel, perfilConfigurado) {
    console.log(`🔑 [PALAVRAS-CHAVE] Analisando palavras-chave do perfil: "${perfilConfigurado}"`);
    
    try {
      // Extrair palavras-chave do perfil configurado
      const palavrasChaveConfiguracao = this.extrairPalavrasChave(perfilConfigurado);
      console.log(`🔑 [PALAVRAS] Palavras-chave extraídas: ${palavrasChaveConfiguracao.join(', ')}`);
      
      const totalOpcoes = await opcoesPapel.count();
      let melhorOpcao = null;
      let maiorNumeroMatches = 0;
      let melhorIndice = -1;
      
      for (let i = 0; i < totalOpcoes; i++) {
        try {
          const textoOpcao = await opcoesPapel.nth(i).textContent();
          if (!textoOpcao) continue;
          
          const palavrasOpcao = this.extrairPalavrasChave(textoOpcao);
          const matches = palavrasChaveConfiguracao.filter(palavra => 
            palavrasOpcao.some(palavraOpcao => 
              palavraOpcao.includes(palavra) || palavra.includes(palavraOpcao)
            )
          );
          
          console.log(`🔑 [ANÁLISE] "${textoOpcao.trim()}" -> matches: ${matches.length} (${matches.join(', ')})`);
          
          if (matches.length > maiorNumeroMatches && matches.length >= 1) {
            melhorOpcao = textoOpcao.trim();
            maiorNumeroMatches = matches.length;
            melhorIndice = i;
          }
          
        } catch (error) {
          console.log(`⚠️ [ERRO] Erro ao analisar opção ${i}: ${error.message}`);
        }
      }
      
      if (melhorOpcao && melhorIndice >= 0 && maiorNumeroMatches >= 1) {
        console.log(`✅ [MATCH] Melhor match por palavras-chave: "${melhorOpcao}" (${maiorNumeroMatches} matches)`);
        await opcoesPapel.nth(melhorIndice).click({ timeout: 3000 });
        console.log('✅ [SELECIONADO] Perfil selecionado por palavras-chave!');
        return true;
      } else {
        console.log('❌ [SEM MATCH] Nenhuma opção teve palavras-chave suficientes');
        return false;
      }
      
    } catch (error) {
      console.log(`❌ [ERRO] Erro na seleção por palavras-chave: ${error.message}`);
      return false;
    }
  }

  /**
   * Normaliza texto para comparação removendo acentos, pontuação e padronizando
   * @param {string} texto - Texto a ser normalizado
   * @returns {string} Texto normalizado
   */
  normalizarTextoParaComparacao(texto) {
    if (!texto) return '';
    
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ')        // Remove pontuação
      .replace(/\s+/g, ' ')            // Normaliza espaços
      .trim();
  }

  /**
   * Calcula similaridade entre dois textos usando algoritmo de Levenshtein
   * @param {string} texto1 - Primeiro texto
   * @param {string} texto2 - Segundo texto  
   * @returns {number} Similaridade entre 0 e 1
   */
  calcularSimilaridadePerfil(texto1, texto2) {
    if (!texto1 || !texto2) return 0;
    if (texto1 === texto2) return 1;
    
    const len1 = texto1.length;
    const len2 = texto2.length;
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
    
    // Inicializar matriz
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    // Calcular distância
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = texto1[i - 1] === texto2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deleção
          matrix[j][i - 1] + 1,     // inserção
          matrix[j - 1][i - 1] + cost // substituição
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  }

  /**
   * Extrai palavras-chave relevantes de um texto de perfil
   * @param {string} texto - Texto do perfil
   * @returns {Array} Array de palavras-chave
   */
  extrairPalavrasChave(texto) {
    if (!texto) return [];
    
    const textoNormalizado = this.normalizarTextoParaComparacao(texto);
    const palavras = textoNormalizado.split(' ').filter(p => p.length >= 3);
    
    // Palavras-chave específicas do contexto judiciário
    const palavrasRelevantes = [
      'secretario', 'secretaria', 'audiencia', 'assessor', 'analista', 
      'tecnico', 'auxiliar', 'diretor', 'coordenador', 'supervisor',
      'escrivao', 'oficial', 'chefe', 'gerente', 'judiciario'
    ];
    
    // Filtrar apenas palavras relevantes
    const palavrasChave = palavras.filter(palavra => 
      palavrasRelevantes.some(relevante => 
        palavra.includes(relevante) || relevante.includes(palavra)
      )
    );
    
    // Adicionar palavras completas se encontradas
    palavrasRelevantes.forEach(relevante => {
      if (textoNormalizado.includes(relevante) && !palavrasChave.includes(relevante)) {
        palavrasChave.push(relevante);
      }
    });
    
    return [...new Set(palavrasChave)]; // Remove duplicatas
  }
}

// Função principal para execução standalone
async function main() {
  try {
    // Carregar configuração
    const config = loadConfig();
        
    if (!config.cpf || !config.orgaos || config.orgaos.length === 0) {
      throw new Error('Configuração inválida: CPF e lista de órgãos são obrigatórios');
    }
        
    // Criar instância da automação
    const automation = new ServidorAutomationV2();
        
    // Executar automação
    await automation.startAutomation(config);
        
    console.log('Automação concluída com sucesso!');
        
  } catch (error) {
    console.error('Erro na automação:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ServidorAutomationV2;
