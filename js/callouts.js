/**
 * @file callouts.js
 * @description This file contains the function to pre-process callouts in Markdown content.
 */

/**
 * @function preProcessCallouts
 * @description Pre-processes callouts in Markdown content, converting them into HTML div elements.
 * Callouts are custom blocks used to highlight specific information within the markdown.
 *
 * @param {string} markdown - The Markdown content string to process.
 * @returns {string} - The processed Markdown content with callouts converted into HTML divs.
 *
 * @sideEffects - This function may modify the input string, replacing callout patterns with HTML.
 *                Logs an error to the console if an exception occurs during processing.
 *                If an error occurs, the original markdown is returned to prevent breaking the page.
 */
function preProcessCallouts(markdown) {
    try {
        // Regular expression to find callouts.
        // The format is :::(type)(title)content:::
        // (type) : the type of the callout (note, warning, info, etc.)
        // (title) : the title of the callout
        // content : the content of the callout, it can be multiple lines
        const calloutRegex = /:::\((\w+)\)\s+\(([^\\n]+)\)([\s\S]*?)(?=\n:::)/gm;
        // Replace each callout match with its corresponding HTML structure
        let processedMarkdown = markdown.replace(
            calloutRegex,
            function (match, type, title, content) {
                return `<div class="callout callout-${type.toLowerCase()}">
                            <div class="callout-title">${title}</div>
                            <div class="callout-content">${content}</div>
                        </div>`;
            }
        );
        // Remove callout closing tags.
        processedMarkdown = processedMarkdown.replace(/\n:::/g, "");
        return processedMarkdown;
    } catch (error) {
        console.error("Error processing callouts in markdown content. The original content will be displayed. Error:", error);
        return markdown; // Return the original markdown to prevent breaking the page
    }
}