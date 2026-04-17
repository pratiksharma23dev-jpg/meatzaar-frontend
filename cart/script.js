// ==================== AUTH GUARD ====================
if (!MeatzaarAuth.isLoggedIn()) {
    window.location.href = '../profile/profile.html';
}

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');
const cartItemsContainer = document.getElementById('cartItems');
const emptyCartMessage = document.getElementById('emptyCart');
const cartSummary = document.getElementById('cartSummary');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const checkoutBtn = document.getElementById('checkoutBtn');

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

// ==================== CART MANAGEMENT ====================

// Initialize cart from localStorage
function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof updateNavCartBadge === 'function') updateNavCartBadge();
}

// Render cart items
function renderCart() {
    const cart = getCart();
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }

    emptyCartMessage.style.display = 'none';
    cartSummary.style.display = 'block';

    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="item-image">
                <i class="fas fa-drumstick-bite"></i>
            </div>
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">₹${parseFloat(item.price).toFixed(2)} per unit</div>
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="decreaseQuantity(${index})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${index})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="item-total">
                ₹${(item.price * item.quantity).toFixed(2)}
            </div>
            <button class="delete-btn" onclick="removeItem(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    updateSummary();
}

// Increase quantity
function increaseQuantity(index) {
    const cart = getCart();
    cart[index].quantity += 1;
    saveCart(cart);
    renderCart();
}

// Decrease quantity
function decreaseQuantity(index) {
    const cart = getCart();
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
        saveCart(cart);
        renderCart();
    }
}

// Remove item from cart
function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
}

// Delete all items — confirmation modal
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmCancel = document.getElementById('confirmCancel');
const confirmDelete = document.getElementById('confirmDelete');

deleteAllBtn.addEventListener('click', () => {
    confirmOverlay.classList.add('active');
});

confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('active');
});

confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
        confirmOverlay.classList.remove('active');
    }
});

confirmDelete.addEventListener('click', () => {
    localStorage.removeItem('cart');
    confirmOverlay.classList.remove('active');
    renderCart();
    if (typeof updateNavCartBadge === 'function') updateNavCartBadge();
});

// Update cart summary
function updateSummary() {
    const cart = getCart();
    
    const subtotal = cart.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
}

async function getOutOfStockCartItems(cart) {
    if (!Array.isArray(cart) || cart.length === 0) return [];

    try {
        const apiBase = window.BASE_URL || '';
        const productsRes = await fetch(`${apiBase}/api/products`);
        if (!productsRes.ok) return [];
        const products = await productsRes.json();
        const stockByCode = new Map(
            products.map(p => [String(p.code || '').toLowerCase(), p.status || 'in-stock'])
        );

        return cart.filter(item => {
            const code = String(item.id || '').toLowerCase();
            const status = stockByCode.get(code);
            return !status || status === 'out-of-stock';
        });
    } catch {
        return [];
    }
}

// Checkout button
checkoutBtn.addEventListener('click', async () => {
    const cart = getCart();
    if (cart.length === 0) return;

    const outOfStockItems = await getOutOfStockCartItems(cart);
    if (outOfStockItems.length > 0) {
        const names = outOfStockItems.slice(0, 3).map(i => i.name).join(', ');
        alert(`These items are out of stock and cannot be checked out: ${names}${outOfStockItems.length > 3 ? '...' : ''}`);
        return;
    }

    window.location.href = '../checkout/checkout.html';
});

// Render cart
renderCart();
