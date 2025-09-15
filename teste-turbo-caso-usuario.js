/**
 * 🚀 TESTE TURBO - CASO ESPECÍFICO DO USUÁRIO
 * Validação da versão otimizada com dados reais
 */

const SmartOJIntegrationTurbo = require('./src/utils/smart-oj-integration-turbo');

class TesteTurboCasoUsuario {
    constructor() {
        this.integration = new SmartOJIntegrationTurbo();
        this.servidor = {
            nome: 'Dirlei Zanini Pereira',
            cpf: '09750350880',
            papel: 'Assessor'
        };
        
        // OJs do servidor (dados originais)
        this.ojsServidor = [
            'Juizado Especial da Infância e da Adolescência da Circunscrição de Araçatuba',
            'Juizado Especial da Infância e da Adolescência da Circunscrição de Bauru',
            'Juizado Especial da Infância e da Adolescência da Circunscrição de Sorocaba',
            'Juizado Especial da Infância e da Adolescência de Fernandópolis',
            'Juizado Especial da Infância e da Adolescência de São José do Rio Preto',
            'Juizado Especial da Infância e da Adolescência de Campinas',
            'Juizado Especial da Infância e da Adolescência de Franca',
            'Juizado Especial da Infância e da Adolescência de Presidente Prudente',
            'Juizado Especial da Infância e da Adolescência de Ribeirão Preto',
            'Juizado Especial da Infância e da Adolescência de São José dos Campos'
        ];
        
        // OJs já existentes no PJe (dados reais)
        this.ojsExistentesPJe = [
            {
                nome: 'Juizado Especial da Infância e Adolescência de Araçatuba',
                perfis: ['Assessor'],
                data: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Bauru',
                perfis: ['Assessor'],
                data: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Campinas',
                perfis: ['Assessor'],
                data: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Fernandópolis',
                perfis: ['Assessor'],
                data: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Franca',
                perfis: ['Assessor'],
                data: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Presidente Prudente',
                perfis: ['Assessor'],
                data: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Ribeirão Preto',
                perfis: ['Assessor'],
                data: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Sorocaba',
                perfis: ['Assessor'],
                data: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de São José do Rio Preto',
                perfis: ['Assessor'],
                data: '13/09/2025'
            }
        ];
    }

    /**
     * 🚀 EXECUTAR TESTE TURBO COMPLETO
     */
    async executarTesteTurbo() {
        console.log('\n🚀 ========== TESTE TURBO - CASO USUÁRIO ==========\n');
        
        const startTime = Date.now();
        
        try {
            // 1. Configurar delays ultra-rápidos
            this.configurarModoTurbo();
            
            // 2. Simular processamento turbo
            const resultado = await this.simularProcessamentoTurbo();
            
            // 3. Análise detalhada
            this.analisarResultados(resultado);
            
            // 4. Teste de performance
            this.testarPerformance(startTime);
            
            // 5. Validar correção do problema
            this.validarCorrecaoProblema(resultado);
            
            console.log('\n✅ TESTE TURBO CONCLUÍDO COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ Erro no teste turbo:', error.message);
        }
    }

    /**
     * ⚙️ CONFIGURAR MODO TURBO
     */
    configurarModoTurbo() {
        console.log('⚙️ Configurando modo TURBO...');
        
        // Delays ultra-rápidos
        this.integration.setCustomDelays({
            navigation: 50,      // Ultra-rápido
            formFill: 25,       // Ultra-rápido
            buttonClick: 10,    // Ultra-rápido
            pageLoad: 100,      // Ultra-rápido
            verification: 50    // Ultra-rápido
        });
        
        // Timeouts otimizados
        this.integration.setCustomTimeouts({
            pageLoad: 3000,     // Reduzido drasticamente
            elementWait: 1000,  // Reduzido drasticamente
            formSubmit: 2000    // Reduzido drasticamente
        });
        
        console.log('✅ Modo TURBO configurado!');
    }

    /**
     * 🚀 SIMULAR PROCESSAMENTO TURBO
     */
    async simularProcessamentoTurbo() {
        console.log('🚀 Iniciando processamento TURBO...');
        
        // Simular página mockada
        const mockPage = this.criarMockPage();
        
        // Executar processamento turbo
        const resultado = await this.integration.processServerTurbo(
            mockPage,
            this.servidor,
            this.ojsServidor.map(nome => ({ nome, perfil: 'Assessor' }))
        );
        
        return resultado;
    }

