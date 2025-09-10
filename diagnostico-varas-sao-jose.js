#!/usr/bin/env node

/**
 * 🔍 Diagnóstico Específico - Varas de São José dos Campos
 * 
 * Investiga por que as varas 2ª, 3ª, 4ª e 5ª de São José dos Campos
 * não estão sendo processadas corretamente (entram mas não buscam/vinculam)
 */

const fs = require('fs');
const path = require('path');

class DiagnosticoVarasSaoJose {
    constructor() {
        this.varasProblematicas = [
            '2ª Vara do Trabalho de São José dos Campos',
            '3ª Vara do Trabalho de São José dos Campos', 
            '4ª Vara do Trabalho de São José dos Campos',
            '5ª Vara do Trabalho de São José dos Campos'
        ];
        
        this.caminhoOrgaos = path.join(__dirname, 'orgaos_pje.json');
        this.caminhoSkipDetector = path.join(__dirname, 'src/utils/servidor-skip-detector.js');
        this.caminhoAutomacao = path.join(__dirname, 'src/main/servidor-automation-v2.js');
        
        this.relatorio = {
            timestamp: new Date().toISOString(),
            varasAnalisadas: this.varasProblematicas,
            problemas: [],
            solucoes: [],
            status: 'em_analise'
        };
    }

    async executarDiagnostico() {
        console.log('🔍 Iniciando diagnóstico das varas de São José dos Campos...');
        
        try {
            // 1. Verificar configuração dos órgãos
            await this.verificarConfiguracaoOrgaos();
            
            // 2. Analisar skip detector
            await this.analisarSkipDetector();
            
            // 3. Verificar cache específico
            await this.verificarCacheEspecifico();
            
            // 4. Analisar logs de processamento
            await this.analisarLogsProcessamento();
            
            // 5. Verificar seletores específicos
            await this.verificarSeletoresEspecificos();
            
            // 6. Propor soluções
            await this.proporSolucoes();
            
            // 7. Gerar relatório
            await this.gerarRelatorio();
            
        } catch (error) {
            console.error('❌ Erro durante diagnóstico:', error.message);
            this.relatorio.status = 'erro';
            this.relatorio.erro = error.message;
        }
    }

    async verificarConfiguracaoOrgaos() {
        console.log('\n📋 Verificando configuração dos órgãos...');
        
        try {
            const orgaos = JSON.parse(fs.readFileSync(this.caminhoOrgaos, 'utf8'));
            const saoJoseCampos = orgaos['São José dos Campos'] || [];
            
            console.log(`✅ Total de órgãos em São José dos Campos: ${saoJoseCampos.length}`);
            
            for (const vara of this.varasProblematicas) {
                const existe = saoJoseCampos.includes(vara);
                console.log(`${existe ? '✅' : '❌'} ${vara}: ${existe ? 'Configurada' : 'NÃO ENCONTRADA'}`);
                
                if (!existe) {
                    this.relatorio.problemas.push({
                        tipo: 'configuracao_ausente',
                        vara: vara,
                        descricao: 'Vara não encontrada na configuração de órgãos'
                    });
                }
            }
            
        } catch (error) {
            this.relatorio.problemas.push({
                tipo: 'erro_configuracao',
                descricao: `Erro ao ler configuração: ${error.message}`
            });
        }
    }

    async analisarSkipDetector() {
        console.log('\n🎯 Analisando servidor skip detector...');
        
        try {
            const skipDetectorCode = fs.readFileSync(this.caminhoSkipDetector, 'utf8');
            
            // Verificar tolerância atual
            const toleranciaMatch = skipDetectorCode.match(/this\.limiteTolerancia\s*=\s*([0-9.]+)/);
            if (toleranciaMatch) {
                const tolerancia = parseFloat(toleranciaMatch[1]);
                console.log(`✅ Tolerância atual: ${(tolerancia * 100).toFixed(1)}%`);
                
                if (tolerancia > 0.85) {
                    this.relatorio.problemas.push({
                        tipo: 'tolerancia_alta',
                        valor: tolerancia,
                        descricao: 'Tolerância muito alta pode estar causando skip das varas'
                    });
                }
            }
            
            // Verificar se há tratamento específico para São José dos Campos
            const temTratamentoEspecifico = skipDetectorCode.includes('São José dos Campos');
            console.log(`${temTratamentoEspecifico ? '⚠️' : '✅'} Tratamento específico: ${temTratamentoEspecifico ? 'Encontrado' : 'Não encontrado'}`);
            
        } catch (error) {
            this.relatorio.problemas.push({
                tipo: 'erro_skip_detector',
                descricao: `Erro ao analisar skip detector: ${error.message}`
            });
        }
    }

