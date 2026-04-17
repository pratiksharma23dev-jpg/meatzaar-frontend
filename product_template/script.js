const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');
const addToCartBtn = document.getElementById('addToCartBtn');
const buyNowBtn = document.getElementById('buyNowBtn');
const quantityInput = document.getElementById('quantity');
const feedbackMessage = document.getElementById('feedbackMessage');
const productBadge = document.getElementById('productBadge');
const productImage = document.getElementById('productImage');
const productEyebrow = document.getElementById('productEyebrow');
const productName = document.getElementById('productName');
const productPrice = document.getElementById('productPrice');
const productPack = document.getElementById('productPack');
const productStockStatus = document.getElementById('productStockStatus');
const productSummary = document.getElementById('productSummary');
const productCategory = document.getElementById('productCategory');
const productWeight = document.getElementById('productWeight');
const productOrigin = document.getElementById('productOrigin');
const productFreshness = document.getElementById('productFreshness');
const productDelivery = document.getElementById('productDelivery');
const productOverview = document.getElementById('productOverview');

// productCatalog and categoryLabels come from ../shared/products-data.js

function openMenu() {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
}

function closeSideMenu() {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
}

function getQuantity() {
    const quantity = Number.parseInt(quantityInput.value, 10);

    if (!quantity || quantity < 1) {
        quantityInput.value = 1;
        return 1;
    }

    return quantity;
}

function updateFeedback(message) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.add('success');
}

function showError(message) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.remove('success');
}

function isProductOutOfStock(product) {
    return !product || product.status === 'out-of-stock';
}

function updatePurchaseAvailability(product) {
    if (!addToCartBtn || !buyNowBtn) return;

    const unavailable = isProductOutOfStock(product);
    addToCartBtn.disabled = unavailable;
    buyNowBtn.disabled = unavailable;

    if (unavailable) {
        addToCartBtn.style.opacity = '0.5';
        buyNowBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
        buyNowBtn.style.cursor = 'not-allowed';
        feedbackMessage.textContent = 'This product is currently out of stock.';
        feedbackMessage.classList.remove('success');
    } else {
        addToCartBtn.style.opacity = '';
        buyNowBtn.style.opacity = '';
        addToCartBtn.style.cursor = '';
        buyNowBtn.style.cursor = '';
    }
}

function setStockBadge(status) {
    if (!productStockStatus) return;

    const isInStock = status === 'in-stock';
    productStockStatus.textContent = isInStock ? 'In Stock' : 'Out of Stock';
    productStockStatus.classList.toggle('in-stock', isInStock);
    productStockStatus.classList.toggle('out-of-stock', !isInStock);
}

function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const product = productCatalog.find(p => p.id === productId);

    if (!product) {
        productName.textContent = 'Product Not Found';
        productSummary.textContent = 'Sorry, the product you are looking for does not exist.';
        return;
    }

    const catLabel = categoryLabels[product.category] || product.category;

    document.title = `Meatzaar - ${product.name}`;
    productBadge.textContent = product.classification;
    productImage.src = product.image;
    productImage.alt = product.name;
    productEyebrow.textContent = catLabel;
    productName.textContent = product.name;
    productPrice.textContent = `\u20B9${product.price.toLocaleString()}`;
    productPack.textContent = `/ ${product.weight} pack`;
    setStockBadge(product.status);
    productSummary.textContent = `Premium ${product.classification.toLowerCase()} from ${product.country}. Part of our ${catLabel} selection.`;
    productCategory.textContent = catLabel;
    productWeight.textContent = product.weight;
    productOrigin.textContent = product.country;
    productFreshness.textContent = product.status === 'in-stock' ? 'Fresh and available' : product.status === 'on-sale' ? 'On sale now' : 'Currently out of stock';

    // Calculate estimated delivery date (tomorrow)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    productDelivery.textContent = `${deliveryDate.toLocaleDateString('en-IN', options)}, by 9 PM`;

    productOverview.textContent = `${product.name} — ${product.weight}. Origin: ${product.country}. Classified under ${product.classification} in our ${catLabel} range. Carefully selected and packed for quality.`;
    updatePurchaseAvailability(product);
}

menuToggle.addEventListener('click', openMenu);
closeMenu.addEventListener('click', closeSideMenu);
overlay.addEventListener('click', closeSideMenu);

document.querySelectorAll('.side-link').forEach((link) => {
    link.addEventListener('click', closeSideMenu);
});

addToCartBtn.addEventListener('click', () => {
    if (typeof MeatzaarAuth === 'undefined' || !MeatzaarAuth.isLoggedIn()) {
        document.getElementById('authRequiredModal').classList.add('active');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const product = productCatalog.find(p => p.id === productId);
    if (!product) return;
    if (isProductOutOfStock(product)) {
        showError('This product is out of stock and cannot be added to cart.');
        return;
    }

    const quantity = getQuantity();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, quantity });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateFeedback(`${quantity} pack${quantity > 1 ? 's' : ''} added to your cart.`);
    if (typeof updateNavCartBadge === 'function') updateNavCartBadge();
});

buyNowBtn.addEventListener('click', () => {
    if (typeof MeatzaarAuth === 'undefined' || !MeatzaarAuth.isLoggedIn()) {
        document.getElementById('authRequiredModal').classList.add('active');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const product = productCatalog.find(p => p.id === productId);
    if (!product) return;
    if (isProductOutOfStock(product)) {
        showError('This product is out of stock and cannot be purchased right now.');
        return;
    }

    const quantity = getQuantity();

    // Store only this product for direct checkout (not the whole cart)
    localStorage.setItem('buyNow_item', JSON.stringify({
        id: product.id, name: product.name, price: product.price, quantity
    }));

    window.location.href = '../checkout/checkout.html?mode=buynow';
});

// Close auth modal
document.getElementById('closeAuthModal').addEventListener('click', () => {
    document.getElementById('authRequiredModal').classList.remove('active');
});

// Load after products are available from API
if (typeof productsReady !== 'undefined') {
    productsReady.then(() => loadProductDetails());
} else {
    loadProductDetails();
}
