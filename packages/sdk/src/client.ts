import {
  ConfDriveConfig,
  ProjectKeysResponse,
  FolderKeysResponse,
  GetProjectKeysOptions,
  GetFolderKeysOptions,
  CacheStats,
  CacheOperationResult,
  ConfDriveError,
  ConfDriveEvents,
  InvalidateCacheResponse,
  RequestHistory,
  DefaultValuesSchema,
  ProjectDefaultValueData,
  FolderDefaultValueData
} from './interfaces';
import { CacheManager } from './cache';
import { CacheValidator } from './cache-validator';

/**
 * Interface para requisições HTTP
 */
interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * Cliente principal do ConfDrive SDK - ULTRA SIMPLIFICADO
 * Apenas faz requisições à API e retorna dados brutos
 */
export class ConfDriveClient {
  private config: ConfDriveConfig;
  private cacheManager: CacheManager;
  private cacheValidator: CacheValidator;
  private eventListeners: Map<keyof ConfDriveEvents, Function[]> = new Map();

  /**
   * Cria uma nova instância do cliente ConfDrive
   * @param config Configurações do cliente
   */
  constructor(config: ConfDriveConfig) {
    this.config = { ...config };
    this.validateConfig();

    // Inicializar gerenciador de cache
    this.cacheManager = new CacheManager(this.config.cache, this.config.defaultValues);

    // Inicializar validador de cache
    this.cacheValidator = new CacheValidator(
      this.config.apiUrl,
      this.config.apiSecret,
      this.config.cacheValidation,
      this.emit.bind(this),
      this.cacheManager
    );

    // Configurar listener para auto-refresh
    this.on('cache:auto-refresh', this.handleAutoRefresh.bind(this));

    // Iniciar validação automática se habilitada
    if (this.config.cacheValidation?.enabled !== false) {
      this.cacheValidator.start();
    }
  }

  /**
   * Valida a configuração fornecida
   * @throws {Error} Se a configuração for inválida
   */
  private validateConfig(): void {
    if (!this.config.apiUrl) {
      throw new Error('URL da API é obrigatória');
    }

    if (!this.config.apiSecret) {
      throw new Error('Segredo da API é obrigatório');
    }

    try {
      new URL(this.config.apiUrl);
    } catch {
      throw new Error('URL da API é inválida');
    }
  }

