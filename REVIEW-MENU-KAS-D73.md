# Review Menu, Kas dan fondasi Atlassian — D-73

13 Oktober 2026. Melanjutkan perubahan lokal D-71/D-72 pada Site `appgprj_6ac54219b9248191bf551b9871d78958`; seluruh pekerjaan sebelumnya dipertahankan. Tanpa deployment, commit/push atau simpan versi layanan. Latest layanan terakhir dikonfirmasi tetap12/D-69; tidak diperiksa ulang.

## Arahan pemilik dan hasil

Owner/kasir menentukan arti angka harga/qty/stok. Tidak ada mode ml/gelas/berat, field volume, konversi satuan atau stok resep. Harga100 × qty200 =20000 sebelum komponen lain; batas integer1–999 tetap. Nama menu dapat menjelaskan satuan tanpa mengubah rumus. Tambahan varian berlaku per qty yang sama. Saldo grup wajib konsisten dengan arti qty menurut owner; seluruh SKU tetap berbagi satu saldo.

Tambah menu sekarang mengatur nama, kategori/tipe, harga, Varian opsional dan stok dalam satu form. Tanpa varian satu harga; tambahan0 mempertahankan harga; single berharga membentuk kombinasi SKU dan multi berharga menjumlah tambahan sesuai D-67. Preview Harga akhir memakai fungsi domain existing. Varian tidak perlu dibuat setelah menu ditambahkan. Isi bergulir; Batal/Tambahkan ke tabel di luar isi bergulir. Error mempertahankan input dan mendapat fokus. Tambahkan ke tabel masih draft; Simpan perubahan baru commit. Editor varian existing memakai field bersama.

Kas memakai kolom maksimum640 px rata kiri untuk breakdown, aksi, selesai bertugas dan riwayat. Label–nominal berada dalam satu grid; nominal rata kanan/tabular, satu saldo tercatat setelah divider. Hitung buta, ledger, izin dan blocker tidak diubah.

## Audit terhadap acuan resmi

Sumber utama: [Atlassian Design System](https://atlassian.design/), [radius](https://atlassian.design/foundations/radius/), [tipografi](https://atlassian.design/foundations/typography/product-typefaces-and-scale), [ikon](https://atlassian.design/foundations/iconography/), [warna](https://atlassian.design/foundations/color/), [ruang](https://atlassian.design/foundations/spacing/), [elevation](https://atlassian.design/foundations/elevation/). UI/UX Pro Max dipakai untuk panduan form/label/controlled input dan review, bukan pembuat keputusan bisnis atau bukti UT.

| Area | Temuan sebelum D-73 | Hasil |
| --- | --- | --- |
| Font/hierarki | Inter belum memakai fitur karakter acuan; page26/dialog22/panel17 tidak mengikuti hierarki baru | Inter lokal dengan cv07–10/ss07–08; page24/dialog20/bagian16/body14, line-height/weight konsisten |
| Shape | Kontrol, panel, kartu dan modal sama-sama6 | Detail2/label4/kontrol6/kartu8/modal-tabel12/profil lingkaran |
| Ikon | Ukuran13–20 tidak konsisten | Standar16/chevron12, stroke1.5/ujung datar; target sentuh terpisah≥44 |
| Tab/navigasi | Selected fill dan konstruksi campuran | Permukaan ringan/garis bawah2/teks terpilih, state dan fokus konsisten |
| Palet/lapisan | Biru/netral dan warna semantik D-71 sudah searah | Dipertahankan sebagai token Berrie, overlay memakai satu shadow; terang/gelap tetap solid |
| Ruang/form/Kas | Varian terpisah sesudah tambah menu; Kas full-width memisahkan label–nilai | Form bertahap dalam satu modal; kelompok field/ruang4/8/12/16/24; Kas maksimum640 |

Berrie tetap implementasi sendiri dengan React/Radix, Inter OFL dan Lucide. Atlassian Sans adalah turunan Inter; Inter berfitur bukan aset font resmi itu. Glyph Lucide berbeda dari ikon ADS. Skala body14, target sentuh44/48/52, tabel64/input56, katalog/keranjang dan alur POS merupakan adaptasi Berrie. Tidak mengklaim identik Jira atau memakai seluruh komponen/tokens ADS. [Lisensi ADS](https://atlassian.design/license) ditinjau, tanpa pemasangan aset/paket resmi baru. Token final berada pada [design system](../DESIGN-SYSTEM.md).

## Pemeriksaan aktual

- `npm run typecheck`, `npm run lint`, `npm test` **113/113**, `npm run build` lulus. Build masih memberi catatan klasifikasi route Vinext, bukan error build. Tidak ada script test:browser.
- Dua regresi domain baru: menu baru ukuran18000/23000 dengan pilihan Es gratis menyimpan2 SKU/satu saldo1000/satu ledger awal grup; snapshot pilihan gratis tetap. Harga100/qty200 memberi20000, draft tidak debit, konfirmasi stok1000→800, replay operasi identik, settlement tidak debit ulang dan kas20000. Tes existing negatif/pecahan/limit/legacy/promo/idempotensi tetap lulus.
- Browser tablet1024×768: tambah Butterscotch dengan Kecil18000/Besar23000, preview dan kedua row sesuai, simpan berhasil; stok awal1000. Submit tanpa stok memberi error, input tetap; perbaikan kemudian berhasil. Form tanpa varian Kopi / ml harga100 berhasil disimpan, modal Jumlah200 dan keranjang menunjukkan Rp20.000. Pembayaran kasus ini diverifikasi pada tes domain, bukan diklaim dari browser.
- Browser360×800: form satu kolom, isi dapat digulir, footer Batal/Tambahkan tetap terlihat. Varian Es Normal/Sedikit tambahan0 menunjukkan harga5000 dan menyimpan satu row tambahan (24→25), bukan dua harga. Ini tab QA terpisah dan ditutup setelah diperiksa.
- Kas tablet terang/gelap: lebar640, lebar rincian590, label/nominal berpasangan dan saldo satu kali. Teks200% pada tablet serta form bervarian tetap bergulir/aksi terjangkau; navigasi tinggi otomatis/logo tetap sebaris. Ini kontrol pembesaran teks prototipe, bukan pengganti uji zoom/perangkat nyata.
- Komponen review: font14, kontrol radius6 tinggi48, aksi plain/icon44, checkbox radius2; keluarga form/status/tabel memakai token bersama. Ikon navigasi16. Font terender Inter; warna Bayar aktual rgb(12,102,228).
- Regresi kepadatan tablet:8 kartu pendek penuh dan3 baris pesanan biasa masing-masing72 px, total Rp51.000. Browser tanpa log error/warn pada pemeriksaan akhir. Pemeriksaan tautan/diff dicatat pada tasks.

Pemetaan: AC-151/152, AC-127/133/136/141/142/143/147 dan UT-22/27/32/33/37/38. Bukti terpilih tidak meluluskan seluruh AC. Data masih memori React; belum IndexedDB/API/transaksi produksi/offline/server/printer/restore. UT peserta dan gerbang pilot belum dijalankan. Screenshot review tidak menjadi aset produk atau patokan estetika baru.
