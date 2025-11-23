document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!menuButton || !mobileMenu) return;

  // Funções de abrir/fechar
  const openMenu = () => {
    mobileMenu.removeAttribute('hidden');
    mobileMenu.classList.remove('hidden');
    menuButton.setAttribute('aria-expanded', 'true');
  };
  const closeMenu = () => {
    mobileMenu.setAttribute('hidden', '');
    mobileMenu.classList.add('hidden');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  const isMenuOpen = () => !mobileMenu.hasAttribute('hidden') && !mobileMenu.classList.contains('hidden');

  // Toggle do botão
  menuButton.addEventListener('click', (ev) => {
    ev.stopPropagation();
    isMenuOpen() ? closeMenu() : openMenu();
  });

  // Fecha ao clicar fora
  document.addEventListener('click', () => {
    if (isMenuOpen()) closeMenu();
  });
  // Impede propagação de cliques dentro do menu
  mobileMenu.addEventListener('click', (ev) => ev.stopPropagation());

  // Helper: altura do header fixo (se houver)
  function getHeaderHeight() {
    const header = document.querySelector('[data-header]') || document.querySelector('header');
    return header ? Math.ceil(header.getBoundingClientRect().height) : 0;
  }

  // Manipulador robusto para links âncora (funciona no desktop e mobile)
  function handleAnchorClick(ev, link) {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    ev.preventDefault();
    ev.stopPropagation();

    // Resolve alvo
    const id = href.startsWith('#') ? href.slice(1) : null;
    const target = id ? document.getElementById(id) || document.querySelector(href) : document.querySelector(href);
    if (!target) {
      // Se não encontrou, atualiza a URL e sai
      history.pushState?.(null, '', href);
      return;
    }

    // 1) calcula posição antes de qualquer mudança de layout
    const headerHeight = getHeaderHeight();
    const beforeRect = target.getBoundingClientRect();
    const beforeTop = Math.max(0, Math.floor(window.scrollY + beforeRect.top - headerHeight));

    // 2) fecha o menu imediatamente (para liberar a tela no mobile)
    if (isMenuOpen()) closeMenu();

    // 3) aguarda micro-frame para o layout se estabilizar após fechar (algumas UIs alteram o DOM/offset)
    //    e então recalcula a posição — isso resolve o problema comum em mobile onde fechar o menu muda o offset.
    window.requestAnimationFrame(() => {
      // usa pequeno delay extra para garantir reflow em navegadores mais lentos no mobile
      setTimeout(() => {
        // tenta recalcular a posição após fechar o menu
        let finalTop;
        try {
          const afterRect = target.getBoundingClientRect();
          finalTop = Math.max(0, Math.floor(window.scrollY + afterRect.top - getHeaderHeight()));
        } catch (err) {
          finalTop = beforeTop;
        }

        // Se a diferença for pequena, usa beforeTop; caso contrário, usa finalTop
        const topToScroll = Math.abs(finalTop - beforeTop) > 2 ? finalTop : beforeTop;

        // Scroll suave para a posição calculada
        window.scrollTo({ top: topToScroll, behavior: 'smooth' });

        // Atualiza a hash da URL sem pular (pushState evita salto adicional)
        if (history.pushState) {
          history.pushState(null, '', href);
        } else {
          // fallback — isso pode pular em alguns navegadores, mas é opção secundária
          location.hash = href;
        }
      }, 50); // 50ms costuma ser suficiente; é pequeno o bastante para não parecer lento
    });
  }

  // Delegação: captura cliques em anchors dentro do documento (inclui mobileMenu)
  document.addEventListener('click', (ev) => {
    const link = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (link) handleAnchorClick(ev, link);
  });

  // Também aceita eventos de "touchend" em alguns dispositivos que preferem toque
  document.addEventListener('touchend', (ev) => {
    const link = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (link) handleAnchorClick(ev, link);
  }, { passive: false });

  // Acessibilidade: fecha com Esc
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isMenuOpen()) {
      closeMenu();
      menuButton.focus();
    }
  });
});
