/**
 * Sistema de timeouts adaptativos para o PJE Perito Automation
 * Implementa timeouts inteligentes baseados no contexto e histórico de performance
 */

class TimeoutManager {
  /**
   * Configurações base de timeout por tipo de operação
   * Valores otimizados baseados na análise de performance
   */
  static TIMEOUTS_BASE = {
    // Navegação e carregamento de página
    navegacao: {
      carregarPagina: 12000,     // Reduzido de 15000
      redirecionamento: 8000,    // Reduzido de 10000
      aguardarElemento: 4000,    // Reduzido de 5000
      aguardarModal: 3000,       // Novo: para modais
      aguardarOverlay: 2000      // Novo: para overlays
    },
    
    // Autenticação
    autenticacao: {
      botaoLogin: 2500,          // Reduzido de 3000
      preencherCampos: 1500,     // Reduzido de 2000
      aguardarRedirect: 6000,    // Reduzido de 8000
      validarLogin: 3000         // Novo: para validação de login
    },
    
    // Interações com elementos
    interacao: {
      clicar: 800,               // Reduzido de 1000
      digitar: 400,              // Reduzido de 500
      aguardarResposta: 2500,    // Reduzido de 3000
      aguardarElemento: 2000,    // Novo: aguardar elemento aparecer
      validarAcao: 1500,         // Novo: validar se ação teve efeito
      estabilizar: 500           // Novo: aguardar estabilização do DOM
    },
    
    // Operações com dropdowns e seletores
    dropdown: {
      abrir: 1500,               // Reduzido de 2000
      carregarOpcoes: 2500,      // Reduzido de 3000
      selecionar: 1200,          // Reduzido de 1500
      fechar: 800,               // Novo: para fechar dropdown
      buscarOpcao: 2000          // Novo: para buscar opção específica
    },
    
    // Operações específicas do PJE
    pje: {
      abrirAcordeao: 1800,       // Reduzido de 2000
      buscarOJ: 3500,            // Reduzido de 4000
      vincularOJ: 5000,          // Reduzido de 6000
      verificarVinculo: 2500,    // Reduzido de 3000
      confirmarAcao: 2000,       // Novo: para confirmações
      aguardarProcessamento: 4000, // Novo: para processamento
      validarResultado: 1500     // Novo: para validar resultado
    }
  };

  /**
   * Multiplicadores baseados na performance da rede/sistema
   * Valores otimizados para melhor responsividade
   */
  static MULTIPLICADORES = {
    rapido: 0.6,      // Sistema rápido - mais agressivo
    normal: 1.0,      // Performance normal
    lento: 1.3,       // Sistema lento - menos penalização
    muitoLento: 1.8,  // Sistema muito lento - reduzido de 2.0
    ultraRapido: 0.4  // Novo: para sistemas muito rápidos
  };

  /**
   * Histórico de performance para adaptação dinâmica
   */
  static historicoPerformance = {
    temposResposta: [],
    falhas: 0,
    sucessos: 0,
    ultimaAvaliacao: Date.now()
  };

  /**
   * Configuração atual do sistema
   */
  static configuracaoAtual = {
    multiplicador: 1.0,
    nivelPerformance: 'normal',
    adaptativo: true
  };

  /**
   * Obtém timeout adaptativo para uma operação específica
   * @param {string} categoria - Categoria da operação (navegacao, autenticacao, etc.)
   * @param {string} operacao - Operação específica
   * @param {Object} opcoes - Opções adicionais
   * @returns {number} Timeout em milissegundos
   */
  static obterTimeout(categoria, operacao, opcoes = {}) {
    const {
      multiplicadorCustom = null,
      minimo = 500,
      maximo = 30000,
      tentativa = 1
    } = opcoes;

    // Obter timeout base
    const timeoutBase = this.TIMEOUTS_BASE[categoria]?.[operacao] || 3000;
    
    // Aplicar multiplicador
    let multiplicador = multiplicadorCustom || this.configuracaoAtual.multiplicador;
    
    // Aumentar timeout para tentativas subsequentes
    if (tentativa > 1) {
      multiplicador *= Math.min(1 + (tentativa - 1) * 0.3, 2.5);
    }
    
    // Calcular timeout final
    let timeoutFinal = Math.round(timeoutBase * multiplicador);
    
    // Aplicar limites
    timeoutFinal = Math.max(minimo, Math.min(maximo, timeoutFinal));
    
    console.log(`[TimeoutManager] ${categoria}.${operacao}: ${timeoutFinal}ms (base: ${timeoutBase}ms, mult: ${multiplicador.toFixed(2)}, tentativa: ${tentativa})`);
    
    return timeoutFinal;
  }

