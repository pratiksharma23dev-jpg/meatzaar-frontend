// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');

// ==================== SIDE MENU ====================
menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
});

closeMenu.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
});

overlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
});

// Close menu when a regular link is clicked
const sideLinks = document.querySelectorAll('.side-link');
sideLinks.forEach(link => {
    link.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    });
});

// ==================== PROFILE PAGE ====================
document.addEventListener('DOMContentLoaded', async () => {
    const notLoggedIn = document.getElementById('notLoggedIn');
    const profileHeader = document.getElementById('profileHeader');
    const profileGrid = document.getElementById('profileGrid');
    const sideMenuAuthBtn = document.getElementById('loginBtnMobile');
    const redirectHome = () => {
        window.location.href = '/index.html';
    };

    const isLoggedIn = typeof MeatzaarAuth !== 'undefined' && MeatzaarAuth.isLoggedIn();

    // Update side menu button based on auth state
    if (sideMenuAuthBtn) {
        if (isLoggedIn) {
            sideMenuAuthBtn.textContent = 'Logout';
            sideMenuAuthBtn.onclick = () => {
                MeatzaarAuth.logout();
                redirectHome();
            };
        } else {
            sideMenuAuthBtn.textContent = 'Login';
            sideMenuAuthBtn.onclick = () => {
                window.location.href = '/index.html?action=login';
            };
        }
    }

    if (!isLoggedIn) {
        notLoggedIn.style.display = 'block';
        return;
    }

    // Show profile sections
    profileHeader.style.display = '';
    profileGrid.style.display = '';

    // Load user info
    const localUser = MeatzaarAuth.getUser() || {};
    let user = localUser;
    try {
        const freshProfile = await MeatzaarAuth.getProfile();
        if (freshProfile) {
            user = { ...localUser, ...freshProfile };
            localStorage.setItem('meatzaar_user', JSON.stringify(user));
        }
    } catch {
        // Fallback to local cached profile.
    }

    document.getElementById('profileName').textContent = user.name || 'User';
    document.getElementById('profileEmail').textContent = user.email || '';
    document.getElementById('profilePhone').textContent = user.phone || 'Not set';
    document.getElementById('profileAddress').textContent = user.address || 'Not set';

    // Logout button
    document.getElementById('profileLogoutBtn').addEventListener('click', () => {
        MeatzaarAuth.logout();
        redirectHome();
    });

    // Load cart from localStorage
    const cartItemsEl = document.getElementById('profileCartItems');
    const cartTotalEl = document.getElementById('profileCartTotal');
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p style="color:#999;">Your cart is empty.</p>';
        cartTotalEl.textContent = '';
    } else {
        let total = 0;
        cartItemsEl.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `<div class="cart-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>₹${parseFloat(item.price).toFixed(2)} ${item.weight ? '/ ' + item.weight : ''}</p>
                </div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
            </div>`;
        }).join('');
        cartTotalEl.textContent = `Total: ₹${total.toFixed(2)}`;
    }

    // ---- Shared helpers ----
    let loadedOrders = [];

    const CANCELLABLE = new Set(['pending', 'confirmed', 'preparing']);

    function statusClass(status) {
        return {
            pending:            'status-pending',
            confirmed:          'status-processing',
            preparing:          'status-processing',
            'out-for-delivery': 'status-processing',
            shipped:            'status-processing',
            delivered:          'status-delivered',
            cancelled:          'status-cancelled',
            refunded:           'status-refunded'
        }[status] || 'status-pending';
    }

    function statusLabel(status) {
        return String(status || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // ---- Toast ----
    const toastEl = document.getElementById('toast');
    let toastTimer;
    function showToast(message, type = 'info') {
        toastEl.textContent = message;
        toastEl.className = `toast toast-${type} show`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    // ---- Order detail modal ----
    const modalOverlay = document.getElementById('orderModalOverlay');
    const modalContent = document.getElementById('orderModalContent');
    const modalClose   = document.getElementById('orderModalClose');

    function openOrderModal(order) {
        const date = new Date(order.createdAt).toLocaleString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const d = order.deliveryInfo || {};

        const itemRows = (order.items || []).map(item => `
            <tr>
                <td>${item.name}${item.weight ? `<br><span style="color:#777;font-size:0.82rem;">${item.weight}</span>` : ''}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`).join('');

        const cancelBtnHtml = CANCELLABLE.has(order.status)
            ? `<button class="btn-cancel-order" id="cancelOrderBtn">
                   <i class="fas fa-ban"></i> Cancel Order
               </button>`
            : '';

        const cancelInfoHtml = (order.status === 'cancelled' && (order.cancelledAt || order.cancelReason))
            ? `<p class="modal-section-title">Cancellation Info</p>
               <div class="cancel-info-block">
                   ${order.cancelledAt ? `<div><strong>Cancelled:</strong> ${new Date(order.cancelledAt).toLocaleString('en-IN')}</div>` : ''}
                   ${order.cancelReason ? `<div style="margin-top:4px;"><strong>Reason:</strong> ${order.cancelReason}</div>` : ''}
               </div>`
            : '';

        modalContent.innerHTML = `
            <p class="modal-order-id">${order.orderId || `Order #${order._id.slice(-6).toUpperCase()}`}</p>
            <p class="modal-order-meta">${date}</p>
            <span class="order-status ${statusClass(order.status)}">${statusLabel(order.status)}</span>

            <p class="modal-section-title">Delivery Address</p>
            <div class="modal-delivery-block">
                <strong>${d.fullName || '—'}</strong><br>
                ${d.address || ''}${d.city ? ', ' + d.city : ''}${d.zip ? ' – ' + d.zip : ''}<br>
                <i class="fas fa-phone" style="font-size:0.8rem;margin-right:4px;"></i>${d.phone || '—'}
            </div>

            <p class="modal-section-title">Items</p>
            <table class="modal-items-table">
                <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th>Price</th></tr></thead>
                <tbody>${itemRows}</tbody>
            </table>

            <p class="modal-section-title">Price Breakdown</p>
            <div class="modal-price-row"><span>Subtotal</span><span>₹${(order.subtotal || 0).toFixed(2)}</span></div>
            <div class="modal-price-row"><span>Tax (10%)</span><span>₹${(order.tax || 0).toFixed(2)}</span></div>
            <div class="modal-price-row"><span>Delivery</span><span>₹${(order.deliveryFee || 0).toFixed(2)}</span></div>
            <div class="modal-price-row total"><span>Total</span><span>₹${(order.total || 0).toFixed(2)}</span></div>

            ${order.razorpay_payment_id ? `<p class="modal-payment-ref">Payment ref: ${order.razorpay_payment_id}</p>` : ''}
            ${cancelInfoHtml}
            ${cancelBtnHtml}
        `;

        const cancelOrderBtn = document.getElementById('cancelOrderBtn');
        if (cancelOrderBtn) {
            cancelOrderBtn.addEventListener('click', () => openCancelModal(order._id));
        }

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeOrderModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeOrderModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeOrderModal(); });

    // ---- Cancellation confirmation modal ----
    const cancelOverlay       = document.getElementById('cancelModalOverlay');
    const cancelConfirmBtn    = document.getElementById('cancelConfirmBtn');
    const cancelDismissBtn    = document.getElementById('cancelDismissBtn');
    const cancelModalCloseBtn = document.getElementById('cancelModalClose');
    const cancelReasonInput   = document.getElementById('cancelReasonInput');
    let pendingCancelId = null;

    function openCancelModal(orderId) {
        pendingCancelId = orderId;
        cancelReasonInput.value = '';
        cancelOverlay.classList.add('active');
    }

    function closeCancelModal() {
        cancelOverlay.classList.remove('active');
        pendingCancelId = null;
    }

    cancelDismissBtn.addEventListener('click', closeCancelModal);
    cancelModalCloseBtn.addEventListener('click', closeCancelModal);
    cancelOverlay.addEventListener('click', e => { if (e.target === cancelOverlay) closeCancelModal(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeOrderModal(); closeCancelModal(); }
    });

    cancelConfirmBtn.addEventListener('click', async () => {
        if (!pendingCancelId) return;
        await performCancelOrder(pendingCancelId, cancelReasonInput.value);
    });

    async function performCancelOrder(orderId, reason) {
        cancelConfirmBtn.disabled = true;
        cancelConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling…';

        try {
            const res = await fetch(`${window.API_BASE || '/api'}/orders/cancel/${orderId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: String(reason || '').trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to cancel order.');

            // Update in-memory state
            const idx = loadedOrders.findIndex(o => o._id === orderId);
            if (idx !== -1) {
                loadedOrders[idx] = {
                    ...loadedOrders[idx],
                    status: 'cancelled',
                    cancelledAt: data.order?.cancelledAt,
                    cancelReason: data.order?.cancelReason || ''
                };
            }

            closeCancelModal();
            closeOrderModal();

            // Re-render the order card in the list
            const ordersListEl = document.getElementById('profileOrdersList');
            const cardEl = ordersListEl.querySelector(`[data-order-id="${orderId}"]`);
            if (cardEl && idx !== -1) {
                const updated = loadedOrders[idx];
                const temp = document.createElement('div');
                temp.innerHTML = renderOrderCard(updated);
                const newCard = temp.firstElementChild;
                cardEl.replaceWith(newCard);
                attachCardHandlers(newCard, updated);
            }

            showToast('Order cancelled. Refund will be processed by the admin.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to cancel order. Please try again.', 'error');
        } finally {
            cancelConfirmBtn.disabled = false;
            cancelConfirmBtn.innerHTML = '<i class="fas fa-ban"></i> Yes, Cancel Order';
        }
    }

    // ---- Order card rendering ----
    function renderOrderCard(order) {
        const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const itemSummary = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
        return `<div class="order-item" data-order-id="${order._id}" role="button" tabindex="0" aria-label="View order details">
            <div class="order-header">
                <h4>${order.orderId || `Order #${order._id.slice(-6).toUpperCase()}`}</h4>
                <span class="order-status ${statusClass(order.status)}">${statusLabel(order.status)}</span>
            </div>
            <p class="order-date">${date}</p>
            <p class="order-details">${itemSummary}</p>
            <p style="color:var(--primary-color);font-weight:bold;margin-top:0.5rem;">₹${(order.total || 0).toFixed(2)}</p>
            <p style="color:#777;font-size:0.78rem;margin-top:0.4rem;">Tap to view details →</p>
        </div>`;
    }

    function attachCardHandlers(el, order) {
        el.addEventListener('click', () => openOrderModal(order));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openOrderModal(order); });
    }

    // ---- Load orders from backend ----
    const ordersListEl = document.getElementById('profileOrdersList');
    try {
        const orders = await MeatzaarAuth.getOrders();
        loadedOrders = orders;

        if (orders.length === 0) {
            ordersListEl.innerHTML = '<p style="color:#999;">No orders yet. Start shopping!</p>';
        } else {
            ordersListEl.innerHTML = orders.map(renderOrderCard).join('');
            ordersListEl.querySelectorAll('.order-item').forEach(el => {
                const order = loadedOrders.find(o => o._id === el.dataset.orderId);
                if (order) attachCardHandlers(el, order);
            });
        }
    } catch {
        ordersListEl.innerHTML = '<p style="color:#e74c3c;">Failed to load orders. Please try again.</p>';
    }
});
