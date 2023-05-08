# Contributing

Thanks for your interest in contributing to Ponder! Please take a moment to review this document **before submitting a pull request.**

If you want to contribute, but aren't sure where to start, reach out in Ponder's [public telegram group](https://t.me/ponder_sh) or create a [new discussion](https://github.com/0xOlias/ponder/discussions).

## Get started

This guide is intended to help you get started with contributing. By following these steps, you will understand the development process and workflow.

1. [Clone the repository](#clone-the-repository)
2. [Install Node.js and pnpm](#install-nodejs-and-pnpm)
3. [Install Foundry](#install-foundry)
4. [Install dependencies](#install-dependencies)
5. [Run the test suite](#run-the-test-suite)
6. [Write documentation](#write-documentation)
7. [Submit a pull request](#submit-a-pull-request)
8. [Versioning and releases](#versioning-and-releases)

<br>

---

<br>

## Clone the repository

To start contributing to the project, use the [GitHub CLI](https://cli.github.com) to create a fork and clone it to your local machine:

```bash
gh fork --clone 0xOlias/ponder
```

Or, manually create a fork using the button at the top of the repo on GitHub, then clone it to your local machine using `git clone {your-fork-url}`.

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Install Node.js and pnpm

Ponder uses [pnpm workspaces](https://pnpm.io/workspaces) to manage multiple projects. You need to install **Node.js v16 or higher** and **pnpm v7 or higher**.

You can run the following commands in your terminal to check your local Node.js and pnpm versions:

```bash
node -v
pnpm -v
```

If the versions are not correct or you don't have Node.js or pnpm installed, download and follow their setup instructions:

- Install Node.js using [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), or from the [official website](https://nodejs.org)
- Install [pnpm](https://pnpm.io/installation)

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Install Foundry

Ponder uses [Foundry](https://book.getfoundry.sh/) for testing. The test suite uses local [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil) instances via [Anvil.js](https://github.com/wagmi-dev/anvil.js) to run isolated, concurrent tests against forks of Ethereum mainnet.

Install Foundry (and Anvil) using the following command:

```bash
curl -L https://foundry.paradigm.xyz | bash
```

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Install dependencies

In the project's root directory, run the following command to install the project's dependencies:

```bash
pnpm install
```

After the install completes, pnpm links packages across the project for development. This means that if you run any of the projects in the `examples/` directory, they will use the local version of `@ponder/core`.

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Run the test suite

### Environment variables

The test suite uses [mainnet forking](https://book.getfoundry.sh/tutorials/forking-mainnet-with-cast-anvil) to test against real-world data. To get this working, you'll need to set up environment variables.

First, create a `env.local` file using the provided template.

```bash
cp .env.example .env.local
```

- `ANVIL_FORK_URL` must be a mainnet RPC URL from a service provider like [Alchemy](https://www.alchemy.com/).
- `DATABASE_URL` (optional) is a connection string to a Postgres database. If `DATABASE_URL` is provided, the test suite will run against the specified Postgres database. If not, tests will run against an in-memory SQLite database. Unless you are specifically testing Postgres behavior, you don't need to run tests against Postgres locally and can instead rely on CI to catch any regressions.

### Running tests

The test suite uses [vitest](https://vitest.dev/guide) in concurrent mode as a test runner.

Herea are some commands to get you started.

- `pnpm test` — run all tests in watch mode
- `pnpm test path/to/file.test.ts` — run a single test file
- `pnpm test path/to/dir` — run all test files in a directory

When adding new features or fixing bugs, it's important to add test cases to cover any new or updated behavior.

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Write documentation

Ponder uses [Nextra](https://nextra.site) and Markdown for the documentation website (located at [`docs`](../docs)). To start the docs website in dev mode, run:

```bash
cd docs && pnpm dev
```

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Submit a pull request

When you're ready to submit a pull request, follow these naming conventions:

- Pull request titles use the [imperative mood](https://en.wikipedia.org/wiki/Imperative_mood) (e.g., `Add something`, `Fix something`).
- [Changesets](#versioning) use past tense verbs (e.g., `Added something`, `Fixed something`).

When you submit a pull request, a GitHub Action will automatically lint, build, and test your changes. If you see an ❌, it's most likely a problem with your code. Inspect the logs through the GitHub Actions UI to find the cause.

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## Versioning and releases

Ponder uses [changesets](https://github.com/changesets/changesets) to manage package versioning and NPM releases.

Ponder is still in alpha, so all changes should be marked as a patch.

### Changesets workflow

1. Write a PR that includes a public API change or bug fix.
2. Create a changeset using `pnpm changeset`. The changesets CLI will ask you which package is affected (`@ponder/core` or `create-ponder`) and if the change is a patch, minor, or major release.
3. The changesets CLI will generate a Markdown file in `.changeset/` that includes the details you provided. Commit this file to your PR branch (e.g. `git commit -m "chore: changeset"`).
4. When you push this commit to remote, a GitHub bot will detect the changeset and add a comment to your PR with a preview of the changelog.
5. Merge your PR. The changesets Github Action workflow will open (or update) a PR with the title `"chore: version packages"`. The changes in your PR **will not be released** until this PR is merged.

### Releases

When you're ready to release, merge the `"chore: version packages"` PR into `main`. This will trigger the changesets Github Action workflow to build packages, publish to NPM, and create a new GitHub release.

<div align="right">
  <a href="#get-started">&uarr; back to top</a></b>
</div>

## That's it!

If you still have questions, please reach out in Ponder's [public telegram group](https://t.me/ponder_sh) or create a [new discussion](https://github.com/0xOlias/ponder/discussions).

This guide was adapted from [viem](https://github.com/wagmi-dev/viem/blob/main/.github/CONTRIBUTING.md)'s contribution guide. ❤️