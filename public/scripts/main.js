// ==================== 
// NAVIGATION FUNCTIONALITY
// ====================
class Navigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.init();
    }

    init() {
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.navMenu.classList.toggle('active');
                this.navToggle.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking on a link
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.navMenu.classList.remove('active');
                this.navToggle.classList.remove('active');
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }
        });

        // Smooth scrolling for navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ==================== 
// SCROLL ANIMATIONS
// ====================
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        this.init();
    }

    init() {
        this.observeElements('.project-card', 'visible');
        this.observeElements('.skill-item', 'visible');
        this.animateStats();
        this.animateSkills();
    }

    observeElements(selector, className) {
        const elements = document.querySelectorAll(selector);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add(className);
                    }, index * 100);
                }
            });
        }, this.observerOptions);

        elements.forEach(el => observer.observe(el));
    }

    animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    this.animateValue(entry.target);
                }
            });
        }, this.observerOptions);

        stats.forEach(stat => observer.observe(stat));
    }

    animateValue(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const duration = 2000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target + (target === 100 ? '+' : '');
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + (target === 100 ? '+' : '');
            }
        }, 16);
    }

    animateSkills() {
        const skillBars = document.querySelectorAll('.skill-progress');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    const width = entry.target.getAttribute('data-width');
                    entry.target.style.width = width + '%';
                }
            });
        }, this.observerOptions);

        skillBars.forEach(bar => observer.observe(bar));
    }
}

// ==================== 
// PARTICLE EFFECT
// ====================
class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particles');
        this.particleCount = 50;
        this.init();
    }

    init() {
        if (!this.container) return;

        for (let i = 0; i < this.particleCount; i++) {
            this.createParticle();
        }
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 3 + 2;
        const startX = Math.random() * window.innerWidth;
        const delay = Math.random() * 20;
        const duration = Math.random() * 10 + 15;

        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = startX + 'px';
        particle.style.animationDelay = delay + 's';
        particle.style.animationDuration = duration + 's';

        // Random color from gradient
        const colors = ['#6366f1', '#8b5cf6', '#ec4899'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        this.container.appendChild(particle);
    }
}

// ==================== 
// FORM HANDLING
// ====================
class ContactForm {
    constructor() {
        this.form = document.querySelector('.contact-form');
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    handleSubmit() {
        const formData = new FormData(this.form);
        const button = this.form.querySelector('button[type="submit"]');
        const originalText = button.textContent;

        // Simulate form submission
        button.textContent = 'Sending...';
        button.disabled = true;

        setTimeout(() => {
            button.textContent = 'Message Sent! ✓';
            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            
            setTimeout(() => {
                this.form.reset();
                button.textContent = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 2000);
        }, 1000);
    }
}

// ==================== 
// ACTIVE NAVIGATION LINK
// ====================
class ActiveNavLink {
    constructor() {
        this.sections = document.querySelectorAll('.section');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.updateActiveLink();
        });
        
        this.updateActiveLink();
    }

    updateActiveLink() {
        let current = '';
        const scrollPosition = window.scrollY + 100;

        this.sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
}

// ==================== 
// INITIALIZE EVERYTHING
// ====================
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
    new ScrollAnimations();
    new ParticleSystem();
    new ContactForm();
    new ActiveNavLink();
    
    // Add fade-in animation to body
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ==================== 
// UTILITY FUNCTIONS
// ====================
// Debounce function for performance
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

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
