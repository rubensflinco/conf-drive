/**
 * ConfDrive SDK - Cliente ultra simples para acessar APIs de configuração
 * 
 * @example
 * ```typescript
 * import { confDrive } from '@conf-drive/sdk';
 * 
 * // Setup uma vez
 * confDrive.setup('https://api.confDrive.com/api', 'sua-api-secret', defaultValues);
 * 
 * // Usar em qualquer lugar - dados BRUTOS da API
 * const config = await confDrive.get('project-123');
 * // config = dados exatos retornados pela API
 * ```
 */

// Importar tipos para usar nas funções
import { ConfDriveConfig, ConfDriveSetupConfig, DefaultValuesSchema } from './interfaces';
import { ConfDriveClient } from './client';
import { CacheManager } from './cache';
import { CacheValidator } from './cache-validator';

// Exportar classe principal
export { ConfDriveClient } from './client';

// Exportar gerenciador de cache
export { CacheManager } from './cache';

// Exportar validador de cache
export { CacheValidator } from './cache-validator';

// Exportar todas as interfaces e tipos
export type {
  // Configurações
  ConfDriveConfig,
  ConfDriveSetupConfig,
  CacheConfig,
  CacheValidationConfig,
  
  // Respostas da API
  ProjectKeysResponse,
  FolderKeysResponse,
  InvalidateCacheResponse,
  
  // Opções de requisição
  GetProjectKeysOptions,
  GetFolderKeysOptions,
  
  // Cache
  CacheItem,
  CacheStats,
  CacheOperationResult,
  
  // Validação
  RequestHistory,
  CacheValidityStatus,
  
  // Erros e eventos
  ConfDriveError,
  ConfDriveEvents
} from './interfaces';

/**
 * Versão do SDK
 */
export const SDK_VERSION = '1.0.0';

/**
 * Função de conveniência para criar um cliente ConfDrive
 * @param config Configurações do cliente
 * @returns Nova instância do cliente
 */
export function createClient(config: ConfDriveConfig): ConfDriveClient {
  return new ConfDriveClient(config);
}

/**
 * Função para validar configuração antes de criar o cliente
 * @param config Configuração para validar
 * @returns True se a configuração é válida
 * @throws Error se a configuração for inválida
 */
export function validateConfig(config: ConfDriveConfig): boolean {
  if (!config.apiUrl) {
    throw new Error('URL da API é obrigatória');
  }

  if (!config.apiSecret) {
    throw new Error('Segredo da API é obrigatório');
  }

  try {
    new URL(config.apiUrl);
  } catch {
    throw new Error('URL da API é inválida');
  }

  return true;
}

// Re-exportar com nome específico para facilitar importação
export { ConfDriveClient as Client };
export { CacheManager as Cache };

// Tipos principais para conveniência
export type {
  ConfDriveConfig as Config,
  ProjectKeysResponse as ProjectKeys,
  FolderKeysResponse as FolderKeys,
  ConfDriveError as SDKError
} from './interfaces';

// ========== API ULTRA SIMPLIFICADA - SEM AMBIENTES ==========

/**
 * Cliente global singleton para uso simplificado
 */
let globalClient: ConfDriveClient | null = null;

/**
 * Interface para dados brutos da API
 */
export interface ApiData extends Record<string, any> {
  // Qualquer estrutura que a API retornar
}

/**
 * Configuração global ultra simples do ConfDrive SDK
 * 
 * @example
 * ```typescript
 * import { confDrive } from '@conf-drive/sdk';
 * 
 * confDrive.setup({
 *   apiUrl: 'https://api.confDrive.com/api',
 *   apiSecret: 'sua-api-secret',
 *   defaultValues: { tituloPagina: 'Padrão' }, // Valores padrão simples
 *   cacheTTL: 5 * 60 * 1000, // Cache TTL: 5 minutos
 *   validationInterval: 30 * 1000 // Verificação de invalidação: 30 segundos
 * });
 * ```
 */
