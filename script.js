document.addEventListener('DOMContentLoaded', () => {
    
    // --- MAGNETIC BUTTONS (Hover Effect) ---
    // Fix: bind events to the stable wrapper (.magnetic-wrap), and move only the inner (.magnetic-target).
    // Reason: if you bind hover events to the element you're translating, the hover boundary moves and can
    // rapidly trigger enter/leave, causing the cursor to flicker between arrow/pointer.
    const magneticWraps = document.querySelectorAll('.magnetic-wrap');
    magneticWraps.forEach((wrap) => {
        const target = wrap.querySelector('.magnetic-target');
        if (!target) return;

        wrap.addEventListener('mousemove', (e) => {
            const rect = wrap.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            target.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        wrap.addEventListener('mouseleave', () => {
            target.style.transform = `translate(0px, 0px)`;
        });
    });

    // --- MOBILE NAV TOGGLE ---
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle && navLinks) {
        const closeMenu = () => {
            mobileToggle.classList.remove('active');
            navLinks.classList.remove('open');
        };

        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileToggle.classList.toggle('active');
            navLinks.classList.toggle('open');
        });

        // Close when clicking a link
        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', closeMenu);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            const clickedInsideNav = navLinks.contains(e.target) || mobileToggle.contains(e.target);
            if (!clickedInsideNav) closeMenu();
        });

        // Close on resize back to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) closeMenu();
        });
    }

    // --- 3D TILT CARDS ---
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
        });
    });

    // --- HERO 3D PARALLAX (HOME ONLY) ---
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.getElementById('hero-tilt-layer');
    
    if (heroSection && heroContent) {
        const isTouch = window.matchMedia("(hover: none)").matches;
        if (!isTouch && window.innerWidth > 768) {
            let currentX = 0, currentY = 0;
            let targetX = 0, targetY = 0;
            const smoothness = 0.08; 
            const range = 4; 

            heroSection.addEventListener('mousemove', (e) => {
                const x = (e.clientX / window.innerWidth) * 2 - 1;
                const y = (e.clientY / window.innerHeight) * 2 - 1;
                targetX = y * -range; 
                targetY = x * range;
            });

            heroSection.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

            const animateHero = () => {
                currentX += (targetX - currentX) * smoothness;
                currentY += (targetY - currentY) * smoothness;
                heroContent.style.transform = `rotateX(${currentX.toFixed(3)}deg) rotateY(${currentY.toFixed(3)}deg)`;
                requestAnimationFrame(animateHero);
            };
            animateHero();
        }
    }

    // --- EMAIL COPY LOGIC ---
    window.copyEmail = function() {
        const email = document.getElementById('email-text').innerText;
        navigator.clipboard.writeText(email).then(() => {
            const feedback = document.getElementById('copy-feedback');
            feedback.classList.add('active');
            setTimeout(() => feedback.classList.remove('active'), 2000);
        });
    };

    // --- SCROLL REVEAL ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // --- INTRO CLEANUP ---
    setTimeout(() => {
        document.body.classList.remove('loading');
        document.querySelectorAll('.hero-section .fade-up').forEach(el => el.classList.add('in-view'));
    }, 2200);
});