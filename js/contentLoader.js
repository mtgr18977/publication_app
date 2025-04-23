/**
 * contentLoader.js
 *
 * This module is responsible for loading and rendering content (Markdown files)
 * into the main content area of the documentation site.
 */

/**
 * Loads and renders the content of a specific Markdown file.
 *
 * @param {string} path - The path to the Markdown file to load.
 * @param {function} preProcessCallouts - Function to pre-process callouts in the markdown
 * @param {function} generateTOC - Function to generate the table of contents
 * @param {function} setupScrollSpy - Function to setup scroll spy for the table of contents
 */
function loadContent(path, preProcessCallouts, generateTOC, setupScrollSpy) {
    // Save current path in localStorage
    localStorage.setItem('currentPath', path);

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

/**
 * Loads the default index content when no specific article is requested.
 * It will try to load the about.md in the current version and language, 
 * if fail, it will load a fallback content.
 */
function loadIndexContent() {
    const currentVersion = localStorage.getItem('currentVersion') || '1.0';
    const currentLanguage = localStorage.getItem('currentLanguage') || 'en';

    // try to load about.md in current version and language
    loadContent(`${currentVersion}/${currentLanguage}/about.md`);
}