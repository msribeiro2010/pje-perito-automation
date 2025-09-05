/**
 * Script de Diagnóstico - Timing de Fechamento da Página
 * Identifica exatamente quando e onde a página está sendo fechada
 */

const { chromium } = require('playwright');
const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');

async function debugPageClosureTiming() {
  console.log('🔍 === DIAGNÓSTICO: TIMING DE FECHAMENTO DA PÁGINA ===');
  
  let browser = null;
  let context = null;
  let page = null;
  let pageClosedAt = null;
  let contextClosedAt = null;
  let browserClosedAt = null;
  
  try {
    // 1. Configurar monitoramento de eventos
    console.log('\n📋 FASE 1: Configurando monitoramento de eventos...');
    
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Monitorar eventos de fechamento
    page.on('close', () => {
      pageClosedAt = new Date().toISOString();
      console.log(`❌ PÁGINA FECHADA EM: ${pageClosedAt}`);
      console.log('📍 Stack trace do fechamento da página:');
      console.trace();
    });
    
    context.on('close', () => {
      contextClosedAt = new Date().toISOString();
      console.log(`❌ CONTEXTO FECHADO EM: ${contextClosedAt}`);
      console.log('📍 Stack trace do fechamento do contexto:');
      console.trace();
    });
    
    browser.on('disconnected', () => {
      browserClosedAt = new Date().toISOString();
      console.log(`❌ NAVEGADOR DESCONECTADO EM: ${browserClosedAt}`);
      console.log('📍 Stack trace da desconexão do navegador:');
      console.trace();
    });
    
    console.log('✅ Monitoramento configurado');
    
    // 2. Testar navegação básica
    console.log('\n📋 FASE 2: Testando navegação básica...');
    await page.goto('https://pje.trf1.jus.br/pje/login.seam');
    console.log('✅ Navegação para login realizada');
    
    // Verificar se página ainda está ativa
    if (page.isClosed()) {
      console.log('❌ PÁGINA JÁ FECHADA após navegação básica!');
      return;
    }
    console.log('✅ Página ainda ativa após navegação');
    
    // 3. Simular processo de login (sem credenciais reais)
    console.log('\n📋 FASE 3: Simulando processo de login...');
    
    // Aguardar elementos de login aparecerem
    try {
      await page.waitForSelector('#username', { timeout: 10000 });
      console.log('✅ Campo de usuário encontrado');
      
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA após encontrar campo de usuário!');
        return;
      }
      
      // Simular preenchimento (sem submeter)
      await page.fill('#username', 'teste');
      console.log('✅ Campo de usuário preenchido');
      
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA após preencher usuário!');
        return;
      }
      
    } catch (error) {
      console.log(`⚠️ Erro na simulação de login: ${error.message}`);
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA durante erro de login!');
        return;
      }
    }
    
    // 4. Testar criação de instância de automação
    console.log('\n📋 FASE 4: Testando criação de instância de automação...');
    
    const automation = new ServidorAutomationV2();
    console.log('✅ Instância de automação criada');
    
    if (page.isClosed()) {
      console.log('❌ PÁGINA FECHADA após criar instância de automação!');
      return;
    }
    
    // 5. Testar inicialização do navegador na automação
    console.log('\n📋 FASE 5: Testando inicialização do navegador na automação...');
    
    try {
      // Simular inicialização sem fazer login real
      automation.browser = browser;
      automation.context = context;
      automation.page = page;
      
      console.log('✅ Navegador configurado na automação');
      
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA após configurar navegador na automação!');
        return;
      }
      
    } catch (error) {
      console.log(`⚠️ Erro na configuração da automação: ${error.message}`);
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA durante erro de configuração!');
        return;
      }
    }
    
    // 6. Testar métodos específicos que podem causar fechamento
    console.log('\n📋 FASE 6: Testando métodos específicos...');
    
    try {
      // Testar ensureBrowserActive
      console.log('🔍 Testando ensureBrowserActive...');
      await automation.ensureBrowserActive();
      console.log('✅ ensureBrowserActive executado');
      
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA após ensureBrowserActive!');
        return;
      }
      
      // Testar stabilizePage
      console.log('🔍 Testando stabilizePage...');
      await automation.stabilizePage();
      console.log('✅ stabilizePage executado');
      
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA após stabilizePage!');
        return;
      }
      
    } catch (error) {
      console.log(`⚠️ Erro nos métodos específicos: ${error.message}`);
      if (page.isClosed()) {
        console.log('❌ PÁGINA FECHADA durante erro de métodos específicos!');
        return;
      }
    }
    
    // 7. Aguardar um tempo para observar comportamento
    console.log('\n📋 FASE 7: Aguardando para observar comportamento...');
    
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (page.isClosed()) {
        console.log(`❌ PÁGINA FECHADA durante aguardo (segundo ${i})!`);
        return;
      }
      
      console.log(`⏱️ Segundo ${i}/10 - Página ainda ativa`);
    }
    
    console.log('\n✅ === DIAGNÓSTICO CONCLUÍDO SEM FECHAMENTO PREMATURO ===');
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (page && page.isClosed()) {
      console.log('❌ PÁGINA FECHADA durante erro!');
    }
    
  } finally {
    console.log('\n🧹 === LIMPEZA MANUAL ===');
    
    try {
      if (page && !page.isClosed()) {
        console.log('🧹 Fechando página manualmente...');
        await page.close();
      }
      
      if (context) {
        console.log('🧹 Fechando contexto manualmente...');
        await context.close();
      }
      
      if (browser) {
        console.log('🧹 Fechando navegador manualmente...');
        await browser.close();
      }
      
    } catch (cleanupError) {
      console.log('⚠️ Erro na limpeza:', cleanupError.message);
    }
    
    // Relatório final
    console.log('\n📊 === RELATÓRIO FINAL ===');
    console.log(`Página fechada em: ${pageClosedAt || 'Não fechada prematuramente'}`);
    console.log(`Contexto fechado em: ${contextClosedAt || 'Não fechado prematuramente'}`);
    console.log(`Navegador desconectado em: ${browserClosedAt || 'Não desconectado prematuramente'}`);
  }
}

// Executar diagnóstico
debugPageClosureTiming()
  .then(() => {
    console.log('\n🎉 Diagnóstico finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal no diagnóstico:', error);
    process.exit(1);
  });