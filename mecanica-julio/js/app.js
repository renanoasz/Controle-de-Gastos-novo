/* Roteamento e inicialização */
(function () {
  const view = document.getElementById('view');
  let guard = null;
  let currentHash = '';
  let skipNext = false;

  const App = {
    setGuard(fn) {
      guard = fn;
    },

    parse() {
      const raw = location.hash.replace(/^#\/?/, '') || 'painel';
      const [path, qs] = raw.split('?');
      const parts = path.split('/').filter(Boolean);
      return { parts, params: new URLSearchParams(qs || '') };
    },

    refresh() {
      const { parts, params } = App.parse();
      const [rota, id] = parts;
      let title = 'Painel';
      guard = null;
      const scroll = window.scrollY;
      const sameRoute = currentHash === location.hash;

      switch (rota) {
        case 'agenda':
          ViewAgenda.render(view, params);
          title = 'Agenda';
          break;
        case 'notas':
          if (id) {
            ViewNotas.renderEditor(view, id, params);
            title = 'Nota de serviço';
          } else {
            ViewNotas.renderLista(view);
            title = 'Notas de serviço';
          }
          break;
        case 'clientes':
          if (id) ViewClientes.renderDetalhe(view, id);
          else ViewClientes.renderLista(view);
          title = 'Clientes';
          break;
        case 'catalogo':
          ViewCatalogo.render(view);
          title = 'Peças e serviços';
          break;
        case 'config':
          ViewConfig.render(view);
          title = 'Configurações';
          break;
        default:
          ViewPainel.render(view);
      }

      document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (rota || 'painel')));
      document.getElementById('topbar-title').textContent = title;
      document.title = `${title} · ${Store.config.nome}`;
      currentHash = location.hash;
      if (sameRoute) window.scrollTo(0, scroll);
      else window.scrollTo(0, 0);
      closeMenu();
    },

    updateBrand() {
      document.querySelector('.brand-text strong').textContent = Store.config.nome || 'Mecânica Julio';
      const foot = document.getElementById('sidebar-foot');
      const c = Store.config;
      foot.innerHTML = `
        <span>${U.icon('clock')}${U.esc(c.abertura)}–${U.esc(c.fechamento)}</span>
        <span>${(c.dias || [])
          .slice()
          .sort((a, b) => ((a || 7) - (b || 7)))
          .map((d) => U.DIAS_CURTOS[d])
          .join(' ')}</span>`;
    }
  };
  window.App = App;

  /* ---- menu mobile ---- */
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  function openMenu() {
    sidebar.classList.add('open');
    scrim.classList.add('show');
  }
  function closeMenu() {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  }
  document.getElementById('menu-btn').addEventListener('click', openMenu);
  scrim.addEventListener('click', closeMenu);

  /* ---- ações globais ---- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="novo-agendamento"]');
    if (b) {
      e.preventDefault();
      closeMenu();
      const ag = {};
      if (location.hash.startsWith('#/agenda') && ViewAgenda.state.cursor >= U.today()) ag.data = ViewAgenda.state.cursor;
      UI.agendamentoForm(ag, {
        onSaved: (s) => ViewAgenda.aposSalvar(s)
      });
    }
  });

  /* atalhos: N = novo agendamento, / = buscar */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.modal-wrap')) return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      document.querySelector('[data-action="novo-agendamento"]').click();
    } else if (e.key === '/') {
      const s = view.querySelector('input[type=search]');
      if (s) {
        e.preventDefault();
        s.focus();
      }
    }
  });

  /* ---- navegação com proteção de alterações não salvas ---- */
  window.addEventListener('hashchange', async () => {
    if (skipNext) {
      skipNext = false;
      return;
    }
    if (guard && guard()) {
      const target = location.hash;
      skipNext = true;
      history.replaceState(null, '', currentHash);
      skipNext = false;
      const ok = await UI.confirm('Há alterações não salvas nesta nota. Sair mesmo assim?', { title: 'Sair sem salvar', ok: 'Sair sem salvar', danger: true });
      if (!ok) return;
      guard = null;
      location.hash = target;
      return;
    }
    App.refresh();
  });
  window.addEventListener('beforeunload', (e) => {
    if (guard && guard()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---- start ---- */
  Store.load();
  U.hydrateIcons();
  App.updateBrand();
  if (!location.hash) history.replaceState(null, '', '#/painel');
  // ao abrir o site, a agenda sempre começa em hoje (ignora o dia guardado no endereço)
  if (location.hash.startsWith('#/agenda')) {
    const { params } = App.parse();
    params.delete('d');
    const qs = params.toString();
    history.replaceState(null, '', '#/agenda' + (qs ? '?' + qs : ''));
  }
  App.refresh();

  // atualiza o painel/agenda a cada minuto (linha do "agora")
  setInterval(() => {
    if (document.querySelector('.modal-wrap') || guard) return;
    const r = App.parse().parts[0] || 'painel';
    if ((r === 'painel' || r === 'agenda') && !document.activeElement.matches('input, textarea, select')) App.refresh();
  }, 60000);
})();
