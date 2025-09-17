const fs = require('fs');
const path = require('path');

console.log('=== TESTE DE CARREGAMENTO DE PERITOS ===\n');

// Teste 1: Verificar se o arquivo perito.json existe
const peritoPath = path.join(__dirname, 'data', 'perito.json');
console.log('1. Verificando existência do arquivo perito.json...');
console.log(`   Caminho: ${peritoPath}`);

if (fs.existsSync(peritoPath)) {
    console.log('   ✅ Arquivo existe');
    
    // Teste 2: Verificar se o arquivo pode ser lido
    try {
        const data = fs.readFileSync(peritoPath, 'utf8');
        console.log('   ✅ Arquivo pode ser lido');
        
        // Teste 3: Verificar se o JSON é válido
        try {
            const peritos = JSON.parse(data);
            console.log('   ✅ JSON é válido');
            
            // Teste 4: Verificar estrutura dos dados
            console.log(`\n2. Analisando estrutura dos dados...`);
            console.log(`   Total de peritos: ${peritos.length}`);
            
            peritos.forEach((perito, index) => {
                console.log(`\n   Perito ${index + 1}:`);
                console.log(`     Nome: ${perito.nome}`);
                console.log(`     CPF: ${perito.cpf}`);
                console.log(`     OJs: ${perito.ojs ? perito.ojs.length : 0} órgãos`);
                
                if (perito.ojs && Array.isArray(perito.ojs)) {
                    perito.ojs.forEach((oj, ojIndex) => {
                        console.log(`       ${ojIndex + 1}. ${oj}`);
                    });
                } else {
                    console.log('     ❌ OJs não é um array válido');
                }
            });
            
            // Teste 5: Calcular total de OJs
            const totalOJs = peritos.reduce((total, perito) => {
                return total + (perito.ojs ? perito.ojs.length : 0);
            }, 0);
            
            console.log(`\n3. Estatísticas:`);
            console.log(`   Total de OJs para processar: ${totalOJs}`);
            console.log(`   Média de OJs por perito: ${(totalOJs / peritos.length).toFixed(1)}`);
            
            if (totalOJs > 0) {
                console.log('\n✅ TESTE PASSOU: Sistema deve encontrar OJs para cadastrar');
            } else {
                console.log('\n❌ TESTE FALHOU: Nenhum OJ encontrado para cadastrar');
            }
            
        } catch (parseError) {
            console.log('   ❌ Erro ao fazer parse do JSON:', parseError.message);
        }
        
    } catch (readError) {
        console.log('   ❌ Erro ao ler arquivo:', readError.message);
    }
    
} else {
    console.log('   ❌ Arquivo não existe');
    console.log('\n❌ TESTE FALHOU: Arquivo perito.json não encontrado');
}

console.log('\n=== FIM DO TESTE ===');