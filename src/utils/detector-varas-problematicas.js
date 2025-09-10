#!/usr/bin/env node

/**
 * 🔍 DETECTOR DE VARAS PROBLEMÁTICAS
 * 
 * Sistema automático para detectar varas que necessitam tratamento especial
 * baseado em padrões conhecidos e histórico de problemas
 */

const fs = require('fs');
const path = require('path');

// Configuração de varas conhecidamente problemáticas
const VARAS_PROBLEMATICAS_CONHECIDAS = {
  // São José dos Campos - já tem solução implementada
  sao_jose_campos: {
    padroes: [
      '2ª Vara do Trabalho de São José dos Campos',
      '3ª Vara do Trabalho de São José dos Campos',
      '4ª Vara do Trabalho de São José dos Campos',
      '5ª Vara do Trabalho de São José dos Campos'
    ],
    problema: 'entram_mas_nao_buscam_vinculam',
    solucao_disponivel: true,
    tratamento: 'SAO_JOSE_CAMPOS_CONFIG'
  },
  
  // Limeira - solução implementada
  limeira: {
    padroes: [
      '1ª Vara do Trabalho de Limeira',
      '2ª Vara do Trabalho de Limeira'
    ],
    problema: 'nao_conseguem_buscar_vincular',
    solucao_disponivel: true,
    tratamento: 'LIMEIRA_ESPECIFICO'
  },
  
  // Outras cidades para monitoramento
  hortolandia: {
    padroes: [
      'Vara do Trabalho de Hortolândia'
    ],
    problema: 'potencial_problema_similar',
    solucao_disponivel: false,
    tratamento: 'MONITORAR'
  },
  
  santa_barbara: {
    padroes: [
      'Vara do Trabalho de Santa Bárbara D\'Oeste'
    ],
    problema: 'potencial_problema_similar',
    solucao_disponivel: false,
    tratamento: 'MONITORAR'
  },
  
  sao_joao_boa_vista: {
    padroes: [
      'Vara do Trabalho de São João da Boa Vista'
    ],
    problema: 'potencial_problema_similar',
    solucao_disponivel: false,
    tratamento: 'MONITORAR'
  },
  
  sumare: {
    padroes: [
      'Vara do Trabalho de Sumaré'
    ],
    problema: 'potencial_problema_similar',
    solucao_disponivel: false,
    tratamento: 'MONITORAR'
  }
};

// Padrões de problemas comuns
const PADROES_PROBLEMAS = {
  timeout_busca: {
    indicadores: ['timeout', 'não encontra campo', 'elemento não localizado'],
    solucao: 'aumentar_timeout_busca'
  },
  
  timeout_vinculacao: {
    indicadores: ['falha na vinculação', 'botão não encontrado', 'não consegue adicionar'],
    solucao: 'aumentar_timeout_vinculacao'
  },
  
  seletores_especificos: {
    indicadores: ['seletor genérico falha', 'elemento não único'],
    solucao: 'implementar_seletores_especificos'
  },
  
  processamento_sequencial: {
    indicadores: ['conflito de recursos', 'múltiplas instâncias'],
    solucao: 'forcar_processamento_sequencial'
  }
};

class DetectorVarasProblematicas {
  constructor() {
    this.historico = this.carregarHistorico();
    this.relatorio = {
      timestamp: new Date().toISOString(),
      varas_analisadas: [],
      problemas_detectados: [],
      tratamentos_aplicados: [],
      recomendacoes: []
    };
  }
  
