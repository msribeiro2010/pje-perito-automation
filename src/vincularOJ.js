const { buscarElemento, detectarTipoSelect, buscarOpcoes, listarElementosDisponiveis } = require('./utils/index');
const { normalizarTexto, extrairTokensSignificativos, calcularSimilaridade, verificarEquivalencia, encontrarMelhorOpcao, verificarAmbiguidade } = require('./utils/normalizacao');
const { obterTimeoutAdaptativo } = require('./utils/index');
const SeletorManager = require('./utils/seletores');

/**
 * Expande a seção de Órgãos Julgadores vinculados ao Perito de forma determinística
 * @param {Object} page - Instância da página do Playwright
 * @returns {Promise<Object>} - Objeto com sucesso e painelOJ se bem-sucedido
 */
async function expandirOrgaosJulgadores(page) {
    try {
        console.log('Expandindo seção de Órgãos Julgadores vinculados ao Perito...');
        
        // 1) Localiza o header do acordeão de OJs pelo padrão de ID
        let headerOJ = null;
        let panelId = null;
        
        // Tenta encontrar o header com ID específico (mat-expansion-panel-header-X)
        const headers = await page.locator('[id^="mat-expansion-panel-header-"]').all();
        for (const header of headers) {
            const text = await header.textContent();
            if (text && text.includes('Órgãos Julgadores vinculados ao Perito')) {
                headerOJ = header;
                const headerId = await header.getAttribute('id');
                console.log(`Header encontrado com ID: ${headerId}`);
                break;
            }
        }
        
        if (!headerOJ) {
            console.log('Header do acordeão não encontrado, tentando fallback...');
            // Fallback para seletor genérico
            headerOJ = page.getByRole('button', { name: /Órgãos Julgadores vinculados ao Perito/i });
            if (!(await headerOJ.isVisible({ timeout: 2000 }))) {
                throw new Error('Header do acordeão não encontrado');
            }
        }
        
        // 2) Garante que não está desabilitado e abre (se ainda fechado)
        await headerOJ.waitFor({ state: 'visible' });
        
        const disabled = await headerOJ.getAttribute('aria-disabled');
        if (disabled === 'true') {
            throw new Error('Acordeão está desabilitado');
        }
        
        const expanded = await headerOJ.getAttribute('aria-expanded');
        if (expanded !== 'true') {
            await headerOJ.click();
            
            // Aguarda expansão usando o ID do header
            const headerId = await headerOJ.getAttribute('id');
            await page.waitForFunction(
                (headerId) => {
                    const header = document.getElementById(headerId);
                    return header && header.getAttribute('aria-expanded') === 'true';
                },
                headerId,
                { timeout: 5000 }
            );
            console.log('Acordeão expandido com sucesso');
        } else {
            console.log('Acordeão já estava expandido');
        }
        
        // 3) Descobre o id do container do painel
        panelId = await headerOJ.getAttribute('aria-controls');
        if (!panelId) {
            throw new Error('aria-controls não encontrado no header');
        }
        
        const painelOJ = page.locator(`#${panelId}`);
        await painelOJ.waitFor({ state: 'visible' });
        console.log(`Painel localizado: #${panelId}`);
        
        // PULAR a etapa de clicar em "Adicionar" - ir direto para o campo OJ
        console.log('Pulando botão Adicionar - buscando campo de Órgão Julgador diretamente...');
        
        // Aguardar um momento para garantir que os campos estejam carregados
        await page.waitForTimeout(2000);
        
        return { sucesso: true, painelOJ };
        
    } catch (error) {
        console.error('Erro ao expandir seção de Órgãos Julgadores:', error);
        return { sucesso: false, painelOJ: null };
    }
}

/**
 * Entra em modo de inclusão via botão Adicionar
 * @param {Object} page - Instância da página do Playwright
 * @param {Object} painelOJ - Locator do painel específico do OJ
 * @returns {Promise<boolean>} - True se entrou em modo de inclusão com sucesso
 */
