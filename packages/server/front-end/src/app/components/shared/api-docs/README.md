# Documentação das APIs

Este diretório contém os componentes Angular responsáveis por exibir a documentação das APIs do ConfDrive.

## Componentes Criados

### 1. ProjectApiDocsComponent
- **Arquivo**: `project-api-docs.component.ts`
- **Rota**: `/projects/:projectId/api-docs`
- **Funcionalidade**: Documenta a API `GET /api/projects/{projectId}/keys`
- **Características**:
  - Retorna todas as chaves de todas as pastas do projeto
  - Organização por nome da pasta
  - Exemplos de implementação em cURL, JavaScript, Angular e React

### 2. FolderApiDocsComponent
- **Arquivo**: `folder-api-docs.component.ts`
- **Rota**: `/projects/:projectId/folders/:folderId/api-docs`
- **Funcionalidade**: Documenta a API `GET /api/folders/{folderId}/keys`
- **Características**:
  - Retorna apenas as chaves de uma pasta específica
  - Formato chave-valor direto
  - Exemplos de implementação em cURL, JavaScript, Angular e React

## Funcionalidades Incluídas

### 🔒 Segredos de API
- Explicação sobre o header `X-API-Secret` obrigatório
- Link direto para criar novos segredos
- Alertas sobre segurança e boas práticas

### 💻 Exemplos de Código
Cada página de documentação inclui exemplos práticos em:
- **cURL**: Para testes rápidos via linha de comando
- **JavaScript Vanilla**: Para integração em aplicações web simples
- **Angular**: Para projetos Angular com HttpClient
- **React**: Para projetos React com hooks personalizados

### 📋 Documentação Completa
- Headers obrigatórios
- Códigos de status HTTP
- Exemplos de resposta
- Notas importantes sobre uso e segurança
- Comparação entre as duas APIs

### 🎨 Interface Responsiva
- Design moderno com Bootstrap
- Tabs para organizar exemplos de código
- Botões de cópia para códigos
- Navegação breadcrumb
- Interface adaptável para mobile

## Integração

### Botões Adicionados
1. **Página de Pastas** (`project-detail.component.html`):
   - Botão "API do Projeto" no cabeçalho
   - Botão "API" em cada card de pasta

2. **Página de Detalhes da Pasta** (`folder-detail.component.html`):
   - Botão "Documentação da API" no cabeçalho

### Rotas Configuradas
No arquivo `app.routes.ts`:
```typescript
{
  path: 'projects/:projectId/api-docs',
  component: ProjectApiDocsComponent,
  canActivate: [authGuard]
},
{
  path: 'projects/:projectId/folders/:folderId/api-docs',
  component: FolderApiDocsComponent,
  canActivate: [authGuard]
}
```

## Estrutura de Arquivos

```
api-docs/
├── folder-api-docs.component.ts       # Componente TypeScript para pasta
├── folder-api-docs.component.html     # Template HTML para pasta
├── folder-api-docs.component.scss     # Estilos CSS para pasta
├── project-api-docs.component.ts      # Componente TypeScript para projeto
├── project-api-docs.component.html    # Template HTML para projeto
├── project-api-docs.component.scss    # Estilos CSS para projeto
└── README.md                          # Esta documentação
```

## Uso

1. **Acesso via Projeto**: Clique em "API do Projeto" na página de pastas
2. **Acesso via Pasta**: Clique no ícone de código no card da pasta ou no botão "Documentação da API" na página de detalhes
3. **Navegação**: Use os breadcrumbs para navegar entre as páginas
4. **Códigos**: Clique nos botões de cópia para copiar exemplos de código
5. **Segredos**: Use o botão "Criar Novo Segredo" para configurar autenticação

## Próximos Passos

Para melhorar ainda mais a documentação, considere:
- Adicionar playground interativo para testar as APIs
- Incluir SDKs em outras linguagens (Python, PHP, etc.)
- Adicionar métricas de uso das APIs
- Implementar versionamento da documentação 