// PJE Automation - Peritos e Servidores - Main Process
// Sistema de automação para vinculação de peritos e servidores no PJE

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// Ajuste de limite de listeners para evitar MaxListenersExceededWarning
try {
  if (process && typeof process.setMaxListeners === 'function') {
    process.setMaxListeners(50);
  }
  const events = require('events');
  if (events && typeof events.defaultMaxListeners === 'number') {
    events.defaultMaxListeners = 50;
  }
} catch (_) {}
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { login } = require('./login.js');
const { navegarParaCadastro } = require('./navigate.js');
const { vincularOJ } = require('./vincularOJ.js');
const { verificarOJJaVinculado, listarOJsVinculados } = require('./verificarOJVinculado.js');
const { SmartOJCache } = require('./utils/smart-oj-cache.js');
const { ServidorSkipDetector } = require('./utils/servidor-skip-detector.js');
const { VerificacaoDuplaOJ } = require('./utils/verificacao-dupla-oj.js');
const SmartDatabaseVerifier = require('./utils/smart-database-verifier.js');
const SmartLocationSkipper = require('./utils/smart-location-skipper');
const LocationProgressTracker = require('./utils/location-progress-tracker');
const LocationErrorRecovery = require('./utils/location-error-recovery');
const LocationEfficiencyReporter = require('./utils/location-efficiency-reporter');
const { loadConfig } = require('./util.js');
const { Logger } = require('./utils/index.js');
// const ServidorAutomation = require('./main/servidor-automation'); // Removido V1
const ServidorAutomationV2 = require('./main/servidor-automation-v2');
const { resolverProblemaVarasLimeira } = require('../solucao-limeira-completa.js');

// __dirname is already available in CommonJS

