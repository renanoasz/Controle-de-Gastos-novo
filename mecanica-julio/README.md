# Mecânica Julio — Agenda e Notas de Serviço

Sistema web da oficina: agenda de serviços, emissão de notas/orçamentos, cadastro de clientes e veículos e tabela de preços.

## Como usar

- **Abrir no computador:** dê dois cliques em `index.html` (funciona sem internet; só as fontes precisam de conexão).
- **Publicar online (GitHub Pages):** em *Settings → Pages*, escolha o branch e a pasta raiz. O `index.html` da raiz redireciona para `mecanica-julio/`.
- Na primeira vez, o Painel oferece **Carregar exemplos** para conhecer o sistema.
- **Instalar como app:** abra o site publicado no celular e use *Instalar app* / *Adicionar à tela inicial* no menu do navegador (no iPhone: Compartilhar → *Adicionar à Tela de Início*). O app abre em tela cheia e funciona sem internet. As instruções também estão em Configurações.

Ao mudar arquivos do app, aumente `VERSAO` em `sw.js` para os aparelhos baixarem a versão nova de imediato (sem isso, a atualização aparece na abertura seguinte).

Os dados ficam salvos no navegador (localStorage). Use **Configurações → Baixar backup** com frequência e **Restaurar backup** para passar os dados para outro computador ou celular.

## Funcionalidades

**Painel** — carros do dia com linha do tempo e botões rápidos (Iniciar → Pronto → Entregar), agendados da semana, faturamento do mês com comparação ao mês anterior, valores a receber, próximos 7 dias, ticket médio e divisão peças × mão de obra.

**Agenda** — visões Dia, Semana e Lista; clique em um horário vazio para agendar; aviso de conflito de horário; situações (Agendado, Confirmado, Em serviço, Pronto p/ retirada, Entregue, Não compareceu, Cancelado); confirmação pronta por WhatsApp; gera a nota de serviço a partir do agendamento.

**Notas de serviço** — numeração automática; orçamento ou ordem de serviço; peças (código, qtd, valor) e mão de obra (qtd/horas, valor) com autocompletar do catálogo; desconto em R$ ou %, acréscimo, forma de pagamento e parcelas; garantia e observações padrão; impressão em A4 / salvar em PDF com campos de assinatura; envio do resumo pelo WhatsApp; duplicar; "Aprovar orçamento" e "Marcar como paga"; filtros por situação, mês e busca.

**Clientes** — cadastrados automaticamente ao agendar ou emitir nota; vários veículos por cliente; busca por placa; histórico de notas e visitas; total pago.

**Peças e serviços** — tabela de preços editável usada no preenchimento das notas.

**Configurações** — dados da oficina (aparecem na nota impressa), horário e dias de funcionamento, intervalo da agenda, próximo número de nota, validade de orçamento, textos padrão, backup.

Atalhos: `N` novo agendamento · `/` buscar.

## Estrutura

```
mecanica-julio/
  index.html
  manifest.webmanifest  sw.js  icons/
  css/style.css
  js/util.js  store.js  ui.js  app.js
  js/view-*.js   (painel, agenda, notas, clientes, catálogo, configurações)
```

HTML, CSS e JavaScript puros, sem dependências nem build.
