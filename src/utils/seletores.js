/**
 * Sistema hierárquico de seletores para o PJE Perito Automation
 * Implementa uma abordagem estruturada para localização de elementos
 */

class SeletorManager {
  /**
   * Seletores organizados hierarquicamente por especificidade
   */
  static SELETORES_HIERARQUICOS = {
    // Seletores mais específicos - maior probabilidade de sucesso
    especificos: {
      orgaoJulgador: [
        'mat-select[placeholder="Órgão Julgador"]',
        'select[name="idOrgaoJulgadorSelecionado"]',
        '#mat-dialog-2 mat-select[placeholder="Órgão Julgador"]',
        'pje-modal-localizacao-visibilidade mat-select[placeholder="Órgão Julgador"]',
        'mat-select[name="idOrgaoJulgadorSelecionado"]'
      ],
      botaoAdicionar: [
        'button:has-text("Adicionar Órgão Julgador ao Perito")',
        'button:has-text("Adicionar Órgão Julgador")',
        'button:has-text("Adicionar")',
        'button[title*="Adicionar"]'
      ],
      acordeonHeader: [
        'mat-expansion-panel-header:has-text("Órgãos Julgadores vinculados ao Perito")',
        'mat-expansion-panel-header:has-text("Órgãos Julgadores")',
        '.mat-expansion-panel-header:has-text("Órgãos Julgadores")'
      ]
    },
    
    // Seletores contextuais - baseados no contexto da página
    contextuais: {
      orgaoJulgador: [
        '.campo-orgao-julgador mat-select',
        '.mat-form-field.campo-orgao-julgador mat-select',
        'mat-expansion-panel:has-text("Órgão") mat-select',
        '.mat-expansion-panel-content mat-select',
        'label:has-text("Órgão Julgador") + * mat-select',
        'label:has-text("Órgão Julgador") ~ * mat-select'
      ],
      botaoAdicionar: [
        '#cdk-accordion-child-8 > div > div > button',
        'button[aria-expanded]',
        'button.mat-button-wrapper',
        'a:has-text("Adicionar")',
        '.btn:has-text("Adicionar")'
      ],
      acordeonHeader: [
        'text=Órgãos Julgadores vinculados ao Perito',
        'text=Órgãos Julgadores',
        'text=Orgãos Julgadores',
        '[data-toggle="collapse"]',
        '.panel-heading'
      ],
      acordeonHeaderByRole: [
        'button[name="Órgãos Julgadores vinculados ao Perito"]',
        'button[aria-label="Órgãos Julgadores vinculados ao Perito"]'
      ]
    },
    
    // Seletores genéricos - menor especificidade, maior cobertura
    genericos: {
      orgaoJulgador: [
        'mat-select[placeholder*="Órgão"]',
        'mat-select[placeholder*="Julgador"]',
        '[id*="orgao"] mat-select',
        '[class*="orgao"] mat-select',
        '.mat-form-field mat-select',
        'mat-select',
        'input[role="combobox"]',
        '[role="combobox"]',
        '.ng-select',
        '.select2-container',
        'select[formcontrolname="orgaoJulgadorId"]',
        'select[name="orgaoJulgadorId"]',
        '#orgaoJulgadorId',
        'select[id*="orgao"]',
        'select[id*="julgador"]',
        'select.form-control',
        'select'
      ],
      botaoAdicionar: [
        'button',
        'a.btn',
        '.btn'
      ],
      acordeonHeader: [
        'h4:has-text("Órgão")',
        'h3:has-text("Órgão")',
        'span:has-text("Órgão")',
        '[role="button"][aria-expanded="false"]:has-text("Órgão")',
        'button[aria-expanded="false"]:has-text("Órgão")'
      ]
    }
  };

  /**
   * Seletores para opções de dropdown organizados por tipo de componente
   */
  static SELETORES_OPCOES = {
    matSelect: [
      '.cdk-overlay-pane mat-option',
      'div[role="listbox"] mat-option',
      'mat-option'
    ],
    ngSelect: [
      '.ng-dropdown-panel .ng-option',
      '.ng-option'
    ],
    select2: [
      'li.select2-results__option',
      '.select2-results__option'
    ],
    generic: [
      '[role="option"]',
      'li[role="option"]',
      'div[role="option"]',
      '[id^="cdk-overlay-"] [role="option"]'
    ]
  };

