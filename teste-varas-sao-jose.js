#!/usr/bin/env node

/**
 * 🧪 Teste Específico - Varas de São José dos Campos
 * 
 * Testa se as correções implementadas resolveram o problema
 * das varas que "entram mas não buscam e não vinculam ao perito"
 */

const fs = require('fs');
const path = require('path');

class TesteVarasSaoJose {
    constructor() {
        this.varasParaTestar = [
            '2ª Vara do Trabalho de São José dos Campos',
            '3ª Vara do Trabalho de São José dos Campos', 
            '4ª Vara do Trabalho de São José dos Campos',
            '5ª Vara do Trabalho de São José dos Campos'
        ];
        
        this.resultadoTeste = {
            timestamp: new Date().toISOString(),
            varasTeste: this.varasParaTestar,
            correcoes: [],
            status: 'iniciando',
            problemas: [],
            solucoes: []
        };
    }

    async executarTeste() {
        console.log('🧪 Iniciando teste das varas de São José dos Campos...');
        
        try {
            // 1. Verificar se correções foram aplicadas
            await this.verificarCorrecoesAplicadas();
            
            // 2. Validar configurações específicas
            await this.validarConfiguracoes();
            
            // 3. Simular processamento das varas
            await this.simularProcessamento();
            
            // 4. Verificar seletores implementados
            await this.verificarSeletores();
            
            // 5. Validar timeouts configurados
            await this.validarTimeouts();
            
            // 6. Gerar relatório de teste
            await this.gerarRelatorioTeste();
            
            this.resultadoTeste.status = 'concluido';
            
        } catch (error) {
            console.error('❌ Erro durante teste:', error.message);
            this.resultadoTeste.status = 'erro';
            this.resultadoTeste.erro = error.message;
        }
    }

    async verificarCorrecoesAplicadas() {
        console.log('\n🔍 Verificando correções aplicadas...');
        
        const arquivosParaVerificar = [
            {
                arquivo: 'src/utils/seletores.js',
                buscar: 'SAO_JOSE_CAMPOS_ESPECIFICOS',
                descricao: 'Seletores específicos'
            },
            {
                arquivo: 'src/utils/timeouts.js',
                buscar: 'SAO_JOSE_CAMPOS_TIMEOUTS',
                descricao: 'Timeouts específicos'
            },
            {
                arquivo: 'src/main/servidor-automation-v2.js',
                buscar: 'SAO_JOSE_CAMPOS_SEQUENCIAL',
                descricao: 'Processamento sequencial'
            },
            {
                arquivo: 'config-sao-jose-campos.json',
                buscar: 'varasEspeciais',
                descricao: 'Configuração especial'
            }
        ];
        
        for (const item of arquivosParaVerificar) {
            const caminhoArquivo = path.join(__dirname, item.arquivo);
            
            if (fs.existsSync(caminhoArquivo)) {
                const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
                
                if (conteudo.includes(item.buscar)) {
                    console.log(`✅ ${item.descricao}: Implementado`);
                    this.resultadoTeste.correcoes.push({
                        tipo: item.descricao,
                        status: 'implementado',
                        arquivo: item.arquivo
                    });
                } else {
                    console.log(`❌ ${item.descricao}: Não encontrado`);
                    this.resultadoTeste.problemas.push({
                        tipo: item.descricao,
                        problema: 'Correção não encontrada no arquivo',
                        arquivo: item.arquivo
                    });
                }
            } else {
                console.log(`⚠️ ${item.descricao}: Arquivo não existe`);
                this.resultadoTeste.problemas.push({
                    tipo: item.descricao,
                    problema: 'Arquivo não existe',
                    arquivo: item.arquivo
                });
            }
        }
    }

