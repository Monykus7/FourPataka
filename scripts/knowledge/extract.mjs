import { createRequire } from 'node:module';
import path from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Parser, Language } = require('@vscode/tree-sitter-wasm');
const wasm = path.dirname(require.resolve('@vscode/tree-sitter-wasm'));
let initialization;
const languages = new Map();
export const hash = (text) => createHash('sha256').update(text).digest('hex');
export const codeFile = (file) => /\.(?:[cm]?js|tsx?)$/.test(file);

async function languageFor(file) {
  initialization ??= Parser.init({ locateFile: (name) => path.join(wasm, name) });
  await initialization;
  const kind = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.ts') ? 'typescript' : 'javascript';
  if (!languages.has(kind))
    languages.set(kind, Language.load(path.join(wasm, `tree-sitter-${kind}.wasm`)));
  return languages.get(kind);
}
function walk(node, visit) {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}
function className(node) {
  for (let parent = node.parent; parent; parent = parent.parent)
    if (parent.type === 'class_declaration') return parent.childForFieldName('name')?.text;
  return null;
}
export async function extractCode(file, text) {
  const language = await languageFor(file);
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(text);
  const definitions = [];
  const names = new Set();
  const imports = [];
  walk(tree.rootNode, (node) => {
    if (node.type === 'import_statement') {
      const source = node.childForFieldName('source')?.text.slice(1, -1);
      const bindings = [];
      walk(node, (child) => {
        if (child.type === 'import_specifier')
          bindings.push({
            local: (child.childForFieldName('alias') ?? child.childForFieldName('name')).text,
            imported: child.childForFieldName('name').text,
          });
        else if (child.type === 'identifier' && child.parent.type === 'import_clause')
          bindings.push({ local: child.text, imported: 'default' });
        else if (child.type === 'namespace_import')
          bindings.push({ local: child.namedChildren.at(-1).text, imported: '*' });
      });
      if (source) imports.push({ source, bindings });
    }
    const declaration = [
      'function_declaration',
      'generator_function_declaration',
      'class_declaration',
      'interface_declaration',
      'type_alias_declaration',
      'method_definition',
    ].includes(node.type);
    const value = node.childForFieldName('value');
    const variable =
      node.type === 'variable_declarator' &&
      (['arrow_function', 'function_expression'].includes(value?.type) ||
        ['program', 'export_statement'].includes(node.parent?.parent?.type));
    if (!declaration && !variable) return;
    const nameNode = node.childForFieldName('name');
    if (
      !nameNode ||
      !['identifier', 'type_identifier', 'property_identifier'].includes(nameNode.type)
    )
      return;
    const shortName = nameNode.text;
    const owner = node.type === 'method_definition' ? className(node) : null;
    const name = owner ? `${owner}.${shortName}` : shortName;
    const body = node.childForFieldName('body') ?? value?.childForFieldName('body');
    const signature = text
      .slice(node.startIndex, body?.startIndex ?? Math.min(node.endIndex, node.startIndex + 240))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    const commentAt =
      node.parent?.type === 'export_statement' ? node.parent.startIndex : node.startIndex;
    const before = text.slice(Math.max(0, commentAt - 700), commentAt);
    const comments =
      before.match(/(?:(?:\/\/[^\n]*\n\s*)+|\/\*[\s\S]*?\*\/\s*)$/)?.[0]?.trim() ?? '';
    names.add(nameNode.startIndex);
    definitions.push({
      id: `symbol:${file}:${name}:${node.startPosition.row + 1}`,
      kind: 'symbol',
      name,
      shortName,
      path: file,
      line: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      from: node.startIndex,
      to: node.endIndex,
      signature,
      summary: comments.slice(-600),
      text: node.text.slice(0, 1400),
      exported:
        node.parent?.type === 'export_statement' ||
        node.parent?.parent?.type === 'export_statement',
      defaultExport:
        node.parent?.type === 'export_statement' && /^export\s+default\b/.test(node.parent.text),
    });
  });
  const references = new Map();
  walk(tree.rootNode, (node) => {
    if (
      !['identifier', 'type_identifier', 'property_identifier'].includes(node.type) ||
      names.has(node.startIndex)
    )
      return;
    // Prefer the smallest enclosing definition; never retain WASM node handles in the cache.
    const owner =
      definitions
        .filter((d) => d.from <= node.startIndex && d.to >= node.endIndex)
        .sort((a, b) => a.to - a.from - (b.to - b.from))[0]?.id ?? `file:${file}`;
    const key = `${owner}\0${node.text}`;
    const previous = references.get(key);
    references.set(key, {
      owner,
      name: node.text,
      count: (previous?.count ?? 0) + 1,
      line: previous?.line ?? node.startPosition.row + 1,
    });
  });
  const result = {
    definitions,
    references: [...references.values()],
    imports,
    parseErrors: tree.rootNode.hasError,
  };
  tree.delete();
  parser.delete();
  return result;
}

export function extractDocument(file, text) {
  const lines = text.split('\n');
  const sections = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) fenced = !fenced;
    const heading = !fenced && /^(#{1,6})\s+(.+)$/.exec(lines[i]);
    if (heading) sections.push({ name: heading[2], line: i + 1, level: heading[1].length });
  }
  return sections.map((section, i) => {
    const endLine = (sections[i + 1]?.line ?? lines.length + 1) - 1;
    const body = lines.slice(section.line, endLine).join('\n');
    return {
      id: `doc:${file}:${section.line}`,
      kind: file === 'BUILD_PLAN.md' ? 'plan' : /decision/i.test(section.name) ? 'decision' : 'doc',
      path: file,
      ...section,
      endLine,
      summary: body
        .replace(/```[\s\S]*?```/g, '')
        .trim()
        .slice(0, 900),
      text: body.slice(0, 1600),
    };
  });
}