  /**
   * Busca um elemento usando seletores hierárquicos
   * @param {Object} page - Instância da página Playwright
   * @param {string} tipo - Tipo do elemento (orgaoJulgador, botaoAdicionar, acordeonHeader)
   * @param {number} timeout - Timeout para cada tentativa
   * @returns {Promise<{elemento: string, seletor: string, nivel: string}>}
   */
  static async buscarElemento(page, tipo, timeout = 2000) {
    console.log(`[SeletorManager] Iniciando busca para elemento tipo: ${tipo} com timeout: ${timeout}ms`);
    
    // Para órgão julgador, primeiro tentar expandir o acordeão se necessário
    if (tipo === 'orgaoJulgador') {
      console.log('[SeletorManager] Verificando se acordeão precisa ser expandido...');
      try {
        // Tentar expandir o acordeão primeiro
        const expandido = await this.clicarBotaoOrgaosJulgadoresByRole(page, 3000);
        if (expandido) {
          console.log('[SeletorManager] Acordeão expandido, aguardando campo ser habilitado...');
          // Aguardar um pouco para o campo aparecer
          await page.waitForTimeout(1000);
          // Tentar aguardar que o mat-select seja habilitado
          await this.aguardarMatSelectHabilitado(page, 5000);
        }
      } catch (error) {
        console.log(`[SeletorManager] ⚠️ Erro ao expandir acordeão: ${error.message}`);
      }
    }
    
    const niveis = ['especificos', 'contextuais', 'genericos'];
    
    for (const nivel of niveis) {
      const seletores = this.SELETORES_HIERARQUICOS[nivel][tipo] || [];
      console.log(`[SeletorManager] Testando nível ${nivel} com ${seletores.length} seletores`);
      
      for (const seletor of seletores) {
        try {
          console.log(`[SeletorManager] Testando ${nivel}: ${seletor}`);
          
          // Verificar se a página ainda está válida
          if (page.isClosed()) {
            throw new Error('Página foi fechada durante a busca');
          }
          
          await page.waitForSelector(seletor, { timeout });
          
          // Para órgão julgador, validar contexto
          if (tipo === 'orgaoJulgador') {
            const isValid = await this.validarContextoOrgaoJulgador(page, seletor);
            if (!isValid && nivel !== 'genericos') {
              console.log(`[SeletorManager] Contexto inválido para: ${seletor}`);
              continue;
            }
          }
          
          console.log(`[SeletorManager] ✓ Elemento encontrado: ${seletor} (${nivel})`);
          return {
            elemento: seletor,
            seletor,
            nivel
          };
        } catch (error) {
          console.log(`[SeletorManager] ✗ Falhou: ${seletor} - ${error.message}`);
          
          // Se a página foi fechada, parar imediatamente
          if (error.message.includes('Target page, context or browser has been closed')) {
            throw new Error('Página foi fechada durante a busca do elemento');
          }
        }
      }
    }
    
    // Se chegou aqui e é orgaoJulgador, tentar uma última vez expandindo o acordeão
    if (tipo === 'orgaoJulgador') {
      console.log('[SeletorManager] ⚠️ Campo não encontrado, tentando expandir acordeão novamente...');
      try {
        await this.clicarBotaoOrgaosJulgadoresByRole(page, 3000);
        await page.waitForTimeout(2000);
        await this.aguardarMatSelectHabilitado(page, 5000);
        
        // Tentar buscar novamente apenas os seletores específicos
        const seletoresEspecificos = this.SELETORES_HIERARQUICOS.especificos[tipo] || [];
        for (const seletor of seletoresEspecificos) {
          try {
            await page.waitForSelector(seletor, { timeout: 3000 });
            console.log(`[SeletorManager] ✓ Elemento encontrado após expansão: ${seletor}`);
            return {
              elemento: seletor,
              seletor,
              nivel: 'especificos-retry'
            };
          } catch (error) {
            console.log(`[SeletorManager] ✗ Retry falhou: ${seletor} - ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`[SeletorManager] ✗ Erro no retry de expansão: ${error.message}`);
      }
    }
    
    throw new Error(`Elemento do tipo '${tipo}' não encontrado com nenhum seletor após ${timeout}ms por tentativa`);
  }

  /**
   * Valida se o elemento encontrado é realmente para órgão julgador
   * @param {Object} page - Instância da página
   * @param {string} seletor - Seletor do elemento
   * @returns {Promise<boolean>}
   */
  static async validarContextoOrgaoJulgador(page, seletor) {
    try {
      const contexto = await page.$eval(seletor, el => {
        const placeholder = el.getAttribute('placeholder') || '';
        const name = el.getAttribute('name') || '';
        const id = el.getAttribute('id') || '';
        const parentText = el.closest('mat-expansion-panel, .panel, .card, .form-group')?.textContent || '';
        
        return {
          placeholder: placeholder.toLowerCase(),
          name: name.toLowerCase(),
          id: id.toLowerCase(),
          parentText: parentText.toLowerCase().substring(0, 200)
        };
      });
      
      // Verificar se é realmente o campo de órgão julgador
      const isOrgaoJulgador = 
        contexto.placeholder.includes('órgão') ||
        contexto.placeholder.includes('julgador') ||
        contexto.name.includes('orgao') ||
        contexto.name.includes('julgador') ||
        contexto.id.includes('orgao') ||
        contexto.id.includes('julgador') ||
        contexto.parentText.includes('órgão') ||
        contexto.parentText.includes('julgador') ||
        seletor.toLowerCase().includes('orgao') ||
        seletor.toLowerCase().includes('órgão');
      
      console.log(`[SeletorManager] Validação contexto: ${isOrgaoJulgador}`, contexto);
      return isOrgaoJulgador;
    } catch (error) {
      console.log(`[SeletorManager] Erro na validação de contexto: ${error.message}`);
      return false;
    }
  }

  /**
   * Detecta o tipo de componente select
   * @param {string} seletor - Seletor do elemento
   * @returns {string} Tipo do componente
   */
  static detectarTipoComponente(seletor) {
    if (seletor.includes('mat-select')) return 'matSelect';
    if (seletor.includes('ng-select')) return 'ngSelect';
    if (seletor.includes('select2')) return 'select2';
    if (seletor.includes('role="combobox"') || seletor.includes('[role="combobox"]')) return 'combobox';
    if (seletor.includes('select')) return 'select';
    return 'generic';
  }

  /**
   * Clica no botão 'Órgãos Julgadores vinculados ao Perito' usando getByRole
   * @param {Object} page - Instância da página Playwright
   * @param {number} timeout - Timeout para a operação
   * @returns {Promise<boolean>} True se conseguiu clicar, false caso contrário
   */
  static async clicarBotaoOrgaosJulgadoresByRole(page, timeout = 3000) {
    try {
      console.log('[SeletorManager] Tentando clicar no botão usando getByRole...');
      
      // Tentar usando getByRole com o nome exato
      const botao = page.getByRole('button', { name: 'Órgãos Julgadores vinculados ao Perito' });
      
      // Aguardar o botão estar visível
      await botao.waitFor({ timeout });
      
      // Verificar se está visível
      if (await botao.isVisible()) {
        await botao.click();
        console.log('[SeletorManager] ✓ Clicou no botão usando getByRole');
        return true;
      }
      
      console.log('[SeletorManager] Botão não está visível');
      return false;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao clicar usando getByRole: ${error.message}`);
      return false;
    }
  }

  /**
   * Aguarda que o mat-select seja habilitado (aria-disabled='false')
   * @param {Object} page - Instância da página Playwright
   * @param {number} timeout - Timeout para a operação
   * @returns {Promise<boolean>} True se o campo foi habilitado, false caso contrário
   */
  static async aguardarMatSelectHabilitado(page, timeout = 10000) {
    try {
      console.log('[SeletorManager] Aguardando mat-select ser habilitado...');
      
      // Primeiro tentar com name="idOrgaoJulgadorSelecionado"
      try {
        await page.waitForFunction(() => {
          const el = document.querySelector('mat-select[name="idOrgaoJulgadorSelecionado"]');
          return el && el.getAttribute('aria-disabled') === 'false';
        }, { timeout });
        
        console.log('[SeletorManager] ✓ mat-select habilitado (usando name)');
        return true;
      } catch (error) {
        console.log('[SeletorManager] Tentativa com name falhou, tentando com placeholder...');
      }
      
      // Fallback para placeholder="Órgão Julgador"
      await page.waitForFunction(() => {
        const el = document.querySelector('mat-select[placeholder="Órgão Julgador"]');
        return el && el.getAttribute('aria-disabled') === 'false';
      }, { timeout });
      
      console.log('[SeletorManager] ✓ mat-select habilitado (usando placeholder)');
      return true;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao aguardar mat-select ser habilitado: ${error.message}`);
      return false;
    }
  }

  /**
   * Clica no campo "Órgão Julgador" usando locator com has-text
   * @param {Object} page - Instância da página Playwright
   * @param {number} timeout - Timeout para a operação
   * @returns {Promise<boolean>} True se conseguiu clicar, false caso contrário
   */
  static async clicarCampoOrgaoJulgador(page, timeout = 5000) {
    try {
      console.log('[SeletorManager] Tentando clicar no campo "Órgão Julgador"...');
      
      // Primeiro aguardar que o mat-select seja habilitado
      const habilitado = await this.aguardarMatSelectHabilitado(page, timeout);
      if (!habilitado) {
        console.log('[SeletorManager] ⚠️ mat-select não foi habilitado, tentando clicar mesmo assim...');
      }
      
      // Tentar clicar no mat-select usando name primeiro
      try {
        const matSelectName = page.locator('mat-select[name="idOrgaoJulgadorSelecionado"]');
        await matSelectName.waitFor({ state: 'visible', timeout: 2000 });
        await matSelectName.click();
        console.log('[SeletorManager] ✓ Clique no mat-select realizado com sucesso (usando name)');
        return true;
      } catch (error) {
        console.log('[SeletorManager] Tentativa com name falhou, tentando com placeholder...');
      }
      
      // Fallback para placeholder
      try {
        const matSelectPlaceholder = page.locator('mat-select[placeholder="Órgão Julgador"]');
        await matSelectPlaceholder.waitFor({ state: 'visible', timeout: 2000 });
        await matSelectPlaceholder.click();
        console.log('[SeletorManager] ✓ Clique no mat-select realizado com sucesso (usando placeholder)');
        return true;
      } catch (error) {
        console.log('[SeletorManager] Tentativa com placeholder falhou, tentando com label...');
      }
      
      // Fallback final para label
      await page.locator('label:has-text("Órgão Julgador")').waitFor({ state: 'visible', timeout });
      await page.locator('label:has-text("Órgão Julgador")').click();
      
      console.log('[SeletorManager] ✓ Clique no campo "Órgão Julgador" realizado com sucesso (usando label)');
      return true;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao clicar no campo "Órgão Julgador": ${error.message}`);
      return false;
    }
  }

  /**
   * Digita/seleciona OJ no campo com tratamento para autocomplete e select padrão
   * @param {Object} page - Instância da página Playwright
   * @param {string} nomeOJ - Nome do órgão julgador
   * @returns {Promise<boolean>} True se conseguiu digitar, false caso contrário
   */
  static async digitarSelecionarOJ(page, nomeOJ) {
    try {
      console.log(`[SeletorManager] Tentando digitar/selecionar OJ: ${nomeOJ}`);
      
      // Aguardar um pouco para o campo estar pronto
      await page.waitForTimeout(500);
      
      // Tentar digitar usando keyboard.type (para autocomplete)
      await page.keyboard.type(nomeOJ);
      
      console.log('[SeletorManager] ✓ Texto digitado com sucesso');
      return true;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao digitar/selecionar OJ: ${error.message}`);
      return false;
    }
  }

  /**
   * Confirma seleção com Enter
   * @param {Object} page - Instância da página Playwright
   * @returns {Promise<boolean>} True se conseguiu confirmar, false caso contrário
   */
  static async confirmarSelecaoComEnter(page) {
    try {
      console.log('[SeletorManager] Tentando confirmar seleção com Enter...');
      
      // Aguardar um pouco para a lista suspensa aparecer
      await page.waitForTimeout(500);
      
      // Pressionar Enter para confirmar
      await page.keyboard.press('Enter');
      
      console.log('[SeletorManager] ✓ Enter pressionado com sucesso');
      return true;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao pressionar Enter: ${error.message}`);
      return false;
    }
  }

  /**
   * Clica no botão "Vincular Órgão Julgador ao Perito" usando getByRole
   * @param {Object} page - Instância da página Playwright
   * @param {number} timeout - Timeout para a operação
   * @returns {Promise<boolean>} True se conseguiu clicar, false caso contrário
   */
  static async clicarBotaoVincularOJ(page, timeout = 5000) {
    try {
      console.log('[SeletorManager] Tentando clicar no botão "Vincular Órgão Julgador ao Perito" usando getByRole...');
      
      // Aguardar o botão ficar visível
      await page.getByRole('button', { name: 'Vincular Órgão Julgador ao Perito' }).waitFor({ state: 'visible', timeout });
      
      // Clicar no botão
      await page.getByRole('button', { name: 'Vincular Órgão Julgador ao Perito' }).click();
      
      console.log('[SeletorManager] ✓ Clique no botão "Vincular Órgão Julgador ao Perito" realizado com sucesso');
      return true;
    } catch (error) {
      console.log(`[SeletorManager] ✗ Erro ao clicar no botão "Vincular Órgão Julgador ao Perito": ${error.message}`);
      return false;
    }
  }

  /**
   * Busca opções de dropdown baseado no tipo de componente
   * @param {Object} page - Instância da página
   * @param {string} tipoComponente - Tipo do componente
   * @param {number} timeout - Timeout para busca
   * @returns {Promise<Array>} Lista de opções encontradas
   */
  static async buscarOpcoes(page, tipoComponente, timeout = 800) {
    const seletoresOpcoes = this.SELETORES_OPCOES[tipoComponente] || this.SELETORES_OPCOES.generic;
    
    for (const seletor of seletoresOpcoes) {
      try {
        console.log(`[SeletorManager] Buscando opções com: ${seletor}`);
        await page.waitForSelector(seletor, { timeout });
        
        const opcoes = await page.$$eval(seletor, options => 
          options.map(option => ({
            value: option.getAttribute('value') || option.textContent?.trim(),
            text: option.textContent?.trim() || ''
          })).filter(opt => opt.text)
        );
        
        if (opcoes.length > 0) {
          console.log(`[SeletorManager] ✓ Encontradas ${opcoes.length} opções`);
          return opcoes;
        }
      } catch (error) {
        console.log(`[SeletorManager] ✗ Falhou buscar opções: ${seletor} - ${error.message}`);
      }
    }
    
    return [];
  }

  /**
   * Lista todos os elementos disponíveis para debug
   * @param {Object} page - Instância da página
   * @param {string} tipo - Tipo de elemento para listar
   */
  static async listarElementosDisponiveis(page, tipo = 'select') {
    try {
      const seletorGenerico = tipo === 'select' ? 'select, mat-select, [role="combobox"]' : tipo;
      const elementos = await page.$$eval(seletorGenerico, els => 
        els.map((el, index) => ({
          index,
          tagName: el.tagName,
          id: el.id || '',
          className: el.className || '',
          placeholder: el.getAttribute('placeholder') || '',
          name: el.getAttribute('name') || '',
          textContent: (el.textContent || '').substring(0, 100)
        }))
      );
      
      console.log(`[SeletorManager] Elementos ${tipo} disponíveis:`, elementos);
      return elementos;
    } catch (error) {
      console.log(`[SeletorManager] Erro ao listar elementos: ${error.message}`);
      return [];
    }
  }
}

module.exports = SeletorManager;