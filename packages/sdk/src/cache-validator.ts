import { 
  CacheValidationConfig,
  CacheValidityStatus,
  RequestHistory,
  ConfDriveEvents,
  GetProjectKeysOptions,
  GetFolderKeysOptions
} from './interfaces';

/**
 * Configuração padrão para validação de cache
 */
const DEFAULT_VALIDATION_CONFIG: Required<CacheValidationConfig> = {
  enabled: true,
  interval: 15000, // 15 segundos - mais frequente para melhor responsividade
  autoRefresh: true
};

/**
 * Gerenciador de validação automática de cache remoto - NOVA IMPLEMENTAÇÃO
 * Usa o novo sistema de database de cache do back-end
 */
export class CacheValidator {
  private config: Required<CacheValidationConfig>;
  private apiUrl: string;
  private apiSecret: string;
  private intervalId: number | null = null;
  private requestHistory: Map<string, RequestHistory> = new Map();
  private lastValidationTimestamp: number = 0;
  private eventEmitter: ((event: keyof ConfDriveEvents, data: any) => void) | null = null;
  private lastCacheTimestamps: Map<string, number> = new Map(); // Para rastrear timestamps de cache
  private cacheManager: any = null; // Referência ao CacheManager para verificação local

  constructor(
    apiUrl: string,
    apiSecret: string,
    config: CacheValidationConfig = {},
    eventEmitter?: (event: keyof ConfDriveEvents, data: any) => void,
    cacheManager?: any
  ) {
    this.apiUrl = apiUrl;
    this.apiSecret = apiSecret;
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.eventEmitter = eventEmitter || null;
    this.cacheManager = cacheManager || null;
  }

