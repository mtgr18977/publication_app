const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const docsRoot = './';
const outputFile = './structure.json';

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
    'process_docs.js',
    'package-lock.json',
    'package.json'
];

/**
 * @function extractTitle
 * @description Extracts the first H1 title from the provided Markdown content.
 * @param {string} markdownContent - The Markdown content string from which to extract the title.
 * @returns {string|null} The H1 title text if found, otherwise null.
 * @sideEffects Logs a warning to the console if no H1 heading is found.
 *              Logs an error to the console if an error occurs during the extraction process.
 *              If an error occurs, or if no H1 title is found, returns null.
 */
function extractTitle(markdownContent) {
    try { 
        // Use marked.lexer to tokenize the markdown
        const tokens = marked.lexer(markdownContent); 
        // Find the first H1 heading
        const h1 = tokens.find(token => token.type === 'heading' && token.depth === 1); 
        if (!h1) {
            // Warn if no H1 was found
            console.warn("No H1 heading found in the markdown content."); 
            return null; 
        }
        // return the text if h1 is found
        return h1.text; 
    } catch (error) {
        // Catch errors when parsing markdown
        if (error.message === "Cannot read properties of undefined (reading 'type')") {
            // Handle errors when markdown is invalid
            console.error("Error: Invalid markdown content passed to extractTitle function. Please ensure the content is valid Markdown.", error);
        } else if (error.message.includes('marked.lexer is not a function')) {
            console.error('Error: marked.lexer is not available. Please ensure the "marked" library is correctly installed and imported.', error);
        } else {
            console.error('Error: An unexpected error occurred while extracting the title from the markdown content.', error); // Log the error
        }
       
        return null;
    }
}

/**
 * @function processMarkdownFile
 * @description Processes a Markdown file to extract metadata and add a title as an H1 heading at the start of the file.
 * It looks for a metadata block at the beginning of the file (using ---).
 * If a title is found in the metadata, it adds it as an H1 heading and save the file.
 * @param {string} filePath - The path to the Markdown file to process.
 * @returns {void} This function does not return any value.
 * @sideEffects Modifies the Markdown file by adding an H1 title if a title is found in the metadata.
 *              Logs messages to the console for file processing, title found, and errors.
 *              If an error occurs reading or writing the file, it logs the error and either returns or continue to the next file.
 */
function processMarkdownFile(filePath) {
    try {
        console.log(`Processing metadata in: ${filePath}`);
        // try to read the file
        let data;
        try{
            // Read the file
            data = fs.readFileSync(filePath, 'utf8');
        } catch(error){
            // catch error in the read file
            console.error(`Error: Unable to read the file ${filePath}. Please ensure the file exists and is accessible.`, error);
            // if there is an error, return
            return; 
        }
        // The next code will only be executed if the read file is successful.

        // Regex to find metadata blocks at the start of the file
        const metadataRegex = /^---\s*([\s\S]*?)\s*---\s*\n/g;
        const metadataMatch = metadataRegex.exec(data);

        
        

        if (metadataMatch && metadataMatch[1]) {
            const metadataBlock = metadataMatch[1];
            const lines = metadataBlock.split('\n');
            let title = null;

            for (let line of lines) {
                if (line.startsWith('title:')) {
                    title = line.substring('title:'.length).trim();
                    break;
                }
            }

            if (title) {
                console.log(`Found title: ${title} in ${filePath}`);
                const newContent = data.replace(metadataRegex, `# ${title}\n\n`);
                try{ 
                    //try to write the file
                    fs.writeFileSync(filePath, newContent, 'utf8');
                }catch(error){ 
                    // if there is an error log it and continue
                    // Stop the process in this file if there is an error writing the file
                    console.error(`Error: Unable to write to the file ${filePath}. Please ensure you have the necessary permissions.`, error);
                    return;
                }
                
                console.log(`Metadata processed and title added to: ${filePath}`);
            } else {
                console.log(`No title found in: ${filePath}`);
            }
        } else {
            console.log(`No metadata block found in: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error: An unexpected error occurred while processing the file ${filePath}.`, error);
    }
}

/**
 * @function scanDirectory
 * @description Recursively scans a directory to process files and build the documentation structure.
 * @param {string} dir - The path of the directory to scan.
 * @returns {Array} An array of objects representing the processed files and directories.
 *                  Each object has a type ('file' or 'directory'), name, title (for files), and path.
 *                  Directories also have a 'children' array of nested items.
 * @sideEffects This function reads directories and files, extracts metadata from Markdown files, and recursively calls itself for subdirectories.
 *              It logs messages to the console for each file and directory processed, as well as for any errors encountered.
 *              If an error occurs in a subdirectory, it logs the error and continues processing other items.
 */
function scanDirectory(dir) {
    console.log(`Scanning directory: ${dir}`);
    const items = [];
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            if (ignoredItems.includes(file)) return;

            const fullPath = path.join(dir, file);
            const relativePath = fullPath.replace(docsRoot, '');
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                // Process directory with a recursive call
                let children = [];
                try {
                    children = scanDirectory(fullPath); 
                } catch (error) {
                    // If there is an error in the subdirectory, log it and continue to other items.
                    console.error(`Error: An error occurred while processing the directory ${fullPath}. The program will continue processing other items.`, error);
                    // Continue processing other directories/files
                }
                items.push({ 
                    type: 'directory',
                    name: file,
                    path: relativePath,
                    children: children
                });
            } else if (path.extname(file) === '.md') {
                // Process Markdown file, extract the title and save the item.
                try {
                    processMarkdownFile(fullPath);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const title = extractTitle(content) || file.replace('.md', '');
                    items.push({
                        type: 'file',
                        name: file,
                        title: title,
                        path: relativePath
                    });
                } catch (error) {
                    console.error(`Error: An error occurred while processing the file ${fullPath}.`, error);
                }
            }
        });
    } catch (error) {
        console.error(`Error: An error occurred while reading the directory ${dir}.`, error);
    } 
    return items;
}

/**
 * @function countItems
 * @description Counts the total number of items (files and directories) processed in the documentation structure.
 * @param {Array} items - An array of items representing the documentation structure.
 *                        Each item can be a file or a directory, and directories may contain nested items.
 * @returns {number} The total number of items in the provided structure.
 * @sideEffects This function operates recursively to count items in nested directories.
 *              It does not modify any external state.
 */
function countItems(items) {
    let count = items.length;
    items.forEach(item => {
        if (item.type === 'directory' && item.children) {
            count += countItems(item.children);
        }
    });
    return count;
}

/**
 * @function generateStructure
 * @description Main function to generate the documentation structure by scanning the docs directory.
 * It calls scanDirectory to read the files and directories,
 * after that, save the structure to a file.
 * @returns {void} This function does not return any value.
 * @sideEffects - Scans the entire docs directory.
 *                - Writes the generated structure to a JSON file (structure.json).
 *                - Logs messages to the console for the start and completion of the process, as well as for any errors encountered.
 */
function generateStructure() {
    console.log('Starting documentation structure generation...');
    try {
        const structure = scanDirectory(docsRoot);
        try{ 
            // try to write the file
            fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
        } catch(error){
            // if there is an error, log it and stop the process
            console.error(`Error: Unable to write the structure data to ${outputFile}. Please check file permissions and disk space.`, error);
            return;
        }
        
        console.log('Documentation structure generated and saved successfully!');
        console.log(`Total of ${countItems(structure)} items processed.`);
    } catch (error) { //catch other errors
        console.error('Error: An unexpected error occurred while generating the documentation structure.', error);
    }
}

// Start generating the structure
generateStructure();