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
                        const firstCell = firstRow ? firstRow[0]: null;
                        const normalizedFirstCell = firstCell ? firstCell.split(";")[0].trim().replace(/^"|"$/g, '')  : null;
                        console.log("Normalized first cell content:", normalizedFirstCell);

                        if ((firstRow && firstRow[0] === "Sąskaitos Nr.") || (firstRow && firstRow[0] === "Account No")) {
                            console.log("SWEDBANK CSV LOADED")
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
                        }
                        else if (normalizedFirstCell && /^SĄSKAITOS\s+\(.*\)\s+IŠRAŠAS\s+\(UŽ LAIKOTARPĮ:.*\)$/i.test(normalizedFirstCell)) {
                            console.log("SEB CSV LOADED");
                            Papa.parse(csvContent, {
                                delimiter: ";", // Specify the delimiter for SEB CSV
                                complete: function (sebResults) {
                                    console.log("Parsed SEB CSV Data:", sebResults.data);

                                    selectedColumns = sebResults.data.slice(2)
                                        .map(row => {
                                            const description = row[9]?.trim();
                                            const sum = row[3]?.trim();
                                            const date = row[11]?.trim();
                                            const debitCredit = row[14]?.trim();

                                            if (!description || !sum || !date || !debitCredit) {
                                                return null;
                                            }

                                            return {
                                                date: date,
                                                description: description,
                                                amount: parseFloat(sum.replace(/\s/g, '')),
                                                type: debitCredit === "C" ? "Income" : debitCredit === "D" ? "Expense" : "Unknown"
                                            };  
                                        })
                                        .filter(row => row !== null);
                                    console.log("Extracted Selected Columns:", selectedColumns);
                                    resolveReady();
                                }
                            });
                        }
                        else{
                            showErrorPopup("WARNING! CSV file format not recognized. Please upload a valid SEB or SWEDBANK CSV file.");
                            return;
                        }
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
