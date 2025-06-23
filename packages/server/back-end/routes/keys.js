const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { createAuditLog } = require('./audit');

/**
 * @swagger
 * tags:
 *   name: Chaves
 *   description: Gerenciamento de chaves de configuração dentro das pastas
 */

// Middleware para verificar acesso à pasta
const checkFolderAccess = async (req, res, next) => {
  try {
    const folderId = req.params.folderId || req.body.folderId;
    const foldersDb = req.dbs.folders;
    const usersDb = req.dbs.users;
    
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
    const project = await projectsDb.getData(`/projects/${foundProjectId}`);
    
    if (req.user.role === 'admin') {
      req.folder = folder;
      req.project = project;
      next();
    } else {
      // Verificar se o usuário tem o projeto na sua lista de projetos
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (userProjects.includes(foundProjectId)) {
        req.folder = folder;
        req.project = project;
        next();
      } else {
        res.status(403).json({
          success: false,
          message: 'Acesso negado à pasta'
        });
      }
    }
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Pasta não encontrada'
    });
  }
};

// Validador de valor baseado no tipo
const validateValue = (value, type) => {
  try {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false';
      case 'json':
        JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      case 'array':
        const parsedArray = JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
        return Array.isArray(parsedArray);
      case 'html':
        return typeof value === 'string';
      case 'css':
        return typeof value === 'string';
      case 'javascript':
        return typeof value === 'string';
      case 'color':
        return typeof value === 'string' && /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(value);
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * @swagger
 * /api/keys/folder/{folderId}:
 *   get:
 *     tags:
 *       - Chaves
 *     summary: Lista todas as chaves de uma pasta (user)
 *     description: Retorna todas as chaves pertencentes a uma pasta específica
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
 *         description: Lista de chaves obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 keys:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Key'
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
router.get('/folder/:folderId', checkAuth, checkFolderAccess, async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const keysDb = req.dbs.keys;
    
    let folderKeys;
    try {
      folderKeys = await keysDb.getData(`/folder_keys/${folderId}`);
    } catch (error) {
      folderKeys = {};
    }

    const keys = Object.entries(folderKeys).map(([id, key]) => ({
      id,
      ...key
    }));

    res.json({
      success: true,
      keys
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar chaves'
    });
  }
});

