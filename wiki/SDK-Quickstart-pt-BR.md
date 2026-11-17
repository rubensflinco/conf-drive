# Início rápido do SDK

[English](https://github.com/rubensflinco/conf-drive/wiki/SDK-Quickstart) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/SDK-Quickstart-pt-BR)

Este guia é para quem desenvolve aplicações e já tem uma API do ConfDrive disponível. O ConfDrive não hospeda uma API, e o pacote `@conf-drive/sdk` **ainda não foi publicado no npm**. Consulte a [página do pacote no npm](https://www.npmjs.com/package/@conf-drive/sdk); o comando de instalação abaixo funcionará após o primeiro release bem-sucedido.

## Requisitos

- Node.js 18 ou superior para a aplicação que usará o SDK.
- Uma API do ConfDrive em execução, com projeto ou pasta, chaves de configuração e um segredo de API criado pela interface de gerenciamento.
- Mantenha o segredo da API no servidor. Não inclua um segredo privilegiado no bundle de uma aplicação de navegador.

## Instalação após a publicação

```sh
npm install @conf-drive/sdk
```

Defina a URL base da API (incluindo `/api`) e o segredo como variáveis de ambiente no processo confiável do servidor. Em seguida, configure o SDK:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: process.env.CONFDRIVE_API_URL!,
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: {
    featureEnabled: false
  },
  cacheTTL: 5 * 60 * 1000,
  validationInterval: 30 * 1000
});

const projectSettings = await confDrive.get('id-do-projeto');
const folderSettings = await confDrive.getFolder('id-da-pasta');
const featureEnabled = await confDrive.getKey('id-do-projeto', 'featureEnabled');
```

`defaultValues` é obrigatório. O TTL do cache do singleton é de cinco minutos por padrão, e a validação do cache ocorre a cada 30 segundos. `confDrive.get()` pode retornar valores em cache ou padrões imediatamente e atualizá-los em segundo plano. Escute `cache:update` se sua aplicação precisar reagir às configurações atualizadas:

```ts
const client = confDrive.client();
client.on('cache:update', event => {
  console.log('Configurações atualizadas', event.data);
});
```

Use `ConfDriveClient` para instâncias independentes ou configurações explícitas de cache. Consulte o [README do SDK](https://github.com/rubensflinco/conf-drive/blob/main/packages/sdk/README.pt-BR.md) para ver um exemplo completo.

## Executar sua própria API

O backend e a interface de gerenciamento Angular estão em `packages/server`. Atualmente, o servidor usa arquivos JSON locais para persistência. Escolha e configure sua própria hospedagem e armazenamento persistente antes de usar em produção; este repositório não configura um provedor de hospedagem nem uma URL de API de produção.

## Mais ajuda

- [Página inicial do projeto](Home-pt-BR)
- [Arquitetura](Architecture-pt-BR)
- [Relatar um problema](https://github.com/rubensflinco/conf-drive/issues)
