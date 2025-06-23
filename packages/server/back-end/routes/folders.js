const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { createAuditLog } = require('./audit');

/**
 * @swagger
 * tags:
 *   name: Pastas
 *   description: Gerenciamento de pastas dentro dos projetos
 */

// Middleware para verificar acesso ao projeto
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    const project = await projectsDb.getData(`/projects/${projectId}`);
    
    if (req.user.role === 'admin') {
      req.project = project;
      next();
    } else {
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
    }
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Projeto não encontrado'
    });
  }
};

/**
 * @swagger
 * /api/folders/project/{projectId}:
 *   get:
 *     tags:
 *       - Pastas
 *     summary: Lista todas as pastas de um projeto (user)
 *     description: Retorna todas as pastas de um projeto específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Lista de pastas obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado
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
router.get('/project/:projectId', checkAuth, checkProjectAccess, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const foldersDb = req.dbs.folders;
    
    let folderIds;
    try {
      folderIds = await foldersDb.getData(`/folders_by_project/${projectId}`);
    } catch (error) {
      folderIds = [];
    }

    const folders = [];
    for (const folderId of folderIds) {
      try {
        const folder = await foldersDb.getData(`/folders/${folderId}`);
        folders.push({
          id: folderId,
          ...folder
        });
      } catch (error) {
        console.error(`Erro ao carregar pasta ${folderId}:`, error);
      }
    }

    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Erro ao listar pastas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pastas'
    });
  }
});

/**
 * @swagger
 * /api/folders:
 *   post:
 *     tags:
 *       - Pastas
 *     summary: Cria uma nova pasta (user)
 *     description: Cria uma nova pasta em um projeto
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
 *               - projectId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Minha Pasta"
 *               description:
 *                 type: string
 *                 example: "Descrição da pasta"
 *               projectId:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Pasta criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 folder:
 *                   $ref: '#/components/schemas/Folder'
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
 */
router.post('/', [
  checkAuth,
  body('projectId').notEmpty().withMessage('ID do projeto é obrigatório'),
  body('name').notEmpty().withMessage('Nome da pasta é obrigatório'),
  body('description').optional().notEmpty().withMessage('Descrição não pode ser vazia')
], checkProjectAccess, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId, name, description } = req.body;
    const foldersDb = req.dbs.folders;
    const userId = req.user.id;

    const folderId = Date.now().toString();
    const folder = {
      id: folderId,
      name,
      description: description || '',
      projectId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva a pasta
    await foldersDb.push(`/folders/${folderId}`, folder);
    await foldersDb.push(`/folders_by_project/${projectId}[]`, folderId);

    // Log de criação de pasta
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) criou a pasta "${name}" no projeto ${projectId}`,
      userId: userId,
      projectId: projectId,
      action: 'create_folder',
      details: {
        folderId,
        folderName: name
      }
    });

    res.json({
      success: true,
      folder
    });
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar pasta'
    });
  }
});

/**
 * @swagger
 * /api/folders/{folderId}:
 *   get:
 *     tags:
 *       - Pastas
 *     summary: Obtém uma pasta específica (user)
 *     description: Retorna os detalhes de uma pasta específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pasta
 *     responses:
 *       200:
 *         description: Pasta obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 folder:
 *                   $ref: '#/components/schemas/Folder'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado à pasta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pasta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:folderId', checkAuth, async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const foldersDb = req.dbs.folders;
    
    // Buscar pasta diretamente
    let folder = null;
    try {
      folder = await foldersDb.getData(`/folders/${folderId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const foundProjectId = folder.projectId;

    // Verificar acesso ao projeto
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    try {
      const project = await projectsDb.getData(`/projects/${foundProjectId}`);
      
      if (req.user.role !== 'admin') {
        // Verificar se o usuário tem o projeto na sua lista de projetos
        const user = await usersDb.getData(`/users/${req.user.id}`);
        const userProjects = user.projects || [];
        
        if (!userProjects.includes(foundProjectId)) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado à pasta'
          });
        }
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.json({
      success: true,
      folder: {
        id: folderId,
        ...folder
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter pasta'
    });
  }
});

