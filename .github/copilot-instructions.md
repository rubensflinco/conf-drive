# ConfDrive repository instructions

- Treat this repository as a monorepo. The public `@conf-drive/sdk` package, Express backend, and Angular frontend are separate deployable areas; do not make the server or root workspace publishable as a side effect of SDK changes.
- Preserve the existing architecture and package boundaries. Read the relevant code and package scripts before changing behavior; avoid introducing a new framework or persistence layer without a concrete requirement.
- The backend is organized around Express routes, middleware, and JSON database initialization in `packages/server/back-end`. The Angular application and API services live in `packages/server/front-end`.
- The SDK's public API is exported from `packages/sdk/src/index.ts`; its client, cache, and cache-validation implementation are separate modules. Keep public types in `interfaces.ts` and update package documentation when public behavior changes.
- Never put API secrets in browser bundles, committed examples, logs, or documentation. Use placeholders and environment variables for secrets.
- Add or update focused tests for behavior changes. For SDK work, validate with `npm test --workspace=@conf-drive/sdk`; the package's pre-test hook also builds the SDK.
- Use Conventional Commit messages with the `sdk` scope for SDK release intent (for example `feat(sdk): ...`). Server and documentation scopes must not trigger an npm SDK release.
- Do not deploy the backend or select a hosting provider implicitly. Production hosting and persistent storage require an explicit platform decision.
