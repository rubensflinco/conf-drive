# ConfDrive SDK - Exemplo Angular

Este é um projeto de exemplo que demonstra como implementar o **ConfDrive SDK** em uma aplicação Angular.

## 🚀 Funcionalidades Demonstradas

- ✅ **Carregamento de Configurações** - Título, subtítulo e conteúdo HTML vindos do ConfDrive
- ✅ **Cache Inteligente** - Sistema de cache com TTL configurável
- ✅ **Múltiplos Ambientes** - Desenvolvimento, Teste e Produção
- ✅ **Valores Padrão** - Fallback automático em caso de falha
- ✅ **Monitoramento em Tempo Real** - Log de eventos do SDK
- ✅ **Interface Responsiva** - Design moderno com Bootstrap
- ✅ **Temas Dinâmicos** - Cores que mudam conforme configuração

## 📦 Tecnologias Utilizadas

- **Angular 18** - Framework principal
- **ConfDrive SDK** - Cliente para API de configuração
- **Bootstrap 5** - Framework CSS
- **Bootstrap Icons** - Ícones
- **TypeScript** - Linguagem de programação
- **RxJS** - Programação reativa

## 🛠️ Como Executar

### Pré-requisitos

- Node.js 18+
- NPM ou Yarn
- Angular CLI (opcional)

### Instalação

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm start

# Ou usando Angular CLI
ng serve
```

A aplicação estará disponível em `http://localhost:4200`

## ⚙️ Configuração

### 1. Configuração da API

Edite o arquivo `src/app/services/config.service.ts` para configurar a conexão com sua API do ConfDrive:

```typescript
const config: ConfDriveConfig = {
  apiUrl: 'http://localhost:3000/api', // Sua URL da API
  apiSecret: 'sua-api-secret',         // Seu segredo de API
  defaultValues: defaultValues,        // Valores padrão
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutos
    dbName: 'exemplo-app-cache'
  }
};
```

### 2. Valores Padrão

Os valores padrão estão em `src/assets/default-values.json`. Eles são usados como fallback quando a API não está disponível:

```json
{
  "Desenvolvimento": {
    "TITULO_PAGINA": "ConfDrive SDK - Exemplo",
    "SUBTITULO_PAGINA": "Demonstração do SDK de Configuração",
    "CONTEUDO_HTML": "<p>Conteúdo em HTML...</p>",
    "COR_TEMA": "#007bff",
    "MOSTRAR_FOOTER": true,
    "TEXTO_FOOTER": "Exemplo criado com ConfDrive SDK © 2024"
  }
}
```

## 🎯 Como Funciona

### 1. Inicialização

Quando a aplicação inicia, o `ConfigService`:
- Cria uma instância do `ConfDriveClient`
- Configura listeners para eventos
- Carrega as configurações do ambiente padrão

### 2. Carregamento de Configurações

O serviço busca as configurações através do SDK:
```typescript
const projectKeys = await this.client.getProjectKeys(projectId, { 
  forceRefresh,
  timeout: 10000 
});
```

### 3. Fallback Automático

Em caso de erro, usa os valores padrão:
```typescript
const fallbackConfig: PageConfig = {
  tituloPagina: defaultValues.Desenvolvimento.TITULO_PAGINA,
  // ... outros valores
};
```

### 4. Cache Inteligente

O SDK gerencia automaticamente:
- **Cache Local** com IndexedDB
- **TTL (Time To Live)** configurável
- **Invalidação Manual** e automática
- **Estatísticas** de uso

## 🧩 Estrutura do Projeto

```
src/
├── app/
│   ├── services/
│   │   └── config.service.ts          # Serviço principal
│   ├── app.component.ts               # Componente principal
│   ├── app.component.html             # Template da página
│   └── app.component.scss             # Estilos do componente
├── assets/
│   └── default-values.json            # Valores padrão
└── styles.scss                        # Estilos globais
```

## 🔧 Personalização

### Adicionando Novas Configurações

1. Adicione a nova chave em `default-values.json`
2. Atualize a interface `PageConfig` em `config.service.ts`
3. Use a nova configuração no template

### Mudando Ambientes

O projeto suporta múltiplos ambientes:
- **Desenvolvimento** - Para desenvolvimento local
- **Teste** - Para testes automatizados
- **Produção** - Para ambiente de produção

## 📊 Monitoramento

A aplicação inclui:
- **Log de Eventos** em tempo real
- **Estatísticas do Cache** (itens, tamanho, expirados)
- **Status da Conexão** com a API
- **Indicadores Visuais** de loading/erro

## 🚨 Tratamento de Erros

- **Conexão Perdida** - Usa cache local
- **Cache Expirado** - Tenta recarregar da API
- **API Indisponível** - Usa valores padrão
- **Erro de Configuração** - Mostra mensagem de erro

## 📝 Casos de Uso

Este exemplo demonstra:

1. **Carregamento Inicial** - Como carregar configurações na inicialização
2. **Troca de Ambiente** - Como alternar entre diferentes ambientes
3. **Invalidação de Cache** - Como forçar atualização de dados
4. **Monitoramento** - Como acompanhar eventos do SDK
5. **Fallback** - Como garantir que a app funcione offline

## 🤝 Contribuindo

Para contribuir com este exemplo:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Implemente suas mudanças
4. Teste thoroughly
5. Submeta um Pull Request

## 📄 Licença

Este projeto é um exemplo educacional e está disponível sob a licença MIT.

## 🆘 Suporte

Para dúvidas sobre o ConfDrive SDK:
- Consulte a documentação completa
- Abra uma issue no repositório
- Entre em contato com o time de desenvolvimento
