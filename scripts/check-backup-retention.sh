#!/usr/bin/env bash
set -euo pipefail
source scripts/prune-simply-backups.sh
test_directory=$(mktemp -d)
cleanup() {
  rm -f "$test_directory/"{supabase-20260101T000000Z-1-1.tar.gz.gpg,supabase-20260131T000000Z-2-1.tar.gz.gpg,supabase-20260201T000000Z-3-1.tar.gz.gpg,supabase-20260101T000000Z-4-1.tar.gz.gpg,notes.txt,supabase-invalid.tar.gz.gpg,linked-directory}
  rmdir "$test_directory"
}
trap cleanup EXIT
root=$(cd "$test_directory" && pwd -P)
old='supabase-20260101T000000Z-1-1.tar.gz.gpg'
boundary='supabase-20260131T000000Z-2-1.tar.gz.gpg'
current='supabase-20260201T000000Z-3-1.tar.gz.gpg'
for name in "$old" "$boundary" "$current" notes.txt supabase-invalid.tar.gz.gpg; do
  printf 'fixture' > "$root/$name"
done
check_links=false
if [[ "$(uname -s)" == Linux ]]; then
  check_links=true
  ln -s "$root/notes.txt" "$root/supabase-20260101T000000Z-4-1.tar.gz.gpg"
  ln -s "$root" "$root/linked-directory"
fi
cutoff=$(date -u -d '2026-01-31 00:00:00Z' +%s)
if prune_backups "$root" /unexpected "$current" "$cutoff"; then exit 1; fi
if prune_backups "$root" "$root" missing "$cutoff"; then exit 1; fi
if [[ "$check_links" == true ]]; then
  if prune_backups "$root/linked-directory" "$root" "$current" "$cutoff"; then exit 1; fi
fi
[[ -f "$root/$old" ]]
prune_backups "$root" "$root" "$current" "$cutoff"
[[ ! -e "$root/$old" && ! -e "$root/$boundary" && -s "$root/$current" ]]
[[ -f "$root/notes.txt" && -f "$root/supabase-invalid.tar.gz.gpg" ]]
if [[ "$check_links" == true ]]; then
  [[ -L "$root/supabase-20260101T000000Z-4-1.tar.gz.gpg" ]]
fi
# Even if cutoff is after the newest file, the verified backup stays.
prune_backups "$root" "$root" "$current" "$(date -u -d '2027-01-01Z' +%s)"
[[ -s "$root/$current" ]]
echo "PASS: retention boundary, path guard, unrelated files and verified backup preservation. Native symlink checks: $check_links"
