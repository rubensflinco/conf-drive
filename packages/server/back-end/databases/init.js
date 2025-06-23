const fs = require('fs').promises;
const path = require('path');

const DATABASE_FILES = {
  'users.json': {
    users: {},
    users_by_email: {}
  },
  'projects.json': {
    projects: {}
  },
  'audit.json': {
    audit_logs: [],
    audit_by_user: {},
    audit_by_project: {},
    audit_by_key: {},
    audit_by_folder: {}
  },
  'folders.json': {
    folders: {},
    folders_by_project: {}
  },
  'keys.json': {
    keys: {},
    keys_by_folder: {}
  },
  'secrets.json': {
    secrets: {},
    secrets_by_project: {}
  },
  'cache.json': {
    invalidations: [],
    global_invalidations: [],
    project_invalidations: [],
    folder_invalidations: []
  }
};

async function initializeDatabases() {
  const databaseDir = __dirname;

  try {
    // Verifica se o diretório databases existe
    try {
      await fs.access(databaseDir);
    } catch {
      console.log('📁 Criando diretório de bancos de dados...');
      await fs.mkdir(databaseDir, { recursive: true });
    }

    // Verifica e inicializa cada arquivo de banco de dados
    for (const [filename, initialStructure] of Object.entries(DATABASE_FILES)) {
      const filePath = path.join(databaseDir, filename);
      
      try {
        await fs.access(filePath);
        console.log(`✅ Banco de dados ${filename} já existe`);
      } catch {
        console.log(`📝 Criando banco de dados ${filename} com estrutura inicial...`);
        await fs.writeFile(
          filePath,
          JSON.stringify(initialStructure, null, 2),
          'utf8'
        );
        console.log(`✅ Banco de dados ${filename} criado com sucesso`);
      }
    }

    console.log('🚀 Todos os bancos de dados foram inicializados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar bancos de dados:', error);
    throw error;
  }
}

module.exports = { initializeDatabases }; 