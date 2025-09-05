const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');

try {
  const automation = new ServidorAutomationV2();
  console.log('✅ ServidorAutomationV2 inicializado com sucesso');
  console.log('✅ PJEResilienceManager inicializado:', !!automation.resilienceManager);
  
  if (automation.resilienceManager) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(automation.resilienceManager))
      .filter(name => name !== 'constructor');
    console.log('✅ Métodos disponíveis:', methods);
    console.log('✅ Integração do PJEResilienceManager corrigida com sucesso!');
  } else {
    console.log('❌ PJEResilienceManager não foi inicializado');
  }
} catch (error) {
  console.error('❌ Erro ao inicializar:', error.message);
}