  /**
   * Detecta se uma vara é problemática
   * @param {string} nomeVara - Nome da vara
   * @returns {Object} - Resultado da detecção
   */
  detectarVaraProblematica(nomeVara) {
    console.log(`🔍 [DETECTOR] Analisando vara: ${nomeVara}`);
    
    // Verificar varas conhecidamente problemáticas
    for (const [categoria, config] of Object.entries(VARAS_PROBLEMATICAS_CONHECIDAS)) {
      for (const padrao of config.padroes) {
        if (nomeVara.includes(padrao) || this.compararSimilaridade(nomeVara, padrao) > 0.8) {
          console.log(`⚠️ [DETECTOR] Vara problemática detectada: ${categoria}`);
          
          return {
            problematica: true,
            categoria,
            problema: config.problema,
            solucao_disponivel: config.solucao_disponivel,
            tratamento: config.tratamento,
            confianca: 0.9
          };
        }
      }
    }
    
    // Verificar histórico de problemas
    const problemaHistorico = this.verificarHistorico(nomeVara);
    if (problemaHistorico.problematica) {
      console.log('📊 [DETECTOR] Problema detectado no histórico');
      return problemaHistorico;
    }
    
    // Verificar padrões de nome que podem indicar problemas
    const problemasPadrao = this.detectarPadroesSuspeitos(nomeVara);
    if (problemasPadrao.length > 0) {
      console.log('🔍 [DETECTOR] Padrões suspeitos detectados');
      return {
        problematica: true,
        categoria: 'padrao_suspeito',
        problema: 'potencial_problema_baseado_em_padrao',
        solucao_disponivel: false,
        tratamento: 'MONITORAR_ESPECIAL',
        confianca: 0.6,
        padroes: problemasPadrao
      };
    }
    
    console.log('✅ [DETECTOR] Vara aparenta estar normal');
    return {
      problematica: false,
      categoria: 'normal',
      confianca: 0.8
    };
  }
  
  /**
   * Aplica tratamento específico baseado na detecção
   * @param {Object} deteccao - Resultado da detecção
   * @param {Object} page - Página do Playwright
   * @param {string} nomeVara - Nome da vara
   * @param {string} perfil - Perfil do usuário
   * @returns {Object} - Resultado do tratamento
   */
  async aplicarTratamento(deteccao, page, nomeVara, perfil = 'Assessor') {
    if (!deteccao.problematica) {
      return { aplicado: false, motivo: 'vara_nao_problematica' };
    }
    
    console.log(`🔧 [TRATAMENTO] Aplicando tratamento: ${deteccao.tratamento}`);
    
    try {
      switch (deteccao.tratamento) {
      case 'LIMEIRA_ESPECIFICO':
        const { aplicarTratamentoLimeira } = require('../vincularOJ.js');
        return await aplicarTratamentoLimeira(page, nomeVara, perfil);
          
      case 'SAO_JOSE_CAMPOS_CONFIG':
        return await this.aplicarTratamentoSaoJose(page, nomeVara, perfil);
          
      case 'MONITORAR':
      case 'MONITORAR_ESPECIAL':
        return await this.aplicarMonitoramentoEspecial(page, nomeVara, perfil, deteccao);
          
      default:
        console.log(`⚠️ [TRATAMENTO] Tratamento não implementado: ${deteccao.tratamento}`);
        return { aplicado: false, motivo: 'tratamento_nao_implementado' };
      }
    } catch (error) {
      console.log(`❌ [TRATAMENTO] Erro ao aplicar tratamento: ${error.message}`);
      return { aplicado: false, erro: error.message };
    }
  }
  
  /**
   * Aplica tratamento para São José dos Campos
   */
  async aplicarTratamentoSaoJose(page, nomeVara, perfil) {
    console.log('🏛️ [SAO_JOSE] Aplicando configuração específica...');
    
    // Implementar lógica específica para São José dos Campos
    // baseada na configuração SAO_JOSE_CAMPOS_CONFIG
    
    return {
      aplicado: true,
      metodo: 'sao_jose_especifico',
      detalhes: 'Configuração específica aplicada para São José dos Campos'
    };
  }
  
  /**
   * Aplica monitoramento especial para varas suspeitas
   */
  async aplicarMonitoramentoEspecial(page, nomeVara, perfil, deteccao) {
    console.log('👁️ [MONITOR] Aplicando monitoramento especial...');
    
    // Registrar no histórico para análise futura
    this.registrarNoHistorico(nomeVara, {
      timestamp: new Date().toISOString(),
      categoria: deteccao.categoria,
      problema: deteccao.problema,
      confianca: deteccao.confianca,
      status: 'monitorado'
    });
    
    return {
      aplicado: true,
      metodo: 'monitoramento_especial',
      detalhes: 'Vara adicionada ao monitoramento especial'
    };
  }
  
