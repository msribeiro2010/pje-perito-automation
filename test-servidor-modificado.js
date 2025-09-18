const ServidorDatabaseService = require('./src/utils/servidor-database-service');

async function testarModificacoes() {
    const service = new ServidorDatabaseService();
    
    try {
        console.log('🧪 Testando modificações na query do ServidorDatabaseService...\n');
        
        // Teste 1: Busca geral (sem filtros)
        console.log('📋 Teste 1: Busca geral (primeiros 5 registros)');
        const resultadoGeral = await service.buscarServidores('1', '', '', 5);
        console.log('✅ Resultado:', JSON.stringify(resultadoGeral, null, 2));
        console.log(`📊 Total encontrado: ${resultadoGeral.length}\n`);
        
        // Teste 2: Busca por perfil específico
        console.log('📋 Teste 2: Busca por perfil "Perito"');
        const resultadoPerfil = await service.buscarServidores('1', '', 'Perito', 3);
        console.log('✅ Resultado:', JSON.stringify(resultadoPerfil, null, 2));
        console.log(`📊 Total encontrado: ${resultadoPerfil.length}\n`);
        
        // Teste 3: Busca com filtro de data fim preenchida
        console.log('📋 Teste 3: Busca com data fim preenchida (primeiros 3 registros)');
        const resultadoDataFim = await service.buscarServidores('1', '', '', 3, true);
        console.log('✅ Resultado:', JSON.stringify(resultadoDataFim, null, 2));
        console.log(`📊 Total encontrado: ${resultadoDataFim.length}\n`);
        
        // Teste 4: Verificar estrutura dos dados
        if (resultadoGeral.length > 0) {
            console.log('📋 Teste 4: Verificando estrutura dos dados');
            const primeiroRegistro = resultadoGeral[0];
            console.log('✅ Campos disponíveis:', Object.keys(primeiroRegistro));
            console.log('✅ Campo CPF removido:', !primeiroRegistro.hasOwnProperty('cpf'));
            console.log('✅ Campo orgaosJulgadores adicionado:', primeiroRegistro.hasOwnProperty('orgaosJulgadores'));
            console.log('✅ Campo dataInicio adicionado:', primeiroRegistro.hasOwnProperty('dataInicio'));
        }
        
        console.log('\n🎉 Todos os testes concluídos com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
        console.error('📋 Stack:', error.stack);
    } finally {
        await service.close();
    }
}

testarModificacoes();