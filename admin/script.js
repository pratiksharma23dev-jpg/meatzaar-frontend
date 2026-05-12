const API_BASE = window.ADMIN_API_BASE || '/api/admin';

// ==================== STATE ====================
// adminToken is the short-lived JWT issued by the backend on login.
// The raw admin password is discarded after the login response and never re-sent.
let adminToken = '';
let allProducts = [];
let allOrders = [];
let editingProductCode = '';

// ==================== DOM REFS ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Restore admin session token from sessionStorage on page reload.
    const saved = sessionStorage.getItem('adminToken');
    if (saved) {
        adminToken = saved;
        verifyStoredToken(saved);
    }

    // Login form
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#togglePw').addEventListener('click', () => {
        const inp = $('#adminPassword');
        const icon = $('#togglePw i');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            inp.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });

    // Logout
    $('#logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('adminToken');
        adminToken = '';
        $('#dashboard').classList.add('hidden');
        $('#loginScreen').classList.remove('hidden');
        $('#adminPassword').value = '';
    });

    // Tab switching
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            $(`#tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Product search
    $('#productSearch').addEventListener('input', renderProducts);
    $('#productsBody').addEventListener('click', handleProductsTableClick);

    // Delete by code
    $('#deleteByCodeBtn').addEventListener('click', handleDeleteByCode);

    // Add product form
    $('#addProductForm').addEventListener('submit', handleAddProduct);

    // Image preview
    $('#prodCardImage').addEventListener('change', handleImagePreview);
    $('#prodProductImageOne').addEventListener('change', handleImagePreview);
    $('#prodProductImageTwo').addEventListener('change', handleImagePreview);
    $('#removeImg').addEventListener('click', clearImagePreview);
    $('#editCardImage').addEventListener('change', handleEditImagePreview);
    $('#editProductImageOne').addEventListener('change', handleEditImagePreview);
    $('#editProductImageTwo').addEventListener('change', handleEditImagePreview);
    $('#removeEditImg').addEventListener('click', clearEditImagePreview);

    // Edit product modal
    $('#editProductForm').addEventListener('submit', handleEditProduct);
    $('#closeEditModal').addEventListener('click', closeEditProductModal);
    $('#cancelEditBtn').addEventListener('click', closeEditProductModal);
    $('#editProductModal').addEventListener('click', (e) => {
        if (e.target.id === 'editProductModal') closeEditProductModal();
    });

    // Order filter
    $('#orderStatusFilter').addEventListener('change', renderOrders);

    // Status dropdown changes — event delegation so no inline handlers are needed (CSP compliance).
    $('#ordersList').addEventListener('change', (e) => {
        const select = e.target.closest('.status-select');
        if (!select) return;
        const card = select.closest('[data-order-id]');
        if (!card) return;
        updateOrderStatus(card.dataset.orderId, select.value);
    });

    // Order ID search
    $('#orderSearch').addEventListener('input', handleOrderSearchInput);
    $('#clearOrderSearch').addEventListener('click', clearOrderSearch);
});

// ==================== AUTH ====================
async function handleLogin(e) {
    e.preventDefault();
    const pw = $('#adminPassword').value.trim();
    if (!pw) return;
    await verifyLogin(pw);
}

async function verifyLogin(pw) {
    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
        });
        const data = await res.json();
        if (res.ok && data.success && data.adminToken) {
            // Store the signed JWT — not the raw password.
            adminToken = data.adminToken;
            sessionStorage.setItem('adminToken', adminToken);
            $('#loginScreen').classList.add('hidden');
            $('#dashboard').classList.remove('hidden');
            $('#loginError').textContent = '';
            loadProducts();
            loadOrders();
        } else {
            $('#loginError').textContent = data.message || 'Invalid password.';
            sessionStorage.removeItem('adminToken');
        }
    } catch {
        $('#loginError').textContent = 'Server unreachable. Is the backend running?';
    }
}

// Verify a stored token is still valid by hitting any protected admin endpoint.
async function verifyStoredToken(token) {
    try {
        const res = await fetch(`${API_BASE}/products`, {
            headers: { 'X-Admin-Token': token }
        });
        if (res.ok) {
            $('#loginScreen').classList.add('hidden');
            $('#dashboard').classList.remove('hidden');
            loadProducts();
            loadOrders();
        } else {
            // Token expired or invalid — force re-login.
            sessionStorage.removeItem('adminToken');
            adminToken = '';
        }
    } catch {
        // Network issue — keep login screen visible.
        sessionStorage.removeItem('adminToken');
        adminToken = '';
    }
}

// Sends the signed JWT in X-Admin-Token header.
// The raw admin password never travels after the initial login handshake.
function authHeaders() {
    return { 'X-Admin-Token': adminToken };
}

// ==================== PRODUCTS ====================
async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        allProducts = await res.json();
        renderProducts();
    } catch {
        allProducts = [];
        renderProducts();
    }
}

function renderProducts() {
    const query = $('#productSearch').value.trim().toLowerCase();
    let filtered = allProducts;
    if (query) {
        filtered = allProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.code.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    const tbody = $('#productsBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        $('#noProducts').classList.remove('hidden');
        return;
    }

    $('#noProducts').classList.add('hidden');
    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>
                ${getProductImages(p).length
                    ? `<img src="${getAdminImageSrc(getProductImages(p)[0])}" class="product-img" alt="${escapeHtml(p.name)}">`
                    : `<div class="no-img">No img</div>`
                }
            </td>
            <td><span class="product-code">${escapeHtml(p.code)}</span></td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td>₹${p.price}</td>
            <td><span class="status-badge ${p.status}">${p.status.replace('-', ' ')}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-small" data-action="edit" data-code="${escapeHtml(p.code)}" title="Edit product">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-danger btn-small" data-action="delete" data-code="${escapeHtml(p.code)}" title="Delete product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function handleProductsTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const code = btn.dataset.code;
    if (!code) return;

    if (btn.dataset.action === 'edit') {
        openEditProductModal(code);
    } else if (btn.dataset.action === 'delete') {
        deleteProduct(code);
    }
}

async function deleteProduct(code) {
    if (!confirm(`Delete product ${code}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE}/products/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Product deleted: ' + code, 'success');
            loadProducts();
        } else {
            showToast(data.message || 'Delete failed.', 'error');
        }
    } catch {
        showToast('Server error.', 'error');
    }
}

