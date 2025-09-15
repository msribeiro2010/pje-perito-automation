/**
 * Teste para verificar se a busca de servidores retorna o papel específico em cada OJ
 */

const DatabaseConnection = require('./src/utils/database-connection');

async function testarServidorPapelOJ() {
  const dbConnection = new DatabaseConnection();

  try {
    console.log('🧪 Testando busca de servidores com papel específico por OJ...');

    // Buscar um servidor específico (Marcelo)
    const servidores = await dbConnection.buscarServidores('1', '53036140697');

    console.log('\n📊 Resultados encontrados:');
    console.log(`Total: ${servidores.length} registro(s)`);

    if (servidores.length > 0) {
      servidores.forEach((servidor, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        console.log(`👤 Nome: ${servidor.nome}`);
        console.log(`🆔 CPF: ${servidor.cpf}`);
        console.log(`📋 Tipo Usuário: ${servidor.perfil}`);
        console.log(`🏛️ Órgão Julgador: ${servidor.orgao}`);
        console.log(`🎭 Perfil no OJ: ${servidor.papel_orgao}`);
        console.log(`📅 Data Início: ${servidor.dt_inicio ? new Date(servidor.dt_inicio).toLocaleDateString('pt-BR') : 'Não informado'}`);
        console.log(`📅 Data Fim: ${servidor.dt_final ? new Date(servidor.dt_final).toLocaleDateString('pt-BR') : 'Não informado'}`);
      });

      console.log('\n✅ Teste concluído com sucesso!');
      console.log('🔍 Verificações:');
      console.log(`   - Campo "papel_orgao" presente: ${servidores[0].papel_orgao ? '✅' : '❌'}`);
      console.log(`   - Dados de datas presentes: ${servidores[0].dt_inicio ? '✅' : '❌'}`);
      console.log(`   - Órgão julgador informado: ${servidores[0].orgao !== 'Não informado' ? '✅' : '❌'}`);

    } else {
      console.log('⚠️ Nenhum servidor encontrado para o CPF especificado');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await dbConnection.close();
  }
}

// Executar teste
testarServidorPapelOJ();