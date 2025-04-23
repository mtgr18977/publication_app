// script.js

// --- Configuração e Estado Global ---
// AJUSTE AQUI para a versão/idioma padrão com conteúdo disponível
const DEFAULT_VERSION = '1.0';
const DEFAULT_LANGUAGE = 'pt';
let currentVersion = localStorage.getItem('docVersion') || DEFAULT_VERSION;
let currentLanguage = localStorage.getItem('docLanguage') || DEFAULT_LANGUAGE;
let structure = []; // Estrutura carregada do structure.json
let currentPath = localStorage.getItem('currentPath') || null; // Caminho do arquivo MD atual
let searchIndex = {}; // Índice de busca { path: { title, content, path } }
let searchDebounceTimer = null;
let isPreloading = false;
let isInitialized = false; // Flag para evitar inicialização múltipla

// --- Funções de Utilitários e Processamento ---

/** Escapa caracteres HTML básicos. */
function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/** Escapa caracteres especiais para uso em Regex. */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pré-processa o Markdown para converter a sintaxe de callout personalizada em HTML.
 * @param {string} markdown - O conteúdo Markdown bruto.
 * @returns {string} - O Markdown com callouts convertidos para HTML.
 */
function preProcessCallouts(markdown) {
    const calloutRegex = /:::\s*\((\w+)\)\s*\(([^\n\)]+)\)\s*([\s\S]*?)\s*(?:\n:::|\n*$)/gm;

    // Verifica se 'marked' existe e tem o método 'parse'
    if (typeof marked !== 'object' || typeof marked.parse !== 'function') {
        console.error('Marked library or marked.parse function is not available!');
        // Retorna o markdown original ou lança um erro mais específico
        return markdown;
    }

    let processedMarkdown = markdown.replace(calloutRegex, (match, type, title, content) => {
         // Define trimmedContent DENTRO do escopo do callback
         const trimmedContent = content.trim();
         // Chama marked.parse DENTRO do escopo onde trimmedContent é válido
         const htmlContent = marked.parse(trimmedContent); // <-- USA marked.parse()

        return `<div class="callout callout-${type.toLowerCase().trim()}">
<div class="callout-title">${escapeHtml(title.trim())}</div>
<div class="callout-content">
${htmlContent}
</div>
</div>`;
    });

    processedMarkdown = processedMarkdown.replace(/\n?:::\s*$/gm, '');
    return processedMarkdown;
}

/** Adiciona IDs aos headings H1, H2, H3 se não tiverem. */
function addHeadingIDs() {
    const contentContainer = document.querySelector('.content-container');
    if (!contentContainer) return;

    const headings = contentContainer.querySelectorAll('h1, h2, h3');
    const existingIds = new Set();

    headings.forEach((heading, index) => {
        let id = heading.id;
        if (!id) {
             let baseId = heading.textContent
                .toLowerCase()
                .replace(/[^\w\s_-]/g, '') // Remove caracteres não alfanuméricos, exceto _ e -
                .trim()
                .replace(/\s+/g, '-');

             if (/^[0-9-]/.test(baseId)) {
                  baseId = `h-${baseId}`;
             }
              if (!baseId) {
                   baseId = `heading-${index}`;
              }

             id = baseId;
             let counter = 1;
             while (existingIds.has(id)) {
                 id = `${baseId}-${counter}`;
                 counter++;
             }
            heading.id = id;
        }
         // Adiciona mesmo os IDs existentes para checar duplicatas futuras
         if (id) {
            existingIds.add(id);
         }
    });
}

// --- Funções Principais de Carregamento e Exibição ---

/**
 * Inicializa a aplicação: carrega estrutura, configura dropdowns,
 * carrega conteúdo inicial e inicia pré-carregamento.
 */
async function initializeApp() {
    if (isInitialized) return;
    isInitialized = true;
    console.log("Inicializando aplicação...");

    try {
        structure = await loadStructure();
        if (!structure || structure.length === 0) {
            console.error("Falha ao carregar ou estrutura vazia.");
            displayError("Não foi possível carregar a estrutura da documentação.");
            return;
        }

        validateState(); // Ajusta versão/idioma se inválido
        initDropdowns(); // Configura os seletores
        updateSidebar(); // Monta a barra lateral inicial
        loadInitialContent(); // Carrega conteúdo baseado na URL ou padrão
        preloadContent(); // Inicia pré-carregamento para busca
        setupEventListeners(); // Configura outros eventos

    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        displayError("Ocorreu um erro ao iniciar a documentação.");
    }
}

