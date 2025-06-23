const express = require('express');
const router = express.Router();
const { checkAuth, isAdmin } = require('../middleware/auth');
const { createAuditLog } = require('./audit');

/**
 * @swagger
 * tags:
 *   name: Cache
 *   description: Operações de invalidação de cache com database próprio
 */

/**
 * Classe para gerenciar invalidações de cache
 */
class CacheManager {
  constructor(cacheDb) {
    this.cacheDb = cacheDb;
  }

  /**
   * Registra uma invalidação no database - APENAS DADOS ESSENCIAIS
   */
  async recordInvalidation(type, projectId = null, folderId = null) {
    const invalidation = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type, // 'global', 'project', 'folder'
      projectId,
      folderId,
      timestamp: new Date().toISOString(),
      epochTimestamp: Date.now()
    };

    try {
      // Adicionar à lista geral
      const invalidations = await this.cacheDb.getData('/invalidations');
      invalidations.push(invalidation);
      await this.cacheDb.push('/invalidations', invalidations);

      // Adicionar à lista específica por tipo
      const typeKey = `${type}_invalidations`;
      const typeInvalidations = await this.cacheDb.getData(`/${typeKey}`);
      typeInvalidations.push(invalidation);
      await this.cacheDb.push(`/${typeKey}`, typeInvalidations);

      // Limpar invalidações antigas (manter apenas últimas 1000)
      await this.cleanupOldInvalidations();

      return invalidation;
    } catch (error) {
      console.error('Erro ao registrar invalidação:', error);
      throw error;
    }
  }

  /**
   * Verifica se o cache é válido para um projeto/pasta desde um timestamp
   */
  async isCacheValid(projectId = null, folderId = null, sinceTimestamp = null) {
    try {
      // Se sinceTimestamp for string, converter para number; se for number, usar direto
      let since;
      if (sinceTimestamp) {
        since = typeof sinceTimestamp === 'string' ? parseInt(sinceTimestamp) : sinceTimestamp;
      } else {
        since = Date.now() - 24 * 60 * 60 * 1000; // Padrão: últimas 24h
      }
      
      console.log(`[DEBUG] Verificando validade - projectId: ${projectId}, since: ${since}, agora: ${Date.now()}`);
      
      // Verificar invalidações globais
      const globalInvalidations = await this.cacheDb.getData('/global_invalidations');
      const recentGlobalInvalidations = globalInvalidations.filter(inv => inv.epochTimestamp > since);
      
      if (recentGlobalInvalidations.length > 0) {
        const latest = recentGlobalInvalidations.reduce((a, b) => a.epochTimestamp > b.epochTimestamp ? a : b);
        return {
          valid: false,
          reason: 'global_invalidation',
          lastInvalidation: latest.timestamp,
          invalidation: latest
        };
      }

      // Se especificou uma pasta, verificar invalidações de pasta específica
      if (folderId) {
        const folderInvalidations = await this.cacheDb.getData('/folder_invalidations');
        const recentFolderInvalidations = folderInvalidations.filter(inv => 
          inv.folderId === folderId && inv.epochTimestamp > since
        );
        
        if (recentFolderInvalidations.length > 0) {
          const latest = recentFolderInvalidations.reduce((a, b) => a.epochTimestamp > b.epochTimestamp ? a : b);
          return {
            valid: false,
            reason: 'folder_invalidation',
            lastInvalidation: latest.timestamp,
            invalidation: latest
          };
        }
      }

      // Se especificou um projeto, verificar invalidações de projeto
      if (projectId) {
        const projectInvalidations = await this.cacheDb.getData('/project_invalidations');
        console.log(`[DEBUG] Total invalidações de projeto: ${projectInvalidations.length}`);
        
        const matchingInvalidations = projectInvalidations.filter(inv => inv.projectId === projectId);
        console.log(`[DEBUG] Invalidações para projeto ${projectId}: ${matchingInvalidations.length}`);
        
        const recentProjectInvalidations = matchingInvalidations.filter(inv => {
          console.log(`[DEBUG] Comparando: ${inv.epochTimestamp} > ${since} = ${inv.epochTimestamp > since}`);
          return inv.epochTimestamp > since;
        });
        
        console.log(`[DEBUG] Invalidações recentes: ${recentProjectInvalidations.length}`);
        
        if (recentProjectInvalidations.length > 0) {
          const latest = recentProjectInvalidations.reduce((a, b) => a.epochTimestamp > b.epochTimestamp ? a : b);
          console.log(`[DEBUG] Cache INVÁLIDO - invalidação mais recente: ${latest.epochTimestamp}`);
          return {
            valid: false,
            reason: 'project_invalidation',
            lastInvalidation: latest.timestamp,
            invalidation: latest
          };
        }
      }

      console.log(`[DEBUG] Cache VÁLIDO - nenhuma invalidação recente encontrada`);
      return {
        valid: true,
        reason: 'no_recent_invalidations'
      };
    } catch (error) {
      console.error('Erro ao verificar validade do cache:', error);
      // Em caso de erro, assumir que cache não é válido por segurança
      return {
        valid: false,
        reason: 'error_checking_validity',
        error: error.message
      };
    }
  }

  /**
   * Limpa invalidações antigas para não sobrecarregar o database
   */
  async cleanupOldInvalidations() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // Manter 7 dias
      
      // Limpar lista geral
      const invalidations = await this.cacheDb.getData('/invalidations');
      const recentInvalidations = invalidations.filter(inv => inv.epochTimestamp > cutoffTime);
      if (recentInvalidations.length !== invalidations.length) {
        await this.cacheDb.push('/invalidations', recentInvalidations);
      }

      // Limpar listas específicas
      const types = ['global', 'project', 'folder'];
      for (const type of types) {
        const typeKey = `${type}_invalidations`;
        const typeInvalidations = await this.cacheDb.getData(`/${typeKey}`);
        const recentTypeInvalidations = typeInvalidations.filter(inv => inv.epochTimestamp > cutoffTime);
        if (recentTypeInvalidations.length !== typeInvalidations.length) {
          await this.cacheDb.push(`/${typeKey}`, recentTypeInvalidations);
        }
      }
    } catch (error) {
      console.warn('Erro ao limpar invalidações antigas:', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats() {
    try {
      const invalidations = await this.cacheDb.getData('/invalidations');
      const globalInvalidations = await this.cacheDb.getData('/global_invalidations');
      const projectInvalidations = await this.cacheDb.getData('/project_invalidations');
      const folderInvalidations = await this.cacheDb.getData('/folder_invalidations');

      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);
      const last7d = now - (7 * 24 * 60 * 60 * 1000);

      return {
        total: invalidations.length,
        global: globalInvalidations.length,
        project: projectInvalidations.length,
        folder: folderInvalidations.length,
        last24h: invalidations.filter(inv => inv.epochTimestamp > last24h).length,
        last7d: invalidations.filter(inv => inv.epochTimestamp > last7d).length,
        oldest: invalidations.length > 0 ? invalidations[0].timestamp : null,
        newest: invalidations.length > 0 ? invalidations[invalidations.length - 1].timestamp : null
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        error: error.message
      };
    }
  }
}

