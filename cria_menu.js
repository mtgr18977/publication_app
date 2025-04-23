const fs = require('fs');
const path = require('path');
const { marked } = require('marked'); // Certifique-se que 'marked' está instalado

const docsRoot = path.resolve(__dirname); // Usar caminho absoluto para consistência
const outputFile = path.join(docsRoot, 'structure.json'); // Caminho absoluto para o output

// Lista de arquivos e diretórios a serem ignorados
const ignoredItems = new Set([ // Usar Set para performance
    'structure.json',
    'index.html',
    'api.html',
    'styles.css',
    'script.js',
    '.git',
    'api-specs',
    'node_modules',
    '.github',
    '.vscode',
    'cria_menu.js',
    'package.json',
    'package-lock.json',
    'remove-front.js',
    'images' // Exemplo: ignorar pasta de imagens
]);

// Função para extrair o título H1 do conteúdo Markdown
function extractTitle(markdownContent) {
    try {
        const tokens = marked.lexer(markdownContent);
        const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1);
        return h1 ? h1.text : null;
    } catch (error) {
        console.warn(`Erro ao fazer parse do Markdown para extrair título: ${error.message}`);
        return null;
    }
}

function scanDirectory(dir) {
    const result = [];
    try {
        const items = fs.readdirSync(dir);

        items.forEach(item => {
            // Verificar se o item deve ser ignorado
            if (ignoredItems.has(item) || item.startsWith('.')) return;

            const fullPath = path.join(dir, item);
            let relativePath = path.relative(docsRoot, fullPath).replace(/\\/g, '/'); // Normalizar para /

            try {
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Ignorar diretórios que começam com número (assumindo que são versões/idiomas)
                    // se não estiverem no nível raiz esperado (ex: 1.0/en/)
                    // Adapte esta lógica conforme sua estrutura exata.
                    // Esta lógica assume que versões são pastas como "1.0", "2.0" etc.
                    // e idiomas são subpastas como "en", "pt"
                    const depth = relativePath.split('/').length;
                    // Permitir pastas de versão no nível 1 e pastas de idioma no nível 2
                    const isVersionOrLangFolder = /^\d+\.\d+$/.test(item) || /^[a-z]{2}(-[A-Z]{2})?$/.test(item);

                    if (depth > 2 && isVersionOrLangFolder) {
                       console.log(`Ignorando pasta de versão/idioma em nível inesperado: ${relativePath}`);
                       return;
                    }

                    const children = scanDirectory(fullPath);
                    // Só adicionar diretórios que tenham conteúdo Markdown relevante ou sejam pastas de versão/idioma
                    if (children.length > 0 || isVersionOrLangFolder) {
                         // Ordenar filhos: diretórios primeiro, depois arquivos
                        children.sort((a, b) => {
                            if (a.type === b.type) {
                                return a.name.localeCompare(b.name); // Ordenar alfabeticamente
                            }
                            return a.type === 'directory' ? -1 : 1; // Diretórios primeiro
                        });

                        result.push({
                            name: item,
                            type: 'directory',
                            children: children,
                            path: relativePath // Usar caminho normalizado
                        });
                    }
                } else if (path.extname(item) === '.md') {
                     // Ignorar README no nível raiz, se desejado
                     if (dir === docsRoot && item.toUpperCase() === 'README.MD') {
                         console.log('Ignorando README.md na raiz.');
                         return;
                     }

                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const title = extractTitle(content) || path.basename(item, '.md'); // Usar nome do arquivo como fallback

                        result.push({
                            name: item, // Manter nome original do arquivo
                            type: 'file',
                            title: title, // Título extraído ou nome base
                            path: relativePath // Usar caminho normalizado
                        });
                    } catch (readError) {
                        console.warn(`Erro ao ler o arquivo ${fullPath}: ${readError.message}`);
                    }
                }
            } catch (statError) {
                 console.warn(`Erro ao obter stats para ${fullPath}: ${statError.message}`);
            }
        });
    } catch (readdirError) {
        console.error(`Erro ao ler diretório ${dir}: ${readdirError.message}`);
    }

     // Ordenar resultado final no diretório atual
     result.sort((a, b) => {
        if (a.type === b.type) {
            return a.name.localeCompare(b.name); // Ordenar alfabeticamente
        }
        return a.type === 'directory' ? -1 : 1; // Diretórios primeiro
    });

    return result;
}

// Função auxiliar para contar itens processados
function countItems(items) {
    let count = 0;
    items.forEach(item => {
        if (item.type === 'file') {
            count++;
        } else if (item.type === 'directory' && item.children) {
            count += countItems(item.children);
        }
    });
    return count;
}


try {
    console.log('Gerando estrutura da documentação...');
    // Assumindo que as versões são as pastas no diretório raiz que correspondem a N.N
    const rootItems = fs.readdirSync(docsRoot);
    const versionFolders = rootItems.filter(item => {
         const fullPath = path.join(docsRoot, item);
         // Verifica se é um diretório e se o nome corresponde ao padrão N.N
         return fs.statSync(fullPath).isDirectory() && /^\d+\.\d+$/.test(item);
    });

    if (versionFolders.length === 0) {
         console.warn("Nenhuma pasta de versão (ex: '1.0', '4.0') encontrada na raiz.");
         // Poderia tentar escanear a raiz inteira como fallback, ou parar.
         // Para este exemplo, vamos parar.
         throw new Error("Estrutura de pastas de versão não encontrada.");
    }

     // Mapear cada pasta de versão para a estrutura desejada
     const structure = versionFolders.map(versionName => {
         const versionPath = path.join(docsRoot, versionName);
         return {
             name: versionName,
             type: 'directory',
             path: versionName, // Caminho relativo normalizado
             children: scanDirectory(versionPath) // Escanear dentro da pasta da versão
         };
     }).sort((a, b) => b.name.localeCompare(a.name)); // Ordenar versões descendentemente (4.0 antes de 1.0)


    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2), 'utf8');
    console.log(`Estrutura gerada com sucesso em ${outputFile}!`);
    // Contar apenas arquivos .md dentro das versões processadas
    let totalFiles = 0;
    structure.forEach(version => {
         totalFiles += countItems(version.children);
    });
    console.log(`Total de ${totalFiles} arquivos .md processados.`);

} catch (error) {
    console.error('Erro ao gerar estrutura:', error);
    process.exit(1); // Sair com código de erro
}