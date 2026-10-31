#!/usr/bin/env python3
"""Validate generated print geometry/checksums; does not replace physical playtesting."""
from pathlib import Path
import hashlib,json,zipfile
from pypdf import PdfReader
p=Path(__file__).resolve().parent
m=json.loads((p/'manifest.json').read_text())
assert m['onlineIntegration'] is False and m['physicalPlaytested'] is False
sizes={'HARBORLIGHT-plansza-A3.pdf':(1,297,420),'HARBORLIGHT-plansza-A4-kafelki.pdf':(4,210,297),'HARBORLIGHT-karty-24-dupleks-A4.pdf':(6,210,297),'HARBORLIGHT-pionki-i-zetony-A4.pdf':(2,210,297),'HARBORLIGHT-pudelko-A4.pdf':(2,297,210),'HARBORLIGHT-etykieta-QR-A4.pdf':(1,210,297)}
for f in m['files']:
 b=(p/f['path']).read_bytes();assert len(b)==f['bytes'];assert hashlib.sha256(b).hexdigest()==f['sha256']
 if f['path'].endswith('.pdf'):
  reader=PdfReader(p/f['path']);assert b'/FontFile2' in b,'Polish font must be embedded'
  if Path(f['path']).name in sizes:
   pages,w,h=sizes[Path(f['path']).name];assert len(reader.pages)==pages
   for page in reader.pages:
    assert abs(float(page.mediabox.width)*25.4/72-w)<.01
    assert abs(float(page.mediabox.height)*25.4/72-h)<.01
  assert all(page.extract_text().strip() for page in reader.pages)
qrurl=json.loads((p/'scenariusz.json').read_text())['qrUrl'];assert qrurl==m['qrUrl']
with zipfile.ZipFile(p/'HARBORLIGHT-do-druku.zip') as z:
 assert z.testzip() is None
 assert {'telefon.html','README.md','scenariusz.json','manifest.json'}<=set(z.namelist())
 for f in m['files']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
print('PASS: print dimensions/page counts, embedded Polish fonts, checksums, ZIP contents/CRC, QR destination metadata.')
