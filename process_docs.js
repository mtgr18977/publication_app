const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const docsRoot = './';
const outputFile = './structure.json';

const ignoredItems = [
    'structure.json',
    'index.html',
    'styles.css',
    'script.js',
    '.git',
    'api-specs',
    'node_modules',
    '.github',
    '.vscode',
    'process_docs.js',
    'package-lock.json',
    'package.json'
];

/**
 * Extracts the H1 title from the Markdown content.
 * @param {string} markdownContent - The content of the Markdown file.
 * @returns {string|null} - The H1 title or null if not found.
 */
function extractTitle(markdownContent) {
    try {
        const tokens = marked.lexer(markdownContent);
        const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1);
        return h1 ? h1.text : null;
    } catch (error) {
        console.error('Error extracting title:', error);
        return null;
    }
}

/**
 * Processes metadata in a Markdown file to add a title as H1.
 * @param {string} filePath - The path to the Markdown file.
 */
function processMarkdownFile(filePath) {
    try {
        console.log(`Processing metadata in: ${filePath}`);
        const data = fs.readFileSync(filePath, 'utf8');

        // Regex to find metadata blocks at the start of the file
        const metadataRegex = /^---\s*([\s\S]*?)\s*---\s*\n/g;
        const metadataMatch = metadataRegex.exec(data);

        if (metadataMatch && metadataMatch[1]) {
            const metadataBlock = metadataMatch[1];
            const lines = metadataBlock.split('\n');
            let title = null;

            for (let line of lines) {
                if (line.startsWith('title:')) {
                    title = line.substring('title:'.length).trim();
                    break;
                }
            }

            if (title) {
                console.log(`Found title: ${title} in ${filePath}`);
                const newContent = data.replace(metadataRegex, `# ${title}\n\n`);
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`Metadata processed and title added to: ${filePath}`);
            } else {
                console.log(`No title found in: ${filePath}`);
            }
        } else {
            console.log(`No metadata block found in: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}

/**
 * Scans a directory recursively to process files and build the documentation structure.
 * @param {string} dir - The directory to scan.
 * @returns {Array} - The array of processed items.
 */
function scanDirectory(dir) {
    console.log(`Scanning directory: ${dir}`);
    const items = [];
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            if (ignoredItems.includes(file)) return;

            const fullPath = path.join(dir, file);
            const relativePath = fullPath.replace(docsRoot, '');
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                // Process directory
                const children = scanDirectory(fullPath);
                items.push({
                    type: 'directory',
                    name: file,
                    path: relativePath,
                    children: children
                });
            } else if (path.extname(file) === '.md') {
                // Process Markdown file
                try {
                    processMarkdownFile(fullPath);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const title = extractTitle(content) || file.replace('.md', '');
                    items.push({
                        type: 'file',
                        name: file,
                        title: title,
                        path: relativePath
                    });
                } catch (error) {
                    console.error(`Error processing ${fullPath}:`, error);
                }
            }
        });
    } catch (error) {
        console.error('Error reading directory:', error);
    }
    return items;
}

/**
 * Counts the total number of items (files and directories) processed.
 * @param {Array} items - The array of items to count.
 * @returns {number} - The total count of items.
 */
function countItems(items) {
    let count = items.length;
    items.forEach(item => {
        if (item.type === 'directory' && item.children) {
            count += countItems(item.children);
        }
    });
    return count;
}

/**
 * Main function to generate the documentation structure.
 */
function generateStructure() {
    console.log('Starting documentation structure generation...');
    try {
        const structure = scanDirectory(docsRoot);
        fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
        console.log('Documentation structure generated successfully!');
        console.log(`Total of ${countItems(structure)} items processed.`);
    } catch (error) {
        console.error('Error generating structure:', error);
    }
}

// Start generating the structure
generateStructure();