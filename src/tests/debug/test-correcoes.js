/**
 * Teste rápido das correções implementadas
 * Execute com: node src/tests/debug/test-correcoes.js
 */

const { VerificacaoOJPapel } = require('../../utils/verificacao-oj-papel');

console.log('🧪 Testando correções de verificação OJ + papel...\n');

const verificacao = new VerificacaoOJPapel();

// Teste 1: Papéis idênticos
console.log('📋 Teste 1: Papéis idênticos');
console.log('---------------------------------------');
const teste1 = verificacao._compararPapeis('Secretário de Audiência', 'Secretário de Audiência');
console.log(`Resultado: ${teste1}\n`);

// Teste 2: Papéis equivalentes
console.log('📋 Teste 2: Papéis equivalentes (Assessor vs Assessor)');
console.log('---------------------------------------');
const teste2 = verificacao._compararPapeis('Assessor', 'Assessor');
console.log(`Resultado: ${teste2}\n`);

// Teste 3: Papéis similares
console.log('📋 Teste 3: Papéis similares (Analista vs Analista Judiciário)');
console.log('---------------------------------------');
const teste3 = verificacao._compararPapeis('Analista', 'Analista Judiciário');
console.log(`Resultado: ${teste3}\n`);

// Teste 4: Papéis diferentes
console.log('📋 Teste 4: Papéis diferentes (Secretário vs Assessor)');
console.log('---------------------------------------');
const teste4 = verificacao._compararPapeis('Secretário de Audiência', 'Assessor');
console.log(`Resultado: ${teste4}\n`);

// Teste 5: Normalização funcionando
console.log('📋 Teste 5: Normalização (com acentos vs sem acentos)');
console.log('---------------------------------------');
const teste5 = verificacao._compararPapeis('Secretário', 'Secretario');
console.log(`Resultado: ${teste5}\n`);

console.log('🎯 Resumo dos testes:');
console.log(`   Teste 1 (idênticos): ${teste1 ? '✅' : '❌'}`);
console.log(`   Teste 2 (equivalentes): ${teste2 ? '✅' : '❌'}`);
console.log(`   Teste 3 (similares): ${teste3 ? '✅' : '❌'}`);
console.log(`   Teste 4 (diferentes): ${!teste4 ? '✅' : '❌'}`); // Invertido porque deveria ser false
console.log(`   Teste 5 (normalização): ${teste5 ? '✅' : '❌'}`);

const sucessos = [teste1, teste2, teste3, !teste4, teste5].filter(Boolean).length;
console.log(`\n📊 Taxa de sucesso: ${sucessos}/5 (${(sucessos/5*100).toFixed(1)}%)`);

if (sucessos === 5) {
    console.log('\n🎉 Todos os testes passaram! Sistema deve funcionar corretamente.');
} else {
    console.log('\n⚠️ Alguns testes falharam. Verificar implementação.');
}

console.log('\n✨ Teste concluído!');