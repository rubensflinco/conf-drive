# Arquitetura

[English](https://github.com/rubensflinco/conf-drive/wiki/Architecture) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/Architecture-pt-BR)

O ConfDrive é um monorepo com três áreas separadas. Para quem usa a aplicação, o fluxo principal é: gerenciar as configurações de um projeto na interface Angular, consultá-las pela API Express e usar o SDK para buscar e armazenar os dados em cache em uma aplicação Node.js/TypeScript.

| Área | Localização | Responsabilidade |
| --- | --- | --- |
| SDK | `packages/sdk` | Cliente TypeScript da API, cache local e validação remota do cache |
| API | `packages/server/back-end` | Rotas e middlewares Express; persistência em arquivos JSON |
| Interface de gerenciamento | `packages/server/front-end` | Aplicação Angular para gerenciar projetos e configurações |

## O que isso significa para quem usa

- O SDK requer uma URL da API, um segredo de API e valores padrão. As consultas de projeto e pasta usam as rotas `/api/projects/:projectId/keys` e `/api/folders/:folderId/keys`.
- O SDK envia o segredo no cabeçalho `X-API-Secret`. Mantenha segredos privilegiados em código confiável no servidor.
- Este repositório não hospeda a API. Atualmente, o backend persiste os dados em arquivos JSON locais; hospedagem de produção e armazenamento persistente precisam ser escolhidos e configurados explicitamente.
- Somente `@conf-drive/sdk` está configurado para releases públicos no npm, e ele ainda não foi publicado.

## Limites do SDK

- `src/index.ts` define e reexporta a API pública do SDK.
- `src/interfaces.ts` contém tipos públicos de configuração, resposta, eventos e cache.
- `src/client.ts` controla as requisições da API e o comportamento do cliente.
- `src/cache.ts` controla operações do cache local.
- `src/cache-validator.ts` verifica a validade remota do cache e coordena as atualizações.

## Limites do backend

As rotas Express são montadas em `app.js`. As conexões com os bancos de dados são inicializadas em `databases/init.js` e vinculadas a cada requisição como `req.dbs`. O comportamento de cada funcionalidade fica nos roteadores de `routes`, enquanto comportamentos transversais ficam em `middleware`.

O backend usa arquivos JSON para armazenar dados. Não presuma que esse modelo de persistência seja adequado para várias instâncias do servidor ou hospedagem efêmera.

## Segurança

Segredos de API e credenciais de usuários são confidenciais. Nunca envie valores reais para o controle de versão nem inclua credenciais privilegiadas em um bundle de navegador. Use valores fictícios em exemplos e variáveis de ambiente na configuração do servidor.

## Guias relacionados

- [Página inicial do projeto](Home-pt-BR)
- [Início rápido do SDK](SDK-Quickstart-pt-BR)
- [Desenvolvimento e releases](Development-and-Releases-pt-BR)
