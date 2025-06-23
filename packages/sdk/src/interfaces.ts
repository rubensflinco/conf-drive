/**
 * Configurações do cliente ConfDrive SDK
 */
export interface ConfDriveConfig {
  /** URL base da API do ConfDrive */
  apiUrl: string;
  /** Segredo de API válido do projeto */
  apiSecret: string;
  /** Configurações do sistema de cache */
  cache?: CacheConfig;
  /** Valores padrão das chaves (JSON) - novo formato com timestamp e tipo */
  defaultValues?: DefaultValuesSchema;
  /** Configurações de validação automática de cache */
  cacheValidation?: CacheValidationConfig;
}

/**
 * Schema para Default Values - suporta dois tipos: project e folder
 */
export interface DefaultValuesSchema {
  /** Timestamp de quando os valores padrão foram criados/atualizados */
  timestamp: number;
  /** Tipo do default value: "project" contém múltiplas pastas, "folder" contém apenas uma pasta */
  type: 'project' | 'folder';
  /** Dados do default value baseado no tipo */
  data: ProjectDefaultValueData | FolderDefaultValueData;
}

/**
 * Dados do default value do tipo "project"
 * Contém múltiplas pastas com suas chaves organizadas
 */
export interface ProjectDefaultValueData {
  [folderId: string]: {
    /** Nome da pasta */
    nameFolder: string;
    /** Descrição da pasta */
    description: string;
    /** Chaves da pasta */
    keys: Record<string, any>;
  };
}

/**
 * Dados do default value do tipo "folder"
 * Contém apenas as chaves de uma única pasta
 */
export interface FolderDefaultValueData extends Record<string, any> {}

/**
 * Interface para configuração simplificada do setup do ConfDrive SDK
 */
export interface ConfDriveSetupConfig {
  /** URL da API do ConfDrive */
  apiUrl: string;
  /** Segredo da API */
  apiSecret: string;
  /** Valores padrão (OBRIGATÓRIO) - pode ser formato antigo ou novo */
  defaultValues: Record<string, any> | DefaultValuesSchema;
  /** Tempo de vida do cache em milissegundos (padrão: 5 minutos, 0 = sempre recarrega) */
  cacheTTL?: number;
  /** Intervalo de verificação de invalidação remota em ms (padrão: 30 segundos) */
  validationInterval?: number;
}

/**
 * Configurações do sistema de cache
 */
export interface CacheConfig {
  /** Se o cache está habilitado (padrão: true) */
  enabled?: boolean;
  /** Tempo de vida do cache em milissegundos (padrão: 5 minutos) */
  ttl?: number;
  /** Nome do banco IndexedDB (padrão: 'conf-drive-cache') */
  dbName?: string;
  /** Versão do banco IndexedDB (padrão: 1) */
  dbVersion?: number;
}

/**
 * Configurações de validação automática de cache
 */
export interface CacheValidationConfig {
  /** Se a validação automática está habilitada (padrão: true) */
  enabled?: boolean;
  /** Intervalo de verificação em milissegundos (padrão: 30 segundos) */
  interval?: number;
  /** Se deve refazer requests automaticamente quando cache é invalidado (padrão: true) */
  autoRefresh?: boolean;
}

/**
 * Resposta da API de chaves do projeto organizadas por pasta
 */
export interface ProjectKeysResponse {
  [folderName: string]: Record<string, any>;
}

/**
 * Resposta da API de chaves de uma pasta específica
 */
export interface FolderKeysResponse extends Record<string, any> {}

/**
 * Item de cache armazenado no IndexedDB
 */
export interface CacheItem {
  /** Chave única do cache */
  key: string;
  /** Dados armazenados */
  data: any;
  /** Timestamp de quando foi armazenado */
  timestamp: number;
  /** Tempo de vida em milissegundos */
  ttl: number;
  /** Tipo de cache (project ou folder) */
  type: 'project' | 'folder';
  /** ID do projeto */
  projectId?: string;
  /** ID da pasta */
  folderId?: string;
  /** Se o cache foi invalidado mas deve ser mantido (nova regra) */
  invalidated?: boolean;
}

/**
 * Opções para buscar chaves do projeto
 */
export interface GetProjectKeysOptions {
  /** Se deve usar cache (padrão: true) */
  useCache?: boolean;
  /** Se deve forçar atualização do cache (padrão: false) */
  forceRefresh?: boolean;
  /** Timeout personalizado para esta requisição em ms */
  timeout?: number;
}

/**
 * Opções para buscar chaves da pasta
 */
export interface GetFolderKeysOptions {
  /** Se deve usar cache (padrão: true) */
  useCache?: boolean;
  /** Se deve forçar atualização do cache (padrão: false) */
  forceRefresh?: boolean;
  /** Timeout personalizado para esta requisição em ms */
  timeout?: number;
}

/**
 * Estatísticas do cache
 */
