// Script de teste para verificar conexão com banco de dados
// Testa a funcionalidade de verificação de OJs já cadastrados

const SmartDatabaseVerifier = require('./src/utils/smart-database-verifier');

async function testarConexaoBanco() {
  console.log('🧪 Iniciando teste de conexão com banco de dados...\n');
  
  const verifier = new SmartDatabaseVerifier();
  
  try {
    // 1. Testar inicialização
    console.log('1️⃣ Testando inicialização...');
    const initialized = await verifier.initialize();
    
    if (!initialized) {
      console.log('❌ Falha na inicialização do sistema de banco');
      return;
    }
    
    console.log('✅ Sistema de banco inicializado com sucesso\n');
    
    // 2. Testar verificação de servidor (usando um ID de exemplo)
    console.log('2️⃣ Testando verificação de servidor...');
    const servidorInfo = await verifier.verificarServidor(30733); // ID do exemplo fornecido
    
    if (servidorInfo.existe) {
      console.log('✅ Servidor encontrado:');
      console.log(`   - Nome: ${servidorInfo.servidor.nome}`);
      console.log(`   - CPF: ${servidorInfo.servidor.cpf}`);
      console.log(`   - OJs já cadastrados: ${servidorInfo.servidor.totalOjsCadastrados}`);
    } else {
      console.log('⚠️ Servidor não encontrado no banco');
    }
    
    console.log('\n');
    
    // 3. Testar verificação de OJs
    console.log('3️⃣ Testando verificação de OJs...');
    const ojsParaTestar = [
      '1ª Vara do Trabalho de Campinas',
      '2ª Vara do Trabalho de Campinas',
      'Vara do Trabalho de Limeira'
    ];
    
    const resultadoOJs = await verifier.verificarOJsServidor(30733, ojsParaTestar);
    
    console.log('📊 Resultado da verificação:');
    console.log(`   - Total verificados: ${resultadoOJs.estatisticas.totalVerificados}`);
    console.log(`   - Já cadastrados: ${resultadoOJs.estatisticas.jaCadastrados}`);
    console.log(`   - Para processar: ${resultadoOJs.estatisticas.paraProcessar}`);
    console.log(`   - Economia estimada: ${resultadoOJs.estatisticas.economiaEstimada}s`);
    
    if (resultadoOJs.ojsJaCadastrados.length > 0) {
      console.log('\n📋 OJs já cadastrados:');
      resultadoOJs.ojsJaCadastrados.forEach(oj => {
        console.log(`   - ${oj.nome} (ID: ${oj.idOrgaoJulgador})`);
      });
    }
    
    if (resultadoOJs.ojsParaProcessar.length > 0) {
      console.log('\n🔄 OJs para processar:');
      resultadoOJs.ojsParaProcessar.forEach(oj => {
        console.log(`   - ${oj}`);
      });
    }
    
    console.log('\n');
    
    // 4. Testar normalização de OJ
    console.log('4️⃣ Testando normalização de OJ...');
    const ojsNormalizados = await verifier.normalizarOJ('Campinas');
    
    if (ojsNormalizados.length > 0) {
      console.log(`✅ Encontrados ${ojsNormalizados.length} OJs com "Campinas":`);
      ojsNormalizados.slice(0, 5).forEach(oj => {
        console.log(`   - ${oj.ds_orgao_julgador} (ID: ${oj.id_orgao_julgador})`);
      });
      if (ojsNormalizados.length > 5) {
        console.log(`   ... e mais ${ojsNormalizados.length - 5} OJs`);
      }
    } else {
      console.log('⚠️ Nenhum OJ encontrado com "Campinas"');
    }
    
    console.log('\n');
    
    // 5. Gerar relatório de otimização
    console.log('5️⃣ Relatório de otimização:');
    const relatorio = verifier.gerarRelatorioOtimizacao();
    
    console.log('📈 Estatísticas do sistema:');
    console.log(`   - Total verificações: ${relatorio.sistema.totalVerificacoes}`);
    console.log(`   - OJs pulados: ${relatorio.sistema.ojsPulados}`);
    console.log(`   - OJs processados: ${relatorio.sistema.ojsProcessados}`);
    console.log(`   - Tempo economizado: ${relatorio.sistema.tempoEconomizado}s`);
    console.log(`   - Erros de conexão: ${relatorio.sistema.errosConexao}`);
    
    console.log('\n📊 Estatísticas do cache:');
    console.log(`   - Hit rate: ${relatorio.cache.hitRate}`);
    console.log(`   - Tamanho do cache: ${relatorio.cache.cacheSize}/${relatorio.cache.maxCacheSize}`);
    console.log(`   - Total queries: ${relatorio.cache.totalQueries}`);
    
    console.log('\n🎯 Eficiência:');
    console.log(`   - Taxa de OJs pulados: ${relatorio.eficiencia.taxaPulados}`);
    console.log(`   - Tempo economizado: ${relatorio.eficiencia.tempoEconomizadoMinutos}min`);
    console.log(`   - Economia por verificação: ${relatorio.eficiencia.economiaPorVerificacao}s`);
    
    console.log('\n✅ Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Limpar recursos
    await verifier.cleanup();
    console.log('\n🧹 Recursos limpos');
  }
}

// Executar teste
if (require.main === module) {
  testarConexaoBanco().catch(console.error);
}

module.exports = { testarConexaoBanco };

