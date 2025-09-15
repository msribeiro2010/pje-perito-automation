// Script de teste específico para Dirlei Zanini Pereira - CPF: 097.503.508-80
// Testa a verificação de OJs usando CPF

const SmartDatabaseVerifier = require('./src/utils/smart-database-verifier');

async function testarDirleiPorCPF() {
  console.log('🔍 Teste específico: Dirlei Zanini Pereira - CPF: 097.503.508-80\n');
  
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
    
    // 2. Lista de OJs fornecida pelo usuário
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
    
    const cpf = '097.503.508-80';
    
    console.log(`2️⃣ Testando verificação para CPF: ${cpf}`);
    console.log(`📋 OJs para verificar: ${ojsParaTestar.length}\n`);
    
    // 3. Testar verificação usando CPF
    const resultado = await verifier.verificarOJsServidorPorCPF(cpf, ojsParaTestar);
    
    console.log('📊 RESULTADO DA VERIFICAÇÃO:');
    console.log(`   - Total verificados: ${resultado.estatisticas.totalVerificados}`);
    console.log(`   - Já cadastrados: ${resultado.estatisticas.jaCadastrados}`);
    console.log(`   - Para processar: ${resultado.estatisticas.paraProcessar}`);
    console.log(`   - Economia estimada: ${resultado.estatisticas.economiaEstimada}s\n`);
    
    if (resultado.ojsJaCadastrados.length > 0) {
      console.log('✅ OJs já cadastrados (devem ser pulados):');
      resultado.ojsJaCadastrados.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.nome} (ID: ${oj.idOrgaoJulgador})`);
      });
    }
    
    if (resultado.ojsInativos.length > 0) {
      console.log('\n⚠️ OJs inativos:');
      resultado.ojsInativos.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.nome} (Final: ${oj.dataFinal})`);
      });
    }
    
    if (resultado.ojsParaProcessar.length > 0) {
      console.log('\n🔄 OJs para processar (não encontrados no banco):');
      resultado.ojsParaProcessar.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj}`);
      });
    } else {
      console.log('\n🎉 Todos os OJs já estão cadastrados! Nenhum processamento necessário.');
    }
    
    // 4. Verificação manual detalhada
    console.log('\n🔍 Verificação manual detalhada:');
    await verificarOJsManualmente(verifier, cpf, ojsParaTestar);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await verifier.cleanup();
    console.log('\n🧹 Recursos limpos');
  }
}

async function verificarOJsManualmente(verifier, cpf, ojsParaTestar) {
  try {
    const client = await verifier.dbConnection.pool.connect();
    
    // 1. Buscar servidor por CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    const servidorQuery = `
      SELECT 
        ul.id_usuario,
        ul.id_usuario_localizacao,
        u.nr_cpf
      FROM pje.tb_usuario_localizacao ul
      JOIN pje.tb_usuario u ON ul.id_usuario = u.id_usuario
      WHERE u.nr_cpf = $1
    `;
    
    const servidorResult = await client.query(servidorQuery, [cpfLimpo]);
    
    if (servidorResult.rows.length === 0) {
      console.log('❌ Servidor não encontrado no banco');
      client.release();
      return;
    }
    
    const servidor = servidorResult.rows[0];
    console.log(`✅ Servidor encontrado: ID ${servidor.id_usuario}, CPF ${servidor.nr_cpf}`);
    
    // 2. Buscar OJs cadastrados usando a query fornecida
    const ojsCadastradosQuery = `
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
    
    const ojsResult = await client.query(ojsCadastradosQuery, [servidor.id_usuario]);
    client.release();
    
    console.log(`📋 OJs cadastrados no banco: ${ojsResult.rows.length}`);
    
    if (ojsResult.rows.length > 0) {
      console.log('\n📋 Lista de OJs cadastrados:');
      ojsResult.rows.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj.ds_orgao_julgador} (ID: ${oj.id_orgao_julgador}) - ${oj.ativo ? 'Ativo' : 'Inativo'}`);
      });
    }
    
    // 3. Verificar correspondências exatas
    console.log('\n🔍 Verificando correspondências exatas:');
    ojsParaTestar.forEach(ojTeste => {
      const correspondencias = ojsResult.rows.filter(oj => 
        oj.ds_orgao_julgador.toLowerCase().trim() === ojTeste.toLowerCase().trim()
      );
      
      if (correspondencias.length > 0) {
        console.log(`   ✅ "${ojTeste}" -> Encontrado: "${correspondencias[0].ds_orgao_julgador}" (${correspondencias[0].ativo ? 'Ativo' : 'Inativo'})`);
      } else {
        console.log(`   ❌ "${ojTeste}" -> NÃO encontrado`);
        
        // Buscar correspondências parciais
        const parciais = ojsResult.rows.filter(oj => {
          const ojLower = oj.ds_orgao_julgador.toLowerCase();
          const testeLower = ojTeste.toLowerCase();
          
          // Verificar se contém palavras-chave importantes
          const palavrasOj = ojLower.split(' ').filter(p => p.length > 3);
          const palavrasTeste = testeLower.split(' ').filter(p => p.length > 3);
          
          return palavrasOj.some(palavraOj => 
            palavrasTeste.some(palavraTeste => 
              palavraOj.includes(palavraTeste) || palavraTeste.includes(palavraOj)
            )
          );
        });
        
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

// Executar teste
if (require.main === module) {
  testarDirleiPorCPF().catch(console.error);
}

module.exports = { testarDirleiPorCPF };

