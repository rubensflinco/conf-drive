# SDK quickstart

The SDK has not been published to npm yet. After its first successful release, install it with:

```sh
npm install @conf-drive/sdk
```

Configure the singleton and fetch settings:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: 'https://your-confdrive-api.example.com/api',
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

`defaultValues` is required. `cacheTTL` and `validationInterval` are optional; the SDK defaults them to five minutes and 30 seconds. The SDK also exports `ConfDriveClient` for callers that need separate client instances.

## Events

Subscribe to cache updates and remove the listener when it is no longer needed:

```ts
const onUpdate = (event: { data: Record<string, unknown> }) => {
  console.log('Configuration refreshed', event.data);
};

const client = confDrive.client();
client.on('cache:update', onUpdate);
// Later, when finished:
client.off('cache:update', onUpdate);
```

## Credential safety

The SDK sends `apiSecret` as an API request header. Do not expose a privileged secret in a public browser bundle. Use the SDK in trusted server-side code or use an appropriately scoped credential for a client application.

See the package [README](https://github.com/rubensflinco/conf-drive/blob/main/packages/sdk/README.md) for additional methods and types.
