class PeritoApp {
  constructor() {
    this.peritos = [];
    this.servidores = [];
    this.selectedPeritos = [];
    this.selectedServidores = [];
    this.currentEditingIndex = -1;
    this.currentEditingServidorIndex = -1;
    this.isAutomationRunning = false;
    this.currentProgress = 0;
    this.totalSteps = 0;
    
    // Sistema de memória/histórico
    this.cpfHistory = [];
    this.ojHistory = [];
    this.profileHistory = [];
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadPeritos();
    await this.loadServidores();
    await this.loadConfig();
    this.loadHistory(); // Carregar histórico
    this.updateSelectedPeritosDisplay();
    this.updateSelectedServidoresDisplay();
    this.initTabs();
    this.setupServidorAutomationListeners();
    this.setupServidorV2Listeners();
    this.setupAutocomplete(); // Configurar autocomplete
    this.loadServidorV2Config();
    this.updateV2StatusIndicator();
        
    // Listen for automation status updates
    window.electronAPI.onAutomationStatus((data) => {
      this.addStatusMessage(data.type, data.message);
      this.updateLoadingProgress(data);
    });
    
    // Listen for automation reports
    window.electronAPI.onAutomationReport((data) => {
      if (data.type === 'final-report') {
        this.showFinalReport(data.relatorio);
      }
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

    // Servidor management
    document.getElementById('add-servidor').addEventListener('click', () => {
      this.openServidorModal();
    });

    document.getElementById('import-servidores').addEventListener('click', () => {
      this.importServidores();
    });

    document.getElementById('export-servidores').addEventListener('click', () => {
      this.exportServidores();
    });

    // Modal events
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.style.display = 'none';
          this.currentEditingIndex = -1;
          this.currentEditingServidorIndex = -1;
        }
      });
    });

    document.getElementById('cancel-perito').addEventListener('click', () => {
      this.closePeritoModal();
    });

    document.getElementById('cancel-servidor').addEventListener('click', () => {
      this.closeServidorModal();
    });

    document.getElementById('perito-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePeito();
    });

    document.getElementById('servidor-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveServidor();
    });

    // Config form
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfig();
    });

    // Select all checkboxes
    document.getElementById('select-all').addEventListener('change', (e) => {
      this.selectAllPeritos(e.target.checked);
    });

    document.getElementById('select-all-servidores').addEventListener('change', (e) => {
      this.selectAllServidores(e.target.checked);
    });

    // Automation
    document.getElementById('start-automation').addEventListener('click', () => {
      this.startAutomation();
    });

    document.getElementById('stop-automation').addEventListener('click', () => {
      this.stopAutomation();
    });

    document.getElementById('start-servidor-automation').addEventListener('click', () => {
      this.startServidorAutomation();
    });

    document.getElementById('stop-servidor-automation').addEventListener('click', () => {
      this.stopServidorAutomation();
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      const peritoModal = document.getElementById('perito-modal');
      const servidorModal = document.getElementById('servidor-modal');
      
      if (e.target === peritoModal) {
        this.closePeritoModal();
      }
      if (e.target === servidorModal) {
        this.closeServidorModal();
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

    // Update selected displays when switching to automation tab
    if (tabName === 'automation') {
      this.updateSelectedPeritosDisplay();
      this.updateSelectedServidoresDisplay();
    }
  }

  // ===== PERITO METHODS =====

  async loadPeritos() {
    try {
      this.peritos = await window.electronAPI.loadData('perito.json') || [];
      this.renderPeritosTable();
    } catch (error) {
      console.error('Erro ao carregar peritos:', error);
      this.showNotification('Erro ao carregar peritos', 'error');
    }
  }

  async savePeritos() {
    try {
      const result = await window.electronAPI.saveData('perito.json', this.peritos);
      if (result.success) {
        this.showNotification('Peritos salvos com sucesso!', 'success');
      } else {
        this.showNotification('Erro ao salvar peritos: ' + (result && result.error ? result.error : 'Erro desconhecido'), 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar peritos:', error);
      this.showNotification('Erro ao salvar peritos', 'error');
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

  updateServidorAutomationButton() {
    const startButton = document.getElementById('start-servidor-automation');
    if (startButton) {
      startButton.disabled = this.selectedServidores.length === 0 || this.isAutomationRunning;
    }
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
    
    // Salvar CPF no histórico para autocomplete
    this.saveCpfToHistory(cpf, 'perito');
    
    // Salvar OJs no histórico se existirem
    if (ojs.length > 0) {
      ojs.forEach(oj => this.saveOjToHistory(oj));
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

  // ===== SERVIDOR METHODS =====

  async loadServidores() {
    try {
      this.servidores = await window.electronAPI.loadData('servidores.json') || [];
      this.renderServidoresTable();
    } catch (error) {
      console.error('Erro ao carregar servidores:', error);
      this.showNotification('Erro ao carregar servidores', 'error');
    }
  }

  async saveServidores() {
    try {
      const result = await window.electronAPI.saveData('servidores.json', this.servidores);
      if (result.success) {
        this.showNotification('Servidores salvos com sucesso!', 'success');
      } else {
        this.showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar servidores:', error);
      this.showNotification('Erro ao salvar servidores', 'error');
    }
  }

  renderServidoresTable() {
    const tbody = document.getElementById('servidores-tbody');
    if (!tbody) {
      console.log('Elemento servidores-tbody não encontrado');
      return;
    }
        
    tbody.innerHTML = '';
        
    this.servidores.forEach((servidor, index) => {
      const isSelected = this.selectedServidores && this.selectedServidores.includes(index);
      const row = document.createElement('tr');
      
      // Create checkbox with event listener
      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      checkbox.addEventListener('change', () => this.toggleServidorSelection(index));
      checkboxCell.appendChild(checkbox);
      
      row.appendChild(checkboxCell);
      row.innerHTML += `
        <td>${servidor.nome}</td>
        <td>${servidor.cpf}</td>
        <td>${servidor.perfil}</td>
        <td>${servidor.ojs ? servidor.ojs.join(', ') : 'Não definido'}</td>
        <td>
          <button onclick="app.editServidor(${index})" class="btn btn-sm btn-primary">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button onclick="app.deleteServidor(${index})" class="btn btn-sm btn-danger">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  openServidorModal(editIndex = -1) {
    this.currentEditingServidorIndex = editIndex;
    const modal = document.getElementById('servidor-modal');
    const title = document.getElementById('servidor-modal-title');
        
    if (editIndex >= 0) {
      title.textContent = 'Editar Servidor';
      const servidor = this.servidores[editIndex];
      document.getElementById('servidor-nome').value = servidor.nome;
      document.getElementById('servidor-cpf').value = servidor.cpf;
      document.getElementById('servidor-perfil').value = servidor.perfil;
      document.getElementById('servidor-ojs').value = servidor.ojs ? servidor.ojs.join('\n') : '';
    } else {
      title.textContent = 'Adicionar Servidor';
      document.getElementById('servidor-form').reset();
    }
        
    modal.style.display = 'block';
  }

  closeServidorModal() {
    document.getElementById('servidor-modal').style.display = 'none';
    this.currentEditingServidorIndex = -1;
  }

  async saveServidor() {
    const nome = document.getElementById('servidor-nome').value.trim();
    const cpf = document.getElementById('servidor-cpf').value.trim();
    const perfil = document.getElementById('servidor-perfil').value;
    const ojsText = document.getElementById('servidor-ojs').value.trim();
        
    if (!nome || !cpf || !perfil) {
      this.showNotification('Nome, CPF e Perfil são obrigatórios', 'error');
      return;
    }

    const ojs = ojsText ? ojsText.split('\n').map(oj => oj.trim()).filter(oj => oj) : [];
        
    const servidor = { nome, cpf, perfil, ojs };
        
    if (this.currentEditingServidorIndex >= 0) {
      this.servidores[this.currentEditingServidorIndex] = servidor;
    } else {
      this.servidores.push(servidor);
    }
    
    // Salvar CPF no histórico para autocomplete
    this.saveCpfToHistory(cpf, 'servidor');
    
    // Salvar perfil no histórico
    this.saveProfileToHistory(perfil);
    
    // Salvar OJs no histórico se existirem
    if (ojs.length > 0) {
      ojs.forEach(oj => this.saveOjToHistory(oj));
    }
        
    await this.saveServidores();
    this.renderServidoresTable();
    this.closeServidorModal();
  }

  editServidor(index) {
    this.openServidorModal(index);
  }

  async deleteServidor(index) {
    if (confirm('Tem certeza que deseja excluir este servidor?')) {
      this.servidores.splice(index, 1);
      await this.saveServidores();
      this.renderServidoresTable();
      this.updateSelectedServidoresDisplay();
    }
  }

  async importServidores() {
    try {
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        // Here you would read the file and parse it
        // For now, we'll show a placeholder message
        this.showNotification('Funcionalidade de importação será implementada', 'info');
      }
    } catch (error) {
      this.showNotification('Erro ao importar servidores', 'error');
    }
  }

  async exportServidores() {
    try {
      const result = await window.electronAPI.showSaveDialog();
      if (!result.canceled) {
        // Here you would save the file
        // For now, we'll show a placeholder message
        this.showNotification('Funcionalidade de exportação será implementada', 'info');
      }
    } catch (error) {
      this.showNotification('Erro ao exportar servidores', 'error');
    }
  }

  toggleServidorSelection(index) {
    const checkboxIndex = this.selectedServidores.indexOf(index);
        
    if (checkboxIndex >= 0) {
      this.selectedServidores.splice(checkboxIndex, 1);
    } else {
      this.selectedServidores.push(index);
    }
        
    this.updateSelectedServidoresDisplay();
    this.renderServidoresTable();
  }

  selectAllServidores(selectAll) {
    if (selectAll) {
      this.selectedServidores = this.servidores.map((_, index) => index);
    } else {
      this.selectedServidores = [];
    }
        
    this.updateSelectedServidoresDisplay();
    this.renderServidoresTable();
  }

  updateSelectedServidoresDisplay() {
    const container = document.getElementById('selected-servidores-list');
    if (!container) return;

    if (this.selectedServidores.length === 0) {
      container.innerHTML = '<p class="no-selection">Nenhum servidor selecionado</p>';
      return;
    }

    const selectedServidoresList = this.selectedServidores.map(index => {
      const servidor = this.servidores[index];
      return `
                <div class="selected-item">
                    <strong>${servidor.nome}</strong>
                    <div class="selected-details">
                        CPF: ${servidor.cpf} | Perfil: ${servidor.perfil}<br>
                        OJs: ${servidor.ojs ? servidor.ojs.length : 0} órgão(s) julgador(es)
                    </div>
                </div>
            `;
    }).join('');

    container.innerHTML = selectedServidoresList;
    
    // Update counter display
    const displayElement = document.getElementById('selected-servidores-display');
    if (displayElement) {
      displayElement.innerHTML = `<small>${this.selectedServidores.length} de ${this.servidores.length} servidores selecionados</small>`;
    }
    
    // Update automation button state
    this.updateServidorAutomationButton();
  }

  // ===== AUTOMATION METHODS =====

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
            
      if (!result || !result.success) {
        this.addStatusMessage('error', 'Erro na automação: ' + (result && result.error ? result.error : 'Erro desconhecido'));
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
        this.addStatusMessage('error', 'Falha ao parar automação: ' + (result && result.error ? result.error : 'Erro desconhecido'));
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

  async startServidorAutomation() {
    if (this.selectedServidores.length === 0) {
      this.showNotification('Selecione pelo menos um servidor para iniciar a automação', 'warning');
      return;
    }

    this.isAutomationRunning = true;
    const startButton = document.getElementById('start-servidor-automation');
    const stopButton = document.getElementById('stop-servidor-automation');
    startButton.disabled = true;
    startButton.classList.add('loading');
    stopButton.disabled = false;
        
    // Calcular total de passos para progress
    const selectedServidoresList = this.selectedServidores.map(index => this.servidores[index]);
    this.totalSteps = selectedServidoresList.reduce((total, servidor) => {
      return total + 3 + (servidor.ojs ? servidor.ojs.length : 0); // login + navegação + verificação + OJs
    }, 0);
    this.currentProgress = 0;
        
    this.showLoading('Iniciando automação de servidores...', 'Preparando sistema e abrindo navegador');
    this.clearStatusLog();
    this.addStatusMessage('info', 'Iniciando automação de servidores...');
        
    try {
      // Preparar lista de servidores para processar em uma única sessão
      const servidoresParaProcessar = this.selectedServidores.map(index => {
        const servidor = this.servidores[index];
        return {
          nome: servidor.nome,
          cpf: servidor.cpf,
          perfil: servidor.perfil,
          orgaos: servidor.ojs || []
        };
      });
      
      this.addStatusMessage('info', `Processando ${servidoresParaProcessar.length} servidores em uma única sessão`);
      
      const config = {
        servidores: servidoresParaProcessar,
        production: true,
        detailedReport: true,
        useCache: true,
        timeout: 30,
        maxLoginAttempts: 3
      };
      
      const result = await window.electronAPI.startServidorAutomationV2(config);
      
      if (!result || !result.success) {
        this.addStatusMessage('error', `Erro na automação em lote: ${result && result.error ? result.error : 'Erro desconhecido'}`);
      } else {
        this.addStatusMessage('success', `Automação de ${servidoresParaProcessar.length} servidores concluída com sucesso`);
        // Mostrar resultados individuais se disponíveis
        if (result.relatorio && result.relatorio.servidores) {
          result.relatorio.servidores.forEach(relatorioServidor => {
            this.addStatusMessage('info', `${relatorioServidor.nome}: ${relatorioServidor.sucessos || 0} sucessos, ${relatorioServidor.erros || 0} erros`);
          });
        }
      }
    } catch (error) {
      this.addStatusMessage('error', 'Erro ao executar automação de servidores: ' + error.message);
    } finally {
      this.hideLoading();
      startButton.classList.remove('loading');
      this.isAutomationRunning = false;
      startButton.disabled = false;
      stopButton.disabled = false;
    }
  }

  async stopServidorAutomation() {
    this.addStatusMessage('warning', 'Parando automação de servidores...');
    try {
      const result = await window.electronAPI.invoke('stop-servidor-automation-v2');
      if (!result.success) {
        this.addStatusMessage('error', 'Falha ao parar automação: ' + (result && result.error ? result.error : 'Erro desconhecido'));
      }
    } catch (error) {
      this.addStatusMessage('error', 'Erro ao parar automação: ' + error.message);
    } finally {
      this.isAutomationRunning = false;
      const startButton = document.getElementById('start-servidor-automation');
      const stopButton = document.getElementById('stop-servidor-automation');
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
    }
  }

  // ===== UTILITY METHODS =====

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
        this.showNotification('Erro ao salvar configurações: ' + (result && result.error ? result.error : 'Erro desconhecido'), 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      this.showNotification('Erro ao salvar configurações', 'error');
    }
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
    // Otimizada para resposta rápida
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
        
    // Estilos inline otimizados
    const colors = {
      success: '#27ae60',
      error: '#e74c3c', 
      warning: '#f39c12',
      info: '#3498db'
    };
        
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${colors[type] || colors.info};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.2s ease;
        `;
        
    document.body.appendChild(notification);
        
    // Animação de entrada rápida
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
        
    // Remoção otimizada
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 200);
    }, 2000);
  }

  // ===== HISTORY AND AUTOCOMPLETE =====

  loadHistory() {
    try {
      // Carregar histórico do localStorage
      this.cpfHistory = JSON.parse(localStorage.getItem('pje-cpf-history') || '[]');
      this.ojHistory = JSON.parse(localStorage.getItem('pje-oj-history') || '[]');
      this.profileHistory = JSON.parse(localStorage.getItem('pje-profile-history') || '[]');
      
      console.log('📚 Histórico carregado:', {
        cpfs: this.cpfHistory.length,
        ojs: this.ojHistory.length,
        profiles: this.profileHistory.length
      });
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      this.cpfHistory = [];
      this.ojHistory = [];
      this.profileHistory = [];
    }
  }

  saveHistory() {
    try {
      // Salvar histórico no localStorage
      localStorage.setItem('pje-cpf-history', JSON.stringify(this.cpfHistory));
      localStorage.setItem('pje-oj-history', JSON.stringify(this.ojHistory));
      localStorage.setItem('pje-profile-history', JSON.stringify(this.profileHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  addToHistory(type, data) {
    let history, key;
    
    switch (type) {
      case 'cpf':
        history = this.cpfHistory;
        key = 'cpf';
        break;
      case 'oj':
        history = this.ojHistory;
        key = 'name';
        break;
      case 'profile':
        history = this.profileHistory;
        key = 'profile';
        break;
      default:
        return;
    }
    
    // Verificar se já existe
    const existingIndex = history.findIndex(item => item[key] === data[key]);
    
    if (existingIndex !== -1) {
      // Atualizar data de uso se já existe
      history[existingIndex].lastUsed = new Date().toISOString();
      history[existingIndex].usageCount = (history[existingIndex].usageCount || 1) + 1;
    } else {
      // Adicionar novo item
      history.unshift({
        ...data,
        lastUsed: new Date().toISOString(),
        usageCount: 1
      });
    }
    
    // Manter apenas os 50 mais recentes
    if (history.length > 50) {
      history.splice(50);
    }
    
    // Ordenar por uso mais recente
    history.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    
    this.saveHistory();
  }

  saveCpfToHistory(cpf, type) {
    if (!cpf || cpf.length < 11) return;
    
    const cpfData = {
      cpf: cpf,
      type: type, // 'perito' ou 'servidor'
      lastUsed: new Date().toISOString()
    };
    
    this.addToHistory('cpf', cpfData);
  }

  saveOjToHistory(ojName) {
    if (!ojName || ojName.trim().length < 3) return;
    
    const ojData = {
      name: ojName.trim(),
      lastUsed: new Date().toISOString()
    };
    
    this.addToHistory('oj', ojData);
  }

  saveProfileToHistory(profileName) {
    if (!profileName || profileName.trim().length < 3) return;
    
    const profileData = {
      profile: profileName.trim(),
      lastUsed: new Date().toISOString()
    };
    
    this.addToHistory('profile', profileData);
  }

  setupAutocomplete() {
    // Configurar autocomplete para CPF do perito
    this.setupCpfAutocomplete('perito-cpf', 'perito-cpf-suggestions');
    
    // Configurar autocomplete para CPF do servidor
    this.setupCpfAutocomplete('servidor-cpf', 'servidor-cpf-suggestions');
  }

  setupCpfAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    
    if (!input || !suggestions) return;
    
    let currentSuggestionIndex = -1;
    
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\D/g, ''); // Remover não dígitos
      
      if (value.length < 3) {
        suggestions.classList.remove('show');
        return;
      }
      
      this.showCpfSuggestions(value, suggestions, input);
    });
    
    input.addEventListener('focus', (e) => {
      if (e.target.value.length >= 3) {
        const value = e.target.value.replace(/\D/g, '');
        this.showCpfSuggestions(value, suggestions, input);
      }
    });
    
    input.addEventListener('blur', (e) => {
      // Delay para permitir clique nas sugestões
      setTimeout(() => {
        suggestions.classList.remove('show');
      }, 150);
    });
    
    input.addEventListener('keydown', (e) => {
      const items = suggestions.querySelectorAll('.autocomplete-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, items.length - 1);
        this.updateSuggestionSelection(items, currentSuggestionIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
        this.updateSuggestionSelection(items, currentSuggestionIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSuggestionIndex >= 0 && items[currentSuggestionIndex]) {
          items[currentSuggestionIndex].click();
        }
      } else if (e.key === 'Escape') {
        suggestions.classList.remove('show');
        currentSuggestionIndex = -1;
      }
    });
  }

  showCpfSuggestions(searchValue, suggestionsContainer, input) {
    // Filtrar histórico por CPF
    const filtered = this.cpfHistory.filter(item => {
      const cpfNumbers = item.cpf.replace(/\D/g, '');
      return cpfNumbers.includes(searchValue);
    });
    
    if (filtered.length === 0) {
      suggestionsContainer.innerHTML = '<div class="autocomplete-empty">Nenhum CPF anterior encontrado</div>';
      suggestionsContainer.classList.add('show');
      return;
    }
    
    // Gerar HTML das sugestões
    const html = filtered.map(item => {
      const timeSince = this.getTimeSince(item.lastUsed);
      const isPerito = item.type === 'perito';
      
      return `
        <div class="autocomplete-item" data-cpf="${item.cpf}" data-type="${item.type}">
          <div class="autocomplete-cpf">${item.cpf}</div>
          <div class="autocomplete-details">
            <span class="autocomplete-tag">${isPerito ? 'Perito' : 'Servidor'}</span>
            <span class="autocomplete-date">Usado ${timeSince}</span>
            <span>•</span>
            <span>${item.usageCount}x usado</span>
          </div>
        </div>
      `;
    }).join('');
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.classList.add('show');
    
    // Adicionar event listeners aos itens
    suggestionsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const cpf = item.dataset.cpf;
        input.value = cpf;
        
        // Atualizar histórico de uso
        this.addToHistory('cpf', {
          cpf: cpf,
          type: item.dataset.type
        });
        
        suggestionsContainer.classList.remove('show');
        
        // Trigger input event para formatação
        input.dispatchEvent(new Event('input'));
      });
    });
  }

  getTimeSince(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes}min`;
    if (hours < 24) return `há ${hours}h`;
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  }

  updateSuggestionSelection(items, selectedIndex) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // ===== V2 AUTOMATION PLACEHOLDER METHODS =====

  setupServidorAutomationListeners() {
    // Placeholder for V2 automation listeners
  }

  setupServidorV2Listeners() {
    // Placeholder for V2 listeners
  }

  loadServidorV2Config() {
    // Placeholder for V2 config loading
  }

  updateV2StatusIndicator() {
    // Placeholder for V2 status updates
  }

  showFinalReport(relatorio) {
    console.log('Final report:', relatorio);
    this.showNotification('Automação concluída! Verifique os detalhes no console.', 'success');
  }
}

// Initialize the app
const app = new PeritoApp();

// Make app globally available for onclick handlers
window.app = app;