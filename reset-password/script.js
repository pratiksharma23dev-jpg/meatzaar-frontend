document.addEventListener('DOMContentLoaded', () => {
    const token = new URLSearchParams(window.location.search).get('token');

    const resetCard   = document.getElementById('resetCard');
    const invalidCard = document.getElementById('invalidCard');
    const successCard = document.getElementById('successCard');

    // No token in URL → show invalid state immediately
    if (!token || token.trim() === '') {
        resetCard.classList.add('hidden');
        invalidCard.classList.remove('hidden');
        return;
    }

    const form            = document.getElementById('resetForm');
    const passwordInput   = document.getElementById('password');
    const confirmInput    = document.getElementById('confirmPassword');
    const passwordError   = document.getElementById('passwordError');
    const confirmError    = document.getElementById('confirmError');
    const submitBtn       = document.getElementById('submitBtn');
    const btnText         = submitBtn.querySelector('.btn-text');
    const btnSpinner      = submitBtn.querySelector('.btn-spinner');
    const errorMsg        = document.getElementById('errorMsg');
    const errorText       = document.getElementById('errorText');
    const strengthWrap    = document.getElementById('strengthWrap');
    const strengthFill    = document.getElementById('strengthFill');
    const strengthLabel   = document.getElementById('strengthLabel');

    // ── Toggle password visibility ──
    function bindToggle(btnId, inputEl, iconId) {
        document.getElementById(btnId).addEventListener('click', () => {
            const isPassword = inputEl.type === 'password';
            inputEl.type = isPassword ? 'text' : 'password';
            document.getElementById(iconId).className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    bindToggle('togglePassword', passwordInput, 'eyeIconPassword');
    bindToggle('toggleConfirm',  confirmInput,  'eyeIconConfirm');

    // ── Password strength ──
    function getStrength(pw) {
        if (pw.length < 6) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 8)  score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        if (score <= 1) return { score: 25,  label: 'Weak',   color: '#e74c3c' };
        if (score <= 2) return { score: 50,  label: 'Fair',   color: '#e67e22' };
        if (score <= 3) return { score: 75,  label: 'Good',   color: '#f1c40f' };
        return              { score: 100, label: 'Strong', color: '#2ecc71' };
    }

    passwordInput.addEventListener('input', () => {
        const pw = passwordInput.value;
        passwordError.textContent = '';
        passwordInput.classList.remove('error');

        if (pw.length === 0) {
            strengthWrap.classList.add('hidden');
            return;
        }

        strengthWrap.classList.remove('hidden');
        const { score, label, color } = getStrength(pw);
        strengthFill.style.width = `${score}%`;
        strengthFill.style.background = color;
        strengthLabel.style.color = color;
        strengthLabel.textContent = label;
    });

    confirmInput.addEventListener('input', () => {
        confirmError.textContent = '';
        confirmInput.classList.remove('error');
    });

    // ── Helpers ──
    function setLoading(on) {
        submitBtn.disabled = on;
        btnText.classList.toggle('hidden', on);
        btnSpinner.classList.toggle('hidden', !on);
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function clearServerError() {
        errorMsg.classList.add('hidden');
    }

    // ── Submit ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearServerError();

        const password = passwordInput.value;
        const confirm  = confirmInput.value;
        let valid = true;

        if (!password || password.length < 6) {
            passwordInput.classList.add('error');
            passwordError.textContent = 'Password must be at least 6 characters.';
            valid = false;
        }

        if (!confirm) {
            confirmInput.classList.add('error');
            confirmError.textContent = 'Please confirm your password.';
            valid = false;
        } else if (password !== confirm) {
            confirmInput.classList.add('error');
            confirmError.textContent = 'Passwords do not match.';
            valid = false;
        }

        if (!valid) return;

        setLoading(true);

        try {
            await MeatzaarAuth.resetPassword(token, password);
            resetCard.classList.add('hidden');
            successCard.classList.remove('hidden');
        } catch (err) {
            const msg = err.message || 'Something went wrong. Please try again.';
            // Expired / invalid token — swap to invalid card
            if (/invalid|expired/i.test(msg)) {
                resetCard.classList.add('hidden');
                invalidCard.classList.remove('hidden');
            } else {
                showError(msg);
            }
        } finally {
            setLoading(false);
        }
    });
});
