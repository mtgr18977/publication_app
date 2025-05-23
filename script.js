// Variáveis Globais
let currentVersion = localStorage.getItem('docVersion') || '4.0';
let currentLanguage = localStorage.getItem('docLanguage') || 'pt';
let structure = [];
let currentPath = null;
let currentFile = null;
let searchIndex = {}; // Índice de busca
let searchDebounceTimer = null;
let isPreloading = false;
let dropdownsInitialized = false;

// --- Funções de Busca ---

// Função para pré-carregar o conteúdo de todos os documentos
async function preloadContent() {
    if (isPreloading) {
        console.log('Pré-carregamento já em andamento...');
        return;
    }

    isPreloading = true;
    console.log('Iniciando pré-carregamento de conteúdo...');
    
    try {
        // Encontrar a estrutura da versão/idioma atual
        const version = structure.find(v => v.name === currentVersion);
        if (!version) {
            console.error('Versão não encontrada para pré-carregamento:', currentVersion);
            isPreloading = false;
            return;
        }

        const language = version.children.find(l => l.name === currentLanguage);
        if (!language) {
            console.error('Idioma não encontrado para pré-carregamento:', currentLanguage);
            isPreloading = false;
            return;
        }

        // Limpa o índice antes de recarregar
        searchIndex = {}; 
        console.log('Índice de busca limpo para pré-carregamento.');

        // Função recursiva para processar todos os arquivos na estrutura atual
        async function processItems(items) {
            for (const item of items) {
                if (item.type === 'directory') {
                    // Certifique-se de que 'children' existe antes de chamar recursivamente
                    if (item.children && Array.isArray(item.children)) {
                         await processItems(item.children);
                    } else {
                        console.warn(`Diretório '${item.name}' (${item.path}) não possui 'children' válidos.`);
                    }
                } else if (item.type === 'file' && item.path && item.path.endsWith('.md')) {
                    try {
                        // Evitar pré-carregar arquivos já indexados (caso haja duplicação na estrutura)
                        if (searchIndex[item.path]) {
                            continue;
                        }

                        // console.log('Pré-carregando arquivo:', item.path); // Log menos verboso
                        const response = await fetch(item.path);
                        if (!response.ok) {
                            console.error(`Erro ${response.status} ao carregar arquivo para índice: ${item.path}`);
                            continue; // Pula para o próximo arquivo
                        }
                        
                        const content = await response.text();
                        // Adiciona ao índice de busca
                        searchIndex[item.path] = {
                            title: item.title || item.name.replace('.md', ''),
                            content: content, // Armazena o conteúdo bruto
                            path: item.path
                        };
                        // console.log('Arquivo indexado com sucesso:', item.path); // Log menos verboso
                    } catch (error) {
                        console.error(`Erro crítico ao pré-carregar ${item.path}:`, error);
                    }
                }
            }
        }
        
        // Inicia o processo a partir dos filhos da estrutura de idioma
        if (language.children && Array.isArray(language.children)) {
             await processItems(language.children);
             console.log(`Pré-carregamento concluído para ${currentVersion}/${currentLanguage}. Total de arquivos indexados: ${Object.keys(searchIndex).length}`);
        } else {
             console.warn(`Estrutura de idioma '${currentLanguage}' não possui 'children' válidos.`);
        }

        // Atualiza o placeholder da busca para indicar que está pronto
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = 'Buscar na documentação...';
            searchInput.disabled = false; // Habilita o input
        }
    } catch (error) {
        console.error('Erro geral durante o pré-carregamento:', error);
        const searchInput = document.getElementById('searchInput');
         if (searchInput) {
             searchInput.placeholder = 'Erro no índice de busca';
             searchInput.disabled = true; // Desabilita se houve erro
         }
    } finally {
        isPreloading = false;
        console.log('Pré-carregamento finalizado.');
    }
}


// Função para realizar a busca
function performSearch(query) {
    if (!query || query.length < 2) {
        hideSearchModal();
        return;
    }

    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    // Verifica se o índice está vazio ou se o pré-carregamento ainda está ocorrendo
     if (Object.keys(searchIndex).length === 0) {
        if (isPreloading) {
            console.log('Busca adiada: Pré-carregamento em andamento...');
            // Opcional: mostrar mensagem ao usuário
        } else {
            console.warn('Índice de busca vazio. Tentando pré-carregar novamente...');
            preloadContent(); // Tenta recarregar se estiver vazio e não carregando
        }
         return;
     }

    for (const [path, doc] of Object.entries(searchIndex)) {
        // Verifica se doc.content e doc.title existem antes de acessá-los
        if (!doc || typeof doc.content !== 'string' || typeof doc.title !== 'string') {
             console.warn(`Documento inválido no índice para o caminho: ${path}`);
             continue; // Pula para o próximo documento
        }
        const content = doc.content.toLowerCase();
        const title = doc.title.toLowerCase();
        
        // Verifica se todos os termos de busca estão presentes
        const hasAllTerms = searchTerms.every(term => 
            content.includes(term) || title.includes(term)
        );

        if (hasAllTerms) {
            // Encontra o primeiro trecho relevante
            let snippet = 'Nenhum trecho encontrado.'; // Valor padrão
            let firstTermIndex = -1;

            // Encontra o índice da primeira ocorrência de qualquer termo de busca
            for (const term of searchTerms) {
                const termIndex = content.indexOf(term);
                 if (termIndex !== -1) {
                     if (firstTermIndex === -1 || termIndex < firstTermIndex) {
                         firstTermIndex = termIndex;
                     }
                 }
            }

            // Se um termo foi encontrado, cria o snippet
            if (firstTermIndex !== -1) {
                const start = Math.max(0, firstTermIndex - 50); // Começa 50 chars antes
                const end = Math.min(content.length, firstTermIndex + 150); // Pega 150 chars depois
                // Pega o conteúdo bruto original para o snippet
                snippet = doc.content.substring(start, end); 
            } else {
                 // Se nenhum termo foi achado no conteúdo, mas achou no título, pega o início do conteúdo
                 if (searchTerms.some(term => title.includes(term))) {
                      snippet = doc.content.substring(0, 200); // Pega os primeiros 200 caracteres
                 }
            }

            results.push({
                title: doc.title,
                path: doc.path,
                snippet: snippet // Armazena o snippet bruto
            });
        }
    }

    displaySearchResults(results, query);
}

