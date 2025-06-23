# ConfDrive SDK - Exemplos de Uso Super Simples

Este documento mostra como usar o ConfDrive SDK de forma extremamente simples em diferentes cenários.

## 🚀 Configuração Inicial (Uma Única Vez)

```typescript
import { confDrive } from '@conf-drive/sdk';

// Configure uma única vez no início da aplicação
confDrive.setup(
  'https://api.confDrive.com/api',  // URL da API
  'sua-api-secret-aqui',            // Segredo da API
  {                                 // Valores padrão (opcional)
    Desenvolvimento: {
      DATABASE_URL: 'localhost:5432',
      PORT: 3000,
      DEBUG: true
    },
    Produção: {
      DATABASE_URL: 'prod-db:5432',
      PORT: 80,
      DEBUG: false
    }
  },
  {
    defaultEnvironment: 'Desenvolvimento', // Ambiente padrão
    cache: {
      enabled: true,
      ttl: 5 * 60 * 1000  // 5 minutos
    }
  }
);
```

## 📖 Uso Básico - Obter Configurações

### Obter todas as configurações de um ambiente

```typescript
// Usar ambiente padrão
const config = await confDrive.get('project-123');

// Especificar ambiente
const prodConfig = await confDrive.get('project-123', 'Produção');

// Forçar atualização (bypass cache)
const freshConfig = await confDrive.get('project-123', 'Desenvolvimento', true);
```

### Obter uma chave específica

```typescript
// Obter uma chave específica
const dbUrl = await confDrive.getKey('project-123', 'DATABASE_URL');

// Com ambiente específico
const prodPort = await confDrive.getKey('project-123', 'PORT', 'Produção');
```

## 🎯 Exemplos Práticos

### 1. Aplicação React Simples

```tsx
import React, { useState, useEffect } from 'react';
import { confDrive } from '@conf-drive/sdk';

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      // Configurar SDK
      confDrive.setup(
        'https://api.confDrive.com/api',
        'sua-api-secret',
        { /* defaults */ }
      );

      // Carregar configuração - UMA ÚNICA LINHA!
      const appConfig = await confDrive.get('my-project');
      
      setConfig(appConfig);
      setLoading(false);
    }

    loadConfig();
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>{config.titulo}</h1>
      <p>{config.descricao}</p>
      {/* SDK automaticamente usa cache e fallback! */}
    </div>
  );
}
```

### 2. Aplicação Angular Ultra Simples

```typescript
import { Component, OnInit } from '@angular/core';
import { confDrive } from '@conf-drive/sdk';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="!loading">
      <h1>{{ config.titulo }}</h1>
      <p>{{ config.descricao }}</p>
    </div>
  `
})
export class AppComponent implements OnInit {
  config: any = {};
  loading = true;

  async ngOnInit() {
    // Setup - uma linha
    confDrive.setup('https://api.confDrive.com/api', 'secret', defaults);
    
    // Carregar - uma linha
    this.config = await confDrive.get('my-project');
    this.loading = false;
  }
}
```

### 3. Aplicação Vue.js Simples

```vue
<template>
  <div v-if="!loading">
    <h1>{{ config.titulo }}</h1>
    <p>{{ config.descricao }}</p>
  </div>
</template>

<script>
import { confDrive } from '@conf-drive/sdk';

export default {
  data() {
    return {
      config: {},
      loading: true
    };
  },
  async mounted() {
    // Setup
    confDrive.setup('https://api.confDrive.com/api', 'secret');
    
    // Load
    this.config = await confDrive.get('my-project');
    this.loading = false;
  }
};
</script>
```

### 4. Node.js/Express Simples

```javascript
const express = require('express');
const { confDrive } = require('@conf-drive/sdk');

const app = express();

// Setup uma vez
confDrive.setup('https://api.confDrive.com/api', 'secret');

app.get('/config', async (req, res) => {
  // Uma linha para obter configuração
  const config = await confDrive.get('my-project', 'Produção');
  res.json(config);
});

