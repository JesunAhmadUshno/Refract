document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.querySelector('.btn-secondary');
    const resultsArea = document.getElementById('results-area');
    const gridContainer = document.querySelector('.grid-container');
    const downloadAllBtn = document.getElementById('download-all');
    const statusText = document.getElementById('status-text');

    // Configuration for Chrome Web Store Assets
    const specs = [
        { name: "Screenshot", width: 1280, height: 800 },
        { name: "Small Promo", width: 440, height: 280 },
        { name: "Marquee Promo", width: 1400, height: 560 },
        { name: "Store Icon", width: 128, height: 128 }
    ];

    let zipData = new JSZip();
    let objectUrls = []; // revoked on the next upload so repeated runs do not leak memory

    // Interaction Handlers
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling to dropZone
        fileInput.click();
    });

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

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
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls = [];
        zipData = new JSZip();
        downloadAllBtn.disabled = true;
        statusText.textContent = 'Processing...';
        dropZone.classList.add('hidden');
        resultsArea.classList.remove('hidden');

        // A file can claim image/* and still not decode (fake or truncated file, .heic in Chrome).
        const fail = () => {
            statusText.textContent = 'Could not read that image. Please choose another file.';
            dropZone.classList.remove('hidden');
        };
        const reader = new FileReader();
        reader.onerror = fail;
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => generateAssets(img);
            img.onerror = fail;
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderAsset(sourceImg, spec) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = spec.width;
            canvas.height = spec.height;
            const ctx = canvas.getContext('2d');

            // Flatten onto white first so the PNG really has no transparency (README: "no alpha").
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, spec.width, spec.height);

            // Stretch to the exact target size. A source whose aspect ratio differs from the
            // target is distorted; the dashboard (site/) measures how much for each asset.
            ctx.drawImage(sourceImg, 0, 0, spec.width, spec.height);

            canvas.toBlob((blob) => resolve({ spec, blob }), 'image/png');
        });
    }

    async function generateAssets(sourceImg) {
        // Wait for every PNG before enabling the ZIP, so an early click can never ship a partial ZIP.
        const results = await Promise.all(specs.map(spec => renderAsset(sourceImg, spec)));
        results.forEach(({ spec, blob }) => { // spec order, not toBlob completion order
            const fileName = `refract_${spec.name.replace(/\s+/g, '_').toLowerCase()}.png`;
            zipData.file(fileName, blob);
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            createCard(url, spec.name, `${spec.width}x${spec.height}`, fileName);
        });
        downloadAllBtn.disabled = false;
        statusText.textContent = 'Processing Complete';
    }

    function createCard(imgUrl, title, dim, fileName) {
        const card = document.createElement('button');
        card.type = 'button';
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
        card.title = 'Click to download this file';
        card.setAttribute('aria-label', `Download ${fileName}`);
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