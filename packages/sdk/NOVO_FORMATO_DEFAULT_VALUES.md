# Novo Formato de Default Values

## Visão Geral

O ConfDrive SDK agora suporta um novo formato de schema para os `defaultValues`, permitindo melhor organização e processamento de dados para diferentes tipos de projetos.

## Tipos de Default Values

### 1. Tipo "project"

Usado quando você tem um projeto com múltiplas pastas e quer definir valores padrão organizados por pasta.

```json
{
  "timestamp": 1703980800000,
  "type": "project",
  "data": {
    "1750609435029": {
      "nameFolder": "Inicio",
      "description": "Página inicial do projeto",
      "keys": {
        "tituloPagina": "ConfDrive SDK - Exemplo",
        "subtituloPagina": "Demonstração do SDK de Configuração",
        "corTema": "#007bff"
      }
    },
    "1750609435030": {
      "nameFolder": "Dashboard",
      "description": "Painel de controle",
      "keys": {
        "tituloDashboard": "Painel de Controle",
        "mostrarMenuLateral": true,
        "corTema": "#28a745"
      }
    }
  }
}
```

### 2. Tipo "folder"

Usado quando você tem apenas uma pasta ou quer valores padrão simples.

```json
{
  "timestamp": 1703980800000,
  "type": "folder",
  "data": {
    "tituloPagina": "Minha Aplicação",
    "subtituloPagina": "Configurações padrão",
    "corTema": "#007bff",
    "configuracoes": {
      "habilitarDebug": false,
      "timeout": 5000
    }
  }
}
```

## Como o SDK Processa os Dados

### Para `getProjectKeys()`

- **Tipo "project"**: O SDK converte automaticamente para o formato `nameFolder.key` que o usuário espera
  - `Inicio.tituloPagina` → valor da chave `tituloPagina` da pasta "Inicio"
  - `Dashboard.mostrarMenuLateral` → valor da chave `mostrarMenuLateral` da pasta "Dashboard"

- **Tipo "folder"**: Retorna os dados diretamente

### Para `getFolderKeys(folderId)`

- **Tipo "project"**: O SDK busca especificamente a pasta com o `folderId` fornecido
  - Se o `folderId` for "1750609435029", retorna apenas as chaves da pasta "Inicio"
  
- **Tipo "folder"**: Retorna os dados diretamente

## Vantagens do Novo Formato

1. **Melhor organização**: Dados organizados por pasta com metadados
2. **Flexibilidade**: Suporte a múltiplas pastas em um único default value
3. **Compatibilidade**: Ainda funciona com `getFolderKeys()` mesmo com default values do tipo "project"
4. **Fallback inteligente**: Se o usuário só implementa `getFolderKeys()` mas tem um default value do tipo "project", o SDK consegue extrair as chaves corretas

## Compatibilidade com Formato Antigo

O SDK ainda suporta o formato antigo. Quando você usar `confDrive.setup()` com o formato antigo:

```javascript
confDrive.setup({
  apiUrl: 'https://api.exemplo.com',
  apiSecret: 'secret',
  defaultValues: {
    tituloPagina: 'Título Padrão',
    corTema: '#007bff'
  }
});
```

O SDK automaticamente converte para:

```javascript
{
  timestamp: Date.now(),
  type: 'folder',
  data: {
    tituloPagina: 'Título Padrão',
    corTema: '#007bff'
  }
}
```

## Migração

Para migrar para o novo formato, você pode:

1. **Manter o formato antigo**: Funciona normalmente, será convertido automaticamente
2. **Migrar para o novo formato**: Usar um dos novos tipos conforme sua necessidade

### Exemplo de Migração

**Antes (formato antigo):**
```json
{
  "tituloPagina": "Minha App",
  "corTema": "#007bff"
}
```

**Depois (novo formato - tipo folder):**
```json
{
  "timestamp": 1703980800000,
  "type": "folder",
  "data": {
    "tituloPagina": "Minha App",
    "corTema": "#007bff"
  }
}
```

**Depois (novo formato - tipo project):**
```json
{
  "timestamp": 1703980800000,
  "type": "project",
  "data": {
    "1750609435029": {
      "nameFolder": "Inicio",
      "description": "Página inicial",
      "keys": {
        "tituloPagina": "Minha App",
        "corTema": "#007bff"
      }
    }
  }
}
``` 