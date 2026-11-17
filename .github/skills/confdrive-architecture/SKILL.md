---
name: confdrive-architecture
description: Make changes in the ConfDrive monorepo while preserving its SDK, Express backend, and Angular frontend boundaries and release conventions.
---

# ConfDrive architecture skill

Use this skill before implementing a feature or refactor in this repository.

## Workspaces

- `packages/sdk` is the public TypeScript SDK published as `@conf-drive/sdk`.
- `packages/server/back-end` is the Express API. Routers live in `routes`, request middleware lives in `middleware`, and JSON database setup lives in `databases`.
- `packages/server/front-end` is the Angular management interface. HTTP integration belongs in its services; route protection belongs in guards and authentication belongs in the interceptor.
- `packages/docs` is currently only a package placeholder. The maintained guide pages are under `wiki/`.

## Rules

1. Trace the existing owner module and call sites before changing behavior; preserve established public APIs unless the task calls for a breaking change.
2. Keep SDK request, cache, and cache-validation responsibilities in their existing modules. Export new SDK APIs and types through `src/index.ts`.
3. Keep backend behavior in Express routes/middleware and frontend networking in Angular services. Avoid reaching across workspace boundaries with private implementation imports.
4. Never commit credentials or put privileged API secrets in browser bundles. Use obviously fake placeholders in examples.
5. Add focused tests for behavior changes and update the SDK or Wiki documentation when behavior or setup changes.
6. Release intent is expressed through Conventional Commits: `fix`/`perf` for patch, `feat` for minor, and `!` or `BREAKING CHANGE:` for major. A release happens only after the commit is merged into `main`.

## Validation

For SDK changes, run:

```sh
npm test --workspace=@conf-drive/sdk
```

Only run server or Angular validations when changing those workspaces; consult their package scripts first.
