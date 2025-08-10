const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Função para carregar configurações dinamicamente do arquivo .env
function loadConfig() {
  try {
    const envPath = path.join(__dirname, '../.env');
    const parsed = dotenv.config({ path: envPath });
    if (parsed.error && parsed.error.code !== 'ENOENT') {
      console.error('Erro ao carregar .env:', parsed.error);
    }
    const envFromFile = parsed.parsed || {};
    return {
      PJE_URL: process.env.PJE_URL || envFromFile.PJE_URL || '',
      LOGIN: process.env.LOGIN || envFromFile.LOGIN || '',
      PASSWORD: process.env.PASSWORD || envFromFile.PASSWORD || ''
    };
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    return {};
  }
}

module.exports = { loadConfig };
