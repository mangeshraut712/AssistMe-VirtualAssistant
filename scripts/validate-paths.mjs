#!/usr/bin/env node
/**
 * Project Path & Import Validator
 * Checks all imports, paths, and module connections
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolvePath(__dirname, '..');

const issues = [];
const warnings = [];
let filesChecked = 0;

// Patterns to check
const importPatterns = [
    /from\s+['"](.+)['"]/g,
    /import\s*\(\s*['"](.+)['"]\s*\)/g,
    /require\s*\(\s*['"](.+)['"]\s*\)/g,
];

// Valid path prefixes
const validPrefixes = [
    '@/',           // Vite alias
    './',           // Relative
    '../',          // Parent
    'react',        // Node modules
    'framer-motion',
    'lucide-react',
    '@radix-ui',
];

function getAllFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
                getAllFiles(filePath, fileList);
            }
        } else if (file.match(/\.(jsx?|tsx?|css)$/)) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function checkFile(filePath) {
    filesChecked++;
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(projectRoot + '/', '');

    // Check imports
    importPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1];

            // Skip node modules and built-ins
            if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
                return;
            }

            // Check if path exists
            if (importPath.startsWith('@/')) {
                const actualPath = importPath.replace('@/', 'src/');
                const fullPath = resolvePath(projectRoot, actualPath);

                try {
                    statSync(fullPath);
                } catch {
                    // Try with common extensions
                    const extensions = ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
                    let found = false;

                    for (const ext of extensions) {
                        try {
                            statSync(fullPath + ext);
                            found = true;
                            break;
                        } catch { }
                    }

                    if (!found) {
                        issues.push({
                            file: relativePath,
                            issue: `Import not found: ${importPath}`,
                            path: actualPath
                        });
                    }
                }
            }
        }
    });

    // Check for old imports from deleted archive/ folder
    if (content.includes("from 'archive/") || content.includes('from "archive/')) {
        issues.push({
            file: relativePath,
            issue: 'Import from deleted archive/ folder',
        });
    }

    // Check for modules/ imports (should work if properly set up)
    if (content.includes("from '../modules/") || content.includes("from './modules/")) {
        warnings.push({
            file: relativePath,
            warning: 'Direct import from modules/ folder - ensure path is correct',
        });
    }
}

// Run validation
console.log('🔍 Validating project paths and imports...\n');

const srcFiles = getAllFiles(join(projectRoot, 'src'));
const moduleFiles = getAllFiles(join(projectRoot, 'modules'));

console.log(`Checking ${srcFiles.length} source files...`);
srcFiles.forEach(checkFile);

console.log(`Checking ${moduleFiles.length} module files...`);
moduleFiles.forEach(checkFile);

// Report results
console.log(`\n✅ Checked ${filesChecked} files\n`);

if (issues.length === 0 && warnings.length === 0) {
    console.log('🎉 No issues found! All paths are valid.\n');
} else {
    if (issues.length > 0) {
        console.log(`❌ Found ${issues.length} issues:\n`);
        issues.forEach((issue, i) => {
            console.log(`${i + 1}. [${issue.file}]`);
            console.log(`   ${issue.issue}`);
            if (issue.path) console.log(`   Path: ${issue.path}`);
            console.log('');
        });
    }

    if (warnings.length > 0) {
        console.log(`⚠️  Found ${warnings.length} warnings:\n`);
        warnings.forEach((warning, i) => {
            console.log(`${i + 1}. [${warning.file}]`);
            console.log(`   ${warning.warning}\n`);
        });
    }
}

process.exit(issues.length > 0 ? 1 : 0);
