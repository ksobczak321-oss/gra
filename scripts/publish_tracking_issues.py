#!/usr/bin/env python3
"""Publish Git change/test cards as fixed-repository Issues only with --apply."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
import tempfile
import time
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'ksobczak321-oss/gra'
REPO_URL = f'https://github.com/{REPOSITORY}'
MANIFESTS = ('docs/tracking/changes.json', 'docs/testing/manual-test-cases.json')
ID_PATTERN = r'HL-(?:CHG|TC)-[0-9]{4}'
ID_RE = re.compile(ID_PATTERN + r'\Z')
TITLE_ID = re.compile(r'^\[?(' + ID_PATTERN + r')\]?(?=\s|$)')
OWNER_MARKER = re.compile(r'<!-- harborlight-tracking:(' + ID_PATTERN + r') -->')
REGION_MARKER = re.compile(r'<!-- harborlight-managed:(' + ID_PATTERN + r'):(begin|end) -->')
MAX_BODY_BYTES = 60_000
ISSUES_PER_PAGE = 100
MAX_ISSUE_PAGES = 1000


class TrackingError(Exception):
    """A bounded, credential-free message suitable for the owner."""


class PublishInterrupted(TrackingError):
    def __init__(self, last_id, confirmed, cause):
        super().__init__(f'Publishing stopped at {last_id}. {cause} '
                         'The last mutation may have succeeded; it was not retried. '
                         'Rerun after checking GitHub: the importer re-reads all stable IDs before writing.')
        self.confirmed = list(confirmed)


def fail(message):
    raise TrackingError(message)


def read_json(path):
    try:
        if path.stat().st_size > 10_000_000:
            fail('Tracking input exceeds the allowed size.')
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        fail('Cannot read a valid local tracking JSON file.')


def card_file(root, relative, required_directory):
    candidate = PurePosixPath(relative)
    if candidate.is_absolute() or '..' in candidate.parts or '\\' in relative:
        fail('A card path escapes its canonical tracking directory.')
    try:
        path = (root / relative).resolve(strict=True)
        path.relative_to((root / required_directory).resolve())
        if not path.is_file() or path.stat().st_size > 50_000:
            fail('A card file is missing or exceeds the allowed size.')
        text = path.read_text(encoding='utf-8')
    except (OSError, ValueError):
        fail('A card file is missing or escapes its canonical tracking directory.')
    if '<!-- harborlight-managed:' in text or '<!-- harborlight-tracking:' in text:
        fail('Source cards must not contain importer control markers.')
    return text


def ids(values):
    if not isinstance(values, list) or any(not isinstance(value, str) or not ID_RE.fullmatch(value) for value in values):
        fail('A tracking relation has an invalid stable card ID.')
    return list(dict.fromkeys(values))


def load_cards(root=ROOT):
    root = Path(root).resolve()
    changes, tests = (read_json(root / name) for name in MANIFESTS)
    if any(not isinstance(value, dict) or value.get('schema_version') != 1 for value in (changes, tests)):
        fail('Unsupported tracking manifest schema.')
    if not isinstance(changes.get('changes'), list) or not isinstance(tests.get('cases'), list):
        fail('Tracking manifests require separate changes and test-case arrays.')
    epics = {entry['id']: entry['title'] for entry in changes.get('epics', [])
             if isinstance(entry, dict) and isinstance(entry.get('id'), str) and isinstance(entry.get('title'), str)}
    cards = []
    for family, records in (('CHG', changes['changes']), ('TC', tests['cases'])):
        for record in records:
            if not isinstance(record, dict):
                fail('A tracking card must be a JSON object.')
            identifier, title = record.get('id'), record.get('title')
            if not isinstance(identifier, str) or not re.fullmatch(f'HL-{family}-[0-9]{{4}}', identifier):
                fail('A tracking card has an invalid stable ID.')
            if not isinstance(title, str) or not title.strip() or len(title) > 220 or '\n' in title or '\r' in title:
                fail('A tracking card has an invalid title.')
            if family == 'CHG':
                relative = f'docs/tracking/changes/{identifier}.md'
                relations = ids(record.get('related_changes', [])) + ids(record.get('supersedes', [])) + ids(record.get('superseded_by', []))
                kind, status = record.get('type'), record.get('status')
                if not isinstance(kind, str) or not isinstance(status, dict):
                    fail('A change card requires type and separate environment status metadata.')
                epic = record.get('epic')
                if epic is not None and (not isinstance(epic, str) or epic not in epics):
                    fail('A change card refers to an unknown epic.')
                directory = 'docs/tracking/changes'
            else:
                if not isinstance(record.get('file'), str):
                    fail('A test card requires a canonical Markdown file path.')
                relative = str(PurePosixPath('docs/testing') / record['file'])
                relations, kind = ids(record.get('changes', [])), 'TestCase'
                status = {'definition': record.get('definition_status'), 'manual_result': record.get('manual_result')}
                if any(not isinstance(value, str) for value in status.values()):
                    fail('A test card requires definition status and an explicit manual result.')
                epic, directory = None, 'docs/testing/manual'
            cards.append({'id': identifier, 'title': title.strip(), 'type': kind, 'status': status,
                          'epic': epic, 'epic_title': epics.get(epic), 'path': relative,
                          'relations': list(dict.fromkeys(relations)),
                          'markdown': card_file(root, relative, directory)})
    by_id = {card['id']: card for card in cards}
    if len(by_id) != len(cards):
        fail('The local tracking manifests contain duplicate stable card IDs.')
    for card in cards:
        if any(identifier not in by_id for identifier in card['relations']):
            fail('A tracking relation refers to a card absent from the canonical manifests.')
        if card['id'].startswith('HL-TC-'):
            for identifier in card['relations']:
                if card['id'] not in by_id[identifier]['relations']:
                    by_id[identifier]['relations'].append(card['id'])
    return cards


def source_url(path):
    return f'{REPO_URL}/blob/main/{quote(path, safe="/")}'


def source_links(markdown, path):
    """Issue bodies need absolute links; Git-relative links have no base there."""
    def replace(match):
        label, target = match.groups()
        if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', target) or target.startswith('//'):
            return match.group(0)
        local, separator, fragment = target.partition('#')
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), local)) if local else path
        if resolved.startswith('../') or resolved.startswith('/'):
            fail('A card contains a relative link outside the repository.')
        return label + '(' + source_url(resolved) + (separator + fragment if separator else '') + ')'
    return re.sub(r'(\[[^\]\n]*\])\(([^\s)]+)\)', replace, markdown)


def managed_region(card, known_urls):
    identifier = card['id']
    metadata = [f'Typ: **{card["type"]}**',
                'Status w Git: `' + json.dumps(card['status'], ensure_ascii=False, sort_keys=True) + '`',
                f'Karta źródłowa: [{identifier}]({source_url(card["path"])})']
    if card.get('epic'):
        epic = card['epic']
        metadata.append(f'Epic: [{epic} — {card["epic_title"]}]({source_url("docs/tracking/CHANGE-REGISTER.md")}#{epic.lower()})')
    if card['relations']:
        related = [f'[{other}]({known_urls[other]})' if other in known_urls else f'`{other}` (Issue jeszcze nieopublikowane)'
                   for other in card['relations']]
        metadata.append('Relacje: ' + ', '.join(related))
    body = (f'<!-- harborlight-managed:{identifier}:begin -->\n'
            f'<!-- harborlight-tracking:{identifier} -->\n' + '\n\n'.join(metadata) +
            '\n\n---\n\n' + source_links(card['markdown'].rstrip(), card['path']) +
            f'\n<!-- harborlight-managed:{identifier}:end -->')
    if len(body.encode('utf-8')) > MAX_BODY_BYTES:
        fail('A rendered Issue body exceeds the allowed size.')
    return body


def merge_body(existing, card, known_urls):
    region = managed_region(card, known_urls)
    markers = list(REGION_MARKER.finditer(existing))
    if not markers:
        merged = region + ('\n\n' + existing if existing else '\n\n## Notatki zespołu\n\n')
        if len(merged.encode('utf-8')) > MAX_BODY_BYTES:
            fail('Managed content and human notes exceed the allowed Issue size.')
        return merged
    if len(markers) != 2 or [(match.group(1), match.group(2)) for match in markers] != [(card['id'], 'begin'), (card['id'], 'end')]:
        fail('A remote Issue contains malformed or conflicting managed-region markers.')
    merged = existing[:markers[0].start()] + region + existing[markers[1].end():]
    if len(merged.encode('utf-8')) > MAX_BODY_BYTES:
        fail('Managed content and human notes exceed the allowed Issue size.')
    return merged


def issue_index(issues):
    if not isinstance(issues, list):
        fail('The remote snapshot must be an array of Issues.')
    indexed = {}
    for issue in issues:
        if not isinstance(issue, dict):
            fail('The remote snapshot contains an invalid Issue.')
        if 'pull_request' in issue:
            continue
        title, body, number = issue.get('title'), issue.get('body') or '', issue.get('number')
        if not isinstance(title, str) or not isinstance(body, str) or not isinstance(number, int) or isinstance(number, bool) or number < 1:
            fail('The remote snapshot contains an invalid Issue.')
        expected_url = f'{REPO_URL}/issues/{number}'
        url = issue.get('html_url', issue.get('url', expected_url))
        if url != expected_url:
            fail('The remote snapshot includes an Issue from an unexpected repository.')
        identifiers = set(OWNER_MARKER.findall(body))
        match = TITLE_ID.match(title)
        if match:
            identifiers.add(match.group(1))
        if len(identifiers) > 1:
            fail('A remote Issue contains conflicting stable card IDs.')
        if not identifiers:
            continue
        identifier = identifiers.pop()
        if identifier in indexed:
            fail(f'Duplicate remote Issues found for {identifier}; resolve them before publishing.')
        indexed[identifier] = {**issue, 'body': body, 'url': expected_url}
    return indexed


class GitHubCLI:
    def __init__(self, runner=subprocess.run, *, sleep=time.sleep, clock=time.monotonic):
        self.runner = runner
        self.sleep, self.clock, self.last_write_at = sleep, clock, None

    def _run(self, args, *, mutation=False):
        environment = {**os.environ, 'GH_HOST': 'github.com', 'GH_REPO': REPOSITORY, 'GH_PROMPT_DISABLED': '1'}
        for attempt in range(4):
            try:
                result = self.runner(['gh', *args], capture_output=True, text=True, timeout=120,
                                     env=environment, check=False)
            except (OSError, subprocess.SubprocessError):
                fail('GitHub CLI could not complete the requested operation; check local gh authentication.')
            if result.returncode == 0:
                return result.stdout.strip()
            limited = re.search(r'HTTP\s*429|secondary rate limit|rate limit exceeded|abuse detection',
                                result.stderr or '', re.IGNORECASE)
            if limited:
                if not mutation and attempt < 3:
                    self.sleep(2 ** (attempt + 1))
                    continue
                fail('GitHub rate limit reached; wait before rerunning the importer.')
            fail('GitHub CLI refused the operation; check gh auth status locally. No credentials are printed.')

    def list_issues(self):
        self._run(['auth', 'status', '--hostname', 'github.com'])
        issues = []
        for number in range(1, MAX_ISSUE_PAGES + 1):
            raw = self._run(['api', '--hostname', 'github.com',
                             f'repos/{REPOSITORY}/issues?state=all&per_page={ISSUES_PER_PAGE}'
                             f'&page={number}&sort=created&direction=asc'])
            try:
                page = json.loads(raw)
                if not isinstance(page, list) or len(page) > ISSUES_PER_PAGE or any(not isinstance(issue, dict) for issue in page):
                    raise ValueError()
            except (ValueError, TypeError):
                fail('GitHub CLI returned an invalid Issue page.')
            issues.extend(page)
            if len(page) < ISSUES_PER_PAGE:
                return issues
        fail('Issue pagination exceeded its safe limit; publishing requires a complete remote listing.')

    def _write(self, args, title, body):
        # NamedTemporaryFile is private (0600); argv carries its path, never a
        # shell-interpolated body. It is deleted even when gh rejects the write.
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.md') as file:
            file.write(body)
            file.flush()
            if self.last_write_at is not None:
                delay = max(0, 2 - (self.clock() - self.last_write_at))
                if delay:
                    self.sleep(delay)
            try:
                return self._run(['issue', *args, '--repo', f'github.com/{REPOSITORY}',
                                  '--title', title, '--body-file', file.name], mutation=True)
            finally:
                self.last_write_at = self.clock()

    def create_issue(self, title, body):
        url = self._write(['create'], title, body)
        if not re.fullmatch(re.escape(REPO_URL) + r'/issues/[1-9][0-9]*', url):
            fail('GitHub CLI returned an unexpected created Issue URL; inspect the repository before retrying.')
        return {'number': int(url.rsplit('/', 1)[1]), 'title': title, 'body': body, 'url': url}

    def update_issue(self, number, title, body):
        self._write(['edit', str(number)], title, body)


def synchronize(cards, remote=None, *, apply=False, client=None):
    if apply and (remote is None or client is None):
        fail('Publishing requires an explicit apply flag, live remote state and a GitHub client.')
    if not isinstance(apply, bool):
        fail('Apply mode must be an explicit boolean.')
    by_id = {card['id']: card for card in cards}
    if len(by_id) != len(cards):
        fail('Duplicate local card IDs cannot be published.')
    indexed = issue_index(remote) if remote is not None else {}
    urls = {identifier: issue['url'] for identifier, issue in indexed.items()}
    # Preflight every body/marker before the first remote mutation.
    initial = {card['id']: merge_body(indexed.get(card['id'], {}).get('body', ''), card, urls) for card in cards}
    results = []
    outcomes = {}
    confirmed = []
    for card in cards:
        identifier, title = card['id'], f'[{card["id"]}] {card["title"]}'
        current = indexed.get(identifier)
        action = 'inspect_remote' if remote is None else 'create' if current is None else (
            'update' if current['body'] != initial[identifier] or current['title'] != title else 'unchanged')
        results.append({'id': identifier, 'action': action, 'url': current['url'] if current else None})
        outcomes[identifier] = results[-1]
        if apply and current is None:
            try:
                current = client.create_issue(title, initial[identifier])
            except TrackingError as error:
                raise PublishInterrupted(identifier, confirmed, str(error)) from None
            indexed[identifier], urls[identifier] = current, current['url']
            results[-1]['url'] = current['url']
            confirmed.append({'id': identifier, 'action': 'created', 'url': current['url']})
    if apply:
        # Once all IDs have Issues, resolve links between newly created cards.
        for card in cards:
            current = indexed[card['id']]
            try:
                body, title = merge_body(current['body'], card, urls), f'[{card["id"]}] {card["title"]}'
                if current['body'] != body or current['title'] != title:
                    client.update_issue(current['number'], title, body)
                    if outcomes[card['id']]['action'] != 'create':
                        outcomes[card['id']]['action'] = 'update'
                    confirmed.append({'id': card['id'], 'action': 'updated', 'url': current['url']})
            except TrackingError as error:
                raise PublishInterrupted(card['id'], confirmed, str(error)) from None
    return results


def main(argv=None, *, root=ROOT, client_factory=GitHubCLI, write=print):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Publish/update Issues in the fixed HARBORLIGHT repository.')
    parser.add_argument('--remote-snapshot', type=Path, help='Offline array of remote Issues for a dry-run plan only.')
    parser.add_argument('--json', action='store_true', help='Print a machine-readable plan/result without credentials.')
    args = parser.parse_args(argv)
    try:
        if args.apply and args.remote_snapshot:
            fail('Apply refuses an offline snapshot; it must inspect current Issues through gh.')
        cards = load_cards(root)
        client = client_factory() if args.apply else None
        remote = client.list_issues() if args.apply else read_json(args.remote_snapshot) if args.remote_snapshot else None
        results = synchronize(cards, remote, apply=args.apply, client=client)
        if args.json:
            write(json.dumps({'repository': REPOSITORY, 'apply': args.apply, 'remote_inspected': remote is not None,
                              'cards': results}, ensure_ascii=False, indent=2))
        else:
            write(('APPLY' if args.apply else 'DRY-RUN — no GitHub writes') + f': {len(results)} cards; repository {REPOSITORY}.')
            if remote is None:
                write('Offline plan only: remote duplicates and existing Issues have not been checked.')
            for result in results:
                write(f'{result["id"]}: {result["action"]}' + (f' {result["url"]}' if result['url'] else ''))
        return 0
    except PublishInterrupted as error:
        if args.json:
            write(json.dumps({'repository': REPOSITORY, 'apply': True, 'interrupted': True,
                              'error': str(error), 'confirmed_operations': error.confirmed}, ensure_ascii=False, indent=2))
        else:
            write('ERROR: ' + str(error))
            write(f'Confirmed operations before interruption: {len(error.confirmed)}.')
            for operation in error.confirmed:
                write(f'{operation["id"]}: {operation["action"]} {operation["url"]}')
        return 1
    except TrackingError as error:
        write(json.dumps({'repository': REPOSITORY, 'error': str(error)}, ensure_ascii=False) if args.json else 'ERROR: ' + str(error))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
