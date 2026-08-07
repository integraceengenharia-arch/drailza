/**
 * Dra. Ilza Ezequiel — Site Engine (Performance Edition)
 * Canvas scroll animation + FAQ accordion + Scroll reveal
 * Mobile-optimized: carregamento progressivo e inteligente
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ======================================================================
       DETECÇÃO DE DISPOSITIVO E CONEXÃO
       ====================================================================== */

    const isMobile   = window.innerWidth <= 768 || ('ontouchstart' in window);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowNet  = connection && ['slow-2g','2g','3g'].includes(connection.effectiveType);

    // Configuração adaptativa por dispositivo/conexão
    const CONFIG = {
        TOTAL_FRAMES:         144,
        INITIAL_PRELOAD:      isMobile ? (isSlowNet ? 3 : 6) : 15,
        CHUNK_SIZE:           isMobile ? 5 : 10,
        CHUNK_DELAY:          isMobile ? 60 : 30,
        FRAME_PATH:           'public/frames/frame-',
        FRAME_EXT:            '.webp',
    };

    /* ======================================================================
       CANVAS SETUP
       ====================================================================== */

    const canvas        = document.getElementById('fullscreenCanvas');
    const ctx           = canvas.getContext('2d');
    const loaderOverlay = document.getElementById('loaderOverlay');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const header        = document.getElementById('siteHeader');

    const framesMap = new Map();
    let currentFrameIndex = 1;
    let ticking = false;
    let lastRenderedFrame = -1;

    function fmt(num) { return String(num).padStart(4, '0'); }
    function src(i)   { return `${CONFIG.FRAME_PATH}${fmt(i)}${CONFIG.FRAME_EXT}`; }

    /* ======================================================================
       RENDER — com cache de frame (evita re-draw desnecessário)
       ====================================================================== */

    function renderFrame(index) {
        if (index === lastRenderedFrame) return; // já está desenhado

        let img = framesMap.get(index);
        if (!img || !img.complete) {
            // Fallback: frame mais próximo já carregado
            for (let i = index - 1; i >= 1; i--) {
                const f = framesMap.get(i);
                if (f && f.complete) { img = f; break; }
            }
        }
        if (!img || !img.complete) return;

        const dpr    = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2); // limita DPR no mobile
        const w      = window.innerWidth;
        const h      = window.innerHeight;

        if (canvas.width  !== Math.round(w * dpr) ||
            canvas.height !== Math.round(h * dpr)) {
            canvas.width  = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';

        const scale = Math.max(w / img.width, h / img.height);
        const drawW = img.width  * scale;
        const drawH = img.height * scale;

        // Mobile: centralizado | Desktop: ancorado levemente à esquerda
        const drawX = isMobile
            ? (w - drawW) / 2
            : Math.min(0, (w - drawW) * 0.3);
        const drawY = drawH > h ? 0 : (h - drawH) / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        currentFrameIndex = index;
        lastRenderedFrame = index;
    }

    /* ======================================================================
       CARREGAMENTO DE FRAMES
       ====================================================================== */

    function loadFrame(index) {
        return new Promise((resolve) => {
            if (framesMap.has(index)) { resolve(framesMap.get(index)); return; }
            const img = new Image();
            img.onload  = () => { framesMap.set(index, img); resolve(img); };
            img.onerror = () => resolve(null);
            img.src     = src(index);
            img.decoding = 'async'; // decodifica sem bloquear a thread principal
        });
    }

    // Pré-carrega os frames iniciais (os primeiros N para o hero aparecer rápido)
    async function preloadInitial() {
        const promises = [];
        for (let i = 1; i <= CONFIG.INITIAL_PRELOAD; i++) {
            promises.push(loadFrame(i));
        }
        await Promise.all(promises);
        loaderOverlay.classList.add('hidden');
        updateFrameFromScroll();
    }

    // Carrega o restante em chunks em background, priorizando frames próximos ao scroll atual
    async function loadRemaining() {
        const CHUNK = CONFIG.CHUNK_SIZE;
        const DELAY = CONFIG.CHUNK_DELAY;

        for (let i = CONFIG.INITIAL_PRELOAD + 1; i <= CONFIG.TOTAL_FRAMES; i += CHUNK) {
            // Pausa se o usuário está scrollando (prioriza UI)
            await new Promise(r => setTimeout(r, DELAY));

            const batch = [];
            for (let j = i; j < i + CHUNK && j <= CONFIG.TOTAL_FRAMES; j++) {
                batch.push(loadFrame(j));
            }
            await Promise.all(batch);
        }
    }

    async function startPreload() {
        await preloadInitial();
        loadRemaining(); // roda em background sem await
    }

    /* ======================================================================
       SCROLL SYNC
       ====================================================================== */

    function updateFrameFromScroll() {
        const maxScroll      = document.documentElement.scrollHeight - window.innerHeight;
        const animationEnd   = maxScroll * 0.75;
        const scrollFraction = Math.max(0, Math.min(1, window.scrollY / animationEnd));
        const frameIndex     = Math.min(
            CONFIG.TOTAL_FRAMES,
            Math.max(1, Math.floor(scrollFraction * CONFIG.TOTAL_FRAMES) + 1)
        );

        renderFrame(frameIndex);

        if (scrollIndicator) {
            scrollIndicator.style.opacity = window.scrollY > 80 ? '0' : '1';
        }

        header.classList.toggle('scrolled', window.scrollY > 100);
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateFrameFromScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            lastRenderedFrame = -1; // força re-draw após resize
            updateFrameFromScroll();
        }, 150);
    }, { passive: true });

    startPreload();

    /* ======================================================================
       FAQ ACCORDION
       ====================================================================== */

    document.querySelectorAll('.faq-item').forEach(item => {
        const btn = item.querySelector('.faq-question');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('active');
                const q = i.querySelector('.faq-question');
                if (q) q.setAttribute('aria-expanded', 'false');
            });
            if (!isActive) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    /* ======================================================================
       SCROLL REVEAL (Intersection Observer)
       ====================================================================== */

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => revealObserver.observe(el));

});
