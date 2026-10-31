#!/usr/bin/env python3
"""Isolated publication tests: no network, token lookup, real gh or Issues."""
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('tracking_issues', ROOT / 'scripts/publish_tracking_issues.py')
tracking = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tracking)


def fixture(root):
    paths = {'docs/tracking/changes/HL-CHG-0001.md': '# Naprawiona historyczna zmiana\n\n[Scenariusz](../../testing/manual/HL-TC-0001.md).\n',
             'docs/testing/manual/HL-TC-0001.md': '# Ręczny przypadek\n\nWynik: NOT RUN. [Zmiana](../../tracking/changes/HL-CHG-0001.md).\n'}
    for path, body in paths.items():
        destination = root / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(body)
    changes = {'schema_version': 1, 'epics': [{'id': 'HL-EPIC-UI', 'title': 'Interfejs'}], 'changes': [{
        'id': 'HL-CHG-0001', 'title': 'Naprawiona historyczna zmiana', 'type': 'Bug', 'epic': 'HL-EPIC-UI',
        'status': {'implementation': 'DONE', 'dev': 'PASS', 'ci': 'PASS', 'preprod': 'PUBLISHED', 'prod': 'NOT_PUBLISHED'},
        'related_changes': [], 'supersedes': [], 'superseded_by': []}]}
    tests = {'schema_version': 1, 'cases': [{'id': 'HL-TC-0001', 'title': 'Ręczny przypadek',
        'definition_status': 'READY', 'manual_result': 'NOT RUN', 'changes': ['HL-CHG-0001'],
        'file': 'manual/HL-TC-0001.md'}]}
    for path, value in zip(tracking.MANIFESTS, (changes, tests)):
        (root / path).write_text(json.dumps(value))
    return changes, tests


class FakeGitHub:
    def __init__(self, issues=()):
        self.issues, self.operations, self.reads = copy.deepcopy(list(issues)), [], 0
        self.fail_after_create = None

    def list_issues(self):
        self.reads += 1
        return copy.deepcopy(self.issues)

    def create_issue(self, title, body):
        number = max([issue['number'] for issue in self.issues] + [0]) + 1
        issue = {'number': number, 'title': title, 'body': body,
                 'url': f'{tracking.REPO_URL}/issues/{number}', 'state': 'OPEN'}
        self.issues.append(issue)
        self.operations.append(('create', number))
        if self.fail_after_create == len([entry for entry in self.operations if entry[0] == 'create']):
            raise tracking.TrackingError('Simulated uncertain mutation result.')
        return copy.deepcopy(issue)

    def update_issue(self, number, title, body):
        issue = next(issue for issue in self.issues if issue['number'] == number)
        issue.update(title=title, body=body)
        self.operations.append(('update', number))


class TrackingTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.changes, self.tests = fixture(self.root)
        self.cards = tracking.load_cards(self.root)

    def test_default_dry_run_never_constructs_a_github_client_or_writes(self):
        output = []
        def forbidden():
            self.fail('Dry-run must not inspect credentials, invoke gh or connect to GitHub')
        self.assertEqual(tracking.main([], root=self.root, client_factory=forbidden, write=output.append), 0)
        self.assertIn('DRY-RUN', output[0])
        self.assertTrue(any('inspect_remote' in line for line in output))
        self.assertFalse(any('create https://' in line for line in output))

    def test_two_namespaces_have_separate_issues_and_stable_native_links(self):
        github = FakeGitHub()
        results = tracking.synchronize(self.cards, [], apply=True, client=github)
        self.assertEqual([value['action'] for value in results], ['create', 'create'])
        self.assertEqual(len(github.issues), 2)
        change, case = github.issues
        self.assertIn('[HL-CHG-0001]', change['title'])
        self.assertIn('[HL-TC-0001]', case['title'])
        self.assertIn(f'[HL-TC-0001]({case["url"]})', change['body'])
        self.assertIn(f'[HL-CHG-0001]({change["url"]})', case['body'])
        self.assertIn('**TestCase**', case['body'])
        self.assertIn('NOT RUN', case['body'])
        self.assertIn('HL-EPIC-UI', change['body'])
        self.assertIn('DONE', change['body'])
        self.assertTrue(all(issue['state'] == 'OPEN' for issue in github.issues))

    def test_second_apply_and_offline_plan_are_idempotent(self):
        github = FakeGitHub()
        tracking.synchronize(self.cards, [], apply=True, client=github)
        previous = copy.deepcopy(github.operations)
        plan = tracking.synchronize(self.cards, github.list_issues())
        self.assertTrue(all(value['action'] == 'unchanged' for value in plan))
        tracking.synchronize(self.cards, github.list_issues(), apply=True, client=github)
        self.assertEqual(github.operations, previous)

    def test_all_duplicate_remote_ids_are_rejected_before_any_write(self):
        marker = '<!-- harborlight-tracking:HL-CHG-0001 -->'
        github = FakeGitHub([{'number': 4, 'title': 'Renamed by a human', 'body': marker},
                             {'number': 9, 'title': '[HL-CHG-0001] Historical card', 'body': ''}])
        with self.assertRaisesRegex(tracking.TrackingError, 'Duplicate remote'):
            tracking.synchronize(self.cards, github.list_issues(), apply=True, client=github)
        self.assertEqual(github.operations, [])

    def test_conflicting_markers_and_foreign_repository_cannot_be_adopted(self):
        for issue in [
            {'number': 1, 'title': '[HL-CHG-0001] A', 'body': '<!-- harborlight-tracking:HL-TC-0001 -->'},
            {'number': 1, 'title': '[HL-CHG-0001] A', 'body': '', 'url': 'https://github.com/other/repo/issues/1'}
        ]:
            github = FakeGitHub([issue])
            with self.assertRaises(tracking.TrackingError):
                tracking.synchronize(self.cards, github.list_issues(), apply=True, client=github)
            self.assertEqual(github.operations, [])

    def test_missing_apply_wrong_repository_and_snapshot_apply_are_rejected(self):
        with self.assertRaises(tracking.TrackingError):
            tracking.synchronize(self.cards, [], apply=True)
        with self.assertRaises(tracking.TrackingError):
            tracking.synchronize(self.cards, [], apply='true', client=FakeGitHub())
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                tracking.main(['--repo', 'other/repo'], root=self.root)
        self.assertEqual(error.exception.code, 2)
        called, output = [], []
        result = tracking.main(['--apply', '--remote-snapshot', 'unused.json'], root=self.root,
                               client_factory=lambda: called.append(True), write=output.append)
        self.assertEqual(result, 1)
        self.assertEqual(called, [])

    def test_only_managed_content_changes_and_closed_state_is_preserved(self):
        github = FakeGitHub()
        tracking.synchronize(self.cards, [], apply=True, client=github)
        issue = github.issues[0]
        prefix, suffix = 'Human notes BEFORE\n\n', '\n\nNotes: `$(do not run)`\nHL-TC-0001 is only a reference.\n'
        issue['body'] = prefix + issue['body'] + suffix
        issue['state'] = 'CLOSED'
        self.cards[0]['markdown'] += '\nUpdated acceptance criteria.\n'
        tracking.synchronize(self.cards, github.list_issues(), apply=True, client=github)
        self.assertTrue(issue['body'].startswith(prefix))
        self.assertTrue(issue['body'].endswith(suffix))
        self.assertIn('Updated acceptance criteria.', issue['body'])
        self.assertEqual(issue['state'], 'CLOSED')

    def test_legacy_body_is_preserved_and_broken_regions_stop_before_creates(self):
        card = self.cards[0]
        notes = 'Existing human-only description\nwith two newlines.\n'
        merged = tracking.merge_body(notes, card, {})
        self.assertTrue(merged.endswith(notes))
        malformed = {'number': 1, 'title': '[HL-CHG-0001] A',
                     'body': '<!-- harborlight-managed:HL-CHG-0001:begin -->\nNo end'}
        github = FakeGitHub([malformed])
        with self.assertRaisesRegex(tracking.TrackingError, 'managed-region'):
            tracking.synchronize(self.cards, github.list_issues(), apply=True, client=github)
        self.assertEqual(github.operations, [])

    def test_relative_card_links_resolve_to_git_files_not_issue_relative_urls(self):
        body = tracking.managed_region(self.cards[1], {})
        self.assertIn(f'{tracking.REPO_URL}/blob/main/docs/tracking/changes/HL-CHG-0001.md', body)
        self.assertNotIn('](../../', body)
        with self.assertRaises(tracking.TrackingError):
            tracking.source_links('[escape](../../../../private)', self.cards[0]['path'])

    def test_manifest_guards_duplicate_ids_unknown_relations_and_escaped_files(self):
        for change in ('duplicate', 'unknown', 'path'):
            fixture(self.root)
            if change == 'duplicate':
                manifest = copy.deepcopy(self.changes)
                manifest['changes'].append(copy.deepcopy(manifest['changes'][0]))
                (self.root / tracking.MANIFESTS[0]).write_text(json.dumps(manifest))
            else:
                manifest = copy.deepcopy(self.tests)
                manifest['cases'][0]['changes' if change == 'unknown' else 'file'] = ['HL-CHG-9999'] if change == 'unknown' else '../../../private.md'
                (self.root / tracking.MANIFESTS[1]).write_text(json.dumps(manifest))
            with self.assertRaises(tracking.TrackingError):
                tracking.load_cards(self.root)

    def test_pull_requests_are_ignored_without_reusing_their_number(self):
        pr = {'number': 1, 'title': '[HL-CHG-0001] PR', 'body': '', 'pull_request': {}}
        self.assertEqual(tracking.issue_index([pr]), {})

    def test_cli_body_file_is_private_literal_and_deleted_without_shell_or_state_mutation(self):
        calls, paths = [], []
        literal = 'Multiline\n`backticks` $(substitution) $TOKEN & quotes " and \'\n'
        def runner(command, **options):
            calls.append((command, options))
            path = Path(command[command.index('--body-file') + 1])
            paths.append(path)
            self.assertEqual(path.read_text(), literal)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertNotIn(literal, command)
            self.assertNotIn('--body', command)
            self.assertNotIn('--state', command)
            self.assertFalse(options.get('shell', False))
            self.assertEqual(command[command.index('--repo') + 1], 'github.com/' + tracking.REPOSITORY)
            self.assertEqual(options['env']['GH_HOST'], 'github.com')
            return SimpleNamespace(returncode=0, stdout=tracking.REPO_URL + '/issues/12', stderr='')
        github = tracking.GitHubCLI(runner, sleep=lambda delay: None, clock=lambda: 0)
        self.assertEqual(github.create_issue('[HL-CHG-0001] $literal', literal)['number'], 12)
        github.update_issue(12, '[HL-CHG-0001] $literal', literal)
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(not path.exists() for path in paths))

    def test_cli_reads_all_states_and_pages_in_the_fixed_repository(self):
        commands = []
        pages = [[{'number': number, 'title': 'A', 'body': '', 'state': 'closed'} for number in range(1, 101)],
                 [{'number': 101, 'title': 'B', 'body': '', 'state': 'open'},
                  {'number': 102, 'title': 'C', 'body': '', 'state': 'closed'}]]
        def runner(command, **options):
            commands.append(command)
            if command[1] != 'api':
                return SimpleNamespace(returncode=0, stdout='', stderr='')
            page = len([entry for entry in commands if entry[1] == 'api'])
            return SimpleNamespace(returncode=0, stdout=json.dumps(pages[page - 1]), stderr='')
        result = tracking.GitHubCLI(runner).list_issues()
        self.assertEqual(len(result), 102)
        self.assertEqual([issue['number'] for issue in result], list(range(1, 103)))
        self.assertEqual(len(commands), 3, 'The short second page must terminate pagination')
        for number, command in enumerate(commands[1:], 1):
            self.assertEqual(command[-1], 'repos/' + tracking.REPOSITORY +
                             f'/issues?state=all&per_page=100&page={number}&sort=created&direction=asc')
            self.assertNotIn('--slurp', command)
        self.assertFalse(any('issue' in command for command in commands))

    def test_invalid_issue_page_stops_before_publication(self):
        for raw in ['{}', 'invalid-json', '[null]', json.dumps([{}] * 101)]:
            commands = []
            def runner(command, **options):
                commands.append(command)
                return SimpleNamespace(returncode=0, stdout=raw if command[1] == 'api' else '', stderr='')
            with self.assertRaisesRegex(tracking.TrackingError, 'invalid Issue page'):
                tracking.GitHubCLI(runner).list_issues()
            self.assertEqual(len(commands), 2)
            self.assertFalse(any(command[1] == 'issue' for command in commands))

    def test_full_pages_at_safe_limit_do_not_produce_an_incomplete_publish_plan(self):
        commands = []
        def runner(command, **options):
            commands.append(command)
            return SimpleNamespace(returncode=0, stdout=json.dumps([{}] * 100) if command[1] == 'api' else '', stderr='')
        with patch.object(tracking, 'MAX_ISSUE_PAGES', 2):
            with self.assertRaisesRegex(tracking.TrackingError, 'complete remote listing'):
                tracking.GitHubCLI(runner).list_issues()
        self.assertEqual(len([command for command in commands if command[1] == 'api']), 2)

    def test_rate_limited_reads_back_off_but_uncertain_creates_never_retry_or_echo_secrets(self):
        calls, sleeps = [], []
        def runner(command, **options):
            calls.append(command)
            if command[1] == 'auth':
                return SimpleNamespace(returncode=0, stdout='', stderr='')
            if len([entry for entry in calls if entry[1] == 'api']) <= 2:
                return SimpleNamespace(returncode=1, stdout='', stderr='HTTP 429 secondary rate limit PRIVATE-TOKEN')
            return SimpleNamespace(returncode=0, stdout='[]', stderr='')
        client = tracking.GitHubCLI(runner, sleep=sleeps.append)
        self.assertEqual(client.list_issues(), [])
        self.assertEqual(sleeps, [2, 4])
        read_attempts = [command for command in calls if command[1] == 'api']
        self.assertEqual(len(read_attempts), 3)
        self.assertTrue(all(command == read_attempts[0] for command in read_attempts), 'Only the same failed read page is retried')
        writes = []
        def reject(command, **options):
            writes.append(command)
            return SimpleNamespace(returncode=1, stdout='', stderr='HTTP 429 secondary rate limit PRIVATE-TOKEN')
        with self.assertRaises(tracking.TrackingError) as error:
            tracking.GitHubCLI(reject).create_issue('[HL-CHG-0001] A', 'Body')
        self.assertEqual(len(writes), 1)
        self.assertNotIn('PRIVATE-TOKEN', str(error.exception))

    def test_mutations_are_serially_paced(self):
        clock, sleeps = [0], []
        def sleep(delay):
            sleeps.append(delay)
            clock[0] += delay
        counter = [0]
        def runner(command, **options):
            counter[0] += 1
            return SimpleNamespace(returncode=0, stdout=tracking.REPO_URL + '/issues/' + str(counter[0]), stderr='')
        client = tracking.GitHubCLI(runner, sleep=sleep, clock=lambda: clock[0])
        for _ in range(3):
            client.create_issue('[HL-CHG-0001] A', 'Body')
        self.assertEqual(sleeps, [2, 2])

    def test_partial_uncertain_create_is_reported_and_rerun_recovers_without_duplicates(self):
        github, output = FakeGitHub(), []
        github.fail_after_create = 2
        status = tracking.main(['--apply', '--json'], root=self.root,
                               client_factory=lambda: github, write=output.append)
        self.assertEqual(status, 1)
        report = json.loads(output[0])
        self.assertTrue(report['interrupted'])
        self.assertEqual(len(report['confirmed_operations']), 1)
        self.assertIn('may have succeeded', report['error'])
        self.assertEqual(len(github.issues), 2)
        github.fail_after_create = None
        output.clear()
        self.assertEqual(tracking.main(['--apply', '--json'], root=self.root,
                                      client_factory=lambda: github, write=output.append), 0)
        self.assertEqual(len(github.issues), 2)
        self.assertEqual(len([call for call in github.operations if call[0] == 'create']), 2)
        self.assertEqual(github.reads, 2)


if __name__ == '__main__':
    unittest.main()
