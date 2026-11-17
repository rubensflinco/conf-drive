# SDK do ConfDrive

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

`@conf-drive/sdk` é um cliente TypeScript para consultar as configurações de projetos e pastas em uma API do ConfDrive. Ele oferece cache local, validação do cache e eventos para acompanhar a atividade da API e do cache.

> **Status no npm:** O pacote ainda não foi publicado. A [página do pacote no npm](https://www.npmjs.com/package/@conf-drive/sdk) será o link oficial; `npm install @conf-drive/sdk` funcionará após o primeiro release bem-sucedido.

## O que você precisa

- Node.js 18 ou superior na aplicação que usará o SDK.
- Uma API do ConfDrive em execução, um projeto ou pasta com configurações e um segredo de API criado nesse serviço. Este repositório não hospeda uma API de produção.
- O pacote do SDK, depois que ele for publicado. Até lá, você pode compilar e testar o código neste repositório.

## Instalação após a publicação

```sh
npm install @conf-drive/sdk
```

## Configurar e consultar configurações

Configure o singleton uma vez, na inicialização da aplicação. Mantenha o segredo em uma variável de ambiente do servidor:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: process.env.CONFDRIVE_API_URL!, // URL base da API, incluindo /api
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

`defaultValues` é obrigatório. O TTL do cache do singleton é de cinco minutos por padrão, e o intervalo de validação é de 30 segundos. `confDrive.get()` pode retornar valores em cache ou padrões imediatamente e atualizar os dados da API em segundo plano. Escute `cache:update` para reagir quando os dados atualizados chegarem. `getFolder()` consulta as configurações da pasta pelo cliente.

## Acompanhar atualizações

```ts
const client = confDrive.client();
const onUpdate = (event: { data: Record<string, unknown> }) => {
  console.log('Configurações atualizadas', event.data);
};

client.on('cache:update', onUpdate);
// Remova o listener quando ele não for mais necessário:
client.off('cache:update', onUpdate);
```

Para criar instâncias independentes ou configurar o cache explicitamente, use `ConfDriveClient`:

```ts
import { ConfDriveClient } from '@conf-drive/sdk';

const client = new ConfDriveClient({
  apiUrl: process.env.CONFDRIVE_API_URL!,
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: {
    timestamp: Date.now(),
    type: 'folder',
    data: { featureEnabled: false }
  },
  cache: { enabled: true, ttl: 5 * 60 * 1000 },
  cacheValidation: {
    enabled: true,
    interval: 30 * 1000,
    autoRefresh: true
  }
});

const settings = await client.getProjectKeys('id-do-projeto');
```

## Segurança das credenciais

O SDK envia `apiSecret` no cabeçalho `X-API-Secret` da requisição. Não exponha um segredo privilegiado em um bundle público de navegador nem envie credenciais para o controle de versão. Use o SDK em código confiável no servidor. Só use uma credencial no cliente se ela tiver escopo intencionalmente limitado e puder ser exposta com segurança.

## Links

- [English: SDK guide](README.md)
- [README do projeto](../../README.pt-BR.md) e [README em inglês](../../README.md)
- [Guia de início rápido do SDK](../../wiki/SDK-Quickstart-pt-BR.md)
- [Relatar um problema](https://github.com/rubensflinco/conf-drive/issues)
