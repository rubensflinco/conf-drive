# ConfDrive SDK

`@conf-drive/sdk` is a TypeScript client for reading project and folder configuration from the ConfDrive API. It includes local caching, cache invalidation, typed events, and a singleton API for straightforward integrations.

## Install after the first npm release

`@conf-drive/sdk` has not been published yet. After its first successful release, install it with:

```sh
npm install @conf-drive/sdk
```

## Configure and read settings

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: 'https://your-confdrive-api.example.com/api',
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: {
    theme: 'light',
    featureEnabled: false
  },
  cacheTTL: 5 * 60 * 1000,
  validationInterval: 30 * 1000
});

const projectSettings = await confDrive.get('project-id');
const folderSettings = await confDrive.getFolder('folder-id');
const theme = await confDrive.getKey('project-id', 'theme');
```

`defaultValues` is required. `cacheTTL` defaults to five minutes and `validationInterval` defaults to 30 seconds. Set `cacheTTL` to `0` to disable the local cache lifetime.

## Cache events

```ts
confDrive.on('cache:update', (event: { data: Record<string, unknown> }) => {
  console.log('Settings updated', event.data);
});

confDrive.on('cache:remote-invalidated', event => {
  console.log('Remote cache invalidation', event.type, event.projectId);
});
```

To unsubscribe, use the underlying client:

```ts
const client = confDrive.client();
const onUpdate = (event: { data: Record<string, unknown> }) => {
  console.log(event.data);
};

client.on('cache:update', onUpdate);
// Later:
client.off('cache:update', onUpdate);
```

## Advanced client

Create an independent client when you need more than one configuration:

```ts
import { ConfDriveClient } from '@conf-drive/sdk';

const client = new ConfDriveClient({
  apiUrl: 'https://your-confdrive-api.example.com/api',
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: {
    timestamp: Date.now(),
    type: 'folder',
    data: { theme: 'light' }
  },
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000
  },
  cacheValidation: {
    enabled: true,
    interval: 30 * 1000,
    autoRefresh: true
  }
});

const settings = await client.getProjectKeys('project-id');
```

## Credential safety

The SDK sends `apiSecret` as an API request header. Do not expose a privileged secret in a public browser bundle or commit credentials. Use the SDK in trusted server-side code, or use a credential intentionally scoped for client-side use.

## Documentation and support

- [Project Wiki](https://github.com/rubensflinco/conf-drive/wiki)
- [Architecture source](https://github.com/rubensflinco/conf-drive/blob/main/wiki/Architecture.md)
- [SDK quickstart source](https://github.com/rubensflinco/conf-drive/blob/main/wiki/SDK-Quickstart.md)
- [Report an issue](https://github.com/rubensflinco/conf-drive/issues)
