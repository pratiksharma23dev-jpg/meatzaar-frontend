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
const savedAddressRow = document.getElementById('savedAddressRow');
const useSavedAddressBtn = document.getElementById('useSavedAddressBtn');
const savedAddressNote = document.getElementById('savedAddressNote');
let phoneVerified = false;
let verifiedPhone = '';
let savedCheckoutProfile = null;

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

// ==================== CITY DROPDOWN ====================
const citySelect = document.getElementById('city');
const cityError = document.getElementById('cityError');

citySelect.addEventListener('change', () => {
    // Clear error when user makes a selection
    if (citySelect.value) {
        cityError.classList.remove('visible');
    }
    // Re-run serviceability check if a full pincode is already entered
    const pin = zipInput.value.replace(/\D/g, '');
    if (pin.length === 6) {
        clearTimeout(pincodeTimeout);
        pincodeTimeout = setTimeout(() => checkServiceability(pin), 100);
    }
});

// ==================== PINCODE + SERVICEABILITY VALIDATION ====================
const zipInput = document.getElementById('zip');
const pincodeStatus = document.getElementById('pincodeStatus');
const serviceabilityStatus = document.getElementById('serviceabilityStatus');
let pincodeValid = false;
let pincodeTimeout = null;

zipInput.addEventListener('input', () => {
    const pin = zipInput.value.replace(/\D/g, '');
    zipInput.value = pin;
    pincodeValid = false;

    // Reset both status lines
    pincodeStatus.textContent = '';
    pincodeStatus.className = 'pincode-status';
    serviceabilityStatus.textContent = '';
    serviceabilityStatus.className = 'pincode-status';

    if (pin.length < 6) return;

    clearTimeout(pincodeTimeout);
    // Debounce: wait 400ms after last keystroke before hitting API
    pincodeTimeout = setTimeout(() => checkServiceability(pin), 400);
});

