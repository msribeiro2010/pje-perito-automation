const { chromium } = require('playwright');
const ServidorAutomationV2 = require('./src/main/servidor-automation-v2');
const ParallelOJProcessor = require('./src/main/parallel-oj-processor');

async function debugPageCloseIssue() {
  console.log('🔍 DEBUG: Iniciando investigação do fechamento de página...');
  
  let browser, context, page;
  
  try {
    // 1. Configurar browser com logs detalhados
    browser = await chromium.launch({
      headless: false,
      devtools: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // 2. Monitorar eventos de fechamento
    page.on('close', () => {
      console.log('❌ EVENTO: Página foi fechada!');
      console.trace('Stack trace do fechamento da página:');
    });
    
    context.on('close', () => {
      console.log('❌ EVENTO: Contexto foi fechado!');
      console.trace('Stack trace do fechamento do contexto:');
    });
    
    browser.on('disconnected', () => {
      console.log('❌ EVENTO: Browser foi desconectado!');
      console.trace('Stack trace da desconexão do browser:');
    });
    
    // 3. Navegar para uma página de teste
    console.log('🌐 Navegando para página de teste...');
    await page.goto('https://httpbin.org/html');
    
    console.log('✅ Página carregada com sucesso');
    
    // 4. Criar instância de automação
    console.log('🤖 Criando instância de automação...');
    const automation = new ServidorAutomationV2();
    automation.page = page;
    automation.browser = browser;
    automation.context = context;
    
    // 5. Criar instância do processador paralelo
    console.log('⚡ Criando instância do processador paralelo...');
    const processor = new ParallelOJProcessor(page, automation.timeoutManager, {});
    
    // 6. Simular operações que podem causar fechamento
    console.log('🎯 Simulando operações críticas...');
    
    // Verificar se página ainda está ativa
    console.log('📊 Status da página antes das operações:', {
      isClosed: page.isClosed(),
      url: page.url()
    });
    
    // Simular busca por elementos que podem não existir
    console.log('🔍 Testando busca por elementos inexistentes...');
    try {
      await page.waitForSelector('button:has-text("Adicionar")', { timeout: 1000 });
    } catch (error) {
      console.log('⚠️ Elemento não encontrado (esperado):', error.message);
    }
    
    // Verificar se página ainda está ativa após timeout
    console.log('📊 Status da página após timeout:', {
      isClosed: page.isClosed(),
      url: page.url()
    });
    
    // Simular múltiplas operações de retry
    console.log('🔄 Testando operações de retry...');
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/3`);
        await page.waitForSelector('[data-action="add"]', { timeout: 500 });
      } catch (error) {
        console.log(`⚠️ Tentativa ${i + 1} falhou:`, error.message);
        
        // Verificar se página foi fechada
        if (page.isClosed()) {
          console.log('❌ CRÍTICO: Página foi fechada durante retry!');
          break;
        }
      }
    }
    
    // Verificar status final
    console.log('📊 Status final da página:', {
      isClosed: page.isClosed(),
      url: page.isClosed() ? 'N/A' : page.url()
    });
    
    console.log('✅ Debug concluído - página permaneceu ativa');
    
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
debugPageCloseIssue().catch(console.error);