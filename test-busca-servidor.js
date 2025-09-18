/**
 * Script de teste para verificar busca de servidores
 */

const ServidorDatabaseService = require('./src/utils/servidor-database-service');

async function testarBuscaServidor() {
    const servidorService = new ServidorDatabaseService();
    
    try {
        console.log('🔍 Testando busca de servidores...\n');
        
        // Teste 1: Buscar por CPF específico (do log)
        console.log('📋 Teste 1: Buscar por CPF 53036140697');
        const resultadoCPF = await servidorService.buscarServidores('1', '53036140697', '');
        console.log(`✅ Encontrados ${resultadoCPF.length} servidores por CPF`);
        
        if (resultadoCPF.length > 0) {
            console.log('📊 Primeiro resultado:');
            console.log(`   - Nome: ${resultadoCPF[0].nome}`);
            console.log(`   - CPF: ${resultadoCPF[0].cpf}`);
            console.log(`   - Perfil: ${resultadoCPF[0].perfil}`);
            console.log(`   - Total OJs: ${resultadoCPF[0].totalOjs}`);
            
            // Teste 2: Buscar OJs do servidor
            if (resultadoCPF[0].id_usuario_localizacao) {
                console.log('\n📋 Teste 2: Buscar OJs do servidor');
                const ojs = await servidorService.buscarOJsDoServidor(resultadoCPF[0].id_usuario_localizacao);
                console.log(`✅ Encontrados ${ojs.length} OJs vinculados`);
                
                if (ojs.length > 0) {
                    console.log('📊 Primeiros 3 OJs:');
                    ojs.slice(0, 3).forEach((oj, index) => {
                        console.log(`   ${index + 1}. ${oj.nome} (${oj.status})`);
                    });
                }
            }
        }
        
        // Teste 3: Buscar por perfil
        console.log('\n📋 Teste 3: Buscar servidores com perfil "Perito"');
        const resultadoPerfil = await servidorService.buscarServidores('1', '', 'Perito', 5);
        console.log(`✅ Encontrados ${resultadoPerfil.length} servidores com perfil Perito`);
        
        if (resultadoPerfil.length > 0) {
            console.log('📊 Resultados:');
            resultadoPerfil.forEach((servidor, index) => {
                console.log(`   ${index + 1}. ${servidor.nome} - ${servidor.perfil} (${servidor.totalOjs} OJs)`);
            });
        }
        
        // Teste 4: Conectividade
        console.log('\n📋 Teste 4: Verificar conectividade');
        const conectividade = await servidorService.testarConectividade();
        console.log(`✅ Conectividade: ${conectividade ? 'OK' : 'FALHOU'}`);
        
    } catch (error) {
        console.error('❌ Erro durante teste:', error);
    } finally {
        await servidorService.close();
        console.log('\n🔚 Teste finalizado');
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testarBuscaServidor().catch(console.error);
}

module.exports = { testarBuscaServidor };