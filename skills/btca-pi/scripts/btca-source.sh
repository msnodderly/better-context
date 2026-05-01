#!/usr/bin/env bash
set -euo pipefail

SANDBOX="${BTCA_SANDBOX:-$HOME/.btca/agent/sandbox}"

usage() {
  cat <<USAGE
Usage:
  $0 list
  $0 ensure <git-url> [name] [branch]

Clones or safely updates source repos in: $SANDBOX
USAGE
}

repo_name_from_url() {
  local url="$1"
  local base="${url##*/}"
  echo "${base%.git}"
}

list_repos() {
  mkdir -p "$SANDBOX"
  find "$SANDBOX" -mindepth 1 -maxdepth 1 -type d -print | sort
}

ensure_repo() {
  local url="$1"
  local name="${2:-$(repo_name_from_url "$url") }"
  name="${name// /}"
  local branch="${3:-}"
  local target="$SANDBOX/$name"

  mkdir -p "$SANDBOX"

  if [[ ! -d "$target/.git" ]]; then
    if [[ -n "$branch" ]]; then
      git clone --depth 1 --branch "$branch" "$url" "$target"
    else
      git clone --depth 1 "$url" "$target"
    fi
    echo "$target"
    return
  fi

  git -C "$target" fetch --all --prune

  if [[ -n "$(git -C "$target" status --porcelain)" ]]; then
    echo "WARN: $target has local changes; fetched only, did not pull." >&2
    echo "$target"
    return
  fi

  local current_branch
  current_branch="$(git -C "$target" branch --show-current || true)"
  if [[ -n "$current_branch" ]]; then
    git -C "$target" pull --ff-only || true
  fi

  echo "$target"
}

cmd="${1:-}"
case "$cmd" in
  list)
    list_repos
    ;;
  ensure)
    if [[ $# -lt 2 ]]; then usage >&2; exit 2; fi
    shift
    ensure_repo "$@"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