  /**
   * Faz uma requisição HTTP simples
   * @param endpoint Endpoint da API
   * @param options Opções da requisição
   * @returns Promise com a resposta
   */
  private async httpRequest<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000
    } = options;

    const url = `${this.config.apiUrl}${endpoint}`;
    const startTime = Date.now();

    // Emitir evento de requisição
    this.emit('api:request', {
      url,
      method: method.toUpperCase()
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-API-Secret': this.config.apiSecret,
          'Content-Type': 'application/json',
          ...headers
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      const responseData = await response.json();

      // Emitir evento de resposta com data
      this.emit('api:response', {
        url,
        status: response.status,
        duration,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Emitir evento de resposta com erro
      this.emit('api:response', {
        url,
        status: 0,
        duration
      });

      throw error;
    }
  }

  /**
   * Emite um evento para os listeners registrados
   * @param event Nome do evento
   * @param data Dados do evento
   */
  private emit<K extends keyof ConfDriveEvents>(event: K, data: ConfDriveEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Erro ao executar listener do evento ${event}:`, error);
      }
    });
  }

  /**
   * Cria um erro personalizado do SDK
   * @param code Código do erro
   * @param message Mensagem do erro
   * @param originalError Erro original (opcional)
   * @param context Contexto adicional (opcional)
   * @returns Erro personalizado
   */
  private createError(
    code: string, 
    message: string, 
    originalError?: Error, 
    context?: Record<string, any>
  ): ConfDriveError {
    const error: ConfDriveError = {
      code,
      message,
      originalError,
      context
    };

    this.emit('error', error);
    return error;
  }

  /**
   * Obtém o valor de uma chave dos valores padrão
   * @param key Nome da chave
   * @param folderName Nome da pasta (usado para buscar em default values do tipo project)
   * @returns Valor da chave ou undefined
   */
  private getDefaultValue(key: string, folderName?: string): any {
    if (!this.config.defaultValues) {
      return undefined;
    }

    const defaultValues = this.config.defaultValues;

    if (defaultValues.type === 'folder') {
      // Para tipo folder, buscar diretamente nas chaves
      const folderData = defaultValues.data as FolderDefaultValueData;
      return folderData[key];
    } else if (defaultValues.type === 'project') {
      // Para tipo project, buscar na pasta específica ou na primeira pasta disponível
      const projectData = defaultValues.data as ProjectDefaultValueData;
      
      if (folderName && projectData[folderName]) {
        return projectData[folderName].keys[key];
      }
      
      // Se não especificou pasta, buscar na primeira pasta disponível
      const firstFolderId = Object.keys(projectData)[0];
      if (firstFolderId && projectData[firstFolderId]) {
        return projectData[firstFolderId].keys[key];
      }
    }

    return undefined;
  }

  /**
   * Obtém todos os valores padrão de uma pasta/ambiente
   * @param folderName Nome da pasta (ambiente)
   * @returns Valores padrão da pasta ou objeto vazio
   */
  private getDefaultValuesForFolder(folderName?: string): Record<string, any> {
    if (!this.config.defaultValues) {
      return {};
    }

    const defaultValues = this.config.defaultValues;

    if (defaultValues.type === 'folder') {
      // Para tipo folder, retornar os dados diretamente
      return defaultValues.data as FolderDefaultValueData;
    } else if (defaultValues.type === 'project') {
      // Para tipo project, buscar na pasta específica
      const projectData = defaultValues.data as ProjectDefaultValueData;
      
      if (folderName && projectData[folderName]) {
        return projectData[folderName].keys;
      }
      
      // Se não especificou pasta, retornar a primeira pasta disponível
      const firstFolderId = Object.keys(projectData)[0];
      if (firstFolderId && projectData[firstFolderId]) {
        return projectData[firstFolderId].keys;
      }
    }

    return {};
  }

  /**
   * Obtém todas as pastas e suas chaves dos valores padrão (usado para getProjectKeys)
   * @returns Dados organizados por pasta no formato de estrutura aninhada
   */
  private getDefaultValuesForProject(): Record<string, any> {
    if (!this.config.defaultValues) {
      return {};
    }

    const defaultValues = this.config.defaultValues;

    if (defaultValues.type === 'project') {
      // Para tipo project, converter para estrutura aninhada por pasta
      const projectData = defaultValues.data as ProjectDefaultValueData;
      const result: Record<string, any> = {};
      
      Object.entries(projectData).forEach(([folderId, folderInfo]) => {
        const folderName = folderInfo.nameFolder;
        // Criar estrutura aninhada: { "Inicio": { "tituloPagina": "...", ... } }
        result[folderName] = folderInfo.keys;
      });
      
      return result;
    } else if (defaultValues.type === 'folder') {
      // Para tipo folder, retornar os dados diretamente
      return defaultValues.data as FolderDefaultValueData;
    }

    return {};
  }

  /**
   * Merge dados obtidos da API com valores padrão
   * @param apiData Dados da API
   * @param type Tipo de dados ('project' ou 'folder')
   * @param folderName Nome da pasta (opcional)
   * @returns Dados mesclados com valores padrão
   */
  private mergeWithDefaults(apiData: any, type: 'project' | 'folder', folderName?: string): any {
    // Se não tem dados da API, usar default values diretamente
    if (!apiData) {
      if (type === 'project') {
        return this.getDefaultValuesForProject();
      } else {
        return this.getDefaultValuesForFolder(folderName);
      }
    }

    // Se tem dados da API, fazer merge
    if (this.config.defaultValues) {
      if (type === 'project') {
        const defaultData = this.getDefaultValuesForProject();
        return {
          ...defaultData,
          ...apiData
        };
      } else {
        const defaultData = this.getDefaultValuesForFolder(folderName);
        return {
          ...defaultData,
          ...apiData
        };
      }
    }

    return apiData;
  }

  /**
   * Obtém chaves de um projeto com validação automática de cache
   * @param projectId ID do projeto
   * @param options Opções da requisição
   * @returns Promise com as chaves do projeto
   */
  async getProjectKeys(
    projectId: string, 
    options: GetProjectKeysOptions = {}
  ): Promise<ProjectKeysResponse> {
    const {
      useCache = true,
      forceRefresh = false,
      timeout = 30000
    } = options;

    const startTime = Date.now();
    let expiredCacheData: any = null; // Declarar fora do try para usar no catch

    try {
      let cacheData: any = null;
      const cacheKey = 'project';
      let usedCache = false;

      // Tentar obter do cache primeiro (se não forçar refresh)
      if (useCache && !forceRefresh) {
        const cacheResult = await this.cacheManager.getWithValidityInfo(cacheKey, projectId);
        
        if (cacheResult) {
          // Verificar se cache é estritamente válido (não apenas fallback)
          const isStrictlyValid = await this.isCacheStrictlyValid(cacheResult, 'project', projectId);
          
          if (isStrictlyValid) {
            // Cache estritamente válido - usar normalmente
            cacheData = cacheResult.data;
            usedCache = true;
            this.emit('cache:hit', {
              key: projectId,
              type: 'project',
              data: cacheData
            });

            // Registrar request no histórico COM validação imediata usando timestamp REAL do cache
            const requestId = this.cacheValidator.addRequestToHistory('project', projectId, undefined, options, cacheResult.timestamp, true);

            // Retornar dados do cache com valores padrão mesclados
            const mergedData = this.mergeWithDefaults(cacheData, 'project');
            
            // Emitir evento de resposta do cache
            this.emit('api:response', {
              url: `${this.config.apiUrl}/projects/${projectId}/keys`,
              status: 200,
              duration: Date.now() - startTime,
              data: mergedData
            });

            return mergedData;
          } else if (cacheResult.isValid) {
            // Cache invalidado MAS pode ser usado como fallback
            // ESTRATÉGIA: retornar cache imediatamente E fazer request em background
            expiredCacheData = cacheResult.data;
            
            this.emit('cache:hit', {
              key: projectId,
              type: 'project',
              data: expiredCacheData
            });

            // Fazer request à API em background para atualizar cache
            console.log(`[ConfDrive] Cache invalidado detectado para projeto ${projectId}, iniciando atualização em background`);
            this.refreshCacheInBackground('project', projectId, options, timeout);

            // Retornar dados do cache invalidado com valores padrão mesclados
            const mergedData = this.mergeWithDefaults(expiredCacheData, 'project');
            
            // Emitir evento de resposta do cache
            this.emit('api:response', {
              url: `${this.config.apiUrl}/projects/${projectId}/keys`,
              status: 200,
              duration: Date.now() - startTime,
              data: mergedData
            });

            return mergedData;
          } else {
            // Cache não pode ser usado, fazer requisição normal
            this.emit('cache:miss', {
              key: projectId,
              type: 'project'
            });
          }
        } else {
          this.emit('cache:miss', {
            key: projectId,
            type: 'project'
          });
        }
      }

      // Se chegou aqui, não usou cache - registrar sem validação imediata
      const requestId = this.cacheValidator.addRequestToHistory('project', projectId, undefined, options, undefined, false);

      // Emitir evento de requisição
      this.emit('api:request', {
        url: `${this.config.apiUrl}/projects/${projectId}/keys`,
        method: 'GET'
      });

      // Fazer requisição à API
      const apiData = await this.httpRequest<ProjectKeysResponse>(
        `/projects/${projectId}/keys`,
        { timeout }
      );

      // Armazenar no cache se habilitado
      if (useCache) {
        await this.cacheManager.set('project', projectId, apiData);
        
        this.emit('cache:update', {
          key: projectId,
          type: 'project',
          data: apiData,
          projectId
        });
      }

      // Mesclar com valores padrão
      const mergedData = this.mergeWithDefaults(apiData, 'project');

      return mergedData;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.emit('api:response', {
        url: `${this.config.apiUrl}/projects/${projectId}/keys`,
        status: 0,
        duration
      });

      // Se houve erro na API, usar cache (mesmo se expirado) como fallback
      if (useCache && !forceRefresh) {
        // Primeiro tentar cache válido
        const cacheResult = await this.cacheManager.getWithValidityInfo('project', projectId);
        if (cacheResult) {
          console.warn(`Erro na API, usando dados do cache ${cacheResult.isValid ? 'válido' : 'expirado'} para projeto ${projectId}:`, error);
          return this.mergeWithDefaults(cacheResult.data, 'project');
        }
      }

      // Se tínhamos cache expirado no início, usar ele como fallback
      if (expiredCacheData) {
        console.warn(`Erro na API, usando cache expirado como fallback para projeto ${projectId}:`, error);
        return this.mergeWithDefaults(expiredCacheData, 'project');
      }

      // Se não há cache, usar valores padrão
      const defaultData = this.getDefaultValuesForFolder();
      if (Object.keys(defaultData).length > 0) {
        console.warn(`Erro na API e sem cache, usando valores padrão para projeto ${projectId}:`, error);
        return { default: defaultData };
      }

      // Se não há valores padrão, relançar o erro
      throw this.createError(
        'API_REQUEST_FAILED',
        `Erro ao obter chaves do projeto ${projectId}`,
        error instanceof Error ? error : new Error(String(error)),
        { projectId, options }
      );
    }
  }

  /**
   * Obtém chaves de uma pasta com validação automática de cache
   * @param folderId ID da pasta
   * @param options Opções da requisição
   * @returns Promise com as chaves da pasta
   */
  async getFolderKeys(
    folderId: string, 
    options: GetFolderKeysOptions = {}
  ): Promise<FolderKeysResponse> {
    const {
      useCache = true,
      forceRefresh = false,
      timeout = 30000
    } = options;

    const startTime = Date.now();
    let expiredCacheData: any = null; // Declarar fora do try para usar no catch

    try {
      let cacheData: any = null;
      const cacheKey = 'folder';
      let usedCache = false;

      // Tentar obter do cache primeiro (se não forçar refresh)
      if (useCache && !forceRefresh) {
        const cacheResult = await this.cacheManager.getWithValidityInfo(cacheKey, folderId);
        
        if (cacheResult) {
          // Verificar se cache é estritamente válido (não apenas fallback)
          const isStrictlyValid = await this.isCacheStrictlyValid(cacheResult, 'folder', folderId);
          
          if (isStrictlyValid) {
            // Cache estritamente válido - usar normalmente
            cacheData = cacheResult.data;
            usedCache = true;
            this.emit('cache:hit', {
              key: folderId,
              type: 'folder',
              data: cacheData
            });

            // Registrar request no histórico COM validação imediata usando timestamp REAL do cache
            const requestId = this.cacheValidator.addRequestToHistory('folder', undefined, folderId, options, cacheResult.timestamp, true);

            // Retornar dados do cache com valores padrão mesclados
            const mergedData = this.mergeWithDefaults(cacheData, 'folder', folderId);
            
            // Emitir evento de resposta do cache
            this.emit('api:response', {
              url: `${this.config.apiUrl}/folders/${folderId}/keys`,
              status: 200,
              duration: Date.now() - startTime,
              data: mergedData
            });

            return mergedData;
          } else if (cacheResult.isValid) {
            // Cache invalidado MAS pode ser usado como fallback
            // ESTRATÉGIA: retornar cache imediatamente E fazer request em background
            expiredCacheData = cacheResult.data;
            
            this.emit('cache:hit', {
              key: folderId,
              type: 'folder',
              data: expiredCacheData
            });

            // Fazer request à API em background para atualizar cache
            console.log(`[ConfDrive] Cache invalidado detectado para pasta ${folderId}, iniciando atualização em background`);
            this.refreshCacheInBackground('folder', folderId, options, timeout);

            // Retornar dados do cache invalidado com valores padrão mesclados
            const mergedData = this.mergeWithDefaults(expiredCacheData, 'folder', folderId);
            
            // Emitir evento de resposta do cache
            this.emit('api:response', {
              url: `${this.config.apiUrl}/folders/${folderId}/keys`,
              status: 200,
              duration: Date.now() - startTime,
              data: mergedData
            });

            return mergedData;
          } else {
            // Cache não pode ser usado, fazer requisição normal
            this.emit('cache:miss', {
              key: folderId,
              type: 'folder'
            });
          }
        } else {
          this.emit('cache:miss', {
            key: folderId,
            type: 'folder'
          });
        }
      }

      // Se chegou aqui, não usou cache - registrar sem validação imediata
      const requestId = this.cacheValidator.addRequestToHistory('folder', undefined, folderId, options, undefined, false);

      // Emitir evento de requisição
      this.emit('api:request', {
        url: `${this.config.apiUrl}/folders/${folderId}/keys`,
        method: 'GET'
      });

      // Fazer requisição à API
      const apiData = await this.httpRequest<FolderKeysResponse>(
        `/folders/${folderId}/keys`,
        { timeout }
      );

      // Armazenar no cache se habilitado
      if (useCache) {
        await this.cacheManager.set('folder', folderId, apiData);
        
        this.emit('cache:update', {
          key: folderId,
          type: 'folder',
          data: apiData,
          folderId
        });
      }

      // Mesclar com valores padrão
      const mergedData = this.mergeWithDefaults(apiData, 'folder', folderId);

      return mergedData;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.emit('api:response', {
        url: `${this.config.apiUrl}/folders/${folderId}/keys`,
        status: 0,
        duration
      });

      // Se houve erro na API, usar cache (mesmo se expirado) como fallback
      if (useCache && !forceRefresh) {
        // Primeiro tentar cache válido
        const cacheResult = await this.cacheManager.getWithValidityInfo('folder', folderId);
        if (cacheResult) {
          console.warn(`Erro na API, usando dados do cache ${cacheResult.isValid ? 'válido' : 'expirado'} para pasta ${folderId}:`, error);
          return this.mergeWithDefaults(cacheResult.data, 'folder', folderId);
        }
      }

      // Se tínhamos cache expirado no início, usar ele como fallback
      if (expiredCacheData) {
        console.warn(`Erro na API, usando cache expirado como fallback para pasta ${folderId}:`, error);
        return this.mergeWithDefaults(expiredCacheData, 'folder', folderId);
      }

      // Se não há cache, usar valores padrão
      const defaultData = this.getDefaultValuesForFolder(folderId);
      if (Object.keys(defaultData).length > 0) {
        console.warn(`Erro na API e sem cache, usando valores padrão para pasta ${folderId}:`, error);
        return defaultData;
      }

      // Se não há valores padrão, relançar o erro
      throw this.createError(
        'API_REQUEST_FAILED',
        `Erro ao obter chaves da pasta ${folderId}`,
        error instanceof Error ? error : new Error(String(error)),
        { folderId, options }
      );
    }
  }

  /**
   * Obtém uma chave específica de um projeto
   * @param projectId ID do projeto
   * @param key Nome da chave
   * @param options Opções da busca
   * @returns Promise com o valor da chave
   */
  async getProjectKey(
    projectId: string,
    key: string,
    options: GetProjectKeysOptions = {}
  ): Promise<any> {
    const projectData = await this.getProjectKeys(projectId, options);
    return projectData[key];
  }

  /**
   * Obtém uma chave específica de uma pasta
   * @param folderId ID da pasta
   * @param key Nome da chave
   * @param options Opções da busca
   * @returns Promise com o valor da chave
   */
  async getFolderKey(
    folderId: string,
    key: string,
    options: GetFolderKeysOptions = {}
  ): Promise<any> {
    const folderData = await this.getFolderKeys(folderId, options);
    return folderData[key];
  }

  /**
   * Invalida cache de um projeto específico
   * @param projectId ID do projeto
   * @returns Promise com resultado da operação
   */
  async invalidateProjectCache(projectId: string): Promise<CacheOperationResult> {
    try {
      await this.cacheManager.delete('project', projectId);
      this.emit('cache:invalidated', { key: `project:${projectId}`, type: 'project' });
      return { success: true, message: 'Cache do projeto invalidado' };
    } catch (error) {
      return { success: false, message: 'Erro ao invalidar cache do projeto' };
    }
  }

  /**
   * Invalida cache de uma pasta específica
   * @param folderId ID da pasta
   * @returns Promise com resultado da operação
   */
  async invalidateFolderCache(folderId: string): Promise<CacheOperationResult> {
    try {
      await this.cacheManager.delete('folder', folderId);
      this.emit('cache:invalidated', { key: `folder:${folderId}`, type: 'folder' });
      return { success: true, message: 'Cache da pasta invalidado' };
    } catch (error) {
      return { success: false, message: 'Erro ao invalidar cache da pasta' };
    }
  }

  /**
   * Limpa todo o cache
   * @returns Promise com resultado da operação
   */
  async clearCache(): Promise<CacheOperationResult> {
    try {
      await this.cacheManager.clear();
      this.emit('cache:invalidated', {});
      return { success: true, message: 'Cache limpo com sucesso' };
    } catch (error) {
      return { success: false, message: 'Erro ao limpar cache' };
    }
  }

  /**
   * Limpa cache expirado
   * @returns Promise com resultado da operação
   */
  async cleanupCache(): Promise<CacheOperationResult> {
    try {
      await this.cacheManager.cleanup();
      return { success: true, message: 'Limpeza de cache concluída' };
    } catch (error) {
      return { success: false, message: 'Erro na limpeza de cache' };
    }
  }

  /**
   * Obtém estatísticas do cache
   * @returns Promise com estatísticas do cache
   */
  async getCacheStats(): Promise<CacheStats> {
    return await this.cacheManager.getStats();
  }

  /**
   * Registra um listener para um evento
   * @param event Nome do evento
   * @param listener Função de callback
   */
  on<K extends keyof ConfDriveEvents>(event: K, listener: (data: ConfDriveEvents[K]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove um listener de um evento
   * @param event Nome do evento
   * @param listener Função de callback a ser removida
   */
  off<K extends keyof ConfDriveEvents>(event: K, listener: (data: ConfDriveEvents[K]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Remove todos os listeners de um evento ou todos os eventos
   * @param event Nome do evento (opcional)
   */
  removeAllListeners<K extends keyof ConfDriveEvents>(event?: K): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * Força invalidação remota de cache usando o novo sistema
   * @param projectId ID do projeto (opcional)
   * @param folderId ID da pasta (opcional)
   * @returns Promise com resposta da invalidação
   */
  async forceRemoteCacheInvalidation(
    projectId?: string,
    folderId?: string
  ): Promise<InvalidateCacheResponse> {
    try {
      let endpoint: string;
      
      if (folderId) {
        // Invalidar pasta específica
        endpoint = `/cache/folders/${folderId}/invalidate`;
      } else if (projectId) {
        // Invalidar projeto específico
        endpoint = `/cache/projects/${projectId}/invalidate`;
      } else {
        // Invalidação global
        endpoint = '/cache/invalidate';
      }

      const response = await this.httpRequest<any>(endpoint, {
        method: 'POST'
      });

      // Invalidar cache local também
      if (projectId) {
        await this.invalidateProjectCache(projectId);
      }
      if (folderId) {
        await this.invalidateFolderCache(folderId);
      }
      if (!projectId && !folderId) {
        await this.clearCache();
      }

      return {
        success: response.success,
        message: response.message,
        invalidatedCount: 1
      };

    } catch (error) {
      throw this.createError('REMOTE_CACHE_INVALIDATION_ERROR',
        'Erro ao invalidar cache remotamente',
        error instanceof Error ? error : new Error(String(error)),
        { projectId, folderId }
      );
    }
  }

  /**
   * Processa auto-refresh quando cache é invalidado remotamente
   */
  private async handleAutoRefresh(data: { requests: RequestHistory[]; projectId?: string; folderId?: string }): Promise<void> {
    const { requests, projectId, folderId } = data;

    for (const request of requests) {
      try {
        if (request.type === 'project' && request.projectId) {
          // Refazer request de projeto
          await this.getProjectKeys(request.projectId, { 
            ...request.options as GetProjectKeysOptions, 
            forceRefresh: true 
          });
        } else if (request.type === 'folder' && request.folderId) {
          // Refazer request de pasta
          await this.getFolderKeys(request.folderId, { 
            ...request.options as GetFolderKeysOptions, 
            forceRefresh: true 
          });
        }
      } catch (error) {
        console.error(`Erro ao refazer request ${request.id}:`, error);
      }
    }
  }

  /**
   * Inicia validação automática de cache
   */
  startCacheValidation(): void {
    this.cacheValidator.start();
  }

  /**
   * Para validação automática de cache
   */
  stopCacheValidation(): void {
    this.cacheValidator.stop();
  }

  /**
   * Obtém estatísticas da validação de cache
   */
  getCacheValidationStats() {
    return this.cacheValidator.getStats();
  }

  /**
   * Força validação imediata de cache (útil após reload da página)
   */
  async forceValidation(): Promise<void> {
    return this.cacheValidator.forceValidation();
  }

  /**
   * Verifica se cache é estritamente válido (não apenas fallback)
   * @param cacheResult Resultado do cache com informações de validade
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns True se cache é estritamente válido (TTL não expirado e não invalidado)
   */
  private async isCacheStrictlyValid(
    cacheResult: { data: any; timestamp: number; isValid: boolean; isExpired: boolean },
    type: 'project' | 'folder',
    id: string
  ): Promise<boolean> {
    // Obter item diretamente do cache para verificar flag invalidated
    const rawCacheItem = await this.cacheManager.getEvenIfExpired(type, id);
    
    if (!rawCacheItem) {
      return false;
    }
    
    // Cache é estritamente válido se:
    // 1. TTL não expirou (!isExpired)
    // 2. Não foi marcado como invalidado
    const ttlExpired = rawCacheItem.isExpired;
    const wasInvalidated = rawCacheItem.invalidated || false;
    
    // Se cache foi invalidado OU TTL expirou, não é estritamente válido
    return !ttlExpired && !wasInvalidated;
  }

  /**
   * Atualiza cache em background (nova estratégia para requisições contínuas)
   * @param type Tipo do cache ('project' ou 'folder')
   * @param id ID do projeto ou pasta
   * @param options Opções da requisição original
   * @param timeout Timeout da requisição
   */
  private async refreshCacheInBackground(
    type: 'project' | 'folder',
    id: string,
    options: GetProjectKeysOptions | GetFolderKeysOptions,
    timeout: number
  ): Promise<void> {
    try {
      // Fazer requisição à API em background
      const endpoint = type === 'project' ? `/projects/${id}/keys` : `/folders/${id}/keys`;
      
      console.log(`[ConfDrive] Iniciando requisição em background: ${this.config.apiUrl}${endpoint}`);
      
      this.emit('api:request', {
        url: `${this.config.apiUrl}${endpoint}`,
        method: 'GET'
      });

      const apiData = await this.httpRequest<any>(endpoint, { timeout });

      // Atualizar cache com novos dados
      await this.cacheManager.set(type, id, apiData);
      
      this.emit('cache:update', {
        key: id,
        type: type,
        data: apiData,
        ...(type === 'project' ? { projectId: id } : { folderId: id })
      });

      console.log(`Cache atualizado em background para ${type}:${id}`);

    } catch (error) {
      // Falhou em atualizar cache, mas isso é ok pois já retornamos dados do cache
      console.warn(`Falha ao atualizar cache em background para ${type}:${id}:`, error);
      
      this.emit('api:response', {
        url: `${this.config.apiUrl}/${type}s/${id}/keys`,
        status: 0,
        duration: 0
      });
    }
  }

  /**
   * Atualiza configurações do cliente
   * @param newConfig Novas configurações
   */
  updateConfig(newConfig: Partial<ConfDriveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Atualizar cache manager se default values mudaram
    if (newConfig.defaultValues !== undefined) {
      this.cacheManager.updateDefaultValues(newConfig.defaultValues);
    }
    
    // Atualizar validador se configurações de validação mudaram
    if (newConfig.cacheValidation) {
      this.cacheValidator.updateConfig(newConfig.cacheValidation);
    }
  }

  /**
   * Destroi o cliente e limpa recursos
   */
  destroy(): void {
    this.cacheValidator.destroy();
    this.cacheManager.close();
    this.eventListeners.clear();
  }
} 