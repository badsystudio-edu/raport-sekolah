// ============================================
// LOGIKA APLIKASI (SPA) - Lentera Akademik
// Sama seperti sebelumnya, hanya call() kini lewat fetch() (lihat api.js)
// ============================================

let TOKEN = null, USER = null, OPSI = {}, chart = null, formCtx = null;
const MENU = [
  ['dashboard','Dashboard','bi-grid',['admin','kepsek','guru']],
  ['nilai','Input Nilai','bi-pencil-square',['admin','guru']],
  ['wali','Absensi & Catatan','bi-person-check',['admin','guru']],
  ['rekap','Rekap & Grafik','bi-bar-chart',['admin','kepsek','guru']],
  ['raport','Cetak Raport','bi-printer',['admin','kepsek','guru']],
  ['master','Data Master','bi-database',['admin','kepsek','guru']],
  ['guru','Pengaturan Guru','bi-person-gear',['admin']],
  ['app','Pengaturan Aplikasi','bi-gear',['admin']]
];
const MASTERS = ['TahunAjaran','JenisUjian','Kelas','Guru','Mapel','PenugasanGuru','Siswa','WaliMurid','Users'];

function toggleDark() {
  const d = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', d);
  try { localStorage.setItem('theme', d); } catch (e) {}
}
try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}

// -- Login / navigasi SPA --
async function doLogin() {
  const r = await call('login', $('lgUser').value.trim(), $('lgPass').value);
  if (!r.success) return;
  TOKEN = r.data.token; USER = r.data.user;
  const o = await call('getOpsi', TOKEN); OPSI = o.data || {};
  $('loginView').classList.add('d-none'); $('appView').classList.remove('d-none'); applyBrand();
  const role = { admin: 'Admin', kepsek: 'Kepala Sekolah', guru: USER.waliKelasId ? 'Guru Wali Kelas' : 'Guru Mapel' }[USER.peran];
  $('userBox').innerHTML = '<b>' + esc(USER.nama) + '</b><br><span class="muted">' + role + '</span>';
  $('menu').innerHTML = MENU.filter(m => m[3].includes(USER.peran)).map(m => `<li><a data-s="${m[0]}" onclick="go('${m[0]}')"><i class="bi ${m[2]}"></i>${m[1]}</a></li>`).join('');
  $('bnav').innerHTML = MENU.filter(m => m[3].includes(USER.peran)).map(m => `<a data-s="${m[0]}" onclick="go('${m[0]}')"><i class="bi ${m[2]}"></i><span>${m[1].split(' ')[0]}</span></a>`).join('');
  go('dashboard');
}
async function doLogout() { await call('logout', TOKEN); location.reload(); }
function go(s) {
  document.querySelectorAll('.sec').forEach(e => e.classList.toggle('active', e.id === 'sec-' + s));
  document.querySelectorAll('#menu a, #bnav a').forEach(a => a.classList.toggle('active', a.dataset.s === s));
  $('pageTitle').textContent = (MENU.find(m => m[0] === s) || [])[1];
  $('sidebar').classList.remove('open');
  ({ dashboard: viewDash, nilai: viewNilai, wali: viewWali, rekap: viewRekap, raport: viewRaport, master: viewMaster, guru: viewGuruSet, app: viewApp })[s]();
}
const sel = (id, arr, label, val = 'ID', txt = 'nama') => `<select id="${id}" class="form-select"><option value="">${label}</option>${arr.map(x => `<option value="${esc(x[val])}"${(id === 'fTa' && x.ID === (OPSI.aktif || {}).ta) || (id === 'fUjian' && x.ID === (OPSI.aktif || {}).ujian) ? ' selected' : ''}>${esc(x[txt])}${x.semester ? ' ' + esc(x.semester) : ''}</option>`).join('')}</select>`;
const filt = (extra = '', kl) => `<div class="row g-2 mb-3"><div class="col-6 col-lg-2">${sel('fTa', OPSI.ta || [], 'Tahun Ajaran')}</div><div class="col-6 col-lg-2">${sel('fUjian', OPSI.ujian || [], 'Jenis Ujian')}</div><div class="col-6 col-lg-2">${sel('fKelas', kl || OPSI.kelas || [], 'Kelas')}</div>${extra}</div>`;
function meta() { // filter -> objek; semester diambil dari tahun ajaran yang dipilih
  const t = (OPSI.ta || []).find(x => x.ID === $('fTa').value) || {};
  return { ta: t.nama, semester: t.semester, ujian: ((OPSI.ujian || []).find(x => x.ID === $('fUjian').value) || {}).nama, kelasId: $('fKelas').value, mapelId: $('fMapel') ? $('fMapel').value : '' };
}

// -- Dashboard --
async function viewDash() {
  const r = await call('getDashboard', TOKEN); if (!r.success) return; const d = r.data;
  const gInfo = USER.guruId ? (OPSI.guru || []).find(x => x.ID === USER.guruId) : null;
  const avatar = gInfo && gInfo.foto ? `<img src="${esc(gInfo.foto)}" class="hero-avatar">` : '';
  $('sec-dashboard').innerHTML = `<div class="hero mb-3 d-flex align-items-center gap-3">${avatar}<div><div class="small opacity-75">Selamat datang kembali</div><h4 class="mb-0">${esc(USER.nama)}</h4></div></div><div class="row g-3 my-1">
    ${[['Siswa', d.siswa], ['Guru', d.guru], ['Kelas', d.kelas], ['Data Nilai', d.nilai]].map(k => `<div class="col-6 col-lg-3"><div class="card-x"><div class="muted">${k[0]}</div><div class="kpi">${k[1]}</div></div></div>`).join('')}</div>
    <div class="card-x mt-3"><h6>Rata-rata Nilai per Kelas</h6><canvas id="cDash" height="110"></canvas></div>`;
  drawChart('cDash', d.perKelas.map(x => x.kelas), d.perKelas.map(x => x.rata), 'Rata-rata');
}
function drawChart(id, labels, data, label) {
  if (chart) chart.destroy();
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  chart = new Chart($(id), { type: 'bar', data: { labels, datasets: [{ label, data, backgroundColor: '#0284c7', borderRadius: 4 }] },
    options: { scales: { y: { min: 0, max: 100, ticks: { color: dark ? '#e2e8f0' : '#0f172a' } }, x: { ticks: { color: dark ? '#e2e8f0' : '#0f172a' } } }, plugins: { legend: { labels: { color: dark ? '#e2e8f0' : '#0f172a' } } } } });
}

