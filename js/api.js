// ============================================
// UTIL DASAR & LAPISAN API (fetch ke GAS)
// ============================================
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function loading(on) { $('loading').classList.toggle('d-none', !on); }
function toast(msg, type) { const t = $('toast'); t.className = 'toast text-bg-' + (type || 'success'); $('toastBody').textContent = msg; bootstrap.Toast.getOrCreateInstance(t).show(); }

// Pembungkus panggilan ke backend GAS (menggantikan google.script.run).
// Dipanggil persis seperti sebelumnya: call('namaFungsi', arg1, arg2, ...)
// -> dikirim sebagai POST { action: 'namaFungsi', args: [arg1, arg2, ...] }
// Header WAJIB text/plain agar browser tidak mengirim preflight OPTIONS
// (Apps Script tidak menangani preflight CORS dengan baik).
function call(fn, ...args) {
  loading(true);
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: fn, args: args })
  })
    .then(r => r.json())
    .then(r => { loading(false); if (!r.success) toast(r.message || 'Terjadi kesalahan.', 'danger'); return r; })
    .catch(err => {
      loading(false);
      toast('Tidak dapat terhubung ke server. Periksa URL backend di config.js dan koneksi internet.', 'danger');
      return { success: false, message: err.message };
    });
}

// Info publik untuk halaman login (nama aplikasi, logo) - tidak perlu token,
// dipanggil lewat GET biasa (lebih ringan, tidak menunggu POST).
fetch(GAS_URL + '?action=publicInfo')
  .then(r => r.json())
  .then(r => { if (r.success && typeof applyBrand === 'function') applyBrand(r.data); })
  .catch(() => { /* biarkan tampilan bawaan jika backend belum bisa dihubungi */ });
