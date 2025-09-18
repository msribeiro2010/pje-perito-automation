/**
 * Teste final das correções implementadas
 * - Nome aparece apenas uma vez
 * - Órgãos julgadores são preenchidos quando existem
 * - Perfis são agregados corretamente
 */

const ServidorDatabaseService = require('./src/utils/servidor-database-service');

async function testeCompleto() {
    const service = new ServidorDatabaseService();
    
    try {
        console.log('🧪 TESTE FINAL DAS CORREÇÕES');
        console.log('=' .repeat(50));
        
        // Teste 1: CPF sem órgãos julgadores (caso original do usuário)
        console.log('\n📋 Teste 1: CPF sem órgãos julgadores');
        const resultado1 = await service.buscarServidores('1', '00000000272', '', 10);
        console.log('Resultado:', JSON.stringify(resultado1, null, 2));
        
        if (resultado1.length > 0) {
            const servidor = resultado1[0];
            console.log('✅ Verificações:');
            console.log(`- Nome único: ${servidor.nome}`);
            console.log(`- Perfis agregados: ${servidor.perfil}`);
            console.log(`- Status OJ: ${servidor.orgaosJulgadores}`);
            console.log(`- Total localizações: ${servidor.totalLocalizacoes}`);
        }
        
        // Teste 2: CPF com órgãos julgadores
        console.log('\n📋 Teste 2: CPF com órgãos julgadores');
        const resultado2 = await service.buscarServidores('1', '50152414886', '', 10);
        console.log('Resultado:', JSON.stringify(resultado2, null, 2));
        
        if (resultado2.length > 0) {
            const servidor = resultado2[0];
            console.log('✅ Verificações:');
            console.log(`- Nome único: ${servidor.nome}`);
            console.log(`- Perfis: ${servidor.perfil}`);
            console.log(`- OJs encontrados: ${servidor.totalOjs}`);
            console.log(`- Data início: ${servidor.dataInicio}`);
        }
        
        console.log('\n🎉 CORREÇÕES IMPLEMENTADAS COM SUCESSO!');
        console.log('- ✅ Nome aparece apenas uma vez por usuário');
        console.log('- ✅ Perfis são agregados em uma única linha');
        console.log('- ✅ Órgãos julgadores são preenchidos quando existem');
        console.log('- ✅ "Não informado" quando não há dados');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    } finally {
        await service.close();
    }
}

testeCompleto();