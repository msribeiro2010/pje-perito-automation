// Script para debug do seletor de OJs no Electron
// Execute este script no console do DevTools do Electron

console.log('=== INICIANDO DEBUG DO SELETOR DE OJS ===');

// 1. Verificar se os elementos existem
function checkElements() {
    console.log('\n1. VERIFICANDO ELEMENTOS:');
    
    const configBtn = document.getElementById('configServidorV2');
    console.log('Botão configServidorV2:', !!configBtn);
    
    const modal = document.getElementById('servidor-v2-modal');
    console.log('Modal servidor-v2-modal:', !!modal);
    
    const container = document.getElementById('oj-selector-v2');
    console.log('Container oj-selector-v2:', !!container);
    
    if (container) {
        console.log('Container innerHTML:', container.innerHTML);
        console.log('Container style.display:', container.style.display);
        console.log('Container offsetWidth:', container.offsetWidth);
        console.log('Container offsetHeight:', container.offsetHeight);
    }
    
    return { configBtn, modal, container };
}

// 2. Verificar variáveis globais
function checkGlobals() {
    console.log('\n2. VERIFICANDO VARIÁVEIS GLOBAIS:');
    
    console.log('window.app:', !!window.app);
    console.log('window.ojList:', window.ojList ? window.ojList.length : 'undefined');
    console.log('window.ojSelectors:', Object.keys(window.ojSelectors || {}));
    
    if (window.ojList && window.ojList.length > 0) {
        console.log('Primeiros 5 OJs:', window.ojList.slice(0, 5));
    }
}

// 3. Simular clique no botão
function simulateClick() {
    console.log('\n3. SIMULANDO CLIQUE NO BOTÃO:');
    
    const configBtn = document.getElementById('configServidorV2');
    if (configBtn) {
        console.log('Clicando no botão configServidorV2...');
        configBtn.click();
        
        // Aguardar um pouco e verificar o modal
        setTimeout(() => {
            const modal = document.getElementById('servidor-v2-modal');
            console.log('Modal após clique - display:', modal ? modal.style.display : 'modal não encontrado');
            
            const container = document.getElementById('oj-selector-v2');
            if (container) {
                console.log('Container após clique - innerHTML:', container.innerHTML);
            }
        }, 1000);
    } else {
        console.log('ERRO: Botão configServidorV2 não encontrado!');
    }
}

// 4. Verificar se a função openServidorV2Modal existe
function checkFunctions() {
    console.log('\n4. VERIFICANDO FUNÇÕES:');
    
    if (window.app) {
        console.log('app.openServidorV2Modal:', typeof window.app.openServidorV2Modal);
        console.log('app.initializeOJSelectorV2:', typeof window.app.initializeOJSelectorV2);
    }
    
    console.log('OJSelector class:', typeof window.OJSelector || typeof OJSelector);
}

// 5. Tentar inicializar manualmente
function manualInit() {
    console.log('\n5. TENTANDO INICIALIZAÇÃO MANUAL:');
    
    if (window.app && typeof window.app.initializeOJSelectorV2 === 'function') {
        console.log('Chamando initializeOJSelectorV2 manualmente...');
        window.app.initializeOJSelectorV2().then(() => {
            console.log('initializeOJSelectorV2 concluído');
            
            const container = document.getElementById('oj-selector-v2');
            if (container) {
                console.log('Container após init manual:', container.innerHTML);
            }
        }).catch(error => {
            console.error('Erro na inicialização manual:', error);
        });
    } else {
        console.log('ERRO: Função initializeOJSelectorV2 não disponível');
    }
}

// 6. Verificar erros no console
function checkConsoleErrors() {
    console.log('\n6. VERIFICANDO ERROS:');
    console.log('Verifique se há erros vermelhos no console acima desta mensagem.');
}

// Executar todos os testes
function runAllTests() {
    console.log('=== EXECUTANDO TODOS OS TESTES ===');
    
    checkElements();
    checkGlobals();
    checkFunctions();
    checkConsoleErrors();
    
    console.log('\n=== TESTES CONCLUÍDOS ===');
    console.log('Agora execute: simulateClick() para testar o clique');
    console.log('Ou execute: manualInit() para tentar inicialização manual');
}

// Exportar funções para uso no console
window.debugOJ = {
    checkElements,
    checkGlobals,
    checkFunctions,
    simulateClick,
    manualInit,
    runAllTests
};

// Executar automaticamente
runAllTests();

console.log('\n=== FUNÇÕES DISPONÍVEIS ===');
console.log('debugOJ.checkElements() - Verificar elementos DOM');
console.log('debugOJ.checkGlobals() - Verificar variáveis globais');
console.log('debugOJ.checkFunctions() - Verificar funções disponíveis');
console.log('debugOJ.simulateClick() - Simular clique no botão');
console.log('debugOJ.manualInit() - Tentar inicialização manual');
console.log('debugOJ.runAllTests() - Executar todos os testes');