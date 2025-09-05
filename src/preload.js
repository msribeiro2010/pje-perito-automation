const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Automação de Peritos
  startAutomation: (data) => ipcRenderer.invoke('start-automation', data),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  pauseAutomation: () => ipcRenderer.invoke('pause-automation'),
  resumeAutomation: () => ipcRenderer.invoke('resume-automation'),
  
  // Automação de Servidores
  startServidorAutomation: (data) => ipcRenderer.invoke('start-servidor-automation', data),
  stopServidorAutomation: () => ipcRenderer.invoke('stop-servidor-automation'),
  getServidorAutomationStatus: () => ipcRenderer.invoke('get-servidor-automation-status'),
  
  // Automação de Servidores V2
  startServidorAutomationV2: (config) => ipcRenderer.invoke('start-servidor-automation-v2', config),
  startParallelAutomationV2: (config) => ipcRenderer.invoke('start-parallel-automation-v2', config),
  stopServidorAutomationV2: () => ipcRenderer.invoke('stop-servidor-automation-v2'),
  getServidorAutomationV2Status: () => ipcRenderer.invoke('get-servidor-automation-v2-status'),
  getServidorAutomationV2Report: () => ipcRenderer.invoke('get-servidor-automation-v2-report'),
  validateServidorConfigV2: (config) => ipcRenderer.invoke('validate-servidor-config-v2', config),
  
  // Dados
  saveData: (key, data) => ipcRenderer.invoke('save-data', key, data),
  loadData: (key) => ipcRenderer.invoke('load-data', key),
  
  // Configuração
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // Arquivos
  importFile: (type) => ipcRenderer.invoke('import-file', type),
  exportFile: (data, filename) => ipcRenderer.invoke('export-file', data, filename),
  
  // Órgãos PJE
  loadOrgaosPje: () => ipcRenderer.invoke('load-orgaos-pje'),
  
  // Eventos
  onAutomationStatus: (callback) => {
    ipcRenderer.on('automation-status', (event, data) => callback(data));
  },
  
  onAutomationProgress: (callback) => {
    ipcRenderer.on('automation-progress', (event, data) => callback(data));
  },
  
  onAutomationReport: (callback) => {
    ipcRenderer.on('automation-report', (event, data) => callback(data));
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Função genérica invoke para compatibilidade
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});