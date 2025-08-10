const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { login } = require('./login.js');
const { navegarParaCadastro } = require('./navigate.js');
const { vincularOJ } = require('./vincularOJ.js');
const { verificarOJJaVinculado, listarOJsVinculados } = require('./verificarOJVinculado.js');
const { loadConfig } = require('./util.js');

// __dirname is already available in CommonJS

let mainWindow;
let activeBrowser = null;
function sendStatus(type, message, progress = null, subtitle = null) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const data = { type, message };
      if (progress !== null) data.progress = progress;
      if (subtitle) data.subtitle = subtitle;
      mainWindow.webContents.send('automation-status', data);
    }
  } catch (e) {
    console.error('Falha ao enviar status para renderer:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
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

// IPC Handlers
ipcMain.handle('load-peritos', async () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../data/perito.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('save-peritos', async (event, peritos) => {
  try {
    fs.writeFileSync(path.join(__dirname, '../data/perito.json'), JSON.stringify(peritos, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-config', async () => {
  try {
    return loadConfig();
  } catch (error) {
    return {};
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-automation', async (event, selectedPeritos) => {
  let browser;
  let currentStep = 0;
  
  // Calcular total de passos
  const totalSteps = selectedPeritos.reduce((total, perito) => {
    return total + 3 + perito.ojs.length; // login + navegação + busca perito + OJs
  }, 0);
  
  try {
    sendStatus('info', 'Iniciando navegador...', currentStep++, 'Configurando ambiente de automação');
    
    // Configurações do browser com timeouts otimizados
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 20,
      timeout: 15000
    });
    activeBrowser = browser;
    const page = await browser.newPage();
    
    // Configurar timeout padrão da página
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(12000);
    
    // Capturar logs do console para debug
    page.on('console', msg => {
      const logMessage = msg.text();
      console.log('Browser console:', logMessage);
      
      // Enviar logs importantes para a interface
      if (logMessage.includes('DEBUG') || logMessage.includes('encontrado') || logMessage.includes('CPF')) {
        sendStatus('info', `Debug: ${logMessage}`, currentStep, 'Informação de debug');
      }
    });

    sendStatus('info', 'Navegando para o PJE...', currentStep++, 'Acessando sistema PJE');

    // Tentar login com retry
    let loginSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        sendStatus('info', `Tentativa de login ${attempt}/3...`, currentStep, 'Autenticando no sistema');
        
        await login(page);
        loginSuccess = true;
        break;
      } catch (loginError) {
        if (attempt === 3) {
          throw new Error(`Falha no login após 3 tentativas: ${loginError.message}`);
        }
        sendStatus('warning', `Tentativa ${attempt} falhou, tentando novamente...`, currentStep, 'Reautenticando');
        await page.waitForTimeout(800);
      }
    }
    
    sendStatus('success', 'Login realizado com sucesso!', currentStep++, 'Sistema autenticado');

    for (let i = 0; i < selectedPeritos.length; i++) {
      const perito = selectedPeritos[i];
      try {
        sendStatus('info', `Processando perito ${i + 1}/${selectedPeritos.length}: ${perito.nome}`, currentStep++, `Buscando perito por CPF: ${perito.cpf}`);
        
        await navegarParaCadastro(page, perito.cpf);
        
        sendStatus('success', `Navegação para ${perito.nome} concluída`, currentStep, 'Perito localizado no sistema');
        
        // Listar OJs já vinculados antes de começar
        sendStatus('info', 'Verificando OJs já vinculados...', currentStep, 'Verificando vínculos existentes');
        const ojsJaVinculados = await listarOJsVinculados(page);
        
        if (ojsJaVinculados.length > 0) {
          sendStatus('info', `OJs já vinculados encontrados: ${ojsJaVinculados.length}`, currentStep, 'Vínculos existentes identificados');
        }
        
        for (let j = 0; j < perito.ojs.length; j++) {
          const oj = perito.ojs[j];
          try {
            sendStatus('info', `Vinculando OJ ${j + 1}/${perito.ojs.length}: ${oj}`, currentStep++, 'Processando órgão julgador');
            
            // Verificar se o OJ já está vinculado
            const verificacao = await verificarOJJaVinculado(page, oj);
            
            if (verificacao.jaVinculado) {
              sendStatus('warning', `OJ "${oj}" já está vinculado - pulando vinculação`, currentStep, 'Vínculo já existe');
              continue;
            }
            
            await vincularOJ(page, oj);
            
            sendStatus('success', `OJ ${oj} vinculado com sucesso`, currentStep, 'Vínculo criado');
          } catch (ojError) {
            // Verificar se o erro indica que o OJ já está vinculado
            const errorMsg = ojError.message.toLowerCase();
            if (errorMsg.includes('já vinculado') || 
                errorMsg.includes('já cadastrado') || 
                errorMsg.includes('duplicado')) {
              sendStatus('warning', `OJ "${oj}" já está vinculado: ${ojError.message}`, currentStep, 'Vínculo duplicado detectado');
            } else {
              sendStatus('warning', `Erro ao vincular OJ ${oj}: ${ojError.message}`, currentStep, 'Erro na vinculação');
            }
          }
          
          // Pequena pausa entre OJs
          await page.waitForTimeout(150);
        }
      } catch (peritoError) {
        sendStatus('error', `Erro ao processar perito ${perito.nome}: ${peritoError.message}`, currentStep, 'Erro no processamento');
      }
      
      // Pausa entre peritos
      if (i < selectedPeritos.length - 1) {
        await page.waitForTimeout(200);
      }
    }

    // Não fechar o navegador automaticamente; manter no PJe para revisão
    sendStatus('success', 'Automação concluída! Navegador permanecerá aberto para revisão. Clique em Parar Automação para fechar.', totalSteps, 'Processo finalizado');
    
    return { success: true };
  } catch (error) {
    const errorMessage = error.message && error.message.includes('Timeout') 
      ? 'Timeout: A página demorou muito para carregar. Verifique sua conexão e tente novamente.'
      : `Erro na automação: ${error.message}`;
    
    sendStatus('error', `${errorMessage} Navegador permanecerá aberto para inspeção.`, currentStep, 'Falha na execução');
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    defaultPath: 'peritos.json'
  });
  return result;
});

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  return result;
});

// Handler para parar automação e fechar o navegador manualmente
ipcMain.handle('stop-automation', async () => {
  try {
    if (activeBrowser) {
      await activeBrowser.close();
      activeBrowser = null;
    }
    mainWindow.webContents.send('automation-status', { 
      type: 'info', 
      message: 'Navegador fechado pelo usuário.'
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});