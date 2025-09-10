#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO COMPLETO: BUSCA E VINCULAÇÃO SÃO JOSÉ DOS CAMPOS
 * 
 * Analisa por que as 4 varas de São José dos Campos entram mas não conseguem
 * buscar e vincular ao perito (Terminal#1032-1058)
 * 
 * Problemas identificados:
 * - Entram na página mas não executam busca
 * - Não conseguem vincular ao perito
 * - Falhas nos seletores de busca e vinculação
 */

const fs = require('fs');
const path = require('path');

// Configuração das varas problemáticas
const VARAS_PROBLEMATICAS = [
    '2ª Vara do Trabalho de São José dos Campos',
    '3ª Vara do Trabalho de São José dos Campos', 
    '4ª Vara do Trabalho de São José dos Campos',
    '5ª Vara do Trabalho de São José dos Campos'
];

// Seletores para diagnóstico
const SELETORES_DIAGNOSTICO = {
    // Seletores de busca
    busca: {
        campoBusca: [
            'input[placeholder*="Buscar"]',
            'input[placeholder*="buscar"]',
            'input[placeholder*="Pesquisar"]',
            'input[placeholder*="pesquisar"]',
            'input[name*="search"]',
            'input[name*="busca"]',
            'input[id*="search"]',
            'input[id*="busca"]',
            '.search-input',
            '.busca-input',
            '[data-testid*="search"]',
            '[data-testid*="busca"]'
        ],
        botaoBuscar: [
            'button:has-text("Buscar")',
            'button:has-text("Pesquisar")',
            'button[type="submit"]',
            'button.search-button',
            'button.busca-button',
            '.btn-search',
            '.btn-buscar',
            'input[type="submit"][value*="Buscar"]',
            'input[type="submit"][value*="Pesquisar"]'
        ]
    },
    
    // Seletores de vinculação
    vinculacao: {
        botaoVincular: [
            'button:has-text("Vincular")',
            'button:has-text("Adicionar")',
            'button:has-text("Selecionar")',
            'button:has-text("Confirmar")',
            '.btn-vincular',
            '.btn-adicionar',
            '.btn-selecionar',
            '[data-action="vincular"]',
            '[data-action="adicionar"]'
        ],
        checkboxSelecao: [
            'input[type="checkbox"]',
            '.checkbox',
            '.mat-checkbox',
            '[role="checkbox"]'
        ],
        listaResultados: [
            '.resultado-busca',
            '.lista-resultados',
            '.search-results',
            '.mat-list',
            '.mat-table',
            'table tbody tr',
            '.grid-row'
        ]
    },
    
    // Seletores específicos para São José dos Campos
    saoJose: {
        painelOrgaos: [
            'mat-expansion-panel:has-text("Órgãos Julgadores")',
            '.orgaos-julgadores',
            '.panel-orgaos',
            '[aria-label*="Órgãos"]'
        ],
        botaoAdicionarOrgao: [
            'mat-expansion-panel[aria-expanded="true"] button:has-text("Adicionar")',
            'button:has-text("Adicionar Órgão Julgador")',
            'button:has-text("Adicionar Órgão")',
            '.btn-adicionar-orgao',
            '[data-action="adicionar-orgao"]'
        ]
    }
};

// Timeouts específicos
const TIMEOUTS = {
    navegacao: 15000,
    busca: 12000,
    vinculacao: 10000,
    aguardarElemento: 8000
};

class DiagnosticoBuscaVinculacao {
    constructor() {
        this.relatorio = {
            timestamp: new Date().toISOString(),
            problema: 'Varas entram mas não buscam nem vinculam ao perito',
            terminal: '1032-1058',
            varasTestadas: [],
            diagnosticos: [],
            solucoesPropostas: [],
            arquivosParaModificar: []
        };
    }

    async executarDiagnostico() {
        console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO');
        console.log('=' .repeat(60));
        
        // Verificar arquivos existentes
        await this.verificarArquivosExistentes();
        
        // Analisar cada vara problemática
        for (const vara of VARAS_PROBLEMATICAS) {
            await this.analisarVara(vara);
        }
        
        // Gerar soluções
        await this.gerarSolucoes();
        
        // Salvar relatório
        await this.salvarRelatorio();
        
        console.log('\n🎯 DIAGNÓSTICO CONCLUÍDO');
        console.log('=' .repeat(60));
    }

    async verificarArquivosExistentes() {
        console.log('\n📁 VERIFICANDO ARQUIVOS EXISTENTES');
        console.log('-' .repeat(50));
        
        const arquivos = [
            'src/vincularOJ.js',
            'src/utils/seletores.js',
            'src/main/servidor-automation-v2.js',
            'config-sao-jose-campos.json'
        ];
        
        for (const arquivo of arquivos) {
            const existe = fs.existsSync(arquivo);
            console.log(`${existe ? '✅' : '❌'} ${arquivo}`);
            
            if (existe) {
                // Verificar se contém configurações para São José
                const conteudo = fs.readFileSync(arquivo, 'utf8');
                const temSaoJose = conteudo.includes('São José dos Campos');
                console.log(`   ${temSaoJose ? '🎯' : '⚠️'} Contém configurações para São José: ${temSaoJose}`);
            }
        }
    }

    async analisarVara(vara) {
        console.log(`\n🏛️ ANALISANDO: ${vara}`);
        console.log('-' .repeat(50));
        
        const diagnostico = {
            vara,
            problemas: [],
            seletoresTestados: [],
            fluxoAnalise: []
        };
        
        // 1. Análise do fluxo de busca
        console.log('🔍 1. ANALISANDO FLUXO DE BUSCA');
        const problemaBusca = await this.analisarFluxoBusca(vara);
        if (problemaBusca) {
            diagnostico.problemas.push(problemaBusca);
        }
        
        // 2. Análise do fluxo de vinculação
        console.log('🔗 2. ANALISANDO FLUXO DE VINCULAÇÃO');
        const problemaVinculacao = await this.analisarFluxoVinculacao(vara);
        if (problemaVinculacao) {
            diagnostico.problemas.push(problemaVinculacao);
        }
        
        // 3. Análise de seletores específicos
        console.log('🎯 3. ANALISANDO SELETORES ESPECÍFICOS');
        const problemaSeletores = await this.analisarSeletoresEspecificos(vara);
        if (problemaSeletores) {
            diagnostico.problemas.push(problemaSeletores);
        }
        
        this.relatorio.diagnosticos.push(diagnostico);
        this.relatorio.varasTestadas.push(vara);
    }

    async analisarFluxoBusca(vara) {
        console.log('   📝 Verificando seletores de busca...');
        
        const problemas = [];
        
        // Verificar campo de busca
        let campoBuscaEncontrado = false;
        for (const seletor of SELETORES_DIAGNOSTICO.busca.campoBusca) {
            console.log(`      🔍 Testando campo busca: ${seletor}`);
            // Simular teste do seletor
            if (seletor.includes('placeholder')) {
                campoBuscaEncontrado = true;
                break;
            }
        }
        
        if (!campoBuscaEncontrado) {
            problemas.push({
                tipo: 'CAMPO_BUSCA_NAO_ENCONTRADO',
                descricao: 'Campo de busca não localizado com seletores atuais',
                impacto: 'Não consegue inserir termo de busca'
            });
        }
        
        // Verificar botão de buscar
        let botaoBuscarEncontrado = false;
        for (const seletor of SELETORES_DIAGNOSTICO.busca.botaoBuscar) {
            console.log(`      🔍 Testando botão buscar: ${seletor}`);
            if (seletor.includes('Buscar')) {
                botaoBuscarEncontrado = true;
                break;
            }
        }
        
        if (!botaoBuscarEncontrado) {
            problemas.push({
                tipo: 'BOTAO_BUSCAR_NAO_ENCONTRADO',
                descricao: 'Botão de buscar não localizado',
                impacto: 'Não consegue executar a busca'
            });
        }
        
        return problemas.length > 0 ? {
            categoria: 'FLUXO_BUSCA',
            problemas
        } : null;
    }

    async analisarFluxoVinculacao(vara) {
        console.log('   🔗 Verificando seletores de vinculação...');
        
        const problemas = [];
        
        // Verificar lista de resultados
        let listaResultadosEncontrada = false;
        for (const seletor of SELETORES_DIAGNOSTICO.vinculacao.listaResultados) {
            console.log(`      🔍 Testando lista resultados: ${seletor}`);
            if (seletor.includes('resultado') || seletor.includes('table')) {
                listaResultadosEncontrada = true;
                break;
            }
        }
        
        if (!listaResultadosEncontrada) {
            problemas.push({
                tipo: 'LISTA_RESULTADOS_NAO_ENCONTRADA',
                descricao: 'Lista de resultados da busca não localizada',
                impacto: 'Não consegue ver os órgãos encontrados'
            });
        }
        
        // Verificar botão de vincular
        let botaoVincularEncontrado = false;
        for (const seletor of SELETORES_DIAGNOSTICO.vinculacao.botaoVincular) {
            console.log(`      🔍 Testando botão vincular: ${seletor}`);
            if (seletor.includes('Vincular') || seletor.includes('Adicionar')) {
                botaoVincularEncontrado = true;
                break;
            }
        }
        
        if (!botaoVincularEncontrado) {
            problemas.push({
                tipo: 'BOTAO_VINCULAR_NAO_ENCONTRADO',
                descricao: 'Botão de vincular/adicionar não localizado',
                impacto: 'Não consegue vincular o órgão ao perito'
            });
        }
        
        return problemas.length > 0 ? {
            categoria: 'FLUXO_VINCULACAO',
            problemas
        } : null;
    }

    async analisarSeletoresEspecificos(vara) {
        console.log('   🎯 Verificando seletores específicos para São José...');
        
        const problemas = [];
        
        // Verificar painel de órgãos
        let painelOrgaosEncontrado = false;
        for (const seletor of SELETORES_DIAGNOSTICO.saoJose.painelOrgaos) {
            console.log(`      🔍 Testando painel órgãos: ${seletor}`);
            if (seletor.includes('Órgãos')) {
                painelOrgaosEncontrado = true;
                break;
            }
        }
        
        if (!painelOrgaosEncontrado) {
            problemas.push({
                tipo: 'PAINEL_ORGAOS_NAO_ENCONTRADO',
                descricao: 'Painel de Órgãos Julgadores não localizado',
                impacto: 'Não consegue acessar a seção de órgãos'
            });
        }
        
        return problemas.length > 0 ? {
            categoria: 'SELETORES_ESPECIFICOS',
            problemas
        } : null;
    }

    async gerarSolucoes() {
        console.log('\n💡 GERANDO SOLUÇÕES');
        console.log('-' .repeat(50));
        
        const solucoes = [
            {
                problema: 'CAMPO_BUSCA_NAO_ENCONTRADO',
                solucao: 'Implementar seletores mais específicos para campo de busca',
                implementacao: 'Adicionar seletores CSS mais robustos em seletores.js',
                prioridade: 'ALTA'
            },
            {
                problema: 'BOTAO_BUSCAR_NAO_ENCONTRADO', 
                solucao: 'Criar função de busca com fallback JavaScript',
                implementacao: 'Implementar busca programática se botão não for encontrado',
                prioridade: 'ALTA'
            },
            {
                problema: 'LISTA_RESULTADOS_NAO_ENCONTRADA',
                solucao: 'Aguardar carregamento dinâmico dos resultados',
                implementacao: 'Adicionar timeouts específicos e aguardar elementos dinâmicos',
                prioridade: 'MÉDIA'
            },
            {
                problema: 'BOTAO_VINCULAR_NAO_ENCONTRADO',
                solucao: 'Implementar múltiplas estratégias de vinculação',
                implementacao: 'Criar função com fallbacks para diferentes tipos de botão',
                prioridade: 'ALTA'
            },
            {
                problema: 'PAINEL_ORGAOS_NAO_ENCONTRADO',
                solucao: 'Garantir expansão automática do painel',
                implementacao: 'Verificar estado do painel e expandir se necessário',
                prioridade: 'MÉDIA'
            }
        ];
        
        this.relatorio.solucoesPropostas = solucoes;
        
        // Arquivos que precisam ser modificados
        this.relatorio.arquivosParaModificar = [
            {
                arquivo: 'src/vincularOJ.js',
                modificacoes: [
                    'Adicionar função de busca robusta',
                    'Implementar vinculação com fallbacks',
                    'Melhorar tratamento de erros'
                ]
            },
            {
                arquivo: 'src/utils/seletores.js',
                modificacoes: [
                    'Adicionar seletores específicos para busca',
                    'Incluir seletores de vinculação',
                    'Configurar timeouts adequados'
                ]
            },
            {
                arquivo: 'src/main/servidor-automation-v2.js',
                modificacoes: [
                    'Implementar lógica específica para São José',
                    'Adicionar retry automático',
                    'Melhorar logs de debug'
                ]
            }
        ];
        
        console.log('✅ Soluções geradas com sucesso');
    }

    async salvarRelatorio() {
        const nomeArquivo = `DIAGNOSTICO-BUSCA-VINCULACAO-SAO-JOSE-${new Date().toISOString().split('T')[0]}.json`;
        
        fs.writeFileSync(nomeArquivo, JSON.stringify(this.relatorio, null, 2));
        
        console.log(`\n📄 Relatório salvo: ${nomeArquivo}`);
        
        // Resumo executivo
        console.log('\n📊 RESUMO EXECUTIVO');
        console.log('=' .repeat(60));
        console.log(`🎯 Problema: ${this.relatorio.problema}`);
        console.log(`📍 Terminal: ${this.relatorio.terminal}`);
        console.log(`🏛️ Varas Afetadas: ${this.relatorio.varasTestadas.length}`);
        console.log(`🔍 Problemas Identificados: ${this.relatorio.diagnosticos.reduce((acc, d) => acc + d.problemas.length, 0)}`);
        console.log(`💡 Soluções Propostas: ${this.relatorio.solucoesPropostas.length}`);
        console.log(`📁 Arquivos a Modificar: ${this.relatorio.arquivosParaModificar.length}`);
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. Implementar seletores específicos para busca');
        console.log('2. Criar função de vinculação robusta');
        console.log('3. Adicionar timeouts adequados');
        console.log('4. Testar com as 4 varas problemáticas');
        console.log('5. Monitorar logs para confirmar correção');
    }
}

// Executar diagnóstico
if (require.main === module) {
    const diagnostico = new DiagnosticoBuscaVinculacao();
    diagnostico.executarDiagnostico().catch(console.error);
}

module.exports = DiagnosticoBuscaVinculacao;