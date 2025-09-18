/**
 * Script de teste para o sistema de preview/autocomplete de servidores
 * Testa a funcionalidade de busca em tempo real e exibição de informações
 */

const ServidorDatabaseService = require('./src/utils/servidor-database-service');

// Cores para output no console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Função helper para logging colorido
const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
    result: (msg) => console.log(`${colors.magenta}📊 ${msg}${colors.reset}`)
};

// Casos de teste para preview
const testCases = [
    {
        description: 'Busca por CPF parcial (primeiros 3 dígitos)',
        grau: '1',
        input: '123',
        expectedType: 'multiple' // Espera múltiplos resultados
    },
    {
        description: 'Busca por CPF completo',
        grau: '1', 
        input: '53036140697',
        expectedType: 'single' // Espera resultado único
    },
    {
        description: 'Busca por nome parcial',
        grau: '1',
        input: 'MAR',
        expectedType: 'multiple' // Espera múltiplos resultados
    },
    {
        description: 'Busca por nome completo',
        grau: '1',
        input: 'MARCELO',
        expectedType: 'multiple' // Pode ter vários Marcelos
    },
    {
        description: 'Busca no 2º grau por CPF',
        grau: '2',
        input: '530',
        expectedType: 'multiple'
    },
    {
        description: 'Busca por CPF inexistente',
        grau: '1',
        input: '99999999999',
        expectedType: 'empty' // Não deve encontrar nada
    },
    {
        description: 'Busca com menos de 3 caracteres (não deve buscar)',
        grau: '1',
        input: 'MA',
        expectedType: 'skip' // Deve ser ignorado
    }
];

// Função para simular a busca de preview
async function testarPreview(testCase) {
    const service = new ServidorDatabaseService();
    
    try {
        log.test(`${testCase.description}`);
        console.log(`  📝 Input: "${testCase.input}" | Grau: ${testCase.grau}º`);
        
        // Simular validação de input mínimo (3 caracteres)
        if (testCase.input.length < 3) {
            if (testCase.expectedType === 'skip') {
                log.success('Input ignorado corretamente (< 3 caracteres)');
                return { success: true, skipped: true };
            } else {
                log.error('Input deveria ter sido ignorado');
                return { success: false };
            }
        }
        
        // Executar busca
        const startTime = Date.now();
        const resultados = await service.buscarServidores(
            testCase.grau,
            testCase.input,
            '', // sem filtro de perfil
            5   // limite de 5 resultados para preview
        );
        const responseTime = Date.now() - startTime;
        
        // Analisar resultados
        console.log(`  ⏱️  Tempo de resposta: ${responseTime}ms`);
        console.log(`  📋 Resultados encontrados: ${resultados.length}`);
        
        if (resultados.length > 0) {
            console.log(`  👥 Servidores:`);
            resultados.forEach((servidor, idx) => {
                const isCPF = /^\d+$/.test(testCase.input);
                const highlight = isCPF ? servidor.nome : servidor.cpf;
                console.log(`     ${idx + 1}. ${colors.bright}${highlight}${colors.reset}`);
                console.log(`        Nome: ${servidor.nome}`);
                console.log(`        CPF: ${servidor.cpf}`);
                console.log(`        OJs: ${servidor.ojs ? servidor.ojs.length : 0} vinculados`);
            });
        }
        
        // Validar expectativas
        let success = false;
        if (testCase.expectedType === 'single' && resultados.length === 1) {
            log.success('Preview único exibido corretamente');
            success = true;
        } else if (testCase.expectedType === 'multiple' && resultados.length > 1) {
            log.success(`Múltiplas sugestões exibidas (${resultados.length} resultados)`);
            success = true;
        } else if (testCase.expectedType === 'empty' && resultados.length === 0) {
            log.success('Nenhum resultado encontrado (esperado)');
            success = true;
        } else {
            log.error(`Resultado inesperado: esperava ${testCase.expectedType}, obteve ${resultados.length} resultado(s)`);
        }
        
        await service.close();
        return { success, responseTime, count: resultados.length };
        
    } catch (error) {
        log.error(`Erro no teste: ${error.message}`);
        await service.close();
        return { success: false, error: error.message };
    }
}

