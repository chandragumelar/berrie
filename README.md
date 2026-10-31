# Berrie · Prototipe Sites

**Pesanan terbaru D-78 · 31 Oktober 2026:** Aktif/Tersimpan, dua filter AND awal Semua, daftar operasional dan detail bersama tablet40/60 (≥900) / HP detail penuh. [Review D-78](REVIEW-PESANAN-D78.md). Kasir D-76/D-77 dipertahankan. Data memori. Commit dan PR D-78 diotorisasi pemilik pada tindak lanjut; merge oleh pemilik, tanpa deployment/versi layanan baru.

**Copy terbaru D-77:** Channel dan nilainya sebaris; kontrol penyajian tanpa judul/bantuan terlihat. Perilaku D-76 tetap.

**Kasir terbaru D-76 · 31 Oktober 2026:** Mulai bertugas, katalog padat/tambah langsung/Urungkan, Favorit stabil dan Channel/default penyajian di kepala pesanan. [Review D-76](REVIEW-KASIR-D76.md). Favorit/default hanya memori React dan hilang saat reload; tanpa deployment.

**Terbaru D-75 · 31 Oktober 2026:** editor Menu/Stok dengan aksi sticky di atas dan status draft, laporan ringkas/dasar eksplisit/catatan harian, alias di Tipe menu, Toko pertama/default, pengelolaan staf owner online dengan ID tetap/nonaktif/izin bersama. [Review/status D-75](REVIEW-ADMIN-LAPORAN-D75.md). Masih memori lokal, tanpa akun atau PIN nyata dan tanpa deployment. Pemeriksaan visual baru mengikuti status review; bukti D-74 di bawah adalah historis.

Prototipe interaktif POS makanan/minuman, bahasa Indonesia dan IDR. **D-74 (13 Oktober 2026): Kas dua kolom tablet/finish bertumpuk; laporan bisnis harian dengan penelusuran angka dan refund kontekstual. Navigasi tablet atas/HP bawah tetap.** D-73 tetap: harga/qty/stok agnostik, varian opsional saat Tambah menu, Kas ringkas dan fondasi visual berdasarkan dokumentasi resmi Atlassian. Alur/cetak/edit draft D-72 tetap. Struktur dua kolom dan navigasi horizontal dipertahankan; tidak ada pemilih desain atau backup UI lama. Design system aktif pada [root](../DESIGN-SYSTEM.md), aturan produk pada [specs](../specs/README.md), hasil review sebelumnya pada [D-74](REVIEW-KAS-LAPORAN-D74.md), fondasi pada [D-73](REVIEW-MENU-KAS-D73.md), alur sebelumnya pada [D-71/D-72](REVIEW-KASIR-D71.md).

