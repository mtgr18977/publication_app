/**
 * contentLoader.js
 *
 * This module is responsible for loading and rendering content (Markdown files)
 * into the main content area of the documentation site.
 */

/**
 * Loads and renders the content of a specific Markdown file into the 'content' div.
 * It fetches the markdown, preprocesses it, parses it to HTML, and then updates the DOM.
 * It also triggers the generation of the table of contents and sets up the scroll spy.
 *
 * @param {string} path - The path to the Markdown file to load (e.g., '1.0/en/about.md').
 * @param {function} preProcessCallouts - A function to pre-process callouts in the markdown content.
 * @param {function} generateTOC - A function to generate the table of contents.
 * @param {function} setupScrollSpy - A function to set up the scroll spy functionality for the table of contents.
 * @param {function} loadFallbackContent - A function to load fallback content in case of errors.
 * @returns {void} - This function does not return any value.
 * @sideEffects - Modifies the DOM by updating the 'content' div.
 *                Saves the current path to localStorage.
 *                Logs messages and errors to the console.
 */ 
function loadContent(path, preProcessCallouts, generateTOC, setupScrollSpy, loadFallbackContent) {
    // Save current path in localStorage to be restored if the page reload
    localStorage.setItem('currentPath', path);
    console.log(`Loading content from path: ${path}`);
    try { // try catch to handle errors in the loadContent
        // Start fetching the content from the specified path
        fetch(path)
            .then(response => {
                // Check for network errors, If the response is not ok, throw an error
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status} for path: ${path}`);
                }
                // If the response is ok, return the content as text to the next .then
                return response.text();
            })
            .then(markdown => {
                try { // try catch to handle errors when parsing the markdown
                    // Process callouts in the markdown with preProcessCallouts
                    const processedMarkdown = preProcessCallouts(markdown);
                    // Parse the markdown to html using marked library
                    const htmlContent = marked.parse(processedMarkdown);
                    console.log('Content loaded and parsed successfully.');
                    // Display content in the screen inside the content div
                    document.getElementById('content').innerHTML = `
                        <div class="content-container">
                            ${htmlContent}
                        </div>
                    `;
                    // Generate table of contents for the displayed content with generateTOC
                    generateTOC();
                    // Setup the scroll spy for the table of contents with setupScrollSpy
                    setupScrollSpy();
                } catch (parseError) {
                    /**
                     * Handle errors when parsing markdown
                     * Log the error to the console with details about the path and the error
                     * Load the fallback content to display an error message to the user
                     * @param {Error} parseError - The error object generated during the parsing process.
                     * @sideEffects - Loads the fallback content.
                     */
                    console.error(`Error parsing markdown for path: ${path}`, parseError);
                    // Load the fallback content to display an error message to the user
                    loadFallbackContent(`Error parsing markdown content from: ${path}`);
                }
            })
            .catch(fetchError => {
                // Handle network errors
                console.error(`Error fetching content from path: ${path}`, fetchError);
                // Display error in the content div
                loadFallbackContent(`Error fetching content from: ${path}. Please check your connection or if the file exists or contact the administrator.`);
            });
    } catch (error) { // Catch any unexpected error in the loadContent
        console.error(`Unexpected error in loadContent when loading from path: ${path}`, error);
        loadFallbackContent(`Unexpected error when loading content from: ${path}. Please contact the administrator.`);
    }
}

/**
 * Loads the default index content (about.md) when no specific article is requested.
 * It retrieves the current version and language from localStorage and attempts to load
 * the about.md file in the correct directory. If it fails, it loads fallback content.
 *
 * @param {function} loadFallbackContent - Function to load fallback content in case of errors.
 * @returns {void} - This function does not return any value.
 * @sideEffects - Modifies the DOM by updating the 'content' div if an error occurs.
 *                Retrieves the current version and language from localStorage.
 *                Calls loadContent to load the about.md file or handle errors.
 */
function loadIndexContent(loadFallbackContent) {
    // Get the current version and language from localStorage, or use defaults
    const currentVersion = localStorage.getItem('currentVersion') || '1.0';
    const currentLanguage = localStorage.getItem('currentLanguage') || 'en';

    // try to load about.md in the correct path, using the correct preProcessCallouts, generateTOC and setupScrollSpy
    loadContent(`${currentVersion}/${currentLanguage}/about.md`, preProcessCallouts, generateTOC, setupScrollSpy, loadFallbackContent);
}

export {
    loadContent,
    loadIndexContent
};


export {
    loadContent,
    loadIndexContent
};
