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
    });
    
    // Listen for automation reports
    window.electronAPI.onAutomationReport((data) => {
      if (data.type === 'final-report') {
        this.showFinalReport(data.relatorio);
      } else if (data.type === 'error') {
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
    
    // Iniciar timer
    this.startAutomationTimer();
        
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
    const currentCpf = document.getElementById('current-cpf');
    const currentPerfil = document.getElementById('current-perfil');
    const ojProgress = document.getElementById('oj-progress');
    const loadingServidor = document.getElementById('loading-servidor');
    const loadingOj = document.getElementById('loading-oj');
        
    loadingTitle.textContent = title;
    loadingSubtitle.textContent = subtitle;
    
    // Inicializar elementos do CPF, perfil e contador de OJs
    if (currentCpf) {
      currentCpf.textContent = '---.--.------';
    }
    
    if (currentPerfil) {
      currentPerfil.textContent = '---';
    }
    
    // Calcular total de OJs para o contador
    let totalOjs = 0;
    if (this.selectedPeritos && this.selectedPeritos.length > 0) {
      const selectedPeritosList = this.selectedPeritos.map(index => this.peritos[index]);
      totalOjs = selectedPeritosList.reduce((total, perito) => total + (perito.ojs ? perito.ojs.length : 0), 0);
    } else if (this.selectedServidores && this.selectedServidores.length > 0) {
      const selectedServidoresList = this.selectedServidores.map(index => this.servidores[index]);
      totalOjs = selectedServidoresList.reduce((total, servidor) => total + (servidor.ojs ? servidor.ojs.length : 0), 0);
    }
    
    if (ojProgress) {
      ojProgress.textContent = `OJs processadas: 0/${totalOjs}`;
    }
    
    // Inicializar elementos de servidor e OJ
    if (loadingServidor) {
      loadingServidor.textContent = 'Servidor: ---';
      loadingServidor.style.display = 'block';
    }
    
    if (loadingOj) {
      loadingOj.textContent = 'OJ: ---';
      loadingOj.style.display = 'block';
    }
    
    // Resetar contadores
    this.currentOjCount = 0;
    this.totalOjCount = totalOjs;
    
    // Funcionalidade de pausar removida
    
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.remove('hidden');
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'none';
    loadingOverlay.classList.add('hidden');
    
    // Funcionalidade de pausar removida
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
      
      // Verificar se todas as OJs foram processadas e exibir alerta
      if (this.currentOjCount === this.totalOjCount && this.totalOjCount > 0 && data.orgaoJulgador === 'Finalizado') {
        setTimeout(() => {
          alert(`Processamento finalizado com sucesso!\n\nTotal de OJs processadas: ${this.totalOjCount}`);
        }, 500);
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

  setupServidorV2Listeners() {
    // Event listener para mudança do perfil
    const perfilSelect = document.getElementById('v2-perfil');
    const perfilInfo = document.getElementById('perfil-description');
    
    if (perfilSelect && perfilInfo) {
      perfilSelect.addEventListener('change', (e) => {
        this.updatePerfilInfo(e.target.value, e.target.selectedOptions[0]);
      });
      
      // Inicializar com o valor padrão (Assessor)
      if (perfilSelect.value) {
        this.updatePerfilInfo(perfilSelect.value, perfilSelect.selectedOptions[0]);
      }
    }
    
    // Event listener para abrir o modal servidor-v2
    const openV2ModalBtn = document.getElementById('open-servidor-v2-modal');
    if (openV2ModalBtn) {
      openV2ModalBtn.addEventListener('click', () => {
        this.openServidorV2Modal();
      });
    }
    
    // Event listener para fechar o modal servidor-v2
    const closeV2ModalBtn = document.querySelector('#servidor-v2-modal .close');
    if (closeV2ModalBtn) {
      closeV2ModalBtn.addEventListener('click', () => {
        this.closeServidorV2Modal();
      });
    }
    
    // Event listener para submit do formulário servidor-v2
    const v2Form = document.getElementById('servidor-v2-form');
    if (v2Form) {
      v2Form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveServidorV2();
      });
    }
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
          ${erros > 0 ? `<button class="btn btn-warning" onclick="app.showErrorRecovery()">Tentar Novamente</button>` : ''}
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
      
      .summary-card.success { border-left-color: #28a745; }
      .summary-card.info { border-left-color: #17a2b8; }
      .summary-card.error { border-left-color: #dc3545; }
      .summary-card.total { border-left-color: #6c757d; }
      
      .summary-number {
        font-size: 2em;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .summary-card.success .summary-number { color: #28a745; }
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
        background: linear-gradient(90deg, #28a745, #20c997);
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
}

// Initialize the app
const app = new PeritoApp();

// Make app globally available for onclick handlers
window.app = app;