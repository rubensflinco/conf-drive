const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { createAuditLog } = require('./audit');
const { body, validationResult } = require('express-validator');
const { generateHash } = require('./auth');

// Função comum para criar usuários
const createUser = async (userDb, { name, email, password, role, projects = [] }) => {
  try {
    // Verificar se usuário já existe
    try {
      await userDb.getData(`/users_by_email/${email}`);
      return {
        success: false,
        message: 'Usuário já existe'
      };
    } catch (error) {
      // Usuário não existe, podemos continuar
    }

    const hashedPassword = await generateHash(password);
    const userId = role === 'admin' ? 'admin-' + Date.now().toString() : Date.now().toString();
    
    const user = {
      name,
      email,
      password: hashedPassword,
      role,
      projects, // Agora recebe a lista de projetos do parâmetro
      createdAt: new Date().toISOString()
    };

    await userDb.push(`/users/${userId}`, user);
    await userDb.push(`/users_by_email/${email}`, userId);

    return {
      success: true,
      user: {
        id: userId,
        name,
        email,
        role,
        projects
      }
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return {
      success: false,
      message: 'Erro ao criar usuário'
    };
  }
};

// Função para criar usuário admin
const createAdminUser = async (userDb) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const result = await createUser(userDb, {
      name: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      projects: [] // Admin inicialmente não tem projetos
    });

    if (result.success) {
      console.log('Usuário admin criado com sucesso');
    } else if (result.message === 'Usuário já existe') {
      console.log('Usuário admin já existe');
    } else {
      console.error('Erro ao criar usuário admin:', result.message);
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Usuários
 *     summary: Lista todos os usuários (admin)
 *     description: Retorna a lista de todos os usuários (apenas para administradores)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários obtida com sucesso
 *       403:
 *         description: Acesso negado (não é admin)
 */
router.get('/', checkAuth, isAdmin, async (req, res) => {
  try {
    const userDb = req.dbs.users;
    const projectsDb = req.dbs.projects;
    const users = await userDb.getData('/users');

    // Remover senhas e informações sensíveis e adicionar projetos
    const sanitizedUsers = await Promise.all(
      Object.entries(users).map(async ([id, user]) => {
        // Obter projetos do usuário
        let userProjects = [];
        try {
          const projectIds = user.projects || [];
          const projects = await Promise.all(
            projectIds.map(async (projectId) => {
              try {
                const project = await projectsDb.getData(`/projects/${projectId}`);
                return {
                  id: projectId,
                  name: project.name,
                  description: project.description
                };
              } catch (error) {
                return null;
              }
            })
          );
          userProjects = projects.filter(p => p !== null);
        } catch (error) {
          console.error(`Erro ao obter projetos do usuário ${id}:`, error);
        }

        return {
          id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          projects: userProjects
        };
      })
    );

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) listou todos os usuários`,
      userId: req.user.id
    });

    res.json({
      success: true,
      users: sanitizedUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     tags:
 *       - Usuários
 *     summary: Deleta um usuário (admin)
 *     description: Remove um usuário do sistema (apenas para administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *       403:
 *         description: Acesso negado (não é admin)
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:userId', checkAuth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userDb = req.dbs.users;
    const projectsDb = req.dbs.projects;

    // Verificar se não está tentando deletar o próprio usuário admin
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Não é permitido deletar o próprio usuário'
      });
    }

    // Obter informações do usuário antes de deletar
    let user;
    try {
      user = await userDb.getData(`/users/${userId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se não está tentando deletar outro admin
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não é permitido deletar outros administradores'
      });
    }

    // Remover usuário dos projetos que participa
    const userProjects = user.projects || [];
    for (const projectId of userProjects) {
      try {
        const project = await projectsDb.getData(`/projects/${projectId}`);
        const updatedUsers = (project.users || []).filter(uid => uid !== userId);
        await projectsDb.push(`/projects/${projectId}/users`, updatedUsers);

        // Log de remoção do usuário do projeto
        await createAuditLog(req.dbs.audit, {
          description: `Usuário ${user.name} (${user.email}) foi removido do projeto "${project.name}" devido à sua deleção por ${req.user.name} (${req.user.email})`,
          userId: userId,
          projectId: projectId
        });
      } catch (error) {
        console.error(`Erro ao remover usuário do projeto ${projectId}:`, error);
      }
    }

    // Deletar usuário
    await userDb.delete(`/users/${userId}`);
    await userDb.delete(`/users_by_email/${user.email}`);

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) deletou o usuário ${user.name} (${user.email})`,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar usuário'
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     tags:
 *       - Usuários
 *     summary: Atualiza um usuário (admin)
 *     description: Atualiza a role e/ou projetos de um usuário (apenas para administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: "user"
 *               projects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de IDs dos projetos que o usuário terá acesso
 *                 example: ["123", "456"]
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado (não é admin)
 *       404:
 *         description: Usuário não encontrado
 */
router.put('/:userId', [
  checkAuth,
  isAdmin,
  body('role').optional().isIn(['user', 'admin']).withMessage('Role deve ser user ou admin'),
  body('projects').optional().isArray().withMessage('Lista de projetos deve ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { role, projects, name, password, email } = req.body;
    const userDb = req.dbs.users;
    const projectsDb = req.dbs.projects;

    // Verificar se usuário existe
    let user;
    try {
      user = await userDb.getData(`/users/${userId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir alterar email de usuario
    if (email) {
      return res.status(403).json({
        success: false,
        message: 'Não é permitido alterar o email do usuário'
      });
    }


    // Atualizar senha se fornecida
    if (password) {
      const hashedPassword = await generateHash(password);
      await userDb.push(`/users/${userId}/password`, hashedPassword);
      await createAuditLog(req.dbs.audit, {
        description: `Senha do usuário ${user.name} (${user.email}) foi alterada por ${req.user.name} (${req.user.email})`,
        userId: userId
      });
    }
    
    // Atualizar role se fornecida
    if (role) {
      await userDb.push(`/users/${userId}/role`, role);
      await createAuditLog(req.dbs.audit, {
        description: `Role do usuário ${user.name} (${user.email}) foi alterada de ${user.role} para ${role} por ${req.user.name} (${req.user.email})`,
        userId: userId
      });
    }

    if (name) {
      await userDb.push(`/users/${userId}/name`, name);
      await createAuditLog(req.dbs.audit, {
        description: `Nome do usuário ${user.name} (${user.email}) foi alterado para ${name} por ${req.user.name} (${req.user.email})`,
        userId: userId
      });
    }

    // Atualizar projetos se fornecidos
    if (projects) {
      // Verificar se todos os projetos existem
      for (const projectId of projects) {
        try {
          await projectsDb.getData(`/projects/${projectId}`);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `Projeto ${projectId} não encontrado`
          });
        }
      }

      const currentProjects = user.projects || [];
      
      // Remover usuário dos projetos que não estão mais na lista
      const removedProjects = currentProjects.filter(pid => !projects.includes(pid));
      for (const projectId of removedProjects) {
        try {
          const project = await projectsDb.getData(`/projects/${projectId}`);
          const updatedUsers = (project.users || []).filter(uid => uid !== userId);
          await projectsDb.push(`/projects/${projectId}/users`, updatedUsers);

          // Log de remoção do usuário do projeto
          await createAuditLog(req.dbs.audit, {
            description: `Usuário ${user.name} (${user.email}) foi removido do projeto "${project.name}" por ${req.user.name} (${req.user.email})`,
            userId: userId,
            projectId: projectId
          });
        } catch (error) {
          console.error(`Erro ao remover usuário do projeto ${projectId}:`, error);
        }
      }

      // Adicionar usuário aos novos projetos
      const addedProjects = projects.filter(pid => !currentProjects.includes(pid));
      for (const projectId of addedProjects) {
        try {
          const project = await projectsDb.getData(`/projects/${projectId}`);
          const updatedUsers = [...(project.users || []), userId];
          await projectsDb.push(`/projects/${projectId}/users`, updatedUsers);

          // Log de adição do usuário ao projeto
          await createAuditLog(req.dbs.audit, {
            description: `Usuário ${user.name} (${user.email}) foi adicionado ao projeto "${project.name}" por ${req.user.name} (${req.user.email})`,
            userId: userId,
            projectId: projectId
          });
        } catch (error) {
          console.error(`Erro ao adicionar usuário ao projeto ${projectId}:`, error);
        }
      }

      // Atualizar lista de projetos do usuário
      await userDb.push(`/users/${userId}/projects`, projects);
    }

    // Obter usuário atualizado com detalhes dos projetos
    const updatedUser = await userDb.getData(`/users/${userId}`);
    const userProjects = await Promise.all(
      (updatedUser.projects || []).map(async (projectId) => {
        try {
          const project = await projectsDb.getData(`/projects/${projectId}`);
          return {
            id: projectId,
            name: project.name,
            description: project.description
          };
        } catch (error) {
          return null;
        }
      })
    );

    res.json({
      success: true,
      user: {
        id: userId,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        projects: userProjects.filter(p => p !== null)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário'
    });
  }
});

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags:
 *       - Usuários
 *     summary: Registra um novo usuário (admin)
 *     description: Cria uma nova conta de usuário (apenas administradores podem criar novos usuários)
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
 *               - email
 *               - password
 *               - role
 *               - projects
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: "user"
 *               projects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de IDs dos projetos que o usuário terá acesso
 *                 example: ["123", "456"]
 *     responses:
 *       200:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado (não é admin)
 */
