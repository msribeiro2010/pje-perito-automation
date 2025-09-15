/**
 * 🎯 EXEMPLO PRÁTICO DE USO DO SISTEMA INTELIGENTE DE VERIFICAÇÃO DE OJs
 * 
 * Este exemplo demonstra como o sistema verifica OJs existentes antes de criar novos,
 * especialmente quando um servidor já tem o perfil "Assessor" mas precisa do perfil "Diretor de Secretaria".
 */

const SmartOJIntegration = require('./src/utils/smart-oj-integration.js');

/**
 * 🧪 SIMULAÇÃO PRÁTICA DO SISTEMA
 */
class ExemploUsoSmartOJ {
    constructor() {
        this.smartOJ = new SmartOJIntegration();
    }

    /**
     * 📋 CENÁRIO 1: Servidor já tem perfil "Assessor" mas precisa de "Diretor de Secretaria"
     */
    async exemploServidorComPerfilExistente() {
        console.log('\n🎯 CENÁRIO 1: Servidor com perfil existente');
        console.log('=' .repeat(60));
        
        // Dados do servidor
        const servidor = {
            nome: 'João Silva',
            cpf: '123.456.789-00',
            ojsParaCadastrar: [
                { nome: 'Tribunal de Justiça do Estado de São Paulo', perfil: 'Diretor de Secretaria' },
                { nome: 'Tribunal Regional Federal da 3ª Região', perfil: 'Assessor' }
            ]
        };
        
        // OJs já existentes no sistema (simulação)
        const ojsExistentes = [
            {
                nome: 'Tribunal de Justiça do Estado de São Paulo',
                perfis: ['Assessor'] // Já tem Assessor, mas precisa de Diretor de Secretaria
            }
        ];
        
        console.log(`👤 Servidor: ${servidor.nome}`);
        console.log(`📋 OJs para cadastrar: ${servidor.ojsParaCadastrar.length}`);
        console.log(`🏛️ OJs existentes: ${ojsExistentes.length}`);
        
        // Analisar e filtrar OJs
        const resultadoFiltro = await this.smartOJ.filterOJsForProcessing(
            servidor.ojsParaCadastrar, 
            ojsExistentes
        );
        
        console.log('\n📊 RESULTADO DA ANÁLISE:');
        console.log(`✨ Criar novos: ${resultadoFiltro.toCreate.length}`);
        console.log(`➕ Adicionar perfil: ${resultadoFiltro.toAddRole.length}`);
        console.log(`⏭️ Pular (já existe): ${resultadoFiltro.toSkip.length}`);
        
        // Detalhar ações
        if (resultadoFiltro.toAddRole.length > 0) {
            console.log('\n🔄 AÇÕES DE ADIÇÃO DE PERFIL:');
            resultadoFiltro.toAddRole.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome}`);
                console.log(`      📝 Perfis existentes: ${oj.existingRoles.join(', ')}`);
                console.log(`      ➕ Novo perfil: ${oj.novoRole}`);
            });
        }
        
        if (resultadoFiltro.toCreate.length > 0) {
            console.log('\n🆕 AÇÕES DE CRIAÇÃO:');
            resultadoFiltro.toCreate.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome} - ${oj.perfil}`);
            });
        }
        
        return resultadoFiltro;
    }
    
    /**
     * 📋 CENÁRIO 2: Servidor sem OJs existentes
     */
    async exemploServidorSemOJsExistentes() {
        console.log('\n🎯 CENÁRIO 2: Servidor sem OJs existentes');
        console.log('=' .repeat(60));
        
        const servidor = {
            nome: 'Maria Santos',
            cpf: '987.654.321-00',
            ojsParaCadastrar: [
                { nome: 'Tribunal de Justiça do Estado do Rio de Janeiro', perfil: 'Assessor' },
                { nome: 'Superior Tribunal de Justiça', perfil: 'Diretor de Secretaria' }
            ]
        };
        
        const ojsExistentes = []; // Nenhum OJ existente
        
        console.log(`👤 Servidor: ${servidor.nome}`);
        console.log(`📋 OJs para cadastrar: ${servidor.ojsParaCadastrar.length}`);
        console.log(`🏛️ OJs existentes: ${ojsExistentes.length}`);
        
        const resultadoFiltro = await this.smartOJ.filterOJsForProcessing(
            servidor.ojsParaCadastrar, 
            ojsExistentes
        );
        
        console.log('\n📊 RESULTADO DA ANÁLISE:');
        console.log(`✨ Criar novos: ${resultadoFiltro.toCreate.length}`);
        console.log(`➕ Adicionar perfil: ${resultadoFiltro.toAddRole.length}`);
        console.log(`⏭️ Pular (já existe): ${resultadoFiltro.toSkip.length}`);
        
        return resultadoFiltro;
    }
    
    /**
     * 📋 CENÁRIO 3: Servidor com múltiplos perfis complexos
     */
    async exemploServidorComPerfilComplexo() {
        console.log('\n🎯 CENÁRIO 3: Servidor com perfis complexos');
        console.log('=' .repeat(60));
        
        const servidor = {
            nome: 'Carlos Oliveira',
            cpf: '456.789.123-00',
            ojsParaCadastrar: [
                { nome: 'Tribunal de Justiça do Estado de São Paulo', perfil: 'Diretor de Secretaria' },
                { nome: 'Tribunal Regional Federal da 3ª Região', perfil: 'Assessor' },
                { nome: 'Superior Tribunal de Justiça', perfil: 'Diretor de Secretaria' },
                { nome: 'Tribunal de Justiça do Estado do Rio de Janeiro', perfil: 'Assessor' }
            ]
        };
        
        const ojsExistentes = [
            {
                nome: 'Tribunal de Justiça do Estado de São Paulo',
                perfis: ['Assessor'] // Precisa adicionar Diretor de Secretaria
            },
            {
                nome: 'Tribunal Regional Federal da 3ª Região',
                perfis: ['Assessor'] // Já tem o perfil necessário
            },
            {
                nome: 'Superior Tribunal de Justiça',
                perfis: ['Assessor', 'Diretor de Secretaria'] // Já tem ambos os perfis
            }
        ];
        
        console.log(`👤 Servidor: ${servidor.nome}`);
        console.log(`📋 OJs para cadastrar: ${servidor.ojsParaCadastrar.length}`);
        console.log(`🏛️ OJs existentes: ${ojsExistentes.length}`);
        
        const resultadoFiltro = await this.smartOJ.filterOJsForProcessing(
            servidor.ojsParaCadastrar, 
            ojsExistentes
        );
        
        console.log('\n📊 RESULTADO DA ANÁLISE:');
        console.log(`✨ Criar novos: ${resultadoFiltro.toCreate.length}`);
        console.log(`➕ Adicionar perfil: ${resultadoFiltro.toAddRole.length}`);
        console.log(`⏭️ Pular (já existe): ${resultadoFiltro.toSkip.length}`);
        
        // Detalhar cada categoria
        if (resultadoFiltro.toCreate.length > 0) {
            console.log('\n🆕 CRIAR NOVOS OJs:');
            resultadoFiltro.toCreate.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome} - ${oj.perfil}`);
            });
        }
        
        if (resultadoFiltro.toAddRole.length > 0) {
            console.log('\n➕ ADICIONAR PERFIS:');
            resultadoFiltro.toAddRole.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome}`);
                console.log(`      📝 Tem: ${oj.existingRoles.join(', ')}`);
                console.log(`      ➕ Adicionar: ${oj.novoRole}`);
            });
        }
        
        if (resultadoFiltro.toSkip.length > 0) {
            console.log('\n⏭️ PULAR (JÁ POSSUI):');
            resultadoFiltro.toSkip.forEach((oj, index) => {
                console.log(`   ${index + 1}. ${oj.nome} - ${oj.reason}`);
                console.log(`      📝 Perfis: ${oj.existingRoles.join(', ')}`);
            });
        }
        
        return resultadoFiltro;
    }
    
    /**
     * 🚀 EXECUTA TODOS OS EXEMPLOS
     */
    async executarExemplos() {
        console.log('🎯 DEMONSTRAÇÃO DO SISTEMA INTELIGENTE DE VERIFICAÇÃO DE OJs');
        console.log('=' .repeat(80));
        console.log('\n💡 Este sistema resolve o problema de:');
        console.log('   • Evitar cadastros duplicados');
        console.log('   • Adicionar perfis quando necessário (ex: Assessor → Diretor de Secretaria)');
        console.log('   • Otimizar o processo de cadastramento');
        
        await this.exemploServidorComPerfilExistente();
        await this.exemploServidorSemOJsExistentes();
        await this.exemploServidorComPerfilComplexo();
        
        console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA!');
        console.log('\n💡 BENEFÍCIOS DO SISTEMA:');
        console.log('   ✅ Evita cadastros desnecessários');
        console.log('   ✅ Adiciona perfis automaticamente quando necessário');
        console.log('   ✅ Melhora a eficiência do processo');
        console.log('   ✅ Reduz erros manuais');
        console.log('   ✅ Fornece relatórios detalhados');
    }
}

// Executar exemplo se chamado diretamente
if (require.main === module) {
    const exemplo = new ExemploUsoSmartOJ();
    exemplo.executarExemplos()
        .then(() => {
            console.log('\n✨ Exemplo executado com sucesso!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro no exemplo:', error);
            process.exit(1);
        });
}

module.exports = ExemploUsoSmartOJ;