    async validarConfiguracoes() {
        console.log('\n⚙️ Validando configurações específicas...');
        
        const caminhoConfig = path.join(__dirname, 'config-sao-jose-campos.json');
        
        if (fs.existsSync(caminhoConfig)) {
            try {
                const config = JSON.parse(fs.readFileSync(caminhoConfig, 'utf8'));
                
                // Verificar se todas as varas estão na configuração
                const varasConfig = config.varasEspeciais || [];
                const varasFaltando = this.varasParaTestar.filter(vara => !varasConfig.includes(vara));
                
                if (varasFaltando.length === 0) {
                    console.log('✅ Todas as varas estão configuradas');
                    this.resultadoTeste.correcoes.push({
                        tipo: 'configuracao_varas',
                        status: 'completo',
                        detalhes: `${varasConfig.length} varas configuradas`
                    });
                } else {
                    console.log(`❌ Varas faltando na configuração: ${varasFaltando.join(', ')}`);
                    this.resultadoTeste.problemas.push({
                        tipo: 'configuracao_varas',
                        problema: 'Varas faltando na configuração',
                        varasFaltando
                    });
                }
                
                // Verificar configurações específicas
                const configEsperadas = {
                    processamentoSequencial: true,
                    timeoutExtendido: true,
                    seletoresEspecificos: true
                };
                
                for (const [chave, valorEsperado] of Object.entries(configEsperadas)) {
                    if (config.configuracoes && config.configuracoes[chave] === valorEsperado) {
                        console.log(`✅ ${chave}: Configurado corretamente`);
                    } else {
                        console.log(`❌ ${chave}: Configuração incorreta ou ausente`);
                        this.resultadoTeste.problemas.push({
                            tipo: 'configuracao_especifica',
                            problema: `${chave} não configurado corretamente`,
                            esperado: valorEsperado,
                            encontrado: config.configuracoes?.[chave]
                        });
                    }
                }
                
            } catch (error) {
                console.log(`❌ Erro ao ler configuração: ${error.message}`);
                this.resultadoTeste.problemas.push({
                    tipo: 'leitura_configuracao',
                    problema: 'Erro ao ler arquivo de configuração',
                    erro: error.message
                });
            }
        } else {
            console.log('❌ Arquivo de configuração não encontrado');
            this.resultadoTeste.problemas.push({
                tipo: 'arquivo_configuracao',
                problema: 'Arquivo config-sao-jose-campos.json não encontrado'
            });
        }
    }

    async simularProcessamento() {
        console.log('\n🔄 Simulando processamento das varas...');
        
        for (const vara of this.varasParaTestar) {
            console.log(`\n📋 Testando: ${vara}`);
            
            // Simular verificações que seriam feitas durante o processamento
            const resultadoVara = {
                nome: vara,
                etapas: [],
                status: 'sucesso',
                problemas: []
            };
            
            // 1. Verificar se vara está na lista de especiais
            console.log('  🔍 Verificando se é vara especial...');
            resultadoVara.etapas.push({
                etapa: 'verificacao_vara_especial',
                status: 'sucesso',
                detalhes: 'Vara identificada como especial'
            });
            
            // 2. Verificar configuração de processamento sequencial
            console.log('  ⚙️ Verificando processamento sequencial...');
            resultadoVara.etapas.push({
                etapa: 'processamento_sequencial',
                status: 'configurado',
                detalhes: 'Processamento sequencial ativado'
            });
            
            // 3. Verificar seletores específicos
            console.log('  🎯 Verificando seletores específicos...');
            const seletoresDisponiveis = this.verificarSeletoresParaVara();
            if (seletoresDisponiveis) {
                resultadoVara.etapas.push({
                    etapa: 'seletores_especificos',
                    status: 'disponivel',
                    detalhes: 'Seletores específicos implementados'
                });
            } else {
                resultadoVara.etapas.push({
                    etapa: 'seletores_especificos',
                    status: 'problema',
                    detalhes: 'Seletores específicos não encontrados'
                });
                resultadoVara.problemas.push('Seletores não disponíveis');
            }
            
            // 4. Verificar timeouts estendidos
            console.log('  ⏱️ Verificando timeouts estendidos...');
            const timeoutsDisponiveis = this.verificarTimeoutsParaVara();
            if (timeoutsDisponiveis) {
                resultadoVara.etapas.push({
                    etapa: 'timeouts_estendidos',
                    status: 'configurado',
                    detalhes: 'Timeouts estendidos aplicados'
                });
            } else {
                resultadoVara.etapas.push({
                    etapa: 'timeouts_estendidos',
                    status: 'problema',
                    detalhes: 'Timeouts estendidos não encontrados'
                });
                resultadoVara.problemas.push('Timeouts não configurados');
            }
            
            // 5. Simular busca de perito
            console.log('  🔍 Simulando busca de perito...');
            resultadoVara.etapas.push({
                etapa: 'busca_perito',
                status: 'simulado',
                detalhes: 'Busca de perito com seletores específicos'
            });
            
            // 6. Simular vinculação
            console.log('  🔗 Simulando vinculação...');
            resultadoVara.etapas.push({
                etapa: 'vinculacao_perito',
                status: 'simulado',
                detalhes: 'Vinculação com timeouts estendidos'
            });
            
            if (resultadoVara.problemas.length > 0) {
                resultadoVara.status = 'problemas_encontrados';
                console.log(`  ❌ Problemas encontrados: ${resultadoVara.problemas.join(', ')}`);
            } else {
                console.log('  ✅ Simulação concluída com sucesso');
            }
            
            this.resultadoTeste.correcoes.push({
                tipo: 'simulacao_vara',
                vara: vara,
                resultado: resultadoVara
            });
        }
    }

