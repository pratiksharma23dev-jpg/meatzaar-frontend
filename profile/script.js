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

    const isLoggedIn = typeof MeatzaarAuth !== 'undefined' && MeatzaarAuth.isLoggedIn();

    // Update side menu button based on auth state
    if (sideMenuAuthBtn) {
        if (isLoggedIn) {
            sideMenuAuthBtn.textContent = 'Logout';
            sideMenuAuthBtn.onclick = () => {
                MeatzaarAuth.logout();
                window.location.href = '../landing page/index.html';
            };
        } else {
            sideMenuAuthBtn.textContent = 'Login';
            sideMenuAuthBtn.onclick = () => {
                window.location.href = '../landing page/index.html';
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
    const user = MeatzaarAuth.getUser();
    document.getElementById('profileName').textContent = user.name || 'User';
    document.getElementById('profileEmail').textContent = user.email || '';
    document.getElementById('profilePhone').textContent = user.phone || 'Not set';
    document.getElementById('profileAddress').textContent = user.address || 'Not set';

    // Logout button
    document.getElementById('profileLogoutBtn').addEventListener('click', () => {
        MeatzaarAuth.logout();
        window.location.href = '../landing page/index.html';
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

    // Load orders from backend
    const ordersListEl = document.getElementById('profileOrdersList');
    try {
        const orders = await MeatzaarAuth.getOrders();
        if (orders.length === 0) {
            ordersListEl.innerHTML = '<p style="color:#999;">No orders yet. Start shopping!</p>';
        } else {
            ordersListEl.innerHTML = orders.map(order => {
                const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
                const itemSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
                const statusClass = {
                    'confirmed': 'status-processing',
                    'pending': 'status-pending',
                    'preparing': 'status-processing',
                    'out-for-delivery': 'status-processing',
                    'delivered': 'status-delivered',
                    'cancelled': 'status-pending'
                }[order.status] || 'status-pending';

                return `<div class="order-item">
                    <div class="order-header">
                        <h4>Order #${order._id.slice(-6).toUpperCase()}</h4>
                        <span class="order-status ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                    <p class="order-date">${date}</p>
                    <p class="order-details">${itemSummary}</p>
                    <p style="color: var(--primary-color, #c0392b); font-weight: bold; margin-top: 0.5rem;">₹${order.total.toFixed(2)}</p>
                </div>`;
            }).join('');
        }
    } catch (err) {
        ordersListEl.innerHTML = '<p style="color:#e74c3c;">Failed to load orders. Please try again.</p>';
    }
});