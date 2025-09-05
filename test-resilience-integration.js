const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');

/**
 * Teste de integração do PJEResilienceManager
 * Verifica se as modificações de resiliência estão funcionando corretamente
 */
async function testResilienceIntegration() {
  console.log('🧪 Iniciando teste de integração do PJEResilienceManager...');
  
  const automation = new ServidorAutomationV2();
  
  try {
    // Verificar se o resilienceManager foi inicializado
    if (!automation.resilienceManager) {
      throw new Error('❌ PJEResilienceManager não foi inicializado');
    }
    console.log('✅ PJEResilienceManager inicializado com sucesso');
    
    // Verificar se os métodos de resiliência estão disponíveis
    const requiredMethods = ['executeWithResilience', 'checkServerAvailability', 'wrapBrowserOperation', 'wrapNavigationOperation'];
    for (const method of requiredMethods) {
      if (typeof automation.resilienceManager[method] !== 'function') {
        throw new Error(`❌ Método ${method} não encontrado no PJEResilienceManager`);
      }
    }
    console.log('✅ Todos os métodos de resiliência estão disponíveis');
    
    // Testar verificação de disponibilidade do PJE
    console.log('🔍 Testando verificação de disponibilidade do PJE...');
    const isAvailable = await automation.resilienceManager.checkServerAvailability();
    console.log(`📊 Status do PJE: ${isAvailable ? 'Disponível' : 'Indisponível'}`);
    
    // Testar execução com resiliência
    console.log('🌐 Testando execução com resiliência...');
    const resilienceResult = await automation.resilienceManager.executeWithResilience(async () => {
      console.log('  📝 Executando operação de teste com resiliência...');
      return 'resilience-test-success';
    }, 'Teste de Resiliência');
    
    if (resilienceResult === 'resilience-test-success') {
      console.log('✅ Execução com resiliência funcionando');
    } else {
      throw new Error('❌ Falha na execução com resiliência');
    }
    
    // Testar wrapper de operação do navegador
    console.log('🧭 Testando wrapper de operação do navegador...');
    const browserWrapResult = await automation.resilienceManager.wrapBrowserOperation(async () => {
      console.log('  📝 Executando operação de teste do navegador...');
      return 'browser-wrap-success';
    }, 'Teste Browser Wrap');
    
    if (browserWrapResult === 'browser-wrap-success') {
      console.log('✅ Wrapper de operação do navegador funcionando');
    } else {
      throw new Error('❌ Falha no wrapper de operação do navegador');
    }
    
    console.log('\n🎉 TESTE DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO!');
    console.log('📋 Resumo:');
    console.log('  ✅ PJEResilienceManager inicializado');
    console.log('  ✅ Métodos de resiliência disponíveis');
    console.log(`  📊 Status do PJE: ${isAvailable ? 'Disponível' : 'Indisponível'}`);
    console.log('  ✅ Execução com resiliência funcionando');
    console.log('  ✅ Wrapper de operação do navegador funcionando');
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE DE INTEGRAÇÃO:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Executar o teste
testResilienceIntegration()
  .then(() => {
    console.log('\n✅ Teste finalizado com sucesso');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Teste falhou:', error.message);
    process.exit(1);
  });