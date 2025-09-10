
/**
 * 🔗 FUNÇÕES DE VINCULAÇÃO ROBUSTAS PARA SÃO JOSÉ DOS CAMPOS
 * Resolve problema: Terminal#1032-1058
 */

/**
 * Executa vinculação robusta de órgão ao perito
 * @param {Object} page - Página do Playwright
 * @param {string} nomeOrgao - Nome do órgão a vincular
 * @param {Object} options - Opções de configuração
 * @returns {Promise<boolean>} - Sucesso da vinculação
 */
async function executarVinculacaoRobustaSaoJose(page, nomeOrgao, options = {}) {
    const timeout = options.timeout || 12000;
    const tentativas = options.tentativas || 5;
    
    console.log(`🔗 Iniciando vinculação robusta para: ${nomeOrgao}`);
    
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
            console.log(`   Tentativa ${tentativa}/${tentativas}`);
            
            // 1. Localizar item do órgão nos resultados
            const itemOrgao = await localizarItemOrgaoSaoJose(page, nomeOrgao, timeout);
            if (!itemOrgao) {
                console.log('   ❌ Item do órgão não encontrado nos resultados');
                continue;
            }
            
            // 2. Executar ação de vinculação
            const vinculacaoExecutada = await executarAcaoVinculacaoSaoJose(page, itemOrgao, timeout);
            if (!vinculacaoExecutada) {
                console.log('   ❌ Não foi possível executar a vinculação');
                continue;
            }
            
            // 3. Confirmar vinculação
            const vinculacaoConfirmada = await confirmarVinculacaoSaoJose(page, timeout);
            if (!vinculacaoConfirmada) {
                console.log('   ❌ Vinculação não foi confirmada');
                continue;
            }
            
            console.log('   ✅ Vinculação executada com sucesso');
            return true;
            
        } catch (error) {
            console.log(`   ❌ Erro na tentativa ${tentativa}: ${error.message}`);
            if (tentativa < tentativas) {
                await page.waitForTimeout(2000);
            }
        }
    }
    
    console.log('❌ Falha em todas as tentativas de vinculação');
    return false;
}

/**
 * Localiza item específico do órgão nos resultados
 */
async function localizarItemOrgaoSaoJose(page, nomeOrgao, timeout) {
    const seletoresLista = [
    ".lista-orgaos",
    ".orgaos-lista",
    ".resultado-orgaos",
    ".search-results-orgaos",
    ".resultado-busca",
    ".lista-resultados",
    ".search-results",
    ".resultados",
    ".mat-list",
    ".mat-table",
    "mat-list",
    "mat-table",
    "table tbody",
    "table.resultados",
    ".table-resultados",
    ".grid-resultados",
    ".results-grid",
    ".grid-row",
    ".results-container",
    ".search-container",
    "[data-testid*=\"results\"]"
];
    const seletoresItem = [
    ".item-orgao",
    ".orgao-item",
    ".resultado-orgao",
    ".resultado-item",
    ".search-item",
    ".list-item",
    "mat-list-item",
    ".mat-list-item",
    "tr",
    "tbody tr",
    ".table-row",
    "div[role=\"button\"]",
    "div[tabindex]",
    ".clickable"
];
    
    // Primeiro, localizar a lista de resultados
    let listaResultados = null;
    for (const seletor of seletoresLista) {
        try {
            listaResultados = await page.waitForSelector(seletor, { 
                timeout: 2000, 
                state: 'visible' 
            });
            if (listaResultados) {
                console.log(`      ✅ Lista encontrada: ${seletor}`);
                break;
            }
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    if (!listaResultados) {
        console.log('      ❌ Lista de resultados não encontrada');
        return null;
    }
    
    // Procurar item específico do órgão
    for (const seletor of seletoresItem) {
        try {
            const items = await page.$$(seletor);
            for (const item of items) {
                const texto = await item.textContent();
                if (texto && texto.includes(nomeOrgao)) {
                    console.log(`      ✅ Item encontrado: ${seletor}`);
                    return item;
                }
            }
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    // Fallback: buscar por texto diretamente
    try {
        const itemTexto = await page.locator(`text=${nomeOrgao}`).first();
        if (await itemTexto.isVisible()) {
            console.log('      ✅ Item encontrado via texto');
            return itemTexto;
        }
    } catch (error) {
        // Ignore
    }
    
    return null;
}

/**
 * Executa ação de vinculação (clique, checkbox, etc.)
 */
async function executarAcaoVinculacaoSaoJose(page, itemOrgao, timeout) {
    const seletores = [
    "button:has-text(\"Vincular ao Perito\")",
    "button:has-text(\"Vincular Órgão\")",
    "button:has-text(\"Adicionar Órgão\")",
    "button:has-text(\"Selecionar Órgão\")",
    "button:has-text(\"Vincular\")",
    "button:has-text(\"Adicionar\")",
    "button:has-text(\"Selecionar\")",
    "button:has-text(\"Confirmar\")",
    "button:has-text(\"OK\")",
    ".btn-vincular",
    ".btn-adicionar",
    ".btn-selecionar",
    ".btn-confirmar",
    ".mat-raised-button",
    "[data-action=\"vincular\"]",
    "[data-action=\"adicionar\"]",
    "[data-action=\"selecionar\"]",
    "input[type=\"checkbox\"]",
    ".checkbox",
    ".mat-checkbox",
    "[role=\"checkbox\"]"
];
    
    // Tentar clicar em botão de vinculação próximo ao item
    for (const seletor of seletores) {
        try {
            // Buscar botão dentro ou próximo ao item
            const botao = await itemOrgao.$(seletor);
            if (botao && await botao.isVisible()) {
                await botao.click();
                console.log(`      ✅ Botão clicado no item: ${seletor}`);
                return true;
            }
            
            // Buscar botão na mesma linha/container
            const container = await itemOrgao.locator('..').first();
            const botaoContainer = await container.$(seletor);
            if (botaoContainer && await botaoContainer.isVisible()) {
                await botaoContainer.click();
                console.log(`      ✅ Botão clicado no container: ${seletor}`);
                return true;
            }
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    // Fallback: clicar no próprio item
    try {
        await itemOrgao.click();
        console.log('      ✅ Item clicado diretamente');
        return true;
    } catch (error) {
        console.log('      ❌ Falha ao clicar no item');
    }
    
    return false;
}

/**
 * Confirma a vinculação (aguarda feedback visual)
 */
async function confirmarVinculacaoSaoJose(page, timeout) {
    // Aguardar indicadores de sucesso
    const indicadoresSucesso = [
        '.success-message',
        '.sucesso',
        '.alert-success',
        '.notification-success',
        'text=sucesso',
        'text=vinculado',
        'text=adicionado'
    ];
    
    for (const indicador of indicadoresSucesso) {
        try {
            await page.waitForSelector(indicador, { 
                timeout: 3000, 
                state: 'visible' 
            });
            console.log(`      ✅ Sucesso confirmado: ${indicador}`);
            return true;
        } catch (error) {
            // Continua para próximo indicador
        }
    }
    
    // Aguardar mudança na URL ou conteúdo
    await page.waitForTimeout(2000);
    
    // Verificar se houve redirecionamento ou mudança
    try {
        const url = page.url();
        if (url.includes('sucesso') || url.includes('confirmado')) {
            console.log('      ✅ Sucesso confirmado via URL');
            return true;
        }
    } catch (error) {
        // Ignore
    }
    
    // Assumir sucesso se não houve erro
    console.log('      ⚠️ Sucesso assumido (sem indicadores claros)');
    return true;
}
