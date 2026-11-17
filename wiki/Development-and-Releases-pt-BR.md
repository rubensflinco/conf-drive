# Desenvolvimento e releases

[English](https://github.com/rubensflinco/conf-drive/wiki/Development-and-Releases) | [Português (Brasil)](https://github.com/rubensflinco/conf-drive/wiki/Development-and-Releases-pt-BR)

Este guia é para quem contribui com o repositório ConfDrive. Se você quer apenas usar o SDK, consulte o [início rápido do SDK](SDK-Quickstart-pt-BR).

## Requisitos e verificações locais

- Node.js 22 ou superior
- npm

Na raiz do repositório:

```sh
npm install
npm test --workspace=@conf-drive/sdk
```

O comando de testes compila o SDK antes de executar os testes. O backend e o frontend Angular são aplicações separadas em `packages/server`; ao trabalhar nelas, use os scripts dos respectivos diretórios.

## Pull requests e mensagens de commit

A branch `main` é protegida. Envie contribuições por pull request para revisão; não faça push diretamente para `main`. Para alterações no SDK, use [Conventional Commits](https://www.conventionalcommits.org/) nas mensagens de commit e, em merges squash, no título do pull request:

| Formato do commit | Impacto no release |
| --- | --- |
| `fix(sdk): correct cache lookup` | Patch |
| `perf(sdk): reduce request overhead` | Patch |
| `feat(sdk): add a configuration method` | Minor |
| `feat(sdk)!: replace the setup signature` | Major |

Use o escopo `sdk` para indicar intenção de release do SDK. Escopos `server` e `docs` não publicam o SDK. Commits somente de documentação e outros tipos que não geram release não publicam uma versão. Um commit válido precisa ser integrado à `main` antes que o release possa ser executado.

## Status da publicação no npm

[`@conf-drive/sdk`](https://www.npmjs.com/package/@conf-drive/sdk) **ainda não foi publicado**. O workflow `sdk-release.yml` está configurado para executar semantic-release na `main`, compilar e publicar somente o SDK como pacote público no npm e criar uma release do GitHub com a tag `sdk-v<version>`. Ele não publica o monorepo raiz nem o servidor.

Antes do primeiro release, uma pessoa mantenedora do repositório precisa:

1. Confirmar que o nome `@conf-drive/sdk` está disponível para o projeto e configurar o Trusted Publishing do npm para `rubensflinco/conf-drive` usando o workflow `sdk-release.yml`.
2. Confirmar que o token do GitHub Actions pode criar releases no repositório.
3. Verificar que outra pessoa não reservou o nome do pacote no npm.

O workflow usa Trusted Publishing via OIDC do npm e não requer `NPM_TOKEN`. Nunca envie credenciais de publicação para o controle de versão.

## Implantação do servidor

Nenhum provedor de hospedagem está configurado. Atualmente, o backend persiste os dados em arquivos JSON locais; hospedagem de produção e armazenamento persistente precisam ser escolhidos e configurados antes da implantação.

## Guias relacionados

- [Página inicial do projeto](Home-pt-BR)
- [Início rápido do SDK](SDK-Quickstart-pt-BR)
- [Problemas no GitHub](https://github.com/rubensflinco/conf-drive/issues)