async function checkServiceability(pin) {
    const city = citySelect.value;

    // Step 1: basic format check (client-side, instant)
    if (!/^\d{6}$/.test(pin)) {
        pincodeStatus.textContent = '✗ PIN code must be exactly 6 digits.';
        pincodeStatus.className = 'pincode-status invalid';
        pincodeValid = false;
        return;
    }

    // Step 2: city must be selected first
    if (!city) {
        pincodeStatus.textContent = '';
        serviceabilityStatus.textContent = '⚠ Please select a city first.';
        serviceabilityStatus.className = 'pincode-status invalid';
        pincodeValid = false;
        return;
    }

    // Step 3: quick client-side pre-check (avoids round-trip for obviously wrong pincodes)
    if (window.SERVICEABLE_AREAS) {
        const clientResult = window.SERVICEABLE_AREAS.isServiceable(city, pin);
        if (!clientResult) {
            serviceabilityStatus.textContent = '✗ Area not serviceable';
            serviceabilityStatus.className = 'pincode-status invalid';
            pincodeValid = false;
            return;
        }
    }

    // Step 4: server-side confirmation (authoritative check)
    serviceabilityStatus.textContent = 'Checking availability...';
    serviceabilityStatus.className = 'pincode-status checking';
    pincodeValid = false;

    try {
        const res = await fetch(`${window.API_BASE}/serviceability/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, pincode: pin })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            serviceabilityStatus.textContent = `⚠ ${err.message || 'Could not verify area. Please try again.'}`;
            serviceabilityStatus.className = 'pincode-status invalid';
            pincodeValid = false;
            return;
        }

        const data = await res.json();

        if (data.success && data.serviceable) {
            serviceabilityStatus.textContent = `✓ Delivery available in your area`;
            serviceabilityStatus.className = 'pincode-status valid';
            pincodeValid = true;
        } else {
            serviceabilityStatus.textContent = '✗ Area not serviceable';
            serviceabilityStatus.className = 'pincode-status invalid';
            pincodeValid = false;
        }
    } catch {
        serviceabilityStatus.textContent = '⚠ Could not verify area. Please try again.';
        serviceabilityStatus.className = 'pincode-status invalid';
        pincodeValid = false;
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
        savedCheckoutProfile = profile || null;
        const savedPhone = normalizePhone(profile?.phone).slice(0, 10);
        const savedAddress = String(profile?.address || '').trim();

        if (!fullNameInput.value.trim() && profile?.name) {
            fullNameInput.value = profile.name;
        }

        if (savedAddressRow) {
            const hasSavedData = Boolean(savedAddress || savedPhone);
            savedAddressRow.style.display = hasSavedData ? 'flex' : 'none';
            if (savedAddressNote) {
                savedAddressNote.textContent = hasSavedData
                    ? 'Saved contact available from your previous order'
                    : '';
            }
        }
    } catch {
        // Ignore prefill failures and let checkout continue normally.
    }
}

if (useSavedAddressBtn) {
    useSavedAddressBtn.addEventListener('click', () => {
        if (!savedCheckoutProfile) return;

        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('address');
        const savedAddress = String(savedCheckoutProfile.address || '').trim();
        const savedPhone = normalizePhone(savedCheckoutProfile.phone).slice(0, 10);

        if (savedCheckoutProfile.name && !fullNameInput.value.trim()) {
            fullNameInput.value = savedCheckoutProfile.name;
        }
        if (savedAddress) {
            addressInput.value = savedAddress;
        }
        if (savedPhone) {
            phoneInput.value = savedPhone;
            phoneVerified = false;
            verifiedPhone = '';
            setPhoneStatus('Saved phone loaded. Please verify with OTP to place this order.', 'info');
        }

        if (savedAddressNote) {
            savedAddressNote.textContent = 'Saved details applied';
        }
    });
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
    const city = citySelect.value;   // from the controlled dropdown
    const zip = document.getElementById('zip').value.trim();
    const phone = normalizePhone(document.getElementById('phone').value.trim());

    if (!name || !address || !landmark || !zip || !phone) {
        alert('Please fill in all required delivery details.');
        return;
    }

    // City dropdown validation
    if (!city) {
        cityError.classList.add('visible');
        citySelect.focus();
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
        alert('Delivery is not available in your area. Please select a serviceable city and PIN code.');
        return;
    }

    if (!phoneVerified || verifiedPhone !== phone) {
        alert('Please verify your phone number with OTP before placing the order.');
        return;
    }

    // Check if user is logged in
    if (typeof MeatzaarAuth !== 'undefined' && !MeatzaarAuth.isLoggedIn()) {
        alert('Please log in to place an order.');
        window.location.href = '/index.html';
        return;
    }

    payNowBtn.disabled = true;
    payNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initiating Payment...';

    try {
        // Build the item list with product codes and quantities.
        // Prices are NOT sent — the backend fetches them from the database.
        const orderItems = cart.map(item => ({
            productId: item.id || item.productId || '',
            quantity: item.quantity,
            // weight and category are display metadata, not pricing inputs.
            weight: item.weight || '',
            category: item.category || ''
        }));

        const deliveryInfo = {
            fullName: name,
            address,
            address2,
            landmark,
            city,
            zip,
            phone
        };

        // Step 1: Create the Razorpay order on the backend.
        // The backend fetches DB prices and returns the authoritative total.
        const [configRes, paymentOrderData] = await Promise.all([
            fetch(`${window.API_BASE}/payment/config`, { credentials: 'include' }),
            MeatzaarAuth.createPaymentOrder(orderItems)
        ]);

        const { key_id } = await configRes.json();
        const { order: rzpOrder } = paymentOrderData;

        // Razorpay options — amount comes from the server-calculated order, not the cart.
        const options = {
            key: key_id,
            amount: rzpOrder.amount,   // paise, set by backend
            currency: 'INR',
            name: 'Meatzaar',
            description: 'Order Payment',
            order_id: rzpOrder.id,

            handler: async function (paymentResponse) {
                try {
                    // Step 2: Verify the Razorpay HMAC signature on the backend.
                    // This proves the payment is genuine — not fabricated by the client.
                    // The backend writes a VerifiedPayment record on success.
                    await MeatzaarAuth.verifyPayment(
                        paymentResponse.razorpay_payment_id,
                        paymentResponse.razorpay_order_id,
                        paymentResponse.razorpay_signature
                    );

                    // Step 3: Place the order — backend checks VerifiedPayment,
                    // re-fetches prices from DB, validates amount, then saves the Order.
                    const result = await MeatzaarAuth.placeOrder(
                        orderItems,
                        deliveryInfo,
                        rzpOrder.id  // razorpay_order_id links to the VerifiedPayment record
                    );

                    if (isBuyNowMode()) {
                        localStorage.removeItem('buyNow_item');
                    } else {
                        localStorage.removeItem('cart');
                    }

                    alert(
                        `Payment Successful!\n\n` +
                        `Payment ID: ${paymentResponse.razorpay_payment_id}\n\n` +
                        `Order ID: ${result.order.orderId}\n\n` +
                        `Thank you for shopping at Meatzaar!`
                    );

                    window.location.href = '/index.html';
                } catch (err) {
                    // Payment went through but order creation failed.
                    // Show a clear message so the customer can contact support with the payment ID.
                    alert(
                        `Your payment was received (ID: ${paymentResponse.razorpay_payment_id}) ` +
                        `but the order could not be saved.\n\n` +
                        `Please contact support with your Payment ID. You will not be charged twice.`
                    );
                    console.error('Order creation after payment failed:', err);
                }
            },

            prefill: { name, contact: phone },
            theme: { color: '#FF7300' },
            method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();

    } catch (err) {
        alert('Failed to initiate payment: ' + err.message);
    } finally {
        payNowBtn.disabled = false;
        payNowBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now';
    }
});

// Initial render
renderCheckout();
prefillSavedDeliveryInfo();

// ==================== ANNOUNCEMENT BAR MARQUEE ====================
(function initMarquee() {
    const track = document.querySelector('.announcement-track');
    if (!track) return;
    const first = track.querySelector('.announcement-content');
    if (!first) return;
    const contentW = first.offsetWidth;
    if (!contentW) return;
    const needed = Math.max(2, Math.ceil((window.innerWidth * 2.5) / contentW));
    const existing = track.querySelectorAll('.announcement-content').length;
    for (let i = existing; i < needed; i++) {
        track.appendChild(first.cloneNode(true));
    }
    track.style.setProperty('--marquee-shift', `-${contentW}px`);
})();
