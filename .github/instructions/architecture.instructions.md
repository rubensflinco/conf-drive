---
applyTo: "packages/sdk/src/**/*.ts,packages/server/**/*.js,packages/server/front-end/src/**/*.ts"
---

# Architecture and change rules

- Keep the SDK's public entry points and exported types in `packages/sdk/src/index.ts` and `packages/sdk/src/interfaces.ts`. Keep API requests in `ConfDriveClient`, cache storage in `CacheManager`, and remote validity checks in `CacheValidator`; reuse these boundaries instead of duplicating behavior.
- Keep server request handling in its existing Express routers and middleware. Access JSON database instances through the request database context and preserve the existing route conventions.
- Keep Angular HTTP calls in services and UI behavior in components. Reuse the current auth interceptor and guards rather than bypassing them.
- Do not move secrets into frontend configuration. Treat API secrets, passwords, and tokens as sensitive even in examples and tests.
- Keep changes scoped to the owning workspace. Public SDK releases package only `packages/sdk`; server or documentation changes must not cause a server deployment or npm publish.
- Update focused tests and package documentation when changing externally observable behavior.