    async verificarCacheEspecifico() {
        console.log('\n💾 Verificando cache específico...');
        
        const cacheDir = path.join(__dirname, 'cache');
        const tempDir = path.join(__dirname, 'temp');
        
        for (const dir of [cacheDir, tempDir]) {
            if (fs.existsSync(dir)) {
                const arquivos = fs.readdirSync(dir);
                const arquivosSaoJose = arquivos.filter(arquivo => 
                    arquivo.toLowerCase().includes('sao jose') || 
                    arquivo.toLowerCase().includes('sao_jose')
                );
                
                console.log(`📁 ${dir}: ${arquivosSaoJose.length} arquivos relacionados`);
                
                if (arquivosSaoJose.length > 0) {
                    this.relatorio.problemas.push({
                        tipo: 'cache_corrompido',
                        diretorio: dir,
                        arquivos: arquivosSaoJose.length,
                        descricao: 'Cache pode estar interferindo no processamento'
                    });
                }
            }
        }
    }

    async analisarLogsProcessamento() {
        console.log('\n📊 Analisando logs de processamento...');
        
        const logFiles = [
            'pje-availability-log.txt',
            'debug.log',
            'error.log'
        ];
        
        for (const logFile of logFiles) {
            const logPath = path.join(__dirname, logFile);
            if (fs.existsSync(logPath)) {
                try {
                    const logContent = fs.readFileSync(logPath, 'utf8');
                    
                    for (const vara of this.varasProblematicas) {
                        if (logContent.includes(vara)) {
                            console.log(`📝 ${logFile}: Encontradas referências a ${vara}`);
                            
                            // Procurar por erros específicos
                            const linhas = logContent.split('\n');
                            const linhasVara = linhas.filter(linha => linha.includes(vara));
                            
                            for (const linha of linhasVara.slice(-5)) { // Últimas 5 ocorrências
                                if (linha.toLowerCase().includes('erro') || 
                                    linha.toLowerCase().includes('error') ||
                                    linha.toLowerCase().includes('falha')) {
                                    
                                    this.relatorio.problemas.push({
                                        tipo: 'erro_log',
                                        vara: vara,
                                        arquivo: logFile,
                                        linha: linha.trim(),
                                        descricao: 'Erro encontrado nos logs'
                                    });
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Erro ao ler ${logFile}: ${error.message}`);
                }
            }
        }
    }

    async verificarSeletoresEspecificos() {
        console.log('\n🎯 Verificando seletores específicos...');
        
        try {
            const seletoresPath = path.join(__dirname, 'src/utils/seletores.js');
            if (fs.existsSync(seletoresPath)) {
                const seletoresCode = fs.readFileSync(seletoresPath, 'utf8');
                
                // Verificar se há seletores específicos para São José dos Campos
                const temSeletoresEspecificos = seletoresCode.includes('São José dos Campos');
                console.log(`${temSeletoresEspecificos ? '✅' : '⚠️'} Seletores específicos: ${temSeletoresEspecificos ? 'Encontrados' : 'Não encontrados'}`);
                
                if (!temSeletoresEspecificos) {
                    this.relatorio.problemas.push({
                        tipo: 'seletores_genericos',
                        descricao: 'Pode ser necessário seletores específicos para São José dos Campos'
                    });
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro ao verificar seletores: ${error.message}`);
        }
    }

    async proporSolucoes() {
        console.log('\n💡 Propondo soluções...');
        
        const solucoes = [];
        
        // Solução 1: Limpar cache específico
        solucoes.push({
            prioridade: 'alta',
            titulo: 'Limpar Cache Específico',
            descricao: 'Remover arquivos de cache relacionados a São José dos Campos',
            comando: 'find . -name "*sao*jose*" -type f -delete'
        });
        
        // Solução 2: Ajustar tolerância se necessário
        const problemaTolerancia = this.relatorio.problemas.find(p => p.tipo === 'tolerancia_alta');
        if (problemaTolerancia) {
            solucoes.push({
                prioridade: 'alta',
                titulo: 'Reduzir Tolerância do Skip Detector',
                descricao: 'Reduzir tolerância para 80% para evitar skip incorreto',
                arquivo: 'src/utils/servidor-skip-detector.js',
                alteracao: 'this.limiteTolerancia = 0.80'
            });
        }
        
        // Solução 3: Processamento sequencial específico
        solucoes.push({
            prioridade: 'media',
            titulo: 'Processamento Sequencial para São José dos Campos',
            descricao: 'Implementar processamento sequencial específico para essas varas',
            implementacao: 'Adicionar flag especial no código de automação'
        });
        
        // Solução 4: Aumentar timeouts
        solucoes.push({
            prioridade: 'media',
            titulo: 'Aumentar Timeouts Específicos',
            descricao: 'Aumentar timeouts para varas de São José dos Campos',
            arquivo: 'src/utils/timeouts.js'
        });
        
        // Solução 5: Seletores específicos
        solucoes.push({
            prioridade: 'baixa',
            titulo: 'Implementar Seletores Específicos',
            descricao: 'Criar seletores específicos para São José dos Campos',
            arquivo: 'src/utils/seletores.js'
        });
        
        this.relatorio.solucoes = solucoes;
        
        console.log(`✅ ${solucoes.length} soluções propostas`);
        solucoes.forEach((solucao, index) => {
            console.log(`${index + 1}. [${solucao.prioridade.toUpperCase()}] ${solucao.titulo}`);
        });
    }

    async gerarRelatorio() {
        console.log('\n📄 Gerando relatório...');
        
        this.relatorio.status = this.relatorio.problemas.length > 0 ? 'problemas_encontrados' : 'ok';
        this.relatorio.resumo = {
            totalProblemas: this.relatorio.problemas.length,
            totalSolucoes: this.relatorio.solucoes.length,
            varasAfetadas: this.varasProblematicas.length
        };
        
        const nomeRelatorio = `DIAGNOSTICO-VARAS-SAO-JOSE-${new Date().toISOString().split('T')[0]}.json`;
        const caminhoRelatorio = path.join(__dirname, nomeRelatorio);
        
        fs.writeFileSync(caminhoRelatorio, JSON.stringify(this.relatorio, null, 2));
        
        console.log(`\n📋 RESUMO DO DIAGNÓSTICO`);
        console.log(`=========================`);
        console.log(`Status: ${this.relatorio.status}`);
        console.log(`Problemas encontrados: ${this.relatorio.problemas.length}`);
        console.log(`Soluções propostas: ${this.relatorio.solucoes.length}`);
        console.log(`Relatório salvo: ${nomeRelatorio}`);
        
        if (this.relatorio.problemas.length > 0) {
            console.log(`\n🔴 PROBLEMAS PRINCIPAIS:`);
            this.relatorio.problemas.slice(0, 3).forEach((problema, index) => {
                console.log(`${index + 1}. ${problema.tipo}: ${problema.descricao}`);
            });
        }
        
        if (this.relatorio.solucoes.length > 0) {
            console.log(`\n💡 PRÓXIMOS PASSOS:`);
            const solucoesAlta = this.relatorio.solucoes.filter(s => s.prioridade === 'alta');
            solucoesAlta.forEach((solucao, index) => {
                console.log(`${index + 1}. ${solucao.titulo}`);
            });
        }
        
        return nomeRelatorio;
    }
}

// Executar diagnóstico
if (require.main === module) {
    const diagnostico = new DiagnosticoVarasSaoJose();
    diagnostico.executarDiagnostico()
        .then(() => {
            console.log('\n✅ Diagnóstico concluído com sucesso!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro no diagnóstico:', error);
            process.exit(1);
        });
}

module.exports = DiagnosticoVarasSaoJose;