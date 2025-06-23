# ConfDrive SDK

SDK TypeScript para integração com a API do ConfDrive - Sistema de gerenciamento de configurações por ambiente.

## 🚀 **Nova API Ultra Simples com Validação Automática de Cache** 

### Configuração (apenas uma vez)
```typescript
import { confDrive } from '@conf-drive/sdk';

confDrive.setup(
  'https://api.confDrive.com/api',
  'sua-api-secret',
  defaultValues,  // valores padrão (obrigatório)
  5 * 60 * 1000,  // cache TTL: 5 minutos (opcional)
  30 * 1000       // validação remota: 30 segundos (opcional)
);
```

### Uso (uma única linha!)
```typescript
// Obter todas as configurações - SEMPRE instantâneo!
const config = await confDrive.get('seu-project-id');

// Pasta específica
const folderConfig = await confDrive.getFolder('folder-id');

// Chave específica
const dbUrl = await confDrive.getKey('project-id', 'DATABASE_URL');
```

### 🎯 **NOVO: Atualizações Automáticas**
```typescript
// Escutar atualizações automáticas quando cache é invalidado remotamente
confDrive.on('cache:update', (data) => {
  console.log('Configuração atualizada automaticamente!', data);
  // Sua UI será atualizada automaticamente!
});

confDrive.on('cache:remote-invalidated', (data) => {
  console.log('Cache invalidado remotamente:', data.type, data.projectId);
});
```

**É isso! Simples assim! 🎉**

---

## ✨ Funcionalidades

- **🚀 API Ultra Simples**: Configure uma vez, use em qualquer lugar com uma linha
- **⚡ Cache Inteligente**: Cache automático com IndexedDB, atualização em background  
- **🔄 Validação Automática**: Detecta invalidações remotas e refaz requests automaticamente
- **📡 Atualizações em Tempo Real**: Eventos para reagir a mudanças de configuração
- **🛡️ Fallback Automático**: Sempre retorna dados (API → Cache → Defaults)
- **🔧 Framework Agnóstico**: Funciona com React, Angular, Vue.js, Node.js, etc.
- **📊 Monitoramento**: Eventos para cache hits, API calls, erros, invalidações
- **🌍 Multi-ambiente**: Desenvolvimento, Teste, Produção
- **💾 Persistente**: Cache offline com IndexedDB
- **🐛 Debug Fácil**: Logs detalhados e estatísticas

## 📦 Instalação

```bash
npm install @conf-drive/sdk
```

## 🎯 Exemplos Rápidos

### React com Atualizações Automáticas
```tsx
import { confDrive } from '@conf-drive/sdk';

function App() {
  const [config, setConfig] = useState({});

  useEffect(() => {
    confDrive.setup('https://api.confDrive.com/api', 'secret', defaults);
    
    // Carregar configuração inicial
    confDrive.get('project-123').then(setConfig);
    
    // Escutar atualizações automáticas
    const handleUpdate = (data) => setConfig(data.data);
    confDrive.on('cache:update', handleUpdate);
    
    return () => confDrive.off('cache:update', handleUpdate);
  }, []);

  return <h1>{config.titulo}</h1>; // Atualiza automaticamente!
}
```

### Angular com Service
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { confDrive } from '@conf-drive/sdk';

@Injectable()
export class ConfigService {
  private configSubject = new BehaviorSubject(null);
  config$ = this.configSubject.asObservable();

  constructor() {
    confDrive.setup('https://api.confDrive.com/api', 'secret', defaults);
    
    // Atualizações automáticas
    confDrive.on('cache:update', (data) => {
      this.configSubject.next(data.data);
    });
  }

  async loadConfig(projectId: string) {
    const config = await confDrive.get(projectId);
    this.configSubject.next(config);
  }
}
```

### Node.js
```javascript
const { confDrive } = require('@conf-drive/sdk');

confDrive.setup('https://api.confDrive.com/api', 'secret', defaults);

app.get('/api/config', async (req, res) => {
  const config = await confDrive.get('project-123');
  res.json(config);
});
```

## 🔄 Como Funciona a Validação Automática

O SDK agora verifica automaticamente se o cache foi invalidado remotamente:

1. **Setup Inicial**: Configure TTL do cache (ex: 5 min) e intervalo de validação (ex: 30s)
2. **Cache Inteligente**: Dados são servidos instantaneamente do cache
3. **Validação em Background**: A cada 30s, verifica se cache foi invalidado remotamente
4. **Auto-Refresh**: Se detectar invalidação, refaz requests automaticamente
5. **Eventos**: Sua aplicação é notificada e pode reagir às mudanças

```typescript
// Configuração otimizada
confDrive.setup(
  apiUrl, 
  apiSecret, 
  defaults,
  5 * 60 * 1000,  // Cache: 5 minutos (boa performance)
  30 * 1000       // Validação: 30 segundos (detecção rápida)
);