// -- Input nilai massal --
function viewNilai() {
  const T = USER.peran === 'guru' ? (OPSI.tugas || []) : null;
  const ml = T ? (OPSI.mapel || []).filter(m => T.some(t => t.mapelId === m.ID)) : (OPSI.mapel || []);
  $('sec-nilai').innerHTML = `<h5>Input Nilai Ujian</h5>` + (T && !ml.length ? '<div class="alert alert-warning">Anda belum ditugaskan pada mata pelajaran mana pun. Hubungi Admin.</div>' : '') + filt(`<div class="col-6 col-lg-3">${sel('fMapel', ml, 'Mata Pelajaran')}</div><div class="col-6 col-lg-2"><button class="btn btn-primary w-100" onclick="loadNilai()">Terapkan</button></div>`, T ? [] : null) + '<div id="nilaiBox"></div>';
  if (T) $('fMapel').onchange = () => { // kelas menyesuaikan mapel yang dipilih
    const ks = (OPSI.kelas || []).filter(k => T.some(t => t.mapelId === $('fMapel').value && t.kelasId === k.ID));
    $('fKelas').innerHTML = '<option value="">Kelas</option>' + ks.map(k => `<option value="${k.ID}">${esc(k.nama)}</option>`).join('');
  };
}
let KKM = 75, BF = 40;
const hitung = (f, s) => { f = f === '' ? null : Number(f); s = s === '' ? null : Number(s); return f === null && s === null ? '' : f === null ? s : s === null ? f : Math.round(f * BF / 100 + s * (100 - BF) / 100); };
async function loadNilai() {
  const m = meta(); if (!m.ta || !m.ujian || !m.kelasId || !m.mapelId) return toast('Lengkapi semua filter.', 'warning');
  const r = await call('getNilaiForm', TOKEN, m); if (!r.success) return; KKM = Number(r.data.KKM); BF = Number(r.data.bobotF);
  const inp = (f, v) => `<input class="form-control form-control-sm sc" type="number" min="0" max="100" data-f="${f}" value="${esc(v)}" oninput="rowCalc(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();nextInput(this)}">`;
  $('nilaiBox').innerHTML = `<div class="card-x"><div class="d-flex justify-content-between flex-wrap gap-2 mb-2"><span class="muted">KKM ${KKM} * Formatif ${BF}% + Sumatif ${100 - BF}% * Enter pindah baris</span><button class="btn btn-primary btn-sm" onclick="saveNilai()"><i class="bi bi-cloud-upload"></i> Simpan Nilai</button></div><div class="tbl-wrap"><table class="t"><thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Formatif</th><th>Sumatif</th><th>Nilai Akhir</th></tr></thead><tbody>${r.data.siswa.map((s, i) => `<tr data-r="${s.ID}"><td>${i + 1}</td><td>${esc(s.NIS)}</td><td>${esc(s.nama)}</td><td>${inp('f', s.formatif)}</td><td>${inp('s', s.sumatif)}</td><td class="fin fw-bold"></td></tr>`).join('')}</tbody></table></div></div>`;
  document.querySelectorAll('#nilaiBox tbody tr').forEach(tr => rowCalc(tr.querySelector('input')));
}
function rowCalc(el) { const tr = el.closest('tr'), [f, s] = tr.querySelectorAll('input'), v = hitung(f.value, s.value), c = tr.querySelector('.fin'); c.textContent = v; c.className = 'fin fw-bold ' + (v !== '' && v < KKM ? 'text-danger' : ''); }
function nextInput(el) { const all = [...document.querySelectorAll('#nilaiBox input')]; const n = all[all.indexOf(el) + 1]; if (n) n.focus(); }
async function saveNilai() {
  const items = [...document.querySelectorAll('#nilaiBox tbody tr')].map(tr => { const [f, s] = tr.querySelectorAll('input'); return { siswaId: tr.dataset.r, formatif: f.value, sumatif: s.value }; });
  if (items.some(i => [i.formatif, i.sumatif].some(v => v !== '' && (v < 0 || v > 100)))) return toast('Nilai harus 0-100.', 'warning');
  const r = await call('saveNilai', TOKEN, meta(), items); if (r.success) toast(r.message);
}

