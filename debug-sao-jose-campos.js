/**
 * 🐛 DEBUG ESPECÍFICO PARA SÃO JOSÉ DOS CAMPOS
 * Investigar por que este OJ não está sendo detectado
 */

const SmartOJIntegration = require('./src/utils/smart-oj-integration');

class DebugSaoJoseCampos {
    constructor() {
        this.integration = new SmartOJIntegration();
    }

    /**
     * 🔍 INVESTIGA O PROBLEMA ESPECÍFICO
     */
    investigarProblema() {
        console.log('🐛 DEBUG: SÃO JOSÉ DOS CAMPOS');
        console.log('=' .repeat(60));

        // OJ configurado
        const ojConfigurado = 'Juizado Especial da Infância e da Adolescência de São José dos Campos';
        
        // OJs existentes no PJe (dados do usuário)
        const ojsExistentesNoPJe = [
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

        console.log('🎯 OJ PROCURADO:');
        console.log(`   Original: "${ojConfigurado}"`);
        const normalConfigurado = this.integration.normalizeOJName(ojConfigurado);
        console.log(`   Normalizado: "${normalConfigurado}"`);

        console.log('\n📋 OJs EXISTENTES NO PJE:');
        ojsExistentesNoPJe.forEach((oj, index) => {
            const normalizado = this.integration.normalizeOJName(oj);
            const match = normalizado === normalConfigurado;
            console.log(`   ${index + 1}. "${oj}"`);
            console.log(`      Normalizado: "${normalizado}"`);
            console.log(`      Match: ${match ? '✅ SIM' : '❌ NÃO'}`);
            
            if (!match) {
                const similarity = this.calculateSimilarity(normalConfigurado, normalizado);
                console.log(`      Similaridade: ${(similarity * 100).toFixed(1)}%`);
            }
            console.log('');
        });

        // Verificar se existe algum OJ similar
        console.log('🔍 ANÁLISE DE SIMILARIDADE:');
        const candidatos = ojsExistentesNoPJe
            .map(oj => ({
                original: oj,
                normalizado: this.integration.normalizeOJName(oj),
                similaridade: this.calculateSimilarity(normalConfigurado, this.integration.normalizeOJName(oj))
            }))
            .filter(c => c.similaridade > 0.7)
            .sort((a, b) => b.similaridade - a.similaridade);

        if (candidatos.length > 0) {
            console.log('\n🎯 CANDIDATOS MAIS SIMILARES:');
            candidatos.forEach((candidato, index) => {
                console.log(`   ${index + 1}. "${candidato.original}" (${(candidato.similaridade * 100).toFixed(1)}%)`);
                console.log(`      Normalizado: "${candidato.normalizado}"`);
            });
        } else {
            console.log('\n❌ NENHUM CANDIDATO SIMILAR ENCONTRADO');
        }

        // Verificar se o problema é que o OJ não existe mesmo
        const existeSaoJoseCampos = ojsExistentesNoPJe.some(oj => 
            oj.toLowerCase().includes('são josé dos campos') || 
            oj.toLowerCase().includes('sao jose dos campos')
        );

        console.log('\n🔍 VERIFICAÇÃO FINAL:');
        if (!existeSaoJoseCampos) {
            console.log('✅ DIAGNÓSTICO: O OJ "São José dos Campos" realmente NÃO EXISTE no PJe!');
            console.log('   📝 Isso significa que o sistema está funcionando CORRETAMENTE.');
            console.log('   🎯 O OJ precisa ser criado mesmo, não é um erro de detecção.');
        } else {
            console.log('❌ DIAGNÓSTICO: O OJ existe mas não está sendo detectado.');
            console.log('   🔧 Problema na normalização que precisa ser corrigido.');
        }

        return {
            ojConfigurado,
            normalConfigurado,
            existeNoPJe: existeSaoJoseCampos,
            candidatos
        };
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
     * 🚀 EXECUTA DEBUG
     */
    executarDebug() {
        console.log('🐛 INICIANDO DEBUG - SÃO JOSÉ DOS CAMPOS');
        console.log('=' .repeat(80));

        try {
            const resultado = this.investigarProblema();
            
            console.log('\n🎯 CONCLUSÃO DO DEBUG:');
            console.log('=' .repeat(50));
            
            if (!resultado.existeNoPJe) {
                console.log('✅ SISTEMA FUNCIONANDO CORRETAMENTE!');
                console.log('   📝 O OJ "São José dos Campos" não existe no PJe.');
                console.log('   🎯 É correto que o sistema queira criá-lo.');
                console.log('   ✅ Não há erro de detecção.');
            } else {
                console.log('❌ PROBLEMA IDENTIFICADO!');
                console.log('   🔧 O OJ existe mas não está sendo detectado.');
                console.log('   📝 Normalização precisa ser ajustada.');
            }

            return resultado;

        } catch (error) {
            console.error(`❌ Erro durante o debug: ${error.message}`);
            throw error;
        }
    }
}

// Executar debug
if (require.main === module) {
    const debug = new DebugSaoJoseCampos();
    debug.executarDebug();
}

module.exports = DebugSaoJoseCampos;