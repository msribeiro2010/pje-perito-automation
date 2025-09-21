/**
 * Serviço para consulta de Servidores no banco de dados PJE
 * Implementa busca direta de servidores do 1º e 2º graus com filtros
 */

const DatabaseConnection = require('./database-connection');

class ServidorDatabaseService {
  constructor() {
    this.dbConnection = new DatabaseConnection();
  }

  /**
     * Busca servidores por CPF/Nome e perfil
     * @param {string} grau - Grau do servidor (1 ou 2)
     * @param {string} filtroNome - Filtro por nome ou CPF
     * @param {string} filtroPerfil - Filtro por perfil
     * @param {number} limite - Limite de resultados (padrão: 100)
     * @returns {Promise<Array>} Lista de servidores encontrados
     */
  async buscarServidores(grau = '1', filtroNome = '', perfil = '', limite = 100, incluirDataFim = false) {
    try {
      console.log('🔍 Iniciando busca de servidores...');
      console.log(`📋 Parâmetros: grau=${grau}, filtroNome=${filtroNome}, perfil=${perfil}, limite=${limite}, incluirDataFim=${incluirDataFim}`);
            
      // Usar o banco correto baseado no grau
      const config = require('../../database.config.js');
      const { Pool } = require('pg');
            
      // Selecionar configuração baseada no grau
      const dbConfig = grau === '2' ? config.database2Grau : config.database1Grau;
      console.log(`📋 Conectando ao banco do ${grau}º grau: ${dbConfig.database}`);
            
      // Criar pool específico para o grau
      const pool = new Pool(dbConfig);
            
      // Testar conexão
      const testClient = await pool.connect();
      await testClient.query('SELECT 1');
      testClient.release();
      console.log(`✅ Conectado ao banco do ${grau}º grau`);
            
      let query = `
                SELECT 
                    l.id_usuario,
                    l.ds_nome as nome,
                    l.ds_login as cpf,
                    p.ds_nome as perfil,
                    COALESCE(o.ds_orgao_julgador, 'Não informado') as orgao_julgador,
                    us.dt_inicio as data_inicio,
                    ul.id_usuario_localizacao
                FROM pje.tb_usuario_login l
                JOIN pje.tb_usuario_localizacao ul ON l.id_usuario = ul.id_usuario
                LEFT JOIN pje.tb_usu_local_mgtdo_servdor us ON ul.id_usuario_localizacao = us.id_usu_local_mgstrado_servidor
                LEFT JOIN pje.tb_orgao_julgador o ON us.id_orgao_julgador = o.id_orgao_julgador
                LEFT JOIN pje.tb_papel p ON p.id_papel = ul.id_papel
                WHERE 1=1
            `;
            
      const params = [];
      let paramIndex = 1;
            
      // Filtro por CPF ou Nome
      if (filtroNome && filtroNome.trim()) {
        const filtro = filtroNome.trim();
        // Se contém apenas números, buscar por CPF, senão buscar por nome
        if (/^\d+$/.test(filtro)) {
          query += ` AND l.ds_login = $${paramIndex}`;
          params.push(filtro);
        } else {
          query += ` AND UPPER(l.ds_nome) LIKE UPPER($${paramIndex})`;
          params.push(`%${filtro}%`);
        }
        paramIndex++;
      }
            
      // Filtro por perfil
      if (perfil && perfil.trim()) {
        query += ` AND UPPER(p.ds_nome) LIKE UPPER($${paramIndex})`;
        params.push(`%${perfil.trim()}%`);
        paramIndex++;
      }
            
      // Filtro por data fim preenchida
      if (incluirDataFim) {
        query += ' AND us.dt_final IS NOT NULL';
      }
            
      query += `
                ORDER BY l.ds_nome, o.ds_orgao_julgador
            `;
            
      // Adicionar limite
      if (limite > 0) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limite);
      }
            
      console.log('📋 Query de servidores: ', query);
      console.log('📋 Parâmetros:', params);
            
