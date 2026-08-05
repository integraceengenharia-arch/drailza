/**
 * Dra. Ilza Ezequiel — Site Engine
 * Canvas scroll animation + FAQ accordion + Scroll reveal animations
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ======================================================================
       CANVAS FRAME ANIMATION (Scroll-Synced)
       ====================================================================== */

    const TOTAL_FRAMES = 144;
    const INITIAL_PRELOAD_COUNT = 15;
    const FRAME_PATH = 'public/frames/frame-';
    const FRAME_EXT = '.webp';

    const canvas = document.getElementById('fullscreenCanvas');
    const ctx = canvas.getContext('2d');
    const loaderOverlay = document.getElementById('loaderOverlay');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const header = document.getElementById('siteHeader');
    const heroSection = document.getElementById('hero');

    const framesMap = new Map();
    let currentFrameIndex = 1;
    let totalLoadedCount = 0;
    let ticking = false;

    function formatFrameNumber(num) {
        return String(num).padStart(4, '0');
    }

    function getFrameSrc(index) {
        return `${FRAME_PATH}${formatFrameNumber(index)}${FRAME_EXT}`;
    }

    function renderFrame(index) {
        let img = framesMap.get(index);
        if (!img || !img.complete) {
            for (let i = index - 1; i >= 1; i--) {
                if (framesMap.has(i) && framesMap.get(i).complete) {
                    img = framesMap.get(i);
                    break;
                }
            }
        }

        if (!img || !img.complete) return;

        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const scale = Math.max(w / img.width, h / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = 0;
        const drawY = drawH > h ? 0 : (h - drawH) / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        currentFrameIndex = index;
    }

    function loadSingleFrame(index) {
        return new Promise((resolve) => {
            if (framesMap.has(index)) {
                resolve(framesMap.get(index));
                return;
            }
            const img = new Image();
            img.onload = () => {
                framesMap.set(index, img);
                totalLoadedCount++;
                resolve(img);
            };
            img.onerror = () => resolve(null);
            img.src = getFrameSrc(index);
        });
    }

    async function startPreload() {
        const initialPromises = [];
        for (let i = 1; i <= INITIAL_PRELOAD_COUNT; i++) {
            initialPromises.push(loadSingleFrame(i));
        }
        await Promise.all(initialPromises);

        loaderOverlay.classList.add('hidden');
        updateFrameFromScroll();
        loadRemainingFramesProgressively();
    }

    async function loadRemainingFramesProgressively() {
        const CHUNK_SIZE = 10;
        for (let i = INITIAL_PRELOAD_COUNT + 1; i <= TOTAL_FRAMES; i += CHUNK_SIZE) {
            const chunkPromises = [];
            for (let j = i; j < i + CHUNK_SIZE && j <= TOTAL_FRAMES; j++) {
                chunkPromises.push(loadSingleFrame(j));
            }
            await Promise.all(chunkPromises);
            await new Promise(r => setTimeout(r, 30));
        }
    }

    function updateFrameFromScroll() {
        // Map frames across the FULL page scroll (video continues through all sections)
        // Uses 75% of the total scrollable distance so animation completes before footer
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const animationEnd = maxScroll * 0.75;
        const scrollFraction = Math.max(0, Math.min(1, window.scrollY / animationEnd));
        const frameIndex = Math.min(
            TOTAL_FRAMES,
            Math.max(1, Math.floor(scrollFraction * TOTAL_FRAMES) + 1)
        );

        renderFrame(frameIndex);

        // Fade out scroll indicator
        if (window.scrollY > 80) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }

        // Header background toggle
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Canvas always stays visible — sections are semi-transparent
        // so the video shows through all sections as user scrolls
        // When video ends, canvas shows black (its background color)
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateFrameFromScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    window.addEventListener('resize', () => {
        updateFrameFromScroll();
    });

    startPreload();

    /* ======================================================================
       FAQ ACCORDION
       ====================================================================== */

    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const button = item.querySelector('.faq-question');
        button.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                button.setAttribute('aria-expanded', 'true');
            }
        });
    });

    /* ======================================================================
       SCROLL REVEAL ANIMATIONS (Intersection Observer)
       ====================================================================== */

    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing after reveal (one-time animation)
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => revealObserver.observe(el));

});
