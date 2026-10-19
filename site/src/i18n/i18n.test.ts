import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { en } from './en';
import { t, type MessageKey } from './index';

const SRC = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
const sourceFiles = walk(SRC).filter(
  (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes('test-'),
);
const componentFiles = sourceFiles.filter((f) => f.endsWith('.tsx') && !f.endsWith('main.tsx'));

describe('t()', () => {
  it('interpolates placeholders and leaves unknown ones untouched', () => {
    expect(t('card.basketAddTitle', { plugin: 'alpha' })).toBe('Add alpha to basket');
    expect(t('basket.empty')).toContain('“+ Basket”');
    expect(t('card.byline', { plugin: 'a' })).toBe('a · {author}');
  });
  it('picks the plural form from count', () => {
    expect(t('search.count', { count: 1 })).toBe('1 artifact');
    expect(t('search.count', { count: 0 })).toBe('0 artifacts');
    expect(t('search.count', { count: 7 })).toBe('7 artifacts');
  });
  it('returns the key for an unknown message instead of crashing', () => {
    expect(t('no.such.key' as MessageKey)).toBe('no.such.key');
  });
});

describe('translations live in one file', () => {
  it('has no literal UI text in components', () => {
    const textAttrs = new Set(['aria-label', 'placeholder', 'title', 'alt', 'label']);
    // Identifiers of keyboard keys, not UI text.
    const notText = new Set(['Escape', 'Enter', 'Tab', 'ArrowDown', 'ArrowUp']);
    const looksLikeText = (s: string) => /^[A-Z][a-z]/.test(s.trim()) && !notText.has(s.trim());
    const violations: string[] = [];

    for (const file of componentFiles) {
      const sf = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const report = (node: ts.Node, what: string) => {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        violations.push(`${file.replace(SRC, 'src')}:${line + 1} ${what}`);
      };
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) report(node, `JSX text "${node.text.trim()}"`);
        else if (
          ts.isJsxAttribute(node) &&
          textAttrs.has(node.name.getText()) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer)
        )
          report(node, `${node.name.getText()}="${node.initializer.text}"`);
        else if (
          (ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            ts.isTemplateHead(node) ||
            ts.isTemplateMiddle(node) ||
            ts.isTemplateTail(node)) &&
          !ts.isImportDeclaration(node.parent) &&
          !ts.isJsxAttribute(node.parent) &&
          looksLikeText(node.text)
        )
          report(node, `string "${node.text}"`);
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(violations).toEqual([]);
  });

  it('has no unused messages', () => {
    const source = sourceFiles
      .filter((f) => !f.includes('/i18n/'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    // Keys built from a variable (kinds.plural.${kind}, card.field.${f}) are matched by their prefix.
    const dynamicPrefixes = ['kinds.singular.', 'kinds.plural.', 'card.field.'];
    const flat = (obj: object, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'string' || ('one' in v && 'other' in v)
          ? [prefix + k]
          : flat(v as object, `${prefix}${k}.`),
      );
    const unused = flat(en).filter((key) => {
      const prefix = dynamicPrefixes.find((p) => key.startsWith(p));
      return prefix ? !source.includes(`${prefix}\${`) : !source.includes(`'${key}'`);
    });
    expect(unused).toEqual([]);
  });
});
