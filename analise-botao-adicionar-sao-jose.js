/**
 * Script para analisar e corrigir o problema do botão "Adicionar Órgão Julgador"
 * nas varas de São José dos Campos
 * 
 * Problema identificado: Terminal#1039-1060 mostra falhas no seletor do botão
 * "Adicionar Órgão Julgador" especificamente para as varas de São José dos Campos
 */

const fs = require('fs');
const path = require('path');

// Configuração específica para São José dos Campos
const SAO_JOSE_CONFIG = {
    varas: [
        '2ª Vara do Trabalho de São José dos Campos',
        '3ª Vara do Trabalho de São José dos Campos', 
        '4ª Vara do Trabalho de São José dos Campos',
        '5ª Vara do Trabalho de São José dos Campos'
    ],
    
    // Novos seletores específicos baseados na análise dos logs
    seletoresBotaoAdicionar: [
        // Seletores mais específicos primeiro
        'mat-expansion-panel[aria-expanded="true"] button:has-text("Adicionar")',
        'mat-expansion-panel-content button:has-text("Adicionar Órgão Julgador")',
        'div[class*="mat-expansion-panel-content"] button[class*="mat-button"]',
        
        // Seletores por atributos Angular Material
        'button[mat-button]:has-text("Adicionar")',
        'button[mat-raised-button]:has-text("Adicionar")',
        'button[mat-flat-button]:has-text("Adicionar")',
        
        // Seletores por estrutura DOM específica
        '#cdk-accordion-child-8 button',
        '[id*="cdk-accordion"] button:has-text("Adicionar")',
        'mat-accordion mat-expansion-panel button',
        
        // Seletores por aria-label
        'button[aria-label*="Adicionar"]',
        'button[aria-label*="Órgão"]',
        'button[aria-label*="Julgador"]',
        
        // Seletores por data attributes
        'button[data-action="adicionar"]',
        'button[data-target*="orgao"]',
        
        // Seletores CSS mais genéricos
        '.mat-expansion-panel-content .mat-button',
        '.panel-content button',
        '.accordion-content button',
        
        // Fallbacks extremos
        'button:contains("Adicionar")',
        'input[type="button"][value*="Adicionar"]',
        'a[role="button"]:contains("Adicionar")'
    ],
    
    // Estratégias de espera e retry
    timeouts: {
        aguardarPainel: 5000,
        aguardarBotao: 8000,
        entreCliques: 2000,
        verificacao: 1000
    },
    
    tentativas: {
        maximas: 5,
        intervalo: 3000
    }
};

/**
 * Analisa o problema atual dos seletores
 */
function analisarProblema() {
    console.log('🔍 ANÁLISE DO PROBLEMA - Botão "Adicionar Órgão Julgador"');
    console.log('=' .repeat(60));
    
    const problemas = {
        seletores_falhando: [
            'button:has-text("Adicionar Órgão Julgador ao Perito")',
            'button:has-text("Adicionar Órgão Julgador")',
            'button:has-text("Adicionar")'
        ],
        
        causas_possiveis: [
            'Mudança na estrutura DOM do Angular Material',
            'Botão sendo renderizado dinamicamente',
            'Painel não expandido completamente',
            'Overlay ou modal bloqueando o elemento',
            'Timing de carregamento inadequado',
            'Seletores muito genéricos causando conflitos'
        ],
        
        varas_afetadas: SAO_JOSE_CONFIG.varas
    };
    
    console.log('📋 Problemas identificados:');
    console.log(JSON.stringify(problemas, null, 2));
    
    return problemas;
}

/**
 * Cria seletores melhorados baseados na análise
 */
function criarSeletoresMelhorados() {
    console.log('\n🔧 CRIANDO SELETORES MELHORADOS');
    console.log('=' .repeat(60));
    
    const seletoresMelhorados = {
        // Estratégia 1: Seletores contextuais específicos
        contextuais: [
            // Dentro do painel expandido de Órgãos Julgadores
            'mat-expansion-panel[aria-expanded="true"] mat-expansion-panel-content button:has-text("Adicionar")',
            'mat-expansion-panel:has(mat-panel-title:has-text("Órgãos Julgadores")) button',
            
            // Por estrutura Angular Material
            '.mat-expansion-panel-content .mat-button-wrapper:has-text("Adicionar")',
            '.mat-expansion-panel-body button[class*="mat-button"]',
            
            // Por posição no DOM
            'mat-accordion > mat-expansion-panel:nth-child(n) button:has-text("Adicionar")',
            '#cdk-accordion-child-8 > div > div > button'
        ],
        
        // Estratégia 2: Seletores por atributos específicos
        atributos: [
            'button[ng-reflect-router-link*="adicionar"]',
            'button[ng-reflect-disabled="false"]:has-text("Adicionar")',
            'button[tabindex="0"]:has-text("Adicionar")',
            'button[type="button"]:has-text("Adicionar Órgão")'
        ],
        
        // Estratégia 3: Seletores por texto flexível
        textoFlexivel: [
            'button:contains("Adicionar"):contains("Órgão")',
            'button:contains("Adicionar"):contains("Julgador")',
            'button[title*="Adicionar"]',
            '*[role="button"]:contains("Adicionar")',
            'a:contains("Adicionar Órgão")'
        ],
        
        // Estratégia 4: Seletores por hierarquia
        hierarquia: [
            'mat-expansion-panel mat-expansion-panel-content > div > button',
            'mat-accordion mat-expansion-panel div[class*="content"] button',
            '.mat-expansion-panel .mat-expansion-panel-content .mat-button'
        ]
    };
    
    console.log('✅ Seletores melhorados criados:');
    Object.keys(seletoresMelhorados).forEach(categoria => {
        console.log(`\n📂 ${categoria.toUpperCase()}:`);
        seletoresMelhorados[categoria].forEach((seletor, index) => {
            console.log(`  ${index + 1}. ${seletor}`);
        });
    });
    
    return seletoresMelhorados;
}

