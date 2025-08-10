async function navegarParaCadastro(page, cpf) {
  const { loadConfig } = require('./util.js');
  
  // Configurar timeout maior
  page.setDefaultTimeout(60000);
  
  const config = loadConfig();
  const baseUrl = (config.PJE_URL || 'https://pje.trt15.jus.br/primeirograu');
  const origin = (() => { try { return new URL(baseUrl).origin; } catch { return 'https://pje.trt15.jus.br'; } })();
  const cpfNumerico = (cpf || '').replace(/\D/g, '');

  console.log(`Navegando diretamente para a página de pessoa física com CPF: ${cpfNumerico}`);
  
  // Navegar diretamente para o link fornecido com o CPF específico
  const directUrl = `${origin}/pjekz/pessoa-fisica?pagina=1&tamanhoPagina=10&cpf=${cpfNumerico}&situacao=1`;
  
  try {
    await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Navegou para: ${directUrl}`);
    
    // Aguardar a página carregar completamente
    await page.waitForTimeout(400);
    
    // Verificar se a página carregou corretamente
    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);
    
    // Verificar se não foi redirecionado para login (indicaria que a sessão expirou)
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      throw new Error('Sessão expirou, foi redirecionado para login');
    }
    
    console.log('Página de pessoa física carregada com sucesso!');
    
    // Processar a página para encontrar e clicar no ícone do lápis
    await processarPaginaPessoaFisica(page, cpf);
    return;
    
  } catch (error) {
    console.log(`Erro ao navegar diretamente: ${error.message}`);
    console.log('Tentando método alternativo via menu...');
    
    // Fallback: tentar o método original via menu
    await navegarViaMenu(page, cpfNumerico);
  }
}

// Função auxiliar para navegação via menu (método original)
async function navegarViaMenu(page, cpf) {
  console.log('Procurando menu completo...');
  // Procurar e clicar no menu completo no canto superior esquerdo
  const menuSelectors = [
    'button:has-text("Menu completo")',
    'a:has-text("Menu completo")',
    'button:has-text("menu completo")',
    'a:has-text("menu completo")',
    'button[title*="Menu completo"]',
    'a[title*="Menu completo"]',
    '.menu-completo',
    '#menu-completo',
    'button:has-text("Menu")',
    'a:has-text("Menu")',
    '[onclick*="menu"]',
    '.btn:has-text("Menu")',
    'button[aria-label*="Menu"]'
  ];
  
  let menuButton = null;
  for (const selector of menuSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      menuButton = selector;
      console.log(`DEBUG: Menu completo encontrado com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor menu ${selector} não encontrado`);
    }
  }
  
  if (!menuButton) {
    // Debug: capturar todos os elementos de menu da página
    console.log('=== DEBUG: Elementos de menu disponíveis ===');
    try {
      const menuElements = await page.$$eval('button, a, [class*="menu"], [id*="menu"]', elements => 
        elements.map(el => ({
          tagName: el.tagName,
          textContent: el.textContent?.trim().substring(0, 50),
          title: el.title,
          className: el.className,
          id: el.id,
          onclick: el.onclick?.toString().substring(0, 100)
        }))
      );
      console.log('Elementos de menu encontrados:', JSON.stringify(menuElements, null, 2));
    } catch (debugError) {
      console.log('Erro ao capturar elementos de menu para debug:', debugError.message);
    }
    console.log('=== FIM DEBUG ===');
    
    throw new Error('Menu completo não encontrado na página');
  }
  
  // Clicar no menu completo
  await page.click(menuButton);
  console.log('Clicou no menu completo');
  
  // Aguardar menu abrir
  await page.waitForTimeout(200);
  
  console.log('Procurando opção "Pessoa Física" no menu...');
  // Procurar e clicar na opção "Pessoa Física"
  const pessoaFisicaSelectors = [
    'a:has-text("Pessoa Física")',
    'button:has-text("Pessoa Física")',
    'a:has-text("pessoa física")',
    'button:has-text("pessoa física")',
    'a[title*="Pessoa Física"]',
    'button[title*="Pessoa Física"]',
    'a[href*="pessoa-fisica"]',
    'button[onclick*="pessoa-fisica"]',
    '.menu-item:has-text("Pessoa Física")',
    'li:has-text("Pessoa Física") a',
    'li:has-text("Pessoa Física") button'
  ];
  
  let pessoaFisicaOption = null;
  for (const selector of pessoaFisicaSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      pessoaFisicaOption = selector;
      console.log(`DEBUG: Pessoa Física encontrada com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor Pessoa Física ${selector} não encontrado`);
    }
  }
  
  if (!pessoaFisicaOption) {
    // Debug: capturar todas as opções do menu
    console.log('=== DEBUG: Opções do menu disponíveis ===');
    try {
      const menuOptions = await page.$$eval('a, button, .menu-item, li', elements => 
        elements.map(el => ({
          tagName: el.tagName,
          textContent: el.textContent?.trim().substring(0, 50),
          href: el.href,
          title: el.title,
          className: el.className
        }))
        .filter(el => el.textContent && el.textContent.length > 0)
      );
      console.log('Opções do menu encontradas:', JSON.stringify(menuOptions, null, 2));
    } catch (debugError) {
      console.log('Erro ao capturar opções do menu para debug:', debugError.message);
    }
    console.log('=== FIM DEBUG ===');
    
    throw new Error('Opção "Pessoa Física" não encontrada no menu');
  }
  
  // Clicar na opção Pessoa Física
  await page.click(pessoaFisicaOption);
  console.log('Clicou na opção "Pessoa Física"');
  
  // Aguardar navegação para a página de Pessoa Física
  await page.waitForTimeout(400);
  
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (error) {
    await page.waitForLoadState('domcontentloaded', { timeout: 2000 });
  }
  
  // Agora navegar diretamente para a página com o CPF já filtrado
  const { loadConfig } = require('./util.js');
  const cfg = loadConfig();
  const baseUrl = (cfg.PJE_URL || 'https://pje.trt15.jus.br/primeirograu');
  const origin = (() => { try { return new URL(baseUrl).origin; } catch { return 'https://pje.trt15.jus.br'; } })();
  console.log(`Navegando para página com CPF ${cpf} filtrado...`);
  const urlComCpf = `${origin}/pjekz/pessoa-fisica?pagina=1&tamanhoPagina=10&cpf=${cpf}&situacao=1`;
  await page.goto(urlComCpf, { waitUntil: 'domcontentloaded' });
  
  await processarPaginaPessoaFisica(page, cpf);
}

// Função auxiliar para processar a página de pessoa física
async function processarPaginaPessoaFisica(page, cpf) {
  console.log('Aguardando carregamento da página com resultados...');
  
  // Aguardar página carregar completamente
  await page.waitForTimeout(1000);
  
  // Aguardar tabela aparecer com timeout otimizado
  await page.waitForSelector('table', { timeout: 8000 });
  
  // Verificar se há resultados na tabela
  console.log('Verificando se há resultados na tabela...');
  const tableRows = await page.$$('table tbody tr');
  console.log(`DEBUG: Encontradas ${tableRows.length} linhas na tabela`);
  
  if (tableRows.length === 0) {
    throw new Error(`Nenhum resultado encontrado para o CPF: ${cpf}`);
  }
  
  // Verificar se há uma mensagem de "nenhum resultado"
  const noResultsMessage = await page.$('text=Nenhum resultado encontrado');
  if (noResultsMessage) {
    throw new Error(`Perito com CPF ${cpf} não encontrado no sistema`);
  }
  
  // Procurar e clicar no ícone do lápis (editar)
  console.log('Procurando ícone de edição (lápis)...');
  
  const editSelectors = [
    // Seletores específicos para o ícone do lápis (editar) - EVITAR lixeira
    'button[title="Alterar pessoa"]',
    'a[title="Alterar pessoa"]',
    'button[title*="Editar"]:not([title*="Excluir"]):not([title*="Remover"])',
    'a[title*="Editar"]:not([title*="Excluir"]):not([title*="Remover"])',
    'button[title*="Alterar"]:not([title*="Excluir"]):not([title*="Remover"])',
    'a[title*="Alterar"]:not([title*="Excluir"]):not([title*="Remover"])',
    
    // Ícones FontAwesome específicos para edição (não exclusão)
    'i.fa-edit',
    'i.fa-pencil',
    'i.fa-pen',
    '.fa-edit',
    '.fa-pencil', 
    '.fa-pen',
    
    // Botões com ícones de edição (evitar lixeira)
    'button:has(i.fa-edit)',
    'button:has(i.fa-pencil)',
    'a:has(i.fa-edit)',
    'a:has(i.fa-pencil)',
    
    // Seletores por posição - primeiro botão/link (geralmente editar vem antes de excluir)
    'td:nth-last-child(2) button', // Penúltima coluna
    'td:nth-last-child(2) a',
    'tr td:nth-child(6) button', // Coluna específica baseada na imagem
    'tr td:nth-child(6) a',
    
    // Seletores genéricos com filtros para evitar exclusão
    'button[onclick*="editar"]:not([onclick*="excluir"]):not([onclick*="remover"])',
    'a[onclick*="editar"]:not([onclick*="excluir"]):not([onclick*="remover"])',
    'button[onclick*="alterar"]:not([onclick*="excluir"]):not([onclick*="remover"])',
    'a[onclick*="alterar"]:not([onclick*="excluir"]):not([onclick*="remover"])',
    
    // Classes específicas de edição
    '.btn-edit:not(.btn-delete):not(.btn-remove)',
    '.icon-edit:not(.icon-delete):not(.icon-remove)',
    '.edit-icon:not(.delete-icon):not(.remove-icon)',
    
    // Fallback - último recurso
    'td:last-child button:first-child',
    'td:last-child a:first-child'
  ];
  
  let editButton = null;
  
  for (const selector of editSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 1500 });
      editButton = selector;
      console.log(`DEBUG: Ícone de edição encontrado com seletor: ${selector}`);
      break;
    } catch (error) {
      console.log(`DEBUG: Seletor de edição ${selector} não encontrado`);
    }
  }
  
  if (!editButton) {
    // Debug: capturar todos os elementos clicáveis da página
    console.log('=== DEBUG: Elementos clicáveis na página ===');
    try {
      const clickableElements = await page.$$eval('button, a, [onclick]', elements => 
        elements.map(el => ({
          tagName: el.tagName,
          title: el.title,
          textContent: el.textContent?.trim().substring(0, 50),
          className: el.className,
          onclick: el.onclick?.toString().substring(0, 100),
          href: el.href
        }))
      );
      console.log('Elementos clicáveis encontrados:', JSON.stringify(clickableElements, null, 2));
    } catch (debugError) {
      console.log('Erro ao capturar elementos para debug:', debugError.message);
    }
    console.log('=== FIM DEBUG ===');
    
    throw new Error('Ícone de edição (lápis) não encontrado na página');
  }
  
  // Clicar no ícone de edição
  await page.click(editButton);
  console.log('Clicou no ícone de edição');
  
  // Aguardar carregamento da página de edição
  await page.waitForTimeout(800);
  
  // Verificar se é um Perito ou Servidor
  console.log('🔍 Verificando tipo de usuário (Perito vs Servidor)...');
  
  try {
    // Aguardar um pouco para a página carregar
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
    
    // Verificar se existe a aba "Perito"
    const abaPeritoExists = await page.locator('text=Perito').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    // Verificar se existe a aba "Servidor" ou indicações de que é um servidor
    const abaServidorExists = await page.locator('text=Servidor').first().isVisible({ timeout: 1000 }).catch(() => false);
    
    // Verificar outros indicadores de servidor
    const indicadoresServidor = [
      'text=Dados do Servidor',
      'text=Informações do Servidor', 
      'text=Cadastro de Servidor',
      'text=Servidor Público',
      'text=Matrícula',
      'text=Cargo',
      'text=Lotação'
    ];
    
    let isServidor = abaServidorExists;
    
    if (!isServidor) {
      for (const indicador of indicadoresServidor) {
        try {
          const elemento = await page.locator(indicador).first().isVisible({ timeout: 500 });
          if (elemento) {
            isServidor = true;
            console.log(`🔍 Indicador de servidor encontrado: ${indicador}`);
            break;
          }
        } catch {
          // Continuar verificando outros indicadores
        }
      }
    }
    
    if (isServidor) {
      throw new Error(`❌ ERRO: O CPF ${cpf} pertence a um SERVIDOR, não a um PERITO. Este sistema é específico para vinculação de PERITOS. Verifique o CPF informado.`);
    }
    
    if (!abaPeritoExists) {
      // Se não é servidor mas também não tem aba Perito, pode ser outro tipo de usuário
      console.log('⚠️ Aba "Perito" não encontrada. Verificando se é outro tipo de usuário...');
      
      // Capturar todas as abas disponíveis para debug
      try {
        const abasDisponiveis = await page.$$eval('[role="tab"], .tab, .nav-tab, a[href*="tab"], button[data-tab]', 
          elements => elements.map(el => el.textContent?.trim()).filter(text => text && text.length > 0)
        );
        
        if (abasDisponiveis.length > 0) {
          console.log('📋 Abas disponíveis encontradas:', abasDisponiveis);
          throw new Error(`❌ ERRO: O CPF ${cpf} não parece ser de um PERITO. Abas disponíveis: ${abasDisponiveis.join(', ')}. Verifique se o CPF está correto.`);
        }
      } catch (debugError) {
        console.log('Debug de abas falhou:', debugError.message);
      }
      
      throw new Error(`❌ ERRO: O CPF ${cpf} não possui aba "Perito" disponível. Verifique se o CPF pertence a um perito cadastrado no sistema.`);
    }
    
    console.log('✅ Confirmado: Usuário é um PERITO');
    
  } catch (error) {
    if (error.message.includes('ERRO:')) {
      throw error; // Re-lançar erros específicos de validação
    }
    console.log('⚠️ Erro na verificação de tipo de usuário:', error.message);
    // Continuar mesmo com erro na verificação, assumindo que é perito
  }
  
  // Aguardar aba Perito aparecer e clicar
  await page.waitForSelector('text=Perito', { timeout: 6000 });
  await page.click('text=Perito');
  console.log('Clicou na aba Perito');
  
  // Aguardar carregamento da aba
  await page.waitForTimeout(1000);
  
  // Aguardar página carregar completamente
  try {
    await page.waitForLoadState('networkidle', { timeout: 6000 });
  } catch (error) {
    // Se networkidle falhar, aguardar domcontentloaded
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
  }
}

module.exports = { navegarParaCadastro };
