const { VerificacaoDuplaOJ } = require('../utils/verificacao-dupla-oj');
const { SmartOJCache } = require('../utils/smart-oj-cache');
const { Logger } = require('../utils/Logger');

/**
 * Teste de performance e eficiência da verificação dupla
 */
class TestVerificacaoDupla {
  constructor() {
    this.logger = new Logger('TestVerificacaoDupla');
    this.verificacaoDupla = new VerificacaoDuplaOJ();
    this.smartCache = new SmartOJCache();
  }

  /**
   * Simula uma página do Playwright para testes
   */
  criarPageMock() {
    return {
      waitForTimeout: async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      // Simular outros métodos necessários
      evaluate: async () => ({}),
      $: async () => null,
      $$: async () => []
    };
  }

  /**
   * Simula função de verificação de OJ já vinculado
   */
  simularVerificacaoOJJaVinculado(oj) {
    // Simular alguns OJs como já vinculados
    const ojsJaVinculados = [
      'Tribunal de Justiça do Estado de São Paulo',
      'Tribunal Regional Federal da 3ª Região',
      'Tribunal de Justiça do Estado do Rio de Janeiro',
      'Tribunal Regional do Trabalho da 2ª Região'
    ];

    const jaVinculado = ojsJaVinculados.some(ojVinculado => 
      oj.toLowerCase().includes(ojVinculado.toLowerCase()) ||
      ojVinculado.toLowerCase().includes(oj.toLowerCase())
    );

    return {
      jaVinculado,
      metodo: 'simulacao',
      detalhes: {
        encontrado: jaVinculado,
        tempo: Math.random() * 100 + 50 // 50-150ms
      }
    };
  }

  /**
   * Teste básico de verificação dupla
   */
  async testeBasico() {
    this.logger.info('🧪 Iniciando teste básico de verificação dupla...');
    
    const page = this.criarPageMock();
    const ojsTeste = [
      'Tribunal de Justiça do Estado de São Paulo', // Deve estar vinculado
      'Tribunal de Justiça do Estado de Minas Gerais', // Não vinculado
      'Tribunal Regional Federal da 3ª Região', // Deve estar vinculado
      'Tribunal de Justiça do Estado da Bahia' // Não vinculado
    ];

    // Pré-popular cache com alguns OJs
    this.smartCache.adicionarOJVinculado('Tribunal de Justiça do Estado de São Paulo');
    this.smartCache.adicionarOJVinculado('Tribunal Regional Federal da 3ª Região');

    const resultados = [];

    for (const oj of ojsTeste) {
      this.logger.info(`🔍 Testando OJ: ${oj}`);
      
      const resultado = await this.verificacaoDupla.verificarOJDupla(
        page, oj, this.smartCache
      );
      
      resultados.push({
        oj,
        resultado
      });

      this.logger.info(`   - Já vinculado: ${resultado.jaVinculado}`);
      this.logger.info(`   - Método: ${resultado.metodoDeteccao}`);
      this.logger.info(`   - Confiabilidade: ${Math.round(resultado.confiabilidade * 100)}%`);
      this.logger.info(`   - Tempo: ${resultado.tempoVerificacao}ms`);
    }

    return resultados;
  }

  /**
   * Teste de performance com muitos OJs
   */
  async testePerformance() {
    this.logger.info('⚡ Iniciando teste de performance...');
    
    const page = this.criarPageMock();
    
    // Gerar lista de OJs para teste
    const ojsTeste = [];
    const tribunais = [
      'Tribunal de Justiça do Estado de',
      'Tribunal Regional Federal da',
      'Tribunal Regional do Trabalho da',
      'Tribunal de Justiça Militar do Estado de',
      'Tribunal Regional Eleitoral de'
    ];
    
    const estados = [
      'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná',
      'Rio Grande do Sul', 'Pernambuco', 'Ceará', 'Pará', 'Santa Catarina',
      'Goiás', 'Maranhão', 'Paraíba', 'Amazonas', 'Espírito Santo'
    ];

    // Criar 100 OJs para teste
    for (let i = 0; i < 100; i++) {
      const tribunal = tribunais[Math.floor(Math.random() * tribunais.length)];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      const regiao = Math.floor(Math.random() * 24) + 1; // 1-24
      
      if (tribunal.includes('Regional')) {
        ojsTeste.push(`${tribunal} ${regiao}ª Região`);
      } else {
        ojsTeste.push(`${tribunal} ${estado}`);
      }
    }

    // Pré-popular cache com 30% dos OJs
    const ojsParaCache = ojsTeste.slice(0, Math.floor(ojsTeste.length * 0.3));
    ojsParaCache.forEach(oj => this.smartCache.adicionarOJVinculado(oj));

    this.logger.info(`📊 Testando ${ojsTeste.length} OJs (${ojsParaCache.length} no cache)`);

    const inicioTempo = Date.now();
    const resultados = [];

    for (let i = 0; i < ojsTeste.length; i++) {
      const oj = ojsTeste[i];
      
      if (i % 20 === 0) {
        const progresso = Math.round((i / ojsTeste.length) * 100);
        this.logger.info(`📈 Progresso: ${progresso}% (${i}/${ojsTeste.length})`);
      }

      const resultado = await this.verificacaoDupla.verificarOJDupla(
        page, oj, this.smartCache
      );
      
      resultados.push(resultado);
    }

    const tempoTotal = Date.now() - inicioTempo;
    const tempoMedio = tempoTotal / ojsTeste.length;

    this.logger.info('📊 Resultados do teste de performance:');
    this.logger.info(`   - Total de OJs: ${ojsTeste.length}`);
    this.logger.info(`   - Tempo total: ${tempoTotal}ms`);
    this.logger.info(`   - Tempo médio por OJ: ${tempoMedio.toFixed(2)}ms`);
    
    const estatisticas = this.verificacaoDupla.gerarRelatorioEstatisticas();
    this.logger.info(`   - Cache hits: ${estatisticas.cacheHits}`);
    this.logger.info(`   - Verificações diretas: ${estatisticas.verificacoesDiretas}`);
    this.logger.info(`   - Eficiência cache: ${estatisticas.eficienciaCache.toFixed(1)}%`);

    return {
      resultados,
      estatisticas,
      performance: {
        tempoTotal,
        tempoMedio,
        ojsTestados: ojsTeste.length
      }
    };
  }

