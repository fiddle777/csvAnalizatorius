document.addEventListener('DOMContentLoaded', () => {
    const balance = parseFloat(localStorage.getItem('balance'));

    console.log('Final Balance:', balance);

    if (!isNaN(balance)) {
        document.getElementById('balanceDisplay').textContent = `Balance: ${balance.toFixed(2)}€`;
    } else {
        console.log('Balance not found in localStorage.');
        document.getElementById('balanceDisplay').textContent = 'Balance: N/A';
    }

    const categoryBase = JSON.parse(localStorage.getItem('categoryBase'));
    const transactions = JSON.parse(localStorage.getItem('transactions'));

    console.log('Category Base:', categoryBase);
    console.log('Transactions:', transactions);

    if (!categoryBase || !transactions) {
        console.error('Data is missing. Ensure the builder has completed its work.');
        return;
    }

    transactions.forEach(transaction => {
        const description = transaction.description.toLowerCase().replace(/\s+/g, '');
        
        if (transaction.type === 'Income') {
            transaction.category = null;
            console.log(`Transaction "${transaction.description}" is income and does not require a category.`);
            return; 
        }

        let matchedCategory = null;

        for (const [category, keywords] of Object.entries(categoryBase)) {
            if (keywords.some(keyword => description.includes(keyword.toLowerCase().replace(/\s+/g, '')))) {
                matchedCategory = category;
                break;
            }
        }

        if (matchedCategory) {
            transaction.category = matchedCategory;
            console.log(`Transaction "${transaction.description}" matched with category: ${matchedCategory}`);
        } else {
            transaction.category = 'Uncategorized';
            console.log(`Transaction "${transaction.description}" did not match any category.`);
        }
    });

    console.log('Transactions after categorization:', transactions);

    // Extract the first and last dates
    if (transactions.length > 0) {
        // Sort transactions by date (if not already sorted)
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        const firstDate = transactions[0].date;
        const lastDate = transactions[transactions.length - 1].date;

        console.log('First Date:', firstDate);
        console.log('Last Date:', lastDate);
        document.getElementById('firstDate').textContent = firstDate;
        document.getElementById('lastDate').textContent = lastDate;
    } else {
        console.log('No transactions available.');
        document.getElementById('firstDate').textContent = 'No data';
        document.getElementById('lastDate').textContent = 'No data';
    }
//PANEL 1------------------------------------------------------------------------
    const { totalIncome, totalExpenses } = transactions.reduce(
        (totals, transaction) => {
            const amount = parseFloat(transaction.amount);
            const category = transaction.category;

            if (transaction.type === 'Income') {
                totals.totalIncome += amount;
            } else {
                totals.totalExpenses += amount
            }

            return totals;
        },
        { totalIncome: 0, totalExpenses: 0 } 
    );

    console.log('Total Income:', totalIncome);
    console.log('Total Expenses:', totalExpenses);

const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
            data: [totalIncome, totalExpenses],
            backgroundColor: ['#34D399', '#F87171'],
            hoverBackgroundColor: ['#10B981', '#EF4444'],
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#E0E0E0'
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value.toFixed(2)} €`;
                    }
                }
            }
        }
    },
});
//PANEL 2------------------------------------------------------------------------
    const categoryTotals = transactions.reduce((totals, transaction) => {
        if (transaction.type === 'Expense') {
            const category = transaction.category || 'Uncategorized';
            if (!totals[category]) {
                totals[category] = 0;
            }
            totals[category] += Math.abs(parseFloat(transaction.amount));
        }
        return totals;
    }, {});

    console.log('Category Totals:', categoryTotals);

    const totalExpensesForPercentage = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);

    const colorPalette = [
        '#34D399', '#F87171', '#60A5FA', '#FBBF24', '#A78BFA', '#F472B6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'
    ];

    // Convert categoryTotals to an array and sort by percentage (descending)
    const sortedCategoryTotals = Object.entries(categoryTotals)
        .map(([category, total]) => ({
            category,
            total,
            percentage: ((total / totalExpensesForPercentage) * 100).toFixed(2)
        }))
        .sort((a, b) => b.percentage - a.percentage); // Sort by percentage in descending order

    const categoryTotalsList = document.getElementById('categoryTotalsList');
    let colorIndex = 0;

    sortedCategoryTotals.forEach(({ category, total, percentage }) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${percentage}% ${category}: ${total.toFixed(2)} €`;

        // Assigning a unique color from the palette
        listItem.style.color = colorPalette[colorIndex];
        colorIndex = (colorIndex + 1) % colorPalette.length;

        categoryTotalsList.appendChild(listItem);
    });
