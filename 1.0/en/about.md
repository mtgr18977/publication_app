# About the nameless platform

## Overview

This project implements an in-house documentation platform following the "Documentation as Code" principles. The system allows for producing, reviewing, and publishing technical documentation using tools familiar to developers, including version control, pull requests, and preview environments.

### Motivation

The need to maintain up-to-date and accessible documentation led to the creation of a system that:

* Uses Markdown as the main format to simplify contribution  
* Offers a review flow based on Pull Requests  
* Automates publication via GitHub Actions  
* Provides preview environments for reviewing changes

### Development Timeline

1. **Phase 1**: Basic repository structure and GitHub Pages configuration  
2. **Phase 2**: Development of front-end components (HTML, CSS, JavaScript)  
3. **Phase 3**: Implementation of helper scripts to process Markdown files  
4. **Phase 4**: Configuration of CI/CD workflow for automatic publication  
5. **Phase 5**: Implementation of preview system for Pull Requests

## System Architecture

The system architecture is intentionally simple, based on static files and client-side processing.

![](/images/diagram.png)

### Directory Structure

```txt
docs-as-code/
├── .github/
│ └── workflows/
│ └── documentation-workflow.yml # Unified CI/CD workflow
├── css/
│ └── styles.css # Site styles
├── js/
│ ├── main.js # Main interface logic
│ └── markdown-processor.js # Markdown processing
├── scripts/
│ ├── cria_menu.js # Menu structure generation
│ └── process_metadata.js # Metadata processing
├── index.html # Main page
└── [markdown documents] # Documentation in .md format
```

## Callouts

:::(info) (Informação)
Este é um callout informativo.
:::

:::(warning) (Aviso)
Este é um callout de aviso.
:::

:::(error) (Erro)
Este é um callout de erro.
:::

## Front-end Components

### HTML (index.html)

The `index.html` file serves as the entry point of the application, with a single-page application structure:

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Technical Documentation</title>
<link rel="stylesheet" href="css/styles.css">
<header>
    <div id="companyLogo">Logo</div>
    <div class="version-selector">
        <!-- Version and language selector -->
    </div>
</header>
<div class="container">
    <nav id="sidebar">
        <!-- Dynamically generated side menu -->
    </nav>
    <main id="content">
        <!-- Dynamically loaded content -->
    </main>
    <aside class="toc-container">
        <!-- Automatically generated table of contents -->
    </aside>
</div>
<script src="js/marked.min.js"></script>
<script src="js/main.js"></script>
```

### CSS (styles.css)

The CSS was developed with a focus on readability and responsiveness, using a color system based on green tones for visual identity:

```css
:root {
    --primary-color: #00766C;      /* Medium turquoise green */
    --primary-light: #00B29A;      /* Turquoise green */
    --primary-dark: #004D40;       /* Dark green */
    --accent-color: #00E1C4;       /* Bright turquoise green */
    --background-light: #f0faf8;   /* Very light green */
    --text-color: #333333;
    --text-light: #666666;
}

/* Responsive layout */
.container {
    display: flex;
    height: calc(100vh - 70px);
}

/* Header */
header {
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    background-color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Navigation sidebar */
#sidebar {
    width: 300px;
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: var(--background-light);
    border-right: 1px solid var(--primary-light);
}

/* Main content */
#content {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    padding: 2.5rem;
    background: white;
}

/* Table of contents */
.toc-container {
    width: 300px;
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    border-left: 1px solid var(--primary-light);
    background: var(--background-light);
}

/* Callout components */
.callout {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border-radius: 8px;
    border-left: 4px solid;
    position: relative;
}

/* Responsiveness */
@media (max-width: 1200px) {
    .toc-container {
        display: none;
    }
}

