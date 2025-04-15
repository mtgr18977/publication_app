const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const docsRoot = './';
const outputFile = './structure.json';

// Função para extrair o título H1 do conteúdo Markdown
function extractTitle(markdownContent) {
    const tokens = marked.lexer(markdownContent);
    const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1);
    return h1 ? h1.text : null;
}

function scanDirectory(dir) {
    const result = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        if (['structure.json', 'index.html', 'styles.css', 'script.js'].includes(item)) return;

        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            result.push({
                name: item,
                type: 'directory',
                children: scanDirectory(fullPath),
                path: fullPath
            });
        } else if (path.extname(item) === '.md') {
            const content = fs.readFileSync(fullPath, 'utf8');
            const title = extractTitle(content) || path.basename(item, '.md');
            
            result.push({
                name: item,
                type: 'file',
                title: title,
                path: fullPath
            });
        }
    });

    return result;
}

const structure = scanDirectory(docsRoot);
fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
console.log('Structure generated successfully!');