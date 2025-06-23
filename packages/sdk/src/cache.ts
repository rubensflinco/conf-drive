import { CacheConfig, CacheItem, CacheStats, CacheOperationResult } from './interfaces';

/**
 * Gerenciador de cache usando IndexedDB para armazenamento persistente
 */
export class CacheManager {
  private db: IDBDatabase | null = null;
  private config: Required<CacheConfig>;
  private isInitialized = false;
  private defaultValues: Record<string, any> | undefined;

  /**
   * Configuração padrão do cache
   */
  private static readonly DEFAULT_CONFIG: Required<CacheConfig> = {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutos
    dbName: 'conf-drive-cache',
    dbVersion: 1
  };

  /**
   * Nome da store no IndexedDB
   */
  private static readonly STORE_NAME = 'cache_items';

  constructor(config: CacheConfig = {}, defaultValues?: Record<string, any>) {
    this.config = { ...CacheManager.DEFAULT_CONFIG, ...config };
    this.defaultValues = defaultValues;
  }

  /**
   * Atualiza os valores padrão (usado quando configuração é atualizada)
   * @param defaultValues Novos valores padrão
   */
  updateDefaultValues(defaultValues?: Record<string, any>): void {
    this.defaultValues = defaultValues;
  }

  /**
   * Inicializa o banco de dados IndexedDB
   * @returns Promise que resolve quando o banco estiver pronto
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        reject(new Error(`Erro ao abrir banco IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Criar store se não existir
        if (!db.objectStoreNames.contains(CacheManager.STORE_NAME)) {
          const store = db.createObjectStore(CacheManager.STORE_NAME, { keyPath: 'key' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('folderId', 'folderId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Gera uma chave única para o cache
   * @param type Tipo do cache ('project' ou 'folder')
   * @param id ID do projeto ou pasta
   * @returns Chave única do cache
   */
  private generateCacheKey(type: 'project' | 'folder', id: string): string {
    return `${type}:${id}`;
  }

  /**
   * Verifica se um item do cache ainda é válido
   * @param item Item do cache
   * @returns True se o item ainda é válido
   */
  private isItemValid(item: CacheItem): boolean {
    const now = Date.now();
    
    // Nova regra: se foi invalidado, deve verificar timestamp dos default values
    if (item.invalidated) {
      // Se tem timestamp nos default values, só é válido se cache for mais novo
      if (this.defaultValues && this.defaultValues['timestamp']) {
        return item.timestamp >= this.defaultValues['timestamp'];
      }
      // Se não tem timestamp nos default values, manter cache invalidado até nova substituição
      return false;
    }
    
    // Regra original: verificar TTL
    return (now - item.timestamp) < item.ttl;
  }

  /**
   * Verifica se um item pode ser usado como fallback (nova lógica)
   * @param item Item do cache
   * @returns True se o item pode ser usado como fallback
   */
  private canUseAsFallback(item: CacheItem): boolean {
    // Se não foi invalidado, seguir regra normal de TTL
    if (!item.invalidated) {
      return this.isItemValid(item);
    }
    
    // Se foi invalidado MAS não há timestamp nos default values, usar como fallback
    if (!this.defaultValues || !this.defaultValues['timestamp']) {
      return true;
    }
    
    // Se foi invalidado E há timestamp, só usar se cache for mais novo
    return item.timestamp >= this.defaultValues['timestamp'];
  }

  /**
   * Armazena dados no cache
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @param data Dados para armazenar
   * @param customTtl TTL personalizado (opcional)
   * @returns Resultado da operação
   */
  async set(
    type: 'project' | 'folder',
    id: string,
    data: any,
    customTtl?: number
  ): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    const key = this.generateCacheKey(type, id);
    const ttl = customTtl || this.config.ttl;

