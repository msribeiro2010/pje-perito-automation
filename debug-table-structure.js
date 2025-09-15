// Script para investigar a estrutura das tabelas do banco
// Identifica os nomes corretos das colunas

const SmartDatabaseVerifier = require('./src/utils/smart-database-verifier');

async function investigarEstruturaTabelas() {
  console.log('🔍 Investigando estrutura das tabelas do banco...\n');
  
  const verifier = new SmartDatabaseVerifier();
  
  try {
    // Inicializar sistema
    const initialized = await verifier.initialize();
    if (!initialized) {
      console.log('❌ Sistema não pôde ser inicializado');
      return;
    }
    
    const client = await verifier.dbConnection.pool.connect();
    
    // 1. Investigar estrutura da tabela tb_usuario
    console.log('1️⃣ Estrutura da tabela tb_usuario:');
    const usuarioStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'pje' AND table_name = 'tb_usuario'
      ORDER BY ordinal_position
    `);
    
    usuarioStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 2. Investigar estrutura da tabela tb_usuario_localizacao
    console.log('\n2️⃣ Estrutura da tabela tb_usuario_localizacao:');
    const localizacaoStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'pje' AND table_name = 'tb_usuario_localizacao'
      ORDER BY ordinal_position
    `);
    
    localizacaoStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 3. Investigar estrutura da tabela tb_orgao_julgador
    console.log('\n3️⃣ Estrutura da tabela tb_orgao_julgador:');
    const orgaoStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'pje' AND table_name = 'tb_orgao_julgador'
      ORDER BY ordinal_position
    `);
    
    orgaoStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 4. Buscar alguns usuários para testar
    console.log('\n4️⃣ Buscando usuários para teste:');
    const usuariosTeste = await client.query(`
      SELECT 
        ul.id_usuario,
        ul.id_usuario_localizacao,
        u.*
      FROM pje.tb_usuario_localizacao ul
      JOIN pje.tb_usuario u ON ul.id_usuario = u.id_usuario
      WHERE u.nr_cpf LIKE '%09750350880%' OR u.nm_usuario ILIKE '%Dirlei%'
      LIMIT 5
    `);
    
    if (usuariosTeste.rows.length > 0) {
      console.log(`✅ Encontrados ${usuariosTeste.rows.length} usuários:`);
      usuariosTeste.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id_usuario}, CPF: ${user.nr_cpf}`);
        // Mostrar todas as colunas disponíveis
        Object.keys(user).forEach(key => {
          if (key !== 'id_usuario' && key !== 'id_usuario_localizacao' && user[key]) {
            console.log(`      ${key}: ${user[key]}`);
          }
        });
      });
    } else {
      console.log('❌ Nenhum usuário encontrado com os critérios de busca');
      
      // Buscar qualquer usuário para ver a estrutura
      const qualquerUsuario = await client.query(`
        SELECT 
          ul.id_usuario,
          ul.id_usuario_localizacao,
          u.*
        FROM pje.tb_usuario_localizacao ul
        JOIN pje.tb_usuario u ON ul.id_usuario = u.id_usuario
        LIMIT 1
      `);
      
      if (qualquerUsuario.rows.length > 0) {
        console.log('\n📋 Exemplo de usuário (primeiro da tabela):');
        const user = qualquerUsuario.rows[0];
        Object.keys(user).forEach(key => {
          if (user[key]) {
            console.log(`   ${key}: ${user[key]}`);
          }
        });
      }
    }
    
    // 5. Buscar OJs relacionados a juizados especiais
    console.log('\n5️⃣ Buscando OJs relacionados a Juizados Especiais:');
    const ojsJuizados = await client.query(`
      SELECT id_orgao_julgador, ds_orgao_julgador
      FROM pje.tb_orgao_julgador 
      WHERE ds_orgao_julgador ILIKE '%juizado%especial%infancia%'
      ORDER BY ds_orgao_julgador
      LIMIT 10
    `);
    
    if (ojsJuizados.rows.length > 0) {
      console.log(`✅ Encontrados ${ojsJuizados.rows.length} OJs de Juizados Especiais:`);
      ojsJuizados.rows.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.ds_orgao_julgador} (ID: ${oj.id_orgao_julgador})`);
      });
    } else {
      console.log('❌ Nenhum OJ de Juizado Especial encontrado');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await verifier.cleanup();
    console.log('\n🧹 Recursos limpos');
  }
}

// Executar investigação
if (require.main === module) {
  investigarEstruturaTabelas().catch(console.error);
}

module.exports = { investigarEstruturaTabelas };

