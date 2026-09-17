# Contributing

This repository uses the checked-in Node, pnpm, lockfile, build, test, and release configuration as the development contract. Keep local validation as close to CI as possible so a pull request does not discover basic environment drift after review starts.

## Setup

Use the Node version from `.nvmrc` and pnpm 9.14.1.

```bash
pnpm install --frozen-lockfile
```

The frozen install matters in CI and before release work because it proves that `package.json` and `pnpm-lock.yaml` agree. Use a normal `pnpm install` only when you intentionally update dependencies or the lockfile.

## Validation workflow

Run validation in this order:

```bash
pnpm build
node --test tests/*.test.mjs
pnpm typedoc
```

The runtime tests import built files from `lib/`, so build before running them. This is also the order used by the pull-request validation workflow.

When a change affects TypeScript declarations or public option shapes, also inspect the generated declarations and add a compile-time fixture when runtime tests cannot prove the contract.

### What CI validates

`.github/workflows/validate.yml` runs for relevant pull requests and pushes to `main`. It:

1. installs the repository's pnpm version;
2. uses the Node version in `.nvmrc`;
3. installs with `--frozen-lockfile`;
4. builds the package;
5. runs the runtime regression tests;
6. generates the API documentation.

The workflow cancels superseded runs on the same ref so an older commit does not keep consuming CI time after a new commit is pushed.

External deployment checks are separate from package validation. A deployment-provider failure does not by itself prove that the library build or tests failed. Inspect the failing provider when its preview matters, and use the `Validate` job as the repository-native build/test signal.

## Worker tests

Tests that change browser-like globals must restore them. A test should not make later tests depend on execution order.

When testing feature detection that happens during module evaluation:

1. save the original global property descriptor;
2. install the test value;
3. import the built module;
4. restore the original descriptor in `finally`;
5. run assertions against the imported behavior.

This keeps the regression condition realistic without leaking mutable process state into another test.

For behavior that differs between `SharedWorker` and dedicated `Worker`, cover both concrete resources. Do not infer the wrapped resource from global browser support.

## Documentation

Document observable compatibility differences even when the top-level API is intentionally similar. In particular, call out differences in:

- resource ownership and lifetime;
- shared versus per-document state;
- `MessagePort` versus direct worker messaging;
- cleanup behavior;
- browser feature support;
- restart, reconnection, or persistence expectations.

Do not describe a fallback as equivalent when the underlying web platform does not provide equivalent semantics.

## Releases

The repository uses Conventional Commits and `semantic-release`.

Use commit types that describe the change accurately, for example:

```text
fix: route ponyfill by wrapped worker
feat: support extendedLifetime shared workers
docs: explain worker lifecycle recovery
```

`semantic-release` owns version analysis, changelog generation, npm publication, GitHub release metadata, and the release commit on `main` according to `package.json`.

This repository does not use Changesets as its release source of truth. Do not add a `.changeset` file only because an organization-level bot comments on a pull request. A release-system migration should be an explicit repository change that replaces or integrates with the existing semantic-release configuration.

## Pull-request review

Before requesting review:

```bash
pnpm install --frozen-lockfile
pnpm build
node --test tests/*.test.mjs
pnpm typedoc
```

Then review the diff for accidental generated or formatting changes. If a review comment identifies a real defect, fix the behavior or documentation, add or strengthen regression coverage where appropriate, reply with the commit that addressed it, and resolve the thread only after the updated code is present.
