// Script para debugar o console do Electron
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createDebugWindow() {
    const debugWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // Carregar a aplicação principal
    debugWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));

    // Abrir DevTools automaticamente
    debugWindow.webContents.openDevTools();

    // Interceptar logs do console
    debugWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDERER ${level}] ${message}`);
        if (level === 3) { // Error level
            console.error(`[RENDERER ERROR] ${message} at ${sourceId}:${line}`);
        }
    });

    // Executar script de debug após carregamento
    debugWindow.webContents.once('did-finish-load', () => {
        console.log('Página carregada, executando debug...');
        
        // Aguardar um pouco e então executar debug
        setTimeout(() => {
            debugWindow.webContents.executeJavaScript(`
                console.log('=== DEBUG OJ SELECTOR ===');
                console.log('window.ojList existe:', typeof window.ojList !== 'undefined');
                console.log('window.ojList length:', window.ojList ? window.ojList.length : 'N/A');
                console.log('Element oj-selector-v2 existe:', !!document.getElementById('oj-selector-v2'));
                console.log('window.ojSelectors:', Object.keys(window.ojSelectors || {}));
                
                // Tentar abrir o modal do servidor V2
                const configBtn = document.getElementById('configServidorV2');
                if (configBtn) {
                    console.log('Botão configServidorV2 encontrado, clicando...');
                    configBtn.click();
                    
                    setTimeout(() => {
                        const modal = document.getElementById('servidorV2Modal');
                        const ojSelector = document.getElementById('oj-selector-v2');
                        console.log('Modal aberto:', !!modal && modal.style.display !== 'none');
                        console.log('OJ Selector visível:', !!ojSelector);
                        console.log('OJ Selector innerHTML:', ojSelector ? ojSelector.innerHTML : 'N/A');
                        
                        // Verificar se o seletor foi inicializado
                        if (window.ojSelectors && window.ojSelectors['oj-selector-v2']) {
                            const selector = window.ojSelectors['oj-selector-v2'];
                            console.log('OJ Selector inicializado:', !!selector);
                            console.log('OJ List no selector:', selector.ojList ? selector.ojList.length : 'N/A');
                        } else {
                            console.log('OJ Selector NÃO inicializado');
                        }
                    }, 1000);
                } else {
                    console.log('Botão configServidorV2 NÃO encontrado');
                }
            `).then(result => {
                console.log('Debug script executado');
            }).catch(error => {
                console.error('Erro ao executar debug script:', error);
            });
        }, 2000);
    });

    return debugWindow;
}

if (require.main === module) {
    app.whenReady().then(() => {
        createDebugWindow();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

module.exports = { createDebugWindow };