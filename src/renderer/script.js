class PeritoApp {
    constructor() {
        this.peritos = [];
        this.servidores = [];
        this.selectedPeritos = [];
        this.currentEditingIndex = -1;
        this.currentEditingServidorIndex = -1;
        this.isAutomationRunning = false;
        this.currentProgress = 0;
        this.totalSteps = 0;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPeritos();
        // loadServidores() removido - usando apenas configuração V2
        await this.loadConfig();
        this.updateSelectedPeritosDisplay();
        this.initTabs();
        this.setupServidorAutomationListeners();
        this.setupServidorV2Listeners();
        // checkServidorAutomationStatus removido - usando apenas V2
        this.loadServidorV2Config();
        this.updateV2StatusIndicator();
        
        // Listen for automation status updates
        window.electronAPI.onAutomationStatus((data) => {
            this.addStatusMessage(data.type, data.message);
            this.updateLoadingProgress(data);
        });
    }

    initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Perito management
        document.getElementById('add-perito').addEventListener('click', () => {
            this.openPeritoModal();
        });

        document.getElementById('import-peritos').addEventListener('click', () => {
            this.importPeritos();
        });

        document.getElementById('export-peritos').addEventListener('click', () => {
            this.exportPeritos();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closePeritoModal();
        });

        document.getElementById('cancel-perito').addEventListener('click', () => {
            this.closePeritoModal();
        });

        document.getElementById('perito-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePeito();
        });

        // Config form
        document.getElementById('config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        // Select all checkbox
        document.getElementById('select-all').addEventListener('change', (e) => {
            this.selectAllPeritos(e.target.checked);
        });

        // Automation
        document.getElementById('start-automation').addEventListener('click', () => {
            this.startAutomation();
        });

        document.getElementById('stop-automation').addEventListener('click', () => {
            this.stopAutomation();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('perito-modal');
            if (e.target === modal) {
                this.closePeritoModal();
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Update selected peritos display when switching to automation tab
        if (tabName === 'automation') {
            this.updateSelectedPeritosDisplay();
        }
    }

    async loadPeritos() {
        try {
            this.peritos = await window.electronAPI.loadPeritos();
            this.renderPeritosTable();
        } catch (error) {
            console.error('Erro ao carregar peritos:', error);
            this.showNotification('Erro ao carregar peritos', 'error');
        }
    }

    async savePeritos() {
        try {
            const result = await window.electronAPI.savePeritos(this.peritos);
            if (result.success) {
                this.showNotification('Peritos salvos com sucesso!', 'success');
            } else {
                this.showNotification('Erro ao salvar peritos: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar peritos:', error);
            this.showNotification('Erro ao salvar peritos', 'error');
        }
    }

    // Métodos loadServidores() e saveServidores() removidos - usando apenas V2

    renderServidores() {
        const tbody = document.getElementById('servidores-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        // Remover renderização da tabela - não precisamos mais da gestão V1 de servidores
        // A interface agora usa apenas configuração V2
        
        // Atualizar interface
        this.updateServidorControls();
    }

    async deleteServidor(index) {
        if (confirm('Tem certeza que deseja excluir este servidor?')) {
            this.servidores.splice(index, 1);
            await this.saveServidores();
            this.renderServidores();
        }
    }

    updateServidorControls() {
        // Verificar se há configuração
        const hasConfig = this.hasServidorV2Config();
        
        // Atualizar display de status
        const selectionDisplay = document.getElementById('selected-servidores-display');
        if (selectionDisplay) {
            selectionDisplay.innerHTML = hasConfig 
                ? `<small>✅ Configuração ativa</small>`
                : `<small>⚙️ Configure a automação</small>`;
        }
        
        // Atualizar lista de configuração
        this.updateSelectedServidoresDisplay();
        
        // Atualizar botão de automação
        const automationBtn = document.getElementById('startServidorAutomation');
        if (automationBtn) {
            automationBtn.disabled = !hasConfig;
        }
    }


    updateSelectedServidoresDisplay() {
        const container = document.getElementById('selected-servidores-list');
        if (!container) return;
        
        // Verificar se há configuração V2
        const hasConfig = this.hasServidorV2Config();
        if (!hasConfig) {
            container.innerHTML = '<p class="no-selection">Configure a automação para começar</p>';
            return;
        }

        // Carregar configuração V2 e mostrar os detalhes
        try {
            const saved = localStorage.getItem('configServidorV2');
            if (saved) {
                const config = JSON.parse(saved);
                container.innerHTML = `
                    <div class="selected-item">
                        <h4>Configuração Ativa</h4>
                        <p><strong>CPF:</strong> ${config.cpf}</p>
                        <p><strong>Perfil:</strong> ${config.perfil || 'Secretário de Audiência'}</p>
                        <p><strong>OJs:</strong> ${config.orgaos ? config.orgaos.length : 0} órgão(s) julgador(es)</p>
                        ${config.orgaos && config.orgaos.length > 0 ? `<small class="oj-preview">${config.orgaos.slice(0, 2).join(', ')}${config.orgaos.length > 2 ? '...' : ''}</small>` : ''}
                    </div>
                `;
            } else {
                container.innerHTML = '<p class="no-selection">Configure a automação para começar</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            container.innerHTML = '<p class="no-selection">Erro na configuração</p>';
        }
    }

    // Métodos de automação de servidores (apenas V2)

    setupServidorAutomationListeners() {
        const startBtn = document.getElementById('startServidorAutomation');
        const stopBtn = document.getElementById('stopServidorAutomation');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startServidorAutomationV2();
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopServidorAutomationV2();
            });
        }
        
        // Configurar listener para progresso da automação
        if (window.electronAPI && window.electronAPI.onAutomationProgress) {
            window.electronAPI.onAutomationProgress((data) => {
                if (data.type === 'servidor-progress') {
                    this.updateProgress(data.current, data.total);
                    this.showNotification(data.message, data.status || 'info');
                }
            });
        }
    }

    setupServidorV2Listeners() {
        // Configurar V2 button
        const configBtn = document.getElementById('configServidorV2');
        if (configBtn) {
            configBtn.addEventListener('click', async () => {
                await this.openServidorV2Modal();
            });
        }

        // Modal close buttons
        const closeBtn = document.querySelector('#servidor-v2-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeServidorV2Modal();
            });
        }

        // Save config button
        const saveConfigBtn = document.getElementById('save-v2-config');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveServidorV2Config();
            });
        }

        // Test config button
        const testConfigBtn = document.getElementById('test-v2-config');
        if (testConfigBtn) {
            testConfigBtn.addEventListener('click', () => {
                this.testServidorV2Config();
            });
        }

        // CPF formatting
        const cpfInput = document.getElementById('v2-cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                this.formatCPF(e.target);
            });
        }
    }

    async loadConfig() {
        try {
            const config = await window.electronAPI.loadConfig();
            
            document.getElementById('pje-url').value = config.PJE_URL || '';
            document.getElementById('login').value = config.LOGIN || '';
            document.getElementById('password').value = config.PASSWORD || '';
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    async saveConfig() {
        try {
            const config = {
                PJE_URL: document.getElementById('pje-url').value,
                LOGIN: document.getElementById('login').value,
                PASSWORD: document.getElementById('password').value
            };

            const result = await window.electronAPI.saveConfig(config);
            if (result.success) {
                this.showNotification('Configurações salvas com sucesso!', 'success');
            } else {
                this.showNotification('Erro ao salvar configurações: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    renderPeritosTable() {
        const tbody = document.getElementById('peritos-tbody');
        tbody.innerHTML = '';

        this.peritos.forEach((perito, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="perito-checkbox" data-index="${index}" 
                           ${this.selectedPeritos.includes(index) ? 'checked' : ''}>
                </td>
                <td>${perito.nome}</td>
                <td>${perito.cpf}</td>
                <td class="ojs-list">
                    ${perito.ojs.map(oj => `<span class="oj-tag">${oj}</span>`).join('')}
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="app.editPerito(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="app.deletePerito(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners to checkboxes
        document.querySelectorAll('.perito-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    if (!this.selectedPeritos.includes(index)) {
                        this.selectedPeritos.push(index);
                    }
                } else {
                    this.selectedPeritos = this.selectedPeritos.filter(i => i !== index);
                }
                this.updateAutomationButton();
            });
        });

        this.updateAutomationButton();
    }

    selectAllPeritos(checked) {
        const checkboxes = document.querySelectorAll('.perito-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const index = parseInt(checkbox.dataset.index);
            if (checked) {
                if (!this.selectedPeritos.includes(index)) {
                    this.selectedPeritos.push(index);
                }
            } else {
                this.selectedPeritos = this.selectedPeritos.filter(i => i !== index);
            }
        });
        this.updateAutomationButton();
    }

    updateAutomationButton() {
        const startButton = document.getElementById('start-automation');
        startButton.disabled = this.selectedPeritos.length === 0 || this.isAutomationRunning;
    }

    updateSelectedPeritosDisplay() {
        const container = document.getElementById('selected-peritos-list');
        
        if (this.selectedPeritos.length === 0) {
            container.innerHTML = '<p class="no-selection">Nenhum perito selecionado</p>';
            return;
        }

        const selectedPeritosList = this.selectedPeritos.map(index => {
            const perito = this.peritos[index];
            return `
                <div class="selected-item">
                    <h4>${perito.nome}</h4>
                    <p>CPF: ${perito.cpf}</p>
                    <p>OJs: ${perito.ojs.length} órgão(s)</p>
                </div>
            `;
        }).join('');

        container.innerHTML = selectedPeritosList;
    }

    openPeritoModal(editIndex = -1) {
        this.currentEditingIndex = editIndex;
        const modal = document.getElementById('perito-modal');
        const title = document.getElementById('modal-title');
        
        if (editIndex >= 0) {
            title.textContent = 'Editar Perito';
            const perito = this.peritos[editIndex];
            document.getElementById('perito-nome').value = perito.nome;
            document.getElementById('perito-cpf').value = perito.cpf;
            document.getElementById('perito-ojs').value = perito.ojs.join('\n');
        } else {
            title.textContent = 'Adicionar Perito';
            document.getElementById('perito-form').reset();
        }
        
        modal.style.display = 'block';
    }

    closePeritoModal() {
        document.getElementById('perito-modal').style.display = 'none';
        this.currentEditingIndex = -1;
    }

    async savePeito() {
        const nome = document.getElementById('perito-nome').value.trim();
        const cpf = document.getElementById('perito-cpf').value.trim();
        const ojsText = document.getElementById('perito-ojs').value.trim();
        
        if (!nome || !cpf) {
            this.showNotification('Nome e CPF são obrigatórios', 'error');
            return;
        }

        const ojs = ojsText ? ojsText.split('\n').map(oj => oj.trim()).filter(oj => oj) : [];
        
        const perito = { nome, cpf, ojs };
        
        if (this.currentEditingIndex >= 0) {
            this.peritos[this.currentEditingIndex] = perito;
        } else {
            this.peritos.push(perito);
        }
        
        await this.savePeritos();
        this.renderPeritosTable();
        this.closePeritoModal();
    }

    editPerito(index) {
        this.openPeritoModal(index);
    }

    async deletePerito(index) {
        if (confirm('Tem certeza que deseja excluir este perito?')) {
            this.peritos.splice(index, 1);
            
            // Update selected peritos indices
            this.selectedPeritos = this.selectedPeritos
                .filter(i => i !== index)
                .map(i => i > index ? i - 1 : i);
            
            await this.savePeritos();
            this.renderPeritosTable();
        }
    }

    async importPeritos() {
        try {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                // Here you would read the file and parse it
                // For now, we'll show a placeholder message
                this.showNotification('Funcionalidade de importação será implementada', 'info');
            }
        } catch (error) {
            this.showNotification('Erro ao importar peritos', 'error');
        }
    }

    async exportPeritos() {
        try {
            const result = await window.electronAPI.showSaveDialog();
            if (!result.canceled) {
                // Here you would save the file
                // For now, we'll show a placeholder message
                this.showNotification('Funcionalidade de exportação será implementada', 'info');
            }
        } catch (error) {
            this.showNotification('Erro ao exportar peritos', 'error');
        }
    }

    async startAutomation() {
        if (this.selectedPeritos.length === 0) {
            this.showNotification('Selecione pelo menos um perito para iniciar a automação', 'warning');
            return;
        }

        this.isAutomationRunning = true;
        const startButton = document.getElementById('start-automation');
        const stopButton = document.getElementById('stop-automation');
        startButton.disabled = true;
        startButton.classList.add('loading');
        stopButton.disabled = false;
        this.updateAutomationButton();
        
        // Calcular total de passos para progress
        const selectedPeritosList = this.selectedPeritos.map(index => this.peritos[index]);
        this.totalSteps = selectedPeritosList.reduce((total, perito) => {
            return total + 3 + perito.ojs.length; // login + navegação + verificação + OJs
        }, 0);
        this.currentProgress = 0;
        
        this.showLoading('Iniciando automação...', 'Preparando sistema e abrindo navegador');
        this.clearStatusLog();
        this.addStatusMessage('info', 'Iniciando automação...');
        
        try {
            const result = await window.electronAPI.startAutomation(selectedPeritosList);
            
            if (!result.success) {
                this.addStatusMessage('error', 'Erro na automação: ' + result.error);
            }
        } catch (error) {
            this.addStatusMessage('error', 'Erro ao iniciar automação: ' + error.message);
        } finally {
            this.hideLoading();
            startButton.classList.remove('loading');
            this.isAutomationRunning = false;
            startButton.disabled = false;
            // Manter o botão de parar habilitado para permitir fechar o navegador manualmente
            stopButton.disabled = false;
            this.updateAutomationButton();
        }
    }

    stopAutomation() {
        this.addStatusMessage('warning', 'Parando automação...');
        window.electronAPI.stopAutomation().then((result) => {
            if (!result.success) {
                this.addStatusMessage('error', 'Falha ao parar automação: ' + (result.error || ''));
            }
        }).finally(() => {
            this.isAutomationRunning = false;
            const startButton = document.getElementById('start-automation');
            const stopButton = document.getElementById('stop-automation');
            startButton.disabled = false;
            stopButton.disabled = true;
            this.updateAutomationButton();
        });
    }

    addStatusMessage(type, message) {
        const statusLog = document.getElementById('status-log');
        const timestamp = new Date().toLocaleTimeString();
        
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${type}`;
        statusItem.textContent = `[${timestamp}] ${message}`;
        
        statusLog.appendChild(statusItem);
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    clearStatusLog() {
        document.getElementById('status-log').innerHTML = '';
    }

    showLoading(title, subtitle = '') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingTitle = document.getElementById('loading-title');
        const loadingSubtitle = document.getElementById('loading-subtitle');
        
        loadingTitle.textContent = title;
        loadingSubtitle.textContent = subtitle;
        loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'none';
    }

    updateLoadingProgress(data) {
        if (data.progress !== undefined) {
            this.currentProgress = data.progress;
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            const percentage = this.totalSteps > 0 ? (this.currentProgress / this.totalSteps) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `${this.currentProgress}/${this.totalSteps} passos concluídos`;
        }
        
        if (data.subtitle) {
            const loadingSubtitle = document.getElementById('loading-subtitle');
            loadingSubtitle.textContent = data.subtitle;
        }
    }

    // ===== AUTOMAÇÃO V2 METHODS =====

    async openServidorV2Modal() {
        console.log('=== ABRINDO MODAL SERVIDOR V2 ===');
        const modal = document.getElementById('servidor-v2-modal');
        console.log('Modal encontrado:', !!modal);
        
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal display definido como block');
            this.loadServidorV2Config();
            // Initialize OJ Selector when modal opens
            console.log('Chamando initializeOJSelectorV2...');
            await this.initializeOJSelectorV2();
            console.log('initializeOJSelectorV2 concluído');
        } else {
            console.error('Modal servidor-v2-modal não encontrado!');
        }
    }

    async initializeOJSelectorV2() {
        const containerId = 'oj-selector-v2';
        const container = document.getElementById(containerId);
        
        console.log('=== INICIALIZANDO OJ SELECTOR V2 ===');
        console.log('Container ID:', containerId);
        console.log('Container encontrado:', !!container);
        console.log('Container element:', container);
        console.log('Lista de OJs carregada:', window.ojList ? window.ojList.length : 0);
        
        if (container) {
            console.log('Container innerHTML antes:', container.innerHTML);
            console.log('Container style.display:', container.style.display);
            console.log('Container offsetWidth:', container.offsetWidth);
            console.log('Container offsetHeight:', container.offsetHeight);
        }
        
        // Se a lista de OJs ainda não foi carregada, aguardar ou carregar
        if (!window.ojList || window.ojList.length === 0) {
            console.log('Lista de OJs não carregada, tentando carregar...');
            try {
                const response = await fetch('./orgaos_pje.json');
                const ojData = await response.json();
                
                // Extract all OJs from all cities and flatten into a single array
                const allOJs = [];
                Object.keys(ojData).forEach(cidade => {
                    if (Array.isArray(ojData[cidade])) {
                        allOJs.push(...ojData[cidade]);
                    }
                });
                
                // Sort alphabetically
                window.ojList = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
                console.log('Lista de OJs carregada com sucesso:', window.ojList.length, 'órgãos');
            } catch (error) {
                console.error('Erro ao carregar lista de OJs:', error);
                // Fallback to hardcoded list
                window.ojList = [
                    'LIQ2 - Bauru',
                    'Órgão Centralizador de Leilões Judiciais de Limeira',
                    'Órgão Centralizador de Leilões Judiciais de Araraquara',
                    'Vara do Trabalho de Ubatuba',
                    'EXE1 - São José dos Campos'
                ].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
                console.log('Usando lista de fallback com', window.ojList.length, 'órgãos');
            }
        }
        
        if (container && window.ojList && window.ojList.length > 0) {
            // Clear existing selector if any
            if (window.ojSelectors[containerId]) {
                delete window.ojSelectors[containerId];
            }
            
            try {
                // Create new OJ selector instance
                window.ojSelectors[containerId] = new OJSelector(containerId, window.ojList);
                console.log('OJ Selector V2 inicializado com sucesso com', window.ojList.length, 'órgãos');
            } catch (error) {
                console.error('Erro ao inicializar OJ Selector V2:', error);
            }
        } else {
            console.warn('Container oj-selector-v2 não encontrado ou lista de OJs vazia');
            console.warn('Container:', container);
            console.warn('OJ List:', window.ojList);
        }
    }

    closeServidorV2Modal() {
        const modal = document.getElementById('servidor-v2-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    addOrgaoV2() {
        const container = document.getElementById('orgaos-list-v2');
        if (!container) return;
        
        const orgaoDiv = document.createElement('div');
        orgaoDiv.className = 'orgao-item';
        orgaoDiv.innerHTML = `
            <input type="text" placeholder="Nome do Órgão Julgador" class="orgao-input" required>
            <button type="button" class="btn btn-danger btn-sm remove-orgao">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        orgaoDiv.querySelector('.remove-orgao').addEventListener('click', () => {
            orgaoDiv.remove();
        });
        
        container.appendChild(orgaoDiv);
    }

    loadExampleOrgaosV2() {
        const container = document.getElementById('orgaos-list-v2');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing
        
        const exampleOrgaos = [
            '1ª Vara do Trabalho de Campinas',
            '2ª Vara do Trabalho de Campinas',
            '3ª Vara do Trabalho de Campinas',
            '4ª Vara do Trabalho de Campinas',
            '5ª Vara do Trabalho de Campinas'
        ];
        
        exampleOrgaos.forEach(orgao => {
            const orgaoDiv = document.createElement('div');
            orgaoDiv.className = 'orgao-item';
            orgaoDiv.innerHTML = `
                <input type="text" value="${orgao}" class="orgao-input" required>
                <button type="button" class="btn btn-danger btn-sm remove-orgao">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            orgaoDiv.querySelector('.remove-orgao').addEventListener('click', () => {
                orgaoDiv.remove();
            });
            
            container.appendChild(orgaoDiv);
        });
    }

    formatCPF(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = value;
    }

    saveServidorV2Config() {
        const config = this.getServidorV2Config();
        if (!config) return;
        
        localStorage.setItem('configServidorV2', JSON.stringify(config));
        this.showNotification('Configuração V2 salva com sucesso!', 'success');
        this.updateV2StatusIndicator();
        this.updateServidorControls();
        this.closeServidorV2Modal();
    }

    loadServidorV2Config() {
        const saved = localStorage.getItem('configServidorV2');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.populateServidorV2Form(config);
            } catch (error) {
                console.error('Erro ao carregar configuração V2:', error);
            }
        }
    }

    populateServidorV2Form(config) {
        const cpfInput = document.getElementById('v2-cpf');
        const perfilInput = document.getElementById('v2-perfil');
        const productionInput = document.getElementById('v2-production');
        const detailedReportInput = document.getElementById('v2-detailed-report');
        const useCacheInput = document.getElementById('v2-use-cache');
        const timeoutInput = document.getElementById('v2-timeout');
        const maxLoginAttemptsInput = document.getElementById('v2-max-login-attempts');
        
        if (cpfInput) cpfInput.value = config.cpf || '';
        if (perfilInput) perfilInput.value = config.perfil || 'Secretário de Audiência';
        if (productionInput) productionInput.checked = config.production !== false;
        if (detailedReportInput) detailedReportInput.checked = config.detailedReport !== false;
        if (useCacheInput) useCacheInput.checked = config.useCache !== false;
        if (timeoutInput) timeoutInput.value = config.timeout || 30;
        if (maxLoginAttemptsInput) maxLoginAttemptsInput.value = config.maxLoginAttempts || 3;
        
        // Populate orgaos in OJ selector
        setTimeout(() => {
            const ojSelector = window.ojSelectors['oj-selector-v2'];
            if (ojSelector && config.orgaos && config.orgaos.length > 0) {
                ojSelector.setSelectedOJs(config.orgaos);
            }
        }, 200);
    }

    hasServidorV2Config() {
        // Verificar se há configuração salva no localStorage
        const saved = localStorage.getItem('configServidorV2');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                return config && config.cpf && config.orgaos && config.orgaos.length > 0;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    getServidorV2Config() {
        const cpfInput = document.getElementById('v2-cpf');
        const perfilInput = document.getElementById('v2-perfil');
        
        const cpf = cpfInput ? cpfInput.value.trim() : '';
        const perfil = perfilInput ? perfilInput.value.trim() : '';
        
        if (!cpf) {
            this.showNotification('CPF é obrigatório', 'error');
            return null;
        }
        
        // Get selected OJs from the new OJ selector
        const ojSelector = window.ojSelectors['oj-selector-v2'];
        const orgaos = ojSelector ? ojSelector.getSelectedOJs() : [];
        
        if (orgaos.length === 0) {
            this.showNotification('Pelo menos um órgão julgador é obrigatório', 'error');
            return null;
        }
        
        const pjeUrlInput = document.getElementById('pje-url');
        const productionInput = document.getElementById('v2-production');
        const detailedReportInput = document.getElementById('v2-detailed-report');
        const useCacheInput = document.getElementById('v2-use-cache');
        const timeoutInput = document.getElementById('v2-timeout');
        const maxLoginAttemptsInput = document.getElementById('v2-max-login-attempts');
        
        return {
            cpf: cpf,
            perfil: perfil || 'Secretário de Audiência',
            orgaos: orgaos,
            url: pjeUrlInput ? pjeUrlInput.value : 'https://pje.trt15.jus.br',
            production: productionInput ? productionInput.checked : true,
            detailedReport: detailedReportInput ? detailedReportInput.checked : true,
            useCache: useCacheInput ? useCacheInput.checked : true,
            timeout: timeoutInput ? parseInt(timeoutInput.value) || 30 : 30,
            maxLoginAttempts: maxLoginAttemptsInput ? parseInt(maxLoginAttemptsInput.value) || 3 : 3
        };
    }

    async testServidorV2Config() {
        const config = this.getServidorV2Config();
        if (!config) return;
        
        try {
            this.showLoading('Testando Configuração V2', 'Validando parâmetros...');
            
            const result = await window.electronAPI.invoke('validate-servidor-config-v2', config);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification('Configuração válida!', 'success');
            } else {
                this.showNotification(`Erro na configuração: ${result.error}`, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Erro ao testar configuração: ${error.message}`, 'error');
        }
    }

    async startServidorAutomationV2() {
        const config = this.getServidorV2Config();
        if (!config) {
            this.showNotification('Configure a automação V2 primeiro', 'warning');
            this.openServidorV2Modal();
            return;
        }
        
        try {
            this.showLoading('Iniciando Automação V2', 'Preparando sistema...');
            
            const result = await window.electronAPI.invoke('start-servidor-automation-v2', config);
            
            if (result.success) {
                this.isServidorAutomationRunning = true;
                this.updateServidorControls();
                this.showNotification('Automação V2 iniciada com sucesso!', 'success');
                
                // Start monitoring
                this.monitorServidorV2Automation();
            } else {
                this.hideLoading();
                this.showNotification(`Erro ao iniciar automação V2: ${result.error}`, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Erro ao iniciar automação V2: ${error.message}`, 'error');
        }
    }

    async stopServidorAutomationV2() {
        try {
            const result = await window.electronAPI.invoke('stop-servidor-automation-v2');
            
            if (result.success) {
                this.isServidorAutomationRunning = false;
                this.updateServidorControls();
                this.hideLoading();
                this.showNotification('Automação V2 parada com sucesso!', 'info');
            } else {
                this.showNotification(`Erro ao parar automação V2: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Erro ao parar automação V2: ${error.message}`, 'error');
        }
    }

    async monitorServidorV2Automation() {
        const checkStatus = async () => {
            if (!this.isServidorAutomationRunning) return;
            
            try {
                const status = await window.electronAPI.invoke('get-servidor-automation-v2-status');
                
                if (status.isRunning) {
                    this.updateLoadingProgress({
                        progress: status.progress || 0,
                        current: status.processedCount || 0,
                        total: status.totalOrgaos || 0
                    });
                    
                    // Continue monitoring
                    setTimeout(checkStatus, 2000);
                } else {
                    // Automation finished
                    this.isServidorAutomationRunning = false;
                    this.updateServidorControls();
                    this.hideLoading();
                    
                    // Get final report
                    const reportResult = await window.electronAPI.invoke('get-servidor-automation-v2-report');
                    if (reportResult.success && reportResult.relatorio) {
                        this.showServidorV2Report(reportResult.relatorio);
                    }
                    
                    this.showNotification('Automação V2 concluída!', 'success');
                }
            } catch (error) {
                console.error('Erro ao monitorar automação V2:', error);
                setTimeout(checkStatus, 5000); // Retry after 5 seconds
            }
        };
        
        checkStatus();
    }

    showServidorV2Report(relatorio) {
        const reportWindow = window.open('', '_blank', 'width=800,height=600');
        reportWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Automação V2</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                        .success { color: #28a745; }
                        .error { color: #dc3545; }
                        .warning { color: #ffc107; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Relatório de Automação V2 - Servidores</h1>
                    <div class="summary">
                        <h3>Resumo</h3>
                        <p><strong>Total de Órgãos:</strong> ${relatorio.resumo?.total || 0}</p>
                        <p class="success"><strong>Sucessos:</strong> ${relatorio.resumo?.sucessos || 0} (${relatorio.resumo?.percentualSucesso || 0}%)</p>
                        <p class="error"><strong>Erros:</strong> ${relatorio.resumo?.erros || 0} (${relatorio.resumo?.percentualErros || 0}%)</p>
                        <p class="warning"><strong>Já Incluídos:</strong> ${relatorio.resumo?.jaIncluidos || 0} (${relatorio.resumo?.percentualJaIncluidos || 0}%)</p>
                    </div>
                    
                    <h3>Detalhes</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Órgão Julgador</th>
                                <th>Status</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(relatorio.resultados || []).map(resultado => `
                                <tr>
                                    <td>${resultado.orgao}</td>
                                    <td class="${resultado.status.toLowerCase()}">${resultado.status}</td>
                                    <td>${resultado.observacoes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
    }

    showNotification(message, type = 'info') {
        // Simple notification system - could be enhanced with a proper toast library
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                notification.style.background = '#27ae60';
                break;
            case 'error':
                notification.style.background = '#e74c3c';
                break;
            case 'warning':
                notification.style.background = '#f39c12';
                break;
            default:
                notification.style.background = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Funcionalidades para Servidores
class ServidorManager {
    constructor(app) {
        this.app = app;
        this.vinculoCounter = 0;
        this.initEventListeners();
    }

    initEventListeners() {
        // Botões da aba servidores
        document.getElementById('add-servidor').addEventListener('click', () => this.openServidorModal());
        document.getElementById('import-servidores').addEventListener('click', () => this.importServidores());
        document.getElementById('export-servidores').addEventListener('click', () => this.exportServidores());
        
        // Modal de servidor
        document.getElementById('cancel-servidor').addEventListener('click', () => this.closeServidorModal());
        document.getElementById('servidor-form').addEventListener('submit', (e) => this.handleServidorSubmit(e));
        
        // Fechar modal ao clicar no X
        document.querySelector('#servidor-modal .close').addEventListener('click', () => this.closeServidorModal());
    }

    openServidorModal(index = -1) {
        this.app.currentEditingServidorIndex = index;
        const modal = document.getElementById('servidor-modal');
        const title = document.getElementById('servidor-modal-title');
        const form = document.getElementById('servidor-form');
        
        // Inicializar o seletor principal de OJs primeiro
        this.initializeOJSelector();
        
        if (index >= 0) {
            title.textContent = 'Editar Servidor';
            this.populateServidorForm(this.app.servidores[index]);
        } else {
            title.textContent = 'Adicionar Servidor';
            form.reset();
            // Resetar seletor de OJs para novo servidor
            const ojSelector = window.ojSelectors['oj-selector-main'];
            if (ojSelector) {
                ojSelector.setSelectedOJs([]);
            }
        }
        
        modal.style.display = 'block';
    }

    closeServidorModal() {
        document.getElementById('servidor-modal').style.display = 'none';
        this.app.currentEditingServidorIndex = -1;
    }

    populateServidorForm(servidor) {
        document.getElementById('servidor-nome').value = servidor.nome;
        document.getElementById('servidor-cpf').value = servidor.cpf;
        document.getElementById('servidor-perfil').value = servidor.perfil || '';
        
        // Configurar OJs selecionados no seletor principal
        setTimeout(() => {
            const ojSelector = window.ojSelectors['oj-selector-main'];
            if (ojSelector) {
                // Extrair OJs dos vínculos existentes ou usar nova estrutura
                let ojs = [];
                if (servidor.ojs) {
                    ojs = servidor.ojs;
                } else if (servidor.vinculos) {
                    // Converter vínculos antigos para nova estrutura
                    ojs = servidor.vinculos.map(v => v.localizacao).filter(Boolean);
                }
                ojSelector.setSelectedOJs(ojs);
            }
        }, 100);
    }




    initializeOJSelector() {
        const containerId = 'oj-selector-main';
        const container = document.getElementById(containerId);
        if (container) {
            // Use the global OJ list if available, otherwise use fallback
            let ojList = window.ojList;
            if (!ojList || ojList.length === 0) {
                ojList = [
                    'LIQ2 - Bauru',
                    'Órgão Centralizador de Leilões Judiciais de Limeira',
                    'Órgão Centralizador de Leilões Judiciais de Araraquara',
                    'Vara do Trabalho de Ubatuba',
                    'EXE1 - São José dos Campos'
                ];
            }
            window.ojSelectors[containerId] = new OJSelector(containerId, ojList);
        }
    }

    async handleServidorSubmit(e) {
        e.preventDefault();
        
        const nome = document.getElementById('servidor-nome').value.trim();
        const cpf = document.getElementById('servidor-cpf').value.trim();
        const perfil = document.getElementById('servidor-perfil').value;
        
        if (!nome || !cpf || !perfil) {
            alert('Nome, CPF e Perfil são obrigatórios!');
            return;
        }
        
        // Obter OJs selecionados do seletor principal
        const mainOjSelector = window.ojSelectors['oj-selector-main'];
        let ojs = [];
        
        if (mainOjSelector) {
            ojs = mainOjSelector.getSelectedOJs();
        } else {
            // Fallback: tentar obter do input hidden
            const hiddenInput = document.getElementById('oj-selector-main-hidden');
            if (hiddenInput && hiddenInput.value) {
                try {
                    ojs = JSON.parse(hiddenInput.value);
                } catch (e) {
                    ojs = [];
                }
            }
        }
        
        if (ojs.length === 0) {
            alert('Pelo menos um Órgão Julgador deve ser selecionado!');
            return;
        }
        
        const servidor = {
            nome,
            cpf,
            perfil,
            ojs,
            // Manter compatibilidade com estrutura antiga
            vinculos: ojs.map(oj => ({
                papel: perfil,
                localizacao: oj,
                dataInicial: "",
                dataFinal: ""
            }))
        };
        
        if (this.app.currentEditingServidorIndex >= 0) {
            this.app.servidores[this.app.currentEditingServidorIndex] = servidor;
        } else {
            this.app.servidores.push(servidor);
        }
        
        await this.app.saveServidores();
        this.app.renderServidores();
        this.closeServidorModal();
        
        // Resetar o formulário
        document.getElementById('servidor-form').reset();
        const resetOjSelector = window.ojSelectors['oj-selector-main'];
        if (resetOjSelector) {
            resetOjSelector.setSelectedOJs([]);
        }
    }

    async importServidores() {
        try {
            const result = await window.electronAPI.importFile('json');
            if (result.success) {
                this.app.servidores = result.data;
                this.app.saveServidores();
                this.app.renderServidores();
                alert('Servidores importados com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao importar servidores:', error);
            alert('Erro ao importar arquivo!');
        }
    }

    async exportServidores() {
        if (this.app.servidores.length === 0) {
            alert('Não há servidores para exportar!');
            return;
        }
        
        try {
            const result = await window.electronAPI.exportFile(this.app.servidores, 'servidores.json');
            if (result.success) {
                alert('Servidores exportados com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao exportar servidores:', error);
            alert('Erro ao exportar arquivo!');
        }
    }
}

// Initialize the app
const app = new PeritoApp();

// Make app globally available for onclick handlers
window.app = app;

// Inicializar gerenciador de servidores
const servidorManager = new ServidorManager(app);

// OJ Selector Class
class OJSelector {
    constructor(containerId, ojList) {
        this.containerId = containerId;
        this.ojList = ojList;
        this.selectedOJs = [];
        this.filteredOJs = [...ojList];
        this.init();
    }

    init() {
        this.container = document.getElementById(this.containerId);
        console.log('OJSelector init - Container:', this.container);
        
        if (!this.container) {
            console.error('Container não encontrado:', this.containerId);
            return;
        }
        
        // Criar estrutura HTML dinamicamente
        this.createHTML();
        
        // Agora buscar os elementos criados
        this.searchInput = this.container.querySelector('.oj-search');
        this.selectedContainer = this.container.querySelector('.oj-selected');
        this.dropdown = this.container.querySelector('.oj-dropdown');
        this.optionsContainer = this.container.querySelector('.oj-options');
        this.hiddenInput = this.container.querySelector('input[type="hidden"]');
        
        console.log('OJSelector elementos encontrados:');
        console.log('- searchInput:', !!this.searchInput);
        console.log('- selectedContainer:', !!this.selectedContainer);
        console.log('- dropdown:', !!this.dropdown);
        console.log('- optionsContainer:', !!this.optionsContainer);
        console.log('- hiddenInput:', !!this.hiddenInput);
        
        if (!this.searchInput || !this.selectedContainer || !this.dropdown || !this.optionsContainer || !this.hiddenInput) {
            console.error('Alguns elementos do OJSelector não foram encontrados');
            return;
        }
        
        this.setupEventListeners();
        this.renderOptions();
        this.updateSelectedDisplay();
    }
    
    createHTML() {
        this.container.innerHTML = `
            <div class="oj-selected"></div>
            <input type="text" class="oj-search" placeholder="Buscar órgãos julgadores...">
            <div class="oj-dropdown" style="display: none;">
                <div class="oj-options"></div>
            </div>
            <input type="hidden" name="selected-ojs" value="">
        `;
    }

    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });

        // Show dropdown on focus
        this.searchInput.addEventListener('focus', () => {
            this.showDropdown();
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }

    filterOptions(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredOJs = [...this.ojList];
        } else {
            // Normalize search term for better matching
            const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const termWords = normalizedTerm.split(/\s+/).filter(word => word.length > 0);
            
            this.filteredOJs = this.ojList.filter(oj => {
                const normalizedOJ = oj.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                
                // Search in the OJ name
                if (normalizedOJ.includes(normalizedTerm)) {
                    return true;
                }
                
                // Search by city name (extract city from OJ name)
                const cityMatch = oj.match(/de\s+([A-Za-zÀ-ÿ\s]+)(?:\s|$)/);
                if (cityMatch) {
                    const normalizedCity = cityMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (normalizedCity.includes(normalizedTerm)) {
                        return true;
                    }
                }
                
                // Check if any word in the OJ starts with the search term
                const words = normalizedOJ.split(/\s+/);
                
                return termWords.every(termWord => 
                    words.some(word => word.startsWith(termWord))
                );
            });
        }
        
        this.renderOptions();
        
        // Auto-show dropdown when filtering
        if (term && this.filteredOJs.length > 0) {
            this.showDropdown();
        }
    }

    renderOptions() {
        this.optionsContainer.innerHTML = '';
        
        // Limit initial display for performance
        const maxDisplay = 50;
        const displayOJs = this.filteredOJs.slice(0, maxDisplay);
        
        if (displayOJs.length === 0 && this.filteredOJs.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'oj-no-results';
            const searchTerm = this.searchInput.value.trim();
            noResults.innerHTML = searchTerm ? 
                `<i class="fas fa-search"></i><br>Nenhum OJ encontrado para "${searchTerm}"<br><small>Tente usar termos diferentes</small>` :
                '<i class="fas fa-list"></i><br>Digite para buscar órgãos julgadores';
            this.optionsContainer.appendChild(noResults);
            return;
        }
        
        displayOJs.forEach(oj => {
            const option = document.createElement('div');
            option.className = 'oj-option';
            if (this.selectedOJs.includes(oj)) {
                option.classList.add('selected');
            }
            
            // Highlight search terms
            const searchTerm = this.searchInput.value.trim();
            let displayText = oj;
            if (searchTerm) {
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayText = oj.replace(regex, '<mark>$1</mark>');
            }
            
            option.innerHTML = `
                <input type="checkbox" ${this.selectedOJs.includes(oj) ? 'checked' : ''}>
                <label>${displayText}</label>
            `;
            
            option.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleOJ(oj);
            });
            
            this.optionsContainer.appendChild(option);
        });
        
        // Show "more results" indicator if there are more items
        if (this.filteredOJs.length > maxDisplay) {
            const moreResults = document.createElement('div');
            moreResults.className = 'oj-more-results';
            moreResults.innerHTML = `<i class="fas fa-ellipsis-h"></i> Mostrando ${maxDisplay} de ${this.filteredOJs.length} resultados (refine a busca para ver mais)`;
            this.optionsContainer.appendChild(moreResults);
        }
    }

    toggleOJ(oj) {
        const index = this.selectedOJs.indexOf(oj);
        if (index > -1) {
            this.selectedOJs.splice(index, 1);
        } else {
            this.selectedOJs.push(oj);
        }
        
        this.updateSelectedDisplay();
        this.updateHiddenInput();
        this.renderOptions();
    }

    removeOJ(oj) {
        const index = this.selectedOJs.indexOf(oj);
        if (index > -1) {
            this.selectedOJs.splice(index, 1);
            this.updateSelectedDisplay();
            this.updateHiddenInput();
            this.renderOptions();
        }
    }

    updateSelectedDisplay() {
        if (this.selectedOJs.length === 0) {
            this.selectedContainer.innerHTML = '<span class="oj-placeholder">Nenhum OJ selecionado</span>';
        } else {
            const countText = this.selectedOJs.length === 1 ? '1 OJ selecionado' : `${this.selectedOJs.length} OJs selecionados`;
            const tagsHtml = this.selectedOJs.map(oj => `
                <span class="oj-tag" title="${oj}">
                    ${oj.length > 50 ? oj.substring(0, 47) + '...' : oj}
                    <span class="remove" onclick="ojSelectors['${this.containerId}'].removeOJ('${oj.replace(/'/g, "\\'")}')">×</span>
                </span>
            `).join('');
            
            this.selectedContainer.innerHTML = `
                <div class="oj-count">${countText}</div>
                ${tagsHtml}
            `;
        }
    }

    updateHiddenInput() {
        this.hiddenInput.value = this.selectedOJs.join(',');
    }

    showDropdown() {
        this.dropdown.style.display = 'block';
    }

    hideDropdown() {
        this.dropdown.style.display = 'none';
    }

    getSelectedOJs() {
        return this.selectedOJs;
    }

    setSelectedOJs(ojs) {
        this.selectedOJs = Array.isArray(ojs) ? ojs : [];
        this.updateSelectedDisplay();
        this.updateHiddenInput();
        this.renderOptions();
    }
}

// Global OJ selectors registry
window.ojSelectors = {};
window.ojList = [];

// Initialize OJ selector when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load OJ list from orgaos_pje.json
        const response = await fetch('./src/renderer/orgaos_pje.json');
        const ojData = await response.json();
        
        // Extract all OJs from all cities and flatten into a single array
        const allOJs = [];
        Object.keys(ojData).forEach(cidade => {
            if (Array.isArray(ojData[cidade])) {
                allOJs.push(...ojData[cidade]);
            }
        });
        
        // Sort alphabetically
        window.ojList = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        
        console.log('OJs carregados:', window.ojList.length);
        
        // Initialize OJ selector for the main selector
        if (document.getElementById('oj-selector-main')) {
            window.ojSelectors['oj-selector-main'] = new OJSelector('oj-selector-main', window.ojList);
        }
    } catch (error) {
        console.error('Erro ao carregar lista de OJs:', error);
        // Fallback to hardcoded list if file not found
        window.ojList = [
            'LIQ2 - Bauru',
            'Órgão Centralizador de Leilões Judiciais de Limeira',
            'Órgão Centralizador de Leilões Judiciais de Araraquara',
            'Vara do Trabalho de Ubatuba',
            'EXE1 - São José dos Campos'
        ].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        
        if (document.getElementById('oj-selector-main')) {
             window.ojSelectors['oj-selector-main'] = new OJSelector('oj-selector-main', window.ojList);
         }
     }
});