async function handleDeleteByCode() {
    const code = $('#deleteCode').value.trim();
    if (!code) {
        showToast('Please enter a product code.', 'error');
        return;
    }
    await deleteProduct(code);
    $('#deleteCode').value = '';
}

function openEditProductModal(code) {
    const product = allProducts.find(p => p.code === code);
    if (!product) {
        showToast('Product not found.', 'error');
        return;
    }

    editingProductCode = code;
    $('#editProductCode').textContent = `Code: ${code}`;
    $('#editProdName').value = product.name || '';
    $('#editProdPrice').value = Number(product.price || 0);
    $('#editProdStatus').value = product.status || 'in-stock';
    $('#editProdDescription').value = product.description || '';
    $('#editProductMsg').textContent = '';
    $('#editProductMsg').className = 'form-msg';
    $('#editProductModal').classList.remove('hidden');
}

function closeEditProductModal() {
    editingProductCode = '';
    $('#editProductModal').classList.add('hidden');
    $('#editProductForm').reset();
    clearEditImagePreview();
    $('#editProductMsg').textContent = '';
    $('#editProductMsg').className = 'form-msg';
}

async function handleEditProduct(e) {
    e.preventDefault();
    if (!editingProductCode) return;

    const msg = $('#editProductMsg');
    msg.textContent = '';
    msg.className = 'form-msg';

    const name = $('#editProdName').value.trim();
    const price = Number($('#editProdPrice').value);
    const status = $('#editProdStatus').value;
    const description = $('#editProdDescription').value.trim();

    if (!name) {
        msg.textContent = 'Product name is required.';
        msg.classList.add('error');
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        msg.textContent = 'Please enter a valid non-negative price.';
        msg.classList.add('error');
        return;
    }

    const editImages = getSelectedProductImages('#editCardImage', ['#editProductImageOne', '#editProductImageTwo']);
    if (editImages.error) {
        msg.textContent = editImages.error;
        msg.classList.add('error');
        return;
    }

    const saveBtn = $('#saveEditBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const body = new FormData();
    body.append('name', name);
    body.append('price', price);
    body.append('description', description);
    body.append('status', status);
    if (editImages.cardImage) body.append('cardImage', editImages.cardImage);
    editImages.productImages.forEach((file, index) => {
        body.append(index === 0 ? 'productImageOne' : 'productImageTwo', file);
    });

    try {
        const res = await fetch(`${API_BASE}/products/${encodeURIComponent(editingProductCode)}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Product updated: ${editingProductCode}`, 'success');
            closeEditProductModal();
            loadProducts();
        } else {
            msg.textContent = data.message || data.error || 'Failed to update product.';
            msg.classList.add('error');
        }
    } catch {
        msg.textContent = 'Server error.';
        msg.classList.add('error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

// ==================== ADD PRODUCT ====================
function handleImagePreview() {
    const selected = getSelectedProductImages('#prodCardImage', ['#prodProductImageOne', '#prodProductImageTwo']);
    const previewGrid = $('#previewImages');
    previewGrid.innerHTML = '';

    if (selected.error) {
        showToast(selected.error, 'error');
        clearImagePreview();
        return;
    }

    const files = getPreviewFiles(selected);
    if (files.length) {
        $('#imagePreview').classList.remove('hidden');
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'image-preview-item';
                item.innerHTML = `
                    <img src="${e.target.result}" alt="Product preview ${index + 1}">
                    ${index === 0 ? '<span>Cover image</span>' : ''}
                `;
                previewGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }
}

function clearImagePreview() {
    $('#prodCardImage').value = '';
    $('#prodProductImageOne').value = '';
    $('#prodProductImageTwo').value = '';
    $('#previewImages').innerHTML = '';
    $('#imagePreview').classList.add('hidden');
}

function handleEditImagePreview() {
    const selected = getSelectedProductImages('#editCardImage', ['#editProductImageOne', '#editProductImageTwo']);
    const previewGrid = $('#editPreviewImages');
    previewGrid.innerHTML = '';

    if (selected.error) {
        showToast(selected.error, 'error');
        clearEditImagePreview();
        return;
    }

    const files = getPreviewFiles(selected);
    if (files.length) {
        $('#editImagePreview').classList.remove('hidden');
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'image-preview-item';
                item.innerHTML = `
                    <img src="${e.target.result}" alt="Replacement preview ${index + 1}">
                    ${index === 0 ? '<span>Cover image</span>' : ''}
                `;
                previewGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }
}

function clearEditImagePreview() {
    $('#editCardImage').value = '';
    $('#editProductImageOne').value = '';
    $('#editProductImageTwo').value = '';
    $('#editPreviewImages').innerHTML = '';
    $('#editImagePreview').classList.add('hidden');
}

async function handleAddProduct(e) {
    e.preventDefault();
    const msg = $('#addProductMsg');
    msg.textContent = '';
    msg.className = 'form-msg';

    const form = new FormData();
    form.append('name', $('#prodName').value.trim());
    form.append('category', $('#prodCategory').value);
    form.append('classification', $('#prodClassification').value.trim());
    form.append('weight', $('#prodWeight').value.trim());
    form.append('price', $('#prodPrice').value);
    form.append('country', $('#prodCountry').value.trim());
    form.append('description', $('#prodDescription').value.trim());
    form.append('status', $('#prodStatus').value);

    const selected = getSelectedProductImages('#prodCardImage', ['#prodProductImageOne', '#prodProductImageTwo']);
    if (selected.error) {
        msg.textContent = selected.error;
        msg.classList.add('error');
        return;
    }
    if (selected.cardImage) form.append('cardImage', selected.cardImage);
    selected.productImages.forEach((file, index) => {
        form.append(index === 0 ? 'productImageOne' : 'productImageTwo', file);
    });

    try {
        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: authHeaders(),
            body: form
        });
        const data = await res.json();
        if (res.ok) {
            msg.textContent = `Product added! Code: ${data.product.code}`;
            msg.classList.add('success');
            showToast(`Product added: ${data.product.code}`, 'success');
            $('#addProductForm').reset();
            clearImagePreview();
            $('#prodCountry').value = 'India';
            loadProducts();
        } else {
            msg.textContent = data.message || data.error || 'Failed to add product.';
            msg.classList.add('error');
        }
    } catch {
        msg.textContent = 'Server error.';
        msg.classList.add('error');
    }
}

// ==================== ORDERS ====================
const ALL_STATUSES = ['pending','confirmed','preparing','out-for-delivery','shipped','delivered','cancelled','refunded'];
let inSearchMode = false;
let searchDebounce = null;

async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        allOrders = await res.json();
        renderOrders();
    } catch {
        allOrders = [];
        renderOrders();
    }
}

