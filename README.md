# ConfDrive

[![CI and release](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml/badge.svg)](https://github.com/rubensflinco/conf-drive/actions/workflows/sdk-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ConfDrive is an open-source configuration management project for Node.js applications. It provides an API and a TypeScript SDK for organizing application settings by project and environment, with local caching and cache invalidation support.

The monorepo contains:

- **`@conf-drive/sdk`** — TypeScript client for the ConfDrive API. The SDK is the only package currently configured for public npm releases.
- **`@conf-drive/server`** — Express API and Angular management interface. Deployment depends on choosing and configuring a hosting platform.
- **`@conf-drive/docs`** — a Docusaurus workspace placeholder. The [GitHub Wiki](https://github.com/rubensflinco/conf-drive/wiki) is published; [`wiki/`](wiki/) contains source copies of its guides.

## Install the SDK after its first release

The package is not published to npm yet. After the first successful release, install it with:

```sh
npm install @conf-drive/sdk
```

```ts
import { confDrive } from '@conf-drive/sdk';

confDrive.setup({
  apiUrl: 'https://your-confdrive-api.example.com/api',
  apiSecret: process.env.CONFDRIVE_API_SECRET!,
  defaultValues: { theme: 'light' }
});

const settings = await confDrive.get('your-project-id');
```

Keep API secrets on trusted server-side code. Do not embed privileged credentials in a browser bundle or commit credentials to source control. See the [SDK guide](wiki/SDK-Quickstart.md) for configuration, caching, events, and examples.

## Development

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

The server is split into an Express backend and an Angular frontend. Their current package scripts can be run from their respective directories:

```sh
cd packages/server/back-end
npm install
npm start
```

```sh
cd packages/server/front-end
npm install
npm start
```

The backend uses local JSON files by default. Choose and configure a production hosting and persistence platform before deploying it; the repository does not assume a cloud provider.

## Releases

SDK releases are created automatically when changes are merged into `main`. Use [Conventional Commits](https://www.conventionalcommits.org/) so the release workflow can select the semantic version bump:

- `fix(sdk): ...` — patch release
- `feat(sdk): ...` — minor release
- `feat(sdk)!: ...` or a `BREAKING CHANGE:` footer — major release

Use the `sdk` scope for SDK changes; `server` and `docs` scopes do not publish the SDK. Documentation, build, and other non-release commits do not publish a new package version. When using squash merges, make the pull request title a Conventional Commit. See the [contribution and release guide](wiki/Development-and-Releases.md).

## Documentation

- [GitHub Wiki](https://github.com/rubensflinco/conf-drive/wiki) — published guides; [`wiki/`](wiki/) contains their source copies
- [SDK package README](packages/sdk/README.md)
- [Wiki source pages](wiki/)
- [AI-readable project summary](llms.txt)

## Search terms

ConfDrive, configuration management, environment configuration, Node.js configuration API, TypeScript configuration SDK, remote application settings, cached configuration, npm SDK.

## License

ConfDrive is distributed under the MIT license. See [LICENSE](LICENSE).