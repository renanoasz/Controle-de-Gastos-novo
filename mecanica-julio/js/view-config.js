/* Configurações da oficina, agenda, notas e backup */
(function () {
  function render(el) {
    const c = Store.config;
    el.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Ajustes</p>
          <h1>Configurações</h1>
        </div>
      </div>

      <form id="cfg-form" class="settings" autocomplete="off">
        <section class="card settings-block">
          <div class="settings-intro">
            <h2>Dados da oficina</h2>
            <p>Aparecem no cabeçalho das notas impressas e nas mensagens de WhatsApp.</p>
          </div>
          <div class="settings-fields">
            <div class="grid-2">
              <label class="field">Nome fantasia <input name="nome" required value="${U.esc(c.nome)}"></label>
              <label class="field">Razão social <span class="opt">opcional</span><input name="razao" value="${U.esc(c.razao)}"></label>
            </div>
            <div class="grid-3">
              <label class="field">CNPJ <input name="cnpj" class="mono" value="${U.esc(c.cnpj)}"></label>
              <label class="field">Telefone <input name="telefone" value="${U.esc(c.telefone)}"></label>
              <label class="field">WhatsApp <input name="whatsapp" value="${U.esc(c.whatsapp)}"></label>
            </div>
            <div class="grid-2">
              <label class="field">Endereço <input name="endereco" value="${U.esc(c.endereco)}"></label>
              <label class="field">Cidade – UF <input name="cidade" value="${U.esc(c.cidade)}"></label>
            </div>
            <label class="field">E-mail <input name="email" type="email" value="${U.esc(c.email)}"></label>
          </div>
        </section>

        <section class="card settings-block">
          <div class="settings-intro">
            <h2>Agenda</h2>
            <p>Horário de funcionamento e tamanho dos intervalos de agendamento.</p>
          </div>
          <div class="settings-fields">
            <div class="grid-3">
              <label class="field">Abre às <input type="time" name="abertura" value="${U.esc(c.abertura)}"></label>
              <label class="field">Fecha às <input type="time" name="fechamento" value="${U.esc(c.fechamento)}"></label>
              <label class="field">Intervalo
                <select name="intervalo">${[15, 30, 60].map((m) => `<option value="${m}" ${Number(c.intervalo) === m ? 'selected' : ''}>${m} min</option>`).join('')}</select>
              </label>
            </div>
            <div class="field">Dias de atendimento
              <div class="chips">${[1, 2, 3, 4, 5, 6, 0]
                .map((d) => `<label class="chip"><input type="checkbox" name="dias" value="${d}" ${(c.dias || []).includes(d) ? 'checked' : ''}><span>${U.DIAS_CURTOS[d]}</span></label>`)
                .join('')}</div>
            </div>
          </div>
        </section>

        <section class="card settings-block">
          <div class="settings-intro">
            <h2>Notas de serviço</h2>
            <p>Textos padrão preenchidos em toda nota nova. Dá para mudar nota a nota.</p>
          </div>
          <div class="settings-fields">
            <div class="grid-2">
              <label class="field">Próximo número <input name="proximoNumero" type="number" min="1" class="mono" value="${U.esc(c.proximoNumero)}"></label>
              <label class="field">Validade do orçamento (dias) <input name="validadeOrcamento" type="number" min="1" class="mono" value="${U.esc(c.validadeOrcamento)}"></label>
            </div>
            <label class="field">Garantia padrão <textarea name="garantia" rows="3">${U.esc(c.garantia)}</textarea></label>
            <label class="field">Observação padrão <textarea name="observacao" rows="2">${U.esc(c.observacao)}</textarea></label>
          </div>
        </section>

        <div class="settings-save">
          <button class="btn btn-primary" type="submit">${U.icon('check')}<span>Salvar configurações</span></button>
        </div>
      </form>

      <section class="card settings-block">
        <div class="settings-intro">
          <h2>Backup dos dados</h2>
          <p>Os dados ficam salvos neste navegador. Faça um backup de vez em quando e guarde o arquivo no computador ou no celular.</p>
        </div>
        <div class="settings-fields">
          <div class="btn-row">
            <button class="btn" id="bk-export">${U.icon('download')}<span>Baixar backup</span></button>
            <label class="btn">${U.icon('upload')}<span>Restaurar backup</span><input type="file" id="bk-import" accept="application/json,.json" hidden></label>
          </div>
          <p class="muted small">${Store.all('clientes').length} clientes · ${Store.all('agendamentos').length} agendamentos · ${Store.all('notas').length} notas · ${Store.all('catalogo').length} itens no catálogo</p>
        </div>
      </section>

      <section class="card settings-block danger-zone">
        <div class="settings-intro">
          <h2>Zona de cuidado</h2>
          <p>Ações que não podem ser desfeitas.</p>
        </div>
        <div class="settings-fields">
          <div class="btn-row">
            <button class="btn" id="dz-exemplos">Carregar dados de exemplo</button>
            <button class="btn btn-ghost-danger" id="dz-reset">${U.icon('trash')}<span>Apagar todos os dados</span></button>
          </div>
        </div>
      </section>`;

    const f = el.querySelector('#cfg-form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const d = f.elements;
      const dias = [...f.querySelectorAll('[name=dias]:checked')].map((x) => Number(x.value));
      if (U.timeToMin(d.fechamento.value) <= U.timeToMin(d.abertura.value)) {
        UI.toast('O horário de fechamento precisa ser depois da abertura', 'error');
        return;
      }
      Object.assign(Store.config, {
        nome: d.nome.value.trim(),
        razao: d.razao.value.trim(),
        cnpj: d.cnpj.value.trim(),
        telefone: d.telefone.value.trim(),
        whatsapp: d.whatsapp.value.trim(),
        endereco: d.endereco.value.trim(),
        cidade: d.cidade.value.trim(),
        email: d.email.value.trim(),
        abertura: d.abertura.value,
        fechamento: d.fechamento.value,
        intervalo: Number(d.intervalo.value),
        dias: dias.length ? dias : [1, 2, 3, 4, 5],
        proximoNumero: Math.max(1, Number(d.proximoNumero.value) || 1),
        validadeOrcamento: Math.max(1, Number(d.validadeOrcamento.value) || 10),
        garantia: d.garantia.value.trim(),
        observacao: d.observacao.value.trim()
      });
      Store.save();
      App.updateBrand();
      UI.toast('Configurações salvas');
    });

    el.querySelector('#bk-export').addEventListener('click', () => {
      U.downloadFile(`backup-mecanica-julio-${U.today()}.json`, Store.exportar());
      UI.toast('Backup baixado');
    });
    el.querySelector('#bk-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!(await UI.confirm('Restaurar este backup vai substituir todos os dados atuais. Continuar?', { title: 'Restaurar backup', ok: 'Restaurar', danger: true }))) {
        e.target.value = '';
        return;
      }
      try {
        Store.importar(await file.text());
        App.updateBrand();
        UI.toast('Backup restaurado');
        App.refresh();
      } catch (err) {
        UI.toast(err.message || 'Não foi possível ler o arquivo', 'error');
      }
    });
    el.querySelector('#dz-exemplos').addEventListener('click', async () => {
      const temDados = Store.all('notas').length || Store.all('clientes').length;
      if (temDados && !(await UI.confirm('Isso substitui clientes, agendamentos, notas e catálogo atuais por dados de exemplo.', { ok: 'Substituir', danger: true }))) return;
      Store.exemplos();
      UI.toast('Dados de exemplo carregados');
      location.hash = '#/painel';
    });
    el.querySelector('#dz-reset').addEventListener('click', async () => {
      if (await UI.confirm('Apagar TODOS os clientes, agendamentos, notas e configurações deste navegador? Baixe um backup antes, se precisar.', { title: 'Apagar tudo', ok: 'Apagar tudo', danger: true })) {
        Store.resetar();
        App.updateBrand();
        UI.toast('Dados apagados');
        location.hash = '#/painel';
      }
    });
  }

  window.ViewConfig = { render, title: 'Configurações' };
})();
