#!/usr/bin/env python3
"""Generate non-secret Cloud Run settings. Account API stays off by default."""
import argparse
import json
from pathlib import Path
import re

PROJECTS = {'harborlight-dev': 'development', 'harborlight-prod': 'production'}


def enabled_flag(value):
    if str(value).lower() in ('true', '1'):
        return True
    if str(value).lower() in ('false', '0', ''):
        return False
    raise ValueError('Account API enablement must be true/false or 1/0.')


def runtime_config(project, release, account_api_enabled=False):
    if project not in PROJECTS:
        raise ValueError('Only the isolated HARBORLIGHT projects are supported.')
    if not isinstance(release, str) or not re.fullmatch(r'[a-f0-9]{40}', release):
        raise ValueError('A full immutable source commit SHA is required.')
    enabled = enabled_flag(account_api_enabled)
    result = {'HARBORLIGHT_ENV': PROJECTS[project], 'HARBORLIGHT_RELEASE': release}
    if enabled:
        result.update(HARBORLIGHT_ACCOUNT_API='1', HARBORLIGHT_PROJECT_ID=project)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, choices=PROJECTS)
    parser.add_argument('--release', required=True)
    parser.add_argument('--account-api-enabled', default='false')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        config = runtime_config(args.project, args.release, args.account_api_enabled)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps({'project': args.project, 'account_api_enabled': config.get('HARBORLIGHT_ACCOUNT_API') == '1', 'output': str(args.output)}))


if __name__ == '__main__':
    main()