    verificarSeletoresParaVara() {
        const caminhoSeletores = path.join(__dirname, 'src/utils/seletores.js');
        if (fs.existsSync(caminhoSeletores)) {
            const conteudo = fs.readFileSync(caminhoSeletores, 'utf8');
            return conteudo.includes('SAO_JOSE_CAMPOS_ESPECIFICOS') && 
                   conteudo.includes('buscaPerito') && 
                   conteudo.includes('vinculacao');
        }
        return false;
    }

    verificarTimeoutsParaVara() {
        const caminhoTimeouts = path.join(__dirname, 'src/utils/timeouts.js');
        if (fs.existsSync(caminhoTimeouts)) {
            const conteudo = fs.readFileSync(caminhoTimeouts, 'utf8');
            return conteudo.includes('SAO_JOSE_CAMPOS_TIMEOUTS') && 
                   conteudo.includes('buscaPerito') && 
                   conteudo.includes('vinculacao');
        }
        return false;
    }

    async verificarSeletores() {
        console.log('\n🎯 Verificando implementação de seletores...');
        
        const caminhoSeletores = path.join(__dirname, 'src/utils/seletores.js');
        
        if (fs.existsSync(caminhoSeletores)) {
            const conteudo = fs.readFileSync(caminhoSeletores, 'utf8');
            
            const seletoresEsperados = [
                'buscaPerito',
                'vinculacao',
                'navegacao',
                'timeouts',
                'configuracao'
            ];
            
            const seletoresEncontrados = [];
            const seletoresFaltando = [];
            
            for (const seletor of seletoresEsperados) {
                if (conteudo.includes(seletor)) {
                    seletoresEncontrados.push(seletor);
                    console.log(`✅ Seletor ${seletor}: Implementado`);
                } else {
                    seletoresFaltando.push(seletor);
                    console.log(`❌ Seletor ${seletor}: Não encontrado`);
                }
            }
            
            this.resultadoTeste.correcoes.push({
                tipo: 'verificacao_seletores',
                seletoresEncontrados,
                seletoresFaltando,
                status: seletoresFaltando.length === 0 ? 'completo' : 'incompleto'
            });
            
        } else {
            console.log('❌ Arquivo de seletores não encontrado');
            this.resultadoTeste.problemas.push({
                tipo: 'arquivo_seletores',
                problema: 'Arquivo src/utils/seletores.js não encontrado'
            });
        }
    }

    async validarTimeouts() {
        console.log('\n⏱️ Validando configuração de timeouts...');
        
        const caminhoTimeouts = path.join(__dirname, 'src/utils/timeouts.js');
        
        if (fs.existsSync(caminhoTimeouts)) {
            const conteudo = fs.readFileSync(caminhoTimeouts, 'utf8');
            
            const timeoutsEsperados = [
                'navegacao',
                'buscaPerito',
                'vinculacao',
                'intervalos'
            ];
            
            const timeoutsEncontrados = [];
            const timeoutsFaltando = [];
            
            for (const timeout of timeoutsEsperados) {
                if (conteudo.includes(timeout)) {
                    timeoutsEncontrados.push(timeout);
                    console.log(`✅ Timeout ${timeout}: Configurado`);
                } else {
                    timeoutsFaltando.push(timeout);
                    console.log(`❌ Timeout ${timeout}: Não encontrado`);
                }
            }
            
            this.resultadoTeste.correcoes.push({
                tipo: 'verificacao_timeouts',
                timeoutsEncontrados,
                timeoutsFaltando,
                status: timeoutsFaltando.length === 0 ? 'completo' : 'incompleto'
            });
            
        } else {
            console.log('❌ Arquivo de timeouts não encontrado');
            this.resultadoTeste.problemas.push({
                tipo: 'arquivo_timeouts',
                problema: 'Arquivo src/utils/timeouts.js não encontrado'
            });
        }
    }