/**
 * Cria estratégias de fallback
 */
function criarEstrategiasFallback() {
    console.log('\n🛡️ CRIANDO ESTRATÉGIAS DE FALLBACK');
    console.log('=' .repeat(60));
    
    const estrategias = {
        // Estratégia 1: Aguardar e expandir painel
        expandirPainel: {
            descricao: 'Garantir que o painel esteja expandido antes de buscar o botão',
            passos: [
                'Localizar header do painel "Órgãos Julgadores"',
                'Verificar se aria-expanded="true"',
                'Se não, clicar para expandir',
                'Aguardar animação de expansão',
                'Buscar botão dentro do conteúdo expandido'
            ]
        },
        
        // Estratégia 2: Limpeza de overlays
        limparOverlays: {
            descricao: 'Remover possíveis overlays que bloqueiam o botão',
            passos: [
                'Fechar dropdowns abertos (mat-select)',
                'Fechar tooltips (mat-tooltip)',
                'Fechar modais (mat-dialog)',
                'Pressionar ESC para limpar estado'
            ]
        },
        
        // Estratégia 3: Scroll e viewport
        ajustarViewport: {
            descricao: 'Garantir que o botão esteja visível no viewport',
            passos: [
                'Scroll até o painel de Órgãos Julgadores',
                'Aguardar estabilização',
                'Verificar se botão está no viewport',
                'Ajustar zoom se necessário'
            ]
        },
        
        // Estratégia 4: Simulação de eventos
        simularEventos: {
            descricao: 'Usar eventos JavaScript diretos se seletores falharem',
            passos: [
                'Localizar elemento por querySelector',
                'Disparar evento click programaticamente',
                'Verificar mudança de estado',
                'Confirmar abertura de modal'
            ]
        }
    };
    
    console.log('📋 Estratégias de fallback:');
    Object.keys(estrategias).forEach(nome => {
        const estrategia = estrategias[nome];
        console.log(`\n🎯 ${nome.toUpperCase()}:`);
        console.log(`   Descrição: ${estrategia.descricao}`);
        console.log(`   Passos:`);
        estrategia.passos.forEach((passo, index) => {
            console.log(`     ${index + 1}. ${passo}`);
        });
    });
    
    return estrategias;
}

/**
 * Gera código de correção
 */
function gerarCodigoCorrecao() {
    console.log('\n💻 GERANDO CÓDIGO DE CORREÇÃO');
    console.log('=' .repeat(60));
    
    const codigoCorrecao = `
// Função melhorada para encontrar botão "Adicionar Órgão Julgador"
async function encontrarBotaoAdicionarMelhorado(page, tentativa = 1) {
    console.log(\`🔍 Tentativa \${tentativa} - Procurando botão "Adicionar Órgão Julgador"...\`);
    
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
            console.log(\`   Testando: \${seletor}\`);
            const botao = page.locator(seletor).first();
            
            // Aguardar elemento aparecer
            await botao.waitFor({ timeout: 3000 });
            
            // Verificar se está visível
            if (await botao.isVisible()) {
                console.log(\`✅ Botão encontrado com: \${seletor}\`);
                return botao;
            }
        } catch (error) {
            console.log(\`   ❌ Falhou: \${error.message}\`);
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
        console.log(\`❌ Fallback JavaScript falhou: \${error.message}\`);
    }
    
    // Se chegou aqui, não encontrou
    if (tentativa < 3) {
        console.log(\`⏳ Aguardando \${SAO_JOSE_CONFIG.tentativas.intervalo}ms antes da próxima tentativa...\`);
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
        console.log(\`⚠️ Erro ao expandir painel: \${error.message}\`);
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
        console.log(\`⚠️ Erro ao limpar overlays: \${error.message}\`);
    }
}
`;
    
    console.log('✅ Código de correção gerado');
    return codigoCorrecao;
}