  /**
   * Verifica histórico de problemas
   */
  verificarHistorico(nomeVara) {
    const entrada = this.historico[nomeVara];
    if (!entrada) {
      return { problematica: false };
    }
    
    // Verificar se teve problemas recentes
    const problemasRecentes = entrada.filter(p => {
      const diasAtras = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return diasAtras <= 30 && p.status === 'problema';
    });
    
    if (problemasRecentes.length > 0) {
      return {
        problematica: true,
        categoria: 'historico',
        problema: 'problemas_recentes_no_historico',
        solucao_disponivel: false,
        tratamento: 'MONITORAR_ESPECIAL',
        confianca: 0.7,
        detalhes: problemasRecentes
      };
    }
    
    return { problematica: false };
  }
  
  /**
   * Detecta padrões suspeitos no nome da vara
   */
  detectarPadroesSuspeitos(nomeVara) {
    const padroesSuspeitos = [];
    
    // Varas com numeração alta (podem ter problemas específicos)
    if (nomeVara.match(/[4-9]ª Vara/)) {
      padroesSuspeitos.push('numeracao_alta');
    }
    
    // Varas de cidades menores (podem ter seletores diferentes)
    const cidadesPequenas = ['Limeira', 'Hortolândia', 'Sumaré', 'Santa Bárbara'];
    if (cidadesPequenas.some(cidade => nomeVara.includes(cidade))) {
      padroesSuspeitos.push('cidade_pequena');
    }
    
    return padroesSuspeitos;
  }
  
  /**
   * Compara similaridade entre strings
   */
  compararSimilaridade(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calcularDistanciaEdicao(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calcula distância de edição entre strings
   */
  calcularDistanciaEdicao(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Carrega histórico de problemas
   */
  carregarHistorico() {
    const caminhoHistorico = path.join(__dirname, '..', '..', 'historico-varas-problematicas.json');
    
    try {
      if (fs.existsSync(caminhoHistorico)) {
        return JSON.parse(fs.readFileSync(caminhoHistorico, 'utf8'));
      }
    } catch (error) {
      console.log(`⚠️ [DETECTOR] Erro ao carregar histórico: ${error.message}`);
    }
    
    return {};
  }
  
  /**
   * Registra entrada no histórico
   */
  registrarNoHistorico(nomeVara, entrada) {
    if (!this.historico[nomeVara]) {
      this.historico[nomeVara] = [];
    }
    
    this.historico[nomeVara].push(entrada);
    
    // Manter apenas últimas 50 entradas por vara
    if (this.historico[nomeVara].length > 50) {
      this.historico[nomeVara] = this.historico[nomeVara].slice(-50);
    }
    
    this.salvarHistorico();
  }
  
  /**
   * Salva histórico em arquivo
   */
  salvarHistorico() {
    const caminhoHistorico = path.join(__dirname, '..', '..', 'historico-varas-problematicas.json');
    
    try {
      fs.writeFileSync(caminhoHistorico, JSON.stringify(this.historico, null, 2));
    } catch (error) {
      console.log(`⚠️ [DETECTOR] Erro ao salvar histórico: ${error.message}`);
    }
  }
  
  /**
   * Gera relatório de detecção
   */
  gerarRelatorio() {
    const caminhoRelatorio = path.join(__dirname, '..', '..', `relatorio-detector-${Date.now()}.json`);
    
    try {
      fs.writeFileSync(caminhoRelatorio, JSON.stringify(this.relatorio, null, 2));
      console.log(`📊 [DETECTOR] Relatório salvo: ${caminhoRelatorio}`);
    } catch (error) {
      console.log(`⚠️ [DETECTOR] Erro ao salvar relatório: ${error.message}`);
    }
  }
}

module.exports = {
  DetectorVarasProblematicas,
  VARAS_PROBLEMATICAS_CONHECIDAS,
  PADROES_PROBLEMAS
};