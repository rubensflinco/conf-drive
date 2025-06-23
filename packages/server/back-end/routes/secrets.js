const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { createAuditLog } = require('./audit');
const crypto = require('crypto');

/**
 * @swagger
 * tags:
 *   name: Segredos
 *   description: Gerenciamento de segredos de API dos projetos
 */

// Middleware para verificar acesso ao projeto
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    const project = await projectsDb.getData(`/projects/${projectId}`);
    
    // Verificar se o usuário tem o projeto na sua lista de projetos
    const user = await usersDb.getData(`/users/${req.user.id}`);
    const userProjects = user.projects || [];
    
    if (userProjects.includes(projectId)) {
      req.project = project;
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Acesso negado ao projeto'
      });
    }
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Projeto não encontrado'
    });
  }
};

// Middleware para verificar se o segredo pertence ao projeto
const checkSecretAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const secretId = req.params.secretId;
    const secretsDb = req.dbs.secrets;
    
    let secret = null;
    try {
      const projectSecrets = await secretsDb.getData(`/secrets_by_project/${projectId}`);
      secret = projectSecrets[secretId];
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Segredo não encontrado'
      });
    }

    if (!secret) {
      return res.status(404).json({
        success: false,
        message: 'Segredo não encontrado'
      });
    }

    req.secret = secret;
    next();
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Erro ao verificar acesso ao segredo'
    });
  }
};

// Middleware para verificar segredo via header
const checkSecretHeader = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const secretHeader = req.header('X-API-Secret');
    
    if (!secretHeader) {
      return res.status(401).json({
        success: false,
        message: 'Header X-API-Secret não fornecido'
      });
    }

    const secretsDb = req.dbs.secrets;
    
    let projectSecrets;
    try {
      projectSecrets = await secretsDb.getData(`/secrets_by_project/${projectId}`);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Segredo inválido'
      });
    }

    // Verificar se o segredo existe no projeto
    const validSecret = Object.values(projectSecrets).find(secret => secret.value === secretHeader);
    
    if (!validSecret) {
      return res.status(401).json({
        success: false,
        message: 'Segredo inválido'
      });
    }

    req.validSecret = validSecret;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Erro ao validar segredo'
    });
  }
};

/**
 * @swagger
 * /api/secrets/project/{projectId}:
 *   get:
 *     tags:
 *       - Segredos
 *     summary: Lista todos os segredos de um projeto
 *     description: Retorna todos os segredos pertencentes a um projeto específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Lista de segredos obtida com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado ao projeto
 *       404:
 *         description: Projeto não encontrado
 */
router.get('/project/:projectId', checkAuth, checkProjectAccess, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const secretsDb = req.dbs.secrets;
    
    let projectSecrets;
    try {
      projectSecrets = await secretsDb.getData(`/secrets_by_project/${projectId}`);
    } catch (error) {
      projectSecrets = {};
    }

    const secrets = Object.entries(projectSecrets).map(([id, secret]) => ({
      id,
      name: secret.name,
      description: secret.description,
      createdAt: secret.createdAt,
      createdBy: secret.createdBy,
      updatedAt: secret.updatedAt,
      updatedBy: secret.updatedBy
      // Note: não retornamos o valor do segredo para segurança
    }));

    res.json({
      success: true,
      secrets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar segredos'
    });
  }
});

/**
 * @swagger
 * /api/secrets:
 *   post:
 *     tags:
 *       - Segredos
 *     summary: Cria um novo segredo
 *     description: Cria um novo segredo para um projeto
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - name
 *               - description
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "123456789"
 *               name:
 *                 type: string
 *                 example: "API Secret Prod"
 *               description:
 *                 type: string
 *                 example: "Segredo para ambiente de produção"
 *     responses:
 *       201:
 *         description: Segredo criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado ao projeto
 */
