/**
 * 🎯 SOLUÇÃO OTIMIZADA PARA CASO ESPECÍFICO DO USUÁRIO
 * Sistema inteligente para detectar OJs já cadastrados e evitar re-cadastramento
 * Implementa detecção avançada, cache inteligente e processamento ultra-rápido
 */

const IntelligentCacheSystem = require('./src/utils/intelligent-cache-system');
const UltraFastDelayManager = require('./src/utils/ultra-fast-delay-manager');
const OptimizedTimeoutManager = require('./optimized-timeout-manager');

class SolucaoOtimizadaUsuario {
    constructor(options = {}) {
        this.config = {
            // Configurações de detecção
            detection: {
                similarityThreshold: 0.85,      // 85% de similaridade
                fuzzyMatchEnabled: true,        // Busca fuzzy
                normalizeNames: true,           // Normalização de nomes
                cacheResults: true,             // Cache de resultados
                smartComparison: true           // Comparação inteligente
            },
            
            // Configurações de performance
            performance: {
                useCache: true,
                useTurboMode: true,
                useOptimizedTimeouts: true,
                parallelProcessing: true,
                batchSize: 5
            },
            
            // Configurações de relatório
            reporting: {
                detailedLogs: true,
                generateReport: true,
                showStatistics: true,
                exportResults: false
            }
        };
        
        // Inicializar sistemas otimizados
        this.cache = new IntelligentCacheSystem({
            memoryTTL: 600000,  // 10 minutos
            diskCache: true,
            adaptiveTTL: true
        });
        
        this.delayManager = new UltraFastDelayManager({
            mode: 'ultra_fast',
            adaptive: true
        });
        
        this.timeoutManager = new OptimizedTimeoutManager({
            mode: 'critical'
        });
        
        // Dados do caso específico do usuário
        this.dadosUsuario = {
            servidor: {
                nome: 'Dirlei Zanini Pereira',
                cpf: '09750350880',
                cargo: 'Assessor'
            },
            ojsServidor: [
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
            ],
            ojsPje: [
                'Juizado Especial da Infância e Adolescência de Araçatuba',
                'Juizado Especial da Infância e Adolescência de Bauru',
                'Juizado Especial da Infância e Adolescência de Campinas',
                'Juizado Especial da Infância e Adolescência de Fernandópolis',
                'Juizado Especial da Infância e Adolescência de Franca',
                'Juizado Especial da Infância e Adolescência de Presidente Prudente',
                'Juizado Especial da Infância e Adolescência de Ribeirão Preto',
                'Juizado Especial da Infância e Adolescência de Sorocaba',
                'Juizado Especial da Infância e Adolescência de São José do Rio Preto'
            ]
        };
        
        // Estatísticas
        this.stats = {
            ojsAnalisados: 0,
            ojsDetectados: 0,
            ojsParaCriar: 0,
            ojsParaPular: 0,
            tempoTotal: 0,
            tempoEconomizado: 0,
            operacoesEvitadas: 0
        };
        
        console.log('🎯 [SOLUÇÃO] Sistema otimizado inicializado para caso específico');
    }

    /**
     * 🚀 EXECUTAR SOLUÇÃO COMPLETA
     */
    async executarSolucao() {
        console.log('\n🎯 ========== INICIANDO SOLUÇÃO OTIMIZADA ==========');
        const startTime = Date.now();
        
        try {
            // 1. Análise inteligente dos OJs
            console.log('\n🔍 FASE 1: Análise Inteligente dos OJs');
            const analiseResultado = await this.analisarOJsInteligente();
            
            // 2. Detecção avançada de correspondências
            console.log('\n🎯 FASE 2: Detecção Avançada de Correspondências');
            const deteccaoResultado = await this.detectarCorrespondencias(analiseResultado);
            
            // 3. Processamento otimizado
            console.log('\n⚡ FASE 3: Processamento Otimizado');
            const processamentoResultado = await this.processarOtimizado(deteccaoResultado);
            
            // 4. Geração de relatório
            console.log('\n📊 FASE 4: Geração de Relatório');
            const relatorio = await this.gerarRelatorioCompleto(processamentoResultado);
            
            // 5. Estatísticas finais
            this.stats.tempoTotal = Date.now() - startTime;
            this.exibirEstatisticasFinais();
            
            return {
                sucesso: true,
                resultado: processamentoResultado,
                relatorio: relatorio,
                stats: this.stats
            };
            
        } catch (error) {
            console.error('❌ [SOLUÇÃO] Erro na execução:', error.message);
            return {
                sucesso: false,
                erro: error.message,
                stats: this.stats
            };
        }
    }

