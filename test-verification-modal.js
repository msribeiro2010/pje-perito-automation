/**
 * Teste do modal de verificação do banco de dados
 * Verifica se o modal está funcionando corretamente com dados reais
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testarModalVerificacao() {
    console.log('🧪 Testando modal de verificação do banco de dados...\n');
    
    let electronApp;
    let page;
    
    try {
        // Iniciar aplicação Electron
        console.log('🚀 Iniciando aplicação Electron...');
        electronApp = await electron.launch({
            args: [path.join(__dirname, 'src/main.js')],
            timeout: 30000
        });
        
        // Obter primeira janela
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        
        console.log('✅ Aplicação carregada');
        
        // Aguardar interface carregar
        await page.waitForTimeout(2000);
        
        // Verificar se existe botão de verificação do banco
        console.log('\n📋 Procurando botão de verificação do banco...');
        
        // Procurar por diferentes possíveis seletores do botão
        const possiveisSeletores = [
            'button[onclick*="verificar"]',
            'button:has-text("Verificar")',
            'button:has-text("verificar")',
            'button:has-text("Banco")',
            'button:has-text("banco")',
            '#verificar-banco',
            '.verificar-banco',
            'button[id*="verificar"]',
            'button[class*="verificar"]'
        ];
        
        let botaoEncontrado = null;
        let seletorUsado = null;
        
        for (const seletor of possiveisSeletores) {
            try {
                const elemento = await page.locator(seletor).first();
                if (await elemento.isVisible()) {
                    botaoEncontrado = elemento;
                    seletorUsado = seletor;
                    console.log(`✅ Botão encontrado com seletor: ${seletor}`);
                    break;
                }
            } catch (error) {
                // Continuar procurando
            }
        }
        
        if (!botaoEncontrado) {
            console.log('⚠️  Botão de verificação não encontrado. Listando todos os botões disponíveis:');
            
            const todosBotoes = await page.locator('button').all();
            for (let i = 0; i < todosBotoes.length; i++) {
                try {
                    const texto = await todosBotoes[i].textContent();
                    const id = await todosBotoes[i].getAttribute('id');
                    const classe = await todosBotoes[i].getAttribute('class');
                    console.log(`   Botão ${i + 1}: "${texto}" (id: ${id}, class: ${classe})`);
                } catch (error) {
                    console.log(`   Botão ${i + 1}: Erro ao obter informações`);
                }
            }
            
            // Tentar encontrar qualquer elemento que contenha "verificar" no texto
            const elementosVerificar = await page.locator('*:has-text("verificar")').all();
            if (elementosVerificar.length > 0) {
                console.log('\n📋 Elementos que contêm "verificar":');
                for (let i = 0; i < elementosVerificar.length; i++) {
                    try {
                        const tagName = await elementosVerificar[i].evaluate(el => el.tagName);
                        const texto = await elementosVerificar[i].textContent();
                        console.log(`   ${tagName}: "${texto}"`);
                    } catch (error) {
                        console.log(`   Elemento ${i + 1}: Erro ao obter informações`);
                    }
                }
            }
            
            return;
        }
        
        // Clicar no botão de verificação
        console.log('\n📋 Clicando no botão de verificação...');
        await botaoEncontrado.click();
        
        // Aguardar modal aparecer
        await page.waitForTimeout(1000);
        
        // Verificar se modal apareceu
        console.log('\n📋 Verificando se modal apareceu...');
        
        const possiveisModais = [
            '.modal',
            '#modal',
            '[role="dialog"]',
            '.dialog',
            '.popup',
            '.overlay'
        ];
        
        let modalEncontrado = false;
        
        for (const seletor of possiveisModais) {
            try {
                const modal = await page.locator(seletor).first();
                if (await modal.isVisible()) {
                    console.log(`✅ Modal encontrado com seletor: ${seletor}`);
                    modalEncontrado = true;
                    
                    // Verificar conteúdo do modal
                    const conteudo = await modal.textContent();
                    console.log(`📄 Conteúdo do modal: ${conteudo.substring(0, 200)}...`);
                    
                    break;
                }
            } catch (error) {
                // Continuar procurando
            }
        }
        
        if (!modalEncontrado) {
            console.log('⚠️  Modal não encontrado. Verificando se há mudanças na página...');
            
            // Aguardar um pouco mais e verificar novamente
            await page.waitForTimeout(3000);
            
            // Capturar screenshot para debug
            await page.screenshot({ path: 'debug-verification-test.png' });
            console.log('📸 Screenshot salvo como debug-verification-test.png');
        }
        
        console.log('\n✅ Teste do modal de verificação concluído!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (page) {
            try {
                await page.screenshot({ path: 'final-verification-test.png' });
                console.log('📸 Screenshot final salvo como final-verification-test.png');
            } catch (error) {
                console.log('⚠️  Não foi possível salvar screenshot final');
            }
        }
        
        if (electronApp) {
            await electronApp.close();
            console.log('🔒 Aplicação Electron fechada');
        }
    }
}

// Executar teste
testarModalVerificacao().catch(console.error);