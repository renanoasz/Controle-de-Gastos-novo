/* Utilitários gerais: datas, dinheiro, texto, ícones */
(function () {
  const pad = (n) => String(n).padStart(2, '0');

  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const numFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ICONS = {
    dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="1.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    file: '<path d="M14 2.5H6a1.5 1.5 0 0 0-1.5 1.5v16A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 2.5V8h5.5M15.5 13h-7M15.5 17h-7M10.5 9h-2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.6-4.6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    printer: '<path d="M6 9V2.5h12V9M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7.5H6z"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    copy: '<rect x="9" y="9" width="12.5" height="12.5" rx="1.5"/><path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h9.5A1.5 1.5 0 0 1 15 4v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    car: '<path d="M5 17H3v-5l2.2-5.2A1.5 1.5 0 0 1 6.6 6h10.8a1.5 1.5 0 0 1 1.4.8L21 12v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5M3 12h18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    alert: '<path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    receipt: '<path d="M4 2.5v19l2.5-1.5L9 21.5l3-1.5 3 1.5 2.5-1.5 2.5 1.5v-19l-2.5 1.5L15 2.5 12 4 9 2.5 6.5 4z"/><path d="M8 9h8M8 13h8"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.4z"/><path d="M9.2 8.3c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5a6 6 0 0 0 2.7 2.6c.2.1.4.1.5-.1l.6-.7c.1-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5v.4c0 .4-.2.8-.6 1-.6.3-1.4.5-2.3.2a9.3 9.3 0 0 1-5.3-5c-.4-1-.3-1.9 0-2.4z"/>',
    dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'
  };

  const U = {
    DIAS, DIAS_CURTOS, MESES, MESES_CURTOS, pad,

    uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    icon(name, cls = '') {
      const p = ICONS[name] || '';
      return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    },

    hydrateIcons(root = document) {
      root.querySelectorAll('i[data-icon]').forEach((el) => {
        el.outerHTML = U.icon(el.dataset.icon);
      });
    },

    esc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    money(v) {
      return moneyFmt.format(Number(v) || 0);
    },

    num(v) {
      return numFmt.format(Number(v) || 0);
    },

    /* aceita "1.234,56", "1234.56", "1234,5" */
    parseNum(str) {
      if (typeof str === 'number') return str;
      let s = String(str ?? '').trim().replace(/[^\d,.-]/g, '');
      if (!s) return 0;
      if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    },

    round2(n) {
      return Math.round((Number(n) || 0) * 100) / 100;
    },

    /* ---- datas (sempre strings ISO locais YYYY-MM-DD) ---- */
    toISO(d) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    fromISO(s) {
      const [y, m, d] = String(s).split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    },
    today() {
      return U.toISO(new Date());
    },
    addDays(iso, n) {
      const d = U.fromISO(iso);
      d.setDate(d.getDate() + n);
      return U.toISO(d);
    },
    startOfWeek(iso) {
      const d = U.fromISO(iso);
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow; // segunda-feira
      d.setDate(d.getDate() + diff);
      return U.toISO(d);
    },
    weekday(iso) {
      return U.fromISO(iso).getDay();
    },
    fmtDate(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    },
    fmtDateShort(iso) {
      const d = U.fromISO(iso);
      return `${pad(d.getDate())} ${MESES_CURTOS[d.getMonth()]}`;
    },
    fmtDateLong(iso) {
      const d = U.fromISO(iso);
      return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
    },
    relDay(iso) {
      const t = U.today();
      if (iso === t) return 'Hoje';
      if (iso === U.addDays(t, 1)) return 'Amanhã';
      if (iso === U.addDays(t, -1)) return 'Ontem';
      const d = U.fromISO(iso);
      return `${DIAS_CURTOS[d.getDay()]}, ${U.fmtDateShort(iso)}`;
    },
    monthKey(iso) {
      return String(iso).slice(0, 7);
    },
    timeToMin(t) {
      const [h, m] = String(t || '0:0').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    },
    minToTime(min) {
      return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
    },
    nowMin() {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    },
    fmtDur(min) {
      min = Number(min) || 0;
      const h = Math.floor(min / 60);
      const m = min % 60;
      if (!h) return `${m} min`;
      return m ? `${h}h${pad(m)}` : `${h}h`;
    },

    /* ---- texto ---- */
    norm(s) {
      return String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
    },
    plate(s) {
      return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    },
    fmtPlate(s) {
      const p = U.plate(s);
      if (!p) return '';
      // padrão antigo ABC1234 → ABC-1234 ; Mercosul ABC1D23 mantém
      if (/^[A-Z]{3}\d{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
      return p;
    },
    digits(s) {
      return String(s ?? '').replace(/\D/g, '');
    },
    fmtPhone(s) {
      const d = U.digits(s);
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return s || '';
    },
    waLink(phone, text) {
      let d = U.digits(phone);
      if (d && d.length <= 11) d = '55' + d;
      const q = text ? `?text=${encodeURIComponent(text)}` : '';
      return d ? `https://wa.me/${d}${q}` : `https://wa.me/${q}`;
    },
    initials(name) {
      const parts = String(name || '?').trim().split(/\s+/);
      return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    },
    numeroNota(n) {
      return String(n).padStart(4, '0');
    },
    debounce(fn, ms = 200) {
      let t;
      return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
      };
    },
    downloadFile(name, content, type = 'application/json') {
      const blob = new Blob([content], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 0);
    }
  };

  window.U = U;
})();