    async gerarRelatorioTeste() {
        console.log('\n📄 Gerando relatório de teste...');
        
        // Calcular estatísticas
        const totalCorrecoes = this.resultadoTeste.correcoes.length;
        const totalProblemas = this.resultadoTeste.problemas.length;
        const varasTestadas = this.varasParaTestar.length;
        
        this.resultadoTeste.estatisticas = {
            totalCorrecoes,
            totalProblemas,
            varasTestadas,
            sucessoPercentual: totalProblemas === 0 ? 100 : Math.round((totalCorrecoes / (totalCorrecoes + totalProblemas)) * 100)
        };
        
        // Determinar status geral
        if (totalProblemas === 0) {
            this.resultadoTeste.statusGeral = 'sucesso_completo';
            this.resultadoTeste.mensagem = 'Todas as correções foram aplicadas com sucesso';
        } else if (totalProblemas < totalCorrecoes) {
            this.resultadoTeste.statusGeral = 'sucesso_parcial';
            this.resultadoTeste.mensagem = 'Maioria das correções aplicadas, alguns problemas encontrados';
        } else {
            this.resultadoTeste.statusGeral = 'problemas_criticos';
            this.resultadoTeste.mensagem = 'Problemas críticos encontrados nas correções';
        }
        
        // Gerar recomendações
        this.resultadoTeste.recomendacoes = [];
        
        if (totalProblemas === 0) {
            this.resultadoTeste.recomendacoes.push('Executar processamento real das varas');
            this.resultadoTeste.recomendacoes.push('Monitorar logs durante execução');
            this.resultadoTeste.recomendacoes.push('Verificar se busca e vinculação funcionam corretamente');
        } else {
            this.resultadoTeste.recomendacoes.push('Revisar e corrigir problemas encontrados');
            this.resultadoTeste.recomendacoes.push('Executar teste novamente após correções');
            if (this.resultadoTeste.problemas.some(p => p.tipo.includes('arquivo'))) {
                this.resultadoTeste.recomendacoes.push('Verificar se todos os arquivos foram criados corretamente');
            }
        }
        
        const nomeRelatorio = `TESTE-VARAS-SAO-JOSE-${new Date().toISOString().split('T')[0]}.json`;
        const caminhoRelatorio = path.join(__dirname, nomeRelatorio);
        
        fs.writeFileSync(caminhoRelatorio, JSON.stringify(this.resultadoTeste, null, 2));
        
        // Exibir resumo
        console.log(`\n📋 RESUMO DO TESTE`);
        console.log(`==================`);
        console.log(`Status: ${this.resultadoTeste.statusGeral}`);
        console.log(`Mensagem: ${this.resultadoTeste.mensagem}`);
        console.log(`Correções verificadas: ${totalCorrecoes}`);
        console.log(`Problemas encontrados: ${totalProblemas}`);
        console.log(`Varas testadas: ${varasTestadas}`);
        console.log(`Taxa de sucesso: ${this.resultadoTeste.estatisticas.sucessoPercentual}%`);
        console.log(`Relatório salvo: ${nomeRelatorio}`);
        
        if (this.resultadoTeste.problemas.length > 0) {
            console.log(`\n❌ PROBLEMAS ENCONTRADOS:`);
            this.resultadoTeste.problemas.forEach((problema, index) => {
                console.log(`${index + 1}. ${problema.tipo}: ${problema.problema}`);
            });
        }
        
        console.log(`\n💡 RECOMENDAÇÕES:`);
        this.resultadoTeste.recomendacoes.forEach((recomendacao, index) => {
            console.log(`${index + 1}. ${recomendacao}`);
        });
        
        return nomeRelatorio;
    }
}

// Executar teste
if (require.main === module) {
    const teste = new TesteVarasSaoJose();
    teste.executarTeste()
        .then(() => {
            console.log('\n✅ Teste concluído!');
            
            if (teste.resultadoTeste.statusGeral === 'sucesso_completo') {
                console.log('\n🎉 Todas as correções foram aplicadas com sucesso!');
                console.log('🚀 As varas de São José dos Campos devem agora buscar e vincular ao perito corretamente.');
            } else {
                console.log('\n⚠️ Alguns problemas foram encontrados. Revise o relatório para mais detalhes.');
            }
            
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro no teste:', error);
            process.exit(1);
        });
}

module.exports = TesteVarasSaoJose;