/** Carrega a estrutura do structure.json */
async function loadStructure() {
    try {
        // Adiciona cache busting para garantir que pega a versão mais recente
        const response = await fetch(`structure.json?v=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Estrutura carregada:", data);
        return data;
    } catch (error) {
        console.error('Erro ao carregar structure.json:', error);
        return [];
    }
}

/** Valida e ajusta currentVersion e currentLanguage se não existirem na estrutura. */
function validateState() {
    const availableVersions = structure.map(v => v.name);
    if (!availableVersions.includes(currentVersion)) {
        console.warn(`Versão salva/padrão '${currentVersion}' não encontrada na estrutura. Usando a primeira disponível: '${availableVersions[0] || DEFAULT_VERSION}'.`);
        currentVersion = availableVersions[0] || DEFAULT_VERSION; // Usa a primeira versão encontrada ou o default global
        localStorage.setItem('docVersion', currentVersion);
    }

    const versionNode = structure.find(v => v.name === currentVersion);
    const availableLanguages = versionNode?.children?.filter(c => c.type === 'directory').map(l => l.name) || [];

    if (!availableLanguages.includes(currentLanguage)) {
        const fallbackLang = availableLanguages.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : (availableLanguages[0] || '');
        console.warn(`Idioma salvo/padrão '${currentLanguage}' não encontrado na versão '${currentVersion}'. Usando fallback: '${fallbackLang}'.`);
        currentLanguage = fallbackLang;
        if (currentLanguage) {
             localStorage.setItem('docLanguage', currentLanguage);
        } else {
             localStorage.removeItem('docLanguage'); // Remove se nenhum idioma for válido
             console.error(`Nenhum idioma encontrado para a versão ${currentVersion}`);
        }
    }

    // Validar currentPath também
    if (currentPath && !findFileInStructure(currentPath)) {
         console.warn(`Caminho salvo '${currentPath}' não encontrado na estrutura atual. Resetando.`);
         currentPath = null;
         localStorage.removeItem('currentPath');
    } else if (currentPath) {
         // Garante que o path salvo corresponde à versão/idioma atuais
         const pathPrefix = `${currentVersion}/${currentLanguage}/`;
         if (!currentPath.startsWith(pathPrefix)) {
              console.warn(`Caminho salvo '${currentPath}' não pertence à versão/idioma atual (${pathPrefix}). Resetando.`);
              currentPath = null;
              localStorage.removeItem('currentPath');
         }
    }
}

/** Carrega o conteúdo inicial baseado na URL ou no padrão/localStorage. */
function loadInitialContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const articlePath = urlParams.get('article');

    // Prioridade: Parâmetro 'article' na URL (se válido)
    if (articlePath && findFileInStructure(articlePath)) {
        console.log(`Carregando artigo da URL: ${articlePath}`);
        loadContent(articlePath);
    // Senão: Caminho salvo no localStorage (se válido e pertence à versão/idioma)
    } else if (currentPath && findFileInStructure(currentPath)) {
        console.log(`Carregando artigo salvo: ${currentPath}`);
        loadContent(currentPath);
    // Senão: Página índice padrão
    } else {
        console.log("Nenhum artigo específico na URL ou salvo. Carregando conteúdo inicial padrão.");
        loadIndexContent();
    }
}

/**
 * Carrega o conteúdo de um arquivo Markdown específico.
 * @param {string} path - Caminho normalizado para o arquivo MD.
 */
function loadContent(path) {
    if (!path) {
        console.error("Tentativa de carregar conteúdo com caminho vazio.");
        loadFallbackContent("Caminho inválido.");
        return;
    }

    const normalizedPath = path.replace(/\\/g, '/');
    console.log(`Carregando conteúdo de: ${normalizedPath}`);

    fetch(normalizedPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Falha ao buscar ${normalizedPath}: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(markdown => {
            currentPath = normalizedPath;
            localStorage.setItem('currentPath', currentPath);

            const contentElement = document.getElementById('content');
            if (!contentElement) {
                 console.error("Elemento 'content' não encontrado no DOM.");
                 return;
            }

            try {
                // Verifica se 'marked' existe e tem o método 'parse'
                if (typeof marked !== 'object' || typeof marked.parse !== 'function') {
                     throw new Error('Marked library or marked.parse function is not available for loadContent!');
                }

                const processedMarkdown = preProcessCallouts(markdown); // Processa callouts primeiro
                const htmlContent = marked.parse(processedMarkdown); // <-- USA marked.parse()

                contentElement.innerHTML = `<div class="content-container">${htmlContent}</div>`;
                contentElement.scrollTop = 0;

                addHeadingIDs();
                generateTOC();
                setupScrollSpy();
                highlightCurrentFileInSidebar();

                const newUrl = `${window.location.pathname}?article=${encodeURIComponent(currentPath)}`;
                 if (window.history.state?.path !== currentPath) {
                    history.pushState({ path: currentPath }, '', newUrl);
                 }

            } catch (processingError) {
                console.error(`Erro ao processar/renderizar ${normalizedPath}:`, processingError);
                displayError(`Ocorreu um erro ao exibir o documento: ${processingError.message}`);
                currentPath = null;
                localStorage.removeItem('currentPath');
                history.replaceState(null, '', window.location.pathname);
                 highlightCurrentFileInSidebar();
            }
        })
        .catch(error => {
            console.error(`Erro no fetch de ${normalizedPath}:`, error);
            loadFallbackContent(`Não foi possível carregar o documento: ${normalizedPath}. Verifique o console para detalhes.`);
            if (currentPath === normalizedPath) {
                 currentPath = null;
                 localStorage.removeItem('currentPath');
                  const urlParams = new URLSearchParams(window.location.search);
                  if (urlParams.get('article') === path) {
                      history.replaceState(null, '', window.location.pathname);
                  }
            }
             highlightCurrentFileInSidebar();
        });
}

/** Carrega a página inicial padrão (procura por index/senhasegura ou usa o primeiro arquivo). */
function loadIndexContent() {
    console.log("Tentando carregar página inicial...");
    const versionNode = structure.find(v => v.name === currentVersion);
    const languageNode = versionNode?.children?.find(l => l.name === currentLanguage);

    let indexPath = null;
    const potentialIndexNames = ['index.md', 'readme.md', 'senhasegura.md', 'sobre.md', 'about.md']; // Nomes comuns para índice

    // Tenta encontrar um arquivo índice na raiz do idioma
    if (languageNode?.children) {
         for (const name of potentialIndexNames) {
              const potentialIndexFile = languageNode.children.find(item =>
                  item.type === 'file' && item.name.toLowerCase() === name
              );
              if (potentialIndexFile) {
                  indexPath = potentialIndexFile.path;
                  console.log(`Arquivo índice encontrado: ${indexPath}`);
                  break; // Para no primeiro que encontrar
              }
         }
    }


    // Se não encontrou um índice padrão, pega o primeiro arquivo .md disponível
    if (!indexPath && languageNode?.children?.length > 0) {
        const firstFile = findFirstFileRecursive(languageNode.children);
        if (firstFile) {
            indexPath = firstFile.path;
            console.warn(`Nenhum arquivo índice padrão (${potentialIndexNames.join('/')}) encontrado. Usando primeiro arquivo: ${indexPath}`);
        }
    }

    if (indexPath) {
        loadContent(indexPath);
        // Atualiza URL para a raiz (sem ?article=...) apenas se não for um popstate
         if (window.history.state?.type !== 'popstate') { // Evita alterar URL ao usar voltar/avançar para home
             history.replaceState({ path: indexPath }, '', window.location.pathname);
         }
    } else {
        console.error(`Nenhum conteúdo encontrato para ${currentVersion}/${currentLanguage}.`);
        loadFallbackContent(`Nenhum documento encontrado para a versão ${currentVersion} e idioma ${currentLanguage}.`);
         currentPath = null;
         localStorage.removeItem('currentPath');
         history.replaceState(null, '', window.location.pathname);
          highlightCurrentFileInSidebar();
    }
}

/** Exibe conteúdo de fallback (usado quando loadContent falha). */
function loadFallbackContent(reason = "O documento solicitado não foi encontrado.") {
    const contentElement = document.getElementById('content');
     if (contentElement) {
         contentElement.innerHTML = `
             <div class="content-container fallback-content">
                 <h1>Conteúdo Indisponível</h1>
                 <p>${escapeHtml(reason)}</p>
                 <p>Selecione outro documento na barra lateral ou verifique a URL.</p>
             </div>
         `;
          // Limpar TOC
          const tocNav = document.getElementById('toc-nav');
          if (tocNav) tocNav.innerHTML = '';
     }
}

/** Exibe uma mensagem de erro principal na área de conteúdo. */
function displayError(message) {
    const contentElement = document.getElementById('content');
    if (contentElement) {
        contentElement.innerHTML = `
            <div class="content-container error-message">
                <h2>Erro na Aplicação</h2>
                <p>${escapeHtml(message)}</p>
                 <p>Por favor, tente recarregar a página ou verifique o console para detalhes técnicos.</p>
            </div>
        `;
         // Limpar TOC
          const tocNav = document.getElementById('toc-nav');
          if (tocNav) tocNav.innerHTML = '';
    }
}


// --- Funções da Barra Lateral (Sidebar) ---

/** Atualiza o conteúdo da barra lateral. */
function updateSidebar() {
    const sidebarContent = document.getElementById('sidebar-content');
    if (!sidebarContent) return;

    sidebarContent.innerHTML = '';
    const versionNode = structure.find(v => v.name === currentVersion);
    const languageNode = versionNode?.children?.find(l => l.name === currentLanguage);

    if (languageNode && languageNode.children) {
        buildSidebarTree(languageNode.children, sidebarContent, 0);
        highlightCurrentFileInSidebar(); // Garante destaque após montar
    } else {
        console.warn(`Conteúdo não encontrado para ${currentVersion}/${currentLanguage} na sidebar.`);
        sidebarContent.innerHTML = '<p class="sidebar-empty">Nenhum documento disponível.</p>';
    }
}

/** Constrói a árvore da sidebar recursivamente. */
function buildSidebarTree(items, parentElement, level) {
    items.forEach(item => {
        if (item.type === 'directory') {
            const folderWrapper = document.createElement('div');
            folderWrapper.className = 'sidebar-folder-wrapper';
             folderWrapper.style.paddingLeft = `${level * 15}px`; // Indentação base

            const folderElement = document.createElement('div');
            folderElement.className = 'sidebar-item sidebar-folder';
            folderElement.setAttribute('data-path', item.path);
             folderElement.innerHTML = `
                 <span class="folder-icon" aria-hidden="true">▸</span>
                 <span class="folder-name">${item.name}</span>
             `;

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
             childrenContainer.style.display = 'none'; // Começa fechado

            if (item.children && item.children.length > 0) {
                buildSidebarTree(item.children, childrenContainer, 0); // Nível reseta dentro do container
            }

            folderElement.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = folderElement.classList.toggle('open');
                childrenContainer.style.display = isOpen ? 'block' : 'none';
                folderElement.querySelector('.folder-icon').textContent = isOpen ? '▾' : '▸';
            });

            folderWrapper.appendChild(folderElement);
            folderWrapper.appendChild(childrenContainer);
            parentElement.appendChild(folderWrapper);

        } else if (item.type === 'file') {
            const fileLink = document.createElement('a'); // Usar <a> é semanticamente melhor
             fileLink.href = `?article=${encodeURIComponent(item.path)}`;
            fileLink.className = 'sidebar-item file';
             fileLink.style.paddingLeft = `${level * 15 + 15}px`; // Indentação do arquivo
            fileLink.setAttribute('data-path', item.path);
            fileLink.innerHTML = `
                 <span class="file-icon" aria-hidden="true">•</span>
                 <span class="file-title">${item.title || item.name.replace('.md', '')}</span>
             `;

            fileLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                 if (currentPath !== item.path) {
                    loadContent(item.path);
                 } else {
                     // Opcional: rolar para o topo se clicar no mesmo arquivo
                     document.getElementById('content')?.scrollTo({ top: 0, behavior: 'smooth' });
                 }
            });
            parentElement.appendChild(fileLink);
        }
    });
}

/** Destaca o arquivo atual na sidebar e expande as pastas pais. */
function highlightCurrentFileInSidebar() {
     document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
     document.querySelectorAll('.sidebar-folder.open').forEach(folder => {
         // Não fechar pastas aqui, apenas remover classe 'active' se tiver
         // folder.classList.remove('open'); // Não descomentar, senão fecha tudo
     });

    if (!currentPath) return;

    const currentFileElement = document.querySelector(`.sidebar-item.file[data-path="${currentPath}"]`);
    if (currentFileElement) {
        currentFileElement.classList.add('active');
         currentFileElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Abrir pastas pais
        let parentWrapper = currentFileElement.closest('.sidebar-folder-wrapper');
         while (parentWrapper) {
              const childrenContainer = parentWrapper.querySelector('.children-container');
              const folderElement = parentWrapper.querySelector('.sidebar-folder');

              if (childrenContainer) childrenContainer.style.display = 'block';
              if (folderElement) {
                   folderElement.classList.add('open');
                   const icon = folderElement.querySelector('.folder-icon');
                   if (icon) icon.textContent = '▾';
              }
               // Move para o wrapper pai
               parentWrapper = parentWrapper.parentElement.closest('.sidebar-folder-wrapper');
         }
    } else {
         console.warn(`Elemento da sidebar para ${currentPath} não encontrado para destacar.`);
    }
}

// --- Funções da Tabela de Conteúdo (TOC) ---

/** Gera a TOC dinâmica no container #toc-nav */
function generateTOC() {
    const tocNav = document.getElementById('toc-nav');
    const contentContainer = document.querySelector('.content-container');
    if (!tocNav || !contentContainer) {
         console.warn("Elementos da TOC não encontrados.");
         return;
     }

    const headings = contentContainer.querySelectorAll('h1[id], h2[id], h3[id]'); // Apenas os com ID
    tocNav.innerHTML = '';

    if (headings.length === 0) {
        tocNav.innerHTML = '<p class="toc-empty">Nenhum tópico nesta página.</p>';
        return;
    }

    headings.forEach(heading => {
        if (!heading.textContent.trim()) return;

        const level = heading.tagName.toLowerCase();
        const text = heading.textContent;
        const id = heading.id;

        const tocItem = document.createElement('a');
        tocItem.href = `#${id}`;
        tocItem.className = `toc-item ${level}`;
        tocItem.textContent = text;

        tocItem.addEventListener('click', (e) => {
            e.preventDefault();
            const targetHeading = document.getElementById(id);
            if (targetHeading) {
                targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Atualiza a URL com hash, mas sem adicionar ao histórico principal
                // history.replaceState(null, '', `#${id}`); // Usar replaceState para não poluir histórico
            }
        });
        tocNav.appendChild(tocItem);
    });
}

