(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-year]').forEach(node => {
    node.textContent = String(new Date().getFullYear());
  });

  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    revealElements.forEach(node => observer.observe(node));
    root.classList.add('reveal-ready');
  } else {
    revealElements.forEach(node => node.classList.add('is-visible'));
  }

  function trackReflection(element, xVariable, yVariable) {
    let pendingFrame = 0;
    let x = 0;
    let y = 0;
    element.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return;
      const bounds = element.getBoundingClientRect();
      x = event.clientX - bounds.left;
      y = event.clientY - bounds.top;
      if (pendingFrame) return;
      pendingFrame = requestAnimationFrame(() => {
        element.style.setProperty(xVariable, `${x}px`);
        element.style.setProperty(yVariable, `${y}px`);
        pendingFrame = 0;
      });
    }, { passive: true });
  }
  const hero = document.querySelector('.hero');
  if (hero) trackReflection(hero, '--cursor-x', '--cursor-y');
  document.querySelectorAll('.project-card').forEach(card => trackReflection(card, '--mx', '--my'));

  const scrollThumb = document.querySelector('.scroll-indicator button');
  if (scrollThumb) {
    let dragging = false;
    let scrollFrame = 0;
    const updateProgress = () => {
      scrollFrame = 0;
      const maximum = Math.max(root.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / maximum, 0), 1);
      scrollThumb.style.top = `${22 + progress * Math.max(window.innerHeight - 60, 0)}px`;
      scrollThumb.style.transform = `translateY(-50%) rotate(${reducedMotion.matches ? 0 : progress * 1080}deg)`;
    };
    const scheduleProgress = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress);
    };
    scrollThumb.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      root.classList.add('is-scroll-dragging');
      scrollThumb.setPointerCapture(event.pointerId);
    });
    scrollThumb.addEventListener('pointermove', event => {
      if (!dragging) return;
      const progress = Math.min(Math.max((event.clientY - 22) / Math.max(window.innerHeight - 60, 1), 0), 1);
      window.scrollTo({ top: progress * Math.max(root.scrollHeight - window.innerHeight, 0), behavior: 'instant' });
    });
    const stopDragging = () => {
      dragging = false;
      root.classList.remove('is-scroll-dragging');
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => scrollThumb.addEventListener(type, stopDragging));
    window.addEventListener('blur', stopDragging);
    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', scheduleProgress);
    window.addEventListener('load', scheduleProgress);
    if ('ResizeObserver' in window) new ResizeObserver(scheduleProgress).observe(document.body);
    updateProgress();
  }
  let highlightedProject = null;
  let highlightTimer = 0;
  function focusProjectHash() {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    const project = document.getElementById(id);
    if (!project || !project.classList.contains('project-card')) return;
    const wrapper = project.closest('.project-reveal');
    if (!wrapper) return;
    if (highlightedProject) highlightedProject.classList.remove('deep-link-active');
    clearTimeout(highlightTimer);
    wrapper.classList.add('is-visible', 'deep-link-active');
    highlightedProject = wrapper;
    requestAnimationFrame(() => project.scrollIntoView({ block: 'center', behavior: 'instant' }));
    highlightTimer = window.setTimeout(() => {
      wrapper.classList.remove('deep-link-active');
      highlightedProject = null;
    }, 3600);
  }
  window.addEventListener('hashchange', focusProjectHash);

  focusProjectHash();
  if (document.readyState !== 'complete') window.addEventListener('load', focusProjectHash, { once: true });


  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {}
    }
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = value;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(field);
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { }
    field.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    return copied;
  }

  const announcement = document.createElement('span');
  announcement.className = 'copy-announcement';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  document.body.appendChild(announcement);

  document.querySelectorAll('[data-copy-link]').forEach(button => {
    const label = button.querySelector('[data-copy-label]');
    const copyIcon = button.querySelector('[data-copy-icon]');
    const checkIcon = button.querySelector('[data-copy-check]');
    const originalLabel = label.textContent;
    let resetTimer = 0;
    button.addEventListener('click', async () => {

      const link = new URL(window.location.href);
      link.hash = button.dataset.copyLink;
      const copied = await copyText(link.href);
      if (!copied) {
        window.prompt('Copie o link deste projeto:', link.href);
        return;
      }
      clearTimeout(resetTimer);
      label.textContent = 'Copiado';
      button.classList.add('is-copied');
      copyIcon.setAttribute('hidden', '');
      checkIcon.removeAttribute('hidden');
      announcement.textContent = `Link de ${button.dataset.copyLink} copiado.`;
      resetTimer = window.setTimeout(() => {
        label.textContent = originalLabel;
        button.classList.remove('is-copied');
        copyIcon.removeAttribute('hidden');
        checkIcon.setAttribute('hidden', '');
        announcement.textContent = '';
      }, 1800);
    });
  });
})();
