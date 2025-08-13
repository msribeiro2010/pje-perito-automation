// PJE Automation - Peritos e Servidores - Main Process
// Sistema de automação para vinculação de peritos e servidores no PJE

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { login } = require('./login.js');
const { navegarParaCadastro } = require('./navigate.js');
const { vincularOJ } = require('./vincularOJ.js');
const { verificarOJJaVinculado, listarOJsVinculados } = require('./verificarOJVinculado.js');
const { loadConfig } = require('./util.js');
const { Logger } = require('./utils/index.js');
// const ServidorAutomation = require('./main/servidor-automation'); // Removido V1
const ServidorAutomationV2 = require('./main/servidor-automation-v2');

// __dirname is already available in CommonJS

let mainWindow;
let activeBrowser = null;
let automationInProgress = false;
// let servidorAutomation = null; // Removido V1
let servidorAutomationV2 = null;
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
    title: 'PJE Automation - Peritos e Servidores',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.svg')
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
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handlers genéricos para dados
ipcMain.handle('save-data', async (event, key, data) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

ipcMain.handle('load-data', async (event, key) => {
  try {
    const filePath = path.join(__dirname, '../data', `${key}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erro ao carregar dados para ${key}:`, error);
    return null;
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
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
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
      slowMo: 5,
      timeout: 15000
    });
    activeBrowser = browser;
    const page = await browser.newPage();
    
    // Configurar timeout padrão da página
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(8000);
    
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
          const loginErrorMsg = loginError && loginError.message ? loginError.message : 'Erro desconhecido';
          throw new Error(`Falha no login após 3 tentativas: ${loginErrorMsg}`);
        }
        sendStatus('warning', `Tentativa ${attempt} falhou, tentando novamente...`, currentStep, 'Reautenticando');
        await page.waitForTimeout(500);
      }
    }
    
    sendStatus('success', 'Login realizado com sucesso!', currentStep++, 'Sistema autenticado');

    // Criar instância do Logger para navegação
    const logger = new Logger('PJE-Automation');
    
    // Relatório de resultados
    const relatorio = {
      totalPeritos: selectedPeritos.length,
      peritosProcessados: 0,
      totalOJs: 0,
      ojsVinculados: 0,
      ojsJaVinculados: 0,
      ojsNaoEncontrados: [],
      ojsComErro: [],
      detalhes: []
    };

    for (let i = 0; i < selectedPeritos.length; i++) {
      const perito = selectedPeritos[i];
      const resultadoPerito = {
        nome: perito.nome,
        cpf: perito.cpf,
        ojsProcessados: 0,
        ojsVinculados: 0,
        ojsJaVinculados: 0,
        ojsNaoEncontrados: [],
        ojsComErro: []
      };
      
      try {
        sendStatus('info', `Processando perito ${i + 1}/${selectedPeritos.length}: ${perito.nome}`, currentStep++, `Buscando perito por CPF: ${perito.cpf}`);
        
        await navegarParaCadastro(page, perito.cpf, logger);
        
        sendStatus('success', `Navegação para ${perito.nome} concluída`, currentStep, 'Perito localizado no sistema');
        
        // Listar OJs já vinculados antes de começar
        sendStatus('info', 'Verificando OJs já vinculados...', currentStep, 'Verificando vínculos existentes');
        const ojsJaVinculados = await listarOJsVinculados(page);
        
        if (ojsJaVinculados.length > 0) {
          sendStatus('info', `OJs já vinculados encontrados: ${ojsJaVinculados.length}`, currentStep, 'Vínculos existentes identificados');
        }
        
        relatorio.totalOJs += perito.ojs.length;
        
        for (let j = 0; j < perito.ojs.length; j++) {
          const oj = perito.ojs[j];
          resultadoPerito.ojsProcessados++;
          
          try {
            sendStatus('info', `Processando OJ ${j + 1}/${perito.ojs.length}: ${oj}`, currentStep++, 'Analisando órgão julgador');
            
            // 1. Verificar se o OJ já está vinculado (apenas verificação conservadora)
            console.log(`\n=== PROCESSANDO OJ: "${oj}" ===`);
            const verificacao = await verificarOJJaVinculado(page, oj);
            
            if (verificacao.jaVinculado) {
              // Log detalhado para debug
              console.log(`✅ OJ JÁ VINCULADO:`);
              console.log(`   - OJ: "${oj}"`);
              console.log(`   - Texto encontrado: "${verificacao.textoEncontrado}"`);
              console.log(`   - Tipo: ${verificacao.tipoCorrespondencia || 'padrão'}`);
              
              sendStatus('warning', `OJ "${oj}" já está vinculado - pulando`, currentStep, 'Vínculo já existe');
              resultadoPerito.ojsJaVinculados++;
              relatorio.ojsJaVinculados++;
              continue;
            } else {
              console.log(`🔄 OJ "${oj}" NÃO está vinculado - tentando vincular...`);
            }
            
            // 2. Tentar vincular o OJ
            sendStatus('info', `Vinculando OJ: ${oj}`, currentStep, 'Executando vinculação');
            await vincularOJ(page, oj);
            
            sendStatus('success', `OJ ${oj} vinculado com sucesso`, currentStep, 'Vínculo criado');
            resultadoPerito.ojsVinculados++;
            relatorio.ojsVinculados++;
            console.log(`✅ SUCESSO: OJ "${oj}" vinculado!`);
            
          } catch (ojError) {
            console.log(`❌ ERRO ao processar OJ "${oj}":`, ojError.message);
            console.log(`   - Código: ${ojError.code || 'DESCONHECIDO'}`);
            
            // Verificar tipo específico de erro
            if (ojError && ojError.code === 'OJ_NAO_ENCONTRADO') {
              // OJ não encontrado na relação de opções
              console.log(`⚠️ OJ "${oj}" NÃO CONSTA na lista de opções disponíveis`);
              sendStatus('warning', `OJ "${oj}" não existe no sistema - pulando`, currentStep, 'OJ inexistente');
              
              const ojNaoEncontrado = {
                nome: oj,
                perito: perito.nome,
                motivo: 'Não encontrado na relação de opções disponíveis',
                opcoesDisponiveis: ojError.opcoesDisponiveis || []
              };
              
              resultadoPerito.ojsNaoEncontrados.push(ojNaoEncontrado);
              relatorio.ojsNaoEncontrados.push(ojNaoEncontrado);
              
            } else if (ojError && ojError.code === 'TIMEOUT_GLOBAL') {
              // Timeout na vinculação - pular e continuar
              console.log(`⏰ TIMEOUT ao processar OJ "${oj}" (mais de 60 segundos)`);
              sendStatus('error', `Timeout ao vincular OJ "${oj}" - pulando`, currentStep, 'Operação demorou muito');
              
              const ojComErro = {
                nome: oj,
                perito: perito.nome,
                erro: `Timeout após 60 segundos: ${ojError.message}`,
                codigo: 'TIMEOUT_GLOBAL'
              };
              
              resultadoPerito.ojsComErro.push(ojComErro);
              relatorio.ojsComErro.push(ojComErro);
              
            } else {
              // Outros tipos de erro
              const ojErrorMsg = ojError && ojError.message ? ojError.message : 'Erro desconhecido';
              const errorMsg = ojErrorMsg.toLowerCase();
              
              if (errorMsg.includes('já vinculado') || 
                  errorMsg.includes('já cadastrado') || 
                  errorMsg.includes('duplicado')) {
                console.log(`⚠️ OJ "${oj}" já estava vinculado (detectado durante vinculação)`);
                sendStatus('warning', `OJ "${oj}" já vinculado - pulando`, currentStep, 'Vínculo duplicado');
                resultadoPerito.ojsJaVinculados++;
                relatorio.ojsJaVinculados++;
              } else {
                console.log(`💥 ERRO GERAL ao vincular OJ "${oj}": ${ojErrorMsg}`);
                sendStatus('error', `Erro ao vincular OJ ${oj}: ${ojErrorMsg}`, currentStep, 'Erro na vinculação');
                
                const ojComErro = {
                  nome: oj,
                  perito: perito.nome,
                  erro: ojErrorMsg,
                  codigo: ojError.code || 'ERRO_DESCONHECIDO'
                };
                
                resultadoPerito.ojsComErro.push(ojComErro);
                relatorio.ojsComErro.push(ojComErro);
              }
            }
          }
          
          // Pequena pausa entre OJs
          await page.waitForTimeout(100);
        }
        
        relatorio.peritosProcessados++;
        relatorio.detalhes.push(resultadoPerito);
        
      } catch (peritoError) {
        const errorMessage = peritoError && peritoError.message ? peritoError.message : (peritoError ? String(peritoError) : 'Erro desconhecido');
        sendStatus('error', `Erro ao processar perito ${perito.nome}: ${errorMessage}`, currentStep, 'Erro no processamento');
        
        // Adicionar erro do perito ao relatório
        relatorio.detalhes.push({
          ...resultadoPerito,
          erroProcessamento: errorMessage
        });
      }
      
      // Pausa entre peritos
      if (i < selectedPeritos.length - 1) {
        await page.waitForTimeout(400);
      }
    }
    
    // Enviar relatório final
    enviarRelatorioFinal(relatorio);

    // Não fechar o navegador automaticamente; manter no PJe para revisão
    const mensagemFinal = gerarMensagemFinal(relatorio);
    sendStatus('success', mensagemFinal, totalSteps, 'Processo finalizado');
    
    return { success: true };
  } catch (error) {
    const safeErrorMessage = error && error.message ? error.message : 'Erro desconhecido';
    const errorMessage = error && error.message && error.message.includes('Timeout') 
      ? 'Timeout: A página demorou muito para carregar. Verifique sua conexão e tente novamente.'
      : `Erro na automação: ${safeErrorMessage}`;
    
    sendStatus('error', `${errorMessage} Navegador permanecerá aberto para inspeção.`, currentStep, 'Falha na execução');
    
    return { success: false, error: safeErrorMessage };
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

// Handlers para importação e exportação de arquivos
ipcMain.handle('import-file', async (event, type) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

ipcMain.handle('export-file', async (event, data, filename) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename || 'export.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, filePath: result.filePath };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
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
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handlers V1 removidos - usando apenas V2

// ===== HANDLERS PARA AUTOMAÇÃO V2 =====

// Handler para iniciar automação de servidores V2 (moderna)
ipcMain.handle('start-servidor-automation-v2', async (_, config) => {
  try {
    if (automationInProgress) {
      throw new Error('Automação já está em execução');
    }

    automationInProgress = true;
    
    if (!servidorAutomationV2) {
      servidorAutomationV2 = new ServidorAutomationV2();
      servidorAutomationV2.setMainWindow(mainWindow);
    }
    
    await servidorAutomationV2.startAutomation(config);
    return { success: true, relatorio: servidorAutomationV2.getRelatorio() };
    
  } catch (error) {
    console.error('Erro na automação de servidores V2:', error);
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  } finally {
    automationInProgress = false;
  }
});

// Handler para parar automação de servidores V2
ipcMain.handle('stop-servidor-automation-v2', async () => {
  try {
    if (servidorAutomationV2) {
      await servidorAutomationV2.stopAutomation();
    }
    automationInProgress = false;
    return { success: true };
  } catch (error) {
    console.error('Erro ao parar automação V2:', error);
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para obter status da automação de servidores V2
ipcMain.handle('get-servidor-automation-v2-status', async () => {
  try {
    if (servidorAutomationV2) {
      return servidorAutomationV2.getStatus();
    }
    return { isRunning: false, progress: 0, totalOrgaos: 0, processedCount: 0 };
  } catch (error) {
    console.error('Erro ao obter status V2:', error);
    return { isRunning: false, progress: 0, totalOrgaos: 0, processedCount: 0 };
  }
});

// Handler para obter relatório da automação V2
ipcMain.handle('get-servidor-automation-v2-report', async () => {
  try {
    if (servidorAutomationV2) {
      return { success: true, relatorio: servidorAutomationV2.getRelatorio() };
    }
    return { success: false, error: 'Automação V2 não inicializada' };
  } catch (error) {
    console.error('Erro ao obter relatório V2:', error);
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para carregar órgãos PJE
ipcMain.handle('load-orgaos-pje', async () => {
  try {
    const orgaosPath = path.join(__dirname, 'renderer/orgaos_pje.json');
    if (!fs.existsSync(orgaosPath)) {
      throw new Error('Arquivo orgaos_pje.json não encontrado');
    }
    
    const data = fs.readFileSync(orgaosPath, 'utf8');
    const orgaosData = JSON.parse(data);
    
    // Extrair todos os órgãos de todas as cidades e juntar em um array único
    const allOJs = [];
    Object.keys(orgaosData).forEach(cidade => {
      if (Array.isArray(orgaosData[cidade])) {
        allOJs.push(...orgaosData[cidade]);
      }
    });
    
    // Ordenar alfabeticamente
    const sortedOJs = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    
    return { success: true, orgaos: sortedOJs };
  } catch (error) {
    console.error('Erro ao carregar órgãos PJE:', error);
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido', orgaos: [] };
  }
});

// Handler para validar configuração V2
ipcMain.handle('validate-servidor-config-v2', async (_, config) => {
  try {
    // Validações básicas
    if (!config.cpf || !config.orgaos || !Array.isArray(config.orgaos)) {
      throw new Error('Configuração inválida: CPF e lista de órgãos são obrigatórios');
    }
    
    const cpfLimpo = config.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('CPF deve ter 11 dígitos');
    }
    
    if (config.orgaos.length === 0) {
      throw new Error('Lista de órgãos julgadores não pode estar vazia');
    }
    
    return { success: true, message: 'Configuração válida' };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Função para enviar relatório final detalhado
function enviarRelatorioFinal(relatorio) {
  try {
    console.log('=== RELATÓRIO FINAL DE VINCULAÇÃO ===');
    console.log(`Total de peritos: ${relatorio.totalPeritos}`);
    console.log(`Peritos processados: ${relatorio.peritosProcessados}`);
    console.log(`Total de OJs: ${relatorio.totalOJs}`);
    console.log(`OJs vinculados: ${relatorio.ojsVinculados}`);
    console.log(`OJs já vinculados: ${relatorio.ojsJaVinculados}`);
    console.log(`OJs não encontrados: ${relatorio.ojsNaoEncontrados.length}`);
    console.log(`OJs com erro: ${relatorio.ojsComErro.length}`);
    
    // Enviar relatório para a interface
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation-report', {
        type: 'final-report',
        relatorio: relatorio
      });
    }
    
    // Se houver OJs não encontrados, listar detalhadamente
    if (relatorio.ojsNaoEncontrados.length > 0) {
      console.log('\n=== OJs NÃO ENCONTRADOS ===');
      relatorio.ojsNaoEncontrados.forEach((oj, index) => {
        console.log(`${index + 1}. ${oj.nome} (Perito: ${oj.perito})`);
        console.log(`   Motivo: ${oj.motivo}`);
        if (oj.opcoesDisponiveis && oj.opcoesDisponiveis.length > 0) {
          console.log(`   Opções disponíveis (primeiras 10): ${oj.opcoesDisponiveis.slice(0, 10).join(', ')}`);
        }
      });
    }
    
    // Se houver OJs com erro, listar
    if (relatorio.ojsComErro.length > 0) {
      console.log('\n=== OJs COM ERRO ===');
      relatorio.ojsComErro.forEach((oj, index) => {
        console.log(`${index + 1}. ${oj.nome} (Perito: ${oj.perito})`);
        console.log(`   Erro: ${oj.erro}`);
        console.log(`   Código: ${oj.codigo}`);
      });
    }
    
  } catch (error) {
    console.error('Erro ao gerar relatório final:', error);
  }
}

// Função para gerar mensagem final resumida
function gerarMensagemFinal(relatorio) {
  const total = relatorio.totalOJs;
  const vinculados = relatorio.ojsVinculados;
  const jaVinculados = relatorio.ojsJaVinculados;
  const naoEncontrados = relatorio.ojsNaoEncontrados.length;
  const comErro = relatorio.ojsComErro.length;
  
  let mensagem = `Automação concluída! `;
  mensagem += `${vinculados} OJs vinculados, `;
  mensagem += `${jaVinculados} já vinculados`;
  
  if (naoEncontrados > 0) {
    mensagem += `, ${naoEncontrados} não encontrados`;
  }
  
  if (comErro > 0) {
    mensagem += `, ${comErro} com erro`;
  }
  
  mensagem += ` (${total} total). `;
  
  if (naoEncontrados > 0 || comErro > 0) {
    mensagem += `Verifique o console para detalhes dos problemas. `;
  }
  
  mensagem += `Navegador permanece aberto para revisão.`;
  
  return mensagem;
}