/**
 * 🚀 Exemplo de Integração Otimizada
 * 
 * Este arquivo demonstra como usar todas as otimizações implementadas:
 * - Cache inteligente
 * - Delays ultra-rápidos
 * - Timeouts otimizados
 * - Detecção inteligente de OJs existentes
 * - Processamento assíncrono
 */

const IntelligentCacheSystem = require('./src/utils/intelligent-cache-system');
const UltraFastDelayManager = require('./src/utils/ultra-fast-delay-manager');
const OptimizedTimeoutManager = require('./optimized-timeout-manager');

class ExemploIntegracaoOtimizada {
    constructor() {
        this.cache = new IntelligentCacheSystem();
        this.delayManager = new UltraFastDelayManager();
        this.timeoutManager = new OptimizedTimeoutManager();
        
        console.log('🚀 Sistema de Integração Otimizada Inicializado');
    }

    /**
     * Exemplo 1: Processamento de servidor único com todas as otimizações
     */
    async exemploServidorUnico() {
        console.log('\n📋 EXEMPLO 1: Processamento de Servidor Único');
        console.log('=' .repeat(50));
        
        const servidor = {
            nome: 'João Silva',
            ojs: [
                'Juizado Especial Cível de São Paulo',
                'Vara Cível de Santos',
                'Tribunal de Justiça de SP'
            ]
        };
        
        try {
            // Configurar modo ultra-rápido
            this.delayManager.setMode('ultra_fast');
            this.timeoutManager.setMode('critical');
            
            console.log('⚡ Modo ultra-rápido ativado');
            console.log(`👤 Processando servidor: ${servidor.nome}`);
            console.log(`📊 OJs para analisar: ${servidor.ojs.length}`);
            
            const startTime = Date.now();
            
            // Simular processamento otimizado
            for (const oj of servidor.ojs) {
                await this.processarOJOtimizado(oj);
            }
            
            const endTime = Date.now();
            const tempoTotal = endTime - startTime;
            
            console.log(`✅ Processamento concluído em ${tempoTotal}ms`);
            console.log(`⚡ Economia estimada: ${(servidor.ojs.length * 5000) - tempoTotal}ms`);
            
        } catch (error) {
            console.error('❌ Erro no processamento:', error.message);
        }
    }

