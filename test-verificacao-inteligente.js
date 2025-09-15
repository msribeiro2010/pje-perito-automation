#!/usr/bin/env node
/**
 * Teste do Sistema Inteligente de Verificação de OJs
 * Demonstra como o sistema consulta o banco antes de fazer cadastros
 */

const DatabaseConnection = require('./src/utils/database-connection.js');

async function testarVerificacaoInteligente() {
  console.log('🧠 TESTE DO SISTEMA INTELIGENTE DE VERIFICAÇÃO DE OJs');
  console.log('=' .repeat(60));
  
  const dbConnection = new DatabaseConnection();
  
  try {
    // 1. Conectar ao banco
    console.log('\n1️⃣ Conectando ao banco de dados...');
    const connected = await dbConnection.initialize();
    
    if (!connected) {
      console.log('❌ Não foi possível conectar ao banco. Finalizando teste.');
      return;
    }
    
    // 2. Exemplo de servidor para teste (substitua por um CPF real do seu sistema)
    const cpfTeste = '12345678901'; // Substitua por um CPF real
    console.log(`\n2️⃣ Buscando servidor com CPF: ${cpfTeste}`);
    
    const resultadoServidor = await dbConnection.buscarServidorPorCPF(cpfTeste);
    
    if (!resultadoServidor.existe) {
      console.log(`⚠️  Servidor com CPF ${cpfTeste} não encontrado.`);
      console.log('💡 Para testar, use um CPF de servidor que já existe no sistema.');
      return;
    }
    
    console.log('✅ Servidor encontrado:');
    console.log(`   ID: ${resultadoServidor.servidor.idUsuario}`);
    console.log(`   CPF: ${resultadoServidor.servidor.cpf}`);
    console.log(`   Total OJs já cadastrados: ${resultadoServidor.servidor.totalOjsCadastrados}`);
    
    // 3. Lista de exemplo de OJs para verificar
    const ojsParaTeste = [
      '1ª Vara do Trabalho de São José dos Campos',
      '2ª Vara do Trabalho de São José dos Campos',
      '3ª Vara do Trabalho de São José dos Campos',
      '4ª Vara do Trabalho de São José dos Campos',
      '5ª Vara do Trabalho de São José dos Campos',
      'Vara Cível de Taubaté',
      'Tribunal Regional do Trabalho da 15ª Região - TRT15'
    ];
    
    console.log(`\n3️⃣ Verificando ${ojsParaTeste.length} OJs de exemplo...`);
    
    // 4. Realizar verificação inteligente
    const verificacao = await dbConnection.verificarOJsCadastrados(
      resultadoServidor.servidor.idUsuario,
      ojsParaTeste
    );
    
    // 5. Exibir resultados
    console.log('\n📊 RESULTADOS DA VERIFICAÇÃO INTELIGENTE:');
    console.log('-'.repeat(50));
    console.log(`   📋 Total verificados: ${verificacao.totalVerificados}`);
    console.log(`   ✅ Já cadastrados (ativos): ${verificacao.ojsJaCadastrados.length}`);
    console.log(`   ⏸️  Inativos: ${verificacao.ojsInativos.length}`);
    console.log(`   🔄 Para processar: ${verificacao.ojsParaProcessar.length}`);
    console.log(`   ⚡ Economia estimada: ${verificacao.estatisticas.economiaEstimada} segundos`);
    
    if (verificacao.ojsJaCadastrados.length > 0) {
      console.log('\n✅ OJs JÁ CADASTRADOS (não serão processados):');
      verificacao.ojsJaCadastrados.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.nome} (desde ${oj.dataInicio})`);
      });
    }
    
    if (verificacao.ojsInativos.length > 0) {
      console.log('\n⏸️  OJs INATIVOS (histórico):');
      verificacao.ojsInativos.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.nome} (${oj.dataInicio} até ${oj.dataFinal})`);
      });
    }
    
    if (verificacao.ojsParaProcessar.length > 0) {
      console.log('\n🔄 OJs QUE SERÃO PROCESSADOS:');
      verificacao.ojsParaProcessar.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj}`);
      });
    } else {
      console.log('\n🎉 OTIMIZAÇÃO MÁXIMA: Todos os OJs já estão cadastrados!');
      console.log('   O sistema pulará este servidor completamente.');
    }
    
    // 6. Estatísticas da economia
    console.log('\n💰 ECONOMIA ESTIMADA:');
    console.log('-'.repeat(30));
    console.log(`   ⏱️  Tempo economizado: ${verificacao.estatisticas.economiaEstimada} segundos`);
    console.log(`   🖱️  Cliques evitados: ~${verificacao.ojsJaCadastrados.length * 3}`);
    console.log(`   📈 Eficiência: ${((verificacao.ojsJaCadastrados.length / verificacao.totalVerificados) * 100).toFixed(1)}% de otimização`);
    
    console.log('\n🎯 COMO O SISTEMA FUNCIONARÁ:');
    console.log('   1. Antes de processar cada servidor, consulta o banco');
    console.log('   2. Identifica OJs já cadastrados automaticamente');  
    console.log('   3. Processa apenas os OJs que realmente precisam ser cadastrados');
    console.log('   4. Economiza tempo e evita cliques desnecessários');
    console.log('   5. Funciona mesmo se o banco estiver indisponível (modo fallback)');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.log('\n🔧 SOLUÇÃO:');
    console.log('   1. Verifique as credenciais do banco em database.config.js');
    console.log('   2. Certifique-se de que o banco está acessível');
    console.log('   3. Use um CPF de servidor que existe no sistema');
  } finally {
    // Fechar conexão
    if (dbConnection) {
      await dbConnection.close();
      console.log('\n🔌 Conexão com banco fechada.');
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  console.log('Para personalizar o teste, edite o CPF na linha 25 deste arquivo.');
  console.log('Use um CPF de servidor que já existe no seu sistema PJE.\n');
  
  testarVerificacaoInteligente()
    .then(() => {
      console.log('\n✅ Teste concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro no teste:', error.message);
      process.exit(1);
    });
}

module.exports = { testarVerificacaoInteligente };