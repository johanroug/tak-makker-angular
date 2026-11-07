#!/usr/bin/env bash
set -euo pipefail

prune_backups() {
  local directory=$1 expected_directory=$2 keep=$3 cutoff=$4
  local file name stamp created count=0
  [[ ! -L "$directory" && -d "$directory" ]] || return 1
  [[ "$(cd "$directory" && pwd -P)" == "$expected_directory" ]] || { echo 'Unexpected backup directory' >&2; return 1; }
  [[ "$keep" =~ ^supabase-[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+\.tar\.gz\.gpg$ ]] || return 1
  [[ -f "$directory/$keep" && ! -L "$directory/$keep" && -s "$directory/$keep" ]] || { echo 'Verified current backup missing' >&2; return 1; }
  [[ "$cutoff" =~ ^[0-9]+$ ]] || return 1
  # Nonrecursive, regular archives only. Never follow links, delete unrelated
  # files, or remove the newly verified backup. Age comes from UTC filename.
  for file in "$directory"/supabase-*.tar.gz.gpg; do
    [[ -f "$file" && ! -L "$file" ]] || continue
    name=${file##*/}
    [[ "$name" != "$keep" ]] || continue
    [[ "$name" =~ ^supabase-([0-9]{8}T[0-9]{6}Z)-[0-9]+-[0-9]+\.tar\.gz\.gpg$ ]] || continue
    stamp=${BASH_REMATCH[1]}
    created=$(date -u -d "${stamp:0:4}-${stamp:4:2}-${stamp:6:2} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2}Z" +%s) || return 1
    if (( created <= cutoff )); then
      rm -- "$file"
      count=$((count + 1))
    fi
  done
  printf 'Expired backup archives deleted: %s\n' "$count"
}

if [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
  prune_backups '/var/www/hovedetpaasommet.dk/private-backups' \
    '/var/www/hovedetpaasommet.dk/private-backups' "${1:?Current verified backup filename required}" \
    "$(date -u -d '30 days ago' +%s)"
fi