// Função para exibir os resultados da busca
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsCount = document.getElementById('searchResultsCount');
    if (!resultsContainer || !resultsCount) {
        console.error('Elementos de busca (modal) não encontrados no DOM.');
        return;
    }
    
    resultsContainer.innerHTML = ''; // Limpa resultados anteriores
    resultsCount.textContent = `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`;

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item">
                <h3>Nenhum resultado encontrado</h3>
                <p class="snippet-container">Tente usar termos diferentes ou mais específicos.</p>
            </div>
        `;
    } else {
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            // Sanitize o título antes de usá-lo
            const cleanTitle = DOMPurify.sanitize(result.title || "Título Indisponível", { USE_PROFILES: { html: true } });
            
            // Sanitize o snippet ANTES de destacar
            let cleanSnippet = DOMPurify.sanitize(result.snippet || "", { USE_PROFILES: { html: true } });
            
            // Destaca os termos de busca no snippet JÁ SANITIZADO
            // Usar um placeholder seguro para o highlight para evitar re-injeção
            const highlightStartTag = '{{HIGHLIGHT_START}}';
            const highlightEndTag = '{{HIGHLIGHT_END}}';
            
            query.toLowerCase().split(' ').filter(term => term.length > 0).forEach(term => {
                // Regex para encontrar o termo (case-insensitive) fora de tags HTML potenciais
                // Isso é complexo e pode não ser perfeito. Uma abordagem mais robusta usaria manipulação de DOM.
                try {
                    // Escapa caracteres especiais do termo para usar em Regex
                     const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                     // Regex para encontrar o termo ignorando case
                     const regex = new RegExp(escapedTerm, 'gi'); 
                     cleanSnippet = cleanSnippet.replace(regex, match => 
                         `${highlightStartTag}${match}${highlightEndTag}`
                     );
                } catch (e) {
                     console.error("Erro ao aplicar regex para highlight:", e);
                }
            });

             // Substitui os placeholders pelas tags span reais
            cleanSnippet = cleanSnippet.replace(new RegExp(highlightStartTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '<span class="highlight">');
            cleanSnippet = cleanSnippet.replace(new RegExp(highlightEndTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '</span>');


            // Extrai o caminho do arquivo para mostrar a hierarquia
            const pathParts = result.path ? result.path.split(/[\\/]/) : []; // Trata path nulo/inválido e separadores \ ou /
            const version = pathParts.length > 0 ? pathParts[0] : 'N/A';
            const language = pathParts.length > 1 ? pathParts[1] : 'N/A';
             // Junta as partes restantes do caminho, tratando path nulo
            const filePath = pathParts.length > 2 ? pathParts.slice(2).join(' > ') : (result.path || "Caminho Indisponível");

            // Cria o HTML do item. NÃO use innerHTML diretamente com cleanSnippet aqui se ele já foi manipulado com replace.
            // É mais seguro construir o DOM programaticamente, mas para simplificar:
            const titleElement = document.createElement('h3');
             // Use textContent para o título e o path para evitar problemas
             titleElement.textContent = `${result.title || "Título Indisponível"} `; 
             const pathSpan = document.createElement('span');
             pathSpan.className = 'result-path';
             pathSpan.textContent = `(${filePath})`;
             titleElement.appendChild(pathSpan);

             const snippetContainer = document.createElement('div');
             snippetContainer.className = 'snippet-container';
             // Agora podemos usar innerHTML pois o conteúdo foi sanitizado e os highlights adicionados com cuidado
             snippetContainer.innerHTML = `...${cleanSnippet}...`; 

             const metaDiv = document.createElement('div');
             metaDiv.className = 'result-meta';
             metaDiv.innerHTML = `
                 <span>Versão: ${version}</span>
                 <span>Idioma: ${language}</span>
             `;

             item.appendChild(titleElement);
             item.appendChild(snippetContainer);
             item.appendChild(metaDiv);


            item.addEventListener('click', () => {
                if (result.path) {
                     loadContent(result.path);
                     hideSearchModal();
                } else {
                     console.error("Tentativa de carregar resultado de busca sem caminho definido.");
                }
            });

            resultsContainer.appendChild(item);
        });
    }

    showSearchModal();
}


function showSearchModal() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('searchModalOverlay'); // Assumindo que existe um overlay
    
    if (!modal) {
        console.error("Elemento do modal de busca ('searchModal') não encontrado.");
        return;
    }

    if (overlay) {
        overlay.classList.add('active');
        // Fechar ao clicar no overlay (adicionar apenas uma vez)
        if (!overlay.dataset.listenerAttached) { // Evita adicionar múltiplos listeners
            overlay.addEventListener('click', hideSearchModal);
            overlay.dataset.listenerAttached = 'true';
        }
    }
    modal.classList.add('active');

    // Fechar ao pressionar ESC (adicionar apenas uma vez)
    if (!document.body.dataset.escListenerAttached) { // Evita adicionar múltiplos listeners
        document.addEventListener('keydown', handleEscKey);
        document.body.dataset.escListenerAttached = 'true';
    }
}

function hideSearchModal() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('searchModalOverlay'); // Assumindo que existe um overlay
    
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    // Remover listener ESC para não ficar ativo desnecessariamente
    document.removeEventListener('keydown', handleEscKey);
    if (document.body.dataset.escListenerAttached) {
         delete document.body.dataset.escListenerAttached;
    }
}

// Função separada para lidar com ESC
function handleEscKey(e) {
    if (e.key === 'Escape') {
        hideSearchModal();
    }
}

// Inicializa a busca no DOMContentLoaded
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const closeButton = document.querySelector('.close-search-modal');
    
    if (!searchInput) {
        console.error('Elemento searchInput não encontrado no DOM. Busca desativada.');
        return;
    }
    
    // Placeholder inicial e desabilitado até o índice carregar
    searchInput.placeholder = 'Carregando índice...';
    searchInput.disabled = true;
    
    // Configura o evento de input com debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            performSearch(e.target.value);
        }, 300); // 300ms debounce
    });

    // Adiciona evento de "Enter" para buscar imediatamente
     searchInput.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') {
             clearTimeout(searchDebounceTimer); // Cancela debounce se houver
             performSearch(e.target.value);
         }
     });

    // Fecha o modal ao clicar no botão de fechar
    if (closeButton) {
        closeButton.addEventListener('click', hideSearchModal);
    } else {
        console.warn("Botão para fechar modal de busca ('.close-search-modal') não encontrado.");
    }
}

// --- Funções da Barra Lateral e Conteúdo ---

function initDropdowns() {
    if (dropdownsInitialized) return;

    const versionSelect = document.getElementById('versionSelect');
    const languageSelect = document.getElementById('languageSelect');

    if (!versionSelect || !languageSelect) {
        console.error("Dropdowns de versão ou idioma não encontrados. Inicialização abortada.");
        return;
    }

    // Limpa opções existentes (caso seja chamado novamente)
    versionSelect.innerHTML = '';
    languageSelect.innerHTML = '';

    // Popular versões da estrutura principal
    const versions = structure.filter(item => item.type === 'directory' && item.name);
    if (versions.length === 0) {
         console.warn("Nenhuma versão encontrada na estrutura principal ('structure.json').");
         // Adicionar uma opção padrão ou desabilitar?
         const defaultOption = new Option("N/A", "");
         defaultOption.disabled = true;
         versionSelect.add(defaultOption);
    } else {
        versions.forEach(version => {
            const option = new Option(version.name, version.name);
            versionSelect.add(option);
        });
    }
    
    // Popular idiomas (assume que as versões têm subdiretórios 'en' e 'pt')
    // Uma abordagem mais robusta verificaria os idiomas disponíveis na versão selecionada
    const availableLanguages = ['pt', 'en']; // Definir explicitamente ou detectar da estrutura
    availableLanguages.forEach(lang => {
        const option = new Option(lang.toUpperCase(), lang);
        languageSelect.add(option);
    });
    
    // Definir valores padrão ou salvos
    versionSelect.value = currentVersion;
    languageSelect.value = currentLanguage;
    
    // Adicionar listeners apenas uma vez
    if (!versionSelect.dataset.listenerAttached) {
        versionSelect.addEventListener('change', handleVersionChange);
        versionSelect.dataset.listenerAttached = 'true';
    }
    if (!languageSelect.dataset.listenerAttached) {
        languageSelect.addEventListener('change', handleLanguageChange);
        languageSelect.dataset.listenerAttached = 'true';
    }
    
    dropdownsInitialized = true;
    console.log("Dropdowns inicializados.");
}

function handleVersionChange(e) {
    const newVersion = e.target.value;
    if (newVersion !== currentVersion) {
         console.log(`Versão alterada para: ${newVersion}`);
         currentVersion = newVersion;
         localStorage.setItem('docVersion', currentVersion);
         updateSidebarAndContent(true); // Atualiza sidebar e tenta carregar o mesmo arquivo
         preloadContent(); // Recarrega o índice para a nova versão
    }
}

function handleLanguageChange(e) {
    const newLanguage = e.target.value;
    if (newLanguage !== currentLanguage) {
         console.log(`Idioma alterado para: ${newLanguage}`);
         currentLanguage = newLanguage;
         localStorage.setItem('docLanguage', currentLanguage);
         updateSidebarAndContent(true); // Atualiza sidebar e tenta carregar o mesmo arquivo
         preloadContent(); // Recarrega o índice para o novo idioma
    }
}

// Atualiza a sidebar e opcionalmente tenta carregar o mesmo arquivo relativo
function updateSidebarAndContent(tryLoadSameFile = false) {
     const sidebar = document.getElementById('sidebar-content');
     if (!sidebar) {
          console.error("Elemento 'sidebar-content' não encontrado.");
          return;
     }
     sidebar.innerHTML = ''; // Limpa a sidebar

     const versionData = structure.find(v => v.name === currentVersion);
     if (!versionData || !versionData.children) {
          console.warn(`Dados não encontrados para a versão '${currentVersion}' na estrutura.`);
          sidebar.innerHTML = '<div>Estrutura de versão não encontrada.</div>';
          // Limpar conteúdo principal também?
           document.getElementById('content').innerHTML = '<div class="content-container"><h1>Erro</h1><p>Não foi possível carregar a estrutura da documentação para esta versão.</p></div>';
          return;
     }

     const languageData = versionData.children.find(l => l.name === currentLanguage);
     if (!languageData || !languageData.children) {
          console.warn(`Dados não encontrados para o idioma '${currentLanguage}' na versão '${currentVersion}'.`);
          sidebar.innerHTML = '<div>Estrutura de idioma não encontrada.</div>';
          // Limpar conteúdo principal também?
           document.getElementById('content').innerHTML = '<div class="content-container"><h1>Erro</h1><p>Não foi possível carregar a estrutura da documentação para este idioma.</p></div>';
           return;
     }

     buildSidebarTree(languageData.children, sidebar);
     console.log(`Sidebar atualizada para ${currentVersion}/${currentLanguage}.`);

     // Se `tryLoadSameFile` for true, tenta carregar o mesmo arquivo no novo contexto
     if (tryLoadSameFile && currentPath) {
         // Extrai o caminho relativo após a versão e idioma
         const pathParts = currentPath.split(/[\\/]/);
         if (pathParts.length > 2) {
              const relativePath = pathParts.slice(2).join('/'); // Usa / como separador padrão
              const newPath = `${currentVersion}/${currentLanguage}/${relativePath}`;
              
              console.log(`Tentando carregar arquivo correspondente: ${newPath}`);
              // Verifica se o novo caminho existe no índice antes de carregar
               if (searchIndex[newPath]) { // Verifica no índice atual (pode não estar carregado ainda)
                   loadContent(newPath); 
               } else {
                    // Se não achar o arquivo correspondente, carrega a página inicial
                    console.log(`Arquivo correspondente '${newPath}' não encontrado. Carregando página inicial.`);
                    loadIndexContent();
               }
         } else {
             // Se o caminho antigo era inválido ou apenas versão/idioma, carrega a inicial
             loadIndexContent();
         }
     } else if (!currentPath) {
          // Se não havia caminho atual, carrega a página inicial
          loadIndexContent();
     } else {
          // Se tryLoadSameFile é false, mas havia um currentPath, apenas destaca
          highlightCurrentFile();
     }
}


function buildSidebarTree(items, parentElement) {
     if (!items || !Array.isArray(items)) {
          console.warn("Tentativa de construir sidebar com itens inválidos:", items);
          return;
     }

    items.forEach(item => {
        if (!item || !item.type || !item.name) {
             console.warn("Item inválido encontrado na estrutura da sidebar:", item);
             return; // Pula item inválido
        }

        if (item.type === 'directory') {
            const folderWrapper = document.createElement('div');
            folderWrapper.className = 'sidebar-folder-wrapper'; // Classe para estilização se necessário

            const folderElement = document.createElement('div');
            folderElement.className = 'sidebar-item sidebar-folder';
             folderElement.setAttribute('data-path', item.path || ''); // Adiciona path da pasta
            folderElement.innerHTML = `
                <span class="folder-icon">▸</span>
                <span class="folder-name">${item.name}</span> 
            `;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            childrenContainer.style.display = 'none'; // Começa fechado

            folderElement.addEventListener('click', (e) => {
                // Evita que o clique no ícone ou nome feche/abra se já estiver tratando
                 if (e.target.classList.contains('folder-icon') || e.target.classList.contains('folder-name')) {
                     e.stopPropagation(); // Impede propagação para o wrapper se necessário
                     const isOpen = folderElement.classList.toggle('open');
                     childrenContainer.style.display = isOpen ? 'block' : 'none';
                     folderElement.querySelector('.folder-icon').textContent = isOpen ? '▾' : '▸';
                 }
            });

             // Chama recursivamente SOMENTE se houver filhos válidos
             if (item.children && Array.isArray(item.children) && item.children.length > 0) {
                  buildSidebarTree(item.children, childrenContainer);
                   folderWrapper.appendChild(folderElement);
                   folderWrapper.appendChild(childrenContainer);
                   parentElement.appendChild(folderWrapper);
             } else if (item.children && !Array.isArray(item.children)) {
                 console.warn(`'children' do diretório '${item.name}' não é um array.`);
                  // Ainda adiciona a pasta, mas vazia
                  folderWrapper.appendChild(folderElement);
                  parentElement.appendChild(folderWrapper);
             } else {
                  // Não adiciona pastas completamente vazias OU adiciona com indicação?
                  // console.log(`Diretório '${item.name}' está vazio, não será adicionado.`);
                   // Ou adiciona mesmo vazio:
                   folderWrapper.appendChild(folderElement);
                   parentElement.appendChild(folderWrapper);
             }

        } else if (item.type === 'file' && item.path && item.path.endsWith('.md')) {
            const fileElement = document.createElement('div');
            fileElement.className = 'sidebar-item file';
            fileElement.setAttribute('data-path', item.path); // Caminho completo é crucial
            // Usa textContent para o título para evitar XSS aqui também
             const fileNameSpan = document.createElement('span');
             fileNameSpan.className = 'file-name';
             fileNameSpan.textContent = item.title || item.name.replace('.md', '');

            fileElement.innerHTML = `<span class="file-icon">•</span>`; // Ícone
             fileElement.appendChild(fileNameSpan); // Adiciona o nome do arquivo
            
            fileElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique se propague para a pasta pai
                document.querySelectorAll('.sidebar-item.file.active').forEach(el => el.classList.remove('active'));
                fileElement.classList.add('active');
                console.log("Clicou no arquivo:", item.path);
                loadContent(item.path); // Carrega o conteúdo
            });
            
            parentElement.appendChild(fileElement);
        }
        // Ignora outros tipos de item ou arquivos não-markdown
    });
}

function highlightCurrentFile() {
    if (!currentPath) return;
    
    let found = false;
    document.querySelectorAll('.sidebar-item.file').forEach(el => {
        const filePath = el.getAttribute('data-path');
        
        // Comparação mais robusta (normalizar separadores?)
        if (filePath && filePath.replace(/\\/g, '/') === currentPath.replace(/\\/g, '/')) {
            el.classList.add('active');
            found = true;
            
            // Tenta rolar para a visão
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Abrir os diretórios pais recursivamente
            let parent = el.closest('.sidebar-folder-wrapper'); // Encontra o wrapper da pasta pai mais próximo
            while (parent) {
                const folderElement = parent.querySelector('.sidebar-folder');
                const childrenContainer = parent.querySelector('.children-container');
                if (folderElement && childrenContainer) {
                    folderElement.classList.add('open');
                    childrenContainer.style.display = 'block';
                    const icon = folderElement.querySelector('.folder-icon');
                    if (icon) icon.textContent = '▾';
                }
                 // Sobe para o próximo wrapper pai
                 // A estrutura esperada é: div.sidebar-folder-wrapper > div.children-container > div.sidebar-folder-wrapper
                 let grandParentContainer = parent.parentElement; // Pode ser .children-container ou #sidebar-content
                 if (grandParentContainer && grandParentContainer.classList.contains('children-container')) {
                      parent = grandParentContainer.closest('.sidebar-folder-wrapper');
                 } else {
                      parent = null; // Chegou ao topo ou estrutura inesperada
                 }
            }
        } else {
            el.classList.remove('active');
        }
    });
    if (!found) {
        console.warn(`Arquivo ativo (${currentPath}) não encontrado na sidebar atual.`);
    }
}

// Função para pré-processar callouts no Markdown ANTES de passar para o marked.js
function preProcessCallouts(markdown) {
    if (typeof markdown !== 'string') return ''; // Garante que é string

    // Expressão regular para encontrar callouts: :::(tipo) (Título) ... \n:::
    const calloutRegex = /::: MENSAGEM\s*\r?\n:::\s*([\s\S]*?)\r?\n:::/gm; // Exemplo: Encontrar '::: MENSAGEM'

    // Regex mais específico para o formato :::(Tipo) (Título) Conteúdo :::
     const specificCalloutRegex = /:::\s*\((\w+)\)\s*\(?([^\n\r]*)\)?\s*\r?\n([\s\S]*?)\r?\n:::/gm;

    let processedMarkdown = markdown.replace(specificCalloutRegex, (match, type, title, content) => {
        const calloutType = type.toLowerCase();
        // Limpa espaços extras do título e conteúdo
        const cleanTitle = title.trim();
        const cleanContent = content.trim(); 

        // Gera o HTML diretamente. O marked.js geralmente respeita HTML bruto.
        // Importante: O CONTEÚDO INTERNO (cleanContent) será processado pelo marked.js depois!
        // A sanitização principal ocorrerá APÓS o marked.parse completo.
        return `<div class="callout callout-${calloutType}">
