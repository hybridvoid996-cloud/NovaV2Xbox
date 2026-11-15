/* Player page. Server 1 always loads /stream/<token>/<lang>; switching episodes swaps the
   player without a page load and keeps the address bar in step. */
(function () {
  'use strict';

  var box = document.querySelector('[data-hk-watch]');
  if (!box) return;
  var cfg = {};
  try { cfg = JSON.parse(box.getAttribute('data-hk-watch')) || {}; } catch (e) { cfg = {}; }

  var $ = function (sel, el) { return (el || box).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  var Player = {
    ep: cfg.ep || 1,
    token: cfg.token || '',
    lang: cfg.lang || 'sub',
    server: 'backup',
    started: false,
    waitTimer: null,
    checked: false,
    cover: document.getElementById('hk-cover'),
    frame: $('[data-hk-frame]'),
    wait: $('[data-hk-wait]'),
    note: $('[data-hk-note]'),
    pnw: document.querySelector('[data-hk-pnw]'),
    fsl: document.fullscreenEnabled ? document.querySelector('[data-hk-fsl]') : null,

    srcFor: function (server, lang) {
      if (server === 'backup') return this.token ? '/stream/' + this.token + '/' + lang : '';
      var btn = document.querySelector('.hk-srv[data-server="' + server + '"][data-version="' + lang + '"]');
      if (btn && btn.getAttribute('data-src')) return btn.getAttribute('data-src');
      var pat = cfg.mirror && cfg.mirror[server];
      if (!pat || !cfg.al) return '';
      var url = pat.replace('{al}', cfg.al).replace('{ep}', cfg.movie ? 1 : this.ep).replace('{lang}', lang);
      // tryembed: our page runs auto next itself (so the episode list stays in step); its own intro skip follows our switch
      if (server === 'tryembed') url += (url.indexOf('?') === -1 ? '?' : '&') + 'autoNext=false&autoplay=true' + (typeof Auto !== 'undefined' && Auto.on.skip ? '&autoSkip=true' : '');
      // #577: tryembed and vidnest both take ?startAt=<seconds>, so a player switch carries on where you were.
      var at = typeof Spot !== 'undefined' ? Spot.startAt() : 0;
      if (at) url += (url.indexOf('?') === -1 ? '?' : '&') + 'startAt=' + at;
      return url;
    },

    activeButton: function () {
      return document.querySelector('.hk-srv.lit:not([hidden])');
    },

    mark: function (btn) {
      $$('.hk-srv').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('lit', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (btn) { this.lang = btn.getAttribute('data-version'); this.server = btn.getAttribute('data-server'); }
    },

    load: function () {
      var btn = this.activeButton();
      if (btn) { this.lang = btn.getAttribute('data-version'); this.server = btn.getAttribute('data-server'); }
      if (typeof Spot !== 'undefined') Spot.flush();   // the latest time first, so the next player starts there
      var src = this.srcFor(this.server, this.lang);
      if (!src || !this.frame) return;
      if (this.pnw) { this.pnw.hidden = false; this.pnwWait(); }
      if (this.fsl) this.fsl.hidden = false;
      this.showWait();
      this.swap(src);
      if (this.server === 'backup') this.probe();
      else if (/[?&]startAt=/.test(src) && typeof Spot !== 'undefined') Spot.tell();
    },

    /* Players can stay black for a few seconds while they look for the video: hold the Not working button for 10 s. */
    pnwTimer: null,
    pnwText: '',
    pnwWait: function () {
      var txt = this.pnw.querySelector('.hk-pnw__txt'), btn = this.pnw.querySelector('[data-hk-pnw-btn]');
      if (!txt || !btn) return;
      if (!this.pnwText) this.pnwText = txt.innerHTML;
      var self = this;
      txt.textContent = 'Loading the player, this can take up to 10 seconds.';
      btn.disabled = true;
      clearTimeout(this.pnwTimer);
      this.pnwTimer = setTimeout(function () { txt.innerHTML = self.pnwText; btn.disabled = false; }, 10000);
    },

    /* A fresh frame per source, so player changes never pile up in the browser's back history. */
    swap: function (src) {
      var self = this, old = this.frame, fresh = old.cloneNode(false);
      fresh.hidden = false;
      fresh.setAttribute('src', src);
      fresh.addEventListener('load', function () { self.hideWait(); });
      old.parentNode.replaceChild(fresh, old);
      this.frame = fresh;
    },

    start: function () {
      if (this.cover) this.cover.hidden = true;
      this.started = true;
      this.checked = false;
      this.load();
    },

    showWait: function () {
      var self = this;
      if (!this.wait) return;
      this.wait.hidden = false;
      clearTimeout(this.waitTimer);
      this.waitTimer = setTimeout(function () { self.hideWait(); }, 6000);
    },
    hideWait: function () { if (this.wait) this.wait.hidden = true; clearTimeout(this.waitTimer); },

    say: function (text) {
      if (!this.note) return;
      this.note.textContent = text || '';
      this.note.hidden = !text;
      this.note.classList.remove('hk-player__note--ok');
    },

    /* When the first player (MegaPlay) cannot play, move to the next player in the same language, once per episode. */
    fellBackEp: 0,
    fallBack: function (why) {
      if (this.server !== 'backup' || this.fellBackEp === this.ep) return;
      this.fellBackEp = this.ep;
      var lang = this.origLang || this.lang;   // keep the language the visitor picked
      if (this.origLang) why = 'does not have this episode right now';
      this.origLang = '';
      var self = this, cur = this.activeButton();
      var name = cur ? cur.textContent.trim() : 'This player';
      var others = $$('.hk-srv[data-version="' + lang + '"]').filter(function (b) {
        return b.getAttribute('data-server') !== 'backup' && !b.hidden;
      });
      var ok = others.filter(function (b) { return !self.isBroken(b); });
      var pick = function (server) { return ok.filter(function (b) { return b.getAttribute('data-server') === server; })[0]; };
      // tryembed first: it tells us within seconds whether it found a video. vidnest-pahe next: it has a second source.
      var next = pick('tryembed') || pick('vidnest-pahe') || ok[0] || others[0];
      var other = lang === 'dub' ? 'sub' : 'dub';
      if (!next) {
        this.say(name + ' ' + why + '. Please try the other language or come back a little later.');
        this.offer(other);
        return;
      }
      var tail = lang === 'dub' ? ' The dub may not be out yet.' : '';
      this.say(name + ' ' + why + ', so we switched you to ' + next.textContent.trim() + '.' + tail);
      this.offer(other);
      this.mark(next);
      this.load();
      var then = pick('vidnest-pahe');
      if (next.getAttribute('data-server') === 'tryembed' && then) {
        this.watchWarp(function () {
          self.say(name + ' ' + why + ' and ' + next.textContent.trim() + ' could not load it either, so we switched you to ' + then.textContent.trim() + '.' + tail);
          self.offer(other);
          self.mark(then);
          self.load();
        });
      }
    },

    /* tryembed posts PLAYER_EVENT messages; a real video reports its length within seconds, a missing one stays at 0. */
    warpOk: false,
    warpTimer: null,
    watchWarp: function (onMiss) {
      var self = this, ep = this.ep, frame = this.frame;
      this.warpOk = false;
      clearTimeout(this.warpTimer);
      this.warpTimer = setTimeout(function () {
        if (!self.warpOk && self.frame === frame && self.ep === ep && self.server === 'tryembed') onMiss();
      }, 10000);
    },

    /* Players we marked broken for this episode (cron/player-reports.php) go to the end of their row. Ryu never moves. */
    broken: { sub: [], dub: [] },
    isBroken: function (btn) {
      var list = this.broken[btn.getAttribute('data-version')] || [];
      return btn.getAttribute('data-server') !== 'backup' && list.indexOf(btn.getAttribute('data-server')) !== -1;
    },
    sortRows: function () {
      var self = this;
      $$('.hk-servers__btns').forEach(function (box) {
        var btns = $$('.hk-srv', box).sort(function (a, b) {
          return (+a.getAttribute('data-hk-pos') || 0) - (+b.getAttribute('data-hk-pos') || 0);
        });
        var good = btns.filter(function (b) { return !self.isBroken(b); });
        good.concat(btns.filter(function (b) { return self.isBroken(b); })).forEach(function (b) { box.appendChild(b); });
      });
    },
    loadMarks: function () {
      var self = this, token = this.token;
      this.broken = { sub: [], dub: [] };
      this.sortRows();
      if (!token) return;
      fetch('/api/player/marks?ep=' + encodeURIComponent(token), { credentials: 'omit' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (self.token !== token || !d || !d.broken) return;
          self.broken = { sub: d.broken.sub || [], dub: d.broken.dub || [] };
          self.sortRows();
        })
        .catch(function () {});
    },

    /* One tap to the other language on the first player. */
    offer: function (lang) {
      var row = document.querySelector('[data-hk-lang-row="' + lang + '"]');
      var to = document.querySelector('.hk-srv[data-server="backup"][data-version="' + lang + '"]');
      if (!this.note || !row || row.hidden || !to || to.hidden) return;
      var self = this, b = document.createElement('button');
      b.type = 'button';
      b.className = 'hk-player__note-btn';
      b.textContent = lang === 'sub' ? 'Watch with subtitles' : 'Watch the dub';
      b.addEventListener('click', function () { self.say(''); self.mark(to); self.checked = false; self.load(); });
      this.note.appendChild(document.createTextNode(' '));
      this.note.appendChild(b);
    },

    /* If our sub stream is missing, try the hard-subbed copy, then another sub player, then the dub. */
    epId: function () {
      try { return atob(this.token.replace(/-/g, '+').replace(/_/g, '/')).split(':')[0] || ''; } catch (e) { return ''; }
    },
    probe: function () {
      var self = this, id = this.epId();
      if (this.checked || !id || (this.lang !== 'sub' && this.lang !== 'dub')) return;
      this.checked = true;
      var ask = function (lang) {
        return fetch('/api/player/check?ep=' + encodeURIComponent(id) + '&lang=' + lang, { credentials: 'omit' })
          .then(function (r) { return r.json(); }).catch(function () { return { ok: null }; });
      };
      if (this.lang === 'dub') {
        ask('dub').then(function (r) {
          if (r && r.ok === false && self.lang === 'dub') self.fallBack('does not have the dub of this episode right now');
        });
        return;
      }
      ask('sub').then(function (r) {
        if (!r || r.ok !== false) return null;
        return ask('hsub').then(function (h) {
          if (!h) return;
          if (h.ok === true) { self.showWait(); self.swap('/stream/' + self.token + '/hsub'); return; }
          if (h.ok === false) {
            var sub = document.querySelector('.hk-srv[data-server="backup"][data-version="sub"]');
            var otherSub = $$('.hk-srv[data-version="sub"]').some(function (b) { return b.getAttribute('data-server') !== 'backup' && !b.hidden; });
            if (otherSub && self.server === 'backup' && self.lang === 'sub') {
              self.fallBack('does not have the subtitled copy of this episode right now');
              if (sub) sub.hidden = true;
              return;
            }
            if (sub) sub.hidden = true;
            var dub = document.querySelector('.hk-srv[data-server="backup"][data-version="dub"]');
            var row = document.querySelector('[data-hk-lang-row="dub"]');
            if (dub && row && !row.hidden && self.server === 'backup') {
              self.say('The subtitled copy of this episode is missing right now, so we switched you to the dub.');
              self.origLang = 'sub';
              self.mark(dub);
              self.checked = false;
              self.load();
            } else {
              self.fallBack('does not have this episode right now');
            }
          }
        });
      });
    }
  };

  /* ---- sponsor gate before play (and before each new episode, never on a player switch) ---- */
  var Gate = {
    el: $('[data-hk-gate]'),
    then: null,
    opened: 0,
    order: [],
    clock: null,
    show: function (then) {
      if (!this.el || !cfg.gate) { then(); return; }
      var self = this;
      this.then = then;
      this.opened = 0;
      this.order = [];
      for (var i = 0; i < cfg.gate; i++) this.order.push(i);
      this.order.sort(function () { return Math.random() - 0.5; });
      $$('[data-hk-ad]', this.el).forEach(function (b) { b.classList.remove('done'); b.disabled = false; });
      var play = $('[data-hk-gate-play]', this.el), skip = $('[data-hk-gate-skip]', this.el);
      play.disabled = true;
      var left = 10;
      skip.disabled = true;
      skip.textContent = 'Skip in ' + left + 's';
      clearInterval(this.clock);
      this.clock = setInterval(function () {
        left--;
        if (left > 0) { skip.textContent = 'Skip in ' + left + 's'; return; }
        clearInterval(self.clock);
        skip.disabled = false;
        skip.textContent = 'Skip and play';
      }, 1000);
      if (Player.cover) Player.cover.hidden = true;
      this.el.hidden = false;
    },
    done: function () {
      clearInterval(this.clock);
      this.el.hidden = true;
      var t = this.then; this.then = null;
      (t || function () { Player.start(); })();
    },
    bind: function () {
      if (!this.el) return;
      var self = this;
      this.el.addEventListener('click', function (e) {
        var ad = e.target.closest('[data-hk-ad]');
        if (ad && !ad.classList.contains('done')) {
          ad.classList.add('done');
          ad.disabled = true;
          self.opened++;
          if (self.opened >= cfg.gate) $('[data-hk-gate-play]', self.el).disabled = false;
          var slot = parseInt(ad.getAttribute('data-hk-ad'), 10) || 0;
          var idx = self.order.length > slot ? self.order[slot] : slot;
          var a = document.createElement('a');
          a.href = '/continue?i=' + idx + '&r=' + Date.now() + Math.floor(Math.random() * 1e6);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        }
        if (e.target.closest('[data-hk-gate-play]') || e.target.closest('[data-hk-gate-skip]')) self.done();
      });
    }
  };
  Gate.bind();

  $$('.hk-servers__btns').forEach(function (box) {
    $$('.hk-srv', box).forEach(function (b, i) { b.setAttribute('data-hk-pos', String(i)); });
  });
  Player.loadMarks();

  /* ---- "Not working": log it, then move this visitor to the next player in the same language ---- */
  var pnwKey = function (lang) { return 'hk-pnw:' + Player.token + ':' + lang; };
  var pnwMine = function (lang) {
    try { var v = JSON.parse(localStorage.getItem(pnwKey(lang)) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  };
  if (Player.pnw) Player.pnw.addEventListener('click', function (e) {
    if (!e.target.closest('[data-hk-pnw-btn]')) return;
    var cur = Player.activeButton();
    if (!cur || !Player.started) return;
    var lang = cur.getAttribute('data-version'), server = cur.getAttribute('data-server');
    var mine = pnwMine(lang);
    if (mine.indexOf(server) === -1) {
      mine.push(server);
      try { localStorage.setItem(pnwKey(lang), JSON.stringify(mine)); } catch (x) {}
      var fd = new FormData();
      fd.append('ep', Player.token);
      fd.append('server', server);
      fd.append('lang', lang);
      fetch('/api/player/report', { method: 'POST', body: fd, credentials: 'same-origin' }).catch(function () {});
    }
    var row = $$('.hk-srv[data-version="' + lang + '"]').filter(function (b) { return !b.hidden; });
    var at = row.indexOf(cur), next = null;
    for (var k = 1; k < row.length && !next; k++) {
      var b = row[(at + k) % row.length];
      if (mine.indexOf(b.getAttribute('data-server')) === -1) next = b;
    }
    var name = cur.textContent.trim();
    clearTimeout(Player.warpTimer);
    if (!next) {
      Player.say('Thanks, we noted that ' + name + ' is not working. You have tried every ' + lang + ' player for this episode.');
      Player.offer(lang === 'dub' ? 'sub' : 'dub');
      return;
    }
    Player.say('Thanks, we noted that ' + name + ' is not working and switched you to ' + next.textContent.trim() + '.');
    Player.mark(next);
    Player.checked = false;
    Player.load();
  });

  /* tryembed and vidnest post {type:'PLAYER_EVENT', data:{event, currentTime, duration}}: tryembed all the time, vidnest once playing */
  var originOf = function (k) { try { return cfg.mirror && cfg.mirror[k] ? new URL(cfg.mirror[k]).origin : ''; } catch (e) { return ''; } };
  var warpOrigin = originOf('tryembed'), nestOrigin = originOf('vidnest-pahe') || originOf('vidnest');
  var endedFrame = null;
  window.addEventListener('message', function (e) {
    if (!e.origin || (e.origin !== warpOrigin && e.origin !== nestOrigin)) return;
    if (!Player.frame || e.source !== Player.frame.contentWindow) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || d.type !== 'PLAYER_EVENT' || !d.data) return;
    var dur = Number(d.data.duration) || 0, at = Number(d.data.currentTime) || 0;
    if (e.origin === warpOrigin && dur > 0) Player.warpOk = true;
    if (dur > 0 && typeof Spot !== 'undefined') Spot.time(at, dur, false);
    if (endedFrame === Player.frame || typeof Auto === 'undefined') return;
    if (d.data.event === 'ended' || (dur > 60 && at >= dur - 1.5)) { endedFrame = Player.frame; Spot.done(); Auto.ended(); }
  });

  /* "Wide player" on PC: the player takes the full width and the episode list moves below it. Remembered per browser. */
  var wideBtn = $('[data-hk-wide]');
  var watchEl = box; // the article itself (.hk-watch)
  if (wideBtn && watchEl) {
    var wideTxt = $('[data-hk-wide-txt]');
    var paintWide = function () {
      var on = watchEl.classList.contains('hk-watch--wide');
      wideBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (wideTxt) wideTxt.textContent = on ? 'Normal size' : 'Wide player';
      wideBtn.title = on ? 'Back to the normal player size' : 'Make the player wider';
    };
    paintWide();
    wideBtn.addEventListener('click', function () {
      var on = !watchEl.classList.contains('hk-watch--wide');
      watchEl.classList.toggle('hk-watch--wide', on);
      try { localStorage.setItem('hk-wide', on ? '1' : '0'); } catch (e) { /* private window */ }
      paintWide();
      // Bring the player up under the site header so the whole picture fits the screen.
      var pl = $('.hk-player');
      if (pl && on) {
        var head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk-head')) || 64;
        window.scrollTo({ top: Math.max(0, pl.getBoundingClientRect().top + window.pageYOffset - head - 12), behavior: 'smooth' });
      }
    });
  }

  /* Our own full screen: the whole player box goes full screen, so it stays on when auto next swaps the episode inside it.
     A player's own full screen button cannot do that (the browser leaves full screen when that frame is replaced). */
  var fsBox = $('.hk-player');
  if (fsBox && document.fullscreenEnabled && fsBox.requestFullscreen) {
    var fslBtn = $('[data-hk-fsl-btn]');
    if (fslBtn) fslBtn.addEventListener('click', function () { if (!document.fullscreenElement) fsBox.requestFullscreen().catch(function () {}); });
    var fsx = $('[data-hk-fsx]');
    if (fsx) fsx.addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); });
    // #398: the Exit button fades after 3 seconds and comes back when the mouse moves or the screen is touched.
    var fsIdle = null;
    var fsWake = function () {
      fsBox.classList.remove('hk-fs-idle');
      clearTimeout(fsIdle);
      if (document.fullscreenElement === fsBox) fsIdle = setTimeout(function () { fsBox.classList.add('hk-fs-idle'); }, 3000);
    };
    ['mousemove', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, fsWake, { passive: true }); });
    // The Ryu player asks the page whether it is in full screen; answering lets its own full screen button
    // switch our full screen on and off (and stay in step), so the Exit button is only a backup.
    // Phones and tablets keep the player's own full screen: answering would switch off its rotate-to-full-screen
    // (#404 "Rotate isn't working", 2026-10-17). Our Full screen line stays there for full screen through auto next.
    var fsTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var fsTurned = false;
    var fsTell = function () {
      var w = Player.frame && Player.frame.contentWindow;
      if (!w || Player.server !== 'backup' || fsTouch) return;
      try { w.postMessage({ megaFullscreenState: document.fullscreenElement === fsBox }, 'https://megaplay.buzz'); } catch (e) {}
    };
    window.addEventListener('message', function (e) {
      if (!/^https:\/\/([a-z0-9-]+\.)*megaplay\.buzz$/i.test(e.origin || '')) return;
      if (!Player.frame || e.source !== Player.frame.contentWindow) return;
      var d = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
      if (!d || typeof d !== 'object' || !d.megaCommand) return;
      if (d.megaCommand === 'getFullscreenState') fsTell();
      if (d.megaCommand === 'toggleFullscreen') {
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else fsBox.requestFullscreen().catch(function () {});
      }
    });
    document.addEventListener('fullscreenchange', function () {
      fsBox.classList.toggle('is-fs', document.fullscreenElement === fsBox);
      // #410: on a PC with the Ryu player its own full screen arrows already exit, so our X is not shown at all.
      if (fsx) fsx.style.display = (document.fullscreenElement === fsBox && Player.server === 'backup' && !fsTouch) ? 'none' : '';
      // #456: on phones our Full screen turns the video sideways like the player's own button (where the browser allows it).
      // #484: only undo our own turn. The Ryu player's own full screen also fires this event (its frame goes full screen)
      // and turns the phone itself, so unlocking then would cancel its rotate.
      var so = window.screen && window.screen.orientation;
      if (fsTouch && so) {
        if (document.fullscreenElement === fsBox) { if (so.lock) { fsTurned = true; so.lock('landscape').catch(function () { fsTurned = false; }); } }
        else if (!document.fullscreenElement && fsTurned) { fsTurned = false; if (so.unlock) { try { so.unlock(); } catch (e) {} } }
      }
      fsTell(); fsWake();
    });
  }

  /* Sub or dub: the one picked last time on this device wins when this episode has it. */
  (function () {
    var kept = null;
    try { kept = localStorage.getItem('hk-audio'); } catch (e) { /* private window */ }
    if ((kept !== 'sub' && kept !== 'dub') || kept === Player.lang) return;
    var row = document.querySelector('[data-hk-lang-row="' + kept + '"]');
    var first = document.querySelector('.hk-srv[data-server="backup"][data-version="' + kept + '"]');
    if (row && !row.hidden && first) Player.mark(first);
  })();

  if (Player.cover) {
    Player.cover.addEventListener('click', function () { Gate.show(function () { Player.start(); }); });
  }
  if (Player.frame) {
    Player.frame.addEventListener('load', function () { if (Player.frame.src) Player.hideWait(); });
    window.addEventListener('blur', function () { if (document.activeElement === Player.frame) Player.hideWait(); });
  }

  /* ---- player buttons ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.hk-srv');
    if (!b) return;
    if (b.classList.contains('lit') && Player.started) return;
    Player.say('');
    Player.mark(b);
    try { localStorage.setItem('hk-audio', b.getAttribute('data-version')); } catch (x) { /* private window */ }
    if (Player.started) { Player.checked = false; Player.load(); }
    else { if (Player.cover) Player.cover.hidden = true; Player.started = true; Player.checked = false; Player.load(); }
  });

  /* ---- episodes ---- */
  var list = document.querySelector('[data-hk-ep-list]');
  var items = list ? $$('.hk-wep', list) : [];
  var nowShort = $('[data-hk-now]'), nowLong = $('[data-hk-now-long]'), nowName = $('[data-hk-now-name]');
  var coverLabel = $('[data-hk-cover-label]');
  var stepPrev = $('[data-hk-step="-1"]'), stepNext = $('[data-hk-step="1"]');
  var repEp = $('[data-hk-report-ep]'), repLabel = $('[data-hk-report-label]');

  var setRow = function (lang, on) {
    var row = document.querySelector('[data-hk-lang-row="' + lang + '"]');
    if (row) row.hidden = !on;
  };
  var neighbours = function (idx) {
    var p = items[idx - 1], n = items[idx + 1];
    var tip = function (a) {
      var t = a.getAttribute('data-name') || '';
      return t && !/^Episode\s+\d+$/i.test(t) ? 'Episode ' + a.getAttribute('data-episode') + ': ' + t : '';
    };
    if (stepPrev) { stepPrev.hidden = !p; if (p) { stepPrev.href = p.href; stepPrev.title = tip(p); } }
    if (stepNext) { stepNext.hidden = !n; if (n) { stepNext.href = n.href; stepNext.title = tip(n); } }
    var facts = $('[data-hk-facts]');
    if (facts && items[idx]) {
      var cur = items[idx], total = facts.getAttribute('data-total');
      var parts = facts.textContent.split(', ');
      parts[0] = 'Episode ' + cur.getAttribute('data-episode') + (total && total !== '0' ? ' of ' + total : '');
      var s = cur.getAttribute('data-sub') === '1', d = cur.getAttribute('data-dub') === '1';
      parts[1] = s && d ? 'Sub and Dub' : (d ? 'Dub' : 'Sub');
      facts.textContent = parts.join(', ');
    }
  };
  var goEpisode = function (a, push) {
    var n = parseInt(a.getAttribute('data-episode'), 10);
    if (!n || n === Player.ep) return;
    items.forEach(function (x) { x.classList.remove('current'); x.removeAttribute('aria-current'); });
    a.classList.add('current');
    a.setAttribute('aria-current', 'true');
    Player.ep = n;
    Player.token = a.getAttribute('data-token') || '';
    Player.loadMarks();
    var hasSub = a.getAttribute('data-sub') === '1', hasDub = a.getAttribute('data-dub') === '1';
    if (!hasSub && !hasDub) hasSub = true;
    setRow('sub', hasSub);
    setRow('dub', hasDub);
    $$('.hk-srv[data-server="backup"]').forEach(function (b) { b.hidden = false; });
    var want = Player.lang;
    if (want === 'sub' && !hasSub) want = 'dub';
    if (want === 'dub' && !hasDub) want = 'sub';
    var keep = document.querySelector('.hk-srv[data-version="' + want + '"][data-server="' + Player.server + '"]') ||
               document.querySelector('.hk-srv[data-version="' + want + '"][data-server="backup"]');
    Player.mark(keep);
    Player.say('');
    var name = a.getAttribute('data-name') || '';
    if (nowShort) nowShort.textContent = 'Episode ' + n;
    if (nowLong) nowLong.textContent = 'Episode ' + n;
    var named = name && !/^Episode\s+\d+$/i.test(name) ? name : '';
    if (nowName) { nowName.textContent = named; nowName.hidden = !named; }
    var nowTitle = $('[data-hk-now-title]');
    if (nowTitle) { nowTitle.textContent = named ? ': ' + named : ''; nowTitle.hidden = !named; }
    if (coverLabel) coverLabel.textContent = 'Episode ' + n;
    if (repEp) repEp.value = n;
    if (repLabel) repLabel.textContent = 'episode ' + n;
    shareTo(a.href, n);
    neighbours(items.indexOf(a));
    if (push !== false && window.history.pushState) window.history.pushState({ hkEp: n }, '', a.href);
    if (!Player.token && !Player.srcFor(Player.server, Player.lang)) {
      Player.say('No player is linked to this episode yet. Try another episode.');
      return;
    }
    Gate.show(function () {
      if (Player.cover) Player.cover.hidden = true;
      Player.started = true;
      Player.checked = false;
      Player.load();
    });
    if (window.matchMedia('(max-width: 1099.98px)').matches) {
      document.getElementById('hk-player').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    scrollToCurrent(false);
  };

  // share buttons follow the episode being watched
  function shareTo(href, n) {
    var box = document.querySelector('[data-hk-share-tpl]');
    if (!box) return;
    var u = encodeURIComponent(href);
    var t = encodeURIComponent(box.getAttribute('data-hk-share-tpl').replace('{n}', n));
    var links = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
      x: 'https://x.com/intent/post?url=' + u + '&text=' + t,
      whatsapp: 'https://api.whatsapp.com/send?text=' + t + '%20' + u,
      telegram: 'https://t.me/share/url?url=' + u + '&text=' + t,
      reddit: 'https://www.reddit.com/submit?url=' + u + '&title=' + t
    };
    $$('[data-hk-share]', box).forEach(function (b) { var k = b.getAttribute('data-hk-share'); if (links[k]) b.href = links[k]; });
  }

  if (list) {
    list.addEventListener('click', function (e) {
      var a = e.target.closest('.hk-wep');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      goEpisode(a);
    });
  }
  [stepPrev, stepNext].forEach(function (s) {
    if (!s) return;
    s.addEventListener('click', function (e) {
      var target = items.filter(function (x) { return x.href === s.href; })[0];
      if (!target) return;
      e.preventDefault();
      target.click();
    });
  });
  window.addEventListener('popstate', function (e) {
    if (!e.state || !e.state.hkEp) return;
    var a = items.filter(function (x) { return parseInt(x.getAttribute('data-episode'), 10) === e.state.hkEp; })[0];
    if (a) goEpisode(a, false);
  });
  if (window.history.replaceState && !cfg.movie) window.history.replaceState({ hkEp: Player.ep }, '', window.location.href);

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'n' && stepNext && !stepNext.hidden) stepNext.click();
    if (e.key === 'p' && stepPrev && !stepPrev.hidden) stepPrev.click();
    // #377: the arrow keys used to change the episode, so a visitor pressing -> to skip an intro (as in most
    // players) jumped several episodes ahead. They now jump 10 seconds in the Ryu player and never change episode.
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && Player.server === 'backup' && Player.started && typeof seekBy === 'function') {
      e.preventDefault();
      seekBy(e.key === 'ArrowRight' ? 10 : -10);
    }
  });

  /* ---- episode panel: range, search, "more below" cue, open at the current episode ---- */
  var find = document.querySelector('[data-hk-ep-find]');
  var range = document.querySelector('[data-hk-ep-range]');
  var more = document.querySelector('[data-hk-ep-more]');
  var filterList = function () {
    var q = find ? find.value.trim().toLowerCase() : '';
    var r = range ? range.value : null;
    items.forEach(function (a) {
      var ok = q ? (a.getAttribute('data-episode').indexOf(q) === 0 || (a.getAttribute('data-name') || '').toLowerCase().indexOf(q) !== -1)
                 : (r === null || a.getAttribute('data-range') === r);
      a.hidden = !ok;
    });
    cue();
  };
  var cue = function () {
    if (!list || !more) return;
    var left = list.scrollHeight - list.clientHeight - list.scrollTop;
    more.hidden = left < 12;
  };
  var scrollToCurrent = function (instant) {
    var cur = list && list.querySelector('.hk-wep.current');
    if (!cur || cur.hidden) return;
    var lr = list.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    list.scrollTo({ top: list.scrollTop + (cr.top - lr.top) - (list.clientHeight - cr.height) / 2, behavior: instant ? 'auto' : 'smooth' });
  };
  if (find) find.addEventListener('input', filterList);
  if (range) range.addEventListener('change', function () { if (find) find.value = ''; filterList(); list.scrollTop = 0; });
  if (list) {
    list.addEventListener('scroll', function () { window.requestAnimationFrame(cue); }, { passive: true });
    window.addEventListener('resize', cue);
    filterList();
    scrollToCurrent(true);
    cue();
  }
  if (more) more.addEventListener('click', function () { list.scrollBy({ top: Math.round(list.clientHeight * 0.8), behavior: 'smooth' }); });

  /* ---- report form ---- */
  var repOpen = $('[data-hk-report-open]'), rep = document.getElementById('hk-report'), repTimer = null;
  var repClose = function () {
    if (!rep || rep.hidden) return;
    clearTimeout(repTimer);
    rep.hidden = true;
    document.documentElement.classList.remove('hk-modal-open');
    if (repOpen) { repOpen.setAttribute('aria-expanded', 'false'); repOpen.focus(); }
  };
  if (repOpen && rep) {
    repOpen.addEventListener('click', function () {
      var out = rep.querySelector('[data-hk-report-out]');
      if (out) out.hidden = true;
      rep.hidden = false;
      document.documentElement.classList.add('hk-modal-open');
      repOpen.setAttribute('aria-expanded', 'true');
      var s = rep.querySelector('select'); if (s) s.focus();
    });
    rep.addEventListener('click', function (e) { if (e.target.closest('[data-hk-report-x]')) repClose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') repClose(); });
  }
  var form = document.querySelector('[data-hk-report]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]'), out = form.querySelector('[data-hk-report-out]');
      btn.disabled = true;
      fetch('/report', { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          out.hidden = false;
          if (d && d.success) {
            out.textContent = (d.data && d.data.message) || 'Thanks, we got your report.';
            out.className = 'hk-report__msgout good';
            form.querySelector('select').value = '';
            form.querySelector('textarea').value = '';
            clearTimeout(repTimer);
            repTimer = setTimeout(repClose, 2500);
          } else {
            out.textContent = (d && (d.message || d.error)) || 'That did not go through. Try again.';
            out.className = 'hk-report__msgout bad';
          }
        })
        .catch(function () { out.hidden = false; out.textContent = 'No connection. Try again.'; out.className = 'hk-report__msgout bad'; })
        .then(function () { btn.disabled = false; });
    });
  }
  /* ---- auto next and auto skip ----
     MegaPlay posts JSON strings to this page: "complete" when an episode ends, "time" while playing.
     It also takes {cmd:'SKP_DATA', auto:true}, which turns on its own intro/outro skip where it has the times. */
  var Auto = {
    key: { next: 'hk-auto-next', skip: 'hk-auto-skip', filler: 'hk-auto-filler' },
    on: { next: true, skip: false, filler: false },
    up: $('[data-hk-upnext]'),
    clock: null,
    load: function () {
      var self = this;
      ['next', 'skip', 'filler'].forEach(function (k) {
        try { var v = localStorage.getItem(self.key[k]); if (v === '1' || v === '0') self.on[k] = v === '1'; } catch (e) {}
        $$('[data-hk-auto="' + k + '"]').forEach(function (b) { b.setAttribute('aria-checked', self.on[k] ? 'true' : 'false'); });
      });
    },
    set: function (k, val) {
      this.on[k] = val;
      try { localStorage.setItem(this.key[k], val ? '1' : '0'); } catch (e) {}
      $$('[data-hk-auto="' + k + '"]').forEach(function (b) { b.setAttribute('aria-checked', val ? 'true' : 'false'); });
      if (k === 'skip') this.tellSkip();
      if (k === 'next' && !val) this.stop();
    },
    send: function (msg) {
      var w = Player.frame && Player.frame.contentWindow;
      if (!w || !Player.frame.getAttribute('src')) return;
      try { w.postMessage(JSON.stringify(msg), 'https://megaplay.buzz'); } catch (e) {}
    },
    tellSkip: function () { this.send({ cmd: 'SKP_DATA', auto: this.on.skip }); },
    /* any = the very next episode; otherwise filler is passed over when Skip filler is on (opt-in, off by default). */
    nextItem: function (any) {
      var cur = items.filter(function (x) { return parseInt(x.getAttribute('data-episode'), 10) === Player.ep; })[0];
      var i = items.indexOf(cur);
      if (i < 0) return null;
      var pass = !any && this.on.filler && !!$('[data-hk-auto="filler"]');
      for (var j = i + 1; j < items.length; j++) {
        if (!pass || !items[j].classList.contains('hk-wep--filler')) return items[j];
      }
      return null;
    },
    ended: function () {
      // Notify me v2: profile.js offers "tell me about the next episode" after the newest one.
      try { document.dispatchEvent(new CustomEvent('hk:ep-ended', { detail: { ep: Player.ep, last: !this.nextItem(true) } })); } catch (e) {}
      if (!this.on.next || !this.up || !this.up.hidden) return;
      var nx = this.nextItem();
      var ns = nx ? '' : (this.up.getAttribute('data-ns-url') || '');
      if (!nx && !ns) return;
      var self = this, left = 5;
      var ep = $('[data-hk-upnext-ep]', this.up), sec = $('[data-hk-upnext-left]', this.up);
      var hop = nx && nx !== this.nextItem(true);
      ep.textContent = nx ? 'Episode ' + nx.getAttribute('data-episode') + (hop ? ' (filler skipped)' : '') : (this.up.getAttribute('data-ns-name') || 'the next part');
      sec.textContent = left;
      this.up.hidden = false;
      clearInterval(this.clock);
      this.clock = setInterval(function () {
        left--;
        if (left > 0) { sec.textContent = left; return; }
        self.go();
      }, 1000);
    },
    go: function () {
      var nx = this.nextItem();
      var ns = this.up ? this.up.getAttribute('data-ns-url') : '';
      this.stop();
      // #889 #893: through the episode tile, so My Anime saves and ticks the episode like a tap
      if (nx) nx.click();
      else if (ns) window.location.href = ns;
    },
    stop: function () {
      clearInterval(this.clock);
      if (this.up) this.up.hidden = true;
    }
  };
  Auto.load();
  var newSeen = false;
  try { newSeen = localStorage.getItem('hk-auto-new') === '1'; } catch (e) {}
  if (newSeen) $$('[data-hk-new]').forEach(function (n) { n.hidden = true; });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hk-auto]');
    if (b) {
      Auto.set(b.getAttribute('data-hk-auto'), b.getAttribute('aria-checked') !== 'true');
      $$('[data-hk-new]').forEach(function (n) { n.hidden = true; });
      try { localStorage.setItem('hk-auto-new', '1'); } catch (x) {}
      return;
    }
    if (e.target.closest('[data-hk-upnext-go]')) { Auto.go(); return; }
    if (e.target.closest('[data-hk-upnext-stop]')) Auto.stop();
  });
  var skipSent = null;
  // MegaPlay sometimes reports an error and then recovers: only switch players if no playback follows within 5 s.
  var errTimer = null, errAt = -1, lastT = 0;
  // #282: a visitor who rewinds into the intro wants to see it. MegaPlay jumps over it again at once, so we
  // remember where its first intro jump started and ended, and when it lands on that end again after a
  // rewind we switch auto skip off for this episode and go back to the start of the intro.
  var skipPaused = null, jumps = [];
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/([a-z0-9-]+\.)*megaplay\.buzz$/i.test(e.origin || '')) return;
    if (!Player.frame || e.source !== Player.frame.contentWindow) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || typeof d !== 'object') return;
    var ev = d.event || d.type;
    if (ev === 'PLAYER_READY' || ((ev === 'time' || ev === 'watching-log') && skipSent !== Player.frame)) {
      skipSent = Player.frame;
      if (Auto.on.skip) Auto.tellSkip();
    }
    if (ev === 'complete') { Spot.done(); Auto.ended(); }
    if (ev === 'time') {
      var t = Number(d.time) || 0;
      Spot.time(t, Number(d.duration) || 0);
      if (errTimer && t > errAt + 0.5) { clearTimeout(errTimer); errTimer = null; }
      if (Auto.on.skip && skipSent === Player.frame && skipPaused !== Player.frame && lastT > 0) {
        var hit = null;
        if (t - lastT > 20) {
          jumps.push([lastT, t]);
          if (jumps.length > 6) jumps.shift();
        } else if (t < lastT - 3) {
          jumps.forEach(function (j) { if (Math.abs(t - j[1]) < 3) hit = j; });
        }
        if (hit) {
          skipPaused = Player.frame;
          var back = Math.max(0, hit[0] - 1);
          Auto.send({ cmd: 'SKP_DATA', auto: false });
          setTimeout(function () { Auto.send({ event: 'seek', time: back }); }, 300);
          Player.say('Auto skip is paused for this episode because you went back. It turns on again for the next one.');
        }
      }
      lastT = t;
    }
    if (ev === 'error' && !errTimer) {
      errAt = lastT;
      errTimer = setTimeout(function () { errTimer = null; Player.fallBack('stopped with an error'); }, 5000);
    }
  });
  /* Resume where you stopped (Ryu player only, it is the one that reports its time). The time is kept on this
     device for each episode; when that episode plays again we jump there and offer "Start over". */
  var Spot = {
    key: 'hk-spot',
    frame: null,
    lastSave: 0,
    busy: false,
    id: function () { return cfg.sid ? (cfg.movie ? 'm' : 's') + cfg.sid + ':' + Player.ep : ''; },
    all: function () {
      try { var m = JSON.parse(localStorage.getItem(this.key) || '{}'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; }
    },
    put: function (id, v) {
      var m = this.all();
      if (v) m[id] = v; else delete m[id];
      var ids = Object.keys(m);
      if (ids.length > 300) {
        ids.sort(function (a, b) { return (m[a][1] || 0) - (m[b][1] || 0); });
        ids.slice(0, ids.length - 300).forEach(function (k) { delete m[k]; });
      }
      try { localStorage.setItem(this.key, JSON.stringify(m)); } catch (e) {}
    },
    clock: function (s) {
      s = Math.floor(s);
      var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
      return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
    },
    /* ryu = false: Warp or Ayame (they post PLAYER_EVENT). Those started at our saved time through ?startAt, so no jump here. */
    cur: null,
    time: function (t, dur, ryu) {
      var id = this.id();
      if (!id) return;
      if (this.frame !== Player.frame) {
        this.frame = Player.frame;
        this.lastSave = Date.now();
        var v = this.all()[id];
        if (ryu !== false && v && v[0] > 30 && t < 15 && (!dur || v[0] < dur - 90)) { this.jump(v[0]); return; }
      }
      this.cur = [id, t, dur];
      if (this.busy) return;
      var now = Date.now();
      if (now - this.lastSave < 5000) return;
      this.lastSave = now;
      if (dur > 0 && t >= dur - 90) this.put(id, null);   // near the end: next time starts from the beginning
      else if (t >= 30) this.put(id, [Math.floor(t), now]);
    },
    jump: function (at) {
      var self = this, to = Math.max(0, at - 3);
      this.busy = true;
      Auto.send({ event: 'seek', time: to });
      lastT = to;   // not an intro jump for auto skip
      setTimeout(function () { self.busy = false; }, 4000);
      Player.say('We picked up where you stopped, at ' + this.clock(at) + '.');
      if (!Player.note) return;
      Player.note.classList.add('hk-player__note--ok');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hk-player__note-btn';
      b.textContent = 'Start over';
      b.addEventListener('click', function () {
        self.put(self.id(), null);
        Auto.send({ event: 'seek', time: 0 });
        lastT = 0;
        Player.say('');
      });
      Player.note.appendChild(document.createTextNode(' '));
      Player.note.appendChild(b);
    },
    done: function () { var id = this.id(); if (id) this.put(id, null); this.cur = null; },
    /* Keep the very last time before the player changes, so a switch loses no seconds (saves are 5 s apart). */
    flush: function () {
      var c = this.cur;
      this.cur = null;
      if (!c || this.busy) return;
      if (c[2] > 0 && c[1] >= c[2] - 90) this.put(c[0], null);
      else if (c[1] >= 30) this.put(c[0], [Math.floor(c[1]), Date.now()]);
    },
    /* Seconds for ?startAt on the other players. 0 = no saved time. Start over sends 1, because Warp otherwise
       resumes from its own saved time. */
    noStart: false,
    startAt: function () {
      if (this.noStart) return 1;
      var id = this.id(), v = id ? this.all()[id] : null;
      return v && v[0] > 30 ? Math.max(0, v[0] - 3) : 0;
    },
    /* After a switch to Warp, Volt or Ayame with a start time: say so, with Start over. */
    tell: function () {
      var id = this.id(), v = id ? this.all()[id] : null;
      if (this.noStart || !v || !Player.note || (!Player.note.hidden && Player.note.textContent)) return;   // keep a fall back message
      var self = this;
      Player.say('We picked up where you stopped, at ' + this.clock(v[0]) + '.');
      Player.note.classList.add('hk-player__note--ok');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hk-player__note-btn';
      b.textContent = 'Start over';
      b.addEventListener('click', function () {
        self.put(self.id(), null);
        self.cur = null;
        Player.say('');
        self.noStart = true;
        Player.load();
        self.noStart = false;
      });
      Player.note.appendChild(document.createTextNode(' '));
      Player.note.appendChild(b);
    }
  };

  // Jump n seconds in the Ryu player (MegaPlay takes {event:'seek', time}); lastT comes from its "time" messages.
  var seekBy = function (n) {
    if (!lastT && n < 0) return;
    Auto.send({ event: 'seek', time: Math.max(0, lastT + n) });
  };
  var swapFrame = Player.swap;
  Player.swap = function (src) { Spot.flush(); Auto.stop(); skipSent = null; clearTimeout(errTimer); errTimer = null; lastT = 0; jumps = []; swapFrame.call(Player, src); };

  /* Next-episode countdown: server gives one UTC stamp, this only counts down. */
  var cd = document.querySelector('[data-hk-cd]');
  if (cd) {
    var cdKey = 'hk-cd-' + cd.getAttribute('data-key');
    var cdShut = false;
    try { cdShut = localStorage.getItem(cdKey) === '1'; } catch (e) {}
    if (cdShut) { cd.hidden = true; } else {
      var cdTs = parseInt(cd.getAttribute('data-ts'), 10) * 1000;
      var cdLeft = cd.querySelector('[data-hk-cd-left]'), cdLead = cd.querySelector('[data-hk-cd-lead]'), cdLoc = cd.querySelector('[data-hk-cd-local]');
      var cdPart = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
      try {
        cdLoc.textContent = 'Your time: ' + new Date(cdTs).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      } catch (e) {}
      var cdTick = function () {
        var s = Math.floor((cdTs - Date.now()) / 1000);
        if (s <= 0) {
          cdLead.textContent = 'A new episode should be out about now. Refresh the page to check.';
          cdLeft.textContent = ''; cdLoc.textContent = '';
          return false;
        }
        var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, out = [];
        if (d) out.push(cdPart(d, 'day'));
        out.push(cdPart(h, 'hour'), cdPart(m, 'minute'), cdPart(x, 'second'));
        cdLeft.textContent = '(' + out.join(', ') + ')';
        return true;
      };
      if (cdTick()) {
        var cdTimer = setInterval(function () { if (!cdTick()) clearInterval(cdTimer); }, 1000);
      }
    }
    var cdX = cd.querySelector('[data-hk-cd-x]');
    if (cdX) cdX.addEventListener('click', function () {
      cd.hidden = true;
      try { localStorage.setItem(cdKey, '1'); } catch (e) {}
    });
  }
  /* #810: a gentle break reminder after about 2 hours of watching. Counts only while a video is open and
     the tab is visible; a pause of 30 minutes or more starts the count again. "Stop" is kept on this device. */
  (function () {
    var KEY = 'hk-break', STEP = 30000, LIMIT = 2 * 3600 * 1000, GAP = 30 * 60 * 1000;
    var anchor = document.getElementById('hk-player');
    if (!anchor) return;
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
    var write = function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } };
    if (read().off) return;
    var box = null;
    var show = function () {
      box = document.createElement('div');
      box.className = 'hk-pushask';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-label', 'Break reminder');
      box.innerHTML = '<span class="hk-pushask__ico"><svg class="hk-i" aria-hidden="true" focusable="false"><use href="#hk-clock"/></svg></span><div class="hk-pushask__txt"><b>Two hours of anime. Time for a short break?</b><span>Stand up, stretch and drink some water. Your episode will wait right here.</span></div>' +
        '<div class="hk-pushask__acts"><button type="button" class="hk-btn hk-btn--sm" data-break-ok>Got it</button><button type="button" class="hk-btn hk-btn--line hk-btn--sm" data-break-off>Do not remind me</button></div>';
      anchor.after(box);
      box.addEventListener('click', function (e) {
        if (e.target.closest('[data-break-ok]')) write({ ms: 0, at: Date.now() });
        else if (e.target.closest('[data-break-off]')) write({ off: 1 });
        else return;
        box.remove();
        box = null;
      });
    };
    var timer = setInterval(function () {
      if (box || document.hidden || !(Player.started)) return;
      var s = read();
      if (s.off) { clearInterval(timer); return; }
      var t = Date.now();
      if (!s.at || t - s.at > GAP) s.ms = 0;
      s.ms = (s.ms || 0) + STEP;
      s.at = t;
      write(s);
      if (s.ms >= LIMIT) show();
    }, STEP);
  })();
})();
