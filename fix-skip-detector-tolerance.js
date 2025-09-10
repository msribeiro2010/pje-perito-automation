const fs = require('fs');
const path = require('path');

/**
 * Script para corrigir a tolerância do servidor skip detector
 * que está muito alta (95%) e pode estar pulando os órgãos de São José dos Campos
 */

class SkipDetectorFixer {
  constructor() {
    this.skipDetectorPath = path.join(__dirname, 'src/utils/servidor-skip-detector.js');
    this.toleranciaAtual = 0.95; // 95%
    this.toleranciaNova = 0.85;  // 85% - mais conservadora
  }

  /**
   * Analisa o arquivo atual do skip detector
   */
  analisarArquivoAtual() {
    console.log('🔍 === ANÁLISE DO SERVIDOR SKIP DETECTOR ===\n');
    
    if (!fs.existsSync(this.skipDetectorPath)) {
      console.log('❌ Arquivo não encontrado:', this.skipDetectorPath);
      return false;
    }
    
    const content = fs.readFileSync(this.skipDetectorPath, 'utf8');
    
    // Encontrar configurações atuais
    const toleranciaMatch = content.match(/this\.limiteTolerancia\s*=\s*([\d.]+)/);
    const minimoMatch = content.match(/this\.limiteMinimo\s*=\s*(\d+)/);
    
    console.log('📊 Configurações atuais:');
    if (toleranciaMatch) {
      const tolerancia = parseFloat(toleranciaMatch[1]);
      console.log(`   Tolerância: ${(tolerancia * 100).toFixed(1)}%`);
      this.toleranciaAtual = tolerancia;
      
      if (tolerancia >= 0.90) {
        console.log('   ⚠️  PROBLEMA: Tolerância muito alta!');
        console.log('       Órgãos podem estar sendo pulados prematuramente');
      }
    }
    
    if (minimoMatch) {
      console.log(`   Mínimo de OJs: ${minimoMatch[1]}`);
    }
    
    // Verificar lógica de pulo
    const temLogicaPulo = content.includes('determinarAcao') && 
                         content.includes('pular_servidor');
    
    console.log(`   Lógica de pulo: ${temLogicaPulo ? 'ATIVA' : 'INATIVA'}`);
    
    // Procurar por logs ou comentários sobre São José
    const temReferenciaSaoJose = content.toLowerCase().includes('são josé') ||
                                content.toLowerCase().includes('sao jose');
    
    console.log(`   Referência a São José: ${temReferenciaSaoJose ? 'SIM' : 'NÃO'}`);
    
    console.log();
    return true;
  }

  /**
   * Cria backup do arquivo original
   */
  criarBackup() {
    const backupPath = this.skipDetectorPath + '.backup-' + Date.now();
    fs.copyFileSync(this.skipDetectorPath, backupPath);
    console.log(`📋 Backup criado: ${path.basename(backupPath)}`);
    return backupPath;
  }

  /**
   * Aplica a correção da tolerância
   */
  aplicarCorrecao() {
    console.log('🔧 === APLICAÇÃO DA CORREÇÃO ===\n');
    
    // Criar backup
    const backupPath = this.criarBackup();
    
    // Ler arquivo atual
    let content = fs.readFileSync(this.skipDetectorPath, 'utf8');
    
    // Substituir tolerância
    const toleranciaRegex = /(this\.limiteTolerancia\s*=\s*)([\d.]+)/;
    const novoValor = this.toleranciaNova.toString();
    
    if (toleranciaRegex.test(content)) {
      content = content.replace(toleranciaRegex, `$1${novoValor}`);
      
      // Escrever arquivo corrigido
      fs.writeFileSync(this.skipDetectorPath, content);
      
      console.log('✅ Correção aplicada com sucesso!');
      console.log(`   Tolerância alterada: ${(this.toleranciaAtual * 100).toFixed(1)}% → ${(this.toleranciaNova * 100).toFixed(1)}%`);
      console.log(`   Backup salvo em: ${path.basename(backupPath)}`);
      
      return true;
    } else {
      console.log('❌ Não foi possível encontrar a configuração de tolerância');
      console.log('   Verifique o arquivo manualmente');
      return false;
    }
  }

