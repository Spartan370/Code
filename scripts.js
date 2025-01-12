document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const heroSection = document.querySelector('.hero');
    const searchInput = document.querySelector('.search-input');
    const productCards = document.querySelectorAll('.product-card');

    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 100) {
                    navbar.classList.add('navbar-scrolled');
                } else {
                    navbar.classList.remove('navbar-scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll);

    const parallaxEffect = () => {
        const scrolled = window.scrollY;
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    };

    window.addEventListener('scroll', parallaxEffect);

    const createRipple = (event) => {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        
        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;
        
        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${event.clientX - rect.left - radius}px`;
        ripple.style.top = `${event.clientY - rect.top - radius}px`;
        
        ripple.classList.add('ripple');
        button.appendChild(ripple);
        
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    };

    const buttons = document.querySelectorAll('.btn-buy, .btn-login, .btn-signup');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });

    productCards.forEach(card => {
        observer.observe(card);
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterProducts(searchTerm);
    });

    const filterProducts = (searchTerm) => {
        productCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tags span'))
                .map(tag => tag.textContent.toLowerCase());
            
            const matches = title.includes(searchTerm) || 
                tags.some(tag => tag.includes(searchTerm));
            
            card.style.display = matches ? 'block' : 'none';
            if (matches) {
                card.classList.add('product-card-highlight');
                setTimeout(() => {
                    card.classList.remove('product-card-highlight');
                }, 1000);
            }
        });
    };

    const initializeParticles = () => {
        const canvas = document.createElement('canvas');
        canvas.classList.add('particles-canvas');
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3;
                this.speedX = Math.random() * 3 - 1.5;
                this.speedY = Math.random() * 3 - 1.5;
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
                ctx.fillStyle = 'rgba(128, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x, this.y,
