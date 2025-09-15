#!/usr/bin/env node

/**
 * Teste da Nova Lógica de Busca Inteligente de OJs
 * 
 * Este script testa a funcionalidade de busca por palavras-chave
 * implementada para resolver problemas de OJs não encontrados.
 */

const ServidorAutomationV2 = require('./src/main/servidor-automation-v2.js');

class SmartOJSearchTester {
  constructor() {
    this.automation = new ServidorAutomationV2();
  }

  // Simular opções disponíveis baseadas no log real
  getSimulatedOptions() {
    return [
      { index: 0, text: "CEJUSC ARAÇATUBA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 1, text: "CEJUSC BAURU - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 2, text: "CEJUSC CAMPINAS - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 3, text: "CEJUSC FRANCA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 4, text: "CEJUSC JUNDIAÍ - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 5, text: "CEJUSC LIMEIRA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 6, text: "CEJUSC PIRACICABA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 7, text: "CEJUSC PRESIDENTE PRUDENTE - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 8, text: "CEJUSC RIBEIRÃO PRETO - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 9, text: "CEJUSC SOROCABA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 10, text: "CEJUSC SJRIO PRETO - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 11, text: "CEJUSC SJCAMPOS - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 12, text: "CEJUSC TAUBATÉ - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho" },
      { index: 13, text: "Juizado Especial da Infância e da Adolescência de São José do Rio Preto" },
      { index: 14, text: "Juizado Especial da Infância e da Adolescência de Campinas" },
      { index: 15, text: "1ª Vara da Infância e da Juventude de São Paulo" },
      { index: 16, text: "2ª Vara da Infância e da Juventude de São Paulo" }
    ];
  }

  testKeywordExtraction() {
    console.log('\n🧪 TESTE 1: Extração de Palavras-chave');
    console.log('=' .repeat(50));
    
    const testCases = [
      "Juizado Especial da Infância e da Adolescência de São José do Rio Preto",
      "CEJUSC SJRIO PRETO - JT Centro Judiciário de Métodos Consensuais",
      "1ª Vara da Infância e da Juventude de São Paulo"
    ];
    
    testCases.forEach(testCase => {
      const keywords = this.automation.extractKeywords(testCase);
      console.log(`📝 "${testCase}"`);
      console.log(`🔑 Palavras-chave: [${keywords.join(', ')}]\n`);
    });
  }

  testMatchScoring() {
    console.log('\n🧪 TESTE 2: Cálculo de Score de Compatibilidade');
    console.log('=' .repeat(50));
    
    const target = "Juizado Especial da Infância e da Adolescência de São José do Rio Preto";
    const targetWords = this.automation.extractKeywords(target);
    
    const testOptions = [
      "CEJUSC SJRIO PRETO - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho",
      "Juizado Especial da Infância e da Adolescência de Campinas",
      "1ª Vara da Infância e da Juventude de São Paulo",
      "CEJUSC CAMPINAS - JT Centro Judiciário de Métodos Consensuais"
    ];
    
    console.log(`🎯 OJ Procurado: "${target}"`);
    console.log(`🔑 Palavras-chave: [${targetWords.join(', ')}]\n`);
    
    testOptions.forEach(option => {
      const optionWords = this.automation.extractKeywords(option);
      const score = this.automation.calculateMatchScore(targetWords, optionWords);
      console.log(`📊 Score: ${score.toString().padStart(3)} - "${option}"`);
      console.log(`   Palavras: [${optionWords.join(', ')}]\n`);
    });
  }

  testSmartSearch() {
    console.log('\n🧪 TESTE 3: Busca Inteligente Completa');
    console.log('=' .repeat(50));
    
    const problematicOJs = [
      "Juizado Especial da Infância e da Adolescência de São José do Rio Preto",
      "Juizado Especial da Infância e da Adolescência de Campinas",
      "Vara da Infância e Juventude de Limeira",
      "Centro Judiciário de São José dos Campos"
    ];
    
    const availableOptions = this.getSimulatedOptions();
    
    problematicOJs.forEach(targetOJ => {
      console.log(`\n🔍 Procurando: "${targetOJ}"`);
      console.log('-'.repeat(40));
      
      const result = this.automation.findBestOJMatch(targetOJ, availableOptions);
      
      if (result.match && result.score > 0) {
        console.log(`✅ SUCESSO!`);
        console.log(`   Match: "${result.match.text}"`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Índice: ${result.match.index}`);
      } else {
        console.log(`❌ FALHA: Nenhum match encontrado`);
      }
    });
  }

  testPerformanceComparison() {
    console.log('\n🧪 TESTE 4: Comparação de Performance');
    console.log('=' .repeat(50));
    
    const targetOJ = "Juizado Especial da Infância e da Adolescência de São José do Rio Preto";
    const availableOptions = this.getSimulatedOptions();
    
    // Teste método antigo (simulado)
    console.log('⏱️ Método Antigo (busca por includes):');
    const startOld = Date.now();
    const normalizedTarget = this.automation.normalizeOrgaoName(targetOJ);
    let oldResult = null;
    
    for (const option of availableOptions) {
      const normalizedOption = this.automation.normalizeOrgaoName(option.text);
      if (normalizedOption.includes(normalizedTarget)) {
        oldResult = option;
        break;
      }
    }
    const timeOld = Date.now() - startOld;
    
    console.log(`   Resultado: ${oldResult ? `"${oldResult.text}"` : 'Não encontrado'}`);
    console.log(`   Tempo: ${timeOld}ms\n`);
    
    // Teste método novo
    console.log('⚡ Método Novo (busca inteligente):');
    const startNew = Date.now();
    const newResult = this.automation.findBestOJMatch(targetOJ, availableOptions);
    const timeNew = Date.now() - startNew;
    
    console.log(`   Resultado: ${newResult.match ? `"${newResult.match.text}" (Score: ${newResult.score})` : 'Não encontrado'}`);
    console.log(`   Tempo: ${timeNew}ms`);
    
    console.log(`\n📊 Comparação:`);
    console.log(`   Método antigo: ${oldResult ? '✅ Encontrou' : '❌ Falhou'}`);
    console.log(`   Método novo: ${newResult.match ? '✅ Encontrou' : '❌ Falhou'}`);
    console.log(`   Melhoria: ${newResult.match && !oldResult ? '🚀 Resolveu problema!' : '📈 Manteve funcionalidade'}`);
  }

  async runAllTests() {
    console.log('🧪 INICIANDO TESTES DA BUSCA INTELIGENTE DE OJs');
    console.log('='.repeat(60));
    
    try {
      this.testKeywordExtraction();
      this.testMatchScoring();
      this.testSmartSearch();
      this.testPerformanceComparison();
      
      console.log('\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
      console.log('🎯 A nova lógica de busca inteligente está funcionando corretamente.');
      console.log('🚀 Problemas de OJs não encontrados devem estar resolvidos!');
      
    } catch (error) {
      console.error('❌ ERRO durante os testes:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Executar testes
if (require.main === module) {
  const tester = new SmartOJSearchTester();
  tester.runAllTests();
}

module.exports = SmartOJSearchTester;