#!/usr/bin/env python3
"""Render the reviewed plain Markdown legal drafts as accessible static pages."""
from html import escape
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = [('TERMS-DRAFT.pl.md', 'harborlight-terms.html', 'Regulamin gry HARBORLIGHT'),
             ('PRIVACY-DRAFT.pl.md', 'harborlight-privacy.html', 'Polityka prywatności HARBORLIGHT')]
VERSION = '2026-10-31-draft3'


def inline(text):
    output = escape(text)
    return re.sub(r'https://[^\s<]+', lambda m: '<a href="'+m[0].rstrip('.')+'">'+m[0].rstrip('.')+'</a>'+('.' if m[0].endswith('.') else ''), output)


def render(markdown, title):
    blocks = []
    for block in markdown.strip().split('\n\n'):
        block = block.strip()
        if block.startswith('# '):
            blocks.append('<h1>'+inline(block[2:])+'</h1>')
        elif block.startswith('## '):
            blocks.append('<h2>'+inline(block[3:])+'</h2>')
        else:
            cls = ' class="legal-draft"' if block.startswith('DOKUMENT ROBOCZY') else ' class="legal-version"' if block.startswith('Wersja:') else ''
            blocks.append('<p'+cls+'>'+inline(block.replace('\n',' '))+'</p>')
    return '<!doctype html>\n<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>'+escape(title)+'</title><link rel="stylesheet" href="harborlight-legal.css?v=legal-v3"></head>\n<body><main data-legal-version="'+VERSION+'"><nav aria-label="Dokumenty gry"><a href="harborlight-auth.html?mode=register">Rejestracja i logowanie</a><a href="harborlight-terms.html">Regulamin</a><a href="harborlight-privacy.html">Polityka prywatności</a></nav>\n'+'\n'.join(blocks)+'\n<p class="legal-footer">HARBORLIGHT · Dokument do przeglądu właściciela · Możesz zapisać lub wydrukować tę stronę funkcjami przeglądarki.</p></main></body></html>\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for source, target, title in DOCUMENTS:
        markdown = (ROOT/'docs'/source).read_text()
        if 'Wersja: '+VERSION not in markdown:
            raise SystemExit('Legal version mismatch: '+source)
        expected = render(markdown,title)
        output = ROOT/target
        if args.check:
            if not output.is_file() or output.read_text()!=expected:raise SystemExit('Regenerate stale legal page: '+target)
        else:output.write_text(expected)
    print('Legal static pages match versioned source drafts.')

if __name__ == '__main__':main()
