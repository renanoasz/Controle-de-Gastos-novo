/* Catálogo de peças e serviços (preços de referência para as notas) */
(function () {
  let tipo = 'peca';
  let busca = '';

  function render(el) {
    const nP = Store.catalogo('peca').length;
    const nS = Store.catalogo('servico').length;
    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Tabela de preços</p>
          <h1>Peças e serviços</h1>
        </div>
      </div>
      <p class="lead">Cadastre o que você mais usa. Na nota, é só começar a digitar que o item aparece com o preço preenchido.</p>

      <div class="tabs" role="tablist">
        <button role="tab" class="${tipo === 'peca' ? 'active' : ''}" data-t="peca">Peças<span>${nP}</span></button>
        <button role="tab" class="${tipo === 'servico' ? 'active' : ''}" data-t="servico">Mão de obra<span>${nS}</span></button>
      </div>

      <form class="add-row card" id="cat-add" autocomplete="off">
        <label class="field grow">Descrição <input name="desc" required placeholder="${tipo === 'peca' ? 'Ex.: Pastilha de freio dianteira' : 'Ex.: Troca de embreagem'}"></label>
        ${tipo === 'peca' ? `<label class="field w-sm">Código <input name="cod" class="mono"></label>` : ''}
        <label class="field w-sm">Preço (R$) <input name="preco" inputmode="decimal" class="mono" required placeholder="0,00"></label>
        <button class="btn btn-primary" type="submit">${U.icon('plus')}<span>Adicionar</span></button>
      </form>

      <div class="filters">
        <div class="search">${U.icon('search')}<input type="search" id="cat-busca" placeholder="Filtrar" value="${U.esc(busca)}"></div>
      </div>
      <div id="cat-lista"></div>`;

    const draw = () => {
      const q = U.norm(busca);
      const list = Store.catalogo(tipo).filter((i) => !q || U.norm(i.desc + ' ' + i.cod).includes(q));
      const box = el.querySelector('#cat-lista');
      if (!list.length) {
        box.innerHTML = UI.empty('Nada por aqui', tipo === 'peca' ? 'Adicione as peças que você mais vende.' : 'Adicione os serviços com o valor da sua mão de obra.');
        return;
      }
      box.innerHTML = `
        <div class="table-wrap"><table class="table table-edit">
          <thead><tr><th>Descrição</th>${tipo === 'peca' ? '<th class="hide-sm">Código</th>' : ''}<th class="num">Preço</th><th class="actions"></th></tr></thead>
          <tbody>${list
            .map(
              (i) => `
            <tr data-id="${i.id}">
              <td><input class="cell-input" data-f="desc" value="${U.esc(i.desc)}" aria-label="Descrição"></td>
              ${tipo === 'peca' ? `<td class="hide-sm"><input class="cell-input mono" data-f="cod" value="${U.esc(i.cod || '')}" aria-label="Código"></td>` : ''}
              <td class="num"><input class="cell-input mono num" data-f="preco" inputmode="decimal" value="${U.esc(U.num(i.preco))}" aria-label="Preço"></td>
              <td class="actions"><button class="icon-btn" data-del="${i.id}" aria-label="Excluir">${U.icon('trash')}</button></td>
            </tr>`
            )
            .join('')}</tbody></table></div>`;
      box.querySelectorAll('.cell-input').forEach((inp) =>
        inp.addEventListener('change', () => {
          const item = Store.get('catalogo', inp.closest('tr').dataset.id);
          const fld = inp.dataset.f;
          item[fld] = fld === 'preco' ? U.parseNum(inp.value) : inp.value.trim();
          if (fld === 'preco') inp.value = U.num(item.preco);
          Store.save();
          UI.toast('Atualizado');
        })
      );
      box.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', async () => {
          if (await UI.confirm('Remover este item do catálogo? Notas já emitidas não mudam.', { ok: 'Remover', danger: true })) {
            Store.remove('catalogo', b.dataset.del);
            App.refresh();
          }
        })
      );
    };
    draw();

    el.querySelectorAll('[data-t]').forEach((b) =>
      b.addEventListener('click', () => {
        tipo = b.dataset.t;
        App.refresh();
      })
    );
    el.querySelector('#cat-busca').addEventListener(
      'input',
      U.debounce((e) => {
        busca = e.target.value;
        draw();
      }, 120)
    );
    const f = el.querySelector('#cat-add');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = f.elements;
      Store.upsert('catalogo', { tipo, desc: d.desc.value.trim(), cod: d.cod ? d.cod.value.trim() : '', preco: U.parseNum(d.preco.value) });
      UI.toast('Item adicionado');
      App.refresh();
      setTimeout(() => document.querySelector('#cat-add [name=desc]')?.focus(), 30);
    });
  }

  window.ViewCatalogo = { render, title: 'Peças e serviços' };
})();
