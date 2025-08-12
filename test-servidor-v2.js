#!/usr/bin/env node

/**
 * Script de teste para a nova automação de servidor (v2)
 * Baseado nas melhorias descritas no automacao.md
 */

const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');
const fs = require('fs');
const path = require('path');

async function testAutomation() {
    console.log('🚀 Iniciando teste da automação de servidor v2...');
    
    try {
        // Carregar configuração
        const configPath = path.join(__dirname, 'config-servidor-v2.json');
        
        if (!fs.existsSync(configPath)) {
            throw new Error(`Arquivo de configuração não encontrado: ${configPath}`);
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('📋 Configuração carregada:');
        console.log(`   CPF: ${config.cpf}`);
        console.log(`   Perfil: ${config.perfil}`);
        console.log(`   Total de OJs: ${config.orgaos.length}`);
        console.log(`   Modo produção: ${config.configuracoes?.modoProducao || false}`);
        
        // Criar instância da automação
        const automation = new ServidorAutomationV2();
        
        // Configurar handler para progresso (opcional)
        automation.sendStatus = (type, message, progress, subtitle, orgao) => {
            const timestamp = new Date().toLocaleTimeString();
            const progressStr = progress ? `[${Math.round(progress)}%]` : '';
            const orgaoStr = orgao ? `(${orgao})` : '';
            const subtitleStr = subtitle ? ` - ${subtitle}` : '';
            
            console.log(`${timestamp} ${progressStr} [${type.toUpperCase()}] ${message}${subtitleStr} ${orgaoStr}`);
        };
        
        // Executar automação
        console.log('\n🔄 Iniciando automação...');
        await automation.startAutomation(config);
        
        // Obter relatório final
        const relatorio = automation.getRelatorio();
        
        console.log('\n📊 Resumo da execução:');
        console.log(`   Total processado: ${relatorio.length}`);
        console.log(`   Sucessos: ${relatorio.filter(r => r.status === 'Sucesso').length}`);
        console.log(`   Erros: ${relatorio.filter(r => r.status === 'Erro').length}`);
        console.log(`   Já incluídos: ${relatorio.filter(r => r.status === 'Já Incluído').length}`);
        
        // Mostrar erros se houver
        const erros = relatorio.filter(r => r.status === 'Erro');
        if (erros.length > 0) {
            console.log('\n❌ OJs com erro:');
            erros.forEach(erro => {
                console.log(`   - ${erro.orgao}: ${erro.erro}`);
            });
        }
        
        console.log('\n✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Função para validar configuração
function validateConfig(config) {
    const requiredFields = ['cpf', 'perfil', 'orgaos'];
    
    for (const field of requiredFields) {
        if (!config[field]) {
            throw new Error(`Campo obrigatório ausente na configuração: ${field}`);
        }
    }
    
    if (!Array.isArray(config.orgaos) || config.orgaos.length === 0) {
        throw new Error('Lista de órgãos julgadores deve ser um array não vazio');
    }
    
    // Validar CPF (formato básico)
    const cpfLimpo = config.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
    }
    
    console.log('✅ Configuração validada com sucesso');
}

// Função para criar configuração de exemplo
function createExampleConfig() {
    const exampleConfig = {
        cpf: "12345678901",
        perfil: "Diretor de Secretaria",
        url: "https://pje.trt15.jus.br/pje/",
        orgaos: [
            "11ª Vara do Trabalho de Campinas"
        ],
        configuracoes: {
            timeoutPadrao: 15000,
            timeoutNavegacao: 30000,
            delayEntreTentativas: 2000,
            maxTentativasLogin: 3,
            modoProducao: false,
            gerarRelatorioDetalhado: true,
            usarCache: true
        }
    };
    
    const configPath = path.join(__dirname, 'config-servidor-v2-example.json');
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
    
    console.log(`📝 Configuração de exemplo criada em: ${configPath}`);
    console.log('   Edite este arquivo com seus dados reais antes de executar o teste.');
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso: node test-servidor-v2.js [opções]

Opções:
  --create-example    Criar arquivo de configuração de exemplo
  --validate-only     Apenas validar a configuração sem executar
  --help, -h          Mostrar esta ajuda

Exemplos:
  node test-servidor-v2.js --create-example
  node test-servidor-v2.js --validate-only
  node test-servidor-v2.js
`);
    process.exit(0);
}

if (args.includes('--create-example')) {
    createExampleConfig();
    process.exit(0);
}

if (args.includes('--validate-only')) {
    try {
        const configPath = path.join(__dirname, 'config-servidor-v2.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        validateConfig(config);
        console.log('✅ Configuração válida!');
    } catch (error) {
        console.error('❌ Erro na validação:', error.message);
        process.exit(1);
    }
    process.exit(0);
}

// Executar teste
if (require.main === module) {
    testAutomation().catch(error => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { testAutomation, validateConfig, createExampleConfig };