// Script de teste para verificar se o modal está funcionando
console.log('=== TESTE DO MODAL DE SERVIDORES PROCESSADOS ===');

// Verificar se os elementos existem
const modal = document.getElementById('processed-servers-modal');
console.log('Modal encontrado:', modal ? 'SIM' : 'NÃO');

if (modal) {
    // Verificar elementos internos
    const elements = {
        'total-processing-count': document.getElementById('total-processing-count'),
        'current-processing-time': document.getElementById('current-processing-time'),
        'processing-progress': document.getElementById('processing-progress'),
        'total-processed-count': document.getElementById('total-processed-count'),
        'total-ojs-processed': document.getElementById('total-ojs-processed'),
        'processing-time': document.getElementById('processing-time')
    };
    
    console.log('Elementos encontrados:');
    Object.keys(elements).forEach(key => {
        console.log(`  ${key}:`, elements[key] ? 'SIM' : 'NÃO');
    });
    
    // Testar a função showProcessedServersModal
    try {
        console.log('Testando showProcessedServersModal...');
        showProcessedServersModal();
        console.log('Modal aberto com sucesso!');
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
    }
} else {
    console.error('Modal não encontrado!');
}

console.log('=== FIM DO TESTE ===');