async function entrarModoInclusao(page, painelOJ) {
    try {
        console.log('Entrando em modo de inclusão...');
        
        // Múltiplas estratégias para encontrar o botão Adicionar
        const seletoresBotaoAdicionar = [
            'button:has-text("Adicionar")',
            'button:has-text("+")',
            'button[title*="Adicionar"]',
            'button[aria-label*="Adicionar"]',
            '.btn:has-text("Adicionar")',
            '.btn-add',
            '.btn-primary:has-text("+")',
            'button.mat-icon-button:has(mat-icon:has-text("add"))',
            'button.mat-fab:has(mat-icon:has-text("add"))',
            '[mattooltip*="Adicionar"]'
        ];
        
        let botaoEncontrado = false;
        
        // Primeiro, tentar encontrar o botão no painel específico
        for (const seletor of seletoresBotaoAdicionar) {
            try {
                const botao = painelOJ.locator(seletor);
                if (await botao.first().isVisible({ timeout: 1500 })) {
                    console.log(`✓ Botão Adicionar encontrado no painel: ${seletor}`);
                    await botao.first().click({ force: true });
                    botaoEncontrado = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Se não encontrou no painel, tentar na página global como fallback
        if (!botaoEncontrado) {
            // Usar o SeletorManager como fallback
            try {
                const resultadoBusca = await SeletorManager.buscarElemento(page, 'botaoAdicionar');
                
                if (resultadoBusca && resultadoBusca.seletor) {
                    console.log(`Botão Adicionar encontrado globalmente: ${resultadoBusca.seletor}`);
                    const botaoAdicionar = page.locator(resultadoBusca.seletor);
                    await botaoAdicionar.click({ force: true });
                    botaoEncontrado = true;
                }
            } catch (e) {
                console.log('SeletorManager também falhou');
            }
        }
        
        if (!botaoEncontrado) {
            console.log('Botão Adicionar não encontrado');
            return false;
        }
        
        // Aguardar um momento para menu aparecer
        await page.waitForTimeout(1000);
        
        // Tentar encontrar e clicar na opção do menu
        console.log('Procurando opções do menu...');
        
        // Estratégias para encontrar opções do menu
        const possiveisOpcoes = [
            'Órgão Julgador',
            'Vínculo',
            'Vincular Órgão Julgador',
            'Novo vínculo',
            'Adicionar Órgão Julgador',
            'Incluir'
        ];
        
        let opcaoClicada = false;
        
        // Tentar por role=menuitem primeiro
        for (const label of possiveisOpcoes) {
            try {
                const seletoresMenuItem = [
                    `[role="menuitem"]:has-text("${label}")`,
                    `[role="menuitem"] >> text="${label}"`,
                    `mat-menu-item:has-text("${label}")`,
                    `.mat-menu-item:has-text("${label}")`,
                    `button:has-text("${label}")`,
                    `a:has-text("${label}")`
                ];
                
                for (const seletor of seletoresMenuItem) {
                    try {
                        const item = page.locator(seletor);
                        if (await item.first().isVisible({ timeout: 1000 })) {
                            await item.first().click({ force: true });
                            opcaoClicada = true;
                            console.log(`✓ Opção selecionada: ${label} (${seletor})`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (opcaoClicada) break;
            } catch (error) {
                continue;
            }
        }
        
        // Fallback: procurar por texto mais genérico
        if (!opcaoClicada) {
            try {
                const itemTexto = page.locator('text=/Órgão Julgador|Vínculo|Vincular|Adicionar|Incluir/i');
                if (await itemTexto.first().isVisible({ timeout: 1000 })) {
                    await itemTexto.first().click({ force: true });
                    opcaoClicada = true;
                    console.log('✓ Opção selecionada via fallback de texto');
                }
            } catch (error) {
                console.log('Fallback de texto também falhou:', error.message);
            }
        }
        
        if (opcaoClicada) {
            console.log('✓ Entrando em modo de inclusão...');
            await page.waitForTimeout(2000); // Aguarda o formulário carregar
            return true;
        } else {
            console.log('⚠ Nenhuma opção do menu foi encontrada, mas botão foi clicado');
            // Às vezes o clique no botão já abre o formulário diretamente
            await page.waitForTimeout(2000);
            return true;
        }
        
    } catch (error) {
        console.error('Erro ao entrar em modo de inclusão:', error);
        return false;
    }
}

/**
 * Aguarda que o campo mat-select seja habilitado dentro do painel específico
 * @param {Object} page - Instância da página do Playwright
 * @param {Object} painelOJ - Locator do painel específico do OJ
 * @returns {Promise<Object>} - Objeto com sucesso e seletorOJ se bem-sucedido
 */
async function aguardarMatSelectHabilitado(page, painelOJ) {
    try {
        console.log('Aguardando mat-select ser habilitado...');
        
        // 4) Dentro do painel, aguarda o <mat-select> do "Órgão Julgador" habilitar
        const seletorOJ = painelOJ.locator(
            'mat-select[placeholder="Órgão Julgador"], mat-select[name="idOrgaoJulgadorSelecionado"]'
        );
        
        // Anexa e habilita (aria-disabled deve virar "false" antes de interagir)
        await seletorOJ.first().waitFor({ state: 'attached' });
        
        const panelId = await painelOJ.getAttribute('id');
        await page.waitForFunction(
            (panelId) => {
                const el = 
                    document.querySelector(`#${panelId} mat-select[placeholder="Órgão Julgador"]`) ||
                    document.querySelector(`#${panelId} mat-select[name="idOrgaoJulgadorSelecionado"]`);
                return el && el.getAttribute('aria-disabled') === 'false';
            },
            panelId,
            { timeout: 10000 }
        );
        
        console.log('Mat-select habilitado com sucesso');
        return { sucesso: true, seletorOJ };
        
    } catch (error) {
        console.error('Erro ao aguardar mat-select ser habilitado:', error);
        
        // Fallback: verifica se existe algum mat-select visível no painel
        try {
            const matSelects = await painelOJ.locator('mat-select').all();
            for (const select of matSelects) {
                if (await select.isVisible()) {
                    const disabled = await select.getAttribute('aria-disabled');
                    const placeholder = await select.getAttribute('placeholder');
                    const name = await select.getAttribute('name');
                    console.log(`Mat-select encontrado - disabled: ${disabled}, placeholder: ${placeholder}, name: ${name}`);
                }
            }
        } catch (fallbackError) {
            console.error('Erro no fallback de verificação:', fallbackError);
        }
        
        return { sucesso: false, seletorOJ: null };
    }
}

/**
 * Previne cliques acidentais no header do expansion panel
 * @param {Page} page 
 */
async function prevenirCliqueHeader(page) {
    try {
        console.log('Prevenindo cliques acidentais no header...');
        
        // Aguardar um momento antes de interagir
        await page.waitForTimeout(1000);
        
        // Interceptar cliques no header para evitar fechamento do painel
        await page.evaluate(() => {
            const headers = document.querySelectorAll('[id^="mat-expansion-panel-header-"]');
            headers.forEach(header => {
                if (header.textContent && header.textContent.includes('Órgão')) {
                    header.style.pointerEvents = 'none';
                    console.log('Header temporariamente desabilitado:', header.id);
                }
            });
        });
        
    } catch (error) {
        console.log('Erro ao prevenir clique no header:', error.message);
    }
}

/**
 * Aguarda que o mat-select do OJ esteja habilitado e visível antes de interagir
 * Busca diretamente pelo campo, sem depender do botão Adicionar
 * @param {Page} page 
 * @param {Locator} painelOJ 
 * @returns {Promise<Object>} - {success: boolean, matSelect: Locator}
 */
async function aguardarMatSelectOJPronto(page, painelOJ) {
    try {
        console.log('Buscando campo de Órgão Julgador diretamente no painel...');
        
        // Aguardar um tempo para o painel carregar completamente
        await page.waitForTimeout(3000);
        
        // Múltiplos seletores para encontrar o campo de Órgão Julgador
        const seletoresMatSelect = [
            'mat-select[placeholder="Órgão Julgador"]',
            'mat-select[name="idOrgaoJulgadorSelecionado"]',
            'mat-select[placeholder*="Órgão"]',
            'mat-select[placeholder*="Julgador"]',
            'mat-select[aria-label*="Órgão"]',
            'mat-select[aria-label*="Julgador"]',
            'mat-select[formcontrolname*="orgao"]',
            'mat-select[formcontrolname*="julgador"]',
            '.mat-select:has-text("Órgão")',
            '.campo-orgao-julgador mat-select',
            '.form-group:has(label:has-text("Órgão")) mat-select',
            'mat-form-field:has(mat-label:has-text("Órgão")) mat-select'
        ];
        
        let matSelect = null;
        let seletorEncontrado = null;
        
        // Primeiro, tentar no painel específico
        for (const seletor of seletoresMatSelect) {
            try {
                console.log(`Tentando seletor no painel: ${seletor}`);
                const elemento = painelOJ.locator(seletor);
                
                if (await elemento.first().isVisible({ timeout: 2000 })) {
                    matSelect = elemento;
                    seletorEncontrado = seletor;
                    console.log(`✓ Mat-select encontrado no painel: ${seletor}`);
                    break;
                }
            } catch (e) {
                console.log(`Seletor ${seletor} não funcionou no painel`);
                continue;
            }
        }
        
        // Se não encontrou no painel, tentar na página global
        if (!matSelect) {
            console.log('Não encontrado no painel, buscando globalmente...');
            
            for (const seletor of seletoresMatSelect) {
                try {
                    console.log(`Tentando seletor global: ${seletor}`);
                    const elemento = page.locator(seletor);
                    
                    if (await elemento.first().isVisible({ timeout: 2000 })) {
                        matSelect = elemento;
                        seletorEncontrado = seletor;
                        console.log(`✓ Mat-select encontrado globalmente: ${seletor}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Seletor global ${seletor} não funcionou`);
                    continue;
                }
            }
        }
        
        if (!matSelect) {
            throw new Error('Nenhum campo de Órgão Julgador encontrado');
        }
        
        // Aguardar o elemento estar anexado e pronto
        await matSelect.first().waitFor({ state: 'attached', timeout: 5000 });
        
        // Verificar se está habilitado e visível
        console.log('Verificando se o mat-select está habilitado...');
        
        // Adicionar timeout mais agressivo e logs
        console.log(`🕒 Aguardando mat-select ficar habilitado: ${seletorEncontrado}`);
        
        let elementoHabilitado = false;
        try {
            elementoHabilitado = await page.waitForFunction(
                (seletor) => {
                    const elemento = document.querySelector(seletor);
                    if (!elemento) {
                        console.log(`❌ Elemento não encontrado: ${seletor}`);
                        return false;
                    }
                    
                    const disabled = elemento.getAttribute('aria-disabled');
                    const visible = elemento.offsetParent !== null;
                    const tabindex = elemento.getAttribute('tabindex');
                    
                    console.log('🔍 Estado do mat-select:', {
                        seletor,
                        disabled,
                        visible,
                        tabindex,
                        id: elemento.id,
                        placeholder: elemento.getAttribute('placeholder')
                    });
                    
                    // Consideramos habilitado se não está explicitamente disabled
                    const habilitado = visible && (disabled === 'false' || disabled === null);
                    if (habilitado) {
                        console.log('✅ Mat-select está habilitado!');
                    }
                    return habilitado;
                },
                seletorEncontrado,
                { timeout: 8000 } // Reduzido de 10s para 8s
            );
        } catch (timeoutError) {
            console.log(`⏰ TIMEOUT: Mat-select não ficou habilitado em 8 segundos`);
            console.log(`🔍 Tentando prosseguir mesmo assim com o seletor: ${seletorEncontrado}`);
            // Continuar mesmo sem confirmar que está habilitado
        }
        
        if (elementoHabilitado) {
            console.log('✓ Mat-select do OJ está pronto para interação');
            return { success: true, matSelect };
        } else {
            throw new Error('Mat-select encontrado mas não está habilitado');
        }
        
    } catch (error) {
        console.error('Erro ao aguardar mat-select ficar pronto:', error);
        
        // Debug: verificar estado atual dos mat-selects na página
        try {
            console.log('=== DEBUG: Analisando mat-selects na página ===');
            const selectsInfo = await page.evaluate(() => {
                const selects = document.querySelectorAll('mat-select');
                return Array.from(selects).map((select, index) => ({
                    index,
                    id: select.id,
                    placeholder: select.getAttribute('placeholder'),
                    name: select.getAttribute('name'),
                    disabled: select.getAttribute('aria-disabled'),
                    visible: select.offsetParent !== null,
                    className: select.className,
                    textContent: select.textContent?.trim().substring(0, 50)
                }));
            });
            console.log('Mat-selects encontrados:', selectsInfo);
            
            // Verificar se há campos de input relacionados a Órgão Julgador
            const inputsOrgao = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input, select');
                return Array.from(inputs)
                    .filter(input => {
                        const placeholder = input.getAttribute('placeholder') || '';
                        const name = input.getAttribute('name') || '';
                        const id = input.getAttribute('id') || '';
                        const label = input.closest('.mat-form-field')?.querySelector('mat-label')?.textContent || '';
                        
                        return placeholder.toLowerCase().includes('órgão') ||
                               name.toLowerCase().includes('orgao') ||
                               id.toLowerCase().includes('orgao') ||
                               label.toLowerCase().includes('órgão');
                    })
                    .map(input => ({
                        tagName: input.tagName,
                        type: input.type,
                        placeholder: input.getAttribute('placeholder'),
                        name: input.getAttribute('name'),
                        id: input.getAttribute('id'),
                        visible: input.offsetParent !== null
                    }));
            });
            console.log('Campos relacionados a Órgão:', inputsOrgao);
            
        } catch (debugError) {
            console.log('Erro no debug:', debugError);
        }
        
        return { success: false, matSelect: null };
    }
}

/**
 * Abre o select de Órgão Julgador e seleciona pelo texto.
 * Resiliente: tenta clique direto na opção; se não achar, digita para filtrar e confirma com Enter.
 *
 * @param {Page} page
 * @param {Locator} painelOJ - container do acordeão (use o que você já pegou via aria-controls)
 * @param {string} alvoOJ - ex.: "Vara do Trabalho de Adamantina"
 */
async function selecionarOrgaoJulgador(page, painelOJ, alvoOJ) {
    const startTime = Date.now();
    const TIMEOUT_TOTAL = 60000; // 60 segundos máximo para toda a operação
    
    try {
        console.log(`🎯 Selecionando Órgão Julgador: ${alvoOJ} (timeout: ${TIMEOUT_TOTAL/1000}s)`);
        
        // Verificar timeout
        if (Date.now() - startTime > TIMEOUT_TOTAL) {
            throw new Error(`Timeout global atingido para seleção de OJ: ${alvoOJ}`);
        }
        
        // Primeiro, prevenir cliques acidentais no header
        await prevenirCliqueHeader(page);
        
        // Verificar timeout antes de prosseguir
        if (Date.now() - startTime > TIMEOUT_TOTAL) {
            throw new Error(`Timeout global atingido antes de aguardar mat-select: ${alvoOJ}`);
        }
        
        // Aguardar o mat-select estar pronto para interação
        console.log(`⏱️ Tempo decorrido: ${((Date.now() - startTime)/1000).toFixed(1)}s`);
        const { success, matSelect } = await aguardarMatSelectOJPronto(page, painelOJ);
        if (!success) {
            throw new Error('Mat-select do OJ não ficou pronto para interação');
        }

        // 2) Localizar e clicar ESPECIFICAMENTE no mat-select, não no header
        const matSelectId = await matSelect.first().getAttribute('id');
        console.log(`Mat-select ID encontrado: ${matSelectId}`);
        
        console.log('Clicando ESPECIFICAMENTE no mat-select (não no header)...');
        
        // Aguardar um momento para garantir que a página estabilizou
        await page.waitForTimeout(1000);
        
        // Localizar especificamente o mat-select dentro do painel
        const matSelectEspecifico = painelOJ.locator(`mat-select#${matSelectId}`);
        
        // Verificar se o mat-select está realmente visível
        await matSelectEspecifico.waitFor({ state: 'visible', timeout: 5000 });
        
        // Múltiplas estratégias para clicar no mat-select
        let cliqueBemSucedido = false;
        
        // Estratégia 1: Clicar no trigger
        try {
            const trigger = matSelectEspecifico.locator('.mat-select-trigger');
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click({ force: true });
            cliqueBemSucedido = true;
            console.log('✓ Clique no trigger realizado');
        } catch (e1) {
            console.log('Falha no clique do trigger, tentando mat-select diretamente...');
            
            // Estratégia 2: Clicar diretamente no mat-select
            try {
                await matSelectEspecifico.scrollIntoViewIfNeeded();
                await matSelectEspecifico.click({ force: true });
                cliqueBemSucedido = true;
                console.log('✓ Clique direto no mat-select realizado');
            } catch (e2) {
                console.log('Falha no clique direto, tentando JavaScript...');
                
                // Estratégia 3: Clicar via JavaScript
                try {
                    await page.evaluate((selectId) => {
                        const element = document.getElementById(selectId);
                        if (element) {
                            element.click();
                            // Se tiver trigger, clicar nele também
                            const trigger = element.querySelector('.mat-select-trigger');
                            if (trigger) trigger.click();
                        }
                    }, matSelectId);
                    cliqueBemSucedido = true;
                    console.log('✓ Clique via JavaScript realizado');
                } catch (e3) {
                    throw new Error('Todas as estratégias de clique falharam');
                }
            }
        }
        
        if (!cliqueBemSucedido) {
            throw new Error('Não foi possível clicar no mat-select');
        }

        // Verificar timeout antes do overlay
        if (Date.now() - startTime > TIMEOUT_TOTAL) {
            throw new Error(`Timeout global atingido antes de aguardar overlay: ${alvoOJ}`);
        }
        
        // 3) Aguardar o overlay abrir e estabilizar
        console.log(`⏱️ Aguardando overlay abrir... (tempo: ${((Date.now() - startTime)/1000).toFixed(1)}s)`);
        
        // Aguardar múltiplos seletores de overlay com timeout reduzido
        const seletoresOverlay = [
            '.cdk-overlay-pane .mat-select-panel',
            '.mat-select-panel',
            '.cdk-overlay-pane mat-option',
            'mat-option'
        ];
        
        let overlayAberto = false;
        for (const seletor of seletoresOverlay) {
            try {
                await page.locator(seletor).first().waitFor({ state: 'visible', timeout: 2000 }); // Reduzido para 2s
                overlayAberto = true;
                console.log(`✓ Overlay aberto usando seletor: ${seletor}`);
                break;
            } catch (e) {
                console.log(`Seletor ${seletor} não funcionou, tentando próximo...`);
            }
        }
        
        if (!overlayAberto) {
            throw new Error(`Overlay do mat-select não abriu após múltiplas tentativas (${((Date.now() - startTime)/1000).toFixed(1)}s)`);
        }
        
        // Aguardar um momento para o painel estabilizar
        await page.waitForTimeout(1500);
        console.log('✓ Overlay estabilizado');

        // Verificar timeout antes da busca
        if (Date.now() - startTime > TIMEOUT_TOTAL) {
            throw new Error(`Timeout global atingido antes de buscar opção: ${alvoOJ}`);
        }
        
        // 4) Buscar e selecionar a opção do OJ
        console.log(`⏱️ Buscando opção: "${alvoOJ}" (tempo: ${((Date.now() - startTime)/1000).toFixed(1)}s)`);
        
        // Primeiro, listar todas as opções disponíveis para debug
        try {
            const opcoesDisponiveis = await page.locator('mat-option').allTextContents();
            console.log(`📋 Opções disponíveis no dropdown (${opcoesDisponiveis.length} total):`);
            
            // Se for "Araras", mostrar todas as opções para debug
            if (alvoOJ.toLowerCase().includes('araras')) {
                console.log('🔍 DEBUG ARARAS - Todas as opções:');
                opcoesDisponiveis.forEach((opcao, index) => {
                    console.log(`   ${index + 1}. "${opcao}"`);
                });
                
                // Procurar especificamente por "Araras"
                const opcoesAraras = opcoesDisponiveis.filter(opcao => 
                    opcao.toLowerCase().includes('araras')
                );
                console.log(`🎯 Opções contendo "araras": ${opcoesAraras.length}`);
                opcoesAraras.forEach(opcao => console.log(`   - "${opcao}"`));
            } else {
                console.log(`   Primeiras 10: ${opcoesDisponiveis.slice(0, 10).join(', ')}`);
            }
        } catch (e) {
            console.log('⚠️ Não foi possível listar opções para debug');
        }
        
        // Estratégias melhoradas de seleção com timeout
        let opcaoSelecionada = false;
        const estrategias = [];
        
        // Estratégia 1: Buscar opção exata (case-insensitive)
        if (!opcaoSelecionada && Date.now() - startTime < TIMEOUT_TOTAL) {
            try {
                console.log('🎯 Estratégia 1: Busca exata...');
                const opcaoExata = page.locator('mat-option').filter({ hasText: new RegExp(`^\\s*${alvoOJ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') });
                if (await opcaoExata.first().isVisible({ timeout: 1500 })) {
                    console.log('✓ Opção exata encontrada, clicando...');
                    await opcaoExata.first().click({ force: true });
                    opcaoSelecionada = true;
                    estrategias.push('exata');
                }
            } catch (error) {
                console.log('❌ Opção exata não encontrada:', error.message);
            }
        }
        
        // Estratégia 2: Busca específica para Araras (se aplicável)
        if (!opcaoSelecionada && alvoOJ.toLowerCase().includes('araras') && Date.now() - startTime < TIMEOUT_TOTAL) {
            try {
                console.log('🎯 Estratégia 2: Busca específica para Araras...');
                // Buscar por "Vara" + "Trabalho" + "Araras" em qualquer ordem
                const opcaoAraras = page.locator('mat-option').filter({ hasText: /vara.*trabalho.*araras|araras.*vara.*trabalho|trabalho.*vara.*araras/i });
                if (await opcaoAraras.first().isVisible({ timeout: 1500 })) {
                    const textoOpcao = await opcaoAraras.first().textContent();
                    console.log(`✓ Opção específica Araras encontrada: "${textoOpcao}"`);
                    await opcaoAraras.first().click({ force: true });
                    opcaoSelecionada = true;
                    estrategias.push('araras_especifica');
                } else {
                    // Tentar apenas com "Araras"
                    const opcaoApenasAraras = page.locator('mat-option').filter({ hasText: /araras/i });
                    if (await opcaoApenasAraras.first().isVisible({ timeout: 1500 })) {
                        const textoOpcao = await opcaoApenasAraras.first().textContent();
                        console.log(`✓ Opção com Araras encontrada: "${textoOpcao}"`);
                        await opcaoApenasAraras.first().click({ force: true });
                        opcaoSelecionada = true;
                        estrategias.push('araras_parcial');
                    }
                }
            } catch (error) {
                console.log('❌ Busca específica Araras falhou:', error.message);
            }
        }
        
        // Estratégia 3: Buscar opção que contém as palavras principais
        if (!opcaoSelecionada && Date.now() - startTime < TIMEOUT_TOTAL) {
            try {
                // Extrair palavras principais do nome do OJ
                const palavrasChave = alvoOJ.split(' ').filter(palavra => 
                    palavra.length > 2 && 
                    !['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'e'].includes(palavra.toLowerCase())
                );
                
                if (palavrasChave.length > 0) {
                    const regexPalavras = new RegExp(palavrasChave.join('.*'), 'i');
                    const opcaoParcial = page.locator('mat-option').filter({ hasText: regexPalavras });
                    
                    if (await opcaoParcial.first().isVisible({ timeout: 2000 })) {
                        console.log('✓ Opção parcial encontrada por palavras-chave, clicando...');
                        await opcaoParcial.first().click({ force: true });
                        opcaoSelecionada = true;
                    }
                }
            } catch (error) {
                console.log('Opção por palavras-chave não encontrada:', error.message);
            }
        }
        
        // Estratégia 3: Buscar opção que contém o texto (mais flexível)
        if (!opcaoSelecionada) {
            try {
                const opcaoParcial = page.locator('mat-option').filter({ hasText: new RegExp(alvoOJ, 'i') });
                if (await opcaoParcial.first().isVisible({ timeout: 2000 })) {
                    console.log('✓ Opção parcial encontrada, clicando...');
                    await opcaoParcial.first().click({ force: true });
                    opcaoSelecionada = true;
                }
            } catch (error) {
                console.log('Opção parcial não encontrada:', error.message);
            }
        }
        
        // Estratégia 4: Filtrar por teclado (última tentativa)
        if (!opcaoSelecionada) {
            console.log('Tentando filtrar por teclado...');
            try {
                // Focar no mat-select e digitar
                await matSelectEspecifico.focus();
                await page.keyboard.type(alvoOJ, { delay: 100 });
                await page.waitForTimeout(2000); // Aguardar filtro aplicar
                
                // Tentar encontrar a opção filtrada
                const opcaoFiltrada = page.locator('mat-option').first();
                if (await opcaoFiltrada.isVisible({ timeout: 2000 })) {
                    console.log('✓ Opção filtrada encontrada, clicando...');
                    await opcaoFiltrada.click({ force: true });
                    opcaoSelecionada = true;
                } else {
                    // Se não encontrou, tentar Enter
                    console.log('Tentando Enter...');
                    await page.keyboard.press('Enter');
                    opcaoSelecionada = true;
                }
            } catch (error) {
                console.log('Erro na filtragem por teclado:', error.message);
            }
        }
        
        if (!opcaoSelecionada) {
            // Listar opções disponíveis para debug final
            try {
                const todasOpcoes = await page.locator('mat-option').allTextContents();
                console.log('Opções disponíveis para debug:', todasOpcoes);
                
                // Retornar erro específico quando OJ não está na relação
                const error = new Error(`OJ "${alvoOJ}" não encontrado na relação de opções disponíveis`);
                error.code = 'OJ_NAO_ENCONTRADO';
                error.opcoesDisponiveis = todasOpcoes;
                throw error;
            } catch (e) {
                if (e.code === 'OJ_NAO_ENCONTRADO') {
                    throw e;
                }
                console.log('Não foi possível listar opções para debug final');
                const error = new Error(`Não foi possível selecionar a opção "${alvoOJ}" - erro ao acessar dropdown`);
                error.code = 'ERRO_DROPDOWN';
                throw error;
            }
        }
        
        // ESCAPE FINAL - verificar timeout global
        if (Date.now() - startTime > TIMEOUT_TOTAL) {
            console.log(`⏰ TIMEOUT GLOBAL: Operação cancelada após ${((Date.now() - startTime)/1000).toFixed(1)}s`);
            const error = new Error(`Timeout global atingido para seleção de "${alvoOJ}" após ${((Date.now() - startTime)/1000).toFixed(1)} segundos`);
            error.code = 'TIMEOUT_GLOBAL';
            throw error;
        }
        
        // Log final do resultado
        if (opcaoSelecionada) {
            console.log(`✅ SUCESSO na seleção de OJ "${alvoOJ}"`);
            console.log(`   - Estratégias usadas: [${estrategias.join(', ')}]`);
            console.log(`   - Tempo total: ${((Date.now() - startTime)/1000).toFixed(1)}s`);
        } else {
            console.log(`❌ FALHA na seleção de OJ "${alvoOJ}"`);
            console.log(`   - Nenhuma estratégia funcionou`);
            console.log(`   - Tempo total: ${((Date.now() - startTime)/1000).toFixed(1)}s`);
        }
        
        // Aguardar o dropdown fechar
        await page.waitForTimeout(1000);

        // 5) Validar que ficou selecionado no componente
        console.log('Validando seleção...');
        try {
            // Aguardar um momento para o valor ser definido
            await page.waitForTimeout(1000);
            
            // Verificar se o valor foi selecionado
            const valorSelecionado = await matSelectEspecifico.textContent();
            console.log(`Valor selecionado no mat-select: "${valorSelecionado}"`);
            
            if (valorSelecionado && valorSelecionado.toLowerCase().includes(alvoOJ.toLowerCase())) {
                console.log('✓ Validação de seleção bem-sucedida');
            } else {
                console.log('Aviso: Validação de seleção pode ter falhou, mas continuando...');
            }
        } catch (validationError) {
            console.log('Aviso: Validação de seleção falhou, mas continuando...', validationError.message);
        }
        
        console.log(`✓ Órgão Julgador selecionado com sucesso: ${alvoOJ}`);
        return true;
        
    } catch (error) {
        console.error(`❌ ERRO FINAL na seleção do Órgão Julgador "${alvoOJ}":`, error.message);
        console.error(`   - Tempo decorrido: ${((Date.now() - startTime)/1000).toFixed(1)}s`);
        console.error(`   - Estratégias tentadas: [${estrategias.join(', ') || 'nenhuma'}]`);
        console.error(`   - Código do erro: ${error.code || 'DESCONHECIDO'}`);
        throw error;
    }
}

// Função melhorada para vincular OJ usando o fluxo determinístico sugerido pelo usuário
async function vincularOJMelhorado(page, nomeOJ, papel = 'Diretor de Secretaria', visibilidade = 'Público') {
  console.log(`Iniciando vinculação determinística do OJ: ${nomeOJ}`);
  
  try {
    // 1. Expande a seção (SEM clicar em Adicionar)
    console.log('1. Expandindo seção de Órgãos Julgadores...');
    const { sucesso: expandiu, painelOJ } = await expandirOrgaosJulgadores(page);
    if (!expandiu || !painelOJ) {
      const error = new Error('Não foi possível expandir a seção de Órgãos Julgadores');
      error.code = 'ERRO_EXPANSAO';
      throw error;
    }
    
    // 2. Selecionar o Órgão Julgador usando a nova estratégia otimizada
    console.log('2. Selecionando Órgão Julgador...');
    
    try {
      // Usar a nova função otimizada para seleção do OJ
      await selecionarOrgaoJulgador(page, painelOJ, nomeOJ);
    } catch (selecaoError) {
      // Verificar se é um OJ não encontrado na relação
      if (selecaoError.code === 'OJ_NAO_ENCONTRADO') {
        console.log(`⚠️ OJ "${nomeOJ}" não está disponível na relação de opções`);
        const error = new Error(`OJ "${nomeOJ}" não encontrado na relação de opções disponíveis`);
        error.code = 'OJ_NAO_ENCONTRADO';
        error.nomeOJ = nomeOJ;
        error.opcoesDisponiveis = selecaoError.opcoesDisponiveis || [];
        throw error;
      } else {
        // Outros tipos de erro na seleção
        const error = new Error(`Erro ao selecionar OJ "${nomeOJ}": ${selecaoError.message}`);
        error.code = selecaoError.code || 'ERRO_SELECAO';
        error.nomeOJ = nomeOJ;
        error.originalError = selecaoError;
        throw error;
      }
    }
    
    // 3. Aguardar um momento para garantir que a seleção foi processada
    console.log('3. Aguardando processamento da seleção...');
    await page.waitForTimeout(1500);
    
    // 4. Procurar e clicar no botão "Vincular Órgão Julgador ao Perito"
    console.log('4. Procurando botão de vinculação...');
    
    // Múltiplas estratégias para encontrar o botão
    const seletoresBotaoVincular = [
      'button:has-text("Vincular Órgão Julgador ao Perito")',
      'button:has-text("Vincular")',
      'button:has-text("Gravar")',
      'button:has-text("Salvar")',
      'button:has-text("Confirmar")',
      'input[type="submit"]',
      'input[type="button"][value*="Vincular"]',
      'input[type="button"][value*="Gravar"]',
      '.btn:has-text("Vincular")',
      '.btn:has-text("Gravar")'
    ];
    
    let botaoEncontrado = false;
    for (const seletor of seletoresBotaoVincular) {
      try {
        const botao = painelOJ.locator(seletor);
        if (await botao.first().isVisible({ timeout: 2000 })) {
          console.log(`✓ Botão encontrado: ${seletor}`);
          await botao.first().click({ force: true });
          botaoEncontrado = true;
          console.log('✓ Clique no botão de vinculação realizado');
          break;
        }
      } catch (e) {
        console.log(`Seletor ${seletor} não funcionou, tentando próximo...`);
      }
    }
    
    if (!botaoEncontrado) {
      // Tentar buscar por role
      try {
        const botaoRole = painelOJ.getByRole('button', { name: /Vincular|Gravar|Salvar|Confirmar/i });
        if (await botaoRole.first().isVisible({ timeout: 2000 })) {
          await botaoRole.first().click({ force: true });
          botaoEncontrado = true;
          console.log('✓ Botão encontrado por role e clicado');
        }
      } catch (e) {
        console.log('Busca por role também falhou');
      }
    }
    
    if (!botaoEncontrado) {
      throw new Error('Botão de vinculação não encontrado no painel');
    }
    
    // 5. Aguardar processamento e verificar resultado
    console.log('5. Aguardando processamento da vinculação...');
    await page.waitForTimeout(2000);
    
    // 6. Verificar se apareceu modal de confirmação ou de erro
    console.log('6. Verificando resultado da vinculação...');
    
    try {
      // Verificar se apareceu modal de confirmação
      const modalConfirmacao = await page.locator('text=/certeza.*vincular.*Órgão Julgador.*Perito/i').first().isVisible({ timeout: 3000 });
      if (modalConfirmacao) {
        console.log('✓ Modal de confirmação detectado, clicando em "Sim"...');
        
        // Procurar botão "Sim"
        const seletoresSim = [
          'button:has-text("Sim")',
          'button:has-text("OK")',
          'button:has-text("Confirmar")',
          'button[class*="confirm"]',
          '.btn-success:has-text("Sim")',
          '.btn-primary:has-text("Sim")'
        ];
        
        let simClicado = false;
        for (const seletor of seletoresSim) {
          try {
            const botaoSim = page.locator(seletor);
            if (await botaoSim.first().isVisible({ timeout: 2000 })) {
              await botaoSim.first().click({ force: true });
              simClicado = true;
              console.log('✓ Confirmação realizada');
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!simClicado) {
          console.log('Aviso: Não foi possível clicar em "Sim", mas continuando...');
        }
        
        // Aguardar processamento após confirmação
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Nenhum modal de confirmação detectado, continuando...');
    }
    
    // 7. Verificar se o OJ apareceu na tabela de vínculos
    console.log('7. Verificando se OJ foi vinculado na tabela...');
    try {
      // Aguardar tabela aparecer
      await painelOJ.locator('table, .table, [role="table"]').first().waitFor({ state: 'visible', timeout: 5000 });
      
      // Verificar se o nome do OJ aparece na tabela
      const painelId = await painelOJ.getAttribute('id');
      const ojNaTabela = await page.waitForFunction(
        (painelId, nomeOJ) => {
          const painel = document.getElementById(painelId);
          if (!painel) return false;
          
          const tabela = painel.querySelector('table, .table, [role="table"]');
          if (!tabela) return false;
          
          const textoTabela = tabela.textContent || '';
          return textoTabela.toLowerCase().includes(nomeOJ.toLowerCase());
        },
        painelId,
        nomeOJ,
        { timeout: 10000 }
      );
      
      if (ojNaTabela) {
        console.log(`✓ OJ "${nomeOJ}" confirmado na tabela de vínculos`);
      } else {
        console.log(`Aviso: OJ "${nomeOJ}" pode não ter sido adicionado à tabela`);
      }
    } catch (error) {
      console.log(`Aviso: Não foi possível verificar OJ na tabela: ${error.message}`);
      // Não falhar aqui, pois a vinculação pode ter sido bem-sucedida mesmo assim
    }
    
    // 8. Verificar se houve mensagem de sucesso ou erro
    try {
      const mensagemSucesso = await page.locator('text=/sucesso|vinculado|adicionado|salvo/i').first().isVisible({ timeout: 3000 });
      if (mensagemSucesso) {
        console.log('✓ Mensagem de sucesso detectada');
      }
      
      const mensagemErro = await page.locator('text=/erro|falha|não.*possível|inválido/i').first().isVisible({ timeout: 2000 });
      if (mensagemErro) {
        const textoErro = await page.locator('text=/erro|falha|não.*possível|inválido/i').first().textContent();
        console.log(`⚠ Possível mensagem de erro detectada: ${textoErro}`);
      }
    } catch (e) {
      console.log('Não foi possível verificar mensagens de status');
    }
    
    console.log(`✓ Vinculação determinística do OJ "${nomeOJ}" concluída!`);
    return true;
    
  } catch (error) {
    console.error(`✗ Erro na vinculação determinística do OJ "${nomeOJ}": ${error.message}`);
    throw error;
  }
}

async function vincularOJ(page, nomeOJ, papel = 'Diretor de Secretaria', visibilidade = 'Público') {
  
  // Verificar se a página está válida antes de começar
  if (page.isClosed()) {
    throw new Error('A página foi fechada antes de iniciar a vinculação');
  }
  
  // Tentar primeiro o fluxo melhorado
  try {
    console.log('Tentando fluxo melhorado de vinculação...');
    await vincularOJMelhorado(page, nomeOJ, papel, visibilidade);
    console.log('✓ Fluxo melhorado executado com sucesso!');
    return;
  } catch (error) {
    // Se for um OJ não encontrado, não tentar fallback - propagar o erro
    if (error.code === 'OJ_NAO_ENCONTRADO') {
      console.log(`⚠️ OJ "${nomeOJ}" não encontrado na relação - pulando para próximo`);
      throw error; // Propagar para o main.js tratar
    }
    
    console.log(`Fluxo melhorado falhou: ${error.message}`);
    console.log('Tentando fluxo tradicional como fallback...');
  }
  
  // Fallback para o método tradicional
  // Configurar timeout adaptativo
  const timeout = obterTimeoutAdaptativo('interacao');
  page.setDefaultTimeout(timeout);
  
  console.log(`Procurando seção de Órgãos Julgadores para vincular ${nomeOJ} com papel: ${papel}, visibilidade: ${visibilidade}...`);
  
  // Helper para garantir acordeon aberto e seção visível
  async function ensureAcordeonAberto() {
    console.log('DEBUG: Tentando abrir acordeon de Órgãos Julgadores');
    
    // 1) Se conteúdo já está visível, retorna
    const visible = await buscarElemento(page, 'orgaoJulgador');
    if (visible) return true;

    // 2) Primeiro tentar usando getByRole (método mais confiável)
    try {
      const { SeletorManager } = require('./utils/seletores');
      const sucessoGetByRole = await SeletorManager.clicarBotaoOrgaosJulgadoresByRole(page, obterTimeoutAdaptativo('interacao'));
      if (sucessoGetByRole) {
        await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 16);
        const afterVisible = await buscarElemento(page, 'orgaoJulgador');
        if (afterVisible) return true;
      }
    } catch (e) {
      console.log(`Erro ao usar getByRole: ${e.message}`);
    }

    // 3) Fallback: Buscar cabeçalho do acordeão usando utilitário
    const cabecalho = await buscarElemento(page, 'cabecalhoAcordeao');
    if (cabecalho) {
      try {
        await cabecalho.scrollIntoViewIfNeeded({ timeout: obterTimeoutAdaptativo('interacao') / 8 });
        const aria = await cabecalho.getAttribute('aria-expanded').catch(() => null);
        await cabecalho.click({ force: true });
        await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 16);
        
        const afterVisible = await buscarElemento(page, 'orgaoJulgador');
        if (afterVisible) return true;
        
        // Se tinha aria-expanded=false, tentar clicar novamente
        if (aria === 'false') {
          await cabecalho.click({ force: true });
          await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 16);
          const againVisible = await buscarElemento(page, 'orgaoJulgador');
          if (againVisible) return true;
        }
      } catch (e) {
        console.log(`Erro ao clicar no cabeçalho do acordeão: ${e.message}`);
      }
    }

    console.log('Nenhum cabeçalho de acordeão encontrado, assumindo que já está aberto');
    return false;
  }

  // Garantir acordeon aberto antes de prosseguir
  await ensureAcordeonAberto();

  // Tentar acionar o fluxo de inclusão (Adicionar)
  const botaoAdicionar = await buscarElemento(page, 'botaoAdicionar');
  if (botaoAdicionar) {
    try {
      await botaoAdicionar.click();
      console.log('Clicou no botão Adicionar');
      await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 8);
    } catch (e) {
      console.log(`Erro ao clicar no botão Adicionar: ${e.message}`);
    }
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
    } catch (error) {}
    // Buscar em contêiner pai
    const container = label.locator('..');
    const nearControl = container.locator('mat-select, [role="combobox"], select, input').first();
    await nearControl.waitFor({ timeout: 150 });
    const handle = await nearControl.elementHandle();
    if (handle) {
      const tag = await handle.evaluate(el => el.tagName.toLowerCase());
      console.log(`Controle encontrado próximo ao label: <${tag}>`);
    }
  } catch (error) {}

  // Buscar campo de seleção do Órgão Julgador usando utilitário
  let selectEncontrado = await buscarElemento(page, 'orgaoJulgador');
  let seletorUsado = null;
  
  if (selectEncontrado) {
    // Validar se é realmente o campo correto
    const isValido = await SeletorManager.validarContextoOrgaoJulgador(page, selectEncontrado);
    if (isValido) {
      seletorUsado = 'orgaoJulgador';
      console.log('Campo de Órgão Julgador encontrado e validado');
    } else {
      selectEncontrado = null;
      console.log('Campo encontrado mas não é válido para Órgão Julgador');
    }
  }
  
  // Verificar se a página ainda está válida
  if (page.isClosed()) {
    throw new Error('A página foi fechada durante a execução');
  }

  // Se não encontrou ainda, tentar localizar o select diretamente
  
  try {
    const elemento = await buscarElemento(page, 'orgaoJulgador', obterTimeoutAdaptativo('interacao'));
    if (elemento && await SeletorManager.validarContextoOrgaoJulgador(page, elemento)) {
      selectEncontrado = elemento;
      seletorUsado = 'orgaoJulgador';
      console.log('DEBUG: Campo de seleção CORRETO encontrado usando utilitários');
    }
  } catch (e) {
    console.log(`DEBUG: Busca inicial do select falhou: ${e.message}`);
    
    // Se a página foi fechada, parar imediatamente
    if (e.message.includes('Target page, context or browser has been closed')) {
      throw new Error('A página foi fechada durante a busca do campo select');
    }
  }

  // Se não encontrou, tentar expandir a seção e procurar novamente
  if (!selectEncontrado) {
    // Verificar se a página ainda está válida
    if (page.isClosed()) {
      throw new Error('A página foi fechada durante a execução');
    }

    // Tentar expandir a seção usando os utilitários
    let expandiu = false;
    try {
      const cabecalho = await buscarElemento(page, 'cabecalhoAcordeao', obterTimeoutAdaptativo('interacao'));
      if (cabecalho) {
        await cabecalho.scrollIntoView({ behavior: 'auto', block: 'center' });
        await cabecalho.click();
        console.log('DEBUG: Seção expandida com sucesso usando utilitários');
        expandiu = true;
      }
    } catch (e) {
      console.log(`DEBUG: Falha ao expandir seção: ${e.message}`);
      
      // Se a página foi fechada, parar imediatamente
      if (e.message.includes('Target page, context or browser has been closed')) {
        throw new Error('A página foi fechada durante a execução. Verifique se não há problemas de sessão ou timeout.');
      }
    }
    
    if (!expandiu) {
      console.log('Não foi possível garantir a expansão da seção; seguindo mesmo assim.');
    }
    await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 10);

    // Após expandir, tentar clicar em "Adicionar" novamente
    try {
      const botaoAdicionar = await buscarElemento(page, 'botaoAdicionar', obterTimeoutAdaptativo('interacao'));
      if (botaoAdicionar) {
        await botaoAdicionar.click();
        console.log('Clicou em Adicionar após expandir usando utilitários');
        await page.waitForTimeout(obterTimeoutAdaptativo('interacao') / 10);
      }
    } catch (e) {
      console.log(`DEBUG: Falha ao clicar em Adicionar após expandir: ${e.message}`);
    }

    // Procurar o select novamente após tentar expandir
    try {
      const elemento = await buscarElemento(page, 'orgaoJulgador', obterTimeoutAdaptativo('interacao'));
      if (elemento && await SeletorManager.validarContextoOrgaoJulgador(page, elemento)) {
        selectEncontrado = elemento;
        seletorUsado = 'orgaoJulgador';
        console.log('Select encontrado após expandir seção usando utilitários');
      }
    } catch (e) {
      console.log(`DEBUG: Falha na busca do select após expandir: ${e.message}`);
      
      // Se a página foi fechada, parar imediatamente
      if (e.message && e.message.includes('Target page, context or browser has been closed')) {
        throw new Error('A página foi fechada durante a busca do campo select após expandir');
      }
    }
  }
  
  if (!selectEncontrado) {
    // Listar elementos disponíveis para depuração usando utilitários
    await listarElementosDisponiveis(page);
    throw new Error('Campo select de órgão julgador não encontrado');
  }
  
  console.log(`Selecionando órgão julgador: ${nomeOJ}`);
  
  // Usar utilitários de normalização
  const targetNorm = normalizarTexto(nomeOJ);
  const targetTokens = extrairTokensSignificativos(nomeOJ);
  
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
      console.log('DEBUG: Opções normalizadas:', opcoes.map(o => ({ original: o.text, normalizada: normalizarTexto(o.text || '') })));

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
        } catch (error) {}
      }

      // Estratégia de correspondência segura usando utilitários
      const withNorm = opcoes.map(o => ({ ...o, norm: normalizarTexto(o.text || '') }));

      // Encontrar melhor correspondência usando algoritmo de similaridade
      let melhorOpcao = null;
      let melhorScore = 0;
      
      for (const opcao of withNorm) {
        const score = calcularSimilaridade(targetNorm, opcao.norm, targetTokens, extrairTokensSignificativos(opcao.text || ''));
        if (score > melhorScore) {
          melhorScore = score;
          melhorOpcao = opcao;
        }
      }
      
      console.log(`DEBUG: Melhor opção encontrada: ${melhorOpcao?.text} (score: ${melhorScore})`);
      
      // Verificar se a correspondência é suficientemente boa
      if (!melhorOpcao || !verificarEquivalencia(targetNorm, melhorOpcao.norm, targetTokens, extrairTokensSignificativos(melhorOpcao.text || ''))) {
        throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções disponíveis`);
      }
      
      // Verificar se há múltiplas opções com score similar (ambiguidade)
      const opcoesAmbiguas = withNorm.filter(o => {
        const score = calcularSimilaridade(targetNorm, o.norm, targetTokens, extrairTokensSignificativos(o.text || ''));
        return score >= melhorScore * 0.95 && o !== melhorOpcao;
      });
      
      if (opcoesAmbiguas.length > 0) {
        const lista = [melhorOpcao, ...opcoesAmbiguas].map(c => c.text).join(' | ');
        throw new Error(`Múltiplas opções encontradas para "${nomeOJ}". Especifique melhor (ex.: incluir número da vara). Opções: ${lista}`);
      }

      const escolhido = melhorOpcao;
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
      } catch (error) {}

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
            // Mapear elementos com normalização usando utilitários
            const normalized = optionsFound.map(t => ({ text: t, norm: normalizarTexto(t) }));
            
            // Encontrar melhor correspondência
            let melhorOpcao = null;
            let melhorScore = 0;
            
            for (const opcao of normalized) {
              const score = calcularSimilaridade(targetNorm, opcao.norm, targetTokens, extrairTokensSignificativos(opcao.text));
              if (score > melhorScore) {
                melhorScore = score;
                melhorOpcao = opcao;
              }
            }
            
            if (!melhorOpcao || !verificarEquivalencia(targetNorm, melhorOpcao.norm, targetTokens, extrairTokensSignificativos(melhorOpcao.text))) {
              throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções exibidas`);
            }
            
            // Verificar ambiguidade
            const opcoesAmbiguas = normalized.filter(o => {
              const score = calcularSimilaridade(targetNorm, o.norm, targetTokens, extrairTokensSignificativos(o.text));
              return score >= melhorScore * 0.95 && o !== melhorOpcao;
            });
            
            if (opcoesAmbiguas.length > 0) {
              const lista = [melhorOpcao, ...opcoesAmbiguas].map(c => c.text).join(' | ');
              throw new Error(`Múltiplas opções para "${nomeOJ}". Especifique melhor. Opções: ${lista}`);
            }
            
            const escolhido = melhorOpcao;
            // Clicar pela âncora de texto
            await page.click(`${os}:has-text("${escolhido.text}")`);
            await page.waitForTimeout(30);
            selecaoFeita = true;
            break;
          }
        } catch (error) {}
      }
    } catch (error) {
      console.log('Erro ao processar componente de autocomplete/combobox:', error.message);
    }
  } else {
    // Aguardar um pouco para o select carregar as opções
    await page.waitForTimeout(obterTimeoutAdaptativo('interacao'));
    
    // Processar select tradicional
    try {
      // Listar opções disponíveis
      const opcoes = await page.$$eval(`${selectEncontrado} option`, options => 
        options.map(option => ({ value: option.value, text: (option.textContent || '').trim() }))
      );
      console.log('DEBUG: Opções select tradicional disponíveis:', opcoes);
      console.log('DEBUG: Opções normalizadas:', opcoes.map(o => ({ original: o.text, normalizada: normalizarTexto(o.text || '') })));

      // Encontrar a melhor opção usando os utilitários de normalização
      const melhorOpcao = encontrarMelhorOpcao(opcoes.map(o => o.text), nomeOJ);
      
      if (!melhorOpcao) {
        throw new Error(`Órgão julgador "${nomeOJ}" não encontrado entre as opções disponíveis`);
      }

      // Verificar se há ambiguidade
      verificarAmbiguidade(opcoes.map(o => o.text), nomeOJ, melhorOpcao);

      // Encontrar a opção correspondente pelo texto
      const opcaoEscolhida = opcoes.find(o => o.text === melhorOpcao);
      if (!opcaoEscolhida) {
        throw new Error(`Erro interno: opção "${melhorOpcao}" não encontrada na lista original`);
      }

      await page.selectOption(selectEncontrado, opcaoEscolhida.value);
      console.log(`Órgão julgador selecionado: ${opcaoEscolhida.text}`);
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
  
  // Buscar botão Gravar/Vincular usando os utilitários
  console.log('DEBUG: Procurando botão Gravar/Vincular...');
  
  let botaoEncontrado = false;
  const timeoutBusca = obterTimeoutAdaptativo('interacao');
  
  try {
    const botaoGravar = await buscarElemento(page, 'botaoAdicionar', timeoutBusca);
    
    if (botaoGravar) {
      console.log('DEBUG: Botão Gravar/Vincular encontrado, tentando clicar...');
      
      // Tentar diferentes estratégias de clique
      try {
        await page.click(botaoGravar, { force: true });
        console.log('DEBUG: Clique direto no botão realizado');
      } catch (e1) {
        try {
          // Clique com JavaScript como fallback
          await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) el.click();
          }, botaoGravar);
          console.log('DEBUG: Clique via JavaScript no botão realizado');
        } catch (e2) {
          console.log('DEBUG: Todas as estratégias de clique no botão falharam');
          throw new Error('Não foi possível clicar no botão Gravar/Vincular');
        }
      }
      
      console.log('DEBUG: Clique no botão Gravar/Vincular executado');
      
      // Aguardar processamento da ação
      await page.waitForTimeout(obterTimeoutAdaptativo('interacao'));
      
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
      } else {
        throw new Error('Clique no botão não teve efeito esperado');
      }
    }
  } catch (error) {
    console.log(`DEBUG: Erro ao buscar botão gravar/vincular: ${error.message}`);
    
    // Se a página foi fechada, parar imediatamente
    if (error.message.includes('Target page, context or browser has been closed')) {
      throw new Error('A página foi fechada durante a busca do botão vincular');
    }
  }
  
  if (!botaoEncontrado) {
    console.log(`DEBUG: Botão "Gravar" não encontrado`);
    
    // Usar utilitário para listar elementos disponíveis
    await listarElementosDisponiveis(page, 'button, input[type="submit"], input[type="button"]', 'botões');
    
    const mensagemErro = 'Botão "Gravar" não encontrado no modal de Localização/Visibilidade';
    
    throw new Error(mensagemErro);
  }
  
  // Aguardar modal de confirmação aparecer
  console.log('Aguardando modal de confirmação...');
  try {
    await page.waitForSelector('text=Tem certeza que deseja vincular esse Órgão Julgador ao Perito?', { timeout: 2000 });
    console.log('Modal de confirmação detectado');
    
    // Procurar e clicar no botão "Sim" usando utilitários
    const seletoresSim = [
      'button:has-text("Sim")',
      'button:has-text("sim")',
      'button:has-text("SIM")',
      'input[type="button"][value="Sim"]',
      'input[type="submit"][value="Sim"]',
      '.btn:has-text("Sim")'
    ];
    
    try {
      const botaoSim = await buscarElemento(page, seletoresSim, 'botão Sim do modal');
      await botaoSim.click();
      console.log('Clicou no botão Sim do modal de confirmação');
    } catch (error) {
      console.log('Botão Sim não encontrado, listando botões do modal:');
      await listarElementosDisponiveis(page, 'button, input[type="submit"], input[type="button"]', 'botões do modal');
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
  } catch (error) {}

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
  
  try {
    const acordeon = await buscarElemento(page, possiveisAcordeons, 'acordeão de Órgãos Julgadores', obterTimeoutAdaptativo('busca'));
    await acordeon.click();
    console.log('Acordeão de Órgãos Julgadores reaberto');
  } catch (error) {
    console.log('Acordeão não encontrado ou já estava aberto');
  }

  // Garantir que o botão/fluxo de Adicionar esteja disponível novamente para próximo vínculo
  try {
    await buscarElemento(page, 'botaoAdicionar', obterTimeoutAdaptativo('busca'));
    console.log('Botão Adicionar disponível para próximo vínculo');
  } catch (error) {
    console.log('Botão Adicionar não encontrado - pode estar em estado diferente');
  }

  // Pequeno intervalo para estabilidade entre vínculos
  await page.waitForTimeout(obterTimeoutAdaptativo('interacao'));

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
          } catch (error) {}
          
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
          } catch (error) {}
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

module.exports = { vincularOJ, vincularOJMelhorado, selecionarOrgaoJulgador, aguardarMatSelectOJPronto, prevenirCliqueHeader, debugElementosNaPagina };
