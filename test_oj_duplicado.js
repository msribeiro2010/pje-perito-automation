// Script de teste para verificar comportamento quando OJ já está vinculado

const { chromium } = require('playwright');
const { vincularOJ } = require('./src/vincularOJ.js');

async function testarOJDuplicado() {
  console.log('🧪 Testando comportamento quando OJ já está vinculado...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para uma página de teste (substitua pela URL real do PJE)
    console.log('📍 Navegando para o PJE...');
    await page.goto('https://pje.trt15.jus.br/pje/');
    
    // Aguardar login manual
    console.log('⏳ Faça login manualmente e navegue até a página de cadastro do perito...');
    console.log('⏳ Pressione Enter quando estiver na página correta...');
    
    // Aguardar input do usuário
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    // Testar vinculação de um OJ que já pode estar vinculado
    const ojTeste = 'Vara do Trabalho de Rio Claro';
    
    console.log(`🔗 Tentando vincular OJ: ${ojTeste}`);
    
    try {
      await vincularOJ(page, ojTeste);
      console.log('✅ Vinculação realizada com sucesso');
    } catch (error) {
      console.log('❌ Erro na vinculação:', error.message);
      
      // Verificar se é um erro de duplicata ou outro tipo
      if (error.message.includes('não encontrado')) {
        console.log('🔍 Erro: OJ não encontrado na lista');
      } else if (error.message.includes('Múltiplas opções')) {
        console.log('🔀 Erro: Múltiplas opções encontradas');
      } else if (error.message.includes('página foi fechada')) {
        console.log('🚪 Erro: Página foi fechada inesperadamente');
      } else {
        console.log('❓ Erro desconhecido - pode ser OJ já vinculado ou outro problema');
      }
    }
    
    // Verificar se há mensagens de erro na página
    console.log('🔍 Verificando mensagens de erro na página...');
    
    const possiveisMensagensErro = [
      'já vinculado',
      'já cadastrado', 
      'duplicado',
      'não é possível vincular',
      'erro',
      'falha',
      'inválido'
    ];
    
    for (const mensagem of possiveisMensagensErro) {
      try {
        const elemento = await page.locator(`text=${mensagem}`).first();
        if (await elemento.isVisible()) {
          const textoCompleto = await elemento.textContent();
          console.log(`⚠️  Mensagem encontrada: "${textoCompleto}"`);
        }
      } catch {
        // Mensagem não encontrada, continuar
      }
    }
    
    // Verificar alertas ou modais
    console.log('🔍 Verificando alertas ou modais...');
    
    const alertas = await page.locator('.alert, .modal, .toast, .notification, [role="alert"]').all();
    for (let i = 0; i < alertas.length; i++) {
      try {
        if (await alertas[i].isVisible()) {
          const texto = await alertas[i].textContent();
          console.log(`📢 Alerta ${i + 1}: "${texto.trim()}"`);
        }
      } catch {
        // Continuar se houver erro
      }
    }
    
    console.log('\n📋 RESUMO DO COMPORTAMENTO:');
    console.log('1. O sistema atual não possui validação específica para OJs já vinculados');
    console.log('2. A automação tentará vincular novamente mesmo se já estiver vinculado');
    console.log('3. O comportamento depende da resposta do sistema PJE');
    console.log('4. Erros são capturados e reportados como warnings no log');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    console.log('\n⏳ Pressione Enter para fechar o navegador...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    await browser.close();
  }
}

// Executar o teste
if (require.main === module) {
  testarOJDuplicado().catch(console.error);
}

module.exports = { testarOJDuplicado };