/* Componentes de interface: modal, toast, confirmação, badges, formulário de agendamento */
(function () {
  const UI = {
    /* ---------- toast ---------- */
    toast(msg, type = 'ok') {
      const root = document.getElementById('toast-root');
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `${U.icon(type === 'error' ? 'alert' : 'check')}<span>${U.esc(msg)}</span>`;
      root.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 250);
      }, 2800);
    },

    /* ---------- modal ---------- */
    modal({ title, body, footer = '', size = '', onClose } = {}) {
      const root = document.getElementById('modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `
        <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
          <header class="modal-head">
            <h2>${U.esc(title)}</h2>
            <button class="icon-btn" data-close aria-label="Fechar">${U.icon('x')}</button>
          </header>
          <div class="modal-body">${body}</div>
          ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
        </div>`;
      root.appendChild(wrap);
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => wrap.classList.add('show'));

      const close = () => {
        wrap.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => {
          wrap.remove();
          if (!root.children.length) document.body.classList.remove('no-scroll');
        }, 180);
        onClose && onClose();
      };
      const onKey = (e) => {
        if (e.key === 'Escape' && root.lastElementChild === wrap) close();
      };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('mousedown', (e) => {
        if (e.target === wrap) close();
      });
      wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
      const first = wrap.querySelector('input:not([type=hidden]), select, textarea');
      if (first && window.matchMedia('(min-width: 760px)').matches) setTimeout(() => first.focus(), 60);
      return { el: wrap, close };
    },

    confirm(msg, { title = 'Confirmar', ok = 'Confirmar', danger = false } = {}) {
      return new Promise((resolve) => {
        let done = false;
        const m = UI.modal({
          title,
          size: 'modal-sm',
          body: `<p class="confirm-text">${U.esc(msg)}</p>`,
          footer: `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-ok>${U.esc(ok)}</button>`,
          onClose: () => !done && resolve(false)
        });
        m.el.querySelector('[data-ok]').addEventListener('click', () => {
          done = true;
          resolve(true);
          m.close();
        });
      });
    },

    badge(map, status) {
      const s = map[status] || { label: status, cls: '' };
      return `<span class="badge ${s.cls}">${U.esc(s.label)}</span>`;
    },

    plate(p) {
      const f = U.fmtPlate(p);
      return f ? `<span class="plate">${U.esc(f)}</span>` : '';
    },

    empty(title, text, action = '') {
      return `<div class="empty"><div class="empty-mark">${U.icon('wrench')}</div><h3>${U.esc(title)}</h3><p>${U.esc(text)}</p>${action}</div>`;
    },

    datalistClientes() {
      return `<datalist id="dl-clientes">${Store.all('clientes')
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((c) => `<option value="${U.esc(c.nome)}">${U.esc(U.fmtPhone(c.telefone))}</option>`)
        .join('')}</datalist>`;
    },

    datalistCatalogo(tipo, id) {
      return `<datalist id="${id}">${Store.catalogo(tipo)
        .map((i) => `<option value="${U.esc(i.desc)}">${U.money(i.preco)}</option>`)
        .join('')}</datalist>`;
    },

    horarios() {
      const c = Store.config;
      const ini = U.timeToMin(c.abertura);
      const fim = U.timeToMin(c.fechamento);
      const step = Number(c.intervalo) || 30;
      const out = [];
      for (let m = ini; m < fim; m += step) out.push(U.minToTime(m));
      return out;
    },

    /* ---------- Formulário de agendamento (modal) ---------- */
    agendamentoForm(ag = {}, { onSaved } = {}) {
      const isNew = !ag.id;
      const a = {
        data: U.today(),
        hora: '08:00',
        duracao: 60,
        status: 'agendado',
        cliente: { nome: '', telefone: '' },
        veiculo: { modelo: '', placa: '' },
        servico: '',
        obs: '',
        ...JSON.parse(JSON.stringify(ag))
      };
      a.cliente = a.cliente || { nome: '', telefone: '' };
      a.veiculo = a.veiculo || { modelo: '', placa: '' };

      const horas = UI.horarios();
      if (a.hora && !horas.includes(a.hora)) horas.push(a.hora), horas.sort();
      const duracoes = [30, 60, 90, 120, 180, 240, 300, 360, 480];
      if (!duracoes.includes(Number(a.duracao))) duracoes.push(Number(a.duracao)), duracoes.sort((x, y) => x - y);

      const body = `
        <form class="form" id="ag-form" autocomplete="off">
          <fieldset>
            <legend>Cliente</legend>
            <div class="grid-2">
              <label class="field">Nome
                <input name="nome" list="dl-clientes" required value="${U.esc(a.cliente.nome)}" placeholder="Nome do cliente">
              </label>
              <label class="field">Telefone / WhatsApp
                <input name="telefone" inputmode="tel" value="${U.esc(U.fmtPhone(a.cliente.telefone))}" placeholder="(11) 90000-0000">
              </label>
            </div>
            <div class="grid-2">
              <label class="field">Veículo
                <input name="modelo" list="dl-veiculos" value="${U.esc(a.veiculo.modelo)}" placeholder="Ex.: Fiat Argo 1.3">
              </label>
              <label class="field">Placa
                <input name="placa" class="mono upper" maxlength="8" value="${U.esc(U.fmtPlate(a.veiculo.placa))}" placeholder="ABC1D23">
              </label>
            </div>
            <datalist id="dl-veiculos"></datalist>
          </fieldset>

          <fieldset>
            <legend>Serviço</legend>
            <label class="field">O que será feito
              <input name="servico" list="dl-servicos" required value="${U.esc(a.servico)}" placeholder="Ex.: Troca de óleo e filtros">
            </label>
            <div class="grid-3">
              <label class="field">Data
                <input type="date" name="data" required value="${U.esc(a.data)}">
              </label>
              <label class="field">Horário
                <select name="hora">${horas.map((h) => `<option ${h === a.hora ? 'selected' : ''}>${h}</option>`).join('')}</select>
              </label>
              <label class="field">Tempo previsto
                <select name="duracao">${duracoes.map((d) => `<option value="${d}" ${d === Number(a.duracao) ? 'selected' : ''}>${U.fmtDur(d)}</option>`).join('')}</select>
              </label>
            </div>
            <div class="conflict" id="ag-conflict" hidden></div>
            <label class="field">Situação
              <select name="status">${Object.entries(Store.STATUS_AG)
                .map(([k, v]) => `<option value="${k}" ${k === a.status ? 'selected' : ''}>${v.label}</option>`)
                .join('')}</select>
            </label>
            <label class="field">Observações
              <textarea name="obs" rows="2" placeholder="Sintomas relatados, peças a encomendar...">${U.esc(a.obs)}</textarea>
            </label>
          </fieldset>
          ${UI.datalistClientes()}
          ${UI.datalistCatalogo('servico', 'dl-servicos')}
        </form>`;

      const footer = `
        ${!isNew ? `<button class="btn btn-ghost-danger" data-del>${U.icon('trash')}<span>Excluir</span></button>` : ''}
        <span class="spacer"></span>
        <button class="btn" type="button" data-wa title="Enviar confirmação por WhatsApp">${U.icon('chat')}<span>WhatsApp</span></button>
        ${!isNew ? `<button class="btn" type="button" data-nota>${U.icon('receipt')}<span>${a.notaId ? 'Ver nota' : 'Gerar nota'}</span></button>` : ''}
        <button class="btn btn-primary" data-save>${U.icon('check')}<span>${isNew ? 'Agendar' : 'Salvar'}</span></button>`;

      const m = UI.modal({ title: isNew ? 'Novo agendamento' : 'Agendamento', body, footer, size: 'modal-md' });
      const f = m.el.querySelector('#ag-form');
      const $ = (n) => f.elements[n];

      const fillVeiculos = () => {
        const c = Store.findCliente($('nome').value, $('telefone').value);
        const dl = m.el.querySelector('#dl-veiculos');
        dl.innerHTML = c ? (c.veiculos || []).map((v) => `<option value="${U.esc(v.modelo)}">${U.esc(U.fmtPlate(v.placa))}</option>`).join('') : '';
        return c;
      };

      $('nome').addEventListener('change', () => {
        const c = fillVeiculos();
        if (c) {
          if (!$('telefone').value) $('telefone').value = U.fmtPhone(c.telefone);
          if (c.veiculos && c.veiculos.length && !$('modelo').value) {
            $('modelo').value = c.veiculos[0].modelo;
            $('placa').value = U.fmtPlate(c.veiculos[0].placa);
          }
        }
      });
      $('modelo').addEventListener('change', () => {
        const c = fillVeiculos();
        const v = c && (c.veiculos || []).find((x) => x.modelo === $('modelo').value);
        if (v) $('placa').value = U.fmtPlate(v.placa);
      });
      $('placa').addEventListener('change', () => {
        $('placa').value = U.fmtPlate($('placa').value);
        if (!$('nome').value) {
          const c = Store.clienteByPlaca($('placa').value);
          if (c) {
            $('nome').value = c.nome;
            $('telefone').value = U.fmtPhone(c.telefone);
            const v = c.veiculos.find((x) => U.plate(x.placa) === U.plate($('placa').value));
            if (v && !$('modelo').value) $('modelo').value = v.modelo;
          }
        }
      });
      $('servico').addEventListener('change', () => {
        const it = Store.catalogo('servico').find((x) => x.desc === $('servico').value);
        if (it && /revis|correia|amortec/i.test(it.desc) && Number($('duracao').value) < 120) $('duracao').value = '120';
      });
      fillVeiculos();

      const collect = () => ({
        ...a,
        cliente: { nome: $('nome').value.trim(), telefone: U.digits($('telefone').value) },
        veiculo: { modelo: $('modelo').value.trim(), placa: U.plate($('placa').value) },
        servico: $('servico').value.trim(),
        data: $('data').value,
        hora: $('hora').value,
        duracao: Number($('duracao').value),
        status: $('status').value,
        obs: $('obs').value.trim()
      });

      const checkConflict = () => {
        const box = m.el.querySelector('#ag-conflict');
        const cs = Store.conflitos(collect());
        if (cs.length) {
          box.hidden = false;
          box.innerHTML = `${U.icon('alert')}<span>Conflito de horário com ${cs
            .map((c) => `<strong>${U.esc(c.hora)} · ${U.esc(c.cliente?.nome || '')}</strong>`)
            .join(', ')}. Dá para agendar mesmo assim se houver outro elevador livre.</span>`;
        } else box.hidden = true;
      };
      ['data', 'hora', 'duracao'].forEach((n) => $(n).addEventListener('change', checkConflict));
      checkConflict();

      const save = () => {
        if (!f.reportValidity()) return null;
        const d = collect();
        d.clienteId = Store.syncCliente({ clienteId: d.clienteId, nome: d.cliente.nome, telefone: d.cliente.telefone, veiculo: d.veiculo });
        const saved = Store.upsert('agendamentos', d);
        return saved;
      };

      m.el.querySelector('[data-save]').addEventListener('click', (e) => {
        e.preventDefault();
        const s = save();
        if (!s) return;
        UI.toast(`${isNew ? 'Agendado' : 'Atualizado'}: ${U.relDay(s.data).toLowerCase()} às ${s.hora}`);
        m.close();
        onSaved && onSaved(s);
      });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        m.el.querySelector('[data-save]').click();
      });

      m.el.querySelector('[data-wa]').addEventListener('click', () => {
        const d = collect();
        const cfg = Store.config;
        const txt =
          `Olá, ${d.cliente.nome.split(' ')[0] || ''}! Aqui é da ${cfg.nome}.\n` +
          `Confirmando seu agendamento: ${U.fmtDateLong(d.data)}, às ${d.hora}.\n` +
          `Serviço: ${d.servico}${d.veiculo.modelo ? `\nVeículo: ${d.veiculo.modelo}${d.veiculo.placa ? ' (' + U.fmtPlate(d.veiculo.placa) + ')' : ''}` : ''}` +
          `${cfg.endereco ? `\nEndereço: ${cfg.endereco}${cfg.cidade ? ', ' + cfg.cidade : ''}` : ''}\n` +
          `Qualquer imprevisto, é só avisar por aqui.`;
        window.open(U.waLink(d.cliente.telefone, txt), '_blank', 'noopener');
      });

      const del = m.el.querySelector('[data-del]');
      if (del)
        del.addEventListener('click', async () => {
          if (await UI.confirm('Excluir este agendamento? Essa ação não pode ser desfeita.', { title: 'Excluir agendamento', ok: 'Excluir', danger: true })) {
            Store.remove('agendamentos', a.id);
            UI.toast('Agendamento excluído');
            m.close();
            onSaved && onSaved(null);
          }
        });

      const btnNota = m.el.querySelector('[data-nota]');
      if (btnNota)
        btnNota.addEventListener('click', () => {
          const s = save();
          if (!s) return;
          m.close();
          if (s.notaId && Store.get('notas', s.notaId)) {
            location.hash = `#/notas/${s.notaId}`;
            return;
          }
          location.hash = `#/notas/nova?ag=${s.id}`;
        });

      return m;
    }
  };

  window.UI = UI;
})();
