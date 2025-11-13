// ==================== 
// THEME TOGGLE
// ====================
class ThemeToggle {
    constructor() {
        this.toggle = document.getElementById('theme-toggle');
        this.toggleCharges = document.getElementById('theme-toggle-charges');
        this.htmlElement = document.documentElement;
        this.currentTheme = this.getCookie('theme') || 'dark';
        this.init();
    }

    init() {
        // Set initial theme
        this.setTheme(this.currentTheme, false);

        // Add click event listener for main toggle
        if (this.toggle) {
            this.toggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Add click event listener for charges page toggle
        if (this.toggleCharges) {
            this.toggleCharges.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    setTheme(theme, animate = true) {
        this.currentTheme = theme;
        
        if (theme === 'light') {
            this.htmlElement.setAttribute('data-theme', 'light');
        } else {
            this.htmlElement.removeAttribute('data-theme');
        }

        // Save to cookie (expires in 365 days)
        this.setCookie('theme', theme, 365);

        // Optional: Add animation class
        if (animate) {
            this.htmlElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    getTheme() {
        return this.currentTheme;
    }

    // Cookie utility methods
    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length, cookie.length);
            }
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
    }
}

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
                const targetId = link.getAttribute('href');
                
                // Only handle hash links (anchors like #home, #about)
                // Let regular links (like tacos.html) work normally
                if (targetId && targetId.startsWith('#')) {
                    e.preventDefault();
                    const targetSection = document.querySelector(targetId);
                    
                    if (targetSection) {
                        const offsetTop = targetSection.offsetTop - 80;
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
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
// PRIVACY AWARENESS / ANALYTICS TRACKER
// ====================
class PrivacyTracker {
    constructor() {
        this.data = {};
        this.collectData();
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length, cookie.length);
            }
        }
        return null;
    }

    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
    }

