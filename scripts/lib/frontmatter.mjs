// Minimal YAML-subset frontmatter parser: scalars, quoted strings, booleans, inline lists,
// block lists, nested maps, plain-scalar continuation lines and folded/literal block scalars.

function scalar(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((x) => scalar(x)) : [];
  }
  return v;
}

const KEY = /^([A-Za-z0-9_.-]+)\s*:(?:\s+(.*))?$/;

function parseMap(items, start, indent) {
  const data = {};
  let i = start;
  while (i < items.length) {
    const { indent: ind, text, n } = items[i];
    if (ind < indent) break;
    if (ind > indent) throw new Error(`Unexpected indentation on frontmatter line ${n}`);
    const m = KEY.exec(text);
    if (!m) throw new Error(`Invalid frontmatter line ${n}: "${text}"`);
    const key = m[1];
    const rest = (m[2] ?? '').trim();
    i++;
    if (/^[>|][-+]?$/.test(rest)) {
      const block = [];
      while (i < items.length && items[i].indent > indent) block.push(items[i++].text);
      data[key] = block.join(rest.startsWith('>') ? ' ' : '\n');
    } else if (rest === '') {
      const next = items[i];
      if (next && (next.indent > indent || (next.indent === indent && next.text.startsWith('- ')))) {
        if (next.text.startsWith('- ')) {
          const list = [];
          while (i < items.length && items[i].indent === next.indent && items[i].text.startsWith('- ')) list.push(scalar(items[i++].text.slice(2)));
          data[key] = list;
        } else {
          [data[key], i] = parseMap(items, i, next.indent);
        }
      } else {
        data[key] = '';
      }
    } else {
      let value = rest;
      while (i < items.length && items[i].indent > indent) value += ` ${items[i++].text}`;
      data[key] = scalar(value);
    }
  }
  return [data, i];
}

function parseYaml(src) {
  const items = [];
  src.split(/\r?\n/).forEach((line, idx) => {
    const text = line.trim();
    if (text && !text.startsWith('#')) items.push({ indent: line.length - line.trimStart().length, text, n: idx + 1 });
  });
  return items.length ? parseMap(items, 0, items[0].indent)[0] : {};
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { data: {}, body: text };
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(text);
  if (!m) throw new Error('Unterminated frontmatter block');
  return { data: parseYaml(m[1]), body: m[2] ?? '' };
}
