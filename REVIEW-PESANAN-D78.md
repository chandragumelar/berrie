# Review workspace Pesanan — D-78 · 31 Oktober 2026

Revisi eksplisit pemilik diterapkan pada prototipe lokal, menggantikan default Lunas/filter tabel dan halaman detail tablet D-55. Kasir D-76/D-77 dan perubahan sebelumnya dipertahankan. Checkout awal bersih pada `2656316` (`feat/cashier-d77`); pemilik menyatakan PR terdahulu sudah merged. Tidak melakukan checkout/reset/commit/push/PR/publish/deployment atau penyimpanan versi layanan baru. Root spesifikasi tetap di luar Git Sites.

## Implementasi

- `lib/berrie/orders-workspace.ts`: proyeksi murni partisi Aktif/Tersimpan, filter AND/search, urutan konfirmasi batch/timestamp hilang/ID, clock waktu tunggu, progres unit nonbatal, ringkasan grouped rows dan validasi selected terhadap hasil. Kelompok memakai `active` existing; `completed`/blocker tidak diubah.
- `domain.ts`: `savedAt` pada commit Simpan dulu; receipt replay mempertahankan timestamp. `unpaidBalance` memakai total domain sebelum settlement dan0 sesudah settlement. Kewajiban refund/saldo platform terpisah. Proyeksi settled memakai snapshot total, termasuk pesanan berdiskon yang dibatalkan; tidak menghitung ulang snapshot terhadap subtotal kosong.
- `app/orders-workspace.tsx`: tab/count sebelum filter, search dan dua filter hanya dalam daftar; entri utuh tombol, selected border/teks ✓ Dipilih/aria-pressed; empty kelompok vs hasil/reset. Tablet≥900 grid2fr/3fr/scroll independen, awal tanpa pilihan; HP daftar/detail bergantian dengan DOM daftar dipertahankan. Kembali menjaga scroll dan fokus pemicu, lalu mengosongkan selected.
- `app/order-detail.tsx`: komponen sama untuk Pesanan/Riwayat. Identitas/channel/dua status; tagihan/Bayar atau Lanjutkan pesanan; item per batch/penyajian campuran/qty awal0/disabled/Pilih semua eksplisit; tambahan/catatan/Aksi lainnya. Refund due langsung dengan Selesaikan refund. Aksi tetap memakai `run`/`sensitive` existing, tanpa perubahan izin/ledger/stock/settlement/refund/receipt/cetak.
- Pilihan qty harus ditandai/dikosongkan sebelum pindah, termasuk guard reload. Gagal/unknown mempertahankan pilihan/input. Commit memperbarui kedua area sekaligus; selected keluar hasil/completed dikosongkan tanpa auto-select tetangga dan pemberitahuan hasil tampil. Lihat pesanan eksplisit menyesuaikan konteks kelompok; completed kembali melalui Riwayat.
- `useMinuteClock` menerima resolusi opsional; workspace memakai pembaruan1detik/focus/visibility dan helper waktu memakai `now` eksplisit untuk tes. Tidak ada ambang terlambat atau fallback created/payment.
- Panel review mempunyai Muat contoh workspace Pesanan:22 order awal (20 Aktif/2 Tersimpan), termasuk platform/ID eksternal, lunas requested, unpaid served, parsial, batch/draft tambahan, refund due, nama panjang, antrean panjang dan timestamp hilang. Fixture hanya memori uji, tidak dimuat navigasi produk otomatis.

## Pemeriksaan kode

`npm run typecheck`, `npm run lint` tanpa warning, **146/146 tes** dan `npm run build` lulus. Build masih mengeluarkan catatan klasifikasi route Vinext yang sudah ada; build lokal bukan deployment. `git diff --check` lulus. Tidak ada script/test:browser yang dijalankan.

Sembilan tes baru mencakup partisi/tanpa duplikasi, filter pengerjaan-pembayaran AND/search/switch, urutan/clock/batch tambahan/missing time/tie ID, savedAt descending, progres tanpa draft/batal/grouped rows, sisa domain/snapshot paid-cancelled berdiskon, bayar vs serve independen/no debit ulang/replay, keluar selected dari filter/completed, serta resume identitas/save timestamp/replay/gagal mempertahankan draft.137 tes sebelumnya tetap lulus. Tes memakai waktu eksplisit untuk proyeksi antrean, tanpa menunggu jam nyata.

## Pemeriksaan langsung Safari

Browser host ekstensi tidak tersedia; Safari native dengan Responsive Design Mode memberi observasi langsung pada viewport1024×768 dan360×768. Capture hanya untuk inspeksi sesi, tidak disimpan sebagai screenshot/aset repo.