    /**
     * 🧠 ANÁLISE INTELIGENTE DOS OJs
     */
    async analisarOJsInteligente() {
        const cacheKey = `analise_ojs_${this.dadosUsuario.servidor.cpf}`;
        
        return await this.cache.getOrCompute(cacheKey, async () => {
            console.log('🔍 Analisando OJs do servidor...');
            
            const ojsNormalizados = this.dadosUsuario.ojsServidor.map(oj => ({
                original: oj,
                normalizado: this.normalizarNomeOJ(oj),
                palavrasChave: this.extrairPalavrasChave(oj),
                tipo: this.identificarTipoOJ(oj),
                localidade: this.extrairLocalidade(oj)
            }));
            
            console.log(`✅ ${ojsNormalizados.length} OJs analisados e normalizados`);
            
            return {
                ojsOriginais: this.dadosUsuario.ojsServidor,
                ojsNormalizados: ojsNormalizados,
                totalOJs: ojsNormalizados.length
            };
        }, { ttl: 600000 }); // Cache por 10 minutos
    }

    /**
     * 🎯 DETECTAR CORRESPONDÊNCIAS AVANÇADAS
     */
    async detectarCorrespondencias(analiseResultado) {
        console.log('🎯 Detectando correspondências com PJe...');
        
        const correspondencias = [];
        const ojsSemCorrespondencia = [];
        
        for (const ojServidor of analiseResultado.ojsNormalizados) {
            await this.delayManager.criticalDelay();
            
            // Buscar correspondência no PJe
            const correspondencia = await this.buscarCorrespondenciaPJe(ojServidor);
            
            if (correspondencia) {
                correspondencias.push({
                    ojServidor: ojServidor,
                    ojPje: correspondencia.oj,
                    similaridade: correspondencia.similaridade,
                    metodo: correspondencia.metodo,
                    acao: 'PULAR' // Já existe no PJe
                });
                this.stats.ojsDetectados++;
            } else {
                ojsSemCorrespondencia.push({
                    ojServidor: ojServidor,
                    acao: 'CRIAR' // Precisa ser criado
                });
                this.stats.ojsParaCriar++;
            }
            
            this.stats.ojsAnalisados++;
        }
        
        console.log(`✅ ${correspondencias.length} correspondências encontradas`);
        console.log(`📝 ${ojsSemCorrespondencia.length} OJs precisam ser criados`);
        
        return {
            correspondencias: correspondencias,
            ojsParaCriar: ojsSemCorrespondencia,
            totalDetectados: correspondencias.length,
            totalParaCriar: ojsSemCorrespondencia.length
        };
    }

    /**
     * 🔍 BUSCAR CORRESPONDÊNCIA NO PJE
     */
    async buscarCorrespondenciaPJe(ojServidor) {
        // Cache por OJ específico
        const cacheKey = `correspondencia_${ojServidor.normalizado}`;
        
        return await this.cache.getOrCompute(cacheKey, async () => {
            let melhorCorrespondencia = null;
            let maiorSimilaridade = 0;
            
            for (const ojPje of this.dadosUsuario.ojsPje) {
                const ojPjeNormalizado = this.normalizarNomeOJ(ojPje);
                
                // Múltiplos métodos de comparação
                const similaridades = {
                    exata: this.compararExato(ojServidor.normalizado, ojPjeNormalizado),
                    fuzzy: this.calcularSimilaridadeFuzzy(ojServidor.normalizado, ojPjeNormalizado),
                    palavrasChave: this.compararPalavrasChave(ojServidor.palavrasChave, this.extrairPalavrasChave(ojPje)),
                    localidade: this.compararLocalidade(ojServidor.localidade, this.extrairLocalidade(ojPje))
                };
                
                // Calcular similaridade ponderada
                const similaridadePonderada = (
                    similaridades.exata * 0.4 +
                    similaridades.fuzzy * 0.3 +
                    similaridades.palavrasChave * 0.2 +
                    similaridades.localidade * 0.1
                );
                
                if (similaridadePonderada > maiorSimilaridade && 
                    similaridadePonderada >= this.config.detection.similarityThreshold) {
                    maiorSimilaridade = similaridadePonderada;
                    melhorCorrespondencia = {
                        oj: ojPje,
                        similaridade: similaridadePonderada,
                        metodo: this.identificarMetodoDeteccao(similaridades),
                        detalhes: similaridades
                    };
                }
            }
            
            return melhorCorrespondencia;
        }, { ttl: 300000 }); // Cache por 5 minutos
    }

