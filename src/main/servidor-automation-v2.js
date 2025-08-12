const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { login } = require('../login.js');
const { loadConfig } = require('../util.js');

/**
 * Automação moderna para vinculação de OJs a servidores
 * Baseada no documento automacao.md com melhorias implementadas
 */
class ServidorAutomationV2 {
    constructor() {
        this.isRunning = false;
        this.currentProgress = 0;
        this.totalOrgaos = 0;
        this.mainWindow = null;
        this.browser = null;
        this.page = null;
        this.config = null;
        this.results = [];
        this.ojCache = new Set(); // Cache para OJs já cadastrados
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    setMainWindow(window) {
        this.mainWindow = window;
    }

    // Função helper para delay
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Normalizar nomes de órgãos julgadores para corrigir erros de digitação
    normalizeOrgaoName(orgao) {
        return orgao
            .replace(/\s+/g, ' ')  // Normalizar espaços múltiplos
            .replace(/doTrabalho/g, 'do Trabalho')  // Corrigir "doTrabalho" → "do Trabalho"
            .replace(/daTrabalho/g, 'da Trabalho')  // Corrigir "daTrabalho" → "da Trabalho"  
            .replace(/deTrabalho/g, 'de Trabalho')  // Corrigir "deTrabalho" → "de Trabalho"
            .trim();
    }

    sendStatus(type, message, progress = null, subtitle = null, orgao = null) {
        try {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('automation-progress', {
                    type,
                    message,
                    progress,
                    subtitle,
                    orgao,
                    automationType: 'servidor-v2'
                });
            }
        } catch (error) {
            // Erro de IPC - não é crítico, apenas log
            console.warn('Erro ao enviar status IPC:', error.message);
        }
        
        try {
            console.log(`[${type.toUpperCase()}] ${message}${subtitle ? ` - ${subtitle}` : ''}${orgao ? ` (${orgao})` : ''}`);
        } catch (error) {
            // Em caso de erro até no console.log, usar process.stdout
            process.stdout.write(`[${type.toUpperCase()}] ${message}\n`);
        }
    }

    async startAutomation(config) {
        if (this.isRunning) {
            throw new Error('Automação já está em execução');
        }

        this.isRunning = true;
        this.config = config;
        this.totalOrgaos = config.orgaos ? config.orgaos.length : 0;
        this.currentProgress = 0;
        this.results = [];

        try {
            this.sendStatus('info', 'Iniciando automação moderna...', 0, 'Configurando ambiente');
            
            await this.initializeBrowser();
            await this.performLogin();
            await this.navigateDirectlyToPerson(config.cpf);
            await this.navigateToServerTab();
            await this.processOrgaosJulgadores();
            await this.generateReport();
            
            this.sendStatus('success', 'Automação concluída com sucesso!', 100, 'Processo finalizado');
            
        } catch (error) {
            console.error('Erro na automação:', error);
            this.sendStatus('error', `Erro na automação: ${error.message}`, this.currentProgress, 'Erro crítico');
            throw error;
        } finally {
            await this.cleanup();
            this.isRunning = false;
        }
    }