@media (max-width: 768px) {
    .container {
        flex-direction: column;
    }
    #sidebar {
        width: 100%;
        height: auto;
        max-height: 300px;
    }
}
```

### JavaScript (script.js)

The main JavaScript file manages content loading, user interactions, and Markdown processing:

```js
document.addEventListener('DOMContentLoaded', function() {
    // Application state
    let currentPath = '';
    let currentVersion = 'v4.0';  // Default version
    let currentLanguage = 'pt-BR'; // Default language
    
    // Initialization
    loadSidebar();
    
    // Loads sidebar with documentation structure
    function loadSidebar() {
        fetch('structure.json')
            .then(response => response.json())
            .then(data => {
                renderSidebar(data);
                // Check URL to load specific content
                const urlParams = new URLSearchParams(window.location.search);
                const articlePath = urlParams.get('article');
                const homePage = urlParams.get('home');
                
                if (articlePath) {
                    loadContent(articlePath);
                } else if (homePage) {
                    loadIndexContent();
                } else {
                    // Try to restore the last viewed article
                    const savedPath = localStorage.getItem('currentPath');
                    if (savedPath) {
                        loadContent(savedPath);
                    } else {
                        loadIndexContent();
                    }
                }
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
                loadFallbackContent();
            });
    }
    
    // Renders Markdown content
    function loadContent(path) {
        currentPath = path;
        // Save current path in localStorage
        localStorage.setItem('currentPath', currentPath);
        
        fetch(path)
            .then(response => response.text())
            .then(markdown => {
                // Pre-process Markdown to handle callouts
                const processedMarkdown = preProcessCallouts(markdown);
                // Render with Marked
                const htmlContent = marked.parse(processedMarkdown);
                
                document.getElementById('content').innerHTML = `
                    <div class="content-container">
                        ${htmlContent}
                    </div>
                `;
                
                // Generate table of contents
                generateTOC();
                // Activate scroll spy
                setupScrollSpy();
            })
            .catch(error => {
                console.error('Error loading content:', error);
                loadFallbackContent();
            });
    }
    
    // Function to pre-process callouts in Markdown
    function preProcessCallouts(markdown) {
        // Regular expression to find callouts
        const calloutRegex = /:::\((\w+)\)\s+\(([^\n]+)\)([\s\S]*?)(?=\n:::)/gm;
        let processedMarkdown = markdown.replace(calloutRegex, function(match, type, title, content) {
            return `<div class="callout callout-${type.toLowerCase()}">
                <div class="callout-title">${title}</div>
                <div class="callout-content">${content}</div>
            </div>`;
        });
        
        // Remove callout closing tags
        processedMarkdown = processedMarkdown.replace(/\n:::/g, '');
        return processedMarkdown;
    }
    
    // Generate table of contents from headings
    function generateTOC() {
        const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
        const toc = document.querySelector('.toc-container');
        if (!toc || headings.length === 0) return;
        
        let tocHTML = '<div class="toc-header">Contents</div><nav class="toc-nav">';
        headings.forEach(heading => {
            const level = heading.tagName.substring(1);
            const text = heading.textContent;
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            heading.id = id;
            tocHTML += `<a href="#${id}" class="toc-item h${level}">${text}</a>`;
        });
        tocHTML += '</nav>';
        toc.innerHTML = tocHTML;
    }
});
```

## Helper Scripts

### Menu Generation (cria\_menu.js)

This Node.js script scans the documentation directory to generate a JSON file with the navigation structure:

```js
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const docsRoot = './';
const outputFile = './structure.json';

// List of files and directories to be ignored
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
    'cria_menu.js'
];

// Function to extract H1 title from Markdown content
function extractTitle(markdownContent) {
    const tokens = marked.lexer(markdownContent);
    const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1);
    return h1 ? h1.text : null;
}

// Main function to scan directories
function scanDirectory(dir) {
    const items = [];
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
                const content = fs.readFileSync(fullPath, 'utf8');
                const title = extractTitle(content) || file.replace('.md', '');
                items.push({
                    type: 'file',
                    name: title,
                    path: relativePath,
                    originalName: file
                });
            } catch (error) {
                console.error(`Error processing ${fullPath}:`, error);
            }
        }
    });
    
    return items;
}

try {
    console.log('Generating documentation structure...');
    const structure = scanDirectory(docsRoot);
    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
    console.log('Structure generated successfully!');
    console.log(`Total of ${countItems(structure)} items processed.`);
} catch (error) {
    console.error('Error generating structure:', error);
}

// Helper function to count processed items
function countItems(items) {
    let count = items.length;
    items.forEach(item => {
        if (item.type === 'directory' && item.children) {
            count += countItems(item.children);
        }
    });
    return count;
}
```

### Metadata Processing (process\_metadata.js)

This script processes metadata in Markdown files, converting metadata blocks to H1 titles:

```js
const fs = require('fs');
const path = require('path');

// Path to root directory
const rootDirectory = path.join(__dirname);

// Function to traverse the directory recursively
function traverseDirectory(dir, callback) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error reading directory ${dir}:`, err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(dir, file);

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Error getting file information ${filePath}:`, err);
                    return;
                }

                if (stats.isDirectory()) {
                    // If it's a directory, calls the function recursively
                    traverseDirectory(filePath, callback);
                } else if (path.extname(file) === '.md') {
                    // If it's an .md file, executes the
```
### Function to process a Markdown file

```js
function processMarkdownFile(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Erro ao ler o arquivo ${filePath}:`, err);
            return;
        }

        // Padrão para encontrar blocos de metadados no início do arquivo
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
                const newContent = data.replace(metadataRegex, `# ${title}\n\n`);
                fs.writeFile(filePath, newContent, 'utf8', (err) => {
                    if (err) {
                        console.error(`Erro ao escrever no arquivo ${filePath}:`, err);
                    } else {
                        console.log(`Metadados processados e título adicionado em ${filePath}`);
                    }
                });
            } else {
                console.log(`Nenhum título encontrado em ${filePath}`);
            }
        } else {
            console.log(`Nenhum bloco de metadados encontrado em ${filePath}`);
        }
    });
}
// Inicia o processo
traverseDirectory(rootDirectory, processMarkdownFile);
```

## Conclusion

This project represents a complete implementation of a technical documentation platform with a focus on “Documentation as Code”. It integrates version control, revision flows and publication automation. In addition, the simple architecture based on static files ensures that documentation is always accessible, keeping the platform lightweight and easy to maintain.

This project was developed to demonstrate a technical documentation system that adopts modern practices and tools familiar to developers, and a great initial step towards a more robust project.

The system implements a complete solution that meets the main objectives of any documentation team.