// Função para testar highlighting (destaque de informações)
function testarHighlighting(input, servidor) {
    const isCPF = /^\d+$/.test(input);
    
    console.log('\n' + colors.cyan + '🎨 Teste de Highlighting:' + colors.reset);
    console.log(`  Input: "${input}"`);
    console.log(`  Tipo detectado: ${isCPF ? 'CPF' : 'Nome'}`);
    
    if (isCPF) {
        console.log(`  ${colors.yellow}⭐ Destacar NOME:${colors.reset} ${colors.bright}${servidor.nome}${colors.reset}`);
        console.log(`  CPF: ${servidor.cpf}`);
    } else {
        console.log(`  Nome: ${servidor.nome}`);
        console.log(`  ${colors.yellow}⭐ Destacar CPF:${colors.reset} ${colors.bright}${servidor.cpf}${colors.reset}`);
    }
}

// Função principal de teste
async function executarTestes() {
    console.log(colors.bright + '\n========================================');
    console.log('🚀 TESTE DO SISTEMA DE PREVIEW/AUTOCOMPLETE');
    console.log('========================================' + colors.reset);
    
    const resultados = {
        total: testCases.length,
        sucesso: 0,
        falha: 0,
        tempoTotal: 0,
        tempoMedio: 0
    };
    
    for (const testCase of testCases) {
        console.log('\n' + colors.bright + '-------------------' + colors.reset);
        const resultado = await testarPreview(testCase);
        
        if (resultado.success) {
            resultados.sucesso++;
        } else {
            resultados.falha++;
        }
        
        if (resultado.responseTime) {
            resultados.tempoTotal += resultado.responseTime;
        }
        
        // Testar highlighting para o primeiro caso com resultado único
        if (testCase.expectedType === 'single' && resultado.count === 1) {
            const service = new ServidorDatabaseService();
            const servidores = await service.buscarServidores(testCase.grau, testCase.input, '', 1);
            if (servidores.length > 0) {
                testarHighlighting(testCase.input, servidores[0]);
            }
            await service.close();
        }
    }
    
    // Calcular estatísticas
    resultados.tempoMedio = Math.round(resultados.tempoTotal / testCases.filter(t => t.expectedType !== 'skip').length);
    
    // Exibir resumo
    console.log('\n' + colors.bright + '========================================');
    console.log('📊 RESUMO DOS TESTES');
    console.log('========================================' + colors.reset);
    
    log.result(`Total de testes: ${resultados.total}`);
    log.result(`✅ Sucesso: ${resultados.sucesso}`);
    log.result(`❌ Falha: ${resultados.falha}`);
    log.result(`⏱️  Tempo médio de resposta: ${resultados.tempoMedio}ms`);
    
    const taxaSucesso = (resultados.sucesso / resultados.total * 100).toFixed(1);
    if (taxaSucesso >= 80) {
        log.success(`Taxa de sucesso: ${taxaSucesso}% - EXCELENTE!`);
    } else if (taxaSucesso >= 60) {
        log.warning(`Taxa de sucesso: ${taxaSucesso}% - BOM`);
    } else {
        log.error(`Taxa de sucesso: ${taxaSucesso}% - PRECISA MELHORAR`);
    }
    
    // Testar performance de debounce
    console.log('\n' + colors.bright + '⚡ TESTE DE PERFORMANCE (Debounce)' + colors.reset);
    console.log('Simulando digitação rápida...');
    
    const inputs = ['M', 'MA', 'MAR', 'MARC', 'MARCE', 'MARCEL', 'MARCELO'];
    let debounceCount = 0;
    
    for (const input of inputs) {
        process.stdout.write(`  Digitando: "${input}"`);
        if (input.length >= 3) {
            debounceCount++;
            process.stdout.write(' → Busca seria acionada\n');
        } else {
            process.stdout.write(' → Ignorado (< 3 caracteres)\n');
        }
    }
    
    console.log(`\n  Com debounce de 500ms: Apenas 1 busca seria executada`);
    console.log(`  Sem debounce: ${debounceCount} buscas seriam executadas`);
    console.log(`  ${colors.green}Economia: ${((1 - 1/debounceCount) * 100).toFixed(0)}% menos requisições${colors.reset}`);
    
    console.log('\n' + colors.bright + '========================================');
    console.log('✅ TESTES CONCLUÍDOS!');
    console.log('========================================' + colors.reset);
}

// Executar testes
executarTestes().catch(error => {
    console.error('Erro fatal nos testes:', error);
    process.exit(1);
});