export const categoryBase = {};
export let isJsonUpdated = false;

fetch('json/categoryBase.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load JSON file: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        categoryBase.json = data;
        console.log('Default JSON file loaded:', categoryBase.json);
    })
    .catch(error => {
        console.error('Error loading JSON file:', error);
    });

document.getElementById('importJsonBtn').addEventListener('click', function() {
    console.log('importJsonBtn clicked');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);

                    categoryBase.json = jsonData;
                    isJsonUpdated = true;
                    console.log('Imported JSON:', categoryBase.json);

                    alert('JSON file imported successfully!');
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                    alert('Failed to parse the JSON file. Please check the file format.');
                }
            };

            reader.readAsText(file);
        }
    });

    input.click();
});

document.getElementById('exportJsonBtn').addEventListener('click', function() {
    console.log('exportJsonBtn clicked');

    const jsonString = JSON.stringify(categoryBase.json, null, 2);

    const blob = new Blob([jsonString], { type: "application/json" });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "categoryBase.json";

    a.click();

    URL.revokeObjectURL(a.href);
});