| Skenario | Hasil yang diamati |
| --- | --- |
| Tablet awal populated | Badge22, Aktif20/Tersimpan2, Semua/Semua, placeholder kanan, daftar kiri/detail kanan; tanpa judul Pesanan/Pesanan aktif berulang. |
| Paid belum disajikan, parsial, nama panjang, batch/draft tambahan | Daftar menampilkan0/5,2/5,2/7; pembayaran/sisa terpisah; ringkasan +N menghitung baris. Detail nama panjang membungkus, Batch1/Batch2 dan draft berbeda, Bungkus/Makan di tempat terlihat. |
| Filter Sudah disajikan | Menampilkan Budi5/5 Belum bayar Rp25.000; detail mempunyai Bayar tanpa kontrol penyajian. |
| Pembayaran gagal | Simpan gagal menampilkan error, Rp25.000 tetap pada input dan tidak menutup detail/pembayaran. |
| Pembayaran unknown | Input Rp25.000 bertahan, Simpan/Kembali disabled, Periksa hasil operasi yang sama. Sesudah diperiksa: pembayaran tercatat, badge21/Aktif19, hasil filter kosong + Reset, panel kanan placeholder tanpa memilih pesanan lain. |
| HP daftar panjang/detail/kembali | Scroll ke pelanggan8, buka detail penuh dengan Kembali ke pesanan; kembali pada posisi pelanggan8 yang sama dan fokus pemicu. Kontrol vertikal dan navigasi bawah, tanpa halaman bergulir horizontal yang teramati. |
| HP penyajian | Awal qty0/Tandai disabled; Pilih semua menghasilkan3+2; kembali ditahan guard. Tandai berhasil →5/5, pembayaran tetap Belum bayar Rp25.000, Bayar tetap tersedia. |
| Draft tersimpan | Tersimpan2 tanpa filter kerja/bayar, total draft/waktu simpan tanpa progres dapur; Lanjutkan pesanan membuka Kasir berisi5unit/identitas Pelanggan antrean6. Simpan kembali mempertahankan jumlah pesanan; identitas/ID/nomor tetap juga dibuktikan tes domain. |
| Refund tertunda | Detail Dewi menampilkan Sisa tagihan Rp0 dan kewajiban Rp25.000 terpisah dengan Selesaikan refund langsung, termasuk saat seluruh unit batal. |
| Teks200% | HP360/detail dan tablet1024/nama panjang/status/daftar diperiksa. Detail tablet digulir hingga Kosongkan pilihan/Tandai/Aksi tambahan/Aksi lainnya; aksi terakhir terjangkau, tidak meluber horizontal pada observasi. Ini pembesaran teks panel review, bukan bukti page zoom200% sesi ini. |
| Keyboard/fokus | Setelah fokus native pada area detail, Tab menempatkan fokus berbingkai jelas pada Aksi lainnya; Return membuka disclosure dengan Batalkan/Koreksi/Struk. Pemilihan entri memindah fokus ke heading detail; Kembali HP memulihkan fokus pemicu tanpa mereset scroll. |

Pemeriksaan representatif, bukan seluruh permutasi browser/tema/izin atau audit screen reader. Gagal/unknown diobservasi langsung pada pembayaran; jalur penyajian sukses/guard diobservasi langsung dan kegagalan/replay domain diuji otomatis melalui operasi bersama. Koreksi/refund/cetak lanjutan tetap mempunyai tes/batas existing, tanpa klaim semua alur berizin diuji ulang manual.

## Dokumen dan batas

Spesifikasi02/04/05/07/08/09/10/12, indeks, registerD-78, design system, AGENTS, README dan tasks diselaraskan. AC-117/119 diperbarui tanpa menghapus ID; AC-166–172/UT-47–49 ditambahkan. Dokumen historis review/register lama dipertahankan sebagai histori. Tautan lokal dokumen diperiksa.

Prototipe tetap data memori React yang hilang saat reload; tidak ada IndexedDB/API/backup/printer produksi baru. Tidak meluluskan UT peserta, printer fisik, keamanan, performa perangkat, restore drill atau gerbang pilot/rilis. Versi layanan terakhir yang tercatat tetap12/D-69; tidak ada pembacaan/simpan layanan baru.

Pemeriksaan penutup:18 dokumen/323 tautan lokal tanpa target hilang; ID tabel D/AC/UT tidak duplikat. Checks final tetap typecheck/lint/146tes/build/diff-check lulus. Preview Safari dipulihkan ke1024×768/teks100%/gangguan Normal,22 order contoh, kelompok Aktif/filter Semua-Semua, detail Sari sebagian disajikan; panel review tertutup dan daftar digulir ke kontrol atas. Tidak ada screenshot yang disimpan.

## Tindak lanjut PR — 31 Oktober 2026

Pemilik mengotorisasi commit/push/PR D-78 dan akan melakukan merge sendiri. PR#1 terverifikasi MERGED lewat GitHub; `origin/main` di `0dd3743` memiliki tree yang sama dengan baseline `2656316`. Branch `feat/orders-d78` dibuat dari main tersebut dengan seluruh revisi lokal dipertahankan. Kode/checks146tes di atas tidak berubah saat penyiapan PR; diff-check diperiksa lagi. Spesifikasi, AGENTS, design system dan tasks root berada di luar repo Git Sites sehingga tidak ikut commit/PR ini; salinan lokalnya tetap ada. Tidak ada deployment atau penyimpanan versi layanan.
