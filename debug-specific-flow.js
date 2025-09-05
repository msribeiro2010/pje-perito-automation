const { chromium } = require('playwright');
const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');

async function debugSpecificFlow() {
  console.log('🔍 DEBUG: Investigando fluxo específico do fechamento...');
  
  let browser, context, page, automation;
  
  try {
    // 1. Configurar browser
    browser = await chromium.launch({
      headless: false,
      devtools: false,
      args: ['--disable-web-security']
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // 2. Monitorar eventos críticos
    let pageCloseCount = 0;
    let contextCloseCount = 0;
    
    page.on('close', () => {
      pageCloseCount++;
      console.log(`❌ EVENTO ${pageCloseCount}: Página foi fechada!`);
      console.trace('Stack trace do fechamento da página:');
    });
    
    context.on('close', () => {
      contextCloseCount++;
      console.log(`❌ EVENTO ${contextCloseCount}: Contexto foi fechado!`);
      console.trace('Stack trace do fechamento do contexto:');
    });
    
    // 3. Criar automação
    automation = new ServidorAutomationV2();
    automation.browser = browser;
    automation.context = context;
    automation.page = page;
    
    // 4. Simular o fluxo real até o ponto crítico
    console.log('🎯 Simulando fluxo real até o ponto crítico...');
    
    // Navegar para uma página de teste que simula o PJE
    await page.goto('data:text/html,<html><body><h1>Teste PJE</h1><button id="add-btn">Adicionar Localização/Visibilidade</button></body></html>');
    
    console.log('✅ Página de teste carregada');
    
    // Verificar status inicial
    console.log('📊 Status inicial:', {
      isClosed: page.isClosed(),
      url: page.url(),
      pageCloseCount,
      contextCloseCount
    });
    
    // 5. Simular operações que precedem o clique no botão
    console.log('🔄 Simulando operações que precedem o clique...');
    
    // Simular navegação para aba servidor
    console.log('🎯 Simulando navigateToServerTab...');
    try {
      // Verificar se página ainda está ativa
      if (page.isClosed()) {
        console.log('❌ CRÍTICO: Página fechada durante navigateToServerTab!');
        return;
      }
      
      // Simular busca por elementos da aba servidor
      await page.waitForSelector('body', { timeout: 1000 });
      console.log('✅ navigateToServerTab simulado');
    } catch (error) {
      console.log('⚠️ Erro em navigateToServerTab:', error.message);
    }
    
    // Verificar status após navigateToServerTab
    console.log('📊 Status após navigateToServerTab:', {
      isClosed: page.isClosed(),
      pageCloseCount,
      contextCloseCount
    });
    
    // Simular processOrgaosJulgadores
    console.log('🎯 Simulando processOrgaosJulgadores...');
    try {
      if (page.isClosed()) {
        console.log('❌ CRÍTICO: Página fechada durante processOrgaosJulgadores!');
        return;
      }
      
      // Simular carregamento de OJs existentes
      await page.evaluate(() => {
        // Simular algum processamento
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      console.log('✅ processOrgaosJulgadores simulado');
    } catch (error) {
      console.log('⚠️ Erro em processOrgaosJulgadores:', error.message);
    }
    
    // Verificar status após processOrgaosJulgadores
    console.log('📊 Status após processOrgaosJulgadores:', {
      isClosed: page.isClosed(),
      pageCloseCount,
      contextCloseCount
    });
    
    // 6. Simular o momento crítico - clique no botão Adicionar
    console.log('🎯 MOMENTO CRÍTICO: Simulando clique no botão Adicionar...');
    try {
      if (page.isClosed()) {
        console.log('❌ CRÍTICO: Página fechada antes do clique no botão!');
        return;
      }
      
      // Tentar clicar no botão
      await page.click('#add-btn');
      console.log('✅ Clique no botão Adicionar realizado');
      
      // Aguardar um pouco para ver se a página fecha
      await page.waitForTimeout(1000);
      
    } catch (error) {
      console.log('⚠️ Erro no clique do botão:', error.message);
      
      if (error.message.includes('Target page, context or browser has been closed')) {
        console.log('❌ CRÍTICO: Página foi fechada durante o clique!');
      }
    }
    
    // Verificar status final
    console.log('📊 Status final:', {
      isClosed: page.isClosed(),
      pageCloseCount,
      contextCloseCount,
      url: page.isClosed() ? 'N/A' : page.url()
    });
    
    // 7. Testar métodos específicos da automação
    console.log('🔧 Testando métodos específicos da automação...');
    
    if (!page.isClosed()) {
      try {
        // Testar ensureBrowserActive
        console.log('🔍 Testando ensureBrowserActive...');
        await automation.ensureBrowserActive();
        console.log('✅ ensureBrowserActive OK');
        
        // Verificar se página ainda está ativa
        console.log('📊 Status após ensureBrowserActive:', {
          isClosed: page.isClosed(),
          pageCloseCount,
          contextCloseCount
        });
        
      } catch (error) {
        console.log('⚠️ Erro em métodos da automação:', error.message);
      }
    }
    
    console.log('✅ Debug do fluxo específico concluído');
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('🧹 Iniciando limpeza...');
    
    try {
      if (page && !page.isClosed()) {
        await page.close();
        console.log('✅ Página fechada manualmente');
      }
      
      if (context) {
        await context.close();
        console.log('✅ Contexto fechado');
      }
      
      if (browser) {
        await browser.close();
        console.log('✅ Browser fechado');
      }
    } catch (cleanupError) {
      console.error('❌ Erro na limpeza:', cleanupError.message);
    }
    
    console.log('✅ Limpeza concluída');
  }
}

// Executar debug
debugSpecificFlow().catch(console.error);