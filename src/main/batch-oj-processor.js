/**
 * Processador de OJs em lote mantendo o modal aberto
 * Otimizado para processar múltiplos OJs sem sair do modal de Localização/Visibilidade
 */

class BatchOJProcessor {
  constructor(page, config, performanceMonitor, performanceDashboard) {
    this.page = page;
    this.config = config;
    this.performanceMonitor = performanceMonitor;
    this.performanceDashboard = performanceDashboard;
    this.modalOpen = false;
    this.processedOJs = new Set();
    this.logger = console;
  }

  /**
   * Processa múltiplos OJs mantendo o modal aberto
   */
  async processBatchOJs(ojsList) {
    console.log('🚀 [BATCH-OJ] Iniciando processamento em lote de OJs...');
    console.log(`📊 [BATCH-OJ] Total de OJs para processar: ${ojsList.length}`);
    
    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    try {
      // Abrir modal apenas uma vez
      if (!this.modalOpen) {
        console.log('📂 [BATCH-OJ] Abrindo modal de Localização/Visibilidade...');
        await this.openLocationModal();
        this.modalOpen = true;
      }
      
      // Processar cada OJ mantendo o modal aberto
      for (let i = 0; i < ojsList.length; i++) {
        const orgao = ojsList[i];
        console.log(`\n🔄 [BATCH-OJ] Processando OJ ${i + 1}/${ojsList.length}: ${orgao}`);
        
        try {
          // Processar OJ individual
          const result = await this.processSingleOJ(orgao);
          
          if (result.status === 'success') {
            successCount++;
            this.processedOJs.add(orgao);
            console.log(`✅ [BATCH-OJ] OJ processado com sucesso: ${orgao}`);
          } else if (result.status === 'skipped') {
            skipCount++;
            this.processedOJs.add(orgao);
            console.log(`⏭️ [BATCH-OJ] OJ já existe, pulado: ${orgao}`);
          } else {
            errorCount++;
            console.log(`❌ [BATCH-OJ] Erro ao processar OJ: ${orgao}`);
          }
          
          results.push({
            orgao,
            ...result,
            timestamp: new Date().toISOString()
          });
          
          // Limpar campos para próximo OJ (se não for o último)
          if (i < ojsList.length - 1) {
            await this.clearFieldsForNextOJ();
          }
          
        } catch (error) {
          // Verificar se é um OJ que já existe (deve ser pulado, não é erro)
          if (error.code === 'OJ_JA_CADASTRADO' && error.skipOJ) {
            console.log(`⏭️ [BATCH-OJ] OJ já existente, pulado: ${orgao}`);
            skipCount++;
            this.processedOJs.add(orgao);
            results.push({
              orgao,
              status: 'skipped',
              message: 'OJ já cadastrado (verificação prévia)',
              ojEncontrado: error.ojEncontrado,
              timestamp: new Date().toISOString()
            });
            
            // Apenas limpar campos, não recuperar de erro
            await this.clearFieldsForNextOJ();
          } else {
            // Erro real - registrar como erro
            console.error(`❌ [BATCH-OJ] Erro processando ${orgao}:`, error.message);
            errorCount++;
            results.push({
              orgao,
              status: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            });
            
            // Tentar recuperar do erro
            await this.recoverFromError();
          }
        }
        
        // Pequena pausa entre OJs para estabilidade
        if (i < ojsList.length - 1) {
          await this.page.waitForTimeout(500);
        }
      }
      
    } finally {
      // Fechar modal ao final (opcional)
      if (this.modalOpen && this.config.closeModalAfterBatch !== false) {
        await this.closeModal();
        this.modalOpen = false;
      }
    }
    
    // Relatório final
    console.log('\n📊 [BATCH-OJ] Processamento concluído!');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ⏭️ Pulados: ${skipCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📊 Total: ${results.length}`);
    
    return {
      success: errorCount === 0,
      results,
      summary: {
        total: results.length,
        success: successCount,
        skipped: skipCount,
        errors: errorCount
      }
    };
  }

  /**
   * Abre o modal de Localização/Visibilidade
   */
  async openLocationModal() {
    // Clicar no botão Adicionar Localização/Visibilidade
    const addButtonSelectors = [
      'button:has-text("Adicionar Localização/Visibilidade")',
      'button:has-text("Adicionar Localização")',
      'button:has-text("Localização/Visibilidade")',
      'button.mat-raised-button:has-text("Adicionar")',
      'button[color="primary"]:has-text("Adicionar")'
    ];
    
    let buttonClicked = false;
    for (const selector of addButtonSelectors) {
      try {
        const button = await this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log(`✅ [BATCH-OJ] Botão clicado: ${selector}`);
          buttonClicked = true;
          break;
        }
      } catch (e) {
        // Continuar tentando outros seletores
      }
    }
    
    if (!buttonClicked) {
      throw new Error('Não foi possível abrir o modal de Localização/Visibilidade');
    }
    
    // Aguardar modal abrir
    await this.page.waitForSelector('mat-dialog-container, [role="dialog"]', { timeout: 5000 });
    console.log('✅ [BATCH-OJ] Modal aberto com sucesso');
  }

  /**
   * Processa um único OJ dentro do modal já aberto
   */
  async processSingleOJ(orgao) {
    const startTime = Date.now();
    
    try {
      // 1. Selecionar o OJ no dropdown
      await this.selectOJ(orgao);
      
      // 2. Configurar papel e visibilidade
      await this.configurePapelVisibilidade();
      
      // 3. Configurar data inicial se necessário
      await this.configureDataInicial();
      
      // 4. Clicar em Gravar
      const saveResult = await this.saveConfiguration();
      
      // 5. Verificar resultado
      if (saveResult.pje281Error) {
        // OJ já existe - isso é considerado sucesso (já está cadastrado)
        return {
          status: 'skipped',
          message: 'OJ já cadastrado (PJE-281)',
          duration: Date.now() - startTime
        };
      }
      
      return {
        status: 'success',
        message: 'OJ vinculado com sucesso',
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Seleciona um OJ no dropdown
   */
  async selectOJ(orgao) {
    console.log(`🎯 [BATCH-OJ] Selecionando OJ: ${orgao}`);
    
    // Localizar o mat-select
    const matSelect = await this.page.locator('mat-dialog-container mat-select[placeholder="Órgão Julgador"]').first();
    
    // Verificar se dropdown já está aberto
    const isOpen = await this.page.locator('mat-option').count() > 0;
    
    if (!isOpen) {
      // Clicar para abrir dropdown
      await matSelect.click();
      await this.page.waitForTimeout(300);
    }
    
    // Aguardar opções aparecerem
    await this.page.waitForSelector('mat-option', { timeout: 3000 });
    
    // Buscar e clicar na opção desejada
    const options = await this.page.locator('mat-option').all();
    let found = false;
    
    for (const option of options) {
      const text = await option.textContent();
      if (text && text.trim().includes(orgao)) {
        await option.click();
        found = true;
        console.log(`✅ [BATCH-OJ] OJ selecionado: ${text.trim()}`);
        break;
      }
    }
    
    if (!found) {
      throw new Error(`OJ não encontrado no dropdown: ${orgao}`);
    }
    
    // Aguardar seleção processar
    await this.page.waitForTimeout(300);
  }

  /**
   * Configura papel e visibilidade
   */
  async configurePapelVisibilidade() {
    // Configurar papel (se campo existir e estiver vazio)
    try {
      const papelSelect = await this.page.locator('mat-dialog-container mat-select[placeholder="Papel"]').first();
      const papelValue = await papelSelect.locator('.mat-select-value-text').textContent();
      
      if (!papelValue || papelValue.trim() === '') {
        await papelSelect.click();
        await this.page.waitForTimeout(300);
        
        // Selecionar papel configurado ou padrão
        const papel = this.config.perfil || 'Assessor';
        const papelOption = await this.page.locator(`mat-option:has-text("${papel}")`).first();
        if (await papelOption.count() > 0) {
          await papelOption.click();
          console.log(`✅ [BATCH-OJ] Papel configurado: ${papel}`);
        }
      }
    } catch (e) {
      // Campo de papel pode não existir em alguns casos
    }
    
    // Configurar visibilidade (geralmente já vem com padrão "Público")
    try {
      const visibilidadeSelect = await this.page.locator('mat-dialog-container mat-select[placeholder*="Visibilidade"]').first();
      const visibilidadeValue = await visibilidadeSelect.locator('.mat-select-value-text').textContent();
      
      if (!visibilidadeValue || visibilidadeValue.trim() === '') {
        await visibilidadeSelect.click();
        await this.page.waitForTimeout(300);
        
        const publicOption = await this.page.locator('mat-option:has-text("Público")').first();
        if (await publicOption.count() > 0) {
          await publicOption.click();
          console.log('✅ [BATCH-OJ] Visibilidade configurada: Público');
        }
      }
    } catch (e) {
      // Campo pode já estar preenchido
    }
  }

  /**
   * Configura data inicial se necessário
   */
  async configureDataInicial() {
    try {
      const dataInput = await this.page.locator('input[placeholder*="Data inicial"]').first();
      const currentValue = await dataInput.inputValue();
      
      if (!currentValue) {
        const hoje = new Date().toLocaleDateString('pt-BR');
        await dataInput.fill(hoje);
        console.log(`✅ [BATCH-OJ] Data inicial configurada: ${hoje}`);
      }
    } catch (e) {
      // Campo pode não existir ou já estar preenchido
    }
  }

  /**
   * Salva a configuração
   */
  async saveConfiguration() {
    console.log('💾 [BATCH-OJ] Salvando configuração...');
    
    // Clicar no botão Gravar
    const saveButton = await this.page.locator('mat-dialog-container button:has-text("Gravar")').first();
    await saveButton.click();
    
    // Aguardar processamento
    await this.page.waitForTimeout(1500);
    
    // Verificar se houve erro PJE-281
    try {
      // Aguardar um pouco para mensagem aparecer se houver
      await this.page.waitForTimeout(1000);
      
      const errorMessages = await this.page.locator('.mat-error, .mat-snack-bar-container').all();
      for (const errorMessage of errorMessages) {
        if (await errorMessage.isVisible({ timeout: 500 })) {
          const errorText = await errorMessage.textContent();
          if (errorText && (errorText.includes('PJE-281') || errorText.includes('período ativo conflitante'))) {
            console.log('⚠️ [BATCH-OJ] OJ já existe (PJE-281) - Aguardando erro desaparecer para continuar...');
            
            // Aguardar erro desaparecer naturalmente (mais tempo)
            let attempts = 0;
            const maxAttempts = 10;
            while (await errorMessage.isVisible({ timeout: 300 }) && attempts < maxAttempts) {
              console.log(`⏳ [BATCH-OJ] Aguardando erro desaparecer... (tentativa ${attempts + 1}/${maxAttempts})`);
              await this.page.waitForTimeout(1000);
              attempts++;
            }
            
            // Tentar fechar mensagem de erro se ainda visível
            if (await errorMessage.isVisible({ timeout: 300 })) {
              try {
                const closeButton = await errorMessage.locator('button').first();
                if (await closeButton.isVisible({ timeout: 500 })) {
                  await closeButton.click();
                  console.log('🔄 [BATCH-OJ] Fechando mensagem de erro manualmente');
                  await this.page.waitForTimeout(500);
                }
              } catch (e) {
                console.log('⚠️ [BATCH-OJ] Não foi possível fechar erro manualmente');
              }
            }
            
            console.log('✅ [BATCH-OJ] Erro PJE-281 tratado, continuando no modal');
            return { pje281Error: true };
          }
        }
      }
    } catch (e) {
      // Sem erro detectado ou erro na verificação
      console.log('ℹ️ [BATCH-OJ] Nenhum erro PJE-281 detectado');
    }
    
    return { success: true };
  }

  /**
   * Limpa os campos para processar o próximo OJ
   */
  async clearFieldsForNextOJ() {
    console.log('🧹 [BATCH-OJ] Limpando campos para próximo OJ...');
    
    try {
      // Aguardar erros desaparecerem completamente
      let errorCount = await this.page.locator('.mat-error, .mat-snack-bar-container').count();
      while (errorCount > 0) {
        console.log(`⏳ [BATCH-OJ] Aguardando ${errorCount} mensagens de erro desaparecerem...`);
        await this.page.waitForTimeout(1000);
        errorCount = await this.page.locator('.mat-error, .mat-snack-bar-container').count();
      }
      
      // Aguardar um pouco mais para garantir que interface está estável
      await this.page.waitForTimeout(500);
      
      // Garantir que o mat-select do OJ está limpo/pronto
      try {
        const matSelect = await this.page.locator('mat-dialog-container mat-select[placeholder="Órgão Julgador"]').first();
        
        // Verificar se há valor selecionado e limpar se necessário
        const selectedValue = await matSelect.locator('.mat-select-value-text').textContent();
        if (selectedValue && selectedValue.trim() !== '') {
          console.log(`🔄 [BATCH-OJ] Limpando seleção anterior: ${selectedValue.trim()}`);
          
          // Clicar no mat-select para abrir/resetar
          await matSelect.click();
          await this.page.waitForTimeout(200);
          
          // Pressionar ESC para fechar sem selecionar
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(200);
        }
        
        console.log('✅ [BATCH-OJ] Campo OJ limpo e pronto para próxima seleção');
        
      } catch (e) {
        console.log('⚠️ [BATCH-OJ] Não foi possível limpar campo OJ explicitamente, continuando...');
      }
      
      console.log('✅ [BATCH-OJ] Campos prontos para próximo OJ');
      
    } catch (error) {
      console.log('⚠️ [BATCH-OJ] Erro ao limpar campos:', error.message);
    }
  }

  /**
   * Tenta recuperar de um erro mantendo o modal aberto
   */
  async recoverFromError() {
    console.log('🔧 [BATCH-OJ] Tentando recuperar do erro...');
    
    try {
      // Fechar mensagens de erro
      const errorMessages = await this.page.locator('.mat-error, .mat-snack-bar-container').all();
      for (const error of errorMessages) {
        try {
          const closeBtn = await error.locator('button').first();
          if (await closeBtn.isVisible({ timeout: 500 })) {
            await closeBtn.click();
          }
        } catch (e) {
          // Continuar
        }
      }
      
      // Aguardar estabilização
      await this.page.waitForTimeout(1000);
      
      // Verificar se modal ainda está aberto
      const modalVisible = await this.page.locator('mat-dialog-container').isVisible();
      if (!modalVisible) {
        console.log('⚠️ [BATCH-OJ] Modal fechou, reabrindo...');
        this.modalOpen = false;
        await this.openLocationModal();
        this.modalOpen = true;
      }
      
      console.log('✅ [BATCH-OJ] Recuperação concluída');
      
    } catch (error) {
      console.log('❌ [BATCH-OJ] Falha na recuperação:', error.message);
    }
  }

  /**
   * Fecha o modal
   */
  async closeModal() {
    try {
      // Tentar fechar por ESC primeiro
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
      // Se ainda estiver aberto, tentar botão Fechar/Cancelar
      const modalVisible = await this.page.locator('mat-dialog-container').isVisible();
      if (modalVisible) {
        const closeButtons = [
          'mat-dialog-container button:has-text("Fechar")',
          'mat-dialog-container button:has-text("Cancelar")',
          'mat-dialog-container button[aria-label="Close"]',
          'mat-dialog-container .close-button'
        ];
        
        for (const selector of closeButtons) {
          try {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 500 })) {
              await button.click();
              break;
            }
          } catch (e) {
            // Continuar tentando
          }
        }
      }
      
      console.log('✅ [BATCH-OJ] Modal fechado');
      
    } catch (error) {
      console.log('⚠️ [BATCH-OJ] Erro ao fechar modal:', error.message);
    }
  }
}

module.exports = BatchOJProcessor;