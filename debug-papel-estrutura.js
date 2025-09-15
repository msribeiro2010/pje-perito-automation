/**
 * Debug para verificar estrutura das tabelas de papel
 */

const DatabaseConnection = require('./src/utils/database-connection');

async function debugPapelEstrutura() {
  const dbConnection = new DatabaseConnection();

  try {
    console.log('🔍 Investigando estrutura das tabelas de papel...');

    // Inicializar conexão com 1º grau
    await dbConnection.initialize();
    const client = await dbConnection.pool.connect();

    console.log('\n1️⃣ Verificando se existe tabela tb_papel:');
    try {
      const testPapel = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'pje'
        AND table_name = 'tb_papel'
        ORDER BY ordinal_position
      `);

      if (testPapel.rows.length > 0) {
        console.log('✅ Tabela tb_papel existe com colunas:');
        testPapel.rows.forEach(row => {
          console.log(`   - ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('❌ Tabela tb_papel não encontrada');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tb_papel:', error.message);
    }

    console.log('\n2️⃣ Verificando estrutura da tb_usuario_localizacao:');
    try {
      const testUL = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'pje'
        AND table_name = 'tb_usuario_localizacao'
        ORDER BY ordinal_position
      `);

      if (testUL.rows.length > 0) {
        console.log('✅ Tabela tb_usuario_localizacao com colunas:');
        testUL.rows.forEach(row => {
          console.log(`   - ${row.column_name} (${row.data_type})`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tb_usuario_localizacao:', error.message);
    }

    console.log('\n3️⃣ Buscando tabelas que contenham "papel" no nome:');
    try {
      const tabelasPapel = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'pje'
        AND table_name ILIKE '%papel%'
        ORDER BY table_name
      `);

      console.log('📋 Tabelas encontradas com "papel":');
      tabelasPapel.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } catch (error) {
      console.log('❌ Erro ao buscar tabelas:', error.message);
    }

    console.log('\n4️⃣ Verificando dados de exemplo do usuário 202512:');
    try {
      const exemplo = await client.query(`
        SELECT ulz.*, ulm.*, ulv.dt_inicio, ulv.dt_final, oj.ds_orgao_julgador
        FROM pje.tb_usuario_localizacao ulz
        LEFT JOIN pje.tb_usu_local_mgtdo_servdor ulm ON ulz.id_usuario_localizacao = ulm.id_usu_local_mgstrado_servidor
        LEFT JOIN pje.tb_usu_local_visibilidade ulv ON ulm.id_usu_local_mgstrado_servidor = ulv.id_usu_local_mgstrado_servidor
        LEFT JOIN pje.tb_orgao_julgador oj ON ulm.id_orgao_julgador = oj.id_orgao_julgador
        WHERE ulz.id_usuario = 202512
        LIMIT 3
      `);

      console.log('📊 Exemplo de dados:');
      exemplo.rows.forEach((row, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        Object.keys(row).forEach(key => {
          if (row[key] !== null) {
            console.log(`   ${key}: ${row[key]}`);
          }
        });
      });
    } catch (error) {
      console.log('❌ Erro ao buscar exemplo:', error.message);
    }

    client.release();

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await dbConnection.close();
  }
}

// Executar debug
debugPapelEstrutura();