router.post('/', [
  checkAuth,
  body('projectId').notEmpty().withMessage('ID do projeto é obrigatório'),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { projectId, name, description } = req.body;
    
    // Verificar acesso ao projeto
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    try {
      const project = await projectsDb.getData(`/projects/${projectId}`);
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (!userProjects.includes(projectId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao projeto'
        });
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    const secretsDb = req.dbs.secrets;
    const secretId = Date.now().toString();
    const secretValue = crypto.randomBytes(32).toString('hex'); // Gerar segredo aleatório
    
    const secret = {
      name,
      description,
      value: secretValue,
      projectId,
      createdAt: new Date().toISOString(),
      createdBy: req.user.name,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };

    // Salvar no banco
    await secretsDb.push(`/secrets/${secretId}`, secret);
    await secretsDb.push(`/secrets_by_project/${projectId}/${secretId}`, secret);

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_SECRET',
      resourceType: 'secret',
      resourceId: secretId,
      projectId: projectId,
      details: `Criou o segredo "${name}"`
    });

    res.status(201).json({
      success: true,
      message: 'Segredo criado com sucesso',
      secret: {
        id: secretId,
        name: secret.name,
        description: secret.description,
        value: secret.value, // Retornamos o valor apenas na criação
        createdAt: secret.createdAt,
        createdBy: secret.createdBy
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar segredo'
    });
  }
});

/**
 * @swagger
 * /api/secrets/{secretId}:
 *   put:
 *     tags:
 *       - Segredos
 *     summary: Atualiza um segredo
 *     description: Atualiza a descrição de um segredo existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: secretId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do segredo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - description
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "123456789"
 *               description:
 *                 type: string
 *                 example: "Nova descrição do segredo"
 *     responses:
 *       200:
 *         description: Segredo atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Segredo não encontrado
 */
router.put('/:secretId', [
  checkAuth,
  body('projectId').notEmpty().withMessage('ID do projeto é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { projectId, description } = req.body;
    const secretId = req.params.secretId;
    
    // Verificar acesso ao projeto
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    try {
      const project = await projectsDb.getData(`/projects/${projectId}`);
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (!userProjects.includes(projectId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao projeto'
        });
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    const secretsDb = req.dbs.secrets;
    
    // Verificar se o segredo existe e pertence ao projeto
    let secret;
    try {
      const projectSecrets = await secretsDb.getData(`/secrets_by_project/${projectId}`);
      secret = projectSecrets[secretId];
      
      if (!secret) {
        return res.status(404).json({
          success: false,
          message: 'Segredo não encontrado'
        });
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Segredo não encontrado'
      });
    }

    // Atualizar segredo
    const updatedSecret = {
      ...secret,
      description,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };

    await secretsDb.push(`/secrets/${secretId}`, updatedSecret);
    await secretsDb.push(`/secrets_by_project/${projectId}/${secretId}`, updatedSecret);

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_SECRET',
      resourceType: 'secret',
      resourceId: secretId,
      projectId: projectId,
      details: `Atualizou a descrição do segredo "${secret.name}"`
    });

    res.json({
      success: true,
      message: 'Segredo atualizado com sucesso',
      secret: {
        id: secretId,
        name: updatedSecret.name,
        description: updatedSecret.description,
        updatedAt: updatedSecret.updatedAt,
        updatedBy: updatedSecret.updatedBy
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar segredo'
    });
  }
});

/**
 * @swagger
 * /api/secrets/{secretId}:
 *   delete:
 *     tags:
 *       - Segredos
 *     summary: Remove um segredo (apenas admin)
 *     description: Remove um segredo do projeto (apenas administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: secretId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do segredo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "123456789"
 *     responses:
 *       200:
 *         description: Segredo removido com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado (não é admin)
 *       404:
 *         description: Segredo não encontrado
 */
router.delete('/:secretId', [
  checkAuth,
  isAdmin,
  body('projectId').notEmpty().withMessage('ID do projeto é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { projectId } = req.body;
    const secretId = req.params.secretId;
    
    const secretsDb = req.dbs.secrets;
    
    // Verificar se o segredo existe
    let secret;
    try {
      const projectSecrets = await secretsDb.getData(`/secrets_by_project/${projectId}`);
      secret = projectSecrets[secretId];
      
      if (!secret) {
        return res.status(404).json({
          success: false,
          message: 'Segredo não encontrado'
        });
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Segredo não encontrado'
      });
    }

    // Remover segredo
    await secretsDb.delete(`/secrets/${secretId}`);
    await secretsDb.delete(`/secrets_by_project/${projectId}/${secretId}`);

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_SECRET',
      resourceType: 'secret',
      resourceId: secretId,
      projectId: projectId,
      details: `Removeu o segredo "${secret.name}"`
    });

    res.json({
      success: true,
      message: 'Segredo removido com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover segredo'
    });
  }
});

module.exports = router; 