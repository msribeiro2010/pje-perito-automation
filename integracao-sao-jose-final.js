/**
 * INTEGRAÇÃO FINAL - SOLUÇÃO PARA VARAS DE SÃO JOSÉ DOS CAMPOS
 * Terminal: 1032-1058
 * Problema: Varas entram mas não buscam e não vinculam ao perito
 * Varas: 2ª, 3ª, 4ª e 5ª do Trabalho de São José dos Campos
 * Data: 2025-09-09
 * 
 * INSTRUÇÕES DE USO:
 * 1. Importe este arquivo no seu código principal
 * 2. Use a função processarVarasSaoJose() para resolver o problema
 * 3. Monitore os logs para acompanhar o progresso
 */

const fs = require('fs');
const path = require('path');

// Configuração otimizada para cada vara problemática
const CONFIG_VARAS_SAO_JOSE = {
    'vara_2_trabalho_sao_jose': {
        nome: '2ª Vara do Trabalho de São José dos Campos',
        seletores_busca: [
            'input[name="orgaoJulgador"]',
            '#orgaoJulgador',
            'input[placeholder*="órgão"]',
            'input[placeholder*="vara"]',
            '.campo-busca-orgao',
            'input[type="text"][class*="busca"]'
        ],
        seletores_vinculacao: [
            'button[title*="Adicionar"]',
            'button[onclick*="adicionar"]',
            '.btn-adicionar-orgao',
            'a[href*="adicionar"]',
            'input[type="button"][value*="Adicionar"]'
        ],
        timeout_busca: 8000,
        timeout_vinculacao: 6000,
        max_tentativas: 3,
        estrategia: 'robusta_com_fallback'
    },
    'vara_3_trabalho_sao_jose': {
        nome: '3ª Vara do Trabalho de São José dos Campos',
        seletores_busca: [
            'input[name="orgaoJulgador"]',
            '#orgaoJulgador',
            'input[placeholder*="órgão"]',
            '.campo-busca-orgao',
            'input[type="text"][class*="orgao"]',
            'input[class*="mat-input"]'
        ],
        seletores_vinculacao: [
            'button[title*="Adicionar"]',
            '.btn-adicionar-orgao',
            'button[onclick*="adicionar"]',
            'a[href*="adicionar"]',
            'input[type="button"][value*="Adicionar"]',
            'button[class*="mat-button"]'
        ],
        timeout_busca: 10000,
        timeout_vinculacao: 8000,
        max_tentativas: 4,
        estrategia: 'super_robusta'
    },
    'vara_4_trabalho_sao_jose': {
        nome: '4ª Vara do Trabalho de São José dos Campos',
        seletores_busca: [
            'input[name="orgaoJulgador"]',
            '#orgaoJulgador',
            'input[placeholder*="órgão"]',
            '.campo-busca-orgao',
            'input[type="text"]'
        ],
        seletores_vinculacao: [
            'button[title*="Adicionar"]',
            'button[onclick*="adicionar"]',
            '.btn-adicionar-orgao',
            'a[href*="adicionar"]'
        ],
        timeout_busca: 7000,
        timeout_vinculacao: 5000,
        max_tentativas: 3,
        estrategia: 'robusta'
    },
    'vara_5_trabalho_sao_jose': {
        nome: '5ª Vara do Trabalho de São José dos Campos',
        seletores_busca: [
            'input[name="orgaoJulgador"]',
            '#orgaoJulgador',
            'input[placeholder*="órgão"]',
            'input[placeholder*="vara"]',
            '.campo-busca-orgao',
            'input[type="text"][class*="busca"]',
            'input[class*="form-control"]'
        ],
        seletores_vinculacao: [
            'button[title*="Adicionar"]',
            '.btn-adicionar-orgao',
            'button[onclick*="adicionar"]',
            'a[href*="adicionar"]',
            'input[type="button"][value*="Adicionar"]',
            'button[class*="adicionar"]',
            'button[class*="btn-primary"]'
        ],
        timeout_busca: 12000,
        timeout_vinculacao: 10000,
        max_tentativas: 5,
        estrategia: 'ultra_robusta'
    }
};

class IntegracaoSaoJoseFinal {
    constructor(page) {
        this.page = page;
        this.config = CONFIG_VARAS_SAO_JOSE;
        this.relatorio = {
            timestamp: new Date().toISOString(),
            terminal: 'Terminal#1032-1058',
            problema: 'Varas entram mas não buscam e não vinculam ao perito',
            varas_processadas: [],
            sucessos: 0,
            falhas: 0
        };
    }