<div class="callout-title">${cleanTitle}</div>
<div class="callout-content">
${cleanContent} 
</div>
</div>`;
    });

    // Remover tags de fechamento perdidas (se a regex não capturar tudo perfeitamente)
    processedMarkdown = processedMarkdown.replace(/^\s*:::\s*$/gm, ''); // Remove linhas contendo apenas :::

    return processedMarkdown;
}

// Função para carregar e renderizar conteúdo Markdown
function loadContent(path) {
    if (!path) {
        console.error("Tentativa de carregar conteúdo com caminho vazio.");
        loadFallbackContent("Caminho inválido fornecido.");
        return;
    }

    console.log("Carregando conteúdo de:", path);
    currentPath = path;
    currentFile = path.split(/[\\/]/).pop(); // Pega o nome do arquivo
    
    localStorage.setItem('currentPath', currentPath); // Salva o caminho atual

    // Atualizar a URL no navegador (sem recarregar a página)
    try {
        const newUrl = `${window.location.origin}${window.location.pathname}?article=${encodeURIComponent(path)}`;
        history.pushState({ path }, '', newUrl);
    } catch (e) {
        console.warn("Não foi possível atualizar a URL com history.pushState:", e);
        // Pode acontecer em iframes ou ambientes restritos
    }

    fetch(path)
        .then(response => {
            if (!response.ok) {
                 // Lança um erro para ser pego pelo .catch()
                 throw new Error(`Falha ao carregar ${path}: Status ${response.status}`); 
            }
            return response.text();
        })
        .then(markdown => {
            // Pré-processa os callouts ANTES de enviar para o marked
            const processedMarkdown = preProcessCallouts(markdown);
            
            // Renderiza com Marked
            let htmlContent = '';
            try {
                 htmlContent = marked.parse(processedMarkdown);
            } catch (markedError) {
                 console.error("Erro durante marked.parse:", markedError);
                 loadFallbackContent(`Erro ao processar Markdown do arquivo: ${path}`);
                 return; // Aborta se o marked falhar
            }

            // ** SANITIZAÇÃO **
            let cleanHtml = '';
             try {
                 cleanHtml = DOMPurify.sanitize(htmlContent); // Sanitize o HTML gerado
             } catch (sanitizeError) {
                 console.error("Erro durante DOMPurify.sanitize:", sanitizeError);
                 loadFallbackContent(`Erro ao sanitizar conteúdo do arquivo: ${path}`);
                 return; // Aborta se a sanitização falhar
             }
            
             const contentElement = document.getElementById('content');
             if (contentElement) {
                 contentElement.innerHTML = `
                     <div class="content-container">
                         ${cleanHtml} // Usa o HTML SANITIZADO
                     </div>
                 `;
                 contentElement.scrollTop = 0; // Rola para o topo ao carregar novo conteúdo
             } else {
                 console.error("Elemento 'content' não encontrado para inserir HTML.");
                 return; // Aborta se não puder inserir o conteúdo
             }
            
            // Funções pós-renderização
             addHeadingIDs(); // Adiciona IDs primeiro
             generateTOC();   // Gera TOC depois dos IDs
             setupScrollSpy(); // Configura ScrollSpy por último
             highlightCurrentFile(); // Garante que o arquivo certo está destacado
        })
        .catch(error => {
            console.error('Erro ao carregar ou processar conteúdo:', path, error);
            loadFallbackContent(error.message); // Mostra a mensagem de erro
            currentPath = null; // Reseta o caminho atual em caso de erro
             localStorage.removeItem('currentPath'); // Remove do localStorage também
        });
}

// Carrega a página inicial (senhasegura.md ou similar)
function loadIndexContent() {
     // Define o caminho padrão baseado na versão/idioma atual
     // Tenta carregar 'senhasegura.md', se não existir, tenta 'README.md' ou outro padrão
     const defaultFiles = ['senhasegura.md', 'README.md', 'index.md']; // Adicione outros padrões se necessário
     let foundDefault = false;

      for (const defaultFile of defaultFiles) {
          const potentialPath = `${currentVersion}/${currentLanguage}/${defaultFile}`;
          // Verifica se existe no índice (se já carregado) ou tenta um fetch rápido
           // Idealmente, a estrutura JSON indicaria qual é o arquivo inicial
          // Por enquanto, vamos apenas tentar carregar o primeiro padrão
           loadContent(potentialPath); 
           foundDefault = true; // Assume que vai carregar ou falhar no loadContent
           break; 
      }

       if (!foundDefault) {
            console.warn("Nenhum arquivo inicial padrão encontrado. Exibindo mensagem.");
            loadFallbackContent("Nenhum documento inicial encontrado para esta versão/idioma.");
       }

    // Não força colapso da barra lateral aqui, deixa o highlight cuidar disso
    // Atualizar a URL para remover o parâmetro 'article'
    try {
        const newUrl = `${window.location.origin}${window.location.pathname}`; // URL base
        history.replaceState(null, '', newUrl); // Use replaceState para não criar entrada no histórico
    } catch(e) {
        console.warn("Não foi possível limpar a URL com history.replaceState:", e);
    }
}

// Função de fallback para erros de carregamento
function loadFallbackContent(errorMessage = "O conteúdo não pôde ser carregado.") {
    const contentElement = document.getElementById('content');
    if (contentElement) {
        // Sanitize a mensagem de erro antes de exibi-la
         const cleanErrorMessage = DOMPurify.sanitize(errorMessage);
        contentElement.innerHTML = `
            <div class="content-container">
                <h1>Erro ao Carregar Conteúdo</h1>
                <p>Ocorreu um problema ao tentar exibir o documento solicitado.</p>
                <p><strong>Detalhes:</strong> ${cleanErrorMessage}</p>
                <p>Por favor, tente navegar para outro documento usando a barra lateral ou verifique o console para mais informações técnicas.</p>
            </div>
        `;
         // Limpa o TOC também
         const tocNav = document.getElementById('toc-nav');
         if (tocNav) tocNav.innerHTML = ''; 
    } else {
        console.error("Elemento 'content' não encontrado para exibir mensagem de fallback.");
    }
}

// --- Funções de Tabela de Conteúdos (TOC) e Scroll Spy ---

// Gera TOC dinâmica
function generateTOC() {
    const tocNav = document.getElementById('toc-nav');
    const contentContainer = document.querySelector('.content-container'); // Busca dentro do container correto

     if (!tocNav) {
         console.warn("Elemento 'toc-nav' não encontrado para gerar TOC.");
         return;
     }
     if (!contentContainer) {
          console.warn("Elemento '.content-container' não encontrado para gerar TOC.");
          tocNav.innerHTML = ''; // Limpa TOC se não houver conteúdo
          return;
     }
    
    const headings = contentContainer.querySelectorAll('h1, h2, h3'); // Limita aos níveis 1, 2 e 3
    tocNav.innerHTML = ''; // Limpa TOC anterior

     if (headings.length === 0) {
         // Opcional: exibir mensagem "Sem seções" ou ocultar TOC
          // tocNav.innerHTML = '<span class="toc-empty">Nenhuma seção nesta página.</span>';
          console.log("Nenhum heading encontrado para gerar TOC.");
         return;
     }
    
    headings.forEach(heading => {
        // Ignorar headings vazios
         if (!heading.textContent.trim()) return;

        const level = heading.tagName.toLowerCase(); // h1, h2, h3
        const text = heading.textContent.trim();
        const id = heading.id; // Usa o ID já adicionado por addHeadingIDs()

         if (!id) {
             console.warn("Heading sem ID encontrado, pulando no TOC:", text);
             return; // Pula headings que não conseguiram gerar ID
         }
        
        const tocItem = document.createElement('a');
        tocItem.href = `#${id}`;
        tocItem.className = `toc-item ${level}`; // Adiciona classe h1, h2, h3
        tocItem.textContent = text;
        
        // Adicionar evento de clique para scroll suave e atualização de URL
        tocItem.addEventListener('click', (e) => {
            e.preventDefault(); // Previne o salto padrão do navegador
            const targetHeading = document.getElementById(id);
            if (targetHeading) {
                 // Calcula a posição com um pequeno offset do topo
                 const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 70; // Altura da navbar
                 const offsetTop = targetHeading.getBoundingClientRect().top + window.scrollY - navbarHeight - 10; // 10px de margem

                 window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                
                 // Atualizar a URL com o hash sem recarregar (opcional, pode poluir histórico)
                 // history.pushState(null, '', `#${id}`); 
                 // Ou usar replaceState para não adicionar ao histórico
                 history.replaceState(null, '', `#${id}`); 
            } else {
                 console.warn(`Link do TOC clicado, mas heading #${id} não encontrado no DOM.`);
            }
        });
        
        tocNav.appendChild(tocItem);
    });
}

