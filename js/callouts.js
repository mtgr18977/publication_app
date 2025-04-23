/**
 * @file callouts.js
 * @description This file contains the function to pre-process callouts in Markdown.
 */

/**
 * Pre-processes callouts in Markdown to convert them into HTML divs.
 * @param {string} markdown - The Markdown content to process.
 * @returns {string} - The processed Markdown with callouts converted to HTML divs.
 */
function preProcessCallouts(markdown) {
  // Regular expression to find callouts
  const calloutRegex = /:::\((\w+)\)\s+\(([^\\n]+)\)([\s\S]*?)(?=\n:::)/gm;
  let processedMarkdown = markdown.replace(
    calloutRegex,
    function (match, type, title, content) {
      return `<div class="callout callout-${type.toLowerCase()}">
                <div class="callout-title">${title}</div>
                <div class="callout-content">${content}</div>
            </div>`;
    }
  );

  // Remove callout closing tags
  processedMarkdown = processedMarkdown.replace(/\n:::/g, "");
  return processedMarkdown;
}