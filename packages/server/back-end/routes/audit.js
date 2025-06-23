const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');

// Função para criar um log de auditoria
const createAuditLog = async (auditDb, {
  description,
  userId = null,
  projectId = null,
  keyId = null,
  folderId = null
}) => {
  try {
    const timestamp = new Date().toISOString();
    const logId = Date.now().toString();
    
    const logEntry = {
      id: logId,
      timestamp,
      description,
      userId,
      projectId,
      keyId,
      folderId
    };

    // Adicionar ao log principal
    await auditDb.push('/audit_logs[]', logEntry);

    // Indexar por usuário se houver
    if (userId) {
      await auditDb.push(`/audit_by_user/${userId}[]`, logId);
    }

    // Indexar por projeto se houver
    if (projectId) {
      await auditDb.push(`/audit_by_project/${projectId}[]`, logId);
    }

    // Indexar por chave se houver
    if (keyId) {
      await auditDb.push(`/audit_by_key/${keyId}[]`, logId);
    }

    // Indexar por pasta se houver
    if (folderId) {
      await auditDb.push(`/audit_by_folder/${folderId}[]`, logId);
    }

    return logEntry;
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    throw error;
  }
};

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém todos os logs de auditoria (admin)
 *     description: Retorna todos os logs de auditoria do sistema
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs obtida com sucesso
 */
router.get('/logs', checkAuth, isAdmin, async (req, res) => {
  try {
    const auditDb = req.dbs.audit;
    let logs = await auditDb.getData('/audit_logs');
    logs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao obter logs' });
  }
});

/**
 * @swagger
 * /api/audit/user/{userId}:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém logs de um usuário específico (user)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs do usuário obtidos com sucesso
 */
router.get('/user/:userId', checkAuth, async (req, res) => {
  try {
    const auditDb = req.dbs.audit;
    const { userId } = req.params;
    
    const logIds = await auditDb.getData(`/audit_by_user/${userId}`);
    const logs = [];
    
    for (const logId of logIds) {
      const allLogs = await auditDb.getData('/audit_logs');
      const log = allLogs.find(l => l.id === logId);
      if (log) logs.push(log);
    }
    
    res.json({ success: true, logs });
  } catch (error) {
    if (error.name === 'DataError') {
      return res.json({ success: true, logs: [] });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao obter logs do usuário' });
  }
});

/**
 * @swagger
 * /api/audit/project/{projectId}:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém logs de um projeto específico (user)
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs do projeto obtidos com sucesso
 */
router.get('/project/:projectId', checkAuth, async (req, res) => {
  try {
    const auditDb = req.dbs.audit;
    const { projectId } = req.params;
    
    const logIds = await auditDb.getData(`/audit_by_project/${projectId}`);
    const logs = [];
    
    for (const logId of logIds) {
      const allLogs = await auditDb.getData('/audit_logs');
      const log = allLogs.find(l => l.id === logId);
      if (log) logs.push(log);
    }
    
    res.json({ success: true, logs });
  } catch (error) {
    if (error.name === 'DataError') {
      return res.json({ success: true, logs: [] });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao obter logs do projeto' });
  }
});

/**
 * @swagger
 * /api/audit/key/{keyId}:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém logs de uma chave específica (user)
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs da chave obtidos com sucesso
 */
router.get('/key/:keyId', checkAuth, async (req, res) => {
  try {
    const auditDb = req.dbs.audit;
    const { keyId } = req.params;
    
    const logIds = await auditDb.getData(`/audit_by_key/${keyId}`);
    const logs = [];
    
    for (const logId of logIds) {
      const allLogs = await auditDb.getData('/audit_logs');
      const log = allLogs.find(l => l.id === logId);
      if (log) logs.push(log);
    }
    
    res.json({ success: true, logs });
  } catch (error) {
    if (error.name === 'DataError') {
      return res.json({ success: true, logs: [] });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao obter logs da chave' });
  }
});

/**
 * @swagger
 * /api/audit/folder/{folderId}:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém logs de uma pasta específica (user)
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs da pasta obtidos com sucesso
 */
router.get('/folder/:folderId', checkAuth, async (req, res) => {
  try {
    const auditDb = req.dbs.audit;
    const { folderId } = req.params;
    
    const logIds = await auditDb.getData(`/audit_by_folder/${folderId}`);
    const logs = [];
    
    for (const logId of logIds) {
      const allLogs = await auditDb.getData('/audit_logs');
      const log = allLogs.find(l => l.id === logId);
      if (log) logs.push(log);
    }
    
    res.json({ success: true, logs });
  } catch (error) {
    if (error.name === 'DataError') {
      return res.json({ success: true, logs: [] });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao obter logs da pasta' });
  }
});

module.exports = {
  router,
  createAuditLog
}; 