// Adiciona IDs automáticos aos headings se não existirem
function addHeadingIDs() {
    const contentContainer = document.querySelector('.content-container');
     if (!contentContainer) return;

    contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
        if (!heading.id) {
             // Cria um ID mais robusto
             let baseId = heading.textContent
                 .trim()
                 .toLowerCase()
                 .replace(/[^\w\s-]/g, '') // Remove caracteres não-alfanuméricos exceto espaço e hífen
                 .replace(/\s+/g, '-') // Substitui espaços por hífens
                 .replace(/-+/g, '-'); // Remove hífens duplicados
            
            // Evita IDs vazios ou apenas hífens
             if (!baseId || baseId === '-') {
                 baseId = `heading-${index}`;
             }

             // Garante unicidade (simples, adiciona sufixo se necessário)
             let finalId = baseId;
             let counter = 1;
             while (document.getElementById(finalId)) {
                 finalId = `${baseId}-${counter}`;
                 counter++;
             }
             heading.id = finalId;
        }
    });
}

// Scroll Spy para destacar itens ativos no TOC
let scrollSpyObserver = null; // Variável global para o observer

function setupScrollSpy() {
    // Desconecta o observer anterior, se existir
    if (scrollSpyObserver) {
        scrollSpyObserver.disconnect();
        console.log("ScrollSpy Observer desconectado.");
    }

    const tocNav = document.getElementById('toc-nav');
     const contentElement = document.getElementById('content'); // O elemento que tem scroll
     if (!tocNav || !contentElement) {
         console.warn("Não foi possível configurar ScrollSpy: toc-nav ou content não encontrado.");
         return;
     }
    const tocItems = tocNav.querySelectorAll('.toc-item');
     if (tocItems.length === 0) {
         console.log("ScrollSpy não iniciado: TOC está vazio.");
         return; // Não faz nada se o TOC estiver vazio
     }

    const observerOptions = {
        root: contentElement, // Observa intersecção dentro do container de conteúdo
        rootMargin: '0px 0px -70% 0px', // Margem para ativar quando o item está no topo (ajuste conforme necessário)
        threshold: 0 // Ativa assim que qualquer parte entra/sai da margem
    };

    // Set para rastrear os itens visíveis
     let visibleHeadings = new Set();

    scrollSpyObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.id;
            if (entry.isIntersecting) {
                 visibleHeadings.add(id);
            } else {
                 visibleHeadings.delete(id);
            }
        });

        // Remove destaque de todos
        tocItems.forEach(item => item.classList.remove('active'));

        // Encontra o item visível mais acima na página
         let topVisibleId = null;
         let minTop = Infinity;

         visibleHeadings.forEach(id => {
             const headingElement = document.getElementById(id);
             if (headingElement) {
                  const top = headingElement.getBoundingClientRect().top;
                  if (top >= 0 && top < minTop) { // Considera apenas os que estão na viewport ou abaixo do topo
                       minTop = top;
                       topVisibleId = id;
                  }
             }
         });
        
        // Se nenhum estiver visível acima, tenta pegar o último que saiu (se houver um ativo)
         // Esta lógica pode ser complexa. Simplificando: destacar o mais acima visível.
        
        // Destaca o item correspondente ao heading mais acima visível
        if (topVisibleId) {
            const activeTocItem = tocNav.querySelector(`.toc-item[href="#${topVisibleId}"]`);
            if (activeTocItem) {
                activeTocItem.classList.add('active');
                 // Opcional: rolar o TOC para manter o item ativo visível
                 // activeTocItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            // Se nenhum estiver visível (ex: rolou muito rápido ou está no final),
             // talvez destacar o primeiro ou o último toc item? Ou nenhum.
             // Por enquanto, não destaca nenhum se nada estiver na área de ativação.
        }

    }, observerOptions);

    // Observa todos os headings que têm links no TOC
     tocItems.forEach(item => {
         const id = item.getAttribute('href').substring(1); // Pega o ID do href (#meu-id -> meu-id)
         const headingElement = document.getElementById(id);
         if (headingElement) {
             scrollSpyObserver.observe(headingElement);
         } else {
             console.warn(`ScrollSpy: Heading com ID '${id}' referenciado no TOC não encontrado no conteúdo.`);
         }
     });
     console.log("ScrollSpy configurado e observando headings.");
}

