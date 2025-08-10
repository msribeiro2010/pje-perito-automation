const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Peritos
  loadPeritos: () => ipcRenderer.invoke('load-peritos'),
  savePeritos: (peritos) => ipcRenderer.invoke('save-peritos', peritos),
  
  // Configurações
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Automação
  startAutomation: (selectedPeritos) => ipcRenderer.invoke('start-automation', selectedPeritos),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  onAutomationStatus: (callback) => {
    ipcRenderer.on('automation-status', (event, data) => callback(data));
  },
  
  // Dialogs
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog')
});