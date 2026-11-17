# ConfDrive SDK

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

`@conf-drive/sdk` is a TypeScript client for reading project and folder settings from a ConfDrive API. It provides local caching, cache validation, and events for API and cache activity.

> **npm status:** The package has not been published yet. The [npm package page](https://www.npmjs.com/package/@conf-drive/sdk) is reserved as the canonical link; `npm install @conf-drive/sdk` will work after the first successful release.

## What you need

- Node.js 18 or newer in the application using the SDK.
- A running ConfDrive API, a project or folder with settings, and an API secret created through that service. This repository does not host a production API.
- The SDK package, once it is published. Until then, you can build and test it from this repository.

## Install after publication

```sh
npm install @conf-drive/sdk
```

## Configure and read settings

Configure the singleton once at application startup. Keep the secret in a server-side environment variable:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: process.env.CONFDRIVE_API_URL!, // API base URL, including /api
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: {
    featureEnabled: false
  },
  cacheTTL: 5 * 60 * 1000,
  validationInterval: 30 * 1000
});

const projectSettings = await confDrive.get('project-id');
const folderSettings = await confDrive.getFolder('folder-id');
const featureEnabled = await confDrive.getKey('project-id', 'featureEnabled');
```

`defaultValues` is required. The singleton cache TTL defaults to five minutes and its validation interval defaults to 30 seconds. `confDrive.get()` can return cached or default values immediately and refresh from the API in the background. Listen for `cache:update` to react when refreshed data arrives. `getFolder()` fetches folder settings through the client.

## Listen for updates

```ts
const client = confDrive.client();
const onUpdate = (event: { data: Record<string, unknown> }) => {
  console.log('Settings updated', event.data);
};

client.on('cache:update', onUpdate);
// Remove the listener when it is no longer needed:
client.off('cache:update', onUpdate);
```

For separate client instances or more explicit cache options, use `ConfDriveClient`:

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

const settings = await client.getProjectKeys('project-id');
```

## Credential safety

The SDK sends `apiSecret` as the `X-API-Secret` request header. Do not expose a privileged secret in a public browser bundle or commit credentials. Use the SDK in trusted server-side code. Only use a client-side credential if it is intentionally scoped and safe to expose.

## Links

- [Português (Brasil): guia do SDK](README.pt-BR.md)
- [Project README](../../README.md) and [Portuguese README](../../README.pt-BR.md)
- [SDK quickstart](../../wiki/SDK-Quickstart.md)
- [Report an issue](https://github.com/rubensflinco/conf-drive/issues)
