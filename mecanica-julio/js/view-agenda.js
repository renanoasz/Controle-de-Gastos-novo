/* Agenda: visão de dia, semana e lista */
(function () {
  const state = {
    modo: null,
    cursor: U.today(),
    filtroLista: 'proximos',
    statusLista: '',
    busca: ''
  };
  const PPM = 1.15; // pixels por minuto

  function render(el, params) {
    if (params.get('v')) state.modo = params.get('v');
    if (params.get('d')) state.cursor = params.get('d');
    if (!state.modo) state.modo = window.matchMedia('(max-width: 760px)').matches ? 'dia' : 'semana';

    const titulo = tituloPeriodo();
    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Agenda</p>
          <h1>${U.esc(titulo)}</h1>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" data-action="novo-agendamento">${U.icon('plus')}<span>Agendar</span></button>
        </div>
      </div>

      <div class="toolbar">
        <div class="btn-group">
          <button class="btn btn-icon" data-nav="-1" aria-label="Anterior">${U.icon('left')}</button>
          <button class="btn" data-nav="0">Hoje</button>
          <button class="btn btn-icon" data-nav="1" aria-label="Próximo">${U.icon('right')}</button>
        </div>
        <input type="date" class="input-date" id="ag-goto" value="${state.cursor}" aria-label="Ir para data">
        <span class="spacer"></span>
        <div class="segmented" role="tablist">
          ${[
            ['dia', 'Dia'],
            ['semana', 'Semana'],
            ['lista', 'Lista']
          ]
            .map(([k, l]) => `<button role="tab" class="${state.modo === k ? 'active' : ''}" data-modo="${k}">${l}</button>`)
            .join('')}
        </div>
      </div>

      <div id="agenda-body"></div>`;

    const body = el.querySelector('#agenda-body');
    if (state.modo === 'lista') renderLista(body);
    else renderGrade(body);

    el.querySelectorAll('[data-modo]').forEach((b) =>
      b.addEventListener('click', () => {
        state.modo = b.dataset.modo;
        go();
      })
    );
    el.querySelectorAll('[data-nav]').forEach((b) =>
      b.addEventListener('click', () => {
        const n = Number(b.dataset.nav);
        if (n === 0) state.cursor = U.today();
        else {
          const step = state.modo === 'semana' ? 7 : state.modo === 'lista' ? 7 : 1;
          state.cursor = U.addDays(state.cursor, n * step);
          if (state.modo === 'dia') state.cursor = pularFechado(state.cursor, n);
        }
        go();
      })
    );
    el.querySelector('#ag-goto').addEventListener('change', (e) => {
      if (e.target.value) {
        state.cursor = e.target.value;
        go();
      }
    });
  }

  /* mostra o dia de um agendamento recém-salvo */
  function aposSalvar(ag) {
    if (ag && ag.data && location.hash.startsWith('#/agenda')) {
      state.cursor = ag.data;
      if (state.modo === 'lista') App.refresh();
      else go();
    } else App.refresh();
  }

  function go() {
    const q = new URLSearchParams({ v: state.modo, d: state.cursor });
    const h = `#/agenda?${q}`;
    if (location.hash === h) App.refresh();
    else location.hash = h;
  }

  function pularFechado(iso, dir) {
    const dias = Store.config.dias || [];
    for (let i = 0; i < 7 && !dias.includes(U.weekday(iso)); i++) iso = U.addDays(iso, dir);
    return iso;
  }

  function tituloPeriodo() {
    const c = state.cursor;
    if (state.modo === 'dia') {
      const s = U.fmtDateLong(c);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    if (state.modo === 'semana') {
      const ini = U.startOfWeek(c);
      const fim = U.addDays(ini, 6);
      const a = U.fromISO(ini);
      const b = U.fromISO(fim);
      if (a.getMonth() === b.getMonth()) return `${a.getDate()} a ${b.getDate()} de ${U.MESES[b.getMonth()]}`;
      return `${a.getDate()} de ${U.MESES_CURTOS[a.getMonth()]} a ${b.getDate()} de ${U.MESES_CURTOS[b.getMonth()]}`;
    }
    return 'Todos os agendamentos';
  }

  function diasVisiveis() {
    if (state.modo === 'dia') return [state.cursor];
    const ini = U.startOfWeek(state.cursor);
    const abertos = Store.config.dias || [1, 2, 3, 4, 5, 6];
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ini, i);
      const tem = Store.agendamentosDoDia(d).length > 0;
      if (abertos.includes(U.weekday(d)) || tem) out.push(d);
    }
    return out;
  }

  /* ---------- grade (dia/semana) ---------- */
  function renderGrade(body) {
    const cfg = Store.config;
    const dias = diasVisiveis();
    const t = U.today();
    let ini = U.timeToMin(cfg.abertura);
    let fim = U.timeToMin(cfg.fechamento);
    dias.forEach((d) =>
      Store.agendamentosDoDia(d).forEach((a) => {
        const s = U.timeToMin(a.hora);
        ini = Math.min(ini, Math.floor(s / 60) * 60);
        fim = Math.max(fim, Math.ceil((s + (Number(a.duracao) || 60)) / 60) * 60);
      })
    );
    fim = Math.min(fim, 24 * 60);
    const altura = (fim - ini) * PPM;
    const horas = [];
    for (let m = Math.ceil(ini / 60) * 60; m < fim; m += 60) horas.push(m);

    const strip =
      state.modo === 'dia'
        ? `<div class="day-strip">${Array.from({ length: 7 }, (_, i) => U.addDays(U.startOfWeek(state.cursor), i))
            .map((d) => {
              const n = Store.agendamentosDoDia(d).filter((a) => a.status !== 'cancelado').length;
              return `<button class="day-pill ${d === state.cursor ? 'active' : ''} ${d === t ? 'today' : ''} ${(cfg.dias || []).includes(U.weekday(d)) ? '' : 'closed'}" data-dia="${d}">
                  <span>${U.DIAS_CURTOS[U.weekday(d)]}</span><strong>${U.fromISO(d).getDate()}</strong><em>${n ? n : ''}</em></button>`;
            })
            .join('')}</div>`
        : '';

    body.innerHTML = `
      ${strip}
      <div class="cal ${state.modo === 'dia' ? 'cal-day' : ''}" style="--cols:${dias.length}">
        <div class="cal-head">
          <div class="cal-corner"></div>
          ${dias
            .map((d) => {
              const n = Store.agendamentosDoDia(d).filter((a) => !['cancelado', 'faltou'].includes(a.status)).length;
              return `<button class="cal-dayhead ${d === t ? 'today' : ''}" data-dia="${d}">
                <span>${U.DIAS_CURTOS[U.weekday(d)]}</span>
                <strong>${U.fromISO(d).getDate()}</strong>
                <em>${n ? `${n} carro${n > 1 ? 's' : ''}` : ''}</em>
              </button>`;
            })
            .join('')}
        </div>
        <div class="cal-scroll">
          <div class="cal-body" style="height:${altura}px">
            <div class="cal-times">${horas.map((m) => `<span style="top:${(m - ini) * PPM}px">${U.minToTime(m)}</span>`).join('')}</div>
            ${dias
              .map((d) => {
                const fechado = !(cfg.dias || []).includes(U.weekday(d));
                const evs = layout(Store.agendamentosDoDia(d));
                let nowLine = '';
                if (d === t) {
                  const nm = U.nowMin();
                  if (nm >= ini && nm <= fim) nowLine = `<div class="now-line" style="top:${(nm - ini) * PPM}px"></div>`;
                }
                return `<div class="cal-col ${fechado ? 'closed' : ''} ${d === t ? 'today' : ''}" data-dia="${d}" style="--hour:${60 * PPM}px; background-position-y:${((Math.ceil(ini / 60) * 60 - ini) * PPM).toFixed(1)}px">
                  ${nowLine}
                  ${evs
                    .map(({ a, lane, lanes }) => {
                      const s = U.timeToMin(a.hora);
                      const dur = Number(a.duracao) || 60;
                      const h = Math.max(dur * PPM - 3, 24);
                      const compact = h < 52;
                      const short = !compact && h < 95;
                      return `<button class="ev ${Store.STATUS_AG[a.status]?.cls || ''} ${compact ? 'ev-compact' : ''} ${short ? 'ev-short' : ''}" data-ag="${a.id}"
                          style="top:${(s - ini) * PPM + 1}px;height:${h}px;left:calc(${(lane / lanes) * 100}% + 3px);width:calc(${100 / lanes}% - 6px)">
                          <span class="ev-time">${a.hora}–${U.minToTime(s + dur)}</span>
                          <strong class="ev-title">${U.esc(a.cliente?.nome || '')}</strong>
                          <span class="ev-sub">${U.esc(a.servico)}</span>
                          ${a.veiculo?.placa && !compact ? `<span class="ev-plate">${U.esc(U.fmtPlate(a.veiculo.placa))}</span>` : ''}
                        </button>`;
                    })
                    .join('')}
                </div>`;
              })
              .join('')}
          </div>
        </div>
      </div>
      <p class="hint">Clique em um horário vazio para agendar. Clique em um serviço para editar, mudar a situação ou gerar a nota.</p>`;

    body.querySelectorAll('.cal-col').forEach((col) =>
      col.addEventListener('click', (e) => {
        if (e.target.closest('.ev')) return;
        const r = col.getBoundingClientRect();
        const y = e.clientY - r.top;
        const step = Number(cfg.intervalo) || 30;
        let min = ini + Math.floor(y / PPM / step) * step;
        min = Math.max(ini, Math.min(min, fim - step));
        UI.agendamentoForm({ data: col.dataset.dia, hora: U.minToTime(min) }, { onSaved: aposSalvar });
      })
    );
    body.querySelectorAll('.ev').forEach((b) =>
      b.addEventListener('click', () => UI.agendamentoForm(Store.get('agendamentos', b.dataset.ag), { onSaved: aposSalvar }))
    );
    body.querySelectorAll('[data-dia]:not(.cal-col)').forEach((b) =>
      b.addEventListener('click', () => {
        state.cursor = b.dataset.dia;
        state.modo = 'dia';
        go();
      })
    );

    // rola até o horário atual (ou abertura)
    const sc = body.querySelector('.cal-scroll');
    if (sc && dias.includes(t)) {
      const y = (U.nowMin() - ini) * PPM;
      if (y > sc.clientHeight - 80) sc.scrollTop = Math.max(0, y - sc.clientHeight / 2);
    }
  }

  /* distribui eventos sobrepostos em colunas lado a lado */
  function layout(list) {
    const evs = list
      .map((a) => ({ a, s: U.timeToMin(a.hora), e: U.timeToMin(a.hora) + (Number(a.duracao) || 60), lane: 0, lanes: 1 }))
      .sort((x, y) => x.s - y.s || y.e - x.e);
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const lanesEnd = [];
      cluster.forEach((ev) => {
        let l = lanesEnd.findIndex((end) => end <= ev.s);
        if (l < 0) {
          l = lanesEnd.length;
          lanesEnd.push(0);
        }
        lanesEnd[l] = ev.e;
        ev.lane = l;
      });
      cluster.forEach((ev) => (ev.lanes = lanesEnd.length));
      cluster = [];
    };
    evs.forEach((ev) => {
      if (ev.s >= clusterEnd && cluster.length) flush();
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.e);
    });
    flush();
    return evs;
  }

  /* ---------- lista ---------- */
  function renderLista(body) {
    body.innerHTML = `
      <div class="filters">
        <div class="search">
          ${U.icon('search')}
          <input type="search" id="ag-busca" placeholder="Buscar cliente, placa ou serviço" value="${U.esc(state.busca)}">
        </div>
        <select id="ag-periodo" class="select">
          <option value="proximos" ${state.filtroLista === 'proximos' ? 'selected' : ''}>Próximos</option>
          <option value="passados" ${state.filtroLista === 'passados' ? 'selected' : ''}>Anteriores</option>
          <option value="todos" ${state.filtroLista === 'todos' ? 'selected' : ''}>Todos</option>
        </select>
        <select id="ag-status" class="select">
          <option value="">Todas as situações</option>
          ${Object.entries(Store.STATUS_AG)
            .map(([k, v]) => `<option value="${k}" ${state.statusLista === k ? 'selected' : ''}>${v.label}</option>`)
            .join('')}
        </select>
      </div>
      <div id="ag-lista"></div>`;

    const draw = () => {
      const t = U.today();
      const q = U.norm(state.busca);
      let list = Store.all('agendamentos').filter((a) => {
        if (state.filtroLista === 'proximos' && a.data < t) return false;
        if (state.filtroLista === 'passados' && a.data >= t) return false;
        if (state.statusLista && a.status !== state.statusLista) return false;
        if (q) {
          const hay = U.norm([a.cliente?.nome, a.servico, a.veiculo?.modelo, a.veiculo?.placa, a.obs].join(' '));
          if (!hay.includes(q) && !U.plate(a.veiculo?.placa).includes(U.plate(state.busca))) return false;
        }
        return true;
      });
      const asc = state.filtroLista !== 'passados';
      list.sort((a, b) => (asc ? 1 : -1) * (a.data + a.hora).localeCompare(b.data + b.hora));
      const box = body.querySelector('#ag-lista');
      if (!list.length) {
        box.innerHTML = UI.empty('Nenhum agendamento encontrado', 'Ajuste os filtros ou agende um novo serviço.', `<button class="btn btn-primary" data-action="novo-agendamento">${U.icon('plus')}<span>Agendar</span></button>`);
        return;
      }
      const groups = {};
      list.forEach((a) => (groups[a.data] = groups[a.data] || []).push(a));
      box.innerHTML = Object.entries(groups)
        .map(
          ([d, items]) => `
        <section class="day-group">
          <h3><span>${U.esc(U.relDay(d))}</span><small>${U.fmtDate(d)}</small></h3>
          <ul class="ag-list">${items
            .map(
              (a) => `
            <li data-ag="${a.id}" class="${['cancelado', 'faltou'].includes(a.status) ? 'is-off' : ''}">
              <div class="ag-time"><strong>${a.hora}</strong><span>${U.fmtDur(a.duracao)}</span></div>
              <div class="ag-main">
                <strong>${U.esc(a.servico)}</strong>
                <span>${U.esc(a.cliente?.nome || '')}${a.veiculo?.modelo ? ' · ' + U.esc(a.veiculo.modelo) : ''}</span>
              </div>
              ${UI.plate(a.veiculo?.placa)}
              ${UI.badge(Store.STATUS_AG, a.status)}
              ${a.notaId ? `<span class="tag" title="Nota vinculada">${U.icon('receipt')}</span>` : ''}
            </li>`
            )
            .join('')}</ul>
        </section>`
        )
        .join('');
      box.querySelectorAll('[data-ag]').forEach((li) =>
        li.addEventListener('click', () => UI.agendamentoForm(Store.get('agendamentos', li.dataset.ag), { onSaved: aposSalvar }))
      );
    };
    draw();
    body.querySelector('#ag-busca').addEventListener(
      'input',
      U.debounce((e) => {
        state.busca = e.target.value;
        draw();
      }, 150)
    );
    body.querySelector('#ag-periodo').addEventListener('change', (e) => {
      state.filtroLista = e.target.value;
      draw();
    });
    body.querySelector('#ag-status').addEventListener('change', (e) => {
      state.statusLista = e.target.value;
      draw();
    });
  }

  window.ViewAgenda = { render, title: 'Agenda', state, aposSalvar };
})();