/**
 * Cria arquivo de configuração específica
 */
function criarConfiguracaoEspecifica() {
    console.log('\n⚙️ CRIANDO CONFIGURAÇÃO ESPECÍFICA');
    console.log('=' .repeat(60));
    
    const configuracao = {
        nome: 'SAO_JOSE_CAMPOS_BOTAO_ADICIONAR_FIX',
        versao: '1.0.0',
        data: new Date().toISOString(),
        
        problema: {
            descricao: 'Botão "Adicionar Órgão Julgador" não encontrado nas varas de São José dos Campos',
            terminal_referencia: 'Terminal#1039-1060',
            varas_afetadas: SAO_JOSE_CONFIG.varas
        },
        
        solucao: {
            seletores_melhorados: SAO_JOSE_CONFIG.seletoresBotaoAdicionar,
            timeouts: SAO_JOSE_CONFIG.timeouts,
            tentativas: SAO_JOSE_CONFIG.tentativas,
            estrategias_fallback: [
                'expandir_painel_primeiro',
                'limpar_overlays_angular',
                'usar_seletores_contextuais',
                'fallback_javascript'
            ]
        },
        
        implementacao: {
            arquivos_modificar: [
                'src/vincularOJ.js',
                'src/utils/seletores.js',
                'src/main/servidor-automation-v2.js'
            ],
            funcoes_criar: [
                'encontrarBotaoAdicionarMelhorado',
                'garantirPainelExpandido',
                'limparOverlaysAngular'
            ]
        }
    };
    
    console.log('📋 Configuração específica:');
    console.log(JSON.stringify(configuracao, null, 2));
    
    return configuracao;
}

/**
 * Executa análise completa e gera relatório
 */
function executarAnaliseCompleta() {
    console.log('🚀 INICIANDO ANÁLISE COMPLETA');
    console.log('=' .repeat(80));
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        // 1. Analisar problema
        const problemas = analisarProblema();
        
        // 2. Criar seletores melhorados
        const seletoresMelhorados = criarSeletoresMelhorados();
        
        // 3. Criar estratégias de fallback
        const estrategiasFallback = criarEstrategiasFallback();
        
        // 4. Gerar código de correção
        const codigoCorrecao = gerarCodigoCorrecao();
        
        // 5. Criar configuração específica
        const configuracao = criarConfiguracaoEspecifica();
        
        // 6. Gerar relatório final
        const relatorio = {
            timestamp: new Date().toISOString(),
            problema_analisado: problemas,
            seletores_melhorados: seletoresMelhorados,
            estrategias_fallback: estrategiasFallback,
            codigo_correcao: codigoCorrecao,
            configuracao: configuracao,
            
            proximos_passos: [
                '1. Implementar seletores melhorados no vincularOJ.js',
                '2. Adicionar estratégias de fallback',
                '3. Testar com as 4 varas de São José dos Campos',
                '4. Monitorar logs para verificar eficácia',
                '5. Ajustar timeouts se necessário'
            ],
            
            arquivos_gerados: [
                `ANALISE-BOTAO-ADICIONAR-SAO-JOSE-${timestamp}.json`,
                'codigo-correcao-botao-adicionar.js'
            ]
        };
        
        // Salvar relatório
        const nomeRelatorio = `ANALISE-BOTAO-ADICIONAR-SAO-JOSE-${timestamp}.json`;
        fs.writeFileSync(nomeRelatorio, JSON.stringify(relatorio, null, 2));
        
        // Salvar código de correção
        fs.writeFileSync('codigo-correcao-botao-adicionar.js', codigoCorrecao);
        
        console.log('\n✅ ANÁLISE COMPLETA FINALIZADA');
        console.log('=' .repeat(80));
        console.log(`📄 Relatório salvo: ${nomeRelatorio}`);
        console.log(`💻 Código salvo: codigo-correcao-botao-adicionar.js`);
        console.log('\n📋 RESUMO:');
        console.log(`   • Problema: Botão "Adicionar Órgão Julgador" não encontrado`);
        console.log(`   • Varas afetadas: ${SAO_JOSE_CONFIG.varas.length}`);
        console.log(`   • Seletores criados: ${SAO_JOSE_CONFIG.seletoresBotaoAdicionar.length}`);
        console.log(`   • Estratégias de fallback: ${Object.keys(estrategiasFallback).length}`);
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        relatorio.proximos_passos.forEach((passo, index) => {
            console.log(`   ${passo}`);
        });
        
        return relatorio;
        
    } catch (error) {
        console.error('❌ Erro durante análise:', error.message);
        throw error;
    }
}

// Executar análise
if (require.main === module) {
    executarAnaliseCompleta();
}

module.exports = {
    SAO_JOSE_CONFIG,
    analisarProblema,
    criarSeletoresMelhorados,
    criarEstrategiasFallback,
    gerarCodigoCorrecao,
    executarAnaliseCompleta
};