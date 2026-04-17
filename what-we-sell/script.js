// ==================== DOM ELEMENTS ====================
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenuBtn = document.getElementById('closeMenu');

// ==================== SIDE MENU ====================
menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
});

function closeSideMenu() {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
}

closeMenuBtn.addEventListener('click', closeSideMenu);
overlay.addEventListener('click', closeSideMenu);

document.querySelectorAll('.side-link').forEach(link => {
    link.addEventListener('click', closeSideMenu);
});

// ==================== SEARCH DROPDOWN ====================
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');

if (searchInput && searchDropdown && typeof productCatalog !== 'undefined') {
    const MAX_DROPDOWN_RESULTS = 8;

    function fuzzyScore(query, target) {
        query = query.toLowerCase();
        target = target.toLowerCase();
        if (target.includes(query)) return 1;
        const queryWords = query.split(/\s+/).filter(Boolean);
        const targetWords = target.split(/\s+/).filter(Boolean);
        let wordMatchCount = 0;
        for (const qw of queryWords) {
            for (const tw of targetWords) {
                if (tw.includes(qw) || qw.includes(tw)) { wordMatchCount++; break; }
            }
        }
        if (wordMatchCount === queryWords.length) return 0.9;
        const bigrams = (s) => {
            const b = new Set();
            for (let i = 0; i < s.length - 1; i++) b.add(s[i] + s[i + 1]);
            return b;
        };
        const qBigrams = bigrams(query);
        const tBigrams = bigrams(target);
        if (qBigrams.size === 0 || tBigrams.size === 0) return 0;
        let intersect = 0;
        for (const b of qBigrams) { if (tBigrams.has(b)) intersect++; }
        return (2 * intersect) / (qBigrams.size + tBigrams.size);
    }

    function fuzzyMatchProduct(product, searchTerm) {
        const fields = [
            product.name,
            product.category.replace(/-/g, ' '),
            product.country,
            product.classification,
            (categoryLabels[product.category] || '')
        ];
        let best = 0;
        for (const f of fields) {
            const s = fuzzyScore(searchTerm, f);
            if (s > best) best = s;
        }
        return best;
    }

    function searchAllProducts(searchTerm) {
        if (!searchTerm) return [];
        const exact = productCatalog.filter(product =>
            product.name.toLowerCase().includes(searchTerm)
            || product.category.replace(/-/g, ' ').toLowerCase().includes(searchTerm)
            || product.country.toLowerCase().includes(searchTerm)
            || product.classification.toLowerCase().includes(searchTerm)
            || (categoryLabels[product.category] || '').toLowerCase().includes(searchTerm)
        );
        if (exact.length > 0) return exact;
        const FUZZY_THRESHOLD = 0.3;
        return productCatalog
            .map(product => ({ product, score: fuzzyMatchProduct(product, searchTerm) }))
            .filter(item => item.score >= FUZZY_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);
    }

    function renderSearchDropdown() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            searchDropdown.classList.remove('active');
            searchDropdown.innerHTML = '';
            return;
        }
        const results = searchAllProducts(searchTerm);
        if (results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-dropdown-empty">No products found</div>';
            searchDropdown.classList.add('active');
            return;
        }
        const shown = results.slice(0, MAX_DROPDOWN_RESULTS);
        let html = shown.map(product => {
            const catLabel = categoryLabels[product.category] || product.category;
            return `
                <a href="../product_template/product_template.html?product=${product.id}" class="search-dropdown-item">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="search-dropdown-info">
                        <div class="search-dropdown-name">${product.name}</div>
                        <div class="search-dropdown-meta">${catLabel} &bull; ${product.weight}</div>
                    </div>
                    <span class="search-dropdown-price">\u20B9${product.price.toLocaleString()}</span>
                </a>`;
        }).join('');
        if (results.length > MAX_DROPDOWN_RESULTS) {
            html += `<a href="../product_list/product_list.html" class="search-dropdown-viewall">${results.length - MAX_DROPDOWN_RESULTS} more results — view all products</a>`;
        }
        searchDropdown.innerHTML = html;
        searchDropdown.classList.add('active');
    }

    searchInput.addEventListener('input', renderSearchDropdown);
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) renderSearchDropdown();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            searchDropdown.classList.remove('active');
        }
    });
}
