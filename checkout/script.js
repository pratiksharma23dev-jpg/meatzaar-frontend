// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');
const orderItemsContainer = document.getElementById('orderItems');
const emptyCheckout = document.getElementById('emptyCheckout');
const paymentPanel = document.getElementById('paymentPanel');
const payNowBtn = document.getElementById('payNowBtn');
const phoneInput = document.getElementById('phone');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const phoneOtpInput = document.getElementById('phoneOtp');
const phoneStatus = document.getElementById('phoneStatus');
let phoneVerified = false;
let verifiedPhone = '';

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

const sideLinks = document.querySelectorAll('.side-link');
sideLinks.forEach(link => {
    link.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    });
});

// ==================== PINCODE VALIDATION ====================
const zipInput = document.getElementById('zip');
const pincodeStatus = document.getElementById('pincodeStatus');
let pincodeValid = false;
let pincodeTimeout = null;

zipInput.addEventListener('input', () => {
    const pin = zipInput.value.replace(/\D/g, '');
    zipInput.value = pin;
    pincodeValid = false;
    pincodeStatus.textContent = '';
    pincodeStatus.className = 'pincode-status';

    if (pin.length < 6) return;

    clearTimeout(pincodeTimeout);
    pincodeTimeout = setTimeout(() => validatePincode(pin), 300);
});

async function validatePincode(pin) {
    pincodeStatus.textContent = 'Checking...';
    pincodeStatus.className = 'pincode-status checking';

    try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
        const data = await res.json();

        if (data[0] && data[0].Status === 'Success') {
            const place = data[0].PostOffice[0];
            pincodeStatus.textContent = `✓ ${place.Name}, ${place.District}, ${place.State}`;
            pincodeStatus.className = 'pincode-status valid';
            pincodeValid = true;

            // Auto-fill city if empty
            const cityInput = document.getElementById('city');
            if (!cityInput.value.trim()) {
                cityInput.value = place.District;
            }
        } else {
            pincodeStatus.textContent = '✗ Invalid PIN code';
            pincodeStatus.className = 'pincode-status invalid';
            pincodeValid = false;
        }
    } catch {
        pincodeStatus.textContent = '⚠ Could not verify';
        pincodeStatus.className = 'pincode-status checking';
        pincodeValid = true; // Allow submission if API is unreachable
    }
}

// ==================== CHECKOUT ====================

function isBuyNowMode() {
    return new URLSearchParams(window.location.search).get('mode') === 'buynow';
}

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function isValidIndianMobile(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

function setPhoneStatus(message, type) {
    phoneStatus.textContent = message;
    phoneStatus.className = `phone-status ${type || ''}`.trim();
}

function getCheckoutItems() {
    if (isBuyNowMode()) {
        const buyNowItem = localStorage.getItem('buyNow_item');
        if (buyNowItem) {
            return [JSON.parse(buyNowItem)];
        }
    }
    // Clear stale buyNow_item when checking out from cart
    localStorage.removeItem('buyNow_item');
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

async function prefillSavedDeliveryInfo() {
    if (typeof MeatzaarAuth === 'undefined' || !MeatzaarAuth.isLoggedIn()) return;

    const fullNameInput = document.getElementById('fullName');
    const addressInput = document.getElementById('address');

    try {
        const profile = await MeatzaarAuth.getProfile();
        const savedPhone = normalizePhone(profile?.phone).slice(0, 10);

        if (!fullNameInput.value.trim() && profile?.name) {
            fullNameInput.value = profile.name;
        }
        if (!addressInput.value.trim() && profile?.address) {
            addressInput.value = profile.address;
        }
        if (!phoneInput.value.trim() && savedPhone) {
            phoneInput.value = savedPhone;
            setPhoneStatus('Saved phone loaded. Please verify with OTP to place this order.', 'info');
        }
    } catch {
        // Ignore prefill failures and let checkout continue normally.
    }
}

function renderCheckout() {
    const cart = getCheckoutItems();
    orderItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCheckout.style.display = 'block';
        paymentPanel.style.display = 'none';
        return;
    }

    emptyCheckout.style.display = 'none';
    paymentPanel.style.display = 'block';

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'order-item';
        itemEl.innerHTML = `
            <div class="order-item-icon">
                <i class="fas fa-drumstick-bite"></i>
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-meta">Qty: ${item.quantity} &times; ₹${parseFloat(item.price).toFixed(2)}</div>
            </div>
            <div class="order-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(itemEl);
    });

    updateTotals(cart);
}

function updateTotals(cart) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const delivery = 5.00;
    const total = subtotal + tax + delivery;

    document.getElementById('itemCount').textContent = totalItems;
    document.getElementById('checkoutSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('checkoutTax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('checkoutDelivery').textContent = `₹${delivery.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `₹${total.toFixed(2)}`;
}

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        const normalized = normalizePhone(phoneInput.value).slice(0, 10);
        phoneInput.value = normalized;

        if (verifiedPhone && verifiedPhone !== normalized) {
            phoneVerified = false;
            verifiedPhone = '';
            setPhoneStatus('Phone changed. Please verify this number with OTP.', 'info');
        }
    });
}

