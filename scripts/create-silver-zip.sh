#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR_NAME="kuli-logistics-platform"
ZIP_NAME="kuli-logistics-platform-silver.zip"
ZIP_PATH="$REPO_ROOT/$ZIP_NAME"

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

cd "$REPO_ROOT"

require_command awk
require_command du
require_command find
require_command git
require_command grep
require_command mktemp
require_command unzip
require_command zip

branch=$(git branch --show-current)
[[ "$branch" == "silver" ]] || fail "current branch must be silver; found ${branch:-detached}"
[[ -f .git/HEAD ]] || fail ".git/HEAD is missing"
git rev-parse --verify HEAD >/dev/null || fail "git HEAD is not readable"
[[ -f Dockerfile ]] || fail "Dockerfile is missing"

if [[ "${ALLOW_DIRTY_ZIP:-0}" != "1" ]]; then
  dirty_status=$(git status --porcelain=v1)
  [[ -z "$dirty_status" ]] || fail "uncommitted changes exist; commit them first or set ALLOW_DIRTY_ZIP=1 for an explicit local dry run"
fi

if grep -Eq 'npm[[:space:]]+ci' Dockerfile; then
  [[ -f package-lock.json ]] || fail "package-lock.json is required because Dockerfile uses npm ci"
fi

if [[ -f .dockerignore ]] && grep -Ev '^[[:space:]]*(#|$)' .dockerignore | grep -Eq '(^|[*/])\.git($|/|\*)'; then
  fail ".dockerignore must not exclude .git"
fi

docs_path=$(find . \( -path './.git' -o -name node_modules \) -prune -o -type d \( -name docs -o -name docss \) -print -quit)
[[ -z "$docs_path" ]] || fail "docs/ and docss/ directories must be removed before packaging; found $docs_path"

node_modules_path=$(find . -path './.git' -prune -o -type d -name node_modules -print -quit)
if [[ -n "$node_modules_path" ]]; then
  printf 'warning: dependency directory exists at %s and will be excluded from the zip\n' "$node_modules_path" >&2
fi

env_path=$(find . \( -path './.git' -o -name node_modules \) -prune -o -type f \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' -print -quit)
[[ -z "$env_path" ]] || fail "real env file exists at $env_path"

hardcoded_paths=$(mktemp)
home_path_pattern="/""home""/"
project_path_pattern="Documents/""Projects"
if grep -R -E "$home_path_pattern|$project_path_pattern" -n . --exclude-dir=.git --exclude-dir=node_modules --exclude="$ZIP_NAME" > "$hardcoded_paths"; then
  cat "$hardcoded_paths" >&2
  rm -f "$hardcoded_paths"
  fail "hardcoded developer path found outside .git"
fi
rm -f "$hardcoded_paths"

staging_parent=$(mktemp -d)
cleanup() {
  rm -rf "$staging_parent"
}
trap cleanup EXIT

staged_repo="$staging_parent/$REPO_DIR_NAME"
rm -f "$ZIP_PATH"

git clone --quiet --no-local --single-branch --branch "$branch" "$REPO_ROOT" "$staged_repo"

(
  cd "$staged_repo"
  git remote remove origin || true
  git reflog expire --expire=now --expire-unreachable=now --all
  git gc --quiet --prune=now
)

[[ -f "$staged_repo/.git/HEAD" ]] || fail ".git/HEAD is missing from staged repository"
git -C "$staged_repo" rev-parse --verify HEAD >/dev/null || fail "staged git history is not readable"

non_owner_author=$(git -C "$staged_repo" log --format='%an <%ae>' | sort -u | grep -Ev '^(Dawit <teklebrhandawit309@gmail\.com>|Dawit <140079318\+Dawittekle@users\.noreply\.github\.com>)$' || true)
[[ -z "$non_owner_author" ]] || fail "staged git history contains a non-owner author: $non_owner_author"

(
  cd "$staging_parent"
  zip -rq "$ZIP_PATH" "$REPO_DIR_NAME"
)

zip_list=$(mktemp)
unzip -Z1 "$ZIP_PATH" > "$zip_list"

awk -F/ -v root="$REPO_DIR_NAME" '$1 != root { print; bad = 1 } END { exit bad }' "$zip_list" || {
  rm -f "$zip_list"
  fail "zip must contain a single top-level $REPO_DIR_NAME/ directory"
}

grep -Eq "^$REPO_DIR_NAME/\.git/HEAD$" "$zip_list" || {
  rm -f "$zip_list"
  fail "$REPO_DIR_NAME/.git/HEAD is missing from zip"
}

if grep -E "^$REPO_DIR_NAME/\.git/worktrees(/|$)" "$zip_list"; then
  rm -f "$zip_list"
  fail "zip contains local .git/worktrees metadata"
fi

if grep -E '(^|/)node_modules(/|$)' "$zip_list"; then
  rm -f "$zip_list"
  fail "zip contains node_modules"
fi

if grep -E '(^|/)\.env($|\.)' "$zip_list" | grep -vE '(^|/)\.env\.example$'; then
  rm -f "$zip_list"
  fail "zip contains a real env file"
fi

if grep -E '(^|/)(dist|build|coverage)(/|$)' "$zip_list"; then
  rm -f "$zip_list"
  fail "zip contains generated build or coverage output"
fi

if grep -E '(^|/)(sent_emails\.log|[^/]+\.log)$' "$zip_list" | grep -vE "^$REPO_DIR_NAME/\.git/"; then
  rm -f "$zip_list"
  fail "zip contains a log file outside .git"
fi

if grep -E '(^|/)(docs|docss)(/|$)' "$zip_list"; then
  rm -f "$zip_list"
  fail "zip contains docs or docss"
fi

rm -f "$zip_list"

zip_size=$(du -h "$ZIP_PATH" | awk '{print $1}')
printf 'created %s (%s)\n' "$ZIP_PATH" "$zip_size"
printf 'verified %s/.git/HEAD is present and unsafe files are excluded\n' "$REPO_DIR_NAME"
