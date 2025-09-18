const databaseConfig = require('./database.config.js');
const { Pool } = require('pg');

async function verificarEstrutura() {
  const pool = new Pool(databaseConfig.database1Grau);
  
  try {
    console.log('🔍 Verificando estrutura das tabelas...');
    
    // Verificar estrutura da tb_usuario
    console.log('\n📋 Estrutura da tb_usuario:');
    const usuarioResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'pje' 
      AND table_name = 'tb_usuario'
      ORDER BY ordinal_position
    `);
    usuarioResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar estrutura da tb_usuario_localizacao
    console.log('\n📋 Estrutura da tb_usuario_localizacao:');
    const locResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'pje' 
      AND table_name = 'tb_usuario_localizacao'
      ORDER BY ordinal_position
    `);
    locResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar estrutura da tb_usuario_papel
    console.log('\n📋 Estrutura da tb_usuario_papel:');
    const papelResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'pje' 
      AND table_name = 'tb_usuario_papel'
      ORDER BY ordinal_position
    `);
    papelResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar estrutura da tb_papel
    console.log('\n📋 Estrutura da tb_papel:');
    const papelTableResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'pje' 
      AND table_name = 'tb_papel'
      ORDER BY ordinal_position
    `);
    papelTableResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarEstrutura();