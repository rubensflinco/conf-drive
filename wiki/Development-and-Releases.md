# Development and releases

## Prerequisites

- Node.js 22 or newer
- npm

Install dependencies from the repository root and build/test the SDK:

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

The backend and Angular frontend are separate packages under `packages/server`; use their package scripts when working in those areas.

## Pull requests

The `main` branch is protected. Contributions should be submitted as pull requests and merged by an authorized maintainer. The CI workflow builds and tests the SDK on pull requests and on pushes to `main`.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and, for squash merges, the pull request title:

| Commit form | Release |
| --- | --- |
| `fix(sdk): correct cache lookup` | Patch |
| `perf(sdk): reduce request overhead` | Patch |
| `feat(sdk): add a configuration method` | Minor |
| `feat(sdk)!: replace the setup signature` | Major |

The `sdk` scope is required for an SDK release; `server` and `docs` scopes do not publish the SDK. Documentation-only and other non-release commit types do not publish a version. A commit must be merged into `main` before it can trigger a release.

## Automated npm publishing

The `sdk-release.yml` workflow runs semantic-release on `main`. It analyzes conventional commits, builds the SDK with the calculated version, publishes only `@conf-drive/sdk` as a public npm package, and creates a GitHub release tagged `sdk-v<version>`. It does not publish the root monorepo or server.

Before the first release, a repository maintainer must:

1. Ensure the npm organization/scope can publish `@conf-drive/sdk` and configure npm Trusted Publishing for `rubensflinco/conf-drive` using the `sdk-release.yml` workflow.
2. Ensure the GitHub Actions workflow token has permission to create repository releases. Keep the main branch protection in place; releases run only after an authorized merge.
3. Verify the npm package has not already been claimed by another owner.

The workflow uses npm OIDC trusted publishing and does not require an `NPM_TOKEN`. If Trusted Publishing is unavailable for the package's ownership/setup, configure a dedicated, least-privilege npm automation token as a repository Actions secret and adjust the release job deliberately; do not commit a token.

## Deployment

No backend provider is assumed. The API currently persists data in local JSON files, so production hosting and persistence must be selected and configured before an automated deployment is added.
