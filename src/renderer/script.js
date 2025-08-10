class PeritoApp {
    constructor() {
        this.peritos = [];
        this.selectedPeritos = [];
        this.currentEditingIndex = -1;
        this.isAutomationRunning = false;
        this.currentProgress = 0;
        this.totalSteps = 0;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPeritos();
        await this.loadConfig();
        this.updateSelectedPeritosDisplay();
        
        // Listen for automation status updates
        window.electronAPI.onAutomationStatus((data) => {
            this.addStatusMessage(data.type, data.message);
            this.updateLoadingProgress(data);
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

// Initialize the app
const app = new PeritoApp();

// Make app globally available for onclick handlers
window.app = app;