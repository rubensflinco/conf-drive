const express = require('express');
const cors = require('cors');
const path = require('path');
const { JsonDB, Config } = require('node-json-db');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const auth = require('./routes/auth');
const users = require('./routes/users');
const audit = require('./routes/audit');
const morgan = require('morgan');
const fs = require('fs');
const { initializeDatabases } = require('./databases/init');
require('dotenv').config();

const app = express();

// Inicialização dos bancos de dados
initializeDatabases().catch(error => {
  console.error('Erro fatal ao inicializar bancos de dados:', error);
  process.exit(1);
});

// Configuração dos bancos de dados JSON
const userDb = new JsonDB(new Config("databases/users", true, true, '/'));
const projectsDb = new JsonDB(new Config("databases/projects", true, true, '/'));
const auditDb = new JsonDB(new Config("databases/audit", true, true, '/'));
const foldersDb = new JsonDB(new Config("databases/folders", true, true, '/'));
const keysDb = new JsonDB(new Config("databases/keys", true, true, '/'));
const secretsDb = new JsonDB(new Config("databases/secrets", true, true, '/'));
const cacheDb = new JsonDB(new Config("databases/cache", true, true, '/'));

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configuração dos logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Formato personalizado do Morgan
morgan.token('user-id', (req) => req.user ? req.user.id : 'anonymous');
morgan.token('body', (req) => {
  if (req.body && Object.keys(req.body).length) {
    // Remove campos sensíveis
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    return JSON.stringify(sanitizedBody);
  }
  return '-';
});

// Formato do log
const logFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body';

// Middleware de logs
app.use(morgan(logFormat, {
  stream: accessLogStream, // Log em arquivo
  skip: (req) => req.url === '/health' // Ignora health checks
}));

// Log no console apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(morgan(logFormat, {
    skip: (req) => req.url === '/health'
  }));
}

// Inicializar admin na inicialização do servidor
users.createAdminUser(userDb);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Documentação Swagger
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ConfDrive API Documentation'
}));

// Injetando as instâncias do banco nos requests
app.use((req, res, next) => {
  req.dbs = {
    users: userDb,
    projects: projectsDb,
    audit: auditDb,
    folders: foldersDb,
    keys: keysDb,
    secrets: secretsDb,
    cache: cacheDb
  };
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', auth.router);
app.use('/api/projects', require('./routes/projects'));
app.use('/api/audit', audit.router);
app.use('/api/users', users.router);
app.use('/api/folders', require('./routes/folders'));
app.use('/api/keys', require('./routes/keys'));
app.use('/api/secrets', require('./routes/secrets'));
app.use('/api/cache', require('./routes/cache'));

// Tratamento de erros
app.use((err, req, res, next) => {
  // Log do erro
  console.error(new Date().toISOString(), err.stack);
  
  // Log em arquivo
  fs.appendFileSync(
    path.join(logsDir, 'error.log'),
    `${new Date().toISOString()} - ${err.stack}\n`
  );

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
