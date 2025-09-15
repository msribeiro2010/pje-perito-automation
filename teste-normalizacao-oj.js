/**
 * 🧪 TESTE DE NORMALIZAÇÃO DE NOMES DE OJs
 * Verifica se a normalização está funcionando corretamente para o caso específico
 */

const SmartOJIntegration = require('./src/utils/smart-oj-integration');
const OJProfileValidator = require('./src/utils/oj-profile-validator');

class TesteNormalizacaoOJ {
    constructor() {
        this.integration = new SmartOJIntegration();
        this.validator = new OJProfileValidator();
    }

    /**
     * 🔍 TESTA NORMALIZAÇÃO COM DADOS REAIS DO USUÁRIO
     */
    testarNormalizacaoEspecifica() {
        console.log('\n🧪 TESTE DE NORMALIZAÇÃO - CASO ESPECÍFICO');
        console.log('=' .repeat(60));

        // OJs do servidor (configuração)
        const ojsServidor = [
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

        // OJs no PJe (existentes)
        const ojsPJe = [
            'Juizado Especial da Infância e Adolescência de Araçatuba',
            'Juizado Especial da Infância e Adolescência de Bauru',
            'Juizado Especial da Infância e Adolescência de Campinas',
            'Juizado Especial da Infância e Adolescência de Fernandópolis',
            'Juizado Especial da Infância e Adolescência de Franca',
            'Juizado Especial da Infância e Adolescência de Presidente Prudente',
            'Juizado Especial da Infância e Adolescência de Ribeirão Preto',
            'Juizado Especial da Infância e Adolescência de Sorocaba',
            'Juizado Especial da Infância e Adolescência de São José do Rio Preto'
        ];

        console.log('\n📋 COMPARAÇÃO DE NORMALIZAÇÃO:');
        console.log('-'.repeat(80));

        let matches = 0;
        let mismatches = 0;

        ojsServidor.forEach((ojServidor, index) => {
            const normalizedServidor = this.integration.normalizeOJName(ojServidor);
            
            // Procurar correspondência no PJe
            const matchPJe = ojsPJe.find(ojPJe => 
                this.integration.normalizeOJName(ojPJe) === normalizedServidor
            );

            if (matchPJe) {
                matches++;
                console.log(`✅ MATCH ${index + 1}:`);
                console.log(`   Servidor: "${ojServidor}"`);
                console.log(`   PJe:      "${matchPJe}"`);
                console.log(`   Normal:   "${normalizedServidor}"`);
            } else {
                mismatches++;
                console.log(`❌ NO MATCH ${index + 1}:`);
                console.log(`   Servidor: "${ojServidor}"`);
                console.log(`   Normal:   "${normalizedServidor}"`);
                console.log(`   Possíveis no PJe:`);
                ojsPJe.forEach(ojPJe => {
                    const normalizedPJe = this.integration.normalizeOJName(ojPJe);
                    const similarity = this.calculateSimilarity(normalizedServidor, normalizedPJe);
                    if (similarity > 0.7) {
                        console.log(`     - "${ojPJe}" (${normalizedPJe}) - ${(similarity * 100).toFixed(1)}% similar`);
                    }
                });
            }
            console.log('');
        });

        console.log('\n📊 RESULTADO FINAL:');
        console.log(`✅ Matches encontrados: ${matches}`);
        console.log(`❌ Sem correspondência: ${mismatches}`);
        console.log(`📈 Taxa de sucesso: ${((matches / ojsServidor.length) * 100).toFixed(1)}%`);

        return { matches, mismatches, total: ojsServidor.length };
    }

    /**
     * 🔧 CALCULA SIMILARIDADE ENTRE STRINGS
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * 📏 CALCULA DISTÂNCIA DE LEVENSHTEIN
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
     * 🔍 TESTA FILTRO COM DADOS SIMULADOS
     */
    async testarFiltroCompleto() {
        console.log('\n🧪 TESTE DE FILTRO COMPLETO');
        console.log('=' .repeat(60));

        // Simular OJs existentes no PJe
        const existingOJs = [
            {
                nome: 'Juizado Especial da Infância e Adolescência de Araçatuba',
                perfis: ['Assessor']
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Bauru',
                perfis: ['Assessor']
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Campinas',
                perfis: ['Assessor']
            }
        ];

        // OJs para processar
        const ojsToProcess = [
            {
                nome: 'Juizado Especial da Infância e da Adolescência da Circunscrição de Araçatuba',
                perfil: 'Assessor'
            },
            {
                nome: 'Juizado Especial da Infância e da Adolescência da Circunscrição de Bauru',
                perfil: 'Assessor'
            },
            {
                nome: 'Juizado Especial da Infância e da Adolescência de São José dos Campos',
                perfil: 'Assessor'
            }
        ];

        const result = await this.integration.filterOJsForProcessing(ojsToProcess, existingOJs);

        console.log('\n📊 RESULTADO DO FILTRO:');
        console.log(`🆕 Para criar: ${result.toCreate.length}`);
        result.toCreate.forEach(oj => {
            console.log(`   - ${oj.nome}`);
        });

        console.log(`➕ Para adicionar papel: ${result.toAddRole.length}`);
        result.toAddRole.forEach(oj => {
            console.log(`   - ${oj.nome}`);
        });

        console.log(`⏭️ Para pular: ${result.toSkip.length}`);
        result.toSkip.forEach(oj => {
            console.log(`   - ${oj.nome} (${oj.reason})`);
        });

        return result;
    }

    /**
     * 🚀 EXECUTA TODOS OS TESTES
     */
    async executarTestes() {
        console.log('🧪 INICIANDO TESTES DE NORMALIZAÇÃO DE OJs');
        console.log('=' .repeat(80));

        try {
            // Teste 1: Normalização específica
            const resultNormalizacao = this.testarNormalizacaoEspecifica();

            // Teste 2: Filtro completo
            const resultFiltro = await this.testarFiltroCompleto();

            // Relatório final
            console.log('\n🎯 RELATÓRIO FINAL');
            console.log('=' .repeat(60));
            console.log(`📊 Taxa de normalização: ${((resultNormalizacao.matches / resultNormalizacao.total) * 100).toFixed(1)}%`);
            console.log(`🔍 OJs que seriam pulados: ${resultFiltro.toSkip.length}`);
            console.log(`🆕 OJs que seriam criados: ${resultFiltro.toCreate.length}`);
            console.log(`➕ OJs que teriam papel adicionado: ${resultFiltro.toAddRole.length}`);

            if (resultNormalizacao.matches === resultNormalizacao.total) {
                console.log('\n✅ SUCESSO: Todos os OJs foram normalizados corretamente!');
            } else {
                console.log('\n⚠️ ATENÇÃO: Alguns OJs não foram reconhecidos como existentes.');
                console.log('   Isso pode causar tentativas de recadastro desnecessárias.');
            }

        } catch (error) {
            console.error(`❌ Erro durante os testes: ${error.message}`);
        }
    }
}

// Executar testes
if (require.main === module) {
    const teste = new TesteNormalizacaoOJ();
    teste.executarTestes();
}

module.exports = TesteNormalizacaoOJ;