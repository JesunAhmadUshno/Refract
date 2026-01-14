document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.querySelector('.btn-secondary');
    const resultsArea = document.getElementById('results-area');
    const gridContainer = document.querySelector('.grid-container');
    const downloadAllBtn = document.getElementById('download-all');

    // Configuration for Chrome Web Store Assets
    const specs = [
        { name: "Screenshot", width: 1280, height: 800 },
        { name: "Small Promo", width: 440, height: 280 },
        { name: "Marquee Promo", width: 1400, height: 560 },
        { name: "Store Icon", width: 128, height: 128 }
    ];

    let zipData = new JSZip();

    // Interaction Handlers
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling to dropZone
        fileInput.click();
    });

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.transform = 'scale(1.02)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--glass-border)';
        dropZone.style.transform = 'scale(1)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--glass-border)';
        dropZone.style.transform = 'scale(1)';
        if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) processFile(e.target.files[0]);
    });

    function processFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file (PNG, JPG, WEBP).');
            return;
        }

        // Reset UI
        gridContainer.innerHTML = '';
        zipData = new JSZip();
        dropZone.classList.add('hidden');
        resultsArea.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => generateAssets(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function generateAssets(sourceImg) {
        specs.forEach(spec => {
            // Create Canvas
            const canvas = document.createElement('canvas');
            canvas.width = spec.width;
            canvas.height = spec.height;
            const ctx = canvas.getContext('2d');

            // Draw and resize
            // We use 'cover' logic (crop to fill) or 'stretch'?
            // Standard resize usually stretches, but for high quality we often want to maintain aspect ratio.
            // For this specific tool, we will stretch to exact dimensions to ensure 100% compliance with store rules.
            ctx.drawImage(sourceImg, 0, 0, spec.width, spec.height);

            // Convert to Blob
            canvas.toBlob((blob) => {
                const fileName = `refract_${spec.name.replace(/\s+/g, '_').toLowerCase()}.png`;
                
                // Add to Zip
                zipData.file(fileName, blob);

                // Create Card in UI
                const url = URL.createObjectURL(blob);
                createCard(url, spec.name, `${spec.width}x${spec.height}`, fileName);
            }, 'image/png');
        });
    }

    function createCard(imgUrl, title, dim, fileName) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="preview-box">
                <img src="${imgUrl}" alt="${title}">
            </div>
            <div class="card-meta">
                <h4>${title}</h4>
                <p>${dim} • PNG</p>
            </div>
        `;
        // Add click to download individual (optional)
        card.style.cursor = 'pointer';
        card.title = 'Click to download this file';
        card.onclick = () => {
            const a = document.createElement('a');
            a.href = imgUrl;
            a.download = fileName;
            a.click();
        };
        gridContainer.appendChild(card);
    }

    downloadAllBtn.addEventListener('click', () => {
        zipData.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, "refract_assets.zip");
        });
    });
});