  /**
   * Registra o tempo de resposta de uma operação
   * @param {string} operacao - Nome da operação
   * @param {number} tempoInicio - Timestamp de início
   * @param {boolean} sucesso - Se a operação foi bem-sucedida
   */
  static registrarPerformance(operacao, tempoInicio, sucesso = true) {
    const tempoResposta = Date.now() - tempoInicio;
    
    this.historicoPerformance.temposResposta.push({
      operacao,
      tempo: tempoResposta,
      sucesso,
      timestamp: Date.now()
    });
    
    // Manter apenas os últimos 50 registros
    if (this.historicoPerformance.temposResposta.length > 50) {
      this.historicoPerformance.temposResposta.shift();
    }
    
    // Atualizar contadores
    if (sucesso) {
      this.historicoPerformance.sucessos++;
    } else {
      this.historicoPerformance.falhas++;
    }
    
    // Reavaliar performance a cada 10 operações ou 5 minutos
    const agora = Date.now();
    const tempoDesdeUltimaAvaliacao = agora - this.historicoPerformance.ultimaAvaliacao;
    const totalOperacoes = this.historicoPerformance.sucessos + this.historicoPerformance.falhas;
    
    if (totalOperacoes % 10 === 0 || tempoDesdeUltimaAvaliacao > 300000) {
      this.reavaliarPerformance();
    }
    
    console.log(`[TimeoutManager] Performance registrada: ${operacao} - ${tempoResposta}ms - ${sucesso ? 'sucesso' : 'falha'}`);
  }

  /**
   * Reavalia a performance do sistema e ajusta multiplicadores
   */
  static reavaliarPerformance() {
    const { temposResposta, sucessos, falhas } = this.historicoPerformance;
    
    if (temposResposta.length < 5) {
      return; // Dados insuficientes
    }
    
    // Calcular métricas
    const temposRecentes = temposResposta.slice(-20); // Últimas 20 operações
    const tempoMedio = temposRecentes.reduce((acc, item) => acc + item.tempo, 0) / temposRecentes.length;
    const taxaSucesso = sucessos / (sucessos + falhas);
    
    // Determinar nível de performance com critérios otimizados
    let novoNivel = 'normal';
    let novoMultiplicador = 1.0;
    
    if (tempoMedio < 500 && taxaSucesso > 0.95) {
      novoNivel = 'ultraRapido';
      novoMultiplicador = this.MULTIPLICADORES.ultraRapido;
    } else if (tempoMedio < 800 && taxaSucesso > 0.9) {
      novoNivel = 'rapido';
      novoMultiplicador = this.MULTIPLICADORES.rapido;
    } else if (tempoMedio > 2500 || taxaSucesso < 0.75) {
      novoNivel = 'lento';
      novoMultiplicador = this.MULTIPLICADORES.lento;
    } else if (tempoMedio > 4000 || taxaSucesso < 0.6) {
      novoNivel = 'muitoLento';
      novoMultiplicador = this.MULTIPLICADORES.muitoLento;
    }
    
    // Atualizar configuração
    const nivelAnterior = this.configuracaoAtual.nivelPerformance;
    this.configuracaoAtual.nivelPerformance = novoNivel;
    this.configuracaoAtual.multiplicador = novoMultiplicador;
    this.historicoPerformance.ultimaAvaliacao = Date.now();
    
    if (nivelAnterior !== novoNivel) {
      console.log(`[TimeoutManager] Performance reavaliada: ${nivelAnterior} -> ${novoNivel} (multiplicador: ${novoMultiplicador})`);
      console.log(`[TimeoutManager] Métricas: tempo médio ${tempoMedio.toFixed(0)}ms, taxa sucesso ${(taxaSucesso * 100).toFixed(1)}%`);
    }
  }

