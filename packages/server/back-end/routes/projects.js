const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { createAuditLog } = require('./audit');

/**
 * @swagger
 * tags:
 *   name: Projetos
 *   description: Gerenciamento de projetos
 */

// Middleware para verificar se o usuário tem acesso ao projeto através de sua lista pessoal
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    const project = await projectsDb.getData(`/projects/${projectId}`);
    
    // Verificar se o usuário (incluindo admin) tem o projeto na sua lista de projetos
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

// Middleware para verificar se o usuário é admin e tem acesso total ao projeto (para APIs administrativas)
const checkAdminProjectAccess = async (req, res, next) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem realizar esta operação'
      });
    }

    const projectId = req.params.projectId;
    const projectsDb = req.dbs.projects;
    
    const project = await projectsDb.getData(`/projects/${projectId}`);
    req.project = project;
    next();
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Projeto não encontrado'
    });
  }
};

/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags:
 *       - Projetos
 *     summary: Lista projetos do usuário (user/admin)
 *     description: Retorna apenas os projetos que o usuário tem acesso em sua lista pessoal. Funciona igual para usuários e administradores.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', checkAuth, async (req, res) => {
  try {
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    const userId = req.user.id;
    
    // Todos os usuários (incluindo admins) veem apenas projetos da sua lista pessoal
    const user = await usersDb.getData(`/users/${userId}`);
    const userProjectIds = user.projects || [];
    
    const allProjects = await projectsDb.getData('/projects');
    const projects = userProjectIds
      .map(projectId => {
        const project = allProjects[projectId];
        return project ? { id: projectId, ...project } : null;
      })
      .filter(project => project !== null);

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar projetos'
    });
  }
});