if (phoneOtpInput) {
    phoneOtpInput.addEventListener('input', () => {
        phoneOtpInput.value = phoneOtpInput.value.replace(/\D/g, '').slice(0, 6);
    });
}

if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
        const phone = normalizePhone(phoneInput.value);

        if (!isValidIndianMobile(phone)) {
            setPhoneStatus('Enter a valid 10-digit Indian mobile number first.', 'error');
            return;
        }

        if (typeof MeatzaarAuth === 'undefined' || !MeatzaarAuth.isLoggedIn()) {
            setPhoneStatus('Please log in to verify your phone number.', 'error');
            return;
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';
        setPhoneStatus('Sending OTP...', 'info');

        try {
            await MeatzaarAuth.sendPhoneOtp(phone);
            phoneVerified = false;
            verifiedPhone = '';
            setPhoneStatus('OTP sent to your phone. Enter it below to verify.', 'success');
            phoneOtpInput.focus();
        } catch (err) {
            setPhoneStatus(err.message, 'error');
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
    });
}

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', async () => {
        const phone = normalizePhone(phoneInput.value);
        const otp = phoneOtpInput.value.trim();

        if (!isValidIndianMobile(phone)) {
            setPhoneStatus('Enter a valid 10-digit Indian mobile number first.', 'error');
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setPhoneStatus('Enter a valid 6-digit OTP.', 'error');
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';
        setPhoneStatus('Verifying OTP...', 'info');

        try {
            await MeatzaarAuth.verifyPhoneOtp(phone, otp);
            phoneVerified = true;
            verifiedPhone = phone;
            setPhoneStatus('Phone number verified successfully.', 'success');
        } catch (err) {
            phoneVerified = false;
            verifiedPhone = '';
            setPhoneStatus(err.message, 'error');
        } finally {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'Verify OTP';
        }
    });
}

// Pay Now
payNowBtn.addEventListener('click', async () => {
    const cart = getCheckoutItems();
    if (cart.length === 0) return;

    const name = document.getElementById('fullName').value.trim();
    const address = document.getElementById('address').value.trim();
    const address2 = document.getElementById('address2').value.trim();
    const landmark = document.getElementById('landmark').value.trim();
    const city = document.getElementById('city').value.trim();
    const zip = document.getElementById('zip').value.trim();
    const phone = normalizePhone(document.getElementById('phone').value.trim());

    if (!name || !address || !landmark || !city || !zip || !phone) {
        alert('Please fill in all required delivery details.');
        return;
    }

    if (zip.length !== 6 || !/^\d{6}$/.test(zip)) {
        alert('Please enter a valid 6-digit PIN code.');
        return;
    }

    if (!isValidIndianMobile(phone)) {
        alert('Please enter a valid 10-digit Indian mobile number.');
        return;
    }

    if (!pincodeValid) {
        alert('Please enter a valid PIN code. The entered PIN code could not be verified.');
        return;
    }

    if (!phoneVerified || verifiedPhone !== phone) {
        alert('Please verify your phone number with OTP before placing the order.');
        return;
    }

    // Check if user is logged in
    if (typeof MeatzaarAuth !== 'undefined' && !MeatzaarAuth.isLoggedIn()) {
        alert('Please log in to place an order.');
        window.location.href = '../landing page/index.html';
        return;
    }

    payNowBtn.disabled = true;
    payNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

    try {
        const items = cart.map(item => ({
            productId: item.id || item.productId || '',
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            weight: item.weight || '',
            category: item.category || ''
        }));

        const deliveryInfo = { fullName: name, address, address2, landmark, city, zip, phone };

        const result = await MeatzaarAuth.placeOrder(items, deliveryInfo);

        if (isBuyNowMode()) {
            localStorage.removeItem('buyNow_item');
        } else {
            localStorage.removeItem('cart');
        }

        alert(`Order placed successfully!\n\nOrder ID: ${result.order.id}\nTotal: ₹${result.order.total.toFixed(2)}\n\nA confirmation email has been sent to your registered email.\n\nThank you for shopping at Meatzaar!`);
        window.location.href = '../landing page/index.html';
    } catch (err) {
        alert('Failed to place order: ' + err.message);
    } finally {
        payNowBtn.disabled = false;
        payNowBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now';
    }
});

// Initial render
renderCheckout();
prefillSavedDeliveryInfo();