  /**
   * Executa uma operação com timeout adaptativo e retry
   * @param {Function} operacao - Função a ser executada
   * @param {string} categoria - Categoria da operação
   * @param {string} nome - Nome da operação
   * @param {Object} opcoes - Opções de configuração
   * @returns {Promise} Resultado da operação
   */
  static async executarComTimeout(operacao, categoria, nome, opcoes = {}) {
    const {
      maxTentativas = 3,
      delayEntreTentativas = 1000,
      timeoutCustom = null,
      onTentativa = null,
      onFalha = null
    } = opcoes;

    let ultimoErro = null;
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      const tempoInicio = Date.now();
      
      try {
        // Callback de tentativa
        if (onTentativa) {
          await onTentativa(tentativa, maxTentativas);
        }
        
        // Obter timeout para esta tentativa
        const timeout = timeoutCustom || this.obterTimeout(categoria, nome, { tentativa });
        
        // Executar operação com timeout
        const resultado = await Promise.race([
          operacao(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout de ${timeout}ms excedido`)), timeout)
          )
        ]);
        
        // Registrar sucesso
        this.registrarPerformance(`${categoria}.${nome}`, tempoInicio, true);
        
        return resultado;
        
      } catch (error) {
        ultimoErro = error;
        
        // Registrar falha
        this.registrarPerformance(`${categoria}.${nome}`, tempoInicio, false);
        
        console.log(`[TimeoutManager] Tentativa ${tentativa}/${maxTentativas} falhou: ${error.message}`);
        
        // Callback de falha
        if (onFalha) {
          await onFalha(error, tentativa, maxTentativas);
        }
        
        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (tentativa < maxTentativas) {
          const delay = delayEntreTentativas * tentativa; // Delay progressivo
          console.log(`[TimeoutManager] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Operação ${categoria}.${nome} falhou após ${maxTentativas} tentativas. Último erro: ${ultimoErro?.message}`);
  }

  /**
   * Cria um timeout progressivo otimizado que aumenta a cada tentativa
   * @param {number} timeoutBase - Timeout base em ms
   * @param {number} tentativa - Número da tentativa atual
   * @param {number} fatorCrescimento - Fator de crescimento por tentativa
   * @param {number} limiteMaximo - Limite máximo para o timeout
   * @returns {number} Timeout calculado
   */
  static timeoutProgressivo(timeoutBase, tentativa, fatorCrescimento = 1.3, limiteMaximo = 15000) {
    const timeoutCalculado = Math.round(timeoutBase * Math.pow(fatorCrescimento, tentativa - 1));
    return Math.min(timeoutCalculado, limiteMaximo);
  }

  /**
   * Obtém timeout baseado no contexto da operação
   * @param {string} contexto - Contexto da operação (critico, normal, background)
   * @param {number} timeoutBase - Timeout base
   * @returns {number} Timeout ajustado
   */
  static timeoutPorContexto(contexto, timeoutBase) {
    const multiplicadoresContexto = {
      critico: 0.8,     // Operações críticas - mais rápido
      normal: 1.0,      // Operações normais
      background: 1.5,  // Operações em background - mais tolerante
      validacao: 0.6    // Validações rápidas
    };

    const multiplicador = multiplicadoresContexto[contexto] || 1.0;
    return Math.round(timeoutBase * multiplicador * this.configuracaoAtual.multiplicador);
  }

  /**
   * Obtém estatísticas de performance
   * @returns {Object} Estatísticas detalhadas
   */
  static obterEstatisticas() {
    const { temposResposta, sucessos, falhas } = this.historicoPerformance;
    
    if (temposResposta.length === 0) {
      return {
        totalOperacoes: 0,
        taxaSucesso: 0,
        tempoMedio: 0,
        tempoMinimo: 0,
        tempoMaximo: 0,
        nivelPerformance: this.configuracaoAtual.nivelPerformance
      };
    }
    
    const tempos = temposResposta.map(item => item.tempo);
    const tempoMedio = tempos.reduce((acc, tempo) => acc + tempo, 0) / tempos.length;
    const tempoMinimo = Math.min(...tempos);
    const tempoMaximo = Math.max(...tempos);
    const taxaSucesso = sucessos / (sucessos + falhas);
    
    return {
      totalOperacoes: sucessos + falhas,
      taxaSucesso,
      tempoMedio,
      tempoMinimo,
      tempoMaximo,
      nivelPerformance: this.configuracaoAtual.nivelPerformance,
      multiplicadorAtual: this.configuracaoAtual.multiplicador,
      ultimasOperacoes: temposResposta.slice(-10)
    };
  }

  /**
   * Reseta o histórico de performance
   */
  static resetarHistorico() {
    this.historicoPerformance = {
      temposResposta: [],
      falhas: 0,
      sucessos: 0,
      ultimaAvaliacao: Date.now()
    };
    
    this.configuracaoAtual = {
      multiplicador: 1.0,
      nivelPerformance: 'normal',
      adaptativo: true
    };
    
    console.log('[TimeoutManager] Histórico de performance resetado');
  }

  /**
   * Configura o sistema para um modo específico
   * @param {string} modo - Modo de operação (ultraRapido, rapido, normal, lento, muitoLento)
   */
  static configurarModo(modo) {
    if (!this.MULTIPLICADORES[modo]) {
      throw new Error(`Modo '${modo}' não é válido. Modos disponíveis: ${Object.keys(this.MULTIPLICADORES).join(', ')}`);
    }
    
    this.configuracaoAtual.nivelPerformance = modo;
    this.configuracaoAtual.multiplicador = this.MULTIPLICADORES[modo];
    this.configuracaoAtual.adaptativo = false;
    
    console.log(`[TimeoutManager] Modo configurado para: ${modo} (multiplicador: ${this.MULTIPLICADORES[modo]})`);
  }

  /**
   * Habilita ou desabilita o modo adaptativo
   * @param {boolean} ativo - Se o modo adaptativo deve estar ativo
   */
  static configurarAdaptativo(ativo) {
    this.configuracaoAtual.adaptativo = ativo;
    
    if (ativo) {
      console.log('[TimeoutManager] Modo adaptativo habilitado');
    } else {
      console.log('[TimeoutManager] Modo adaptativo desabilitado');
    }
  }
}

module.exports = TimeoutManager;