  /**
   * Teste de detecção de inconsistências
   */
  async testeInconsistencias() {
    this.logger.info('🔍 Iniciando teste de detecção de inconsistências...');
    
    const page = this.criarPageMock();
    
    // Criar cenários de inconsistência
    const ojsInconsistentes = [
      'Tribunal Inconsistente 1',
      'Tribunal Inconsistente 2',
      'Tribunal Inconsistente 3'
    ];

    // Adicionar ao cache como vinculados
    ojsInconsistentes.forEach(oj => this.smartCache.adicionarOJVinculado(oj));

    const resultados = [];

    for (const oj of ojsInconsistentes) {
      // Forçar verificação direta para detectar inconsistência
      const resultado = await this.verificacaoDupla.verificarOJDupla(
        page, oj, this.smartCache, true // forçar verificação
      );
      
      resultados.push({
        oj,
        resultado
      });

      this.logger.info(`🔍 OJ: ${oj}`);
      this.logger.info(`   - Consenso: ${resultado.detalhes.consenso}`);
      this.logger.info(`   - Método: ${resultado.metodoDeteccao}`);
    }

    const estatisticas = this.verificacaoDupla.gerarRelatorioEstatisticas();
    this.logger.info(`📊 Inconsistências detectadas: ${estatisticas.falsoPositivos}`);

    return resultados;
  }

  /**
   * Executa todos os testes
   */
  async executarTodosTestes() {
    this.logger.info('🚀 Iniciando bateria completa de testes...');
    
    const resultados = {
      testeBasico: null,
      testePerformance: null,
      testeInconsistencias: null,
      estatisticasFinais: null
    };

    try {
      // Teste básico
      resultados.testeBasico = await this.testeBasico();
      
      // Reset para próximo teste
      this.verificacaoDupla.resetarEstatisticas();
      this.verificacaoDupla.limparCacheLocal();
      
      // Teste de performance
      resultados.testePerformance = await this.testePerformance();
      
      // Reset para próximo teste
      this.verificacaoDupla.resetarEstatisticas();
      this.verificacaoDupla.limparCacheLocal();
      
      // Teste de inconsistências
      resultados.testeInconsistencias = await this.testeInconsistencias();
      
      // Estatísticas finais
      resultados.estatisticasFinais = this.verificacaoDupla.gerarRelatorioEstatisticas();
      
      this.logger.info('✅ Todos os testes concluídos com sucesso!');
      
    } catch (error) {
      this.logger.error(`❌ Erro durante os testes: ${error.message}`);
      throw error;
    }

    return resultados;
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const teste = new TestVerificacaoDupla();
  
  teste.executarTodosTestes()
    .then(resultados => {
      console.log('\n🎉 TESTES CONCLUÍDOS!');
      console.log('📊 Resumo dos resultados:');
      console.log(`   - Teste básico: ${resultados.testeBasico.length} OJs testados`);
      console.log(`   - Teste performance: ${resultados.testePerformance.performance.ojsTestados} OJs em ${resultados.testePerformance.performance.tempoTotal}ms`);
      console.log(`   - Inconsistências: ${resultados.estatisticasFinais.falsoPositivos} detectadas`);
    })
    .catch(error => {
      console.error('❌ Erro nos testes:', error.message);
      process.exit(1);
    });
}

module.exports = { TestVerificacaoDupla };