  /**
   * Inicia a validação automática de cache
   */
  start(): void {
    if (!this.config.enabled || this.intervalId) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.validateCache();
    }, this.config.interval);

    this.emit('validation:started', { interval: this.config.interval });
  }

  /**
   * Para a validação automática de cache
   */
  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.emit('validation:stopped', {});
    }
  }

  /**
   * Força uma validação imediata (sem esperar o intervalo)
   * Útil quando cache é usado logo após reload da página
   */
  async validateImmediately(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.validateCache();
    } catch (error) {
      console.error('Erro durante validação imediata:', error);
    }
  }

  /**
   * Registra uma request no histórico e marca o timestamp do cache
   * E opcionalmente dispara validação imediata
   */
  addRequestToHistory(
    type: 'project' | 'folder',
    projectId?: string,
    folderId?: string,
    options?: GetProjectKeysOptions | GetFolderKeysOptions,
    cacheTimestamp?: number,
    validateImmediately = false
  ): string {
    const id = this.generateRequestId();
    const request: RequestHistory = {
      id,
      type,
      projectId,
      folderId,
      timestamp: Date.now(),
      options,
      active: true
    };

    this.requestHistory.set(id, request);

    // Registrar timestamp do cache para essa request
    if (cacheTimestamp) {
      const cacheKey = this.getCacheKey(type, projectId, folderId);
      this.lastCacheTimestamps.set(cacheKey, cacheTimestamp);
    }

    // Limpar histórico antigo (manter apenas últimas 50 requests)
    if (this.requestHistory.size > 50) {
      const oldestKey = Array.from(this.requestHistory.keys())[0];
      this.requestHistory.delete(oldestKey);
    }

    // Se solicitado, fazer validação imediata
    if (validateImmediately) {
      // Usar setTimeout para não bloquear a resposta do cache
      setTimeout(() => {
        this.validateImmediately();
      }, 100); // 100ms delay para não impactar performance
    }

    return id;
  }

  /**
   * Remove uma request do histórico (quando não é mais necessária)
   */
  removeRequestFromHistory(id: string): void {
    this.requestHistory.delete(id);
  }

  /**
   * Marca uma request como inativa (não deve mais ser refeita)
   */
  deactivateRequest(id: string): void {
    const request = this.requestHistory.get(id);
    if (request) {
      request.active = false;
    }
  }

  /**
   * Obtém todas as requests ativas para um projeto
   */
  getActiveRequestsForProject(projectId: string): RequestHistory[] {
    return Array.from(this.requestHistory.values()).filter(
      req => req.active && (req.projectId === projectId)
    );
  }

  /**
   * Obtém todas as requests ativas para uma pasta
   */
  getActiveRequestsForFolder(folderId: string): RequestHistory[] {
    return Array.from(this.requestHistory.values()).filter(
      req => req.active && req.folderId === folderId
    );
  }

  /**
   * Gera chave única para identificar cache
   */
  private getCacheKey(type: 'project' | 'folder', projectId?: string, folderId?: string): string {
    if (type === 'folder' && folderId) {
      return `folder:${folderId}`;
    }
    if (type === 'project' && projectId) {
      return `project:${projectId}`;
    }
    return 'unknown';
  }

  /**
   * Valida o cache remotamente usando o novo sistema
   */
  private async validateCache(): Promise<void> {
    try {
      // Obter lista única de projetos e pastas das requests ativas
      const projectIds = new Set<string>();
      const folderIds = new Set<string>();

      this.requestHistory.forEach(request => {
        if (request.active) {
          if (request.projectId && request.type === 'project') {
            projectIds.add(request.projectId);
          }
          if (request.folderId && request.type === 'folder') {
            folderIds.add(request.folderId);
          }
        }
      });

      // Verificar invalidação para cada projeto
      for (const projectId of projectIds) {
        await this.checkCacheValidity('project', projectId);
      }

      // Verificar invalidação para cada pasta
      for (const folderId of folderIds) {
        await this.checkCacheValidity('folder', undefined, folderId);
      }

      this.lastValidationTimestamp = Date.now();
    } catch (error) {
      console.error('Erro durante validação automática de cache:', error);
      this.emit('validation:error', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Verifica se o cache é válido (local e remoto) usando a nova API /api/cache/validity
   */
  private async checkCacheValidity(
    type: 'project' | 'folder',
    projectId?: string,
    folderId?: string
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(type, projectId, folderId);
      const cacheTimestamp = this.lastCacheTimestamps.get(cacheKey);
      
      // 1. VERIFICAR VALIDADE LOCAL PRIMEIRO (se temos referência ao CacheManager)
      let localCacheExpired = false;
      if (this.cacheManager) {
        try {
          const id = projectId || folderId;
          if (id) {
            const cacheInfo = await this.cacheManager.getWithValidityInfo(type, id);
            if (cacheInfo && cacheInfo.isExpired) {
              localCacheExpired = true;
              this.emit('validation:local-cache-expired', {
                type,
                projectId,
                folderId,
                reason: 'local_ttl_expired',
                cacheTimestamp: cacheInfo.timestamp
              });

              await this.handleCacheInvalidation(type, projectId, folderId, {
                valid: false,
                reason: 'local_ttl_expired',
                lastInvalidation: undefined,
                invalidation: undefined
              });
            }
          }
        } catch (localError) {
          console.warn('Erro ao verificar validade local do cache:', localError);
        }
      }

      // 2. VERIFICAR VALIDADE REMOTA (apenas se cache local ainda é válido)
      if (!localCacheExpired) {
        // Construir URL da API de validação
        const url = new URL(`${this.apiUrl}/cache/validity`);
        if (projectId) {
          url.searchParams.set('projectId', projectId);
        }
        if (folderId) {
          url.searchParams.set('folderId', folderId);
        }
        if (cacheTimestamp) {
          url.searchParams.set('since', cacheTimestamp.toString());
        }

        // Fazer requisição para API
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-API-Secret': this.apiSecret,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const validityStatus: CacheValidityStatus = await response.json();

        // Se cache não é válido remotamente, disparar invalidação
        if (!validityStatus.valid) {
          this.emit('validation:remote-cache-invalidated', {
            type,
            projectId,
            folderId,
            reason: validityStatus.reason,
            lastInvalidation: validityStatus.lastInvalidation,
            invalidation: validityStatus.invalidation
          });

          await this.handleCacheInvalidation(type, projectId, folderId, validityStatus);
        }
      }

    } catch (error) {
      console.error(`Erro ao verificar validade do cache (${type}):`, error);
      this.emit('validation:error', {
        type,
        projectId,
        folderId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Processa invalidação do cache quando detectada (nova implementação)
   */
  private async handleCacheInvalidation(
    type: 'project' | 'folder',
    projectId?: string,
    folderId?: string,
    status?: CacheValidityStatus
  ): Promise<void> {
    try {
      // Marcar cache como invalidado ao invés de apagar (nova regra)
      if (this.cacheManager) {
        if (type === 'project' && projectId) {
          await this.cacheManager.invalidateProject(projectId);
        } else if (type === 'folder' && folderId) {
          await this.cacheManager.markAsInvalidated('folder', folderId);
        }
      }

      // Obter requests relevantes para esta invalidação
      let relevantRequests: RequestHistory[] = [];
      
      if (type === 'project' && projectId) {
        relevantRequests = this.getActiveRequestsForProject(projectId);
      } else if (type === 'folder' && folderId) {
        relevantRequests = this.getActiveRequestsForFolder(folderId);
      }

      if (relevantRequests.length === 0) {
        return;
      }

      this.emit('validation:cache-invalidated', {
        type,
        projectId,
        folderId,
        reason: status?.reason,
        invalidation: status?.invalidation,
        affectedRequests: relevantRequests.length
      });

      // Se auto-refresh está habilitado, disparar refresh automático
      if (this.config.autoRefresh) {
        this.emit('cache:auto-refresh', {
          requests: relevantRequests,
          projectId,
          folderId,
          reason: status?.reason
        });
      }

      // Atualizar timestamp para não re-invalidar o mesmo cache
      const cacheKey = this.getCacheKey(type, projectId, folderId);
      this.lastCacheTimestamps.set(cacheKey, Date.now());

    } catch (error) {
      console.error('Erro ao processar invalidação de cache:', error);
      this.emit('validation:error', {
        type,
        projectId,
        folderId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Gera ID único para requests
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Emite eventos para o sistema principal
   */
  private emit(event: keyof ConfDriveEvents, data: any): void {
    if (this.eventEmitter) {
      this.eventEmitter(event, data);
    }
  }

  /**
   * Atualiza a configuração do validador
   */
  updateConfig(newConfig: Partial<CacheValidationConfig>): void {
    const wasRunning = this.isRunning();
    
    this.config = { ...this.config, ...newConfig };
    
    // Reiniciar se estava rodando e configuração mudou
    if (wasRunning) {
      this.stop();
      this.start();
    }

    this.emit('validation:config-updated', { config: this.config });
  }

  /**
   * Limpa recursos e para validação
   */
  destroy(): void {
    this.stop();
    this.requestHistory.clear();
    this.lastCacheTimestamps.clear();
    this.eventEmitter = null;
  }

  /**
   * Verifica se a validação está rodando
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Obtém estatísticas do validador
   */
  getStats() {
    return {
      isRunning: this.isRunning(),
      interval: this.config.interval,
      autoRefresh: this.config.autoRefresh,
      activeRequests: Array.from(this.requestHistory.values()).filter(r => r.active).length,
      totalRequests: this.requestHistory.size,
      lastValidation: this.lastValidationTimestamp,
      trackedCaches: this.lastCacheTimestamps.size
    };
  }

  /**
   * Força validação de todos os caches ativos
   */
  async forceValidation(): Promise<void> {
    await this.validateCache();
  }
} 