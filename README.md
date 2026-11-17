# ConfDrive

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

[![CI and release](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml/badge.svg)](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ConfDrive is an open-source project for managing application configuration in one place. A project can group settings into folders (for example, environments), and your application can read those values through an API and a TypeScript SDK with local caching and cache refresh support.

**Is it ready to use?** The SDK source and server are available here, but `@conf-drive/sdk` has **not yet been published to npm** and this repository does not provide a hosted API. You need to run or deploy the ConfDrive server yourself before an application can connect.

## Who it is for

Use ConfDrive if you want to manage settings for your own projects and read them from a Node.js/TypeScript application, instead of keeping every setting in application code. The repository includes an Express API, an Angular management interface, and the SDK. It does not currently offer a hosted service.

## SDK availability

- npm package: [`@conf-drive/sdk`](https://www.npmjs.com/package/@conf-drive/sdk) — **not published yet**. `npm install @conf-drive/sdk` will not work until the first release.
- The SDK requires Node.js 18 or newer when used in an application.
- Only `@conf-drive/sdk` is configured for public npm releases; the server and root monorepo are not npm packages.

## How to get started

1. Prepare a ConfDrive API and management interface. You can run the backend and frontend from this repository, or deploy them on infrastructure you choose.
2. Create a project, a folder, configuration keys, and an API secret using the running service. There is no shared production API URL in this repository.
3. After the SDK is published, install it with `npm install @conf-drive/sdk`. Until then, the SDK can be built and tested from this checkout; see [Development and releases](wiki/Development-and-Releases.md).
4. Configure the SDK in trusted server-side code:

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: process.env.CONFDRIVE_API_URL!, // API base URL, including /api
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: { featureEnabled: false }
});

const settings = await confDrive.get('your-project-id');
```

`confDrive.get()` can return cached or default values immediately while refreshing from the API in the background. Listen for `cache:update` if your application needs to react to refreshed settings. See the [SDK quickstart](wiki/SDK-Quickstart.md) for cache options and more methods.

## Keep credentials private

The SDK sends `apiSecret` in the `X-API-Secret` request header. Do not put a privileged secret in a public browser bundle or commit it to source control. Use the SDK in trusted server-side code. A client-side credential is appropriate only if it is intentionally scoped and safe to expose.

## Run this repository

For repository development, use Node.js 22 or newer and npm:

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

The backend and Angular frontend are separate applications under `packages/server`. The backend currently persists data in local JSON files. Choose and configure suitable hosting and persistent storage before deploying it; no provider or production deployment is configured by this project.

## Project links

- [SDK package on npm](https://www.npmjs.com/package/@conf-drive/sdk) (not published yet)
- [SDK guide](packages/sdk/README.md)
- [GitHub Wiki](https://github.com/rubensflinco/conf-drive/wiki) and [Wiki source pages](wiki/)
- [Issues and support](https://github.com/rubensflinco/conf-drive/issues)
- [Contributing and releases](wiki/Development-and-Releases.md)

## License

ConfDrive is distributed under the MIT license. See [LICENSE](LICENSE).
