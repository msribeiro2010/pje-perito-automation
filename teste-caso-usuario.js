/**
 * 🧪 TESTE ESPECÍFICO PARA O CASO DO USUÁRIO
 * Dirlei Zanini Pereira - CPF: 09750350880
 */

const SmartOJIntegration = require('./src/utils/smart-oj-integration');
const OJProfileValidator = require('./src/utils/oj-profile-validator');

class TesteCasoUsuario {
    constructor() {
        this.integration = new SmartOJIntegration();
        this.validator = new OJProfileValidator();
    }

    /**
     * 🔍 SIMULA O CASO EXATO DO USUÁRIO
     */
    async simularCasoUsuario() {
        console.log('\n🧪 SIMULAÇÃO DO CASO DO USUÁRIO');
        console.log('=' .repeat(70));
        console.log('👤 Servidor: Dirlei Zanini Pereira');
        console.log('📄 CPF: 09750350880');
        console.log('🎭 Perfil: Assessor');
        console.log('');

        // Dados do servidor (configuração)
        const servidor = {
            nome: 'Dirlei Zanini Pereira',
            cpf: '09750350880',
            perfil: 'Assessor'
        };

        // OJs da configuração do servidor
        const ojsConfigurados = [
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

        // OJs existentes no PJe (simulando dados reais)
        const ojsExistentesNoPJe = [
            {
                nome: 'Juizado Especial da Infância e Adolescência de Araçatuba',
                perfis: ['Assessor'],
                dataVinculo: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Bauru',
                perfis: ['Assessor'],
                dataVinculo: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Campinas',
                perfis: ['Assessor'],
                dataVinculo: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Fernandópolis',
                perfis: ['Assessor'],
                dataVinculo: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Franca',
                perfis: ['Assessor'],
                dataVinculo: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Presidente Prudente',
                perfis: ['Assessor'],
                dataVinculo: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Ribeirão Preto',
                perfis: ['Assessor'],
                dataVinculo: '12/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de Sorocaba',
                perfis: ['Assessor'],
                dataVinculo: '13/09/2025'
            },
            {
                nome: 'Juizado Especial da Infância e Adolescência de São José do Rio Preto',
                perfis: ['Assessor'],
                dataVinculo: '13/09/2025'
            }
        ];

        console.log('📋 ANÁLISE DE CORRESPONDÊNCIA:');
        console.log('-'.repeat(70));

        // Converter OJs configurados para formato de processamento
        const ojsParaProcessar = ojsConfigurados.map(nome => ({
            nome: nome,
            perfil: 'Assessor'
        }));

        // Executar filtro
        const resultado = await this.integration.filterOJsForProcessing(ojsParaProcessar, ojsExistentesNoPJe);

        // Exibir resultados detalhados
        console.log('\n📊 RESULTADO DA ANÁLISE:');
        console.log('=' .repeat(50));

        console.log(`\n✅ OJs que serão PULADOS (já existem): ${resultado.toSkip.length}`);
        resultado.toSkip.forEach((oj, index) => {
            const existente = ojsExistentesNoPJe.find(e => 
                this.integration.normalizeOJName(e.nome) === this.integration.normalizeOJName(oj.nome)
            );
            console.log(`   ${index + 1}. ${oj.nome}`);
            console.log(`      ↳ Existe como: "${existente?.nome}"`);
            console.log(`      ↳ Data vínculo: ${existente?.dataVinculo}`);
        });

        console.log(`\n🆕 OJs que serão CRIADOS (não existem): ${resultado.toCreate.length}`);
        resultado.toCreate.forEach((oj, index) => {
            console.log(`   ${index + 1}. ${oj.nome}`);
        });

        console.log(`\n➕ OJs que terão PAPEL ADICIONADO: ${resultado.toAddRole.length}`);
        resultado.toAddRole.forEach((oj, index) => {
            console.log(`   ${index + 1}. ${oj.nome}`);
        });

        // Calcular estatísticas
        const total = ojsConfigurados.length;
        const jaExistem = resultado.toSkip.length;
        const precisamCriar = resultado.toCreate.length;
        const precisamPapel = resultado.toAddRole.length;

        console.log('\n📈 ESTATÍSTICAS:');
        console.log('=' .repeat(40));
        console.log(`📊 Total de OJs configurados: ${total}`);
        console.log(`✅ Já existem no PJe: ${jaExistem} (${((jaExistem/total)*100).toFixed(1)}%)`);
        console.log(`🆕 Precisam ser criados: ${precisamCriar} (${((precisamCriar/total)*100).toFixed(1)}%)`);
        console.log(`➕ Precisam de papel: ${precisamPapel} (${((precisamPapel/total)*100).toFixed(1)}%)`);

        // Verificar se o problema foi resolvido
        if (precisamCriar === 0 && precisamPapel === 0) {
            console.log('\n🎉 PROBLEMA RESOLVIDO!');
            console.log('   ✅ Todos os OJs já existem no PJe');
            console.log('   ✅ Sistema não tentará recadastrar');
            console.log('   ✅ Evitará duplicações desnecessárias');
        } else if (precisamCriar <= 1) {
            console.log('\n✅ PROBLEMA QUASE RESOLVIDO!');
            console.log(`   ✅ ${jaExistem} de ${total} OJs detectados corretamente`);
            console.log(`   ⚠️ Apenas ${precisamCriar} OJ(s) ainda não detectado(s)`);
        } else {
            console.log('\n⚠️ PROBLEMA PARCIALMENTE RESOLVIDO');
            console.log(`   ✅ ${jaExistem} OJs detectados corretamente`);
            console.log(`   ❌ ${precisamCriar} OJs ainda não detectados`);
        }

        return {
            total,
            jaExistem,
            precisamCriar,
            precisamPapel,
            taxaSucesso: (jaExistem / total) * 100
        };
    }

    /**
     * 🔧 TESTA NORMALIZAÇÃO ESPECÍFICA PARA OJs PROBLEMÁTICOS
     */
    testarNormalizacaoProblematica() {
        console.log('\n🔧 ANÁLISE DE OJs PROBLEMÁTICOS');
        console.log('=' .repeat(50));

        const casosProblematicos = [
            {
                configurado: 'Juizado Especial da Infância e da Adolescência de São José dos Campos',
                pje: 'Juizado Especial da Infância e Adolescência de São José dos Campos'
            }
        ];

        casosProblematicos.forEach((caso, index) => {
            const normalConfigurado = this.integration.normalizeOJName(caso.configurado);
            const normalPJe = this.integration.normalizeOJName(caso.pje);
            const match = normalConfigurado === normalPJe;

            console.log(`\n${index + 1}. CASO PROBLEMÁTICO:`);
            console.log(`   Configurado: "${caso.configurado}"`);
            console.log(`   PJe:         "${caso.pje}"`);
            console.log(`   Normal Conf: "${normalConfigurado}"`);
            console.log(`   Normal PJe:  "${normalPJe}"`);
            console.log(`   Match: ${match ? '✅ SIM' : '❌ NÃO'}`);

            if (!match) {
                console.log('   🔍 Diferenças encontradas:');
                const diff = this.encontrarDiferencas(normalConfigurado, normalPJe);
                diff.forEach(d => console.log(`      - ${d}`));
            }
        });
    }

    /**
     * 🔍 ENCONTRA DIFERENÇAS ENTRE STRINGS NORMALIZADAS
     */
    encontrarDiferencas(str1, str2) {
        const palavras1 = str1.split(' ');
        const palavras2 = str2.split(' ');
        const diferencas = [];

        if (palavras1.length !== palavras2.length) {
            diferencas.push(`Número de palavras diferente: ${palavras1.length} vs ${palavras2.length}`);
        }

        const maxLength = Math.max(palavras1.length, palavras2.length);
        for (let i = 0; i < maxLength; i++) {
            const p1 = palavras1[i] || '[AUSENTE]';
            const p2 = palavras2[i] || '[AUSENTE]';
            if (p1 !== p2) {
                diferencas.push(`Posição ${i}: "${p1}" vs "${p2}"`);
            }
        }

        return diferencas;
    }

    /**
     * 🚀 EXECUTA TESTE COMPLETO
     */
    async executarTeste() {
        console.log('🧪 TESTE ESPECÍFICO - CASO DO USUÁRIO');
        console.log('=' .repeat(80));

        try {
            // Simular caso do usuário
            const resultado = await this.simularCasoUsuario();

            // Testar casos problemáticos
            this.testarNormalizacaoProblematica();

            // Relatório final
            console.log('\n🎯 RELATÓRIO FINAL DO TESTE');
            console.log('=' .repeat(50));
            console.log(`📊 Taxa de detecção: ${resultado.taxaSucesso.toFixed(1)}%`);
            console.log(`✅ OJs detectados: ${resultado.jaExistem}/${resultado.total}`);
            console.log(`🆕 OJs para criar: ${resultado.precisamCriar}`);
            console.log(`➕ OJs para adicionar papel: ${resultado.precisamPapel}`);

            if (resultado.taxaSucesso >= 90) {
                console.log('\n🎉 EXCELENTE! Sistema funcionando corretamente.');
            } else if (resultado.taxaSucesso >= 70) {
                console.log('\n✅ BOM! Maioria dos casos detectados corretamente.');
            } else {
                console.log('\n⚠️ ATENÇÃO! Sistema precisa de ajustes.');
            }

            return resultado;

        } catch (error) {
            console.error(`❌ Erro durante o teste: ${error.message}`);
            throw error;
        }
    }
}

// Executar teste
if (require.main === module) {
    const teste = new TesteCasoUsuario();
    teste.executarTeste();
}

module.exports = TesteCasoUsuario;