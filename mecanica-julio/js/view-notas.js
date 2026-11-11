/* Notas de serviço: listagem, editor, impressão e envio */
(function () {
  const listState = { status: '', busca: '', mes: '' };

  /* =============== LISTA =============== */
  function renderLista(el) {
    const notas = Store.all('notas');
    const counts = { '': notas.length };
    Object.keys(Store.STATUS_NOTA).forEach((k) => (counts[k] = notas.filter((n) => n.status === k).length));
    const meses = [...new Set(notas.map((n) => U.monthKey(n.data)))].sort().reverse();

    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Financeiro</p>
          <h1>Notas de serviço</h1>
        </div>
        <div class="page-actions">
          <a class="btn btn-primary" href="#/notas/nova">${U.icon('plus')}<span>Nova nota</span></a>
        </div>
      </div>

      <div class="tabs" role="tablist">
        ${[['', 'Todas'], ...Object.entries(Store.STATUS_NOTA).map(([k, v]) => [k, v.label])]
          .map(([k, l]) => `<button role="tab" class="${listState.status === k ? 'active' : ''}" data-st="${k}">${l}<span>${counts[k]}</span></button>`)
          .join('')}
      </div>

      <div class="filters">
        <div class="search">
          ${U.icon('search')}
          <input type="search" id="nt-busca" placeholder="Buscar por número, cliente, placa ou peça" value="${U.esc(listState.busca)}">
        </div>
        <select class="select" id="nt-mes">
          <option value="">Todos os meses</option>
          ${meses
            .map((m) => {
              const [y, mm] = m.split('-');
              return `<option value="${m}" ${listState.mes === m ? 'selected' : ''}>${U.MESES[Number(mm) - 1]} ${y}</option>`;
            })
            .join('')}
        </select>
      </div>
      <div id="nt-lista"></div>`;

    const draw = () => {
      const q = U.norm(listState.busca);
      const list = notas
        .filter((n) => {
          if (listState.status && n.status !== listState.status) return false;
          if (listState.mes && U.monthKey(n.data) !== listState.mes) return false;
          if (q) {
            const hay = U.norm(
              [U.numeroNota(n.numero), n.numero, n.cliente?.nome, n.cliente?.telefone, n.veiculo?.modelo, n.veiculo?.placa, n.defeito, ...(n.pecas || []).map((p) => p.desc), ...(n.servicos || []).map((s) => s.desc)].join(' ')
            );
            if (!hay.includes(q)) return false;
          }
          return true;
        })
        .sort((a, b) => (Number(b.numero) || 0) - (Number(a.numero) || 0));

      const box = el.querySelector('#nt-lista');
      if (!list.length) {
        box.innerHTML = UI.empty(
          notas.length ? 'Nada encontrado' : 'Nenhuma nota ainda',
          notas.length ? 'Tente outro termo ou filtro.' : 'Crie uma nota de serviço com peças, mão de obra e forma de pagamento. Ela sai pronta para imprimir ou mandar no WhatsApp.',
          notas.length ? '' : `<a class="btn btn-primary" href="#/notas/nova">${U.icon('plus')}<span>Nova nota</span></a>`
        );
        return;
      }
      const soma = list.filter((n) => n.status !== 'cancelada').reduce((s, n) => s + Store.totais(n).total, 0);
      box.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th class="hide-sm">Veículo</th><th class="hide-md">Itens</th><th>Situação</th><th class="num">Total</th><th class="actions"></th></tr></thead>
            <tbody>${list
              .map((n) => {
                const tt = Store.totais(n);
                const itens = (n.pecas || []).length + (n.servicos || []).length;
                return `
              <tr class="row-link" data-href="#/notas/${n.id}">
                <td class="mono strong">${U.numeroNota(n.numero)}</td>
                <td>${U.fmtDate(n.data)}</td>
                <td><div class="cell-2"><strong>${U.esc(n.cliente?.nome || '—')}</strong><span>${U.esc(U.fmtPhone(n.cliente?.telefone))}</span></div></td>
                <td class="hide-sm"><div class="cell-2"><span>${U.esc(n.veiculo?.modelo || '')}</span>${UI.plate(n.veiculo?.placa)}</div></td>
                <td class="hide-md muted">${itens} ${itens === 1 ? 'item' : 'itens'}</td>
                <td>${UI.badge(Store.STATUS_NOTA, n.status)}</td>
                <td class="num mono strong">${U.money(tt.total)}</td>
                <td class="actions">
                  <button class="icon-btn" data-print="${n.id}" title="Imprimir">${U.icon('printer')}</button>
                </td>
              </tr>`;
              })
              .join('')}</tbody>
            <tfoot><tr><td colspan="6" class="muted">${list.length} nota${list.length === 1 ? '' : 's'} (sem canceladas no total)</td><td class="num mono strong">${U.money(soma)}</td><td></td></tr></tfoot>
          </table>
        </div>`;
      box.querySelectorAll('.row-link').forEach((tr) =>
        tr.addEventListener('click', (e) => {
          if (e.target.closest('[data-print]')) return;
          location.hash = tr.dataset.href;
        })
      );
      box.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => imprimir(Store.get('notas', b.dataset.print))));
    };
    draw();

    el.querySelectorAll('[data-st]').forEach((b) =>
      b.addEventListener('click', () => {
        listState.status = b.dataset.st;
        el.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('active', x === b));
        draw();
      })
    );
    el.querySelector('#nt-busca').addEventListener(
      'input',
      U.debounce((e) => {
        listState.busca = e.target.value;
        draw();
      }, 150)
    );
    el.querySelector('#nt-mes').addEventListener('change', (e) => {
      listState.mes = e.target.value;
      draw();
    });
  }

  /* =============== EDITOR =============== */
  function renderEditor(el, id, params) {
    let n;
    if (id === 'nova') {
      n = Store.novaNota();
      const agId = params.get('ag');
      const cliId = params.get('cliente');
      if (agId) {
        const ag = Store.get('agendamentos', agId);
        if (ag) {
          const c = ag.clienteId ? Store.get('clientes', ag.clienteId) : null;
          const v = c && (c.veiculos || []).find((x) => U.plate(x.placa) === U.plate(ag.veiculo?.placa));
          n.agendamentoId = ag.id;
          n.clienteId = ag.clienteId;
          n.cliente = { nome: ag.cliente?.nome || '', telefone: ag.cliente?.telefone || '', documento: c?.documento || '', endereco: c?.endereco || '' };
          n.veiculo = { modelo: ag.veiculo?.modelo || '', placa: ag.veiculo?.placa || '', ano: v?.ano || '', cor: v?.cor || '', km: v?.km || '' };
          n.defeito = [ag.servico, ag.obs].filter(Boolean).join(' — ');
          n.data = ag.data <= U.today() ? U.today() : ag.data;
          const it = Store.catalogo('servico').find((x) => U.norm(x.desc) === U.norm(ag.servico));
          n.servicos = [{ desc: it ? it.desc : ag.servico, cod: '', qtd: 1, unit: it ? it.preco : 0 }];
        }
      } else if (cliId) {
        const c = Store.get('clientes', cliId);
        if (c) {
          const v = (c.veiculos || [])[0] || {};
          n.clienteId = c.id;
          n.cliente = { nome: c.nome, telefone: c.telefone, documento: c.documento || '', endereco: c.endereco || '' };
          n.veiculo = { modelo: v.modelo || '', placa: v.placa || '', ano: v.ano || '', cor: v.cor || '', km: v.km || '' };
        }
      }
      if (params.get('tipo') === 'orcamento') n.status = 'orcamento';
      if (!n.pecas.length) n.pecas.push(linhaVazia());
      if (!n.servicos.length) n.servicos.push(linhaVazia());
    } else {
      const found = Store.get('notas', id);
      if (!found) {
        el.innerHTML = UI.empty('Nota não encontrada', 'Ela pode ter sido excluída.', `<a class="btn" href="#/notas">Voltar para notas</a>`);
        return;
      }
      n = JSON.parse(JSON.stringify(found));
    }

    let dirty = false;
    const setDirty = (v = true) => {
      dirty = v;
      App.setGuard(dirty ? () => dirty : null);
      const s = el.querySelector('#save-state');
      if (s) s.textContent = dirty ? 'Alterações não salvas' : n.id ? 'Salvo' : '';
      if (s) s.classList.toggle('warn', dirty);
    };

    const isNova = !n.id;
    const numeroLabel = n.numero ? U.numeroNota(n.numero) : U.numeroNota(Math.max(Number(Store.config.proximoNumero) || 1, Store.all('notas').reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0) + 1));

    el.innerHTML = `
      <div class="page-head">
        <div>
          <a class="back" href="#/notas">${U.icon('back')}Notas</a>
          <h1>${n.status === 'orcamento' ? 'Orçamento' : 'Nota de serviço'} <span class="mono muted">nº ${numeroLabel}</span></h1>
        </div>
        <div class="page-actions">
          <span class="save-state" id="save-state">${isNova ? '' : 'Salvo'}</span>
        </div>
      </div>

      <form class="editor" id="nota-form" autocomplete="off">
        <div class="editor-main">
          <section class="card">
            <header class="card-head"><h2>Dados da nota</h2></header>
            <div class="grid-4">
              <label class="field">Tipo / situação
                <select name="status">${Object.entries(Store.STATUS_NOTA)
                  .map(([k, v]) => `<option value="${k}" ${n.status === k ? 'selected' : ''}>${v.label}</option>`)
                  .join('')}</select>
              </label>
              <label class="field">Data
                <input type="date" name="data" value="${U.esc(n.data)}" required>
              </label>
              <label class="field" data-show="orcamento">Válido até
                <input type="date" name="validade" value="${U.esc(n.validade || '')}">
              </label>
              <label class="field">KM atual
                <input name="km" inputmode="numeric" class="mono" value="${U.esc(n.veiculo.km)}" placeholder="0">
              </label>
            </div>
          </section>

          <section class="card">
            <header class="card-head"><h2>Cliente e veículo</h2></header>
            <div class="grid-2">
              <label class="field">Cliente
                <input name="cli_nome" list="dl-clientes" required value="${U.esc(n.cliente.nome)}" placeholder="Nome completo">
              </label>
              <label class="field">Telefone
                <input name="cli_tel" inputmode="tel" value="${U.esc(U.fmtPhone(n.cliente.telefone))}" placeholder="(11) 90000-0000">
              </label>
            </div>
            <div class="grid-2">
              <label class="field">CPF / CNPJ <span class="opt">opcional</span>
                <input name="cli_doc" value="${U.esc(n.cliente.documento)}">
              </label>
              <label class="field">Endereço <span class="opt">opcional</span>
                <input name="cli_end" value="${U.esc(n.cliente.endereco)}">
              </label>
            </div>
            <div class="grid-4">
              <label class="field span-2">Veículo
                <input name="vei_modelo" list="dl-veiculos-nota" value="${U.esc(n.veiculo.modelo)}" placeholder="Marca e modelo">
              </label>
              <label class="field">Placa
                <input name="vei_placa" class="mono upper" maxlength="8" value="${U.esc(U.fmtPlate(n.veiculo.placa))}" placeholder="ABC1D23">
              </label>
              <label class="field">Ano
                <input name="vei_ano" inputmode="numeric" maxlength="9" value="${U.esc(n.veiculo.ano)}">
              </label>
            </div>
            <datalist id="dl-veiculos-nota"></datalist>
            <label class="field">Defeito relatado / serviço solicitado
              <textarea name="defeito" rows="2" placeholder="O que o cliente relatou, diagnóstico...">${U.esc(n.defeito)}</textarea>
            </label>
          </section>

          <section class="card">
            <header class="card-head">
              <h2>Peças</h2>
              <span class="card-total mono" id="sub-pecas"></span>
            </header>
            <div class="items" id="items-pecas"></div>
            <button type="button" class="btn btn-dashed" data-add="pecas">${U.icon('plus')}<span>Adicionar peça</span></button>
          </section>

          <section class="card">
            <header class="card-head">
              <h2>Mão de obra</h2>
              <span class="card-total mono" id="sub-servicos"></span>
            </header>
            <div class="items" id="items-servicos"></div>
            <button type="button" class="btn btn-dashed" data-add="servicos">${U.icon('plus')}<span>Adicionar serviço</span></button>
          </section>

          <section class="card">
            <header class="card-head"><h2>Pagamento e condições</h2></header>
            <div class="grid-4">
              <label class="field">Forma de pagamento
                <select name="pagamento">${Store.PAGAMENTOS.map((p) => `<option ${n.pagamento === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
              </label>
              <label class="field">Parcelas
                <select name="parcelas">${Array.from({ length: 12 }, (_, i) => i + 1)
                  .map((p) => `<option value="${p}" ${Number(n.parcelas) === p ? 'selected' : ''}>${p === 1 ? 'À vista' : p + 'x'}</option>`)
                  .join('')}</select>
              </label>
              <label class="field">Desconto
                <div class="input-group">
                  <input name="desconto" inputmode="decimal" class="mono" value="${U.esc(n.desconto ? U.num(n.desconto) : '')}" placeholder="0,00">
                  <select name="descontoTipo">
                    <option value="valor" ${n.descontoTipo !== 'pct' ? 'selected' : ''}>R$</option>
                    <option value="pct" ${n.descontoTipo === 'pct' ? 'selected' : ''}>%</option>
                  </select>
                </div>
              </label>
              <label class="field">Acréscimo (R$)
                <input name="acrescimo" inputmode="decimal" class="mono" value="${U.esc(n.acrescimo ? U.num(n.acrescimo) : '')}" placeholder="0,00">
              </label>
            </div>
            <label class="field">Garantia
              <textarea name="garantia" rows="2">${U.esc(n.garantia)}</textarea>
            </label>
            <label class="field">Observações
              <textarea name="obs" rows="2">${U.esc(n.obs)}</textarea>
            </label>
          </section>
        </div>

        <aside class="editor-side">
          <div class="totals-card">
            <div class="totals-status" id="tot-status"></div>
            <dl class="totals">
              <div><dt>Peças</dt><dd class="mono" id="t-pecas"></dd></div>
              <div><dt>Mão de obra</dt><dd class="mono" id="t-servicos"></dd></div>
              <div class="t-desc"><dt>Desconto</dt><dd class="mono" id="t-desc"></dd></div>
              <div class="t-acr"><dt>Acréscimo</dt><dd class="mono" id="t-acr"></dd></div>
            </dl>
            <div class="grand">
              <span>Total</span>
              <strong class="mono" id="t-total"></strong>
              <small id="t-parc"></small>
            </div>
            <div class="side-actions">
              <button type="submit" class="btn btn-primary btn-block">${U.icon('check')}<span>Salvar</span></button>
              <div class="side-row">
                <button type="button" class="btn" data-act="print">${U.icon('printer')}<span>Imprimir / PDF</span></button>
                <button type="button" class="btn" data-act="wa">${U.icon('chat')}<span>WhatsApp</span></button>
              </div>
              <div id="quick-status"></div>
            </div>
          </div>
          <div class="side-links">
            <button type="button" class="link" data-act="dup">${U.icon('copy')}Duplicar</button>
            ${n.agendamentoId ? `<button type="button" class="link" data-act="ag">${U.icon('calendar')}Agendamento</button>` : ''}
            ${!isNova ? `<button type="button" class="link link-danger" data-act="del">${U.icon('trash')}Excluir</button>` : ''}
          </div>
        </aside>
        ${UI.datalistClientes()}
        ${UI.datalistCatalogo('peca', 'dl-pecas')}
        ${UI.datalistCatalogo('servico', 'dl-serv')}
      </form>`;

    const f = el.querySelector('#nota-form');
    const $ = (name) => f.elements[name];

    /* ---- itens ---- */
    const drawItems = (tipo) => {
      const box = el.querySelector(`#items-${tipo}`);
      const list = n[tipo];
      const isPeca = tipo === 'pecas';
      box.innerHTML = `
        <div class="item-row item-head ${isPeca ? '' : 'no-cod'}">
          ${isPeca ? '<span>Código</span>' : ''}
          <span>Descrição</span><span class="num">${isPeca ? 'Qtd' : 'Qtd/h'}</span><span class="num">Valor unit.</span><span class="num">Total</span><span></span>
        </div>
        ${list
          .map(
            (it, i) => `
          <div class="item-row ${isPeca ? '' : 'no-cod'}" data-i="${i}">
            ${isPeca ? `<input class="mono" data-f="cod" value="${U.esc(it.cod)}" placeholder="Cód." aria-label="Código">` : ''}
            <input data-f="desc" list="${isPeca ? 'dl-pecas' : 'dl-serv'}" value="${U.esc(it.desc)}" placeholder="${isPeca ? 'Ex.: Filtro de óleo' : 'Ex.: Troca de óleo'}" aria-label="Descrição">
            <input class="num mono" data-f="qtd" inputmode="decimal" value="${U.esc(String(it.qtd ?? 1).replace('.', ','))}" aria-label="Quantidade">
            <input class="num mono" data-f="unit" inputmode="decimal" value="${it.unit ? U.esc(U.num(it.unit)) : ''}" placeholder="0,00" aria-label="Valor unitário">
            <span class="num mono line-total">${U.money(U.parseNum(it.qtd) * U.parseNum(it.unit))}</span>
            <button type="button" class="icon-btn" data-rm="${i}" aria-label="Remover">${U.icon('x')}</button>
          </div>`
          )
          .join('')}`;

      box.querySelectorAll('.item-row[data-i]').forEach((row) => {
        const i = Number(row.dataset.i);
        row.querySelectorAll('input').forEach((inp) => {
          inp.addEventListener('input', () => {
            const fld = inp.dataset.f;
            list[i][fld] = fld === 'qtd' || fld === 'unit' ? U.parseNum(inp.value) : inp.value;
            row.querySelector('.line-total').textContent = U.money(U.parseNum(list[i].qtd) * U.parseNum(list[i].unit));
            updateTotals();
            setDirty();
          });
          if (inp.dataset.f === 'desc') {
            inp.addEventListener('change', () => {
              const cat = Store.catalogo(isPeca ? 'peca' : 'servico').find((x) => x.desc === inp.value);
              if (cat) {
                list[i].unit = cat.preco;
                if (isPeca && cat.cod) list[i].cod = cat.cod;
                drawItems(tipo);
                updateTotals();
                const next = box.querySelector(`.item-row[data-i="${i}"] [data-f="qtd"]`);
                next && next.select();
              }
            });
          }
          if (inp.dataset.f === 'unit') {
            inp.addEventListener('blur', () => {
              if (inp.value) inp.value = U.num(U.parseNum(inp.value));
            });
          }
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (i === list.length - 1) {
                list.push(linhaVazia());
                drawItems(tipo);
              }
              const nx = box.querySelector(`.item-row[data-i="${i + 1}"] [data-f="desc"]`);
              nx && nx.focus();
            }
          });
        });
      });
      box.querySelectorAll('[data-rm]').forEach((b) =>
        b.addEventListener('click', () => {
          list.splice(Number(b.dataset.rm), 1);
          if (!list.length) list.push(linhaVazia());
          drawItems(tipo);
          updateTotals();
          setDirty();
        })
      );
    };

    const updateTotals = () => {
      readHeader();
      const t = Store.totais(n);
      el.querySelector('#t-pecas').textContent = U.money(t.pecas);
      el.querySelector('#t-servicos').textContent = U.money(t.servicos);
      el.querySelector('#t-desc').textContent = '− ' + U.money(t.desconto);
      el.querySelector('#t-acr').textContent = '+ ' + U.money(t.acrescimo);
      el.querySelector('.t-desc').hidden = !t.desconto;
      el.querySelector('.t-acr').hidden = !t.acrescimo;
      el.querySelector('#t-total').textContent = U.money(t.total);
      el.querySelector('#sub-pecas').textContent = U.money(t.pecas);
      el.querySelector('#sub-servicos').textContent = U.money(t.servicos);
      const p = Number(n.parcelas) || 1;
      el.querySelector('#t-parc').textContent = p > 1 ? `${p}x de ${U.money(t.total / p)} · ${n.pagamento}` : n.pagamento;
      el.querySelector('#tot-status').innerHTML = UI.badge(Store.STATUS_NOTA, n.status);
      el.querySelectorAll('[data-show="orcamento"]').forEach((x) => x.classList.toggle('dim', n.status !== 'orcamento'));
      drawQuick();
    };

    const drawQuick = () => {
      const q = el.querySelector('#quick-status');
      let html = '';
      if (n.status === 'orcamento') html = `<button type="button" class="btn btn-dark btn-block" data-qs="aberta">Aprovar orçamento</button>`;
      else if (n.status === 'aberta') html = `<button type="button" class="btn btn-success btn-block" data-qs="paga">${U.icon('check')}<span>Marcar como paga</span></button>`;
      q.innerHTML = html;
      q.querySelectorAll('[data-qs]').forEach((b) =>
        b.addEventListener('click', () => {
          $('status').value = b.dataset.qs;
          readHeader();
          if (salvar()) UI.toast(b.dataset.qs === 'paga' ? 'Pagamento registrado' : 'Orçamento aprovado');
        })
      );
    };

    const readHeader = () => {
      n.status = $('status').value;
      n.data = $('data').value;
      n.validade = $('validade').value;
      n.cliente = { nome: $('cli_nome').value.trim(), telefone: U.digits($('cli_tel').value), documento: $('cli_doc').value.trim(), endereco: $('cli_end').value.trim() };
      n.veiculo = { modelo: $('vei_modelo').value.trim(), placa: U.plate($('vei_placa').value), ano: $('vei_ano').value.trim(), cor: n.veiculo.cor || '', km: U.digits($('km').value) };
      n.defeito = $('defeito').value.trim();
      n.pagamento = $('pagamento').value;
      n.parcelas = Number($('parcelas').value);
      n.desconto = U.parseNum($('desconto').value);
      n.descontoTipo = $('descontoTipo').value;
      n.acrescimo = U.parseNum($('acrescimo').value);
      n.garantia = $('garantia').value;
      n.obs = $('obs').value;
    };

    const limparItens = (list) => list.filter((i) => String(i.desc || '').trim() || U.parseNum(i.unit));

    const salvar = () => {
      if (!f.reportValidity()) return null;
      readHeader();
      const toSave = { ...n, pecas: limparItens(n.pecas), servicos: limparItens(n.servicos) };
      const saved = Store.salvarNota(toSave);
      n.id = saved.id;
      n.numero = saved.numero;
      n.clienteId = saved.clienteId;
      setDirty(false);
      if (location.hash.startsWith('#/notas/nova')) {
        history.replaceState(null, '', `#/notas/${saved.id}`);
        App.refresh();
      } else {
        updateTotals();
        el.querySelector('h1').innerHTML = `${n.status === 'orcamento' ? 'Orçamento' : 'Nota de serviço'} <span class="mono muted">nº ${U.numeroNota(n.numero)}</span>`;
      }
      return saved;
    };

    /* ---- eventos ---- */
    f.addEventListener('input', (e) => {
      if (e.target.closest('.items')) return;
      updateTotals();
      setDirty();
    });
    f.addEventListener('change', (e) => {
      if (e.target.closest('.items')) return;
      updateTotals();
      setDirty();
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (salvar()) UI.toast('Nota salva');
    });

    const fillVeiculos = () => {
      const c = Store.findCliente($('cli_nome').value, $('cli_tel').value);
      el.querySelector('#dl-veiculos-nota').innerHTML = c ? (c.veiculos || []).map((v) => `<option value="${U.esc(v.modelo)}">${U.esc(U.fmtPlate(v.placa))}</option>`).join('') : '';
      return c;
    };
    const applyVeiculo = (v) => {
      if (!v) return;
      $('vei_modelo').value = v.modelo || '';
      $('vei_placa').value = U.fmtPlate(v.placa);
      $('vei_ano').value = v.ano || '';
      if (!$('km').value && v.km) $('km').value = v.km;
      n.veiculo.cor = v.cor || '';
    };
    $('cli_nome').addEventListener('change', () => {
      const c = fillVeiculos();
      if (!c) return;
      n.clienteId = c.id;
      if (!$('cli_tel').value) $('cli_tel').value = U.fmtPhone(c.telefone);
      if (!$('cli_doc').value) $('cli_doc').value = c.documento || '';
      if (!$('cli_end').value) $('cli_end').value = c.endereco || '';
      if (!$('vei_modelo').value && c.veiculos?.length) applyVeiculo(c.veiculos[0]);
      updateTotals();
    });
    $('vei_modelo').addEventListener('change', () => {
      const c = fillVeiculos();
      const v = c && (c.veiculos || []).find((x) => x.modelo === $('vei_modelo').value);
      if (v) applyVeiculo(v);
    });
    $('vei_placa').addEventListener('change', () => {
      $('vei_placa').value = U.fmtPlate($('vei_placa').value);
      if (!$('cli_nome').value) {
        const c = Store.clienteByPlaca($('vei_placa').value);
        if (c) {
          $('cli_nome').value = c.nome;
          $('cli_tel').value = U.fmtPhone(c.telefone);
          n.clienteId = c.id;
          applyVeiculo(c.veiculos.find((x) => U.plate(x.placa) === U.plate($('vei_placa').value)));
          fillVeiculos();
          updateTotals();
        }
      }
    });
    fillVeiculos();

    el.querySelectorAll('[data-add]').forEach((b) =>
      b.addEventListener('click', () => {
        const tipo = b.dataset.add;
        n[tipo].push(linhaVazia());
        drawItems(tipo);
        const rows = el.querySelectorAll(`#items-${tipo} .item-row[data-i] [data-f="desc"]`);
        rows[rows.length - 1].focus();
      })
    );

    el.querySelector('[data-act="print"]').addEventListener('click', () => {
      readHeader();
      if (dirty || !n.id) {
        if (!salvar()) return;
      }
      imprimir(Store.get('notas', n.id));
    });
    el.querySelector('[data-act="wa"]').addEventListener('click', () => {
      readHeader();
      if (dirty || !n.id) {
        if (!salvar()) return;
      }
      const saved = Store.get('notas', n.id);
      window.open(U.waLink(saved.cliente.telefone, textoWhatsApp(saved)), '_blank', 'noopener');
    });
    el.querySelector('[data-act="dup"]').addEventListener('click', () => {
      readHeader();
      const copia = Store.novaNota({
        ...JSON.parse(JSON.stringify(n)),
        id: null,
        numero: null,
        data: U.today(),
        status: n.status === 'orcamento' ? 'orcamento' : 'aberta',
        agendamentoId: null,
        pagaEm: null
      });
      copia.pecas = limparItens(copia.pecas);
      copia.servicos = limparItens(copia.servicos);
      const s = Store.salvarNota(copia);
      setDirty(false);
      UI.toast(`Cópia criada: nº ${U.numeroNota(s.numero)}`);
      location.hash = `#/notas/${s.id}`;
    });
    const agBtn = el.querySelector('[data-act="ag"]');
    if (agBtn)
      agBtn.addEventListener('click', () => {
        const ag = Store.get('agendamentos', n.agendamentoId);
        if (ag) UI.agendamentoForm(ag, { onSaved: () => {} });
        else UI.toast('Agendamento não existe mais', 'error');
      });
    const delBtn = el.querySelector('[data-act="del"]');
    if (delBtn)
      delBtn.addEventListener('click', async () => {
        if (await UI.confirm(`Excluir a nota nº ${U.numeroNota(n.numero)}? Prefira "Cancelada" se quiser manter o histórico.`, { title: 'Excluir nota', ok: 'Excluir', danger: true })) {
          Store.remove('notas', n.id);
          Store.all('agendamentos').forEach((a) => {
            if (a.notaId === n.id) a.notaId = null;
          });
          Store.save();
          setDirty(false);
          UI.toast('Nota excluída');
          UI.nav('#/notas');
        }
      });

    drawItems('pecas');
    drawItems('servicos');
    updateTotals();
    if (isNova && (n.agendamentoId || n.clienteId)) setDirty(true);
  }

  function linhaVazia() {
    return { cod: '', desc: '', qtd: 1, unit: 0 };
  }

  /* =============== IMPRESSÃO =============== */
  function docNota(n) {
    const c = Store.config;
    const t = Store.totais(n);
    const orc = n.status === 'orcamento';
    const pecas = (n.pecas || []).filter((i) => i.desc || i.unit);
    const servs = (n.servicos || []).filter((i) => i.desc || i.unit);
    const linhas = (arr, cod) =>
      arr
        .map(
          (i, k) => `<tr>
            <td class="c">${k + 1}</td>
            ${cod ? `<td class="mono">${U.esc(i.cod || '')}</td>` : ''}
            <td>${U.esc(i.desc)}</td>
            <td class="r mono">${String(i.qtd).replace('.', ',')}</td>
            <td class="r mono">${U.money(i.unit)}</td>
            <td class="r mono">${U.money(U.parseNum(i.qtd) * U.parseNum(i.unit))}</td>
          </tr>`
        )
        .join('');
    const contato = [c.telefone && `Tel. ${c.telefone}`, c.whatsapp && `WhatsApp ${c.whatsapp}`, c.email].filter(Boolean).join(' · ');
    const p = Number(n.parcelas) || 1;

    return `
      <article class="doc">
        <header class="doc-head">
          <div class="doc-brand">
            <div class="doc-mark">J</div>
            <div>
              <h1>${U.esc(c.nome)}</h1>
              ${c.razao ? `<p>${U.esc(c.razao)}</p>` : ''}
              <p>${[c.endereco, c.cidade].filter(Boolean).map(U.esc).join(' – ')}</p>
              <p>${U.esc(contato)}</p>
              ${c.cnpj ? `<p>CNPJ ${U.esc(c.cnpj)}</p>` : ''}
            </div>
          </div>
          <div class="doc-id">
            <span>${orc ? 'Orçamento' : 'Ordem de serviço'}</span>
            <strong>Nº ${U.numeroNota(n.numero)}</strong>
            <p>Emissão: ${U.fmtDate(n.data)}</p>
            ${orc && n.validade ? `<p>Válido até: ${U.fmtDate(n.validade)}</p>` : ''}
            ${n.status === 'paga' ? `<p class="doc-paid">PAGO${n.pagaEm ? ' em ' + U.fmtDate(n.pagaEm) : ''}</p>` : ''}
            ${n.status === 'cancelada' ? `<p class="doc-paid">CANCELADA</p>` : ''}
          </div>
        </header>

        <section class="doc-boxes">
          <div class="doc-box">
            <h4>Cliente</h4>
            <p class="big">${U.esc(n.cliente?.nome || '')}</p>
            ${n.cliente?.telefone ? `<p>Telefone: ${U.esc(U.fmtPhone(n.cliente.telefone))}</p>` : ''}
            ${n.cliente?.documento ? `<p>CPF/CNPJ: ${U.esc(n.cliente.documento)}</p>` : ''}
            ${n.cliente?.endereco ? `<p>${U.esc(n.cliente.endereco)}</p>` : ''}
          </div>
          <div class="doc-box">
            <h4>Veículo</h4>
            <p class="big">${U.esc(n.veiculo?.modelo || '')}</p>
            <p>${[n.veiculo?.placa && `Placa: <b class="mono">${U.esc(U.fmtPlate(n.veiculo.placa))}</b>`, n.veiculo?.ano && `Ano: ${U.esc(n.veiculo.ano)}`, n.veiculo?.km && `KM: ${Number(n.veiculo.km).toLocaleString('pt-BR')}`].filter(Boolean).join(' &nbsp;·&nbsp; ')}</p>
          </div>
        </section>

        ${n.defeito ? `<section class="doc-section"><h4>Serviço solicitado / defeito relatado</h4><p>${U.esc(n.defeito)}</p></section>` : ''}

        ${
          pecas.length
            ? `<section class="doc-section">
            <h4>Peças</h4>
            <table class="doc-table">
              <thead><tr><th class="c">#</th><th>Código</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead>
              <tbody>${linhas(pecas, true)}</tbody>
              <tfoot><tr><td colspan="5" class="r">Subtotal peças</td><td class="r mono">${U.money(t.pecas)}</td></tr></tfoot>
            </table></section>`
            : ''
        }

        ${
          servs.length
            ? `<section class="doc-section">
            <h4>Mão de obra</h4>
            <table class="doc-table">
              <thead><tr><th class="c">#</th><th>Descrição do serviço</th><th class="r">Qtd/h</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead>
              <tbody>${linhas(servs, false)}</tbody>
              <tfoot><tr><td colspan="4" class="r">Subtotal mão de obra</td><td class="r mono">${U.money(t.servicos)}</td></tr></tfoot>
            </table></section>`
            : ''
        }

        <section class="doc-bottom">
          <div class="doc-terms">
            <p><b>Pagamento:</b> ${U.esc(n.pagamento)}${p > 1 ? ` em ${p}x de ${U.money(t.total / p)}` : ''}</p>
            ${n.garantia ? `<p><b>Garantia:</b> ${U.esc(n.garantia)}</p>` : ''}
            ${n.obs ? `<p><b>Observações:</b> ${U.esc(n.obs)}</p>` : ''}
          </div>
          <table class="doc-totals">
            <tr><td>Peças</td><td class="r mono">${U.money(t.pecas)}</td></tr>
            <tr><td>Mão de obra</td><td class="r mono">${U.money(t.servicos)}</td></tr>
            ${t.desconto ? `<tr><td>Desconto${n.descontoTipo === 'pct' ? ` (${U.num(n.desconto).replace(',00', '')}%)` : ''}</td><td class="r mono">− ${U.money(t.desconto)}</td></tr>` : ''}
            ${t.acrescimo ? `<tr><td>Acréscimo</td><td class="r mono">+ ${U.money(t.acrescimo)}</td></tr>` : ''}
            <tr class="doc-grand"><td>Total</td><td class="r mono">${U.money(t.total)}</td></tr>
          </table>
        </section>

        <section class="doc-sign">
          <div><span></span><p>${U.esc(n.cliente?.nome || 'Cliente')}</p><small>${orc ? 'Aprovação do cliente' : 'Recebi o veículo com os serviços acima'}</small></div>
          <div><span></span><p>${U.esc(c.nome)}</p><small>Responsável técnico</small></div>
        </section>

        <footer class="doc-foot">${U.esc(c.cidade ? c.cidade.split('–')[0].trim() + ', ' : '')}${U.fromISO(n.data).getDate()} de ${U.MESES[U.fromISO(n.data).getMonth()]} de ${U.fromISO(n.data).getFullYear()}</footer>
      </article>`;
  }

  function imprimir(n) {
    if (!n) return;
    const root = document.getElementById('print-root');
    root.innerHTML = docNota(n);
    const prevTitle = document.title;
    document.title = `${n.status === 'orcamento' ? 'Orcamento' : 'OS'}-${U.numeroNota(n.numero)}-${(n.cliente?.nome || '').split(' ')[0]}`;
    document.body.classList.add('printing');
    const done = () => {
      document.body.classList.remove('printing');
      document.title = prevTitle;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(() => {
      window.print();
      setTimeout(done, 500);
    }, 50);
  }

  function textoWhatsApp(n) {
    const c = Store.config;
    const t = Store.totais(n);
    const orc = n.status === 'orcamento';
    const linhas = [];
    linhas.push(`*${c.nome}*`);
    linhas.push(`${orc ? 'Orçamento' : 'Ordem de serviço'} nº ${U.numeroNota(n.numero)} · ${U.fmtDate(n.data)}`);
    linhas.push('');
    linhas.push(`Cliente: ${n.cliente.nome}`);
    if (n.veiculo.modelo || n.veiculo.placa) linhas.push(`Veículo: ${[n.veiculo.modelo, U.fmtPlate(n.veiculo.placa)].filter(Boolean).join(' · ')}`);
    const pecas = (n.pecas || []).filter((i) => i.desc);
    const servs = (n.servicos || []).filter((i) => i.desc);
    if (pecas.length) {
      linhas.push('', '*Peças*');
      pecas.forEach((i) => linhas.push(`• ${String(i.qtd).replace('.', ',')}x ${i.desc} — ${U.money(U.parseNum(i.qtd) * U.parseNum(i.unit))}`));
    }
    if (servs.length) {
      linhas.push('', '*Mão de obra*');
      servs.forEach((i) => linhas.push(`• ${i.desc} — ${U.money(U.parseNum(i.qtd) * U.parseNum(i.unit))}`));
    }
    linhas.push('');
    if (t.desconto) linhas.push(`Desconto: − ${U.money(t.desconto)}`);
    linhas.push(`*Total: ${U.money(t.total)}*`);
    const p = Number(n.parcelas) || 1;
    linhas.push(`Pagamento: ${n.pagamento}${p > 1 ? ` (${p}x de ${U.money(t.total / p)})` : ''}`);
    if (orc && n.validade) linhas.push(`Orçamento válido até ${U.fmtDate(n.validade)}.`);
    if (n.garantia) linhas.push('', `_${n.garantia}_`);
    return linhas.join('\n');
  }

  window.ViewNotas = { renderLista, renderEditor, imprimir, docNota, title: 'Notas de serviço' };
})();
