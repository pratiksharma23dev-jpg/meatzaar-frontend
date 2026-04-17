// ==================== DOM ELEMENTS ====================
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const filtersToggleBtn = document.getElementById('filtersToggleBtn');
const filtersSidebar = document.getElementById('filtersSidebar');
const sortSelect = document.getElementById('sortSelect');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const priceMinSlider = document.getElementById('priceMinSlider');
const priceMaxSlider = document.getElementById('priceMaxSlider');
const priceMinLabel = document.getElementById('priceMinLabel');
const priceMaxLabel = document.getElementById('priceMaxLabel');
const sliderTrack = document.getElementById('sliderTrack');
const perPageSelect = document.getElementById('perPageSelect');
const paginationContainer = document.getElementById('pagination');

// ==================== PAGINATION STATE ====================
let currentPage = 1;

function getPerPage() {
    return parseInt(perPageSelect.value, 10);
}

// ==================== PRODUCT DATA (loaded from ../shared/products-data.js) ====================

// Track quantities per product
const quantities = {};
function _initQuantities() {
    productCatalog.forEach(p => { if (!(p.id in quantities)) quantities[p.id] = 1; });
}

// ==================== SIDE MENU ====================
menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
});

closeMenu.addEventListener('click', closeSideMenu);
overlay.addEventListener('click', closeSideMenu);

function closeSideMenu() {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
    filtersSidebar.classList.remove('active');
}

document.querySelectorAll('.side-link').forEach(link => {
    link.addEventListener('click', closeSideMenu);
});

// ==================== VIEW TOGGLE ====================
gridViewBtn.addEventListener('click', () => {
    productsGrid.classList.remove('list-view');
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
});

listViewBtn.addEventListener('click', () => {
    productsGrid.classList.add('list-view');
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
});

// ==================== FILTERS TOGGLE (MOBILE) ====================
filtersToggleBtn.addEventListener('click', () => {
    filtersSidebar.classList.toggle('active');
});

// ==================== FUZZY SEARCH ====================
function fuzzyScore(query, target) {
    query = query.toLowerCase();
    target = target.toLowerCase();

    // Exact substring match = best score
    if (target.includes(query)) return 1;

    // Check if every word in the query partially matches something in the target
    const queryWords = query.split(/\s+/).filter(Boolean);
    const targetWords = target.split(/\s+/).filter(Boolean);

    let wordMatchCount = 0;
    for (const qw of queryWords) {
        for (const tw of targetWords) {
            if (tw.includes(qw) || qw.includes(tw)) { wordMatchCount++; break; }
        }
    }
    if (wordMatchCount === queryWords.length) return 0.9;

    // Bigram similarity (handles typos)
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

// ==================== FILTERING & SORTING ====================
function getSelectedCheckboxValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const checked = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map(cb => cb.value.toLowerCase());
}

function getStatusFilters() {
    const statusCheckboxes = document.querySelectorAll('.filter-group .checkbox-group')[0];
    if (!statusCheckboxes) return [];
    const checked = statusCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map(cb => cb.value);
}

function getFilteredProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const minPrice = parseInt(priceMinSlider.value, 10);
    const maxPrice = parseInt(priceMaxSlider.value, 10);
    const selectedCountries = getSelectedCheckboxValues('countryFilters');
    const selectedCategories = getSelectedCheckboxValues('categoryFilters');
    const selectedStatuses = getStatusFilters();
    const effectiveStatuses = selectedStatuses.length > 0 ? selectedStatuses : ['in-stock'];

    const effectiveCategories = selectedCategories.length > 0
        ? selectedCategories
        : (urlCategory && urlCategory !== 'all' ? [urlCategory.toLowerCase()] : []);

    // Apply non-search filters first
    const baseFiltered = productCatalog.filter(product => {
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
        const matchesCountry = selectedCountries.length === 0
            || selectedCountries.includes(product.country.toLowerCase());
        const matchesCategory = effectiveCategories.length === 0
            || effectiveCategories.includes(product.category.toLowerCase());
        const matchesStatus = effectiveStatuses.includes(product.status);
        return matchesPrice && matchesCountry && matchesCategory && matchesStatus;
    });

    if (!searchTerm) return baseFiltered;

    // Try exact substring match first
    const exactResults = baseFiltered.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
        || product.category.toLowerCase().includes(searchTerm)
        || product.country.toLowerCase().includes(searchTerm)
        || product.classification.toLowerCase().includes(searchTerm)
    );

    if (exactResults.length > 0) return exactResults;

    // Fuzzy fallback — score every product and return those above threshold
    const FUZZY_THRESHOLD = 0.3;
    const scored = baseFiltered
        .map(product => ({ product, score: fuzzyMatchProduct(product, searchTerm) }))
        .filter(item => item.score >= FUZZY_THRESHOLD)
        .sort((a, b) => b.score - a.score);

    return scored.map(item => item.product);
}

