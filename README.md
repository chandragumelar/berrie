# Berrie — Prototipe Sites M-03

8 Oktober 2026. Proyek Sites **Berrie · Prototipe Kasir**, `appgprj_6ac54219b9248191bf551b9871d78958`. Versi 1–4 tersimpan tanpa deployment. Revisi D-53/D-54: panel solid #FCFCFD dan cyan aktif, Kasir/Pesanan/Riwayat ringkas, dapur saja sebelum bayar, riwayat hanya selesai dan refund final setelah uang dikembalikan. [Review terkini](REVIEW-KASIR-D53-D54.md); identitas hasil simpan layanan pada [tasks](../tasks.md). Font Apple system/Inter lokal dan token [design system](../DESIGN-SYSTEM.md) tetap. Visual belum disetujui.

## Cakupan revisi

Satu Buka kas sebagai langkah awal, channel Toko, tabel promo nyata per SKU, keranjang kompak, dua penyajian per item, pembayaran tunai/QRIS dan modal Struk yang menampilkan dua tujuan. Font sistem Apple/Inter dibundel lokal, tombol kapsul, kontrol konsisten dan Lucide mengikuti token design system. Promo SKU tidak digabung diskon order; topping tetap utuh dan snapshot harga lama tidak diganti otomatis. Font 14/18/20/22 sesuai peran, SKU bernama unik, sel numerik, alias tipe, workflow toggle kas dan navigasi kiri yang dapat diciutkan. Lihat [hasil terbaru](REVIEW-KASIR-D53-D54.md); [review versi 1](REVIEW-KASIR.md) dipertahankan.

`app/page.tsx` memuat UI, `app/berrie-controls.tsx` kontrol bersama, `app/component-review.tsx` fixture review terpisah, `lib/berrie/domain.ts` logika simulasi murni dan `app/globals.css` styling. Data bisnis **di memori**; reload menghapus perubahan demo. Tidak membuktikan IndexedDB/offline, autentikasi/izin server, backup, pembayaran nyata, printer fisik atau kesiapan pilot. Panel demo menguji gagal simpan/hasil belum diketahui tanpa transaksi nyata. Data toko contoh mengaktifkan Tunai + QRIS; aktivasi toko baru hanya Tunai.

Acuan lokal: [indeks spesifikasi](../specs/README.md), [UX Principles](../specs/12-ux-principles.md), [alur](../specs/02-user-flows.md), [aturan layar](../specs/09-screens-and-hardware.md), [acceptance criteria](../specs/10-acceptance-criteria.md) dan [design system](../DESIGN-SYSTEM.md). Scope revisi ini Kasir/Pesanan/Riwayat. Starter tetap Vinext untuk prototipe; stack produksi D-02–05 tetap. Folder mockup lama dipensiunkan pada 8 Oktober 2026; prototipe aktif hanya Sites, histori M-01/M-02 pada tasks.

## Perintah lokal

Dari direktori proyek dengan dependensi terpasang dan Node ≥22.13:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 4173` | Preview portable di loopback |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint |
| `npm test` | 43 tes domain termasuk promo, pembayaran, stok, idempotensi dan cetak ulang |
| `npm run build` | Build lokal, bukan deployment |
| `npm start` | Preview Worker hasil build di loopback |

Typecheck, lint dan 43 tes domain lulus; identitas hasil terbaru dicatat di review D-49/D-50. Build/packaging diperiksa oleh workflow Sites sebelum versi disimpan; kegagalan menghentikan penyimpanan. Tidak ada script `test:browser`; pemeriksaan browser dilakukan langsung pada preview dan dicatat di REVIEW-KASIR-D49.md.

## Penyimpanan dan publikasi

`.openai/hosting.json` menyimpan identitas proyek. Simpan sumber dan versi melalui workflow Sites dengan publikasi otomatis tidak diaktifkan. Simpan versi bukan deployment. Akses proyek tetap seperti sebelumnya; jangan menerbitkan tanpa arahan pemilik.

## Struktur dan dukungan tooling

| Lokasi | Fungsi |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | UI, metadata dan style prototipe |
| `lib/berrie/domain.ts`, `catalog.ts`, `aliases.ts`, `*.test.ts` | Domain simulasi dan 43 tes |
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
