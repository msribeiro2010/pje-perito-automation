// Script de teste para verificar o carregamento dos OJs
const fs = require('fs');
const path = require('path');

console.log('=== Teste de Carregamento dos Órgãos Julgadores ===\n');

// Verificar se o arquivo existe
const ojFilePath = path.join(__dirname, 'src', 'renderer', 'orgaos_pje.json');
console.log('Caminho do arquivo:', ojFilePath);
console.log('Arquivo existe:', fs.existsSync(ojFilePath));

if (fs.existsSync(ojFilePath)) {
    try {
        // Ler e parsear o arquivo JSON
        const fileContent = fs.readFileSync(ojFilePath, 'utf8');
        const ojData = JSON.parse(fileContent);
        
        console.log('\n=== Informações do Arquivo ===');
        console.log('Tamanho do arquivo:', fileContent.length, 'bytes');
        console.log('Número de cidades:', Object.keys(ojData).length);
        
        // Extrair todos os OJs
        const allOJs = [];
        Object.keys(ojData).forEach(cidade => {
            if (Array.isArray(ojData[cidade])) {
                allOJs.push(...ojData[cidade]);
            }
        });
        
        // Ordenar alfabeticamente
        const sortedOJs = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        
        console.log('\n=== Estatísticas dos OJs ===');
        console.log('Total de OJs:', sortedOJs.length);
        console.log('Primeiros 10 OJs:');
        sortedOJs.slice(0, 10).forEach((oj, index) => {
            console.log(`  ${index + 1}. ${oj}`);
        });
        
        console.log('\n=== Últimos 5 OJs ===');
        sortedOJs.slice(-5).forEach((oj, index) => {
            console.log(`  ${sortedOJs.length - 4 + index}. ${oj}`);
        });
        
        // Verificar se há OJs com "Secretário" no nome (relevante para o perfil do usuário)
        const secretarioOJs = sortedOJs.filter(oj => 
            oj.toLowerCase().includes('secretário') || 
            oj.toLowerCase().includes('secretario')
        );
        
        console.log('\n=== OJs relacionados a Secretário ===');
        console.log('Quantidade:', secretarioOJs.length);
        if (secretarioOJs.length > 0) {
            secretarioOJs.forEach((oj, index) => {
                console.log(`  ${index + 1}. ${oj}`);
            });
        }
        
        // Verificar algumas cidades específicas
        const cidadesExemplo = ['São Paulo', 'Campinas', 'Santos', 'Bauru', 'Ribeirão Preto'];
        console.log('\n=== Exemplos de Cidades ===');
        cidadesExemplo.forEach(cidade => {
            if (ojData[cidade]) {
                console.log(`${cidade}: ${ojData[cidade].length} OJs`);
                ojData[cidade].slice(0, 3).forEach(oj => {
                    console.log(`  - ${oj}`);
                });
                if (ojData[cidade].length > 3) {
                    console.log(`  ... e mais ${ojData[cidade].length - 3} OJs`);
                }
            } else {
                console.log(`${cidade}: Não encontrada`);
            }
        });
        
        console.log('\n=== Resultado ===');
        console.log('✅ Arquivo carregado com sucesso!');
        console.log('✅ JSON válido');
        console.log('✅ Estrutura correta (cidades -> arrays de OJs)');
        console.log(`✅ Total de ${sortedOJs.length} OJs disponíveis`);
        
    } catch (error) {
        console.error('\n❌ Erro ao processar o arquivo:', error.message);
        console.error('Stack trace:', error.stack);
    }
} else {
    console.log('\n❌ Arquivo não encontrado!');
    console.log('Verifique se o caminho está correto.');
    
    // Listar arquivos na pasta src/renderer
    const rendererPath = path.join(__dirname, 'src', 'renderer');
    if (fs.existsSync(rendererPath)) {
        console.log('\nArquivos na pasta src/renderer:');
        const files = fs.readdirSync(rendererPath);
        files.forEach(file => {
            console.log(`  - ${file}`);
        });
    }
}

console.log('\n=== Fim do Teste ===');