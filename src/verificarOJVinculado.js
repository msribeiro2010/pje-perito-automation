// Função para verificar se um Órgão Julgador já está vinculado ao perito

async function verificarOJJaVinculado(page, nomeOJ) {
  console.log(`🔍 Verificando se OJ "${nomeOJ}" já está vinculado...`);
  
  try {
    // Garantir que o acordeão de Órgãos Julgadores esteja aberto
    const possiveisAcordeons = [
      'text=Órgãos Julgadores vinculados ao Perito',
      'text=Órgãos Julgadores',
      'text=Orgãos Julgadores',
      'mat-expansion-panel-header:has-text("Órgão")',
      '.mat-expansion-panel-header:has-text("Órgão")',
      '[data-toggle="collapse"]:has-text("Órgão")',
      '.panel-heading:has-text("Órgão")',
      'h4:has-text("Órgão")',
      'h3:has-text("Órgão")',
      'span:has-text("Órgão")'
    ];
    
    // Tentar abrir o acordeão se estiver fechado
    for (const seletor of possiveisAcordeons) {
      try {
        const elemento = await page.locator(seletor).first();
        if (await elemento.isVisible()) {
          // Verificar se está expandido
          const ariaExpanded = await elemento.getAttribute('aria-expanded').catch(() => null);
          if (ariaExpanded === 'false') {
            console.log('📂 Abrindo acordeão de Órgãos Julgadores...');
            await elemento.click();
            await page.waitForTimeout(200);
          }
          break;
        }
      } catch {
        // Continuar tentando outros seletores
      }
    }
    
    // Normalizar o nome do OJ para comparação
    const normalize = (text) => (text || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const nomeOJNormalizado = normalize(nomeOJ);
    
    // Procurar por listas de OJs já vinculados
    const seletoresListaOJs = [
      // Tabelas com OJs vinculados
      'table tbody tr',
      '.mat-table .mat-row',
      '.table tbody tr',
      // Listas de itens
      'ul li',
      '.list-group-item',
      '.mat-list-item',
      // Cards ou painéis com OJs
      '.card-body',
      '.panel-body',
      '.mat-expansion-panel-content',
      // Divs genéricas que podem conter OJs
      'div[class*="orgao"]',
      'div[class*="julgador"]',
      // Spans ou elementos de texto
      'span:has-text("Vara")',
      'span:has-text("Tribunal")',
      'div:has-text("Vara")',
      'div:has-text("Tribunal")'
    ];
    
    console.log('🔍 Procurando OJs já vinculados na página...');
    
    for (const seletor of seletoresListaOJs) {
      try {
        const elementos = await page.locator(seletor).all();
        
        for (const elemento of elementos) {
          try {
            const texto = await elemento.textContent();
            if (texto && texto.trim()) {
              const textoNormalizado = normalize(texto);
              
              // Verificar se o texto contém o nome do OJ
              if (textoNormalizado.includes(nomeOJNormalizado) || 
                  nomeOJNormalizado.includes(textoNormalizado)) {
                
                // Verificação mais rigorosa para evitar falsos positivos
                const palavrasOJ = nomeOJNormalizado.split(' ').filter(p => p.length > 2);
                const palavrasTexto = textoNormalizado.split(' ').filter(p => p.length > 2);
                
                const correspondencias = palavrasOJ.filter(p => palavrasTexto.includes(p));
                
                // Se mais de 70% das palavras correspondem, considerar como já vinculado
                if (correspondencias.length / palavrasOJ.length > 0.7) {
                  console.log(`✅ OJ "${nomeOJ}" já está vinculado!`);
                  console.log(`📄 Texto encontrado: "${texto.trim()}"`);
                  return {
                    jaVinculado: true,
                    textoEncontrado: texto.trim(),
                    elemento: elemento
                  };
                }
              }
            }
          } catch {
            // Continuar se houver erro ao ler o texto do elemento
          }
        }
      } catch {
        // Continuar tentando outros seletores
      }
    }
    
    // Verificar também por mensagens de erro específicas que indicam duplicata
    const mensagensErro = [
      'já vinculado',
      'já cadastrado',
      'duplicado',
      'não é possível vincular',
      'órgão julgador já existe',
      'vínculo já existe'
    ];
    
    for (const mensagem of mensagensErro) {
      try {
        const elemento = await page.locator(`text=${mensagem}`).first();
        if (await elemento.isVisible()) {
          const textoCompleto = await elemento.textContent();
          console.log(`⚠️  Mensagem de duplicata encontrada: "${textoCompleto}"`);
          return {
            jaVinculado: true,
            textoEncontrado: textoCompleto,
            elemento: elemento
          };
        }
      } catch {
        // Mensagem não encontrada, continuar
      }
    }
    
    console.log(`❌ OJ "${nomeOJ}" não foi encontrado na lista de vinculados`);
    return {
      jaVinculado: false,
      textoEncontrado: null,
      elemento: null
    };
    
  } catch (error) {
    console.log(`❌ Erro ao verificar se OJ está vinculado: ${error.message}`);
    return {
      jaVinculado: false,
      textoEncontrado: null,
      elemento: null,
      erro: error.message
    };
  }
}

// Função para listar todos os OJs já vinculados
async function listarOJsVinculados(page) {
  console.log('📋 Listando todos os OJs já vinculados...');
  
  try {
    const ojsVinculados = [];
    
    // Seletores para encontrar OJs vinculados
    const seletoresOJs = [
      'table tbody tr td',
      '.mat-table .mat-cell',
      '.table tbody tr td',
      'ul li',
      '.list-group-item',
      '.mat-list-item .mat-line',
      '.card-body p',
      '.panel-body p',
      '.mat-expansion-panel-content div'
    ];
    
    for (const seletor of seletoresOJs) {
      try {
        const elementos = await page.locator(seletor).all();
        
        for (const elemento of elementos) {
          try {
            const texto = await elemento.textContent();
            if (texto && texto.trim()) {
              const textoLimpo = texto.trim();
              
              // Verificar se parece ser um nome de órgão julgador
              if ((textoLimpo.toLowerCase().includes('vara') || 
                   textoLimpo.toLowerCase().includes('tribunal') ||
                   textoLimpo.toLowerCase().includes('juizado')) &&
                  textoLimpo.length > 10 && 
                  !ojsVinculados.includes(textoLimpo)) {
                
                ojsVinculados.push(textoLimpo);
              }
            }
          } catch {
            // Continuar se houver erro
          }
        }
      } catch {
        // Continuar tentando outros seletores
      }
    }
    
    if (ojsVinculados.length > 0) {
      console.log('📋 OJs vinculados encontrados:');
      ojsVinculados.forEach((oj, index) => {
        console.log(`   ${index + 1}. ${oj}`);
      });
    } else {
      console.log('❌ Nenhum OJ vinculado encontrado');
    }
    
    return ojsVinculados;
    
  } catch (error) {
    console.log(`❌ Erro ao listar OJs vinculados: ${error.message}`);
    return [];
  }
}

module.exports = {
  verificarOJJaVinculado,
  listarOJsVinculados
};