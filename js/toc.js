/**
 * Generates the table of contents (TOC) based on the headings (h1, h2, h3) in the content.
 */
function generateTOC() {
    // Select all h1, h2, and h3 headings within the content area
    const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
    // Select the TOC container
    const toc = document.querySelector('.toc-container');
    // If there's no TOC container or no headings, exit
    if (!toc || headings.length === 0) return;

    // Initialize TOC HTML content
    let tocHTML = '<div class="toc-header">Contents</div><nav class="toc-nav">';
    headings.forEach(heading => {
        // Extract the heading level (1, 2, or 3) from the tag name (h1, h2, h3)
        const level = heading.tagName.substring(1);
        // Get the heading text
        const text = heading.textContent;
        // Generate an ID for the heading (for linking)
        const id = text.toLowerCase().replace(/[^\\w]+/g, '-');
        // Set the ID to the heading element
        heading.id = id;
        // Add a link to the TOC
        tocHTML += `<a href="#${id}" class="toc-item h${level}">${text}</a>`;
    });
    tocHTML += '</nav>';
    // Update the TOC container with the generated HTML
    toc.innerHTML = tocHTML;
}

/**
 * Sets up the scroll spy functionality to highlight the active section in the TOC.
 */
function setupScrollSpy() {
    // Select all TOC items
    const tocItems = document.querySelectorAll('.toc-item');
    // Select all h1, h2, and h3 headings within the content area
    const headings = document.querySelectorAll('#content h1, #content h2, #content h3');

    // Add event listener to scroll event
    window.addEventListener('scroll', () => {
        // Get the current scroll position
        const scrollPosition = window.scrollY;

        // Remove 'active' class from all TOC items
        tocItems.forEach(item => item.classList.remove('active'));

        // Find the active heading
        let activeHeading = null;
        for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i];
            if (scrollPosition >= heading.offsetTop - 100) { // 100px offset
                activeHeading = heading;
                break;
            }
        }
        // If an active heading is found
        if (activeHeading) {
            // Find the corresponding TOC item and add the 'active' class
            const activeTocItem = document.querySelector(`.toc-item[href="#${activeHeading.id}"]`);
            if (activeTocItem) {
                activeTocItem.classList.add('active');
            }
        }
    });
}