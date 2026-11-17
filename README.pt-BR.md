# ConfDrive

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

[![CI e release](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml/badge.svg)](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ConfDrive é um projeto de código aberto para gerenciar as configurações de aplicações em um só lugar. Um projeto pode agrupar configurações em pastas (por exemplo, ambientes), e sua aplicação pode consultar esses valores por meio de uma API e de um SDK TypeScript com cache local e atualização de cache.

**Já dá para usar?** O código do SDK e do servidor está disponível aqui, mas o pacote `@conf-drive/sdk` **ainda não foi publicado no npm** e este repositório não oferece uma API hospedada. Para conectar uma aplicação, você precisa executar ou hospedar o servidor do ConfDrive.

## Para quem é

Use o ConfDrive se você quer gerenciar as configurações dos seus projetos e consultá-las em uma aplicação Node.js/TypeScript, em vez de manter cada configuração no código da aplicação. O repositório inclui uma API Express, uma interface de gerenciamento Angular e o SDK. Atualmente, o projeto não oferece um serviço hospedado.

## Disponibilidade do SDK

- Pacote no npm: [`@conf-drive/sdk`](https://www.npmjs.com/package/@conf-drive/sdk) — **ainda não publicado**. `npm install @conf-drive/sdk` não funcionará até o primeiro release.
- O SDK requer Node.js 18 ou superior para uso em uma aplicação.
- Somente `@conf-drive/sdk` está configurado para releases públicos no npm; o servidor e o monorepo raiz não são pacotes npm.

## Como começar

1. Prepare uma API do ConfDrive e a interface de gerenciamento. Você pode executar o backend e o frontend deste repositório ou hospedá-los na infraestrutura que escolher.
2. No serviço em execução, crie um projeto, uma pasta, chaves de configuração e um segredo de API. Este repositório não fornece uma URL de API de produção compartilhada.
3. Depois que o SDK for publicado, instale-o com `npm install @conf-drive/sdk`. Até lá, você pode compilar e testar o SDK a partir deste checkout; veja [Desenvolvimento e releases](wiki/Development-and-Releases-pt-BR.md).
4. Configure o SDK em código confiável executado no servidor:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: process.env.CONFDRIVE_API_URL!, // URL base da API, incluindo /api
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: { featureEnabled: false }
});

const settings = await confDrive.get('id-do-seu-projeto');
```

`confDrive.get()` pode retornar valores em cache ou padrões imediatamente, enquanto atualiza os dados da API em segundo plano. Escute o evento `cache:update` se sua aplicação precisar reagir às configurações atualizadas. Consulte o [guia de início rápido do SDK](wiki/SDK-Quickstart-pt-BR.md) para ver opções de cache e outros métodos.

## Mantenha as credenciais privadas

O SDK envia `apiSecret` no cabeçalho `X-API-Secret` da requisição. Não inclua um segredo privilegiado em um bundle público de navegador nem o envie para o controle de versão. Use o SDK em código confiável no servidor. Uma credencial no cliente só é adequada se tiver escopo intencionalmente limitado e puder ser exposta com segurança.

## Executar este repositório

Para desenvolver o repositório, use Node.js 22 ou superior e npm:

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

O backend e o frontend Angular são aplicações separadas em `packages/server`. Atualmente, o backend persiste os dados em arquivos JSON locais. Antes de implantá-lo, escolha e configure uma hospedagem e um armazenamento persistente adequados; o projeto não configura um provedor nem uma implantação de produção.

## Links do projeto

- [Pacote do SDK no npm](https://www.npmjs.com/package/@conf-drive/sdk) (ainda não publicado)
- [Guia do SDK](packages/sdk/README.pt-BR.md)
- [Wiki do GitHub](https://github.com/rubensflinco/conf-drive/wiki) e [arquivos-fonte da Wiki](wiki/)
- [Problemas e suporte](https://github.com/rubensflinco/conf-drive/issues)
- [Contribuições e releases](wiki/Development-and-Releases-pt-BR.md)

## Licença

ConfDrive é distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