// --- Funções de Feedback ---

// Adiciona listeners aos botões de feedback (se existirem)
function initializeFeedbackButtons() {
    const likeBtn = document.querySelector('.like-btn');
    const dislikeBtn = document.querySelector('.dislike-btn');

    if (likeBtn) {
        likeBtn.addEventListener('click', () => showFeedbackModal('like'));
    } else {
        console.warn("Botão de 'like' não encontrado.");
    }
    if (dislikeBtn) {
        dislikeBtn.addEventListener('click', () => showFeedbackModal('dislike'));
    } else {
        console.warn("Botão de 'dislike' não encontrado.");
    }
}

// Função para criar e exibir o modal de feedback
function showFeedbackModal(type) {
    // Remover modal anterior, se existir
    const existingModal = document.querySelector('.feedback-modal');
    if (existingModal) existingModal.remove();
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Cria o overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay'; // Classe para estilização do fundo escuro
    
    // Cria o modal
    const modal = document.createElement('div');
    modal.className = 'feedback-modal';
    // Usa textContent para títulos e labels para segurança
     const modalTitleText = type === 'like' ? 'Obrigado pelo seu feedback!' : 'Ajude-nos a melhorar!';
     const messageLabelText = type === 'like' ? 'Gostaria de adicionar um comentário? (Opcional)' : 'Por favor, descreva o que podemos melhorar ou o que está faltando:';
     const submitButtonText = 'Enviar Feedback';
     const closeButtonText = '×';

    modal.innerHTML = `
        <div class="feedback-modal-content">
            <button class="close-modal" aria-label="Fechar Modal">${closeButtonText}</button>
            <h3></h3> 
            <form id="feedbackForm">
                <input type="hidden" id="feedbackType" name="feedback_type" value="${type}">
                <input type="hidden" id="pageUrl" name="page_url" value="${window.location.href}">
                 <input type="hidden" id="docPath" name="document_path" value="${currentPath || 'N/A'}">
                <div class="form-group">
                    <label for="message"></label>
                    <textarea id="message" name="message" rows="5" placeholder="Escreva sua mensagem aqui..." ${type === 'dislike' ? 'required' : ''}></textarea> 
                </div>
                <button type="submit" class="submit-feedback">${submitButtonText}</button>
            </form>
        </div>
    `;

     // Define textos com segurança
     modal.querySelector('h3').textContent = modalTitleText;
     modal.querySelector('label[for="message"]').textContent = messageLabelText;

    // Adiciona ao corpo
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden'; // Impede scroll do fundo

    // Foco no textarea ao abrir
     modal.querySelector('#message').focus();

    // Funções para fechar o modal
    const closeModal = () => {
        modal.remove();
        overlay.remove();
        document.body.style.overflow = ''; // Restaura scroll
    };

    // Fecha ao clicar no botão de fechar
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    // Fecha ao clicar no overlay
    overlay.addEventListener('click', closeModal);
     // Fecha ao pressionar ESC
     const escapeListener = (e) => {
         if (e.key === 'Escape') {
             closeModal();
             document.removeEventListener('keydown', escapeListener); // Remove o listener
         }
     };
     document.addEventListener('keydown', escapeListener);

    // Lida com o envio do formulário
    modal.querySelector('#feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('.submit-feedback');
        const formData = new FormData(form);
        
        // Feedback visual de envio
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            // Enviar o feedback (substitua pela URL correta do Formspree ou seu endpoint)
            const response = await fetch('https://formspree.io/f/mjkygnje', { // <- VERIFIQUE ESTA URL
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json' // Formspree prefere este header
                }
            });

            if (response.ok) {
                // Exibe mensagem de sucesso dentro do modal antes de fechar
                 form.innerHTML = '<p style="text-align: center; color: green;">Obrigado! Seu feedback foi enviado com sucesso.</p>';
                 setTimeout(closeModal, 2500); // Fecha após 2.5 segundos
            } else {
                 const errorData = await response.json().catch(() => ({})); // Tenta pegar erro do Formspree
                 console.error('Erro na resposta do Formspree:', response.status, errorData);
                 // Exibe mensagem de erro dentro do modal
                 form.innerHTML = `<p style="text-align: center; color: red;">Erro ${response.status}: Não foi possível enviar o feedback. Tente novamente mais tarde.</p>`;
                 submitButton.disabled = false; // Reabilita o botão se quiser permitir nova tentativa
                 submitButton.textContent = submitButtonText; 
                 setTimeout(closeModal, 4000); // Fecha após 4 segundos
            }
        } catch (error) {
            console.error('Erro de rede ao enviar feedback:', error);
             form.innerHTML = `<p style="text-align: center; color: red;">Erro de conexão. Verifique sua internet e tente novamente.</p>`;
             submitButton.disabled = false;
             submitButton.textContent = submitButtonText;
             setTimeout(closeModal, 4000);
        }
    });
}

