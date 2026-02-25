document.addEventListener('DOMContentLoaded', () => {

    const existingFavicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (!existingFavicon) {
        fetch('/partials/favicon.html', { cache: "no-cache" })
            .then(response => response.text())
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                Array.from(tempDiv.children).forEach(child => {
                    document.head.appendChild(child);
                });
            })
            .catch(err => console.error('Favicon injection failed:', err));
    }

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

        window.addEventListener('scroll', () => {
            if (navLinks.classList.contains('open')) {
                closeMenu();
            }
        }, { passive: true });
    }

    const projectCards = document.querySelectorAll('.project-card');

    if (projectCards.length > 0) {
        projectCards.forEach(card => {
            let bounds;
            let current = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
            let target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
            let isHovering = false;
            let rafId = null;

            const updateBounds = () => {
                bounds = card.getBoundingClientRect();
            };

            const onEnter = () => {
                isHovering = true;
                updateBounds();
                target.s = 1.02; 
                
                window.addEventListener('scroll', updateBounds, { passive: true });
                window.addEventListener('resize', updateBounds, { passive: true });
                
                if (!rafId) rafId = requestAnimationFrame(animate);
            };

            const onLeave = () => {
                isHovering = false;
                target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
                
                window.removeEventListener('scroll', updateBounds);
                window.removeEventListener('resize', updateBounds);
            };

            const onMove = (e) => {
                if (!bounds) return;
                
                const x = e.clientX - bounds.left;
                const y = e.clientY - bounds.top;

                card.style.setProperty('--mouse-x', x + 'px');
                card.style.setProperty('--mouse-y', y + 'px');

                const cx = bounds.width / 2;
                const cy = bounds.height / 2;
                const dx = x - cx;
                const dy = y - cy;

                target.rx = -(dy / cy) * 6;
                target.ry = (dx / cx) * 6;
                target.x = dx * 0.05;
                target.y = dy * 0.05;
            };

            const animate = () => {
                const ease = isHovering ? 0.25 : 0.1;

                current.x += (target.x - current.x) * ease;
                current.y += (target.y - current.y) * ease;
                current.rx += (target.rx - current.rx) * ease;
                current.ry += (target.ry - current.ry) * ease;
                current.s += (target.s - current.s) * ease;

                const tX = Math.round(current.x * 100) / 100;
                const tY = Math.round(current.y * 100) / 100;
                const rX = Math.round(current.rx * 1000) / 1000;
                const rY = Math.round(current.ry * 1000) / 1000;
                const sc = Math.round(current.s * 1000) / 1000;

                card.style.transform = `perspective(1000px) scale(${sc}) translate3d(${tX}px, ${tY}px, 0) rotateX(${rX}deg) rotateY(${rY}deg)`;

                const isResting = !isHovering && 
                                  Math.abs(target.x - current.x) < 0.01 &&
                                  Math.abs(target.y - current.y) < 0.01 &&
                                  Math.abs(target.rx - current.rx) < 0.01 &&
                                  Math.abs(target.ry - current.ry) < 0.01 &&
                                  Math.abs(target.s - current.s) < 0.001;

                if (isResting) {
                    rafId = null;
                    card.style.transform = 'perspective(1000px) scale(1) translate3d(0, 0, 0) rotateX(0) rotateY(0)';
                    return; 
                }

                rafId = requestAnimationFrame(animate);
            };

            card.addEventListener('pointerenter', onEnter);
            card.addEventListener('pointermove', onMove);
            card.addEventListener('pointerleave', onLeave);
        });
    }

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

    const introOverlay = document.querySelector('.intro-overlay');

    if (introOverlay) {
        document.body.classList.add('mobile-intro-active');

        setTimeout(() => {
            document.body.classList.remove('loading');
            document.body.classList.remove('mobile-intro-active');
            
            document.querySelectorAll('.hero-section .fade-up').forEach(el => el.classList.add('in-view'));

            setTimeout(() => {
                introOverlay.style.display = 'none';
            }, 500);
        }, 2200);
    } else {
        requestAnimationFrame(() => {
            document.body.classList.remove('loading');
        });
    }
});