const { chromium } = require('playwright');
const https = require('https');
const http = require('http');

async function testNetworkConnectivity() {
  console.log('🌐 === TESTE DE CONECTIVIDADE DE REDE ===\n');
  
  // Teste 1: Verificar conectividade básica com HTTP/HTTPS
  console.log('📋 TESTE 1: Conectividade HTTP/HTTPS básica...');
  
  const testUrls = [
    'https://www.google.com',
    'https://pje.trf1.jus.br',
    'https://pje.trf1.jus.br/pje/login.seam'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`🔗 Testando: ${url}`);
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000
      });
      console.log(`✅ ${url} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${url} - Erro: ${error.message}`);
    }
  }
  
  console.log('\n📋 TESTE 2: Conectividade com Playwright...');
  
  let browser;
  let context;
  let page;
  
  try {
    // Configurar browser com opções de rede mais permissivas
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-certificate-errors-ssl-errors'
      ]
    });
    
    context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    
    // Configurar timeouts mais longos
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Teste com diferentes URLs
    const playwrightTestUrls = [
      'https://www.google.com',
      'https://pje.trf1.jus.br',
      'https://pje.trf1.jus.br/pje/login.seam'
    ];
    
    for (const url of playwrightTestUrls) {
      try {
        console.log(`🎭 Playwright testando: ${url}`);
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        console.log(`✅ ${url} - Status: ${response.status()}`);
        
        // Verificar se a página carregou conteúdo
        const title = await page.title();
        console.log(`📄 Título da página: ${title}`);
        
      } catch (error) {
        console.log(`❌ ${url} - Erro Playwright: ${error.message}`);
        
        // Tentar diagnóstico adicional
        if (error.message.includes('net::ERR_HTTP_RESPONSE_CODE_FAILURE')) {
          console.log('🔍 Erro específico: Falha no código de resposta HTTP');
          console.log('💡 Possíveis causas:');
          console.log('   - Servidor retornando código de erro (4xx, 5xx)');
          console.log('   - Problemas de SSL/TLS');
          console.log('   - Bloqueio por firewall ou proxy');
          console.log('   - Servidor temporariamente indisponível');
        }
      }
    }
    
    console.log('\n📋 TESTE 3: Verificação de recursos de rede...');
    
    // Verificar se há interceptadores de rede ativos
    console.log('🔍 Verificando interceptadores de rede...');
    
    // Configurar listener para requisições
    page.on('request', request => {
      console.log(`📤 Requisição: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📥 Resposta: ${response.status()} ${response.url()}`);
    });
    
    page.on('requestfailed', request => {
      console.log(`❌ Requisição falhou: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Tentar uma requisição simples com monitoramento
    try {
      console.log('🎭 Tentando requisição monitorada para Google...');
      await page.goto('https://www.google.com', { waitUntil: 'networkidle', timeout: 15000 });
      console.log('✅ Requisição monitorada bem-sucedida');
    } catch (error) {
      console.log(`❌ Requisição monitorada falhou: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste Playwright:', error.message);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
  
  console.log('\n📋 TESTE 4: Verificação do ambiente...');
  
  // Verificar variáveis de ambiente relacionadas à rede
  const networkEnvVars = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'no_proxy'
  ];
  
  console.log('🔍 Variáveis de ambiente de proxy:');
  for (const envVar of networkEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`   ${envVar}: ${value}`);
    } else {
      console.log(`   ${envVar}: (não definida)`);
    }
  }
  
  console.log('\n🎉 Diagnóstico de conectividade finalizado');
}

// Executar o teste
testNetworkConnectivity().catch(console.error);