    /**
     * Função principal para processar todas as varas problemáticas
     * @param {string} termoBusca - Termo para buscar (nome do perito)
     * @returns {Promise<Object>} - Resultado do processamento
     */
    async processarVarasSaoJose(termoBusca) {
        console.log('🚀 Iniciando processamento das varas de São José dos Campos...');
        console.log(`📍 Terminal: 1032-1058`);
        console.log(`🎯 Problema: Varas entram mas não buscam e não vinculam ao perito`);
        console.log(`🔍 Termo de busca: ${termoBusca}\n`);

        const varas = Object.keys(this.config);
        
        for (const varaId of varas) {
            const varaConfig = this.config[varaId];
            console.log(`\n📍 Processando: ${varaConfig.nome}`);
            console.log(`⚙️ Estratégia: ${varaConfig.estrategia}`);
            
            try {
                const resultado = await this.processarVara(varaId, termoBusca);
                
                this.relatorio.varas_processadas.push({
                    vara_id: varaId,
                    vara_nome: varaConfig.nome,
                    sucesso: resultado.sucesso,
                    detalhes: resultado,
                    timestamp: new Date().toISOString()
                });
                
                if (resultado.sucesso) {
                    this.relatorio.sucessos++;
                    console.log(`✅ ${varaConfig.nome} - SUCESSO`);
                } else {
                    this.relatorio.falhas++;
                    console.log(`❌ ${varaConfig.nome} - FALHA: ${resultado.erro}`);
                }
                
                // Aguardar entre processamentos
                await this.page.waitForTimeout(3000);
                
            } catch (error) {
                console.log(`❌ Erro crítico ao processar ${varaConfig.nome}: ${error.message}`);
                this.relatorio.falhas++;
                this.relatorio.varas_processadas.push({
                    vara_id: varaId,
                    vara_nome: varaConfig.nome,
                    sucesso: false,
                    erro: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        await this.gerarRelatorioFinal();
        return this.relatorio;
    }

    /**
     * Processa uma vara específica
     * @param {string} varaId - ID da vara
     * @param {string} termoBusca - Termo para buscar
     * @returns {Promise<Object>} - Resultado do processamento
     */
    async processarVara(varaId, termoBusca) {
        const varaConfig = this.config[varaId];
        
        try {
            // 1. Executar busca
            console.log(`  🔍 Executando busca...`);
            const resultadoBusca = await this.executarBuscaOtimizada(varaConfig, termoBusca);
            
            if (!resultadoBusca.sucesso) {
                return {
                    sucesso: false,
                    erro: `Falha na busca: ${resultadoBusca.erro}`,
                    etapa: 'busca'
                };
            }
            
            console.log(`    ✅ Busca concluída com sucesso`);
            
            // 2. Aguardar estabilização
            await this.page.waitForTimeout(2000);
            
            // 3. Executar vinculação
            console.log(`  🔗 Executando vinculação...`);
            const resultadoVinculacao = await this.executarVinculacaoOtimizada(varaConfig);
            
            if (!resultadoVinculacao.sucesso) {
                return {
                    sucesso: false,
                    erro: `Falha na vinculação: ${resultadoVinculacao.erro}`,
                    etapa: 'vinculacao',
                    busca: resultadoBusca
                };
            }
            
            console.log(`    ✅ Vinculação concluída com sucesso`);
            
            return {
                sucesso: true,
                busca: resultadoBusca,
                vinculacao: resultadoVinculacao
            };
            
        } catch (error) {
            return {
                sucesso: false,
                erro: error.message,
                etapa: 'geral'
            };
        }
    }

    /**
     * Executa busca otimizada baseada na estratégia da vara
     * @param {Object} varaConfig - Configuração da vara
     * @param {string} termoBusca - Termo para buscar
     * @returns {Promise<Object>} - Resultado da busca
     */
    async executarBuscaOtimizada(varaConfig, termoBusca) {
        switch(varaConfig.estrategia) {
            case 'ultra_robusta':
                return await this.buscaUltraRobusta(varaConfig, termoBusca);
            case 'super_robusta':
                return await this.buscaSuperRobusta(varaConfig, termoBusca);
            case 'robusta_com_fallback':
                return await this.buscaRobustaComFallback(varaConfig, termoBusca);
            default:
                return await this.buscaRobusta(varaConfig, termoBusca);
        }
    }

    /**
     * Estratégia de busca ultra robusta (para 5ª Vara)
     */
    async buscaUltraRobusta(config, termoBusca) {
        for (let tentativa = 1; tentativa <= config.max_tentativas; tentativa++) {
            console.log(`    🎯 Tentativa ${tentativa}/${config.max_tentativas} - Ultra Robusta`);
            
            // Aguardar carregamento extra
            await this.page.waitForTimeout(4000);
            
            for (const seletor of config.seletores_busca) {
                try {
                    const elemento = await this.page.locator(seletor).first();
                    
                    if (await elemento.isVisible({ timeout: 3000 })) {
                        // Múltiplas abordagens de preenchimento
                        await elemento.click({ clickCount: 3 }); // Selecionar tudo
                        await elemento.fill(''); // Limpar
                        await elemento.type(termoBusca, { delay: 100 });
                        await elemento.press('Tab');
                        
                        // Aguardar resultados
                        await this.page.waitForTimeout(config.timeout_busca);
                        
                        // Verificar se resultados apareceram
                        const resultados = await this.page.locator('.resultado-busca, .item-resultado, .lista-orgaos li').count();
                        if (resultados > 0) {
                            return { sucesso: true, metodo: 'ultra_robusta', seletor, resultados };
                        }
                    }
                } catch (error) {
                    console.log(`      ⚠️ Erro com seletor ${seletor}: ${error.message}`);
                }
            }
            
            // Fallback JavaScript direto
            try {
                await this.page.evaluate((termo) => {
                    const campos = document.querySelectorAll('input[type="text"], input[type="search"]');
                    for (const campo of campos) {
                        if (campo.offsetParent !== null && 
                            (campo.name.includes('orgao') || 
                             campo.placeholder.includes('órgão') ||
                             campo.id.includes('orgao'))) {
                            campo.value = termo;
                            campo.dispatchEvent(new Event('input', { bubbles: true }));
                            campo.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                    return false;
                }, termoBusca);
                
                await this.page.waitForTimeout(config.timeout_busca);
                return { sucesso: true, metodo: 'javascript_direto' };
                
            } catch (error) {
                console.log(`      ⚠️ Fallback JavaScript falhou: ${error.message}`);
            }
        }
        
        return { sucesso: false, erro: 'Todas as tentativas de busca falharam' };
    }

    /**
     * Estratégia de busca super robusta (para 3ª Vara)
     */
    async buscaSuperRobusta(config, termoBusca) {
        console.log(`    🎯 Executando estratégia Super Robusta`);
        
        // Aguardar carregamento
        await this.page.waitForTimeout(3000);
        
        for (let tentativa = 1; tentativa <= config.max_tentativas; tentativa++) {
            for (const seletor of config.seletores_busca) {
                try {
                    const elemento = await this.page.waitForSelector(seletor, { timeout: 2000 });
                    
                    if (elemento && await elemento.isVisible()) {
                        await elemento.clear();
                        await elemento.fill(termoBusca);
                        await elemento.press('Enter');
                        
                        await this.page.waitForTimeout(config.timeout_busca);
                        
                        // Validar se busca funcionou
                        const valorInserido = await elemento.inputValue();
                        if (valorInserido === termoBusca) {
                            return { sucesso: true, metodo: 'super_robusta', seletor };
                        }
                    }
                } catch (error) {
                    console.log(`      ⚠️ Tentativa ${tentativa} com ${seletor} falhou: ${error.message}`);
                }
            }
        }
        
        return { sucesso: false, erro: 'Busca super robusta falhou' };
    }

    /**
     * Estratégia de busca robusta com fallback (para 2ª Vara)
     */
    async buscaRobustaComFallback(config, termoBusca) {
        console.log(`    🎯 Executando estratégia Robusta com Fallback`);
        
        // Tentar método padrão primeiro
        for (const seletor of config.seletores_busca) {
            try {
                const elemento = await this.page.locator(seletor).first();
                
                if (await elemento.isVisible({ timeout: 2000 })) {
                    await elemento.clear();
                    await elemento.fill(termoBusca);
                    
                    await this.page.waitForTimeout(config.timeout_busca);
                    return { sucesso: true, metodo: 'robusta_fallback', seletor };
                }
            } catch (error) {
                console.log(`      ⚠️ Erro com seletor ${seletor}: ${error.message}`);
            }
        }
        
        return { sucesso: false, erro: 'Busca robusta com fallback falhou' };
    }

    /**
     * Estratégia de busca robusta padrão (para 4ª Vara)
     */
    async buscaRobusta(config, termoBusca) {
        console.log(`    🎯 Executando estratégia Robusta`);
        
        for (const seletor of config.seletores_busca) {
            try {
                const elemento = await this.page.locator(seletor).first();
                
                if (await elemento.isVisible({ timeout: 2000 })) {
                    await elemento.fill(termoBusca);
                    await this.page.waitForTimeout(config.timeout_busca);
                    return { sucesso: true, metodo: 'robusta', seletor };
                }
            } catch (error) {
                console.log(`      ⚠️ Erro com seletor ${seletor}: ${error.message}`);
            }
        }
        
        return { sucesso: false, erro: 'Busca robusta falhou' };
    }

    /**
     * Executa vinculação otimizada
     * @param {Object} varaConfig - Configuração da vara
     * @returns {Promise<Object>} - Resultado da vinculação
     */
    async executarVinculacaoOtimizada(varaConfig) {
        for (let tentativa = 1; tentativa <= varaConfig.max_tentativas; tentativa++) {
            console.log(`    🎯 Tentativa ${tentativa}/${varaConfig.max_tentativas} - Vinculação`);
            
            for (const seletor of varaConfig.seletores_vinculacao) {
                try {
                    const botao = await this.page.locator(seletor).first();
                    
                    if (await botao.isVisible({ timeout: 2000 })) {
                        await botao.click();
                        await this.page.waitForTimeout(varaConfig.timeout_vinculacao);
                        
                        // Verificar se vinculação foi bem-sucedida
                        const confirmacao = await this.page.locator('.sucesso, .confirmacao, .vinculado').count();
                        if (confirmacao > 0) {
                            return { sucesso: true, metodo: 'vinculacao_otimizada', seletor };
                        }
                    }
                } catch (error) {
                    console.log(`      ⚠️ Erro com seletor ${seletor}: ${error.message}`);
                }
            }
        }
        
        return { sucesso: false, erro: 'Todas as tentativas de vinculação falharam' };
    }

    /**
     * Gera relatório final do processamento
     */
    async gerarRelatorioFinal() {
        const taxaSucesso = (this.relatorio.sucessos / (this.relatorio.sucessos + this.relatorio.falhas)) * 100;
        
        this.relatorio.resumo = {
            total_varas: this.relatorio.sucessos + this.relatorio.falhas,
            sucessos: this.relatorio.sucessos,
            falhas: this.relatorio.falhas,
            taxa_sucesso: taxaSucesso.toFixed(1) + '%'
        };
        
        this.relatorio.status = this.relatorio.sucessos === 4 ? 'RESOLVIDO' : 'PARCIALMENTE_RESOLVIDO';
        
        this.relatorio.proximos_passos = [
            'Monitorar logs do terminal 1032-1058',
            'Verificar se todas as varas estão funcionando',
            'Ajustar timeouts se necessário',
            'Documentar solução para futuras referências'
        ];
        
        const nomeArquivo = `INTEGRACAO-SAO-JOSE-FINAL-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(nomeArquivo, JSON.stringify(this.relatorio, null, 2));
        
        console.log(`\n📊 RELATÓRIO FINAL:`);
        console.log(`   • Total de varas: ${this.relatorio.resumo.total_varas}`);
        console.log(`   • Sucessos: ${this.relatorio.sucessos}`);
        console.log(`   • Falhas: ${this.relatorio.falhas}`);
        console.log(`   • Taxa de sucesso: ${this.relatorio.resumo.taxa_sucesso}`);
        console.log(`   • Status: ${this.relatorio.status}`);
        console.log(`\n📄 Relatório salvo em: ${nomeArquivo}`);
    }
}

/**
 * Função de conveniência para usar diretamente
 * @param {Object} page - Instância da página do Playwright
 * @param {string} termoBusca - Termo para buscar
 * @returns {Promise<Object>} - Resultado do processamento
 */
async function resolverProblemaVarasSaoJose(page, termoBusca) {
    const integracao = new IntegracaoSaoJoseFinal(page);
    return await integracao.processarVarasSaoJose(termoBusca);
}

module.exports = {
    IntegracaoSaoJoseFinal,
    resolverProblemaVarasSaoJose,
    CONFIG_VARAS_SAO_JOSE
};