function sortProducts(products) {
    const sortVal = sortSelect.value;
    const sorted = [...products];

    switch (sortVal) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default: // popularity — keep original order
            break;
    }
    return sorted;
}

// ==================== RENDER ====================
function renderProducts() {
    const filtered = getFilteredProducts();
    const sorted = sortProducts(filtered);

    const perPage = getPerPage();
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * perPage;
    const pageProducts = sorted.slice(startIndex, startIndex + perPage);

    productsGrid.innerHTML = pageProducts.map(product => {
        const statusLabel = product.status === 'in-stock' ? 'In stock'
            : product.status === 'out-of-stock' ? 'Out of stock'
            : 'On sale';
        const statusClass = product.status === 'in-stock' ? 'in-stock'
            : product.status === 'out-of-stock' ? 'out-of-stock'
            : 'in-stock';
        const categoryLabel = categoryLabels[product.category] || product.category;
        const qty = quantities[product.id];
        const isDisabled = product.status === 'out-of-stock';

        return `
            <div class="product-card" data-id="${product.id}">
                <a href="../product_template/product_template.html?product=${product.id}" class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                </a>
                <div class="product-body">
                    <div class="product-tags">
                        <span>${product.classification} &bull; ${product.country}</span>
                    </div>
                    <div class="product-name">
                        <a href="../product_template/product_template.html?category=${product.category}&product=${product.id}">${product.name}</a>
                    </div>
                    <div class="product-weight">Weight: ${product.weight}</div>
                    <div class="product-price-row">
                        <span class="product-price">\u20B9${product.price.toLocaleString()}</span>
                        <span class="stock-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="product-actions">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="changeQty('${product.id}', -1)" ${isDisabled ? 'disabled' : ''}>&minus;</button>
                            <span class="qty-display" id="qty-${product.id}">${qty}</span>
                            <button class="qty-btn" onclick="changeQty('${product.id}', 1)" ${isDisabled ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="btn-add" onclick="addToCart('${product.id}')" ${isDisabled ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Add</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    emptyState.classList.toggle('hidden', sorted.length > 0);
    renderPagination(totalPages);
}

// ==================== PAGINATION ====================
function renderPagination(totalPages) {
    if (totalPages <= 1) {
        paginationContainer.innerHTML = `
            <button class="page-btn prev-btn" disabled>&laquo; Prev</button>
            <button class="page-btn active">1</button>
            <button class="page-btn next-btn" disabled>Next &raquo;</button>`;
        return;
    }

    const maxVisible = 5;
    let startPage, endPage;

    if (totalPages <= maxVisible) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const half = Math.floor(maxVisible / 2);
        startPage = Math.max(1, currentPage - half);
        endPage = startPage + maxVisible - 1;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = endPage - maxVisible + 1;
        }
    }

    let html = '';

    // Prev button
    html += `<button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">&laquo; Prev</button>`;

    // First page + ellipsis
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="page-ellipsis">&hellip;</span>`;
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="page-ellipsis">&hellip;</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next &raquo;</button>`;

    paginationContainer.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== QUANTITY ====================
function changeQty(productId, delta) {
    quantities[productId] = Math.max(1, (quantities[productId] || 1) + delta);
    const el = document.getElementById(`qty-${productId}`);
    if (el) el.textContent = quantities[productId];
}

// ==================== ADD TO CART ====================
function addToCart(productId) {
    const product = productCatalog.find(p => p.id === productId);
    if (!product || product.status === 'out-of-stock') return;

    const qty = quantities[productId] || 1;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: qty
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof updateNavCartBadge === 'function') updateNavCartBadge();

    // Visual feedback
    const card = document.querySelector(`.product-card[data-id="${productId}"] .btn-add`);
    if (card) {
        card.textContent = 'Added!';
        card.classList.add('added');
        setTimeout(() => {
            card.textContent = 'Add';
            card.classList.remove('added');
        }, 1200);
    }

    // Reset quantity
    quantities[productId] = 1;
    const el = document.getElementById(`qty-${productId}`);
    if (el) el.textContent = '1';
}

// ==================== SEARCH DROPDOWN (searches ALL products) ====================
const MAX_DROPDOWN_RESULTS = 8;

function searchAllProducts(searchTerm) {
    if (!searchTerm) return [];
    const searchableProducts = productCatalog.filter(product => product.status === 'in-stock');

    // Exact substring matches first
    const exact = searchableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
        || product.category.replace(/-/g, ' ').toLowerCase().includes(searchTerm)
        || product.country.toLowerCase().includes(searchTerm)
        || product.classification.toLowerCase().includes(searchTerm)
        || (categoryLabels[product.category] || '').toLowerCase().includes(searchTerm)
    );

    if (exact.length > 0) return exact;

    // Fuzzy fallback
    const FUZZY_THRESHOLD = 0.3;
    return searchableProducts
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
        html += `<div class="search-dropdown-viewall" id="searchViewAll">${results.length - MAX_DROPDOWN_RESULTS} more results — press Enter to filter</div>`;
    }

    searchDropdown.innerHTML = html;
    searchDropdown.classList.add('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        searchDropdown.classList.remove('active');
    }
});

