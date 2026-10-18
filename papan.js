/* papan.js - Papan peringkat otomatis (live) untuk Petualangan Pancasila.
   Cara pakai: taruh file ini satu folder dengan index.html dan config.js,
   lalu tambahkan SATU baris di index.html, tepat di bawah <script src="config.js"></script>:
   <script src="papan.js"></script>
   Butuh firebaseUrl di config.js. */
(function () {
  var CF = window.PP_CONFIG || {};
  var FB = String(CF.firebaseUrl || '').replace(/\/+$/, '');
  if (!FB) return;
  var KL = String(CF.kelas || 'umum').toLowerCase().replace(/[^a-z0-9]/g, '') || 'umum';
  var ID = '';
  try { ID = localStorage.getItem('pp-id') || ''; } catch (e) {}
  if (!ID) { ID = Math.random().toString(36).slice(2, 10); try { localStorage.setItem('pp-id', ID); } catch (e) {} }

  function $(id) { return document.getElementById(id); }
  function vis(id) { var e = $(id); return !!e && !e.hidden; }
  function getSave() {
    try { var s = JSON.parse(localStorage.getItem('pp-save-v3') || 'null'); return s && s.ready ? s : null; }
    catch (e) { return null; }
  }
  function tcode(s) {
    var k = CF.kelas ? String(CF.kelas).toLowerCase().replace(/[^a-z0-9]/g, '') + '-' : '';
    return k + String(s.team || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function myKey(s) { return s && s.mode === 'tim' && s.team ? 'tim-' + tcode(s) : ID; }

  function status(s) {
    var t = 'Di peta', k = 0;
    if (vis('play')) { t = 'Lari ' + (($('playTitle') || {}).textContent || ''); k = +($('pCoin').textContent) || 0; }
    else if (vis('soal')) t = 'Menjawab ' + ((($('qTitle') || {}).textContent || '').split(' · ')[0]);
    else if (vis('tangkap')) t = 'Tangkap Nilai';
    else if (vis('cocok')) t = 'Cocokkan Nilai';
    else if (vis('refleksi')) t = 'Menulis refleksi';
    var me = s.mode === 'tim' ? ((s.members[s.me || 0] || s.members[0]).nama + ' · ') : '';
    return { s: me + t, k: k };
  }

  function push() {
    var s = getSave(); if (!s) return;
    var b = 0, c = 0, n = 0;
    Object.keys(s.progress || {}).forEach(function (i) { var p = s.progress[i]; b += p.stars || 0; c += p.coins || 0; n++; });
    var ck = s.cocok || {};
    var nama = s.mode === 'solo' ? s.members[0].nama : 'Kelompok ' + String(s.team).replace(/^KEL/i, '');
    fetch(FB + '/pemain/' + KL + '/' + myKey(s) + '.json', {
      method: 'PUT',
      body: JSON.stringify({ nama: nama, mode: s.mode, bintang: b, koin: c, misi: n, cocok: ck.best || 0, live: status(s), ts: Date.now() })
    }).catch(function () {});
  }

  var rows = [];
  function poll() {
    fetch(FB + '/pemain/' + KL + '.json').then(function (r) { return r.json(); }).then(function (o) {
      rows = Object.keys(o || {}).map(function (k) { return Object.assign({ id: k }, o[k]); });
      draw();
    }).catch(function () {});
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function ago(ts) {
    if (!ts) return 'belum aktif';
    var m = Math.round((Date.now() - ts) / 60000);
    return m < 1 ? 'baru saja' : m < 60 ? m + ' menit lalu' : Math.round(m / 60) + ' jam lalu';
  }

  function draw() {
    if (!vis('rank')) return;
    var list = $('rankList'); if (!list) return;
    var on = document.querySelector('#rkTabs .on');
    var tab = (on && on.dataset.t) || 'solo';
    var me = myKey(getSave());
    var data = rows.filter(function (x) { return x.mode === tab; }).sort(function (a, b) {
      return (b.bintang - a.bintang) || (b.koin - a.koin) || ((b.cocok || 0) - (a.cocok || 0));
    });
    var note = $('rankNote');
    if (note) note.textContent = 'Live: siapa pun yang sedang main otomatis muncul di sini. Urutan: bintang, koin, skor Cocokkan Nilai.';
    list.innerHTML = '';
    if (!data.length) { list.appendChild(el('p', 'kw', 'Belum ada yang mulai bermain.')); return; }
    data.forEach(function (x, i) {
      var aktif = x.ts && Date.now() - x.ts < 45000;
      var d = el('div', 'rankrow' + (x.id === me ? ' me' : ''));
      var mid = el('div');
      mid.appendChild(el('b', '', x.nama || 'Tanpa nama'));
      mid.appendChild(el('small', '', (x.misi || 0) + ' misi · Cocokkan ' + (x.cocok || 0) + ' poin'));
      var st = el('small', '', aktif && x.live ? '🟢 ' + x.live.s + (x.live.k ? ' · +' + x.live.k + ' koin berjalan' : '') : '⚪ aktif ' + ago(x.ts));
      st.style.display = 'block';
      mid.appendChild(st);
      d.appendChild(el('span', 'no', i + 1));
      d.appendChild(mid);
      d.appendChild(el('div', 'sc', '★ ' + (x.bintang || 0) + ' · ' + (x.koin || 0) + ' koin'));
      list.appendChild(d);
    });
  }

  setInterval(function () { if (!document.hidden) push(); }, 10000);
  setInterval(function () { if (vis('rank') && !document.hidden) poll(); }, 4000);
  setInterval(draw, 2000);
  var lastClick = 0;
  document.addEventListener('click', function (e) {
    var now = Date.now();
    if (now - lastClick > 3000) { lastClick = now; setTimeout(push, 800); }
    if (e.target && e.target.closest && e.target.closest('#btnRank')) setTimeout(poll, 300);
    if (e.target && e.target.closest && e.target.closest('#rkTabs')) setTimeout(draw, 50);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) push(); });
  push();
})();
