"""Read-only acceptance of the real shipped atlas/scene contract.

Legacy releases retain their own four-patch checks. From 0.15.2.0 onward a
disabled/missing catalog is a failure, never a reason to skip the new artwork.
"""
import json
from pathlib import Path
import re

IDS = {'townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse',
       'bakery','dairy','slaughterhouse','fisher','leatherworks','academy',
       'barracks','chapel','lighthouse','theatre','market','dock'}


def staged_manifest(root):
    root = Path(root)
    version = re.search(r"GAME_VERSION\s*=\s*['\"]([\d.]+)", (root/'harborlight-version.js').read_text()).group(1)
    required = tuple(map(int, version.split('.'))) >= (0,15,2,0)
    path = root/'assets/building-upgrades-v1/manifest.json'
    value = json.loads(path.read_text()) if path.exists() else None
    if required:
        assert value and value.get('enabled') is True, 'This release requires the complete new building catalog'
    if not value or value.get('enabled') is not True:
        return None
    assert value['version'] == 1 and set(value['buildings']) == IDS
    assert len(value['decorations']) >= 1
    assert all(len(v['frameRects']) == len(v['bboxes']) == 10 for v in value['buildings'].values())
    return value


def frame(manifest, identity, level):
    index = min(9,max(0,(max(1,int(level))-1)//2))
    family = manifest['buildings'][identity]
    rect,bbox = family['frameRects'][index],family['bboxes'][index]
    if family.get('sprites'):
        # Standalone frames preserve the atlas pixels, with a local origin.
        sprite=family['sprites'][index]
        return index+1,sprite['src'],[bbox[0],bbox[1],bbox[2],bbox[3]]
    return index+1,family['src'],[rect[0]+bbox[0],rect[1]+bbox[1],bbox[2],bbox[3]]


def assert_art(node, manifest, identity, level):
    stage,src,view = frame(manifest,identity,level)
    assert node.evaluate('n=>getComputedStyle(n).backgroundImage') == 'none', (identity,'Old map background leaks through transparent upgraded art')
    assert node.get_attribute('data-map-art-source') == 'building-stages', identity
    assert node.get_attribute('data-building-stage') == str(stage), (identity,level)
    assert node.locator('svg').get_attribute('preserveAspectRatio') == 'xMidYMid meet', identity
    assert [float(n) for n in node.locator('svg').get_attribute('viewBox').split()] == view, (identity,level,view)
    assert node.locator('svg image').get_attribute('href') == src, identity
    assert json.loads(node.get_attribute('data-map-art-rect')) == view, identity


def assert_scene(page, manifest):
    scene=page.locator('[data-building-stage-scene]')
    assert scene.count() == 1
    nodes=scene.locator('[data-building-stage-map]:not([data-building-stage-decoration])')
    assert nodes.count() == 20
    assert set(nodes.evaluate_all('ns=>ns.map(n=>n.dataset.mapBuildingArt)')) == IDS
    assert page.locator('[data-accepted-artwork]').count() == 0, 'Old building patches must not paint over new levels'
    assert scene.evaluate('n=>getComputedStyle(n).pointerEvents') == 'none'
    townhall_level=int(scene.locator('[data-building-stage-map="townhall"]').get_attribute('data-level'))
    assert int(scene.locator('[data-building-stage-map="theatre"]').get_attribute('data-level')) == townhall_level, 'The one-level Theatre follows Town Hall visually without an economic upgrade'
    for node in nodes.all():
        identity=node.get_attribute('data-map-building-art')
        assert_art(node,manifest,identity,int(node.get_attribute('data-level')))
        assert node.evaluate('n=>getComputedStyle(n).pointerEvents') == 'none'
    decorations=scene.locator('[data-building-stage-decoration]')
    assert decorations.count() == len(manifest['decorations'])
    for node in decorations.all():
        assert int(node.get_attribute('data-level')) == townhall_level
        assert_art(node,manifest,node.get_attribute('data-map-building-art'),townhall_level)
        assert node.locator('button,a,[tabindex],.world-hotspot').count() == 0
    return {'families':20,'variants':200,'decoration_follows_townhall':True,'old_patches':0}
