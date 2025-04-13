import { categoryBase, isJsonUpdated } from './categoryBaseControl.js';
import { getSelectedColumns, csvReady } from './csvInput.js';

let unmatchedTransactions = [];
let isPromptActive = false;

console.log("Waiting for CSV data...");

function processTransactions(categoryBase) {
    const transactions = getSelectedColumns();
    console.log("Transactions after processing:", transactions);

    transactions.forEach(transaction => {
        const { description } = transaction;
        let matchedCategory = null;

        const normalizedDescription = description.trim().toLowerCase();

        for (const [category, keywords] of Object.entries(categoryBase)) {
            if (keywords.some(keyword => normalizedDescription.includes(keyword.toLowerCase().trim()))) {
                matchedCategory = category;
                break;
            }
        }

        if (matchedCategory) {
            console.log(`Transaction: "${description}" matched with category: ${matchedCategory}`);
        } else {
            console.log(`Transaction: "${description}" did not match any category.`);
            unmatchedTransactions.push(description); // Add to queue
        }
    });

    return Promise.resolve(); // Resolve when processing is complete
}

function processUnmatchedTransactions() {
    return new Promise(resolve => {
        function processNextUnmatchedTransaction() {
            if (isPromptActive || unmatchedTransactions.length === 0) {
                resolve(); // Resolve when all unmatched transactions are processed
                return;
            }

            isPromptActive = true; // Lock further prompts

            const transactionDescription = unmatchedTransactions.shift(); // Get next unmatched transaction
            promptUserToSelectCategory(transactionDescription, () => {
                isPromptActive = false; // Unlock prompt
                processNextUnmatchedTransaction(); // Process next transaction in queue
            });
        }

        processNextUnmatchedTransaction();
    });
}

function promptUserToSelectCategory(transactionDescription, callback) {
    const categories = Object.keys(categoryBase.json || {});

    const popupHtml = `
        <div id="categorySelectionPopup">
            <h3>Category not found for payment: "${transactionDescription}". Please select a category:</h3>
            <select id="categorySelect">
                ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
            </select>
            <br><br>
            <button id="submitCategory">Submit</button>
            <button id="skipCategory">Skip</button>
            <button id="skipAllCategories">Skip All</button>
        </div>
    `;

    document.body.innerHTML += popupHtml;

    document.getElementById('submitCategory').addEventListener('click', function () {
        const selectedCategory = document.getElementById('categorySelect').value;

        if (categories.includes(selectedCategory)) {
            const userKeyword = prompt(`Enter a keyword for the category "${selectedCategory}"\n"${transactionDescription}"`);
            if (userKeyword && userKeyword.trim() !== "") {
                categoryBase.json[selectedCategory].push(userKeyword.trim()); // Add the keyword to the selected category
                console.log(`Transaction "${userKeyword}" added to category: ${selectedCategory}`);
                console.log("Category Base after update:", categoryBase.json);
            } else {
                console.log("No valid keyword entered. Transaction not added.");
            }
        } else {
            console.log("Invalid category selected.");
        }

        document.getElementById('categorySelectionPopup').remove();
        callback(); // Notify that the prompt is complete
    });

    document.getElementById('skipCategory').addEventListener('click', function () {
        document.getElementById('categorySelectionPopup').remove();
        callback(); // Notify that the prompt is complete
    });

    document.getElementById('skipAllCategories').addEventListener('click', function () {
        unmatchedTransactions = []; // Clear the unmatched transactions queue
        document.getElementById('categorySelectionPopup').remove();
        callback(); // Notify that the prompt is complete
    });
}

function openResultsPage() {
    const selectedColumns = getSelectedColumns();
    localStorage.setItem('categoryBase', JSON.stringify(categoryBase.json));
    localStorage.setItem('transactions', JSON.stringify(selectedColumns));

    window.location.href = 'results.html'; 
}

// Main function to wait for everything to complete
async function main() {
    await csvReady; // Wait for CSV data to be ready

    if (isJsonUpdated) {
        console.log("Using imported JSON:", categoryBase.json);
        await processTransactions(categoryBase.json);
    } else {
        console.log("Fetching default JSON...");
        const response = await fetch('json/categoryBase.json');
        const defaultJson = await response.json();
        console.log("Using default JSON file:", defaultJson);
        await processTransactions(defaultJson);
    }

    await processUnmatchedTransactions();

    console.log("All processing is complete.");
    openResultsPage();
}

main();