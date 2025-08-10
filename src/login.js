const { loadConfig } = require('./util.js');

async function login(page) {
  // Carregar configurações dinamicamente
  const config = loadConfig();
  const PJE_URL = config.PJE_URL || 'https://pje.trt15.jus.br/primeirograu';
  const LOGIN = config.LOGIN || '';
  const PASSWORD = config.PASSWORD || '';
  
  if (!PJE_URL || !LOGIN || !PASSWORD) {
    throw new Error('Configurações incompletas. Verifique a aba Configurações.');
  }
  
  // Aumentar timeout para 60 segundos
  page.setDefaultTimeout(60000);
  
  console.log('Navegando para página inicial do PJe...');
  await page.goto(PJE_URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 40000 
  });
  
  // Aguardar carregamento completo da página
  await page.waitForTimeout(400);
  
  console.log('Procurando botão "Entrar com PDPJ"...');
  
  // Lista de seletores específicos baseados na análise da página
  const pdpjSelectors = [
    'button[onclick="onLoginSSO();return false;"]', // Seletor específico encontrado
    'button[onclick*="onLoginSSO"]', // Alternativo
    '.btn.btn-primary[onclick*="onLoginSSO"]', // Com classe específica
    'button:has-text("Entrar com PDPJ")',
    'input[value="Entrar com PDPJ"]',
    'button[value="Entrar com PDPJ"]',
    'a:has-text("Entrar com PDPJ")',
    'button:has-text("PDPJ")',
    'input[value="PDPJ"]',
    'button[onclick*="PDPJ"]',
    'input[onclick*="PDPJ"]',
    '.btn:has-text("PDPJ")',
    '.btn:has-text("Entrar")',
    'button[class*="btn"]',
    'input[type="button"]',
    'input[type="submit"]'
  ];
  
  let buttonFound = false;
  
  for (const selector of pdpjSelectors) {
    try {
      console.log(`Tentando seletor: ${selector}`);
      await page.waitForSelector(selector, { timeout: 1500 });
      
      // Verificar se o elemento contém texto relacionado ao PDPJ
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        const value = await element.getAttribute('value');
        const onclick = await element.getAttribute('onclick');
        
        console.log(`Elemento encontrado - Texto: "${text}", Value: "${value}", Onclick: "${onclick}"`);
        
        if ((text && (text.includes('PDPJ') || text.includes('Entrar'))) || 
            (value && (value.includes('PDPJ') || value.includes('Entrar'))) || 
            (onclick && (onclick.includes('PDPJ') || onclick.includes('onLoginSSO')))) {
          await page.click(selector);
          console.log(`Clicou no botão PDPJ/SSO usando seletor: ${selector}`);
          buttonFound = true;
          break;
        }
      }
    } catch (error) {
      console.log(`Seletor ${selector} não encontrado ou erro: ${error.message}`);
    }
  }
  
  if (!buttonFound) {
    console.log('DEBUG: Nenhum botão PDPJ encontrado. Analisando a página...');
    
    // Capturar URL atual
    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);
    
    // Capturar título da página
    const title = await page.title();
    console.log(`Título da página: ${title}`);
    
    // Capturar HTML da página (primeiros 2000 caracteres)
    const html = await page.content();
    console.log(`HTML da página (primeiros 2000 chars): ${html.substring(0, 2000)}`);
    
    // Listar todos os botões
    const buttons = await page.$$('button');
    console.log(`Total de botões encontrados: ${buttons.length}`);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const value = await button.getAttribute('value');
      const onclick = await button.getAttribute('onclick');
      const className = await button.getAttribute('class');
      console.log(`Botão ${i+1}: Texto="${text}", Value="${value}", Onclick="${onclick}", Class="${className}"`);
    }
    
    // Listar todos os inputs
    const inputs = await page.$$('input');
    console.log(`Total de inputs encontrados: ${inputs.length}`);
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const value = await input.getAttribute('value');
      const onclick = await input.getAttribute('onclick');
      const className = await input.getAttribute('class');
      console.log(`Input ${i+1}: Type="${type}", Value="${value}", Onclick="${onclick}", Class="${className}"`);
    }
    
    // Listar todos os links
    const links = await page.$$('a');
    console.log(`Total de links encontrados: ${links.length}`);
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const link = links[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      const onclick = await link.getAttribute('onclick');
      const className = await link.getAttribute('class');
      console.log(`Link ${i+1}: Texto="${text}", Href="${href}", Onclick="${onclick}", Class="${className}"`);
    }
    
    throw new Error('Botão "Entrar com PDPJ" não foi encontrado na página');
  }
  
  // Aguardar um pouco após o clique para ver se há redirecionamento
  await page.waitForTimeout(400);
  
  // Verificar se houve redirecionamento
  const currentUrl = page.url();
  console.log('URL atual após clique no PDPJ:', currentUrl);
  
  // Se não houve redirecionamento, pode ser que o formulário apareça na mesma página
  if (currentUrl === PJE_URL || currentUrl.includes('login.seam')) {
    console.log('Não houve redirecionamento. Verificando se apareceu formulário de login na mesma página...');
    
    // Aguardar um pouco mais para elementos carregarem
    await page.waitForTimeout(200);
    
    // Verificar se apareceram campos de login
    const hasLoginFields = await page.evaluate(() => {
      const usernameField = document.querySelector('input[name="username"], input[id="username"], input[placeholder*="CPF"], input[placeholder*="CNPJ"]');
      const passwordField = document.querySelector('input[name="password"], input[id="password"], input[type="password"]');
      return usernameField && passwordField;
    });
    
    if (!hasLoginFields) {
      console.log('Campos de login não encontrados. Pode ser necessário aguardar mais ou o botão não funciona como esperado.');
      // Tentar aguardar por navegação mesmo assim
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 });
        console.log('Navegação detectada após aguardar');
      } catch (navError) {
        throw new Error('Botão PDPJ clicado mas não houve redirecionamento nem apareceram campos de login');
      }
    }
  } else {
    console.log('Redirecionamento detectado para:', currentUrl);
    // Se houve redirecionamento, aguardar a página carregar
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (error) {
      console.log('Erro aguardando carregamento da página, continuando...');
    }
  }
  
  console.log('Preenchendo credenciais...');
  // Preencher CPF/CNPJ
  const cpfSelectors = [
    'input[name="username"]',
    'input[id="username"]',
    'input[placeholder*="CPF"]',
    'input[placeholder*="CNPJ"]',
    'input[type="text"]:first'
  ];
  
  let cpfField = null;
  for (const selector of cpfSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      cpfField = selector;
      console.log(`DEBUG: Campo CPF encontrado com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor CPF ${selector} não encontrado`);
    }
  }
  
  if (cpfField) {
    await page.fill(cpfField, LOGIN);
    console.log('CPF preenchido');
  }
  
  // Preencher senha
  const passwordSelectors = [
    'input[name="password"]',
    'input[id="password"]',
    'input[type="password"]'
  ];
  
  let passwordField = null;
  for (const selector of passwordSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      passwordField = selector;
      console.log(`DEBUG: Campo senha encontrado com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor senha ${selector} não encontrado`);
    }
  }
  
  if (passwordField) {
    await page.fill(passwordField, PASSWORD);
    console.log('Senha preenchida');
  }
  
  console.log('Procurando botão ENTRAR...');
  // Aguardar e clicar no botão ENTRAR
  const loginSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Entrar")',
    'button:has-text("ENTRAR")',
    'input[value="Entrar"]',
    'input[value="ENTRAR"]',
    'button[name="login"]',
    'button[id="kc-login"]',
    '.btn-primary',
    '.btn:has-text("Entrar")',
    'form button[type="submit"]',
    'form input[type="submit"]'
  ];
  
  let loginButton = null;
  for (const selector of loginSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      loginButton = selector;
      console.log(`DEBUG: Botão ENTRAR encontrado com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor ENTRAR ${selector} não encontrado`);
    }
  }
  
  if (!loginButton) {
    throw new Error('Botão "ENTRAR" não encontrado na página');
  }
  
  // Clicar no botão ENTRAR
  await page.click(loginButton);
  console.log('Clicou no botão "ENTRAR"');
  
  // Aguardar login ser processado
  console.log('Aguardando login ser processado...');
  await page.waitForTimeout(800);
  
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch (error) {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  }
  
  console.log('Login realizado com sucesso!');
}

module.exports = { login };