/**
 * @swagger
 * /api/folders/{folderId}:
 *   put:
 *     tags:
 *       - Pastas
 *     summary: Atualiza uma pasta (user)
 *     description: Atualiza os detalhes de uma pasta existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pasta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Novo Nome da Pasta"
 *               description:
 *                 type: string
 *                 example: "Nova descrição da pasta"
 *     responses:
 *       200:
 *         description: Pasta atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 folder:
 *                   $ref: '#/components/schemas/Folder'
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
 *         description: Acesso negado à pasta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pasta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:folderId', [
  checkAuth,
  body('name').optional().notEmpty().withMessage('Nome da pasta não pode ser vazio'),
  body('description').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const folderId = req.params.folderId;
    const foldersDb = req.dbs.folders;
    
    // Buscar pasta diretamente
    let folder = null;
    try {
      folder = await foldersDb.getData(`/folders/${folderId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const foundProjectId = folder.projectId;

    // Verificar acesso ao projeto
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    
    try {
      const project = await projectsDb.getData(`/projects/${foundProjectId}`);
      
      if (req.user.role !== 'admin') {
        // Verificar se o usuário tem o projeto na sua lista de projetos
        const user = await usersDb.getData(`/users/${req.user.id}`);
        const userProjects = user.projects || [];
        
        if (!userProjects.includes(foundProjectId)) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado à pasta'
          });
        }
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    const updates = req.body;
    const updatedFolder = {
      ...folder,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await foldersDb.push(`/folders/${folderId}`, updatedFolder);

    // Log de atualização de pasta
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) atualizou a pasta "${updatedFolder.name}"`,
      userId: req.user.id,
      projectId: foundProjectId,
      folderId: folderId
    });

    res.json({
      success: true,
      folder: {
        id: folderId,
        ...updatedFolder
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar pasta'
    });
  }
});

/**
 * @swagger
 * /api/folders/{folderId}:
 *   delete:
 *     tags:
 *       - Pastas
 *     summary: Deleta uma pasta (admin)
 *     description: Remove uma pasta do sistema. Apenas administradores podem deletar pastas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pasta
 *     responses:
 *       200:
 *         description: Pasta deletada com sucesso
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
 *                   example: "Pasta deletada com sucesso"
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado à pasta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pasta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:folderId', checkAuth, isAdmin, async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const foldersDb = req.dbs.folders;
    const keysDb = req.dbs.keys;
    
    // Buscar pasta diretamente
    let folder = null;
    try {
      folder = await foldersDb.getData(`/folders/${folderId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const foundProjectId = folder.projectId;

    // Verificar se o projeto existe
    const projectsDb = req.dbs.projects;
    
    try {
      const project = await projectsDb.getData(`/projects/${foundProjectId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Deletar pasta e suas chaves
    await foldersDb.delete(`/folders/${folderId}`);
    
    // Remover pasta do índice do projeto
    try {
      const folderIds = await foldersDb.getData(`/folders_by_project/${foundProjectId}`);
      const updatedFolderIds = folderIds.filter(id => id !== folderId);
      await foldersDb.push(`/folders_by_project/${foundProjectId}`, updatedFolderIds);
    } catch (error) {
      console.error('Erro ao atualizar índice de pastas do projeto:', error);
    }
    
    // Deletar chaves da pasta
    try {
      await keysDb.delete(`/folder_keys/${folderId}`);
    } catch (error) {
      // Ignora se não houver chaves
    }

    // Log de deleção de pasta
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) deletou a pasta "${folder.name}"`,
      userId: req.user.id,
      projectId: foundProjectId,
      folderId: folderId
    });

    res.json({
      success: true,
      message: 'Pasta deletada com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar pasta'
    });
  }
});

// Middleware para verificar segredo via header para pastas
const checkSecretHeaderForFolder = async (req, res, next) => {
  try {
    const folderId = req.params.folderId;
    const secretHeader = req.header('X-API-Secret');
    
    if (!secretHeader) {
      return res.status(401).json({
        success: false,
        message: 'Header X-API-Secret não fornecido'
      });
    }

    const foldersDb = req.dbs.folders;
    const secretsDb = req.dbs.secrets;
    
    // Buscar pasta para obter projectId
    let folder;
    try {
      folder = await foldersDb.getData(`/folders/${folderId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const projectId = folder.projectId;
    
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
    req.folder = folder;
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
 * /api/folders/{folderId}/keys:
 *   get:
 *     tags:
 *       - Pastas
 *     summary: Obtém todas as chaves de uma pasta (público)
 *     description: Retorna todas as chaves de uma pasta em formato JSON chave-valor. Requer um segredo de API válido via header X-API-Secret.
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pasta
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
 *               additionalProperties: true
 *               example:
 *                 MINHA_CHAVE: "valor da chave"
 *                 NUMERO_CONFIGURACAO: 123
 *                 BOOLEAN_CONFIG: true
 *       401:
 *         description: Segredo inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pasta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:folderId/keys', checkSecretHeaderForFolder, async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const keysDb = req.dbs.keys;
    
    // A pasta já foi verificada pelo middleware
    const folder = req.folder;

    // Buscar todas as chaves da pasta
    let folderKeys;
    try {
      folderKeys = await keysDb.getData(`/folder_keys/${folderId}`);
    } catch (error) {
      folderKeys = {};
    }

    // Converter para formato chave-valor
    const result = {};
    Object.values(folderKeys).forEach(key => {
      result[key.name] = key.value;
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao obter chaves da pasta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter chaves da pasta'
    });
  }
});

module.exports = router; 