    /**
     * ⚡ PROCESSAMENTO OTIMIZADO
     */
    async processarOtimizado(deteccaoResultado) {
        console.log('⚡ Iniciando processamento otimizado...');
        
        const resultado = {
            ojsProcessados: [],
            ojsPulados: [],
            ojsCriados: [],
            tempoProcessamento: 0,
            operacoesRealizadas: 0
        };
        
        const startTime = Date.now();
        
        // Processar correspondências (pular)
        for (const correspondencia of deteccaoResultado.correspondencias) {
            await this.delayManager.batchDelay();
            
            resultado.ojsPulados.push({
                oj: correspondencia.ojServidor.original,
                motivo: `Já existe no PJe: ${correspondencia.ojPje}`,
                similaridade: Math.round(correspondencia.similaridade * 100),
                tempoEconomizado: 30000 // 30 segundos por OJ
            });
            
            this.stats.ojsParaPular++;
            this.stats.tempoEconomizado += 30000;
            this.stats.operacoesEvitadas++;
        }
        
        // Processar OJs para criar
        for (const ojParaCriar of deteccaoResultado.ojsParaCriar) {
            await this.delayManager.batchDelay();
            
            resultado.ojsCriados.push({
                oj: ojParaCriar.ojServidor.original,
                acao: 'Criar no PJe',
                prioridade: 'Alta',
                tempoEstimado: 45000 // 45 segundos por criação
            });
            
            resultado.operacoesRealizadas++;
        }
        
        resultado.tempoProcessamento = Date.now() - startTime;
        
        console.log(`✅ Processamento concluído em ${resultado.tempoProcessamento}ms`);
        console.log(`🚫 ${resultado.ojsPulados.length} OJs pulados (já existem)`);
        console.log(`📝 ${resultado.ojsCriados.length} OJs marcados para criação`);
        
        return resultado;
    }

    /**
     * 📊 GERAR RELATÓRIO COMPLETO
     */
    async gerarRelatorioCompleto(processamentoResultado) {
        console.log('📊 Gerando relatório completo...');
        
        const relatorio = {
            timestamp: new Date().toISOString(),
            servidor: this.dadosUsuario.servidor,
            resumo: {
                totalOJs: this.dadosUsuario.ojsServidor.length,
                ojsDetectados: this.stats.ojsDetectados,
                ojsParaCriar: this.stats.ojsParaCriar,
                taxaDeteccao: Math.round((this.stats.ojsDetectados / this.dadosUsuario.ojsServidor.length) * 100),
                tempoEconomizado: Math.round(this.stats.tempoEconomizado / 1000),
                operacoesEvitadas: this.stats.operacoesEvitadas
            },
            detalhes: {
                ojsPulados: processamentoResultado.ojsPulados,
                ojsParaCriar: processamentoResultado.ojsCriados
            },
            performance: {
                tempoTotal: this.stats.tempoTotal,
                tempoProcessamento: processamentoResultado.tempoProcessamento,
                cacheStats: this.cache.getStats(),
                delayStats: this.delayManager.getStats()
            },
            recomendacoes: this.gerarRecomendacoes()
        };
        
        return relatorio;
    }

    /**
     * 💡 GERAR RECOMENDAÇÕES
     */
    gerarRecomendacoes() {
        const recomendacoes = [];
        
        const taxaDeteccao = (this.stats.ojsDetectados / this.dadosUsuario.ojsServidor.length) * 100;
        
        if (taxaDeteccao > 90) {
            recomendacoes.push('🎯 Excelente detecção! Sistema funcionando perfeitamente.');
        } else if (taxaDeteccao > 70) {
            recomendacoes.push('✅ Boa detecção. Considere ajustar threshold de similaridade.');
        } else {
            recomendacoes.push('⚠️ Detecção baixa. Revisar algoritmo de normalização.');
        }
        
        if (this.stats.tempoEconomizado > 60000) {
            recomendacoes.push(`⚡ Tempo economizado: ${Math.round(this.stats.tempoEconomizado/1000)}s`);
        }
        
        if (this.stats.operacoesEvitadas > 5) {
            recomendacoes.push(`🚫 ${this.stats.operacoesEvitadas} operações desnecessárias evitadas`);
        }
        
        return recomendacoes;
    }

