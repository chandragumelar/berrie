# Berrie — Prototipe Sites M-03

8 Oktober 2026. Proyek Sites **Berrie · Prototipe Kasir**, `appgprj_6ac54219b9248191bf551b9871d78958`. Versi sebelumnya 1–9 tersimpan tanpa deployment; revisi aktif D-67. Identitas simpan berikutnya pada tasks setelah konfirmasi layanan. Revisi D-55/D-56 menambahkan keranjang/detail empat item pendek, identitas wajib, Pesanan default Lunas, form tipe/ukuran/topping dan peringatan stok di aplikasi. Revisi D-53/D-54: panel solid #FCFCFD dan cyan aktif, Kasir/Pesanan/Riwayat ringkas, dapur saja sebelum bayar, riwayat hanya selesai dan refund final setelah uang dikembalikan. [Review terkini](REVIEW-MENU-KAS-D61-D65.md); identitas hasil simpan layanan pada [tasks](../tasks.md). Font Apple system/Inter lokal dan token [design system](../DESIGN-SYSTEM.md) tetap. Visual belum disetujui.

## Cakupan revisi

Satu Buka kas sebagai langkah awal, channel Toko, tabel promo nyata per SKU, keranjang kompak, dua penyajian per item, pembayaran tunai/QRIS dan modal Struk yang menampilkan dua tujuan. Font sistem Apple/Inter dibundel lokal, tombol kapsul, kontrol konsisten dan Lucide mengikuti token design system. Promo SKU tidak digabung diskon order; topping tetap utuh dan snapshot harga lama tidak diganti otomatis. Font 14/18/20/22 sesuai peran, SKU bernama unik, sel numerik, alias tipe, workflow toggle kas dan navigasi kiri yang dapat diciutkan. Lihat [hasil terbaru](REVIEW-MENU-KAS-D61-D65.md); [review versi 1](REVIEW-KASIR.md) dipertahankan.

`app/page.tsx` memuat UI, `app/berrie-controls.tsx` kontrol bersama, `app/component-review.tsx` fixture review terpisah, `lib/berrie/domain.ts` logika simulasi murni dan `app/globals.css` styling. Data bisnis **di memori**; reload menghapus perubahan demo. Tidak membuktikan IndexedDB/offline, autentikasi/izin server, backup, pembayaran nyata, printer fisik atau kesiapan pilot. Panel demo menguji gagal simpan/hasil belum diketahui tanpa transaksi nyata. Data toko contoh mengaktifkan Tunai + QRIS; aktivasi toko baru hanya Tunai.

Acuan lokal: [indeks spesifikasi](../specs/README.md), [UX Principles](../specs/12-ux-principles.md), [alur](../specs/02-user-flows.md), [aturan layar](../specs/09-screens-and-hardware.md), [acceptance criteria](../specs/10-acceptance-criteria.md) dan [design system](../DESIGN-SYSTEM.md). Scope revisi ini Kasir/Pesanan/Menu & Stok, dengan regresi Riwayat/refund. Starter tetap Vinext untuk prototipe; stack produksi D-02–05 tetap. Folder mockup lama dipensiunkan pada 8 Oktober 2026; prototipe aktif hanya Sites, histori M-01/M-02 pada tasks.

## Perintah lokal

