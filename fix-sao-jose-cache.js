const fs = require('fs');
const path = require('path');

/**
 * Script para corrigir o problema do cache de OJs de São José dos Campos
 * que está impedindo o processamento das 2ª, 3ª, 4ª e 5ª Varas
 */

class SaoJoseCacheFixer {
  constructor() {
    this.orgaosFaltantes = [
      '2ª Vara do Trabalho de São José dos Campos',
      '3ª Vara do Trabalho de São José dos Campos', 
      '4ª Vara do Trabalho de São José dos Campos',
      '5ª Vara do Trabalho de São José dos Campos'
    ];
  }

  /**
   * Normaliza texto para comparação (similar ao NormalizadorTexto)
   */
  normalizar(texto) {
    if (!texto || typeof texto !== 'string') return '';
    
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Verifica se há cache persistente que pode estar causando o problema
   */
  verificarCachePersistente() {
    console.log('🔍 === VERIFICAÇÃO DE CACHE PERSISTENTE ===\n');
    
    const possiveisCaches = [
      'cache-ojs.json',
      'smart-oj-cache.json', 
      'ojs-vinculados.json',
      'data/cache-ojs.json',
      'data/smart-oj-cache.json',
      'src/cache-ojs.json'
    ];
    
    let cacheEncontrado = false;
    
    possiveisCaches.forEach(cacheFile => {
      const cachePath = path.join(__dirname, cacheFile);
      if (fs.existsSync(cachePath)) {
        cacheEncontrado = true;
        console.log(`📁 Cache encontrado: ${cacheFile}`);
        
        try {
          const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          console.log(`   Tamanho: ${Object.keys(cacheData).length} entradas`);
          
          // Verificar se algum dos órgãos faltantes está no cache
          this.orgaosFaltantes.forEach(orgao => {
            const orgaoNormalizado = this.normalizar(orgao);
            
            // Verificar chaves diretas
            if (cacheData[orgaoNormalizado]) {
              console.log(`   ⚠️  "${orgao}" encontrado no cache (normalizado)`);
              console.log(`       Status: ${JSON.stringify(cacheData[orgaoNormalizado])}`);
            }
            
            // Verificar chaves originais
            if (cacheData[orgao]) {
              console.log(`   ⚠️  "${orgao}" encontrado no cache (original)`);
              console.log(`       Status: ${JSON.stringify(cacheData[orgao])}`);
            }
            
            // Buscar por similaridade
            Object.keys(cacheData).forEach(key => {
              if (key.includes('vara') && key.includes('sao jose') && 
                  (key.includes('2a') || key.includes('3a') || key.includes('4a') || key.includes('5a'))) {
                console.log(`   🔍 Entrada similar: "${key}" -> ${JSON.stringify(cacheData[key])}`);
              }
            });
          });
          
        } catch (error) {
          console.log(`   ❌ Erro ao ler cache: ${error.message}`);
        }
        
        console.log();
      }
    });
    
    if (!cacheEncontrado) {
      console.log('✅ Nenhum arquivo de cache persistente encontrado\n');
    }
    
    return cacheEncontrado;
  }

  /**
   * Limpa todos os caches encontrados
   */
  limparCaches() {
    console.log('🧹 === LIMPEZA DE CACHES ===\n');
    
    const possiveisCaches = [
      'cache-ojs.json',
      'smart-oj-cache.json', 
      'ojs-vinculados.json',
      'data/cache-ojs.json',
      'data/smart-oj-cache.json',
      'src/cache-ojs.json'
    ];
    
    let cachesLimpos = 0;
    
    possiveisCaches.forEach(cacheFile => {
      const cachePath = path.join(__dirname, cacheFile);
      if (fs.existsSync(cachePath)) {
        try {
          // Fazer backup antes de limpar
          const backupPath = cachePath + '.backup-' + Date.now();
          fs.copyFileSync(cachePath, backupPath);
          console.log(`📋 Backup criado: ${path.basename(backupPath)}`);
          
          // Limpar cache
          fs.unlinkSync(cachePath);
          console.log(`🗑️  Cache removido: ${cacheFile}`);
          cachesLimpos++;
          
        } catch (error) {
          console.log(`❌ Erro ao limpar ${cacheFile}: ${error.message}`);
        }
      }
    });
    
    console.log(`\n✅ Total de caches limpos: ${cachesLimpos}\n`);
    return cachesLimpos;
  }

  /**
   * Verifica configurações que podem estar causando o problema
   */
  verificarConfiguracoes() {
    console.log('⚙️ === VERIFICAÇÃO DE CONFIGURAÇÕES ===\n');
    
    // 1. Verificar configurações do parallel processor
    const parallelProcessorPath = path.join(__dirname, 'src/main/parallel-oj-processor.js');
    if (fs.existsSync(parallelProcessorPath)) {
      const content = fs.readFileSync(parallelProcessorPath, 'utf8');
      
      // Verificar timeout individual
      const timeoutMatch = content.match(/timeout.*?(\d+).*?segundos?/i) || 
                          content.match(/timeout.*?(\d+).*?ms/i) ||
                          content.match(/(\d+).*?timeout/i);
      
      if (timeoutMatch) {
        console.log(`⏱️  Timeout encontrado: ${timeoutMatch[0]}`);
      }
      
      // Verificar se há limite de processamento
      const limiteMatch = content.match(/limit.*?(\d+)/i) || 
                         content.match(/(\d+).*?limit/i);
      
      if (limiteMatch) {
        console.log(`🔢 Limite encontrado: ${limiteMatch[0]}`);
      }
    }
    
    // 2. Verificar servidor skip detector
    const skipDetectorPath = path.join(__dirname, 'src/utils/servidor-skip-detector.js');
    if (fs.existsSync(skipDetectorPath)) {
      const content = fs.readFileSync(skipDetectorPath, 'utf8');
      
      console.log('🚫 Configurações do Skip Detector:');
      
      const toleranciaMatch = content.match(/limiteTolerancia\s*=\s*([\d.]+)/);
      const minimoMatch = content.match(/limiteMinimo\s*=\s*(\d+)/);
      
      if (toleranciaMatch) {
        const tolerancia = parseFloat(toleranciaMatch[1]) * 100;
        console.log(`   Tolerância: ${tolerancia}%`);
        
        if (tolerancia >= 90) {
          console.log(`   ⚠️  Tolerância muito alta (${tolerancia}%) pode estar pulando órgãos`);
        }
      }
      
      if (minimoMatch) {
        console.log(`   Mínimo de OJs: ${minimoMatch[1]}`);
      }
    }
    
    console.log();
  }

  /**
   * Gera script de teste para verificar processamento individual
   */
  gerarScriptTeste() {
    console.log('🧪 === GERAÇÃO DE SCRIPT DE TESTE ===\n');
    
    const scriptTeste = `
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
    console.log(\`\\n🔍 Testando: \${orgao}\`);
    
    // Verificar se está no cache
    const resultadoCache = cache.verificarCache(orgao);
    console.log(\`   Cache: \${resultadoCache ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}\`);
    
    if (resultadoCache) {
      console.log(\`   Status: \${JSON.stringify(resultadoCache)}\`);
    }
    
    // Verificar validação
    const valido = cache.validarOrgaoJulgador(orgao);
    console.log(\`   Validação: \${valido ? 'VÁLIDO' : 'INVÁLIDO'}\`);
  }
}

testarOrgaosFaltantes().catch(console.error);
`;
    
    const scriptPath = path.join(__dirname, 'teste-orgaos-faltantes.js');
    fs.writeFileSync(scriptPath, scriptTeste);
    
    console.log(`✅ Script de teste criado: ${path.basename(scriptPath)}`);
    console.log('   Execute com: node teste-orgaos-faltantes.js\n');
    
    return scriptPath;
  }

  /**
   * Executa todas as verificações e correções
   */
  async executar() {
    console.log('🚀 === CORREÇÃO DO CACHE DE SÃO JOSÉ DOS CAMPOS ===\n');
    
    // 1. Verificar cache persistente
    const temCache = this.verificarCachePersistente();
    
    // 2. Verificar configurações
    this.verificarConfiguracoes();
    
    // 3. Limpar caches se encontrados
    if (temCache) {
      console.log('⚠️  Caches encontrados. Deseja limpar? (Recomendado)');
      console.log('   Execute novamente com --limpar para confirmar\n');
      
      // Se argumento --limpar foi passado
      if (process.argv.includes('--limpar')) {
        this.limparCaches();
      }
    }
    
    // 4. Gerar script de teste
    this.gerarScriptTeste();
    
    // 5. Recomendações finais
    console.log('💡 === RECOMENDAÇÕES FINAIS ===\n');
    console.log('1. Execute: node teste-orgaos-faltantes.js');
    console.log('2. Se caches foram encontrados, execute: node fix-sao-jose-cache.js --limpar');
    console.log('3. Tente processar novamente com processamento sequencial');
    console.log('4. Se o problema persistir, aumente o timeout individual para 120s');
    console.log('5. Considere reduzir a tolerância do skip detector para 85%\n');
  }
}

// Executar correção
const fixer = new SaoJoseCacheFixer();
fixer.executar().catch(console.error);