app.listen(3000);
```

## 🔧 Funcionalidades Avançadas

### Gerenciar Cache

```typescript
// Limpar cache de um projeto
await confDrive.invalidateProject('project-123');

// Limpar todo o cache
await confDrive.clearCache();

// Obter estatísticas do cache
const stats = await confDrive.getCacheStats();
console.log(`Cache tem ${stats.totalItems} itens`);
```

### Eventos para Debug

```typescript
// Monitorar operações do SDK
confDrive.on('cache:hit', (data) => {
  console.log('✅ Cache hit:', data.key);
});

confDrive.on('api:request', (data) => {
  console.log('🌐 API Request:', data.url);
});

confDrive.on('api:response', (data) => {
  console.log('📡 API Response:', data.status, data.duration + 'ms');
});
```

### Alterar Ambiente Dinamicamente

```typescript
// Definir ambiente padrão
confDrive.setDefaultEnvironment('Produção');

// Verificar ambiente atual
console.log(confDrive.getDefaultEnvironment()); // 'Produção'

// Obter configuração do novo ambiente padrão
const config = await confDrive.get('project-123'); // Usa 'Produção'
```

## 🆚 Comparação: Antes vs Depois

### ❌ Antes (Complexo)

```typescript
import { ConfDriveClient, ConfDriveConfig } from '@conf-drive/sdk';

// Muita configuração...
const config: ConfDriveConfig = {
  apiUrl: 'https://api.confDrive.com/api',
  apiSecret: 'secret',
  defaultValues: { /* ... */ },
  cache: { /* ... */ }
};

// Criar cliente
const client = new ConfDriveClient(config);

// Configurar eventos
client.on('cache:hit', /* ... */);
client.on('api:request', /* ... */);

// Obter dados (complexo)
const projectKeys = await client.getProjectKeys('project-123', {
  forceRefresh: false,
  timeout: 10000
});

const environmentConfig = projectKeys['Desenvolvimento'] || {};
const titulo = environmentConfig['titulo'] || 'Padrão';

// Gerenciar cache manualmente
await client.invalidateProjectCache('project-123');
const stats = await client.getCacheStats();
```

### ✅ Depois (Ultra Simples)

```typescript
import { confDrive } from '@conf-drive/sdk';

// Setup uma vez
confDrive.setup('https://api.confDrive.com/api', 'secret', defaults);

// Usar em qualquer lugar - UMA LINHA!
const config = await confDrive.get('project-123');
const titulo = config.titulo; // Sempre funciona (cache + fallback automático)

// Cache com uma linha
await confDrive.invalidateProject('project-123');
```

## 🎯 Cenários de Uso

### 1. **Aplicação Web Simples**
```typescript
confDrive.setup(url, secret, defaults);
const config = await confDrive.get('project-id');
// Pronto! 2 linhas apenas
```

### 2. **Multi-ambiente**
```typescript
const devConfig = await confDrive.get('project', 'Desenvolvimento');
const prodConfig = await confDrive.get('project', 'Produção');
```

### 3. **Chave Específica**
```typescript
const dbUrl = await confDrive.getKey('project', 'DATABASE_URL');
const port = await confDrive.getKey('project', 'PORT', 'Produção');
```

### 4. **Com Cache Inteligente**
```typescript
// Primeira chamada: vai para a API
const config1 = await confDrive.get('project');

// Segunda chamada: usa cache automaticamente
const config2 = await confDrive.get('project'); // Instantâneo!

// Forçar atualização quando necessário
const fresh = await confDrive.get('project', undefined, true);
```

## 🔥 Vantagens da Nova API

1. **📦 Setup único**: Configure uma vez, use em qualquer lugar
2. **🚀 Uma linha**: `confDrive.get()` para obter qualquer configuração
3. **🧠 Inteligente**: Cache automático + fallback para defaults
4. **🔧 Framework agnóstico**: Funciona com React, Angular, Vue, Node.js, etc.
5. **⚡ Rápido**: Cache inteligente + requisições em background
6. **🛡️ Confiável**: Sempre retorna dados (API ou defaults)
7. **🐛 Debug fácil**: Listeners de eventos opcionais

## 📝 Resumo

**Antes**: 50+ linhas de código complexo
**Depois**: 2-3 linhas simples

```typescript
// Setup (uma vez)
confDrive.setup(apiUrl, apiSecret, defaults);

