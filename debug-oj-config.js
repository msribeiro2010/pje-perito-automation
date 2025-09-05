const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');
const ParallelServerManager = require('./src/main/parallel-server-manager');

async function debugOJConfig() {
  console.log('🔍 Debugando configuração de OJs...');
  
  // Teste 1: Verificar configuração básica
  console.log('\n=== TESTE 1: Configuração Básica ===');
  const automation = new ServidorAutomationV2();
  
  const testConfig = {
    orgaos: ['TRF1', 'TRT15']
  };
  
  automation.config = testConfig;
  
  console.log('Config definida:', automation.config);
  console.log('OJs configurados:', automation.config.orgaos);
  console.log('Validação config:', !!automation.config);
  console.log('Validação orgaos:', !!automation.config.orgaos);
  console.log('É array:', Array.isArray(automation.config.orgaos));
  console.log('Quantidade:', automation.config.orgaos.length);
  
  // Teste 2: Verificar configuração de servidor
  console.log('\n=== TESTE 2: Configuração de Servidor ===');
  const testServidores = [
    { nome: 'Teste 1', cpf: '12072608864', orgaos: ['TRF1'] },
    { nome: 'Teste 2', cpf: '53036140697', orgaos: ['TRT15'] }
  ];
  
  for (const servidor of testServidores) {
    console.log(`Servidor: ${servidor.nome}`);
    console.log(`  CPF: ${servidor.cpf}`);
    console.log(`  OJs: ${JSON.stringify(servidor.orgaos)}`);
    console.log(`  OJs válidos: ${Array.isArray(servidor.orgaos)}`);
    console.log(`  Quantidade OJs: ${servidor.orgaos?.length || 0}`);
  }
  
  // Teste 3: Verificar distribuição no ParallelServerManager
  console.log('\n=== TESTE 3: Distribuição Parallel Manager ===');
  const manager = new ParallelServerManager(2);
  
  // Simular distribuição
  manager.serverQueue = [...testServidores];
  manager.totalServers = testServidores.length;
  
  console.log('Fila de servidores:', manager.serverQueue.length);
  console.log('Total servidores:', manager.totalServers);
  
  // Simular processamento
  while (manager.serverQueue.length > 0) {
    const server = manager.serverQueue.shift();
    console.log(`\nProcessando servidor: ${server.nome}`);
    console.log(`  Config OJs do servidor: ${JSON.stringify(server.orgaos)}`);
    console.log(`  Config OJs global: ${JSON.stringify(testConfig.orgaos)}`);
    
    // Simular configuração que seria feita no processamento real
    const finalConfig = {
      orgaos: server.orgaos || testConfig.orgaos || []
    };
    
    console.log(`  Config final: ${JSON.stringify(finalConfig)}`);
    console.log(`  Validação final: ${!!finalConfig.orgaos && Array.isArray(finalConfig.orgaos)}`);
  }
  
  // Teste 4: Verificar normalização de OJs
  console.log('\n=== TESTE 4: Normalização de OJs ===');
  const testOJs = ['TRF1', 'TRT15', 'TST', 'STJ'];
  
  for (const oj of testOJs) {
    const normalized = automation.normalizeOrgaoName(oj);
    console.log(`${oj} -> ${normalized}`);
  }
  
  console.log('\n✅ Debug de configuração concluído!');
}

debugOJConfig().catch(console.error);