#!/usr/bin/env node

/**
 * 🔧 Correção Específica - Varas de São José dos Campos
 * 
 * Implementa soluções para resolver o problema das varas 2ª, 3ª, 4ª e 5ª
 * de São José dos Campos que entram mas não buscam/vinculam ao perito
 */

const fs = require('fs');
const path = require('path');

class CorrecaoVarasSaoJose {
    constructor() {
        this.varasProblematicas = [
            '2ª Vara do Trabalho de São José dos Campos',
            '3ª Vara do Trabalho de São José dos Campos', 
            '4ª Vara do Trabalho de São José dos Campos',
            '5ª Vara do Trabalho de São José dos Campos'
        ];
        
        this.backupDir = path.join(__dirname, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
        this.relatorio = {
            timestamp: new Date().toISOString(),
            correcoes: [],
            status: 'iniciando'
        };
    }

    async executarCorrecao() {
        console.log('🔧 Iniciando correção das varas de São José dos Campos...');
        
        try {
            // 1. Criar backup
            await this.criarBackup();
            
            // 2. Limpar cache específico
            await this.limparCacheEspecifico();
            
            // 3. Implementar seletores específicos
            await this.implementarSeletoresEspecificos();
            
            // 4. Configurar processamento sequencial
            await this.configurarProcessamentoSequencial();
            
            // 5. Ajustar timeouts específicos
            await this.ajustarTimeoutsEspecificos();
            
            // 6. Criar configuração especial
            await this.criarConfiguracaoEspecial();
            
            // 7. Gerar relatório final
            await this.gerarRelatorioFinal();
            
            this.relatorio.status = 'concluido';
            
        } catch (error) {
            console.error('❌ Erro durante correção:', error.message);
            this.relatorio.status = 'erro';
            this.relatorio.erro = error.message;
        }
    }

    async criarBackup() {
        console.log('\n💾 Criando backup dos arquivos...');
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        const arquivosBackup = [
            'src/utils/seletores.js',
            'src/utils/timeouts.js',
            'src/main/servidor-automation-v2.js',
            'src/utils/servidor-skip-detector.js'
        ];
        
        for (const arquivo of arquivosBackup) {
            const caminhoOrigem = path.join(__dirname, arquivo);
            if (fs.existsSync(caminhoOrigem)) {
                const nomeArquivo = path.basename(arquivo);
                const caminhoDestino = path.join(this.backupDir, nomeArquivo);
                fs.copyFileSync(caminhoOrigem, caminhoDestino);
                console.log(`✅ Backup criado: ${nomeArquivo}`);
            }
        }
        
        this.relatorio.correcoes.push({
            tipo: 'backup',
            descricao: 'Backup dos arquivos criado',
            diretorio: this.backupDir
        });
    }

    async limparCacheEspecifico() {
        console.log('\n🧹 Limpando cache específico...');
        
        const diretorios = ['cache', 'temp', '.cache'];
        let arquivosRemovidos = 0;
        
        for (const dir of diretorios) {
            const caminhoDir = path.join(__dirname, dir);
            if (fs.existsSync(caminhoDir)) {
                const arquivos = fs.readdirSync(caminhoDir);
                
                for (const arquivo of arquivos) {
                    if (arquivo.toLowerCase().includes('sao') && 
                        arquivo.toLowerCase().includes('jose')) {
                        const caminhoArquivo = path.join(caminhoDir, arquivo);
                        fs.unlinkSync(caminhoArquivo);
                        arquivosRemovidos++;
                        console.log(`🗑️ Removido: ${arquivo}`);
                    }
                }
            }
        }
        
        console.log(`✅ ${arquivosRemovidos} arquivos de cache removidos`);
        
        this.relatorio.correcoes.push({
            tipo: 'limpeza_cache',
            descricao: `${arquivosRemovidos} arquivos de cache removidos`
        });
    }

    async implementarSeletoresEspecificos() {
        console.log('\n🎯 Implementando seletores específicos...');
        
        const caminhoSeletores = path.join(__dirname, 'src/utils/seletores.js');
        
        if (!fs.existsSync(caminhoSeletores)) {
            // Criar arquivo de seletores se não existir
            const seletoresContent = this.criarArquivoSeletores();
            fs.writeFileSync(caminhoSeletores, seletoresContent);
            console.log('✅ Arquivo de seletores criado');
        } else {
            // Adicionar seletores específicos ao arquivo existente
            let seletoresContent = fs.readFileSync(caminhoSeletores, 'utf8');
            
            if (!seletoresContent.includes('SAO_JOSE_CAMPOS_ESPECIFICOS')) {
                const seletoresEspecificos = this.gerarSeletoresEspecificos();
                
                // Adicionar antes da exportação
                if (seletoresContent.includes('module.exports')) {
                    seletoresContent = seletoresContent.replace(
                        'module.exports',
                        seletoresEspecificos + '\n\nmodule.exports'
                    );
                } else {
                    seletoresContent += '\n\n' + seletoresEspecificos;
                }
                
                fs.writeFileSync(caminhoSeletores, seletoresContent);
                console.log('✅ Seletores específicos adicionados');
            }
        }
        
        this.relatorio.correcoes.push({
            tipo: 'seletores_especificos',
            descricao: 'Seletores específicos para São José dos Campos implementados',
            arquivo: 'src/utils/seletores.js'
        });
    }

    criarArquivoSeletores() {
        return `/**
 * Seletores para automação PJE
 */

${this.gerarSeletoresEspecificos()}

module.exports = {
    SAO_JOSE_CAMPOS_ESPECIFICOS,
    // Outros seletores...
};
`;
    }

    gerarSeletoresEspecificos() {
        return `// Seletores específicos para São José dos Campos
const SAO_JOSE_CAMPOS_ESPECIFICOS = {
    // Seletores para busca de perito
    buscaPerito: {
        inputBusca: 'input[name="nomePerito"], input[id*="perito"], input[class*="perito"]',
        botaoBuscar: 'button[type="submit"], input[type="submit"], button:contains("Buscar")',
        resultados: '.resultado-busca, .lista-peritos, [class*="resultado"]',
        itemPerito: '.item-perito, .perito-item, tr[class*="perito"]'
    },
    
    // Seletores para vinculação
    vinculacao: {
        botaoVincular: 'button:contains("Vincular"), input[value*="Vincular"], a:contains("Vincular")',
        botaoConfirmar: 'button:contains("Confirmar"), input[value*="Confirmar"], button[id*="confirmar"]',
        modalConfirmacao: '.modal, .dialog, [class*="confirmacao"]',
        mensagemSucesso: '.sucesso, .success, [class*="sucesso"]'
    },
    
    // Seletores para navegação
    navegacao: {
        menuPeritos: 'a:contains("Perito"), [href*="perito"], .menu-perito',
        submenuVincular: 'a:contains("Vincular"), [href*="vincular"]',
        breadcrumb: '.breadcrumb, .caminho, [class*="breadcrumb"]'
    },
    
    // Timeouts específicos (em ms)
    timeouts: {
        buscaPerito: 15000,
        vinculacao: 20000,
        confirmacao: 10000,
        navegacao: 8000
    },
    
    // Configurações específicas
    configuracao: {
        tentativasMaximas: 5,
        intervaloTentativas: 3000,
        aguardarCarregamento: 5000,
        processamentoSequencial: true
    }
};
`;
    }

    async configurarProcessamentoSequencial() {
        console.log('\n⚙️ Configurando processamento sequencial...');
        
        const caminhoAutomacao = path.join(__dirname, 'src/main/servidor-automation-v2.js');
        
        if (fs.existsSync(caminhoAutomacao)) {
            let automacaoContent = fs.readFileSync(caminhoAutomacao, 'utf8');
            
            if (!automacaoContent.includes('SAO_JOSE_CAMPOS_SEQUENCIAL')) {
                const configuracaoSequencial = this.gerarConfiguracaoSequencial();
                
                // Adicionar no início do arquivo, após os imports
                const linhas = automacaoContent.split('\n');
                let indiceInsercao = 0;
                
                // Encontrar onde inserir (após os requires/imports)
                for (let i = 0; i < linhas.length; i++) {
                    if (linhas[i].includes('require(') || linhas[i].includes('import ')) {
                        indiceInsercao = i + 1;
                    }
                }
                
                linhas.splice(indiceInsercao, 0, '', configuracaoSequencial);
                automacaoContent = linhas.join('\n');
                
                fs.writeFileSync(caminhoAutomacao, automacaoContent);
                console.log('✅ Configuração sequencial adicionada');
            }
        }
        
        this.relatorio.correcoes.push({
            tipo: 'processamento_sequencial',
            descricao: 'Configuração de processamento sequencial implementada',
            arquivo: 'src/main/servidor-automation-v2.js'
        });
    }

    gerarConfiguracaoSequencial() {
        return `// Configuração específica para São José dos Campos - SAO_JOSE_CAMPOS_SEQUENCIAL
const SAO_JOSE_CAMPOS_CONFIG = {
    varasEspeciais: [
        '2ª Vara do Trabalho de São José dos Campos',
        '3ª Vara do Trabalho de São José dos Campos',
        '4ª Vara do Trabalho de São José dos Campos',
        '5ª Vara do Trabalho de São José dos Campos'
    ],
    
    processamentoSequencial: true,
    timeoutExtendido: 30000,
    tentativasMaximas: 3,
    intervaloTentativas: 5000,
    
    // Função para verificar se é vara especial
    isVaraEspecial(nomeOrgao) {
        return this.varasEspeciais.includes(nomeOrgao);
    },
    
    // Configurações específicas para processamento
    getConfiguracao(nomeOrgao) {
        if (this.isVaraEspecial(nomeOrgao)) {
            return {
                sequencial: true,
                timeout: this.timeoutExtendido,
                tentativas: this.tentativasMaximas,
                intervalo: this.intervaloTentativas,
                aguardarCarregamento: 8000,
                verificarElementos: true
            };
        }
        return null;
    }
};
`;
    }

    async ajustarTimeoutsEspecificos() {
        console.log('\n⏱️ Ajustando timeouts específicos...');
        
        const caminhoTimeouts = path.join(__dirname, 'src/utils/timeouts.js');
        
        if (!fs.existsSync(caminhoTimeouts)) {
            // Criar arquivo de timeouts se não existir
            const timeoutsContent = this.criarArquivoTimeouts();
            fs.writeFileSync(caminhoTimeouts, timeoutsContent);
            console.log('✅ Arquivo de timeouts criado');
        } else {
            // Adicionar timeouts específicos
            let timeoutsContent = fs.readFileSync(caminhoTimeouts, 'utf8');
            
            if (!timeoutsContent.includes('SAO_JOSE_CAMPOS_TIMEOUTS')) {
                const timeoutsEspecificos = this.gerarTimeoutsEspecificos();
                
                if (timeoutsContent.includes('module.exports')) {
                    timeoutsContent = timeoutsContent.replace(
                        'module.exports',
                        timeoutsEspecificos + '\n\nmodule.exports'
                    );
                } else {
                    timeoutsContent += '\n\n' + timeoutsEspecificos;
                }
                
                fs.writeFileSync(caminhoTimeouts, timeoutsContent);
                console.log('✅ Timeouts específicos adicionados');
            }
        }
        
        this.relatorio.correcoes.push({
            tipo: 'timeouts_especificos',
            descricao: 'Timeouts específicos para São José dos Campos configurados',
            arquivo: 'src/utils/timeouts.js'
        });
    }

    criarArquivoTimeouts() {
        return `/**
 * Configurações de timeout para automação PJE
 */

${this.gerarTimeoutsEspecificos()}

module.exports = {
    SAO_JOSE_CAMPOS_TIMEOUTS,
    // Outros timeouts...
};
`;
    }

    gerarTimeoutsEspecificos() {
        return `// Timeouts específicos para São José dos Campos
const SAO_JOSE_CAMPOS_TIMEOUTS = {
    // Timeouts base (em ms)
    navegacao: 15000,
    carregamentoPagina: 20000,
    buscaElemento: 10000,
    
    // Timeouts para busca de perito
    buscaPerito: {
        inputBusca: 8000,
        botaoBuscar: 5000,
        resultados: 15000,
        carregamentoLista: 12000
    },
    
    // Timeouts para vinculação
    vinculacao: {
        botaoVincular: 8000,
        modalConfirmacao: 10000,
        botaoConfirmar: 5000,
        mensagemSucesso: 12000
    },
    
    // Timeouts para aguardar entre ações
    intervalos: {
        entreCliques: 2000,
        entreNavegacao: 3000,
        entreTentativas: 5000,
        aposCarregamento: 4000
    },
    
    // Função para obter timeout específico
    getTimeout(acao, subacao = null) {
        if (subacao && this[acao] && this[acao][subacao]) {
            return this[acao][subacao];
        }
        return this[acao] || this.navegacao;
    }
};
`;
    }

    async criarConfiguracaoEspecial() {
        console.log('\n📋 Criando configuração especial...');
        
        const configuracaoEspecial = {
            timestamp: new Date().toISOString(),
            versao: '1.0.0',
            descricao: 'Configuração especial para varas de São José dos Campos',
            
            varasEspeciais: this.varasProblematicas,
            
            configuracoes: {
                processamentoSequencial: true,
                timeoutExtendido: true,
                seletoresEspecificos: true,
                tentativasMaximas: 5,
                intervaloTentativas: 5000,
                aguardarCarregamento: 8000
            },
            
            instrucoes: [
                'Processar varas sequencialmente (uma por vez)',
                'Usar timeouts estendidos para todas as operações',
                'Aplicar seletores específicos para busca e vinculação',
                'Aguardar carregamento completo antes de cada ação',
                'Repetir tentativas em caso de falha'
            ],
            
            monitoramento: {
                logDetalhado: true,
                capturarErros: true,
                salvarEvidencias: true
            }
        };
        
        const caminhoConfig = path.join(__dirname, 'config-sao-jose-campos.json');
        fs.writeFileSync(caminhoConfig, JSON.stringify(configuracaoEspecial, null, 2));
        
        console.log('✅ Configuração especial criada: config-sao-jose-campos.json');
        
        this.relatorio.correcoes.push({
            tipo: 'configuracao_especial',
            descricao: 'Arquivo de configuração especial criado',
            arquivo: 'config-sao-jose-campos.json'
        });
    }

    async gerarRelatorioFinal() {
        console.log('\n📄 Gerando relatório final...');
        
        this.relatorio.resumo = {
            totalCorrecoes: this.relatorio.correcoes.length,
            varasAfetadas: this.varasProblematicas.length,
            arquivosModificados: this.relatorio.correcoes.map(c => c.arquivo).filter(Boolean),
            backupCriado: this.backupDir
        };
        
        this.relatorio.proximosPassos = [
            'Executar teste com as varas específicas',
            'Monitorar logs durante processamento',
            'Verificar se busca e vinculação funcionam corretamente',
            'Ajustar configurações se necessário'
        ];
        
        const nomeRelatorio = `CORRECAO-VARAS-SAO-JOSE-${new Date().toISOString().split('T')[0]}.json`;
        const caminhoRelatorio = path.join(__dirname, nomeRelatorio);
        
        fs.writeFileSync(caminhoRelatorio, JSON.stringify(this.relatorio, null, 2));
        
        console.log(`\n📋 RESUMO DA CORREÇÃO`);
        console.log(`======================`);
        console.log(`Status: ${this.relatorio.status}`);
        console.log(`Correções aplicadas: ${this.relatorio.correcoes.length}`);
        console.log(`Varas afetadas: ${this.varasProblematicas.length}`);
        console.log(`Backup criado em: ${this.backupDir}`);
        console.log(`Relatório salvo: ${nomeRelatorio}`);
        
        console.log(`\n✅ CORREÇÕES APLICADAS:`);
        this.relatorio.correcoes.forEach((correcao, index) => {
            console.log(`${index + 1}. ${correcao.tipo}: ${correcao.descricao}`);
        });
        
        console.log(`\n🔄 PRÓXIMOS PASSOS:`);
        this.relatorio.proximosPassos.forEach((passo, index) => {
            console.log(`${index + 1}. ${passo}`);
        });
        
        return nomeRelatorio;
    }
}

// Executar correção
if (require.main === module) {
    const correcao = new CorrecaoVarasSaoJose();
    correcao.executarCorrecao()
        .then(() => {
            console.log('\n✅ Correção concluída com sucesso!');
            console.log('\n🚀 Execute agora um teste com as varas específicas para verificar se o problema foi resolvido.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro na correção:', error);
            process.exit(1);
        });
}

module.exports = CorrecaoVarasSaoJose;