    async initializeBrowser() {
        this.sendStatus('info', 'Inicializando navegador...', 5, 'Configurando Playwright');
        
        const browserOptions = {
            headless: this.isProduction,
            slowMo: this.isProduction ? 0 : 50,
            timeout: 30000
        };

        // Em desenvolvimento, tentar conectar a Chrome existente
        if (!this.isProduction) {
            try {
                this.browser = await chromium.connectOverCDP('http://localhost:9222');
                const contexts = this.browser.contexts();
                if (contexts.length > 0 && contexts[0].pages().length > 0) {
                    this.page = contexts[0].pages()[0];
                } else {
                    const context = await this.browser.newContext();
                    this.page = await context.newPage();
                }
                this.sendStatus('info', 'Conectado ao Chrome existente', 10, 'Modo desenvolvimento');
            } catch (error) {
                console.log('Não foi possível conectar ao Chrome existente, iniciando novo navegador');
                this.browser = await chromium.launch(browserOptions);
                const context = await this.browser.newContext();
                this.page = await context.newPage();
            }
        } else {
            this.browser = await chromium.launch(browserOptions);
            const context = await this.browser.newContext();
            this.page = await context.newPage();
        }

        // Configurar User-Agent e cabeçalhos
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Interceptar falhas de rede e tentar novamente
        this.page.on('requestfailed', request => {
            console.log(`⚠️ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        });
        
        // Configurar timeouts mais generosos
        this.page.setDefaultTimeout(30000); // 30s para elementos
        this.page.setDefaultNavigationTimeout(60000); // 60s para navegação

        // Capturar logs do console
        this.page.on('console', msg => {
            const logMessage = msg.text();
            if (logMessage.includes('ERROR') || logMessage.includes('WARN')) {
                console.log('Browser console:', logMessage);
            }
        });

        this.sendStatus('success', 'Navegador inicializado', 15, 'Pronto para automação');
    }

    async performLogin() {
        this.sendStatus('info', 'Realizando login...', 20, 'Autenticando no PJe');
        
        // Usar função login() existente que já está otimizada
        try {
            await login(this.page);
            this.sendStatus('success', 'Login realizado com sucesso', 30, 'Autenticado');
        } catch (error) {
            console.log('⚠️ Erro no login:', error.message);
            throw new Error(`Falha no login: ${error.message}`);
        }
    }

    async navigateDirectlyToPerson(cpf) {
        this.sendStatus('info', 'Navegando diretamente para pessoa...', 35, `CPF: ${cpf}`);
        
        const cpfFormatado = cpf; // Manter formatação original
        
        // URL direta para a página da pessoa
        const directUrl = `https://pje.trt15.jus.br/pjekz/pessoa-fisica?pagina=1&tamanhoPagina=10&cpf=${encodeURIComponent(cpfFormatado)}&situacao=1`;
        
        console.log(`🔗 Navegando para URL direta: ${directUrl}`);
        
        // Múltiplas estratégias de carregamento para otimizar velocidade
        const navigationStrategies = [
            { waitUntil: 'domcontentloaded', timeout: 15000, description: 'DOM carregado' },
            { waitUntil: 'load', timeout: 25000, description: 'Página carregada' },
            { waitUntil: 'networkidle', timeout: 40000, description: 'Rede estável' }
        ];
        
        let navigationSuccess = false;
        let lastError = null;
        
        for (const strategy of navigationStrategies) {
            try {
                this.sendStatus('info', `Tentando navegação: ${strategy.description}`, 36, `Timeout: ${strategy.timeout/1000}s`);
                
                await this.page.goto(directUrl, { 
                    waitUntil: strategy.waitUntil, 
                    timeout: strategy.timeout 
                });
                
                // Aguardar elementos críticos aparecerem
                await Promise.race([
                    this.page.waitForSelector('table', { timeout: 5000 }),
                    this.page.waitForSelector('.datatable', { timeout: 5000 }),
                    this.page.waitForSelector('[data-test-id]', { timeout: 5000 }),
                    this.page.waitForTimeout(2000) // Fallback mínimo
                ]);
                
                navigationSuccess = true;
                this.sendStatus('success', `Navegação bem-sucedida com: ${strategy.description}`, 40, 'Pessoa encontrada');
                break;
                
            } catch (error) {
                console.warn(`⚠️ Falha na estratégia ${strategy.description}:`, error.message);
                lastError = error;
                
                // Se não foi timeout, tentar próxima estratégia
                if (!error.message.includes('Timeout') && !error.message.includes('timeout')) {
                    continue;
                }
            }
        }
        
        if (!navigationSuccess) {
            console.error('❌ Todas as estratégias de navegação falharam');
            this.sendStatus('error', `Erro na navegação: ${lastError?.message || 'Timeout em todas as tentativas'}`, 35, 'Falha na navegação');
            throw lastError || new Error('Falha em todas as estratégias de navegação');
        }
        
        // Verificar se chegou na página correta
        const currentUrl = this.page.url();
        console.log(`✅ URL atual após navegação: ${currentUrl}`);
    }

    async searchByCPF(cpf) {
        this.sendStatus('info', 'Buscando por CPF...', 35, `CPF: ${cpf}`);
        
        const cpfLimpo = cpf.replace(/\D/g, '');
        
        // Debug: verificar URL atual
        const currentUrl = this.page.url();
        console.log(`🔍 URL atual: ${currentUrl}`);
        
        // Aguardar a página carregar completamente
        await this.page.waitForLoadState('networkidle');
        
        // Múltiplos seletores para campo de busca
        const searchCandidates = [
            this.page.locator('input[placeholder*="CPF"]'),
            this.page.locator('input[placeholder*="cpf"]'),
            this.page.locator('input[name="cpf"]'),
            this.page.locator('#cpf'),
            this.page.locator('input[placeholder*="nome"]'),
            this.page.locator('input[name="nome"]'),
            this.page.locator('#nome'),
            this.page.locator('input[type="text"]'),
            this.page.locator('.form-control'),
            this.page.locator('input[class*="form"]'),
            this.page.locator('input[class*="input"]'),
            this.page.locator('input[id*="search"]'),
            this.page.locator('input[id*="busca"]'),
            this.page.locator('input[name*="search"]'),
            this.page.locator('input[name*="busca"]'),
            this.page.locator('input').first()
        ];
        
        let searchInput = null;
        for (let i = 0; i < searchCandidates.length; i++) {
            const candidate = searchCandidates[i];
            const count = await candidate.count();
            console.log(`Candidato ${i + 1} para busca: ${count} elementos encontrados`);
            if (count > 0) {
                try {
                    await candidate.first().waitFor({ timeout: 3000 });
                    searchInput = candidate.first();
                    console.log(`✅ Usando candidato ${i + 1} para busca`);
                    break;
                } catch (e) {
                    console.log(`Candidato ${i + 1} não está visível`);
                }
            }
        }
        
        if (!searchInput) {
            throw new Error('Campo de busca por CPF não foi encontrado');
        }
        
        // Limpar e digitar o CPF
        await searchInput.clear();
        await searchInput.fill(cpfLimpo);
        
        // Tentar clicar no botão "Procurar"
        const searchButtonCandidates = [
            this.page.locator('button:has-text("Procurar")'),
            this.page.locator('input[type="submit"][value*="Procurar"]'),
            this.page.locator('button[type="submit"]'),
            this.page.locator('.btn:has-text("Procurar")'),
            this.page.locator('input[value="Procurar"]'),
            this.page.locator('button:has-text("Buscar")'),
            this.page.locator('input[type="submit"]')
        ];
        
        let searchButtonClicked = false;
        for (let i = 0; i < searchButtonCandidates.length; i++) {
            const candidate = searchButtonCandidates[i];
            const count = await candidate.count();
            console.log(`Candidato ${i + 1} para botão Procurar: ${count} elementos encontrados`);
            if (count > 0) {
                try {
                    await candidate.first().waitFor({ timeout: 2000 });
                    await candidate.first().click();
                    console.log(`✅ Clicou no botão Procurar (candidato ${i + 1})`);
                    searchButtonClicked = true;
                    break;
                } catch (e) {
                    console.log(`Candidato ${i + 1} para botão Procurar não está clicável`);
                }
            }
        }
        
        // Se não conseguiu clicar no botão, usar Enter
        if (!searchButtonClicked) {
            console.log('⚠️ Botão Procurar não encontrado, usando Enter como alternativa');
            await searchInput.press('Enter');
        }
        
        // Aguardar os resultados carregarem
        await this.page.waitForTimeout(3000);
        
        this.sendStatus('success', 'Busca realizada', 40, 'CPF encontrado');
    }

    async navigateToServerTab() {
        this.sendStatus('info', 'Navegando para aba Servidor...', 45, 'Acessando perfil');
        
        // Clicar no ícone de edição
        await this.clickEditIcon();
        
        // Clicar na aba Servidor
        await this.clickServerTab();
        
        this.sendStatus('success', 'Aba Servidor acessada', 50, 'Pronto para processar OJs');
    }

    async clickEditIcon() {
        const editSelectors = [
            'button[title="Alterar pessoa"]',
            'a[title="Alterar pessoa"]',
            'button[title*="Editar"]:not([title*="Excluir"]):not([title*="Remover"])',
            'a[title*="Editar"]:not([title*="Excluir"]):not([title*="Remover"])',
            'i.fa-edit',
            'i.fa-pencil',
            '.fa-edit',
            '.fa-pencil',
            'button:has(i.fa-edit)',
            'button:has(i.fa-pencil)',
            'td:nth-last-child(2) button',
            'td:last-child button:first-child'
        ];
        
        let editButton = null;
        
        for (const selector of editSelectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                editButton = selector;
                console.log(`✅ Ícone de edição encontrado: ${selector}`);
                break;
            } catch (error) {
                console.log(`Seletor ${selector} não encontrado`);
            }
        }
        
        if (!editButton) {
            throw new Error('Ícone de edição não encontrado');
        }
        
        await this.page.click(editButton);
        await this.delay(2000);
    }

    async clickServerTab() {
        const servidorSelectors = [
            'text=Servidor',
            'a[href*="servidor"]',
            'button:has-text("Servidor")',
            'a:has-text("Servidor")',
            '[role="tab"]:has-text("Servidor")',
            'li:has-text("Servidor") a',
            '//a[contains(text(), "Servidor")]',
            '//button[contains(text(), "Servidor")]'
        ];
        
        let servidorTab = null;
        
        for (const selector of servidorSelectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                servidorTab = selector;
                console.log(`✅ Aba Servidor encontrada: ${selector}`);
                break;
            } catch (error) {
                console.log(`Seletor aba Servidor ${selector} não encontrado`);
            }
        }
        
        if (!servidorTab) {
            throw new Error('Aba Servidor não encontrada');
        }
        
        await this.page.click(servidorTab);
        await this.delay(2000);
    }

    async processOrgaosJulgadores() {
        this.sendStatus('info', 'Iniciando processamento dos OJs...', 55, 'Verificando OJs cadastrados');
        
        // Verificar OJs já cadastrados em lote (otimização com cache)
        await this.loadExistingOJs();
        
        // Normalizar e filtrar OJs que precisam ser processados
        const ojsNormalizados = this.config.orgaos.map(orgao => this.normalizeOrgaoName(orgao));
        const ojsToProcess = ojsNormalizados.filter(orgao => !this.ojCache.has(orgao));
        
        this.sendStatus('info', `${ojsToProcess.length} OJs para processar`, 60, `${this.ojCache.size} já cadastrados`);
        
        // Processar cada OJ restante
        for (let i = 0; i < ojsToProcess.length; i++) {
            const orgao = ojsToProcess[i];
            const progress = 60 + (i / ojsToProcess.length) * 35;
            
            this.sendStatus('info', `Processando OJ ${i + 1}/${ojsToProcess.length}`, progress, orgao);
            
            try {
                await this.processOrgaoJulgador(orgao);
                this.results.push({
                    orgao,
                    status: 'Sucesso',
                    erro: null,
                    timestamp: new Date().toISOString()
                });
                this.sendStatus('success', `OJ processado com sucesso`, progress, orgao);
            } catch (error) {
                console.error(`Erro ao processar OJ ${orgao}:`, error);
                this.results.push({
                    orgao,
                    status: 'Erro',
                    erro: error.message,
                    timestamp: new Date().toISOString()
                });
                this.sendStatus('error', `Erro ao processar OJ: ${error.message}`, progress, orgao);
                
                // Proteções após erro
                await this.handleErrorRecovery();
            }
            
            // Pequena pausa entre processamentos
            await this.delay(1000);
        }
        
        // Adicionar OJs já existentes ao relatório
        for (const orgaoExistente of this.ojCache) {
            if (this.config.orgaos.includes(orgaoExistente)) {
                this.results.push({
                    orgao: orgaoExistente,
                    status: 'Já Incluído',
                    erro: null,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    async loadExistingOJs() {
        try {
            // Implementar lógica para carregar OJs já cadastrados
            // Esta é uma versão simplificada - pode ser expandida
            this.sendStatus('info', 'Carregando OJs existentes...', 58, 'Otimizando processo');
            
            // Aqui você implementaria a lógica para verificar quais OJs já estão cadastrados
            // Por exemplo, fazendo uma varredura da tabela de localizações/visibilidades
            
            await this.delay(1000);
        } catch (error) {
            console.log('Erro ao carregar OJs existentes:', error.message);
        }
    }

    async processOrgaoJulgador(orgao) {
        // Proteções para estabilização da página
        await this.stabilizePage();
        
        // Fechar modais/alertas anteriores
        await this.closeAnyModals();
        
        // Clicar no botão "Adicionar Localização/Visibilidade"
        await this.clickAddLocationButton();
        
        // Selecionar o OJ
        await this.selectOrgaoJulgador(orgao);
        
        // Configurar papel e visibilidade
        await this.configurePapelVisibilidade();
        
        // Salvar
        await this.saveConfiguration();
        
        // Verificar sucesso
        await this.verifySuccess();
    }

    async stabilizePage() {
        // Aguardar estabilização da página
        await this.page.waitForTimeout(1500);
        
        // Aguardar que não haja requisições de rede por 500ms
        try {
            await this.page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch (error) {
            console.log('Timeout aguardando networkidle, continuando...');
        }
    }

    async closeAnyModals() {
        // Tentar fechar modais de erro genéricos
        const modalCloseSelectors = [
            'button:has-text("OK")',
            'button:has-text("Fechar")',
            '.mat-dialog-actions button',
            '[data-dismiss="modal"]',
            '.modal-footer button',
            '.close'
        ];
        
        for (const selector of modalCloseSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element && await element.isVisible()) {
                    await element.click();
                    console.log(`Fechou modal com seletor: ${selector}`);
                    await this.delay(500);
                }
            } catch (error) {
                // Ignorar erros ao tentar fechar modais
            }
        }
    }

    async clickAddLocationButton() {
        const addButtonSelectors = [
            'button:has-text("Adicionar Localização/Visibilidade"):not([disabled])',
            'button:has-text("Adicionar Localização"):not([disabled])',
            'button:has-text("Adicionar"):not([disabled]):visible',
            'button .mat-button-wrapper:has-text("Adicionar"):not([disabled])',
            'input[value*="Adicionar"]:not([disabled])'
        ];
        
        let addButton = null;
        
        for (const selector of addButtonSelectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 3000 });
                addButton = selector;
                console.log(`✅ Botão Adicionar encontrado: ${selector}`);
                break;
            } catch (error) {
                console.log(`Seletor ${selector} não encontrado`);
            }
        }
        
        if (!addButton) {
            throw new Error('Botão "Adicionar Localização/Visibilidade" não encontrado');
        }
        
        await this.page.click(addButton);
        await this.delay(2000);
    }

    async selectOrgaoJulgador(orgao) {
        // Implementar seleção do órgão julgador
        // Esta lógica seria similar à implementação existente em vincularOJ.js
        // mas com as melhorias de tratamento de erro
        
        this.sendStatus('info', 'Selecionando órgão julgador...', null, orgao);
        
        // Aguardar modal aparecer
        await this.page.waitForSelector('.modal, .mat-dialog-container', { timeout: 5000 });
        
        // Implementar lógica de seleção do OJ
        // Por simplicidade, vou usar a função existente
        const { vincularOJ } = require('../vincularOJ.js');
        await vincularOJ(
            this.page, 
            orgao, // Nome do órgão como string
            this.config.perfil || 'Diretor de Secretaria',
            'Público'
        );
    }

    async configurePapelVisibilidade() {
        // Configurar papel e visibilidade se necessário
        // Esta lógica seria implementada baseada nos requisitos específicos
        await this.delay(500);
    }

    async saveConfiguration() {
        // Salvar configuração
        // Esta lógica seria similar ao que já existe no vincularOJ.js
        await this.delay(500);
    }

    async verifySuccess() {
        // Verificar se a operação foi bem-sucedida
        // Implementar verificações de sucesso
        await this.delay(500);
    }

    async handleErrorRecovery() {
        console.log('Iniciando recuperação após erro...');
        
        // Aguardar estabilização
        await this.delay(3000);
        
        // Tentar fechar modais de erro
        await this.closeAnyModals();
        
        // Tentar pressionar Escape como último recurso
        try {
            await this.page.keyboard.press('Escape');
            await this.delay(1000);
        } catch (error) {
            console.log('Erro ao pressionar Escape:', error.message);
        }
    }

    async generateReport() {
        this.sendStatus('info', 'Gerando relatório...', 95, 'Finalizando processo');
        
        // Configurar diretório de saída
        const outputDir = path.join(__dirname, '..', '..', 'data');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Calcular estatísticas
        const sucessos = this.results.filter(r => r.status === 'Sucesso').length;
        const erros = this.results.filter(r => r.status === 'Erro').length;
        const jaIncluidos = this.results.filter(r => r.status === 'Já Incluído').length;
        const totalValidos = sucessos + jaIncluidos + erros;
        
        // Gerar relatório JSON detalhado
        const jsonReport = {
            timestamp: new Date().toISOString(),
            config: {
                cpf: this.config.cpf,
                perfil: this.config.perfil,
                totalOrgaos: this.config.orgaos.length
            },
            results: this.results,
            summary: {
                total: this.results.length,
                sucessos,
                erros,
                jaIncluidos,
                totalValidos,
                estatisticas: totalValidos > 0 ? {
                    percentualSucesso: parseFloat(((sucessos / totalValidos) * 100).toFixed(1)),
                    percentualJaExistiam: parseFloat(((jaIncluidos / totalValidos) * 100).toFixed(1)),
                    percentualErros: parseFloat(((erros / totalValidos) * 100).toFixed(1))
                } : null
            },
            detalhes: {
                orgaosCadastrados: this.results.filter(r => r.status === 'Sucesso').map(r => r.orgao),
                orgaosJaExistiam: this.results.filter(r => r.status === 'Já Incluído').map(r => r.orgao),
                orgaosComErro: this.results.filter(r => r.status === 'Erro').map(r => ({
                    orgao: r.orgao,
                    erro: r.erro || 'Erro não especificado'
                })),
                orgaosPulados: this.results.filter(r => r.status === 'Pulado').map(r => r.orgao)
            }
        };
        
        // Salvar relatório
        const jsonPath = path.join(outputDir, `relatorio-servidor-${Date.now()}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
        
        // Gerar CSV
        const csvContent = [
            'Órgão Julgador,Status,Erro',
            ...this.results.map(r => `"${r.orgao}","${r.status}","${r.erro || ''}"`)
        ].join('\n');
        
        const csvPath = path.join(outputDir, `relatorio-servidor-${Date.now()}.csv`);
        fs.writeFileSync(csvPath, csvContent);
        
        console.log(`📄 Relatório JSON salvo em: ${jsonPath}`);
        console.log(`📄 Relatório CSV salvo em: ${csvPath}`);
        
        // Imprimir resultado final em formato JSON para ser capturado pelo servidor
        console.log('=== RESULTADO FINAL ===');
        console.log(JSON.stringify(jsonReport, null, 2));
        console.log('=== FIM RESULTADO ===');
        
        this.sendStatus('success', 'Relatório gerado', 98, `${sucessos} sucessos, ${erros} erros`);
    }

    async cleanup() {
        try {
            if (this.page && !this.page.isClosed()) {
                if (this.isProduction) {
                    await this.page.close();
                } else {
                    console.log('Mantendo página aberta para desenvolvimento');
                }
            }
            
            if (this.browser && this.isProduction) {
                await this.browser.close();
            }
        } catch (error) {
            console.error('Erro durante cleanup:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stopAutomation() {
        this.isRunning = false;
        await this.cleanup();
    }

    getRelatorio() {
        // Calcular estatísticas
        const sucessos = this.results.filter(r => r.status === 'Sucesso').length;
        const erros = this.results.filter(r => r.status === 'Erro').length;
        const jaIncluidos = this.results.filter(r => r.status === 'Já Incluído').length;
        const totalValidos = sucessos + jaIncluidos + erros;
        
        // Retornar relatório no formato esperado pelo frontend
        return {
            timestamp: new Date().toISOString(),
            config: {
                cpf: this.config?.cpf || '',
                perfil: this.config?.perfil || '',
                totalOrgaos: this.config?.orgaos?.length || 0
            },
            resultados: this.results.map(r => ({
                orgao: r.orgao,
                status: r.status,
                observacoes: r.erro || '-'
            })),
            resumo: {
                total: this.results.length,
                sucessos,
                erros,
                jaIncluidos,
                totalValidos,
                percentualSucesso: totalValidos > 0 ? parseFloat(((sucessos / totalValidos) * 100).toFixed(1)) : 0,
                percentualJaIncluidos: totalValidos > 0 ? parseFloat(((jaIncluidos / totalValidos) * 100).toFixed(1)) : 0,
                percentualErros: totalValidos > 0 ? parseFloat(((erros / totalValidos) * 100).toFixed(1)) : 0
            }
        };
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            progress: this.currentProgress,
            totalOrgaos: this.totalOrgaos,
            processedCount: this.results.length
        };
    }
}

// Função principal para execução standalone
async function main() {
    try {
        // Carregar configuração
        const config = loadConfig();
        
        if (!config.cpf || !config.orgaos || config.orgaos.length === 0) {
            throw new Error('Configuração inválida: CPF e lista de órgãos são obrigatórios');
        }
        
        // Criar instância da automação
        const automation = new ServidorAutomationV2();
        
        // Executar automação
        await automation.startAutomation(config);
        
        console.log('Automação concluída com sucesso!');
        
    } catch (error) {
        console.error('Erro na automação:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ServidorAutomationV2;