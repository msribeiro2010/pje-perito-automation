const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Função para testar o carregamento do JSON
function testOJLoading() {
    console.log('=== TESTE DE CARREGAMENTO DE OJs ===');
    
    const jsonPath = path.join(__dirname, 'orgaos_pje.json');
    console.log('Caminho do arquivo:', jsonPath);
    
    try {
        // Verificar se o arquivo existe
        if (!fs.existsSync(jsonPath)) {
            console.error('ERRO: Arquivo orgaos_pje.json não encontrado!');
            return;
        }
        
        // Ler o arquivo
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        console.log('Tamanho do arquivo:', jsonContent.length, 'caracteres');
        
        // Parse do JSON
        const ojData = JSON.parse(jsonContent);
        console.log('Tipo do objeto:', typeof ojData);
        console.log('Chaves do objeto:', Object.keys(ojData).slice(0, 10), '...');
        console.log('Total de cidades:', Object.keys(ojData).length);
        
        // Verificar Campinas especificamente
        if (ojData.Campinas) {
            console.log('✅ Campinas encontrado!');
            console.log('OJs de Campinas:', ojData.Campinas.length);
            console.log('Primeiros 3 OJs de Campinas:', ojData.Campinas.slice(0, 3));
        } else {
            console.log('❌ Campinas NÃO encontrado!');
            console.log('Cidades disponíveis que contêm "Campinas":', 
                Object.keys(ojData).filter(cidade => cidade.toLowerCase().includes('campinas')));
        }
        
        // Extrair todos os OJs
        const allOJs = [];
        Object.keys(ojData).forEach(cidade => {
            if (Array.isArray(ojData[cidade])) {
                allOJs.push(...ojData[cidade]);
            }
        });
        
        console.log('Total de OJs extraídos:', allOJs.length);
        
        // Testar função de normalização (igual à do script.js)
        function normalizeText(text) {
            return text.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s]/g, '')
                .trim();
        }
        
        // Testar busca por Campinas (simulando a função filterOptions)
        const searchTerm = 'campinas';
        const normalizedSearchTerm = normalizeText(searchTerm);
        const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
        
        console.log('\n=== TESTE DE BUSCA ===');
        console.log('Termo de busca:', searchTerm);
        console.log('Termo normalizado:', normalizedSearchTerm);
        console.log('Palavras da busca:', searchWords);
        
        const filteredOJs = allOJs.filter(oj => {
            const normalizedOJ = normalizeText(oj);
            const ojWords = normalizedOJ.split(/\s+/);
            
            return searchWords.some(searchWord => 
                ojWords.some(ojWord => ojWord.startsWith(searchWord)) ||
                normalizedOJ.includes(normalizedSearchTerm)
            );
        });
        
        console.log('OJs encontrados com "campinas":', filteredOJs.length);
        console.log('Primeiros 5 resultados:', filteredOJs.slice(0, 5));
        
        if (filteredOJs.length === 0) {
            console.log('\n❌ PROBLEMA: Nenhum OJ encontrado para "campinas"!');
            
            // Verificar se há OJs que contêm "campinas" de forma simples
            const simpleSearch = allOJs.filter(oj => 
                oj.toLowerCase().includes('campinas')
            );
            console.log('Busca simples (contains):', simpleSearch.length, 'resultados');
            if (simpleSearch.length > 0) {
                console.log('Exemplos:', simpleSearch.slice(0, 3));
            }
        } else {
            console.log('✅ Busca funcionando corretamente!');
        }
        
    } catch (error) {
        console.error('ERRO ao processar arquivo:', error.message);
    }
}

// Executar teste
testOJLoading();

// Criar janela do Electron para teste visual
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'preload.js')
        }
    });
    
    mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
    
    // Abrir DevTools automaticamente
    mainWindow.webContents.openDevTools();
    
    // Aguardar carregamento e executar teste no renderer
    mainWindow.webContents.once('did-finish-load', () => {
        console.log('\n=== EXECUTANDO TESTE NO RENDERER ===');
        
        mainWindow.webContents.executeJavaScript(`
            console.log('=== TESTE NO RENDERER ===');
            
            // Verificar se window.ojList existe
            console.log('window.ojList existe?', typeof window.ojList);
            console.log('window.ojList length:', window.ojList ? window.ojList.length : 'undefined');
            
            // Verificar se há OJs de Campinas
            if (window.ojList && window.ojList.length > 0) {
                const campanasOJs = window.ojList.filter(oj => 
                    oj.toLowerCase().includes('campinas')
                );
                console.log('OJs com Campinas no renderer:', campanasOJs.length);
                console.log('Exemplos:', campanasOJs.slice(0, 3));
            }
            
            // Verificar se o OJSelector existe
            console.log('window.ojSelectors:', typeof window.ojSelectors);
            
            // Retornar resultado
            {
                ojListExists: typeof window.ojList !== 'undefined',
                ojListLength: window.ojList ? window.ojList.length : 0,
                campanasCount: window.ojList ? window.ojList.filter(oj => oj.toLowerCase().includes('campinas')).length : 0
            }
        `).then(result => {
            console.log('Resultado do teste no renderer:', result);
        }).catch(error => {
            console.error('Erro no teste do renderer:', error);
        });
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});