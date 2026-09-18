/* =========================================================
   סטודיו קוד — interactions
   Vanilla JS. No dependencies.
   טופס יצירת הקשר שולח ליד אוטומטית ל-/api/leads בלוח הניהול (tools/dashboard-server.py).
   ========================================================= */
(function () {
  'use strict';

  /* ===== פרטי הסטודיו — נוצרו ע"י tools/build-deploy-kit.py =============
     email: דוא"ל הפניות שמוצג באתר ובטופס. ntfy: ערוץ הפניות הקבוע —
     זמין תמיד גם כשהמחשב כבוי; הלוח המקומי מושך ממנו כשעולה.              */
  var STUDIO = {
    whatsapp: '',
    email: '',
    formsApi: 'https://crafts-preparing-hardwood-choir.trycloudflare.com/api/leads',
    ntfy: 'https://ntfy.sh/studio-code-leads-7454428a208fb75a9751b82d',
    leadsApi: (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
      ? 'http://127.0.0.1:8134/api/leads'
      : 'https://crafts-preparing-hardwood-choir.trycloudflare.com/api/leads'
  };
  var LEADS_API = STUDIO.leadsApi;

  function fallbackHref(payload) {
    var lines = ['פנייה חדשה מהאתר'];
    if (payload.name) lines.push('שם: ' + payload.name);
    if (payload.phone) lines.push('טלפון: ' + payload.phone);
    if (payload.email) lines.push('דוא״ל: ' + payload.email);
    if (payload.budget) lines.push('תקציב: ' + payload.budget);
    if (payload.message) lines.push('פרטים: ' + payload.message);
    if (STUDIO.whatsapp) {
      return 'https://wa.me/' + STUDIO.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
    }
    return 'mailto:' + STUDIO.email + '?body=' + encodeURIComponent(lines.join('\n'));
  }

  /* ---- Current year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Sticky header shadow ---- */
  var header = document.querySelector('.site-header');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (toTop) toTop.hidden = y < 600;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav ---- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  function closeNav() {
    if (!links) return;
    links.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 720) closeNav();
    });
  }

  /* ---- Back to top ---- */
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Logo / brand: always return to the very top ----
     The #top anchor sits on the sticky header, which is pinned at top:0, so the
     browser treats it as "already here" and never scrolls. Handle it in JS. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function goTop(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    closeNav();
    var brand = document.querySelector('.brand');
    if (brand && brand.focus) brand.focus({ preventScroll: true });
  }
  var brandLinks = document.querySelectorAll('a.brand[href="#top"]');
  brandLinks.forEach(function (b) { b.addEventListener('click', goTop); });

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- FAQ: keep one open at a time ---- */
  var qas = document.querySelectorAll('.faq .qa');
  qas.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) qas.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---- Contact form: validates locally, then POSTs the lead to the dashboard API ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    var status = document.getElementById('formStatus');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var phoneRe = /^[+\d][\d\s().-]{6,}$/;

    function fieldOf(input) { return input.closest('.field'); }
    function setErr(input, msg) {
      var f = fieldOf(input); if (!f) return;
      var slot = f.querySelector('.err');
      f.classList.toggle('invalid', !!msg);
      if (slot) slot.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    var rules = {
      name: function (v) {
        if (!v.trim()) return 'נא למלא שם.';
        if (v.trim().length < 2) return 'השם קצר מדי.';
        return '';
      },
      email: function (v) {
        if (!v.trim()) return 'נא למלא דוא״ל.';
        if (!emailRe.test(v.trim())) return 'כתובת דוא״ל לא תקינה.';
        return '';
      },
      phone: function (v) {
        if (!v.trim()) return ''; // optional
        if (!phoneRe.test(v.trim())) return 'מספר טלפון לא תקין.';
        return '';
      },
      message: function (v) {
        if (!v.trim()) return 'נא לכתוב כמה מילים על הפרויקט.';
        if (v.trim().length < 10) return 'נא לפרט קצת יותר (10 תווים לפחות).';
        return '';
      }
    };

    Object.keys(rules).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('blur', function () { setErr(input, rules[id](input.value)); });
      input.addEventListener('input', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('invalid')) {
          setErr(input, rules[id](input.value));
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(rules).forEach(function (id) {
        var input = document.getElementById(id);
        if (!input) return;
        var msg = rules[id](input.value);
        setErr(input, msg);
        if (msg && !firstBad) firstBad = input;
      });

      if (firstBad) {
        if (status) { status.className = 'form-status bad'; status.textContent = 'יש כמה שדות לתקן לפני השליחה.'; }
        firstBad.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'נשלח…'; }
      if (status) { status.className = 'form-status'; status.textContent = 'שולח…'; }

      function done() { if (btn) { btn.disabled = false; btn.textContent = label; } }

      /* מקור-הפנייה: מאפשר לדעת איזו רשת הביאה את הלקוח (utm_source / src / ref)
         — כך פרסום ברשתות הופך מדיד בלוח. ניקוי מלא לפני שליחה. */
      function campaignSource() {
        var q = null;
        try { q = new URLSearchParams(location.search); } catch (err) { return 'site-form'; }
        var raw = q.get('utm_source') || q.get('src') || q.get('ref') || '';
        raw = String(raw).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
        return raw || 'site-form';
      }

      var payload = {
        name: (document.getElementById('name') || {}).value || '',
        email: (document.getElementById('email') || {}).value || '',
        phone: (document.getElementById('phone') || {}).value || '',
        budget: (document.getElementById('budget') || {}).value || '',
        message: (document.getElementById('message') || {}).value || '',
        source: campaignSource(),
        page: location.pathname
      };

      /* שני ערוצים במקביל:
         1) ntfy — ערוץ קבוע שזמין תמיד, גם כשהמחשב של הסטודיו כבוי. הפנייה
            נשמרת שם ונדחפת כהתראה; הלוח המקומי מושך אותה כשהוא חוזר לאוויר.
         2) הלוח המקומי (או המנהרה) — עיבוד מיידי: ליד + הצעה אוטומטית.
         די שאחד מהם יצליח כדי שהפנייה לא תאבד. */
      var tries = [];
      if (STUDIO.ntfy) {
        tries.push(fetch(STUDIO.ntfy, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Title': '=?UTF-8?B?16TXoNeZ15nXlCDXl9eT16nXlCDXnteU15DXqteo?=',
            'Tags': 'incoming_envelope'
          },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error('ntfy ' + res.status);
          return { via: 'ntfy' };
        }));
      }
      if (LEADS_API) {
        tries.push(fetch(LEADS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          return res.json().then(function (d) {
            if (!res.ok || !d.ok) throw new Error((d && d.error) || 'השליחה נכשלה');
            return { via: 'board', duplicate: !!d.duplicate };
          });
        }));
      }
      if (!tries.length) {
        if (status) {
          status.className = 'form-status bad';
          status.textContent = 'הטופס אינו מחובר כרגע. אפשר לכתוב ל-' + (STUDIO.email || 'הסטודיו') + '.';
        }
        done();
        return;
      }
      Promise.all(tries.map(function (p) {
        return p.then(function (v) { return v; }, function (e) { return { err: e }; });
      })).then(function (rs) {
        var good = rs.filter(function (r) { return !r.err; });
        if (!good.length) throw new Error((rs[0].err && rs[0].err.message) || 'השליחה נכשלה');
        var board = null;
        good.forEach(function (r) { if (r.via === 'board') board = r; });
        if (status) {
          status.className = 'form-status ok';
          if (board) {
            status.textContent = board.duplicate
              ? 'תודה! זיהינו פנייה חוזרת — עדכנו את הליד הקיים בלוח.'
              : 'תודה! הפנייה נקלטה ונפתחה כ"ליד" בלוח הניהול. נחזור אליך בקרוב.';
          } else {
            status.textContent = 'תודה! הפנייה נשלחה לסטודיו. נחזור אליך בקרוב.';
          }
        }
        form.reset();
      }).catch(function (err) {
        if (status) {
          status.className = 'form-status bad';
          var alt = '';
          if (STUDIO.whatsapp) {
            alt = ' אפשר <a href="' + fallbackHref(payload) + '" target="_blank" rel="noopener">'
              + 'לשלוח בוואטסאפ</a>.';
          } else if (STUDIO.email) {
            alt = ' אפשר לכתוב ל-<a href="mailto:' + STUDIO.email + '">' + STUDIO.email + '</a>.';
          }
          status.innerHTML = 'לא הצלחנו לשלוח כרגע — נסו שוב בעוד רגע.' + alt;
        }
      }).then(done);
  });
  }

  /* ---- Dashboard: tabs + demo data ---- */
  var dash = document.getElementById('dash');
  if (dash) {
    var MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
    var DASH = {
      overview: {
        title: 'הכנסות לפי חודש', unit: '₪ באלפים',
        kpis: { visitors: '12,480', leads: '318', cr: '2.5%', revenue: '₪284K' },
        deltas: { visitors: '+18%', leads: '+24%', cr: '+0.4 נק׳', revenue: '+31%' },
        bars: [32, 38, 35, 44, 49, 46, 58, 62, 57, 71, 78, 92],
        rows: [
          ['חיפוש אורגני (SEO)', '5,120', '148', '2.9%'],
          ['Google Ads', '3,940', '96', '2.4%'],
          ['אינסטגרם וטיקטוק', '2,180', '52', '2.4%'],
          ['הפניות ולקוחות חוזרים', '1,240', '22', '1.8%']
        ]
      },
      traffic: {
        title: 'ביקורים לפי חודש', unit: 'ביקורים',
        kpis: { visitors: '12,480', leads: '298', cr: '2.4%', revenue: '6:12' },
        deltas: { visitors: '+18%', leads: '+9%', cr: '-0.1 נק׳', revenue: '+41 שנ׳' },
        bars: [41, 45, 43, 52, 55, 51, 60, 66, 63, 69, 74, 81],
        rows: [
          ['חיפוש אורגני (SEO)', '5,120', '148', '2.9%'],
          ['Google Ads', '3,940', '96', '2.4%'],
          ['אינסטגרם וטיקטוק', '2,180', '36', '1.7%'],
          ['הפניות ולקוחות חוזרים', '1,240', '18', '1.5%']
        ]
      },
      leads: {
        title: 'לידים לפי חודש', unit: 'פניות',
        kpis: { visitors: '318', leads: '298', cr: '1 מכל 8', revenue: '2.4 שעות' },
        deltas: { visitors: '+24%', leads: '+22%', cr: '+0.3 נק׳', revenue: '-26 דק׳' },
        bars: [22, 28, 25, 34, 39, 36, 45, 52, 48, 61, 66, 78],
        rows: [
          ['טופס יצירת קשר', '—', '132', '41%'],
          ['וואטסאפ', '—', '98', '31%'],
          ['שיחת טלפון', '—', '52', '16%'],
          ['מייל ישיר', '—', '36', '12%']
        ]
      },
      sales: {
        title: 'עסקאות שנסגרו', unit: 'עסקאות בחודש',
        kpis: { visitors: '46', leads: '₪284K', cr: '₪6,170', revenue: '68%' },
        deltas: { visitors: '+11 עסקאות', leads: '+31%', cr: '+4%', revenue: '+7 נק׳' },
        bars: [18, 22, 20, 26, 30, 28, 34, 38, 36, 42, 46, 52],
        rows: [
          ['אתרים תדמיתיים', '11', '₪96K', '₪8,700'],
          ['חנויות אונליין', '7', '₪112K', '₪16,000'],
          ['אפליקציות ווב', '4', '₪58K', '₪14,500'],
          ['ריטיינר שיווק', '24', '₪18K', '₪750']
        ]
      }
    };

    var barsEl = dash.querySelector('[data-bars]');
    var barsXEl = dash.querySelector('[data-bars-x]');
    var rowsEl = dash.querySelector('[data-rows]');
    var tabs = dash.querySelectorAll('.dash-tab');

    /* bars + month labels are built once; only heights change per tab */
    var barItems = [];
    if (barsEl) {
      MONTHS.forEach(function (name, i) {
        var li = document.createElement('li');
        barsEl.appendChild(li);
        barItems.push(li);
        if (barsXEl) {
          var xi = document.createElement('li');
          xi.textContent = name;
          barsXEl.appendChild(xi);
        }
      });
    }

    function heightClass(v) {
      return 'h' + Math.max(10, Math.min(100, Math.round(v / 10) * 10));
    }

    function paint(key) {
      var d = DASH[key] || DASH.overview;

      Object.keys(d.kpis).forEach(function (k) {
        var v = dash.querySelector('[data-kpi="' + k + '"]');
        var dl = dash.querySelector('[data-delta="' + k + '"]');
        if (v) v.textContent = d.kpis[k];
        if (dl) {
          var down = /^[-−]/.test(d.deltas[k]);
          dl.textContent = (down ? '' : '▲ ') + d.deltas[k];
          dl.className = 'k-delta' + (down ? ' down' : '');
        }
      });

      var t = dash.querySelector('[data-chart-title]');
      var u = dash.querySelector('[data-chart-unit]');
      if (t) t.textContent = d.title;
      if (u) u.textContent = d.unit;

      barItems.forEach(function (li, i) {
        var val = d.bars[i] || 0;
        li.className = heightClass(val) + (val >= 75 ? ' hi' : '');
      });

      if (rowsEl) {
        rowsEl.innerHTML = '';
        d.rows.forEach(function (r) {
          var tr = document.createElement('tr');
          r.forEach(function (cell, i) {
            var td = document.createElement('td');
            td.textContent = cell;
            if (i === 0) td.className = 'cell-source';
            tr.appendChild(td);
          });
          rowsEl.appendChild(tr);
        });
      }

      var cap = dash.querySelector('[data-table-caption]');
      var on = dash.querySelector('.dash-tab.is-on');
      if (cap && on) cap.textContent = on.textContent;
    }

    function select(tab) {
      tabs.forEach(function (b) {
        var on = b === tab;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      var panel = document.getElementById('dashPanel');
      if (panel && tab.id) panel.setAttribute('aria-labelledby', tab.id);
      paint(tab.getAttribute('data-tab'));
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        /* RTL: ArrowLeft moves forward, ArrowRight moves back */
        var dir = e.key === 'ArrowLeft' ? 1 : (e.key === 'ArrowRight' ? -1 : 0);
        if (!dir) return;
        e.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });

    paint('overview');
  }

  /* ---- Marketing: reveal funnel bars after the section scrolls in ---- */
  var funnel = document.querySelector('.funnel');
  if (funnel) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); fio.unobserve(en.target); }
      });
    }, { threshold: 0.25 });
    funnel.querySelectorAll('li').forEach(function (li) { fio.observe(li); });
  }

  /* ---- Reading progress bar ---- */
  var bar = document.getElementById('progressBar');
  if (bar) {
    var queued = false;
    var paintBar = function () {
      var doc = document.documentElement;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      var pct = Math.min(100, Math.max(0, (window.scrollY || 0) / max * 100));
      bar.style.width = pct.toFixed(2) + '%';
      queued = false;
    };
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(paintBar); }
    }, { passive: true });
    window.addEventListener('resize', paintBar);
    paintBar();
  }

  /* ---- Staggered reveal delays (per grid) ---- */
  ['.cards', '.steps', '.plans', '.funnel', '.stack'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (grid) {
      var kids = grid.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].classList && kids[i].classList.contains('reveal')) {
          kids[i].style.setProperty('--d', (i * 70) + 'ms');
        }
      }
    });
  });

  /* ---- Count-up numbers ---- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var runCount = function (el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = to.toFixed(dec) + suffix; return; }
      var start = null, dur = 1400;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (to * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCount);
    }
  }

  /* ---- Card spotlight follows the cursor ---- */
  var spotCards = document.querySelectorAll('.card');
  if (spotCards.length) {
    spotCards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }
})();
/* ---------- Accessibility widget ---------- */
(function () {
  var btn = document.getElementById('a11yBtn');
  var panel = document.getElementById('a11yPanel');
  if (!btn || !panel) return;

  var closeBtn = document.getElementById('a11yClose');
  var resetBtn = document.getElementById('a11yReset');
  var opts = panel.querySelectorAll('[data-a11y]');
  var KEY = 'studio-a11y';
  var root = document.documentElement;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function apply(cls, on) { root.classList.toggle('a11y-' + cls, !!on); }

  var state = read();
  Object.keys(state).forEach(function (k) { apply(k, state[k]); });
  Array.prototype.forEach.call(opts, function (o) {
    o.setAttribute('aria-pressed', state[o.getAttribute('data-a11y')] ? 'true' : 'false');
  });

  function open()  { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
  function close() { panel.hidden = true;  btn.setAttribute('aria-expanded', 'false'); btn.focus(); }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);

  Array.prototype.forEach.call(opts, function (o) {
    o.addEventListener('click', function () {
      var k = o.getAttribute('data-a11y');
      state[k] = !state[k];
      apply(k, state[k]);
      o.setAttribute('aria-pressed', state[k] ? 'true' : 'false');
      write(state);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      state = {};
      Object.keys(read()).forEach(function (k) { apply(k, false); });
      Array.prototype.forEach.call(opts, function (o) {
        o.setAttribute('aria-pressed', 'false');
      });
      try { localStorage.removeItem(KEY); } catch (e) {}
    });
  }

  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
})();