//PANEL 3------------------------------------------------------------------------

document.getElementById('incomeDisplay').textContent = `Income: ${totalIncome.toFixed(2)}€`;
document.getElementById('expensesDisplay').textContent = `Expenses: ${totalExpenses.toFixed(2)}€`;

// PANEL 4------------------------------------------------------------------------
const dailyTotals = transactions.reduce((totals, transaction) => {
    const date = transaction.date;
    if (!totals[date]) {
        totals[date] = { income: 0, expenses: 0 };
    }

    const amount = parseFloat(transaction.amount);
    if (transaction.type === 'Income') {
        totals[date].income += amount;
    } else if (transaction.type === 'Expense') {
        totals[date].expenses += Math.abs(amount);
    }

    return totals;
}, {});

console.log('Daily Totals:', dailyTotals);

// Preparing data for the chart
const dates = Object.keys(dailyTotals);
const incomeData = dates.map(date => dailyTotals[date].income);
const expenseData = dates.map(date => dailyTotals[date].expenses);

// Canvas for the chart
const panel4 = document.querySelector('#bottom-dashboard .panel.large:nth-child(1)'); // Select the first large panel
panel4.innerHTML = '<h3 class="panel-title">Daily Income and Expenses</h3>'; // Add a title
const chartCanvas = document.createElement('canvas'); // Create a canvas element for the chart
chartCanvas.id = 'dailyIncomeExpenseChart'; // Assign an ID for styling or reference
panel4.appendChild(chartCanvas); // Append the canvas to the panel

const dailyCtx = document.getElementById('dailyIncomeExpenseChart').getContext('2d');

// Minimum bar height
const MIN_BAR_HEIGHT = 1;

const incomeDataWithMinHeight = incomeData.map(value => (value > 0 ? Math.max(value, MIN_BAR_HEIGHT) : 0));
const expenseDataWithMinHeight = expenseData.map(value => (value > 0 ? Math.max(value, MIN_BAR_HEIGHT) : 0));

new Chart(dailyCtx, {
    type: 'bar',
    data: {
        labels: dates,
        datasets: [
            {
                label: 'Income',
                data: incomeDataWithMinHeight,
                backgroundColor: '#34D399',
                borderColor: '#10B981',
                borderWidth: 1,
                originalData: incomeData
            },
            {
                label: 'Expenses',
                data: expenseDataWithMinHeight.map(value => -value),
                backgroundColor: '#F87171',
                borderColor: '#EF4444',
                borderWidth: 1,
                originalData: expenseData
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index', // Show tooltips for all datasets at the hovered index
            intersect: false // Trigger tooltips even if not directly over a bar
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#E0E0E0'
                }
            },
            tooltip: {
                position: 'nearest',
                callbacks: {
                    label: function (context) {
                        // Use the original data for the tooltip
                        const dataset = context.dataset;
                        const originalValue = dataset.originalData[context.dataIndex] || 0;
                        const label = dataset.label || '';
                        return `${label}: ${originalValue.toFixed(2)} €`;
                    },
                    afterBody: function (context) {
                        const hoveredDate = context[0].label; // Get the hovered date
                        const transactionsForDate = transactions.filter(
                            transaction => transaction.date === hoveredDate
                        );

                        // Generate a list of transactions for the hovered date
                        const transactionDetails = transactionsForDate.map(transaction => {
                            const type = transaction.type === 'Income' ? 'Income' : 'Expenses';
                            const amount = parseFloat(transaction.amount).toFixed(2);
                            return `${type}: ${amount} € (${transaction.description})`;
                        });

                        return transactionDetails;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Date',
                    color: '#E0E0E0'
                },
                ticks: {
                    color: '#E0E0E0'
                }
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Amount',
                    color: '#E0E0E0'
                },
                ticks: {
                    color: '#E0E0E0',
                    callback: function (value) {
                        return `${value.toFixed(2)} €`;
                    }
                },
                beginAtZero: true
            }
        }
    }
});
localStorage.setItem('transactions', JSON.stringify(transactions));
localStorage.setItem('totalIncome', totalIncome);
localStorage.setItem('totalExpenses', totalExpenses);
localStorage.setItem('balance', balance);
localStorage.setItem('categoryTotals', JSON.stringify(categoryTotals));
localStorage.setItem('dailyTotals', JSON.stringify(dailyTotals));
localStorage.setItem('categoryBase', JSON.stringify(categoryBase));
});