// Sua app sempre tem dados atualizados automaticamente!
```

## 📚 Documentação Completa

### API Simplificada (Recomendada)

#### `confDrive.setup(apiUrl, apiSecret, defaultValues, cacheTTL?, validationInterval?)`
Configura o SDK globalmente com validação automática.

```typescript
confDrive.setup(
  'https://api.confDrive.com/api',
  'sua-api-secret',
  {
    appName: 'Minha App',
    theme: 'light',
    features: { darkMode: false }
  },
  5 * 60 * 1000,  // Cache TTL: 5 minutos
  30 * 1000       // Validação: 30 segundos  
);
```

#### `confDrive.get(projectId, forceRefresh?)`
Obtém todas as configurações de um projeto.

```typescript
const config = await confDrive.get('project-123');
const fresh = await confDrive.get('project-123', true); // forçar refresh
```

#### `confDrive.getFolder(folderId, forceRefresh?)`
Obtém configurações de uma pasta específica.

```typescript
const folderConfig = await confDrive.getFolder('folder-456');
```

#### `confDrive.getKey(projectId, key, forceRefresh?)`
Obtém uma chave específica.

```typescript
const dbUrl = await confDrive.getKey('project-123', 'DATABASE_URL');
```

#### Controle de Validação
```typescript
// Controlar validação automática
confDrive.startValidation();  // Iniciar (já inicia automaticamente)
confDrive.stopValidation();   // Parar
const stats = confDrive.getValidationStats(); // Estatísticas
```

#### Outras funções úteis
```typescript
// Cache
await confDrive.clearCache();
await confDrive.invalidateProject('project-123');
const stats = await confDrive.getCacheStats();

// Eventos de validação
confDrive.on('cache:remote-invalidated', (data) => {
  console.log('Cache invalidado:', data.type, data.projectId);
});

confDrive.on('cache:auto-refresh', (data) => {
  console.log(`${data.requests.length} requests refeitas automaticamente`);
});

confDrive.on('validation:started', (data) => {
  console.log('Validação iniciada:', data.interval);
});

// Eventos de cache
confDrive.on('cache:hit', (data) => console.log('Cache hit:', data.key));
confDrive.on('cache:update', (data) => console.log('Cache atualizado:', data));
confDrive.on('api:request', (data) => console.log('API call:', data.url));

// Status
const isReady = confDrive.isConfigured();
const client = confDrive.client(); // Acesso ao cliente avançado
```

### API Avançada (Para casos complexos)

Se precisar de mais controle sobre a validação:

```typescript
import { ConfDriveClient } from '@conf-drive/sdk';

const client = new ConfDriveClient({
  apiUrl: 'https://api.confDrive.com/api',
  apiSecret: 'sua-api-secret',
  defaultValues: { /* ... */ },
  cache: { 
    enabled: true, 
    ttl: 300000 
  },
  cacheValidation: {
    enabled: true,
    interval: 15000,    // 15 segundos
    autoRefresh: true   // refazer requests automaticamente
  }
});

// Controle manual
client.startCacheValidation();
client.stopCacheValidation();
const stats = client.getCacheValidationStats();

// Eventos específicos
client.on('cache:remote-invalidated', handleInvalidation);
client.on('cache:auto-refresh', handleAutoRefresh);
```

## 🔄 Migração da API Antiga

### Antes (Complexo)
```typescript
import { ConfDriveClient, ConfDriveConfig } from '@conf-drive/sdk';

const config: ConfDriveConfig = { /* ... */ };
const client = new ConfDriveClient(config);

const projectKeys = await client.getProjectKeys('project-123');
const envConfig = projectKeys['Desenvolvimento'] || {};
const titulo = envConfig['titulo'] || 'Padrão';

// Sem validação automática - cache pode ficar desatualizado
```

### Depois (Simples + Automático)
```typescript
import { confDrive } from '@conf-drive/sdk';

confDrive.setup(apiUrl, apiSecret, defaults, cacheTTL, validationInterval);
const config = await confDrive.get('project-123');
const titulo = config.titulo; // Sempre funciona + sempre atualizado!

// Com validação automática - cache sempre sincronizado
```

## 🎯 Casos de Uso

### 1. Aplicação Multi-tenant
```typescript
confDrive.setup(apiUrl, apiSecret, defaults);

// Cada tenant automaticamente tem cache gerenciado
const tenantA = await confDrive.get('tenant-a-project');
const tenantB = await confDrive.get('tenant-b-project');

// Sistema invalida cache apenas do tenant correto
```

### 2. Configuração por Ambiente
```typescript
// Diferentes pastas para ambientes
const prodConfig = await confDrive.getFolder('pasta-producao');
const devConfig = await confDrive.getFolder('pasta-desenvolvimento');

// Invalidação granular por pasta
```

### 3. Monitoramento de Configurações
```typescript
confDrive.on('cache:remote-invalidated', (data) => {
  // Enviar para analytics
  analytics.track('config_changed', {
    projectId: data.projectId,
    type: data.type
  });
  
  // Notificar usuário
  showNotification('Configuração atualizada!');
});
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```