// --- Navegação e Inicialização ---

// Lidar com o evento popstate (navegação pelo histórico do navegador)
window.addEventListener('popstate', (event) => {
    console.log("Evento popstate disparado:", event.state);
    if (event.state && event.state.path) {
        // Encontrou um estado com caminho, carrega esse conteúdo
        loadContent(event.state.path);
        // O highlight deve ser chamado dentro do loadContent após a renderização
    } else {
        // Estado nulo ou sem caminho, carrega a página inicial
        loadIndexContent();
    }
});

// Configuração Inicial no Carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Carregado. Iniciando configuração.");

    // Configurar clique no logo para ir para a página inicial
    const companyLogoLink = document.querySelector('.company-name'); // Usar o link <a>
    if (companyLogoLink) {
        companyLogoLink.addEventListener('click', (e) => {
            e.preventDefault(); // Previne navegação padrão do link
            console.log("Logo clicado, carregando página inicial.");
            loadIndexContent(); // Carrega o conteúdo inicial
        });
    } else {
        console.warn("Elemento do logo ('.company-name') não encontrado.");
    }
    
    // Inicializar sistema de busca
    initializeSearch();

    // Carregar a estrutura da documentação
    fetch('structure.json')
        .then(response => {
            if (!response.ok) {
                 throw new Error(`Falha ao carregar structure.json: Status ${response.status}`);
            }
             // Verifica o content-type para garantir que é JSON
             const contentType = response.headers.get("content-type");
             if (!contentType || !contentType.includes("application/json")) {
                 throw new TypeError("Oops, structure.json não é JSON!");
             }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                 throw new Error("Estrutura carregada ('structure.json') não é um array.");
            }
            structure = data; // Armazena a estrutura globalmente
            console.log("Estrutura da documentação carregada:", structure);
            
            initDropdowns(); // Inicializa os dropdowns com a estrutura carregada
            
            // Recupera o último estado ou verifica a URL atual
            const savedPath = localStorage.getItem('currentPath');
            const urlParams = new URLSearchParams(window.location.search);
            const articlePathFromUrl = urlParams.get('article');
            
            let initialPathToLoad = null;

            if (articlePathFromUrl) {
                 console.log("Encontrado 'article' na URL:", articlePathFromUrl);
                 initialPathToLoad = articlePathFromUrl;
            } else if (savedPath) {
                 console.log("Restaurando path do localStorage:", savedPath);
                 initialPathToLoad = savedPath;
            }

            // Carrega o conteúdo inicial (seja da URL, localStorage ou padrão)
            if (initialPathToLoad) {
                 // Verifica se o caminho recuperado ainda é válido para a versão/idioma atuais
                 // Isso pode ser complexo. Uma abordagem simples é apenas tentar carregar.
                 loadContent(initialPathToLoad);
            } else {
                 console.log("Nenhum 'article' na URL ou path salvo. Carregando página inicial.");
                 loadIndexContent(); // Carrega a página inicial padrão
            }

            // Inicializa os botões de feedback
            initializeFeedbackButtons();

            // Inicia o pré-carregamento do índice de busca EM SEGUNDO PLANO
            // Usar setTimeout para não bloquear a renderização inicial
             setTimeout(preloadContent, 1000); // Atraso de 1 segundo

        })
        .catch(error => {
            console.error('Erro fatal ao carregar ou processar structure.json:', error);
             // Exibe mensagem de erro grave para o usuário
             document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">
                 <h1>Erro Crítico</h1>
                 <p>Não foi possível carregar a estrutura da documentação (structure.json).</p>
                 <p>Por favor, verifique se o arquivo existe e está no formato JSON correto.</p>
                 <p>Detalhes: ${error.message}</p>
             </div>`;
        });
});

console.log("Script.js carregado e pronto.");