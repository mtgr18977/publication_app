# TODO - Project Improvements

This document outlines the improvements to be made to the current documentation project.

## Core Tasks

-   [ ] **1. Combine `cria_menu.js` and `remove_front.js`:**
    -   Create a new script called `process_docs.js`.
    -   Migrate the functionality of `cria_menu.js` (directory scanning, structure generation) into `process_docs.js`.
    -   Migrate the functionality of `remove_front.js` (metadata processing, title addition) into `process_docs.js`.
    -   Ensure the combined script can perform both tasks efficiently.
    - Remove `cria_menu.js` and `remove_front.js`.

-   [ ] **2. Modularize `script.js`:**
    -   Break down `script.js` into smaller, more manageable files.
    -   Create modules for:
        -   `contentLoader.js`: Handling content loading and rendering.
        -   `toc.js`: Managing the Table of Contents.
        -   `search.js`: Implementing the search functionality.
        -   `callouts.js`: Handling callout processing.
        -   Other modules as needed (e.g., sidebar, dropdowns, error handling).
    -   Update `index.html` to include the new js files.
    - Ensure all the modules are working as expected.

-   [ ] **3. Enhance Error Handling:**
    -   Add more robust error handling to `script.js`.
    -   Implement `try...catch` blocks where needed.
    -   Provide more informative error messages to the user.
    - Add error handling to the new `process_docs.js`
    - Add log to debug problems.

-   [ ] **4. Improve Comments:**
    -   Review the entire project for areas lacking comments.
    -   Add detailed comments to explain complex code.
    -   Document function parameters, return values, and potential side effects.
    -   Ensure comments are consistent in style and detail.
    - Remove unnecessary comments.

-   [ ] **5. Optimize `styles.css`:**
    -   Review `styles.css` for unused styles.
    -   Group related styles for better organization.
    - Consider using CSS preprocessors (like Sass).

-   [ ] **6. Unify `<a>` tag class in `index.html`:**
    - Review all the `<a>` tags inside the `navbar` in `index.html`
    - Add the same class to all the tags.

-   [ ] **7. Complete `about.md` code:**
    - Complete the `process_metadata.js` code example in `about.md`.
    - Complete the `processMarkdownFile` code example in `about.md`.

-   [ ] **8. Add npm Scripts to `package.json`:**
    -   Add a `build` script to `package.json` to run `process_docs.js`.
    -   Example: `"scripts": { "build": "node process_docs.js" }`.
    -   Test the new script with `npm run build`

## Additional Considerations

-   [ ] **Accessibility:** Add `aria-labels` to buttons and images where needed.
-   [ ] **Testing:** Consider adding a testing framework (e.g., Jest) for JavaScript modules.

## Done

-   [ ] Create this TODO.md file