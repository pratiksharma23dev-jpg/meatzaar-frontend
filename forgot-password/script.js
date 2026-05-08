document.addEventListener('DOMContentLoaded', () => {
    const form       = document.getElementById('forgotForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const submitBtn  = document.getElementById('submitBtn');
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    const successMsg = document.getElementById('successMsg');
    const successText = document.getElementById('successText');
    const errorMsg   = document.getElementById('errorMsg');
    const errorText  = document.getElementById('errorText');

    function setLoading(on) {
        submitBtn.disabled = on;
        btnText.classList.toggle('hidden', on);
        btnSpinner.classList.toggle('hidden', !on);
    }

    function showSuccess(msg) {
        successText.textContent = msg;
        successMsg.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        form.classList.add('hidden');
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMsg.classList.remove('hidden');
        successMsg.classList.add('hidden');
    }

    function clearError(input, errorEl) {
        input.classList.remove('error');
        errorEl.textContent = '';
    }

    function validateEmail(value) {
        if (!value) return 'Email is required.';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Please enter a valid email address.';
        return '';
    }

    emailInput.addEventListener('input', () => clearError(emailInput, emailError));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const err = validateEmail(email);

        if (err) {
            emailInput.classList.add('error');
            emailError.textContent = err;
            emailInput.focus();
            return;
        }

        clearError(emailInput, emailError);
        errorMsg.classList.add('hidden');
        setLoading(true);

        try {
            const data = await MeatzaarAuth.forgotPassword(email);
            showSuccess(data.message || 'If that email is registered, a reset link has been sent.');
        } catch (err) {
            showError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    });
});
