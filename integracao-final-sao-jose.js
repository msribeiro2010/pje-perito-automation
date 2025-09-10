
/**
 * INTEGRAÇÃO FINAL - SÃO JOSÉ DOS CAMPOS
 * Arquivo para integrar as funções otimizadas ao sistema principal
 */

const { executarBuscaOtimizadaSaoJose } = require('./funcoes-busca-otimizadas-sao-jose');
const { executarVinculacaoOtimizadaSaoJose } = require('./funcoes-vinculacao-otimizadas-sao-jose');
const configFinal = require('./config-final-sao-jose-otimizada.json');

// Função principal de integração
async function integrarSolucaoSaoJose(varaId, termoBusca) {
    try {
        console.log(`🚀 Iniciando processo completo para vara: ${varaId}`);
        
        // 1. Executar busca otimizada
        const resultadoBusca = await executarBuscaOtimizadaSaoJose(varaId, termoBusca);
        
        if (!resultadoBusca.sucesso) {
            throw new Error(`Falha na busca: ${resultadoBusca.erro}`);
        }
        
        console.log('  ✅ Busca concluída com sucesso');
        
        // 2. Aguardar estabilização
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Executar vinculação otimizada
        const resultadoVinculacao = await executarVinculacaoOtimizadaSaoJose(varaId);
        
        if (!resultadoVinculacao.sucesso) {
            throw new Error(`Falha na vinculação: ${resultadoVinculacao.erro}`);
        }
        
        console.log('  ✅ Vinculação concluída com sucesso');
        
        return {
            sucesso: true,
            vara: configFinal.configuracoes.varas[varaId].nome,
            busca: resultadoBusca,
            vinculacao: resultadoVinculacao,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Erro no processo: ${error.message}`);
        return {
            sucesso: false,
            erro: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Função para processar todas as varas
async function processarTodasVarasSaoJose(termoBusca) {
    const varas = Object.keys(configFinal.configuracoes.varas);
    const resultados = [];
    
    for (const varaId of varas) {
        console.log(`
📍 Processando: ${configFinal.configuracoes.varas[varaId].nome}`);
        const resultado = await integrarSolucaoSaoJose(varaId, termoBusca);
        resultados.push(resultado);
        
        // Aguardar entre processamentos
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return resultados;
}

module.exports = {
    integrarSolucaoSaoJose,
    processarTodasVarasSaoJose
};
        