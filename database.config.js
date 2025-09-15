// Configuração do banco de dados
// Centraliza todas as configurações de conexão

module.exports = {
  // Configuração principal do banco
  database: {
    host: 'pje-db-bugfix-a1',
    port: 5432,
    user: 'msxxxxxxx',
    password: 'xxxxxxxxxxx',
    max: 10, // Máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Configuração para banco de 1º grau
  database1Grau: {
    host: 'pje-db-bugfix-a1',
    port: 5432,
    database: 'pje_1grau_bugfix',
    user: 'msxxxxxx',
    password: 'xxxxxxxxxxxx',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Configuração para banco de 2º grau
  database2Grau: {
    host: 'pje-db-bugfix-a2',
    port: 5432,
    database: 'pje_2grau_bugfix',
    user: 'msxxxx',
    password: 'xxxxxxxxxxxxx',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Configurações de cache
  cache: {
    expiration: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000,
  },
  
  // Configurações de otimização
  optimization: {
    enableDatabaseVerification: true,
    enableCache: true,
    enableNormalization: true,
    skipAlreadyProcessed: true,
  }
};

