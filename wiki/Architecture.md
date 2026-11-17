# Architecture

ConfDrive is maintained as a monorepo with distinct package boundaries:

| Area | Location | Responsibility |
| --- | --- | --- |
| SDK | `packages/sdk` | TypeScript client, API types, local cache, and remote cache validation |
| API | `packages/server/back-end` | Express routes and middleware, with JSON-file persistence initialized under `databases` |
| Management UI | `packages/server/front-end` | Angular application; HTTP calls are kept in services and access control in guards/interceptors |

## SDK internals

- `src/index.ts` defines and re-exports the public SDK API.
- `src/interfaces.ts` contains the public configuration, response, event, and cache types.
- `src/client.ts` owns API requests and client behavior.
- `src/cache.ts` owns local cache operations.
- `src/cache-validator.ts` checks remote cache validity and coordinates refreshes.

Keep these responsibilities separate. New SDK APIs should be exported from `src/index.ts`; internal modules should not be imported by other workspaces.

## Backend request flow

Express routes are mounted in `app.js`. Database handles are initialized in `databases/init.js` and attached to each request as `req.dbs`. Feature behavior belongs in the existing routers under `routes`, with cross-cutting request behavior in `middleware`.

The backend currently uses JSON files for data. Do not assume that this persistence model is suitable for multiple server instances or ephemeral hosting. A production deployment needs an explicit hosting and persistence decision.

## Security boundaries

API secrets and user credentials are sensitive. Never commit real values or include privileged credentials in a browser bundle. Use fake values in samples and environment variables for server-side configuration.