/**
 * @swagger
 * /api/projects/admin/all:
 *   get:
 *     tags:
 *       - Projetos
 *     summary: Lista todos os projetos do sistema (admin)
 *     description: Retorna todos os projetos existentes no sistema, independente de permissões (apenas para administradores)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de projetos obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado (não é admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/admin/all', checkAuth, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem acessar todos os projetos'
      });
    }

    const projectsDb = req.dbs.projects;
    
    // Admin vê todos os projetos do sistema
    const allProjects = await projectsDb.getData('/projects');
    const projects = Object.entries(allProjects).map(([id, project]) => ({
      id,
      ...project
    }));

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Erro ao listar todos os projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar todos os projetos'
    });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     tags:
 *       - Projetos
 *     summary: Cria um novo projeto (admin)
 *     description: Cria um novo projeto (apenas admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Meu Projeto"
 *               description:
 *                 type: string
 *                 example: "Descrição do projeto"
 *     responses:
 *       200:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado (não é admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', [
  checkAuth,
  body('name').notEmpty().withMessage('Nome do projeto é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória')
], async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem criar projetos'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description } = req.body;
    const projectsDb = req.dbs.projects;
    const userId = req.user.id;

    const projectId = Date.now().toString();
    const project = {
      id: projectId,
      name,
      description,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString()
    };

    // Criar projeto
    await projectsDb.push(`/projects/${projectId}`, project);

    // Adicionar projeto à lista de projetos do usuário criador
    const userDb = req.dbs.users;
    try {
      let userProjects = [];
      try {
        userProjects = await userDb.getData(`/users/${userId}/projects`);
      } catch (error) {
        // Se não existir, será criado
      }
      await userDb.push(`/users/${userId}/projects`, [...userProjects, projectId]);
    } catch (error) {
      console.error(`Erro ao adicionar projeto ao usuário ${userId}:`, error);
    }

    // Log de criação de projeto
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) criou o projeto "${name}"`,
      userId: userId,
      projectId: projectId
    });

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar projeto'
    });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   get:
 *     tags:
 *       - Projetos
 *     summary: Obtém detalhes de um projeto (user)
 *     description: Retorna os detalhes de um projeto específico
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
 *         description: Projeto obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado ao projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:projectId', checkAuth, checkProjectAccess, async (req, res) => {
  try {
    res.json({
      success: true,
      project: {
        id: req.params.projectId,
        ...req.project
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter projeto'
    });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   put:
 *     tags:
 *       - Projetos
 *     summary: Atualiza um projeto (admin)
 *     description: Atualiza os detalhes de um projeto existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Novo Nome do Projeto"
 *               description:
 *                 type: string
 *                 example: "Nova descrição do projeto"

 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado (não é admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:projectId', [
  checkAuth,
  checkAdminProjectAccess,
  body('name').optional().notEmpty().withMessage('Nome do projeto não pode ser vazio'),
  body('description').optional().notEmpty().withMessage('Descrição não pode ser vazia')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const projectId = req.params.projectId;
    const projectsDb = req.dbs.projects;
    
    // Projeto já foi validado pelo middleware checkAdminProjectAccess
    const project = req.project;

    const updates = req.body;
    
    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await projectsDb.push(`/projects/${projectId}`, updatedProject);

    // Log de atualização de projeto
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) atualizou o projeto "${updatedProject.name}"`,
      userId: req.user.id,
      projectId: projectId
    });

    res.json({
      success: true,
      project: updatedProject
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar projeto'
    });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   delete:
 *     tags:
 *       - Projetos
 *     summary: Deleta um projeto (admin)
 *     description: Remove um projeto do sistema
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
 *         description: Projeto deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Projeto deletado com sucesso"
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado (não é admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:projectId', checkAuth, checkAdminProjectAccess, async (req, res) => {
  try {

    const projectId = req.params.projectId;
    const projectsDb = req.dbs.projects;
    const userDb = req.dbs.users;
    const foldersDb = req.dbs.folders;
    const keysDb = req.dbs.keys;

    // Projeto já foi validado pelo middleware checkAdminProjectAccess
    const project = req.project;

    // Remover referência do projeto de todos os usuários que o têm
    const allUsers = await userDb.getData('/users');
    for (const [uid, user] of Object.entries(allUsers)) {
      if (user.projects && user.projects.includes(projectId)) {
        try {
          const userProjects = (user.projects || []).filter(pid => pid !== projectId);
          await userDb.push(`/users/${uid}/projects`, userProjects);

          // Log de remoção de usuário do projeto
          await createAuditLog(req.dbs.audit, {
            description: `Usuário ${user.name} (${user.email}) foi removido do projeto "${project.name}" devido à deleção do projeto por ${req.user.name} (${req.user.email})`,
            userId: uid,
            projectId: projectId
          });
        } catch (error) {
          console.error(`Erro ao remover projeto do usuário ${uid}:`, error);
        }
      }
    }

    // Deletar projeto e todos os seus dados relacionados
    await projectsDb.delete(`/projects/${projectId}`);
    
    // Deletar pastas do projeto
    try {
      const folderIds = await foldersDb.getData(`/folders_by_project/${projectId}`);
      await foldersDb.delete(`/folders_by_project/${projectId}`);
      
      // Deletar chaves de cada pasta
      for (const folderId of folderIds) {
        try {
          await keysDb.delete(`/folder_keys/${folderId}`);
          await foldersDb.delete(`/folders/${folderId}`);
        } catch (error) {
          // Ignora se não houver chaves ou pasta
        }
      }
    } catch (error) {
      // Ignora se não houver pastas
    }

    // Log de deleção de projeto
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) deletou o projeto "${project.name}"`,
      userId: req.user.id,
      projectId: projectId
    });

    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar projeto'
    });
  }
});

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
 * /api/projects/{projectId}/keys:
 *   get:
 *     tags:
 *       - Projetos
 *     summary: Obtém todas as chaves de um projeto organizadas por pasta (public)
 *     description: Retorna todas as chaves de todas as pastas de um projeto organizadas por nome da pasta. Requer um segredo de API válido via header X-API-Secret.
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *       - in: header
 *         name: X-API-Secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Segredo de API do projeto
 *     responses:
 *       200:
 *         description: Chaves obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 additionalProperties: true
 *               example:
 *                 "Pasta Desenvolvimento":
 *                   MINHA_CHAVE: "valor da chave"
 *                   NUMERO_CONFIGURACAO: 123
 *                 "Pasta Produção":
 *                   MINHA_CHAVE: "outro valor"
 *                   BOOLEAN_CONFIG: true
 *       401:
 *         description: Segredo inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:projectId/keys', checkSecretHeader, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const foldersDb = req.dbs.folders;
    const keysDb = req.dbs.keys;
    
    // Buscar todas as pastas do projeto
    let folderIds;
    try {
      folderIds = await foldersDb.getData(`/folders_by_project/${projectId}`);
    } catch (error) {
      folderIds = [];
    }

    // Buscar todas as chaves organizadas por pasta
    const result = {};
    
    for (const folderId of folderIds) {
      try {
        // Buscar informações da pasta
        const folder = await foldersDb.getData(`/folders/${folderId}`);
        const folderName = folder.name;
        
        // Buscar chaves da pasta
        const folderKeys = await keysDb.getData(`/folder_keys/${folderId}`);
        
        // Criar objeto com as chaves da pasta
        const folderKeysObj = {};
        Object.values(folderKeys).forEach(key => {
          folderKeysObj[key.name] = key.value;
        });
        
        // Adicionar pasta ao resultado se tiver chaves
        if (Object.keys(folderKeysObj).length > 0) {
          result[folderName] = folderKeysObj;
        }
      } catch (error) {
        // Ignora se a pasta não existir ou não tiver chaves
        continue;
      }
    }

    setTimeout(() => {
      res.json(result);
    }, 10000);
  } catch (error) {
    console.error('Erro ao obter chaves do projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter chaves do projeto'
    });
  }
});

module.exports = router; 