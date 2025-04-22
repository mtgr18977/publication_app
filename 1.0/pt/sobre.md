# Sobre a plataforma sem nome

Este projeto implementa uma plataforma de documentação técnica seguindo os princípios de "Documentation as Code" (`docascode`). O sistema (plataforma) permite produzir, revisar e publicar documentação técnica usando ferramentas familiares para desenvolvedores, incluindo controle de versão, pull requests e ambientes de preview.

### Motivação

A necessidade de manter documentação atualizada e acessível levou à criação de um sistema que:

- Usa Markdown como formato principal para simplificar a contribuição  
- Oferece um fluxo de revisão baseado em Pull Requests  
- Automatiza a publicação via GitHub Actions  
- Disponibiliza ambientes de preview para revisão das alterações

### Linha do Tempo de Desenvolvimento

1. **Fase 1**: Estrutura básica do repositório e configuração do GitHub Pages  
2. **Fase 2**: Desenvolvimento dos componentes front-end (HTML, CSS, JavaScript)  
3. **Fase 3**: Implementação dos scripts auxiliares para processar arquivos Markdown  
4. **Fase 4**: Configuração do workflow de CI/CD para publicação automática  
5. **Fase 5**: Implementação do sistema de preview para Pull Requests

## Arquitetura do Sistema

A arquitetura do sistema é intencionalmente simples, baseada em arquivos estáticos e processamento no lado do cliente.

![](/images/diagram.png)

## Estrutura de Diretórios

```txt
docs-as-code/
├── .github/
│   └── workflows/
│       └── documentation-workflow.yml  # Workflow CI/CD unificado
├── css/
│   └── styles.css                      # Estilos do site
├── js/
│   ├── script.js                       # Lógica principal da interface
│   └── markdown-processor.js           # Processamento de Markdown
├── scripts/
│   ├── cria_menu.js                    # Geração da estrutura de menu
│   └── process_metadata.js             # Processamento de metadados
├── index.html                          # Página principal
└── [documentos markdown]               # Documentação em formato .md
```

## Componentes Front-end em HTML (`index.html`)
O arquivo `index.html` serve como ponto de entrada da aplicação, com uma estrutura de single-page application:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentação Técnica</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <header>
        <div id="companyLogo">Logo</div>
        <div class="version-selector">
            <!-- Seletor de versão e idioma -->
        </div>
    </header>
    
    <div class="container">
        <nav id="sidebar">
            <!-- Menu lateral gerado dinamicamente -->
        </nav>
        
        <main id="content">
            <!-- Conteúdo carregado dinamicamente -->
        </main>
        
        <aside class="toc-container">
            <!-- Tabela de conteúdos gerada automaticamente -->
        </aside>
    </div>
    
    <script src="js/marked.min.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

## CSS (`styles.css`)
O CSS foi desenvolvido com foco em legibilidade e responsividade, usando um sistema de cores baseado em tons de verde para identidade visual:

