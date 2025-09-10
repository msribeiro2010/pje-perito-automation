
/**
 * FUNÇÕES DE BUSCA OTIMIZADAS - SÃO JOSÉ DOS CAMPOS
 * Baseadas nos resultados dos testes realizados
 */

// Função principal de busca otimizada
async function executarBuscaOtimizadaSaoJose(varaId, termoBusca) {
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
    
    console.log(`🔍 Executando busca otimizada para: ${varaConfig.nome}`);
    
    switch(varaConfig.estrategia) {
        case 'ultra_robusta':
            return await executarBuscaUltraRobusta(varaConfig, termoBusca);
        case 'super_robusta':
            return await executarBuscaSuperRobusta(varaConfig, termoBusca);
        case 'robusta_com_fallback':
            return await executarBuscaRobustaComFallback(varaConfig, termoBusca);
        default:
            return await executarBuscaRobusta(varaConfig, termoBusca);
    }
}

// Estratégia ultra robusta (para 5ª Vara)
async function executarBuscaUltraRobusta(config, termoBusca) {
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        console.log(`  🎯 Tentativa ${tentativa}/3 - Estratégia Ultra Robusta`);
        
        // Aguardar carregamento extra
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        for (const seletor of config.seletores_busca) {
            try {
                // Tentar múltiplas abordagens
                const elemento = await localizarElementoAvancado(seletor);
                if (elemento) {
                    await preencherCampoAvancado(elemento, termoBusca);
                    await aguardarResultadosAvancado(config.timeout_busca);
                    return { sucesso: true, metodo: 'ultra_robusta', seletor };
                }
            } catch (error) {
                console.log(`    ⚠️ Erro com seletor ${seletor}: ${error.message}`);
            }
        }
        
        // Fallback JavaScript direto
        try {
            await executarBuscaJavaScriptDireto(termoBusca);
            return { sucesso: true, metodo: 'javascript_direto' };
        } catch (error) {
            console.log(`    ⚠️ Fallback JavaScript falhou: ${error.message}`);
        }
    }
    
    return { sucesso: false, erro: 'Todas as tentativas falharam' };
}

// Estratégia super robusta (para 3ª Vara)
async function executarBuscaSuperRobusta(config, termoBusca) {
    console.log('  🎯 Executando estratégia Super Robusta');
    
    // Aguardar carregamento
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    for (const seletor of config.seletores_busca) {
        try {
            const elemento = await localizarElementoComRetry(seletor, 3);
            if (elemento) {
                await preencherCampoComValidacao(elemento, termoBusca);
                await aguardarResultadosComValidacao(config.timeout_busca);
                return { sucesso: true, metodo: 'super_robusta', seletor };
            }
        } catch (error) {
            console.log(`    ⚠️ Erro com seletor ${seletor}: ${error.message}`);
        }
    }
    
    return { sucesso: false, erro: 'Busca super robusta falhou' };
}

// Estratégia robusta com fallback (para 2ª Vara)
async function executarBuscaRobustaComFallback(config, termoBusca) {
    console.log('  🎯 Executando estratégia Robusta com Fallback');
    
    // Tentar método padrão primeiro
    for (const seletor of config.seletores_busca) {
        try {
            const elemento = await document.querySelector(seletor);
            if (elemento && elemento.offsetParent !== null) {
                elemento.value = termoBusca;
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
                
                await new Promise(resolve => setTimeout(resolve, config.timeout_busca));
                return { sucesso: true, metodo: 'robusta_fallback', seletor };
            }
        } catch (error) {
            console.log(`    ⚠️ Erro com seletor ${seletor}: ${error.message}`);
        }
    }
    
    return { sucesso: false, erro: 'Busca robusta com fallback falhou' };
}

module.exports = {
    executarBuscaOtimizadaSaoJose,
    executarBuscaUltraRobusta,
    executarBuscaSuperRobusta,
    executarBuscaRobustaComFallback
};
        