    /**
     * Exemplo 2: Processamento em lote com cache inteligente
     */
    async exemploProcessamentoLote() {
        console.log('\n📦 EXEMPLO 2: Processamento em Lote');
        console.log('=' .repeat(50));
        
        const servidores = [
            {
                nome: 'Maria Santos',
                ojs: ['Vara Criminal de SP', 'Juizado Especial Criminal']
            },
            {
                nome: 'Pedro Oliveira',
                ojs: ['Vara Cível de SP', 'Vara Criminal de SP'] // OJ repetida
            },
            {
                nome: 'Ana Costa',
                ojs: ['Tribunal de Justiça', 'Vara Cível de SP'] // OJ repetida
            }
        ];
        
        try {
            console.log(`👥 Processando ${servidores.length} servidores`);
            const startTime = Date.now();
            
            // Processamento paralelo com cache
            const promises = servidores.map(async (servidor, index) => {
                console.log(`\n🔄 Servidor ${index + 1}: ${servidor.nome}`);
                
                for (const oj of servidor.ojs) {
                    await this.processarOJComCache(oj);
                }
            });
            
            await Promise.all(promises);
            
            const endTime = Date.now();
            console.log(`\n✅ Lote processado em ${endTime - startTime}ms`);
            
            // Estatísticas do cache
            const stats = this.cache.getStats();
            console.log(`📊 Cache hits: ${stats.hits}`);
            console.log(`📊 Cache misses: ${stats.misses}`);
            console.log(`📊 Taxa de acerto: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Erro no processamento em lote:', error.message);
        }
    }

    /**
     * Exemplo 3: Detecção inteligente de OJs existentes
     */
    async exemploDeteccaoInteligente() {
        console.log('\n🎯 EXEMPLO 3: Detecção Inteligente de OJs');
        console.log('=' .repeat(50));
        
        const ojsParaTestar = [
            'Juizado Especial Cível de São José dos Campos',
            'Vara Criminal de Santos',
            'Tribunal de Justiça de São Paulo',
            'Juizado Especial de Ribeirão Preto'
        ];
        
        try {
            console.log('🔍 Testando detecção de OJs existentes...');
            
            for (const oj of ojsParaTestar) {
                const resultado = await this.testarDeteccaoOJ(oj);
                const status = resultado.existe ? '✅ EXISTE' : '❌ NÃO EXISTE';
                const similaridade = resultado.similaridade ? ` (${resultado.similaridade}% similar)` : '';
                
                console.log(`${status} ${oj}${similaridade}`);
            }
            
        } catch (error) {
            console.error('❌ Erro na detecção:', error.message);
        }
    }

    /**
     * Exemplo 4: Relatório de performance completo
     */
    async exemploRelatorioPerformance() {
        console.log('\n📊 EXEMPLO 4: Relatório de Performance');
        console.log('=' .repeat(50));
        
        try {
            // Simular diferentes cenários
            const cenarios = [
                { nome: 'Modo Normal', modo: 'normal', ojs: 5 },
                { nome: 'Modo Rápido', modo: 'fast', ojs: 5 },
                { nome: 'Modo Ultra-Rápido', modo: 'ultra_fast', ojs: 5 }
            ];
            
            console.log('🏃‍♂️ Testando diferentes modos de velocidade...');
            
            for (const cenario of cenarios) {
                const tempo = await this.testarCenario(cenario);
                console.log(`${cenario.nome}: ${tempo}ms para ${cenario.ojs} OJs`);
            }
            
            // Estatísticas gerais
            console.log('\n📈 Estatísticas Gerais:');
            console.log(`⚡ Delays otimizados: ${this.delayManager.getStats().optimizations} vezes`);
            console.log(`🎯 Timeouts otimizados: ${this.timeoutManager.getStats().optimizations} vezes`);
            console.log(`💾 Itens em cache: ${this.cache.getStats().size}`);
            
        } catch (error) {
            console.error('❌ Erro no relatório:', error.message);
        }
    }

    /**
     * Processar OJ com todas as otimizações
     */
    async processarOJOtimizado(oj) {
        // Delay ultra-rápido
        await this.delayManager.wait('critical');
        
        // Simular processamento
        const tempo = this.timeoutManager.getTimeout('search');
        await new Promise(resolve => setTimeout(resolve, Math.min(tempo, 50)));
        
        console.log(`  ✅ ${oj} processado`);
    }

    /**
     * Processar OJ com cache inteligente
     */
    async processarOJComCache(oj) {
        const cacheKey = `oj_${oj.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Verificar cache
        let resultado = await this.cache.get(cacheKey);
        
        if (resultado) {
            console.log(`  💾 ${oj} (cache hit)`);
        } else {
            // Processar e armazenar no cache
            await this.delayManager.wait('fast');
            resultado = { processado: true, timestamp: Date.now() };
            await this.cache.set(cacheKey, resultado, 300000); // 5 minutos
            console.log(`  ✅ ${oj} (processado)`);
        }
        
        return resultado;
    }

    /**
     * Testar detecção de OJ
     */
    async testarDeteccaoOJ(oj) {
        // Simular detecção com base em similaridade
        const ojsExistentes = [
            'Juizado Especial Cível de São José dos Campos',
            'Vara Criminal de Santos',
            'Tribunal de Justiça de São Paulo'
        ];
        
        let melhorSimilaridade = 0;
        let existe = false;
        
        for (const ojExistente of ojsExistentes) {
            const similaridade = this.calcularSimilaridade(oj, ojExistente);
            if (similaridade > melhorSimilaridade) {
                melhorSimilaridade = similaridade;
            }
            if (similaridade >= 85) {
                existe = true;
            }
        }
        
        return {
            existe,
            similaridade: Math.round(melhorSimilaridade)
        };
    }

    /**
     * Testar cenário de performance
     */
    async testarCenario(cenario) {
        this.delayManager.setMode(cenario.modo);
        
        const startTime = Date.now();
        
        for (let i = 0; i < cenario.ojs; i++) {
            await this.delayManager.wait('normal');
        }
        
        return Date.now() - startTime;
    }

    /**
     * Calcular similaridade entre strings
     */
    calcularSimilaridade(str1, str2) {
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const s1 = normalize(str1);
        const s2 = normalize(str2);
        
        if (s1 === s2) return 100;
        
        const maxLen = Math.max(s1.length, s2.length);
        const distance = this.levenshteinDistance(s1, s2);
        
        return Math.max(0, (1 - distance / maxLen) * 100);
    }

    /**
     * Calcular distância de Levenshtein
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

    /**
     * Executar todos os exemplos
     */
    async executarTodosExemplos() {
        console.log('🚀 SISTEMA DE INTEGRAÇÃO OTIMIZADA');
        console.log('=' .repeat(60));
        console.log('Este exemplo demonstra todas as otimizações implementadas:');
        console.log('• Cache inteligente com TTL adaptativo');
        console.log('• Delays ultra-rápidos contextuais');
        console.log('• Timeouts otimizados por operação');
        console.log('• Detecção inteligente de OJs existentes');
        console.log('• Processamento assíncrono avançado');
        console.log('=' .repeat(60));
        
        try {
            await this.exemploServidorUnico();
            await this.exemploProcessamentoLote();
            await this.exemploDeteccaoInteligente();
            await this.exemploRelatorioPerformance();
            
            console.log('\n🎉 TODOS OS EXEMPLOS EXECUTADOS COM SUCESSO!');
            console.log('✅ Sistema otimizado funcionando perfeitamente.');
            
        } catch (error) {
            console.error('❌ Erro na execução dos exemplos:', error.message);
        } finally {
            // Limpeza
            await this.cache.clear();
            console.log('🧹 Cache limpo.');
        }
    }
}

// Executar exemplos se chamado diretamente
if (require.main === module) {
    const exemplo = new ExemploIntegracaoOtimizada();
    exemplo.executarTodosExemplos().catch(console.error);
}

module.exports = ExemploIntegracaoOtimizada;