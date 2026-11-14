#!/usr/bin/env bash
set -euo pipefail
repository_root=$(pwd)
test_directory=$(mktemp -d)
case "$test_directory" in /tmp/*) ;; *) echo 'Unexpected test directory' >&2; exit 1;; esac
trap 'rm -f "$test_directory/bin/ssh" "$test_directory/bin/rsync" "$test_directory/log" "$test_directory/public_html/.htaccess"; rm -f "$test_directory/dist/hovedet-paa-soemmet-angular/browser/"{index.html,index.csr.html,404.html,.htaccess}; rmdir "$test_directory/bin" "$test_directory/public_html" "$test_directory/dist/hovedet-paa-soemmet-angular/browser" "$test_directory/dist/hovedet-paa-soemmet-angular" "$test_directory/dist" "$test_directory"' EXIT
mkdir -p "$test_directory/bin" "$test_directory/public_html" "$test_directory/dist/hovedet-paa-soemmet-angular/browser"
for file in index.html index.csr.html 404.html .htaccess; do
  printf 'fixture\n' > "$test_directory/dist/hovedet-paa-soemmet-angular/browser/$file"
done
cp "$repository_root/hosting/simply/.htaccess" "$test_directory/dist/hovedet-paa-soemmet-angular/browser/.htaccess"
printf '# Simply custom HTTPS rules\nRewriteEngine On\nRewriteCond %%{HTTPS} !=on\nRewriteRule ^ https://example.test%%{REQUEST_URI} [R=301,L]\nRewriteRule ^(login|reset-password|projects)(/.*)?$ index.csr.html [END]\n' > "$test_directory/public_html/.htaccess"
cat > "$test_directory/bin/ssh" <<'MOCK'
#!/usr/bin/env bash
printf 'ssh %s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [[ "${!#}" == *'routing_block=$(mktemp)'* ]]; then bash -c "${!#}"; fi
MOCK
cat > "$test_directory/bin/rsync" <<'MOCK'
#!/usr/bin/env bash
printf 'rsync %s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [[ "${FAIL_ASSETS:-}" == yes && "$*" == *"--exclude=*.html"* ]]; then exit 1; fi
MOCK
chmod +x "$test_directory/bin/ssh" "$test_directory/bin/rsync"
export PATH="$test_directory/bin:$PATH"
export DEPLOY_TEST_LOG="$test_directory/log"
export SIMPLY_SSH_USER=test-user SIMPLY_SSH_PRIVATE_KEY=mock-private-key SIMPLY_SSH_KNOWN_HOSTS=mock-host-key
cd "$test_directory"
bash "$repository_root/scripts/deploy-simply.sh"
[[ $(grep -c "^ssh\|^rsync" "$DEPLOY_TEST_LOG") -eq 4 ]]
sed -n '1p' "$DEPLOY_TEST_LOG" | grep -q 'StrictHostKeyChecking=yes'
sed -n '2p' "$DEPLOY_TEST_LOG" | grep -q -- '--exclude=\*.html'
sed -n '3p' "$DEPLOY_TEST_LOG" | grep -q -- '--include=\*.html'
grep -Fq 'RewriteCond %{HTTPS} !=on' public_html/.htaccess
grep -Fq 'reset-password|customers|projects' public_html/.htaccess
grep -Fq 'ai-tilbudsgenerator)$ $1/index.html [END]' public_html/.htaccess
grep -Fq 'tilbudsberegner|ai-tilbudsgenerator' public_html/.htaccess
[[ $(grep -c '^# BEGIN Angular public routes$' public_html/.htaccess) -eq 1 ]]
if grep -q -- '--delete' "$DEPLOY_TEST_LOG"; then echo 'Deployment deletes old assets' >&2; exit 1; fi
: > "$DEPLOY_TEST_LOG"
bash "$repository_root/scripts/deploy-simply.sh"
[[ $(grep -c '^# BEGIN Angular public routes$' public_html/.htaccess) -eq 1 ]]
: > "$DEPLOY_TEST_LOG"
if FAIL_ASSETS=yes bash "$repository_root/scripts/deploy-simply.sh"; then echo 'Transfer failure ignored' >&2; exit 1; fi
[[ $(wc -l < "$DEPLOY_TEST_LOG") -eq 2 ]] # HTML must not be activated after failed assets.
: > "$DEPLOY_TEST_LOG"
if SIMPLY_SSH_USER='bad user;command' bash "$repository_root/scripts/deploy-simply.sh"; then exit 1; fi
[[ ! -s "$DEPLOY_TEST_LOG" ]]
echo 'Simply deployment checks passed: strict SSH, assets before HTML, public routing synchronized idempotently, HTTPS preserved, no deletion, failed transfer stops deployment, invalid username rejected.'