// Usar (quantas vezes quiser)
const config = await confDrive.get('project-id');
```

**É isso! Simples assim! 🎉**

## Configuração Básica com Validação Automática de Cache

```typescript
import { confDrive } from '@conf-drive/sdk';

// Setup com validação automática (recomendado)
confDrive.setup(
  'https://api.confDrive.com/api',
  'sua-api-secret',
  { 
    tituloPagina: 'Minha App',
    theme: 'light',
    maxItems: 10 
  }, // Valores padrão
  5 * 60 * 1000, // Cache TTL: 5 minutos
  30 * 1000 // Verificação de invalidação: 30 segundos
);

// Escutar eventos de cache
confDrive.on('cache:remote-invalidated', (data) => {
  console.log('Cache invalidado remotamente:', data);
  // { projectId: 'proj123', type: 'project', timestamp: '...' }
});

confDrive.on('cache:auto-refresh', (data) => {
  console.log('Refazendo requests automaticamente:', data.requests.length);
});

confDrive.on('cache:update', (data) => {
  console.log('Dados atualizados:', data);
  // Atualizar interface aqui se necessário
});
```

## Uso com React/Vue/Angular

### React Hook

```typescript
import { useEffect, useState } from 'react';
import { confDrive } from '@conf-drive/sdk';

interface AppConfig {
  tituloPagina: string;
  theme: string;
  maxItems: number;
}

export function useAppConfig(projectId: string) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configurar listener para atualizações automáticas
    const handleUpdate = (data: any) => {
      if (data.projectId === projectId) {
        setConfig(data.data);
        setLoading(false);
      }
    };

    confDrive.on('cache:update', handleUpdate);

    // Carregar dados iniciais
    const loadConfig = async () => {
      try {
        const data = await confDrive.get(projectId);
        setConfig(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadConfig();

    // Cleanup
    return () => {
      confDrive.off('cache:update', handleUpdate);
    };
  }, [projectId]);

  return { config, loading, error };
}

// Uso no componente
function App() {
  const { config, loading, error } = useAppConfig('meu-projeto-123');

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>{config.tituloPagina}</h1>
      <div className={`theme-${config.theme}`}>
        {/* Sua aplicação aqui */}
      </div>
    </div>
  );
}
```

### Angular Service

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { confDrive } from '@conf-drive/sdk';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<any>(null);
  public config$ = this.configSubject.asObservable();

  constructor() {
    // Escutar atualizações automáticas
    confDrive.on('cache:update', (data) => {
      this.configSubject.next(data.data);
    });
  }

  async loadConfig(projectId: string): Promise<void> {
    try {
      const config = await confDrive.get(projectId);
      this.configSubject.next(config);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  }

  async loadFolderConfig(folderId: string): Promise<void> {
    try {
      const config = await confDrive.getFolder(folderId);
      this.configSubject.next(config);
    } catch (error) {
      console.error('Erro ao carregar configuração da pasta:', error);
    }
  }
}
```

## Configuração Avançada

```typescript
import { ConfDriveClient, CacheValidator } from '@conf-drive/sdk';

// Cliente personalizado com controle total
const client = new ConfDriveClient({
  apiUrl: 'https://api.confDrive.com/api',
  apiSecret: 'sua-api-secret',
  defaultValues: {
    theme: 'light',
    language: 'pt-BR'
  },
  cache: {
    enabled: true,
    ttl: 10 * 60 * 1000, // 10 minutos
    dbName: 'minha-app-cache'
  },
  cacheValidation: {
    enabled: true,
    interval: 15 * 1000, // Verificar a cada 15 segundos
    autoRefresh: true // Refazer requests automaticamente
  }
});

// Eventos disponíveis
client.on('cache:remote-invalidated', (data) => {
  console.log('Cache foi invalidado remotamente:', data);
});

client.on('cache:auto-refresh', (data) => {
  console.log(`Refazendo ${data.requests.length} requests automaticamente`);
});

client.on('validation:started', (data) => {
  console.log('Validação automática iniciada:', data.interval);
});

// Controle manual da validação
client.stopCacheValidation();  // Parar validação
client.startCacheValidation(); // Iniciar validação

// Estatísticas
const stats = client.getCacheValidationStats();
console.log('Stats de validação:', stats);
```