Dari direktori proyek dengan dependensi terpasang dan Node ≥22.13:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 4173` | Preview portable di loopback |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint |
| `npm test` | 95 tes domain termasuk promo, pembayaran, stok, idempotensi dan cetak ulang |
| `npm run build` | Build lokal, bukan deployment |
| `npm start` | Preview Worker hasil build di loopback |

Typecheck, lint dan 95 tes domain lulus; bukti terbaru pada REVIEW-MENU-KAS-D68.md. Build/packaging diperiksa oleh workflow Sites sebelum versi disimpan; kegagalan menghentikan penyimpanan. Tidak ada script `test:browser`; pemeriksaan browser dilakukan langsung pada preview dan dicatat di REVIEW-MENU-KAS-D68.md.

## Penyimpanan dan publikasi

`.openai/hosting.json` menyimpan identitas proyek. Simpan sumber dan versi melalui workflow Sites dengan publikasi otomatis tidak diaktifkan. Simpan versi bukan deployment. Akses proyek tetap seperti sebelumnya; jangan menerbitkan tanpa arahan pemilik.

## Struktur dan dukungan tooling

| Lokasi | Fungsi |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | UI, metadata dan style prototipe |
| `lib/berrie/domain.ts`, `catalog.ts`, `aliases.ts`, `*.test.ts` | Domain simulasi dan 95 tes |
| `components/ui/`, `hooks/use-mobile.ts`, `lib/utils.ts` | Komponen UI terpakai beserta dependensinya |
| `public/fonts/InterVariable.woff2`, `OFL.txt` | Inter variable lokal dan lisensi OFL; tanpa CDN font saat membuka Kasir |
| `public/favicon.svg` | Favicon Berrie yang direferensikan metadata |
| `build/`, `scripts/`, `vite.config.ts`, `.openai/hosting.json` | Runtime preview/build Sites dan identitas proyek; dipertahankan |
| `lib/connector*`, `app/chatgpt-auth.ts`, `components/connector-error.tsx` | Dukungan opsional platform Sites; bukan fitur POS aktif |
| `db/`, `drizzle/`, `drizzle.config.ts`, `cloudflare-env.d.ts` | Tooling D1/Drizzle starter, termasuk perintah db:generate; bukan database bisnis prototipe |
| `vendor/` | Stylesheet yang diimport globals.css beserta lisensinya |

Pembersihan 7 Oktober 2026 menghapus komponen UI starter tanpa jalur import dari aplikasi, ikon placeholder dan contoh D1 terpisah. Konfigurasi, package manager/lockfile, runtime dan perilaku UI tetap. Manifest masih menyediakan dukungan tooling starter; tugas ini tidak mengubah dependensi. Petunjuk workflow platform berada pada skill Sites, bukan salinan manual starter di repo.

Root `berrie/` belum memiliki Git; direktori `berrie-site/` mempunyai Git sendiri. [Review versi 1](REVIEW-KASIR.md) dan [review versi 2](REVIEW-KASIR-D47.md) merekam hasil serta identitas masing-masing; pembersihan lokal tidak otomatis memperbarui versi Sites atau melakukan deployment.

Root localhost default menampilkan frame tablet landscape **1024×768** termasuk dialog, meski jendela desktop lebih lebar. Buka `http://127.0.0.1:4173/?workspace=responsive` untuk review UI langsung pada ukuran lain. Pembungkus hanya lokal; hosted tetap responsif. Reload menghapus data contoh.

`app/menu-editor.tsx` adalah form tipe/ukuran/topping; `lib/berrie/catalog-editor.ts` menyimpan seluruh SKU form atomik dalam domain simulasi, `menu-config.ts` menangani tipe/kode otomatis dan daftar stok rendah. Notifikasi di aplikasi, tanpa push/WA/email. Build final dan identitas versi layanan dicatat pada tasks.

## Menu dan stok D-57–60

`app/menu-workspace.tsx` menyediakan tabel Menu lima baris per halaman, input 56 px dan baris ≥64 px, dropdown, tempel TSV, duplikat serta penandaan sel salah. Topping/Rincian tombol teks tanpa pill. Tab Stok menggunakan satu saldo untuk seluruh rasa/ukuran menu. `lib/berrie/shared-stock.ts`, `workshop.ts` dan `recipes.ts` memisahkan saldo, perubahan tabel/rekap dan snapshot racikan dari React. Racikan Es/Gula gratis dipilih kasir dan dicetak pada preview struk/dapur. Rekap online mencatat pemakaian per menu dan periode, tanpa omzet/kas; pengingat diaktifkan owner. Semua data tetap simulasi di memori.

Localhost root menyediakan frame tablet 1024×768; `?workspace=tablet` menampilkan workspace langsung untuk pemeriksaan responsif. Model produksi StockGroup/ledger tunggal dan migrasi hitungan fisik belum dibangun.

