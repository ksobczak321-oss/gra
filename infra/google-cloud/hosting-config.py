#!/usr/bin/env python3
"""Generate environment-specific Hosting routing without changing frontend bytes."""
import argparse
import copy
import json
from pathlib import Path

SERVICES = {'harborlight-dev': 'harborlight-api-dev', 'harborlight-prod': 'harborlight-api-prod'}
REGION = 'europe-central2'


def hosting_config(base, project, service, region, public_directory):
    if project not in SERVICES or service != SERVICES[project] or region != REGION:
        raise ValueError('Hosting routing must use the matching isolated project/service in Warsaw.')
    if not isinstance(base, dict) or not isinstance(base.get('hosting'), dict):
        raise ValueError('A single explicit Hosting configuration is required.')
    result = copy.deepcopy(base)
    hosting = result['hosting']
    if hosting.get('target') != 'game' or hosting.get('public') != 'build/frontend':
        raise ValueError('The reviewed game target and frontend directory are required.')
    if hosting.get('rewrites'):
        raise ValueError('Unexpected source rewrites; review them before generating routing.')
    public = Path(public_directory).resolve()
    if not public.is_dir() or not (public / 'release.json').is_file():
        raise ValueError('Build or extract the verified frontend before configuring Hosting.')
    # --config is written outside the project. An explicit site and absolute
    # directory avoid relying on .firebaserc discovery relative to that file.
    hosting.pop('target')
    hosting['site'] = project
    hosting['public'] = str(public)
    hosting['rewrites'] = [{'source': '/api/**', 'run': {'serviceId': service, 'region': region}}]
    hosting.setdefault('headers', []).append({'source': '/api/**', 'headers': [{'key': 'Cache-Control', 'value': 'no-store'}]})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('firebase.json'))
    parser.add_argument('--project', required=True, choices=SERVICES)
    parser.add_argument('--service', required=True)
    parser.add_argument('--region', default=REGION)
    parser.add_argument('--public', type=Path, default=Path('build/frontend'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        output = args.output.resolve()
        public = args.public.resolve()
        if output.is_relative_to(public):
            raise ValueError('Deployment configuration must stay outside the public frontend.')
        config = hosting_config(json.loads(args.source.read_text(encoding='utf-8')), args.project, args.service, args.region, public)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps({'project': args.project, 'service': args.service, 'output': str(args.output)}))


if __name__ == '__main__':
    main()
