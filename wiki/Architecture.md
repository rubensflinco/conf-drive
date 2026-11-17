# Architecture

[English](https://github.com/rubensflinco/conf-drive/wiki/Architecture) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/Architecture-pt-BR)

ConfDrive is a monorepo with three separate areas. For application users, the main flow is: manage a project's settings in the Angular interface, read them from the Express API, and use the SDK to fetch and cache them in a Node.js/TypeScript application.

| Area | Location | Responsibility |
| --- | --- | --- |
| SDK | `packages/sdk` | TypeScript API client, local cache, remote cache validation |
| API | `packages/server/back-end` | Express routes and middleware; JSON-file persistence |
| Management UI | `packages/server/front-end` | Angular application for managing projects and settings |

## What this means for users

- The SDK requires an API URL, an API secret, and default values. Its project and folder reads use the `/api/projects/:projectId/keys` and `/api/folders/:folderId/keys` API routes.
- The SDK sends the secret in the `X-API-Secret` header. Keep privileged secrets on trusted server-side code.
- The API is not hosted by this repository. The backend currently persists data in local JSON files, so production hosting and persistent storage need to be chosen and configured deliberately.
- Only `@conf-drive/sdk` is configured for public npm releases, and it has not yet been published.

## SDK boundaries

- `src/index.ts` defines and re-exports the public SDK API.
- `src/interfaces.ts` contains public configuration, response, event, and cache types.
- `src/client.ts` owns API requests and client behavior.
- `src/cache.ts` owns local cache operations.
- `src/cache-validator.ts` checks remote cache validity and coordinates refreshes.

## Backend boundaries

Express routes are mounted in `app.js`. Database handles are initialized in `databases/init.js` and attached to each request as `req.dbs`. Feature behavior belongs in the existing routers under `routes`, with cross-cutting request behavior in `middleware`.

The backend uses JSON files for data. Do not assume this persistence model is suitable for multiple server instances or ephemeral hosting.

## Security

API secrets and user credentials are sensitive. Never commit real values or include privileged credentials in a browser bundle. Use fake values in samples and environment variables for server-side configuration.

## Related guides

- [Project home](Home)
- [SDK quickstart](SDK-Quickstart)
- [Development and releases](Development-and-Releases)
