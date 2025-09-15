// Exemplo de uso do sistema de verificação de banco de dados
// Demonstra como usar a verificação inteligente de OJs já cadastrados

const SmartDatabaseVerifier = require('./src/utils/smart-database-verifier');

async function exemploUsoSistema() {
  console.log('🚀 Exemplo de uso do sistema de verificação de banco\n');
  
  const verifier = new SmartDatabaseVerifier();
  
  try {
    // 1. Inicializar sistema
    console.log('1️⃣ Inicializando sistema...');
    const initialized = await verifier.initialize();
    
    if (!initialized) {
      console.log('❌ Sistema não pôde ser inicializado');
      return;
    }
    
    console.log('✅ Sistema inicializado\n');
    
    // 2. Exemplo de servidores para processar
    const servidores = [
      {
        idUsuario: 30733,
        nome: 'João Silva',
        cpf: '12345678901',
        orgaos: [
          '1ª Vara do Trabalho de Campinas',
          '2ª Vara do Trabalho de Campinas',
          'Vara do Trabalho de Limeira',
          'Vara do Trabalho de São José dos Campos'
        ]
      },
      {
        idUsuario: 30734,
        nome: 'Maria Santos',
        cpf: '98765432100',
        orgaos: [
          '1ª Vara do Trabalho de Bauru',
          '2ª Vara do Trabalho de Bauru',
          'Vara do Trabalho de Araraquara'
        ]
      }
    ];
    
    console.log('2️⃣ Processando servidores com verificação inteligente...\n');
    
    // 3. Processar servidores com verificação de banco
    const resultado = await verifier.processarServidoresComVerificacao(servidores);
    
    console.log('📊 RESULTADO DO PROCESSAMENTO:');
    console.log(`   - Servidores processados: ${resultado.servidoresProcessados}`);
    console.log(`   - Servidores pulados: ${resultado.servidoresPulados}`);
    console.log(`   - Total OJs verificados: ${resultado.totalOjsVerificados}`);
    console.log(`   - OJs pulados: ${resultado.totalOjsPulados}`);
    console.log(`   - OJs para processar: ${resultado.totalOjsParaProcessar}`);
    console.log(`   - Tempo economizado: ${Math.round(resultado.tempoEconomizadoTotal / 60)}min\n`);
    
    // 4. Detalhar cada servidor
    console.log('📋 DETALHES POR SERVIDOR:');
    resultado.detalhes.forEach((detalhe, index) => {
      console.log(`\n${index + 1}. ${detalhe.servidor} (Status: ${detalhe.status})`);
      
      if (detalhe.ojsJaCadastrados && detalhe.ojsJaCadastrados.length > 0) {
        console.log('   ✅ OJs já cadastrados:');
        detalhe.ojsJaCadastrados.forEach(oj => {
          console.log(`      - ${oj.nome} (ID: ${oj.idOrgaoJulgador})`);
        });
      }
      
      if (detalhe.ojsInativos && detalhe.ojsInativos.length > 0) {
        console.log('   ⚠️ OJs inativos:');
        detalhe.ojsInativos.forEach(oj => {
          console.log(`      - ${oj.nome} (Final: ${oj.dataFinal})`);
        });
      }
      
      if (detalhe.ojsParaProcessar && detalhe.ojsParaProcessar.length > 0) {
        console.log('   🔄 OJs para processar:');
        detalhe.ojsParaProcessar.forEach(oj => {
          console.log(`      - ${oj}`);
        });
      }
      
      if (detalhe.tempoEconomizado > 0) {
        console.log(`   ⏱️ Tempo economizado: ${detalhe.tempoEconomizado}s`);
      }
    });
    
    console.log('\n');
    
    // 5. Exemplo de verificação individual de OJs
    console.log('3️⃣ Exemplo de verificação individual...');
    const ojsParaVerificar = [
      '1ª Vara do Trabalho de Campinas',
      'Vara do Trabalho de Limeira',
      'Vara do Trabalho de São Paulo' // Este não deve existir
    ];
    
    const verificacaoIndividual = await verifier.verificarOJsServidor(30733, ojsParaVerificar);
    
    console.log('📊 Verificação individual:');
    console.log(`   - Total: ${verificacaoIndividual.estatisticas.totalVerificados}`);
    console.log(`   - Já cadastrados: ${verificacaoIndividual.estatisticas.jaCadastrados}`);
    console.log(`   - Para processar: ${verificacaoIndividual.estatisticas.paraProcessar}`);
    console.log(`   - Economia: ${verificacaoIndividual.estatisticas.economiaEstimada}s`);
    
    console.log('\n');
    
    // 6. Exemplo de normalização de OJ
    console.log('4️⃣ Exemplo de normalização...');
    const ojsNormalizados = await verifier.normalizarOJ('São José');
    
    console.log(`🔍 OJs encontrados com "São José": ${ojsNormalizados.length}`);
    ojsNormalizados.slice(0, 3).forEach(oj => {
      console.log(`   - ${oj.ds_orgao_julgador} (ID: ${oj.id_orgao_julgador})`);
    });
    
    console.log('\n');
    
    // 7. Relatório final de otimização
    console.log('5️⃣ Relatório final de otimização:');
    const relatorioFinal = verifier.gerarRelatorioOtimizacao();
    
    console.log('📈 Sistema:');
    console.log(`   - Inicializado: ${relatorioFinal.sistema.inicializado ? 'Sim' : 'Não'}`);
    console.log(`   - Verificações: ${relatorioFinal.sistema.totalVerificacoes}`);
    console.log(`   - OJs pulados: ${relatorioFinal.sistema.ojsPulados}`);
    console.log(`   - Tempo economizado: ${relatorioFinal.sistema.tempoEconomizado}s`);
    
    console.log('\n📊 Cache:');
    console.log(`   - Hit rate: ${relatorioFinal.cache.hitRate}`);
    console.log(`   - Tamanho: ${relatorioFinal.cache.cacheSize}/${relatorioFinal.cache.maxCacheSize}`);
    
    console.log('\n🎯 Eficiência:');
    console.log(`   - Taxa de pulos: ${relatorioFinal.eficiencia.taxaPulados}`);
    console.log(`   - Tempo economizado: ${relatorioFinal.eficiencia.tempoEconomizadoMinutos}min`);
    
    console.log('\n✅ Exemplo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o exemplo:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Limpar recursos
    await verifier.cleanup();
    console.log('\n🧹 Recursos limpos');
  }
}

// Executar exemplo
if (require.main === module) {
  exemploUsoSistema().catch(console.error);
}

module.exports = { exemploUsoSistema };

