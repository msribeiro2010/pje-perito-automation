const { SmartOJCache } = require('./src/utils/smart-oj-cache');

// Simulação completa do fluxo do sistema real
async function simulacaoCompleta() {
    console.log('🎯 Simulação completa do sistema com Dirlei Zanini Pereira...\n');

    // Simular exatamente os parâmetros que vêm do frontend
    const cpf = '097.503.508-80';
    const perfil = 'Estagiário de Central de Atendimento';
    const ojsDesejados = [
        "1ª Vara do Trabalho de Franca",
        "1ª Vara do Trabalho de Sorocaba",
        "2ª Vara do Trabalho de Araraquara",
        "3ª Vara do Trabalho de Piracicaba",
        "CEJUSC SÃO JOSÉ DO RIO PRETO - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho",
        "CEJUSC SÃO JOSÉ DOS CAMPOS - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho"
    ];

    console.log(`📋 Parâmetros de entrada:`);
    console.log(`   CPF: ${cpf}`);
    console.log(`   Perfil: ${perfil}`);
    console.log(`   OJs desejadas: ${ojsDesejados.length}`);

    // Limpar CPF como no sistema
    const cpfLimpo = cpf.replace(/\D/g, '');
    console.log(`   CPF limpo: ${cpfLimpo}`);

    // 1. Verificar cache persistente
    try {
        const smartOJCache = new SmartOJCache();

        console.log('\n📦 [CACHE] Verificando cache persistente...');
        const cacheCarregado = await smartOJCache.carregarCachePersistente(cpfLimpo);

        if (cacheCarregado && cacheCarregado.ojsJaVinculados && cacheCarregado.ojsJaVinculados.length > 0) {
            console.log(`📦 [CACHE] Cache encontrado! ${cacheCarregado.ojsJaVinculados.length} OJs já vinculadas`);

            // 🧠 ANÁLISE INTELIGENTE COM PERFIL
            console.log('🧠 Fazendo análise inteligente de perfis...');
            const ojsJaVinculadasDoCache = cacheCarregado.ojsJaVinculados.map(item => item.oj);

            // Usar o novo sistema inteligente que considera perfis
            const verificacaoInteligente = smartOJCache.verificarOJsComPerfilEmLote(
                ojsDesejados || [],
                ojsJaVinculadasDoCache,
                perfil, // Usar o perfil desejado do servidor
                (mensagem, progresso) => {
                    console.log(`   📊 ${mensagem} (${progresso}%)`);
                }
            );

            const { estatisticas } = verificacaoInteligente;
            const totalParaProcessar = estatisticas.totalParaProcessar;

            // Mensagens detalhadas baseadas no resultado inteligente
            console.log(`\n🎯 [ANÁLISE INTELIGENTE] Resultado detalhado:`);
            console.log(`   - ✅ ${estatisticas.jaVinculadosPerfilCorreto} OJs com perfil correto (pularão automação)`);
            console.log(`   - 🔄 ${estatisticas.vinculadosPerfilDiferente} OJs com perfil diferente (${perfil})`);
            console.log(`   - ❓ ${estatisticas.vinculadosPerfilDesconhecido} OJs com perfil desconhecido`);
            console.log(`   - 🆕 ${estatisticas.paraVincular} OJs novos para vincular`);
            console.log(`   - 🎯 TOTAL para processar: ${totalParaProcessar} OJs`);

            // Status inteligente para o usuário (ISTO É O QUE APARECE NO PAINEL)
            if (totalParaProcessar === 0) {
                console.log('\n📊 RESULTADO FINAL PARA O USUÁRIO:');
                console.log(`   Já Cadastrados: ${estatisticas.jaVinculadosPerfilCorreto}`);
                console.log(`   Para Processar: ${totalParaProcessar}`);
                console.log('   💡 Economia: Nenhuma automação necessária - todos os perfis estão corretos!');
            } else {
                console.log('\n📊 RESULTADO FINAL PARA O USUÁRIO:');
                console.log(`   Já Cadastrados: ${estatisticas.jaVinculadosPerfilCorreto}`);
                console.log(`   Para Processar: ${totalParaProcessar}`);

                if (estatisticas.vinculadosPerfilDiferente > 0) {
                    console.log(`   💡 ${estatisticas.vinculadosPerfilDiferente} OJs precisam ter o perfil atualizado`);
                }
                if (estatisticas.vinculadosPerfilDesconhecido > 0) {
                    console.log(`   🔍 ${estatisticas.vinculadosPerfilDesconhecido} OJs precisam verificação de perfil`);
                }
                if (estatisticas.paraVincular > 0) {
                    console.log(`   🆕 ${estatisticas.paraVincular} OJs novas para cadastrar`);
                }
            }

            // Retornar exatamente como o sistema real
            const resultado = {
                success: true,
                databaseConnected: true,
                servidorExiste: true,
                fonte: 'cache_inteligente',
                servidor: {
                    nome: `Dirlei Zanini Pereira`,
                    cpf: cpfLimpo
                },
                ojsJaCadastrados: estatisticas.jaVinculadosPerfilCorreto,
                ojsParaProcessar: totalParaProcessar,
                tempoProcessamento: estatisticas.tempoProcessamento,
                detalhesInteligentes: {
                    perfilCorreto: estatisticas.jaVinculadosPerfilCorreto,
                    perfilDiferente: estatisticas.vinculadosPerfilDiferente,
                    perfilDesconhecido: estatisticas.vinculadosPerfilDesconhecido,
                    novosParaVincular: estatisticas.paraVincular
                }
            };

            console.log('\n🔗 OBJETO RETORNADO PARA O FRONTEND:');
            console.log(JSON.stringify(resultado, null, 2));

            return resultado;

        } else {
            console.log('📦 [CACHE] Nenhum cache encontrado - primeira execução');
            return {
                success: true,
                databaseConnected: false,
                servidorExiste: false,
                fonte: 'cache_vazio',
                ojsJaCadastrados: 0,
                ojsParaProcessar: ojsDesejados?.length || 0
            };
        }

    } catch (error) {
        console.error('❌ [CACHE] Erro ao verificar cache:', error.message);
        return {
            success: false,
            error: 'Erro ao verificar cache: ' + error.message,
            databaseConnected: true
        };
    }
}

// Executar simulação
if (require.main === module) {
    simulacaoCompleta()
        .then(resultado => {
            console.log('\n🎯 Simulação concluída!');
            console.log(`\nRESUMO: O painel deve mostrar:`);
            console.log(`- Já Cadastrados: ${resultado.ojsJaCadastrados || 0}`);
            console.log(`- Para Processar: ${resultado.ojsParaProcessar || 0}`);

            if (resultado.detalhesInteligentes) {
                const detalhes = resultado.detalhesInteligentes;
                console.log(`\nDETALHES DA ANÁLISE INTELIGENTE:`);
                console.log(`- Perfil correto: ${detalhes.perfilCorreto}`);
                console.log(`- Perfil diferente: ${detalhes.perfilDiferente}`);
                console.log(`- Perfil desconhecido: ${detalhes.perfilDesconhecido}`);
                console.log(`- Novos para vincular: ${detalhes.novosParaVincular}`);
            }
        })
        .catch(console.error);
}

module.exports = { simulacaoCompleta };