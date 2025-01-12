document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const navbar = document.querySelector('.navbar');
    const searchInput = document.querySelector('.search-input');
    const productGrid = document.querySelector('.product-grid');
    const modals = document.querySelectorAll('.modal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const uploadForm = document.getElementById('uploadForm');
    const userSection = document.getElementById('userSection');
    const dashboard = document.getElementById('dashboard');
    const tintControl = document.querySelector('.tint-control input');
    const scrollTopBtn = document.querySelector('.scroll-to-top');
    let lastScrollTop = 0;
    let page = 1;
    let loading = false;

    function initializeApp() {
        setupEventListeners();
        checkAuthStatus();
        loadInitialProducts();
        initializeParticles();
        setupInfiniteScroll();
        loadSavedPreferences();
    }

    function setupEventListeners() {
        window.addEventListener('scroll', handleScroll);
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
        uploadForm.addEventListener('submit', handleUpload);
        tintControl.addEventListener('input', handleTintChange);
        scrollTopBtn.addEventListener('click', scrollToTop);
        document.querySelectorAll('.switch-modal').forEach(btn => {
            btn.addEventListener('click', switchModal);
        });
    }

    async function handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(loginForm);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                updateUIForLoggedInUser(data.user);
                closeModal('loginModal');
            }
        } catch (error) {
            showError(error.message);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(registerForm);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                updateUIForLoggedInUser(data.user);
                closeModal('registerModal');
            }
        } catch (error) {
            showError(error.message);
        }
    }

    async function handleUpload(e) {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                closeModal('uploadModal');
                loadInitialProducts();
            }
        } catch (error) {
            showError(error.message);
        }
    }

    async function loadInitialProducts() {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            renderProducts(data.products);
        } catch (error) {
            showError(error.message);
        }
    }

    function renderProducts(products) {
        productGrid.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product._id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="product-info">
                    <h3>${product.title}</h3>
                    <p>${product.description}</p>
                    <div class="product-meta">
                        <span class="price">$${product.price}</span>
                        <span class="rating">${product.rating} ⭐</span>
                    </div>
                    <button class="btn-buy">Purchase</button>
                </div>
            </div>
        `).join('');
    }

    function updateUIForLoggedInUser(user) {
        userSection.innerHTML = `
            <div class="user-profile">
                <img src="${user.avatar}" alt="Profile">
                <span>${user.username}</span>
                <button id="logoutBtn">Logout</button>
            </div>
        `;
        dashboard.classList.remove('hidden');
    }

    function handleScroll() {
        const currentScroll = window.pageYOffset;
        navbar.classList.toggle('navbar-scrolled', currentScroll > 100);
        scrollTopBtn.classList.toggle('visible', currentScroll > 500);
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }

    function setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (loading) return;
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                loadMoreProducts();
            }
        });
    }

    async function loadMoreProducts() {
        loading = true;
        try {
            const response = await fetch(`/api/products?page=${++page}`);
            const data = await response.json();
            renderProducts([...document.querySelectorAll('.product-card'), ...data.products]);
        } catch (error) {
            showError(error.message);
        } finally {
            loading = false;
        }
    }

    function handleTintChange(e) {
        root.style.setProperty('--tint-opacity', e.target.value);
        localStorage.setItem('tintPreference', e.target.value);
    }

    function loadSavedPreferences() {
        const savedTint = localStorage.getItem('tintPreference');
        if (savedTint) {
            tintControl.value = savedTint;
            root.style.setProperty('--tint-opacity', savedTint);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    initializeApp();
});
