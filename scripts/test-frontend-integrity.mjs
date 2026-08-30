import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SQL_PATH = path.join(ROOT_DIR, 'SQL_database.sql');
const SRC_DIR = path.join(ROOT_DIR, 'src');

console.log('=== CLEAN FOOD CR ERP: DEEP FRONTEND INTEGRITY & COLUMN AUDITOR ===\n');

// 1. Parse all tables and columns from SQL_database.sql
const sqlContent = fs.readFileSync(SQL_PATH, 'utf-8');
const tableBlocks = sqlContent.split(/CREATE TABLE\s+(?:public\.)?/i).slice(1);

const tableSchemas = {}; // { tableName: Set([columnNames]) }

for (const block of tableBlocks) {
  const match = block.match(/^([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/);
  if (!match) continue;
  const tableName = match[1];
  const body = match[2];

  const columns = new Set();
  const lines = body.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('--') || line.toUpperCase().startsWith('CONSTRAINT') || line.toUpperCase().startsWith('PRIMARY KEY') || line.toUpperCase().startsWith('FOREIGN KEY')) {
      continue;
    }
    const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+/);
    if (colMatch) {
      columns.add(colMatch[1]);
    }
  }
  tableSchemas[tableName] = columns;
}

const sqlTables = new Set(Object.keys(tableSchemas));
console.log(`[PASS] Loaded ${sqlTables.size} valid tables and their column schemas from SQL_database.sql`);

// 2. Recursively find all .ts and .tsx files in src/
function getSourceFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getSourceFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const sourceFiles = getSourceFiles(SRC_DIR);
console.log(`[PASS] Scanning ${sourceFiles.length} source code files in src/\n`);

let errorsFound = 0;
let warningsFound = 0;

// 3. Scan each file for supabase queries with statement isolation
console.log('--- Auditing Supabase Tables & Columns ---');

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, file);

  // Find occurrences of .from('...')
  const fromRegex = /\.from\(\s*['"`]([a-zA-Z0-9_\-]+)['"`]\s*\)/g;
  let match;

  while ((match = fromRegex.exec(content)) !== null) {
    const tableName = match[1];
    const startIndex = match.index + match[0].length;

    // Skip storage buckets
    if (tableName === 'menu-images' || tableName === 'avatars' || tableName === 'receipts') {
      continue;
    }

    if (!tableSchemas[tableName]) {
      console.error(`❌ [TABLE NOT FOUND]: ${relativePath} -> Table '${tableName}' does not exist!`);
      errorsFound++;
      continue;
    }

    const validCols = tableSchemas[tableName];

    // Find the end of this query chain (terminated by next supabase.from, semicolon, newline followed by const/let/await, or closing bracket of Promise.all)
    const nextCode = content.substring(startIndex, startIndex + 800);
    const endBoundaryMatch = nextCode.search(/(?:supabase\.from|;\s*\n|,\s*\n\s*supabase|\n\s*(?:const|let|await|return|if|throw)\b)/);
    const queryChain = endBoundaryMatch !== -1 ? nextCode.substring(0, endBoundaryMatch) : nextCode;

    // Check .select('col1, col2, ...')
    const selectMatch = queryChain.match(/\.select\(\s*['"`]([\s\S]*?)['"`]\s*\)/);
    if (selectMatch) {
      const selectStr = selectMatch[1];
      if (!selectStr.includes('(') && selectStr.trim() !== '*') {
        const cols = selectStr.split(',').map(c => c.trim()).filter(c => c && c !== '*');
        for (const col of cols) {
          const cleanCol = col.split(':')[0].trim();
          if (cleanCol && !validCols.has(cleanCol)) {
            console.error(`❌ [COLUMN NOT FOUND]: ${relativePath} -> Table '${tableName}' does NOT have column '${cleanCol}' in select!`);
            errorsFound++;
          }
        }
      }
    }

    // Check .eq('col', ...), .order('col', ...), etc. inside THIS chain only
    const colFilterRegex = /\.(?:eq|neq|gt|gte|lt|lte|is|in|order)\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
    let filterMatch;
    while ((filterMatch = colFilterRegex.exec(queryChain)) !== null) {
      const filterCol = filterMatch[1];
      if (filterCol && !validCols.has(filterCol)) {
        console.error(`❌ [FILTER COLUMN NOT FOUND]: ${relativePath} -> Table '${tableName}' does NOT have column '${filterCol}' used in query filter!`);
        errorsFound++;
      }
    }
  }
}

// 4. Scan for Leaflet map invalidateSize without guards
console.log('\n--- Auditing Leaflet Map Container Guards ---');
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, file);
  if (content.includes('.invalidateSize(') && !content.includes('getContainer()')) {
    console.warn(`⚠️ [LEAFLET UNGUARDED]: ${relativePath} calls invalidateSize() without checking map.getContainer()`);
    warningsFound++;
  }
}

// 5. Scan for unguarded img src
console.log('\n--- Checking Image Tags for Empty src ---');
const unguardedImgRegex = /<img\s+src=\{([a-zA-Z0-9_.]+)\}\s+alt=/g;
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, file);
  let match;

  while ((match = unguardedImgRegex.exec(content)) !== null) {
    const varName = match[1];
    const index = match.index;
    const surrounding = content.substring(Math.max(0, index - 200), index);
    if (!surrounding.includes('?') && !surrounding.includes('&&')) {
      console.warn(`⚠️ [UNGUARDED IMG SRC]: ${relativePath} might pass empty string to <img src={${varName}} />`);
      warningsFound++;
    }
  }
}

// 6. Scan for ResponsiveContainer without min dimensions
console.log('\n--- Checking Recharts ResponsiveContainer ---');
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, file);
  if (content.includes('<ResponsiveContainer') && !content.includes('minWidth={0}')) {
    console.warn(`⚠️ [RECHARTS CONTAINER]: ${relativePath} has <ResponsiveContainer> missing minWidth={0}`);
    warningsFound++;
  }
}

console.log('\n=========================================');
if (errorsFound === 0) {
  console.log(`✅ AUDIT PASSED: 0 schema & column errors! (${warningsFound} minor notices)`);
} else {
  console.error(`❌ AUDIT FAILED: ${errorsFound} schema/column errors detected across frontend source files!`);
}
console.log('=========================================\n');

if (errorsFound > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