export const confDrive = {
  /**
   * Configura o SDK globalmente (chame uma vez no início da aplicação)
   * @param config Objeto de configuração do ConfDrive
   */
  setup(config: ConfDriveSetupConfig): void {
    // Converter defaultValues para o novo formato se necessário
    let normalizedDefaultValues: DefaultValuesSchema;

    // Verificar se já está no novo formato
    const defaultValues = config.defaultValues as any;
    if (defaultValues && typeof defaultValues === 'object' && 
        'timestamp' in defaultValues && 'type' in defaultValues && 'data' in defaultValues) {
      // Já está no novo formato
      normalizedDefaultValues = defaultValues as DefaultValuesSchema;
    } else {
      // Formato antigo - converter para o novo formato do tipo "folder"
      normalizedDefaultValues = {
        timestamp: Date.now(),
        type: 'folder',
        data: defaultValues || {}
      };
    }

    const clientConfig: ConfDriveConfig = {
      apiUrl: config.apiUrl,
      apiSecret: config.apiSecret,
      defaultValues: normalizedDefaultValues,
      cache: {
        enabled: true, // Cache SEMPRE habilitado
        ttl: config.cacheTTL !== undefined ? config.cacheTTL : 5 * 60 * 1000, // 5 minutos por padrão
        dbName: 'conf-drive-cache'
      },
      cacheValidation: {
        enabled: true, // Validação automática SEMPRE habilitada
        interval: config.validationInterval !== undefined ? config.validationInterval : 30 * 1000, // 30 segundos por padrão
        autoRefresh: true // Auto-refresh SEMPRE habilitado
      }
    };

    globalClient = new ConfDriveClient(clientConfig);
  },

  /**
   * Obtém dados da API - CACHE OBRIGATÓRIO COM EVENTOS
   * @param projectId ID do projeto
   * @param forceRefresh Forçar atualização (opcional)
   * @returns Dados do cache ou defaults se não há cache
   * 
   * NOVA LÓGICA:
   * 1. Se NÃO há cache -> retorna defaults IMEDIATAMENTE + faz request da API
   * 2. Se HÁ cache -> retorna cache IMEDIATAMENTE + faz request da API (se não expirado)
   * 3. Após API responder -> atualiza cache e emite evento 'cache:update'
   * 4. TTL = 0 -> sempre faz nova request
   * 
   * @example
   * ```typescript
   * // Setup: TTL = 5 minutos (300000 ms)
   * confDrive.setup(apiUrl, apiSecret, defaults, 300000);
   * 
   * // Escutar atualizações do cache
   * confDrive.on('cache:update', (data) => {
   *   this.config = data.data; // Atualiza automaticamente!
   * });
   * 
   * // Obter dados (sempre instantâneo)
   * const data = await confDrive.get('project-123');
   * ```
   */
  async get(projectId: string, forceRefresh?: boolean): Promise<ApiData> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    const client = globalClient as any;
    const cacheTTL = client.config?.cache?.ttl || 0;

    try {
      // Se forceRefresh, fazer requisição e aguardar
      if (forceRefresh) {
        const apiData = await globalClient.getProjectKeys(projectId, { forceRefresh: true });
        return apiData;
      }

      // Verificar se há cache válido
      const cachedData = await client.cacheManager.get('project', projectId);
      
      if (cachedData) {
        // HÁ CACHE: retorna cache imediatamente
        console.log('ConfDrive: Cache encontrado, retornando dados do cache');
        
        // Se TTL > 0, fazer update em background para próxima vez
        if (cacheTTL > 0) {
          globalClient.getProjectKeys(projectId, { forceRefresh: false })
            .catch(error => console.warn('ConfDrive: Erro no update background:', error));
        }
        
        return cachedData;
      } else {
        // NÃO HÁ CACHE: retornar defaults convertidos IMEDIATAMENTE
        console.log('ConfDrive: Sem cache, retornando defaults convertidos imediatamente');
        
        // Obter defaults convertidos diretamente
        const defaultData = this.getConvertedDefaults();
        
        // Fazer requisição da API em background (não aguarda)
        globalClient.getProjectKeys(projectId, { forceRefresh: false })
          .catch(error => console.warn('ConfDrive: Erro ao carregar da API em background:', error));
        
        // Retornar defaults IMEDIATAMENTE
        return defaultData;
      }
      
    } catch (error) {
      console.warn('ConfDrive: Erro geral, usando defaults convertidos:', error);
      // Retornar defaults convertidos em caso de erro
      return this.getConvertedDefaults();
    }
  },

  /**
   * Obtém os defaults convertidos para o formato correto
   */
  getConvertedDefaults(): ApiData {
    if (!globalClient) {
      return {};
    }

    const client = globalClient as any;
    const defaultValues = client.config?.defaultValues;
    
    if (!defaultValues) {
      return {};
    }

    // Usar a mesma lógica do getDefaultValuesForProject
    if (defaultValues.type === 'project') {
      const projectData = defaultValues.data;
      const result: Record<string, any> = {};
      
      Object.entries(projectData).forEach(([folderId, folderInfo]: [string, any]) => {
        const folderName = folderInfo.nameFolder;
        result[folderName] = folderInfo.keys;
      });
      
      return result;
    } else if (defaultValues.type === 'folder') {
      return defaultValues.data;
    }

    return {};
  },

  /**
   * Obtém uma propriedade específica dos dados da API
   * @param projectId ID do projeto
   * @param key Nome da propriedade
   * @param forceRefresh Forçar atualização (opcional)
   * @returns Valor da propriedade
   * 
   * @example
   * ```typescript
   * const titulo = await confDrive.getKey('project-123', 'tituloPagina');
   * ```
   */
  async getKey(projectId: string, key: string, forceRefresh?: boolean): Promise<any> {
    const data = await this.get(projectId, forceRefresh);
    return data[key];
  },

  /**
   * Obtém dados de uma pasta específica
   * @param folderId ID da pasta
   * @param forceRefresh Forçar atualização (opcional)
   * @returns Dados da pasta
   */
  async getFolder(folderId: string, forceRefresh?: boolean): Promise<ApiData> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    return await globalClient.getFolderKeys(folderId, { forceRefresh });
  },

  /**
   * Limpa todo o cache
   */
  async clearCache(): Promise<void> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    await globalClient.clearCache();
  },

  /**
   * Invalida cache de um projeto específico
   * @param projectId ID do projeto
   */
  async invalidateProject(projectId: string): Promise<void> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    await globalClient.invalidateProjectCache(projectId);
  },

  /**
   * Obtém estatísticas do cache
   */
  async getCacheStats(): Promise<any> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    return await globalClient.getCacheStats();
  },

  /**
   * Registra um listener para eventos do SDK
   * @param event Nome do evento
   * @param listener Função callback
   */
  on(event: string, listener: Function): void {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }

    (globalClient as any).on(event, listener);
  },

  /**
   * Verifica se o SDK foi configurado
   */
  isConfigured(): boolean {
    return globalClient !== null;
  },

  /**
   * Acesso ao cliente original para funcionalidades avançadas
   */
  client(): ConfDriveClient {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    return globalClient;
  },

  /**
   * Inicia validação automática de cache (normalmente já inicia automaticamente)
   */
  startValidation(): void {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    globalClient.startCacheValidation();
  },

  /**
   * Para validação automática de cache
   */
  stopValidation(): void {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    globalClient.stopCacheValidation();
  },

  /**
   * Obtém estatísticas da validação automática
   */
  getValidationStats() {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    return globalClient.getCacheValidationStats();
  },

  /**
   * Força validação imediata de cache (útil após reload da página)
   */
  async forceValidation(): Promise<void> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    return globalClient.forceValidation();
  },

  /**
   * Força invalidação remota de cache usando o novo sistema
   * @param projectId ID do projeto (opcional)
   * @param folderId ID da pasta (opcional)
   */
  async forceRemoteCacheInvalidation(projectId?: string, folderId?: string): Promise<any> {
    if (!globalClient) {
      throw new Error('ConfDrive não foi configurado. Chame confDrive.setup() primeiro.');
    }
    
    return globalClient.forceRemoteCacheInvalidation(projectId, folderId);
  }
};

// Exportar também com nome alternativo para compatibilidade
export { confDrive as simple };
export { confDrive as ConfDrive }; 