// -- Absensi, sikap/ekskul, catatan --
function viewWali() {
  $('sec-wali').innerHTML = `<h5>Absensi, Sikap/Ekskul &amp; Catatan Wali Kelas</h5>` + filt(`<div class="col-6 col-lg-2"><select id="fJenis" class="form-select"><option value="absensi">Absensi</option><option value="sikap">Sikap/Ekskul</option><option value="catatan">Catatan</option></select></div><div class="col-6 col-lg-2"><button class="btn btn-primary w-100" onclick="loadWali()">Terapkan</button></div>`) + '<datalist id="p3l"><option value="MB"><option value="BSH"><option value="SB"></datalist><div id="waliBox"></div>';
}
const WF = { absensi: ['sakit', 'izin', 'alpa'], sikap: ['p3', 'sikap', 'ekskul'], catatan: ['catatan'] };
async function loadWali() {
  const m = meta(), k = $('fJenis').value; if (!m.ta || !m.kelasId) return toast('Pilih tahun ajaran dan kelas.', 'warning');
  const r = await call('getWali', TOKEN, k, m); if (!r.success) return;
  $('waliBox').innerHTML = `<div class="card-x"><div class="d-flex flex-wrap gap-2 justify-content-end mb-2">${k === 'catatan' ? `<select id="preset" class="form-select form-select-sm" style="max-width:300px">${PRESET.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select><button class="btn btn-outline-primary btn-sm" onclick="applyPreset()">Terapkan ke yang masih kosong</button>` : ''}<button class="btn btn-primary btn-sm" onclick="saveWali('${k}')">Simpan</button></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Nama</th>${WF[k].map(f => `<th>${f}</th>`).join('')}</tr></thead><tbody>${r.data.map(s => `<tr data-id="${s.siswaId}"><td>${esc(s.nama)}</td>${WF[k].map(f => `<td><input class="form-control form-control-sm" data-f="${f}" ${f === 'p3' ? 'list="p3l" placeholder="MB/BSH/SB" style="width:100px"' : ''} ${k === 'absensi' ? 'type="number" min="0" style="width:70px"' : ''} value="${esc(s.data[f] || '')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}
async function saveWali(k) {
  const items = [...document.querySelectorAll('#waliBox tbody tr')].map(tr => ({ siswaId: tr.dataset.id, data: Object.fromEntries([...tr.querySelectorAll('input')].map(i => [i.dataset.f, i.value])) }));
  const r = await call('saveWali', TOKEN, k, meta(), items); if (r.success) toast(r.message);
}

// -- Rekap & grafik --
function viewRekap() { $('sec-rekap').innerHTML = `<h5>Rekap, Leger &amp; Grafik</h5>` + filt(`<div class="col-6 col-lg-2"><button class="btn btn-primary w-100" onclick="loadRekap()">Tampilkan</button></div>`) + '<div id="rekapBox"></div>'; }
async function loadRekap() {
  const m = meta(); if (!m.ta || !m.ujian || !m.kelasId) return toast('Lengkapi filter.', 'warning');
  const r = await call('getRekap', TOKEN, m); if (!r.success) return; const d = r.data;
  $('rekapBox').innerHTML = `<div class="card-x mb-3"><div class="d-flex justify-content-between"><b>Rekap Nilai</b><span><button class="btn btn-sm btn-outline-success" onclick="exportLeger()"><i class="bi bi-file-earmark-excel"></i> Unduh Excel</button> <button class="btn btn-sm btn-outline-primary" onclick="printRekap()"><i class="bi bi-file-earmark-pdf"></i> Pratinjau / PDF</button></span></div>
  <div class="tbl-wrap mt-2" id="rekapTbl"><table class="t"><thead><tr><th>No</th><th>Nama</th>${d.mapel.map(x => `<th>${esc(x.nama)}</th>`).join('')}<th>Jumlah</th><th>Rata</th><th>Rank</th></tr></thead><tbody>${d.baris.map((b, i) => `<tr><td>${i + 1}</td><td>${esc(b.siswa.nama)}</td>${b.nilai.map((n, j) => `<td class="${n !== null && n < d.mapel[j].KKM ? 'text-danger fw-bold' : ''}">${n === null ? '-' : n}</td>`).join('')}<td>${b.jumlah}</td><td>${b.rata}</td><td>${b.peringkat}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card-x mb-3"><b>Wawasan Otomatis</b><ul class="mb-0 mt-1">${d.insights.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
  <div class="card-x"><b>Perkembangan Rata-rata Siswa</b><canvas id="cRekap" height="110"></canvas></div>`;
  drawChart('cRekap', d.baris.map(b => b.siswa.nama), d.baris.map(b => b.rata), 'Rata-rata siswa');
  window._rekap = d; window._rekapM = m;
}
const kelasNama = id => ((OPSI.kelas || []).find(k => k.ID === id) || {}).nama || '';
function kopHtml(p) { // kop raport: pakai gambar unggahan Admin jika ada, atau fallback logo+teks
  if (p.kopUrl) return `<img src="${esc(p.kopUrl)}" style="width:100%;display:block;margin-bottom:6px">`;
  return `${p.logoUrl ? `<img src="${esc(p.logoUrl)}" style="height:60px;float:left">` : ''}<b style="font-size:16px">${esc((p.nama || '').toUpperCase())}</b><br>${esc(p.alamat)} * ${esc(p.kontak)}`;
}
function printRekap() {
  const d = window._rekap, m = window._rekapM, p = d.profil;
  $('prevBody').innerHTML = `<div class="raport" style="max-width:none"><div class="kop">${kopHtml(p)}</div><h6 class="text-center my-2">LEGER NILAI ${esc(m.ujian)} - KELAS ${esc(kelasNama(m.kelasId))} - ${esc(m.ta)} ${esc(m.semester)}</h6>` + $('rekapTbl').innerHTML + `<table style="border:0;margin-top:24px;width:60%;margin-left:auto"><tr style="text-align:center"><td style="border:0">Wali Kelas<br><br><br>(................)</td><td style="border:0">Kepala Sekolah<br><br><br><u>${esc(p.kepsek)}</u><br>NIP. ${esc(p.nip)}</td></tr></table></div>`;
  window._land = true; $('pdfBtn').style.display = 'none'; $('pdfLink').innerHTML = ''; bootstrap.Modal.getOrCreateInstance($('prevModal')).show();
}
function exportLeger() {
  const d = window._rekap, m = window._rekapM, kn = kelasNama(m.kelasId);
  const rows = [['LEGER NILAI ' + m.ujian, 'Kelas ' + kn, m.ta + ' ' + m.semester], [], ['No', 'NIS', 'Nama'].concat(d.mapel.map(x => x.nama), ['Jumlah', 'Rata-rata', 'Peringkat']), ['', '', 'KKM'].concat(d.mapel.map(x => x.KKM), ['', '', ''])];
  d.baris.forEach((b, i) => rows.push([i + 1, b.siswa.NIS, b.siswa.nama].concat(b.nilai.map(n => n === null ? '' : n), [b.jumlah, b.rata, b.peringkat])));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Leger'); XLSX.writeFile(wb, 'Leger_' + kn + '_' + m.ujian + '.xlsx');
}
window.addEventListener('beforeprint', () => { const s = document.createElement('style'); s.id = 'pg'; s.textContent = '@page{size:A4 ' + (window._land ? 'landscape;margin:1cm' : 'portrait;margin:0') + '}'; document.head.appendChild(s); });
window.addEventListener('afterprint', () => { const s = $('pg'); if (s) s.remove(); });

// -- Cetak raport --
function viewRaport() {
  $('sec-raport').innerHTML = `<h5>Pratinjau &amp; Cetak Raport</h5>` + filt(`<div class="col-6 col-lg-2"><button class="btn btn-primary w-100" onclick="loadRaport()">Muat Data</button></div>`) + '<div id="rapBox"></div>';
}
async function loadRaport() {
  const m = meta(); if (!m.ta || !m.ujian || !m.kelasId) return toast('Lengkapi filter.', 'warning');
  m.raport = true; const r = await call('getRekap', TOKEN, m); if (!r.success) return;
  window._rap = { d: r.data, m: m };
  $('rapBox').innerHTML = `<div class="card-x"><div class="row g-2 align-items-end"><div class="col-lg-4"><label class="form-label">Siswa</label><select id="rapSiswa" class="form-select"><option value="">Semua siswa (${r.data.baris.length})</option>${r.data.baris.map(b => `<option value="${b.siswa.ID}">${esc(b.siswa.nama)}</option>`).join('')}</select></div><div class="col-lg-3"><div class="form-check"><input class="form-check-input" type="checkbox" id="rapFoto" ${(OPSI.aktif || {}).foto ? 'checked' : ''}><label class="form-check-label" for="rapFoto">Tampilkan foto siswa</label></div></div><div class="col-lg-3"><button class="btn btn-primary w-100" onclick="renderRaport()"><i class="bi bi-eye"></i> Pratinjau</button></div></div><p class="muted mt-2 mb-0">Periksa pratinjau, lalu klik "Cetak / Simpan PDF" di jendela pratinjau. Urutan mapel diatur di Pengaturan Aplikasi.</p></div>`;
  renderRaport();
}
const SATU = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function terbilang(n) {
  n = Math.round(Number(n)); if (isNaN(n)) return '';
  const s = n < 12 ? SATU[n] : n < 20 ? SATU[n - 10] + ' belas' : n < 100 ? SATU[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + SATU[n % 10] : '') : n === 100 ? 'seratus' : String(n);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const predikat = (n, p) => n >= (Number(p.batasA) || 90) ? 'A' : n >= (Number(p.batasB) || 80) ? 'B' : n >= (Number(p.batasC) || 75) ? 'C' : 'D';
function renderRaport() {
  const { d, m } = window._rap, p = d.profil, sid = $('rapSiswa').value, foto = $('rapFoto').checked, enc = encodeURIComponent;
  const rows = b => { let g = ''; return d.mapel.map((x, j) => { const n = b.nilai[j], h = x.kelompok && x.kelompok !== g ? `<tr><td colspan="7"><b>${esc(x.kelompok)}</b></td></tr>` : ''; g = x.kelompok || g; return h + `<tr><td>${j + 1}</td><td>${esc(x.nama)}</td><td>${x.KKM}</td><td>${n === null ? '-' : n}</td><td>${n === null ? '' : terbilang(n)}</td><td>${n === null ? '-' : predikat(n, p)}</td><td>${n === null ? '-' : n >= x.KKM ? 'Tuntas' : 'Belum Tuntas'}</td></tr>`; }).join(''); };
  $('prevBody').innerHTML = d.baris.filter(b => !sid || b.siswa.ID === sid).map(b => `<div class="raport"><div class="kop">${kopHtml(p)}</div>
  <div class="text-center mb-2"><b>LAPORAN PENILAIAN HASIL BELAJAR<br>${esc(m.ujian)} SEMESTER ${esc(m.semester)} - ${esc(m.ta)}</b></div>
  <p>${foto && b.siswa.foto ? `<img src="${esc(b.siswa.foto)}" style="height:80px;float:right;margin-left:8px">` : ''}Nama: <b>${esc(b.siswa.nama)}</b> &nbsp; NIS/NISN: ${esc(b.siswa.NIS)} / ${esc(b.siswa.NISN)}</p>
  <table><thead><tr><th>No</th><th>Mata Pelajaran</th><th>KKM</th><th>Nilai</th><th>Terbilang</th><th>Huruf</th><th>Ket.</th></tr></thead><tbody>${rows(b)}
  <tr><td colspan="3"><b>Jumlah</b></td><td colspan="4">${b.jumlah}</td></tr><tr><td colspan="3"><b>Rata-rata</b></td><td colspan="4">${b.rata}</td></tr></tbody></table>
  <p class="mt-2">Peringkat: <b>${b.peringkat}</b> dari ${d.baris.length} siswa &nbsp;|&nbsp; Sakit ${b.absensi.sakit || 0}, Izin ${b.absensi.izin || 0}, Alpa ${b.absensi.alpa || 0}<br>Profil Karakter P3: ${esc(b.sikap.p3 || '-')} &nbsp; Sikap: ${esc(b.sikap.sikap || '-')} &nbsp; Ekskul: ${esc(b.sikap.ekskul || '-')}<br>Catatan wali kelas: ${esc(b.catatan || '-')}</p>
  <table style="border:0;margin-top:30px"><tr style="text-align:center"><td style="border:0">Orang Tua/Wali<br><br><br><br>(................)</td><td style="border:0">Wali Kelas<br><br><br><br>(................)</td><td style="border:0">Kepala Sekolah<br><br><br><br><u>${esc(p.kepsek)}</u><br>NIP. ${esc(p.nip)}</td></tr></table>
  <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:10px"><div class="qr" data-q="${esc(d.url + '?v=' + b.siswa.ID + '&t=' + enc(m.ta) + '&s=' + enc(m.semester) + '&u=' + enc(m.ujian) + '&k=' + b.kode)}"></div><span>Pindai QR untuk memverifikasi keaslian dokumen.</span></div></div>`).join('') || '<p>Belum ada siswa.</p>';
  if (typeof QRCode !== 'undefined') document.querySelectorAll('#prevBody .qr').forEach(e => new QRCode(e, { text: e.dataset.q, width: 70, height: 70 }));
  window._land = false; $('pdfBtn').style.display = ''; bootstrap.Modal.getOrCreateInstance($('prevModal')).show();
}

// -- Data master (generik) --
function viewMaster() {
  $('sec-master').innerHTML = `<h5>Data Master</h5><select id="mSheet" class="form-select mb-3" style="max-width:260px" onchange="loadMaster()">${MASTERS.filter(x => x !== 'Users' || USER.peran === 'admin').map(x => `<option>${x}</option>`).join('')}</select><div id="mBox"></div>`;
  loadMaster();
}
async function loadMaster() {
  const n = $('mSheet').value, r = await call('listData', TOKEN, n); if (!r.success) return;
  formCtx = { name: n, headers: r.data.headers };
  const adm = USER.peran === 'admin';
  $('mBox').innerHTML = `<div class="card-x">${adm ? `<button class="btn btn-primary btn-sm mb-2" onclick="openForm()"><i class="bi bi-plus-lg"></i> Tambah</button>${IMP[n] ? ` <button class="btn btn-outline-primary btn-sm mb-2" onclick="dlTemplate()"><i class="bi bi-download"></i> Unduh Template</button> <label class="btn btn-outline-success btn-sm mb-2"><i class="bi bi-upload"></i> Impor Excel/CSV<input type="file" hidden accept=".xlsx,.xls,.csv" onchange="doImport(this)"></label>${['Guru', 'Siswa'].includes(n) ? ` <label class="btn btn-outline-secondary btn-sm mb-2"><i class="bi bi-images"></i> Unggah Foto Massal<input type="file" multiple hidden accept="image/*" onchange="bulkFoto(this)"></label>` : ''}` : ''}` : ''}<input class="form-control form-control-sm mb-2" style="max-width:260px" placeholder="Cari..." oninput="const q=this.value.toLowerCase();document.querySelectorAll('#mBox tbody tr').forEach(t=>t.style.display=t.textContent.toLowerCase().includes(q)?'':'none')">
  <div class="tbl-wrap"><table class="t"><thead><tr>${r.data.headers.map(h => `<th>${h}</th>`).join('')}${adm ? '<th></th>' : ''}</tr></thead><tbody>${r.data.rows.map((row, i) => `<tr>${r.data.headers.map(h => `<td>${h === 'foto' ? (row[h] ? `<img class="thumb" src="${esc(row[h])}">` : '') : esc(row[h]).slice(0, 40)}</td>`).join('')}${adm ? `<td class="text-nowrap"><a class="btn btn-sm" onclick='openForm(${JSON.stringify(row).replace(/'/g, '&#39;')})'><i class="bi bi-pencil"></i></a>${n === 'Users' ? `<a class="btn btn-sm" title="Reset sandi" onclick="resetSandi('${row.ID}')"><i class="bi bi-key"></i></a>` : ''}<a class="btn btn-sm text-danger" onclick="askDel('${row.ID}')"><i class="bi bi-trash"></i></a></td>` : ''}</tr>`).join('')}</tbody></table></div></div>`;
}
function openForm(row) {
  row = row || {}; $('formTitle').textContent = (row.ID ? 'Ubah ' : 'Tambah ') + formCtx.name; formCtx.id = row.ID || '';
  const hs = formCtx.headers.filter(h => h !== 'ID' && h !== 'foto').concat(formCtx.name === 'Users' ? ['password'] : []);
  $('formBody').innerHTML = hs.map(h => `<label class="form-label mt-1">${h}</label><input class="form-control" data-k="${h}" ${h === 'password' ? 'type="password"' : ''} value="${esc(row[h])}">`).join('') + (['Guru', 'Siswa'].includes(formCtx.name) ? '<label class="form-label mt-2">Foto (PNG/JPG)</label><input type="file" id="fotoFile" accept="image/*" class="form-control">' : '');
  bootstrap.Modal.getOrCreateInstance($('formModal')).show();
}
async function submitForm() {
  const o = { ID: formCtx.id }; document.querySelectorAll('#formBody [data-k]').forEach(i => o[i.dataset.k] = i.value);
  const f = $('fotoFile') && $('fotoFile').files[0];
  if (f) { try { o.foto = await imgToData(f, 180); } catch (e) { return toast('Foto tidak dapat dibaca.', 'danger'); } }
  const r = await call('saveRow', TOKEN, formCtx.name, o);
  if (r.success) { toast(r.message); bootstrap.Modal.getInstance($('formModal')).hide(); await loadMaster(); showAkun(r.data && r.data.akun ? [r.data.akun] : [], 'Akun guru dibuat otomatis'); const p = await call('getOpsi', TOKEN); OPSI = p.data || OPSI; }
}
// -- Impor template Excel/CSV --
const IMP = { PenugasanGuru: ['guru', 'mapel', 'kelas'], Guru: ['NIP', 'nama'], Mapel: ['nama', 'KKM', 'kelompok'], Siswa: ['NIS', 'NISN', 'nama', 'kelas'] };
const IMPEX = { PenugasanGuru: [['198501012010011001', 'Matematika', 'VII-A']], Guru: [['198501012010011001', 'Budi Santoso, S.Pd.']], Mapel: [['Matematika', 75, 'Wajib']], Siswa: [['240101', '0071882910', 'Achmad Fauzi', 'VII-A']] };
function dlTemplate() {
  const n = formCtx.name, wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([IMP[n]].concat(IMPEX[n])), n);
  XLSX.writeFile(wb, 'Template_' + n + '.xlsx');
}
function doImport(inp) {
  const f = inp.files[0], n = formCtx.name; inp.value = '';
  if (!f) return;
  if (f.size > 3 * 1024 * 1024) return toast('Ukuran file maksimal 3 MB.', 'warning');
  const rd = new FileReader();
  rd.onload = async () => {
    let rows;
    try { const wb = XLSX.read(new Uint8Array(rd.result), { type: 'array' }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }); }
    catch (e) { return toast('File tidak dapat dibaca.', 'danger'); }
    if (!rows.length) return toast('File kosong.', 'warning');
    const miss = IMP[n].filter(c => !(c in rows[0]));
    if (miss.length) return toast('Kolom tidak ditemukan: ' + miss.join(', ') + '. Gunakan template terbaru.', 'danger');
    const r = await (n === 'PenugasanGuru' ? call('importPenugasan', TOKEN, rows) : call('importData', TOKEN, n, rows)); if (!r.success) return;
    await loadMaster();
    const p = await call('getOpsi', TOKEN); OPSI = p.data || OPSI;
    toast(r.message, r.data.gagal ? 'warning' : 'success');
    if (r.data.errors.length) $('mBox').insertAdjacentHTML('afterbegin', '<div class="card-x mb-2 text-danger"><b>Baris yang gagal:</b><br>' + r.data.errors.map(esc).join('<br>') + '</div>');
    showAkun(r.data.akun, 'Akun guru dibuat otomatis (' + r.data.akun.length + ')');
  };
  rd.readAsArrayBuffer(f);
}
// -- Pengaturan mapel per guru (matriks mapel x kelas) --
async function viewGuruSet() {
  const o = await call('getOpsi', TOKEN); if (o.success) OPSI = o.data;
  $('sec-guru').innerHTML = `<h5>Pengaturan Guru</h5><p class="muted">Pilih guru, lalu centang kelas pada setiap mata pelajaran yang diampu (boleh lebih dari satu). Guru hanya bisa mengisi nilai pada mapel/kelas yang dicentang.</p><div class="row g-2 mb-3"><div class="col-lg-4">${sel('gSel', OPSI.guru || [], 'Pilih guru')}</div></div><div id="gBox"></div>`;
  $('gSel').onchange = loadGuruSet;
}
async function loadGuruSet() {
  const id = $('gSel').value; if (!id) { $('gBox').innerHTML = ''; return; }
  const r = await call('getPenugasan', TOKEN, id); if (!r.success) return;
  const set = new Set(r.data.pairs), wl = new Set(r.data.wali), K = OPSI.kelas || [], M = OPSI.mapel || [];
  $('gBox').innerHTML = K.length && M.length ? `<div class="card-x"><div class="text-end mb-2"><button class="btn btn-primary btn-sm" onclick="saveGuruSet()">Simpan Pengaturan</button></div><div class="mb-2"><b>Wali kelas:</b> ${K.map(k => `<label class="me-3"><input type="checkbox" class="wl" value="${k.ID}" ${wl.has(k.ID) ? 'checked' : ''}> ${esc(k.nama)}</label>`).join('')}</div><div class="tbl-wrap"><table class="t"><thead><tr><th>Mata Pelajaran</th>${K.map(k => `<th class="text-center">${esc(k.nama)}<br><input type="checkbox" onchange="colChk(this,'${k.ID}')"></th>`).join('')}</tr></thead><tbody>${M.map(m => `<tr><td>${esc(m.nama)}</td>${K.map(k => `<td class="text-center"><input type="checkbox" class="pg" data-k="${m.ID}|${k.ID}" data-c="${k.ID}" ${set.has(m.ID + '|' + k.ID) ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : '<p class="muted">Tambahkan data Kelas dan Mata Pelajaran terlebih dahulu di Data Master.</p>';
}
function colChk(el, kid) { document.querySelectorAll('.pg[data-c="' + kid + '"]').forEach(c => c.checked = el.checked); }
async function saveGuruSet() {
  const pairs = [...document.querySelectorAll('.pg:checked')].map(c => c.dataset.k);
  const r = await call('setPenugasan', TOKEN, $('gSel').value, pairs, [...document.querySelectorAll('.wl:checked')].map(c => c.value)); if (r.success) toast(r.message);
}
function showAkun(list, judul) { // tampilkan kredensial awal (hanya muncul sekali)
  if (!list || !list.length) return;
  $('mBox').insertAdjacentHTML('afterbegin', `<div class="card-x mb-2 border-success"><b>${judul}</b> <span class="text-danger">- catat sekarang, sandi tidak ditampilkan lagi.</span><div class="tbl-wrap"><table class="t"><thead><tr><th>Nama</th><th>Username</th><th>Sandi</th></tr></thead><tbody>${list.map(a => `<tr><td>${esc(a.nama)}</td><td><code>${esc(a.username)}</code></td><td><code>${esc(a.password)}</code></td></tr>`).join('')}</tbody></table></div></div>`);
}
async function resetSandi(id) { const r = await call('resetSandi', TOKEN, id); if (r.success) showAkun([r.data], 'Sandi baru'); }

function askDel(id) {
  const m = bootstrap.Modal.getOrCreateInstance($('delModal'));
  $('delBtn').onclick = async () => { const r = await call('deleteRow', TOKEN, formCtx.name, id); m.hide(); if (r.success) { toast(r.message); loadMaster(); } };
  m.show();
}
// -- Branding, gambar, pengaturan aplikasi --
let BRAND = {};
function applyBrand(p) {
  BRAND = Object.assign({}, BRAND, p || {}); const nm = BRAND.namaApp || 'Lentera Akademik';
  document.querySelectorAll('.appName').forEach(e => e.textContent = nm);
  document.querySelectorAll('.logoBox').forEach(e => e.innerHTML = BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" alt="">` : '<i class="bi bi-mortarboard-fill"></i>');
  if ($('schoolName')) $('schoolName').textContent = BRAND.nama || ''; document.title = nm;
  if (BRAND.bgUrl) { document.body.style.backgroundImage = `url("${BRAND.bgUrl}")`; document.body.classList.add('has-bg'); }
  else { document.body.style.backgroundImage = ''; document.body.classList.remove('has-bg'); }
}
function imgToData(file, max) { // kecilkan gambar di browser agar muat di sel Sheets (logo, foto orang)
  return new Promise((ok, bad) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      let d = c.toDataURL('image/png');
      if (d.length > 40000) { const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0); d = c2.toDataURL('image/jpeg', .8); }
      URL.revokeObjectURL(u); d.length > 48000 ? bad() : ok(d);
    };
    im.onerror = bad; im.src = u;
  });
}
function fileToResizedBlob(file, maxDim, quality) { // untuk kop/background: disimpan di Drive, boleh lebih besar & lebih tajam
  return new Promise((ok, bad) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const s = Math.min(1, maxDim / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(blob => {
        const fr = new FileReader();
        fr.onload = () => ok({ b64: fr.result.split(',')[1], mime: 'image/jpeg' });
        fr.onerror = bad; fr.readAsDataURL(blob);
      }, 'image/jpeg', quality || 0.85);
    };
    im.onerror = bad; im.src = u;
  });
}
async function uploadBigImage(kind, file, maxDim) { // kind: 'kop' atau 'bg'
  const { b64, mime } = await fileToResizedBlob(file, maxDim, kind === 'bg' ? 0.82 : 0.9);
  return call('uploadImage', TOKEN, kind, b64, mime, file.name);
}
async function viewApp() {
  const r = await call('listData', TOKEN, 'ProfilSekolah'), p = (r.data && r.data.rows[0]) || {};
  window._logo = p.logoUrl || ''; window._kop = p.kopUrl || ''; window._bg = p.bgUrl || '';
  const F = [['namaApp', 'Nama Aplikasi'], ['nama', 'Nama Sekolah'], ['npsn', 'NPSN'], ['alamat', 'Alamat'], ['kontak', 'Kontak'], ['kepsek', 'Nama Kepala Sekolah'], ['nip', 'NIP Kepala Sekolah'], ['batasA', 'Batas Predikat A (nilai >=)'], ['batasB', 'Batas Predikat B (nilai >=)'], ['batasC', 'Batas Predikat C (nilai >=)']];
  $('sec-app').innerHTML = `<h5>Pengaturan Aplikasi</h5><div class="card-x"><div class="row g-3"><div class="col-md-4 text-center"><div id="logoPrev" class="mb-2"></div><label class="btn btn-outline-primary btn-sm">Ganti Logo<input type="file" hidden accept="image/*" onchange="pickLogo(this)"></label><div class="muted small mt-1">Logo dikecilkan otomatis. Tampil di menu, halaman login, dan kop raport (jika Kop Raport di bawah tidak diisi).</div></div><div class="col-md-8">${F.map(f => `<label class="form-label mt-1">${f[1]}</label><input class="form-control" data-p="${f[0]}" value="${esc(p[f[0]])}">`).join('')}<label class="form-label mt-2">Tahun Ajaran Aktif</label>${sel('pTa', OPSI.ta || [], '- pilih -')}<label class="form-label mt-2">Jenis Ujian Aktif</label>${sel('pUj', OPSI.ujian || [], '- pilih -')}<div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="pFoto"> <label class="form-check-label" for="pFoto">Tampilkan foto siswa di raport (bawaan)</label></div><div class="muted small">Filter Tahun Ajaran &amp; Jenis Ujian akan terisi otomatis sesuai pilihan ini.</div><button class="btn btn-primary mt-3" onclick="saveApp()">Simpan Pengaturan</button></div></div>
  <hr class="my-4">
  <div class="row g-3">
    <div class="col-md-6 text-center"><label class="form-label d-block text-start">Kop Raport (gambar, menggantikan nama sekolah bertulis)</label><div id="kopPrev" class="mb-2"></div><label class="btn btn-outline-primary btn-sm">Unggah Kop<input type="file" hidden accept="image/*" onchange="pickKop(this)"></label> <button class="btn btn-outline-secondary btn-sm" onclick="removeImg('kop')">Hapus</button><div class="muted small mt-1">Sebaiknya gambar lebar (mis. 1500x300px) berisi logo yayasan, nama sekolah, dan alamat lengkap. Akan tercetak penuh di bagian atas raport.</div></div>
    <div class="col-md-6 text-center"><label class="form-label d-block text-start">Background Aplikasi (opsional)</label><div id="bgPrev" class="mb-2"></div><label class="btn btn-outline-primary btn-sm">Unggah Background<input type="file" hidden accept="image/*" onchange="pickBg(this)"></label> <button class="btn btn-outline-secondary btn-sm" onclick="removeImg('bg')">Hapus</button><div class="muted small mt-1">Tampil di balik halaman login dan seluruh aplikasi dengan efek kaca (glass). Pilih foto yang tidak terlalu ramai agar teks tetap jelas dibaca.</div></div>
  </div></div>`;
  showLogoPrev(); showImgPrev('kop'); showImgPrev('bg'); $('pTa').value = p.taAktif || ''; $('pUj').value = p.ujianAktif || ''; $('pFoto').checked = p.fotoRaport !== 'N';
  $('sec-app').insertAdjacentHTML('beforeend', '<div id="urutBox"></div>'); loadUrutan();
}
function showLogoPrev() { $('logoPrev').innerHTML = window._logo ? `<img src="${esc(window._logo)}" style="max-width:120px;max-height:120px">` : '<i class="bi bi-image fs-1 muted"></i>'; }
async function pickLogo(i) { const f = i.files[0]; if (!f) return; try { window._logo = await imgToData(f, 200); showLogoPrev(); } catch (e) { toast('Logo tidak dapat dibaca atau terlalu besar.', 'danger'); } }
function showImgPrev(kind) { const el = $(kind + 'Prev'), url = window['_' + kind]; el.innerHTML = url ? `<img src="${esc(url)}" class="img-prev">` : '<i class="bi bi-image fs-1 muted"></i>'; }
async function pickKop(i) {
  const f = i.files[0]; if (!f) return;
  const r = await uploadBigImage('kop', f, 1600); if (!r.success) return;
  window._kop = r.data.url; showImgPrev('kop'); toast('Kop diunggah. Klik Simpan Pengaturan untuk menerapkannya.');
}
async function pickBg(i) {
  const f = i.files[0]; if (!f) return;
  const r = await uploadBigImage('bg', f, 1920); if (!r.success) return;
  window._bg = r.data.url; showImgPrev('bg'); toast('Background diunggah. Klik Simpan Pengaturan untuk menerapkannya.');
}
function removeImg(kind) { window['_' + kind] = ''; showImgPrev(kind); }
async function saveApp() {
  const o = { logoUrl: window._logo, kopUrl: window._kop, bgUrl: window._bg, taAktif: $('pTa').value, ujianAktif: $('pUj').value, fotoRaport: $('pFoto').checked ? 'Y' : 'N' }; document.querySelectorAll('[data-p]').forEach(i => o[i.dataset.p] = i.value);
  const r = await call('saveProfil', TOKEN, o); if (r.success) { toast(r.message); OPSI.aktif = { ta: o.taAktif, ujian: o.ujianAktif, foto: o.fotoRaport === 'Y' }; applyBrand(o); }
}
function loadUrutan() {
  $('urutBox').innerHTML = `<div class="card-x mt-3"><b>Urutan Mata Pelajaran</b><p class="muted mb-2">Atur dengan panah; berlaku pada raport dan leger.</p><ul class="list-group" id="urutList">${(OPSI.mapel || []).map(m => `<li class="list-group-item d-flex justify-content-between align-items-center" data-id="${m.ID}"><span>${esc(m.nama)}</span><span><button class="btn btn-sm btn-outline-secondary" onclick="mv(this,-1)">^</button> <button class="btn btn-sm btn-outline-secondary" onclick="mv(this,1)">v</button></span></li>`).join('')}</ul><button class="btn btn-primary mt-2" onclick="saveUrut()">Simpan Urutan</button></div>`;
}
function mv(b, d) { const li = b.closest('li'), t = d < 0 ? li.previousElementSibling : li.nextElementSibling; if (t) d < 0 ? li.parentNode.insertBefore(li, t) : li.parentNode.insertBefore(t, li); }
async function saveUrut() {
  const r = await call('saveUrutan', TOKEN, [...document.querySelectorAll('#urutList li')].map(l => l.dataset.id));
  if (r.success) { toast(r.message); const o = await call('getOpsi', TOKEN); OPSI = o.data || OPSI; }
}
async function bulkFoto(inp) {
  const fs = [...inp.files], n = formCtx.name; inp.value = ''; if (!fs.length) return;
  let ok = 0, nf = [], items = []; loading(true);
  for (const f of fs) { try { items.push({ key: f.name.replace(/\.[^.]+$/, ''), foto: await imgToData(f, 180) }); } catch (e) { nf.push(f.name); } }
  loading(false);
  for (let i = 0; i < items.length; i += 15) { const r = await call('saveFotoBatch', TOKEN, n, items.slice(i, i + 15)); if (!r.success) return; ok += r.data.cocok; nf = nf.concat(r.data.tidakCocok); }
  await loadMaster(); toast(ok + ' foto terpasang, ' + nf.length + ' tidak cocok.', nf.length ? 'warning' : 'success');
  if (nf.length) $('mBox').insertAdjacentHTML('afterbegin', '<div class="card-x mb-2 text-danger"><b>Nama file tidak cocok dengan ' + (n === 'Guru' ? 'NIP' : 'NIS') + ':</b> ' + nf.map(esc).join(', ') + '</div>');
}
const PRESET = [['Prestasi sangat baik', 'Prestasi belajar semester ini sangat membanggakan. Pertahankan integritas, kerendahan hati, dan terus kembangkan kepemimpinan.'], ['Tingkatkan keaktifan', 'Telah mencapai ketuntasan dengan baik. Dianjurkan lebih percaya diri dan aktif mengemukakan pendapat pada diskusi kelas.'], ['Perhatian kedisiplinan', 'Perlu perhatian khusus terhadap kehadiran di kelas dan penyelesaian tugas tepat waktu. Mari bangun ritme belajar yang lebih konsisten.']];
function applyPreset() { const t = PRESET[$('preset').value][1]; document.querySelectorAll('#waliBox input[data-f="catatan"]').forEach(i => { if (!i.value.trim()) i.value = t; }); }
async function pdfDrive() {
  const r = await call('saveRaportPdf', TOKEN, window._rap.m.kelasId, window._rap.m.ta, window._rap.m.semester, $('prevBody').innerHTML);
  if (r.success) { toast(r.message); $('pdfLink').innerHTML = `<a href="${esc(r.data.url)}" target="_blank">Buka PDF di Drive</a>`; }
}
