# Development and releases

[English](https://github.com/rubensflinco/conf-drive/wiki/Development-and-Releases) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/Development-and-Releases-pt-BR)

This guide is for people contributing to the ConfDrive repository. If you only want to consume the SDK, see the [SDK quickstart](SDK-Quickstart).

## Requirements and local checks

- Node.js 22 or newer
- npm

From the repository root:

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

The test command builds the SDK before running its tests. The backend and Angular frontend are separate applications under `packages/server`; use the scripts in their own package directories when working on them.

## Pull requests and commit messages

The `main` branch is protected. Submit contributions as pull requests for review; do not push directly to `main`. For SDK changes, use [Conventional Commits](https://www.conventionalcommits.org/) in commit messages and, for squash merges, in the pull request title:

| Commit form | Release impact |
| --- | --- |
| `fix(sdk): correct cache lookup` | Patch |
| `perf(sdk): reduce request overhead` | Patch |
| `feat(sdk): add a configuration method` | Minor |
| `feat(sdk)!: replace the setup signature` | Major |

Use the `sdk` scope for SDK release intent. Server and documentation scopes do not publish the SDK. Documentation-only and other non-release commit types do not publish a version. A qualifying commit must be merged into `main` before a release can run.

## npm publishing status

[`@conf-drive/sdk`](https://www.npmjs.com/package/@conf-drive/sdk) has **not yet been published**. The `sdk-release.yml` workflow is configured to run semantic-release on `main`, build and publish only the SDK as a public npm package, and create a GitHub release tagged `sdk-v<version>`. It does not publish the root monorepo or server.

Before the first release, a repository maintainer must:

1. Confirm the `@conf-drive/sdk` name is available to the project and configure npm Trusted Publishing for `rubensflinco/conf-drive` with the `sdk-release.yml` workflow.
2. Ensure the GitHub Actions token can create repository releases.
3. Verify that nobody else has claimed the npm package name.

The workflow uses npm OIDC trusted publishing and does not require an `NPM_TOKEN`. Do not commit publishing credentials.

## Server deployment

No hosting provider is configured. The backend currently persists data in local JSON files, so production hosting and persistent storage must be selected and configured before deployment.

## Related guides

- [Project home](Home)
- [SDK quickstart](SDK-Quickstart)
- [GitHub issues](https://github.com/rubensflinco/conf-drive/issues)