          const cacheItem: CacheItem = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        type,
        invalidated: false, // Sempre limpar flag de invalidação ao armazenar novos dados
        ...(type === 'project' ? { projectId: id } : { folderId: id })
      };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.put(cacheItem);

      request.onsuccess = () => {
        resolve({ success: true, message: 'Item armazenado no cache' });
      };

      request.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao armazenar no cache: ${request.error?.message}` 
        });
      };
    });
  }

  /**
   * Recupera dados do cache
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Dados do cache ou null se não encontrado/expirado
   */
  async get(type: 'project' | 'folder', id: string): Promise<any | null> {
    if (!this.config.enabled) {
      return null;
    }

    await this.initialize();

    if (!this.db) {
      return null;
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const item: CacheItem = request.result;

        if (!item) {
          resolve(null);
          return;
        }

        if (this.isItemValid(item)) {
          resolve(item.data);
        } else if (this.canUseAsFallback(item)) {
          // Cache invalidado mas pode ser usado como fallback
          resolve(item.data);
        } else {
          // Item expirado/inválido, verificar se deve ser removido ou apenas invalidado
          this.handleExpiredItem(item, type, id);
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Recupera dados do cache com metadata (timestamp)
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Objeto com data e timestamp, ou null se não encontrado/expirado
   */
  async getWithMetadata(type: 'project' | 'folder', id: string): Promise<{data: any, timestamp: number} | null> {
    if (!this.config.enabled) {
      return null;
    }

    await this.initialize();

    if (!this.db) {
      return null;
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const item: CacheItem = request.result;

        if (!item) {
          resolve(null);
          return;
        }

        if (this.isItemValid(item)) {
          resolve({
            data: item.data,
            timestamp: item.timestamp
          });
        } else if (this.canUseAsFallback(item)) {
          // Cache invalidado mas pode ser usado como fallback
          resolve({
            data: item.data,
            timestamp: item.timestamp
          });
        } else {
          // Item expirado/inválido, verificar se deve ser removido ou apenas invalidado
          this.handleExpiredItem(item, type, id);
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Recupera dados do cache com informações completas de validade
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Objeto com data, timestamp e status de validade
   */
  async getWithValidityInfo(type: 'project' | 'folder', id: string): Promise<{
    data: any, 
    timestamp: number, 
    isValid: boolean, 
    isExpired: boolean
  } | null> {
    if (!this.config.enabled) {
      return null;
    }

    await this.initialize();

    if (!this.db) {
      return null;
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const item: CacheItem = request.result;

        if (!item) {
          resolve(null);
          return;
        }

        const isValid = this.isItemValid(item);
        const canUseFallback = this.canUseAsFallback(item);
        
        resolve({
          data: item.data,
          timestamp: item.timestamp,
          isValid: isValid || canUseFallback, // Válido se estritamente válido OU pode usar como fallback
          isExpired: !isValid && !canUseFallback // Expirado apenas se não for válido E não pode usar como fallback
        });
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Recupera dados do cache mesmo se expirado (para usar como fallback)
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Dados do cache ou null se não encontrado
   */
  async getEvenIfExpired(type: 'project' | 'folder', id: string): Promise<{
    data: any, 
    timestamp: number, 
    isExpired: boolean,
    invalidated?: boolean
  } | null> {
    if (!this.config.enabled) {
      return null;
    }

    await this.initialize();

    if (!this.db) {
      return null;
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const item: CacheItem = request.result;

        if (!item) {
          resolve(null);
          return;
        }

        const isValid = this.isItemValid(item);
        
        resolve({
          data: item.data,
          timestamp: item.timestamp,
          isExpired: !isValid,
          invalidated: item.invalidated || false
        });
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Marca um item como invalidado ao invés de apagar (nova regra)
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Resultado da operação
   */
  async markAsInvalidated(type: 'project' | 'folder', id: string): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const item: CacheItem = getRequest.result;
        if (!item) {
          resolve({ success: false, message: 'Item não encontrado no cache' });
          return;
        }

        // Marcar como invalidado
        item.invalidated = true;
        
        const putRequest = store.put(item);
        putRequest.onsuccess = () => {
          resolve({ success: true, message: 'Item marcado como invalidado' });
        };
        putRequest.onerror = () => {
          resolve({ 
            success: false, 
            message: `Erro ao marcar item como invalidado: ${putRequest.error?.message}` 
          });
        };
      };

      getRequest.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao buscar item: ${getRequest.error?.message}` 
        });
      };
    });
  }

  /**
   * Processa um item expirado conforme as novas regras
   * @param item Item do cache
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   */
  private async handleExpiredItem(item: CacheItem, type: 'project' | 'folder', id: string): Promise<void> {
    // Nova regra: verificar se deve ser apagado ou apenas invalidado
    if (this.defaultValues && this.defaultValues['timestamp']) {
      // Se item é mais antigo que timestamp dos default values, pode apagar
      if (item.timestamp < this.defaultValues['timestamp']) {
        await this.delete(type, id);
        return;
      }
    }
    
    // Caso contrário, apenas marcar como invalidado
    await this.markAsInvalidated(type, id);
  }

  /**
   * Remove um item específico do cache
   * @param type Tipo do cache
   * @param id ID do projeto ou pasta
   * @returns Resultado da operação
   */
  async delete(type: 'project' | 'folder', id: string): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    const key = this.generateCacheKey(type, id);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve({ success: true, message: 'Item removido do cache' });
      };

      request.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao remover do cache: ${request.error?.message}` 
        });
      };
    });
  }

  /**
   * Invalida todo o cache de um projeto (nova implementação - marca como invalidado)
   * @param projectId ID do projeto
   * @returns Resultado da operação
   */
  async invalidateProject(projectId: string): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const index = store.index('projectId');
      const request = index.openCursor(IDBKeyRange.only(projectId));

      let invalidatedCount = 0;
      const itemsToProcess: CacheItem[] = [];

      // Primeiro, coletar todos os itens
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          itemsToProcess.push(cursor.value);
          cursor.continue();
        } else {
          // Processar todos os itens conforme as novas regras
          this.processInvalidationBatch(itemsToProcess, store).then((processedCount) => {
            resolve({ 
              success: true, 
              message: `${processedCount} itens do projeto invalidados conforme as novas regras` 
            });
          }).catch((error) => {
            resolve({ 
              success: false, 
              message: `Erro ao processar invalidação: ${error.message}` 
            });
          });
        }
      };

      request.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao invalidar cache do projeto: ${request.error?.message}` 
        });
      };
    });
  }

  /**
   * Processa um lote de itens para invalidação conforme as novas regras
   * @param items Itens a serem processados
   * @param store Store do IndexedDB
   * @returns Número de itens processados
   */
  private async processInvalidationBatch(items: CacheItem[], store: IDBObjectStore): Promise<number> {
    let processedCount = 0;

    for (const item of items) {
      try {
        // Verificar se deve ser apagado ou apenas invalidado
        if (this.defaultValues && this.defaultValues['timestamp']) {
          // Se item é mais antigo que timestamp dos default values, pode apagar
          if (item.timestamp < this.defaultValues['timestamp']) {
            await new Promise<void>((resolve, reject) => {
              const deleteRequest = store.delete(item.key);
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => reject(deleteRequest.error);
            });
          } else {
            // Marcar como invalidado
            item.invalidated = true;
            await new Promise<void>((resolve, reject) => {
              const putRequest = store.put(item);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            });
          }
        } else {
          // Sem timestamp nos default values, apenas marcar como invalidado
          item.invalidated = true;
          await new Promise<void>((resolve, reject) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
        }
        processedCount++;
      } catch (error) {
        console.warn(`Erro ao processar item ${item.key}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Limpa todo o cache
   * @returns Resultado da operação
   */
  async clear(): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve({ success: true, message: 'Cache limpo completamente' });
      };

      request.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao limpar cache: ${request.error?.message}` 
        });
      };
    });
  }

  /**
   * Remove itens expirados do cache (conforme novas regras)
   * @returns Resultado da operação
   */
  async cleanup(): Promise<CacheOperationResult> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cache desabilitado' };
    }

    await this.initialize();

    if (!this.db) {
      return { success: false, message: 'Banco de dados não inicializado' };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.openCursor();

      let processedCount = 0;
      const now = Date.now();
      const itemsToProcess: CacheItem[] = [];

      // Primeiro, coletar todos os itens expirados
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item: CacheItem = cursor.value;
          if ((now - item.timestamp) >= item.ttl) {
            itemsToProcess.push(item);
          }
          cursor.continue();
        } else {
          // Processar todos os itens conforme as novas regras
          this.processCleanupBatch(itemsToProcess, store).then((count) => {
            resolve({ 
              success: true, 
              message: `${count} itens processados durante limpeza` 
            });
          }).catch((error) => {
            resolve({ 
              success: false, 
              message: `Erro ao processar limpeza: ${error.message}` 
            });
          });
        }
      };

      request.onerror = () => {
        resolve({ 
          success: false, 
          message: `Erro ao limpar itens expirados: ${request.error?.message}` 
        });
      };
    });
  }

  /**
   * Processa um lote de itens para limpeza conforme as novas regras
   * @param items Itens a serem processados
   * @param store Store do IndexedDB
   * @returns Número de itens processados
   */
  private async processCleanupBatch(items: CacheItem[], store: IDBObjectStore): Promise<number> {
    let processedCount = 0;

    for (const item of items) {
      try {
        // Verificar se deve ser apagado ou apenas invalidado
        if (this.defaultValues && this.defaultValues['timestamp']) {
          // Se item é mais antigo que timestamp dos default values, pode apagar
          if (item.timestamp < this.defaultValues['timestamp']) {
            await new Promise<void>((resolve, reject) => {
              const deleteRequest = store.delete(item.key);
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => reject(deleteRequest.error);
            });
          } else {
            // Marcar como invalidado
            item.invalidated = true;
            await new Promise<void>((resolve, reject) => {
              const putRequest = store.put(item);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            });
          }
        } else {
          // Sem timestamp nos default values, apenas marcar como invalidado
          item.invalidated = true;
          await new Promise<void>((resolve, reject) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
        }
        processedCount++;
      } catch (error) {
        console.warn(`Erro ao processar item durante limpeza ${item.key}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Obtém estatísticas do cache
   * @returns Estatísticas do cache
   */
  async getStats(): Promise<CacheStats> {
    if (!this.config.enabled) {
      return {
        totalItems: 0,
        expiredItems: 0,
        estimatedSize: 0
      };
    }

    await this.initialize();

    if (!this.db) {
      return {
        totalItems: 0,
        expiredItems: 0,
        estimatedSize: 0
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CacheManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CacheManager.STORE_NAME);
      const request = store.openCursor();

      let totalItems = 0;
      let expiredItems = 0;
      let estimatedSize = 0;
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item: CacheItem = cursor.value;
          totalItems++;
          
          if ((now - item.timestamp) >= item.ttl) {
            expiredItems++;
          }

          // Estimativa do tamanho (não é precisa, mas serve como referência)
          estimatedSize += JSON.stringify(item).length * 2; // UTF-16

          cursor.continue();
        } else {
          resolve({
            totalItems,
            expiredItems,
            estimatedSize
          });
        }
      };

      request.onerror = () => {
        resolve({
          totalItems: 0,
          expiredItems: 0,
          estimatedSize: 0
        });
      };
    });
  }

  /**
   * Verifica se o cache está habilitado
   * @returns True se o cache está habilitado
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Fecha a conexão com o banco de dados
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
} 