/** Configura o IntersectionObserver para destacar item ativo na TOC */
function setupScrollSpy() {
    const tocNav = document.getElementById('toc-nav');
     if (!tocNav) return;
    const tocItems = tocNav.querySelectorAll('.toc-item');
    if (tocItems.length === 0) return;

     // Desconectar observer antigo se existir
     if (window._tocObserver) {
          window._tocObserver.disconnect();
     }

    const observerOptions = {
        // rootMargin: Define a margem ao redor do viewport. Negativo encolhe.
        // '0px 0px -70% 0px' significa que o topo efetivo está 70% abaixo do topo real.
        // Ajuste conforme necessário para definir onde o highlight deve ativar.
        rootMargin: '0px 0px -75% 0px',
        threshold: 0 // Ativa assim que qualquer parte entra/sai da área ajustada
    };

     const visibleHeadings = new Map();

    const observer = new IntersectionObserver(entries => {
         entries.forEach(entry => {
              visibleHeadings.set(entry.target.id, entry.isIntersecting);
         });

         let activeId = null;
          // Encontra o PRIMEIRO heading visível na área definida pelo rootMargin
          const headingsInView = Array.from(document.querySelectorAll('.content-container h1[id], .content-container h2[id], .content-container h3[id]'))
                .filter(h => visibleHeadings.get(h.id));

          if (headingsInView.length > 0) {
               // Ordena pela posição no documento (implícito pela ordem do querySelectorAll)
                activeId = headingsInView[0].id;
          }

        // Atualiza a classe 'active' na TOC
        tocItems.forEach(item => {
            if (item.getAttribute('href') === `#${activeId}`) {
                item.classList.add('active');
                 // Opcional: rolar TOC para manter item ativo visível
                 // item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

    }, observerOptions);

    // Observar todos os headings H1, H2, H3 que têm ID
    document.querySelectorAll('.content-container h1[id], .content-container h2[id], .content-container h3[id]').forEach(heading => {
        observer.observe(heading);
    });

     // Guarda referência ao observer para desconectar depois
     window._tocObserver = observer;
}


// --- Funções de Busca ---

/** Pré-carrega conteúdo dos arquivos para indexação da busca. */
async function preloadContent() {
    if (isPreloading) return;
    isPreloading = true;
    console.log('Iniciando pré-carregamento para busca...');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = 'Carregando índice...';

    searchIndex = {}; // Limpa índice

    const versionNode = structure.find(v => v.name === currentVersion);
    const languageNode = versionNode?.children?.find(l => l.name === currentLanguage);

    if (!languageNode || !languageNode.children) {
        console.warn("Não foi possível iniciar pré-carregamento: estrutura de idioma não encontrada.");
        if (searchInput) searchInput.placeholder = 'Busca indisponível';
        isPreloading = false;
        return;
    }

    const filesToLoad = [];
    function collectFiles(items) {
        items.forEach(item => {
            if (item.type === 'file' && item.path.endsWith('.md')) {
                filesToLoad.push(item);
            } else if (item.type === 'directory' && item.children) {
                collectFiles(item.children);
            }
        });
    }
    collectFiles(languageNode.children);

    if (filesToLoad.length === 0) {
         console.log("Nenhum arquivo .md para pré-carregar.");
          if (searchInput) searchInput.placeholder = 'Busca indisponível';
          isPreloading = false;
          return;
    }

    const loadPromises = filesToLoad.map(async (item) => {
        try {
            // Usar o mesmo fetch com cache busting que o loadStructure? Pode ser útil
            const response = await fetch(`${item.path}?v=${Date.now()}`);
            if (!response.ok) throw new Error(`Status ${response.status}`);

            const content = await response.text();
            // Otimização: Remover frontmatter YAML se existir, antes de indexar
             const cleanContent = content.replace(/^---[\s\S]*?---/, '').trim();

            searchIndex[item.path] = {
                title: item.title || item.name.replace('.md', ''),
                // Indexar apenas o texto limpo pode melhorar performance e relevância
                 content: cleanContent, // Indexar conteúdo sem frontmatter
                // content: content, // Ou indexar tudo
                path: item.path
            };
        } catch (error) {
            console.error(`Erro ao pré-carregar ${item.path}:`, error);
        }
    });

    await Promise.all(loadPromises);

    console.log(`Pré-carregamento concluído. ${Object.keys(searchIndex).length} arquivos indexados.`);
    if (searchInput) searchInput.placeholder = 'Buscar na documentação...';
    isPreloading = false;
}

/** Realiza a busca no índice pré-carregado. */
function performSearch(query) {
    if (!query || query.trim().length < 2) {
        hideSearchModal();
        return;
    }

    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    if (Object.keys(searchIndex).length === 0) {
        console.warn('Índice de busca vazio ou pré-carregamento falhou.');
         displaySearchResults([], query);
        return;
    }

    for (const [path, doc] of Object.entries(searchIndex)) {
         const lowerTitle = doc.title.toLowerCase();
         const lowerContent = doc.content.toLowerCase(); // Usar conteúdo já limpo (se aplicável)

        const hasAllTerms = searchTerms.every(term =>
            lowerTitle.includes(term) || lowerContent.includes(term)
        );

        if (hasAllTerms) {
            let score = 0;
            let titleHits = 0;
             let contentHits = 0;

            searchTerms.forEach(term => {
                 const titleMatches = (lowerTitle.match(new RegExp(escapeRegex(term), 'g')) || []).length;
                 const contentMatches = (lowerContent.match(new RegExp(escapeRegex(term), 'g')) || []).length;
                 titleHits += titleMatches;
                 contentHits += contentMatches;
            });
             // Score: Bônus maior para hits no título
             score = (titleHits * 10) + contentHits;

             // Bônus adicional se a query exata estiver no título
             if (lowerTitle.includes(query.toLowerCase())) {
                  score += 50;
             }

            if (score > 0) { // Apenas adiciona se houver algum hit
                results.push({
                    title: doc.title,
                    path: doc.path,
                    score: score,
                    content: doc.content // Passa conteúdo original para gerar snippet
                });
            }
        }
    }

     results.sort((a, b) => b.score - a.score); // Ordena por score
    displaySearchResults(results.slice(0, 20), query); // Limita resultados
}

/** Exibe os resultados da busca no modal. */
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsCount = document.getElementById('searchResultsCount');
    const modal = document.getElementById('searchModal'); // Para focar
    if (!resultsContainer || !resultsCount || !modal) return;

    resultsContainer.innerHTML = '';
    resultsCount.textContent = `${results.length} resultado${results.length !== 1 ? 's' : ''}`;

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-no-results">
                <p>Nenhum resultado encontrado para "<strong>${escapeHtml(query)}</strong>".</p>
            </div>`;
    } else {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.setAttribute('role', 'button'); // Torna clicável para acessibilidade
            item.tabIndex = 0; // Permite foco

            const snippet = generateSnippet(result.content, searchTerms);
            const highlightedTitle = highlightText(result.title, searchTerms);
            const highlightedSnippet = highlightText(snippet, searchTerms);

            const pathParts = result.path.split('/').slice(2);
            const displayPath = pathParts.join(' › ');

            item.innerHTML = `
                <h3 class="result-title">${highlightedTitle}</h3>
                <p class="result-path">${escapeHtml(displayPath)}</p>
                <div class="snippet-container">
                     ...${highlightedSnippet}...
                 </div>
            `;

            const navigate = () => {
                loadContent(result.path);
                hideSearchModal();
                document.getElementById('searchInput').value = ''; // Limpa input
            };

            item.addEventListener('click', navigate);
             item.addEventListener('keydown', (e) => { // Navegação pelo teclado
                  if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       navigate();
                  }
             });

            resultsContainer.appendChild(item);
        });
    }

    showSearchModal();
     // Foca no primeiro resultado ou no container se não houver resultados
     const firstResult = resultsContainer.querySelector('.search-result-item');
     if (firstResult) {
          firstResult.focus();
     } else {
          modal.focus(); // Foca o modal em si
     }
}

/** Gera um snippet de texto relevante contendo os termos de busca. */
function generateSnippet(content, terms, maxLength = 180) {
    const lowerContent = content.toLowerCase();
    let bestSnippetStart = -1;
    let maxScore = -1;

    // Encontra a primeira ocorrência de qualquer termo para um ponto de partida
    let firstIndex = -1;
    for (const term of terms) {
        const index = lowerContent.indexOf(term);
        if (index !== -1) {
            firstIndex = index;
            break;
        }
    }

    // Se nenhum termo for encontrado, retorna o início do conteúdo
    if (firstIndex === -1) return escapeHtml(content.substring(0, maxLength));

    // Tenta encontrar uma janela que contenha mais termos
    // Simplificação: usar a janela ao redor da primeira ocorrência
    const windowStart = Math.max(0, firstIndex - Math.floor(maxLength / 4));
     bestSnippetStart = windowStart; // Usa a janela da primeira ocorrência como padrão

    // Extrai o snippet
    const snippet = content.substring(bestSnippetStart, bestSnippetStart + maxLength);

    // Adiciona lógica para evitar cortar palavras no início/fim (opcional)
    // ...

    return escapeHtml(snippet);
}

/** Destaca termos de busca em um texto já escapado. */
function highlightText(escapedHtml, terms) {
    let highlighted = escapedHtml;
    terms.forEach(term => {
        const regex = new RegExp(escapeRegex(term), 'gi');
        // Importante: Opera no texto já escapado para não quebrar HTML
         highlighted = highlighted.replace(regex, match => `<span class="highlight">${match}</span>`);
    });
    return highlighted;
}

/** Mostra o modal de busca e o overlay. */
function showSearchModal() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('searchModalOverlay');
     if (modal) modal.classList.add('active');
     if (overlay) overlay.classList.add('active');
      // Adiciona classe ao body para prevenir scroll do fundo
      document.body.classList.add('modal-open');
}

/** Esconde o modal de busca e o overlay. */
function hideSearchModal() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('searchModalOverlay');
     if (modal) modal.classList.remove('active');
     if (overlay) overlay.classList.remove('active');
      document.body.classList.remove('modal-open'); // Restaura scroll
}


// --- Funções de Feedback ---

/** Cria e exibe o modal de feedback. */
function showFeedbackModal(type) {
    // Remover modal antigo se existir
    document.querySelector('.feedback-modal')?.remove();
    document.querySelector('.modal-overlay.feedback-overlay')?.remove();

    const modal = document.createElement('div');
    modal.className = 'feedback-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'feedbackModalTitle');

    modal.innerHTML = `
        <div class="feedback-modal-content">
            <button class="close-modal" aria-label="Fechar modal">&times;</button>
            <h3 id="feedbackModalTitle">${type === 'like' ? 'Obrigado pelo feedback!' : 'Como podemos melhorar?'}</h3>
            <form id="feedbackForm">
                <input type="hidden" name="feedbackType" value="${type}">
                <input type="hidden" name="pageUrl" value="${window.location.href}">
                 <input type="hidden" name="pageTitle" value="${document.title}">
                 <input type="hidden" name="filePath" value="${currentPath || 'N/A'}">
                <div class="form-group">
                    <label for="message">Sua mensagem${type === 'dislike' ? ' (obrigatório)' : ''}:</label>
                    <textarea id="message" name="message" rows="5" placeholder="Detalhes..." ${type === 'dislike' ? 'required' : ''}></textarea>
                </div>
                <button type="submit" class="submit-feedback">Enviar Feedback</button>
                <p class="feedback-sending" style="display: none;">Enviando...</p>
                 <p class="feedback-error" style="display: none; color: red;">Erro ao enviar. Tente novamente.</p>
            </form>
        </div>
    `;

    // Adiciona overlay escuro
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay feedback-overlay'; // Classe específica
    overlay.addEventListener('click', closeFeedbackModal); // Fecha ao clicar fora

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open'); // Previne scroll do fundo

    const closeButton = modal.querySelector('.close-modal');
    const form = modal.querySelector('#feedbackForm');
    const submitButton = modal.querySelector('.submit-feedback');
    const sendingIndicator = modal.querySelector('.feedback-sending');
     const errorIndicator = modal.querySelector('.feedback-error');

    closeButton.addEventListener('click', closeFeedbackModal);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        sendingIndicator.style.display = 'block';
        errorIndicator.style.display = 'none';

        const formData = new FormData(form);
        // const feedbackData = Object.fromEntries(formData.entries()); // Converte para objeto
        // console.log("Enviando feedback:", feedbackData);

        try {
            // Substitua pela URL do seu endpoint (Formspree, etc.)
            const response = await fetch('https://formspree.io/f/mjkygnje', { // Exemplo Formspree
                method: 'POST',
                 body: formData, // Formspree aceita FormData
                 headers: { // Necessário para Formspree
                     'Accept': 'application/json'
                 }
                // body: JSON.stringify(feedbackData), // Se seu endpoint espera JSON
                // headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                alert('Feedback enviado com sucesso! Obrigado.');
                closeFeedbackModal();
            } else {
                 const errorData = await response.json().catch(() => ({})); // Tenta pegar erro do JSON
                console.error("Erro do servidor:", response.status, errorData);
                 errorIndicator.textContent = `Erro ${response.status}. Tente novamente.`;
                 errorIndicator.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro de rede ao enviar feedback:', error);
             errorIndicator.textContent = 'Erro de rede. Verifique sua conexão.';
             errorIndicator.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            sendingIndicator.style.display = 'none';
        }
    });

     // Foca no campo de mensagem ao abrir
     setTimeout(() => {
          modal.querySelector('#message')?.focus();
     }, 100);

     // Fechar com ESC
     window._feedbackEscListener = (e) => {
          if (e.key === 'Escape') {
               closeFeedbackModal();
          }
     };
     document.addEventListener('keydown', window._feedbackEscListener);
}

/** Fecha o modal de feedback e limpa listeners. */
function closeFeedbackModal() {
    document.querySelector('.feedback-modal')?.remove();
    document.querySelector('.modal-overlay.feedback-overlay')?.remove();
    document.body.classList.remove('modal-open');
     // Remove listener ESC específico do feedback
     if (window._feedbackEscListener) {
          document.removeEventListener('keydown', window._feedbackEscListener);
          delete window._feedbackEscListener;
     }
}


// --- Configuração dos Event Listeners Globais ---

/** Configura os event listeners gerais da aplicação. */
function setupEventListeners() {
    // Clique no logo (link <a>)
    const companyLogoLink = document.querySelector('.company-name');
    if (companyLogoLink) {
        companyLogoLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadIndexContent();
        });
    }

    // Input de Busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            const query = e.target.value;
            if (query.trim().length === 0) {
                hideSearchModal();
                return;
            }
            searchDebounceTimer = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
         searchInput.addEventListener('keydown', (e) => { // Abrir modal com Enter
              if (e.key === 'Enter' && searchInput.value.trim().length >= 2) {
                   e.preventDefault();
                   clearTimeout(searchDebounceTimer); // Cancela debounce
                   performSearch(searchInput.value);
              }
         });
    }

     // Botão Fechar Modal de Busca
     const closeSearchButton = document.querySelector('.close-search-modal');
      if (closeSearchButton) {
          closeSearchButton.addEventListener('click', hideSearchModal);
      }

    // Botões de Feedback
    const likeBtn = document.querySelector('.like-btn');
    const dislikeBtn = document.querySelector('.dislike-btn');
    if (likeBtn) likeBtn.addEventListener('click', () => showFeedbackModal('like'));
    if (dislikeBtn) dislikeBtn.addEventListener('click', () => showFeedbackModal('dislike'));

    // Navegação pelo histórico (voltar/avançar)
    window.addEventListener('popstate', (event) => {
        // Verifica se o estado contém um caminho válido antes de carregar
        if (event.state && event.state.path && findFileInStructure(event.state.path)) {
             console.log("Popstate: Carregando", event.state.path);
             // Marca como popstate para evitar pushState desnecessário em loadContent
             window.history.state.type = 'popstate';
            loadContent(event.state.path);
        } else {
             console.log("Popstate: Carregando Index ou estado inválido");
             // Se não há estado ou o caminho é inválido, carrega a home
             loadIndexContent();
        }
    });

     // Fechar Modal de Busca com ESC (listener global)
     document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('#searchModal.active')) {
            hideSearchModal();
        }
    });

     // Fechar Modal de Busca clicando no Overlay
     const searchOverlay = document.getElementById('searchModalOverlay');
      if (searchOverlay) {
          searchOverlay.addEventListener('click', hideSearchModal);
      }
}

// --- Configuração dos Dropdowns ---

/** Inicializa e configura os dropdowns de versão e idioma. */
function initDropdowns() {
    const versionSelect = document.getElementById('versionSelect');
    const languageSelect = document.getElementById('languageSelect');

    if (!versionSelect || !languageSelect) {
        console.error("Dropdowns não encontrados!");
        return;
    }

    versionSelect.innerHTML = '';
    languageSelect.innerHTML = '';

    // Popula versões (ordena decrescente)
    const versions = structure.map(item => item.name).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    versions.forEach(versionName => {
        const option = new Option(versionName, versionName);
        versionSelect.add(option);
    });

    function populateLanguages(selectedVersion) {
        languageSelect.innerHTML = '';
        const versionNode = structure.find(v => v.name === selectedVersion);
        const languages = versionNode?.children?.filter(c => c.type === 'directory').map(l => l.name).sort() || [];

        if (languages.length > 0) {
            languages.forEach(langName => {
                const option = new Option(langName.toUpperCase(), langName);
                languageSelect.add(option);
            });
            languageSelect.value = languages.includes(currentLanguage) ? currentLanguage : languages[0];
            languageSelect.disabled = languages.length <= 1;
        } else {
            languageSelect.disabled = true;
            // Adicionar opção indicando ausência de idioma?
             const option = new Option("--", "");
             option.disabled = true;
             languageSelect.add(option);
        }
    }

    versionSelect.value = currentVersion;
    populateLanguages(currentVersion);

    // Listeners
    versionSelect.addEventListener('change', (e) => {
        currentVersion = e.target.value;
        localStorage.setItem('docVersion', currentVersion);
        // Atualiza idiomas e valida o idioma atual ANTES de tentar carregar
        populateLanguages(currentVersion);
         // Atualiza o estado global do idioma caso ele tenha mudado no populateLanguages
         currentLanguage = languageSelect.value;
         localStorage.setItem('docLanguage', currentLanguage);

        switchVersionOrLanguage(); // Tenta carregar doc equivalente
        updateSidebar(); // Atualiza sidebar para nova versão/idioma
         preloadContent(); // Reinicia pré-carregamento para nova versão/idioma
    });

    languageSelect.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        localStorage.setItem('docLanguage', currentLanguage);
        switchVersionOrLanguage();
        updateSidebar();
         preloadContent();
    });
}

/** Tenta carregar um arquivo equivalente ao mudar versão/idioma. */
function switchVersionOrLanguage() {
    let targetPath = null;
    if (currentPath) {
        // Extrai o caminho relativo APÓS versão/idioma
        const parts = currentPath.split('/');
        if (parts.length > 2) {
            const relativeDocPath = parts.slice(2).join('/');
            targetPath = `${currentVersion}/${currentLanguage}/${relativeDocPath}`;
        }
    }

     // Verifica se o caminho alvo existe na estrutura
     if (targetPath && findFileInStructure(targetPath)) {
          console.log(`Mudando para arquivo equivalente: ${targetPath}`);
          loadContent(targetPath);
     } else {
          console.log(`Arquivo equivalente não encontrado para ${currentPath} em ${currentVersion}/${currentLanguage}. Carregando home.`);
          loadIndexContent(); // Carrega a home como fallback
     }
}

// --- Funções Auxiliares da Estrutura ---

/** Encontra o primeiro arquivo .md recursivamente. */
function findFirstFileRecursive(items) {
    for (const item of items) {
        if (item.type === 'file' && item.path.endsWith('.md')) {
            return item;
        }
    }
     // Se não achou na raiz, busca em subpastas
     for (const item of items) {
          if (item.type === 'directory' && item.children) {
              const found = findFirstFileRecursive(item.children);
              if (found) return found;
          }
     }
    return null;
}

/** Encontra um arquivo pelo path na estrutura carregada. */
function findFileInStructure(path) {
    if (!path) return null;
    const normalizedPath = path.replace(/\\/g, '/');

    function findRecursive(items) {
        for (const item of items) {
            if (item.type === 'file' && item.path === normalizedPath) {
                return item;
            } else if (item.type === 'directory' && item.children) {
                 // Otimização: Só busca dentro se o path começar com o path do diretório
                 if (normalizedPath.startsWith(item.path + '/')) {
                      const found = findRecursive(item.children);
                      if (found) return found;
                 }
            }
        }
        return null;
    }
    // Busca dentro da versão/idioma atuais primeiro para otimizar
    const versionNode = structure.find(v => v.name === currentVersion);
    const languageNode = versionNode?.children?.find(l => l.name === currentLanguage);
    if (languageNode?.children) {
         const found = findRecursive(languageNode.children);
         if (found) return found;
    }

    // Fallback: buscar em toda a estrutura (menos eficiente)
     console.warn(`Busca por ${normalizedPath} não otimizada (não encontrada em ${currentVersion}/${currentLanguage}). Buscando em toda estrutura.`);
     for (const version of structure) {
          if (version.children) {
              const found = findRecursive(version.children);
              if (found) return found;
          }
     }

    return null;
}

// --- Inicialização ---
// Garante que o DOM está pronto antes de executar qualquer coisa
document.addEventListener('DOMContentLoaded', initializeApp);