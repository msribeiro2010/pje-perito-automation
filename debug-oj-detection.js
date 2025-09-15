#!/usr/bin/env node

/**
 * Script de debug para analisar por que 6 OJs específicas não estão sendo reconhecidas
 */

const fs = require('fs').promises;
const path = require('path');

// Função de normalização copiada do smart-oj-cache.js
function normalizarTexto(texto) {
  if (!texto) return '';

  return texto
    .toLowerCase()
    .trim()
    // Normalizar diferentes tipos de travessões e hífens
    .replace(/[\u2013\u2014\u2015\u2212\-–—]/g, '-')  // Travessões para hífen
    .replace(/[\s\-]+/g, ' ')     // Espaços e hífens para espaço único
    .replace(/[^a-z0-9\sçáàâãéêíóôõúü]/g, '')  // Manter acentos brasileiros
    .replace(/\s+/g, ' ')         // Normalizar espaços múltiplos
    .trim();
}

// Função de similaridade copiada do smart-oj-cache.js
function calcularSimilaridade(texto1, texto2) {
  if (texto1 === texto2) return 1;
  if (!texto1 || !texto2) return 0;

  // Algoritmo de distância de Levenshtein otimizado
  const len1 = texto1.length;
  const len2 = texto2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = texto1[i - 1] === texto2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len2][len1]) / maxLen;
}

async function debugOJDetection() {
  console.log('🔍 Debug da Detecção de OJs\n');

  // Carregar cache atual
  let cacheData = {};
  try {
    const cacheFile = path.join(__dirname, 'data', 'smart-oj-cache.json');
    const data = await fs.readFile(cacheFile, 'utf8');
    cacheData = JSON.parse(data);
  } catch (error) {
    console.log('❌ Erro ao carregar cache:', error.message);
    return;
  }

  const cpfDirlei = '097.503.508-80';
  const servidorCache = cacheData[cpfDirlei];

  if (!servidorCache) {
    console.log('❌ Cache não encontrado para Dirlei');
    return;
  }

  console.log(`📊 Estatísticas do Cache para ${cpfDirlei}:`);
  console.log(`   - Total Verificados: ${servidorCache.estatisticas.totalVerificados}`);
  console.log(`   - Já Vinculados: ${servidorCache.estatisticas.jaVinculados}`);
  console.log(`   - Para Vincular: ${servidorCache.estatisticas.paraVincular}`);

  // OJs que deveriam ser reconhecidas mas estão aparecendo como "para processar"
  const ojsProblematicas = [
    '1ª Vara do Trabalho de Franca',
    '1ª Vara do Trabalho de Sorocaba',
    '2ª Vara do Trabalho de Araraquara',
    '3ª Vara do Trabalho de Piracicaba',
    'CEJUSC SÃO JOSÉ DO RIO PRETO - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho',
    'CEJUSC SÃO JOSÉ DOS CAMPOS - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho'
  ];

  // OJs que estão no cache como "já vinculadas"
  const ojsJaVinculadas = servidorCache.ojsJaVinculados || [];
  const ojsParaVincular = servidorCache.ojsParaVincular || [];

  console.log('\n🔍 Análise das OJs Problemáticas:\n');

  for (const ojProblematica of ojsProblematicas) {
    console.log(`\n--- Analisando: "${ojProblematica}" ---`);

    const ojNormalizada = normalizarTexto(ojProblematica);
    console.log(`📝 Normalizada: "${ojNormalizada}"`);

    // Verificar se está nas listas
    const estaParaVincular = ojsParaVincular.includes(ojProblematica);
    const estaJaVinculada = ojsJaVinculadas.find(item => item.oj === ojProblematica);

    console.log(`📋 No cache como "para vincular": ${estaParaVincular ? 'SIM' : 'NÃO'}`);
    console.log(`✅ No cache como "já vinculada": ${estaJaVinculada ? 'SIM' : 'NÃO'}`);

    if (estaJaVinculada) {
      console.log(`   📍 Texto encontrado: "${estaJaVinculada.textoEncontrado}"`);
      console.log(`   🔗 Tipo correspondência: ${estaJaVinculada.tipoCorrespondencia}`);
    }

    // Analisar similaridade com as OJs já vinculadas
    console.log(`\n🔎 Análise de Similaridade:`);
    for (const ojVinculada of ojsJaVinculadas) {
      const similaridade = calcularSimilaridade(ojNormalizada, normalizarTexto(ojVinculada.oj));
      if (similaridade > 0.7) {
        console.log(`   📊 "${ojVinculada.oj}" - Similaridade: ${(similaridade * 100).toFixed(1)}%`);
        if (similaridade >= 0.95) {
          console.log(`      ⚠️  ALTA SIMILARIDADE - Deveria ser reconhecida!`);
        }
      }
    }

    // Verificar se há correspondência exata normalizada
    const matchExato = ojsJaVinculadas.find(item => normalizarTexto(item.oj) === ojNormalizada);
    if (matchExato) {
      console.log(`   ✅ MATCH EXATO ENCONTRADO: "${matchExato.oj}"`);
      console.log(`      🚨 PROBLEMA: OJ deveria ser reconhecida mas não está sendo!`);
    }
  }

  console.log('\n📋 Sumário do Cache:');
  console.log('\nOJs Já Vinculadas:');
  ojsJaVinculadas.forEach((item, index) => {
    console.log(`${index + 1}. "${item.oj}" (${item.tipoCorrespondencia})`);
  });

  console.log('\nOJs Para Vincular:');
  ojsParaVincular.forEach((oj, index) => {
    console.log(`${index + 1}. "${oj}"`);
  });

  // Verificar se há problema de correspondência entre cache e configuração
  console.log('\n🔍 Verificação de Correspondência Cache vs Configuração:');

  // Carregar configuração das OJs
  try {
    const orgaosFile = path.join(__dirname, 'src', 'renderer', 'orgaos_pje.json');
    const orgaosData = await fs.readFile(orgaosFile, 'utf8');
    const orgaos = JSON.parse(orgaosData);

    // Criar lista flat de todas as OJs da configuração
    const todasOJsConfig = [];
    for (const cidade in orgaos) {
      todasOJsConfig.push(...orgaos[cidade]);
    }

    console.log(`📊 Total de OJs na configuração: ${todasOJsConfig.length}`);

    // Verificar se as OJs problemáticas estão na configuração
    for (const ojProblematica of ojsProblematicas) {
      const estaConfig = todasOJsConfig.includes(ojProblematica);
      console.log(`🔍 "${ojProblematica}" está na configuração: ${estaConfig ? 'SIM' : 'NÃO'}`);

      if (!estaConfig) {
        // Procurar por similaridade na configuração
        const ojNormalizada = normalizarTexto(ojProblematica);
        const similares = todasOJsConfig.filter(oj => {
          const sim = calcularSimilaridade(ojNormalizada, normalizarTexto(oj));
          return sim > 0.8;
        });

        if (similares.length > 0) {
          console.log(`   📋 OJs similares na configuração:`);
          similares.forEach(oj => {
            const sim = calcularSimilaridade(ojNormalizada, normalizarTexto(oj));
            console.log(`      - "${oj}" (${(sim * 100).toFixed(1)}%)`);
          });
        }
      }
    }

  } catch (error) {
    console.log('❌ Erro ao carregar configuração de OJs:', error.message);
  }
}

// Executar debug
debugOJDetection().catch(console.error);