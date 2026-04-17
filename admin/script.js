const API_BASE = window.ADMIN_API_BASE || '/api/admin';

// ==================== STATE ====================
let adminPassword = '';
let allProducts = [];
let allOrders = [];
let editingProductCode = '';

// ==================== DOM REFS ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('adminPassword');
    if (saved) {
        adminPassword = saved;
        verifyLogin(saved);
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
        sessionStorage.removeItem('adminPassword');
        adminPassword = '';
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
    $('#prodImage').addEventListener('change', handleImagePreview);
    $('#removeImg').addEventListener('click', () => {
        $('#prodImage').value = '';
        $('#imagePreview').classList.add('hidden');
    });

    // Edit product modal
    $('#editProductForm').addEventListener('submit', handleEditProduct);
    $('#closeEditModal').addEventListener('click', closeEditProductModal);
    $('#cancelEditBtn').addEventListener('click', closeEditProductModal);
    $('#editProductModal').addEventListener('click', (e) => {
        if (e.target.id === 'editProductModal') closeEditProductModal();
    });

    // Order filter
    $('#orderStatusFilter').addEventListener('change', renderOrders);
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
        if (res.ok && data.success) {
            adminPassword = pw;
            sessionStorage.setItem('adminPassword', pw);
            $('#loginScreen').classList.add('hidden');
            $('#dashboard').classList.remove('hidden');
            $('#loginError').textContent = '';
            loadProducts();
            loadOrders();
        } else {
            $('#loginError').textContent = data.message || 'Invalid password.';
            sessionStorage.removeItem('adminPassword');
        }
    } catch {
        $('#loginError').textContent = 'Server unreachable. Is the backend running?';
    }
}

function authHeaders() {
    return { 'X-Admin-Password': adminPassword };
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
                ${p.image
                    ? `<img src="../${p.image}" class="product-img" alt="${escapeHtml(p.name)}">`
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

    const saveBtn = $('#saveEditBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await fetch(`${API_BASE}/products/${encodeURIComponent(editingProductCode)}`, {
            method: 'PATCH',
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price, description, status })
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Product updated: ${editingProductCode}`, 'success');
            closeEditProductModal();
            loadProducts();
        } else {
            msg.textContent = data.message || 'Failed to update product.';
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
    const file = $('#prodImage').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            $('#previewImg').src = e.target.result;
            $('#imagePreview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
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

    const file = $('#prodImage').files[0];
    if (file) form.append('image', file);

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
            $('#imagePreview').classList.add('hidden');
            $('#prodCountry').value = 'India';
            loadProducts();
        } else {
            msg.textContent = data.message || 'Failed to add product.';
            msg.classList.add('error');
        }
    } catch {
        msg.textContent = 'Server error.';
        msg.classList.add('error');
    }
}

// ==================== ORDERS ====================
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

function renderOrders() {
    const statusFilter = $('#orderStatusFilter').value;
    let filtered = allOrders;
    if (statusFilter) {
        filtered = allOrders.filter(o => o.status === statusFilter);
    }

    const container = $('#ordersList');
    if (filtered.length === 0) {
        container.innerHTML = '';
        $('#noOrders').classList.remove('hidden');
        return;
    }

    $('#noOrders').classList.add('hidden');
    container.innerHTML = filtered.map(order => {
        const date = new Date(order.createdAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const userName = order.user ? order.user.name : 'Unknown';
        const userEmail = order.user ? order.user.email : '';

        return `
        <div class="order-card">
            <div class="order-top">
                <div>
                    <div class="order-id">#${order._id.slice(-8).toUpperCase()}</div>
                    <div class="order-customer">${escapeHtml(userName)} ${userEmail ? `(${escapeHtml(userEmail)})` : ''}</div>
                    <div class="order-date">${date}</div>
                </div>
                <span class="order-status ${order.status}">${order.status.replace(/-/g, ' ')}</span>
            </div>

            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item-row">
                        <span>${escapeHtml(item.name)} ${item.weight ? `(${escapeHtml(item.weight)})` : ''}</span>
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
                    <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                        ${['pending','confirmed','preparing','out-for-delivery','delivered','cancelled'].map(s =>
                            `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s.replace(/-/g, ' ')}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Order status updated to "${newStatus.replace(/-/g, ' ')}"`, 'success');
            // Update local state
            const order = allOrders.find(o => o._id === orderId);
            if (order) order.status = newStatus;
            renderOrders();
        } else {
            showToast(data.message || 'Update failed.', 'error');
            loadOrders();
        }
    } catch {
        showToast('Server error.', 'error');
    }
}

// ==================== HELPERS ====================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(text, type) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