    collectData() {
        // Track visits
        let visitCount = parseInt(this.getCookie('visit_count') || '0');
        visitCount++;
        this.setCookie('visit_count', visitCount.toString(), 365);
        
        // First visit timestamp
        if (!this.getCookie('first_visit')) {
            this.setCookie('first_visit', Date.now().toString(), 365);
        }
        
        // Last visit timestamp
        const lastVisit = this.getCookie('last_visit');
        this.setCookie('last_visit', Date.now().toString(), 365);
        
        // Generate or retrieve user ID (simulating tracking pixel)
        let userId = this.getCookie('user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            this.setCookie('user_id', userId, 365);
        }

        // Collect browser fingerprint data
        this.data = {
            // Identity tracking
            userId: userId,
            visitCount: visitCount,
            firstVisit: new Date(parseInt(this.getCookie('first_visit'))),
            lastVisit: lastVisit ? new Date(parseInt(lastVisit)) : null,
            returningVisitor: visitCount > 1,
            
            // Browser & Device
            userAgent: navigator.userAgent,
            browser: this.getBrowserInfo(),
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            
            // Screen & Display
            screenResolution: `${screen.width}x${screen.height}`,
            screenColorDepth: screen.colorDepth,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio,
            
            // Time & Location
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            localTime: new Date().toLocaleString(),
            
            // Hardware capabilities
            hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
            deviceMemory: navigator.deviceMemory || 'Unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            
            // Network
            connection: this.getConnectionInfo(),
            
            // Preferences
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || 'Not set',
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            
            // Battery (if available)
            battery: 'Loading...',
            
            // Plugins & Features
            pdfViewerEnabled: navigator.pdfViewerEnabled || false,
            
            // Canvas fingerprint (simplified)
            canvasFingerprint: this.getCanvasFingerprint(),
            
            // WebGL fingerprint
            webglVendor: this.getWebGLInfo().vendor,
            webglRenderer: this.getWebGLInfo().renderer,
            
            // Session data
            sessionDuration: 0,
            pageViews: this.getPageViews(),
            referrer: document.referrer || 'Direct visit'
        };

        // Get battery info if available
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                this.data.battery = `${Math.round(battery.level * 100)}% ${battery.charging ? '(Charging)' : '(Not charging)'}`;
                this.updateDisplay();
            });
        } else {
            this.data.battery = 'Not available';
        }

        // Track session duration
        this.startTime = Date.now();
        setInterval(() => {
            this.data.sessionDuration = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateSessionTime();
        }, 1000);
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
        
        return browser;
    }

    getConnectionInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            return {
                type: conn.effectiveType || 'Unknown',
                downlink: conn.downlink ? `${conn.downlink} Mbps` : 'Unknown',
                rtt: conn.rtt ? `${conn.rtt}ms` : 'Unknown',
                saveData: conn.saveData || false
            };
        }
        return { type: 'Unknown', downlink: 'Unknown', rtt: 'Unknown', saveData: false };
    }

    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint', 2, 2);
            return canvas.toDataURL().slice(-50);
        } catch (e) {
            return 'Not available';
        }
    }

    getWebGLInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                return {
                    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
                    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
                };
            }
        } catch (e) {
            // Ignore
        }
        return { vendor: 'Not available', renderer: 'Not available' };
    }

    getPageViews() {
        let pageViews = parseInt(sessionStorage.getItem('page_views') || '0');
        pageViews++;
        sessionStorage.setItem('page_views', pageViews.toString());
        return pageViews;
    }

    updateSessionTime() {
        const element = document.getElementById('session-duration');
        if (element) {
            const minutes = Math.floor(this.data.sessionDuration / 60);
            const seconds = this.data.sessionDuration % 60;
            element.textContent = `${minutes}m ${seconds}s`;
        }
    }

    updateDisplay() {
        // This will be called after battery info loads
        const batteryElement = document.getElementById('battery-status');
        if (batteryElement) {
            batteryElement.textContent = this.data.battery;
        }
    }

    getRandomFact() {
        const daysSinceFirstVisit = this.data.firstVisit ? 
            Math.floor((Date.now() - this.data.firstVisit.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const hour = new Date().getHours();
        
        const facts = [
            // Visit tracking - personalized
            `📊 This is your visit #${this.data.visitCount}. We can identify you across all your visits using cookies and fingerprinting.`,
            this.data.visitCount === 1 ? 
                `🆕 First visit! Your unique user ID "${this.data.userId}" has been assigned and stored in a cookie.` :
                `🔄 You've been here ${this.data.visitCount} times. We know you're a returning visitor and can track your behavior over time.`,
            this.data.returningVisitor && daysSinceFirstVisit > 0 ? 
                `📅 Your first visit was ${daysSinceFirstVisit} day${daysSinceFirstVisit > 1 ? 's' : ''} ago on ${this.data.firstVisit.toLocaleDateString()}. We've been tracking you since then.` : null,
            this.data.returningVisitor && this.data.lastVisit ? 
                `👤 Welcome back! You were last here on ${this.data.lastVisit.toLocaleDateString()} at ${this.data.lastVisit.toLocaleTimeString()}.` : null,
            
            // Browser & Device - personalized
            `${this.data.browser === 'Chrome' ? '🔍' : this.data.browser === 'Firefox' ? '🦊' : this.data.browser === 'Safari' ? '🧭' : '🌐'} You're using ${this.data.browser} on ${this.data.platform}. This combination helps us fingerprint your device.`,
            `📱 Your screen is ${this.data.screenResolution} pixels. Combined with other data, this helps identify you uniquely.`,
            `📺 Your display has a ${this.data.pixelRatio}x pixel ratio and ${this.data.screenColorDepth}-bit color depth. These details are part of your fingerprint.`,
            `🖥️ Your viewport is currently ${this.data.viewportSize} pixels. Window size changes are also tracked.`,
            
            // Hardware - personalized
            this.data.hardwareConcurrency && this.data.hardwareConcurrency !== 'Unknown' ? 
                `🧠 Your device has ${this.data.hardwareConcurrency} CPU core${this.data.hardwareConcurrency > 1 ? 's' : ''}. This hardware detail helps distinguish your device from others.` : null,
            this.data.deviceMemory && this.data.deviceMemory !== 'Unknown' ? 
                `💾 Your device has ${this.data.deviceMemory}GB of RAM. Memory capacity is a key fingerprinting data point.` : null,
            
            // Location & Time - personalized
            `🌍 You're in the ${this.data.timezone} timezone. This tells us your approximate geographic region without needing GPS.`,
            `⏰ Your local time is ${new Date().toLocaleTimeString()}. ${hour < 6 ? "Early morning browsing detected." : hour < 12 ? "You're a morning person." : hour < 18 ? "Afternoon browsing session." : hour < 22 ? "Evening visit recorded." : "Late night browsing pattern detected."}`,
            `🗣️ Your browser language is set to ${this.data.language}. ${this.data.languages ? `You have ${this.data.languages.length} language(s) configured: ${this.data.languages.join(', ')}.` : ''}`,
            `📍 Based on your timezone (${this.data.timezone}) and language (${this.data.language}), we can narrow your location significantly.`,
            
            // Battery - personalized
            this.data.battery && !this.data.battery.includes('Loading') && !this.data.battery.includes('Not available') ? 
                `🔋 Your battery is at ${this.data.battery}. Even battery level can be used to track you across different websites.` : null,
            
            // Touch & Mobile - personalized
            this.data.maxTouchPoints > 0 ? 
                `👆 Your device supports ${this.data.maxTouchPoints} simultaneous touch point${this.data.maxTouchPoints > 1 ? 's' : ''}. You're likely on a ${this.data.maxTouchPoints >= 5 ? 'mobile phone or tablet' : 'touchscreen laptop'}.` :
                "🖱️ No touchscreen detected. You're using a traditional desktop or laptop with a mouse/trackpad.",
            
            // Connection - personalized
            this.data.connection.type !== 'Unknown' ? 
                `📡 You're on a ${this.data.connection.type.toUpperCase()} connection${this.data.connection.downlink !== 'Unknown' ? ` with ${this.data.connection.downlink} downlink speed` : ''}. Network data helps identify your device and location.` : null,
            this.data.connection.rtt && this.data.connection.rtt !== 'Unknown' ? 
                `⚡ Your connection latency is ${this.data.connection.rtt}. This reveals information about your network quality and proximity to servers.` : null,
            
            // Preferences - personalized
            `🎨 You're currently viewing in ${this.data.colorScheme} mode. Your theme preference is tracked and adds to your fingerprint.`,
            this.data.doNotTrack === '1' ? 
                `🚫 You have "Do Not Track" enabled, but we're still tracking you. Most websites ignore this setting.` : 
                `✅ You don't have "Do Not Track" enabled. Your DNT preference is recorded: ${this.data.doNotTrack || 'not set'}.`,
            this.data.reducedMotion ? 
                "♿ You have reduced motion preferences enabled. Even accessibility settings are tracked." : null,
            
            // Session - personalized
            this.data.sessionDuration > 300 ? 
                `⏱️ You've been here for ${Math.floor(this.data.sessionDuration / 60)} minutes ${this.data.sessionDuration % 60} seconds. Long sessions indicate high engagement and are heavily weighted by algorithms.` :
                this.data.sessionDuration > 60 ?
                `⏱️ You've been browsing for ${this.data.sessionDuration} seconds. Every second of your session is being recorded.` :
                `⏱️ You just arrived ${this.data.sessionDuration} second${this.data.sessionDuration !== 1 ? 's' : ''} ago. The tracking timer started immediately.`,
            
            // Canvas & WebGL - personalized
            this.data.canvasFingerprint && this.data.canvasFingerprint !== 'Not available' ?
                `🎨 Your unique canvas fingerprint ends with: ...${this.data.canvasFingerprint.slice(-20)}. This is nearly impossible to change and identifies you even without cookies.` : null,
            this.data.webglVendor && !this.data.webglVendor.includes('Not available') ?
                `🎮 Your GPU is ${this.data.webglVendor} (${this.data.webglRenderer}). Graphics hardware creates a unique signature.` : null,
            
            // Cookies - personalized
            this.data.cookiesEnabled ? 
                `🍪 You have cookies enabled. We've stored ${this.data.visitCount} visit${this.data.visitCount > 1 ? 's' : ''} in your cookie data and can track you indefinitely.` :
                "🚫 Cookies are disabled, but we're still tracking you using browser fingerprinting instead.",
            
            // Page views - personalized
            this.data.pageViews > 1 ?
                `📄 You've viewed ${this.data.pageViews} page${this.data.pageViews > 1 ? 's' : ''} this session. Your navigation path is being recorded to analyze your interests.` : 
                "📄 This is your first page of the session. Your entry point and browsing path from here will be tracked.",
            
            // Referrer - personalized
            this.data.referrer && this.data.referrer !== 'Direct visit' ?
                `🔗 You came from ${new URL(this.data.referrer).hostname}. We know exactly which site sent you here and can share this data with them.` :
                "🔗 You arrived via direct visit (typed URL or bookmark). This tells us you knew about this site beforehand.",
            
            // User ID - personalized
            `🆔 Your tracking ID is "${this.data.userId}". This identifier links all your activity across visits and can be shared with third parties.`,
            
            // Combined data points - personalized
            `🔍 Combining your ${this.data.browser}, ${this.data.platform}, ${this.data.screenResolution} screen, and ${this.data.hardwareConcurrency} cores creates a fingerprint that's likely unique to you.`,
            `🌐 Your fingerprint includes: ${this.data.language} language, ${this.data.timezone} timezone, ${this.data.screenColorDepth}-bit color, and ${this.data.pixelRatio}x ratio. You're highly identifiable.`,
            this.data.cookiesEnabled ?
                `📊 We have ${Math.ceil((Date.now() - new Date(this.data.firstVisit).getTime()) / (1000 * 60 * 60 * 24))} days of behavioral data on you stored in cookies and can predict your future actions.` : null,
        ].filter(f => f !== null);

        return facts[Math.floor(Math.random() * facts.length)];
    }
}

// ==================== 
// INITIALIZE EVERYTHING
// ====================
document.addEventListener('DOMContentLoaded', () => {
    new ThemeToggle();
    new Navigation();
    new ScrollAnimations();
    new ParticleSystem();
    new ContactForm();
    new ActiveNavLink();
    
    // Initialize privacy tracker
    window.privacyTracker = new PrivacyTracker();
    
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
