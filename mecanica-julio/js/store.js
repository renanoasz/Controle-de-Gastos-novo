/* Persistência local (localStorage) e regras de negócio */
(function () {
  const KEY = 'mecanica-julio:v1';

  const STATUS_AG = {
    agendado: { label: 'Agendado', cls: 'st-agendado' },
    confirmado: { label: 'Confirmado', cls: 'st-confirmado' },
    andamento: { label: 'Em serviço', cls: 'st-andamento' },
    pronto: { label: 'Pronto p/ retirada', cls: 'st-pronto' },
    concluido: { label: 'Entregue', cls: 'st-concluido' },
    faltou: { label: 'Não compareceu', cls: 'st-cancelado' },
    cancelado: { label: 'Cancelado', cls: 'st-cancelado' }
  };

  const STATUS_NOTA = {
    orcamento: { label: 'Orçamento', cls: 'st-orcamento' },
    aberta: { label: 'Em aberto', cls: 'st-andamento' },
    paga: { label: 'Paga', cls: 'st-concluido' },
    cancelada: { label: 'Cancelada', cls: 'st-cancelado' }
  };

  const PAGAMENTOS = ['A combinar', 'Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'];

  function defaults() {
    return {
      versao: 1,
      config: {
        nome: 'Mecânica Julio',
        razao: '',
        cnpj: '',
        telefone: '',
        whatsapp: '',
        email: '',
        endereco: '',
        cidade: '',
        abertura: '08:00',
        fechamento: '18:00',
        intervalo: 30,
        dias: [1, 2, 3, 4, 5, 6],
        proximoNumero: 1,
        garantia: 'Garantia de 90 dias para serviços de mão de obra e conforme fabricante para peças, contados a partir da data de entrega do veículo (CDC, art. 26).',
        observacao: 'Peças substituídas ficam à disposição do cliente por 7 dias.',
        validadeOrcamento: 10
      },
      clientes: [],
      agendamentos: [],
      notas: [],
      catalogo: []
    };
  }

  const Store = {
    STATUS_AG,
    STATUS_NOTA,
    PAGAMENTOS,
    data: null,
    listeners: [],

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        this.data = parsed ? this.migrate(parsed) : defaults();
      } catch (e) {
        console.warn('Falha ao ler dados locais', e);
        this.data = defaults();
      }
      return this.data;
    },

    migrate(d) {
      const base = defaults();
      return {
        ...base,
        ...d,
        config: { ...base.config, ...(d.config || {}) },
        clientes: d.clientes || [],
        agendamentos: d.agendamentos || [],
        notas: d.notas || [],
        catalogo: d.catalogo || []
      };
    },

    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error(e);
        if (window.UI) UI.toast('Não foi possível salvar no navegador (armazenamento cheio?)', 'error');
      }
      this.listeners.forEach((fn) => fn());
    },

    onChange(fn) {
      this.listeners.push(fn);
    },

    get config() {
      return this.data.config;
    },

    /* ---------- coleções genéricas ---------- */
    all(col) {
      return this.data[col];
    },
    get(col, id) {
      return this.data[col].find((x) => x.id === id) || null;
    },
    upsert(col, obj) {
      const list = this.data[col];
      const now = new Date().toISOString();
      if (!obj.id) {
        obj.id = U.uid();
        obj.criadoEm = now;
        list.push(obj);
      } else {
        const i = list.findIndex((x) => x.id === obj.id);
        if (i >= 0) list[i] = { ...list[i], ...obj };
        else list.push(obj);
      }
      obj.atualizadoEm = now;
      this.save();
      return this.get(col, obj.id);
    },
    remove(col, id) {
      this.data[col] = this.data[col].filter((x) => x.id !== id);
      this.save();
    },

    /* ---------- clientes ---------- */
    findCliente(nome, telefone) {
      const n = U.norm(nome);
      const t = U.digits(telefone);
      if (!n) return null;
      const list = this.data.clientes;
      return (
        list.find((c) => U.norm(c.nome) === n && t && U.digits(c.telefone) === t) ||
        list.find((c) => U.norm(c.nome) === n && (!t || !U.digits(c.telefone))) ||
        list.find((c) => U.norm(c.nome) === n) ||
        null
      );
    },

    clienteByPlaca(placa) {
      const p = U.plate(placa);
      if (!p) return null;
      return this.data.clientes.find((c) => (c.veiculos || []).some((v) => U.plate(v.placa) === p)) || null;
    },

    /* Cria/atualiza cliente e veículo a partir de um formulário (agendamento ou nota). Retorna id. */
    syncCliente({ clienteId, nome, telefone, documento, endereco, veiculo }) {
      nome = String(nome || '').trim();
      if (!nome) return null;
      let c = clienteId ? this.get('clientes', clienteId) : null;
      if (c && U.norm(c.nome) !== U.norm(nome)) c = null;
      if (!c) c = this.findCliente(nome, telefone);
      if (!c) {
        c = { id: U.uid(), nome, telefone: '', documento: '', endereco: '', email: '', obs: '', veiculos: [], criadoEm: new Date().toISOString() };
        this.data.clientes.push(c);
      }
      if (telefone) c.telefone = telefone;
      if (documento) c.documento = documento;
      if (endereco) c.endereco = endereco;
      c.veiculos = c.veiculos || [];
      if (veiculo && (veiculo.placa || veiculo.modelo)) {
        const p = U.plate(veiculo.placa);
        let v = p ? c.veiculos.find((x) => U.plate(x.placa) === p) : c.veiculos.find((x) => U.norm(x.modelo) === U.norm(veiculo.modelo));
        if (!v) {
          v = { id: U.uid(), modelo: '', placa: '', ano: '', cor: '', km: '' };
          c.veiculos.push(v);
        }
        ['modelo', 'ano', 'cor', 'km'].forEach((k) => {
          if (veiculo[k]) v[k] = veiculo[k];
        });
        if (p) v.placa = p;
      }
      c.atualizadoEm = new Date().toISOString();
      this.save();
      return c.id;
    },

    historicoCliente(id) {
      const notas = this.data.notas.filter((n) => n.clienteId === id).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      const ags = this.data.agendamentos.filter((a) => a.clienteId === id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
      const gasto = notas.filter((n) => n.status === 'paga').reduce((s, n) => s + this.totais(n).total, 0);
      const ultima = [...notas.map((n) => n.data), ...ags.filter((a) => a.status === 'concluido').map((a) => a.data)].sort().pop() || '';
      return { notas, ags, gasto, ultima };
    },

    /* ---------- agendamentos ---------- */
    agendamentosDoDia(iso) {
      return this.data.agendamentos.filter((a) => a.data === iso).sort((a, b) => a.hora.localeCompare(b.hora));
    },

    conflitos(ag) {
      if (!ag.data || !ag.hora) return [];
      const ini = U.timeToMin(ag.hora);
      const fim = ini + (Number(ag.duracao) || 60);
      return this.data.agendamentos.filter((o) => {
        if (o.id === ag.id || o.data !== ag.data) return false;
        if (o.status === 'cancelado' || o.status === 'faltou') return false;
        const oi = U.timeToMin(o.hora);
        const of = oi + (Number(o.duracao) || 60);
        return ini < of && oi < fim;
      });
    },

    /* ---------- notas ---------- */
    totais(n) {
      const pecas = (n.pecas || []).reduce((s, i) => s + U.parseNum(i.qtd) * U.parseNum(i.unit), 0);
      const servicos = (n.servicos || []).reduce((s, i) => s + U.parseNum(i.qtd) * U.parseNum(i.unit), 0);
      const bruto = pecas + servicos;
      const dv = U.parseNum(n.desconto);
      const desconto = Math.min(bruto, n.descontoTipo === 'pct' ? (bruto * dv) / 100 : dv);
      const acrescimo = U.parseNum(n.acrescimo);
      return {
        pecas: U.round2(pecas),
        servicos: U.round2(servicos),
        bruto: U.round2(bruto),
        desconto: U.round2(desconto),
        acrescimo: U.round2(acrescimo),
        total: U.round2(bruto - desconto + acrescimo)
      };
    },

    novaNota(extra = {}) {
      const c = this.config;
      return {
        id: null,
        numero: null,
        status: 'aberta',
        data: U.today(),
        validade: U.addDays(U.today(), Number(c.validadeOrcamento) || 10),
        clienteId: null,
        cliente: { nome: '', telefone: '', documento: '', endereco: '' },
        veiculo: { modelo: '', placa: '', ano: '', cor: '', km: '' },
        defeito: '',
        pecas: [],
        servicos: [],
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        pagamento: 'A combinar',
        parcelas: 1,
        garantia: c.garantia,
        obs: c.observacao,
        agendamentoId: null,
        ...extra
      };
    },

    salvarNota(n) {
      if (!n.numero) {
        n.numero = this.proximoNumero();
      }
      n.clienteId = this.syncCliente({
        clienteId: n.clienteId,
        nome: n.cliente.nome,
        telefone: n.cliente.telefone,
        documento: n.cliente.documento,
        endereco: n.cliente.endereco,
        veiculo: n.veiculo
      });
      if (n.status === 'paga' && !n.pagaEm) n.pagaEm = U.today();
      if (n.status !== 'paga') n.pagaEm = null;
      const saved = this.upsert('notas', n);
      if (saved.agendamentoId) {
        const ag = this.get('agendamentos', saved.agendamentoId);
        if (ag && ag.notaId !== saved.id) {
          ag.notaId = saved.id;
          this.save();
        }
      }
      return saved;
    },

    proximoNumero() {
      const maxUsado = this.data.notas.reduce((m, n) => Math.max(m, Number(n.numero) || 0), 0);
      const num = Math.max(Number(this.config.proximoNumero) || 1, maxUsado + 1);
      this.config.proximoNumero = num + 1;
      return num;
    },

    /* ---------- catálogo ---------- */
    catalogo(tipo) {
      return this.data.catalogo.filter((i) => !tipo || i.tipo === tipo).sort((a, b) => a.desc.localeCompare(b.desc, 'pt-BR'));
    },

    /* ---------- backup ---------- */
    exportar() {
      return JSON.stringify({ app: 'mecanica-julio', exportadoEm: new Date().toISOString(), ...this.data }, null, 2);
    },
    importar(json) {
      const d = JSON.parse(json);
      if (!d || typeof d !== 'object' || !Array.isArray(d.notas) || !Array.isArray(d.agendamentos)) {
        throw new Error('Arquivo de backup inválido');
      }
      delete d.app;
      delete d.exportadoEm;
      this.data = this.migrate(d);
      this.save();
    },
    resetar() {
      this.data = defaults();
      this.save();
    },

    /* ---------- dados de exemplo ---------- */
    exemplos() {
      const t = U.today();
      const cfg = this.data.config;
      const cat = [
        ['peca', 'Óleo motor 5W30 sintético (litro)', 'OL-5W30', 52],
        ['peca', 'Filtro de óleo', 'FO-110', 38],
        ['peca', 'Filtro de ar do motor', 'FA-220', 45],
        ['peca', 'Filtro de combustível', 'FC-330', 42],
        ['peca', 'Filtro de cabine', 'FCB-14', 39],
        ['peca', 'Pastilha de freio dianteira (jogo)', 'PF-778', 189],
        ['peca', 'Disco de freio dianteiro (par)', 'DF-260', 420],
        ['peca', 'Fluido de freio DOT 4 (500 ml)', 'DOT4', 36],
        ['peca', 'Vela de ignição', 'VI-9', 34],
        ['peca', 'Correia dentada', 'CD-118', 165],
        ['peca', 'Tensor da correia', 'TC-118', 210],
        ['peca', 'Bomba d\'água', 'BA-55', 280],
        ['peca', 'Aditivo radiador (litro)', 'AD-1', 29],
        ['peca', 'Amortecedor dianteiro', 'AM-D', 365],
        ['peca', 'Bateria 60Ah', 'BT-60', 520],
        ['servico', 'Troca de óleo e filtro', '', 60],
        ['servico', 'Revisão completa', '', 250],
        ['servico', 'Troca de pastilhas de freio', '', 120],
        ['servico', 'Troca de discos e pastilhas', '', 180],
        ['servico', 'Troca de correia dentada', '', 350],
        ['servico', 'Alinhamento e balanceamento', '', 120],
        ['servico', 'Diagnóstico com scanner', '', 100],
        ['servico', 'Limpeza de bicos injetores', '', 180],
        ['servico', 'Troca de amortecedores (par)', '', 200],
        ['servico', 'Hora técnica', '', 120]
      ];
      this.data.catalogo = cat.map(([tipo, desc, cod, preco]) => ({ id: U.uid(), tipo, desc, cod, preco }));

      const clientes = [
        ['Marcos Antônio Ribeiro', '11987654321', [['VW Gol 1.6 2015', 'FHT2B41', 2015, 'Prata', '98500']]],
        ['Fernanda Lopes', '11991234567', [['Fiat Argo Drive 1.3', 'GDA7C12', 2020, 'Branco', '41200']]],
        ['Carlos Eduardo Souza', '11976543210', [['Chevrolet Onix LT', 'QPR4E88', 2019, 'Preto', '67300'], ['Toyota Hilux SRV', 'EZK9031', 2014, 'Cinza', '182000']]],
        ['Juliana Martins', '11965432109', [['Hyundai HB20 Comfort', 'RTA1F55', 2021, 'Vermelho', '28900']]],
        ['Roberto Almeida', '11954321098', [['Ford Ka SE 1.0', 'FKL3D20', 2018, 'Azul', '75400']]],
        ['Patrícia Gomes', '11943210987', [['Renault Sandero', 'HJB5A73', 2016, 'Prata', '110300']]],
        ['Anderson Ferreira', '11932109876', [['Honda Civic EXL', 'GHE8B19', 2017, 'Preto', '89000']]]
      ];
      this.data.clientes = clientes.map(([nome, tel, vs]) => ({
        id: U.uid(),
        nome,
        telefone: tel,
        documento: '',
        endereco: '',
        email: '',
        obs: '',
        criadoEm: new Date().toISOString(),
        veiculos: vs.map(([modelo, placa, ano, cor, km]) => ({ id: U.uid(), modelo, placa, ano: String(ano), cor, km }))
      }));
      const C = this.data.clientes;
      const vei = (c, i = 0) => ({ ...c.veiculos[i] });

      const mk = (dOff, hora, dur, ci, vi, servico, status) => {
        const c = C[ci];
        const v = vei(c, vi);
        return {
          id: U.uid(),
          data: U.addDays(t, dOff),
          hora,
          duracao: dur,
          clienteId: c.id,
          cliente: { nome: c.nome, telefone: c.telefone },
          veiculo: { modelo: v.modelo, placa: v.placa },
          servico,
          status,
          obs: '',
          criadoEm: new Date().toISOString()
        };
      };
      const nowH = new Date().getHours();
      this.data.agendamentos = [
        mk(0, '08:00', 90, 0, 0, 'Troca de óleo e filtros', nowH >= 10 ? 'concluido' : 'confirmado'),
        mk(0, '09:30', 120, 1, 0, 'Freios dianteiros – barulho ao frear', nowH >= 10 ? 'andamento' : 'confirmado'),
        mk(0, '13:00', 180, 2, 1, 'Revisão 180 mil km', 'agendado'),
        mk(0, '16:00', 60, 3, 0, 'Diagnóstico – luz da injeção acesa', 'agendado'),
        mk(1, '08:30', 240, 4, 0, 'Troca de correia dentada e bomba d\'água', 'confirmado'),
        mk(1, '14:00', 60, 5, 0, 'Alinhamento e balanceamento', 'agendado'),
        mk(2, '10:00', 120, 6, 0, 'Suspensão – troca de amortecedores', 'agendado'),
        mk(3, '09:00', 60, 2, 0, 'Troca de óleo', 'agendado'),
        mk(-1, '08:00', 120, 5, 0, 'Revisão completa', 'concluido'),
        mk(-1, '14:00', 60, 3, 0, 'Troca de bateria', 'concluido'),
        mk(-2, '10:00', 90, 6, 0, 'Limpeza de bicos', 'faltou')
      ];

      const P = (d) => this.data.catalogo.find((x) => x.desc.startsWith(d));
      const item = (d, qtd) => {
        const c = P(d);
        return { desc: c.desc, cod: c.cod, qtd, unit: c.preco };
      };
      const nota = (dOff, ci, status, pecas, servicos, extra = {}) => {
        const c = C[ci];
        const v = c.veiculos[0];
        return {
          ...this.novaNota(),
          id: U.uid(),
          numero: 0,
          status,
          data: U.addDays(t, dOff),
          clienteId: c.id,
          cliente: { nome: c.nome, telefone: c.telefone, documento: '', endereco: '' },
          veiculo: { modelo: v.modelo, placa: v.placa, ano: v.ano, cor: v.cor, km: v.km },
          pecas,
          servicos,
          pagamento: status === 'paga' ? 'PIX' : 'A combinar',
          pagaEm: status === 'paga' ? U.addDays(t, dOff) : null,
          criadoEm: new Date().toISOString(),
          ...extra
        };
      };
      const notas = [
        nota(-48, 0, 'paga', [item('Pastilha', 1), item('Fluido', 1)], [item('Troca de pastilhas', 1)]),
        nota(-40, 6, 'paga', [item('Correia', 1), item('Tensor', 1), item('Bomba', 1), item('Aditivo', 3)], [item('Troca de correia', 1)]),
        nota(-33, 4, 'paga', [item('Óleo', 4), item('Filtro de óleo', 1)], [item('Troca de óleo', 1)]),
        nota(-25, 2, 'paga', [item('Amortecedor', 2)], [item('Troca de amortecedores', 1), item('Alinhamento', 1)], { desconto: 50 }),
        nota(-18, 1, 'paga', [item('Vela', 4), item('Filtro de ar', 1)], [item('Diagnóstico', 1), item('Limpeza', 1)]),
        nota(-9, 3, 'paga', [item('Óleo', 4), item('Filtro de óleo', 1), item('Filtro de cabine', 1)], [item('Revisão completa', 1)]),
        nota(-1, 5, 'paga', [item('Óleo', 4), item('Filtro de óleo', 1), item('Filtro de ar', 1), item('Filtro de combustível', 1)], [item('Revisão completa', 1)], { desconto: 5, descontoTipo: 'pct' }),
        nota(-1, 3, 'aberta', [item('Bateria', 1)], [item('Hora técnica', 0.5)], { pagamento: 'Cartão de crédito', parcelas: 2 }),
        nota(0, 0, 'aberta', [item('Óleo', 4), item('Filtro de óleo', 1), item('Filtro de ar', 1)], [item('Troca de óleo', 1)]),
        nota(0, 4, 'orcamento', [item('Correia', 1), item('Tensor', 1), item('Bomba', 1)], [item('Troca de correia', 1)], { defeito: 'Correia com 70 mil km, cliente pediu orçamento antes da troca.' })
      ];
      notas.forEach((n, i) => (n.numero = i + 1));
      this.data.notas = notas;
      this.data.agendamentos[0].notaId = notas[8].id;
      notas[8].agendamentoId = this.data.agendamentos[0].id;
      cfg.proximoNumero = notas.length + 1;
      if (!cfg.telefone) cfg.telefone = '(11) 3456-7890';
      if (!cfg.whatsapp) cfg.whatsapp = '(11) 98888-7777';
      if (!cfg.endereco) cfg.endereco = 'Rua das Oficinas, 245 – Vila Industrial';
      if (!cfg.cidade) cfg.cidade = 'São Paulo – SP';
      if (!cfg.cnpj) cfg.cnpj = '12.345.678/0001-90';
      this.save();
    }
  };

  window.Store = Store;
})();
