
// Script de teste para verificar processamento individual dos órgãos faltantes
const { SmartOJCache } = require('./src/utils/smart-oj-cache');

async function testarOrgaosFaltantes() {
  const cache = new SmartOJCache();
  
  const orgaosFaltantes = [
    '2ª Vara do Trabalho de São José dos Campos',
    '3ª Vara do Trabalho de São José dos Campos', 
    '4ª Vara do Trabalho de São José dos Campos',
    '5ª Vara do Trabalho de São José dos Campos'
  ];
  
  console.log('🧪 Testando órgãos faltantes individualmente...');
  
  for (const orgao of orgaosFaltantes) {
    console.log(`\n🔍 Testando: ${orgao}`);
    
    // Verificar se está no cache
    const resultadoCache = cache.verificarCache(orgao);
    console.log(`   Cache: ${resultadoCache ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
    
    if (resultadoCache) {
      console.log(`   Status: ${JSON.stringify(resultadoCache)}`);
    }
    
    // Verificar validação
    const valido = cache.validarOrgaoJulgador(orgao);
    console.log(`   Validação: ${valido ? 'VÁLIDO' : 'INVÁLIDO'}`);
  }
}

testarOrgaosFaltantes().catch(console.error);
