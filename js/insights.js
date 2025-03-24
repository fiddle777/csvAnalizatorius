document.addEventListener('DOMContentLoaded', async () => {
    const categoryBase = JSON.parse(localStorage.getItem('categoryBase'));
    const transactions = JSON.parse(localStorage.getItem('transactions'));
    const totalIncome = parseFloat(localStorage.getItem('totalIncome'));
    const totalExpenses = parseFloat(localStorage.getItem('totalExpenses'));
    const balance = parseFloat(localStorage.getItem('balance'));
    const categoryTotals = JSON.parse(localStorage.getItem('categoryTotals'));
    const dailyTotals = JSON.parse(localStorage.getItem('dailyTotals'));

    console.log('--TALK TO THE HAND------------------running insights.js');
    console.log('Total Income:', totalIncome);
    console.log('Total Expenses:', totalExpenses);
    console.log('Balance:', balance);
    console.log('Category Totals:', categoryTotals);
    console.log('Daily Totals:', dailyTotals);

    if (!categoryBase || !transactions) {
        console.error('Data is missing. Ensure the builder has completed its work.');
        return;
    }

    let insights;
    try {
        const response = await fetch('json/insights.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch insights: ${response.statusText}`);
        }
        insights = await response.json();
        console.log('Fetched Insights:', insights);

        const context = {
            total_income: totalIncome,
            total_expense: totalExpenses,
            balance: balance,
            category_spending: categoryTotals,
            daily_totals: dailyTotals,
            transactions: transactions
        };

        const prompts = [];
        const processedTags = new Set();
        insights.rules.forEach(rule => {
            const { tag } = rule;
            if (tag && processedTags.has(tag)) {
                return;
            }
            if (evaluateCondition(rule.condition, context)) {
                prompts.push({ message: rule.message, severity: rule.severity });
                if (tag) {
                    processedTags.add(tag);
                }
            }
        });

        console.log('Generated Prompts:', prompts);

        displayPrompts(prompts);
    } catch (error) {
        console.error('Error fetching insights:', error);
    }


    // Function to download JSON files
    function downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2); // Convert data to JSON string
        const blob = new Blob([jsonStr], { type: 'application/json' }); // Create a Blob
        const url = URL.createObjectURL(blob); // Create a URL for the Blob
        const a = document.createElement('a'); // Create an anchor element
        a.href = url;
        a.download = filename; // Set the filename
        a.click(); // Trigger the download
        URL.revokeObjectURL(url); // Revoke the URL after download
    }

    document.getElementById('downloadInsights').addEventListener('click', () => {
        if (!insights) {
            console.error('Insights data is not available.');
            return;
        }
        downloadJSON(insights, 'insights.json');
    });

    document.getElementById('downloadCategoryBase').addEventListener('click', () => {
        if (!categoryBase) {
            console.error('Category Base data is not available.');
            return;
        }
        downloadJSON(categoryBase, 'categoryBase.json');
    });

});

function evaluateCondition(condition, context) {
    const { type } = condition;

    if (type === 'numeric') {
        const { left, operator, right } = condition;
        const leftValue = resolveExpression(left, context);
        const rightValue = typeof right === 'string' ? resolveExpression(right, context) : right;

        switch (operator) {
            case '>': return leftValue > rightValue;
            case '<': return leftValue < rightValue;
            case '>=': return leftValue >= rightValue;
            case '<=': return leftValue <= rightValue;
            case '==': return leftValue == rightValue;
            case '!=': return leftValue != rightValue;
            default: throw new Error(`Unsupported operator: ${operator}`);
        }
    } else if (type === 'category_spent') {
        const { category } = condition;
        return context.transactions.some(transaction => transaction.category === category && parseFloat(transaction.amount) > 0);
    } else if (type === 'keyword') {
        const { keyword } = condition;
        return context.transactions.some(transaction => transaction.description.toLowerCase().includes(keyword.toLowerCase()));
    }

    throw new Error(`Unsupported condition type: ${type}`);
}

function resolveExpression(expression, context) {
    const expressionFunction = new Function(...Object.keys(context), `return ${expression};`);
    return expressionFunction(...Object.values(context));
}

function displayPrompts(prompts) {
    const insightsPanel = document.getElementById('insightsPanel');
    if (!insightsPanel) {
        console.error('Insights panel not found in the DOM. Ensure the element exists and has the correct ID.');
        return;
    }

    insightsPanel.innerHTML = `
        <ul>
            ${prompts
                .map(prompt => `<li class="${prompt.severity}">${prompt.message}</li>`)
                .join('')}
        </ul>
    `;
}