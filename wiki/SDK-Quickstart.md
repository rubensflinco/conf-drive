# SDK quickstart

[English](https://github.com/rubensflinco/conf-drive/wiki/SDK-Quickstart) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/SDK-Quickstart-pt-BR)

This guide is for application developers who already have a ConfDrive API available. ConfDrive does not host an API, and `@conf-drive/sdk` has **not yet been published to npm**. Check the [npm package page](https://www.npmjs.com/package/@conf-drive/sdk); the install command below will work after the first successful release.

## Requirements

- Node.js 18 or newer for the application using the SDK.
- A running ConfDrive API, with a project or folder, configuration keys, and an API secret created through the management interface.
- Keep the API secret on the server. Do not bundle a privileged secret into a browser application.

## Install after publication

```sh
npm install @conf-drive/sdk
```

Set the API base URL (including `/api`) and API secret as environment variables in the trusted server process. Then configure the SDK:

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

const projectSettings = await confDrive.get('project-id');
const folderSettings = await confDrive.getFolder('folder-id');
const featureEnabled = await confDrive.getKey('project-id', 'featureEnabled');
```

`defaultValues` is required. The singleton cache defaults to a five-minute TTL and cache validation defaults to 30 seconds. `confDrive.get()` may return cached or default values immediately and refresh them in the background. Listen for `cache:update` if your application needs to react to refreshed settings:

```ts
const client = confDrive.client();
client.on('cache:update', event => {
  console.log('Settings updated', event.data);
});
```

Use `ConfDriveClient` for independent client instances or explicit cache settings. See the [SDK README](https://github.com/rubensflinco/conf-drive/blob/main/packages/sdk/README.md) for a complete example.

## Run the API yourself

The backend and Angular management interface are in `packages/server`. The server currently uses local JSON files for persistence. Select and configure your own hosting and persistent storage before production use; this repository does not configure a hosting provider or production API URL.

## More help

- [Project home](Home)
- [Architecture](Architecture)
- [Report an issue](https://github.com/rubensflinco/conf-drive/issues)
