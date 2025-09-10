
// Função melhorada para encontrar botão "Adicionar Órgão Julgador"
async function encontrarBotaoAdicionarMelhorado(page, tentativa = 1) {
    console.log(`🔍 Tentativa ${tentativa} - Procurando botão "Adicionar Órgão Julgador"...`);
    
    // Estratégia 1: Garantir painel expandido
    await garantirPainelExpandido(page);
    
    // Estratégia 2: Limpar overlays
    await limparOverlaysAngular(page);
    
    // Estratégia 3: Seletores melhorados em ordem de prioridade
    const seletoresPrioritarios = [
        'mat-expansion-panel[aria-expanded="true"] button:has-text("Adicionar")',
        'mat-expansion-panel-content button:has-text("Adicionar Órgão Julgador")',
        '#cdk-accordion-child-8 button:has-text("Adicionar")',
        'button[mat-button]:has-text("Adicionar")',
        '.mat-expansion-panel-content .mat-button:has-text("Adicionar")'
    ];
    
    for (const seletor of seletoresPrioritarios) {
        try {
            console.log(`   Testando: ${seletor}`);
            const botao = page.locator(seletor).first();
            
            // Aguardar elemento aparecer
            await botao.waitFor({ timeout: 3000 });
            
            // Verificar se está visível
            if (await botao.isVisible()) {
                console.log(`✅ Botão encontrado com: ${seletor}`);
                return botao;
            }
        } catch (error) {
            console.log(`   ❌ Falhou: ${error.message}`);
        }
    }
    
    // Estratégia 4: Fallback com JavaScript
    try {
        const botaoJS = await page.evaluate(() => {
            const botoes = Array.from(document.querySelectorAll('button'));
            return botoes.find(btn => 
                btn.textContent.includes('Adicionar') && 
                (btn.textContent.includes('Órgão') || btn.textContent.includes('Julgador'))
            );
        });
        
        if (botaoJS) {
            console.log('✅ Botão encontrado via JavaScript');
            return page.locator('button').filter({ hasText: /Adicionar.*Órgão|Adicionar.*Julgador/ }).first();
        }
    } catch (error) {
        console.log(`❌ Fallback JavaScript falhou: ${error.message}`);
    }
    
    // Se chegou aqui, não encontrou
    if (tentativa < 3) {
        console.log(`⏳ Aguardando ${SAO_JOSE_CONFIG.tentativas.intervalo}ms antes da próxima tentativa...`);
        await page.waitForTimeout(SAO_JOSE_CONFIG.tentativas.intervalo);
        return encontrarBotaoAdicionarMelhorado(page, tentativa + 1);
    }
    
    throw new Error('Botão "Adicionar Órgão Julgador" não encontrado após todas as tentativas');
}

// Função auxiliar para garantir painel expandido
async function garantirPainelExpandido(page) {
    try {
        const painelHeader = page.locator('mat-expansion-panel-header:has-text("Órgãos Julgadores")');
        await painelHeader.waitFor({ timeout: 5000 });
        
        const isExpanded = await painelHeader.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
            console.log('🔄 Expandindo painel de Órgãos Julgadores...');
            await painelHeader.click();
            await page.waitForTimeout(2000); // Aguardar animação
        }
    } catch (error) {
        console.log(`⚠️ Erro ao expandir painel: ${error.message}`);
    }
}

// Função auxiliar para limpar overlays
async function limparOverlaysAngular(page) {
    try {
        // Fechar mat-select abertos
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Fechar tooltips
        await page.mouse.click(10, 10); // Click em área neutra
        await page.waitForTimeout(500);
    } catch (error) {
        console.log(`⚠️ Erro ao limpar overlays: ${error.message}`);
    }
}