// Re-open dropdown on focus if there's a search term
searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) renderSearchDropdown();
});

// ==================== EVENT LISTENERS ====================
searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderSearchDropdown();
    renderProducts();
});
sortSelect.addEventListener('change', renderProducts);
perPageSelect.addEventListener('change', () => {
    currentPage = 1;
    renderProducts();
});

applyFiltersBtn.addEventListener('click', () => {
    currentPage = 1;
    renderProducts();
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        filtersSidebar.classList.remove('active');
    }
});

resetFiltersBtn.addEventListener('click', () => {
    priceMinSlider.value = 0;
    priceMaxSlider.value = 5000;
    updateSlider();
    document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    searchInput.value = '';
    sortSelect.value = 'popularity';
    renderProducts();
});

// ==================== URL PARAMS ====================
const params = new URLSearchParams(window.location.search);
const urlCategory = params.get('category');

// ==================== PRICE SLIDER ====================
function updateSlider() {
    let minVal = parseInt(priceMinSlider.value, 10);
    let maxVal = parseInt(priceMaxSlider.value, 10);
    if (minVal > maxVal) {
        [priceMinSlider.value, priceMaxSlider.value] = [maxVal, minVal];
        minVal = parseInt(priceMinSlider.value, 10);
        maxVal = parseInt(priceMaxSlider.value, 10);
    }
    priceMinLabel.textContent = '₹' + minVal.toLocaleString();
    priceMaxLabel.textContent = '₹' + maxVal.toLocaleString();
    const rangeMin = parseInt(priceMinSlider.min, 10);
    const rangeMax = parseInt(priceMinSlider.max, 10);
    const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
    const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
    sliderTrack.style.left = percentMin + '%';
    sliderTrack.style.width = (percentMax - percentMin) + '%';
}

priceMinSlider.addEventListener('input', updateSlider);
priceMaxSlider.addEventListener('input', updateSlider);
updateSlider();

// ==================== INIT ====================
if (typeof productsReady !== 'undefined') {
    productsReady.then(() => {
        _initQuantities();
        renderProducts();
    });
} else {
    _initQuantities();
    renderProducts();
}
