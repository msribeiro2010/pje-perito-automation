/**
 * Sistema de Monitoramento de Performance em Tempo Real
 * Coleta métricas de performance, detecta gargalos e otimiza automaticamente
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      navigation: {
        totalTime: 0,
        count: 0,
        averageTime: 0,
        slowestUrl: null,
        slowestTime: 0
      },
      clicks: {
        totalTime: 0,
        count: 0,
        averageTime: 0,
        slowestSelector: null,
        slowestTime: 0
      },
      elementSearch: {
        totalTime: 0,
        count: 0,
        averageTime: 0,
        slowestSelector: null,
        slowestTime: 0
      },
      pjeOperations: {
        totalTime: 0,
        count: 0,
        averageTime: 0,
        slowestOperation: null,
        slowestTime: 0
      },
      memory: {
        current: 0,
        peak: 0,
        samples: []
      },
      cpu: {
        current: 0,
        peak: 0,
        samples: []
      }
    };
    
    this.thresholds = {
      navigation: 5000, // 5s
      click: 2000, // 2s
      elementSearch: 3000, // 3s
      pjeOperation: 10000, // 10s
      memoryWarning: 500 * 1024 * 1024, // 500MB
      cpuWarning: 80 // 80%
    };
    
    this.alerts = [];
    this.optimizations = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Histórico de performance por hora
    this.hourlyStats = new Map();
    
    // Detecção de padrões
    this.patterns = {
      slowPeriods: [],
      fastPeriods: [],
      bottlenecks: new Map()
    };
  }
  
  /**
   * Inicia o monitoramento de performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Iniciando monitoramento de performance...');
    
    // Monitoramento a cada 30 segundos
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformance();
      this.detectBottlenecks();
    }, 30000);
    
    // Coleta inicial
    this.collectSystemMetrics();
  }
  
  /**
   * Para o monitoramento de performance
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('⏹️ Monitoramento de performance parado');
  }
  
  /**
   * Registra uma operação de navegação
   */
  recordNavigation(url, duration) {
    const nav = this.metrics.navigation;
    nav.totalTime += duration;
    nav.count++;
    nav.averageTime = nav.totalTime / nav.count;
    
    if (duration > nav.slowestTime) {
      nav.slowestTime = duration;
      nav.slowestUrl = url;
    }
    
    // Verificar se excede threshold
    if (duration > this.thresholds.navigation) {
      this.addAlert('navigation', `Navegação lenta detectada: ${url} (${duration}ms)`, 'warning');
    }
    
    this.updateHourlyStats('navigation', duration);
  }
  
  /**
   * Registra uma operação de clique
   */
  recordClick(selector, duration) {
    const clicks = this.metrics.clicks;
    clicks.totalTime += duration;
    clicks.count++;
    clicks.averageTime = clicks.totalTime / clicks.count;
    
    if (duration > clicks.slowestTime) {
      clicks.slowestTime = duration;
      clicks.slowestSelector = selector;
    }
    
    if (duration > this.thresholds.click) {
      this.addAlert('click', `Clique lento detectado: ${selector} (${duration}ms)`, 'warning');
    }
    
    this.updateHourlyStats('click', duration);
  }
  
  /**
   * Registra uma busca por elemento
   */
  recordElementSearch(selector, duration, found = true) {
    const search = this.metrics.elementSearch;
    search.totalTime += duration;
    search.count++;
    search.averageTime = search.totalTime / search.count;
    
    if (duration > search.slowestTime) {
      search.slowestTime = duration;
      search.slowestSelector = selector;
    }
    
    if (duration > this.thresholds.elementSearch) {
      const status = found ? 'encontrado' : 'não encontrado';
      this.addAlert('elementSearch', `Busca lenta: ${selector} (${duration}ms, ${status})`, 'warning');
    }
    
    this.updateHourlyStats('elementSearch', duration);
  }
  
  /**
   * Registra uma operação PJE
   */
  recordPJEOperation(operation, duration) {
    const pje = this.metrics.pjeOperations;
    pje.totalTime += duration;
    pje.count++;
    pje.averageTime = pje.totalTime / pje.count;
    
    if (duration > pje.slowestTime) {
      pje.slowestTime = duration;
      pje.slowestOperation = operation;
    }
    
    if (duration > this.thresholds.pjeOperation) {
      this.addAlert('pjeOperation', `Operação PJE lenta: ${operation} (${duration}ms)`, 'error');
    }
    
    this.updateHourlyStats('pjeOperation', duration);
  }
  
  /**
   * Coleta métricas do sistema
   */
  collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const currentMemory = memUsage.heapUsed;
      
      // Atualizar métricas de memória
      this.metrics.memory.current = currentMemory;
      if (currentMemory > this.metrics.memory.peak) {
        this.metrics.memory.peak = currentMemory;
      }
      
      this.metrics.memory.samples.push({
        timestamp: Date.now(),
        value: currentMemory
      });
      
      // Manter apenas últimas 100 amostras
      if (this.metrics.memory.samples.length > 100) {
        this.metrics.memory.samples.shift();
      }
      
      // Verificar threshold de memória
      if (currentMemory > this.thresholds.memoryWarning) {
        this.addAlert('memory', `Alto uso de memória: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`, 'warning');
      }
      
      // CPU usage (aproximado baseado em tempo de execução)
      const cpuUsage = process.cpuUsage();
      const currentCPU = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      this.metrics.cpu.current = currentCPU;
      if (currentCPU > this.metrics.cpu.peak) {
        this.metrics.cpu.peak = currentCPU;
      }
      
      this.metrics.cpu.samples.push({
        timestamp: Date.now(),
        value: currentCPU
      });
      
      if (this.metrics.cpu.samples.length > 100) {
        this.metrics.cpu.samples.shift();
      }
      
    } catch (error) {
      console.warn('⚠️ Erro ao coletar métricas do sistema:', error.message);
    }
  }
  
  /**
   * Analisa performance e sugere otimizações
   */
  analyzePerformance() {
    const analysis = {
      overall: 'good',
      issues: [],
      suggestions: []
    };
    
    // Analisar navegação
    if (this.metrics.navigation.averageTime > this.thresholds.navigation * 0.7) {
      analysis.issues.push('Navegação lenta detectada');
      analysis.suggestions.push('Considere usar navegação otimizada ou cache de páginas');
      analysis.overall = 'warning';
    }
    
    // Analisar cliques
    if (this.metrics.clicks.averageTime > this.thresholds.click * 0.7) {
      analysis.issues.push('Cliques lentos detectados');
      analysis.suggestions.push('Verifique seletores e considere usar cache DOM');
      analysis.overall = 'warning';
    }
    
    // Analisar busca de elementos
    if (this.metrics.elementSearch.averageTime > this.thresholds.elementSearch * 0.7) {
      analysis.issues.push('Busca de elementos lenta');
      analysis.suggestions.push('Otimize seletores e implemente cache de elementos');
      analysis.overall = 'warning';
    }
    
    // Analisar operações PJE
    if (this.metrics.pjeOperations.averageTime > this.thresholds.pjeOperation * 0.7) {
      analysis.issues.push('Operações PJE lentas');
      analysis.suggestions.push('Implemente retry inteligente e otimize timeouts');
      analysis.overall = 'error';
    }
    
    // Salvar análise
    this.lastAnalysis = {
      timestamp: Date.now(),
      ...analysis
    };
    
    // Log se houver problemas
    if (analysis.overall !== 'good') {
      console.log(`📊 Análise de Performance [${analysis.overall.toUpperCase()}]:`);
      analysis.issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
      analysis.suggestions.forEach(suggestion => console.log(`  💡 ${suggestion}`));
    }
  }
  
  /**
   * Detecta gargalos de performance
   */
  detectBottlenecks() {
    const bottlenecks = [];
    
    // Detectar gargalo de navegação
    if (this.metrics.navigation.slowestTime > this.thresholds.navigation * 2) {
      bottlenecks.push({
        type: 'navigation',
        description: `URL mais lenta: ${this.metrics.navigation.slowestUrl}`,
        impact: 'high',
        time: this.metrics.navigation.slowestTime
      });
    }
    
    // Detectar gargalo de cliques
    if (this.metrics.clicks.slowestTime > this.thresholds.click * 2) {
      bottlenecks.push({
        type: 'click',
        description: `Seletor mais lento: ${this.metrics.clicks.slowestSelector}`,
        impact: 'medium',
        time: this.metrics.clicks.slowestTime
      });
    }
    
    // Detectar gargalo de busca
    if (this.metrics.elementSearch.slowestTime > this.thresholds.elementSearch * 2) {
      bottlenecks.push({
        type: 'elementSearch',
        description: `Busca mais lenta: ${this.metrics.elementSearch.slowestSelector}`,
        impact: 'medium',
        time: this.metrics.elementSearch.slowestTime
      });
    }
    
    // Salvar gargalos detectados
    if (bottlenecks.length > 0) {
      this.patterns.bottlenecks.set(Date.now(), bottlenecks);
      console.log('🚨 Gargalos detectados:');
      bottlenecks.forEach(bottleneck => {
        console.log(`  ${bottleneck.type}: ${bottleneck.description} (${bottleneck.time}ms)`);
      });
    }
  }
  
  /**
   * Adiciona um alerta
   */
  addAlert(type, message, severity = 'info') {
    const alert = {
      timestamp: Date.now(),
      type,
      message,
      severity
    };
    
    this.alerts.push(alert);
    
    // Manter apenas últimos 50 alertas
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    // Log baseado na severidade
    const icon = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${type.toUpperCase()}] ${message}`);
  }
  
  /**
   * Atualiza estatísticas por hora
   */
  updateHourlyStats(operation, duration) {
    const hour = new Date().getHours();
    
    if (!this.hourlyStats.has(hour)) {
      this.hourlyStats.set(hour, {
        navigation: { count: 0, totalTime: 0, avgTime: 0 },
        click: { count: 0, totalTime: 0, avgTime: 0 },
        elementSearch: { count: 0, totalTime: 0, avgTime: 0 },
        pjeOperation: { count: 0, totalTime: 0, avgTime: 0 }
      });
    }
    
    const hourStats = this.hourlyStats.get(hour);
    const opStats = hourStats[operation];
    
    opStats.count++;
    opStats.totalTime += duration;
    opStats.avgTime = opStats.totalTime / opStats.count;
  }
  
  /**
   * Obtém relatório de performance
   */
  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      alerts: [...this.alerts],
      analysis: this.lastAnalysis || null,
      bottlenecks: Array.from(this.patterns.bottlenecks.entries()),
      hourlyStats: Array.from(this.hourlyStats.entries()),
      recommendations: this.generateRecommendations()
    };
  }
  
  /**
   * Gera recomendações de otimização
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Recomendações baseadas em métricas
    if (this.metrics.navigation.averageTime > 3000) {
      recommendations.push({
        type: 'navigation',
        priority: 'high',
        description: 'Implementar cache de navegação e otimizar estratégias de carregamento'
      });
    }
    
    if (this.metrics.clicks.averageTime > 1500) {
      recommendations.push({
        type: 'interaction',
        priority: 'medium',
        description: 'Otimizar seletores e implementar cache DOM para elementos frequentes'
      });
    }
    
    if (this.metrics.elementSearch.averageTime > 2000) {
      recommendations.push({
        type: 'search',
        priority: 'medium',
        description: 'Melhorar estratégias de busca e implementar índices de elementos'
      });
    }
    
    if (this.metrics.memory.peak > this.thresholds.memoryWarning) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        description: 'Implementar limpeza de memória e otimizar uso de recursos'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Obtém métricas em tempo real
   */
  getRealTimeMetrics() {
    return {
      navigation: {
        avgTime: Math.round(this.metrics.navigation.averageTime),
        count: this.metrics.navigation.count,
        status: this.metrics.navigation.averageTime > this.thresholds.navigation ? 'slow' : 'good'
      },
      clicks: {
        avgTime: Math.round(this.metrics.clicks.averageTime),
        count: this.metrics.clicks.count,
        status: this.metrics.clicks.averageTime > this.thresholds.click ? 'slow' : 'good'
      },
      elementSearch: {
        avgTime: Math.round(this.metrics.elementSearch.averageTime),
        count: this.metrics.elementSearch.count,
        status: this.metrics.elementSearch.averageTime > this.thresholds.elementSearch ? 'slow' : 'good'
      },
      memory: {
        current: Math.round(this.metrics.memory.current / 1024 / 1024), // MB
        peak: Math.round(this.metrics.memory.peak / 1024 / 1024), // MB
        status: this.metrics.memory.current > this.thresholds.memoryWarning ? 'high' : 'normal'
      },
      alerts: this.alerts.slice(-5), // Últimos 5 alertas
      isMonitoring: this.isMonitoring
    };
  }
  
  /**
   * Limpa dados antigos
   */
  cleanup() {
    // Limpar alertas antigos (mais de 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
    
    // Limpar gargalos antigos (mais de 2 horas)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    for (const [timestamp] of this.patterns.bottlenecks) {
      if (timestamp < twoHoursAgo) {
        this.patterns.bottlenecks.delete(timestamp);
      }
    }
    
    // Limpar amostras antigas de memória e CPU
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    this.metrics.memory.samples = this.metrics.memory.samples.filter(
      sample => sample.timestamp > thirtyMinutesAgo
    );
    this.metrics.cpu.samples = this.metrics.cpu.samples.filter(
      sample => sample.timestamp > thirtyMinutesAgo
    );
  }
}

module.exports = PerformanceMonitor;