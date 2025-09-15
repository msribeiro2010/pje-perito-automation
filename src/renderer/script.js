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
    
    // Sistema de normalização de OJs
    this.normalizedOJs = new Map(); // Mapa para normalização de OJs
    this.ojsData = []; // Dados do arquivo ojs1g.json
    this.ojsSearchIndex = new Map(); // Índice para busca rápida
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadPeritos();
    await this.loadServidores();
    await this.loadConfig();
    await this.loadOJs(); // Carregar lista de OJs
    await this.loadNormalizedOJs(); // Carregar dados de normalização de OJs
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

    // Garantir abas padrão visíveis ao iniciar
    this.switchTab('peritos');
    this.switchConfigTab('pje');

    // Toggle "Mostrar todas as seções"
    const toggleShowAll = document.getElementById('toggleShowAll');
    if (toggleShowAll) {
      const applyToggle = () => {
        if (toggleShowAll.checked) {
          document.body.classList.add('show-all-tabs');
        } else {
          document.body.classList.remove('show-all-tabs');
        }
      };
      toggleShowAll.addEventListener('change', applyToggle);
      // persiste estado em localStorage
      const saved = localStorage.getItem('showAllTabs') === 'true';
      toggleShowAll.checked = saved;
      applyToggle();
      toggleShowAll.addEventListener('change', () => {
        localStorage.setItem('showAllTabs', toggleShowAll.checked ? 'true' : 'false');
      });
    }
    
    // Log de inicialização do sistema de normalização
    if (this.ojsData.length > 0) {
      console.log('✅ Sistema de normalização de OJs carregado com sucesso!');
      console.log(`📊 ${this.ojsData.length} OJs disponíveis para normalização`);
      console.log('\n🧪 Funções disponíveis para teste:');
      console.log('  • testOJNormalization() - Executa testes automáticos');
      console.log('  • normalizeOJ("nome do oj") - Normaliza um OJ específico');
      console.log('  • checkExistingOJs("cpf", ["oj1", "oj2"]) - Verifica OJs já cadastrados');
      console.log('  • processServerWithCheck({cpf, ojs: []}) - Processa servidor com verificação');
      console.log('  • displayOJStatus(result) - Mostra status visual dos OJs');
    } else {
      console.warn('⚠️ Sistema de normalização não foi carregado corretamente');
    }
        
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
    const tabButtons = document.querySelectorAll('.tab-button');
    console.log(`[DEBUG] Tabs encontrados: ${tabButtons.length}`);
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.currentTarget?.dataset?.tab || e.target?.dataset?.tab;
        console.log('[DEBUG] Clique na aba principal:', tab);
        this.switchTab(tab);
      });
    });

    // Event listeners para abas de configuração
    const configButtons = document.querySelectorAll('.config-tab-button');
    console.log(`[DEBUG] Sub-abas de configuração encontradas: ${configButtons.length}`);
    configButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.currentTarget?.dataset?.configTab || e.target?.dataset?.configTab;
        console.log('[DEBUG] Clique na sub-aba de configuração:', tab);
        this.switchConfigTab(tab);
      });
    });

    // Perito management
    document.getElementById('add-perito')?.addEventListener('click', () => {
      this.openPeritoModal();
    });

    document.getElementById('import-peritos')?.addEventListener('click', () => {
      this.importPeritos();
    });



    document.getElementById('show-import-example')?.addEventListener('click', () => {
      this.showImportExample();
    });

    document.getElementById('bulk-delete-peritos')?.addEventListener('click', () => {
      this.bulkDeletePeritos();
    });

    // Servidor management
    document.getElementById('add-servidor')?.addEventListener('click', () => {
      this.openServidorModal();
    });

    document.getElementById('import-servidores-bulk')?.addEventListener('click', () => {
      this.importServidores();
    });

    document.getElementById('servidor-import-example')?.addEventListener('click', () => {
      this.showServidorImportExample();
    });

    document.getElementById('bulk-delete-servidores')?.addEventListener('click', () => {
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

    document.getElementById('cancel-perito')?.addEventListener('click', () => {
      this.closePeritoModal();
    });

    document.getElementById('cancel-servidor')?.addEventListener('click', () => {
      this.closeServidorModal();
    });

    document.getElementById('perito-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePeito();
    });

    document.getElementById('servidor-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveServidor();
    });

    // Config form
    document.getElementById('config-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfig();
    });

    // Database config form
    document.getElementById('database-config-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveDatabaseConfig();
    });

    // Test database connection
    document.getElementById('testDbConnection')?.addEventListener('click', () => {
      this.testDatabaseConnection();
    });

    // Event listeners para novas abas de configuração
    document.getElementById('carregarOjs1Grau')?.addEventListener('click', () => {
      this.buscarOJsDoBanco('1');
    });

    document.getElementById('buscarTodasOjs1Grau')?.addEventListener('click', () => {
      this.buscarTodasOJsDoBanco('1');
    });

    document.getElementById('carregarOjs2Grau')?.addEventListener('click', () => {
      this.buscarOJsDoBanco('2');
    });

    document.getElementById('buscarTodasOjs2Grau')?.addEventListener('click', () => {
      this.buscarTodasOJsDoBanco('2');
    });

    document.getElementById('testarConexao1Grau')?.addEventListener('click', () => {
      this.testarConectividadeBanco();
    });

    document.getElementById('testarConexao2Grau')?.addEventListener('click', () => {
      this.testarConectividadeBanco();
    });

    document.getElementById('exportarOjs1Grau')?.addEventListener('click', () => {
      this.exportarOJsJSON('1');
    });

    document.getElementById('exportarOjs2Grau')?.addEventListener('click', () => {
      this.exportarOJsJSON('2');
    });

    // Processos - buscar por número
    const buscarProcessoBtn = document.getElementById('buscarProcessoBtn');
    buscarProcessoBtn?.addEventListener('click', () => {
      this.buscarProcesso();
    });

    document.getElementById('buscarServidores')?.addEventListener('click', () => {
      this.buscarServidores();
    });

    document.getElementById('limparFiltrosServidores')?.addEventListener('click', () => {
      this.limparFiltrosServidores();
    });

    document.getElementById('exportarServidores')?.addEventListener('click', () => {
      this.exportarDados('servidores', this.servidoresData || []);
    });

    // Event listeners para filtros de servidores
    document.querySelectorAll('input[name="grauServidor"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.atualizarFiltroGrau();
      });
    });

    // Event listeners para busca ao digitar (debounced)
    let searchTimeout;
    const setupSearchListener = (elementId, callback) => {
      document.getElementById(elementId).addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          callback(e.target.value);
        }, 500);
      });
    };

    setupSearchListener('filtroNomeServidor', () => this.buscarServidores(true));

    // Select all checkboxes
    document.getElementById('select-all')?.addEventListener('change', (e) => {
      this.selectAllPeritos(e.target.checked);
    });

    document.getElementById('select-all-servidores')?.addEventListener('change', (e) => {
      this.selectAllServidores(e.target.checked);
    });

    // Automation
    document.getElementById('start-automation')?.addEventListener('click', () => {
      this.startAutomation();
    });

    document.getElementById('stop-automation')?.addEventListener('click', () => {
      this.stopAutomation();
    });

    document.getElementById('start-servidor-automation')?.addEventListener('click', () => {
      this.startServidorAutomation();
    });

    document.getElementById('stop-servidor-automation')?.addEventListener('click', () => {
      this.stopServidorAutomation();
    });

    // Novos botões de pausar/reiniciar
    document.getElementById('pause-resume-automation')?.addEventListener('click', () => {
      this.togglePauseAutomation();
    });

    document.getElementById('pause-resume-servidor-automation')?.addEventListener('click', () => {
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
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Update tab content (somente via classe, CSS controla visibilidade)
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const content = document.getElementById(tabName);
    if (content) content.classList.add('active');
  }

  switchConfigTab(tabName) {
    // Update config tab buttons
    document.querySelectorAll('.config-tab-button').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-config-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Update config tab content
    document.querySelectorAll('.config-section').forEach(section => section.classList.remove('active'));
    const section = document.getElementById(`${tabName}-config`);
    if (section) section.classList.add('active');

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

    // Processar e normalizar OJs
    const ojs = ojsText ? 
      ojsText.split('\n')
        .map(oj => oj.trim())
        .filter(oj => oj)
        .map(oj => this.normalizeOJName(oj))
        .filter(oj => oj) // Remover nulls/vazios após normalização
      : [];
        
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
            // Normalizar OJs se existirem
            if (perito.ojs && Array.isArray(perito.ojs)) {
              perito.ojs = perito.ojs
                .map(oj => this.normalizeOJName(oj))
                .filter(oj => oj); // Remover nulls/vazios após normalização
            }
            
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
  
  // ===== PROCESSOS METHODS =====
  async buscarProcesso() {
    try {
      const numero = (document.getElementById('nrProcessoInput').value || '').trim();
      const grau = document.getElementById('grauProcessoSelect').value || '1';

      if (!numero) {
        this.showNotification('Informe o número do processo', 'warning');
        return;
      }

      // Mostrar status carregando
      const statusEl = document.getElementById('statusProcessos');
      const resultadoEl = document.getElementById('resultadoProcessos');
      if (statusEl) statusEl.classList.remove('hidden');
      if (resultadoEl) resultadoEl.classList.add('hidden');

      // Buscar dados em paralelo
      const resp = await window.electronAPI.buscarProcessoInfo(numero, grau);
      if (!resp || !resp.success) {
        throw new Error(resp && resp.error ? resp.error : 'Falha na consulta');
      }

      const { tarefaAtual, historico, partes } = resp.data || { tarefaAtual: [], historico: [], partes: [] };
      this.renderProcessoResultados({ tarefaAtual, historico, partes });

      if (statusEl) statusEl.classList.add('hidden');
      if (resultadoEl) resultadoEl.classList.remove('hidden');
    } catch (error) {
      console.error('Erro ao buscar processo:', error);
      this.showNotification('Erro ao consultar processo: ' + (error.message || 'Erro desconhecido'), 'error');
      const statusEl = document.getElementById('statusProcessos');
      if (statusEl) statusEl.classList.add('hidden');
    }
  }

  renderProcessoResultados({ tarefaAtual = [], historico = [], partes = [] }) {
    // Tarefa Atual
    const tbodyTarefa = document.querySelector('#tabelaTarefaAtual tbody');
    const vazioTarefa = document.getElementById('tarefaAtualVazia');
    if (tbodyTarefa) {
      tbodyTarefa.innerHTML = '';
      if (!tarefaAtual || tarefaAtual.length === 0) {
        if (vazioTarefa) vazioTarefa.style.display = 'block';
      } else {
        if (vazioTarefa) vazioTarefa.style.display = 'none';
        tarefaAtual.forEach((t) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${t.nome_tarefa || ''}</td>
            <td>${t.login_usuario || ''}</td>
            <td>${t.ds_orgao_julgador || ''}</td>
            <td>${t.ds_orgao_julgador_colegiado || ''}</td>
          `;
          tbodyTarefa.appendChild(tr);
        });
      }
    }

    // Partes
    const tbodyPartes = document.querySelector('#tabelaPartes tbody');
    const vazioPartes = document.getElementById('partesVazia');
    if (tbodyPartes) {
      tbodyPartes.innerHTML = '';
      if (!partes || partes.length === 0) {
        if (vazioPartes) vazioPartes.style.display = 'block';
      } else {
        if (vazioPartes) vazioPartes.style.display = 'none';
        partes.forEach((p) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${p.ds_nome || ''}</td>
            <td>${p.ds_login || ''}</td>
            <td>${p.id_tipo_parte ?? ''}</td>
            <td>${p.in_parte_principal || ''}</td>
            <td>${p.in_participacao || ''}</td>
            <td>${p.in_situacao || ''}</td>
          `;
          tbodyPartes.appendChild(tr);
        });
      }
    }

    // Histórico
    const tbodyHist = document.querySelector('#tabelaHistorico tbody');
    const vazioHist = document.getElementById('historicoVazio');
    if (tbodyHist) {
      tbodyHist.innerHTML = '';
      if (!historico || historico.length === 0) {
        if (vazioHist) vazioHist.style.display = 'block';
      } else {
        if (vazioHist) vazioHist.style.display = 'none';
        historico.forEach((h) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${this.formatDateTime(h.data_criacao)}</td>
            <td>${this.formatDateTime(h.data_abertura)}</td>
            <td>${this.formatDateTime(h.data_saida)}</td>
            <td>${h.tarefa || ''}</td>
            <td>${h.fluxo || ''}</td>
            <td>${h.task_instance || ''}</td>
          `;
          tbodyHist.appendChild(tr);
        });
      }
    }
  }

  formatDateTime(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleString('pt-BR');
    } catch {
      return String(value);
    }
  }

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

    // Processar e normalizar OJs
    const ojs = ojsText ? 
      ojsText.split('\n')
        .map(oj => oj.trim())
        .filter(oj => oj)
        .map(oj => this.normalizeOJName(oj))
        .filter(oj => oj) // Remover nulls/vazios após normalização
      : [];
        
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
            // Normalizar OJs se existirem
            if (servidor.ojs && Array.isArray(servidor.ojs)) {
              servidor.ojs = servidor.ojs
                .map(oj => this.normalizeOJName(oj))
                .filter(oj => oj); // Remover nulls/vazios após normalização
            }
            
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
    startButton.classList.add('loading-pulse');
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

    // NOVA FUNCIONALIDADE: Verificação prévia antes de iniciar automação
    try {
      this.addStatusMessage('info', '🧠 Analisando cadastros existentes...');
      
      // Realizar verificação prévia de todos os servidores selecionados
      const resultadosVerificacao = await this.realizarVerificacaoPrevia();
      
      if (!resultadosVerificacao || resultadosVerificacao.length === 0) {
        this.addStatusMessage('error', 'Erro na verificação prévia - cancelando automação');
        return;
      }
      
      // Mostrar painel de confirmação com resultados
      const confirmacao = await this.mostrarPainelConfirmacao(resultadosVerificacao);
      
      if (!confirmacao) {
        this.addStatusMessage('info', 'Automação cancelada pelo usuário');
        return;
      }
      
      // Atualizar servidores selecionados com dados da verificação
      this.atualizarServidoresComVerificacao(resultadosVerificacao);
      
    } catch (error) {
      console.error('Erro na verificação prévia:', error);
      this.addStatusMessage('error', `Erro na verificação prévia: ${error.message}`);
      return;
    }

    // Prosseguir com automação normal
    const selectedMode = document.querySelector('input[name="automation-mode"]:checked');
    const isParallelMode = selectedMode && selectedMode.value === 'parallel';
    
    if (isParallelMode) {
      return this.startParallelAutomation();
    } else {
      return this.startSequentialAutomation();
    }
  }

  /**
   * Realiza verificação prévia de todos os servidores selecionados
   * @returns {Promise<Array>} Array com resultados da verificação para cada servidor
   */
  async realizarVerificacaoPrevia() {
    const resultados = [];
    
    // Debug visível na interface
    this.addStatusMessage('info', `📋 Processando ${this.selectedServidores.length} servidor(es) selecionado(s)`);
    
    // Debug removido para produção
    console.log(`🔍 [DEBUG] ESTRUTURA DADOS - servidores array:`, this.servidores);
    
    if (this.selectedServidores.length === 0) {
      console.log(`❌ [DEBUG] ESTRUTURA DADOS - Nenhum servidor selecionado!`);
      return [];
    }
    
    for (const serverIndex of this.selectedServidores) {
      // Buscar o servidor real usando o índice
      const servidor = this.servidores[serverIndex];
      
      if (!servidor) {
        console.log(`❌ [DEBUG] ESTRUTURA DADOS - Servidor não encontrado no índice ${serverIndex}`);
        continue;
      }
      
      console.log(`🔍 [DEBUG] ESTRUTURA DADOS - Processando servidor:`, servidor);
      console.log(`🔍 [DEBUG] ESTRUTURA DADOS - Chaves disponíveis:`, Object.keys(servidor || {}));
      
      // Debug visível sobre os dados do servidor
      this.addStatusMessage('info', `🔍 Verificando servidor: ${servidor.nome || 'NOME_INDEFINIDO'} (${servidor.cpf || 'CPF_INDEFINIDO'})`);
      this.addStatusMessage('info', `👤 Servidor: ${servidor.nome || servidor.cpf} - Perfil: ${servidor.perfil || 'Não definido'}`);
      
      // CORRIGIR: usar servidor.ojs em vez de servidor.orgaos
      const ojs = servidor.ojs || servidor.orgaos || [];
      this.addStatusMessage('info', `🔍 DEBUG: OJs = ${JSON.stringify(ojs)}`);
      this.addStatusMessage('info', `🔍 DEBUG: Quantidade OJs = ${ojs.length}`);
      
      console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - ENVIANDO para verificação:`);
      console.log(`   Servidor: ${servidor.nome}`);
      console.log(`   CPF: ${servidor.cpf}`);
      console.log(`   Perfil: ${servidor.perfil}`);
      console.log(`   OJs: ${JSON.stringify(ojs)}`);
      
      try {
        // Chamar verificação em tempo real para este servidor - CORRIGIDO para usar ojs
        const resultado = await window.electronAPI.verifyServidorOjsRealtime(
          servidor.cpf, 
          servidor.perfil, 
          ojs
        );
        
        console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - RESULTADO da verificação:`, resultado);
        
        resultados.push({
          servidor: servidor,
          verificacao: resultado,
          sucesso: true
        });
        
        // Ajustar contadores com base nas propriedades reais retornadas pelo backend
        const totalParaProcessar = Array.isArray(resultado.ojsParaProcessar)
          ? resultado.ojsParaProcessar.length
          : (resultado.totalParaProcessar || 0);
        const totalJaCadastrados = Array.isArray(resultado.ojsJaCadastrados)
          ? resultado.ojsJaCadastrados.length
          : (resultado.totalJaCadastrados || 0);

        this.addStatusMessage('success', 
          `✅ ${servidor.nome}: ${totalParaProcessar} OJs para processar, ${totalJaCadastrados} já cadastrados`
        );
        
      } catch (error) {
        console.error(`Erro na verificação de ${servidor.nome}:`, error);
        resultados.push({
          servidor: servidor,
          erro: error.message,
          sucesso: false
        });
        
        this.addStatusMessage('error', `❌ Erro ao verificar ${servidor.nome}: ${error.message}`);
      }
    }
    
    return resultados;
  }

  /**
   * Mostra painel de confirmação com resultados da verificação
   * @param {Array} resultadosVerificacao - Resultados da verificação prévia
   * @returns {Promise<boolean>} True se o usuário confirmar, false caso contrário
   */
  async mostrarPainelConfirmacao(resultadosVerificacao) {
    return new Promise((resolve) => {
      // Criar HTML do modal de confirmação
      let htmlContent = `
        <div class="verification-summary">
          <h3>🧠 Verificação Inteligente Concluída</h3>
          <p>Análise prévia dos servidores selecionados:</p>
        </div>
      `;
      
      let totalParaProcessar = 0;
      let totalJaCadastrados = 0;
      let tempoEconomizado = 0;
      
      // Gerar detalhes para cada servidor
      resultadosVerificacao.forEach((resultado, index) => {
        if (resultado.sucesso && resultado.verificacao) {
          const verificacao = resultado.verificacao;
          const stats = verificacao.estatisticas || {};
          
          // Corrigir nomes das propriedades - o banco retorna 'paraProcessar' e 'jaCadastrados'
          const paraProcesarCount = stats.paraProcessar || verificacao.ojsParaProcessar?.length || 0;
          const jaCadastradosCount = stats.jaCadastrados || verificacao.ojsJaCadastrados?.length || 0;
          
          console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - Servidor: ${resultado.servidor.nome}`);
          console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - Verificacao:`, verificacao);
          console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - Stats:`, stats);
          console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - Para Processar: ${paraProcesarCount}`);
          console.log(`🔍 [DEBUG] BOTUCATU FRONTEND - Já Cadastrados: ${jaCadastradosCount}`);
          
          totalParaProcessar += paraProcesarCount;
          totalJaCadastrados += jaCadastradosCount;
          tempoEconomizado += stats.economiaEstimada || 0;
          
          htmlContent += `
            <div class="servidor-verification-result">
              <h4>👤 ${resultado.servidor.nome}</h4>
              <p><strong>CPF:</strong> ${resultado.servidor.cpf} | <strong>Perfil:</strong> ${resultado.servidor.perfil}</p>
              
              <div class="oj-status-summary">
                <div class="status-item success">
                  <i class="fas fa-check-circle"></i>
                  <span>Já Cadastrados: <strong>${jaCadastradosCount}</strong></span>
                </div>
                <div class="status-item warning">
                  <i class="fas fa-plus-circle"></i>
                  <span>Para Processar: <strong>${paraProcesarCount}</strong></span>
                </div>
                <div class="status-item info">
                  <i class="fas fa-clock"></i>
                  <span>Economia: <strong>${stats.economiaEstimada || 0}s</strong></span>
                </div>
              </div>
              
              ${jaCadastradosCount > 0 ? `
                <details class="oj-details">
                  <summary>OJs Já Cadastrados (${jaCadastradosCount})</summary>
                  <ul>
                    ${(verificacao.ojsJaCadastrados || []).map(oj => `<li>✅ ${oj.nome || oj}</li>`).join('')}
                  </ul>
                </details>
              ` : ''}
              
      ${paraProcesarCount > 0 ? `
        <details class="oj-details">
          <summary>OJs Para Processar (${paraProcesarCount})</summary>
          <ul>
            ${(verificacao.ojsParaProcessar || []).map(oj => `<li>${oj}</li>`).join('')}
          </ul>
        </details>
      ` : ''}
            </div>
          `;
        } else {
          htmlContent += `
            <div class="servidor-verification-result error">
              <h4>👤 ${resultado.servidor.nome}</h4>
              <p><strong>CPF:</strong> ${resultado.servidor.cpf}</p>
              <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Erro: ${resultado.erro}</span>
              </div>
            </div>
          `;
        }
      });
      
      // Resumo geral
      htmlContent += `
        <div class="verification-total-summary">
          <h3>📊 Resumo Geral</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <i class="fas fa-server"></i>
              <span>Servidores: <strong>${resultadosVerificacao.length}</strong></span>
            </div>
            <div class="stat-item">
              <i class="fas fa-plus-circle"></i>
              <span>Total Para Processar: <strong>${totalParaProcessar}</strong></span>
            </div>
            <div class="stat-item">
              <i class="fas fa-check-circle"></i>
              <span>Total Já Cadastrados: <strong>${totalJaCadastrados}</strong></span>
            </div>
            <div class="stat-item">
              <i class="fas fa-clock"></i>
              <span>Tempo Economizado: <strong>${Math.round(tempoEconomizado / 60)}min ${tempoEconomizado % 60}s</strong></span>
            </div>
          </div>
        </div>
      `;
      
      // Mostrar modal personalizado
      const modal = this.createCustomModal(
        '🎯 Confirmação de Automação', 
        htmlContent,
        [
          { text: 'Cancelar', class: 'btn-secondary', action: () => resolve(false) },
          { text: 'Continuar Automação', class: 'btn-success', action: () => resolve(true) }
        ]
      );
      
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    });
  }

  /**
   * Atualiza servidores selecionados com dados da verificação
   * @param {Array} resultadosVerificacao - Resultados da verificação prévia
   */
  atualizarServidoresComVerificacao(resultadosVerificacao) {
    resultadosVerificacao.forEach(resultado => {
      if (resultado.sucesso && resultado.verificacao) {
        // Encontrar o servidor real no array usando CPF
        const serverIndex = this.servidores.findIndex(s => s.cpf === resultado.servidor.cpf);
        if (serverIndex !== -1) {
          const servidor = this.servidores[serverIndex];
          // Atualizar servidor com dados da verificação inteligente
          // Importante: não sobrescrever a lista original (servidor.ojs),
          // para que a verificação futura sempre considere todos os OJs originais.
          servidor.verificacaoInteligente = resultado.verificacao;
          servidor.ojsParaProcessar = resultado.verificacao.ojsParaProcessar || [];
          servidor.ojsJaCadastrados = resultado.verificacao.ojsJaCadastrados || [];
          servidor.tempoEconomizado = (resultado.verificacao.economiaEstimada?.tempo)
            || (resultado.verificacao.estatisticas?.economiaEstimada)
            || 0;
          
          console.log(`✅ [DEBUG] Servidor atualizado: ${servidor.nome}`, {
            ojsOriginais: resultado.servidor.ojs?.length || 0,
            ojsParaProcessar: servidor.ojs?.length || 0,
            ojsJaCadastrados: servidor.ojsJaCadastrados?.length || 0
          });
        }
      }
    });
    
    this.addStatusMessage('success', '✅ Servidores atualizados com verificação inteligente - Iniciando automação...');
  }

  /**
   * Cria modal customizado
   */
  createCustomModal(title, content, buttons) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
      <div class="custom-modal-content verification-modal">
        <div class="custom-modal-header">
          <h2>${title}</h2>
        </div>
        <div class="custom-modal-body">
          ${content}
        </div>
        <div class="custom-modal-footer">
          ${buttons.map(btn => `<button class="btn ${btn.class}" data-action="${buttons.indexOf(btn)}">${btn.text}</button>`).join('')}
        </div>
      </div>
    `;
    
    // Adicionar event listeners
    buttons.forEach((btn, index) => {
      const button = modal.querySelector(`[data-action="${index}"]`);
      button.addEventListener('click', () => {
        modal.remove();
        btn.action();
      });
    });
    
    return modal;
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
      const listaParaProcessar = servidor.ojsParaProcessar || servidor.ojs || [];
      return total + 3 + listaParaProcessar.length; // login + navegação + verificação + OJs
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
          orgaos: servidor.ojsParaProcessar || servidor.ojs || []
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
      
      // Limpar caches globais antes de iniciar
      try { await window.electronAPI.invoke('reset-automation-caches'); } catch (e) {}
      const result = await window.electronAPI.startServidorAutomationV2(config);

      if (!result || !result.success) {
        this.addStatusMessage('error', `Erro na automação em lote: ${result && result.error ? result.error : 'Erro desconhecido'}`);
      } else if (result.nothingToDo) {
        // Caso especial: todos os OJs já foram cadastrados
        this.addStatusMessage('success', '🎉 Todos os órgãos julgadores já foram cadastrados!',
          'Não há necessidade de executar a automação');

        // Mostrar detalhes do que foi economizado
        if (result.relatorio) {
          this.addStatusMessage('info',
            `📊 Economia de tempo: ${Math.round(result.relatorio.tempoEconomizado / 60)} minutos`,
            `${result.relatorio.ojsJaCadastrados} OJs já cadastrados`);
        }

        // Limpar OJs faltantes pois todos já estão cadastrados
        servidoresParaProcessar.forEach(srv => {
          const idx = this.servidores.findIndex(x => x.cpf === srv.cpf);
          if (idx !== -1) {
            this.servidores[idx].ojsParaProcessar = [];
          }
        });

        // Atualizar display para refletir que tudo está completo
        this.updateServidorDisplay();

        return; // Não prosseguir com lógica de automação normal
      } else {
        this.addStatusMessage('success', `Automação de ${servidoresParaProcessar.length} servidores concluída com sucesso`, 
          `Tempo total: ${this.getElapsedTime()}`);
        // Zerar OJs faltantes e marcar como cadastrados
        servidoresParaProcessar.forEach(srv => {
          const idx = this.servidores.findIndex(x => x.cpf === srv.cpf);
          if (idx !== -1) {
            this.servidores[idx].ojsParaProcessar = [];
          }
        });
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
      startButton.classList.remove('loading-pulse');
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
      const listaParaProcessar = servidor.ojsParaProcessar || servidor.ojs || [];
      return total + 3 + listaParaProcessar.length;
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
          orgaos: servidor.ojsParaProcessar || servidor.ojs || []
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
      const resumeButton = document.getElementById('resume-servidor-automation');
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
      if (resumeButton) {
        resumeButton.style.display = 'inline-block';
        resumeButton.onclick = () => this.startSequentialAutomation();
      }
      
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

  // Detailed visual status management (removido - elementos não existem mais)
  updateDetailedStatus(data) {
    // Elementos de status detalhado foram removidos da interface
    return;
  }

  startDetailedTimer() {
    // Função removida - elementos não existem mais
    return;
  }

  stopDetailedTimer() {
    // Função removida - elementos não existem mais  
    return;
  }

  resetDetailedStatus() {
    // Função removida - elementos não existem mais
    return;
  }

  async loadConfig() {
    try {
      const config = await window.electronAPI.loadConfig();
            
      document.getElementById('pje-url').value = config.PJE_URL || '';
      document.getElementById('login').value = config.LOGIN || '';
      document.getElementById('password').value = config.PASSWORD || '';
      
      // Carregar configurações do banco
      await this.loadDatabaseConfig();
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

  async loadNormalizedOJs() {
    try {
      console.log('Carregando dados de normalização de OJs...');
      
      // Carregar dados do arquivo ojs1g.json
      const response = await fetch('./ojs1g.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.ojsData = await response.json();
      console.log('Dados de OJs1G carregados:', this.ojsData.length, 'órgãos');
      
      // Criar índices para busca rápida
      this.createOJSearchIndex();
      
      console.log('✅ Sistema de normalização de OJs carregado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados de normalização de OJs:', error);
      this.ojsData = [];
    }
  }

  createOJSearchIndex() {
    // Limpar índices existentes
    this.ojsSearchIndex.clear();
    this.normalizedOJs.clear();
    
    // Criar índice para cada OJ no arquivo ojs1g.json
    this.ojsData.forEach(item => {
      const ojName = item.ds_orgao_julgador;
      
      // Criar variações do nome para busca
      const variations = this.generateOJVariations(ojName);
      
      // Adicionar todas as variações ao índice
      variations.forEach(variation => {
        this.ojsSearchIndex.set(variation.toLowerCase(), ojName);
      });
      
      // Mapear o nome original para ele mesmo (normalizado)
      this.normalizedOJs.set(ojName.toLowerCase(), ojName);
    });
    
    console.log('Índices de busca criados:', this.ojsSearchIndex.size, 'variações mapeadas');
  }

  generateOJVariations(ojName) {
    const variations = [ojName]; // Sempre incluir o nome original
    
    // Remover acentos e caracteres especiais
    const normalized = ojName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (normalized !== ojName) {
      variations.push(normalized);
    }
    
    // Criar variação sem prefixos comuns
    const withoutCommonPrefixes = ojName
      .replace(/^Vara do Trabalho de\s*/i, '')
      .replace(/^VT de\s*/i, '')
      .replace(/^Vara de\s*/i, '')
      .replace(/^CEJUSC\s*/i, '')
      .trim();
    
    if (withoutCommonPrefixes && withoutCommonPrefixes !== ojName) {
      variations.push(withoutCommonPrefixes);
    }
    
    // Criar variações específicas para CEJUSC
    if (ojName.includes('CEJUSC') || ojName.includes('Centro Judiciário')) {
      // Extrair a cidade do nome do CEJUSC
      const cityMatch = ojName.match(/CEJUSC\s+([A-Z\s]+)/i);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        variations.push(`CEJUSC - ${city}`);
        variations.push(`CEJUSC ${city}`);
        variations.push(`CEJUS - ${city}`);
        variations.push(`CEJUS ${city}`);
      }
    }
    
    // Criar variações com abreviações comuns
    const abbreviated = ojName
      .replace(/Vara do Trabalho/gi, 'VT')
      .replace(/Órgão Centralizador/gi, 'OC')
      .replace(/Centro de Conciliação/gi, 'CCP')
      .replace(/Centro Judiciário/gi, 'CEJUSC')
      .trim();
    
    if (abbreviated !== ojName) {
      variations.push(abbreviated);
    }
    
    return [...new Set(variations)]; // Remover duplicatas
  }

  normalizeOJName(inputName) {
    if (!inputName || inputName.trim() === '') {
      return null;
    }
    
    const cleanInput = inputName.trim();
    
    // Buscar primeiro por correspondência exata (case-insensitive)
    const exactMatch = this.normalizedOJs.get(cleanInput.toLowerCase());
    if (exactMatch) {
      return exactMatch;
    }
    
    // Buscar por variações no índice
    const indexMatch = this.ojsSearchIndex.get(cleanInput.toLowerCase());
    if (indexMatch) {
      return indexMatch;
    }
    
    // Buscar por correspondência parcial
    const partialMatch = this.findPartialMatch(cleanInput);
    if (partialMatch) {
      return partialMatch;
    }
    
    // Se não encontrou correspondência, retornar o nome original
    console.warn('⚠️ OJ não encontrado para normalização:', cleanInput);
    return cleanInput;
  }

  findPartialMatch(inputName) {
    const cleanInput = inputName.toLowerCase();
    
    // Buscar por correspondência parcial no início do nome
    for (const [key, value] of this.normalizedOJs) {
      if (key.includes(cleanInput) || cleanInput.includes(key)) {
        return value;
      }
    }
    
    // Buscar por palavras-chave importantes
    const keywords = cleanInput.split(/\s+/).filter(word => word.length > 2);
    if (keywords.length > 0) {
      for (const [key, value] of this.normalizedOJs) {
        const keyWords = key.split(/\s+/);
        let matches = 0;
        
        keywords.forEach(keyword => {
          if (keyWords.some(keyWord => keyWord.includes(keyword) || keyword.includes(keyWord))) {
            matches++;
          }
        });
        
        // Se pelo menos 70% das palavras correspondem
        if (matches / keywords.length >= 0.7) {
          return value;
        }
      }
    }
    
    return null;
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

  async loadDatabaseConfig() {
    try {
      const result = await window.electronAPI.loadDatabaseCredentials();
      if (result.success && result.credentials) {
        const creds = result.credentials;
        document.getElementById('dbHost').value = creds.host || 'pje-db-bugfix-a1';
        document.getElementById('dbPort').value = creds.port || 5432;
        document.getElementById('dbUser').value = creds.user || '';
        document.getElementById('dbPassword').value = creds.password || '';
        document.getElementById('dbDatabase1Grau').value = creds.database1Grau || 'pje_1grau_bugfix';
        document.getElementById('dbDatabase2Grau').value = creds.database2Grau || 'pje_2grau_bugfix';
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do banco:', error);
    }
  }

  async saveDatabaseConfig() {
    try {
      const credentials = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        database1Grau: document.getElementById('dbDatabase1Grau').value,
        database2Grau: document.getElementById('dbDatabase2Grau').value
      };

      // Validar campos obrigatórios
      if (!credentials.user || !credentials.password) {
        this.showDatabaseStatus('Usuário e senha são obrigatórios', 'error');
        return;
      }

      const result = await window.electronAPI.saveDatabaseCredentials(credentials);
      if (result.success) {
        this.showDatabaseStatus('Credenciais salvas e conexão estabelecida!', 'success');
        this.showNotification('Configurações do banco salvas com sucesso!', 'success');
      } else {
        this.showDatabaseStatus('Erro: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações do banco:', error);
      this.showDatabaseStatus('Erro ao salvar configurações', 'error');
    }
  }

  async testDatabaseConnection() {
    try {
      const credentials = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        database1Grau: document.getElementById('dbDatabase1Grau').value,
        database2Grau: document.getElementById('dbDatabase2Grau').value
      };

      // Validar campos obrigatórios
      if (!credentials.user || !credentials.password) {
        this.showDatabaseStatus('Usuário e senha são obrigatórios', 'error');
        return;
      }

      this.showDatabaseStatus('Testando conexão...', 'info');
      
      const result = await window.electronAPI.testDatabaseCredentials(credentials);
      if (result.success) {
        this.showDatabaseStatus('Conexão estabelecida com sucesso!', 'success');
      } else {
        this.showDatabaseStatus('Erro: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      this.showDatabaseStatus('Erro ao testar conexão', 'error');
    }
  }

  showDatabaseStatus(message, type) {
    const statusDiv = document.getElementById('dbStatus');
    const statusText = document.getElementById('dbStatusText');
    const statusIcon = statusDiv.querySelector('i');
    
    statusText.textContent = message;
    statusDiv.className = `database-status ${type}`;
    statusDiv.classList.remove('hidden');
    
    // Atualizar ícone baseado no tipo
    if (type === 'success') {
      statusIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
      statusIcon.className = 'fas fa-exclamation-circle';
    } else if (type === 'info') {
      statusIcon.className = 'fas fa-info-circle';
    }
    
    // Auto-hide após 5 segundos para mensagens de sucesso
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.classList.add('hidden');
      }, 5000);
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
    
    // Configurar autocomplete para OJs dos peritos
    this.setupOJAutocomplete('perito-ojs');
    
    // Configurar autocomplete para OJs dos servidores
    this.setupOJAutocomplete('servidor-ojs');
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

  setupOJAutocomplete(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    // Criar container de sugestões se não existir
    let suggestionsContainer = document.getElementById(`${textareaId}-suggestions`);
    if (!suggestionsContainer) {
      suggestionsContainer = document.createElement('div');
      suggestionsContainer.id = `${textareaId}-suggestions`;
      suggestionsContainer.className = 'oj-autocomplete-suggestions';
      textarea.parentNode.appendChild(suggestionsContainer);
    }

    let currentSuggestionIndex = -1;

    // Função para obter sugestões baseadas no texto atual
    const getSuggestions = (searchText) => {
      if (!searchText || searchText.trim().length < 2) {
        return [];
      }

      const searchLower = searchText.toLowerCase().trim();
      const suggestions = [];

      // Buscar nos dados normalizados
      for (const item of this.ojsData) {
        const ojName = item.ds_orgao_julgador;
        const ojLower = ojName.toLowerCase();

        // Correspondência exata no início
        if (ojLower.startsWith(searchLower)) {
          suggestions.push({ name: ojName, score: 100 });
        }
        // Correspondência parcial com palavras
        else if (ojLower.includes(searchLower)) {
          suggestions.push({ name: ojName, score: 80 });
        }
        // Correspondência por palavras individuais
        else {
          const searchWords = searchLower.split(/\s+/);
          const ojWords = ojLower.split(/\s+/);
          let matchScore = 0;
          
          for (const searchWord of searchWords) {
            for (const ojWord of ojWords) {
              if (ojWord.includes(searchWord) || searchWord.includes(ojWord)) {
                matchScore += 20;
              }
            }
          }
          
          if (matchScore > 0) {
            suggestions.push({ name: ojName, score: matchScore });
          }
        }
      }

      // Ordenar por relevância e limitar a 10 resultados
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.name);
    };

    // Função para mostrar sugestões
    const showSuggestions = (suggestions) => {
      if (!suggestions || suggestions.length === 0) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.classList.remove('show');
        return;
      }

      const html = suggestions.map((suggestion, index) => `
        <div class="oj-suggestion-item ${index === currentSuggestionIndex ? 'active' : ''}" 
             data-suggestion="${suggestion}" data-index="${index}">
          ${suggestion}
        </div>
      `).join('');

      suggestionsContainer.innerHTML = html;
      suggestionsContainer.classList.add('show');

      // Adicionar listeners aos itens
      suggestionsContainer.querySelectorAll('.oj-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          insertSuggestion(item.dataset.suggestion);
        });

        item.addEventListener('mouseenter', () => {
          currentSuggestionIndex = parseInt(item.dataset.index);
          updateSelectedItem();
        });
      });
    };

    // Função para inserir sugestão no textarea
    const insertSuggestion = (suggestion) => {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);
      
      // Encontrar o início da palavra atual
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Substituir a linha atual pela sugestão normalizada
      const normalizedSuggestion = this.normalizeOJName(suggestion);
      lines[lines.length - 1] = normalizedSuggestion;
      
      const newTextBefore = lines.join('\n');
      textarea.value = newTextBefore + textAfter;
      
      // Posicionar cursor no final da sugestão
      const newCursorPos = newTextBefore.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      
      // Esconder sugestões
      suggestionsContainer.classList.remove('show');
      currentSuggestionIndex = -1;
      
      // Focar no textarea
      textarea.focus();
    };

    // Função para atualizar item selecionado
    const updateSelectedItem = () => {
      suggestionsContainer.querySelectorAll('.oj-suggestion-item').forEach((item, index) => {
        item.classList.toggle('active', index === currentSuggestionIndex);
      });
    };

    // Event listener para input
    textarea.addEventListener('input', (e) => {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      
      // Obter a linha atual onde está o cursor
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1].trim();
      
      if (currentLine.length >= 2) {
        const suggestions = getSuggestions(currentLine);
        showSuggestions(suggestions);
      } else {
        suggestionsContainer.classList.remove('show');
      }
    });

    // Event listener para teclas especiais
    textarea.addEventListener('keydown', (e) => {
      const suggestions = suggestionsContainer.querySelectorAll('.oj-suggestion-item');
      
      if (suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
          updateSelectedItem();
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
          updateSelectedItem();
          break;
          
        case 'Enter':
          if (currentSuggestionIndex >= 0 && suggestions[currentSuggestionIndex]) {
            e.preventDefault();
            insertSuggestion(suggestions[currentSuggestionIndex].dataset.suggestion);
          }
          break;
          
        case 'Escape':
          suggestionsContainer.classList.remove('show');
          currentSuggestionIndex = -1;
          break;
      }
    });

    // Event listener para blur
    textarea.addEventListener('blur', () => {
      // Aguardar um pouco para permitir clique nas sugestões
      setTimeout(() => {
        suggestionsContainer.classList.remove('show');
        currentSuggestionIndex = -1;
      }, 200);
    });

    // Event listener para focus
    textarea.addEventListener('focus', () => {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1].trim();
      
      if (currentLine.length >= 2) {
        const suggestions = getSuggestions(currentLine);
        showSuggestions(suggestions);
      }
    });
  }

  // Função de teste para a normalização de OJs
  // Função para verificar OJs já cadastrados no PJE
  async checkExistingOJs(cpf, ojsList) {
    console.log('🔍 Verificando OJs já cadastrados no PJE...');
    
    if (!cpf || !ojsList || ojsList.length === 0) {
      return { existing: [], missing: ojsList || [], error: 'Dados inválidos' };
    }

    try {
      // Normalizar lista de OJs
      const normalizedOJs = ojsList.map(oj => this.normalizeOJName(oj)).filter(oj => oj);
      
      console.log(`📋 Verificando ${normalizedOJs.length} OJs para CPF: ${cpf}`);
      
      // Esta função seria chamada pelo main process para verificar no PJE
      // Por enquanto, vou simular a verificação
      const result = {
        cpf,
        total: normalizedOJs.length,
        existing: [], // OJs já cadastrados
        missing: [],  // OJs que precisam ser cadastrados
        status: 'checked'
      };

      // Simular alguns já cadastrados (em produção, isso viria do PJE)
      const simulatedExisting = normalizedOJs.slice(0, Math.floor(normalizedOJs.length / 2));
      const simulatedMissing = normalizedOJs.slice(Math.floor(normalizedOJs.length / 2));
      
      result.existing = simulatedExisting;
      result.missing = simulatedMissing;
      
      console.log(`✅ ${result.existing.length} OJs já cadastrados`);
      console.log(`⏳ ${result.missing.length} OJs pendentes`);
      
      if (result.existing.length > 0) {
        console.log('📌 OJs já cadastrados:', result.existing);
      }
      
      if (result.missing.length > 0) {
        console.log('🔄 OJs para cadastrar:', result.missing);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao verificar OJs:', error);
      return { 
        existing: [], 
        missing: ojsList, 
        error: error.message 
      };
    }
  }

  // Função para processar servidor com verificação prévia
  async processServerWithCheck(servidor) {
    if (!servidor.ojs || servidor.ojs.length === 0) {
      return {
        status: 'no_ojs',
        message: 'Servidor não possui OJs para verificar',
        servidor
      };
    }

    // Verificar OJs existentes
    const checkResult = await this.checkExistingOJs(servidor.cpf, servidor.ojs);
    
    if (checkResult.error) {
      return {
        status: 'error',
        message: checkResult.error,
        servidor
      };
    }

    // Se todos já estão cadastrados
    if (checkResult.missing.length === 0) {
      return {
        status: 'all_existing',
        message: `Todos os ${checkResult.total} OJs já estão cadastrados`,
        servidor,
        checkResult
      };
    }

    // Se precisa cadastrar alguns
    return {
      status: 'partial_missing',
      message: `${checkResult.existing.length} já cadastrados, ${checkResult.missing.length} para cadastrar`,
      servidor: {
        ...servidor,
        ojs: checkResult.missing // Só os que faltam
      },
      checkResult
    };
  }

  // Função para mostrar status visual dos OJs
  displayOJStatus(checkResult) {
    if (!checkResult) return;

    console.group(`📊 Status dos OJs - CPF: ${checkResult.cpf}`);
    
    console.log(`📈 Total de OJs: ${checkResult.total}`);
    console.log(`✅ Já cadastrados: ${checkResult.existing.length}`);
    console.log(`⏳ Pendentes: ${checkResult.missing.length}`);
    
    if (checkResult.existing.length > 0) {
      console.group('✅ OJs já cadastrados:');
      checkResult.existing.forEach((oj, index) => {
        console.log(`${index + 1}. ${oj}`);
      });
      console.groupEnd();
    }
    
    if (checkResult.missing.length > 0) {
      console.group('⏳ OJs para cadastrar:');
      checkResult.missing.forEach((oj, index) => {
        console.log(`${index + 1}. ${oj}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  testOJNormalization() {
    console.log('🧪 Iniciando testes de normalização de OJs...');
    
    // Casos de teste
    const testCases = [
      {
        input: '1ª Vara do Trabalho de Campinas',
        expected: '1ª Vara do Trabalho de Campinas'
      },
      {
        input: '1a vara do trabalho de campinas',
        expected: '1ª Vara do Trabalho de Campinas'
      },
      {
        input: 'Campinas',
        expected: null // Pode ser varios OJs de Campinas
      },
      {
        input: 'VT Campinas',
        expected: null // Precisa ser mais específico
      },
      {
        input: 'EXE1 - Campinas',
        expected: 'EXE1 - Campinas'
      },
      {
        input: 'LIQ2 - Jundiaí',
        expected: 'LIQ2 - Jundiaí'
      },
      {
        input: 'ccp campinas',
        expected: 'CCP CAMPINAS - Centro de Conciliação Pré Processual'
      },
      {
        input: 'CEJUSC - Sorocaba',
        expected: 'CEJUSC SOROCABA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho'
      },
      {
        input: 'CEJUS - Sorocaba',
        expected: 'CEJUSC SOROCABA - JT Centro Judiciário de Métodos Consensuais de Solução de Disputas da Justiça do Trabalho'
      }
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    console.log(`Executando ${totalTests} casos de teste...`);

    testCases.forEach((testCase, index) => {
      const result = this.normalizeOJName(testCase.input);
      const passed = testCase.expected === null ? true : result === testCase.expected;
      
      console.log(`Teste ${index + 1}: ${passed ? '✅' : '❌'}`);
      console.log(`  Input: "${testCase.input}"`);
      console.log(`  Expected: ${testCase.expected || 'qualquer match válido'}`);
      console.log(`  Result: "${result}"`);
      
      if (passed) passedTests++;
    });

    console.log(`\n📊 Resultado dos testes: ${passedTests}/${totalTests} casos passaram`);
    
    // Teste de performance
    console.log('\n⚡ Testando performance...');
    const startTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      this.normalizeOJName('1ª Vara do Trabalho de Campinas');
    }
    
    const endTime = performance.now();
    console.log(`100 normalizações executadas em ${(endTime - startTime).toFixed(2)}ms`);
    
    // Teste de índice
    console.log('\n📚 Estatísticas do índice:');
    console.log(`  OJs carregados: ${this.ojsData.length}`);
    console.log(`  Entradas no índice de busca: ${this.ojsSearchIndex.size}`);
    console.log(`  Entradas normalizadas: ${this.normalizedOJs.size}`);
    
    return { passedTests, totalTests, passed: passedTests === totalTests };
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

    // Event listener para mudança do número de instâncias paralelas
    const maxInstancesSelect = document.getElementById('max-instances');
    const configHelp = parallelConfig.querySelector('.config-help');
    
    maxInstancesSelect.addEventListener('change', (e) => {
      const instances = parseInt(e.target.value);
      const originalHelp = '💡 <strong>Recomendação:</strong> 2-4 instâncias são ideais para a maioria dos casos. Valores altos podem sobrecarregar o sistema e causar erros.';
      
      if (instances >= 20) {
        configHelp.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #c07b73;"></i> 
          <strong style="color: #c07b73;">ATENÇÃO:</strong> ${instances} instâncias podem causar sobrecarga e erros. Use com cautela!`;
        configHelp.style.color = '#c07b73';
      } else if (instances >= 10) {
        configHelp.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #d4a574;"></i> 
          <strong style="color: #d4a574;">AVISO:</strong> ${instances} instâncias usam muitos recursos. Monitore o desempenho.`;
        configHelp.style.color = '#d4a574';
      } else {
        configHelp.innerHTML = originalHelp;
        configHelp.style.color = '';
      }
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

  /**
   * Busca órgãos julgadores diretamente do banco de dados
   */
  async buscarOJsDoBanco(grau) {
    const statusId = `statusOjs${grau}Grau`;
    const resultadoId = `resultadoOjs${grau}Grau`;
    const tabelaId = `tabelaOjs${grau}Grau`;
    const countId = `countOjs${grau}Grau`;
    const exportBtnId = `exportarOjs${grau}Grau`;

    // Obter filtros
    const filtro = document.getElementById(`filtroOjs${grau}Grau`).value.trim();
    const limite = parseInt(document.getElementById(`limiteOjs${grau}Grau`).value);

    // Mostrar status de carregamento
    document.getElementById(statusId).classList.remove('hidden');
    document.getElementById(resultadoId).classList.add('hidden');
    document.getElementById(exportBtnId).disabled = true;

    try {
      console.log(`🔍 Buscando OJs ${grau}º grau no banco de dados...`);

      const response = grau === '1'
        ? await window.electronAPI.buscarOJs1Grau(filtro, limite)
        : await window.electronAPI.buscarOJs2Grau(filtro, limite);

      if (response.success) {
        // Usar todos os registros retornados, sem exclusões
        const ojs = response.data;

        // Armazenar dados para exportação
        if (grau === '1') {
          this.ojsData1Grau = ojs;
        } else {
          this.ojsData2Grau = ojs;
        }

        // Atualizar contadores
        document.getElementById(countId).textContent = ojs.length;

        // Renderizar tabela com novo formato
        this.renderizarTabelaOJsBanco(tabelaId, ojs);

        // Mostrar resultados
        document.getElementById(statusId).classList.add('hidden');
        document.getElementById(resultadoId).classList.remove('hidden');
        document.getElementById(exportBtnId).disabled = false;

        console.log(`✅ ${ojs.length} OJs ${grau}º grau encontrados no banco`);

      } else {
        throw new Error(response.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error(`❌ Erro ao buscar OJs ${grau}º grau:`, error);

      // Esconder status de carregamento
      document.getElementById(statusId).classList.add('hidden');

      // Mostrar mensagem de erro
      this.showNotification(`Erro ao carregar OJs ${grau}º grau: ${error.message}`, 'error');
    }
  }

  /**
   * Busca servidores do banco PJE com filtros por nome/CPF e perfil
   */
  async buscarServidores(autoSearch = false) {
    try {
      // Obter grau selecionado
      const grauRadio = document.querySelector('input[name="grauServidor"]:checked');
      const grau = grauRadio ? grauRadio.value : '1';

      // Obter filtros
      const filtroNome = document.getElementById('filtroNomeServidor').value.trim();
      const filtroPerfil = ''; // Campo perfil removido da interface

      // Validação: deve ter pelo menos nome/CPF preenchido
      if (!filtroNome) {
        if (!autoSearch) {
          this.showNotification('Preencha o campo Nome/CPF para buscar', 'warning');
        }
        return;
      }

      // Mostrar status de carregamento
      const statusDiv = document.getElementById('statusServidores');
      const resultadoDiv = document.getElementById('resultadoServidores');
      const exportBtn = document.getElementById('exportarServidores');

      if (statusDiv) {
        statusDiv.classList.remove('hidden');
        const statusSpan = statusDiv.querySelector('span');
        if (statusSpan) {
          statusSpan.textContent = `Buscando servidores do ${grau}º grau...`;
        }
      }

      if (resultadoDiv) {
        resultadoDiv.classList.add('hidden');
      }

      if (exportBtn) {
        exportBtn.disabled = true;
      }

      console.log(`🔍 Buscando servidores ${grau}º grau - Nome/CPF: "${filtroNome}", Perfil: "${filtroPerfil}"`);

      // Fazer busca no banco
      const response = await window.electronAPI.buscarServidores(grau, filtroNome, filtroPerfil);

      // Esconder status de carregamento
      if (statusDiv) {
        statusDiv.classList.add('hidden');
      }

      if (response.success) {
        const servidores = response.data || [];

        console.log(`✅ Encontrados ${servidores.length} servidores do ${grau}º grau`);

        // Armazenar dados para exportação
        this.servidoresData = servidores;

        // Renderizar tabela de servidores
        this.renderizarTabelaServidores(servidores, grau);

        // Mostrar resultado e habilitar exportação
        if (resultadoDiv) {
          resultadoDiv.classList.remove('hidden');
        }
        if (exportBtn) {
          exportBtn.disabled = servidores.length === 0;
        }

        if (servidores.length === 0) {
          this.showNotification('Nenhum servidor encontrado com os filtros especificados', 'info');
        } else {
          this.showNotification(`${servidores.length} servidor(es) encontrado(s)`, 'success');
        }

      } else {
        throw new Error(response.error || 'Erro na busca de servidores');
      }

    } catch (error) {
      console.error('❌ Erro ao buscar servidores:', error);

      // Esconder status de carregamento
      const statusServidores = document.getElementById('statusServidores');
      if (statusServidores) {
        statusServidores.classList.add('hidden');
      }

      this.showNotification(`Erro ao buscar servidores: ${error.message}`, 'error');
    }
  }

  /**
   * Renderiza tabela de servidores
   */
  renderizarTabelaServidores(servidores, grau) {
    const resultContainer = document.getElementById('resultadoServidores');
    if (!resultContainer) {
      console.error('Container de resultados não encontrado');
      return;
    }

    const headerInfo = resultContainer.querySelector('.results-header h3');
    const countSpan = resultContainer.querySelector('.results-count');

    // Atualizar cabeçalho com verificações de segurança
    if (headerInfo) {
      headerInfo.textContent = `Servidores - ${grau}º Grau`;
    }
    if (countSpan) {
      countSpan.textContent = `${servidores.length} servidor(es) encontrado(s)`;
    }

    // Criar ou limpar tabela
    let tabelaContainer = resultContainer.querySelector('.table-container');
    if (!tabelaContainer) {
      tabelaContainer = document.createElement('div');
      tabelaContainer.className = 'table-container';
      resultContainer.appendChild(tabelaContainer);
    }

    tabelaContainer.innerHTML = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Tipo Usuário</th>
            <th>Órgão Julgador</th>
            <th>Perfil no OJ</th>
            <th>Data Início</th>
            <th>Data Fim</th>
          </tr>
        </thead>
        <tbody id="tabelaServidores"></tbody>
      </table>
    `;

    const tbody = document.getElementById('tabelaServidores');

    servidores.forEach(servidor => {
      const row = tbody.insertRow();

      // Nome
      const cellNome = row.insertCell();
      cellNome.textContent = servidor.nome || '-';
      cellNome.className = 'text-left';

      // CPF
      const cellCpf = row.insertCell();
      cellCpf.textContent = servidor.cpf || '-';
      cellCpf.className = 'text-center';

      // Perfil
      const cellPerfil = row.insertCell();
      cellPerfil.textContent = servidor.perfil || '-';
      cellPerfil.className = 'text-left';

      // Órgão
      const cellOrgao = row.insertCell();
      cellOrgao.textContent = servidor.orgao || 'Não informado';
      cellOrgao.className = 'text-left';

      // Papel no Órgão
      const cellPapelOrgao = row.insertCell();
      cellPapelOrgao.textContent = servidor.papel_orgao || 'Não informado';
      cellPapelOrgao.className = 'text-left';

      // Data Início
      const cellDtInicio = row.insertCell();
      const dtInicio = servidor.dt_inicio ? new Date(servidor.dt_inicio).toLocaleDateString('pt-BR') : '-';
      cellDtInicio.textContent = dtInicio;
      cellDtInicio.className = 'text-center';

      // Data Fim
      const cellDtFim = row.insertCell();
      const dtFim = servidor.dt_final ? new Date(servidor.dt_final).toLocaleDateString('pt-BR') : '-';
      cellDtFim.textContent = dtFim;
      cellDtFim.className = 'text-center';
    });
  }

  /**
   * Limpa filtros de servidores
   */
  limparFiltrosServidores() {
    const filtroNome = document.getElementById('filtroNomeServidor');
    if (filtroNome) {
      filtroNome.value = '';
    }

    // Limpar resultados
    const resultadoDiv = document.getElementById('resultadoServidores');
    if (resultadoDiv) {
      resultadoDiv.classList.add('hidden');
    }

    const exportBtn = document.getElementById('exportarServidores');
    if (exportBtn) {
      exportBtn.disabled = true;
    }

    // Limpar dados armazenados
    this.servidoresData = [];

    this.showNotification('Filtros limpos', 'info');
  }

  /**
   * Busca TODAS as OJs do banco de dados (sem limite)
   */
  async buscarTodasOJsDoBanco(grau) {
    const statusId = `statusOjs${grau}Grau`;
    const resultadoId = `resultadoOjs${grau}Grau`;
    const tabelaId = `tabelaOjs${grau}Grau`;
    const countId = `countOjs${grau}Grau`;
    const exportBtnId = `exportarOjs${grau}Grau`;

    // Obter apenas filtro (ignorar limite)
    const filtro = document.getElementById(`filtroOjs${grau}Grau`).value.trim();

    // Mostrar status de carregamento
    document.getElementById(statusId).classList.remove('hidden');
    document.getElementById(resultadoId).classList.add('hidden');
    document.getElementById(exportBtnId).disabled = true;

    try {
      console.log(`🔍 Buscando TODAS as OJs ${grau}º grau no banco de dados...`);

      // Usar limite 0 para buscar todas
      const response = grau === '1'
        ? await window.electronAPI.buscarOJs1Grau(filtro, 0)
        : await window.electronAPI.buscarOJs2Grau(filtro, 0);

      if (response.success) {
        // Usar todos os registros retornados, sem exclusões
        const ojs = response.data;

        // Armazenar dados para exportação
        if (grau === '1') {
          this.ojsData1Grau = ojs;
        } else {
          this.ojsData2Grau = ojs;
        }

        // Renderizar tabela
        this.renderizarTabelaOJsBanco(tabelaId, ojs);

        // Atualizar contador
        document.getElementById(countId).textContent = ojs.length;

        // Esconder status de carregamento e mostrar resultados
        document.getElementById(statusId).classList.add('hidden');
        document.getElementById(resultadoId).classList.remove('hidden');
        document.getElementById(exportBtnId).disabled = false;

        console.log(`✅ ${ojs.length} OJs ${grau}º grau encontrados no banco (TODAS)`);

        this.showNotification(`✅ ${ojs.length} OJs ${grau}º grau carregados com sucesso`, 'success');

      } else {
        throw new Error(response.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error(`❌ Erro ao buscar TODAS as OJs ${grau}º grau:`, error);

      // Esconder status de carregamento
      document.getElementById(statusId).classList.add('hidden');

      // Mostrar mensagem de erro
      this.showNotification(`Erro ao carregar TODAS as OJs ${grau}º grau: ${error.message}`, 'error');
    }
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

/**
 * Renderiza tabela de OJs com dados do banco
 */
PeritoApp.prototype.renderizarTabelaOJsBanco = function(tabelaId, ojs) {
  const tbody = document.getElementById(tabelaId);
  tbody.innerHTML = '';

  // Utiliza a lista completa (sem excluir nenhum item)
  const lista = Array.isArray(ojs) ? ojs : [];

  // Função para extrair cidade do nome do órgão
  const extrairCidade = (nome) => {
    if (!nome) return 'Outras';

    const text = String(nome).trim();

    // Mapeamento direto para casos especiais conhecidos
    const mapeamentoEspecial = {
      // Padrões de códigos - extrair cidade após o hífen ou espaço
      'Con1 - Amparo': 'Amparo',
      'Con2 - Amparo': 'Amparo',
      'Con1 - Araraquara': 'Araraquara',
      'Con2 - Araraquara': 'Araraquara',
      'Dam - Araraquara': 'Araraquara',
      'Divex - Araraquara': 'Araraquara',
      'Exe1 - Araraquara': 'Araraquara',
      'Exe2 - Araraquara': 'Araraquara',
      'Exe3 - Araraquara': 'Araraquara',
      'Exe4 - Araraquara': 'Araraquara',
      'Liq1 - Araraquara': 'Araraquara',
      'Liq2 - Araraquara': 'Araraquara',
      'CCP ARARAQUARA': 'Araraquara',
      'CEJUSC ARARAQUARA': 'Araraquara',
      'CCP CAMPINAS': 'Campinas',
      'CEJUSC CAMPINAS': 'Campinas',
      // Divisões de Execução específicas
      'Divisão de Execução de Araçatuba': 'Araçatuba',
      'Divisão de Execução de Franca': 'Franca',
      'Divisão de Execução de Limeira': 'Limeira',
      'Divisão de Execução de Taubaté': 'Taubaté'
    };

    // Verificar mapeamento direto primeiro
    if (mapeamentoEspecial[text]) {
      return mapeamentoEspecial[text];
    }

    const genericWords = [
      'CENTRO', 'JUDICIÁRIO', 'JUDICIARIO', 'JUSTIÇA', 'JUSTICA', 'TRABALHO',
      'DIVISÃO', 'DIVISAO', 'EXECUÇÃO', 'EXECUCAO', 'LEILÕES', 'LEILOES',
      'MÉTODOS', 'METODOS', 'CONSENSUAIS', 'SOLUÇÃO', 'SOLUCAO', 'DISPUTAS',
      'CORREGEDORIA', 'GERAL', 'ASSESSORIA', 'APOIO', 'MAGISTRADOS', 'NÚCLEO', 'NUCLEO',
      'CÂMARA', 'CAMARA', 'TURMA', 'TRIBUNAL', 'VARA', 'JUIZADO', 'POSTO', 'AVANÇADO', 'AVANCADO', 'JT'
    ];

    const isGeneric = (s) => genericWords.includes((s || '').toUpperCase());

    const toCityCase = (s) => {
      const stop = ['de','da','do','das','dos','e','em','no','na','nos','nas','ao','aos','à','às'];
      return (s || '')
        .toLowerCase()
        .split(/(\s+|-)/)
        .map((tok, idx) => {
          if (/^\s+$/.test(tok) || tok === '-') return tok;
          if (/^\d+[ªº]?$/.test(tok)) return tok;
          if (stop.includes(tok) && idx !== 0) return tok;
          return tok.replace(/^([\p{L}])(.*)$/u, (m, a, b) => a.toUpperCase() + b);
        })
        .join('');
    };

    const validateCandidate = (cand) => {
      if (!cand) return null;
      const candTrim = cand.trim();
      const tokens = candTrim.split(/\s+/);
      // Rejeitar se contiver palavras genéricas
      if (tokens.some(t => isGeneric(t))) return null;
      // Aceitar se tiver ao menos uma palavra com inicial maiúscula
      if (!tokens.some(t => /^[A-ZÀ-Ý]/.test(t))) return null;
      return toCityCase(candTrim);
    };

    // Padrões especiais para códigos (CON, EXE, LIQ, DAM, DIVEX, CCP, CEJUSC)
    const codigoMatch = text.match(/^(Con\d+|Exe\d+|Liq\d+|Dam|Divex|CCP|CEJUSC)\s*[-\s]\s*([A-ZÀ-Ý][^-]*?)(?:\s*-.*)?$/i);
    if (codigoMatch && codigoMatch[2]) {
      const cidade = codigoMatch[2].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // Padrão especial para nomes completos de Varas
    const varaMatch = text.match(/(\d+[ªº]?\s*Vara\s+do\s+Trabalho\s+de\s+)([A-ZÀ-Ý][^,]*)/i);
    if (varaMatch && varaMatch[2]) {
      const cidade = varaMatch[2].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // Padrão para Juizados Especiais
    const juizadoMatch = text.match(/Juizado\s+Especial[^,]*?de\s+([A-ZÀ-Ý][^,]*)/i);
    if (juizadoMatch && juizadoMatch[1]) {
      const cidade = juizadoMatch[1].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // Padrão para Postos Avançados
    const postoMatch = text.match(/Posto\s+Avançado[^,]*?de\s+([A-ZÀ-Ý][^,\s]+(?:\s+[A-ZÀ-Ý][^,\s]+)*)/i);
    if (postoMatch && postoMatch[1]) {
      const cidade = postoMatch[1].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // Padrão para Órgãos Centralizadores
    const orgaoMatch = text.match(/Órgão\s+Centralizador[^,]*?de\s+([A-ZÀ-Ý][^,]*)/i);
    if (orgaoMatch && orgaoMatch[1]) {
      const cidade = orgaoMatch[1].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // Padrão genérico para qualquer estrutura "... de CIDADE"
    const genericDeMatch = text.match(/(?:Vara|Juizado|Centro|Posto|Órgão|Divisão|Tribunal)[^,]*?de\s+([A-ZÀ-Ý][^,\s]+(?:\s+(?:de|da|do|dos|das|e)\s+[A-ZÀ-Ý][^,\s]+)*)/i);
    if (genericDeMatch && genericDeMatch[1]) {
      const cidade = genericDeMatch[1].trim();
      const valid = validateCandidate(cidade);
      if (valid) return valid;
    }

    // 1) Texto com hífen: tentar direita do último hífen
    const hifenMatch = text.match(/-\s*([^\-]+)$/);
    if (hifenMatch && hifenMatch[1]) {
      const direita = hifenMatch[1];
      const valid = validateCandidate(direita);
      if (valid) return valid;
      // Se direita não for cidade, tentar extrair da esquerda
      const esquerda = text.slice(0, text.lastIndexOf('-')).trim();
      // Pegar a sequência final de cidade da esquerda (suporta compostas: "São José dos Campos")
      const toks = esquerda.split(/\s+/);
      let cityTokens = [];
      let started = false;
      for (let i = toks.length - 1; i >= 0; i--) {
        const tk = toks[i];
        const isConnector = /^(de|da|do|das|dos|e|em)$/i.test(tk);
        const startsUpper = /^[A-ZÀ-Ý]/.test(tk);
        if (!started) {
          if (startsUpper && !isGeneric(tk)) {
            cityTokens.unshift(tk);
            started = true;
            continue;
          } else {
            continue;
          }
        } else {
          if (isConnector || (startsUpper && !isGeneric(tk))) {
            cityTokens.unshift(tk);
            continue;
          }
          break;
        }
      }
      if (cityTokens.length) {
        const candidate = cityTokens.join(' ');
        const validLeft = validateCandidate(candidate);
        if (validLeft) return validLeft;
      }
    }

    // 2) Padrão especial: "de X em Y" => escolher X
    const deEmMatch = text.match(/\bde\s+(.+?)\s+em\s+[A-ZÀ-Ý]/i);
    if (deEmMatch && deEmMatch[1]) {
      const cand = deEmMatch[1];
      const valid = validateCandidate(cand);
      if (valid) return valid;
    }

    // 3) Procura por todas as ocorrências "de/da/do <Cidade>" e escolhe a última válida
    const padraoDeCidade = /\b(?:de|da|do)\s+([A-ZÀ-Ý][\p{L}'']+(?:\s+(?:[dD]e|da|do|dos|das|e)\s+[A-ZÀ-Ý][\p{L}'']+)*)/gu;
    let m;
    let ultimaValida = null;
    while ((m = padraoDeCidade.exec(text)) !== null) {
      const cand = m[1];
      const valid = validateCandidate(cand);
      if (valid) ultimaValida = valid;
    }
    if (ultimaValida) return ultimaValida;

    // 4) Sem indícios suficientes, enviar para "Outras"
    return 'Outras';
  };

  // Agrupar por cidade
  const ojsPorCidade = {};
  lista.forEach(oj => {
    const cidade = extrairCidade(oj.nome);
    if (!ojsPorCidade[cidade]) {
      ojsPorCidade[cidade] = [];
    }
    ojsPorCidade[cidade].push(oj);
  });

  // Ordenar cidades alfabeticamente (pt-BR, acentos e números)
  const cidadesOrdenadas = Object.keys(ojsPorCidade).sort((a, b) =>
    (a || '').localeCompare(b || '', 'pt-BR', { sensitivity: 'base', numeric: true })
  );

  // Renderizar agrupado por cidade com botão de copiar
  cidadesOrdenadas.forEach(cidade => {
    const headerRow = tbody.insertRow();
    headerRow.className = 'cidade-header';
    const headerCell = headerRow.insertCell();

    // Conteúdo do cabeçalho: nome da cidade + botão copiar
    headerCell.style.backgroundColor = 'var(--accent-color)';
    headerCell.style.color = 'white';
    headerCell.style.fontWeight = 'bold';
    headerCell.style.padding = '8px 12px';
    headerCell.style.fontSize = '1.1em';
    headerCell.style.display = 'flex';
    headerCell.style.justifyContent = 'space-between';
    headerCell.style.alignItems = 'center';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = cidade;
    headerCell.appendChild(titleSpan);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar';
    copyBtn.className = 'btn btn-secondary';
    copyBtn.style.background = 'rgba(255,255,255,0.15)';
    copyBtn.style.border = '1px solid rgba(255,255,255,0.3)';
    copyBtn.style.color = '#fff';
    copyBtn.style.padding = '4px 8px';
    copyBtn.style.fontSize = '0.85em';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.title = `Copiar OJs de ${cidade}`;
    copyBtn.addEventListener('click', async () => {
      try {
        const listaOrdenada = [...(ojsPorCidade[cidade] || [])]
          .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' }));
        const listaTexto = listaOrdenada
          .map(oj => this.formatarNomeOJ(oj.nome || ''))
          .filter(Boolean)
          .join('\n');
        await navigator.clipboard.writeText(listaTexto);
        if (typeof this.showNotification === 'function') {
          this.showNotification(`Copiado: ${listaOrdenada.length || 0} OJs de ${cidade}`, 'success');
        }
      } catch (err) {
        console.error('Erro ao copiar OJs:', err);
        if (typeof this.showNotification === 'function') {
          this.showNotification('Falha ao copiar lista para a área de transferência', 'error');
        }
      }
    });
    headerCell.appendChild(copyBtn);

    // Ordenar OJs da cidade alfabeticamente (pt-BR, acentos e números)
    const listaOrdenada = [...ojsPorCidade[cidade]]
      .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' }));

    listaOrdenada.forEach(oj => {
        const row = tbody.insertRow();
        row.className = 'oj-row';

        // Nome do Órgão (única coluna)
        const cellNome = row.insertCell();
        const nomeFormatado = this.formatarNomeOJ(oj.nome || '');
        cellNome.innerHTML = nomeFormatado || '-';
        cellNome.title = oj.nome || nomeFormatado;
        cellNome.style.paddingLeft = '20px'; // Indentação para mostrar hierarquia
      });
  });
};

// Nota: remoção de filtragem — agora todos os itens são mantidos e apenas agrupados por cidade.

/**
 * Retorna o nome do OJ exatamente como está no banco de dados
 * Sem nenhuma conversão ou mapeamento de códigos
 */
PeritoApp.prototype.formatarNomeOJ = function(nome) {
  if (!nome || typeof nome !== 'string') return nome;

  // Retorna o nome exatamente como está no banco
  return nome.trim();
};

/**
 * Testa conectividade com bancos PJE
 */
PeritoApp.prototype.testarConectividadeBanco = async function() {
  try {
    console.log('🔍 Testando conectividade com bancos PJE...');

    const response = await window.electronAPI.testarConectividadePJE();

    if (response.success) {
      const conectividade = response.conectividade;

      // Mostrar status de conectividade
      this.mostrarStatusConectividade(conectividade);

      const msg = `Conectividade PJE: 1º Grau ${conectividade.primeiroGrau ? '✅' : '❌'} | 2º Grau ${conectividade.segundoGrau ? '✅' : '❌'}`;
      this.showNotification(msg, conectividade.primeiroGrau && conectividade.segundoGrau ? 'success' : 'warning');

    } else {
      throw new Error(response.error || 'Erro no teste de conectividade');
    }

  } catch (error) {
    console.error('❌ Erro ao testar conectividade:', error);
    this.showNotification(`Erro no teste de conectividade: ${error.message}`, 'error');
  }
};

/**
 * Mostra status de conectividade na interface
 */
PeritoApp.prototype.mostrarStatusConectividade = function(conectividade) {
  // Criar elemento de status se não existir
  let statusElement = document.getElementById('connectivity-status');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'connectivity-status';
    statusElement.className = 'connectivity-status';

    // Inserir antes da primeira seção de OJs
    const ojs1Section = document.getElementById('ojs1grau-config');
    ojs1Section.parentNode.insertBefore(statusElement, ojs1Section);
  }

  const success = conectividade.primeiroGrau && conectividade.segundoGrau;
  statusElement.className = `connectivity-status ${success ? 'success' : 'error'}`;

  statusElement.innerHTML = `
    <div>
      <strong>Status de Conectividade PJE</strong>
      <div class="connectivity-details">
        1º Grau: ${conectividade.primeiroGrau ? '✅ Conectado' : '❌ Erro'} |
        2º Grau: ${conectividade.segundoGrau ? '✅ Conectado' : '❌ Erro'}
      </div>
    </div>
    <div>
      <small>${new Date().toLocaleString()}</small>
    </div>
  `;
};

/**
 * Exporta OJs para JSON
 */
PeritoApp.prototype.exportarOJsJSON = async function(grau) {
  try {
    const ojs = grau === '1' ? this.ojsData1Grau : this.ojsData2Grau;

    if (!ojs || ojs.length === 0) {
      this.showNotification('Nenhum dado para exportar. Execute a busca primeiro.', 'warning');
      return;
    }

    console.log(`📄 Exportando ${ojs.length} OJs do ${grau}º grau...`);

    const filename = `ojs-${grau}grau-${new Date().toISOString().split('T')[0]}.json`;
    const response = await window.electronAPI.exportarOJsJSON(ojs, `${grau}grau`, filename);

    if (response.success) {
      this.showNotification(`${response.totalExportados} OJs exportados com sucesso!`, 'success');
      console.log(`✅ Exportação concluída: ${response.filePath}`);

      // Mostrar info de exportação
      this.mostrarInfoExportacao(response.totalExportados, response.filePath);
    } else if (response.canceled) {
      console.log('ℹ️ Exportação cancelada pelo usuário');
    } else {
      throw new Error(response.error || 'Erro na exportação');
    }

  } catch (error) {
    console.error('❌ Erro ao exportar OJs:', error);
    this.showNotification(`Erro na exportação: ${error.message}`, 'error');
  }
};

/**
 * Mostra informação sobre exportação realizada
 */
PeritoApp.prototype.mostrarInfoExportacao = function(totalExportados, filePath) {
  // Criar elemento de info temporário
  const infoElement = document.createElement('div');
  infoElement.className = 'export-info';
  infoElement.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${totalExportados} órgãos exportados com sucesso!</span>
  `;

  // Inserir na seção ativa
  const activeSection = document.querySelector('.config-section:not(.hidden)') ||
                       document.querySelector('.config-section');
  if (activeSection) {
    activeSection.appendChild(infoElement);

    // Remover após 5 segundos
    setTimeout(() => {
      if (infoElement.parentNode) {
        infoElement.parentNode.removeChild(infoElement);
      }
    }, 5000);
  }
};

/**
 * Obtém estatísticas dos OJs
 */
PeritoApp.prototype.obterEstatisticasOJs = async function() {
  try {
    console.log('📊 Obtendo estatísticas dos OJs...');

    const response = await window.electronAPI.obterEstatisticasOJs();

    if (response.success) {
      const stats = response.estatisticas;
      console.log('📊 Estatísticas obtidas:', stats);

      // Mostrar estatísticas na interface
      this.mostrarEstatisticasOJs(stats);

      return stats;
    } else {
      throw new Error(response.error || 'Erro ao obter estatísticas');
    }

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    this.showNotification(`Erro ao obter estatísticas: ${error.message}`, 'error');
    return null;
  }
};

/**
 * Mostra estatísticas na interface
 */
PeritoApp.prototype.mostrarEstatisticasOJs = function(stats) {
  // Implementar exibição de estatísticas se necessário
  console.log('📊 Estatísticas PJE:', {
    '1º Grau': `${stats.primeiroGrau.ativos}/${stats.primeiroGrau.total} ativos`,
    '2º Grau': `${stats.segundoGrau.ativos}/${stats.segundoGrau.total} ativos`,
    timestamp: stats.timestamp
  });
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando aplicação PJE Automation...');

  try {
    // Criar instância da aplicação
    const app = new PeritoApp();
    // Disponibiliza referências globais esperadas por handlers inline
    window.app = app;
    
    // Tornar acessível globalmente para debugging
    window.peritoApp = app;

    // Adicionar event listeners para os novos botões de busca
    const buscarTodasOjs1GrauBtn = document.getElementById('buscarTodasOjs1Grau');
    const buscarTodasOjs2GrauBtn = document.getElementById('buscarTodasOjs2Grau');

    if (buscarTodasOjs1GrauBtn) {
      buscarTodasOjs1GrauBtn.addEventListener('click', function() {
        console.log('🔍 Clicado em Buscar Todas OJs 1º Grau');
        app.buscarTodasOJsDoBanco('1');
      });
    }

    if (buscarTodasOjs2GrauBtn) {
      buscarTodasOjs2GrauBtn.addEventListener('click', function() {
        console.log('🔍 Clicado em Buscar Todas OJs 2º Grau');
        app.buscarTodasOJsDoBanco('2');
      });
    }

    // Event listener para limpeza de cache de verificação de OJs
    const limparCacheBtn = document.getElementById('limparCacheOJs');
    if (limparCacheBtn) {
      limparCacheBtn.addEventListener('click', async function() {
        console.log('🧹 Iniciando limpeza de cache de verificação de OJs...');

        // Confirmar ação com o usuário
        const confirmar = confirm(
          'Tem certeza que deseja limpar o cache de verificação de OJs?\n\n' +
          'Esta ação irá:\n' +
          '• Remover todas as verificações salvas de OJs já cadastrados\n' +
          '• Fazer com que o sistema verifique novamente todos os OJs na próxima automação\n\n' +
          'Clique em OK para confirmar ou Cancelar para abortar.'
        );

        if (!confirmar) {
          console.log('🔄 Limpeza de cache cancelada pelo usuário');
          return;
        }

        try {
          // Desabilitar botão durante operação
          limparCacheBtn.disabled = true;
          limparCacheBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Limpando...';

          // Chamar IPC para limpar cache
          const resultado = await window.electronAPI.invoke('limpar-cache-verificacao');

          if (resultado.success) {
            console.log('✅ Cache de verificação limpo com sucesso');
            alert('Cache de verificação limpo com sucesso!\n\nNa próxima automação, o sistema verificará novamente todos os OJs.');
          } else {
            throw new Error(resultado.error || 'Erro desconhecido ao limpar cache');
          }

        } catch (error) {
          console.error('❌ Erro ao limpar cache:', error);
          alert(`Erro ao limpar cache: ${error.message}`);
        } finally {
          // Reabilitar botão
          limparCacheBtn.disabled = false;
          limparCacheBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Limpar Cache de Verificação';
        }
      });
    }

    // Adicionar filtro em tempo real para os campos de busca
    const setupFiltroTempoReal = (grau) => {
      const filtroInput = document.getElementById(`filtroOjs${grau}Grau`);
      if (!filtroInput) return;

      let timeoutId = null;

      // Filtro enquanto digita (com debounce)
      filtroInput.addEventListener('input', function() {
        clearTimeout(timeoutId);
        const valor = this.value.trim();

        // Se campo vazio, não fazer nada
        if (valor === '') return;

        // Filtrar com delay de 500ms para evitar muitas consultas
        timeoutId = setTimeout(() => {
          console.log(`🔍 Filtro em tempo real ${grau}º grau:`, valor);
          app.buscarTodasOJsDoBanco(grau);
        }, 500);
      });

      // Filtro ao pressionar Enter
      filtroInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          clearTimeout(timeoutId);
          console.log(`⏎ Enter pressionado - filtro ${grau}º grau:`, this.value.trim());
          app.buscarTodasOJsDoBanco(grau);
        }
      });
    };

    // Configurar filtro em tempo real para 1º e 2º grau
    setupFiltroTempoReal('1');
    setupFiltroTempoReal('2');

    console.log('✅ Aplicação PJE Automation iniciada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
  }
});
