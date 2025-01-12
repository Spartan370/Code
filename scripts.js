document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    let lastScrollTop = 0;
    let isModalOpen = false;

    initializeLoading();
    initializeNavigation();
    initializeParticles();
    initializeProductCards();
    initializeModals();
    initializeSearch();
    initializeAnimations();
    initializeTintControl();
    initializeInfiniteScroll();
    initializeUserSystem();

    function initializeLoading() {
        const loadingScreen = document.querySelector('.loading-screen');
        window.addEventListener('load', () => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        });
    }

    function initializeNavigation() {
        const navbar = document.querySelector('.navbar');
        const scrollTopBtn = document.querySelector('.scroll-to-top');

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                navbar.classList.add('navbar-scrolled');
                scrollTopBtn.classList.add('visible');
            } else {
                navbar.classList.remove('navbar-scrolled');
                scrollTopBtn.classList.remove('visible');
            }

            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    function initializeParticles() {
        const canvas = document.createElement('canvas');
        canvas.classList.add('particles-canvas');
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const particleCount = 100;
        
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3;
                this.speedX = Math.random() * 3 - 1.5;
                this.speedY = Math.random() * 3 - 1.5;
                this.color = `rgba(128, 0, 0, ${Math.random() * 0.5})`;
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                
                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        function initParticles() {
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }
        
        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (const particle of particles) {
                particle.update();
                particle.draw();
            }
            
            requestAnimationFrame(animateParticles);
        }
        
        initParticles();
        animateParticles();
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    function initializeProductCards() {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                const bounds = card.getBoundingClientRect();
                const mouseX = e.clientX - bounds.left;
                const mouseY = e.clientY - bounds.top;
                
                card.style.transform = `
                    perspective(1000px)
                    rotateX(${(mouseY - bounds.height/2) / 20}deg)
                    rotateY(${(mouseX - bounds.width/2) / 20}deg)
                    translateZ(20px)
                `;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateZ(0)';
            });
            
            const buyBtn = card.querySelector('.btn-buy');
            buyBtn.addEventListener('click', () => {
                if (!isAuthenticated()) {
                    showLoginModal();
                    return;
                }
                initiateCheckout(card.dataset.productId);
            });
        });
    }

    function initializeModals() {
        const modals = document.querySelectorAll('.modal');
        const modalTriggers = document.querySelectorAll('[data-modal-target]');
        
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const modalId = trigger.dataset.modalTarget;
                const modal = document.querySelector(modalId);
                openModal(modal);
            });
        });
        
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal);
            });
        });
    }

    function initializeSearch() {
        const searchInput = document.querySelector('.search-input');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 300);
        });
        
        async function performSearch(query) {
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const results = await response.json();
                updateSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }
    }

    function initializeAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    function initializeTintControl() {
        const tintControl = document.querySelector('.tint-control input');
        
        tintControl.addEventListener('input', (e) => {
            root.style.setProperty('--tint-opacity', e.target.value);
            localStorage.setItem('tintPreference', e.target.value);
        });
        
        const savedTint = localStorage.getItem('tintPreference');
        if (savedTint) {
            tintControl.value = savedTint;
            root.style.setProperty('--tint-opacity', savedTint);
        }
    }

    function initializeInfiniteScroll() {
        let page = 1;
        let loading = false;
        
        window.addEventListener('scroll', () => {
            if (loading) return;
            
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                loading = true;
                loadMoreProducts();
            }
        });
        
        async function loadMoreProducts() {
            try {
                const response = await fetch(`/api/products?page=${++page}`);
                const newProducts = await response.json();
                appendProducts(newProducts);
                loading = false;
            } catch (error) {
                console.error('Failed to load more products:', error);
                loading = false;
            }
        }
    }

    function initializeUserSystem() {
        const loginForm = document.querySelector('.login-form');
        const signupForm = document.querySelector('.signup-form');
        
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    const userData = await response.json();
                    handleSuccessfulLogin(userData);
                }
            } catch (error) {
                showError('Login failed. Please try again.');
            }
        });
    }

    function handleSuccessfulLogin(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
        updateUIForLoggedInUser(userData);
        closeModal(document.querySelector('#loginModal'));
    }

    function updateUIForLoggedInUser(userData) {
        const authSection = document.querySelector('.nav-auth');
        authSection.innerHTML = `
            <div class="user-profile">
                <img src="${userData.avatar}" alt="Profile">
                <span>${userData.username}</span>
            </div>
        `;
    }

    function showError(message) {
        const errorToast = document.createElement('div');
        errorToast.classList.add('error-toast');
        errorToast.textContent = message;
        document.body.appendChild(errorToast);
        
        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
});