/**
 * @swagger
 * /api/keys:
 *   post:
 *     tags:
 *       - Chaves
 *     summary: Cria uma nova chave (user)
 *     description: Cria uma nova chave dentro de uma pasta
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderId
 *               - name
 *               - type
 *               - value
 *             properties:
 *               folderId:
 *                 type: string
 *                 example: "123456789"
 *               name:
 *                 type: string
 *                 example: "MINHA_CHAVE"
 *               type:
 *                 type: string
 *                 enum: [string, number, boolean, json, array, html, css, javascript, color]
 *                 example: "string"
 *               value:
 *                 type: string
 *                 example: "valor da chave"
 *               description:
 *                 type: string
 *                 example: "Descrição da chave"
 *     responses:
 *       200:
 *         description: Chave criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 key:
 *                   $ref: '#/components/schemas/Key'
 *       400:
 *         description: Dados inválidos ou valor incompatível com o tipo
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
router.post('/', [
  checkAuth,
  body('folderId').notEmpty().withMessage('ID da pasta é obrigatório'),
  body('name').notEmpty().withMessage('Nome da chave é obrigatório'),
  body('type').isIn(['string', 'number', 'boolean', 'json', 'array', 'html', 'css', 'javascript', 'color']).withMessage('Tipo inválido'),
  body('value').notEmpty().withMessage('Valor é obrigatório'),
  body('description').optional()
], checkFolderAccess, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { folderId, name, type, value, description } = req.body;
    
    // Validar valor baseado no tipo
    if (!validateValue(value, type)) {
      return res.status(400).json({
        success: false,
        message: 'Valor inválido para o tipo especificado'
      });
    }

    const keysDb = req.dbs.keys;

    // Verificar se já existe uma chave com o mesmo nome na pasta
    try {
      const folderKeys = await keysDb.getData(`/folder_keys/${folderId}`);
      const existingKey = Object.values(folderKeys).find(key => key.name === name);
      if (existingKey) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma chave com este nome nesta pasta'
        });
      }
    } catch (error) {
      // Pasta não tem chaves ainda, podemos continuar
    }

    const keyId = Date.now().toString();
    const key = {
      name,
      type,
      value: (['json', 'array'].includes(type)) ? JSON.parse(typeof value === 'string' ? value : JSON.stringify(value)) : value,
      description: description || '',
      folderId,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    await keysDb.push(`/folder_keys/${folderId}/${keyId}`, key);

    // Log de criação de chave
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) criou a chave "${name}" no projeto ${req.project.id}${folderId ? ` e pasta ${folderId}` : ''}`,
      userId: req.user.id,
      projectId: req.project.id,
      keyId: keyId,
      folderId: folderId || null
    });

    res.json({
      success: true,
      key: {
        id: keyId,
        ...key
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar chave'
    });
  }
});

/**
 * @swagger
 * /api/keys/{keyId}:
 *   get:
 *     tags:
 *       - Chaves
 *     summary: Obtém uma chave específica (user)
 *     description: Retorna os detalhes de uma chave específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da chave
 *     responses:
 *       200:
 *         description: Chave obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 key:
 *                   $ref: '#/components/schemas/Key'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado à chave
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chave não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rota de busca global - deve vir ANTES da rota /:keyId
router.get('/search', checkAuth, async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const limit = parseInt(req.query.limit) || 20;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Termo de busca é obrigatório'
      });
    }

    const keysDb = req.dbs.keys;
    const foldersDb = req.dbs.folders;
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;

    // Buscar projetos que o usuário tem acesso
    const user = await usersDb.getData(`/users/${req.user.id}`);
    const userProjectIds = user.projects || [];

    if (userProjectIds.length === 0) {
      return res.json({
        success: true,
        results: [],
        totalResults: 0
      });
    }

    // Buscar todas as chaves organizadas por pasta
    const folderKeys = await keysDb.getData('/folder_keys');
    const allFolders = await foldersDb.getData('/folders');
    const allProjects = await projectsDb.getData('/projects');

    const results = [];
    const searchTermLower = searchTerm.toLowerCase();

    // Iterar sobre cada pasta que contém chaves
    for (const folderId in folderKeys) {
      const folder = allFolders[folderId];
      
      // Verificar se a pasta existe e se o usuário tem acesso ao projeto
      if (folder && userProjectIds.includes(folder.projectId)) {
        const project = allProjects[folder.projectId];
        
        if (project) {
          // Iterar sobre as chaves da pasta
          for (const keyId in folderKeys[folderId]) {
            const key = folderKeys[folderId][keyId];
            
            // Verificar se a chave corresponde ao termo de busca
            const keyNameMatch = key.name.toLowerCase().includes(searchTermLower);
            const keyDescMatch = key.description && key.description.toLowerCase().includes(searchTermLower);
            const keyValueMatch = typeof key.value === 'string' && key.value.toLowerCase().includes(searchTermLower);
            
            if (keyNameMatch || keyDescMatch || keyValueMatch) {
              results.push({
                key: {
                  id: keyId,
                  ...key
                },
                folder: {
                  id: folder.id,
                  name: folder.name
                },
                project: {
                  id: folder.projectId,
                  name: project.name
                }
              });
            }
          }
        }
      }
    }

    // Ordenar por relevância (primeiro por nome, depois por descrição, depois por valor)
    results.sort((a, b) => {
      const aNameMatch = a.key.name.toLowerCase().includes(searchTermLower);
      const bNameMatch = b.key.name.toLowerCase().includes(searchTermLower);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return a.key.name.localeCompare(b.key.name);
    });

    // Limitar resultados
    const limitedResults = results.slice(0, limit);

    res.json({
      success: true,
      results: limitedResults,
      totalResults: results.length
    });

  } catch (error) {
    console.error('Erro na busca de chaves:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

router.get('/:keyId', checkAuth, async (req, res) => {
  try {
    const keyId = req.params.keyId;
    const keysDb = req.dbs.keys;
    
    // Buscar chave em todas as pastas
    let key = null;
    let foundFolderId = null;
    
    const allFolders = await keysDb.getData('/folder_keys');
    for (const [folderId, keys] of Object.entries(allFolders)) {
      if (keys[keyId]) {
        key = keys[keyId];
        foundFolderId = folderId;
        break;
      }
    }

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Chave não encontrada'
      });
    }

    // Verificar acesso à pasta
    const foldersDb = req.dbs.folders;
    let folder = null;
    let foundProjectId = null;
    
    try {
      folder = await foldersDb.getData(`/folders/${foundFolderId}`);
      foundProjectId = folder.projectId;
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    // Verificar acesso ao projeto
    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    const project = await projectsDb.getData(`/projects/${foundProjectId}`);
    
    if (req.user.role !== 'admin') {
      // Verificar se o usuário tem o projeto na sua lista de projetos
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (!userProjects.includes(foundProjectId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado à chave'
        });
      }
    }

    res.json({
      success: true,
      key: {
        id: keyId,
        ...key
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter chave'
    });
  }
});

/**
 * @swagger
 * /api/keys/{keyId}:
 *   put:
 *     tags:
 *       - Chaves
 *     summary: Atualiza uma chave (user)
 *     description: Atualiza os detalhes de uma chave existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da chave
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "NOVA_CHAVE"
 *               type:
 *                 type: string
 *                 enum: [string, number, boolean, json, array, html, css, javascript, color]
 *                 example: "string"
 *               value:
 *                 type: string
 *                 example: "novo valor"
 *               description:
 *                 type: string
 *                 example: "Nova descrição da chave"
 *     responses:
 *       200:
 *         description: Chave atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 key:
 *                   $ref: '#/components/schemas/Key'
 *       400:
 *         description: Dados inválidos ou valor incompatível com o tipo
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
 *         description: Acesso negado à chave
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chave não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:keyId', [
  checkAuth,
  body('name').optional().notEmpty().withMessage('Nome da chave não pode ser vazio'),
  body('type').optional().isIn(['string', 'number', 'boolean', 'json', 'array', 'html', 'css', 'javascript', 'color']).withMessage('Tipo inválido'),
  body('value').optional(),
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

    const keyId = req.params.keyId;
    const keysDb = req.dbs.keys;
    
    // Buscar chave e verificar acesso
    let key = null;
    let foundFolderId = null;
    
    const allFolders = await keysDb.getData('/folder_keys');
    for (const [folderId, keys] of Object.entries(allFolders)) {
      if (keys[keyId]) {
        key = keys[keyId];
        foundFolderId = folderId;
        break;
      }
    }

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Chave não encontrada'
      });
    }

    // Verificar acesso à pasta/projeto
    const foldersDb = req.dbs.folders;
    let foundProjectId = null;
    
    try {
      const folder = await foldersDb.getData(`/folders/${foundFolderId}`);
      foundProjectId = folder.projectId;
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    const project = await projectsDb.getData(`/projects/${foundProjectId}`);
    
    if (req.user.role !== 'admin') {
      // Verificar se o usuário tem o projeto na sua lista de projetos
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (!userProjects.includes(foundProjectId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado à chave'
        });
      }
    }

    const updates = req.body;
    
    // Se o tipo for atualizado, validar o valor existente ou o novo valor
    if (updates.type || updates.value) {
      const newType = updates.type || key.type;
      const newValue = updates.value === undefined ? key.value : updates.value;
      
      if (!validateValue(newValue, newType)) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido para o tipo especificado'
        });
      }

      if (['json', 'array'].includes(newType)) {
        updates.value = JSON.parse(typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
      } else if (updates.value !== undefined) {
        updates.value = newValue;
      }
    }

    // Se o nome for atualizado, verificar duplicatas
    if (updates.name && updates.name !== key.name) {
      const folderKeys = await keysDb.getData(`/folder_keys/${foundFolderId}`);
      const existingKey = Object.values(folderKeys).find(k => k.name === updates.name && k.id !== keyId);
      if (existingKey) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma chave com este nome nesta pasta'
        });
      }
    }

    const updatedKey = {
      ...key,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await keysDb.push(`/folder_keys/${foundFolderId}/${keyId}`, updatedKey);

    // Log de atualização de chave
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) atualizou a chave "${updatedKey.name}"`,
      userId: req.user.id,
      projectId: foundProjectId,
      keyId: keyId,
      folderId: foundFolderId || null
    });

    res.json({
      success: true,
      key: {
        id: keyId,
        ...updatedKey
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar chave'
    });
  }
});

/**
 * @swagger
 * /api/keys/{keyId}:
 *   delete:
 *     tags:
 *       - Chaves
 *     summary: Deleta uma chave (user)
 *     description: Remove uma chave do sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da chave
 *     responses:
 *       200:
 *         description: Chave deletada com sucesso
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
 *                   example: "Chave deletada com sucesso"
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado à chave
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chave não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:keyId', checkAuth, async (req, res) => {
  try {
    const keyId = req.params.keyId;
    const keysDb = req.dbs.keys;
    
    // Buscar chave e verificar acesso
    let foundFolderId = null;
    
    const allFolders = await keysDb.getData('/folder_keys');
    for (const [folderId, keys] of Object.entries(allFolders)) {
      if (keys[keyId]) {
        foundFolderId = folderId;
        break;
      }
    }

    if (!foundFolderId) {
      return res.status(404).json({
        success: false,
        message: 'Chave não encontrada'
      });
    }

    // Verificar acesso à pasta/projeto
    const foldersDb = req.dbs.folders;
    let foundProjectId = null;
    
    try {
      const folder = await foldersDb.getData(`/folders/${foundFolderId}`);
      foundProjectId = folder.projectId;
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const projectsDb = req.dbs.projects;
    const usersDb = req.dbs.users;
    const project = await projectsDb.getData(`/projects/${foundProjectId}`);
    
    if (req.user.role !== 'admin') {
      // Verificar se o usuário tem o projeto na sua lista de projetos
      const user = await usersDb.getData(`/users/${req.user.id}`);
      const userProjects = user.projects || [];
      
      if (!userProjects.includes(foundProjectId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado à chave'
        });
      }
    }

    // Obter a chave antes de deletar para o log
    const key = await keysDb.getData(`/folder_keys/${foundFolderId}/${keyId}`);
    
    await keysDb.delete(`/folder_keys/${foundFolderId}/${keyId}`);

    // Log de deleção de chave
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) deletou a chave "${key.name}"`,
      userId: req.user.id,
      projectId: foundProjectId,
      keyId: keyId,
      folderId: foundFolderId || null
    });

    res.json({
      success: true,
      message: 'Chave deletada com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar chave'
    });
  }
});

module.exports = router; 