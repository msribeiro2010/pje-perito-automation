/**
 * Teste para verificar se a busca de servidores do 2º grau funciona corretamente
 */

const DatabaseConnection = require('./src/utils/database-connection');

async function testarServidores2Grau() {
  const dbConnection = new DatabaseConnection();

  try {
    console.log('🧪 Testando busca de servidores do 2º grau...');

    // Buscar servidores do 2º grau (sem filtro específico para ver diferentes OJs)
    console.log('\n🔍 Buscando todos os servidores do 2º grau (limitado a 10)...');
    const servidores2Grau = await dbConnection.buscarServidores('2', '', '', 10);

    console.log(`\n📊 Resultados 2º grau encontrados: ${servidores2Grau.length}`);

    if (servidores2Grau.length > 0) {
      servidores2Grau.forEach((servidor, index) => {
        console.log(`\n--- Registro 2º Grau ${index + 1} ---`);
        console.log(`👤 Nome: ${servidor.nome}`);
        console.log(`🆔 CPF: ${servidor.cpf}`);
        console.log(`📋 Tipo Usuário: ${servidor.perfil}`);
        console.log(`🏛️ Órgão Julgador: ${servidor.orgao}`);
        console.log(`🎭 Perfil no OJ: ${servidor.papel_orgao}`);
        console.log(`📅 Data Início: ${servidor.dt_inicio ? new Date(servidor.dt_inicio).toLocaleDateString('pt-BR') : 'Não informado'}`);
        console.log(`📅 Data Fim: ${servidor.dt_final ? new Date(servidor.dt_final).toLocaleDateString('pt-BR') : 'Não informado'}`);
      });
    }

    // Comparar com 1º grau
    console.log('\n🔍 Buscando servidores do 1º grau para comparação (limitado a 5)...');
    const servidores1Grau = await dbConnection.buscarServidores('1', '', '', 5);

    console.log(`\n📊 Resultados 1º grau encontrados: ${servidores1Grau.length}`);

    if (servidores1Grau.length > 0) {
      servidores1Grau.forEach((servidor, index) => {
        console.log(`\n--- Registro 1º Grau ${index + 1} ---`);
        console.log(`👤 Nome: ${servidor.nome}`);
        console.log(`🏛️ Órgão Julgador: ${servidor.orgao}`);
        console.log(`🎭 Perfil no OJ: ${servidor.papel_orgao}`);
      });
    }

    // Análise dos órgãos
    const orgaos1Grau = [...new Set(servidores1Grau.map(s => s.orgao))];
    const orgaos2Grau = [...new Set(servidores2Grau.map(s => s.orgao))];

    console.log('\n🔍 Análise de Órgãos Julgadores:');
    console.log(`📊 Órgãos únicos 1º grau: ${orgaos1Grau.length}`);
    console.log(`📊 Órgãos únicos 2º grau: ${orgaos2Grau.length}`);

    console.log('\n🏛️ Exemplos de órgãos 1º grau:');
    orgaos1Grau.slice(0, 3).forEach(orgao => console.log(`   - ${orgao}`));

    console.log('\n🏛️ Exemplos de órgãos 2º grau:');
    orgaos2Grau.slice(0, 3).forEach(orgao => console.log(`   - ${orgao}`));

    console.log('\n✅ Teste concluído!');
    console.log('🔍 Verificações:');
    console.log(`   - 2º grau retorna dados: ${servidores2Grau.length > 0 ? '✅' : '❌'}`);
    console.log(`   - Órgãos diferentes entre graus: ${orgaos1Grau[0] !== orgaos2Grau[0] ? '✅' : '⚠️'}`);
    console.log(`   - Campos corretos 2º grau: ${servidores2Grau[0]?.papel_orgao ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await dbConnection.close();
  }
}

// Executar teste
testarServidores2Grau();