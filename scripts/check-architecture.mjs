/**
 * [INPUT]: src 的 TypeScript AST、目录地图与工程配置。
 * [OUTPUT]: 模块边界（含 features 的 common/pc/m 隔离）、循环依赖、文件契约和控制流格式检查结果。
 * [POS]: 本地架构检查；使用现有 TypeScript，无额外运行依赖。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';

const root = resolve('src');
const files = readdirSync(root, { recursive: true }).filter((file) => /\.tsx?$/.test(file));
const graph = new Map();
const failures = [];
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
const { options } = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd());
const report = (file, message) => failures.push(`${file}: ${message}`);

for (const file of files) {
  const absolute = resolve(root, file);
  const source = readFileSync(absolute, 'utf8');
  const tree = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true);
  const imports = [];
  graph.set(absolute, imports);
  if (source.split('\n').length > 801) report(file, '文件超过 800 行，请按职责拆分');
  for (const contract of ['INPUT', 'OUTPUT', 'POS', 'PROTOCOL']) {
    if (!source.slice(0, 1600).includes(`[${contract}]:`)) report(file, `缺少 ${contract} 契约`);
  }
  if (!existsSync(resolve(dirname(absolute), 'CLAUDE.md'))) report(file, '缺少同目录 CLAUDE.md');

  function visit(node) {
    if (ts.isIfStatement(node)) {
      if (!ts.isBlock(node.thenStatement)) report(file, 'if 分支必须使用花括号');
      if (
        node.elseStatement &&
        !ts.isBlock(node.elseStatement) &&
        !ts.isIfStatement(node.elseStatement)
      )
        report(file, 'else 分支必须使用花括号');
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const name = node.moduleSpecifier.text;
      const target = ts.resolveModuleName(name, absolute, options, ts.sys).resolvedModule
        ?.resolvedFileName;
      if (target?.startsWith(root + '/')) {
        const imported = relative(root, target);
        if (/^(features|ui|shared)\//.test(file) && imported.startsWith('server/'))
          report(file, '浏览器/公共层不得导入 server');
        if (file.startsWith('shared/') && /^(features|ui|app)\//.test(imported))
          report(file, 'shared 不得依赖运行时或 UI');
        if (file.startsWith('ui/') && /^(features|app)\//.test(imported))
          report(file, '公共 UI 不得依赖业务页面');
        if (file.startsWith('features/common/') && /^features\/(pc|m)\//.test(imported))
          report(file, 'features/common 不得依赖 pc/ 或 m/ 视图');
        if (file.startsWith('features/pc/') && imported.startsWith('features/m/'))
          report(file, 'pc/ 与 m/ 视图互不导入');
        if (file.startsWith('features/m/') && imported.startsWith('features/pc/'))
          report(file, 'pc/ 与 m/ 视图互不导入');
        if (!node.importClause?.isTypeOnly && /\.tsx?$/.test(target)) imports.push(target);
      }
      if (file.startsWith('server/') && (name === 'react' || name.startsWith('@/features/')))
        report(file, 'server 不得依赖 React 或前端业务');
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

const visited = new Set();
const visiting = new Set();
function checkCycle(file, chain = []) {
  if (visiting.has(file)) {
    report(
      relative(root, file),
      `循环依赖：${[...chain, file].map((item) => relative(root, item)).join(' → ')}`,
    );
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const target of graph.get(file) || []) checkCycle(target, [...chain, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) checkCycle(file);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS ${files.length} 个源码文件：模块边界、无循环依赖、文件契约与 if/else 花括号`);
}