Review sebelumnya digabung pada [riwayat D-43–70](REVIEW-HISTORY.md); untuk lanjut kerja gunakan [patokan pada tasks](../tasks.md#patokan-untuk-melanjutkan).

Status audit visual lintas prototipe terbaru: [audit ADS 31 Oktober 2026](REVIEW-ADS-2026-10-31.md). Perbaikan komponen bersama dan checks kode selesai. Audit visual pelaksana pada cakupan representatif selesai melalui Safari tablet1024×768/HP360, teks200%, gelap dan page zoom200%. Zoom dipulihkan100%; preview Kasir tablet kembali terlihat. Rincian cakupan/batas ada pada bagian penutupan review, bukan kelulusan AC visual penuh.

## Lokal

Jalankan dari `/Users/icang/berrie/berrie-site` dengan npm/lockfile proyek. Dependensi yang sudah terpasang tidak perlu dipasang ulang.

| Perintah | Fungsi |
| --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 4173` | Preview lokal loopback |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint |
| `npm test` | 146 tes domain, menu/qty agnostik, cetak, tanggal riwayat dan laporan |
| `npm run build` | Build lokal, bukan deployment |
| `npm start` | Preview Worker hasil build di loopback |

Buka `http://127.0.0.1:4173/`: langsung UI terpilih dengan frame tablet **1024×768**, termasuk dialog. `?design=alternative` lama tidak diperlukan dan tidak memilih cabang lain. `?workspace=responsive` menampilkan UI langsung untuk ukuran lain. Pembungkus tablet hanya localhost; hosted responsif. Tidak ada script test:browser; pemeriksaan browser langsung dicatat di review.

## Batas simulasi

Data contoh hanya memori React, hilang saat reload. Domain menerapkan perhitungan/validasi simulasi, bukan IndexedDB, API transaksional, keamanan, sync/backup atau printer produksi. Status tercatat/online/approval/cetak adalah contoh dan tidak membuktikan penerimaan server, perpindahan uang atau kertas fisik. Implementasi produksi mengikuti stack/gerbang pada spesifikasi; starter Vinext ini tetap prototipe.

D-76: kartu sederhana langsung menambah satu draft dengan Urungkan satu unit terakhir; kartu berpilihan membuka editor/Tambahkan ke pesanan. Favorit diatur owner pada Menu & Stok → Favorit dengan Naik/Turun. Default penyajian di kepala pesanan hanya untuk item berikutnya, awal Bungkus; Makan di tempat di kiri/Bungkus di kanan. Penyajian tiap item dapat diedit dan tetap sumber detail/cetakan. Channel berpindah ke kepala pesanan; kas tertutup hanya panel Mulai bertugas. Tanpa copy bantuan/harga per unit. Detail draft menyediakan Lanjutkan pesanan ke Kasir dengan nomor/identitas tetap. Qty inline dan pembayaran satu panel. Bayar nanti/Bayar/Simpan dulu tetap berbeda; stok hanya debit saat konfirmasi pembuatan. Simpan dulu/Bayar nanti/pembayaran berhasil mengosongkan Pesanan baru dan memberi notifikasi Lihat pesanan; gagal/unknown mempertahankan input. Bayar nanti otomatis mencoba dapur; pembayaran dapur batch baru lalu pelanggan, batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit. Struk/cetak ulang tersedia di detail, selesai setelah attempt tanpa konfirmasi kertas atau berbagi; ulang SALINAN. Riwayat menyediakan tanggal awal–akhir inklusif zona toko. Menu/Stok/Rekap tabel gulir dan pustaka diskon/jadwal tetap D-68/D-69.

## Sumber

| Lokasi | Fungsi |
| --- | --- |
| `app/page.tsx`, `cashier-catalog.tsx`, `orders-workspace.tsx`, `order-detail.tsx` | Layar/alur dan katalog Kasir aktif |
| `app/globals.css`, `cashier-ui.css`, `layout.tsx` | Struktur bersama, token/style aktif dan metadata |
| `app/*workspace.tsx`, `*editor.tsx`, `new-menu-dialog.tsx`, `variant-fields.tsx`, `berrie-controls.tsx` | Pengelolaan toko/form/komponen bersama |
| `app/component-review.tsx` | Fixture review di luar alur kasir |
| `lib/berrie/` (termasuk `cashier.ts`/tes D-76) | Domain simulasi dan tes uang/stok/promo/idempotensi |
| `components/ui/`, `lib/utils.ts` | Dependensi UI yang digunakan |
| `public/fonts/InterVariable.woff2`, `OFL.txt` | Font variable lokal dan OFL, tanpa CDN runtime |
| `public/favicon.svg` | Favicon |
| `vendor/` | Stylesheet vendor dan lisensi berpasangan |

`.openai/hosting.json` mempertahankan `project_id=appgprj_6ac54219b9248191bf551b9871d78958`. Root `/Users/icang/berrie` bukan Git, `berrie-site` mempunyai Git sendiri. Histori bukti/revisi di register/tasks/review bukan cabang UI yang dapat diaktifkan. Tidak membuat salinan UI lama atau mengubah histori Git.

`build/`, `scripts/`, `vite.config.ts`, konfigurasi/framework/manifes/lockfile dan `.openai/hosting.json` mengatur runtime Sites. `lib/connector*`, `app/chatgpt-auth.ts`, `components/connector-error.tsx` dukungan Sites opsional, bukan fitur POS. `db/`, `drizzle/`, `drizzle.config.ts`, `cloudflare-env.d.ts` mendukung tooling starter, bukan database bisnis prototipe. `node_modules`, `dist`, `.next`, `.wrangler`, `.sites-runtime` dan cache adalah hasil lokal diabaikan.

## Penyimpanan/publikasi

Instruksi pemilik: lokal dan **tanpa deployment**. Sumber lokal D-70–75 belum disimpan sebagai versi layanan baru; latest tersimpan sebelumnya versi12. Simpan versi, commit sumber dan deployment adalah hasil berbeda, jangan mengklaim salah satunya dari build lokal. Akses/identitas Site tetap. Status aktual/checks ada pada [review D-71](REVIEW-KASIR-D71.md) dan [tasks root](../tasks.md).

## Review workspace Pesanan lokal

Pada Panel review, **Muat contoh workspace Pesanan** memuat22 order contoh (20 Aktif/2 Tersimpan): paid-unserved, unpaid-served, parsial, batch/draft tambahan, refund due, nama panjang, daftar panjang dan timestamp hilang. Fixture dibentuk dari operasi domain pada data uji; bukan data toko/penyimpanan produksi. Tidak dimuat otomatis oleh navigasi produk. Review gangguan simpan/unknown dan teks200% memakai kontrol review existing. Muat ulang menghapus memori. Default root loopback membungkus tablet1024×768; `?workspace=responsive` mengikuti viewport browser untuk HP360.
