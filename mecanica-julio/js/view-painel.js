/* Painel: visão geral do dia e do mês */
(function () {
  function render(el) {
    const t = U.today();
    const hoje = Store.agendamentosDoDia(t);
    const ativosHoje = hoje.filter((a) => a.status !== 'cancelado' && a.status !== 'faltou');
    const entregues = hoje.filter((a) => a.status === 'concluido').length;
    const ini = U.startOfWeek(t);
    const fimSemana = U.addDays(ini, 6);
    const semana = Store.all('agendamentos').filter((a) => a.data >= ini && a.data <= fimSemana && a.status !== 'cancelado');

    const mes = U.monthKey(t);
    const notas = Store.all('notas');
    const pagasMes = notas.filter((n) => n.status === 'paga' && U.monthKey(n.pagaEm || n.data) === mes);
    const fatMes = pagasMes.reduce((s, n) => s + Store.totais(n).total, 0);
    const pecasMes = pagasMes.reduce((s, n) => s + Store.totais(n).pecas, 0);
    const moMes = pagasMes.reduce((s, n) => s + Store.totais(n).servicos, 0);
    const abertas = notas.filter((n) => n.status === 'aberta');
    const aReceber = abertas.reduce((s, n) => s + Store.totais(n).total, 0);
    const orcamentos = notas.filter((n) => n.status === 'orcamento');
    const ticket = pagasMes.length ? fatMes / pagasMes.length : 0;

    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const mesAnt = U.toISO(prev).slice(0, 7);
    const fatAnt = notas
      .filter((n) => n.status === 'paga' && U.monthKey(n.pagaEm || n.data) === mesAnt)
      .reduce((s, n) => s + Store.totais(n).total, 0);
    const variacao = fatAnt ? ((fatMes - fatAnt) / fatAnt) * 100 : null;

    const proximos = Store.all('agendamentos')
      .filter((a) => a.data > t && a.data <= U.addDays(t, 7) && !['cancelado', 'faltou', 'concluido'].includes(a.status))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .slice(0, 6);

    const recentes = notas
      .slice()
      .sort((a, b) => (b.data + String(b.numero).padStart(6, '0')).localeCompare(a.data + String(a.numero).padStart(6, '0')))
      .slice(0, 6);

    const nowMin = U.nowMin();
    const vazio = !Store.all('clientes').length && !notas.length;

    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">${U.esc(U.fmtDateLong(t))}</p>
          <h1>Painel da oficina</h1>
        </div>
        <div class="page-actions">
          <a class="btn" href="#/agenda">${U.icon('calendar')}<span>Ver agenda</span></a>
          <button class="btn btn-primary" data-action="novo-agendamento">${U.icon('plus')}<span>Agendar</span></button>
        </div>
      </div>

      ${
        vazio
          ? `<div class="callout">
              <div>
                <strong>Oficina sem dados ainda.</strong>
                <span>Comece agendando um serviço ou carregue alguns dados de exemplo para conhecer o sistema.</span>
              </div>
              <button class="btn btn-dark" id="btn-exemplos">Carregar exemplos</button>
            </div>`
          : ''
      }

      <section class="kpis">
        <div class="kpi">
          <span class="kpi-label">Carros hoje</span>
          <strong class="kpi-value">${ativosHoje.length}</strong>
          <span class="kpi-sub">${entregues} entregue${entregues === 1 ? '' : 's'} · ${ativosHoje.length - entregues} na fila</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Agendados na semana</span>
          <strong class="kpi-value">${semana.length}</strong>
          <span class="kpi-sub">${U.fmtDateShort(ini)} a ${U.fmtDateShort(fimSemana)}</span>
        </div>
        <div class="kpi kpi-accent">
          <span class="kpi-label">Faturado em ${U.MESES[new Date().getMonth()]}</span>
          <strong class="kpi-value">${U.money(fatMes)}</strong>
          <span class="kpi-sub">${
            variacao === null ? `${pagasMes.length} nota${pagasMes.length === 1 ? '' : 's'} paga${pagasMes.length === 1 ? '' : 's'}` : `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(0)}% vs. mês anterior`
          }</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">A receber</span>
          <strong class="kpi-value">${U.money(aReceber)}</strong>
          <span class="kpi-sub">${abertas.length} nota${abertas.length === 1 ? '' : 's'} em aberto · ${orcamentos.length} orçamento${orcamentos.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      <div class="dash-grid">
        <section class="panel">
          <header class="panel-head">
            <h2>Hoje no box</h2>
            <a class="link" href="#/agenda?v=dia">Abrir dia ${U.icon('arrow')}</a>
          </header>
          ${
            hoje.length
              ? `<ol class="timeline">${hoje
                  .map((a) => {
                    const ini = U.timeToMin(a.hora);
                    const fim = ini + (Number(a.duracao) || 60);
                    const agora = nowMin >= ini && nowMin < fim;
                    return `
                  <li class="tl-item ${agora ? 'is-now' : ''} ${['cancelado', 'faltou'].includes(a.status) ? 'is-off' : ''}" data-ag="${a.id}">
                    <div class="tl-time"><strong>${a.hora}</strong><span>${U.minToTime(fim)}</span></div>
                    <div class="tl-body">
                      <div class="tl-top">
                        <strong>${U.esc(a.servico)}</strong>
                        ${UI.badge(Store.STATUS_AG, a.status)}
                      </div>
                      <div class="tl-meta">
                        <span>${U.esc(a.cliente?.nome || '')}</span>
                        ${a.veiculo?.modelo ? `<span>${U.esc(a.veiculo.modelo)}</span>` : ''}
                        ${UI.plate(a.veiculo?.placa)}
                      </div>
                    </div>
                    <div class="tl-actions">
                      ${nextStatusBtn(a)}
                    </div>
                  </li>`;
                  })
                  .join('')}</ol>`
              : `<div class="panel-empty">Nenhum carro agendado para hoje. <button class="link" data-action="novo-agendamento">Agendar agora</button></div>`
          }
        </section>

        <div class="dash-side">
          <section class="panel">
            <header class="panel-head">
              <h2>Próximos 7 dias</h2>
              <a class="link" href="#/agenda?v=lista">Lista ${U.icon('arrow')}</a>
            </header>
            ${
              proximos.length
                ? `<ul class="mini-list">${proximos
                    .map(
                      (a) => `
                <li data-ag="${a.id}">
                  <div class="mini-date"><span>${U.DIAS_CURTOS[U.weekday(a.data)]}</span><strong>${U.fromISO(a.data).getDate()}</strong></div>
                  <div class="mini-body">
                    <strong>${U.esc(a.cliente?.nome || '')}</strong>
                    <span>${a.hora} · ${U.esc(a.servico)}</span>
                  </div>
                  ${UI.plate(a.veiculo?.placa)}
                </li>`
                    )
                    .join('')}</ul>`
                : `<div class="panel-empty">Nada marcado para os próximos dias.</div>`
            }
          </section>

          <section class="panel">
            <header class="panel-head"><h2>Resumo do mês</h2></header>
            <dl class="summary">
              <div><dt>Notas pagas</dt><dd>${pagasMes.length}</dd></div>
              <div><dt>Ticket médio</dt><dd>${U.money(ticket)}</dd></div>
              <div><dt>Em peças</dt><dd>${U.money(pecasMes)}</dd></div>
              <div><dt>Em mão de obra</dt><dd>${U.money(moMes)}</dd></div>
            </dl>
            ${
              fatMes
                ? `<div class="split" title="Peças × mão de obra">
                    <span style="width:${((pecasMes / (pecasMes + moMes || 1)) * 100).toFixed(1)}%"></span>
                  </div>
                  <div class="split-legend"><span><i class="sw sw-a"></i>Peças ${((pecasMes / (pecasMes + moMes || 1)) * 100).toFixed(0)}%</span><span><i class="sw sw-b"></i>Mão de obra ${((moMes / (pecasMes + moMes || 1)) * 100).toFixed(0)}%</span></div>`
                : ''
            }
          </section>
        </div>
      </div>

      <section class="panel">
        <header class="panel-head">
          <h2>Notas recentes</h2>
          <a class="link" href="#/notas">Todas as notas ${U.icon('arrow')}</a>
        </header>
        ${
          recentes.length
            ? `<div class="table-wrap"><table class="table">
                <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th class="hide-sm">Veículo</th><th>Situação</th><th class="num">Total</th></tr></thead>
                <tbody>${recentes
                  .map(
                    (n) => `
                  <tr class="row-link" data-href="#/notas/${n.id}">
                    <td class="mono">${U.numeroNota(n.numero)}</td>
                    <td>${U.fmtDate(n.data)}</td>
                    <td>${U.esc(n.cliente?.nome || '—')}</td>
                    <td class="hide-sm">${U.esc(n.veiculo?.modelo || '')} ${UI.plate(n.veiculo?.placa)}</td>
                    <td>${UI.badge(Store.STATUS_NOTA, n.status)}</td>
                    <td class="num mono">${U.money(Store.totais(n).total)}</td>
                  </tr>`
                  )
                  .join('')}</tbody></table></div>`
            : `<div class="panel-empty">Nenhuma nota emitida ainda. <a class="link" href="#/notas/nova">Criar a primeira</a></div>`
        }
      </section>`;

    el.querySelectorAll('[data-ag]').forEach((li) =>
      li.addEventListener('click', (e) => {
        if (e.target.closest('[data-next]')) return;
        UI.agendamentoForm(Store.get('agendamentos', li.dataset.ag), { onSaved: () => App.refresh() });
      })
    );
    el.querySelectorAll('[data-next]').forEach((b) =>
      b.addEventListener('click', () => {
        const a = Store.get('agendamentos', b.dataset.id);
        a.status = b.dataset.next;
        Store.upsert('agendamentos', a);
        UI.toast(`${a.cliente?.nome?.split(' ')[0] || 'Agendamento'}: ${Store.STATUS_AG[a.status].label.toLowerCase()}`);
        App.refresh();
      })
    );
    el.querySelectorAll('.row-link').forEach((tr) => tr.addEventListener('click', () => (location.hash = tr.dataset.href)));
    const ex = el.querySelector('#btn-exemplos');
    if (ex)
      ex.addEventListener('click', () => {
        Store.exemplos();
        UI.toast('Dados de exemplo carregados');
        App.refresh();
      });
  }

  function nextStatusBtn(a) {
    const flow = { agendado: ['andamento', 'Iniciar'], confirmado: ['andamento', 'Iniciar'], andamento: ['pronto', 'Pronto'], pronto: ['concluido', 'Entregar'] };
    const n = flow[a.status];
    if (!n) return '';
    return `<button class="btn btn-sm" data-next="${n[0]}" data-id="${a.id}">${U.esc(n[1])}</button>`;
  }

  window.ViewPainel = { render, title: 'Painel' };
})();
