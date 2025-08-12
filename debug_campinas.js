// Script para debugar o problema com a busca por Campinas

// Simular o carregamento dos dados como na aplicação
async function testCampinasSearch() {
    console.log('=== DEBUG BUSCA POR CAMPINAS ===\n');
    
    try {
        // Carregar dados do JSON
        const fs = require('fs');
        const path = require('path');
        
        const jsonPath = path.join(__dirname, 'orgaos_pje.json');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        console.log('1. Estrutura do JSON:');
        console.log('   Tipo:', typeof jsonData);
        console.log('   Total de cidades:', Object.keys(jsonData).length);
        console.log('   Primeiras 5 cidades:', Object.keys(jsonData).slice(0, 5));
        
        // Verificar se Campinas existe
        const campinasKey = Object.keys(jsonData).find(key => 
            key.toLowerCase().includes('campinas')
        );
        console.log('\n2. Chave de Campinas encontrada:', campinasKey);
        
        if (campinasKey) {
            console.log('   OJs de Campinas:', jsonData[campinasKey].length);
            console.log('   Primeiros 5 OJs:', jsonData[campinasKey].slice(0, 5));
        }
        
        // Extrair todos os OJs como na aplicação
        const allOJs = [];
        Object.keys(jsonData).forEach(cidade => {
            if (Array.isArray(jsonData[cidade])) {
                allOJs.push(...jsonData[cidade]);
            }
        });
        
        console.log('\n3. Extração de OJs:');
        console.log('   Total de OJs extraídos:', allOJs.length);
        
        // Ordenar alfabeticamente
        const sortedOJs = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        
        console.log('   Total após ordenação:', sortedOJs.length);
        
        // Buscar OJs que contenham "Campinas"
        const campinasOJs = sortedOJs.filter(oj => 
            oj.toLowerCase().includes('campinas')
        );
        
        console.log('\n4. OJs que contêm "Campinas":');
        console.log('   Total encontrado:', campinasOJs.length);
        campinasOJs.forEach((oj, index) => {
            console.log(`   ${index + 1}. ${oj}`);
        });
        
        // Testar a função de filtro da aplicação
        console.log('\n5. Teste da função filterOptions:');
        
        function filterOptions(ojList, searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            
            if (!term) {
                return ojList.slice();
            }
            
            // Normalize search term for better matching
            const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            return ojList.filter(oj => {
                const normalizedOJ = oj.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                
                // Check if any word in the OJ starts with the search term
                const words = normalizedOJ.split(/\s+/);
                const termWords = normalizedTerm.split(/\s+/);
                
                return termWords.every(termWord => 
                    words.some(word => word.startsWith(termWord)) || 
                    normalizedOJ.includes(termWord)
                );
            });
        }
        
        const searchResults = filterOptions(sortedOJs, 'Campinas');
        console.log('   Resultados da busca por "Campinas":', searchResults.length);
        
        if (searchResults.length > 0) {
            console.log('   Primeiros 10 resultados:');
            searchResults.slice(0, 10).forEach((oj, index) => {
                console.log(`     ${index + 1}. ${oj}`);
            });
        } else {
            console.log('   ❌ NENHUM RESULTADO ENCONTRADO!');
            
            // Debug adicional
            console.log('\n6. Debug adicional:');
            const testOJ = sortedOJs.find(oj => oj.includes('Campinas'));
            if (testOJ) {
                console.log('   OJ de teste:', testOJ);
                const normalizedOJ = testOJ.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const normalizedTerm = 'campinas'.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                
                console.log('   OJ normalizado:', normalizedOJ);
                console.log('   Termo normalizado:', normalizedTerm);
                
                const words = normalizedOJ.split(/\s+/);
                const termWords = normalizedTerm.split(/\s+/);
                
                console.log('   Palavras do OJ:', words);
                console.log('   Palavras do termo:', termWords);
                
                const matches = termWords.every(termWord => 
                    words.some(word => word.startsWith(termWord)) || 
                    normalizedOJ.includes(termWord)
                );
                
                console.log('   Deveria fazer match:', matches);
            }
        }
        
    } catch (error) {
        console.error('Erro:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar o teste
testCampinasSearch();