```css
:root {
    --primary-color: #00766C;      /* Verde turquesa médio */
    --primary-light: #00B29A;      /* Verde turquesa */
    --primary-dark: #004D40;       /* Verde escuro */
    --accent-color: #00E1C4;       /* Verde turquesa brilhante */
    --background-light: #f0faf8;   /* Verde bem claro */
    --text-color: #333333;
    --text-light: #666666;
}

/* Layout responsivo */
.container {
    display: flex;
    height: calc(100vh - 70px);
}

/* Cabeçalho */
header {
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    background-color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Sidebar de navegação */
#sidebar {
    width: 300px;
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: var(--background-light);
    border-right: 1px solid var(--primary-light);
}

/* Conteúdo principal */
#content {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    padding: 2.5rem;
    background: white;
}

/* Tabela de conteúdos */
.toc-container {
    width: 300px;
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    border-left: 1px solid var(--primary-light);
    background: var(--background-light);
}

/* Componentes de callout */
.callout {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border-radius: 8px;
    border-left: 4px solid;
    position: relative;
}

/* Responsividade */
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

JavaScript (`script.js`)
O arquivo principal de JavaScript gerencia o carregamento de conteúdo, interações do usuário e processamento de Markdown:

```js
document.addEventListener('DOMContentLoaded', function() {
    // Estado da aplicação
    let currentPath = '';
    let currentVersion = 'v4.0';  // Versão padrão
    let currentLanguage = 'pt-BR'; // Idioma padrão
    
    // Inicialização
    loadSidebar();
    
    // Carrega menu lateral com estrutura da documentação
    function loadSidebar() {
        fetch('structure.json')
            .then(response => response.json())
            .then(data => {
                renderSidebar(data);
                
                // Verifica URL para carregar conteúdo específico
                const urlParams = new URLSearchParams(window.location.search);
                const articlePath = urlParams.get('article');
                const homePage = urlParams.get('home');
                
                if (articlePath) {
                    loadContent(articlePath);
                } else if (homePage) {
                    loadIndexContent();
                } else {
                    // Tenta restaurar o último artigo visualizado
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
    
    // Renderiza conteúdo Markdown
    function loadContent(path) {
        currentPath = path;
        // Salva o caminho atual no localStorage
        localStorage.setItem('currentPath', currentPath);
        
        fetch(path)
            .then(response => response.text())
            .then(markdown => {
                // Pré-processar o Markdown para lidar com os callouts
                const processedMarkdown = preProcessCallouts(markdown);
                
                // Renderizar com o Marked
                const htmlContent = marked.parse(processedMarkdown);
                
                document.getElementById('content').innerHTML = `
                    <div class="content-container">
                        ${htmlContent}
                    </div>
                `;
                
                // Gerar tabela de conteúdos
                generateTOC();
                // Ativar scroll spy
                setupScrollSpy();
            })
            .catch(error => {
                console.error('Error loading content:', error);
                loadFallbackContent();
            });
    }
    
    // Função para pré-processar callouts no Markdown
    function preProcessCallouts(markdown) {
        // Expressão regular para encontrar callouts
        const calloutRegex = /:::\((\w+)\)\s+\(([^\n]+)\)([\s\S]*?)(?=\n:::)/gm;
        
        let processedMarkdown = markdown.replace(calloutRegex, function(match, type, title, content) {
            return `<div class="callout callout-${type.toLowerCase()}">
                <div class="callout-title">${title}</div>
                <div class="callout-content">${content}</div>
            </div>`;
        });
        
        // Remove as tags de fechamento de callout
        processedMarkdown = processedMarkdown.replace(/\n:::/g, '');
        
        return processedMarkdown;
    }
    
    // Gera tabela de conteúdos a partir dos headings
    function generateTOC() {
        const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
        const toc = document.querySelector('.toc-container');
        
        if (!toc || headings.length === 0) return;
        
        let tocHTML = '<div class="toc-header">Conteúdo</div><nav class="toc-nav">';
        
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

## Scripts Auxiliares
Script sque ajudam a criar a estrutura da barra lateral, ToC e outros elementos.

### Geração de Menu (`cria_menu.js`)
Este script Node.js escaneia o diretório de documentação para gerar um arquivo JSON com a estrutura de navegação:

```js
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const docsRoot = './';
const outputFile = './structure.json';

// Lista de arquivos e diretórios a serem ignorados
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

// Função para extrair o título H1 do conteúdo Markdown
function extractTitle(markdownContent) {
    const tokens = marked.lexer(markdownContent);
    const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1);
    return h1 ? h1.text : null;
}

// Função principal para escanear diretórios
function scanDirectory(dir) {
    const items = [];
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        if (ignoredItems.includes(file)) return;
        
        const fullPath = path.join(dir, file);
        const relativePath = fullPath.replace(docsRoot, '');
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            // Processar diretório
            const children = scanDirectory(fullPath);
            items.push({
                type: 'directory',
                name: file,
                path: relativePath,
                children: children
            });
        } else if (path.extname(file) === '.md') {
            // Processar arquivo Markdown
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
                console.error(`Erro ao processar ${fullPath}:`, error);
            }
        }
    });
    
    return items;
}

try {
    console.log('Gerando estrutura da documentação...');
    const structure = scanDirectory(docsRoot);
    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
    console.log('Estrutura gerada com sucesso!');
    console.log(`Total de ${countItems(structure)} itens processados.`);
} catch (error) {
    console.error('Erro ao gerar estrutura:', error);
}

// Função auxiliar para contar itens processados
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

### Processamento de Metadados (`process_metadata.js`)
Este script processa metadados nos arquivos Markdown, convertendo blocos de metadados para títulos H1:

```js
const fs = require('fs');
const path = require('path');

// Caminho para o diretório raiz
const rootDirectory = path.join(__dirname);

// Função para percorrer o diretório recursivamente
function traverseDirectory(dir, callback) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Erro ao ler o diretório ${dir}:`, err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(dir, file);

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Erro ao obter informações do arquivo ${filePath}:`, err);
                    return;
                }

                if (stats.isDirectory()) {
                    // Se for um diretório, chama a função recursivamente
                    traverseDirectory(filePath, callback);
                } else if (path.extname(file) === '.md') {
```