/**
 * @swagger
 * /api/cache/invalidate:
 *   post:
 *     tags:
 *       - Cache
 *     summary: Invalida todo o cache do sistema (admin)
 *     description: Força a invalidação de todo o cache do sistema, útil para atualizações massivas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache invalidado com sucesso
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
 *                   example: "Cache global invalidado com sucesso"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 *                 invalidationId:
 *                   type: string
 *                   example: "1642248600000abc123def"
 */
router.post('/invalidate', checkAuth, isAdmin, async (req, res) => {
  try {
    const cacheManager = new CacheManager(req.dbs.cache);
    
    const invalidation = await cacheManager.recordInvalidation(
      'global',
      null,
      null
    );

    // Log da invalidação global
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) invalidou o cache global do sistema`,
      userId: req.user.id,
      action: 'global_cache_invalidation',
      details: {
        invalidationId: invalidation.id,
        timestamp: invalidation.timestamp,
        scope: 'global'
      }
    });

    res.json({
      success: true,
      message: 'Cache global invalidado com sucesso',
      timestamp: invalidation.timestamp,
      invalidationId: invalidation.id
    });
  } catch (error) {
    console.error('Erro ao invalidar cache global:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao invalidar cache global',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/projects/{projectId}/invalidate:
 *   post:
 *     tags:
 *       - Cache
 *     summary: Invalida cache de um projeto específico (admin)
 *     description: Força a invalidação do cache de todas as pastas de um projeto específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: ID da pasta específica (opcional)
 *     responses:
 *       200:
 *         description: Cache do projeto invalidado com sucesso
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
 *                   example: "Cache do projeto invalidado com sucesso"
 *                 projectId:
 *                   type: string
 *                   example: "123456"
 *                 folderId:
 *                   type: string
 *                   example: "789"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 invalidationId:
 *                   type: string
 */
router.post('/projects/:projectId/invalidate', checkAuth, isAdmin, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const folderId = req.query.folderId;
    const projectsDb = req.dbs.projects;
    const foldersDb = req.dbs.folders;
    const cacheManager = new CacheManager(req.dbs.cache);
    
    // Verificar se o projeto existe
    try {
      const project = await projectsDb.getData(`/projects/${projectId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    let invalidation;
    let message = '';
    let logDescription = '';

    if (folderId) {
      // Invalidar cache de uma pasta específica
      try {
        const folder = await foldersDb.getData(`/folders/${folderId}`);
        
        // Verificar se a pasta pertence ao projeto
        if (folder.projectId !== projectId) {
          return res.status(400).json({
            success: false,
            message: 'A pasta não pertence ao projeto especificado'
          });
        }

        invalidation = await cacheManager.recordInvalidation(
          'folder',
          projectId,
          folderId
        );

        message = `Cache da pasta "${folder.name}" invalidado com sucesso`;
        logDescription = `Usuário ${req.user.name} (${req.user.email}) invalidou o cache da pasta "${folder.name}" do projeto ${projectId}`;
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Pasta não encontrada'
        });
      }
    } else {
      // Invalidar cache de todo o projeto
      invalidation = await cacheManager.recordInvalidation(
        'project',
        projectId,
        null
      );

      message = 'Cache do projeto invalidado com sucesso';
      logDescription = `Usuário ${req.user.name} (${req.user.email}) invalidou o cache completo do projeto ${projectId}`;
    }

    // Log da invalidação
    await createAuditLog(req.dbs.audit, {
      description: logDescription,
      userId: req.user.id,
      projectId: projectId,
      folderId: folderId || undefined,
      action: folderId ? 'folder_cache_invalidation' : 'project_cache_invalidation',
      details: {
        invalidationId: invalidation.id,
        timestamp: invalidation.timestamp,
        scope: folderId ? 'folder' : 'project',
        projectId,
        folderId
      }
    });

    const response = {
      success: true,
      message,
      projectId,
      timestamp: invalidation.timestamp,
      invalidationId: invalidation.id
    };

    if (folderId) {
      response.folderId = folderId;
    }

    res.json(response);
  } catch (error) {
    console.error('Erro ao invalidar cache do projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao invalidar cache do projeto',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/folders/{folderId}/invalidate:
 *   post:
 *     tags:
 *       - Cache
 *     summary: Invalida cache de uma pasta específica (admin)
 *     description: Força a invalidação do cache de uma pasta específica
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
 *         description: Cache da pasta invalidado com sucesso
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
 *                   example: "Cache da pasta invalidado com sucesso"
 *                 folderId:
 *                   type: string
 *                   example: "789"
 *                 projectId:
 *                   type: string
 *                   example: "123456"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 invalidationId:
 *                   type: string
 */
router.post('/folders/:folderId/invalidate', checkAuth, isAdmin, async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const foldersDb = req.dbs.folders;
    const cacheManager = new CacheManager(req.dbs.cache);
    
    // Verificar se a pasta existe
    let folder;
    try {
      folder = await foldersDb.getData(`/folders/${folderId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Pasta não encontrada'
      });
    }

    const invalidation = await cacheManager.recordInvalidation(
      'folder',
      folder.projectId,
      folderId
    );

    // Log da invalidação
    await createAuditLog(req.dbs.audit, {
      description: `Usuário ${req.user.name} (${req.user.email}) invalidou o cache da pasta "${folder.name}"`,
      userId: req.user.id,
      projectId: folder.projectId,
      folderId: folderId,
      action: 'folder_cache_invalidation',
      details: {
        invalidationId: invalidation.id,
        timestamp: invalidation.timestamp,
        scope: 'folder',
        folderId,
        folderName: folder.name,
        projectId: folder.projectId
      }
    });

    res.json({
      success: true,
      message: `Cache da pasta "${folder.name}" invalidado com sucesso`,
      folderId,
      projectId: folder.projectId,
      timestamp: invalidation.timestamp,
      invalidationId: invalidation.id
    });
  } catch (error) {
    console.error('Erro ao invalidar cache da pasta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao invalidar cache da pasta',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/validity:
 *   get:
 *     tags:
 *       - Cache
 *     summary: Verifica validade do cache (público)
 *     description: API ultra-rápida para verificar se o cache foi invalidado - sistema baseado em database próprio
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: ID do projeto para verificar invalidação específica
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: ID da pasta para verificar invalidação específica
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Verificar invalidações desde este timestamp (epoch ou ISO string)
 *     responses:
 *       200:
 *         description: Status de validade obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 reason:
 *                   type: string
 *                   enum: [global_invalidation, project_invalidation, folder_invalidation, no_recent_invalidations, error_checking_validity]
 *                   example: "project_invalidation"
 *                 lastInvalidation:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 *                 invalidation:
 *                   type: object
 *                   description: Detalhes completos da invalidação (quando aplicável)
 */
router.get('/validity', async (req, res) => {
  try {
    const { projectId, folderId, since } = req.query;
    const cacheManager = new CacheManager(req.dbs.cache);
    
    const result = await cacheManager.isCacheValid(projectId, folderId, since);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao verificar validade do cache:', error);
    res.status(500).json({
      valid: false,
      reason: 'error_checking_validity',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/status:
 *   get:
 *     tags:
 *       - Cache
 *     summary: Obtém status e estatísticas do sistema de cache (admin)
 *     description: Retorna informações detalhadas sobre o sistema de cache do servidor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status do cache obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cacheEnabled:
 *                   type: boolean
 *                   example: true
 *                 serverTime:
 *                   type: string
 *                   format: date-time
 *                 stats:
 *                   type: object
 *                   description: Estatísticas detalhadas do cache
 */
router.get('/status', checkAuth, isAdmin, async (req, res) => {
  try {
    const serverTime = new Date().toISOString();
    const cacheManager = new CacheManager(req.dbs.cache);
    const stats = await cacheManager.getStats();
    
    res.json({
      success: true,
      cacheEnabled: true,
      serverTime,
      message: 'Sistema de cache operacional com database próprio',
      stats
    });
  } catch (error) {
    console.error('Erro ao obter status do cache:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do cache',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/cleanup:
 *   post:
 *     tags:
 *       - Cache
 *     summary: Limpa invalidações antigas do database (admin)
 *     description: Remove invalidações antigas para otimizar performance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpeza realizada com sucesso
 */
router.post('/cleanup', checkAuth, isAdmin, async (req, res) => {
  try {
    const cacheManager = new CacheManager(req.dbs.cache);
    await cacheManager.cleanupOldInvalidations();
    
    res.json({
      success: true,
      message: 'Limpeza de invalidações antigas realizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar invalidações antigas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar invalidações antigas',
      error: error.message
    });
  }
});

module.exports = router; 