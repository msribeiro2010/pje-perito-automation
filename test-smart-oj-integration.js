/**
 * Teste do Sistema de Verificação Inteligente de OJs
 * Valida a funcionalidade de verificar OJs existentes antes de inserir novos
 */

const OJProfileValidator = require('./src/utils/oj-profile-validator.js');
const SmartOJIntegration = require('./src/utils/smart-oj-integration.js');

class SmartOJIntegrationTest {
  constructor() {
    this.testResults = [];
    this.validator = new OJProfileValidator();
    this.integration = new SmartOJIntegration();
  }

  /**
   * Executa todos os testes do sistema
   */
  async runAllTests() {
    console.log('🧪 Iniciando testes do Sistema de Verificação Inteligente de OJs...');
    console.log('=' .repeat(70));

    await this.testProfileValidation();
    await this.testOJFiltering();
    await this.testRoleComparison();
    await this.testIntegrationWorkflow();
    await this.testPerformance();

    const report = this.generateTestReport();
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    
    return {
      success: passedTests === totalTests,
      report: report
    };
  }

  /**
   * Testa a validação de perfis
   */
  async testProfileValidation() {
    console.log('\n📋 Testando validação de perfis...');
    
    try {
      // Simular dados de OJs existentes
      const existingOJs = [
        {
          nome: 'Tribunal de Justiça do Estado de São Paulo',
          perfis: ['Assessor', 'Diretor de Secretaria']
        },
        {
          nome: 'Tribunal Regional Federal da 3ª Região',
          perfis: ['Assessor']
        }
      ];

      // Simular OJs para processar
      const ojsToProcess = [
        {
          nome: 'Tribunal de Justiça do Estado de São Paulo',
          perfil: 'Assessor'
        },
        {
          nome: 'Tribunal Regional Federal da 3ª Região', 
          perfil: 'Diretor de Secretaria'
        },
        {
          nome: 'Tribunal de Justiça do Estado do Rio de Janeiro',
          perfil: 'Assessor'
        }
      ];

      const result = await this.integration.filterOJsForProcessing(ojsToProcess, existingOJs);
      
      // Validações
      const hasCorrectStructure = result.toCreate && result.toAddRole && result.toSkip;
      const hasNewOJ = result.toCreate.some(oj => oj.nome.includes('Rio de Janeiro'));
      const hasRoleAddition = result.toAddRole.some(oj => oj.nome.includes('3ª Região'));
      const hasSkipped = result.toSkip.some(oj => oj.nome.includes('São Paulo'));

      this.testResults.push({
        test: 'Validação de Perfis',
        passed: hasCorrectStructure && hasNewOJ && hasRoleAddition && hasSkipped,
        details: `Estrutura: ${hasCorrectStructure}, Novo OJ: ${hasNewOJ}, Adição Role: ${hasRoleAddition}, Ignorado: ${hasSkipped}`
      });

      console.log(`✅ Teste de validação: ${hasCorrectStructure && hasNewOJ && hasRoleAddition && hasSkipped ? 'PASSOU' : 'FALHOU'}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Validação de Perfis',
        passed: false,
        details: `Erro: ${error.message}`
      });
      console.log(`❌ Teste de validação: FALHOU - ${error.message}`);
    }
  }

  /**
   * Testa o filtro de OJs
   */
  async testOJFiltering() {
    console.log('\n🔍 Testando filtro de OJs...');
    
    try {
      // Simular página com OJs existentes
      const mockPage = {
        evaluate: async () => {
          return [
            { nome: 'TJ-SP', perfis: ['Assessor'] },
            { nome: 'TRF-3', perfis: ['Diretor de Secretaria'] }
          ];
        }
      };

      const servidor = { nome: 'João Silva', cpf: '123.456.789-00' };
      const existingOJs = await this.integration.analyzeExistingOJs(mockPage, servidor);
      
      const hasResults = existingOJs && existingOJs.length > 0;
      const hasCorrectFormat = existingOJs.every(oj => oj.nome && oj.perfis);

      this.testResults.push({
        test: 'Filtro de OJs',
        passed: hasResults && hasCorrectFormat,
        details: `Resultados: ${hasResults}, Formato: ${hasCorrectFormat}`
      });

      console.log(`✅ Teste de filtro: ${hasResults && hasCorrectFormat ? 'PASSOU' : 'FALHOU'}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Filtro de OJs',
        passed: false,
        details: `Erro: ${error.message}`
      });
      console.log(`❌ Teste de filtro: FALHOU - ${error.message}`);
    }
  }

  /**
   * Testa comparação de perfis
   */
  async testRoleComparison() {
    console.log('\n👥 Testando comparação de perfis...');
    
    try {
      const existingRoles = ['Assessor'];
      const requiredRole = 'Diretor de Secretaria';
      
      const needsRole = this.validator.needsAdditionalRole(existingRoles, requiredRole);
      const alreadyHas = this.validator.needsAdditionalRole(['Assessor', 'Diretor de Secretaria'], requiredRole);
      
      const correctLogic = needsRole === true && alreadyHas === false;

      this.testResults.push({
        test: 'Comparação de Perfis',
        passed: correctLogic,
        details: `Precisa role: ${needsRole}, Já tem: ${alreadyHas}`
      });

      console.log(`✅ Teste de comparação: ${correctLogic ? 'PASSOU' : 'FALHOU'}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Comparação de Perfis',
        passed: false,
        details: `Erro: ${error.message}`
      });
      console.log(`❌ Teste de comparação: FALHOU - ${error.message}`);
    }
  }

  /**
   * Testa o workflow completo de integração
   */
  async testIntegrationWorkflow() {
    console.log('\n🔄 Testando workflow de integração...');
    
    try {
      // Simular workflow completo
      const mockPage = { evaluate: async () => [] };
      const servidor = { nome: 'Maria Santos', cpf: '987.654.321-00' };
      const ojsConfig = [
        { nome: 'TJ-RJ', perfil: 'Assessor' },
        { nome: 'TRF-2', perfil: 'Diretor de Secretaria' }
      ];

      // Executar análise
      const existingOJs = await this.integration.analyzeExistingOJs(mockPage, servidor);
      const filteredOJs = await this.integration.filterOJsForProcessing(ojsConfig, existingOJs);
      
      // Gerar relatório
      const report = this.integration.generateProcessingReport(filteredOJs, servidor);
      
      const workflowComplete = existingOJs !== null && filteredOJs !== null && report !== null;

      this.testResults.push({
        test: 'Workflow de Integração',
        passed: workflowComplete,
        details: `Análise: ${existingOJs !== null}, Filtro: ${filteredOJs !== null}, Relatório: ${report !== null}`
      });

      console.log(`✅ Teste de workflow: ${workflowComplete ? 'PASSOU' : 'FALHOU'}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Workflow de Integração',
        passed: false,
        details: `Erro: ${error.message}`
      });
      console.log(`❌ Teste de workflow: FALHOU - ${error.message}`);
    }
  }

  /**
   * Testa performance do sistema
   */
  async testPerformance() {
    console.log('\n⚡ Testando performance...');
    
    try {
      const startTime = Date.now();
      
      // Simular processamento de muitos OJs
      const largeOJList = Array.from({ length: 100 }, (_, i) => ({
        nome: `Tribunal ${i}`,
        perfil: i % 2 === 0 ? 'Assessor' : 'Diretor de Secretaria'
      }));

      const existingOJs = Array.from({ length: 50 }, (_, i) => ({
        nome: `Tribunal ${i}`,
        perfis: ['Assessor']
      }));

      const result = await this.integration.filterOJsForProcessing(largeOJList, existingOJs);
      
      const duration = Date.now() - startTime;
      const isPerformant = duration < 1000; // Menos de 1 segundo

      this.testResults.push({
        test: 'Performance',
        passed: isPerformant,
        details: `Duração: ${duration}ms (limite: 1000ms)`
      });

      console.log(`✅ Teste de performance: ${isPerformant ? 'PASSOU' : 'FALHOU'} (${duration}ms)`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Performance',
        passed: false,
        details: `Erro: ${error.message}`
      });
      console.log(`❌ Teste de performance: FALHOU - ${error.message}`);
    }
  }

  /**
   * Gera relatório final dos testes
   */
  generateTestReport() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 RELATÓRIO FINAL DOS TESTES');
    console.log('=' .repeat(70));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n📈 Resumo Geral:`);
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   ✅ Passou: ${passedTests}`);
    console.log(`   ❌ Falhou: ${failedTests}`);
    console.log(`   📊 Taxa de sucesso: ${successRate}%`);

    console.log(`\n📋 Detalhes dos Testes:`);
    this.testResults.forEach((test, index) => {
      const status = test.passed ? '✅ PASSOU' : '❌ FALHOU';
      console.log(`   ${index + 1}. ${test.test}: ${status}`);
      console.log(`      ${test.details}`);
    });

    // Salvar relatório
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: parseFloat(successRate)
      },
      tests: this.testResults
    };

    const fs = require('fs');
    const reportPath = './smart-oj-integration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    
    // Recomendações
    console.log(`\n💡 Recomendações:`);
    if (successRate >= 80) {
      console.log('   🎉 Sistema funcionando corretamente!');
      console.log('   ✨ Verificação inteligente de OJs implementada com sucesso');
    } else {
      console.log('   ⚠️  Sistema precisa de ajustes');
      console.log('   🔧 Revisar implementação dos componentes que falharam');
    }

    return {
      success: successRate >= 80,
      successRate: parseFloat(successRate),
      report: reportData
    };
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new SmartOJIntegrationTest();
  tester.runAllTests()
    .then(result => {
      console.log('\n🏁 Testes concluídos!');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erro durante os testes:', error);
      process.exit(1);
    });
}

module.exports = SmartOJIntegrationTest;