let mainWindow;
let activeBrowser = null;
let automationInProgress = false;
let smartOJCache = new SmartOJCache();
let servidorSkipDetector = new ServidorSkipDetector();
let verificacaoDuplaOJ = new VerificacaoDuplaOJ();
let smartLocationSkipper = new SmartLocationSkipper();
let locationProgressTracker = new LocationProgressTracker();
let locationErrorRecovery = new LocationErrorRecovery();
let locationEfficiencyReporter = new LocationEfficiencyReporter();
let smartDatabaseVerifier = new SmartDatabaseVerifier();
// let servidorAutomation = null; // Removido V1
let servidorAutomationV2 = null;
function sendStatus(type, message, progress = null, subtitle = null, ojData = null) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const data = { type, message };
      if (progress !== null) data.progress = progress;
      if (subtitle) data.subtitle = subtitle;
      if (ojData) {
        if (ojData.ojProcessed !== undefined) data.ojProcessed = ojData.ojProcessed;
        if (ojData.totalOjs !== undefined) data.totalOjs = ojData.totalOjs;
        if (ojData.orgaoJulgador) data.orgaoJulgador = ojData.orgaoJulgador;
      }
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

  // Só abre DevTools se explicitamente solicitado via argumento --dev
  // Evita abertura automática em modo de produção
  const shouldOpenDevTools = process.argv.includes('--dev') || 
                            process.argv.includes('--devtools') ||
                            process.env.ELECTRON_DEV_TOOLS === 'true';
  
  if (shouldOpenDevTools) {
    console.log('Abrindo DevTools (modo desenvolvimento)');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Aplicação iniciada em modo produção (DevTools desabilitado)');
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
    
    // Inicializar componentes do sistema de scanner de localizações
    sendStatus('info', 'Inicializando sistema de scanner...', currentStep, 'Configurando componentes');
    await smartLocationSkipper.initialize();
    // locationProgressTracker não possui método initialize - já está pronto para uso
    await locationErrorRecovery.initialize();
    await locationEfficiencyReporter.initialize();
    
    // Inicializar sistema de verificação de banco de dados
    sendStatus('info', 'Inicializando verificação de banco...', currentStep, 'Conectando ao banco de dados');
    const dbInitialized = await smartDatabaseVerifier.initialize();
    if (dbInitialized) {
      sendStatus('success', 'Conexão com banco estabelecida', currentStep, 'Sistema de otimização ativo');
    } else {
      sendStatus('warning', 'Banco não disponível - processamento normal', currentStep, 'Sistema funcionará sem otimização');
    }
    
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
    
    // Contador global de OJs processadas
    let ojsProcessadasTotal = 0;

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
        
        // 🚀 VERIFICAÇÃO INTELIGENTE EM LOTE - Nova funcionalidade!
        sendStatus('info', 'Iniciando verificação inteligente de OJs...', currentStep, 'Analisando vínculos existentes');
        
        // Verificação prévia no banco de dados (se disponível)
        let verificacaoBanco = null;
        if (dbInitialized) {
          try {
            sendStatus('info', 'Verificando OJs no banco de dados...', currentStep, 'Consulta otimizada');
            // Usar CPF para verificação no banco (mais confiável que idUsuario aqui)
            verificacaoBanco = await smartDatabaseVerifier.verificarOJsServidorPorCPF(
              perito.cpf,
              perito.ojs
            );
            
            if (verificacaoBanco.estatisticas.jaCadastrados > 0) {
              sendStatus('success', 
                `Banco: ${verificacaoBanco.estatisticas.jaCadastrados} OJs já cadastrados encontrados`, 
                currentStep, 
                `Economia estimada: ${verificacaoBanco.estatisticas.economiaEstimada}s`
              );
            }
          } catch (error) {
            console.warn('⚠️ Erro na verificação de banco:', error.message);
            verificacaoBanco = null;
          }
        }
        
        // Determinar lista de OJs a processar com base no resultado do banco (quando disponível)
        const ojsParaProcessar = (verificacaoBanco && Array.isArray(verificacaoBanco.ojsParaProcessar) && verificacaoBanco.ojsParaProcessar.length > 0)
          ? verificacaoBanco.ojsParaProcessar
          : perito.ojs;

        const verificacaoEmLote = await smartOJCache.verificarOJsEmLote(
          page, 
          ojsParaProcessar,
          (mensagem, progresso) => {
            sendStatus('info', mensagem, currentStep, `Verificação prévia (${progresso}%)`, {
              progress: progresso
            });
          }
        );
        
        // 🎯 ANÁLISE INTELIGENTE DE SERVIDOR - Usar resultados da verificação em lote
        const { estatisticas } = verificacaoEmLote;
        
        // Verificar se TODOS os OJs já estão vinculados
        if (estatisticas.paraVincular === 0 && estatisticas.totalVerificados > 0) {
          sendStatus('success', 
            `⏭️ Todos os OJs do perito ${perito.nome} já estão cadastrados no servidor!`, 
            currentStep, 
            `${estatisticas.jaVinculados} OJs já vinculados - pulando para próximo perito`
          );
          
          // Atualizar estatísticas do relatório
          relatorio.totalOJs += perito.ojs.length;
          relatorio.ojsJaVinculados += estatisticas.jaVinculados;
          resultadoPerito.ojsJaVinculados = estatisticas.jaVinculados;
          resultadoPerito.ojsProcessados = perito.ojs.length;
          
          relatorio.detalhes.push(resultadoPerito);
          relatorio.peritosProcessados++;
          
          console.log(`🎯 PERITO COMPLETAMENTE PROCESSADO: ${perito.nome}`);
          console.log(`   - Todos os ${estatisticas.jaVinculados} OJs já estão vinculados`);
          console.log(`   - Economia de tempo: ${estatisticas.jaVinculados * 5}s`);
          console.log(`   - Não há necessidade de processar este perito`);
          
          continue; // Pular para o próximo perito
        }
        
        // Verificar se a maioria dos OJs já está vinculada (95% ou mais)
        const percentualVinculado = estatisticas.jaVinculados / estatisticas.totalVerificados;
        if (percentualVinculado >= 0.95 && estatisticas.totalVerificados >= 3) {
          sendStatus('warning', 
            `⏭️ Pulando perito ${perito.nome}: ${(percentualVinculado * 100).toFixed(1)}% dos OJs já vinculados`, 
            currentStep, 
            `Apenas ${estatisticas.paraVincular} OJs restantes - economia significativa`
          );
          
          // Atualizar estatísticas do relatório
          relatorio.totalOJs += perito.ojs.length;
          relatorio.ojsJaVinculados += estatisticas.jaVinculados;
          resultadoPerito.ojsJaVinculados = estatisticas.jaVinculados;
          resultadoPerito.ojsProcessados = perito.ojs.length;
          
          relatorio.detalhes.push(resultadoPerito);
          relatorio.peritosProcessados++;
          
          console.log(`🎯 PERITO QUASE COMPLETO - PULADO: ${perito.nome}`);
          console.log(`   - ${estatisticas.jaVinculados} OJs já vinculados de ${estatisticas.totalVerificados}`);
          console.log(`   - Apenas ${estatisticas.paraVincular} OJs restantes`);
          console.log(`   - Economia estimada: ${estatisticas.jaVinculados * 5}s`);
          
          continue; // Pular para o próximo perito
        }
        
        // Relatório da verificação em lote
        const { ojsJaVinculados: ojsJaVinculadosLote, ojsParaVincular } = verificacaoEmLote;
        
        sendStatus('success', 
          `Verificação concluída: ${estatisticas.jaVinculados} já vinculados, ${estatisticas.paraVincular} para vincular`, 
          currentStep, 
          `Economia de ${Math.round(estatisticas.jaVinculados * 5)}s de processamento`
        );
        
        console.log('🎯 RESULTADO DA VERIFICAÇÃO EM LOTE:');
        console.log(`   - Total verificados: ${estatisticas.totalVerificados}`);
        console.log(`   - Já vinculados: ${estatisticas.jaVinculados} (pularão processamento)`);
        console.log(`   - Para vincular: ${estatisticas.paraVincular}`);
        console.log(`   - Tempo de verificação: ${estatisticas.tempoProcessamento}ms`);
        console.log(`   - Economia estimada: ${estatisticas.jaVinculados * 5}s`);
        
        relatorio.totalOJs += ojsParaProcessar.length;
        relatorio.ojsJaVinculados += estatisticas.jaVinculados;
        
        for (let j = 0; j < ojsParaProcessar.length; j++) {
          const oj = ojsParaProcessar[j];
          resultadoPerito.ojsProcessados++;
          ojsProcessadasTotal++;
          
          try {
            // 🎯 VERIFICAÇÃO DUPLA INTELIGENTE - Usar cache e verificação adicional
            const verificacaoResult = await verificacaoDuplaOJ.verificarOJDupla(
              page, oj, smartOJCache
            );
            
            if (verificacaoResult.jaVinculado) {
              const metodo = verificacaoResult.metodoDeteccao;
              const confiabilidade = Math.round(verificacaoResult.confiabilidade * 100);
              
              sendStatus('success', `⚡ OJ ${oj} já vinculado (${metodo}, ${confiabilidade}%) - pulando processamento`, currentStep++, `Verificação dupla - ${metodo}`, {
                ojProcessed: ojsProcessadasTotal,
                totalOjs: relatorio.totalOJs,
                orgaoJulgador: oj
              });
              // Não incrementa relatorio.ojsJaVinculados pois já foi contado na verificação em lote
              continue;
            }
            
            sendStatus('info', `Processando OJ ${j + 1}/${ojsParaProcessar.length}: ${oj}`, currentStep++, 'Analisando órgão julgador', {
              ojProcessed: ojsProcessadasTotal,
              totalOjs: relatorio.totalOJs,
              orgaoJulgador: oj
            });
            
            // 1. Processar vinculação do OJ (já verificado pelo cache inteligente)
            console.log(`\n=== PROCESSANDO OJ: "${oj}" ===`);
            console.log(`🔗 Iniciando vinculação (não encontrado no cache)`);
            {
              console.log(`🔄 OJ "${oj}" NÃO está vinculado - tentando vincular...`);
            }
            
            // 2. Tentar vincular o OJ
            sendStatus('info', `Vinculando OJ: ${oj}`, currentStep, 'Executando vinculação');
            await vincularOJ(page, oj);
            
            sendStatus('success', `OJ ${oj} vinculado com sucesso`, currentStep, 'Vínculo criado', {
              ojProcessed: ojsProcessadasTotal,
              totalOjs: relatorio.totalOJs,
              orgaoJulgador: oj
            });
            
            // 🎯 ATUALIZAR CACHE INTELIGENTE - Marcar OJ como vinculado
            smartOJCache.adicionarOJVinculado(oj);
            console.log(`📝 Cache atualizado: OJ "${oj}" marcado como vinculado`);
            
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
              
            } else if (ojError && ojError.code === 'OJ_JA_CADASTRADO') {
              // OJ já cadastrado na página - pular e continuar
              console.log(`⚠️ OJ "${oj}" já está cadastrado na página`);
              sendStatus('warning', `OJ "${oj}" já cadastrado - pulando`, currentStep, 'OJ duplicado');
              
              // Marcar como já vinculado no cache
              smartOJCache.adicionarOJVinculado(oj);
              
              resultadoPerito.ojsJaVinculados++;
              relatorio.ojsJaVinculados++;
              
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
    
    // Gerar relatório de eficiência dos servidores
    const relatorioEficiencia = servidorSkipDetector.gerarRelatorioEficiencia();
    
    console.log('\n📊 RELATÓRIO DE EFICIÊNCIA DOS SERVIDORES:');
    console.log(`   - Total de servidores analisados: ${relatorioEficiencia.totalServidores}`);
    console.log(`   - Servidores completos: ${relatorioEficiencia.servidoresCompletos}`);
    console.log(`   - Servidores quase completos: ${relatorioEficiencia.servidoresQuaseCompletos}`);
    console.log(`   - Servidores ativos: ${relatorioEficiencia.servidoresAtivos}`);
    console.log(`   - Economia total estimada: ${Math.round(relatorioEficiencia.economiaEstimada)}s`);
    
    // Gerar relatório de estatísticas da verificação dupla
    const estatisticasVerificacao = verificacaoDuplaOJ.gerarRelatorioEstatisticas();
    console.log('\n🔍 RELATÓRIO DE VERIFICAÇÃO DUPLA:');
    console.log(`   - Total verificações: ${estatisticasVerificacao.totalVerificacoes}`);
    console.log(`   - Cache hits: ${estatisticasVerificacao.cacheHits}`);
    console.log(`   - Verificações diretas: ${estatisticasVerificacao.verificacoesDiretas}`);
    console.log(`   - OJs detectados já vinculados: ${estatisticasVerificacao.ojsDetectadosJaVinculados}`);
    console.log(`   - Falso positivos: ${estatisticasVerificacao.falsoPositivos}`);
    console.log(`   - Tempo médio: ${estatisticasVerificacao.tempoMedioMs}ms`);
    console.log(`   - Eficiência cache: ${estatisticasVerificacao.eficienciaCache.toFixed(1)}%`);
    console.log(`   - Taxa detecção: ${estatisticasVerificacao.taxaDeteccao.toFixed(1)}%`);
    
    // Adicionar relatórios ao relatório principal
    relatorio.eficienciaServidores = relatorioEficiencia;
    relatorio.estatisticasVerificacaoDupla = estatisticasVerificacao;
    
    // Enviar status final com contador completo (apenas se houver OJs processadas)
    if (relatorio.totalOJs > 0) {
      sendStatus('success', 'Processamento finalizado com sucesso!', totalSteps, 'Todas as OJs foram processadas', {
        ojProcessed: relatorio.totalOJs,
        totalOjs: relatorio.totalOJs,
        orgaoJulgador: 'Finalizado'
      });
    } else {
      // Log silencioso quando não há OJs para processar
      console.log('🔄 [AUTOMATION] Processamento finalizado - nenhum OJ para processar');
      sendStatus('info', 'Processamento concluído', totalSteps, 'Nenhum OJ para processar', {
        ojProcessed: 0,
        totalOjs: 0,
        orgaoJulgador: 'Finalizado'
      });
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
    
    // Inicializar verificação de banco se não estiver ativa
    if (!smartDatabaseVerifier.isInitialized) {
      sendStatus('info', 'Inicializando verificação de banco...', 0, 'Conectando ao banco de dados');
      await smartDatabaseVerifier.initialize();
    }
    
    if (!servidorAutomationV2) {
      servidorAutomationV2 = new ServidorAutomationV2();
      servidorAutomationV2.setMainWindow(mainWindow);
    }
    
    // Processar servidores com verificação de banco
    if (smartDatabaseVerifier.isInitialized && config.servidores) {
      sendStatus('info', 'Verificando servidores no banco de dados...', 0, 'Otimizando processamento');
      const resultadoVerificacao = await smartDatabaseVerifier.processarServidoresComVerificacao(config.servidores);
      
      // Atualizar configuração com OJs filtrados
      config.servidores = config.servidores.map(servidor => {
        const detalhe = resultadoVerificacao.detalhes.find(d => d.servidor === servidor.nome || d.servidor === servidor.cpf);
        if (detalhe && detalhe.ojsParaProcessar) {
          return {
            ...servidor,
            orgaos: detalhe.ojsParaProcessar,
            ojsJaCadastrados: detalhe.ojsJaCadastrados || [],
            ojsInativos: detalhe.ojsInativos || [],
            tempoEconomizado: detalhe.tempoEconomizado || 0
          };
        }
        return servidor;
      });
      
      sendStatus('success',
        `Verificação concluída: ${resultadoVerificacao.totalOjsPulados} OJs pulados, ${resultadoVerificacao.totalOjsParaProcessar} para processar`,
        0,
        `Economia estimada: ${Math.round(resultadoVerificacao.tempoEconomizadoTotal / 60)}min`
      );

      // VALIDAÇÃO: Verificar se há OJs para processar antes de iniciar automação
      if (resultadoVerificacao.totalOjsParaProcessar === 0) {
        sendStatus('success',
          '🎉 Todos os OJs já foram cadastrados!',
          100,
          'Automação desnecessária - nenhum OJ pendente de cadastro'
        );

        automationInProgress = false;

        return {
          success: true,
          nothingToDo: true,
          message: 'Todos os órgãos julgadores selecionados já foram cadastrados. Não há necessidade de executar a automação.',
          relatorio: {
            totalServidores: config.servidores?.length || 0,
            ojsJaCadastrados: resultadoVerificacao.totalOjsPulados,
            ojsParaProcessar: 0,
            tempoEconomizado: resultadoVerificacao.tempoEconomizadoTotal
          }
        };
      }
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

// Handler para iniciar automação paralela de servidores V2
ipcMain.handle('start-parallel-automation-v2', async (_, config) => {
  try {
    if (automationInProgress) {
      throw new Error('Automação já está em execução');
    }

    automationInProgress = true;
    
    if (!servidorAutomationV2) {
      servidorAutomationV2 = new ServidorAutomationV2();
      servidorAutomationV2.setMainWindow(mainWindow);
    }
    
    // Extrair parâmetros necessários do config
    const servidores = config.servidores || [];
    const maxInstances = config.numInstances || config.maxInstances || 2;
    
    const result = await servidorAutomationV2.startParallelAutomation(servidores, config, maxInstances);
    return { success: true, ...result };
    
  } catch (error) {
    console.error('Erro na automação paralela de servidores V2:', error);
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

// Handler para resetar caches/estado de automação
ipcMain.handle('reset-automation-caches', async () => {
  try {
    try { if (smartOJCache && typeof smartOJCache.limparCache === 'function') smartOJCache.limparCache(); } catch (e) {}
    try { if (smartDatabaseVerifier && smartDatabaseVerifier.cache && typeof smartDatabaseVerifier.cache.clear === 'function') smartDatabaseVerifier.cache.clear(); } catch (e) {}
    try { if (smartDatabaseVerifier && smartDatabaseVerifier.dbConnection) { await smartDatabaseVerifier.dbConnection.close(); smartDatabaseVerifier.isInitialized = false; } } catch (e) {}
    try { if (servidorAutomationV2 && servidorAutomationV2.ojCache) servidorAutomationV2.ojCache.clear(); } catch (e) {}
    try { if (servidorAutomationV2) servidorAutomationV2.forcedOJsNormalized = null; } catch (e) {}
    return { success: true };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para limpar cache de verificação de OJs
ipcMain.handle('limpar-cache-verificacao', async () => {
  try {
    console.log('🧹 Iniciando limpeza do cache de verificação de OJs...');

    // Limpar cache em memória se existir
    try {
      if (servidorAutomationV2 && servidorAutomationV2.smartOJCache && typeof servidorAutomationV2.smartOJCache.limparCacheCompleto === 'function') {
        await servidorAutomationV2.smartOJCache.limparCacheCompleto();
        console.log('✅ Cache em memória limpo');
      }
    } catch (e) {
      console.warn('⚠️ Erro ao limpar cache em memória:', e.message);
    }

    // Limpar arquivo de cache persistente
    try {
      const cacheFile = path.join(__dirname, '../data/smart-oj-cache.json');

      try {
        await fs.promises.unlink(cacheFile);
        console.log('✅ Arquivo de cache persistente removido');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        console.log('ℹ️ Arquivo de cache não existia');
      }
    } catch (e) {
      console.warn('⚠️ Erro ao remover arquivo de cache:', e.message);
    }

    console.log('✅ Limpeza de cache de verificação concluída com sucesso');
    return { success: true, message: 'Cache de verificação limpo com sucesso' };

  } catch (error) {
    console.error('❌ Erro ao limpar cache de verificação:', error);
    return { success: false, error: error.message };
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

// Handler para testar conexão com banco de dados
ipcMain.handle('test-database-connection', async () => {
  try {
    if (!smartDatabaseVerifier.isInitialized) {
      const initialized = await smartDatabaseVerifier.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao conectar com banco de dados' };
      }
    }
    
    const isHealthy = await smartDatabaseVerifier.dbConnection.isHealthy();
    if (isHealthy) {
      return { success: true, message: 'Conexão com banco de dados ativa' };
    } else {
      return { success: false, error: 'Conexão com banco de dados inativa' };
    }
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para obter relatório de otimização do banco
ipcMain.handle('get-database-optimization-report', async () => {
  try {
    if (!smartDatabaseVerifier.isInitialized) {
      return { success: false, error: 'Sistema de banco não inicializado' };
    }
    
    const relatorio = smartDatabaseVerifier.gerarRelatorioOtimizacao();
    return { success: true, relatorio: relatorio };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para verificar OJs de um servidor específico
ipcMain.handle('check-servidor-ojs', async (_, idUsuario, ojs) => {
  try {
    if (!smartDatabaseVerifier.isInitialized) {
      const initialized = await smartDatabaseVerifier.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao conectar com banco de dados' };
      }
    }
    
    const resultado = await smartDatabaseVerifier.verificarOJsServidor(idUsuario, ojs);
    return { success: true, resultado: resultado };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para normalizar nome de OJ
ipcMain.handle('normalize-oj-name', async (_, nomeOJ) => {
  try {
    if (!smartDatabaseVerifier.isInitialized) {
      const initialized = await smartDatabaseVerifier.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao conectar com banco de dados' };
      }
    }
    
    const ojsEncontrados = await smartDatabaseVerifier.normalizarOJ(nomeOJ);
    return { success: true, ojs: ojsEncontrados };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para salvar credenciais do banco
ipcMain.handle('save-database-credentials', async (_, credentials) => {
  try {
    // Validar credenciais obrigatórias
    if (!credentials.user || !credentials.password) {
      return { success: false, error: 'Usuário e senha são obrigatórios' };
    }

    // Atualizar credenciais no verificador
    const updated = await smartDatabaseVerifier.updateCredentials(credentials);
    
    if (updated) {
      // Salvar credenciais no arquivo de configuração (opcional)
      const configPath = path.join(__dirname, '../database-credentials.json');
      fs.writeFileSync(configPath, JSON.stringify(credentials, null, 2));
      // Atualizar credenciais também no serviço de processos
      try {
        if (processDatabaseService && processDatabaseService.dbConnection) {
          await processDatabaseService.dbConnection.updateCredentials(credentials);
        }
      } catch (e) {
        console.warn('⚠️ Falha ao atualizar credenciais no serviço de processos:', e.message);
      }
      
      return { success: true, message: 'Credenciais salvas e conexão estabelecida' };
    } else {
      return { success: false, error: 'Falha ao conectar com as credenciais fornecidas' };
    }
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para carregar credenciais do banco
ipcMain.handle('load-database-credentials', async () => {
  try {
    const configPath = path.join(__dirname, '../database-credentials.json');
    
    if (fs.existsSync(configPath)) {
      const credentials = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { success: true, credentials: credentials };
    } else {
      return { success: false, credentials: null };
    }
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// Handler para testar credenciais do banco
ipcMain.handle('test-database-credentials', async (_, credentials) => {
  try {
    // Criar verificador temporário para teste
    const tempVerifier = new SmartDatabaseVerifier(credentials);
    const initialized = await tempVerifier.initialize();
    
    if (initialized) {
      // Testar consulta simples
      const isHealthy = await tempVerifier.dbConnection.isHealthy();
      await tempVerifier.cleanup();
      
      return { success: isHealthy, message: isHealthy ? 'Credenciais válidas' : 'Conexão inativa' };
    } else {
      return { success: false, error: 'Falha ao conectar com as credenciais fornecidas' };
    }
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Erro desconhecido' };
  }
});

// ===== SISTEMA DE VERIFICAÇÃO EM TEMPO REAL =====

/**
 * Verifica status da conexão com banco em tempo real
 */
ipcMain.handle('get-database-status', async () => {
  try {
    if (!smartDatabaseVerifier) {
      return { connected: false, message: 'Sistema de banco não inicializado' };
    }

    // Inicialização preguiçosa: se não estiver inicializado, tentar agora
    if (!smartDatabaseVerifier.isInitialized) {
      try {
        const initialized = await smartDatabaseVerifier.initialize();
        if (!initialized) {
          return { connected: false, message: 'Falha ao inicializar conexão com o banco' };
        }
      } catch (e) {
        return { connected: false, message: `Erro ao inicializar banco: ${e.message}` };
      }
    }

    const isHealthy = await (smartDatabaseVerifier?.dbConnection?.isHealthy?.() || false);
    
    return {
      connected: isHealthy,
      message: isHealthy ? 'Banco conectado e funcionando' : 'Banco desconectado ou com problemas',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { 
      connected: false, 
      message: `Erro na verificação: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * Verifica OJs já cadastrados para um servidor em tempo real
 */
ipcMain.handle('verify-servidor-ojs-realtime', async (_, cpf, perfil, ojsDesejados) => {
  try {
    console.log(`🔍 Verificação em tempo real: CPF=${cpf}, Perfil=${perfil}, OJs=${ojsDesejados?.length || 0}`);
    sendStatus('info', `🧠 Verificação BD: CPF ${cpf}, ${ojsDesejados?.length || 0} OJs`, 0, 'Consultando banco de dados');

    // Verificar se CPF é válido
    if (!cpf || cpf.length < 11) {
      return {
        success: false,
        error: 'CPF inválido ou incompleto',
        databaseConnected: true
      };
    }

    // Limpar CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    // CORREÇÃO: Verificar cache persistente primeiro (SmartOJCache)
    try {
      const smartOJCache = new SmartOJCache();

      console.log(`📦 [CACHE] Verificando cache persistente para CPF ${cpfLimpo}...`);
      sendStatus('info', '📦 Verificando cache persistente...', 0, 'Cache inteligente ativo');

      const cacheCarregado = await smartOJCache.carregarCachePersistente(cpfLimpo);

      if (cacheCarregado && cacheCarregado.ojsJaVinculados && cacheCarregado.ojsJaVinculados.length > 0) {
        console.log(`📦 [CACHE] Cache encontrado! ${cacheCarregado.ojsJaVinculados.length} OJs já vinculadas`);

        // 🧠 ANÁLISE INTELIGENTE COM PERFIL
        sendStatus('info', '🧠 Fazendo análise inteligente de perfis...', 0, 'Sistema inteligente ativo');

        const ojsJaVinculadasDoCache = cacheCarregado.ojsJaVinculados.map(item => item.oj);

        // Usar o novo sistema inteligente que considera perfis
        const verificacaoInteligente = smartOJCache.verificarOJsComPerfilEmLote(
          ojsDesejados || [],
          ojsJaVinculadasDoCache,
          perfil, // Usar o perfil desejado do servidor
          (mensagem, progresso) => {
            sendStatus('info', mensagem, 0, `Análise inteligente (${progresso}%)`);
          }
        );

        const { estatisticas } = verificacaoInteligente;
        const totalParaProcessar = estatisticas.totalParaProcessar;

        // Mensagens detalhadas baseadas no resultado inteligente
        console.log(`🎯 [ANÁLISE INTELIGENTE] Resultado detalhado:`);
        console.log(`   - ✅ ${estatisticas.jaVinculadosPerfilCorreto} OJs com perfil correto (pularão automação)`);
        console.log(`   - 🔄 ${estatisticas.vinculadosPerfilDiferente} OJs com perfil diferente (${perfil})`);
        console.log(`   - ❓ ${estatisticas.vinculadosPerfilDesconhecido} OJs com perfil desconhecido`);
        console.log(`   - 🆕 ${estatisticas.paraVincular} OJs novos para vincular`);
        console.log(`   - 🎯 TOTAL para processar: ${totalParaProcessar} OJs`);

        // Status inteligente para o usuário
        if (totalParaProcessar === 0) {
          sendStatus('success',
            `🎉 Todos os ${estatisticas.totalOJs} OJs já possuem o perfil "${perfil}"!`,
            100,
            'Nenhuma automação necessária'
          );
        } else if (estatisticas.vinculadosPerfilDiferente > 0) {
          sendStatus('info',
            `🔄 ${estatisticas.vinculadosPerfilDiferente} OJs precisam atualizar perfil para "${perfil}"`,
            0,
            `${totalParaProcessar} OJs totais para processar`
          );
        } else {
          sendStatus('info',
            `🎯 ${totalParaProcessar} OJs precisam automação com perfil "${perfil}"`,
            0,
            `Economia: ${estatisticas.jaVinculadosPerfilCorreto} OJs já corretos`
          );
        }

        // Combinar todos os OJs que precisam de processamento
        const ojsParaProcessarFinal = [
          ...verificacaoInteligente.ojsVinculadosPerfilDiferente.map(item => item.oj),
          ...verificacaoInteligente.ojsVinculadosPerfilDesconhecido.map(item => item.oj),
          ...verificacaoInteligente.ojsParaVincular
        ];

        return {
          success: true,
          databaseConnected: true,
          servidorExiste: true,
          fonte: 'cache_persistente_inteligente',
          servidor: { cpf: cpfLimpo, perfil: perfil },

          // Dados inteligentes por categoria
          ojsJaCadastrados: verificacaoInteligente.ojsJaVinculadosPerfilCorreto,
          ojsComPerfilDiferente: verificacaoInteligente.ojsVinculadosPerfilDiferente,
          ojsComPerfilDesconhecido: verificacaoInteligente.ojsVinculadosPerfilDesconhecido,
          ojsNovosParaVincular: verificacaoInteligente.ojsParaVincular,

          ojsInativos: [],
          ojsParaProcessar: ojsParaProcessarFinal,

          // Estatísticas detalhadas
          totalOriginal: ojsDesejados?.length || 0,
          totalJaCadastrados: estatisticas.jaVinculadosPerfilCorreto,
          totalComPerfilDiferente: estatisticas.vinculadosPerfilDiferente,
          totalComPerfilDesconhecido: estatisticas.vinculadosPerfilDesconhecido,
          totalNovos: estatisticas.paraVincular,
          totalParaProcessar: totalParaProcessar,

          economiaEstimada: {
            tempo: Math.round(estatisticas.economiaEstimada / 1000),
            cliques: estatisticas.jaVinculadosPerfilCorreto * 3,
            ojsEvitados: estatisticas.jaVinculadosPerfilCorreto
          },

          message: totalParaProcessar === 0
            ? `✅ Todos os ${estatisticas.totalOJs} OJs já possuem o perfil "${perfil}"`
            : `🎯 ${totalParaProcessar}/${ojsDesejados?.length || 0} OJs precisam automação (${estatisticas.jaVinculadosPerfilCorreto} já corretos)`
        };
      } else {
        console.log(`📦 [CACHE] Cache não encontrado ou vazio para CPF ${cpfLimpo}`);
      }
    } catch (cacheError) {
      console.log(`⚠️ [CACHE] Erro ao verificar cache: ${cacheError.message}`);
    }

    // FALLBACK: Verificar banco de dados se cache não disponível
    console.log(`🔍 [BD] Fallback para verificação do banco de dados...`);

    // Verificar se banco está conectado
    if (!smartDatabaseVerifier || !smartDatabaseVerifier.isInitialized) {
      sendStatus('warning', '⚠️ Banco não inicializado - Tentando inicializar agora...', 0, 'Conectando ao banco');

      try {
        const initialized = await smartDatabaseVerifier.initialize();
        if (initialized) {
          sendStatus('success', '✅ Banco inicializado com sucesso!', 0, 'Continuando verificação');
        } else {
          sendStatus('error', '❌ Falha ao inicializar banco de dados', 0, 'Verifique configurações');
          return {
            success: false,
            error: 'Falha ao inicializar sistema de banco',
            databaseConnected: false
          };
        }
      } catch (initError) {
        sendStatus('error', `❌ Erro na inicialização: ${initError.message}`, 0, 'Problema de conexão');
        return {
          success: false,
          error: `Erro na inicialização do banco: ${initError.message}`,
          databaseConnected: false
        };
      }
    }

    sendStatus('info', '✅ Banco conectado - Buscando servidor por CPF', 0, 'Consultando dados');

    // Buscar servidor no banco
    const dbConnection = smartDatabaseVerifier.dbConnection;
    const resultadoServidor = await dbConnection.buscarServidorPorCPF(cpfLimpo);

    if (!resultadoServidor.existe) {
      sendStatus('warning', `⚠️ Servidor CPF ${cpf} não encontrado no BD`, 0, 'Será processado normalmente');
      return {
        success: true,
        databaseConnected: true,
        servidorExiste: false,
        message: `Servidor com CPF ${cpf} não encontrado no sistema PJE`,
        ojsJaCadastrados: [],
        ojsParaProcessar: ojsDesejados || [],
        totalOriginal: ojsDesejados?.length || 0,
        totalJaCadastrados: 0,
        totalParaProcessar: ojsDesejados?.length || 0
      };
    }

    const nomeServidor = resultadoServidor.servidor.nome || `CPF: ${cpfLimpo}`;
    sendStatus('info', `✅ Servidor encontrado: ${nomeServidor}`, 0, 'Verificando OJs cadastrados');

    // Verificar OJs cadastrados
    const verificacao = await dbConnection.verificarOJsCadastrados(
      resultadoServidor.servidor.idUsuario,
      ojsDesejados || []
    );

    sendStatus('success', `🎯 Verificação concluída: ${verificacao.ojsParaProcessar.length} para processar, ${verificacao.ojsJaCadastrados.length} já cadastrados`, 0, 'Análise finalizada');

    const resultado = {
      success: true,
      databaseConnected: true,
      servidorExiste: true,
      fonte: 'banco_dados',
      servidor: {
        idUsuario: resultadoServidor.servidor.idUsuario,
        cpf: resultadoServidor.servidor.cpf,
        totalOjsCadastrados: resultadoServidor.servidor.totalOjsCadastrados
      },
      ojsJaCadastrados: verificacao.ojsJaCadastrados,
      ojsInativos: verificacao.ojsInativos || [],
      ojsParaProcessar: verificacao.ojsParaProcessar,
      totalOriginal: verificacao.totalVerificados,
      totalJaCadastrados: verificacao.ojsJaCadastrados.length,
      totalParaProcessar: verificacao.ojsParaProcessar.length,
      economiaEstimada: {
        tempo: verificacao.ojsJaCadastrados.length * 5,
        cliques: verificacao.ojsJaCadastrados.length * 3,
        ojsEvitados: verificacao.ojsJaCadastrados.length
      },
      message: `Encontrados ${verificacao.ojsJaCadastrados.length} OJs já cadastrados de ${verificacao.totalVerificados} solicitados`
    };

    console.log(`✅ Verificação concluída: ${resultado.totalJaCadastrados} já cadastrados, ${resultado.totalParaProcessar} para processar`);
    return resultado;

  } catch (error) {
    console.error('❌ Erro na verificação em tempo real:', error);
    return {
      success: false,
      error: error.message,
      databaseConnected: smartDatabaseVerifier?.isInitialized || false
    };
  }
});

/**
 * Buscar órgãos julgadores por grau (1º ou 2º)
 */
ipcMain.handle('buscar-orgaos-julgadores', async (_, grau) => {
  try {
    console.log(`🔍 Buscando órgãos julgadores ${grau}º grau`);
    
    // Verificar se banco está conectado
    if (!smartDatabaseVerifier || !smartDatabaseVerifier.isInitialized) {
      const initialized = await smartDatabaseVerifier.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao conectar com banco de dados' };
      }
    }
    
    const dbConnection = smartDatabaseVerifier.dbConnection;
    const ojs = await dbConnection.buscarOrgaosJulgadores(grau);
    
    console.log(`✅ Encontrados ${ojs.length} órgãos julgadores ${grau}º grau`);
    
    return {
      success: true,
      data: ojs,
      grau: grau
    };
    
  } catch (error) {
    console.error(`❌ Erro ao buscar órgãos julgadores ${grau}º grau:`, error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
});

/**
 * Buscar servidores por grau com filtros
 */
ipcMain.handle('buscar-servidores', async (_, grau, filtroNome, filtroPerfil) => {
  try {
    console.log(`🔍 Buscando servidores ${grau}º grau - Nome: "${filtroNome}", Perfil: "${filtroPerfil}"`);
    
    // Verificar se banco está conectado
    if (!smartDatabaseVerifier || !smartDatabaseVerifier.isInitialized) {
      const initialized = await smartDatabaseVerifier.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao conectar com banco de dados' };
      }
    }
    
    const dbConnection = smartDatabaseVerifier.dbConnection;
    const servidores = await dbConnection.buscarServidores(grau, filtroNome, filtroPerfil);
    
    console.log(`✅ Encontrados ${servidores.length} servidores ${grau}º grau`);
    
    return {
      success: true,
      data: servidores,
      grau: grau,
      filtros: {
        nome: filtroNome,
        perfil: filtroPerfil
      }
    };
    
  } catch (error) {
    console.error(`❌ Erro ao buscar servidores ${grau}º grau:`, error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
});

// ===== HANDLERS PARA CONSULTA DE OJs DO BANCO =====

const OJDatabaseService = require('./utils/oj-database-service');
let ojDatabaseService = new OJDatabaseService();
const ProcessDatabaseService = require('./utils/process-database-service');
let processDatabaseService = new ProcessDatabaseService();

/**
 * Buscar OJs do 1º grau diretamente do banco de dados
 */
ipcMain.handle('buscar-ojs-1grau', async (_, filtro, limite) => {
  try {
    console.log(`🔍 Buscando OJs 1º grau${filtro ? ` com filtro: "${filtro}"` : ''}`);

    const ojs = await ojDatabaseService.buscarOJs1Grau(filtro, limite);

    console.log(`✅ Encontrados ${ojs.length} órgãos julgadores do 1º grau`);

    return {
      success: true,
      data: ojs,
      grau: '1',
      total: ojs.length,
      filtro: filtro || ''
    };

  } catch (error) {
    console.error('❌ Erro ao buscar OJs 1º grau:', error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
});

/**
 * Buscar OJs do 2º grau diretamente do banco de dados
 */
ipcMain.handle('buscar-ojs-2grau', async (_, filtro, limite) => {
  try {
    console.log(`🔍 Buscando OJs 2º grau${filtro ? ` com filtro: "${filtro}"` : ''}`);

    const ojs = await ojDatabaseService.buscarOJs2Grau(filtro, limite);

    console.log(`✅ Encontrados ${ojs.length} órgãos julgadores do 2º grau`);

    return {
      success: true,
      data: ojs,
      grau: '2',
      total: ojs.length,
      filtro: filtro || ''
    };

  } catch (error) {
    console.error('❌ Erro ao buscar OJs 2º grau:', error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
});

/**
 * Buscar OJs de ambos os graus
 */
ipcMain.handle('buscar-ojs-ambos-graus', async (_, filtro, limite) => {
  try {
    console.log(`🔍 Buscando OJs de ambos os graus${filtro ? ` com filtro: "${filtro}"` : ''}`);

    const resultado = await ojDatabaseService.buscarOJsAmbosGraus(filtro, limite);

    console.log(`✅ Busca concluída: ${resultado.total} órgãos encontrados`);

    return {
      success: true,
      data: resultado,
      filtro: filtro || ''
    };

  } catch (error) {
    console.error('❌ Erro ao buscar OJs de ambos os graus:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
});

// ===== HANDLERS PARA CONSULTA DE PROCESSOS =====

/**
 * Buscar histórico do processo
 */
ipcMain.handle('buscar-processo-historico', async (_, numeroProcesso, grau = '1') => {
  try {
    if (!numeroProcesso || typeof numeroProcesso !== 'string') {
      return { success: false, error: 'Número do processo inválido' };
    }
    const data = await processDatabaseService.buscarHistoricoProcesso(numeroProcesso, grau);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao buscar histórico do processo:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
});

/**
 * Buscar tarefa atual do processo
 */
ipcMain.handle('buscar-processo-tarefa-atual', async (_, numeroProcesso, grau = '1') => {
  try {
    if (!numeroProcesso || typeof numeroProcesso !== 'string') {
      return { success: false, error: 'Número do processo inválido' };
    }
    const data = await processDatabaseService.buscarTarefaAtual(numeroProcesso, grau);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao buscar tarefa atual do processo:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
});

/**
 * Buscar partes do processo
 */
ipcMain.handle('buscar-processo-partes', async (_, numeroProcesso, grau = '1') => {
  try {
    if (!numeroProcesso || typeof numeroProcesso !== 'string') {
      return { success: false, error: 'Número do processo inválido' };
    }
    const data = await processDatabaseService.buscarPartesProcesso(numeroProcesso, grau);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao buscar partes do processo:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
});

/**
 * Buscar pacote completo (tarefa atual, histórico, partes)
 */
ipcMain.handle('buscar-processo-info', async (_, numeroProcesso, grau = '1') => {
  try {
    if (!numeroProcesso || typeof numeroProcesso !== 'string') {
      return { success: false, error: 'Número do processo inválido' };
    }
    const [tarefaAtual, historico, partes] = await Promise.all([
      processDatabaseService.buscarTarefaAtual(numeroProcesso, grau).catch(e => { throw new Error('Erro na tarefa atual: ' + e.message); }),
      processDatabaseService.buscarHistoricoProcesso(numeroProcesso, grau).catch(e => { throw new Error('Erro no histórico: ' + e.message); }),
      processDatabaseService.buscarPartesProcesso(numeroProcesso, grau).catch(e => { throw new Error('Erro nas partes: ' + e.message); })
    ]);
    return { success: true, data: { tarefaAtual, historico, partes } };
  } catch (error) {
    console.error('❌ Erro ao buscar informações do processo:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
});

/**
 * Exportar lista de OJs para arquivo JSON
 */
ipcMain.handle('exportar-ojs-json', async (_, ojs, grau, filename) => {
  try {
    const exportData = ojDatabaseService.exportarParaJSON(ojs, grau);

    // Mostrar dialog para salvar arquivo
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename || `ojs-${grau}-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');

      console.log(`✅ OJs exportados para: ${result.filePath}`);

      return {
        success: true,
        filePath: result.filePath,
        totalExportados: exportData.metadata.totalRegistros
      };
    }

    return { success: false, canceled: true };

  } catch (error) {
    console.error('❌ Erro ao exportar OJs:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Testar conectividade com bancos de dados PJE
 */
ipcMain.handle('testar-conectividade-pje', async () => {
  try {
    console.log('🔍 Testando conectividade com bancos PJE...');

    const resultado = await ojDatabaseService.testarConectividade();

    console.log('✅ Teste de conectividade concluído');

    return {
      success: true,
      conectividade: resultado
    };

  } catch (error) {
    console.error('❌ Erro ao testar conectividade:', error.message);
    return {
      success: false,
      error: error.message,
      conectividade: null
    };
  }
});

/**
 * Obter estatísticas dos órgãos julgadores
 */
ipcMain.handle('obter-estatisticas-ojs', async () => {
  try {
    console.log('📊 Obtendo estatísticas dos OJs...');

    const stats = await ojDatabaseService.obterEstatisticas();

    console.log('✅ Estatísticas obtidas com sucesso');

    return {
      success: true,
      estatisticas: stats
    };

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error.message);
    return {
      success: false,
      error: error.message,
      estatisticas: null
    };
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
  const processados = vinculados + jaVinculados;
  const porcentagemSucesso = total > 0 ? Math.round((processados / total) * 100) : 0;
  
  let mensagem = `🎯 Automação de Peritos Concluída! `;
  mensagem += `${processados}/${total} OJs processados com sucesso (${porcentagemSucesso}%). `;
  
  if (vinculados > 0) {
    mensagem += `✅ ${vinculados} novos vínculos, `;
  }
  
  if (jaVinculados > 0) {
    mensagem += `ℹ️ ${jaVinculados} já vinculados, `;
  }
  
  if (naoEncontrados > 0) {
    mensagem += `⚠️ ${naoEncontrados} não encontrados, `;
  }
  
  if (comErro > 0) {
    mensagem += `❌ ${comErro} com erro, `;
  }
  
  // Remover última vírgula e espaço
  mensagem = mensagem.replace(/, $/, '. ');
  
  mensagem += `📋 Relatório detalhado disponível no painel. Navegador permanece aberto para revisão.`;
  
  if (naoEncontrados > 0 || comErro > 0) {
    mensagem += `Verifique o console para detalhes dos problemas. `;
  }
  
  mensagem += `Navegador permanece aberto para revisão.`;
  
  return mensagem;
}
