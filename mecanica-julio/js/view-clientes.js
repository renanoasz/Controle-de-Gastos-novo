/* Clientes e veículos */
(function () {
  let busca = '';

  function waMsg(c) {
    const nome = String(c.nome || '').split(' ')[0];
    return `Olá, ${nome}! Aqui é da ${Store.config.nome}.`;
  }
  function waBtn(c, cls = 'btn btn-whatsapp', label = 'WhatsApp') {
    if (!U.digits(c.telefone)) return `<button type="button" class="${cls} is-off" data-wa-sem-tel title="Cliente sem telefone cadastrado">${U.icon('whatsapp')}<span>${label}</span></button>`;
    return `<a class="${cls}" href="${U.waLink(c.telefone, waMsg(c))}" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp">${U.icon('whatsapp')}<span>${label}</span></a>`;
  }

  function renderLista(el) {
    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Cadastro</p>
          <h1>Clientes</h1>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="cli-novo">${U.icon('plus')}<span>Novo cliente</span></button>
        </div>
      </div>
      <div class="filters">
        <div class="search">
          ${U.icon('search')}
          <input type="search" id="cli-busca" placeholder="Buscar por nome, telefone, carro ou placa" value="${U.esc(busca)}">
        </div>
      </div>
      <div id="cli-lista"></div>`;

    const draw = () => {
      const q = U.norm(busca);
      const qp = U.plate(busca);
      const list = Store.all('clientes')
        .filter((c) => {
          if (!q) return true;
          const hay = U.norm([c.nome, c.telefone, c.documento, ...(c.veiculos || []).map((v) => v.modelo + ' ' + v.placa)].join(' '));
          return hay.includes(q) || (qp.length >= 3 && (c.veiculos || []).some((v) => U.plate(v.placa).includes(qp)));
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const box = el.querySelector('#cli-lista');
      if (!list.length) {
        box.innerHTML = UI.empty(
          Store.all('clientes').length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado',
          'Clientes são cadastrados automaticamente quando você agenda um serviço ou emite uma nota.',
          ''
        );
        return;
      }
      box.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th class="hide-sm">Telefone</th><th>Veículos</th><th class="hide-md num">Serviços</th><th class="hide-md">Última visita</th><th class="num hide-sm">Total pago</th><th class="actions">WhatsApp</th></tr></thead>
            <tbody>${list
              .map((c) => {
                const h = Store.historicoCliente(c.id);
                return `
              <tr class="row-link" data-href="#/clientes/${c.id}">
                <td><div class="person"><span class="avatar">${U.esc(U.initials(c.nome))}</span><div class="cell-2"><strong>${U.esc(c.nome)}</strong><span class="show-sm">${U.esc(U.fmtPhone(c.telefone))}</span></div></div></td>
                <td class="hide-sm mono">${U.esc(U.fmtPhone(c.telefone))}</td>
                <td><div class="plates">${(c.veiculos || []).map((v) => `<span title="${U.esc(v.modelo)}">${UI.plate(v.placa) || `<span class="muted">${U.esc(v.modelo)}</span>`}</span>`).join('')}</div></td>
                <td class="hide-md num mono">${h.notas.length}</td>
                <td class="hide-md">${h.ultima ? U.fmtDate(h.ultima) : '<span class="muted">—</span>'}</td>
                <td class="num mono hide-sm">${U.money(h.gasto)}</td>
                <td class="actions">${waBtn(c, 'icon-btn icon-wa', '')}</td>
              </tr>`;
              })
              .join('')}</tbody>
          </table>
        </div>`;
      box.querySelectorAll('.row-link').forEach((tr) =>
        tr.addEventListener('click', (e) => {
          if (e.target.closest('.icon-wa')) return;
          location.hash = tr.dataset.href;
        })
      );
      box.querySelectorAll('[data-wa-sem-tel]').forEach((b) =>
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          const c = Store.get('clientes', b.closest('tr').dataset.href.split('/').pop());
          UI.toast('Cadastre o telefone deste cliente para usar o WhatsApp', 'error');
          clienteForm(c, () => App.refresh());
        })
      );
    };
    draw();
    el.querySelector('#cli-busca').addEventListener(
      'input',
      U.debounce((e) => {
        busca = e.target.value;
        draw();
      }, 150)
    );
    el.querySelector('#cli-novo').addEventListener('click', () => clienteForm(null));
  }

  function clienteForm(c, onSaved) {
    const isNew = !c;
    c = c ? JSON.parse(JSON.stringify(c)) : { nome: '', telefone: '', documento: '', email: '', endereco: '', obs: '', veiculos: [] };
    const m = UI.modal({
      title: isNew ? 'Novo cliente' : 'Editar cliente',
      size: 'modal-md',
      body: `
        <form class="form" id="cli-form" autocomplete="off">
          <div class="grid-2">
            <label class="field">Nome <input name="nome" required value="${U.esc(c.nome)}"></label>
            <label class="field">Telefone / WhatsApp <input name="telefone" inputmode="tel" value="${U.esc(U.fmtPhone(c.telefone))}"></label>
          </div>
          <div class="grid-2">
            <label class="field">CPF / CNPJ <input name="documento" value="${U.esc(c.documento)}"></label>
            <label class="field">E-mail <input name="email" type="email" value="${U.esc(c.email)}"></label>
          </div>
          <label class="field">Endereço <input name="endereco" value="${U.esc(c.endereco)}"></label>
          <label class="field">Anotações <textarea name="obs" rows="2" placeholder="Preferências, histórico, indicações...">${U.esc(c.obs)}</textarea></label>
          ${
            isNew
              ? `<fieldset><legend>Veículo</legend>
                <div class="grid-3">
                  <label class="field">Modelo <input name="v_modelo"></label>
                  <label class="field">Placa <input name="v_placa" class="mono upper" maxlength="8"></label>
                  <label class="field">Ano <input name="v_ano" inputmode="numeric"></label>
                </div></fieldset>`
              : ''
          }
        </form>`,
      footer: `<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-save>${U.icon('check')}<span>Salvar</span></button>`
    });
    const f = m.el.querySelector('#cli-form');
    const save = () => {
      if (!f.reportValidity()) return;
      const e = f.elements;
      const dup = isNew && Store.findCliente(e.nome.value, e.telefone.value);
      if (dup && U.digits(dup.telefone) === U.digits(e.telefone.value) && U.digits(e.telefone.value)) {
        UI.toast('Já existe um cliente com esse nome e telefone', 'error');
        return;
      }
      Object.assign(c, {
        nome: e.nome.value.trim(),
        telefone: U.digits(e.telefone.value),
        documento: e.documento.value.trim(),
        email: e.email.value.trim(),
        endereco: e.endereco.value.trim(),
        obs: e.obs.value.trim()
      });
      if (isNew && (e.v_modelo.value || e.v_placa.value)) {
        c.veiculos.push({ id: U.uid(), modelo: e.v_modelo.value.trim(), placa: U.plate(e.v_placa.value), ano: e.v_ano.value.trim(), cor: '', km: '' });
      }
      const saved = Store.upsert('clientes', c);
      // mantém o nome atualizado nos agendamentos futuros
      Store.all('agendamentos').forEach((a) => {
        if (a.clienteId === saved.id && a.data >= U.today()) a.cliente = { nome: saved.nome, telefone: saved.telefone };
      });
      Store.save();
      UI.toast('Cliente salvo');
      m.close();
      if (onSaved) onSaved(saved);
      else location.hash = `#/clientes/${saved.id}`;
    };
    m.el.querySelector('[data-save]').addEventListener('click', save);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
  }

  function veiculoForm(cliente, v, onSaved) {
    const isNew = !v;
    v = v ? { ...v } : { id: U.uid(), modelo: '', placa: '', ano: '', cor: '', km: '' };
    const m = UI.modal({
      title: isNew ? 'Adicionar veículo' : 'Editar veículo',
      size: 'modal-sm',
      body: `
        <form class="form" id="vei-form" autocomplete="off">
          <label class="field">Marca e modelo <input name="modelo" required value="${U.esc(v.modelo)}" placeholder="Ex.: VW Gol 1.6"></label>
          <div class="grid-2">
            <label class="field">Placa <input name="placa" class="mono upper" maxlength="8" value="${U.esc(U.fmtPlate(v.placa))}"></label>
            <label class="field">Ano <input name="ano" inputmode="numeric" value="${U.esc(v.ano)}"></label>
          </div>
          <div class="grid-2">
            <label class="field">Cor <input name="cor" value="${U.esc(v.cor)}"></label>
            <label class="field">KM <input name="km" class="mono" inputmode="numeric" value="${U.esc(v.km)}"></label>
          </div>
        </form>`,
      footer: `${!isNew ? `<button class="btn btn-ghost-danger" data-del>${U.icon('trash')}<span>Remover</span></button>` : ''}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-save>Salvar</button>`
    });
    const f = m.el.querySelector('#vei-form');
    const save = () => {
      if (!f.reportValidity()) return;
      const e = f.elements;
      Object.assign(v, { modelo: e.modelo.value.trim(), placa: U.plate(e.placa.value), ano: e.ano.value.trim(), cor: e.cor.value.trim(), km: U.digits(e.km.value) });
      const c = Store.get('clientes', cliente.id);
      c.veiculos = c.veiculos || [];
      const i = c.veiculos.findIndex((x) => x.id === v.id);
      if (i >= 0) c.veiculos[i] = v;
      else c.veiculos.push(v);
      Store.save();
      m.close();
      onSaved();
    };
    m.el.querySelector('[data-save]').addEventListener('click', save);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
    const del = m.el.querySelector('[data-del]');
    if (del)
      del.addEventListener('click', async () => {
        if (await UI.confirm('Remover este veículo do cadastro do cliente?', { ok: 'Remover', danger: true })) {
          const c = Store.get('clientes', cliente.id);
          c.veiculos = c.veiculos.filter((x) => x.id !== v.id);
          Store.save();
          m.close();
          onSaved();
        }
      });
  }

  function renderDetalhe(el, id) {
    const c = Store.get('clientes', id);
    if (!c) {
      el.innerHTML = UI.empty('Cliente não encontrado', 'Ele pode ter sido excluído.', `<a class="btn" href="#/clientes">Voltar</a>`);
      return;
    }
    const h = Store.historicoCliente(id);
    const t = U.today();
    const futuros = h.ags.filter((a) => a.data >= t && !['cancelado', 'faltou', 'concluido'].includes(a.status)).reverse();

    el.innerHTML = `
      <div class="page-head">
        <div>
          <a class="back" href="#/clientes">${U.icon('back')}Clientes</a>
          <h1 class="person-title"><span class="avatar avatar-lg">${U.esc(U.initials(c.nome))}</span>${U.esc(c.nome)}</h1>
        </div>
        <div class="page-actions">
          ${waBtn(c)}
          <button class="btn" id="cli-edit">${U.icon('edit')}<span>Editar</span></button>
          <button class="btn" id="cli-agendar">${U.icon('calendar')}<span>Agendar</span></button>
          <a class="btn btn-primary" href="#/notas/nova?cliente=${c.id}">${U.icon('plus')}<span>Nova nota</span></a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-side">
          <section class="card">
            <header class="card-head"><h2>Contato</h2></header>
            <dl class="info">
              <div><dt>Telefone</dt><dd class="mono">${c.telefone ? `<a href="tel:${U.digits(c.telefone)}">${U.esc(U.fmtPhone(c.telefone))}</a>` : '—'}</dd></div>
              ${c.documento ? `<div><dt>CPF/CNPJ</dt><dd class="mono">${U.esc(c.documento)}</dd></div>` : ''}
              ${c.email ? `<div><dt>E-mail</dt><dd>${U.esc(c.email)}</dd></div>` : ''}
              ${c.endereco ? `<div><dt>Endereço</dt><dd>${U.esc(c.endereco)}</dd></div>` : ''}
              <div><dt>Cliente desde</dt><dd>${c.criadoEm ? U.fmtDate(c.criadoEm.slice(0, 10)) : '—'}</dd></div>
            </dl>
            ${c.obs ? `<p class="note">${U.esc(c.obs)}</p>` : ''}
            <div class="contact-actions">
              ${waBtn(c, 'btn btn-whatsapp btn-block', U.digits(c.telefone) ? 'Conversar no WhatsApp' : 'WhatsApp (sem telefone)')}
              ${U.digits(c.telefone) ? `<a class="btn btn-icon" href="tel:${U.digits(c.telefone)}" title="Ligar" aria-label="Ligar">${U.icon('phone')}</a>` : ''}
            </div>
          </section>

          <section class="card">
            <header class="card-head"><h2>Veículos</h2><button class="link" id="vei-add">${U.icon('plus')}Adicionar</button></header>
            ${
              (c.veiculos || []).length
                ? `<ul class="vehicles">${c.veiculos
                    .map(
                      (v) => `
                <li data-v="${v.id}">
                  <span class="veh-ico">${U.icon('car')}</span>
                  <div><strong>${U.esc(v.modelo || 'Veículo')}</strong><span>${[v.ano, v.cor, v.km && Number(v.km).toLocaleString('pt-BR') + ' km'].filter(Boolean).map(U.esc).join(' · ')}</span></div>
                  ${UI.plate(v.placa)}
                </li>`
                    )
                    .join('')}</ul>`
                : '<p class="muted small">Nenhum veículo cadastrado.</p>'
            }
          </section>

          <section class="card stats-card">
            <div><span>Total pago</span><strong class="mono">${U.money(h.gasto)}</strong></div>
            <div><span>Notas</span><strong class="mono">${h.notas.length}</strong></div>
            <div><span>Visitas</span><strong class="mono">${h.ags.filter((a) => a.status === 'concluido').length}</strong></div>
          </section>

          <button class="link link-danger" id="cli-del">${U.icon('trash')}Excluir cliente</button>
        </div>

        <div class="detail-main">
          ${
            futuros.length
              ? `<section class="card">
            <header class="card-head"><h2>Próximos agendamentos</h2></header>
            <ul class="ag-list">${futuros
              .map(
                (a) => `
              <li data-ag="${a.id}">
                <div class="ag-time"><strong>${U.esc(U.relDay(a.data))}</strong><span>${a.hora}</span></div>
                <div class="ag-main"><strong>${U.esc(a.servico)}</strong><span>${U.esc(a.veiculo?.modelo || '')}</span></div>
                ${UI.badge(Store.STATUS_AG, a.status)}
              </li>`
              )
              .join('')}</ul>
          </section>`
              : ''
          }

          <section class="card">
            <header class="card-head"><h2>Histórico de serviços</h2></header>
            ${
              h.notas.length
                ? `<div class="table-wrap flat"><table class="table">
                <thead><tr><th>Nº</th><th>Data</th><th>Veículo</th><th class="hide-sm">Serviços</th><th>Situação</th><th class="num">Total</th></tr></thead>
                <tbody>${h.notas
                  .map(
                    (n) => `
                  <tr class="row-link" data-href="#/notas/${n.id}">
                    <td class="mono">${U.numeroNota(n.numero)}</td>
                    <td>${U.fmtDate(n.data)}</td>
                    <td>${UI.plate(n.veiculo?.placa) || U.esc(n.veiculo?.modelo || '')}</td>
                    <td class="hide-sm muted clamp">${U.esc((n.servicos || []).map((s) => s.desc).filter(Boolean).join(', ') || n.defeito || '—')}</td>
                    <td>${UI.badge(Store.STATUS_NOTA, n.status)}</td>
                    <td class="num mono">${U.money(Store.totais(n).total)}</td>
                  </tr>`
                  )
                  .join('')}</tbody></table></div>`
                : '<p class="muted small pad">Nenhuma nota emitida para este cliente.</p>'
            }
          </section>

          ${
            h.ags.length
              ? `<section class="card">
            <header class="card-head"><h2>Visitas agendadas</h2></header>
            <ul class="ag-list compact">${h.ags
              .slice(0, 12)
              .map(
                (a) => `
              <li data-ag="${a.id}" class="${['cancelado', 'faltou'].includes(a.status) ? 'is-off' : ''}">
                <div class="ag-time"><strong>${U.fmtDate(a.data)}</strong><span>${a.hora}</span></div>
                <div class="ag-main"><strong>${U.esc(a.servico)}</strong><span>${U.esc(a.veiculo?.modelo || '')}</span></div>
                ${UI.badge(Store.STATUS_AG, a.status)}
              </li>`
              )
              .join('')}</ul>
          </section>`
              : ''
          }
        </div>
      </div>`;

    const refresh = () => App.refresh();
    el.querySelector('#cli-edit').addEventListener('click', () => clienteForm(c, refresh));
    el.querySelectorAll('[data-wa-sem-tel]').forEach((b) =>
      b.addEventListener('click', () => {
        UI.toast('Cadastre o telefone deste cliente para usar o WhatsApp', 'error');
        clienteForm(c, refresh);
      })
    );
    el.querySelector('#cli-agendar').addEventListener('click', () => {
      const v = (c.veiculos || [])[0] || {};
      UI.agendamentoForm({ clienteId: c.id, cliente: { nome: c.nome, telefone: c.telefone }, veiculo: { modelo: v.modelo || '', placa: v.placa || '' } }, { onSaved: refresh });
    });
    el.querySelector('#vei-add').addEventListener('click', () => veiculoForm(c, null, refresh));
    el.querySelectorAll('[data-v]').forEach((li) => li.addEventListener('click', () => veiculoForm(c, c.veiculos.find((v) => v.id === li.dataset.v), refresh)));
    el.querySelectorAll('[data-ag]').forEach((li) => li.addEventListener('click', () => UI.agendamentoForm(Store.get('agendamentos', li.dataset.ag), { onSaved: refresh })));
    el.querySelectorAll('.row-link').forEach((tr) => tr.addEventListener('click', () => (location.hash = tr.dataset.href)));
    el.querySelector('#cli-del').addEventListener('click', async () => {
      const msg = h.notas.length
        ? `Este cliente tem ${h.notas.length} nota(s). As notas continuam salvas, mas o cadastro será removido. Continuar?`
        : 'Excluir este cliente?';
      if (await UI.confirm(msg, { title: 'Excluir cliente', ok: 'Excluir', danger: true })) {
        Store.remove('clientes', c.id);
        UI.toast('Cliente excluído');
        location.hash = '#/clientes';
      }
    });
  }

  window.ViewClientes = { renderLista, renderDetalhe, title: 'Clientes' };
})();
