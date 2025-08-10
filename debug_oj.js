// Script de debug para testar a normalização e busca de órgãos julgadores

const fs = require('fs');
const path = require('path');

// Carregar dados do perito
const peritoData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/perito.json'), 'utf8'));

// Função de normalização (copiada do vincularOJ.js)
const normalize = (text) => (text || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}+/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Stop words (copiadas do vincularOJ.js)
const STOP_WORDS = new Set([
  'vara','trabalho','tribunal','de','do','da','dos','das','juizado','civel','criminal','turma','regional','federal',
  'primeira','segunda','terceira','quarta','quinta','sexta','setima','oitava','nona','decima',
  'i','ii','iii','iv','v','vi','vii','viii','ix','x','0','1','2','3','4','5','6','7','8','9','a','º','ª'
]);

const extractSignificantTokens = (text) => {
  const norm = normalize(text);
  return norm.split(' ').filter(tok => tok.length >= 2 && !STOP_WORDS.has(tok));
};

// Simular opções disponíveis no sistema (baseado na experiência comum)
const opcoesSimuladas = [
  'Vara do Trabalho de Rio Claro',
  'Vara do Trabalho de Ourinhos',
  'Vara do Trabalho de Piracicaba',
  'Vara do Trabalho de Campinas',
  '1ª Vara do Trabalho de Rio Claro',
  '2ª Vara do Trabalho de Rio Claro',
  'Vara do Trabalho de Rio Claro - SP',
  'TRT 15ª Região - Vara do Trabalho de Rio Claro'
];

console.log('=== DEBUG ÓRGÃOS JULGADORES ===\n');

// Testar cada perito
peritoData.forEach((perito, index) => {
  console.log(`Perito ${index + 1}: ${perito.nome}`);
  console.log(`CPF: ${perito.cpf}`);
  
  perito.ojs.forEach((oj, ojIndex) => {
    console.log(`\n  OJ ${ojIndex + 1}: "${oj}"`);
    
    const targetNorm = normalize(oj);
    const targetTokens = extractSignificantTokens(oj);
    
    console.log(`  Normalizado: "${targetNorm}"`);
    console.log(`  Tokens significativos: [${targetTokens.join(', ')}]`);
    
    // Testar correspondências com opções simuladas
    console.log('\n  Testando correspondências:');
    
    const withNorm = opcoesSimuladas.map(o => ({ 
      text: o, 
      norm: normalize(o),
      tokens: extractSignificantTokens(o)
    }));
    
    // 1) Igualdade exata (normalizada)
    let candidates = withNorm.filter(o => o.norm === targetNorm || o.norm === targetNorm.replace(/\bde\b\s+/g,' '));
    console.log(`  Correspondência exata: ${candidates.length} encontrada(s)`);
    candidates.forEach(c => console.log(`    - "${c.text}" (norm: "${c.norm}")`));
    
    // 2) Cobertura total de tokens significativos
    if (candidates.length === 0) {
      candidates = withNorm.filter(o => {
        const oTokens = o.tokens;
        const match = targetTokens.every(t => oTokens.includes(t));
        return match;
      });
      console.log(`  Correspondência por tokens: ${candidates.length} encontrada(s)`);
      candidates.forEach(c => {
        console.log(`    - "${c.text}"`);
        console.log(`      Tokens: [${c.tokens.join(', ')}]`);
        console.log(`      Match: ${targetTokens.map(t => c.tokens.includes(t) ? '✓' : '✗').join(' ')}`);
      });
    }
    
    // 3) Correspondência parcial (para debug)
    const parciais = withNorm.filter(o => {
      const oTokens = o.tokens;
      const matchCount = targetTokens.filter(t => oTokens.includes(t)).length;
      return matchCount > 0 && matchCount < targetTokens.length;
    });
    
    if (parciais.length > 0) {
      console.log(`  Correspondências parciais: ${parciais.length}`);
      parciais.forEach(c => {
        const matchCount = targetTokens.filter(t => c.tokens.includes(t)).length;
        console.log(`    - "${c.text}" (${matchCount}/${targetTokens.length} tokens)`);
      });
    }
    
    if (candidates.length === 0 && parciais.length === 0) {
      console.log('  ❌ NENHUMA CORRESPONDÊNCIA ENCONTRADA');
    } else if (candidates.length === 1) {
      console.log(`  ✅ CORRESPONDÊNCIA ÚNICA: "${candidates[0].text}"`);
    } else if (candidates.length > 1) {
      console.log(`  ⚠️  MÚLTIPLAS CORRESPONDÊNCIAS (${candidates.length})`);
    }
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('=== FIM DEBUG ===');