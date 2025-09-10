
/**
 * 🔍 FUNÇÕES DE BUSCA ROBUSTAS PARA SÃO JOSÉ DOS CAMPOS
 * Resolve problema: Terminal#1032-1058
 */

/**
 * Executa busca robusta de órgão julgador
 * @param {Object} page - Página do Playwright
 * @param {string} nomeOrgao - Nome do órgão a buscar
 * @param {Object} options - Opções de configuração
 * @returns {Promise<boolean>} - Sucesso da busca
 */
async function executarBuscaRobustaSaoJose(page, nomeOrgao, options = {}) {
    const timeout = options.timeout || 15000;
    const tentativas = options.tentativas || 5;
    
    console.log(`🔍 Iniciando busca robusta para: ${nomeOrgao}`);
    
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
            console.log(`   Tentativa ${tentativa}/${tentativas}`);
            
            // 1. Localizar campo de busca
            const campoBusca = await localizarCampoBuscaSaoJose(page, timeout);
            if (!campoBusca) {
                console.log('   ❌ Campo de busca não encontrado');
                continue;
            }
            
            // 2. Limpar e inserir termo de busca
            await campoBusca.fill('');
            await page.waitForTimeout(500);
            await campoBusca.fill(nomeOrgao);
            await page.waitForTimeout(1000);
            
            console.log(`   ✅ Termo inserido: ${nomeOrgao}`);
            
            // 3. Executar busca
            const buscaExecutada = await executarAcaoBuscaSaoJose(page, timeout);
            if (!buscaExecutada) {
                console.log('   ❌ Não foi possível executar a busca');
                continue;
            }
            
            // 4. Aguardar resultados
            const resultadosCarregados = await aguardarResultadosBuscaSaoJose(page, timeout);
            if (!resultadosCarregados) {
                console.log('   ❌ Resultados não carregaram');
                continue;
            }
            
            console.log('   ✅ Busca executada com sucesso');
            return true;
            
        } catch (error) {
            console.log(`   ❌ Erro na tentativa ${tentativa}: ${error.message}`);
            if (tentativa < tentativas) {
                await page.waitForTimeout(2000);
            }
        }
    }
    
    console.log('❌ Falha em todas as tentativas de busca');
    return false;
}

/**
 * Localiza campo de busca com múltiplos seletores
 */
async function localizarCampoBuscaSaoJose(page, timeout) {
    const seletores = [
    "input[placeholder*=\"Buscar órgão\"]",
    "input[placeholder*=\"buscar órgão\"]",
    "input[placeholder*=\"Pesquisar órgão\"]",
    "input[placeholder*=\"pesquisar órgão\"]",
    "input[placeholder*=\"Buscar\"]",
    "input[placeholder*=\"buscar\"]",
    "input[placeholder*=\"Pesquisar\"]",
    "input[placeholder*=\"pesquisar\"]",
    "input[name*=\"search\"]",
    "input[name*=\"busca\"]",
    "input[name*=\"pesquisa\"]",
    "input[id*=\"search\"]",
    "input[id*=\"busca\"]",
    "input[id*=\"pesquisa\"]",
    ".search-input",
    ".busca-input",
    ".pesquisa-input",
    ".mat-input-element",
    "[data-testid*=\"search\"]",
    "[data-testid*=\"busca\"]",
    "[data-testid*=\"pesquisa\"]",
    "input[type=\"text\"]",
    "input[type=\"search\"]"
];
    
    for (const seletor of seletores) {
        try {
            console.log(`      🔍 Testando campo: ${seletor}`);
            const elemento = await page.waitForSelector(seletor, { 
                timeout: 2000, 
                state: 'visible' 
            });
            if (elemento) {
                console.log(`      ✅ Campo encontrado: ${seletor}`);
                return elemento;
            }
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    // Fallback: buscar qualquer input visível
    try {
        const inputs = await page.$$('input[type="text"]:visible, input[type="search"]:visible');
        if (inputs.length > 0) {
            console.log('      ✅ Campo encontrado via fallback');
            return inputs[0];
        }
    } catch (error) {
        // Ignore
    }
    
    return null;
}

/**
 * Executa ação de busca (clique no botão ou Enter)
 */
async function executarAcaoBuscaSaoJose(page, timeout) {
    const seletores = [
    "button:has-text(\"Buscar Órgão\")",
    "button:has-text(\"Buscar órgão\")",
    "button:has-text(\"Pesquisar Órgão\")",
    "button:has-text(\"Pesquisar órgão\")",
    "button:has-text(\"Buscar\")",
    "button:has-text(\"Pesquisar\")",
    "button:has-text(\"Procurar\")",
    "button[type=\"submit\"]",
    "input[type=\"submit\"]",
    "button.search-button",
    "button.busca-button",
    "button.pesquisa-button",
    ".btn-search",
    ".btn-buscar",
    ".btn-pesquisar",
    ".mat-raised-button",
    "button:has(mat-icon:text(\"search\"))",
    "button:has(.fa-search)",
    "button:has(.glyphicon-search)",
    "form button:first-of-type",
    ".search-form button"
];
    
    // Tentar clicar em botão de busca
    for (const seletor of seletores) {
        try {
            console.log(`      🔍 Testando botão: ${seletor}`);
            const botao = await page.waitForSelector(seletor, { 
                timeout: 2000, 
                state: 'visible' 
            });
            if (botao) {
                await botao.click();
                console.log(`      ✅ Botão clicado: ${seletor}`);
                return true;
            }
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    // Fallback: pressionar Enter
    try {
        await page.keyboard.press('Enter');
        console.log('      ✅ Enter pressionado como fallback');
        return true;
    } catch (error) {
        console.log('      ❌ Fallback Enter falhou');
    }
    
    return false;
}

/**
 * Aguarda carregamento dos resultados da busca
 */
async function aguardarResultadosBuscaSaoJose(page, timeout) {
    const seletores = [
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
    
    // Aguardar qualquer lista de resultados aparecer
    for (const seletor of seletores) {
        try {
            console.log(`      🔍 Aguardando resultados: ${seletor}`);
            await page.waitForSelector(seletor, { 
                timeout: 8000, 
                state: 'visible' 
            });
            console.log(`      ✅ Resultados carregados: ${seletor}`);
            return true;
        } catch (error) {
            // Continua para próximo seletor
        }
    }
    
    // Aguardar um tempo para carregamento dinâmico
    await page.waitForTimeout(3000);
    
    // Verificar se há algum conteúdo novo na página
    try {
        const conteudoAntes = await page.textContent('body');
        await page.waitForTimeout(2000);
        const conteudoDepois = await page.textContent('body');
        
        if (conteudoAntes !== conteudoDepois) {
            console.log('      ✅ Conteúdo dinâmico detectado');
            return true;
        }
    } catch (error) {
        // Ignore
    }
    
    return false;
}
