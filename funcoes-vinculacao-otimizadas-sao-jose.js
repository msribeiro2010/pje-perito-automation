
/**
 * FUNÇÕES DE VINCULAÇÃO OTIMIZADAS - SÃO JOSÉ DOS CAMPOS
 * Baseadas nos resultados dos testes realizados
 */

// Função principal de vinculação otimizada
async function executarVinculacaoOtimizadaSaoJose(varaId) {
    const config = {
  "vara_2_trabalho_sao_jose": {
    "nome": "2ª Vara do Trabalho de São José dos Campos",
    "seletores_busca": [
      "input[name=\"orgaoJulgador\"]",
      "#orgaoJulgador",
      "input[placeholder*=\"órgão\"]",
      "input[placeholder*=\"vara\"]",
      ".campo-busca-orgao"
    ],
    "seletores_vinculacao": [
      "button[title*=\"Adicionar\"]",
      "button[onclick*=\"adicionar\"]",
      ".btn-adicionar-orgao",
      "a[href*=\"adicionar\"]"
    ],
    "timeout_busca": 8000,
    "timeout_vinculacao": 6000,
    "estrategia": "robusta_com_fallback"
  },
  "vara_3_trabalho_sao_jose": {
    "nome": "3ª Vara do Trabalho de São José dos Campos",
    "seletores_busca": [
      "input[name=\"orgaoJulgador\"]",
      "#orgaoJulgador",
      "input[placeholder*=\"órgão\"]",
      ".campo-busca-orgao",
      "input[type=\"text\"][class*=\"orgao\"]"
    ],
    "seletores_vinculacao": [
      "button[title*=\"Adicionar\"]",
      ".btn-adicionar-orgao",
      "button[onclick*=\"adicionar\"]",
      "a[href*=\"adicionar\"]",
      "input[type=\"button\"][value*=\"Adicionar\"]"
    ],
    "timeout_busca": 10000,
    "timeout_vinculacao": 8000,
    "estrategia": "super_robusta"
  },
  "vara_4_trabalho_sao_jose": {
    "nome": "4ª Vara do Trabalho de São José dos Campos",
    "seletores_busca": [
      "input[name=\"orgaoJulgador\"]",
      "#orgaoJulgador",
      "input[placeholder*=\"órgão\"]",
      ".campo-busca-orgao"
    ],
    "seletores_vinculacao": [
      "button[title*=\"Adicionar\"]",
      "button[onclick*=\"adicionar\"]",
      ".btn-adicionar-orgao"
    ],
    "timeout_busca": 7000,
    "timeout_vinculacao": 5000,
    "estrategia": "robusta"
  },
  "vara_5_trabalho_sao_jose": {
    "nome": "5ª Vara do Trabalho de São José dos Campos",
    "seletores_busca": [
      "input[name=\"orgaoJulgador\"]",
      "#orgaoJulgador",
      "input[placeholder*=\"órgão\"]",
      "input[placeholder*=\"vara\"]",
      ".campo-busca-orgao",
      "input[type=\"text\"][class*=\"busca\"]"
    ],
    "seletores_vinculacao": [
      "button[title*=\"Adicionar\"]",
      ".btn-adicionar-orgao",
      "button[onclick*=\"adicionar\"]",
      "a[href*=\"adicionar\"]",
      "input[type=\"button\"][value*=\"Adicionar\"]",
      "button[class*=\"adicionar\"]"
    ],
    "timeout_busca": 12000,
    "timeout_vinculacao": 10000,
    "estrategia": "ultra_robusta"
  }
};
    const varaConfig = config[varaId];
    
    if (!varaConfig) {
        throw new Error(`Configuração não encontrada para vara: ${varaId}`);
    }
    
    console.log(`🔗 Executando vinculação otimizada para: ${varaConfig.nome}`);
    
    switch(varaConfig.estrategia) {
        case 'ultra_robusta':
            return await executarVinculacaoUltraRobusta(varaConfig);
        case 'super_robusta':
            return await executarVinculacaoSuperRobusta(varaConfig);
        case 'robusta_com_fallback':
            return await executarVinculacaoRobustaComFallback(varaConfig);
        default:
            return await executarVinculacaoRobusta(varaConfig);
    }
}

// Estratégia ultra robusta de vinculação
async function executarVinculacaoUltraRobusta(config) {
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        console.log(`  🎯 Tentativa ${tentativa}/3 - Vinculação Ultra Robusta`);
        
        // Aguardar carregamento extra
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        for (const seletor of config.seletores_vinculacao) {
            try {
                const botao = await localizarBotaoAvancado(seletor);
                if (botao) {
                    await clicarBotaoAvancado(botao);
                    await aguardarConfirmacaoAvancada(config.timeout_vinculacao);
                    return { sucesso: true, metodo: 'ultra_robusta', seletor };
                }
            } catch (error) {
                console.log(`    ⚠️ Erro com seletor ${seletor}: ${error.message}`);
            }
        }
        
        // Fallback JavaScript direto
        try {
            await executarVinculacaoJavaScriptDireto();
            return { sucesso: true, metodo: 'javascript_direto' };
        } catch (error) {
            console.log(`    ⚠️ Fallback JavaScript falhou: ${error.message}`);
        }
    }
    
    return { sucesso: false, erro: 'Todas as tentativas de vinculação falharam' };
}

// Estratégia super robusta de vinculação
async function executarVinculacaoSuperRobusta(config) {
    console.log('  🎯 Executando vinculação Super Robusta');
    
    // Aguardar carregamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const seletor of config.seletores_vinculacao) {
        try {
            const botao = await localizarBotaoComRetry(seletor, 3);
            if (botao) {
                await clicarBotaoComValidacao(botao);
                await aguardarConfirmacaoComValidacao(config.timeout_vinculacao);
                return { sucesso: true, metodo: 'super_robusta', seletor };
            }
        } catch (error) {
            console.log(`    ⚠️ Erro com seletor ${seletor}: ${error.message}`);
        }
    }
    
    return { sucesso: false, erro: 'Vinculação super robusta falhou' };
}

module.exports = {
    executarVinculacaoOtimizadaSaoJose,
    executarVinculacaoUltraRobusta,
    executarVinculacaoSuperRobusta
};
        