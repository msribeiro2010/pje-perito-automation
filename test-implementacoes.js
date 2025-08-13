#!/usr/bin/env node

/**
 * Script de teste manual para verificar as implementações realizadas
 */

const path = require('path');
const fs = require('fs');

// Função para testar se um arquivo existe e pode ser importado
function testarArquivo(caminho, nome) {
  try {
    if (!fs.existsSync(caminho)) {
      console.log(`❌ ${nome}: Arquivo não encontrado em ${caminho}`);
      return false;
    }
    
    // Tentar fazer require do arquivo
    require(caminho);
    console.log(`✅ ${nome}: Arquivo carregado com sucesso`);
    return true;
  } catch (error) {
    console.log(`❌ ${nome}: Erro ao carregar - ${error.message}`);
    return false;
  }
}

// Função para testar utilitários
function testarUtilitarios() {
  console.log('\n🔍 Testando utilitários...');
  
  try {
    const { 
      buscarElemento, 
      aguardarElemento, 
      clicarElemento, 
      aguardarTempo,
      obterTimeoutAdaptativo,
      obterTimeoutProgressivo
    } = require('./src/utils/index.js');
    
    console.log('✅ Utilitários principais importados com sucesso');
    
    // Testar se as funções existem
    const funcoes = {
      buscarElemento,
      aguardarElemento, 
      clicarElemento,
      aguardarTempo,
      obterTimeoutAdaptativo,
      obterTimeoutProgressivo
    };
    
    for (const [nome, funcao] of Object.entries(funcoes)) {
      if (typeof funcao === 'function') {
        console.log(`✅ ${nome}: Função disponível`);
      } else {
        console.log(`❌ ${nome}: Não é uma função`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Erro ao testar utilitários: ${error.message}`);
    return false;
  }
}

// Função para testar normalização
function testarNormalizacao() {
  console.log('\n🔍 Testando normalização...');
  
  try {
    const { NormalizadorTexto, normalizarTexto, extrairTokensSignificativos, calcularSimilaridade } = require('./src/utils/normalizacao.js');
    
    // Teste 1: Normalização básica
    const resultado1 = normalizarTexto('Órgão Julgador');
    if (resultado1 === 'orgao julgador') {
      console.log(`✅ normalizarTexto: "Órgão Julgador" → "${resultado1}"`);
    } else {
      console.log(`❌ normalizarTexto: "Órgão Julgador" → "${resultado1}" (esperado: "orgao julgador")`);
    }
    
    // Teste 2: Normalização via classe
    const resultado2 = NormalizadorTexto.normalizar('Órgão Julgador');
    if (resultado2 === 'orgao julgador') {
      console.log(`✅ NormalizadorTexto.normalizar: "Órgão Julgador" → "${resultado2}"`);
    } else {
      console.log(`❌ NormalizadorTexto.normalizar: "Órgão Julgador" → "${resultado2}" (esperado: "orgao julgador")`);
    }
    
    // Teste 3: Extração de tokens
    const resultado3 = extrairTokensSignificativos('Tribunal de Justiça');
    if (Array.isArray(resultado3) && resultado3.includes('justica')) {
      console.log(`✅ extrairTokensSignificativos: "Tribunal de Justiça" → [${resultado3.join(', ')}]`);
    } else {
      console.log(`❌ extrairTokensSignificativos: "Tribunal de Justiça" → [${resultado3.join(', ')}] (esperado conter: justica)`);
    }
    
    // Teste 4: Similaridade
    const similaridade = calcularSimilaridade('Vara Cível', 'Vara Civil');
    if (similaridade && typeof similaridade.score === 'number') {
      console.log(`✅ Similaridade entre 'Vara Cível' e 'Vara Civil': ${similaridade.score.toFixed(2)}`);
    } else {
      console.log(`❌ Erro ao calcular similaridade`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Erro ao testar normalização: ${error.message}`);
    console.log(`Stack trace: ${error.stack}`);
    return false;
  }
}

// Função para testar timeouts
function testarTimeouts() {
  console.log('\n🔍 Testando timeouts...');
  
  try {
    const { obterTimeoutAdaptativo, obterTimeoutProgressivo } = require('./src/utils/index.js');
    
    // Testar timeout adaptativo
    const timeoutNormal = obterTimeoutAdaptativo('interacao', 'normal');
    const timeoutCritico = obterTimeoutAdaptativo('navegacao', 'critico');
    
    console.log(`✅ Timeout adaptativo normal: ${timeoutNormal}ms`);
    console.log(`✅ Timeout adaptativo crítico: ${timeoutCritico}ms`);
    
    // Testar timeout progressivo
    const timeoutProgressivo1 = obterTimeoutProgressivo('interacao', 'normal', 1);
    const timeoutProgressivo3 = obterTimeoutProgressivo('interacao', 'normal', 3);
    
    console.log(`✅ Timeout progressivo (tentativa 1): ${timeoutProgressivo1}ms`);
    console.log(`✅ Timeout progressivo (tentativa 3): ${timeoutProgressivo3}ms`);
    
    return true;
  } catch (error) {
    console.log(`❌ Erro ao testar timeouts: ${error.message}`);
    return false;
  }
}

// Função principal
function executarTestes() {
  console.log('🚀 Iniciando testes das implementações...\n');
  
  const arquivos = [
    { caminho: './src/utils/index.js', nome: 'Utilitários principais' },
    { caminho: './src/utils/normalizacao.js', nome: 'Normalização de texto' },
    { caminho: './src/utils/timeouts.js', nome: 'Gerenciamento de timeouts' },
    { caminho: './src/utils/seletores.js', nome: 'Seletores otimizados' },
    { caminho: './src/utils/Logger.js', nome: 'Sistema de logging' },
    { caminho: './src/vincularOJ.js', nome: 'Vinculação de OJ' },
    { caminho: './src/verificarOJVinculado.js', nome: 'Verificação de OJ' },
    { caminho: './src/navigate.js', nome: 'Navegação' }
  ];
  
  let sucessos = 0;
  
  // Testar carregamento de arquivos
  console.log('📁 Testando carregamento de arquivos...');
  for (const arquivo of arquivos) {
    if (testarArquivo(arquivo.caminho, arquivo.nome)) {
      sucessos++;
    }
  }
  
  // Testar funcionalidades específicas
  if (testarUtilitarios()) sucessos++;
  if (testarNormalizacao()) sucessos++;
  if (testarTimeouts()) sucessos++;
  
  // Resumo
  console.log('\n📊 Resumo dos testes:');
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Falhas: ${arquivos.length + 3 - sucessos}`);
  
  if (sucessos === arquivos.length + 3) {
    console.log('\n🎉 Todos os testes passaram! As implementações estão funcionando corretamente.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os erros acima.');
    process.exit(1);
  }
}

// Executar testes
executarTestes();