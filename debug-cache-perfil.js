const { SmartOJCache } = require('./src/utils/smart-oj-cache');

// Debug do sistema de cache com perfis
async function debugCachePerfil() {
    console.log('🔍 Debug do sistema de cache com perfils...\n');

    const cache = new SmartOJCache();

    // 1. Verificar cache inicial
    console.log('📊 Cache inicial (deve estar vazio):');
    console.log('Tamanho do cache:', cache.cache.size);
    console.log('Cache válido:', cache.cacheValido);

    // 2. Adicionar uma OJ ao cache
    const ojTeste = '1ª Vara do Trabalho de São José dos Campos';
    const perfilAtual = 'Assessor';

    console.log(`\n➕ Adicionando ao cache: "${ojTeste}" com perfil "${perfilAtual}"`);

    cache.atualizarCache(ojTeste, {
        jaVinculado: true,
        textoEncontrado: `${perfilAtual} - ${ojTeste}`,
        tipoCorrespondencia: 'exata'
    }, perfilAtual);

    // 3. Verificar se foi adicionado
    console.log('\n📊 Cache após adicionar:');
    console.log('Tamanho do cache:', cache.cache.size);

    // 4. Verificar conteúdo do cache
    console.log('\n📋 Conteúdo do cache:');
    for (const [key, value] of cache.cache.entries()) {
        console.log(`  Chave: "${key}"`);
        console.log(`  Valor:`, value);
    }

    // 5. Testar normalização
    console.log('\n🔧 Teste de normalização:');
    const ojNormalizada = cache._normalizarTexto(ojTeste);
    console.log(`Original: "${ojTeste}"`);
    console.log(`Normalizada: "${ojNormalizada}"`);

    // 6. Verificar se consegue encontrar no cache
    const cacheEntry = cache.cache.get(ojNormalizada);
    console.log('\n🔍 Busca no cache:');
    console.log('Entry encontrada:', cacheEntry);

    // 7. Testar verificação individual
    console.log('\n🧪 Teste de verificação individual:');

    // Simular ojsVinculadosNormalizados
    const ojsVinculados = [ojTeste];
    const ojsVinculadosNormalizados = new Map();
    ojsVinculados.forEach(oj => {
        const normalizado = cache._normalizarTexto(oj);
        ojsVinculadosNormalizados.set(normalizado, oj);
        console.log(`  Mapeado: "${normalizado}" -> "${oj}"`);
    });

    // 8. Teste com perfil IGUAL (deve retornar 'pular')
    console.log('\n✅ Teste perfil IGUAL:');
    const resultadoIgual = cache.verificarOJComPerfil(ojTeste, ojsVinculadosNormalizados, perfilAtual);
    console.log('Resultado:', resultadoIgual);

    // 9. Teste com perfil DIFERENTE (deve retornar 'atualizar_perfil')
    console.log('\n🔄 Teste perfil DIFERENTE:');
    const perfilDiferente = 'Estagiário de Central de Atendimento';
    const resultadoDiferente = cache.verificarOJComPerfil(ojTeste, ojsVinculadosNormalizados, perfilDiferente);
    console.log('Resultado:', resultadoDiferente);

    // 10. Teste do sistema completo
    console.log('\n🎯 Teste do sistema completo:');
    const resultado = cache.verificarOJsComPerfilEmLote(
        [ojTeste],
        ojsVinculados,
        perfilDiferente,
        (msg, prog) => console.log(`  ${msg} (${prog}%)`)
    );

    console.log('\nResultado final:', {
        perfisCorretos: resultado.ojsJaVinculadosPerfilCorreto.length,
        perfisDiferentes: resultado.ojsVinculadosPerfilDiferente.length,
        perfisDesconhecidos: resultado.ojsVinculadosPerfilDesconhecido.length,
        novos: resultado.ojsParaVincular.length
    });

    console.log('\n🔍 Debug concluído!');

    return resultado;
}

// Executar debug
if (require.main === module) {
    debugCachePerfil().catch(console.error);
}

module.exports = { debugCachePerfil };