  /**
   * Verifica se a correção foi aplicada corretamente
   */
  verificarCorrecao() {
    console.log('\n🔍 === VERIFICAÇÃO DA CORREÇÃO ===\n');
    
    const content = fs.readFileSync(this.skipDetectorPath, 'utf8');
    const toleranciaMatch = content.match(/this\.limiteTolerancia\s*=\s*([\d.]+)/);
    
    if (toleranciaMatch) {
      const tolerancia = parseFloat(toleranciaMatch[1]);
      console.log(`📊 Nova tolerância: ${(tolerancia * 100).toFixed(1)}%`);
      
      if (Math.abs(tolerancia - this.toleranciaNova) < 0.001) {
        console.log('✅ Correção verificada com sucesso!');
        return true;
      } else {
        console.log('❌ Correção não foi aplicada corretamente');
        return false;
      }
    } else {
      console.log('❌ Não foi possível verificar a correção');
      return false;
    }
  }

  /**
   * Gera relatório de impacto da mudança
   */
  gerarRelatorioImpacto() {
    console.log('\n📈 === RELATÓRIO DE IMPACTO ===\n');
    
    console.log('🎯 Problema identificado:');
    console.log('   - Tolerância muito alta (95%) no servidor skip detector');
    console.log('   - Órgãos sendo pulados prematuramente');
    console.log('   - 4 órgãos de São José dos Campos não processados\n');
    
    console.log('🔧 Correção aplicada:');
    console.log(`   - Tolerância reduzida: ${(this.toleranciaAtual * 100).toFixed(1)}% → ${(this.toleranciaNova * 100).toFixed(1)}%`);
    console.log('   - Processamento mais conservador');
    console.log('   - Menor chance de pular órgãos válidos\n');
    
    console.log('📊 Impacto esperado:');
    console.log('   ✅ Processamento dos 4 órgãos faltantes:');
    console.log('      - 2ª Vara do Trabalho de São José dos Campos');
    console.log('      - 3ª Vara do Trabalho de São José dos Campos');
    console.log('      - 4ª Vara do Trabalho de São José dos Campos');
    console.log('      - 5ª Vara do Trabalho de São José dos Campos');
    console.log('   ⚠️  Possível aumento no tempo de processamento (marginal)');
    console.log('   ✅ Maior precisão na detecção de órgãos válidos\n');
    
    console.log('🚀 Próximos passos:');
    console.log('   1. Executar novo processamento');
    console.log('   2. Verificar se todos os 11 órgãos são processados');
    console.log('   3. Monitorar logs para confirmar sucesso');
    console.log('   4. Se necessário, ajustar tolerância para 80%\n');
  }

  /**
   * Executa toda a correção
   */
  async executar() {
    console.log('🚀 === CORREÇÃO DA TOLERÂNCIA DO SKIP DETECTOR ===\n');
    
    // 1. Analisar arquivo atual
    if (!this.analisarArquivoAtual()) {
      return false;
    }
    
    // 2. Verificar se correção é necessária
    if (this.toleranciaAtual < 0.90) {
      console.log('✅ Tolerância já está em nível adequado');
      console.log(`   Atual: ${(this.toleranciaAtual * 100).toFixed(1)}%`);
      return true;
    }
    
    // 3. Aplicar correção
    const sucesso = this.aplicarCorrecao();
    
    if (sucesso) {
      // 4. Verificar correção
      this.verificarCorrecao();
      
      // 5. Gerar relatório
      this.gerarRelatorioImpacto();
    }
    
    return sucesso;
  }

  /**
   * Reverte a correção usando backup
   */
  reverterCorrecao(backupPath) {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, this.skipDetectorPath);
      console.log('↩️  Correção revertida com sucesso');
      return true;
    } else {
      console.log('❌ Arquivo de backup não encontrado');
      return false;
    }
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
const reverter = args.includes('--reverter');
const backupPath = args.find(arg => arg.startsWith('--backup='))?.split('=')[1];

// Executar correção
const fixer = new SkipDetectorFixer();

if (reverter && backupPath) {
  fixer.reverterCorrecao(backupPath);
} else {
  fixer.executar().catch(console.error);
}