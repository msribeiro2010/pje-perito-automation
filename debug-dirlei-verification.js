// Script de debug específico para Dirlei Zanini Pereira
// Testa a verificação de OJs já cadastrados

const SmartDatabaseVerifier = require('./src/utils/smart-database-verifier');

async function debugDirleiVerification() {
  console.log('🔍 Debug: Verificação de OJs para Dirlei Zanini Pereira\n');
  
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
    
    // 2. Buscar ID do usuário Dirlei Zanini Pereira
    console.log('2️⃣ Buscando usuário Dirlei Zanini Pereira...');
    
    // Primeiro, vamos tentar encontrar o usuário pelo CPF
    const cpf = '09750350880'; // CPF sem formatação
    
    // Vamos fazer uma busca mais ampla para encontrar o usuário
    const searchQuery = `
      SELECT 
        ul.id_usuario,
        ul.id_usuario_localizacao,
        u.ds_nome as nm_usuario,
        u.nr_cpf,
        COUNT(ulm.id_orgao_julgador) as total_ojs_cadastrados
      FROM pje.tb_usuario_localizacao ul
      JOIN pje.tb_usuario u ON ul.id_usuario = u.id_usuario
      LEFT JOIN pje.tb_usu_local_mgtdo_servdor ulm ON ul.id_usuario_localizacao = ulm.id_usu_local_mgstrado_servidor
      WHERE u.nr_cpf LIKE '%${cpf}%' OR u.ds_nome ILIKE '%Dirlei%Zanini%Pereira%'
      GROUP BY ul.id_usuario, ul.id_usuario_localizacao, u.ds_nome, u.nr_cpf
      ORDER BY u.ds_nome
    `;
    
    const client = await verifier.dbConnection.pool.connect();
    const searchResult = await client.query(searchQuery);
    client.release();
    
    if (searchResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado no banco');
      console.log('🔍 Tentando busca mais ampla...');
      
      // Busca mais ampla
      const broadSearchQuery = `
        SELECT 
          ul.id_usuario,
          ul.id_usuario_localizacao,
          u.ds_nome as nm_usuario,
          u.nr_cpf,
          COUNT(ulm.id_orgao_julgador) as total_ojs_cadastrados
        FROM pje.tb_usuario_localizacao ul
        JOIN pje.tb_usuario u ON ul.id_usuario = u.id_usuario
        LEFT JOIN pje.tb_usu_local_mgtdo_servdor ulm ON ul.id_usuario_localizacao = ulm.id_usu_local_mgstrado_servidor
        WHERE u.ds_nome ILIKE '%Dirlei%' OR u.ds_nome ILIKE '%Zanini%' OR u.ds_nome ILIKE '%Pereira%'
        GROUP BY ul.id_usuario, ul.id_usuario_localizacao, u.ds_nome, u.nr_cpf
        ORDER BY u.ds_nome
        LIMIT 10
      `;
      
      const broadClient = await verifier.dbConnection.pool.connect();
      const broadResult = await broadClient.query(broadSearchQuery);
      broadClient.release();
      
      console.log(`📋 Encontrados ${broadResult.rows.length} usuários similares:`);
      broadResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nm_usuario} (CPF: ${user.nr_cpf}) - ID: ${user.id_usuario}`);
      });
      
      if (broadResult.rows.length > 0) {
        console.log('\n⚠️ Usuário exato não encontrado. Usando o primeiro resultado similar...');
        const user = broadResult.rows[0];
        await testUserOJs(verifier, user);
      }
      
      return;
    }
    
    const user = searchResult.rows[0];
    console.log('✅ Usuário encontrado:');
    console.log(`   - Nome: ${user.nm_usuario}`);
    console.log(`   - CPF: ${user.nr_cpf}`);
    console.log(`   - ID: ${user.id_usuario}`);
    console.log(`   - OJs já cadastrados: ${user.total_ojs_cadastrados}\n`);
    
    await testUserOJs(verifier, user);
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await verifier.cleanup();
    console.log('\n🧹 Recursos limpos');
  }
}

async function testUserOJs(verifier, user) {
  console.log('3️⃣ Testando verificação de OJs...');
  
  // Lista de OJs fornecida pelo usuário
  const ojsParaTestar = [
    'Juizado Especial da Infancia e Adolescencia da Circunscricao de Aracatuba',
    'Juizado Especial da Infancia e Adolescencia da Circunscricao de Bauru',
    'Juizado Especial da Infancia e Adolescencia da Circunscricao de Sorocaba',
    'Juizado Especial da Infancia e Adolescencia de Fernandopolis',
    'Juizado Especial da Infância e Adolescencia de São José do Rio Preto',
    'Juizado Especial da Infância e da Adolescencia de Campinas',
    'Juizado Especial da Infância e Adolescência de Franca',
    'Juizado Especial da Infância e Adolescência de Presidente Prudente',
    'Juizado Especial da Infância e Adolescência de Ribeirão Preto',
    'Juizado Especial da Infância e Adolescência de São José dos Campos'
  ];
  
  console.log(`📋 Testando ${ojsParaTestar.length} OJs para o usuário ${user.nm_usuario}...\n`);
  
  // 1. Verificar OJs usando o sistema atual
  console.log('🔍 Verificação usando sistema atual:');
  const resultadoSistema = await verifier.verificarOJsServidor(user.id_usuario, ojsParaTestar);
  
  console.log('📊 Resultado do sistema:');
  console.log(`   - Total verificados: ${resultadoSistema.estatisticas.totalVerificados}`);
  console.log(`   - Já cadastrados: ${resultadoSistema.estatisticas.jaCadastrados}`);
  console.log(`   - Para processar: ${resultadoSistema.estatisticas.paraProcessar}`);
  console.log(`   - Economia estimada: ${resultadoSistema.estatisticas.economiaEstimada}s\n`);
  
  if (resultadoSistema.ojsJaCadastrados.length > 0) {
    console.log('✅ OJs já cadastrados encontrados:');
    resultadoSistema.ojsJaCadastrados.forEach(oj => {
      console.log(`   - ${oj.nome} (ID: ${oj.idOrgaoJulgador})`);
    });
  }
  
  if (resultadoSistema.ojsParaProcessar.length > 0) {
    console.log('\n🔄 OJs para processar:');
    resultadoSistema.ojsParaProcessar.forEach(oj => {
      console.log(`   - ${oj}`);
    });
  }
  
  // 2. Verificação manual detalhada
  console.log('\n🔍 Verificação manual detalhada:');
  await verificarOJsManualmente(verifier, user.id_usuario, ojsParaTestar);
}

async function verificarOJsManualmente(verifier, idUsuario, ojsParaTestar) {
  try {
    const client = await verifier.dbConnection.pool.connect();
    
    // Query para buscar OJs cadastrados para o usuário
    const query = `
      SELECT DISTINCT 
        ulm.id_orgao_julgador, 
        oj.ds_orgao_julgador, 
        ulv.dt_inicio, 
        ulv.dt_final,
        CASE 
          WHEN ulv.dt_final IS NULL OR ulv.dt_final > NOW() THEN true 
          ELSE false 
        END as ativo
      FROM pje.tb_usu_local_visibilidade ulv 
      JOIN pje.tb_usu_local_mgtdo_servdor ulm 
        ON ulv.id_usu_local_mgstrado_servidor = ulm.id_usu_local_mgstrado_servidor 
      JOIN pje.tb_orgao_julgador oj 
        ON ulm.id_orgao_julgador = oj.id_orgao_julgador 
      WHERE ulm.id_usu_local_mgstrado_servidor IN (
        SELECT id_usuario_localizacao 
        FROM pje.tb_usuario_localizacao 
        WHERE id_usuario = $1
      )
      ORDER BY ulv.dt_inicio DESC
    `;
    
    const result = await client.query(query, [idUsuario]);
    client.release();
    
    console.log(`📋 OJs cadastrados no banco para o usuário: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Lista de OJs cadastrados:');
      result.rows.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.ds_orgao_julgador} (ID: ${oj.id_orgao_julgador}) - ${oj.ativo ? 'Ativo' : 'Inativo'}`);
      });
    }
    
    // Verificar correspondências
    console.log('\n🔍 Verificando correspondências:');
    ojsParaTestar.forEach(ojTeste => {
      const correspondencias = result.rows.filter(oj => 
        oj.ds_orgao_julgador.toLowerCase().trim() === ojTeste.toLowerCase().trim()
      );
      
      if (correspondencias.length > 0) {
        console.log(`   ✅ "${ojTeste}" -> Encontrado: "${correspondencias[0].ds_orgao_julgador}" (${correspondencias[0].ativo ? 'Ativo' : 'Inativo'})`);
      } else {
        console.log(`   ❌ "${ojTeste}" -> NÃO encontrado`);
        
        // Buscar correspondências parciais
        const parciais = result.rows.filter(oj => 
          oj.ds_orgao_julgador.toLowerCase().includes(ojTeste.toLowerCase().split(' ')[0]) ||
          ojTeste.toLowerCase().includes(oj.ds_orgao_julgador.toLowerCase().split(' ')[0])
        );
        
        if (parciais.length > 0) {
          console.log(`      🔍 Possíveis correspondências parciais:`);
          parciais.forEach(p => {
            console.log(`         - "${p.ds_orgao_julgador}"`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na verificação manual:', error.message);
  }
}

// Executar debug
if (require.main === module) {
  debugDirleiVerification().catch(console.error);
}

module.exports = { debugDirleiVerification };