export interface CacheStats {
  /** Número total de itens no cache */
  totalItems: number;
  /** Número de itens expirados */
  expiredItems: number;
  /** Tamanho estimado do cache em bytes */
  estimatedSize: number;
  /** Última limpeza do cache */
  lastCleanup?: Date;
}

/**
 * Resultado de operação de cache
 */
export interface CacheOperationResult {
  /** Se a operação foi bem-sucedida */
  success: boolean;
  /** Mensagem de resultado */
  message?: string;
  /** Dados retornados (se aplicável) */
  data?: any;
}

/**
 * Informações de erro personalizado do SDK
 */
export interface ConfDriveError {
  /** Código do erro */
  code: string;
  /** Mensagem de erro */
  message: string;
  /** Erro original (se houver) */
  originalError?: Error;
  /** Contexto adicional */
  context?: Record<string, any>;
}

/**
 * Histórico de request para poder refazer quando cache é invalidado
 */
export interface RequestHistory {
  /** ID único da request */
  id: string;
  /** Tipo da request */
  type: 'project' | 'folder';
  /** ID do projeto */
  projectId?: string;
  /** ID da pasta */
  folderId?: string;
  /** Timestamp da request original */
  timestamp: number;
  /** Opções originais da request */
  options?: GetProjectKeysOptions | GetFolderKeysOptions;
  /** Se a request ainda está ativa (para callbacks) */
  active: boolean;
}

/**
 * Status de validação de cache
 */
export interface CacheValidityStatus {
  /** Se o cache está válido */
  valid: boolean;
  /** Razão da invalidação */
  reason?: 'global_invalidation' | 'project_invalidation' | 'folder_invalidation' | 'no_recent_invalidations' | 'error_checking_validity' | 'local_ttl_expired';
  /** Timestamp da última invalidação */
  lastInvalidation?: string;
  /** Detalhes completos da invalidação */
  invalidation?: {
    id: string;
    type: 'global' | 'project' | 'folder';
    projectId?: string;
    folderId?: string;
    userId?: string;
    userInfo?: any;
    timestamp: string;
    epochTimestamp: number;
  };
  /** Erro (se aplicável) */
  error?: string;
}

/**
 * Eventos que podem ser emitidos pelo SDK
 */
export interface ConfDriveEvents {
  /** Quando dados são obtidos do cache */
  'cache:hit': { key: string; type: 'project' | 'folder'; data: any };
  /** Quando dados não são encontrados no cache */
  'cache:miss': { key: string; type: 'project' | 'folder' };
  /** Quando o cache é invalidado */
  'cache:invalidated': { key?: string; type?: 'project' | 'folder' };
  /** Quando o cache é atualizado com novos dados da API */
  'cache:update': { key: string; type: 'project' | 'folder'; data: any; projectId?: string; folderId?: string };
  /** Quando uma requisição à API é feita */
  'api:request': { url: string; method: string };
  /** Quando uma requisição à API é completada */
  'api:response': { url: string; status: number; duration: number; data?: any };
  /** Quando ocorre um erro */
  'error': ConfDriveError;
  /** Quando cache é invalidado remotamente */
  'cache:remote-invalidated': { projectId?: string; folderId?: string; type: 'global' | 'project' | 'folder'; timestamp: string };
  /** Quando validação automática detecta invalidação e refaz requests */
  'cache:auto-refresh': { requests: RequestHistory[]; projectId?: string; folderId?: string };
  /** Quando validação automática é iniciada */
  'validation:started': { interval: number };
  /** Quando validação automática é parada */
  'validation:stopped': {};
  /** Quando ocorre erro na validação */
  'validation:error': { error: string; type?: 'project' | 'folder'; projectId?: string; folderId?: string };
  /** Quando cache inválido é detectado */
  'validation:invalid-cache-detected': { 
    type: 'project' | 'folder'; 
    projectId?: string; 
    folderId?: string; 
    reason?: string; 
    lastInvalidation?: string; 
    invalidation?: any 
  };
  /** Quando cache local expira por TTL */
  'validation:local-cache-expired': { 
    type: 'project' | 'folder'; 
    projectId?: string; 
    folderId?: string; 
    reason: string; 
    cacheTimestamp: number 
  };
  /** Quando cache é invalidado remotamente */
  'validation:remote-cache-invalidated': { 
    type: 'project' | 'folder'; 
    projectId?: string; 
    folderId?: string; 
    reason?: string; 
    lastInvalidation?: string; 
    invalidation?: any 
  };
  /** Quando cache é invalidado */
  'validation:cache-invalidated': { 
    type: 'project' | 'folder'; 
    projectId?: string; 
    folderId?: string; 
    reason?: string; 
    invalidation?: any; 
    affectedRequests: number 
  };
  /** Quando configuração é atualizada */
  'validation:config-updated': { config: any };
}

/**
 * Response da API de invalidação de cache
 */
export interface InvalidateCacheResponse {
  /** Se a operação foi bem-sucedida */
  success: boolean;
  /** Mensagem de resultado */
  message: string;
  /** Número de caches invalidados */
  invalidatedCount?: number;
} 