## Casos de Uso Comuns

### 1. Aplicação Multi-tenant

```typescript
// Configurar diferentes projetos
confDrive.setup(apiUrl, apiSecret, defaults);

// Cada tenant usa seu próprio projeto
const tenantAConfig = await confDrive.get('tenant-a-project');
const tenantBConfig = await confDrive.get('tenant-b-project');

// Sistema automaticamente gerencia cache de cada projeto
// e invalida apenas quando necessário
```

### 2. Configuração por Ambiente/Pasta

```typescript
// Diferentes pastas para diferentes ambientes
const prodConfig = await confDrive.getFolder('pasta-producao');
const devConfig = await confDrive.getFolder('pasta-desenvolvimento');

// Sistema rastreia invalidações específicas por pasta
```

### 3. Monitoramento de Mudanças

```typescript
confDrive.on('cache:remote-invalidated', (data) => {
  // Enviar evento para analytics
  analytics.track('config_invalidated', {
    type: data.type,
    projectId: data.projectId,
    folderId: data.folderId,
    timestamp: data.timestamp
  });
});

confDrive.on('cache:auto-refresh', (data) => {
  // Log de auto-refresh
  console.log(`Auto-refresh: ${data.requests.length} requests refeitas`);
});
```

## Tratamento de Erros

```typescript
try {
  const config = await confDrive.get('projeto-123');
} catch (error) {
  if (error.code === 'API_REQUEST_FAILED') {
    // Erro na API - SDK já tentou usar cache e defaults
    console.error('Falha total na configuração:', error.message);
  }
}

// O SDK automaticamente:
// 1. Usa cache se API falhar
// 2. Usa defaults se não há cache
// 3. Só falha se não há defaults
```

## Performance e Otimização

```typescript
// Cache com TTL longo + validação rápida = melhor performance
confDrive.setup(
  apiUrl,
  apiSecret,
  defaults,
  30 * 60 * 1000, // Cache: 30 minutos
  10 * 1000       // Validação: 10 segundos
);

// Estatísticas de performance
const cacheStats = await confDrive.getCacheStats();
const validationStats = confDrive.getValidationStats();

console.log({
  cacheHitRate: cacheStats.hitRate,
  validationInterval: validationStats.interval,
  activeRequests: validationStats.activeRequests
});
```

## Exemplo Completo - Aplicação React

```typescript
import React, { useEffect, useState } from 'react';
import { confDrive } from '@conf-drive/sdk';

// Configuração inicial
confDrive.setup(
  process.env.REACT_APP_CONFDRIVE_URL,
  process.env.REACT_APP_CONFDRIVE_SECRET,
  {
    appName: 'Minha App',
    theme: 'light',
    language: 'pt-BR',
    features: {
      darkMode: false,
      notifications: true
    }
  },
  5 * 60 * 1000, // 5 min cache
  30 * 1000      // 30s validation
);

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar configuração inicial
    const loadConfig = async () => {
      try {
        const appConfig = await confDrive.get('minha-app-config');
        setConfig(appConfig);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        setLoading(false);
      }
    };

    // Escutar atualizações automáticas
    const handleConfigUpdate = (data) => {
      console.log('Configuração atualizada automaticamente!');
      setConfig(data.data);
    };

    confDrive.on('cache:update', handleConfigUpdate);
    loadConfig();

    return () => {
      confDrive.off('cache:update', handleConfigUpdate);
    };
  }, []);

  if (loading) {
    return <div>Carregando configuração...</div>;
  }

  return (
    <div className={`app theme-${config.theme}`}>
      <header>
        <h1>{config.appName}</h1>
      </header>
      <main>
        {/* Sua aplicação aqui */}
        {config.features.darkMode && <DarkModeToggle />}
        {config.features.notifications && <NotificationCenter />}
      </main>
    </div>
  );
}

export default App;
```

