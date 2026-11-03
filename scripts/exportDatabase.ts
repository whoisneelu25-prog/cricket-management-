import fs from 'node:fs';
import path from 'node:path';
import {
  buildAllDatabaseExportFiles,
  createZipArchive,
  generateDatabaseValidationReport,
} from '../src/engine/databaseExport';

const exportsDir = path.resolve(process.cwd(), 'exports');
const publicDir = path.resolve(process.cwd(), 'public');

fs.mkdirSync(exportsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

const files = buildAllDatabaseExportFiles();

for (const [fileName, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(exportsDir, fileName), content, 'utf-8');
}

const zipBytes = createZipArchive(files);
fs.writeFileSync(path.join(exportsDir, 'ICM_Database_Export.zip'), zipBytes);
fs.writeFileSync(path.join(publicDir, 'ICM_Database_Export.zip'), zipBytes);

const report = generateDatabaseValidationReport();
console.log('=== ICM DATABASE EXPORT COMPLETED ===');
console.log('Files exported to /exports/ and /public/ICM_Database_Export.zip:');
Object.keys(files).forEach((f) => console.log('  -', f));
console.log('  - ICM_Database_Export.zip (' + zipBytes.byteLength + ' bytes)');
console.log('\n=== VALIDATION REPORT SUMMARY ===');
console.log(JSON.stringify(report.summary, null, 2));
