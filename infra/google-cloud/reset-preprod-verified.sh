#!/usr/bin/env bash
# Owner Cloud Shell launcher; underlying reset independently verifies every gate.
set -euo pipefail
umask 077
if [[ $# -ne 5 ]]; then
  echo "Użycie: bash reset-preprod-verified.sh RUN SHA ARTEFAKT ROZMIAR SHA256_ZIP"
  exit 1
fi
release_run="$1"
release_sha="$2"
artifact_id="$3"
artifact_size="$4"
artifact_sha="$5"
[[ $release_run =~ ^[1-9][0-9]*$ && $release_sha =~ ^[a-f0-9]{40}$ &&
   $artifact_id =~ ^[1-9][0-9]*$ && $artifact_size =~ ^[1-9][0-9]*$ &&
   $artifact_sha =~ ^[a-f0-9]{64}$ ]] || { echo "Brak zweryfikowanych danych wydania; reset zatrzymany."; exit 1; }
repo_dir="$HOME/harborlight-infra"
reset_dir="$HOME/harborlight-reset-$release_run"
receipt_file="$HOME/harborlight-preprod-release-$release_run.zip"
git -C "$repo_dir" fetch origin "$release_sha"
if [[ ! -d "$reset_dir" ]]; then
  git -C "$repo_dir" worktree add --detach "$reset_dir" "$release_sha"
fi
[[ $(git -C "$reset_dir" rev-parse HEAD) == "$release_sha" ]]
git -C "$reset_dir" diff --quiet HEAD --
if [[ ! -f "$receipt_file" ]]; then
  curl --fail --location --proto '=https' --proto-redir '=https' --tlsv1.2 \
    --max-filesize 2000000 \
    "https://api.github.com/repos/ksobczak321-oss/gra/actions/artifacts/$artifact_id/zip" \
    --output "$receipt_file.part"
  mv -- "$receipt_file.part" "$receipt_file"
fi
cd "$reset_dir"
python3 -I - "$release_run" "$release_sha" "$receipt_file" "$artifact_size" "$artifact_sha" <<'PY'
import hashlib, importlib.util, json, math, pathlib, re, sys, time
run, commit, receipt_path, size, digest = sys.argv[1:]
archive = pathlib.Path(receipt_path)
raw = archive.read_bytes()
if len(raw) != int(size) or hashlib.sha256(raw).hexdigest() != digest:
    raise SystemExit("ZIP nie zgadza się ze zweryfikowanym oryginałem GitHub; reset zatrzymany.")
spec = importlib.util.spec_from_file_location("verified_preprod_reset", pathlib.Path("infra/google-cloud/reset-preprod-accounts.py"))
reset = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reset)
args = reset.parser().parse_args([
    "--deployment-run-id", run, "--commit", commit,
    "--receipt-archive", str(archive), "--apply", "--lock-client-writes"
])
for attempt in range(3):
    try:
        result = reset.execute(args)
        print("WYNIK: RESET PRE-PROD PASS " + json.dumps({
            "run": int(run), "generations": result["generations"],
            "uids": result["uids"], "status": result["status"]
        }, ensure_ascii=False), flush=True)
        break
    except reset.Error as error:
        match = re.match(r"Deny-all opublikowane\. Ponów tę samą komendę za ([0-9]+) s,", str(error))
        if not match or attempt == 2:
            raise SystemExit(str(error)) from None
        delay = int(match.group(1))
        if not 0 < delay <= 601:
            raise SystemExit("Nieprawidłowy czas propagacji; reset zatrzymany.")
        print(str(error), flush=True)
        until = time.monotonic() + delay + 1
        while time.monotonic() < until:
            remaining = max(1, math.ceil(until - time.monotonic()))
            print("Oczekiwanie na blokadę starych zapisów: " + str(remaining) + " s. Nie zamykaj Cloud Shell.", flush=True)
            time.sleep(min(30, max(0, until - time.monotonic())))
PY