router.post('/register', [
  checkAuth,
  isAdmin,
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres'),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('role').isIn(['user', 'admin']).withMessage('Role deve ser user ou admin'),
  body('projects').isArray().withMessage('Lista de projetos deve ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name, role, projects } = req.body;
    const userDb = req.dbs.users;
    const projectsDb = req.dbs.projects;

    // Verificar se todos os projetos existem
    for (const projectId of projects) {
      try {
        await projectsDb.getData(`/projects/${projectId}`);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Projeto ${projectId} não encontrado`
        });
      }
    }

    const result = await createUser(userDb, {
      name,
      email,
      password,
      role: role || 'user',
      projects
    });

    if (result.success) {
      // Adicionar usuário aos projetos
      for (const projectId of projects) {
        try {
                  const project = await projectsDb.getData(`/projects/${projectId}`);
        const updatedUsers = [...(project.users || []), result.user.id];
        await projectsDb.push(`/projects/${projectId}/users`, updatedUsers);

          // Log de adição do usuário ao projeto
          await createAuditLog(req.dbs.audit, {
            description: `Usuário ${name} (${email}) foi adicionado ao projeto "${project.name}" durante sua criação por ${req.user.name} (${req.user.email})`,
            userId: result.user.id,
            projectId: projectId
          });
        } catch (error) {
          console.error(`Erro ao adicionar usuário ao projeto ${projectId}:`, error);
        }
      }

      // Criar log de auditoria
      await createAuditLog(req.dbs.audit, {
        description: `Usuário ${name} (${email}) foi registrado com role ${role} por ${req.user.name} (${req.user.email})`,
        userId: result.user.id,
      });
      await createAuditLog(req.dbs.audit, {
        description: `Usuário ${req.user.name} (${req.user.email}) registrou o novo usuário ${name} (${email}) com role ${role}`,
        userId: req.user.id,
      });

      // Obter detalhes dos projetos para retornar
      const userProjects = await Promise.all(
        projects.map(async (projectId) => {
          try {
            const project = await projectsDb.getData(`/projects/${projectId}`);
            return {
              id: projectId,
              name: project.name,
              description: project.description
            };
          } catch (error) {
            return null;
          }
        })
      );

      res.json({
        success: true,
        user: {
          ...result.user,
          projects: userProjects.filter(p => p !== null)
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário'
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags:
 *       - Usuários
 *     summary: Obtém detalhes de um usuário específico (admin)
 *     description: Retorna os detalhes de um usuário específico (apenas para administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do usuário obtidos com sucesso
 *       403:
 *         description: Acesso negado (não é admin)
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:userId', checkAuth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userDb = req.dbs.users;
    const projectsDb = req.dbs.projects;

    // Obter usuário
    let user;
    try {
      user = await userDb.getData(`/users/${userId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Obter detalhes dos projetos do usuário
    const userProjects = await Promise.all(
      (user.projects || []).map(async (projectId) => {
        try {
          const project = await projectsDb.getData(`/projects/${projectId}`);
          return {
            id: projectId,
            name: project.name,
            description: project.description
          };
        } catch (error) {
          return null;
        }
      })
    );

    // Log de auditoria
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) consultou os detalhes do usuário ${user.name} (${user.email})`,
      userId: req.user.id
    });

    res.json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        projects: userProjects.filter(p => p !== null)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter detalhes do usuário'
    });
  }
});

module.exports = {
  router,
  createAdminUser
};