    /**
     * 🎭 CRIAR MOCK PAGE PARA TESTE
     */
    criarMockPage() {
        return {
            waitForSelector: async () => true,
            click: async () => true,
            fill: async () => true,
            selectOption: async () => true,
            isVisible: async () => true,
            evaluate: async () => this.ojsExistentesPJe
        };
    }

    /**
     * 📊 ANALISAR RESULTADOS
     */
    analisarResultados(resultado) {
        console.log('\n📊 ========== ANÁLISE DE RESULTADOS ==========');
        
        const { analysis, results, processingTime, stats } = resultado;
        
        console.log(`\n🔍 ANÁLISE DE OJs EXISTENTES:`);
        console.log(`   • Total encontrado: ${analysis.totalFound}`);
        console.log(`   • Cache hits: ${stats.cacheHits}`);
        
        console.log(`\n🎯 RESULTADOS DO PROCESSAMENTO:`);
        console.log(`   • OJs para criar: ${results.created.length}`);
        console.log(`   • Papéis para adicionar: ${results.rolesAdded.length}`);
        console.log(`   • OJs para pular: ${results.skipped.length}`);
        console.log(`   • Erros: ${results.errors.length}`);
        
        console.log(`\n⚡ PERFORMANCE:`);
        console.log(`   • Tempo total: ${processingTime}ms`);
        console.log(`   • Tempo médio por OJ: ${stats.averageProcessingTime}ms`);
        console.log(`   • Taxa de cache hit: ${stats.cacheHitRate}%`);
        
        // Detalhar OJs que seriam pulados (correto)
        if (results.skipped.length > 0) {
            console.log(`\n✅ OJs CORRETAMENTE IDENTIFICADOS COMO EXISTENTES:`);
            results.skipped.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome}`);
                console.log(`      → Motivo: ${oj.reason}`);
                console.log(`      → Perfis existentes: ${oj.existingRoles.join(', ')}`);
            });
        }
        
        // Detalhar OJs que seriam criados (problema)
        if (results.created.length > 0) {
            console.log(`\n⚠️ OJs QUE SERIAM CRIADOS (VERIFICAR):`);
            results.created.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome}`);
                console.log(`      → Perfil: ${oj.perfil}`);
            });
        }
    }

    /**
     * ⚡ TESTAR PERFORMANCE
     */
    testarPerformance(startTime) {
        const totalTime = Date.now() - startTime;
        const ojsProcessados = this.ojsServidor.length;
        const tempoMedioPorOJ = Math.round(totalTime / ojsProcessados);
        
        console.log(`\n⚡ ========== TESTE DE PERFORMANCE ==========`);
        console.log(`   • Tempo total do teste: ${totalTime}ms`);
        console.log(`   • OJs processados: ${ojsProcessados}`);
        console.log(`   • Tempo médio por OJ: ${tempoMedioPorOJ}ms`);
        
        // Benchmarks
        const benchmarks = {
            excelente: 50,   // < 50ms por OJ
            bom: 100,        // < 100ms por OJ
            aceitavel: 200,  // < 200ms por OJ
            lento: 500       // < 500ms por OJ
        };
        
        let performance = 'muito lento';
        if (tempoMedioPorOJ < benchmarks.excelente) performance = 'excelente';
        else if (tempoMedioPorOJ < benchmarks.bom) performance = 'bom';
        else if (tempoMedioPorOJ < benchmarks.aceitavel) performance = 'aceitável';
        else if (tempoMedioPorOJ < benchmarks.lento) performance = 'lento';
        
        console.log(`   • Classificação: ${performance.toUpperCase()}`);
        
        // Comparação com versão original
        const tempoOriginalEstimado = ojsProcessados * 3000; // ~3s por OJ na versão original
        const melhoria = Math.round(((tempoOriginalEstimado - totalTime) / tempoOriginalEstimado) * 100);
        
        console.log(`\n📈 COMPARAÇÃO COM VERSÃO ORIGINAL:`);
        console.log(`   • Tempo estimado versão original: ${tempoOriginalEstimado}ms`);
        console.log(`   • Tempo versão turbo: ${totalTime}ms`);
        console.log(`   • Melhoria de performance: ${melhoria}%`);
    }

    /**
     * ✅ VALIDAR CORREÇÃO DO PROBLEMA
     */
    validarCorrecaoProblema(resultado) {
        console.log(`\n✅ ========== VALIDAÇÃO DO PROBLEMA ==========`);
        
        const { results } = resultado;
        const totalOJs = this.ojsServidor.length;
        const ojsExistentesDetectados = results.skipped.length;
        const ojsParaCriar = results.created.length;
        
        console.log(`\n🎯 DETECÇÃO DE OJs EXISTENTES:`);
        console.log(`   • Total de OJs: ${totalOJs}`);
        console.log(`   • OJs existentes detectados: ${ojsExistentesDetectados}`);
        console.log(`   • OJs marcados para criação: ${ojsParaCriar}`);
        console.log(`   • Taxa de detecção: ${Math.round((ojsExistentesDetectados / totalOJs) * 100)}%`);
        
        // Validar se o problema foi resolvido
        const problemaResolvido = ojsParaCriar <= 1; // Máximo 1 OJ não detectado é aceitável
        
        if (problemaResolvido) {
            console.log(`\n🎉 PROBLEMA RESOLVIDO!`);
            console.log(`   ✅ Sistema detectou corretamente os OJs existentes`);
            console.log(`   ✅ Evitou tentativas desnecessárias de re-cadastro`);
            console.log(`   ✅ Performance otimizada com modo TURBO`);
        } else {
            console.log(`\n⚠️ PROBLEMA PARCIALMENTE RESOLVIDO`);
            console.log(`   • ${ojsParaCriar} OJs ainda seriam criados desnecessariamente`);
            console.log(`   • Necessário ajuste adicional na normalização`);
        }
        
        // Análise de correspondência detalhada
        console.log(`\n🔍 ANÁLISE DE CORRESPONDÊNCIA:`);
        this.analisarCorrespondenciaDetalhada();
    }

    /**
     * 🔍 ANÁLISE DETALHADA DE CORRESPONDÊNCIA
     */
    analisarCorrespondenciaDetalhada() {
        console.log(`\n📋 CORRESPONDÊNCIA OJ POR OJ:`);
        
        this.ojsServidor.forEach((ojServidor, index) => {
            const normalizedServidor = this.integration.normalizeOJName(ojServidor);
            
            // Buscar correspondência no PJe
            const correspondencia = this.ojsExistentesPJe.find(ojPje => {
                const normalizedPje = this.integration.normalizeOJName(ojPje.nome);
                return normalizedPje === normalizedServidor;
            });
            
            console.log(`\n   ${index + 1}. ${ojServidor}`);
            console.log(`      → Normalizado: "${normalizedServidor}"`);
            
            if (correspondencia) {
                console.log(`      ✅ ENCONTRADO: ${correspondencia.nome}`);
                console.log(`      → PJe normalizado: "${this.integration.normalizeOJName(correspondencia.nome)}"`);
                console.log(`      → Perfis: ${correspondencia.perfis.join(', ')}`);
            } else {
                console.log(`      ❌ NÃO ENCONTRADO`);
                
                // Buscar similaridades
                const similaridades = this.ojsExistentesPJe.map(ojPje => ({
                    nome: ojPje.nome,
                    similarity: this.calcularSimilaridade(normalizedServidor, this.integration.normalizeOJName(ojPje.nome))
                })).sort((a, b) => b.similarity - a.similarity);
                
                console.log(`      → Mais similar: ${similaridades[0].nome} (${Math.round(similaridades[0].similarity * 100)}%)`);
            }
        });
    }

    /**
     * 📊 CALCULAR SIMILARIDADE ENTRE STRINGS
     */
    calcularSimilaridade(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * 📏 CALCULAR DISTÂNCIA LEVENSHTEIN
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

// 🚀 EXECUTAR TESTE
async function executarTeste() {
    const teste = new TesteTurboCasoUsuario();
    await teste.executarTesteTurbo();
}

// Executar se chamado diretamente
if (require.main === module) {
    executarTeste().catch(console.error);
}

module.exports = TesteTurboCasoUsuario;