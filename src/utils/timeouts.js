/**
 * Sistema de timeouts adaptativos otimizado para o PJE Perito Automation
 * Implementa timeouts inteligentes com machine learning básico e otimizações avançadas
 */

class TimeoutManager {
  /**
   * Configurações base de timeout ultra-otimizadas
   * Valores baseados em análise de performance e testes extensivos
   */
  static TIMEOUTS_BASE = {
    // Navegação e carregamento de página - OTIMIZADO
    navegacao: {
      carregarPagina: 8000,      // Reduzido de 12000 - mais agressivo
      redirecionamento: 5000,    // Reduzido de 8000
      aguardarElemento: 2500,    // Reduzido de 4000
      aguardarModal: 1500,       // Reduzido de 3000
      aguardarOverlay: 1000,     // Reduzido de 2000
      networkIdle: 3000,         // Novo: aguardar rede estável
      domStable: 1000            // Novo: aguardar DOM estável
    },
    
    // Autenticação - OTIMIZADO
    autenticacao: {
      botaoLogin: 1500,          // Reduzido de 2500
      preencherCampos: 800,      // Reduzido de 1500
      aguardarRedirect: 4000,    // Reduzido de 6000
      validarLogin: 2000,        // Reduzido de 3000
      detectarCaptcha: 1000      // Novo: detectar captcha
    },
    
    // Interações com elementos - ULTRA OTIMIZADO
    interacao: {
      clicar: 400,               // Reduzido de 800 - muito mais rápido
      digitar: 200,              // Reduzido de 400
      aguardarResposta: 1500,    // Reduzido de 2500
      aguardarElemento: 8000,    // Aumentado para 8000ms para operações complexas
      validarAcao: 800,          // Reduzido de 1500
      estabilizar: 300,          // Reduzido de 500
      hover: 200,                // Novo: para hover
      focus: 150                 // Novo: para focus
    },
    
    // Operações com dropdowns e seletores - OTIMIZADO
    dropdown: {
      abrir: 1500,               // Aumentado para 1500ms
      carregarOpcoes: 3000,      // Aumentado para 3000ms
      selecionar: 1200,          // Aumentado para 1200ms
      fechar: 800,               // Aumentado para 800ms
      buscarOpcao: 2000,         // Mantido em 2000ms
      filtrar: 500               // Novo: para filtros
    },
    
    // Operações específicas do PJE - OTIMIZADO
    pje: {
      abrirAcordeao: 1000,       // Reduzido de 1800
      buscarOJ: 8000,            // Aumentado para 8000ms para dar mais tempo ao botão Adicionar
      vincularOJ: 15000,         // Aumentado para 15000ms para operações complexas
      verificarVinculo: 1500,    // Reduzido de 2500
      confirmarAcao: 1200,       // Reduzido de 2000
      aguardarProcessamento: 2500, // Reduzido de 4000
      validarResultado: 800,     // Reduzido de 1500
      salvarConfiguracao: 2000,  // Novo: para salvar
      carregarLista: 1500        // Novo: para carregar listas
    },
    
    // Operações de cache e otimização - NOVO
    cache: {
      verificarCache: 100,       // Verificação de cache
      atualizarCache: 200,       // Atualização de cache
      limparCache: 50            // Limpeza de cache
    }
  };

  /**
   * Multiplicadores baseados na performance da rede/sistema
   * Sistema inteligente com detecção automática de performance
   */
  static MULTIPLICADORES = {
    ultraRapido: 0.3,    // Sistema ultra rápido - máxima agressividade
    rapido: 0.5,         // Sistema rápido - muito agressivo
    normal: 1.0,         // Performance normal
    lento: 1.2,          // Sistema lento - penalização mínima
    muitoLento: 1.5,     // Sistema muito lento - reduzido ainda mais
    critico: 2.0         // Novo: para sistemas críticos
  };