      const client = await pool.connect();
      const result = await client.query(query, params);
      client.release();
            
      // Agrupar dados por servidor
      const servidoresMap = new Map();
            
      result.rows.forEach(row => {
        const servidorKey = `${row.id_usuario}-${row.cpf}`;
                
        if (!servidoresMap.has(servidorKey)) {
          servidoresMap.set(servidorKey, {
            id: row.id_usuario,
            nome: row.nome,
            cpf: row.cpf,
            ojs: []
          });
        }
                
        // Adicionar OJ apenas se existir
        if (row.orgao_julgador) {
          servidoresMap.get(servidorKey).ojs.push({
            orgaoJulgador: row.orgao_julgador,
            perfil: row.perfil || 'Não informado',
            dataInicio: row.data_inicio ? new Date(row.data_inicio).toLocaleDateString('pt-BR') : 'Não informado',
            idUsuarioLocalizacao: row.id_usuario_localizacao
          });
        }
      });
            
      const servidores = Array.from(servidoresMap.values());
            
      console.log(`✅ Encontrados ${servidores.length} servidores com ${result.rows.length} vínculos`);
            
      // Fechar o pool
      await pool.end();
            
      return servidores;
            
    } catch (error) {
      console.error(`❌ Erro ao buscar servidores ${grau}º grau:`, error);
      // Tentar fechar o pool se existir
      if (typeof pool !== 'undefined' && pool) {
        try {
          await pool.end();
        } catch (e) {
          console.error('Erro ao fechar pool:', e);
        }
      }
      throw error;
    }
  }

  /**
     * Busca OJs vinculados a um servidor específico
     * @param {number} idUsuarioLocalizacao - ID da localização do usuário
     * @returns {Promise<Array>} Lista de OJs vinculados
     */
  async buscarOJsDoServidor(idUsuarioLocalizacao) {
    try {
      console.log(`🔍 Buscando OJs do servidor (ID: ${idUsuarioLocalizacao})`);
            
      // Inicializar conexão
      await this.dbConnection.initialize();
            
      const query = `
                SELECT DISTINCT
                    oj.id_orgao_julgador as id,
                    oj.ds_orgao_julgador as nome,
                    oj.in_ativo as ativo,
                    'Primeiro Grau' as grau
                FROM pje.tb_orgao_julgador oj
                JOIN pje.tb_usuario_localizacao_movimento ulm ON oj.id_orgao_julgador = ulm.id_orgao_julgador
                WHERE ulm.id_usuario_localizacao = $1
                    AND oj.in_ativo = 'S'
                ORDER BY oj.ds_orgao_julgador
            `;
            
      const client = await this.dbConnection.pool.connect();
      const result = await client.query(query, [idUsuarioLocalizacao]);
      client.release();
            
      console.log(`✅ Encontrados ${result.rows.length} OJs vinculados`);
            
      return result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        ativo: row.ativo === 'S',
        grau: row.grau,
        status: row.ativo === 'S' ? 'Ativo' : 'Inativo'
      }));
            
    } catch (error) {
      console.error('❌ Erro ao buscar OJs do servidor:', error);
      throw error;
    }
  }

  /**
     * Testa conectividade com o banco de dados
     * @returns {Promise<boolean>} True se conectado com sucesso
     */
  async testarConectividade() {
    try {
      console.log('🔌 Testando conectividade com banco de dados...');
            
      // Inicializar conexão
      await this.dbConnection.initialize();
            
      const client = await this.dbConnection.pool.connect();
      const result = await client.query('SELECT 1 as teste');
      client.release();
      return {
        conectado: true,
        timestamp: new Date().toISOString(),
        detalhes: 'Conexão estabelecida com sucesso'
      };
            
    } catch (error) {
      console.error('❌ Erro ao testar conectividade:', error);
      return false;
    }
  }

  /**
     * Fecha a conexão com o banco
     */
  async close() {
    if (this.dbConnection) {
      await this.dbConnection.close();
    }
  }
}

module.exports = ServidorDatabaseService;