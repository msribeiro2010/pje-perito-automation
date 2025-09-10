const fs = require('fs');
const path = require('path');

/**
 * Script para debugar o problema dos órgãos de São José dos Campos
 * que não estão sendo processados completamente
 */

async function debugSaoJoseOrgaos() {
  console.log('🔍 === DEBUG: Órgãos de São José dos Campos ===\n');
  
  try {
    // 1. Verificar arquivo de órgãos principal
    const orgaosPjePath = path.join(__dirname, 'orgaos_pje.json');
    const orgaosPjeData = JSON.parse(fs.readFileSync(orgaosPjePath, 'utf8'));
    
    console.log('📋 1. Órgãos no arquivo principal (orgaos_pje.json):');
    const saoJoseOrgaos = orgaosPjeData['São José dos Campos'] || [];
    console.log(`   Total: ${saoJoseOrgaos.length} órgãos`);
    saoJoseOrgaos.forEach((orgao, index) => {
      console.log(`   ${index + 1}. "${orgao}"`);
    });
    console.log();
    
    // 2. Verificar arquivo do renderer
    const rendererOrgaosPath = path.join(__dirname, 'src/renderer/orgaos_pje.json');
    const rendererOrgaosData = JSON.parse(fs.readFileSync(rendererOrgaosPath, 'utf8'));
    
    console.log('📋 2. Órgãos no arquivo do renderer (src/renderer/orgaos_pje.json):');
    const rendererSaoJoseOrgaos = rendererOrgaosData['São José dos Campos'] || [];
    console.log(`   Total: ${rendererSaoJoseOrgaos.length} órgãos`);
    rendererSaoJoseOrgaos.forEach((orgao, index) => {
      console.log(`   ${index + 1}. "${orgao}"`);
    });
    console.log();
    
    // 3. Verificar diferenças
    console.log('🔍 3. Análise de diferenças:');
    const orgaosProcessados = [
      'Vara do Trabalho de Caraguatatuba',
      'Vara do Trabalho de Caçapava', 
      'Vara do Trabalho de Cruzeiro',
      'Vara do Trabalho de Guaratinguetá',
      'Vara do Trabalho de Lorena',
      '1ª Vara do Trabalho de São José dos Campos',
      'CON1 - São José dos Campos'
    ];
    
    const orgaosFaltantes = [
      '2ª Vara do Trabalho de São José dos Campos',
      '3ª Vara do Trabalho de São José dos Campos', 
      '4ª Vara do Trabalho de São José dos Campos',
      '5ª Vara do Trabalho de São José dos Campos'
    ];
    
    console.log('   ✅ Órgãos processados com sucesso:');
    orgaosProcessados.forEach((orgao, index) => {
      const existeNoPrincipal = saoJoseOrgaos.includes(orgao);
      const existeNoRenderer = rendererSaoJoseOrgaos.includes(orgao);
      console.log(`   ${index + 1}. "${orgao}" - Principal: ${existeNoPrincipal ? '✅' : '❌'}, Renderer: ${existeNoRenderer ? '✅' : '❌'}`);
    });
    
    console.log('\n   ❌ Órgãos que faltaram no processamento:');
    orgaosFaltantes.forEach((orgao, index) => {
      const existeNoPrincipal = saoJoseOrgaos.includes(orgao);
      const existeNoRenderer = rendererSaoJoseOrgaos.includes(orgao);
      console.log(`   ${index + 1}. "${orgao}" - Principal: ${existeNoPrincipal ? '✅' : '❌'}, Renderer: ${existeNoRenderer ? '✅' : '❌'}`);
    });
    
    // 4. Verificar configurações de processamento
    console.log('\n🔧 4. Configurações de processamento:');
    
    // Verificar configurações do parallel processor
    const parallelProcessorPath = path.join(__dirname, 'src/main/parallel-oj-processor.js');
    const parallelProcessorContent = fs.readFileSync(parallelProcessorPath, 'utf8');
    
    const batchSizeMatch = parallelProcessorContent.match(/this\.batchSize\s*=\s*(\d+)/);
    const maxConcurrencyMatch = parallelProcessorContent.match(/this\.maxConcurrency\s*=\s*(\d+)/);
    
    console.log(`   Batch Size: ${batchSizeMatch ? batchSizeMatch[1] : 'não encontrado'}`);
    console.log(`   Max Concurrency: ${maxConcurrencyMatch ? maxConcurrencyMatch[1] : 'não encontrado'}`);
    
    // 5. Verificar configurações do servidor skip detector
    const skipDetectorPath = path.join(__dirname, 'src/utils/servidor-skip-detector.js');
    const skipDetectorContent = fs.readFileSync(skipDetectorPath, 'utf8');
    
    const limiteToleranciaMatch = skipDetectorContent.match(/this\.limiteTolerancia\s*=\s*([\d.]+)/);
    const limiteMinimoMatch = skipDetectorContent.match(/this\.limiteMinimo\s*=\s*(\d+)/);
    
    console.log(`   Limite Tolerância: ${limiteToleranciaMatch ? (parseFloat(limiteToleranciaMatch[1]) * 100) + '%' : 'não encontrado'}`);
    console.log(`   Limite Mínimo: ${limiteMinimoMatch ? limiteMinimoMatch[1] : 'não encontrado'}`);
    
    // 6. Análise de possíveis causas
    console.log('\n🎯 5. Possíveis causas do problema:');
    
    if (saoJoseOrgaos.length === 11 && rendererSaoJoseOrgaos.length === 11) {
      console.log('   ✅ Configuração de órgãos está correta (11 órgãos em ambos os arquivos)');
      console.log('   🔍 Problema pode estar em:');
      console.log('      - Cache de OJs já vinculados (SmartOJCache)');
      console.log('      - Processamento em lotes (batchSize=5, pode estar parando prematuramente)');
      console.log('      - Timeout ou erro durante processamento');
      console.log('      - Servidor Skip Detector pulando órgãos por tolerância');
    } else {
      console.log('   ❌ Problema na configuração de órgãos');
      console.log(`      Principal: ${saoJoseOrgaos.length} órgãos`);
      console.log(`      Renderer: ${rendererSaoJoseOrgaos.length} órgãos`);
    }
    
    // 7. Recomendações
    console.log('\n💡 6. Recomendações para resolver:');
    console.log('   1. Limpar cache de OJs antes do processamento');
    console.log('   2. Verificar logs de processamento para timeouts');
    console.log('   3. Aumentar timeout individual por OJ (atualmente 60s)');
    console.log('   4. Verificar se o servidor skip detector está pulando órgãos');
    console.log('   5. Testar processamento sequencial em vez de paralelo');
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error.message);
  }
}

// Executar debug
debugSaoJoseOrgaos().catch(console.error);