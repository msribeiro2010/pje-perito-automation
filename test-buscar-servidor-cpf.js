/**
 * Teste da função buscarServidorPorCPF
 * Verifica se a função está funcionando corretamente
 */

const DatabaseConnection = require('./src/utils/database-connection');

async function testarBuscarServidorPorCPF() {
    console.log('🧪 Testando função buscarServidorPorCPF...\n');
    
    const dbConnection = new DatabaseConnection();
    
    try {
        // Inicializar conexão
        await dbConnection.initialize();
        console.log('✅ Conexão com banco inicializada');
        
        // Teste 1: CPF que não deve existir
        console.log('\n📋 Teste 1: Buscando servidor com CPF inexistente...');
        const cpfInexistente = '99999999999';
        
        const resultadoInexistente = await dbConnection.buscarServidorPorCPF(cpfInexistente);
        
        if (resultadoInexistente && resultadoInexistente.existe) {
            console.log('⚠️  Inesperado: Servidor encontrado para CPF inexistente');
            console.log('   Resultado:', resultadoInexistente);
        } else {
            console.log('✅ Correto: Nenhum servidor encontrado para CPF inexistente');
        }
        
        // Teste 2: Buscar primeiro servidor disponível para teste real
        console.log('\n📋 Teste 2: Buscando primeiro servidor disponível...');
        
        // Usar query direta através do pool
        const client = await dbConnection.pool.connect();
        const queryPrimeiroServidor = `
            SELECT 
                log.ds_login as cpf
            FROM pje.tb_usuario_login log
            JOIN pje.tb_usuario u ON log.id_usuario = u.id_usuario
            JOIN pje.tb_usuario_localizacao ul ON u.id_usuario = ul.id_usuario
            WHERE log.ds_login IS NOT NULL 
            AND log.ds_login != ''
            AND LENGTH(regexp_replace(log.ds_login, '[^0-9]', '', 'g')) = 11
            LIMIT 1
        `;
        
        const primeiroServidorResult = await client.query(queryPrimeiroServidor);
        client.release();
        
        if (primeiroServidorResult.rows && primeiroServidorResult.rows.length > 0) {
            const cpfReal = primeiroServidorResult.rows[0].cpf;
            console.log(`✅ Primeiro servidor encontrado com CPF: ${cpfReal}`);
            
            // Testar busca por este CPF real
            console.log('\n📋 Teste 3: Buscando servidor real por CPF...');
            const resultadoReal = await dbConnection.buscarServidorPorCPF(cpfReal);
            
            if (resultadoReal && resultadoReal.existe) {
                console.log('✅ Busca por CPF real funcionou:');
                console.log(`   Existe: ${resultadoReal.existe}`);
                console.log(`   ID Usuário: ${resultadoReal.servidor.idUsuario}`);
                console.log(`   ID Usuário Localização: ${resultadoReal.servidor.idUsuarioLocalizacao}`);
                console.log(`   CPF: ${resultadoReal.servidor.cpf}`);
                console.log(`   Total OJs Cadastrados: ${resultadoReal.servidor.totalOjsCadastrados}`);
            } else {
                console.log('❌ Erro: Não foi possível encontrar servidor que deveria existir');
                console.log('   Resultado:', resultadoReal);
            }
        } else {
            console.log('⚠️  Nenhum servidor encontrado no banco para teste');
        }
        
        console.log('\n✅ Teste da função buscarServidorPorCPF concluído!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await dbConnection.close();
        console.log('🔒 Conexão com banco fechada');
    }
}

// Executar teste
testarBuscarServidorPorCPF().catch(console.error);