## UI terkini — D-61–65

`app/menu-workspace.tsx`, `app/variable-editor.tsx` dan `app/variable-picker.tsx` memuat tabel5 baris, + Menu/variabel single-multi/harga kombinasi dan stock modes. `app/cash-workspace.tsx` memisahkan uang selama berjualan dan selesai bertugas. `lib/berrie/menu-variables.ts` + `workshop.ts` memvalidasi kombinasi/snapshot dan koreksi rekap delta/revisi. Tidak ada impor pada UI tahap ini; parser/tes CSV lama tetap sebagai kompatibilitas, bukan fitur aktif. Paste multiline dengan urutan kolom tetap lama diganti pengisian sel/dropdown variabel fleksibel; bulk harga/kategori tetap. Root localhost selalu memakai iframe1024×768. Data contoh hilang saat reload; source/version yang disimpan berbeda dari data demo. Skill UI/UX Pro Max dibaca dari sumber sebagai panduan tambahan, tidak dipasang lokal. Tidak ada deployment.

## Revisi Menu D-66

+ Menu membuka modal dengan Batal; menu baru tampil paling atas termasuk setelah Simpan perubahan. Batal tambah menu tersedia sebelum commit. Kolom Status/Menu/Varian/Harga/Kategori, lalu pilihan/harga channel/Tipe. Varian → nama/pilihan → Lanjut ke harga → Terapkan varian & harga; daftar harga di dialog tanpa + Kombinasi. Pilihan tunggal otomatis, topping multi melalui Harga untuk pilihan lain, harga baru wajib diisi. Diskon sub sendiri di sidebar/workspace; Rincian dihapus, opname dan perubahan stok hanya tab Stok. Token/five rows/tablet tetap. Domain tambahan `variant-prices.ts` menjaga harga/ID/saldo dan batas daftar, tes total77. [Review D-66](REVIEW-MENU-D66.md), identitas simpan pada tasks. Tetap data contoh di memori; tanpa deployment.

## Revisi sebelumnya — D-67 (9 Oktober 2026)

D-67 mendahului checkbox/bulk/preset/harga kombinasi manual/stok dua kegiatan dan sub Diskon pada catatan historis di atas. Menu dua status sel berwarna, Hapus menu berkonfirmasi/histori tetap dan Batal perubahan. Varian satu modal harga dasar + tambahan per pilihan≥0/default pertama berbintang. Stok satu row/menu dengan baseline editable lewat modal alasan/log, minimal editable dan sisa read-only. Diskon tujuan utama; tiga copy rekap dihapus. Domain `option-prices.ts` mempertahankan harga legacy bila aditif dan menahan konflik. [Review D-67](REVIEW-MENU-D67.md). Data contoh memori, localhost tetap frame1024×768; tidak ada deployment.

## Revisi aktif — D-68 (9 Oktober 2026)

Hapus paling kiri/log tanggal-jam-pelaku; Batal/Simpan simetris hanya saat berubah; kategori wajib/tambah inline/CRUD kategori dan tipe; field stok berbingkai tanpa Ubah dan harga rata kiri. Diskon pustaka persen/potongan/Beli X gratis Y, penetapan di samping Varian/per channel, `-` kosong. Beli2 gratis3 berarti qty5 bayar menu2, topping penuh, stok5; snapshot/alokasi refund tetap. Kas mencatat pembuka/waktu dan menjelaskan sumber saldo agar tidak terhitung dua kali.

`app/taxonomy-workspace.tsx`, `discount-workspace.tsx` memuat UI; `lib/berrie/taxonomy.ts`, `discounts.ts` memisahkan validasi/penetapan/alokasi dari React. 95 tes domain; pemeriksaan browser/build/identitas simpan beserta batas pada [review D-68](REVIEW-MENU-KAS-D68.md) dan tasks root. Localhost tetap tablet1024×768, data simulasi memori; tanpa deployment.