function renderOrderCard(order) {
    const date = new Date(order.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const userName  = order.user ? order.user.name  : 'Unknown';
    const userEmail = order.user ? order.user.email : '';
    const displayId = order.orderId || `#${order._id.slice(-8).toUpperCase()}`;

    return `
    <div class="order-card" data-order-id="${order._id}">
        <div class="order-top">
            <div>
                <div class="order-id">${escapeHtml(displayId)}</div>
                <div class="order-customer">${escapeHtml(userName)}${userEmail ? ` (${escapeHtml(userEmail)})` : ''}</div>
                <div class="order-date">${date}</div>
            </div>
            <span class="order-status ${order.status}">${order.status.replace(/-/g, ' ')}</span>
        </div>

        <div class="order-items">
            ${order.items.map(item => `
                <div class="order-item-row">
                    <span>${escapeHtml(item.name)}${item.weight ? ` (${escapeHtml(item.weight)})` : ''}</span>
                    <span><span class="qty">x${item.quantity}</span> &nbsp; ₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>

        <div class="order-delivery-info">
            <strong>Delivery:</strong> ${escapeHtml(order.deliveryInfo.fullName)},
            ${escapeHtml(order.deliveryInfo.address)},
            ${escapeHtml(order.deliveryInfo.city)} - ${escapeHtml(order.deliveryInfo.zip)} |
            Phone: ${escapeHtml(order.deliveryInfo.phone)}
        </div>

        <div class="order-bottom">
            <div class="order-total">
                Subtotal: ₹${order.subtotal.toFixed(2)} | Tax: ₹${order.tax.toFixed(2)} | Delivery: ₹${order.deliveryFee.toFixed(2)}
                <br><strong>Total: ₹${order.total.toFixed(2)}</strong>
            </div>
            <div>
                <select class="status-select">
                    ${ALL_STATUSES.map(s =>
                        `<option value="${s}"${order.status === s ? ' selected' : ''}>${s.replace(/-/g, ' ')}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
    </div>`;
}

function renderOrderList(orders) {
    const container = $('#ordersList');
    if (orders.length === 0) {
        container.innerHTML = '';
        $('#noOrders').classList.remove('hidden');
        return;
    }
    $('#noOrders').classList.add('hidden');
    container.innerHTML = orders.map(renderOrderCard).join('');
}

function renderOrders() {
    const statusFilter = $('#orderStatusFilter').value;
    const filtered = statusFilter
        ? allOrders.filter(o => o.status === statusFilter)
        : allOrders;
    renderOrderList(filtered);
}

async function updateOrderStatus(orderId, newStatus) {
    const order = allOrders.find(o => o._id === orderId);
    const previousStatus = order ? order.status : null;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();

        if (res.ok) {
            if (order) order.status = newStatus;
            showToast(`Status → "${newStatus.replace(/-/g, ' ')}"`, 'success');

            const card = document.querySelector(`[data-order-id="${orderId}"]`);
            if (card) {
                const badge = card.querySelector('.order-status');
                if (badge) {
                    badge.className = `order-status ${newStatus}`;
                    badge.textContent = newStatus.replace(/-/g, ' ');
                }

                // Fade card out only when a status filter is active and no longer matches.
                // In search mode, never auto-remove cards.
                const filterVal = inSearchMode ? '' : $('#orderStatusFilter').value;
                if (filterVal && filterVal !== newStatus) {
                    card.style.transition = 'opacity 0.35s';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        if (!$('#ordersList').querySelector('.order-card')) {
                            $('#noOrders').classList.remove('hidden');
                        }
                    }, 350);
                }
            }
        } else {
            const card = document.querySelector(`[data-order-id="${orderId}"]`);
            if (card && previousStatus) {
                const sel = card.querySelector('.status-select');
                if (sel) sel.value = previousStatus;
            }
            showToast(data.message || 'Update failed.', 'error');
        }
    } catch {
        const card = document.querySelector(`[data-order-id="${orderId}"]`);
        if (card && previousStatus) {
            const sel = card.querySelector('.status-select');
            if (sel) sel.value = previousStatus;
        }
        showToast('Server error.', 'error');
    }
}

