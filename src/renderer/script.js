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
    
    // Timer de automação
    this.automationStartTime = null;
    this.automationTimer = null;
    
    // Visual status tracking
    this.currentDetailedStatus = {
      servidor: '',
      orgaoJulgador: '',
      startTime: null,
      currentStep: '',
      isProcessing: false
    };
    
    // Sistema de memória/histórico
    this.cpfHistory = [];
    this.ojHistory = [];
    this.profileHistory = [];
    
    // Controle de pausa/retomada
    this.isPaused = false;
    this.isServidorPaused = false;
    this.pausedState = null;
    this.pausedServidorState = null;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadPeritos();
    await this.loadServidores();
    await this.loadConfig();
    await this.loadOJs(); // Carregar lista de OJs
    this.loadHistory(); // Carregar histórico
    this.updateSelectedPeritosDisplay();
    this.updateSelectedServidoresDisplay();
    this.updateBulkDeleteButtons();
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

    // Listen for automation progress updates
    window.electronAPI.onAutomationProgress((data) => {
      this.updateLoadingProgress(data);
      this.updateDetailedStatus(data);
    });
    
    // Listen for automation reports
    window.electronAPI.onAutomationReport((data) => {
      // Comentado para evitar modal automático na inicialização
      // if (data.type === 'final-report') {
      //   this.showFinalReport(data.relatorio);
      // } else 
      if (data.type === 'error') {
        this.showAutomationError(data.error, data.context);
      }
    });
    
    // Listen for automation errors
    if (window.electronAPI.onAutomationError) {
      window.electronAPI.onAutomationError((error) => {
        this.showAutomationError(error.message, error.context);
      });
    }
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



    document.getElementById('show-import-example').addEventListener('click', () => {
      this.showImportExample();
    });

    document.getElementById('bulk-delete-peritos').addEventListener('click', () => {
      this.bulkDeletePeritos();
    });

    // Servidor management
    document.getElementById('add-servidor').addEventListener('click', () => {
      this.openServidorModal();
    });

    document.getElementById('import-servidores-bulk').addEventListener('click', () => {
      this.importServidores();
    });

    document.getElementById('servidor-import-example').addEventListener('click', () => {
      this.showServidorImportExample();
    });

    document.getElementById('bulk-delete-servidores').addEventListener('click', () => {
      this.bulkDeleteServidores();
    });

    // Event listeners para processamento paralelo
    this.setupParallelProcessingListeners();

    // Controle de pausa/retomada removido

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

    // Novos botões de pausar/reiniciar
    document.getElementById('pause-resume-automation').addEventListener('click', () => {
      this.togglePauseAutomation();
    });

    document.getElementById('pause-resume-servidor-automation').addEventListener('click', () => {
      this.togglePauseServidorAutomation();
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
        this.updateSelectedPeritosDisplay();
        this.updateBulkDeleteButtons();
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
    this.updateBulkDeleteButtons();
  }

  updateAutomationButton() {
    const startButton = document.getElementById('start-automation');
    startButton.disabled = this.selectedPeritos.length === 0 || this.isAutomationRunning;
  }

  updateBulkDeleteButtons() {
    const bulkDeletePeritoBtn = document.getElementById('bulk-delete-peritos');
    const bulkDeleteServidorBtn = document.getElementById('bulk-delete-servidores');
    
    if (bulkDeletePeritoBtn) {
      bulkDeletePeritoBtn.disabled = this.selectedPeritos.length === 0;
    }
    
    if (bulkDeleteServidorBtn) {
      bulkDeleteServidorBtn.disabled = this.selectedServidores.length === 0;
    }
  }

  updateServidorAutomationButton() {
    const startButton = document.getElementById('start-servidor-automation');
    if (startButton) {
      startButton.disabled = this.selectedServidores.length === 0 || this.isAutomationRunning;
    }
  }

  updateSelectAllServidoresCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-servidores');
    if (selectAllCheckbox) {
      const totalServidores = this.servidores.length;
      const selectedCount = this.selectedServidores.length;
      
      if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (selectedCount === totalServidores) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true; // Estado intermediário
      }
    }
  }

  updateSelectAllPeritosCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
      const totalPeritos = this.peritos.length;
      const selectedCount = this.selectedPeritos.length;
      
      if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (selectedCount === totalPeritos) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true; // Estado intermediário
      }
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
    
    // Update select-all checkbox state
    this.updateSelectAllPeritosCheckbox();
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

  async bulkDeletePeritos() {
    if (this.selectedPeritos.length === 0) {
      this.showNotification('Nenhum perito selecionado para exclusão', 'warning');
      return;
    }

    const count = this.selectedPeritos.length;
    const message = `Tem certeza que deseja excluir ${count} perito${count > 1 ? 's' : ''}?`;
    
    if (confirm(message)) {
      // Sort indices in descending order to avoid index shifting issues
      const sortedIndices = this.selectedPeritos.sort((a, b) => b - a);
      
      // Remove peritos in reverse order
      sortedIndices.forEach(index => {
        this.peritos.splice(index, 1);
      });
      
      // Clear selected peritos
      this.selectedPeritos = [];
      
      await this.savePeritos();
      this.renderPeritosTable();
      this.updateSelectedPeritosDisplay();
      this.updateBulkDeleteButtons();
      
      this.showNotification(`${count} perito${count > 1 ? 's excluídos' : ' excluído'} com sucesso!`, 'success');
    }
  }

  async importPeritos() {
    try {
      const result = await window.electronAPI.importFile('peritos');
      
      if (result.success && result.data) {
        // Validar se os dados importados têm a estrutura correta
        if (!Array.isArray(result.data)) {
          this.showNotification('Arquivo inválido: deve conter um array de peritos', 'error');
          return;
        }

        const validPeritos = [];
        let invalidCount = 0;

        // Validar cada perito importado
        result.data.forEach((perito, index) => {
          if (this.validatePeritoData(perito)) {
            // Verificar se já existe um perito com o mesmo CPF
            const existingIndex = this.peritos.findIndex(p => p.cpf === perito.cpf);
            if (existingIndex >= 0) {
              // Atualizar perito existente
              this.peritos[existingIndex] = { ...this.peritos[existingIndex], ...perito };
            } else {
              // Adicionar novo perito
              validPeritos.push(perito);
            }
          } else {
            invalidCount++;
            console.warn(`Perito inválido na linha ${index + 1}:`, perito);
          }
        });

        // Adicionar peritos válidos
        if (validPeritos.length > 0) {
          this.peritos.push(...validPeritos);
          await this.savePeritos();
          this.renderPeritosTable();
          this.updateHistory(); // Atualizar histórico para autocomplete
        }

        // Mostrar resultado da importação
        let message = `Importação concluída: ${validPeritos.length} peritos adicionados`;
        if (invalidCount > 0) {
          message += `, ${invalidCount} registros inválidos ignorados`;
        }
        
        this.showNotification(message, validPeritos.length > 0 ? 'success' : 'warning');
        
      } else if (result.canceled) {
        // Usuário cancelou a operação
        return;
      } else {
        this.showNotification(`Erro ao importar arquivo: ${result.error || 'Formato inválido'}`, 'error');
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      this.showNotification('Erro ao importar peritos: ' + error.message, 'error');
    }
  }

  // Função para validar dados do perito
  validatePeritoData(perito) {
    return (
      perito &&
      typeof perito === 'object' &&
      typeof perito.nome === 'string' &&
      perito.nome.trim().length > 0 &&
      typeof perito.cpf === 'string' &&
      this.isValidCPF(perito.cpf) &&
      Array.isArray(perito.ojs)
    );
  }

  // Função para validar CPF (formato básico)
  isValidCPF(cpf) {
    if (!cpf) return false;
    // Remove formatação
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    // Verifica se tem 11 dígitos e não é sequência repetida
    return cleanCPF.length === 11 && !/^(\d)\1{10}$/.test(cleanCPF);
  }

  // Função para formatar CPF no padrão XXX.XXX.XXX-XX
  formatCpf(cpf) {
    if (!cpf) return '---.--.------';
    // Remove formatação existente
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    // Aplica formatação se tiver 11 dígitos
    if (cleanCPF.length === 11) {
      return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf; // Retorna original se não conseguir formatar
  }

  // Função para mostrar exemplo de importação
  showImportExample() {
    const modal = document.getElementById('import-example-modal');
    modal.style.display = 'block';

    // Fechar modal ao clicar no X
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    // Fechar modal ao clicar fora dele
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
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
    console.log('Renderizando tabela de servidores...');
    const tbody = document.getElementById('servidores-tbody');
    if (!tbody) {
      console.log('Elemento servidores-tbody não encontrado');
      return;
    }
        
    tbody.innerHTML = '';
    console.log('Servidores a renderizar:', this.servidores.length);
    console.log('Servidores selecionados:', this.selectedServidores);
        
    this.servidores.forEach((servidor, index) => {
      const isSelected = this.selectedServidores && this.selectedServidores.includes(index);
      console.log(`Servidor ${index} (${servidor.nome}): selecionado = ${isSelected}`);
      
      const row = document.createElement('tr');
      
      // Create all cells properly to avoid innerHTML issues
      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      checkbox.addEventListener('change', () => this.toggleServidorSelection(index));
      checkboxCell.appendChild(checkbox);
      
      const nomeCell = document.createElement('td');
      nomeCell.textContent = servidor.nome;
      
      const cpfCell = document.createElement('td');
      cpfCell.textContent = servidor.cpf;
      
      const perfilCell = document.createElement('td');
      perfilCell.textContent = servidor.perfil;
      
      const ojsCell = document.createElement('td');
      ojsCell.textContent = servidor.ojs ? servidor.ojs.join(', ') : 'Não definido';
      
      const actionsCell = document.createElement('td');
      actionsCell.innerHTML = `
        <button onclick="app.editServidor(${index})" class="btn btn-sm btn-primary">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button onclick="app.deleteServidor(${index})" class="btn btn-sm btn-danger">
          <i class="fas fa-trash"></i> Excluir
        </button>
      `;
      
      row.appendChild(checkboxCell);
      row.appendChild(nomeCell);
      row.appendChild(cpfCell);
      row.appendChild(perfilCell);
      row.appendChild(ojsCell);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    console.log('Tabela renderizada com sucesso');
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

  async bulkDeleteServidores() {
    if (this.selectedServidores.length === 0) {
      this.showNotification('Nenhum servidor selecionado para exclusão', 'warning');
      return;
    }

    const count = this.selectedServidores.length;
    const message = `Tem certeza que deseja excluir ${count} servidor${count > 1 ? 'es' : ''}?`;
    
    if (confirm(message)) {
      // Sort indices in descending order to avoid index shifting issues
      const sortedIndices = this.selectedServidores.sort((a, b) => b - a);
      
      // Remove servidores in reverse order
      sortedIndices.forEach(index => {
        this.servidores.splice(index, 1);
      });
      
      // Clear selected servidores
      this.selectedServidores = [];
      
      await this.saveServidores();
      this.renderServidoresTable();
      this.updateSelectedServidoresDisplay();
      this.updateBulkDeleteButtons();
      
      this.showNotification(`${count} servidor${count > 1 ? 'es excluídos' : ' excluído'} com sucesso!`, 'success');
    }
  }

  async importServidores() {
    try {
      const result = await window.electronAPI.importFile('servidores');
      
      if (result.success && result.data) {
        // Validar se os dados importados têm a estrutura correta
        if (!Array.isArray(result.data)) {
          this.showNotification('Arquivo inválido: deve conter um array de servidores', 'error');
          return;
        }

        const validServidores = [];
        let invalidCount = 0;

        // Validar cada servidor importado
        result.data.forEach((servidor, index) => {
          if (this.validateServidorData(servidor)) {
            // Verificar se já existe um servidor com o mesmo CPF
            const existingIndex = this.servidores.findIndex(s => s.cpf === servidor.cpf);
            if (existingIndex >= 0) {
              // Atualizar servidor existente
              this.servidores[existingIndex] = { ...this.servidores[existingIndex], ...servidor };
            } else {
              // Adicionar novo servidor
              validServidores.push(servidor);
            }
          } else {
            invalidCount++;
            console.warn(`Servidor inválido na linha ${index + 1}:`, servidor);
          }
        });

        // Adicionar servidores válidos
        if (validServidores.length > 0) {
          this.servidores.push(...validServidores);
          await this.saveServidores();
          this.renderServidoresTable();
        }

        // Mostrar resultado da importação
        let message = `Importação concluída: ${validServidores.length} servidores adicionados`;
        if (invalidCount > 0) {
          message += `, ${invalidCount} registros inválidos ignorados`;
        }
        
        this.showNotification(message, validServidores.length > 0 ? 'success' : 'warning');
        
      } else if (result.canceled) {
        // Usuário cancelou a operação
        return;
      } else {
        this.showNotification(`Erro ao importar arquivo: ${result.error || 'Formato inválido'}`, 'error');
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      this.showNotification('Erro ao importar servidores: ' + error.message, 'error');
    }
  }

  // Função para validar dados do servidor
  validateServidorData(servidor) {
    return (
      servidor &&
      typeof servidor === 'object' &&
      typeof servidor.nome === 'string' &&
      servidor.nome.trim().length > 0 &&
      typeof servidor.cpf === 'string' &&
      this.isValidCPF(servidor.cpf) &&
      typeof servidor.perfil === 'string' &&
      servidor.perfil.trim().length > 0 &&
      Array.isArray(servidor.ojs)
    );
  }

  // Função para mostrar exemplo de importação de servidores
  showServidorImportExample() {
    const modal = document.getElementById('servidor-import-example-modal');
    modal.style.display = 'block';

    // Fechar modal ao clicar no X
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    // Fechar modal ao clicar fora dele
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  }



  toggleServidorSelection(index) {
    console.log(`toggleServidorSelection chamado para índice: ${index}`);
    const checkboxIndex = this.selectedServidores.indexOf(index);
    console.log('Estado anterior dos selecionados:', this.selectedServidores);
        
    if (checkboxIndex >= 0) {
      this.selectedServidores.splice(checkboxIndex, 1);
      console.log(`Removendo servidor ${index}`);
    } else {
      this.selectedServidores.push(index);
      console.log(`Adicionando servidor ${index}`);
    }
    
    console.log('Estado novo dos selecionados:', this.selectedServidores);
        
    this.updateSelectedServidoresDisplay();
    this.renderServidoresTable();
    this.updateBulkDeleteButtons();
  }

  selectAllServidores(selectAll) {
    console.log('selectAllServidores chamado com:', selectAll);
    console.log('Total de servidores:', this.servidores.length);
    
    if (selectAll) {
      this.selectedServidores = this.servidores.map((_, index) => index);
    } else {
      this.selectedServidores = [];
    }
    
    console.log('Servidores selecionados após mudança:', this.selectedServidores);
        
    this.updateSelectedServidoresDisplay();
    this.renderServidoresTable();
    this.updateBulkDeleteButtons();
  }

  selectAllPeritos(selectAll) {
    if (selectAll) {
      this.selectedPeritos = this.peritos.map((_, index) => index);
    } else {
      this.selectedPeritos = [];
    }
        
    this.updateSelectedPeritosDisplay();
    this.renderPeritosTable();
    this.updateAutomationButton();
    this.updateBulkDeleteButtons();
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
    
    // Update select-all checkbox state
    this.updateSelectAllServidoresCheckbox();
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
    
    // Iniciar timer
    this.startAutomationTimer();
    
    // Reset detailed status for new automation
    this.resetDetailedStatus();
        
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
      this.stopAutomationTimer();
      
      // Reset detailed status when automation stops
      this.resetDetailedStatus();
    });
  }

  async startServidorAutomation() {
    if (this.selectedServidores.length === 0) {
      this.showNotification('Selecione pelo menos um servidor para iniciar a automação', 'warning');
      return;
    }

    // Verificar modo de automação selecionado
    const selectedMode = document.querySelector('input[name="automation-mode"]:checked');
    const isParallelMode = selectedMode && selectedMode.value === 'parallel';
    
    if (isParallelMode) {
      return this.startParallelAutomation();
    } else {
      return this.startSequentialAutomation();
    }
  }

  async startSequentialAutomation() {
    this.isAutomationRunning = true;
    const startButton = document.getElementById('start-servidor-automation');
    const stopButton = document.getElementById('stop-servidor-automation');
    
    // Reset detailed status for new automation
    this.resetDetailedStatus();
    startButton.disabled = true;
    startButton.classList.add('loading');
    stopButton.disabled = false;
        
    // Calcular total de passos para progress
    const selectedServidoresList = this.selectedServidores.map(index => this.servidores[index]);
    this.totalSteps = selectedServidoresList.reduce((total, servidor) => {
      return total + 3 + (servidor.ojs ? servidor.ojs.length : 0); // login + navegação + verificação + OJs
    }, 0);
    this.currentProgress = 0;
    
    // Iniciar timer
    this.startAutomationTimer();
        
    this.showLoading('Iniciando automação sequencial...', 'Preparando sistema e abrindo navegador');
    this.clearStatusLog();
    this.addStatusMessage('info', 'Iniciando automação sequencial de servidores...');
        
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
      
      this.addStatusMessage('info', `Processando ${servidoresParaProcessar.length} servidores sequencialmente`, 
        `Servidores: ${servidoresParaProcessar.map(s => s.nome).join(', ')}`);
      
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
        this.addStatusMessage('success', `Automação de ${servidoresParaProcessar.length} servidores concluída com sucesso`, 
          `Tempo total: ${this.getElapsedTime()}`);
        // Mostrar resultados individuais se disponíveis
        if (result.relatorio && result.relatorio.servidores) {
          const totalSucessos = result.relatorio.servidores.reduce((sum, s) => sum + (s.sucessos || 0), 0);
          const totalErros = result.relatorio.servidores.reduce((sum, s) => sum + (s.erros || 0), 0);
          this.addStatusMessage('info', `Resumo Final: ${totalSucessos} sucessos, ${totalErros} erros`, 
            `${result.relatorio.servidores.length} servidores processados`);
          
          result.relatorio.servidores.forEach(relatorioServidor => {
            const status = (relatorioServidor.erros || 0) > 0 ? 'warning' : 'success';
            this.addStatusMessage(status, `${relatorioServidor.nome}`, 
              `${relatorioServidor.sucessos || 0} sucessos, ${relatorioServidor.erros || 0} erros`);
          });
        }
      }
    } catch (error) {
      this.addStatusMessage('error', 'Erro ao executar automação de servidores: ' + error.message);
    } finally {
      this.stopAutomationTimer();
      this.hideLoading();
      startButton.classList.remove('loading');
      this.isAutomationRunning = false;
      startButton.disabled = false;
      stopButton.disabled = false;
    }
  }

  async startParallelAutomation() {
    const parallelInstancesSelect = document.getElementById('max-instances');
    const numInstances = parseInt(parallelInstancesSelect.value) || 2;
    
    this.isAutomationRunning = true;
    const startButton = document.getElementById('start-servidor-automation');
    const stopButton = document.getElementById('stop-servidor-automation');
    
    // Reset detailed status for new automation
    this.resetDetailedStatus();
    
    startButton.disabled = true;
    startButton.classList.add('loading');
    stopButton.disabled = false;
    
    // Calcular total de passos para progress
    const selectedServidoresList = this.selectedServidores.map(index => this.servidores[index]);
    this.totalSteps = selectedServidoresList.reduce((total, servidor) => {
      return total + 3 + (servidor.ojs ? servidor.ojs.length : 0);
    }, 0);
    this.currentProgress = 0;
    
    // Iniciar timer
    this.startAutomationTimer();
    
    this.showLoading('Iniciando automação paralela...', `Preparando ${numInstances} instâncias do navegador`);
    this.clearStatusLog();
    this.addStatusMessage('info', `Iniciando automação paralela com ${numInstances} instâncias...`);
    
    try {
      // Preparar lista de servidores para processamento paralelo
      const servidoresParaProcessar = this.selectedServidores.map(index => {
        const servidor = this.servidores[index];
        return {
          nome: servidor.nome,
          cpf: servidor.cpf,
          perfil: servidor.perfil,
          orgaos: servidor.ojs || []
        };
      });
      
      this.addStatusMessage('info', `Processando ${servidoresParaProcessar.length} servidores em ${numInstances} instâncias paralelas`);
      
      const config = {
        servidores: servidoresParaProcessar,
        numInstances,
        production: true,
        detailedReport: true,
        useCache: true,
        timeout: 30,
        maxLoginAttempts: 3
      };
      
      const result = await window.electronAPI.startParallelAutomationV2(config);
      
      if (!result || !result.success) {
        this.addStatusMessage('error', `Erro na automação paralela: ${result && result.error ? result.error : 'Erro desconhecido'}`);
      } else {
        this.addStatusMessage('success', `Automação paralela de ${servidoresParaProcessar.length} servidores concluída com sucesso`);
        
        // Mostrar estatísticas de performance
        if (result.performance) {
          const efficiency = result.performance.efficiency || 0;
          const timeReduction = result.performance.timeReduction || 0;
          this.addStatusMessage('info', `Eficiência: ${efficiency.toFixed(1)}% | Redução de tempo: ${timeReduction.toFixed(1)}%`);
        }
        
        // Mostrar resultados individuais se disponíveis
        if (result.relatorio && result.relatorio.servidores) {
          result.relatorio.servidores.forEach(relatorioServidor => {
            this.addStatusMessage('info', `${relatorioServidor.nome}: ${relatorioServidor.sucessos || 0} sucessos, ${relatorioServidor.erros || 0} erros`);
          });
        }
      }
    } catch (error) {
      this.addStatusMessage('error', 'Erro ao executar automação paralela: ' + error.message);
    } finally {
      this.stopAutomationTimer();
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
      
      // Reset detailed status when automation stops
      this.resetDetailedStatus();
    }
  }

  // ===== MÉTODOS DE PAUSAR/REINICIAR =====

  // Métodos de pausar/reiniciar para peritos
  togglePauseAutomation() {
    if (this.isPaused) {
      this.resumeAutomation();
    } else {
      this.pauseAutomation();
    }
  }

  pauseAutomation() {
    if (!this.isAutomationRunning) {
      this.showNotification('Nenhuma automação em execução', 'warning');
      return;
    }

    this.isPaused = true;
    this.pausedState = {
      selectedPeritos: [...this.selectedPeritos],
      currentProgress: this.currentProgress,
      totalSteps: this.totalSteps,
      startTime: this.automationStartTime
    };

    // Parar a automação atual
    this.stopAutomation();
    
    // Atualizar interface
    this.updatePauseButton('pause-resume-automation', true);
    this.addStatusMessage('info', 'Automação pausada. Clique em "Reiniciar" para continuar de onde parou.');
  }

  resumeAutomation() {
    if (!this.pausedState) {
      this.showNotification('Nenhuma automação pausada para reiniciar', 'warning');
      return;
    }

    // Restaurar estado pausado
    this.selectedPeritos = [...this.pausedState.selectedPeritos];
    this.currentProgress = this.pausedState.currentProgress;
    this.totalSteps = this.pausedState.totalSteps;
    this.automationStartTime = this.pausedState.startTime;

    // Reiniciar automação
    this.isPaused = false;
    this.pausedState = null;
    this.startAutomation();
    
    // Atualizar interface
    this.updatePauseButton('pause-resume-automation', false);
    this.addStatusMessage('success', 'Automação reiniciada de onde parou.');
  }

  // Métodos de pausar/reiniciar para servidores
  togglePauseServidorAutomation() {
    if (this.isServidorPaused) {
      this.resumeServidorAutomation();
    } else {
      this.pauseServidorAutomation();
    }
  }

  pauseServidorAutomation() {
    if (!this.isAutomationRunning) {
      this.showNotification('Nenhuma automação em execução', 'warning');
      return;
    }

    this.isServidorPaused = true;
    this.pausedServidorState = {
      selectedServidores: [...this.selectedServidores],
      currentProgress: this.currentProgress,
      totalSteps: this.totalSteps,
      startTime: this.automationStartTime
    };

    // Parar a automação atual
    this.stopServidorAutomation();
    
    // Atualizar interface
    this.updatePauseButton('pause-resume-servidor-automation', true);
    this.addStatusMessage('info', 'Automação de servidores pausada. Clique em "Reiniciar" para continuar de onde parou.');
  }

  resumeServidorAutomation() {
    if (!this.pausedServidorState) {
      this.showNotification('Nenhuma automação pausada para reiniciar', 'warning');
      return;
    }

    // Restaurar estado pausado
    this.selectedServidores = [...this.pausedServidorState.selectedServidores];
    this.currentProgress = this.pausedServidorState.currentProgress;
    this.totalSteps = this.pausedServidorState.totalSteps;
    this.automationStartTime = this.pausedServidorState.startTime;

    // Reiniciar automação
    this.isServidorPaused = false;
    this.pausedServidorState = null;
    this.startServidorAutomation();
    
    // Atualizar interface
    this.updatePauseButton('pause-resume-servidor-automation', false);
    this.addStatusMessage('success', 'Automação de servidores reiniciada de onde parou.');
  }

  // Método auxiliar para atualizar botões de pausa
  updatePauseButton(buttonId, isPaused) {
    const button = document.getElementById(buttonId);
    if (button) {
      if (isPaused) {
        button.innerHTML = '<i class="fas fa-play"></i> Reiniciar';
        button.classList.add('paused');
      } else {
        button.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        button.classList.remove('paused');
      }
    }
  }

  // ===== UTILITY METHODS =====

  addStatusMessage(type, message, details = null) {
    const statusLog = document.getElementById('status-log');
    const timestamp = new Date().toLocaleTimeString();
    
    const statusItem = document.createElement('div');
    statusItem.className = `status-item ${type}`;
    
    // Criar conteúdo principal
    const mainContent = document.createElement('div');
    mainContent.style.fontWeight = '600';
    mainContent.textContent = `[${timestamp}] ${message}`;
    statusItem.appendChild(mainContent);
    
    // Adicionar detalhes se fornecidos
    if (details) {
      const detailsContent = document.createElement('div');
      detailsContent.style.fontSize = '0.9em';
      detailsContent.style.marginTop = '4px';
      detailsContent.style.opacity = '0.8';
      detailsContent.textContent = details;
      statusItem.appendChild(detailsContent);
    }
    
    statusLog.appendChild(statusItem);
    statusLog.scrollTop = statusLog.scrollHeight;
    
    // Manter apenas os últimos 50 itens para performance
    const items = statusLog.children;
    if (items.length > 50) {
      statusLog.removeChild(items[0]);
    }
  }

  clearStatusLog() {
    document.getElementById('status-log').innerHTML = '';
  }

  // Detailed visual status management
  updateDetailedStatus(data) {
    const detailedStatus = document.getElementById('detailed-status');
    const currentServerEl = document.getElementById('current-server');
    const currentOjEl = document.getElementById('current-oj');
    const currentStatusEl = document.getElementById('current-status');

    if (!detailedStatus) return;

    // Update server name
    if (data.servidor && currentServerEl) {
      this.currentDetailedStatus.servidor = data.servidor;
      currentServerEl.querySelector('.status-text').textContent = data.servidor;
      currentServerEl.classList.add('active');
    }

    // Update OJ being processed
    if (data.orgaoJulgador && currentOjEl) {
      this.currentDetailedStatus.orgaoJulgador = data.orgaoJulgador;
      currentOjEl.querySelector('.status-text').textContent = data.orgaoJulgador;
      currentOjEl.classList.add('active');
    }

    // Update processing state
    if (data.type && currentStatusEl) {
      const statusIcon = currentStatusEl.querySelector('.status-icon');
      const statusText = currentStatusEl.querySelector('.status-text');
      
      // Reset all state classes
      currentStatusEl.classList.remove('success', 'error', 'processing', 'waiting');
      
      switch (data.type) {
        case 'info':
          if (data.message.includes('Processando') || data.message.includes('Vinculando')) {
            this.startDetailedTimer();
            currentStatusEl.classList.add('processing');
            statusIcon.textContent = '🔄';
            statusText.textContent = 'Processando...';
            this.currentDetailedStatus.isProcessing = true;
          }
          break;
        case 'success':
          this.stopDetailedTimer();
          currentStatusEl.classList.add('success');
          statusIcon.textContent = '✅';
          statusText.textContent = 'Concluído com sucesso';
          this.currentDetailedStatus.isProcessing = false;
          break;
        case 'error':
          this.stopDetailedTimer();
          currentStatusEl.classList.add('error');
          statusIcon.textContent = '❌';
          statusText.textContent = 'Erro no processamento';
          this.currentDetailedStatus.isProcessing = false;
          break;
        case 'warning':
          currentStatusEl.classList.add('waiting');
          statusIcon.textContent = '⚠️';
          statusText.textContent = 'Aguardando...';
          break;
        default:
          currentStatusEl.classList.add('waiting');
          statusIcon.textContent = '⏳';
          statusText.textContent = 'Aguardando início...';
      }
    }

    // Show detailed status when automation is running
    if (this.isAutomationRunning && (data.servidor || data.orgaoJulgador)) {
      detailedStatus.style.display = 'grid';
    }
  }

  startDetailedTimer() {
    if (!this.currentDetailedStatus.startTime) {
      this.currentDetailedStatus.startTime = Date.now();
    }
    
    const timerEl = document.getElementById('processing-timer');
    if (!timerEl) return;
    
    timerEl.classList.add('active');
    
    // Update timer every second
    if (this.detailedTimer) {
      clearInterval(this.detailedTimer);
    }
    
    this.detailedTimer = setInterval(() => {
      if (this.currentDetailedStatus.startTime) {
        const elapsed = Math.floor((Date.now() - this.currentDetailedStatus.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerTextEl = timerEl.querySelector('.status-text');
        if (timerTextEl) {
          timerTextEl.textContent = timeText;
        }
      }
    }, 1000);
  }

  stopDetailedTimer() {
    if (this.detailedTimer) {
      clearInterval(this.detailedTimer);
      this.detailedTimer = null;
    }
    
    const timerEl = document.getElementById('processing-timer');
    if (timerEl) {
      timerEl.classList.remove('active');
    }
    
    this.currentDetailedStatus.startTime = null;
  }

  resetDetailedStatus() {
    const detailedStatus = document.getElementById('detailed-status');
    if (!detailedStatus) return;

    // Hide detailed status
    detailedStatus.style.display = 'none';
    
    // Reset all elements
    const elements = detailedStatus.querySelectorAll('.status-section');
    elements.forEach(el => {
      el.classList.remove('active', 'success', 'error', 'processing', 'waiting');
      const statusText = el.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = el.id === 'processing-timer' ? '00:00' : 'Aguardando...';
      }
      const statusIcon = el.querySelector('.status-icon');
      if (statusIcon) {
        statusIcon.textContent = el.id === 'processing-timer' ? '⏱️' : '⏳';
      }
    });

    // Reset state
    this.currentDetailedStatus = {
      servidor: '',
      orgaoJulgador: '',
      startTime: null,
      currentStep: '',
      isProcessing: false
    };

    this.stopDetailedTimer();
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

  async loadOJs() {
    try {
      console.log('Carregando lista de OJs...');
      
      // Inicializar window.ojList se não existir
      if (!window.ojList) {
        window.ojList = [];
      }
      
      // Inicializar window.ojSelectors se não existir
      if (!window.ojSelectors) {
        window.ojSelectors = {};
      }
      
      // Carregar OJs do arquivo JSON
      const response = await fetch('./orgaos_pje.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const ojData = await response.json();
      console.log('Dados de OJs carregados:', Object.keys(ojData).length, 'cidades');
      
      // Converter objeto em array plano de OJs
      const allOJs = [];
      for (const cidade in ojData) {
        if (ojData.hasOwnProperty(cidade)) {
          const ojs = ojData[cidade];
          if (Array.isArray(ojs)) {
            allOJs.push(...ojs);
          }
        }
      }
      
      // Ordenar alfabeticamente
      window.ojList = allOJs.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
      console.log('✅ Lista de OJs carregada com sucesso:', window.ojList.length, 'órgãos');
      console.log('Primeiros 5 OJs:', window.ojList.slice(0, 5));
      
      // Inicializar seletores de OJs
      this.initializeOJSelectors();
      
    } catch (error) {
      console.error('❌ Erro ao carregar OJs:', error);
      
      // Lista de fallback
      window.ojList = [
        'Vara do Trabalho de São Paulo',
        'Vara do Trabalho de Campinas',
        'Vara do Trabalho de Santos',
        'Vara do Trabalho de São Bernardo do Campo',
        'Vara do Trabalho de Ribeirão Preto'
      ];
      console.log('⚠️ Usando lista de fallback com', window.ojList.length, 'órgãos');
      
      // Inicializar seletores mesmo com fallback
      this.initializeOJSelectors();
    }
  }

  initializeOJSelectors() {
    try {
      // Inicializar seletor principal de OJs
      if (document.getElementById('oj-selector-main') && document.getElementById('oj-search')) {
        window.ojSelectors.main = new OJSelector('oj-selector-main', 'oj-search', {
          placeholder: 'Selecione um órgão julgador...',
          searchPlaceholder: 'Digite para buscar órgãos julgadores...'
        });
        
        // Event listener para quando um OJ for selecionado
        document.getElementById('oj-selector-main').addEventListener('oj-selected', (e) => {
          console.log('OJ selecionado:', e.detail.text);
          this.saveOjToHistory(e.detail.text);
        });
      }
      
      console.log('Seletores de OJs inicializados com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar seletores de OJs:', error);
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
    // Modal de loading removido - função desabilitada
    console.log(`Loading: ${title} - ${subtitle}`);
  }

  hideLoading() {
    // Modal de loading removido - função desabilitada
    console.log('Loading hidden');
  }

  updateLoadingProgress(data) {
    // Aguardar DOM estar pronto
    if (document.readyState !== 'complete') {
      setTimeout(() => this.updateLoadingProgress(data), 100);
      return;
    }
    
    if (data && data.progress !== undefined && data.progress !== null) {
      this.currentProgress = Math.max(0, parseInt(data.progress) || 0);
    }
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const currentCpf = document.getElementById('current-cpf');
    const currentPerfil = document.getElementById('current-perfil');
    const ojProgress = document.getElementById('oj-progress');
    
    // Atualizar CPF do servidor atual
    if (data && data.cpf && currentCpf) {
      const formattedCpf = this.formatCpf(data.cpf);
      currentCpf.textContent = formattedCpf;
    }
    
    // Atualizar perfil do servidor atual
    if (data && data.perfil && currentPerfil) {
      currentPerfil.textContent = data.perfil;
    }
    
    // Atualizar contador de OJs
    if (data && data.ojProcessed !== undefined && ojProgress) {
      this.currentOjCount = parseInt(data.ojProcessed) || 0;
      if (data.totalOjs !== undefined) {
        this.totalOjCount = parseInt(data.totalOjs) || 0;
      }
      ojProgress.textContent = `OJs processadas: ${this.currentOjCount}/${this.totalOjCount}`;
      
      // Modal de finalização removido conforme solicitação do usuário
      // Mantendo apenas o sistema de notificações na parte inferior
      
      // Se não há OJs para processar, apenas log silencioso
      if (this.totalOjCount === 0 && data.orgaoJulgador === 'Finalizado') {
        console.log('🔄 [AUTOMATION] Servidor finalizado - nenhum OJ para processar, partindo para o próximo');
      }
    }
    
    if (progressBar && progressText) {
      // Garantir que currentProgress e totalSteps sejam números válidos
      const current = Math.max(0, this.currentProgress || 0);
      const total = Math.max(1, this.totalSteps || 1);
      
      const percentage = (current / total) * 100;
      progressBar.style.width = `${Math.min(100, percentage)}%`;
      
      // Formatar contador como 01/90 com tempo decorrido
      const currentFormatted = String(current).padStart(2, '0');
      const totalFormatted = String(total).padStart(2, '0');
      const timeElapsed = this.getElapsedTime();
      progressText.textContent = `${currentFormatted}/${totalFormatted} passos concluídos ${timeElapsed ? '• ' + timeElapsed : ''}`;
    }
        
    if (data.subtitle) {
      const loadingSubtitle = document.getElementById('loading-subtitle');
      if (loadingSubtitle) {
        loadingSubtitle.textContent = data.subtitle;
      }
    }
    
    // Atualizar nome do servidor
    if (data.servidor) {
      const loadingServidor = document.getElementById('loading-servidor');
      if (loadingServidor) {
        loadingServidor.textContent = `Servidor: ${data.servidor}`;
        loadingServidor.style.display = 'block';
      }
    }
    
    // Atualizar OJ atual
    if (data.orgaoJulgador) {
      const loadingOj = document.getElementById('loading-oj');
      if (loadingOj) {
        loadingOj.textContent = `OJ: ${data.orgaoJulgador}`;
        loadingOj.style.display = 'block';
      }
    }
  }

  // Métodos de controle de pausa/retomada
  // Métodos de pausar removidos conforme solicitação do usuário

  startAutomationTimer() {
    this.automationStartTime = Date.now();
    // Atualizar o timer a cada segundo
    this.automationTimer = setInterval(() => {
      this.updateLoadingProgress({});
    }, 1000);
  }

  stopAutomationTimer() {
    if (this.automationTimer) {
      clearInterval(this.automationTimer);
      this.automationTimer = null;
    }
    this.automationStartTime = null;
  }

  getElapsedTime() {
    if (!this.automationStartTime) return '';
    
    const elapsed = Date.now() - this.automationStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
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
      error: '#c07b73',
      warning: '#d4a574',
      info: '#8b7355'
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
      cpf,
      type, // 'perito' ou 'servidor'
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
          cpf,
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

  setupParallelProcessingListeners() {
    // Event listener para mudança do modo de automação
    const modeRadios = document.querySelectorAll('input[name="automation-mode"]');
    const parallelConfig = document.getElementById('parallel-config');
    
    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'parallel') {
          parallelConfig.style.display = 'block';
        } else {
          parallelConfig.style.display = 'none';
        }
      });
    });

    // Inicializar estado baseado na seleção atual
    const selectedMode = document.querySelector('input[name="automation-mode"]:checked');
    if (selectedMode && selectedMode.value === 'parallel') {
      parallelConfig.style.display = 'block';
    } else {
      parallelConfig.style.display = 'none';
    }
  }

  setupServidorV2Listeners() {
    // Método removido - funcionalidade V2 descontinuada
  }
  
  updatePerfilInfo(perfilValue, selectedOption) {
    const perfilInfo = document.getElementById('perfil-description');
    const perfilCard = perfilInfo.querySelector('.perfil-card');
    const perfilIcon = perfilCard.querySelector('.perfil-icon');
    const perfilTitle = perfilCard.querySelector('h5');
    const perfilDescription = perfilCard.querySelector('p');
    const perfilPermissions = perfilCard.querySelector('.perfil-permissions');
    
    if (!perfilValue) {
      perfilInfo.classList.remove('show');
      return;
    }
    
    // Obter dados do perfil selecionado
    const description = selectedOption ? selectedOption.getAttribute('data-description') : '';
    const emoji = selectedOption ? selectedOption.textContent.split(' ')[0] : '👤';
    
    // Definir permissões baseadas no perfil
    const permissionsMap = {
      'Administrador': ['🔧 Sistema', '👥 Usuários', '⚙️ Configurações', '📊 Relatórios'],
      'Assessor': ['📄 Processos', '📝 Documentos', '👨‍⚖️ Apoio Magistrado'],
      'Diretor de Central de Atendimento': ['📞 Atendimento', '📋 Distribuição', '👥 Equipe'],
      'Diretor de Secretaria': ['📊 Administração', '👥 Secretaria', '📋 Supervisão'],
      'Estagiário Conhecimento': ['📚 Aprendizado', '📄 Consulta', '🎓 Formação'],
      'Estagiário de Central de Atendimento': ['📞 Atendimento', '📋 Apoio', '🎓 Formação'],
      'Secretário de Audiência': ['⚖️ Audiências', '📝 Atos', '📋 Processuais'],
      'Servidor': ['📄 Processos', '📝 Documentos', '👤 Padrão'],
      'Perito Judicial': ['🔬 Perícias', '📊 Laudos', '⚖️ Técnico']
    };
    
    const permissions = permissionsMap[perfilValue] || ['👤 Acesso Básico'];
    
    // Atualizar elementos
    perfilIcon.textContent = emoji;
    perfilTitle.textContent = perfilValue;
    perfilDescription.textContent = description || 'Perfil de acesso ao sistema';
    
    // Atualizar permissões
    perfilPermissions.innerHTML = '';
    permissions.forEach(permission => {
      const tag = document.createElement('span');
      tag.className = 'permission-tag';
      tag.textContent = permission;
      perfilPermissions.appendChild(tag);
    });
    
    // Mostrar o card com animação
    perfilInfo.classList.add('show');
  }
  
  openServidorV2Modal() {
    const modal = document.getElementById('servidor-v2-modal');
    if (modal) {
      modal.style.display = 'block';
      // Trigger da animação
      setTimeout(() => {
        modal.querySelector('.modern-modal').style.opacity = '1';
      }, 10);
    }
  }
  
  closeServidorV2Modal() {
    const modal = document.getElementById('servidor-v2-modal');
    if (modal) {
      modal.style.display = 'none';
      // Reset do formulário
      document.getElementById('servidor-v2-form').reset();
      // Reset da informação do perfil
      document.getElementById('perfil-description').classList.remove('show');
    }
  }
  
  saveServidorV2() {
    const cpf = document.getElementById('v2-cpf').value;
    const perfil = document.getElementById('v2-perfil').value;
    
    if (!cpf || !perfil) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    // Aqui você pode implementar a lógica de salvamento
    console.log('Salvando servidor V2:', { cpf, perfil });
    
    // Fechar modal após salvar
    this.closeServidorV2Modal();
    
    // Mostrar mensagem de sucesso
    this.showNotification('Servidor configurado com sucesso!', 'success');
  }

  loadServidorV2Config() {
    // Placeholder for V2 config loading
  }

  updateV2StatusIndicator() {
    // Placeholder for V2 status updates
  }

  showFinalReport(relatorio) {
    console.log('Final report:', relatorio);
    this.hideLoading();
    this.showReportModal(relatorio);
  }

  showReportModal(relatorio) {
    // Criar modal de relatório
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'report-modal';
    
    // Calcular estatísticas
    const totalOJs = relatorio.resultados ? relatorio.resultados.length : 0;
    const sucessos = relatorio.resultados ? relatorio.resultados.filter(r => r.status === 'Incluído com Sucesso' || r.status === 'Sucesso').length : 0;
    const jaIncluidos = relatorio.resultados ? relatorio.resultados.filter(r => r.status === 'Já Incluído' || r.status === 'Já Cadastrado').length : 0;
    const erros = relatorio.resultados ? relatorio.resultados.filter(r => r.status === 'Erro').length : 0;
    const percentualSucesso = totalOJs > 0 ? ((sucessos + jaIncluidos) / totalOJs * 100).toFixed(1) : 0;
    
    modal.innerHTML = `
      <div class="modal-content report-modal">
        <div class="modal-header">
          <h2>📊 Relatório de Automação</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Resumo Geral -->
          <div class="report-summary">
            <div class="summary-card success">
              <div class="summary-number">${sucessos}</div>
              <div class="summary-label">Cadastrados com Sucesso</div>
            </div>
            <div class="summary-card info">
              <div class="summary-number">${jaIncluidos}</div>
              <div class="summary-label">Já Cadastrados</div>
            </div>
            <div class="summary-card error">
              <div class="summary-number">${erros}</div>
              <div class="summary-label">Erros</div>
            </div>
            <div class="summary-card total">
              <div class="summary-number">${totalOJs}</div>
              <div class="summary-label">Total de OJs</div>
            </div>
          </div>
          
          <!-- Barra de Progresso -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: ${percentualSucesso}%"></div>
            </div>
            <div class="progress-text">${percentualSucesso}% de sucesso</div>
          </div>
          
          <!-- Lista Detalhada de OJs -->
          <div class="report-details">
            <h3>Detalhes por Órgão Julgador</h3>
            <div class="oj-list">
              ${relatorio.resultados ? relatorio.resultados.map(oj => `
                <div class="oj-item ${this.getStatusClass(oj.status)}">
                  <div class="oj-name">${oj.orgao}</div>
                  <div class="oj-status">
                    <span class="status-badge ${this.getStatusClass(oj.status)}">
                      ${this.getStatusIcon(oj.status)} ${this.getStatusText(oj.status)}
                    </span>
                  </div>
                  ${oj.observacoes ? `<div class="oj-details">${oj.observacoes}</div>` : ''}
                </div>
              `).join('') : '<div class="no-data">Nenhum resultado disponível</div>'}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
          <button class="btn btn-primary" onclick="app.exportReport()">Exportar Relatório</button>
          ${erros > 0 ? '<button class="btn btn-warning" onclick="app.showErrorRecovery()">Tentar Novamente</button>' : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar estilos se não existirem
    this.addReportModalStyles();
  }
  
  getStatusClass(status) {
    if (status === 'Incluído com Sucesso' || status === 'Sucesso') return 'success';
    if (status === 'Já Incluído' || status === 'Já Cadastrado') return 'info';
    if (status === 'Erro') return 'error';
    return 'default';
  }
  
  getStatusIcon(status) {
    if (status === 'Incluído com Sucesso' || status === 'Sucesso') return '✅';
    if (status === 'Já Incluído' || status === 'Já Cadastrado') return 'ℹ️';
    if (status === 'Erro') return '❌';
    return '⚪';
  }
  
  getStatusText(status) {
    if (status === 'Incluído com Sucesso' || status === 'Sucesso') return 'Cadastrado com Sucesso';
    if (status === 'Já Incluído' || status === 'Já Cadastrado') return 'Já Cadastrado';
    if (status === 'Erro') return 'Erro';
    return status;
  }
  
  addReportModalStyles() {
    if (document.getElementById('report-modal-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'report-modal-styles';
    styles.textContent = `
      .report-modal {
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .report-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .summary-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        border-left: 4px solid #ddd;
      }
      
      .summary-card.success { border-left-color: #6b8e58; }
      .summary-card.info { border-left-color: #17a2b8; }
      .summary-card.error { border-left-color: #dc3545; }
      .summary-card.total { border-left-color: #6c757d; }
      
      .summary-number {
        font-size: 2em;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .summary-card.success .summary-number { color: #6b8e58; }
      .summary-card.info .summary-number { color: #17a2b8; }
      .summary-card.error .summary-number { color: #dc3545; }
      .summary-card.total .summary-number { color: #6c757d; }
      
      .summary-label {
        font-size: 0.9em;
        color: #666;
      }
      
      .progress-section {
        margin: 20px 0;
      }
      
      .progress-bar-container {
        background: #e9ecef;
        border-radius: 10px;
        height: 20px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      
      .progress-bar {
        background: linear-gradient(90deg, #6b8e58, #b8956f);
        height: 100%;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        text-align: center;
        font-weight: bold;
        color: #495057;
      }
      
      .report-details h3 {
        margin: 20px 0 15px 0;
        color: #495057;
      }
      
      .oj-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #dee2e6;
        border-radius: 8px;
      }
      
      .oj-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        border-bottom: 1px solid #dee2e6;
        background: #fff;
      }
      
      .oj-item:last-child {
        border-bottom: none;
      }
      
      .oj-item:hover {
        background: #f8f9fa;
      }
      
      .oj-name {
        flex: 1;
        font-weight: 500;
      }
      
      .oj-status {
        margin-left: 15px;
      }
      
      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85em;
        font-weight: 500;
      }
      
      .status-badge.success {
        background: #d4edda;
        color: #155724;
      }
      
      .status-badge.info {
        background: #d1ecf1;
        color: #0c5460;
      }
      
      .status-badge.error {
        background: #f8d7da;
        color: #721c24;
      }
      
      .oj-details {
        font-size: 0.85em;
        color: #666;
        margin-top: 5px;
      }
      
      .no-data {
        text-align: center;
        padding: 40px;
        color: #666;
        font-style: italic;
      }
      
      .modal-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .btn-warning {
        background: #ffc107;
        color: #212529;
        border: 1px solid #ffc107;
      }
      
      .btn-warning:hover {
        background: #e0a800;
        border-color: #d39e00;
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  exportReport() {
    // Implementar exportação do relatório
    this.showNotification('Funcionalidade de exportação será implementada em breve', 'info');
  }
  
  showErrorRecovery() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔄 Recuperação de Erros</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <div class="modal-body">
          <p>Deseja tentar processar novamente os OJs que falharam?</p>
          <div class="alert alert-warning">
            <strong>Atenção:</strong> Esta ação irá reiniciar a automação apenas para os OJs que apresentaram erro.
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="app.restartAutomationForErrors(); this.closest('.modal-overlay').remove();">Tentar Novamente</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  restartAutomationForErrors() {
    this.showNotification('Reiniciando automação para OJs com erro...', 'info');
    // Implementar lógica de restart para erros
    // Por enquanto, apenas mostrar mensagem
    setTimeout(() => {
      this.showNotification('Funcionalidade de recuperação será implementada em breve', 'warning');
    }, 1000);
  }
  
  showAutomationError(errorMessage, context = {}) {
    this.hideLoading();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content error-modal">
        <div class="modal-header error">
          <h2>❌ Erro na Automação</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="error-message">
            <h3>Descrição do Erro:</h3>
            <p>${errorMessage}</p>
          </div>
          
          ${context.servidor ? `
            <div class="error-context">
              <h4>Contexto:</h4>
              <ul>
                <li><strong>Servidor:</strong> ${context.servidor}</li>
                ${context.oj ? `<li><strong>Órgão Julgador:</strong> ${context.oj}</li>` : ''}
                ${context.step ? `<li><strong>Etapa:</strong> ${context.step}</li>` : ''}
              </ul>
            </div>
          ` : ''}
          
          <div class="error-actions">
            <h4>O que você pode fazer:</h4>
            <ul>
              <li>Verificar a conexão com a internet</li>
              <li>Verificar se o servidor está acessível</li>
              <li>Tentar novamente a automação</li>
              <li>Verificar os logs para mais detalhes</li>
            </ul>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
          <button class="btn btn-primary" onclick="app.restartAutomation(); this.closest('.modal-overlay').remove();">Tentar Novamente</button>
          <button class="btn btn-info" onclick="app.showLogs()">Ver Logs</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.addErrorModalStyles();
  }
  
  addErrorModalStyles() {
    if (document.getElementById('error-modal-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'error-modal-styles';
    styles.textContent = `
      .error-modal {
        max-width: 600px;
      }
      
      .modal-header.error {
        background: #f8d7da;
        color: #721c24;
        border-bottom: 1px solid #f5c6cb;
      }
      
      .error-message {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .error-message h3 {
        margin-top: 0;
        color: #721c24;
      }
      
      .error-message p {
        margin-bottom: 0;
        color: #721c24;
      }
      
      .error-context {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .error-context h4 {
        margin-top: 0;
        color: #856404;
      }
      
      .error-context ul {
        margin-bottom: 0;
        color: #856404;
      }
      
      .error-actions {
        background: #d1ecf1;
        border: 1px solid #bee5eb;
        border-radius: 4px;
        padding: 15px;
      }
      
      .error-actions h4 {
        margin-top: 0;
        color: #0c5460;
      }
      
      .error-actions ul {
        margin-bottom: 0;
        color: #0c5460;
      }
      
      .btn-info {
        background: #17a2b8;
        color: white;
        border: 1px solid #17a2b8;
      }
      
      .btn-info:hover {
        background: #138496;
        border-color: #117a8b;
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  restartAutomation() {
    this.showNotification('Reiniciando automação...', 'info');
    // Implementar lógica de restart completo
    setTimeout(() => {
      this.showNotification('Funcionalidade de reinício será implementada em breve', 'warning');
    }, 1000);
  }
  
  showLogs() {
    this.showNotification('Abrindo logs do sistema...', 'info');
    // Implementar visualização de logs
    setTimeout(() => {
      this.showNotification('Funcionalidade de logs será implementada em breve', 'warning');
    }, 1000);
  }

  // Métodos para gerenciar o dashboard de processamento paralelo
  showParallelDashboard() {
    const dashboard = document.getElementById('parallel-dashboard');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      this.setupParallelDashboardListeners();
    }
  }

  hideParallelDashboard() {
    const dashboard = document.getElementById('parallel-dashboard');
    if (dashboard) {
      dashboard.classList.add('hidden');
    }
  }

  setupParallelDashboardListeners() {
    const pauseBtn = document.getElementById('parallel-pause-btn');
    const stopBtn = document.getElementById('parallel-stop-btn');

    if (pauseBtn) {
      pauseBtn.onclick = () => this.pauseAllParallelInstances();
    }

    if (stopBtn) {
      stopBtn.onclick = () => this.stopAllParallelInstances();
    }
  }

  updateParallelDashboard(data) {
    // Atualizar contadores
    const instancesCount = document.getElementById('parallel-instances-count');
    const totalProgress = document.getElementById('parallel-total-progress');
    const overallProgressFill = document.getElementById('overall-progress-fill');
    const overallProgressText = document.getElementById('overall-progress-text');
    const elapsedTime = document.getElementById('parallel-elapsed-time');
    const estimatedTime = document.getElementById('parallel-estimated-time');
    const speed = document.getElementById('parallel-speed');

    if (data.instances && instancesCount) {
      instancesCount.textContent = data.instances.length;
    }

    if (data.totalServers && data.completedServers && totalProgress) {
      totalProgress.textContent = `${data.completedServers}/${data.totalServers}`;
    }

    // Atualizar progresso geral
    if (data.overallProgress !== undefined) {
      const percentage = Math.round(data.overallProgress);
      if (overallProgressFill) {
        overallProgressFill.style.width = `${percentage}%`;
      }
      if (overallProgressText) {
        overallProgressText.textContent = `${percentage}%`;
      }
    }

    // Atualizar estatísticas
    if (data.elapsedTime && elapsedTime) {
      elapsedTime.textContent = this.formatTime(data.elapsedTime);
    }

    if (data.estimatedTime && estimatedTime) {
      estimatedTime.textContent = this.formatTime(data.estimatedTime);
    }

    if (data.speed && speed) {
      speed.textContent = `${data.speed.toFixed(1)} serv/min`;
    }

    // Atualizar instâncias
    this.updateParallelInstances(data.instances || []);
  }

  updateParallelInstances(instances) {
    const container = document.getElementById('parallel-instances');
    if (!container) return;

    container.innerHTML = '';

    instances.forEach((instance, index) => {
      const instanceElement = this.createInstanceElement(instance, index);
      container.appendChild(instanceElement);
    });
  }

  createInstanceElement(instance, index) {
    const div = document.createElement('div');
    div.className = 'instance-item';
    div.innerHTML = `
      <div class="instance-header">
        <div class="instance-title">Instância ${index + 1}</div>
        <div class="instance-status ${instance.status}">${this.getInstanceStatusText(instance.status)}</div>
      </div>
      <div class="instance-progress">
        <div class="instance-progress-bar">
          <div class="instance-progress-fill" style="width: ${instance.progress || 0}%"></div>
        </div>
        <div class="instance-progress-text">${Math.round(instance.progress || 0)}%</div>
      </div>
      <div class="instance-details">
        <div>Servidor: ${instance.currentServer || 'Aguardando...'}</div>
        <div>Processados: ${instance.completed || 0}/${instance.total || 0}</div>
        <div>Tempo: ${this.formatTime(instance.elapsedTime || 0)}</div>
      </div>
    `;
    return div;
  }

  getInstanceStatusText(status) {
    const statusMap = {
      'running': 'Executando',
      'paused': 'Pausado',
      'error': 'Erro',
      'completed': 'Concluído',
      'waiting': 'Aguardando'
    };
    return statusMap[status] || status;
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  pauseAllParallelInstances() {
    // Implementar lógica para pausar todas as instâncias
    this.showNotification('Pausando todas as instâncias...', 'info');
    // Aqui seria chamada a função do backend para pausar
  }

  stopAllParallelInstances() {
    if (confirm('Tem certeza que deseja parar todo o processamento paralelo?')) {
      this.hideParallelDashboard();
      this.stopServidorAutomation();
      this.showNotification('Processamento paralelo interrompido', 'warning');
    }
  }

  // Métodos para o modal de servidores processados
  switchServerTab(tabName) {
    return switchServerTab(tabName);
  }

  closeProcessedServersModal() {
    return closeProcessedServersModal();
  }

  exportProcessedServers() {
    return exportProcessedServers();
  }
}

// Classe para gerenciar seletores de órgãos julgadores
class OJSelector {
  constructor(containerId, searchInputId, options = {}) {
    this.container = document.getElementById(containerId);
    this.searchInput = document.getElementById(searchInputId);
    this.options = {
      placeholder: 'Selecione um órgão julgador...',
      searchPlaceholder: 'Digite para buscar...',
      maxHeight: '300px',
      ...options
    };
    
    this.selectedValue = null;
    this.selectedText = null;
    this.isOpen = false;
    this.filteredOptions = [];
    this.highlightedIndex = -1;
    
    this.init();
  }
  
  init() {
    if (!this.container || !this.searchInput) {
      console.error('OJSelector: Container ou input de busca não encontrado');
      return;
    }
    
    this.createStructure();
    this.setupEventListeners();
    this.loadOptions();
  }
  
  createStructure() {
    this.container.innerHTML = `
      <div class="oj-selector-wrapper">
        <div class="oj-selector-display" tabindex="0">
          <span class="oj-selector-text">${this.options.placeholder}</span>
          <span class="oj-selector-arrow">▼</span>
        </div>
        <div class="oj-selector-dropdown" style="display: none; max-height: ${this.options.maxHeight}; overflow-y: auto;">
          <div class="oj-selector-search">
            <input type="text" placeholder="${this.options.searchPlaceholder}" class="oj-search-input">
          </div>
          <div class="oj-selector-options"></div>
        </div>
      </div>
    `;
    
    this.display = this.container.querySelector('.oj-selector-display');
    this.dropdown = this.container.querySelector('.oj-selector-dropdown');
    this.searchInputInternal = this.container.querySelector('.oj-search-input');
    this.optionsContainer = this.container.querySelector('.oj-selector-options');
    this.textElement = this.container.querySelector('.oj-selector-text');
    this.arrowElement = this.container.querySelector('.oj-selector-arrow');
  }
  
  setupEventListeners() {
    // Toggle dropdown
    this.display.addEventListener('click', () => this.toggle());
    this.display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Search functionality
    this.searchInputInternal.addEventListener('input', (e) => {
      this.filterOptions(e.target.value);
    });
    
    this.searchInputInternal.addEventListener('keydown', (e) => {
      this.handleKeyNavigation(e);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
    
    // Sync with external search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filterOptions(e.target.value);
        this.searchInputInternal.value = e.target.value;
      });
    }
  }
  
  loadOptions() {
    if (!window.ojList || !Array.isArray(window.ojList)) {
      console.warn('OJSelector: Lista de OJs não encontrada');
      return;
    }
    
    this.allOptions = window.ojList.map(oj => ({
      value: oj,
      text: oj,
      searchText: oj.toLowerCase()
    }));
    
    this.filteredOptions = [...this.allOptions];
    this.renderOptions();
  }
  
  filterOptions(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredOptions = [...this.allOptions];
    } else {
      this.filteredOptions = this.allOptions.filter(option => 
        option.searchText.includes(term)
      );
    }
    
    this.highlightedIndex = -1;
    this.renderOptions();
  }
  
  renderOptions() {
    if (!this.optionsContainer) return;
    
    if (this.filteredOptions.length === 0) {
      this.optionsContainer.innerHTML = '<div class="oj-option oj-no-results">Nenhum resultado encontrado</div>';
      return;
    }
    
    this.optionsContainer.innerHTML = this.filteredOptions
      .map((option, index) => `
        <div class="oj-option" data-value="${option.value}" data-index="${index}">
          ${option.text}
        </div>
      `)
      .join('');
    
    // Add click listeners to options
    this.optionsContainer.querySelectorAll('.oj-option').forEach((optionEl, index) => {
      if (!optionEl.classList.contains('oj-no-results')) {
        optionEl.addEventListener('click', () => {
          this.selectOption(this.filteredOptions[index]);
        });
        
        optionEl.addEventListener('mouseenter', () => {
          this.highlightedIndex = index;
          this.updateHighlight();
        });
      }
    });
  }
  
  selectOption(option) {
    this.selectedValue = option.value;
    this.selectedText = option.text;
    this.textElement.textContent = option.text;
    this.textElement.title = option.text;
    
    // Update external search input
    if (this.searchInput) {
      this.searchInput.value = option.text;
      this.searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    this.close();
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('oj-selected', {
      detail: { value: option.value, text: option.text }
    }));
  }
  
  handleKeyNavigation(e) {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
      this.updateHighlight();
      break;
        
    case 'ArrowUp':
      e.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
      this.updateHighlight();
      break;
        
    case 'Enter':
      e.preventDefault();
      if (this.highlightedIndex >= 0 && this.filteredOptions[this.highlightedIndex]) {
        this.selectOption(this.filteredOptions[this.highlightedIndex]);
      }
      break;
        
    case 'Escape':
      this.close();
      break;
    }
  }
  
  updateHighlight() {
    const options = this.optionsContainer.querySelectorAll('.oj-option:not(.oj-no-results)');
    options.forEach((option, index) => {
      option.classList.toggle('highlighted', index === this.highlightedIndex);
    });
    
    // Scroll highlighted option into view
    if (this.highlightedIndex >= 0 && options[this.highlightedIndex]) {
      options[this.highlightedIndex].scrollIntoView({ block: 'nearest' });
    }
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.isOpen = true;
    this.dropdown.style.display = 'block';
    this.arrowElement.textContent = '▲';
    this.searchInputInternal.focus();
    
    // Reset search
    this.searchInputInternal.value = '';
    this.filterOptions('');
  }
  
  close() {
    this.isOpen = false;
    this.dropdown.style.display = 'none';
    this.arrowElement.textContent = '▼';
    this.highlightedIndex = -1;
  }
  
  setValue(value) {
    const option = this.allOptions.find(opt => opt.value === value);
    if (option) {
      this.selectOption(option);
    }
  }
  
  getValue() {
    return this.selectedValue;
  }
  
  getText() {
    return this.selectedText;
  }
  
  clear() {
    this.selectedValue = null;
    this.selectedText = null;
    this.textElement.textContent = this.options.placeholder;
    this.textElement.title = '';
    
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    this.close();
  }
  
  refresh() {
    this.loadOptions();
  }
}

// Initialize the app
const app = new PeritoApp();

// Make app globally available for onclick handlers
window.app = app;

// ===== PROCESSED SERVERS MODAL =====
let processedServers = [];
let processingServers = [];
let processingStartTime = null;
let currentActiveTab = 'processing';

// Função para mostrar o modal de servidores processados
function showProcessedServersModal() {
  console.log('showProcessedServersModal chamada');
  const modal = document.getElementById('processed-servers-modal');
  console.log('Modal encontrado:', modal);
  if (!modal) {
    console.error('Modal processed-servers-modal não encontrado!');
    return;
  }
  console.log('Chamando updateAllServersDisplay...');
  updateAllServersDisplay();
  console.log('Exibindo modal...');
  modal.style.display = 'block';
  console.log('Modal exibido com sucesso');
}

// Função para fechar o modal de servidores processados
function closeProcessedServersModal() {
  const modal = document.getElementById('processed-servers-modal');
  modal.style.display = 'none';
}

// Função para alternar entre abas
function switchServerTab(tabName) {
  // Remover classe active de todas as abas
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.classList.remove('active');
  });
    
  // Ocultar todos os painéis
  document.querySelectorAll('.server-panel').forEach(panel => {
    panel.classList.remove('active');
  });
    
  // Ativar aba e painel selecionados baseado no nome correto
  if (tabName === 'processing') {
    // Ativar aba "Em Processamento"
    document.querySelector('.tab-button[onclick*="processing"]').classList.add('active');
    document.getElementById('processing-servers-panel').classList.add('active');
  } else if (tabName === 'completed') {
    // Ativar aba "Processados com Sucesso"
    document.querySelector('.tab-button[onclick*="completed"]').classList.add('active');
    document.getElementById('completed-servers-panel').classList.add('active');
  }
    
  currentActiveTab = tabName;
    
  // Atualizar display do painel ativo
  if (tabName === 'completed') {
    updateProcessedServersDisplay();
  } else {
    updateProcessingServersDisplay();
  }
}

// Função para adicionar servidor processado
function addProcessedServer(serverData) {
  const processedServer = {
    id: Date.now() + Math.random(),
    name: serverData.name || 'Servidor não identificado',
    cpf: serverData.cpf || '',
    perfil: serverData.perfil || '',
    ojsCount: serverData.ojsCount || 0,
    processedAt: new Date(),
    processingTime: serverData.processingTime || 0
  };
    
  processedServers.push(processedServer);
    
  // Remover da lista de processamento se existir
  processingServers = processingServers.filter(server => server.cpf !== serverData.cpf);
    
  // Atualizar display se o modal estiver aberto
  const modal = document.getElementById('processed-servers-modal');
  if (modal && modal.style.display === 'block') {
    updateAllServersDisplay();
  }
}

// Função para adicionar servidor em processamento
function addProcessingServer(serverData) {
  const processingServer = {
    id: Date.now() + Math.random(),
    name: serverData.name || 'Servidor não identificado',
    cpf: serverData.cpf || '',
    perfil: serverData.perfil || '',
    startedAt: new Date(),
    currentOJ: serverData.currentOJ || 'Iniciando...'
  };
    
  // Verificar se já não está na lista
  const exists = processingServers.find(server => server.cpf === serverData.cpf);
  if (!exists) {
    processingServers.push(processingServer);
        
    // Atualizar display se o modal estiver aberto
    const modal = document.getElementById('processed-servers-modal');
    if (modal && modal.style.display === 'block') {
      updateAllServersDisplay();
    }
  }
}

// Função para atualizar servidor em processamento
function updateProcessingServer(cpf, updateData) {
  const server = processingServers.find(s => s.cpf === cpf);
  if (server) {
    Object.assign(server, updateData);
        
    // Atualizar display se o modal estiver aberto e na aba de processamento
    const modal = document.getElementById('processed-servers-modal');
    if (modal && modal.style.display === 'block' && currentActiveTab === 'processing') {
      updateProcessingServersDisplay();
    }
  }
}

// Função para atualizar todos os displays
function updateAllServersDisplay() {
  updateProcessedServersDisplay();
  updateProcessingServersDisplay();
}

// Função para atualizar o display do painel de processados
function updateProcessedServersDisplay() {
  updateProcessedServersSummary();
  renderProcessedServersList();
}

// Função para atualizar o display do painel de processamento
function updateProcessingServersDisplay() {
  updateProcessingServersSummary();
  renderProcessingServersList();
}

// Função para atualizar o resumo estatístico dos processados
function updateProcessedServersSummary() {
  const totalProcessed = processedServers.length;
  const totalOJs = processedServers.reduce((sum, server) => sum + server.ojsCount, 0);
  const totalTime = calculateTotalProcessingTime();
    
  document.getElementById('total-processed-count').textContent = totalProcessed;
  document.getElementById('total-ojs-processed').textContent = totalOJs;
  document.getElementById('processing-time').textContent = formatProcessingTime(totalTime);
}

// Função para atualizar o resumo estatístico dos em processamento
function updateProcessingServersSummary() {
  const totalServers = processingServers.length;
  const avgTime = processingServers.length > 0 ? 
    processingServers.reduce((sum, server) => {
      const elapsed = Math.floor((new Date() - server.startedAt) / 1000);
      return sum + elapsed;
    }, 0) / processingServers.length : 0;
    
  document.getElementById('total-processing-count').textContent = totalServers;
  document.getElementById('current-processing-time').textContent = formatProcessingTime(avgTime);
  document.getElementById('processing-progress').textContent = totalServers > 0 ? '100%' : '0%';
}

// Função para calcular tempo total de processamento
function calculateTotalProcessingTime() {
  if (!processingStartTime || processedServers.length === 0) return 0;
    
  const lastProcessed = processedServers[processedServers.length - 1];
  return Math.floor((lastProcessed.processedAt - processingStartTime) / 1000);
}

// Função para renderizar a lista de servidores
function renderProcessedServersList() {
  const container = document.getElementById('processed-servers-container');
  const searchInput = document.getElementById('server-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
  const filteredServers = processedServers.filter(server => 
    server.name.toLowerCase().includes(searchTerm) ||
        server.cpf.includes(searchTerm) ||
        server.perfil.toLowerCase().includes(searchTerm)
  );
    
  if (filteredServers.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h4>Nenhum servidor processado</h4>
                <p>Os servidores processados com sucesso aparecerão aqui.</p>
            </div>
        `;
    return;
  }
    
  container.innerHTML = filteredServers.map(server => `
        <div class="server-item">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="server-info">
                <div class="server-name">${server.name}</div>
                <div class="server-details">
                    CPF: ${server.cpf} | Perfil: ${server.perfil}
                </div>
            </div>
            <div class="server-stats">
                <div>
                    <span class="oj-count">${server.ojsCount}</span> OJs
                </div>
                <div class="processing-time">
                    ${formatProcessingTime(server.processingTime)}
                </div>
            </div>
        </div>
    `).join('');
}

// Função para renderizar a lista de servidores em processamento
function renderProcessingServersList() {
  const container = document.getElementById('processing-servers-container');
  const searchInput = document.getElementById('processing-server-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
  const filteredServers = processingServers.filter(server => 
    server.name.toLowerCase().includes(searchTerm) ||
        server.cpf.includes(searchTerm) ||
        server.perfil.toLowerCase().includes(searchTerm)
  );
    
  if (filteredServers.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h4>Nenhum servidor em processamento</h4>
                <p>Os servidores que estão sendo processados aparecerão aqui.</p>
            </div>
        `;
    return;
  }
    
  container.innerHTML = filteredServers.map(server => {
    const elapsed = Math.floor((new Date() - server.startedAt) / 1000);
    return `
            <div class="server-item">
                <div class="processing-icon">
                    <i class="fas fa-spinner"></i>
                </div>
                <div class="server-info">
                    <div class="server-name">${server.name}</div>
                    <div class="server-details">
                        CPF: ${server.cpf} | Perfil: ${server.perfil}
                    </div>
                    <div class="server-details">
                        Processando: ${server.currentOJ || 'Iniciando...'}
                    </div>
                </div>
                <div class="server-stats">
                    <div class="processing-time">
                        ${formatProcessingTime(elapsed)}
                    </div>
                </div>
            </div>
        `;
  }).join('');
}

// Função para exportar lista de servidores processados
function exportProcessedServers() {
  const data = {
    timestamp: new Date().toISOString(),
    summary: {
      totalProcessed: processedServers.length,
      totalOJs: processedServers.reduce((sum, server) => sum + server.ojsCount, 0),
      totalProcessingTime: calculateTotalProcessingTime()
    },
    servers: processedServers.map(server => ({
      name: server.name,
      cpf: server.cpf,
      perfil: server.perfil,
      ojsCount: server.ojsCount,
      processedAt: server.processedAt.toISOString(),
      processingTime: server.processingTime
    }))
  };
    
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `servidores-processados-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Função para iniciar o tracking de tempo de processamento
function startProcessingTimer() {
  processingStartTime = new Date();
  processedServers = []; // Reset da lista
}

// Função para formatar tempo em HH:MM:SS
function formatProcessingTime(seconds) {
  if (!seconds || seconds < 0) return '--:--:--';
    
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
    
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Adicionar event listeners para o modal
document.addEventListener('DOMContentLoaded', () => {
  // Botão para mostrar servidores processados
  const showProcessedBtn = document.getElementById('show-processed-servers');
  console.log('Botão Ver Processados encontrado:', showProcessedBtn);
  if (showProcessedBtn) {
    showProcessedBtn.addEventListener('click', () => {
      console.log('Botão Ver Processados clicado!');
      showProcessedServersModal();
    });
    console.log('Event listener adicionado ao botão Ver Processados');
  } else {
    console.error('Botão show-processed-servers não encontrado!');
  }
    
  // Fechar modal ao clicar no X
  const modal = document.getElementById('processed-servers-modal');
  if (modal) {
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeProcessedServersModal);
    }
        
    // Fechar modal ao clicar fora dele
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProcessedServersModal();
      }
    });
  }
    
  // Search functionality for processed servers
  const searchInput = document.getElementById('server-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProcessedServersList();
    });
  }
    
  // Search functionality for processing servers
  const processingSearchInput = document.getElementById('processing-server-search');
  if (processingSearchInput) {
    processingSearchInput.addEventListener('input', () => {
      renderProcessingServersList();
    });
  }
    
  // Tab switching functionality
  const processedTab = document.getElementById('processed-tab');
  const processingTab = document.getElementById('processing-tab');
    
  if (processedTab) {
    processedTab.addEventListener('click', () => switchServerTab('processed'));
  }
    
  if (processingTab) {
    processingTab.addEventListener('click', () => switchServerTab('processing'));
  }
});

// Expor funções globalmente
window.showProcessedServersModal = showProcessedServersModal;
window.closeProcessedServersModal = closeProcessedServersModal;
window.switchServerTab = switchServerTab;
window.addProcessedServer = addProcessedServer;
window.addProcessingServer = addProcessingServer;
window.updateProcessingServer = updateProcessingServer;
window.exportProcessedServers = exportProcessedServers;
window.startProcessingTimer = startProcessingTimer;