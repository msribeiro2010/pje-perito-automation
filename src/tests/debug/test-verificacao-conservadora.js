/**
 * Teste específico para debugar a verificação conservadora
 */

const { chromium } = require('playwright');
const { verificacaoConservadoraOJ } = require('../../verificarOJVinculado');

async function testarVerificacaoConservadora() {
  console.log('🧪 Testando verificação conservadora...\n');
  
  let browser = null;
  let page = null;
  
  try {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    // HTML simplificado para teste
    await page.setContent(`
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td>1ª Vara do Trabalho de São Paulo</td>
                <td>Secretário de Audiência</td>
                <td>Público</td>
              </tr>
              <tr>
                <td>2ª Vara Cível</td>
                <td>Assessor</td>
                <td>Público</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    console.log('📄 HTML carregado. Testando verificação conservadora...\n');
    
    const ojTeste = "1ª Vara do Trabalho de São Paulo";
    console.log(`🔍 Procurando por: "${ojTeste}"`);
    
    const resultado = await verificacaoConservadoraOJ(page, ojTeste);
    
    console.log('\n📊 Resultado da verificação conservadora:');
    console.log(`   jaVinculado: ${resultado.jaVinculado}`);
    console.log(`   textoEncontrado: "${resultado.textoEncontrado}"`);
    console.log(`   tipoCorrespondencia: "${resultado.tipoCorrespondencia}"`);
    
    if (resultado.jaVinculado) {
      console.log('\n✅ Verificação conservadora funcionou!');
    } else {
      console.log('\n❌ Verificação conservadora falhou');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testarVerificacaoConservadora().then(() => {
    console.log('\n✨ Teste concluído!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { testarVerificacaoConservadora };