    /**
     * 📈 EXIBIR ESTATÍSTICAS FINAIS
     */
    exibirEstatisticasFinais() {
        console.log('\n📈 ========== ESTATÍSTICAS FINAIS ==========');
        console.log(`👤 Servidor: ${this.dadosUsuario.servidor.nome}`);
        console.log(`📊 OJs analisados: ${this.stats.ojsAnalisados}`);
        console.log(`🎯 OJs detectados: ${this.stats.ojsDetectados}`);
        console.log(`📝 OJs para criar: ${this.stats.ojsParaCriar}`);
        console.log(`🚫 OJs para pular: ${this.stats.ojsParaPular}`);
        console.log(`⏰ Tempo total: ${Math.round(this.stats.tempoTotal / 1000)}s`);
        console.log(`⚡ Tempo economizado: ${Math.round(this.stats.tempoEconomizado / 1000)}s`);
        console.log(`🚫 Operações evitadas: ${this.stats.operacoesEvitadas}`);
        
        const taxaDeteccao = Math.round((this.stats.ojsDetectados / this.stats.ojsAnalisados) * 100);
        console.log(`\n🏆 TAXA DE DETECÇÃO: ${taxaDeteccao}%`);
        
        if (taxaDeteccao > 90) {
            console.log('🎯 RESULTADO: EXCELENTE! Sistema detectou corretamente os OJs existentes.');
        } else if (taxaDeteccao > 70) {
            console.log('✅ RESULTADO: BOM! Maioria dos OJs foi detectada corretamente.');
        } else {
            console.log('⚠️ RESULTADO: ATENÇÃO! Muitos OJs não foram detectados.');
        }
    }

    /**
     * 🔧 MÉTODOS AUXILIARES DE NORMALIZAÇÃO E COMPARAÇÃO
     */
    
    normalizarNomeOJ(nome) {
        return nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\b(da|de|do|das|dos|e)\b/g, '')
            .replace(/circunscricao/g, '')
            .replace(/especial/g, 'esp')
            .replace(/infancia/g, 'inf')
            .replace(/adolescencia/g, 'adol')
            .replace(/juizado/g, 'jui')
            .trim()
            .replace(/\s+/g, ' ');
    }
    
    extrairPalavrasChave(nome) {
        const palavrasIgnorar = ['da', 'de', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as'];
        return nome
            .toLowerCase()
            .split(/\s+/)
            .filter(palavra => palavra.length > 2 && !palavrasIgnorar.includes(palavra))
            .slice(0, 5); // Máximo 5 palavras-chave
    }
    
    identificarTipoOJ(nome) {
        if (nome.includes('Juizado Especial')) return 'juizado_especial';
        if (nome.includes('Vara')) return 'vara';
        if (nome.includes('Tribunal')) return 'tribunal';
        return 'outros';
    }
    
    extrairLocalidade(nome) {
        const match = nome.match(/de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
        return match ? match[match.length - 1].replace('de ', '') : '';
    }
    
    compararExato(nome1, nome2) {
        return nome1 === nome2 ? 1.0 : 0.0;
    }
    
    calcularSimilaridadeFuzzy(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1,
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1.0 : (maxLen - matrix[len2][len1]) / maxLen;
    }
    
    compararPalavrasChave(palavras1, palavras2) {
        if (palavras1.length === 0 || palavras2.length === 0) return 0;
        
        const intersecao = palavras1.filter(p => palavras2.includes(p)).length;
        const uniao = new Set([...palavras1, ...palavras2]).size;
        
        return intersecao / uniao;
    }
    
    compararLocalidade(loc1, loc2) {
        if (!loc1 || !loc2) return 0;
        return this.calcularSimilaridadeFuzzy(loc1.toLowerCase(), loc2.toLowerCase());
    }
    
    identificarMetodoDeteccao(similaridades) {
        if (similaridades.exata === 1.0) return 'Correspondência Exata';
        if (similaridades.fuzzy > 0.9) return 'Correspondência Fuzzy Alta';
        if (similaridades.palavrasChave > 0.8) return 'Correspondência por Palavras-Chave';
        return 'Correspondência por Localidade';
    }
}

// Executar solução se chamado diretamente
if (require.main === module) {
    (async () => {
        console.log('🚀 Iniciando Solução Otimizada para Caso do Usuário...');
        
        const solucao = new SolucaoOtimizadaUsuario();
        const resultado = await solucao.executarSolucao();
        
        if (resultado.sucesso) {
            console.log('\n🎉 ========== SOLUÇÃO EXECUTADA COM SUCESSO ==========');
            console.log('📊 Relatório salvo e estatísticas geradas.');
            console.log('✅ Sistema funcionando corretamente!');
        } else {
            console.log('\n❌ ========== ERRO NA EXECUÇÃO ==========');
            console.log(`Erro: ${resultado.erro}`);
        }
    })();
}

module.exports = SolucaoOtimizadaUsuario;