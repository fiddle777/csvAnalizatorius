let selectedColumns = [];
let resolveReady;  
export const csvReady = new Promise(resolve => { resolveReady = resolve; });

export function getSelectedColumns() {
    return selectedColumns;
}

let balance = null;
export function getBalance() {
    return balance;
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('uploadBtn').addEventListener('click', function () {
        document.getElementById('csvFileInput').click();
    });

    document.getElementById('csvFileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const csvContent = e.target.result;

                Papa.parse(csvContent, {
                    complete: function (results) {
                        const firstRow = results.data[0];
                        if ((firstRow && firstRow[0] !== "Sąskaitos Nr.") && (firstRow && firstRow[0] !== "Account No")) {
                            showErrorPopup("DĖMESIO! Failas turi netinkamus duomenis, patikrinkite.");
                            return;
                        }

                        selectedColumns = results.data.slice(1)
                            .map(row => {
                                const description = row[4]?.trim();
                                if (description === "Likutis pabaigai" || description === "Closing balance") {
                                    balance = parseFloat(row[5]);
                                    localStorage.setItem('balance', balance);
                                    return null;
                                }
                                if (["Likutis pradžiai", "Opening balance", "Įkainis už VMP banko viduje", "Apyvarta", "Turnover"].includes(description)) {
                                    return null;
                                }
                                if (!description || !row[2] || !row[5]) {
                                    return null;
                                }
                                return {
                                    date: row[2],
                                    description: row[4],
                                    amount: row[5],
                                    type: row[7]?.trim() === "K" ? "Income" : row[7]?.trim() === "D" ? "Expense" : "Unknown"
                                };
                            })
                            .filter(row => row !== null);

                        console.log("Extracted Selected Columns:", selectedColumns);

                        resolveReady();
                    },
                    header: false,
                    skipEmptyLines: true
                });
            };
            reader.readAsText(file);
        }
    });
});

function showErrorPopup(message) {
    const errorPopup = document.getElementById('errorPopup');
    errorPopup.textContent = message;
    errorPopup.style.display = 'block';
    setTimeout(() => errorPopup.style.display = 'none', 5000);
}
