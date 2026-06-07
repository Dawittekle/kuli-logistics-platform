# Repository Verification Notes

This branch keeps the KULI Logistics Platform monorepo ready for clean local and container-based verification. It preserves the real apps, packages, tests, and Git history while keeping local-only files out of source control and build contexts.

## Rules Followed

- Root `Dockerfile` uses a Node 20 base image and validates the repository in a clean container.
- `.dockerignore` excludes dependency folders, real env files, build output, coverage, logs, temporary files, and local agent files.
- `.git` is not excluded from Docker or archive packaging.
- Only safe `.env.example` files are kept in the repository.
- Email notification logging uses `EMAIL_LOG_PATH`, defaulting to `/tmp/kuli-sent-emails.log`.
- Local documentation dumps, build outputs, and dependency folders are intentionally absent from the current tree.

## Verify

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run smoke:critical
```

## Docker Check

```bash
docker build -t kuli-verification-check .
docker run --rm kuli-verification-check git -C /workspace log -1 --oneline
docker run --rm kuli-verification-check npm test
```

## Create Repository Archive

```bash
bash scripts/create-silver-zip.sh
```

The archive script can be run after local verification with `npm ci`. It creates the staged archive from a clean single-branch clone of the current branch, removes clone remote metadata, verifies a single `kuli-logistics-platform/` top-level folder, verifies that `kuli-logistics-platform/.git/HEAD` is included, and fails if unsafe files such as real `.env` files, build outputs, coverage, logs, or hardcoded developer home paths are present.

## Do Not Commit

- Real `.env` files or secrets.
- `node_modules` or other dependency folders.
- Build outputs such as `dist`, `build`, `.expo`, `.next`, or `.vite`.
- Coverage reports, logs, temp files, OS junk, or machine-specific paths.

Before external sharing, confirm the repository is private, no public fork or mirror exists, and the submitter owns or has rights to share the repository IP and full Git history.
