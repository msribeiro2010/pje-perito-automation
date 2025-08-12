async function vincularOJ(page, nomeOJ, papel = 'Diretor de Secretaria', visibilidade = 'Público') {
  // Verificar se a página está válida antes de começar
  if (page.isClosed()) {
    throw new Error('A página foi fechada antes de iniciar a vinculação');
  }
  
  // Configurar timeout otimizado para máxima velocidade
  page.setDefaultTimeout(8000);
  
  console.log(`Procurando seção de Órgãos Julgadores para vincular ${nomeOJ} com papel: ${papel}, visibilidade: ${visibilidade}...`);
  
  // Helper para garantir acordeon aberto e seção visível
  async function ensureAcordeonAberto() {
    console.log('DEBUG: Tentando abrir acordeon de Órgãos Julgadores');
    // 1) Se conteúdo já está visível, retorna
    const visible = await page.$('mat-select, [role="combobox"], select');
    if (visible) return true;

    const headerAttempts = [
      () => page.getByText('Órgãos Julgadores vinculados ao Perito', { exact: false }).first(),
      () => page.getByText('Órgãos Julgadores', { exact: false }).first(),
      () => page.getByRole('button', { name: /julgador/i }).first(),
      () => page.locator('mat-expansion-panel-header:has-text("Órg")').first(),
      () => page.locator('.mat-expansion-panel-header:has-text("Órg")').first(),
      () => page.locator('.panel-heading:has-text("Órg")').first(),
      () => page.locator('.card-header:has-text("Órg")').first(),
      () => page.locator('[data-toggle="collapse"]:has-text("Órg")').first(),
      () => page.locator('[data-bs-toggle="collapse"]:has-text("Órg")').first(),
      () => page.locator('[role="button"][aria-expanded]').first(),
    ];

    for (const factory of headerAttempts) {
      try {
        const loc = factory();
        await loc.waitFor({ timeout: 200 });
        await loc.scrollIntoViewIfNeeded({ timeout: 150 });
        const aria = await loc.getAttribute('aria-expanded').catch(() => null);
        await loc.click({ force: true });
        await page.waitForTimeout(50);
        const afterVisible = await page.$('mat-select, [role="combobox"], select');
        if (afterVisible) return true;
        // Se tinha aria-expanded, e ainda falso, clicar de novo
        if (aria === 'false') {
          await loc.click({ force: true });
          await page.waitForTimeout(50);
          const againVisible = await page.$('mat-select, [role="combobox"], select');
          if (againVisible) return true;
        }
      } catch (e) {
        // tenta próximo
      }
    }

    // 2) Heurística por XPath contendo texto 
    try {
      const candidates = await page.$$(`xpath=//*[contains(normalize-space(translate(., 'ÓÃÂÁÀÕÔÓÒÊÉÈÍÌÚÙÇ', 'oaaaaooooeeei iuu c')), 'orgaos julgadores')]`);
      if (candidates.length > 0) {
        await candidates[0].scrollIntoViewIfNeeded();
        await candidates[0].click({ force: true });
        await page.waitForTimeout(30);
        const contentVisible = await page.$('mat-select, [role="combobox"], select');
        if (contentVisible) return true;
      }
    } catch {}

    // 3) Debug: listar possíveis cabeçalhos encontrados
    try {
      const debugHeaders = await page.$$eval('h1,h2,h3,h4,button,[role="button"],[data-toggle],.panel-heading,.card-header', els => els.map(el => ({
        tag: el.tagName,
        txt: (el.textContent || '').trim().substring(0,80),
        aria: el.getAttribute('aria-expanded') || '',
        cls: el.className || ''
      })));
      console.log('DEBUG: Cabeçalhos possíveis para acordeon:', JSON.stringify(debugHeaders));
    } catch {}

    return false;
  }

  // Garantir acordeon aberto antes de prosseguir
  await ensureAcordeonAberto();

  // Tentar acionar o fluxo de inclusão (Adicionar)
  const seletoresAdicionar = [
    '#cdk-accordion-child-8 > div > div > button',
    'button[aria-expanded]',
    'button.mat-button-wrapper',
    'button:has-text("Adicionar Órgão Julgador ao Perito")',
    'button:has-text("Adicionar Órgão Julgador")',
    'button:has-text("Adicionar")',
    'a:has-text("Adicionar")',
    'button[title*="Adicionar"]',
    '.btn:has-text("Adicionar")'
  ];
  for (const s of seletoresAdicionar) {
    try {
      await page.waitForSelector(s, { timeout: 150 });
      await page.click(s);
      console.log(`Clicou no botão Adicionar usando seletor: ${s}`);
      await page.waitForTimeout(100);
      break;
    } catch {}
  }
  
  // Tentar localizar campo pelo rótulo "Órgão Julgador" e achar o controle associado
  try {
    const label = page.locator('label:has-text("Órgão Julgador")').first();
    await label.waitFor({ timeout: 150 });
    // Se existir atributo for, usar
    try {
      const forId = await label.getAttribute('for');
      if (forId) {
        const candidate = `#${forId}`;
        await page.waitForSelector(candidate, { timeout: 150 });
        console.log(`Campo associado ao label via for/id: ${candidate}`);
      }
    } catch {}
    // Buscar em contêiner pai
    const container = label.locator('..');
    const nearControl = container.locator('mat-select, [role="combobox"], select, input').first();
    await nearControl.waitFor({ timeout: 150 });
    const handle = await nearControl.elementHandle();
    if (handle) {
      const tag = await handle.evaluate(el => el.tagName.toLowerCase());
      console.log(`Controle encontrado próximo ao label: <${tag}>`);
    }
  } catch {}

  // Lista de seletores para o campo select (definida antes para tentar evitar colapsar/expandir indevidamente)
  const seletoresSelect = [
    // Seletores específicos para modal de Localização/Visibilidade
    '#mat-dialog-2 mat-select[placeholder="Órgão Julgador"]',
    'pje-modal-localizacao-visibilidade mat-select[placeholder="Órgão Julgador"]',
    '#mat-select-40',
    'mat-select[aria-labelledby*="mat-form-field-label-95"]',
    'mat-select[id="mat-select-40"]',
    // Seletores específicos baseados no HTML fornecido
    '.campo-orgao-julgador mat-select',
    '.mat-form-field.campo-orgao-julgador mat-select',
    // Priorizar seletores específicos para órgão julgador
    'mat-select[name="idOrgaoJulgadorSelecionado"]',
    'mat-select[placeholder="Órgão Julgador"]',
    'mat-select[placeholder*="Órgão"]',
    'mat-select[placeholder*="Julgador"]',
    // Seletores contextuais - dentro da seção de órgãos julgadores
    '[id*="orgao"] mat-select',
    '[class*="orgao"] mat-select',
    'mat-expansion-panel:has-text("Órgão") mat-select',
    '.mat-expansion-panel-content mat-select',
    // Seletores por proximidade com labels
    'label:has-text("Órgão Julgador") + * mat-select',
    'label:has-text("Órgão Julgador") ~ * mat-select',
    // Seletores genéricos de mat-select (menos específicos)
    '.mat-form-field mat-select',
    'mat-select',
    '.mat-select',
    'input[role="combobox"]',
    '[role="combobox"]',
    '.ng-select',
    '.select2-container',
    // Fallbacks para select tradicional
    'select[formcontrolname="orgaoJulgadorId"]',
    'select[name="orgaoJulgadorId"]',
    '#orgaoJulgadorId',
    '[name="orgaoJulgador"]',
    'select[id*="orgao"]',
    'select[id*="julgador"]',
    'select.form-control',
    '.form-group select',
    '.form-control select',
    '[aria-expanded="true"] select',
    '.dropdown select',
    '.popup select',
    '.modal select',
    'select',
    // Por último, containers genéricos (evitar)
    '#cdk-accordion-child-10 > div > div > mat-form-field > div'
  ];
  
  // Verificar se a página ainda está válida
  if (page.isClosed()) {
    throw new Error('A página foi fechada durante a execução');
  }

  // Primeiro, tentar localizar o select diretamente (se a seção já estiver expandida)
  let selectEncontrado = null;
  let seletorUsado = null;
  for (const seletor of seletoresSelect) {
    try {
      // Verificar se a página ainda está válida antes de cada tentativa
      if (page.isClosed()) {
        throw new Error('A página foi fechada durante a execução');
      }
      
      console.log(`DEBUG: Testando seletor: ${seletor}`);
      await page.waitForSelector(seletor, { timeout: 150 });
      
      // Verificar se o elemento encontrado é realmente para órgão julgador
      const elemento = await page.$(seletor);
      const contexto = await elemento.evaluate(el => {
        // Verificar atributos e contexto do elemento
        const placeholder = el.getAttribute('placeholder') || '';
        const name = el.getAttribute('name') || '';
        const id = el.getAttribute('id') || '';
        const parentText = el.closest('mat-expansion-panel, .panel, .card, .form-group')?.textContent || '';
        
        return {
          placeholder,
          name,
          id,
          parentText: parentText.substring(0, 200)
        };
      });
      
      console.log(`DEBUG: Contexto do elemento encontrado:`, JSON.stringify(contexto, null, 2));
      
      // Verificar se é realmente o campo de órgão julgador
      const isOrgaoJulgador = 
        contexto.placeholder.toLowerCase().includes('órgão') ||
        contexto.placeholder.toLowerCase().includes('julgador') ||
        contexto.name.toLowerCase().includes('orgao') ||
        contexto.name.toLowerCase().includes('julgador') ||
        contexto.parentText.toLowerCase().includes('órgão') ||
        contexto.parentText.toLowerCase().includes('julgador');
      
      if (isOrgaoJulgador || seletor.includes('orgao') || seletor.includes('Órgão')) {
        selectEncontrado = seletor;
        seletorUsado = seletor;
        console.log(`DEBUG: Campo de seleção CORRETO encontrado, seletor: ${seletor}`);
        break;
      } else {
        console.log(`DEBUG: Campo encontrado mas não é para órgão julgador, continuando...`);
      }
    } catch (e) {
      console.log(`DEBUG: Seletor ${seletor} falhou: ${e.message}`);
      
      // Se a página foi fechada, parar imediatamente
      if (e.message.includes('Target page, context or browser has been closed')) {
        throw new Error('A página foi fechada durante a busca do campo select');
      }
    }
  }

  // Se não encontrou, tentar expandir a seção e procurar novamente
  if (!selectEncontrado) {
    // Verificar se a página ainda está válida
    if (page.isClosed()) {
      throw new Error('A página foi fechada durante a execução');
    }

    // Lista de seletores para a seção de órgãos julgadores
    const seletoresSecao = [
      // Seletores específicos para Material Design expansion panel
      'mat-expansion-panel-header:has-text("Órgãos Julgadores vinculados ao Perito")',
      'mat-expansion-panel-header:has-text("Órgãos Julgadores")',
      '.mat-expansion-panel-header:has-text("Órgãos Julgadores")',
      // Seletores por texto exato
      'text=Órgãos Julgadores vinculados ao Perito',
      'text=Órgãos Julgadores',
      'text=Orgãos Julgadores',
      // Seletores genéricos
      '[data-toggle="collapse"]',
      '.panel-heading',
      'h4:has-text("Órgão")',
      'h3:has-text("Órgão")',
      'span:has-text("Órgão")',
      // Seletores por role e aria
      '[role="button"][aria-expanded="false"]:has-text("Órgão")',
      'button[aria-expanded="false"]:has-text("Órgão")'
    ];
    let expandiu = false;
    for (const seletor of seletoresSecao) {
      try {
        // Verificar se a página ainda está válida antes de cada tentativa
        if (page.isClosed()) {
          throw new Error('A página foi fechada durante a execução');
        }
        
        console.log(`DEBUG: Tentando expandir seção com seletor: ${seletor}`);
        // Tentar rolar para o elemento no viewport
        try {
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) {
              console.log(`DEBUG: Elemento encontrado, rolando para view: ${sel}`);
              el.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
          }, seletor);
        } catch {}
        await page.waitForSelector(seletor, { timeout: 250 });
        console.log(`DEBUG: Elemento encontrado, clicando: ${seletor}`);
        await page.click(seletor);
        console.log(`DEBUG: Clique realizado com sucesso no seletor: ${seletor}`);
        expandiu = true;
        break;
      } catch (e) {
        console.log(`DEBUG: Falha ao tentar seletor ${seletor}: ${e.message}`);
        
        // Se a página foi fechada, parar imediatamente
        if (e.message.includes('Target page, context or browser has been closed')) {
          throw new Error('A página foi fechada durante a execução. Verifique se não há problemas de sessão ou timeout.');
        }
      }
    }
    if (!expandiu) {
      console.log('Não foi possível garantir a expansão da seção; seguindo mesmo assim.');
    }
    await page.waitForTimeout(100);

    // Após expandir, tentar clicar em "Adicionar" novamente
    for (const s of seletoresAdicionar) {
      try {
        await page.waitForSelector(s, { timeout: 150 });
        await page.click(s);
        console.log(`Clicou em Adicionar após expandir: ${s}`);
        await page.waitForTimeout(30);
        break;
      } catch {}
    }

    // Procurar o select novamente após tentar expandir
    for (const seletor of seletoresSelect) {
      try {
        // Verificar se a página ainda está válida
        if (page.isClosed()) {
          throw new Error('A página foi fechada durante a execução');
        }
        
        await page.waitForSelector(seletor, { timeout: 250 });
        selectEncontrado = seletor;
        seletorUsado = seletor;
        console.log(`Select encontrado após expandir seção, seletor: ${seletor}`);
        break;
      } catch (e) {
        // Se a página foi fechada, parar imediatamente
        if (e.message && e.message.includes('Target page, context or browser has been closed')) {
          throw new Error('A página foi fechada durante a busca do campo select após expandir');
        }
      }
    }
  }
  
  if (!selectEncontrado) {
    // Listar todos os selects disponíveis para depuração
    console.log('Listando todos os selects disponíveis:');
    const selects = await page.$$('select');
    for (let i = 0; i < selects.length; i++) {
      const selectInfo = await selects[i].evaluate(el => ({
        id: el.id,
        name: el.name,
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 200)
      }));
      console.log(`Select ${i}:`, selectInfo);
    }
    throw new Error('Campo select de órgão julgador não encontrado');
  }
  
  console.log(`Selecionando órgão julgador: ${nomeOJ}`);
  
  // Helpers para normalização e comparação segura
  const normalize = (text) => (text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const STOP_WORDS = new Set([
    'vara','trabalho','tribunal','de','do','da','dos','das','juizado','civel','criminal','turma','regional','federal',
    'primeira','segunda','terceira','quarta','quinta','sexta','setima','oitava','nona','decima',
    'i','ii','iii','iv','v','vi','vii','viii','ix','x','0','1','2','3','4','5','6','7','8','9','a','º','ª'
  ]);

  const extractSignificantTokens = (text) => {
    const norm = normalize(text);
    return norm.split(' ').filter(tok => tok.length >= 2 && !STOP_WORDS.has(tok));
  };

  const targetNorm = normalize(nomeOJ);
  const targetTokens = extractSignificantTokens(nomeOJ);
  
  console.log(`DEBUG: Órgão normalizado: "${targetNorm}"`);
  console.log(`DEBUG: Tokens significativos: [${targetTokens.join(', ')}]`);
  
  let selecaoFeita = false;
  
  // Se for um mat-select, precisamos clicar no trigger para abrir o dropdown
  if (seletorUsado && seletorUsado.includes('mat-')) {
    console.log('DEBUG: Detectado mat-select, clicando para abrir dropdown...');
    console.log(`DEBUG: Seletor usado: ${seletorUsado}`);
    try {
      // Verificar se a página ainda está válida
      if (page.isClosed()) {
        throw new Error('A página foi fechada antes de abrir o dropdown');
      }
      
      // Preferir o trigger interno
      const trigger = `${selectEncontrado} .mat-select-trigger, ${selectEncontrado} [role="combobox"], ${selectEncontrado}`;
      console.log(`DEBUG: Tentando clicar no trigger: ${trigger}`);
      await page.click(trigger, { force: true });
      console.log('DEBUG: Clique no trigger realizado com sucesso');
    } catch (error) {
      console.log(`DEBUG: Erro no trigger, tentando seletor direto: ${error.message}`);
      
      // Se a página foi fechada, parar imediatamente
      if (error.message.includes('Target page, context or browser has been closed')) {
        throw new Error('A página foi fechada durante o clique no mat-select');
      }
      
      await page.click(selectEncontrado, { force: true });
      console.log('DEBUG: Clique direto realizado');
    }
    console.log('DEBUG: Aguardando dropdown abrir...');
    await page.waitForTimeout(50); // Aguardar dropdown abrir
    console.log('DEBUG: Timeout concluído, procurando opções...');
    
    // Procurar pelas opções do mat-select
    try {
      // Algumas implementações utilizam painéis overlay, aguardar painel visível
      const painelSelectors = ['.cdk-overlay-pane mat-option', 'div[role="listbox"] mat-option', 'mat-option'];
      let opcoes = [];
      console.log('DEBUG: Tentando encontrar opções com seletores:', painelSelectors);
      
      for (const ps of painelSelectors) {
        try {
          console.log(`DEBUG: Tentando seletor: ${ps}`);
          await page.waitForSelector(ps, { timeout: 800 });
          console.log(`DEBUG: Seletor ${ps} encontrado, capturando opções...`);
          opcoes = await page.$$eval(ps, options => 
            options.map(option => ({ value: option.getAttribute('value'), text: (option.textContent || '').trim() }))
          );
          console.log(`DEBUG: Capturadas ${opcoes.length} opções com seletor ${ps}`);
          if (opcoes.length > 0) break;
        } catch (error) {
          console.log(`DEBUG: Seletor ${ps} falhou: ${error.message}`);
        }
      }
      console.log('DEBUG: Opções mat-select disponíveis:', opcoes);
      console.log('DEBUG: Opções normalizadas:', opcoes.map(o => ({ original: o.text, normalizada: normalize(o.text || '') })));

      // Se não houver opções capturadas, tentar forçar reabertura do painel
      if (!opcoes || opcoes.length === 0) {
        console.log('Nenhuma opcão capturada no primeiro intento; reabrindo painel...');
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(50);
        try {
          const trigger = `${selectEncontrado} .mat-select-trigger, ${selectEncontrado} [role="combobox"], ${selectEncontrado}`;
          await page.click(trigger, { force: true });
          await page.waitForTimeout(150);
          opcoes = await page.$$eval('.cdk-overlay-pane mat-option, div[role="listbox"] mat-option, mat-option', options => 
            options.map(option => ({ value: option.getAttribute('value'), text: (option.textContent || '').trim() }))
          );
          console.log('Opções após reabrir painel:', opcoes);
        } catch {}
      }

      // Estratégia de correspondência segura
      const withNorm = opcoes.map(o => ({ ...o, norm: (o.text || '').normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim() }));

      // 1) Igualdade exata (normalizada)
      let candidates = withNorm.filter(o => o.norm === targetNorm || o.norm === targetNorm.replace(/\bde\b\s+/g,' '));
      console.log('DEBUG: Candidatos por igualdade exata:', candidates.map(c => c.text));

      // 2) Cobertura total de tokens significativos
        if (candidates.length === 0) {
          candidates = withNorm.filter(o => {
            const oTokens = o.norm.split(' ');
            return targetTokens.every(t => oTokens.includes(t));
          });
          console.log('DEBUG: Candidatos por tokens significativos:', candidates.map(c => c.text));
        }

      // 3) Evitar correspondências genéricas: se ainda vazio, não arriscar
      if (candidates.length === 0) {
        throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções disponíveis`);
      }

      // 4) Desambiguação: se múltiplos candidatos, não selecionar automaticamente
      if (candidates.length > 1) {
        const lista = candidates.map(c => c.text).join(' | ');
        throw new Error(`Múltiplas opções encontradas para "${nomeOJ}". Especifique melhor (ex.: incluir número da vara). Opções: ${lista}`);
      }

      const escolhido = candidates[0];
      console.log(`Selecionando opção: ${escolhido.text}`);
      await page.click(`mat-option:has-text("${escolhido.text}")`);
      await page.waitForTimeout(50);
      selecaoFeita = true;
    } catch (error) {
      console.log('Erro ao processar mat-select:', error.message);
    }
  } else if (
    (seletorUsado && (seletorUsado.includes('ng-select') || seletorUsado.includes('select2') || seletorUsado.includes('role="combobox"') || seletorUsado.includes('[role="combobox"]')))
  ) {
    // Fluxo para ng-select, select2, ou inputs com role=combobox (autocomplete)
    try {
      console.log('Detectado componente de autocomplete/combobox. Abrindo dropdown...');
      // Abrir o campo
      await page.click(selectEncontrado);
      await page.waitForTimeout(100);

      // Tentar localizar um input interno para digitar (melhora precisão)
      try {
        const innerInput = await page.$(`${selectEncontrado} input`);
        if (innerInput) {
          const searchQuery = (targetTokens.sort((a,b) => b.length - a.length)[0]) || nomeOJ;
          await innerInput.fill('');
          await innerInput.type(searchQuery, { delay: 30 });
        }
      } catch {}

      // Aguardar opções aparecerem
      const optionsSelectors = [
        '.ng-dropdown-panel .ng-option',
        '.ng-option',
        'li.select2-results__option',
        '.select2-results__option',
        '[role="option"]',
        'li[role="option"]',
        'div[role="option"]',
        '[id^="cdk-overlay-"] [role="option"]',
        'mat-option'
      ];
      let optionsFound = [];
      for (const os of optionsSelectors) {
        try {
          await page.waitForSelector(os, { timeout: 600 });
          optionsFound = await page.$$eval(os, nodes => nodes.map(n => (n.textContent || '').trim()).filter(t => t));
          if (optionsFound.length > 0) {
            console.log('Opções encontradas no dropdown:', optionsFound);
            // Mapear elementos com handle para clique confiável
            const normalized = optionsFound.map(t => ({ text: t, norm: t.normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim() }));
            let candidates = normalized.filter(o => o.norm === targetNorm || o.norm === targetNorm.replace(/\bde\b\s+/g,' '));
            if (candidates.length === 0) {
              candidates = normalized.filter(o => {
                const oTokens = o.norm.split(' ');
                return targetTokens.every(t => oTokens.includes(t));
              });
            }
            if (candidates.length === 0) {
              throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções exibidas`);
            }
            if (candidates.length > 1) {
              const lista = candidates.map(c => c.text).join(' | ');
              throw new Error(`Múltiplas opções para "${nomeOJ}". Especifique melhor. Opções: ${lista}`);
            }
            const escolhido = candidates[0];
            // Clicar pela âncora de texto
            await page.click(`${os}:has-text("${escolhido.text}")`);
            await page.waitForTimeout(30);
            selecaoFeita = true;
            break;
          }
        } catch {}
      }
    } catch (error) {
      console.log('Erro ao processar componente de autocomplete/combobox:', error.message);
    }
  } else {
    // Aguardar um pouco para o select carregar as opções
    await page.waitForTimeout(200);
    
    // Processar select tradicional
    try {
      // Listar opções disponíveis
      const opcoes = await page.$$eval(`${selectEncontrado} option`, options => 
        options.map(option => ({ value: option.value, text: (option.textContent || '').trim() }))
      );
      console.log('DEBUG: Opções select tradicional disponíveis:', opcoes);
      console.log('DEBUG: Opções normalizadas:', opcoes.map(o => ({ original: o.text, normalizada: normalize(o.text || '') })));

      const withNorm = opcoes.map(o => ({ ...o, norm: (o.text || '').normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim() }));

      // 1) Igualdade exata (normalizada)
      let candidates = withNorm.filter(o => o.norm === targetNorm || o.norm === targetNorm.replace(/\bde\b\s+/g,' '));
      console.log('DEBUG: Candidatos select tradicional por igualdade exata:', candidates.map(c => c.text));

      // 2) Cobertura total de tokens significativos
      if (candidates.length === 0) {
        candidates = withNorm.filter(o => {
          const oTokens = o.norm.split(' ');
          return targetTokens.every(t => oTokens.includes(t));
        });
        console.log('DEBUG: Candidatos select tradicional por tokens significativos:', candidates.map(c => c.text));
      }

      if (candidates.length === 0) {
        throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções disponíveis`);
      }

      if (candidates.length > 1) {
        const lista = candidates.map(c => c.text).join(' | ');
        throw new Error(`Múltiplas opções encontradas para "${nomeOJ}". Especifique melhor (ex.: incluir número da vara). Opções: ${lista}`);
      }

      const escolhido = candidates[0];
      await page.selectOption(selectEncontrado, escolhido.value);
      console.log(`Órgão julgador selecionado: ${escolhido.text}`);
      selecaoFeita = true;
    } catch (error) {
      console.log('Erro ao selecionar opção em select tradicional:', error.message);
    }
  }
  
  // Verificar se alguma seleção foi feita
  if (!selecaoFeita) {
    throw new Error(`Órgão julgador "${nomeOJ}" não encontrado nas opções disponíveis`);
  }
  
  // Aguardar modal de Localização/Visibilidade abrir
  await aguardarModalLocalizacaoVisibilidade(page);
  
  // Debug: analisar elementos após modal abrir
  await debugElementosNaPagina(page, 'APÓS MODAL ABRIR');
  
  // Configurar papel/perfil do servidor
  console.log(`Configurando papel: ${papel}...`);
  await configurarPapel(page, papel);
  
  // Configurar visibilidade
  console.log(`Configurando visibilidade: ${visibilidade}...`);
  await configurarVisibilidade(page, visibilidade);
  
  // Debug: analisar elementos após configurar campos
  await debugElementosNaPagina(page, 'APÓS CONFIGURAR CAMPOS');
  
  // Se chegou até aqui, procurar o botão de gravar/vincular
  console.log('DEBUG: Procurando botão "Gravar" para finalizar vinculação...');
  
  // Aguardar que o modal esteja totalmente carregado e os campos preenchidos
  await page.waitForTimeout(1000);
  
  // Verificar se estamos no modal correto e aguardar estabilização
  let modalConfirmado = false;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      await page.waitForSelector('text=Localização/Visibilidade', { timeout: 1000 });
      console.log('DEBUG: Modal de Localização/Visibilidade confirmado');
      modalConfirmado = true;
      break;
    } catch (e) {
      console.log(`DEBUG: Tentativa ${tentativa + 1}/5 - Modal de Localização/Visibilidade não encontrado, aguardando...`);
      await page.waitForTimeout(300);
    }
  }
  
  if (!modalConfirmado) {
    throw new Error('Modal de Localização/Visibilidade não foi encontrado após múltiplas tentativas');
  }
  
  // Lista de seletores para o botão vincular/gravar
  const seletoresBotao = [
    // Seletores prioritários para o botão "Vincular Órgão Julgador ao Perito"
    'button:has-text("Vincular Órgão Julgador ao Perito")',
    'button .mat-button-wrapper:has-text("Vincular Órgão Julgador ao Perito")',
    'button:has(.mat-button-wrapper:has-text("Vincular Órgão Julgador ao Perito"))',
    '.mat-button-wrapper:has-text("Vincular Órgão Julgador ao Perito")',
    'span.mat-button-wrapper:has-text("Vincular Órgão Julgador ao Perito")',
    // Variações do texto do botão
    'button:has-text("Vincular Orgao Julgador ao Perito")',
    'button:has-text("Vincular Órgao Julgador ao Perito")',
    'button:has-text("Vincular Orgão Julgador ao Perito")',
    // Seletores específicos para o botão "Gravar" no modal de Localização/Visibilidade
    'div[role="dialog"] button:has-text("Gravar")',
    'div[role="dialog"] button span:has-text("Gravar")',
    'mat-dialog-container button:has-text("Gravar")',
    '.mat-dialog-container button:has-text("Gravar")',
    '[aria-labelledby*="mat-dialog"] button:has-text("Gravar")',
    // Seletores específicos para o botão "Gravar"
    'button:has-text("Gravar")',
    'button .mat-button-wrapper:has-text("Gravar")',
    'button:has(.mat-button-wrapper:has-text("Gravar"))',
    '.mat-button-wrapper:has-text("Gravar")',
    'span.mat-button-wrapper:has-text("Gravar")',
    // Seletores para a estrutura específica do Angular Material
    'button:has(span.mat-button-wrapper:contains("Gravar"))',
    'button span.mat-button-wrapper:contains("Gravar")',
    'button[type="button"]:has(.mat-button-wrapper:has-text("Gravar"))',
    'button[type="submit"]:has(.mat-button-wrapper:has-text("Gravar"))',
    'input[type="submit"][value="Gravar"]',
    'input[type="button"][value="Gravar"]',
    'button[value="Gravar"]',
    '.btn:has-text("Gravar")',
    '[onclick*="gravar"]',
    'button[onclick*="gravar"]',
    'input[onclick*="gravar"]',
    // Seletores para modal de Localização/Visibilidade
    'mat-dialog-container button .mat-button-wrapper:has-text("Gravar")',
    '.mat-dialog-container button .mat-button-wrapper:has-text("Gravar")',
    '[role="dialog"] button .mat-button-wrapper:has-text("Gravar")',
    // Seletores específicos para o formulário de Localização/Visibilidade
    'form button:has-text("Gravar")',
    'form input[type="submit"][value="Gravar"]',
    'form button[type="submit"]:has-text("Gravar")',
    // Seletores para botões em containers específicos
    '.form-actions button:has-text("Gravar")',
    '.button-container button:has-text("Gravar")',
    '.actions button:has-text("Gravar")',
    // Seletores genéricos para botões de ação em modais
    'button[mat-dialog-close]',
    'button.mat-primary',
    'button.mat-raised-button',
    'mat-dialog-actions button',
    '.mat-dialog-actions button',
    'button:has-text("Vincular")',
    'button:has-text("Salvar")',
    'button:has-text("Confirmar")',
    'input[type="submit"][value*="Vincular"]',
    'button[type="submit"]',
    'input[type="button"][value*="Vincular"]',
    '.btn:has-text("Vincular")',
    '[onclick*="vincular"]',
    // Seletores mais específicos para modais
    '[role="dialog"] button[type="submit"]',
    'mat-dialog-container button[type="submit"]',
    '.mat-dialog-container button[type="submit"]'
  ];
  
  let botaoEncontrado = false;
  const inicioTentativas = Date.now();
  const timeoutMaximo = 60000; // 60 segundos máximo (aumentado para páginas lentas)
  
  for (const seletor of seletoresBotao) {
    // Verificar timeout para evitar loop infinito
    if (Date.now() - inicioTentativas > timeoutMaximo) {
      console.log('DEBUG: Timeout atingido na busca do botão Gravar');
      break;
    }
    try {
      // Verificar se a página ainda está válida
      if (page.isClosed()) {
        throw new Error('A página foi fechada durante a busca do botão vincular');
      }
      
      console.log(`DEBUG: Tentando seletor do botão gravar/vincular: ${seletor}`);
      
      // Log específico para o botão "Vincular Órgão Julgador ao Perito"
      if (seletor.includes('Vincular Órgão Julgador ao Perito') || seletor.includes('Vincular Orgao Julgador ao Perito')) {
        console.log('DEBUG: *** Tentando encontrar botão "Vincular Órgão Julgador ao Perito" ***');
      }
      
      // Verificar se o elemento existe antes de tentar clicar
      const elemento = await page.$(seletor);
      if (!elemento) {
        console.log(`DEBUG: Botão não encontrado para seletor: ${seletor}`);
        continue;
      }
      
      // Verificar se o elemento é visível e clicável
      const isVisible = await elemento.isVisible();
      const isEnabled = await elemento.isEnabled();
      
      if (!isVisible) {
        console.log(`DEBUG: Botão encontrado mas não visível para seletor: ${seletor}`);
        continue;
      }
      
      if (!isEnabled) {
        console.log(`DEBUG: Botão encontrado mas não habilitado para seletor: ${seletor}`);
        continue;
      }
      
      console.log(`DEBUG: Botão encontrado, visível e habilitado, tentando clicar...`);
      
      // Log específico quando encontrar o botão "Vincular Órgão Julgador ao Perito"
      if (seletor.includes('Vincular Órgão Julgador ao Perito') || seletor.includes('Vincular Orgao Julgador ao Perito')) {
        console.log('DEBUG: *** SUCESSO! Botão "Vincular Órgão Julgador ao Perito" encontrado e será clicado ***');
      }
      
      // Tentar diferentes estratégias de clique
      try {
        // Estratégia 1: Clique direto
        await page.click(seletor, { force: true });
        console.log(`DEBUG: Clique direto no botão realizado`);
      } catch (e1) {
        try {
          // Estratégia 2: Se for mat-button-wrapper, tentar clicar no botão pai
          if (seletor.includes('mat-button-wrapper')) {
            const botaoPai = await page.evaluate((sel) => {
              const wrapper = document.querySelector(sel);
              return wrapper ? wrapper.closest('button') : null;
            }, seletor);
            if (botaoPai) {
              await page.evaluate((wrapper) => {
                const button = wrapper.closest('button');
                if (button) button.click();
              }, elemento);
              console.log(`DEBUG: Clique no botão pai do mat-button-wrapper realizado`);
            } else {
              throw new Error('Botão pai não encontrado');
            }
          } else {
            // Estratégia 3: Clique com JavaScript
            await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (el) el.click();
            }, seletor);
            console.log(`DEBUG: Clique via JavaScript no botão realizado`);
          }
        } catch (e2) {
          try {
            // Estratégia 4: Clique com JavaScript como último recurso
            await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (el) el.click();
            }, seletor);
            console.log(`DEBUG: Clique via JavaScript (último recurso) no botão realizado`);
          } catch (e3) {
            console.log(`DEBUG: Todas as estratégias de clique no botão falharam`);
            continue;
          }
        }
      }
      
      console.log(`DEBUG: Clicou no botão "Gravar" usando seletor: ${seletor}`);
      
      // Aguardar mais tempo para a ação ser processada
      await page.waitForTimeout(1500);
      
      // Verificar múltiplas condições para confirmar sucesso
      let sucessoConfirmado = false;
      
      // Verificação 1: Modal de Localização/Visibilidade fechou
      const modalAindaPresente = await page.$('text=Localização/Visibilidade');
      if (!modalAindaPresente) {
        console.log('DEBUG: Modal de Localização/Visibilidade fechado - clique bem-sucedido');
        sucessoConfirmado = true;
      }
      
      // Verificação 2: Apareceu modal de confirmação
      const modalConfirmacao = await page.$('text=Tem certeza que deseja vincular esse Órgão Julgador ao Perito?');
      if (modalConfirmacao) {
        console.log('DEBUG: Modal de confirmação apareceu - clique bem-sucedido');
        sucessoConfirmado = true;
      }
      
      // Verificação 3: Mensagem de sucesso apareceu
      const mensagemSucesso = await page.$('text=sucesso, text=vinculado, text=vinculação');
      if (mensagemSucesso) {
        console.log('DEBUG: Mensagem de sucesso detectada - clique bem-sucedido');
        sucessoConfirmado = true;
      }
      
      // Verificação 4: Verificar se apareceu algum modal de erro ou aviso
      const modalErro = await page.$('text=erro, text=falha, text=problema');
      if (modalErro) {
        console.log('DEBUG: Modal de erro detectado após clique');
        const textoErro = await modalErro.textContent();
        console.log(`DEBUG: Texto do erro: ${textoErro}`);
      }
      
      // Verificação 5: Forçar sucesso se não há mais modal de Localização/Visibilidade
      if (!modalAindaPresente && !modalConfirmacao && !mensagemSucesso) {
        console.log('DEBUG: Modal fechou sem confirmação explícita - assumindo sucesso');
        sucessoConfirmado = true;
      }
      
      if (sucessoConfirmado) {
        botaoEncontrado = true;
        break;
      } else {
        console.log('DEBUG: Clique não teve efeito esperado, tentando próximo seletor...');
        continue;
      }
    } catch (error) {
      console.log(`DEBUG: Seletor do botão gravar/vincular ${seletor} falhou: ${error.message}`);
      
      // Se a página foi fechada, parar imediatamente
      if (error.message.includes('Target page, context or browser has been closed')) {
        throw new Error('A página foi fechada durante a busca do botão vincular');
      }
    }
  }
  
  if (!botaoEncontrado) {
    const tempoDecorrido = Date.now() - inicioTentativas;
    console.log(`DEBUG: Botão "Gravar" não encontrado após ${tempoDecorrido}ms, listando botões disponíveis:`);
    
    try {
      const botoes = await page.$$('button, input[type="submit"], input[type="button"]');
      for (let i = 0; i < Math.min(botoes.length, 10); i++) { // Limitar a 10 botões para evitar spam
        const botaoInfo = await botoes[i].evaluate(el => ({
          tagName: el.tagName,
          type: el.type,
          value: el.value,
          textContent: el.textContent?.trim().substring(0, 50), // Limitar texto
          onclick: el.onclick?.toString().substring(0, 50) // Limitar onclick
        }));
        console.log(`DEBUG: Botão ${i}:`, botaoInfo);
      }
    } catch (debugError) {
      console.log('DEBUG: Erro ao listar botões:', debugError.message);
    }
    
    const mensagemErro = tempoDecorrido >= timeoutMaximo 
      ? `Timeout de ${timeoutMaximo/1000}s atingido na busca do botão "Gravar"` 
      : 'Botão "Gravar" não encontrado no modal de Localização/Visibilidade';
    
    throw new Error(mensagemErro);
  }
  
  // Aguardar modal de confirmação aparecer
  console.log('Aguardando modal de confirmação...');
  try {
    await page.waitForSelector('text=Tem certeza que deseja vincular esse Órgão Julgador ao Perito?', { timeout: 2000 });
    console.log('Modal de confirmação detectado');
    
    // Procurar e clicar no botão "Sim"
    const seletoresSim = [
      'button:has-text("Sim")',
      'button:has-text("sim")',
      'button:has-text("SIM")',
      'input[type="button"][value="Sim"]',
      'input[type="submit"][value="Sim"]',
      '.btn:has-text("Sim")'
    ];
    
    let botaoSimEncontrado = false;
    for (const seletor of seletoresSim) {
      try {
        // Verificar se a página ainda está válida
        if (page.isClosed()) {
          throw new Error('A página foi fechada durante a confirmação');
        }
        
        console.log(`Tentando seletor do botão Sim: ${seletor}`);
        await page.waitForSelector(seletor, { timeout: 300 });
        await page.click(seletor);
        console.log(`Clicou no botão Sim usando seletor: ${seletor}`);
        botaoSimEncontrado = true;
        break;
      } catch (error) {
        console.log(`Seletor do botão Sim ${seletor} não encontrado`);
        
        // Se a página foi fechada, parar imediatamente
        if (error.message.includes('Target page, context or browser has been closed')) {
          throw new Error('A página foi fechada durante a confirmação do modal');
        }
      }
    }
    
    if (!botaoSimEncontrado) {
      console.log('Botão Sim não encontrado, listando botões do modal:');
      const botoesModal = await page.$$('button, input[type="submit"], input[type="button"]');
      for (let i = 0; i < botoesModal.length; i++) {
        const botaoInfo = await botoesModal[i].evaluate(el => ({
          tagName: el.tagName,
          type: el.type,
          value: el.value,
          textContent: el.textContent?.trim()
        }));
        console.log(`Botão modal ${i}:`, botaoInfo);
      }
      throw new Error('Botão Sim do modal não encontrado');
    }
  } catch (error) {
    console.log('Modal de confirmação não detectado ou erro:', error.message);
  }
  
  // Aguardar confirmação da vinculação e reabrir acordeon se tiver fechado
  console.log('Aguardando confirmação da vinculação...');
  try {
    await Promise.race([
      page.waitForSelector('text=sucesso', { timeout: 2000 }),
      page.waitForSelector('text=vinculado', { timeout: 2000 }),
      page.waitForSelector('text=vinculação', { timeout: 2000 }),
      page.waitForTimeout(400)
    ]);
  } catch {}

  // Reabrir acordeon de Órgãos Julgadores se tiver fechado
  const possiveisAcordeons = [
    'text=Órgãos Julgadores vinculados ao Perito',
    'text=Órgãos Julgadores',
    'text=Orgãos Julgadores',
    '[data-toggle="collapse"]',
    '.panel-heading',
    'h4:has-text("Órgão")',
    'h3:has-text("Órgão")',
    'span:has-text("Órgão")'
  ];
  let acordeonReaberto = false;
  for (const s of possiveisAcordeons) {
    try {
      await page.waitForSelector(s, { timeout: 300 });
      // Se for um acordeon, clicar para garantir que está aberto
      await page.click(s);
      acordeonReaberto = true;
      break;
    } catch {}
  }

  // Garantir que o botão/fluxo de Adicionar esteja disponível novamente para próximo vínculo
  for (const s of seletoresAdicionar) {
    try {
      await page.waitForSelector(s, { timeout: 500 });
      // Não clicar agora; apenas garantir que está visível/operacional
      break;
    } catch {}
  }

  // Pequeno intervalo para estabilidade entre vínculos
  await page.waitForTimeout(100);

  console.log('Vinculação concluída!');
}

// Função auxiliar para configurar o papel/perfil do servidor
async function configurarPapel(page, papel) {
  console.log(`DEBUG: Iniciando configuração do papel: ${papel}`);
  
  // Aguardar um pouco para garantir que a modal carregou
  await page.waitForTimeout(1000);
  
  // Timeout geral para evitar loop infinito
  const startTime = Date.now();
  const maxTimeout = 30000; // 30 segundos
  
  const seletoresPapel = [
    // Seletores específicos para modal de Localização/Visibilidade
    '#mat-dialog-2 mat-select[placeholder="Papel"]',
    'pje-modal-localizacao-visibilidade mat-select[placeholder="Papel"]',
    '#mat-select-42',
    'mat-select[aria-labelledby*="mat-form-field-label-97"]',
    'mat-select[id="mat-select-42"]',
    '.ng-tns-c181-97.mat-select-required',
    // Seletores genéricos mais amplos
    'mat-dialog-container mat-select[placeholder="Papel"]',
    '[role="dialog"] mat-select[placeholder="Papel"]',
    '.mat-dialog-container mat-select[placeholder="Papel"]',
    '.campo-papel mat-select',
    'mat-select[placeholder="Papel"]',
    '.mat-form-field.campo-papel mat-select',
    'mat-select[placeholder*="Papel"]',
    'mat-select[placeholder*="Perfil"]',
    'mat-select[placeholder*="Função"]',
    'mat-select[placeholder*="Cargo"]',
    'select[name*="papel"]',
    'select[name*="perfil"]',
    'select[name*="funcao"]',
    'select[name*="cargo"]',
    'label:has-text("Papel") + * mat-select',
    'label:has-text("Perfil") + * mat-select',
    'label:has-text("Função") + * mat-select',
    'label:has-text("Cargo") + * mat-select',
    'label:has-text("Papel") ~ * mat-select',
    'label:has-text("Perfil") ~ * mat-select',
    '.mat-form-field:has(label:has-text("Papel")) mat-select',
    '.mat-form-field:has(label:has-text("Perfil")) mat-select'
  ];
  
  for (const seletor of seletoresPapel) {
    // Verificar timeout
    if (Date.now() - startTime > maxTimeout) {
      console.log(`DEBUG: Timeout atingido (${maxTimeout}ms), interrompendo configuração de papel`);
      break;
    }
    
    try {
      console.log(`DEBUG: Tentando configurar papel com seletor: ${seletor}`);
      
      // Verificar se o elemento existe antes de tentar clicar
      const elemento = await page.$(seletor);
      if (!elemento) {
        console.log(`DEBUG: Elemento não encontrado para seletor: ${seletor}`);
        continue;
      }
      
      console.log(`DEBUG: Elemento encontrado, tentando clicar...`);
      
      // Verificar se é um mat-select
      if (seletor.includes('mat-select')) {
        // Tentar diferentes estratégias de clique
        try {
          // Estratégia 1: Clique direto
          await page.click(seletor, { force: true });
          console.log(`DEBUG: Clique direto realizado`);
        } catch (e1) {
          try {
            // Estratégia 2: Clique no trigger
            await page.click(`${seletor} .mat-select-trigger`, { force: true });
            console.log(`DEBUG: Clique no trigger realizado`);
          } catch (e2) {
            try {
              // Estratégia 3: Clique com JavaScript
              await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
              }, seletor);
              console.log(`DEBUG: Clique via JavaScript realizado`);
            } catch (e3) {
              console.log(`DEBUG: Todas as estratégias de clique falharam`);
              continue;
            }
          }
        }
        
        // Aguardar dropdown abrir
        await page.waitForTimeout(800);
        
        // Procurar pela opção do papel
        const opcoesPapel = [
          `mat-option:has-text("${papel}")`,
          `mat-option[value="${papel}"]`,
          `mat-option:has-text("Diretor de Secretaria")`,
          `mat-option:has-text("Diretor")`,
          `[role="option"]:has-text("${papel}")`,
          `[role="option"]:has-text("Diretor de Secretaria")`,
          `[role="option"]:has-text("Diretor")`
        ];
        
        let opcaoSelecionada = false;
        for (const opcao of opcoesPapel) {
          try {
            console.log(`DEBUG: Procurando opção: ${opcao}`);
            await page.waitForSelector(opcao, { timeout: 2000 });
            await page.click(opcao, { force: true });
            console.log(`DEBUG: Papel configurado com sucesso: ${papel}`);
            opcaoSelecionada = true;
            return;
          } catch (e) {
            console.log(`DEBUG: Opção ${opcao} não encontrada: ${e.message}`);
          }
        }
        
        if (!opcaoSelecionada) {
          // Listar opções disponíveis para debug
          try {
            const opcoes = await page.$$eval('mat-option, [role="option"]', options => 
              options.map(opt => opt.textContent?.trim()).filter(text => text)
            );
            console.log(`DEBUG: Opções disponíveis no dropdown:`, opcoes);
            
            // Tentar selecionar a primeira opção disponível como fallback
            if (opcoes.length > 0) {
              console.log(`DEBUG: Tentando selecionar primeira opção como fallback: ${opcoes[0]}`);
              await page.click('mat-option:first-child, [role="option"]:first-child', { force: true });
              console.log(`DEBUG: Primeira opção selecionada como fallback`);
              return;
            }
          } catch {}
          
          // Se chegou até aqui, fechar o dropdown e continuar
          console.log(`DEBUG: Fechando dropdown e continuando sem configurar visibilidade`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          return;
        }
        
      } else {
        // Select tradicional
        await page.selectOption(seletor, papel);
        console.log(`DEBUG: Papel configurado em select tradicional: ${papel}`);
        return;
      }
    } catch (error) {
      console.log(`DEBUG: Seletor de papel ${seletor} falhou: ${error.message}`);
    }
  }
  
  console.log('AVISO: Campo de papel não encontrado, continuando sem configurar...');
}

// Função auxiliar para configurar a visibilidade
async function configurarVisibilidade(page, visibilidade) {
  console.log(`DEBUG: Iniciando configuração da visibilidade: ${visibilidade}`);
  
  // Aguardar um pouco para garantir que a modal carregou
  await page.waitForTimeout(1000);
  
  // Timeout geral para evitar loop infinito
  const startTime = Date.now();
  const maxTimeout = 30000; // 30 segundos
  
  const seletoresVisibilidade = [
    // Seletores específicos para modal de Localização/Visibilidade
    '#mat-dialog-2 mat-select[placeholder="Localização"]',
    'pje-modal-localizacao-visibilidade mat-select[placeholder="Localização"]',
    '#mat-select-44',
    'mat-select[aria-labelledby*="mat-form-field-label-99"]',
    'mat-select[id="mat-select-44"]',
    // Seletores genéricos mais amplos
    'mat-dialog-container mat-select[placeholder="Localização"]',
    '[role="dialog"] mat-select[placeholder="Localização"]',
    '.mat-dialog-container mat-select[placeholder="Localização"]',
    '.campo-localizacao mat-select',
    'mat-select[placeholder="Localização"]',
    '.mat-form-field.campo-localizacao mat-select',
    'mat-select[placeholder*="Visibilidade"]',
    'mat-select[placeholder*="Localização"]',
    'select[name*="visibilidade"]',
    'select[name*="localizacao"]',
    'label:has-text("Visibilidade") + * mat-select',
    'label:has-text("Localização") + * mat-select',
    'label:has-text("Visibilidade") ~ * mat-select',
    'label:has-text("Localização") ~ * mat-select',
    '.mat-form-field:has(label:has-text("Visibilidade")) mat-select',
    '.mat-form-field:has(label:has-text("Localização")) mat-select'
  ];
  
  for (const seletor of seletoresVisibilidade) {
    // Verificar timeout
    if (Date.now() - startTime > maxTimeout) {
      console.log(`DEBUG: Timeout atingido (${maxTimeout}ms), interrompendo configuração de visibilidade`);
      break;
    }
    
    try {
      console.log(`DEBUG: Tentando configurar visibilidade com seletor: ${seletor}`);
      
      // Verificar se o elemento existe antes de tentar clicar
      const elemento = await page.$(seletor);
      if (!elemento) {
        console.log(`DEBUG: Elemento não encontrado para seletor: ${seletor}`);
        continue;
      }
      
      console.log(`DEBUG: Elemento encontrado, tentando clicar...`);
      
      // Verificar se é um mat-select
      if (seletor.includes('mat-select')) {
        // Tentar diferentes estratégias de clique
        try {
          // Estratégia 1: Clique direto
          await page.click(seletor, { force: true });
          console.log(`DEBUG: Clique direto realizado`);
        } catch (e1) {
          try {
            // Estratégia 2: Clique no trigger
            await page.click(`${seletor} .mat-select-trigger`, { force: true });
            console.log(`DEBUG: Clique no trigger realizado`);
          } catch (e2) {
            try {
              // Estratégia 3: Clique com JavaScript
              await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
              }, seletor);
              console.log(`DEBUG: Clique via JavaScript realizado`);
            } catch (e3) {
              console.log(`DEBUG: Todas as estratégias de clique falharam`);
              continue;
            }
          }
        }
        
        // Aguardar dropdown abrir
        await page.waitForTimeout(800);
        
        // Procurar pela opção de visibilidade
        const opcoesVisibilidade = [
          `mat-option:has-text("${visibilidade}")`,
          `mat-option[value="${visibilidade}"]`,
          `mat-option:has-text("Público")`,
          `mat-option:has-text("Publico")`,
          `[role="option"]:has-text("${visibilidade}")`,
          `[role="option"]:has-text("Público")`,
          `[role="option"]:has-text("Publico")`
        ];
        
        let opcaoSelecionada = false;
        for (const opcao of opcoesVisibilidade) {
          try {
            console.log(`DEBUG: Procurando opção: ${opcao}`);
            await page.waitForSelector(opcao, { timeout: 2000 });
            await page.click(opcao, { force: true });
            console.log(`DEBUG: Visibilidade configurada com sucesso: ${visibilidade}`);
            opcaoSelecionada = true;
            return;
          } catch (e) {
            console.log(`DEBUG: Opção ${opcao} não encontrada: ${e.message}`);
          }
        }
        
        if (!opcaoSelecionada) {
          // Listar opções disponíveis para debug
          try {
            const opcoes = await page.$$eval('mat-option, [role="option"]', options => 
              options.map(opt => opt.textContent?.trim()).filter(text => text)
            );
            console.log(`DEBUG: Opções disponíveis no dropdown:`, opcoes);
          } catch {}
        }
        
      } else {
        // Select tradicional
        await page.selectOption(seletor, visibilidade);
        console.log(`DEBUG: Visibilidade configurada em select tradicional: ${visibilidade}`);
        return;
      }
    } catch (error) {
      console.log(`DEBUG: Seletor de visibilidade ${seletor} falhou: ${error.message}`);
    }
  }
  
  console.log('AVISO: Campo de visibilidade não encontrado, continuando sem configurar...');
}

// Função auxiliar para aguardar a modal de Localização/Visibilidade
async function aguardarModalLocalizacaoVisibilidade(page) {
  const seletoresModal = [
    '#mat-dialog-2',
    'pje-modal-localizacao-visibilidade',
    'mat-dialog-container',
    '.mat-dialog-container',
    '[role="dialog"]',
    '.cdk-overlay-container [role="dialog"]',
    '.cdk-overlay-pane',
    'mat-dialog-content',
    // Seletores adicionais para melhor detecção
    '.mat-dialog-wrapper',
    '.mat-dialog-content',
    '[aria-labelledby*="mat-dialog"]'
  ];
  
  console.log('DEBUG: Aguardando modal de Localização/Visibilidade abrir...');
  
  // Aguardar mais tempo para modal aparecer (páginas lentas)
  await page.waitForTimeout(3000);
  
  for (const seletor of seletoresModal) {
    try {
      console.log(`DEBUG: Tentando encontrar modal com seletor: ${seletor}`);
      await page.waitForSelector(seletor, { timeout: 5000 });
      
      // Verificar se a modal realmente contém campos de papel/localização
      const temCampos = await page.evaluate((sel) => {
        const modal = document.querySelector(sel);
        if (!modal) return false;
        
        const texto = modal.textContent || '';
        return texto.toLowerCase().includes('papel') || 
               texto.toLowerCase().includes('localização') ||
               texto.toLowerCase().includes('visibilidade') ||
               modal.querySelector('mat-select[placeholder*="Papel"]') ||
               modal.querySelector('mat-select[placeholder*="Localização"]');
      }, seletor);
      
      if (temCampos) {
        console.log(`DEBUG: Modal encontrada e validada com seletor: ${seletor}`);
        
        // Aguardar um pouco para a modal carregar completamente
        await page.waitForTimeout(1500);
        return;
      } else {
        console.log(`DEBUG: Modal encontrada mas não contém os campos esperados: ${seletor}`);
      }
    } catch (error) {
      console.log(`DEBUG: Seletor de modal ${seletor} falhou: ${error.message}`);
    }
  }
  
  // Se não encontrou a modal, tentar listar todas as modais/dialogs presentes
  try {
    const modalsPresentes = await page.$$eval('[role="dialog"], mat-dialog-container, .mat-dialog-container', 
      modals => modals.map(modal => ({
        tagName: modal.tagName,
        className: modal.className,
        textContent: (modal.textContent || '').substring(0, 200)
      }))
    );
    console.log('DEBUG: Modals/dialogs presentes na página:', modalsPresentes);
  } catch {}
  
  console.log('AVISO: Modal de Localização/Visibilidade não detectada, continuando...');
}

// Função auxiliar para debug de elementos na página
async function debugElementosNaPagina(page, contexto = '') {
  try {
    console.log(`DEBUG ${contexto}: Analisando elementos na página...`);
    
    // Listar mat-selects disponíveis
    const matSelects = await page.$$eval('mat-select', selects => 
      selects.map((select, index) => ({
        index,
        placeholder: select.getAttribute('placeholder') || '',
        id: select.getAttribute('id') || '',
        className: select.className || '',
        visible: select.offsetParent !== null
      }))
    );
    console.log(`DEBUG ${contexto}: Mat-selects encontrados:`, matSelects);
    
    // Listar botões disponíveis
    const botoes = await page.$$eval('button, input[type="submit"], input[type="button"]', buttons => 
      buttons.map((btn, index) => ({
        index,
        tagName: btn.tagName,
        type: btn.type || '',
        textContent: (btn.textContent || '').trim().substring(0, 50),
        value: btn.value || '',
        className: btn.className || '',
        visible: btn.offsetParent !== null
      }))
    );
    console.log(`DEBUG ${contexto}: Botões encontrados:`, botoes);
    
    // Listar modais/dialogs
    const modals = await page.$$eval('[role="dialog"], mat-dialog-container, .mat-dialog-container', dialogs => 
      dialogs.map((dialog, index) => ({
        index,
        tagName: dialog.tagName,
        className: dialog.className || '',
        textContent: (dialog.textContent || '').substring(0, 100),
        visible: dialog.offsetParent !== null
      }))
    );
    console.log(`DEBUG ${contexto}: Modais/dialogs encontrados:`, modals);
    
  } catch (error) {
    console.log(`DEBUG ${contexto}: Erro ao analisar elementos:`, error.message);
  }
}

module.exports = { vincularOJ, debugElementosNaPagina };