Este exemplo mostra um sistema completo onde:

1. **Setup inicial** configura cache e validação automática
2. **Cache TTL** de 5 minutos para boa performance
3. **Validação** a cada 30 segundos para detectar mudanças
4. **Auto-refresh** refaz requests quando cache é invalidado
5. **Fallbacks** automáticos (cache → defaults → erro)
6. **Eventos** permitem reagir a mudanças em tempo real

O sistema garante que sua aplicação sempre tenha as configurações mais atualizadas, mesmo quando há invalidações remotas, mantendo excelente performance através do cache inteligente. 

## Instalação e Setup Simplificado

### 1. Configuração Ultra Simples com Objeto JSON

```typescript
import { confDrive } from '@conf-drive/sdk';
import defaultValues from './default-values.json';

// ========== NOVA CONFIGURAÇÃO BASEADA EM OBJETO JSON ==========
confDrive.setup({
  apiUrl: 'http://localhost:3000/api',
  apiSecret: 'sua-api-secret-aqui',
  defaultValues: defaultValues, // Valores padrão obrigatórios
  cacheTTL: 5 * 60 * 1000, // Cache TTL: 5 minutos (opcional)
  validationInterval: 30 * 1000 // Verificação de invalidação: 30 segundos (opcional)
});
```

### 2. Configuração com IntelliSense

A nova configuração oferece IntelliSense completo:

```typescript
confDrive.setup({
  apiUrl: 'https://api.confDrive.com/api', // ✅ URL da API do ConfDrive
  apiSecret: 'abc123...', // ✅ Segredo da API
  defaultValues: { // ✅ Valores padrão (OBRIGATÓRIO)
    tituloPagina: 'Minha App',
    corTema: '#007bff'
  },
  cacheTTL: 300000, // ✅ Tempo de vida do cache em ms (opcional)
  validationInterval: 30000 // ✅ Intervalo de validação em ms (opcional)
});
```

### 3. Configuração Mínima

```typescript
// Configuração mínima - apenas campos obrigatórios
confDrive.setup({
  apiUrl: 'https://api.confDrive.com/api',
  apiSecret: 'sua-api-secret',
  defaultValues: {
    titulo: 'App Padrão',
    tema: 'claro'
  }
  // cacheTTL e validationInterval usam valores padrão
});
```

## Vantagens da Nova Configuração

### ✅ Mais Legível
```typescript
// ❌ Configuração antiga (parâmetros separados)
confDrive.setup(
  'https://api.confDrive.com/api', 
  'secret', 
  defaults, 
  300000, 
  30000
);

// ✅ Nova configuração (objeto JSON)
confDrive.setup({
  apiUrl: 'https://api.confDrive.com/api',
  apiSecret: 'secret',
  defaultValues: defaults,
  cacheTTL: 300000,
  validationInterval: 30000
});
```

### ✅ IntelliSense Completo
- Nomes dos campos ficam visíveis
- Documentação inline de cada campo
- Detecção de erros de digitação
- Autocompletar

### ✅ Fácil Manutenção
- Campos opcionais podem ser omitidos
- Fácil de adicionar novos campos no futuro
- Melhor legibilidade do código

## Uso Após Setup

```typescript
// Escutar eventos de atualização
confDrive.on('cache:update', (data) => {
  console.log('✅ Configuração atualizada:', data.data);
  // Atualizar sua interface automaticamente
});

// Obter configuração (instantâneo)
const config = await confDrive.get('projeto-123');

// Forçar recarregamento
const configAtualizada = await confDrive.get('projeto-123', true);
``` 