// ==================== ORDER SEARCH ====================
function handleOrderSearchInput() {
    const q = $('#orderSearch').value.trim();
    $('#clearOrderSearch').classList.toggle('hidden', !q);
    clearTimeout(searchDebounce);
    if (!q) { exitSearchMode(); return; }
    searchDebounce = setTimeout(() => searchOrders(q), 400);
}

function clearOrderSearch() {
    $('#orderSearch').value = '';
    $('#clearOrderSearch').classList.add('hidden');
    exitSearchMode();
}

async function searchOrders(q) {
    inSearchMode = true;
    $('#orderFiltersWrap').classList.add('hidden');
    $('#searchResultsCount').classList.add('hidden');
    $('#noOrders').classList.add('hidden');
    $('#ordersList').innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching…</div>';

    try {
        const res = await fetch(
            `${API_BASE}/orders/search?q=${encodeURIComponent(q)}`,
            { headers: authHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Search failed.');

        const countEl = $('#searchResultsCount');
        countEl.textContent = data.length === 0
            ? `No orders match "${q}"`
            : `${data.length} result${data.length !== 1 ? 's' : ''} for "${q}"`;
        countEl.classList.remove('hidden');

        renderOrderList(data);
    } catch (err) {
        $('#ordersList').innerHTML = '';
        showToast(err.message || 'Search failed. Try again.', 'error');
    }
}

function exitSearchMode() {
    inSearchMode = false;
    $('#orderFiltersWrap').classList.remove('hidden');
    $('#searchResultsCount').classList.add('hidden');
    $('#noOrders').textContent = 'No orders found.';
    renderOrders();
}

// ==================== HELPERS ====================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getProductImages(product) {
    if (Array.isArray(product.images) && product.images.length) {
        return product.images.filter(Boolean);
    }
    return product.image ? [product.image] : [];
}

function getAdminImageSrc(imagePath) {
    return /^https?:\/\//i.test(imagePath) ? imagePath : `../${imagePath}`;
}

function getSelectedProductImages(cardSelector, productSelectors) {
    const cardImage = $(cardSelector).files[0] || null;
    const selectors = Array.isArray(productSelectors) ? productSelectors : [productSelectors];
    const productImages = selectors.flatMap(selector => Array.from($(selector).files || []));
    const allFiles = [...(cardImage ? [cardImage] : []), ...productImages];

    if (productImages.length > 2) {
        return { error: 'Upload a maximum of 2 product page photos besides the card image.' };
    }

    if (allFiles.length > 3) {
        return { error: 'Upload a maximum of 3 PNG images in total.' };
    }

    const hasInvalidFile = allFiles.some(file => file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png'));
    if (hasInvalidFile) {
        return { error: 'Only PNG images are allowed.' };
    }

    return { cardImage, productImages };
}

function getPreviewFiles(selected) {
    return [
        ...(selected.cardImage ? [selected.cardImage] : []),
        ...selected.productImages
    ];
}

function showToast(text, type) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
