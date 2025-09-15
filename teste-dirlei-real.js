const { SmartOJCache } = require('./src/utils/smart-oj-cache');

// Teste específico para o caso do Dirlei Zanini Pereira
async function testesDirleiReal() {
    console.log('🔍 Teste específico: Dirlei Zanini Pereira com cache sem perfis...\n');

    const cache = new SmartOJCache();

    // Simular exatamente o que está no cache persistente (sem perfis)
    const ojsNoCacheReal = [
        {
            oj: "1ª Vara do Trabalho de Franca",
            textoEncontrado: "1ª Vara do Trabalho de Franca",
            tipoCorrespondencia: "exata_normalizada"
            // Nota: SEM propriedade 'perfil' (cache antigo)
        },
        {
            oj: "1ª Vara do Trabalho de Sorocaba",
            textoEncontrado: "1ª Vara do Trabalho de Sorocaba",
            tipoCorrespondencia: "exata_normalizada"
            // Nota: SEM propriedade 'perfil' (cache antigo)
        },
        {
            oj: "2ª Vara do Trabalho de Araraquara",
            textoEncontrado: "1ª Vara do Trabalho de Araraquara",
            tipoCorrespondencia: "similaridade_alta"
            // Nota: SEM propriedade 'perfil' (cache antigo)
        },
        {
            oj: "3ª Vara do Trabalho de Piracicaba",
            textoEncontrado: "1ª Vara do Trabalho de Piracicaba",
            tipoCorrespondencia: "similaridade_alta"
            // Nota: SEM propriedade 'perfil' (cache antigo)
        }
    ];

    console.log('📦 Simulando carregamento do cache persistente (sem perfis)...');

    // Simular o método carregarCachePersistente reconstruindo o cache
    ojsNoCacheReal.forEach(item => {
        // Usar a lógica corrigida: perfil null para indicar desconhecido
        const perfilExistente = item.perfil || null; // null = perfil desconhecido
        cache.atualizarCache(item.oj, {
            jaVinculado: true,
            textoEncontrado: item.textoEncontrado,
            tipoCorrespondencia: item.tipoCorrespondencia
        }, perfilExistente);
    });

    console.log('✅ Cache reconstruído em memória');

    // Verificar conteúdo do cache
    console.log('\n📋 Conteúdo do cache após reconstrução:');
    for (const [key, value] of cache.cache.entries()) {
        console.log(`  ${key}:`);
        console.log(`    Perfil: ${value.perfil || 'null (desconhecido)'}`);
        console.log(`    Vinculado: ${value.jaVinculado}`);
    }

    // Cenário real: usuário configura com perfil diferente
    const ojsDesejadas = [
        "1ª Vara do Trabalho de Franca",
        "1ª Vara do Trabalho de Sorocaba",
        "2ª Vara do Trabalho de Araraquara",
        "3ª Vara do Trabalho de Piracicaba",
        "Nova OJ que não está no cache"
    ];

    const perfilDesejado = "Estagiário de Central de Atendimento";

    console.log('\n🎯 Cenário real do Dirlei:');
    console.log(`   CPF: 097.503.508-80`);
    console.log(`   Perfil configurado: ${perfilDesejado}`);
    console.log(`   OJs no cache: ${ojsNoCacheReal.length} (sem informação de perfil)`);
    console.log(`   OJs desejadas: ${ojsDesejadas.length}`);

    // Simular o que está passado para verificarOJsComPerfilEmLote no sistema real
    const ojsVinculadasDoCache = ojsNoCacheReal.map(item => item.oj);

    console.log('\n🧠 Executando análise inteligente...');

    const resultado = cache.verificarOJsComPerfilEmLote(
        ojsDesejadas,
        ojsVinculadasDoCache, // OJs que vêm do cache (simulando o sistema real)
        perfilDesejado,
        (mensagem, progresso) => {
            console.log(`   📊 ${mensagem} (${progresso}%)`);
        }
    );

    // Mostrar resultados detalhados
    console.log('\n📊 RESULTADOS - CENÁRIO REAL DIRLEI:');
    console.log('=' .repeat(60));

    console.log(`\n✅ OJs com perfil correto (${resultado.ojsJaVinculadosPerfilCorreto.length}):`);
    resultado.ojsJaVinculadosPerfilCorreto.forEach(item => {
        const oj = typeof item === 'object' ? item.oj : item;
        console.log(`   - ${oj} ✓`);
    });

    console.log(`\n🔄 OJs com perfil diferente (${resultado.ojsVinculadosPerfilDiferente.length}):`);
    resultado.ojsVinculadosPerfilDiferente.forEach(item => {
        console.log(`   - ${item.oj}`);
        console.log(`     Atual: "${item.perfilEncontrado}" → Desejado: "${item.perfilDesejado}"`);
    });

    console.log(`\n❓ OJs com perfil desconhecido (${resultado.ojsVinculadosPerfilDesconhecido.length}):`);
    resultado.ojsVinculadosPerfilDesconhecido.forEach(item => {
        const oj = typeof item === 'object' ? item.oj : item;
        console.log(`   - ${oj} (verificar perfil atual no sistema)`);
    });

    console.log(`\n🆕 OJs novas para vincular (${resultado.ojsParaVincular.length}):`);
    resultado.ojsParaVincular.forEach(oj => {
        console.log(`   - ${oj} (cadastrar com perfil "${perfilDesejado}")`);
    });

    // Estatísticas finais
    const totalParaProcessar = resultado.ojsVinculadosPerfilDiferente.length +
                               resultado.ojsVinculadosPerfilDesconhecido.length +
                               resultado.ojsParaVincular.length;

    console.log('\n📈 DIAGNÓSTICO FINAL:');
    console.log('=' .repeat(40));
    console.log(`Total de OJs desejadas: ${ojsDesejadas.length}`);
    console.log(`OJs com perfil correto: ${resultado.ojsJaVinculadosPerfilCorreto.length}`);
    console.log(`OJs que precisam de automação: ${totalParaProcessar}`);
    console.log(`  - Perfis diferentes: ${resultado.ojsVinculadosPerfilDiferente.length}`);
    console.log(`  - Perfis desconhecidos: ${resultado.ojsVinculadosPerfilDesconhecido.length}`);
    console.log(`  - Novas para cadastrar: ${resultado.ojsParaVincular.length}`);

    console.log('\n💡 EXPLICAÇÃO DO COMPORTAMENTO:');
    if (resultado.ojsVinculadosPerfilDesconhecido.length > 0) {
        console.log('🔍 As OJs aparecem como "perfil desconhecido" porque:');
        console.log('   - O cache foi criado antes do sistema de perfis');
        console.log('   - Não há informação de perfil salva no cache');
        console.log('   - O sistema precisa verificar o perfil atual no PJE');
        console.log(`   - Após verificação, detectará que o perfil atual é diferente de "${perfilDesejado}"`);
    }

    if (totalParaProcessar > 0) {
        console.log('\n🤖 AÇÃO RECOMENDADA:');
        console.log(`✅ Executar automação para ${totalParaProcessar} OJs`);
        console.log('   - Verificará perfis desconhecidos');
        console.log('   - Atualizará perfis diferentes');
        console.log('   - Cadastrará novas OJs');
    } else {
        console.log('\n✨ Nenhuma automação necessária - todas as OJs já estão corretas!');
    }

    console.log('\n🧪 Teste específico do Dirlei concluído!');

    return resultado;
}

// Executar teste
if (require.main === module) {
    testesDirleiReal().catch(console.error);
}

module.exports = { testesDirleiReal };