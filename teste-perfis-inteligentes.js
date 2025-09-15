const { SmartOJCache } = require('./src/utils/smart-oj-cache');

// Teste do sistema inteligente de perfis
async function testarSistemaPerfilInteligente() {
    console.log('🧪 Iniciando teste do sistema inteligente de perfis...\n');

    const cache = new SmartOJCache();

    // Simular dados existentes no cache (servidor já cadastrado com perfil "Assessor")
    // A estrutura deve ser: Array de strings (nomes dos OJs), não objetos
    const ojsExistentesNoCache = [
        '1ª Vara do Trabalho de São José dos Campos',
        '2ª Vara do Trabalho de São José dos Campos',
        '3ª Vara do Trabalho de São José dos Campos'
    ];

    // Adicionar dados ao cache simulando que essas OJs já estão vinculadas com perfil "Assessor"
    for (const oj of ojsExistentesNoCache) {
        cache.atualizarCache(oj, {
            jaVinculado: true,
            textoEncontrado: `Assessor - ${oj}`,
            tipoCorrespondencia: 'exata'
        }, 'Assessor');
    }

    console.log('✅ Cache populado com OJs existentes (perfil "Assessor")');

    // Cenário de teste: usuário quer configurar as mesmas OJs mas com perfil diferente
    const ojsDesejadas = [
        '1ª Vara do Trabalho de São José dos Campos',
        '2ª Vara do Trabalho de São José dos Campos',
        '3ª Vara do Trabalho de São José dos Campos',
        '4ª Vara do Trabalho de São José dos Campos', // Nova OJ
        '5ª Vara do Trabalho de São José dos Campos'  // Nova OJ
    ];

    const perfilDesejado = 'Estagiário de Central de Atendimento';

    console.log('\n🎯 Teste: Servidor Dirlei Zanini Pereira');
    console.log(`   CPF: 097.503.508-80`);
    console.log(`   Perfil atual no sistema: Assessor`);
    console.log(`   Perfil desejado pelo usuário: ${perfilDesejado}`);
    console.log(`   OJs desejadas: ${ojsDesejadas.length}`);

    // Executar verificação inteligente
    console.log('\n🔍 Executando verificação inteligente...');

    // O segundo parâmetro deve ser os OJs vinculados que vêm do sistema (simulando a resposta real)
    // Estamos simulando que essas OJs já estão vinculadas no sistema
    const resultado = cache.verificarOJsComPerfilEmLote(
        ojsDesejadas,
        ojsExistentesNoCache, // OJs que já estão vinculadas no sistema
        perfilDesejado,
        (mensagem, progresso) => {
            console.log(`   📊 ${mensagem} (${progresso}%)`);
        }
    );

    // Mostrar resultados detalhados
    console.log('\n📊 RESULTADOS DA ANÁLISE INTELIGENTE:');
    console.log('=' .repeat(60));

    console.log(`\n✅ OJs com perfil correto (${resultado.ojsJaVinculadosPerfilCorreto.length}):`);
    resultado.ojsJaVinculadosPerfilCorreto.forEach(oj => {
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
        console.log(`   - ${oj} (verificar perfil atual)`);
    });

    console.log(`\n🆕 OJs novas para vincular (${resultado.ojsParaVincular.length}):`);
    resultado.ojsParaVincular.forEach(oj => {
        console.log(`   - ${oj} (cadastrar com perfil "${perfilDesejado}")`);
    });

    // Cálculos e estatísticas
    const totalParaProcessar = resultado.ojsVinculadosPerfilDiferente.length +
                               resultado.ojsVinculadosPerfilDesconhecido.length +
                               resultado.ojsParaVincular.length;

    const totalJaCadastrados = resultado.ojsJaVinculadosPerfilCorreto.length;

    console.log('\n📈 ESTATÍSTICAS:');
    console.log('=' .repeat(40));
    console.log(`Total de OJs desejadas: ${ojsDesejadas.length}`);
    console.log(`OJs já cadastradas com perfil correto: ${totalJaCadastrados}`);
    console.log(`OJs que precisam de automação: ${totalParaProcessar}`);
    console.log(`  - Atualizar perfil: ${resultado.ojsVinculadosPerfilDiferente.length}`);
    console.log(`  - Verificar perfil: ${resultado.ojsVinculadosPerfilDesconhecido.length}`);
    console.log(`  - Cadastrar novas: ${resultado.ojsParaVincular.length}`);

    // Recomendação de automação
    console.log('\n🤖 RECOMENDAÇÃO DE AUTOMAÇÃO:');
    console.log('=' .repeat(45));

    if (totalParaProcessar === 0) {
        console.log('✅ Nenhuma automação necessária - todas as OJs já estão configuradas corretamente!');
    } else {
        console.log(`🎯 Executar automação para ${totalParaProcessar} OJs:`);

        if (resultado.ojsVinculadosPerfilDiferente.length > 0) {
            console.log(`   📝 ${resultado.ojsVinculadosPerfilDiferente.length} OJs precisam ter o perfil atualizado de "Assessor" para "${perfilDesejado}"`);
        }

        if (resultado.ojsVinculadosPerfilDesconhecido.length > 0) {
            console.log(`   🔍 ${resultado.ojsVinculadosPerfilDesconhecido.length} OJs precisam ter o perfil verificado e possivelmente atualizado`);
        }

        if (resultado.ojsParaVincular.length > 0) {
            console.log(`   🆕 ${resultado.ojsParaVincular.length} OJs novas precisam ser cadastradas com perfil "${perfilDesejado}"`);
        }

        const tempoEstimado = totalParaProcessar * 15; // 15s por OJ estimado
        console.log(`   ⏱️  Tempo estimado: ~${Math.ceil(tempoEstimado / 60)} minutos`);
    }

    console.log('\n🧪 Teste concluído com sucesso!');

    return resultado;
}

// Executar teste
if (require.main === module) {
    testarSistemaPerfilInteligente().catch(console.error);
}

module.exports = { testarSistemaPerfilInteligente };