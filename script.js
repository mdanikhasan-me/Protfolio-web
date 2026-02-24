document.addEventListener('DOMContentLoaded', () => {

    /* --- Magnetic Logic (Buttons/Links) --- */
    const magneticWraps = document.querySelectorAll('.magnetic-wrap');

    magneticWraps.forEach((wrap) => {
        const target = wrap.querySelector('.magnetic-target');
        if (!target) return;

        wrap.addEventListener('mousemove', (e) => {
            const rect = wrap.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            target.style.transform = `translate3d(${(x * 0.2).toFixed(3)}px, ${(y * 0.2).toFixed(3)}px, 0)`;
        });

        wrap.addEventListener('mouseleave', () => {
            target.style.transform = 'translate3d(0px, 0px, 0px)';
        });
    });

    /* --- Mobile Menu --- */
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

        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            const clickedInsideNav = navLinks.contains(e.target) || mobileToggle.contains(e.target);
            if (!clickedInsideNav) closeMenu();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) closeMenu();
        });
    }

    /* --- Advanced Project Card Animation (Physics) --- */
    const projectCards = document.querySelectorAll('.project-card');

    if (projectCards.length > 0) {
        projectCards.forEach(card => {
            let current = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
            let target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
            let mouse = { x: 0, y: 0 }; 
            let isHovering = false;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                mouse.x = x;
                mouse.y = y;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Physics constants for premium feel
                target.x = (x - centerX) * 0.05; // Subtle pan
                target.y = (y - centerY) * 0.05; 
                
                // Tilt calculation
                target.rx = ((y - centerY) / centerY) * -6; // Max 6deg tilt X
                target.ry = ((x - centerX) / centerX) * 6;  // Max 6deg tilt Y
                
                target.s = 1.02; // Subtle scale up
                isHovering = true;
            });

            card.addEventListener('mouseleave', () => {
                target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
                isHovering = false;
            });

            const animateCard = () => {
                // Heavier damping (0.08) for "premium" weighted feel
                const ease = 0.08; 

                current.x += (target.x - current.x) * ease;
                current.y += (target.y - current.y) * ease;
                current.rx += (target.rx - current.rx) * ease;
                current.ry += (target.ry - current.ry) * ease;
                current.s += (target.s - current.s) * ease;

                // Apply transform: Scale -> Translate -> Rotate
                card.style.transform = `perspective(1000px) scale(${current.s.toFixed(4)}) translate3d(${current.x.toFixed(3)}px, ${current.y.toFixed(3)}px, 0) rotateX(${current.rx.toFixed(3)}deg) rotateY(${current.ry.toFixed(3)}deg)`;
                
                // Update glow position instantly
                if (isHovering) {
                    card.style.setProperty('--mouse-x', `${mouse.x}px`);
                    card.style.setProperty('--mouse-y', `${mouse.y}px`);
                }

                requestAnimationFrame(animateCard);
            };
            animateCard();
        });
    }

    /* --- Utils (Email Copy & Fade Up) --- */
    window.copyEmail = function() {
        const email = document.getElementById('email-text').innerText;
        navigator.clipboard.writeText(email).then(() => {
            const feedback = document.getElementById('copy-feedback');
            feedback.classList.add('active');
            setTimeout(() => feedback.classList.remove('active'), 2000);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    setTimeout(() => {
        document.body.classList.remove('loading');
        document.querySelectorAll('.hero-section .fade-up').forEach(el => el.classList.add('in-view'));
    }, 2200);
});