  /**
   * Configurações de otimização avançada
   */
  static OTIMIZACOES = {
    // Detecção inteligente de elementos
    deteccaoInteligente: {
      tentativasMaximas: 3,
      intervaloBusca: 50,
      timeoutMinimo: 100
    },
    
    // Cache de elementos DOM
    cacheDom: {
      tamanhoMaximo: 100,
      tempoVida: 30000,  // 30 segundos
      limpezaAutomatica: true
    },
    
    // Paralelização de operações
    paralelizacao: {
      maxOperacoesSimultaneas: 3,
      timeoutOperacao: 5000,
      retryAutomatico: true
    },
    
    // Predição de performance
    predicao: {
      janelaTempo: 60000,    // 1 minuto
      minimoAmostras: 5,
      fatorConfianca: 0.8
    }
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
   * Sistema inteligente com predição avançada
   */
  static reavaliarPerformance() {
    const { temposResposta, sucessos, falhas } = this.historicoPerformance;
    
    if (temposResposta.length < this.OTIMIZACOES.predicao.minimoAmostras) {
      return; // Dados insuficientes
    }
    
    // Calcular métricas avançadas
    const temposRecentes = temposResposta.slice(-20); // Últimas 20 operações
    const tempoMedio = temposRecentes.reduce((acc, item) => acc + item.tempo, 0) / temposRecentes.length;
    const taxaSucesso = sucessos / (sucessos + falhas);
    const variancia = this.calcularVariancia(temposRecentes.map(item => item.tempo));
    const estabilidade = 1 / (1 + variancia / 1000); // Normaliza estabilidade
    
    // Sistema de pontuação ponderada
    const pontuacao = this.calcularPontuacaoPerformance(tempoMedio, taxaSucesso, estabilidade);
    
    // Determinar nível com base na pontuação
    let novoNivel = 'normal';
    let novoMultiplicador = 1.0;
    
    if (pontuacao >= 9 && taxaSucesso >= 0.98) {
      novoNivel = 'ultraRapido';
      novoMultiplicador = this.MULTIPLICADORES.ultraRapido;
    } else if (pontuacao >= 7 && taxaSucesso >= 0.92) {
      novoNivel = 'rapido';
      novoMultiplicador = this.MULTIPLICADORES.rapido;
    } else if (pontuacao >= 5 && taxaSucesso >= 0.8) {
      novoNivel = 'normal';
      novoMultiplicador = this.MULTIPLICADORES.normal;
    } else if (pontuacao >= 3 && taxaSucesso >= 0.6) {
      novoNivel = 'lento';
      novoMultiplicador = this.MULTIPLICADORES.lento;
    } else if (taxaSucesso >= 0.4) {
      novoNivel = 'muitoLento';
      novoMultiplicador = this.MULTIPLICADORES.muitoLento;
    } else {
      novoNivel = 'critico';
      novoMultiplicador = this.MULTIPLICADORES.critico;
    }
    
    // Atualizar configuração
    const nivelAnterior = this.configuracaoAtual.nivelPerformance;
    this.configuracaoAtual.nivelPerformance = novoNivel;
    this.configuracaoAtual.multiplicador = novoMultiplicador;
    this.historicoPerformance.ultimaAvaliacao = Date.now();
    
    if (nivelAnterior !== novoNivel) {
      console.log(`[TimeoutManager] Performance reavaliada: ${nivelAnterior} -> ${novoNivel} (multiplicador: ${novoMultiplicador})`);
      console.log(`[TimeoutManager] Métricas: pontuação ${pontuacao.toFixed(1)}, tempo médio ${tempoMedio.toFixed(0)}ms, taxa sucesso ${(taxaSucesso * 100).toFixed(1)}%, estabilidade ${(estabilidade * 100).toFixed(1)}%`);
    }
  }

  /**
   * Calcula variância dos tempos de resposta
   */
  static calcularVariancia(tempos) {
    if (tempos.length < 2) return 0;
    
    const media = tempos.reduce((acc, t) => acc + t, 0) / tempos.length;
    const somaQuadrados = tempos.reduce((acc, t) => acc + Math.pow(t - media, 2), 0);
    return somaQuadrados / (tempos.length - 1);
  }

  /**
   * Calcula pontuação de performance baseada em múltiplos fatores
   */
  static calcularPontuacaoPerformance(tempoMedio, taxaSucesso, estabilidade) {
    // Pontuação baseada no tempo (0-4 pontos)
    let pontuacaoTempo = 0;
    if (tempoMedio < 300) pontuacaoTempo = 4;
    else if (tempoMedio < 600) pontuacaoTempo = 3;
    else if (tempoMedio < 1200) pontuacaoTempo = 2;
    else if (tempoMedio < 2500) pontuacaoTempo = 1;
    
    // Pontuação baseada na taxa de sucesso (0-4 pontos)
    const pontuacaoSucesso = taxaSucesso * 4;
    
    // Pontuação baseada na estabilidade (0-2 pontos)
    const pontuacaoEstabilidade = estabilidade * 2;
    
    return pontuacaoTempo + pontuacaoSucesso + pontuacaoEstabilidade;
  }

  /**
   * Cache inteligente de elementos DOM
   */
  static cacheElementos = new Map();
  
  /**
   * Adiciona elemento ao cache
   */
  static adicionarAoCache(seletor, elemento) {
    const config = this.OTIMIZACOES.cacheDom;
    
    if (this.cacheElementos.size >= config.tamanhoMaximo) {
      this.limparCacheAntigo();
    }
    
    this.cacheElementos.set(seletor, {
      elemento,
      timestamp: Date.now()
    });
  }
  
  /**
   * Recupera elemento do cache
   */
  static obterDoCache(seletor) {
    const config = this.OTIMIZACOES.cacheDom;
    const item = this.cacheElementos.get(seletor);
    
    if (!item) return null;
    
    // Verifica se o item ainda é válido
    if (Date.now() - item.timestamp > config.tempoVida) {
      this.cacheElementos.delete(seletor);
      return null;
    }
    
    return item.elemento;
  }
  
  /**
   * Limpa itens antigos do cache
   */
  static limparCacheAntigo() {
    const config = this.OTIMIZACOES.cacheDom;
    const agora = Date.now();
    
    for (const [seletor, item] of this.cacheElementos.entries()) {
      if (agora - item.timestamp > config.tempoVida) {
        this.cacheElementos.delete(seletor);
      }
    }
  }
  
  /**
   * Operações paralelas em andamento
   */
  static operacoesParalelas = new Set();
  
  /**
   * Executa operação com controle de paralelização
   */
  static async executarComParalelizacao(operacao, id) {
    const config = this.OTIMIZACOES.paralelizacao;
    
    // Aguarda se há muitas operações simultâneas
    while (this.operacoesParalelas.size >= config.maxOperacoesSimultaneas) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.operacoesParalelas.add(id);
    
    try {
      const resultado = await Promise.race([
        operacao(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na operação paralela')), config.timeoutOperacao)
        )
      ]);
      
      return resultado;
    } catch (error) {
      if (config.retryAutomatico) {
        console.log(`[TimeoutManager] Retry automático para operação ${id}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return await operacao();
      }
      throw error;
    } finally {
      this.operacoesParalelas.delete(id);
    }
  }
  
  /**
   * Busca inteligente de elementos com fallbacks
   */
  static async buscarElementoInteligente(page, seletores, timeout = null) {
    const config = this.OTIMIZACOES.deteccaoInteligente;
    const timeoutFinal = timeout || this.obterTimeout('interacao', 'aguardarElemento');
    
    // Normaliza seletores para array
    const listaSeletores = Array.isArray(seletores) ? seletores : [seletores];
    
    for (let tentativa = 0; tentativa < config.tentativasMaximas; tentativa++) {
      for (const seletor of listaSeletores) {
        try {
          // Verifica cache primeiro
          const elementoCache = this.obterDoCache(seletor);
          if (elementoCache) {
            return elementoCache;
          }
          
          // Busca com timeout reduzido
          const elemento = await page.waitForSelector(seletor, {
            timeout: Math.max(timeoutFinal / listaSeletores.length, config.timeoutMinimo)
          });
          
          if (elemento) {
            this.adicionarAoCache(seletor, elemento);
            return elemento;
          }
        } catch (error) {
          // Continua para próximo seletor
        }
      }
      
      // Pausa entre tentativas
      if (tentativa < config.tentativasMaximas - 1) {
        await new Promise(resolve => setTimeout(resolve, config.intervaloBusca));
      }
    }
    
    throw new Error(`Elemento não encontrado após ${config.tentativasMaximas} tentativas: ${listaSeletores.join(', ')}`);
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

// Timeouts específicos para São José dos Campos
const SAO_JOSE_CAMPOS_TIMEOUTS = {
  // Timeouts base (em ms)
  navegacao: 15000,
  carregamentoPagina: 20000,
  buscaElemento: 10000,
    
  // Timeouts para busca de perito
  buscaPerito: {
    inputBusca: 8000,
    botaoBuscar: 5000,
    resultados: 15000,
    carregamentoLista: 12000
  },
    
  // Timeouts para vinculação
  vinculacao: {
    botaoVincular: 8000,
    modalConfirmacao: 10000,
    botaoConfirmar: 5000,
    mensagemSucesso: 12000
  },
    
  // Timeouts para aguardar entre ações
  intervalos: {
    entreCliques: 2000,
    entreNavegacao: 3000,
    entreTentativas: 5000,
    aposCarregamento: 4000
  },
    
  // Função para obter timeout específico
  getTimeout(acao, subacao = null) {
    if (subacao && this[acao] && this[acao][subacao]) {
      return this[acao][subacao];
    }
    return this[acao] || this.navegacao;
  }
};


module.exports = TimeoutManager;