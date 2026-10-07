# Berrie — Prototipe Sites M-03

7 Oktober 2026. D-46–48 sudah diterapkan pada UI prototipe; [review terbaru](REVIEW-KASIR-D47.md). Revisi Kasir/promo D-43–45 diterapkan pada proyek **Berrie · Prototipe Kasir**, `appgprj_6ac54219b9248191bf551b9871d78958`. Visual menunggu review pemilik; simpan versi tanpa deployment.

## Cakupan revisi

Satu Buka kas sebagai langkah awal, channel Toko, tabel promo nyata per SKU, keranjang kompak, dua penyajian per item, pembayaran tunai/QRIS dan modal Struk yang menampilkan dua tujuan. Font sistem lokal, tombol kapsul, kontrol konsisten dan Lucide mengikuti token design system. Promo SKU tidak digabung diskon order; topping tetap utuh dan snapshot harga lama tidak diganti otomatis. Font 14/18/20/22 sesuai peran, SKU bernama unik, sel numerik, alias tipe, workflow toggle kas dan navigasi kiri yang dapat diciutkan. Lihat [hasil terbaru](REVIEW-KASIR-D47.md); [review versi 1](REVIEW-KASIR.md) dipertahankan.

`app/page.tsx` memuat UI, `lib/berrie/domain.ts` logika simulasi murni dan `app/globals.css` styling. Data bisnis **di memori**; reload menghapus perubahan demo. Tidak membuktikan IndexedDB/offline, autentikasi/izin server, backup, pembayaran nyata, printer fisik atau kesiapan pilot. Panel demo menguji gagal simpan/hasil belum diketahui tanpa transaksi nyata. Data toko contoh mengaktifkan Tunai + QRIS; aktivasi toko baru hanya Tunai.

Acuan lokal: [spesifikasi](../specs/README.md), [prompt Kasir](../PROMPT-SITES-PERBAIKAN-KASIR.md) dan [design system](../DESIGN-SYSTEM.md). Starter tetap Vinext untuk prototipe; stack produksi D-02–05 tetap. `mockup/` lama tidak diubah.

## Perintah lokal

Dari direktori proyek dengan dependensi terpasang dan Node ≥22.13:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 4173` | Preview portable di loopback |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint |
| `npm test` | 31 tes domain termasuk promo, pembayaran, stok, idempotensi dan cetak ulang |
| `npm run build` | Build lokal, bukan deployment |
| `npm start` | Preview Worker hasil build di loopback |

Typecheck, lint dan 31 tes domain lulus pada revisi ini. Build/packaging diperiksa oleh workflow Sites sebelum versi disimpan; kegagalan menghentikan penyimpanan. Tidak ada script `test:browser`; pemeriksaan browser dilakukan langsung pada preview dan dicatat di REVIEW-KASIR.md.

## Penyimpanan dan publikasi

`.openai/hosting.json` menyimpan identitas proyek. Simpan sumber dan versi melalui workflow Sites dengan publikasi otomatis tidak diaktifkan. Simpan versi bukan deployment. Akses proyek tetap seperti sebelumnya; jangan menerbitkan tanpa arahan pemilik.

## Struktur dan dukungan tooling

| Lokasi | Fungsi |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | UI, metadata dan style prototipe |
| `lib/berrie/domain.ts`, `catalog.ts`, `aliases.ts`, `*.test.ts` | Domain simulasi dan 31 tes |
| `components/ui/`, `hooks/use-mobile.ts`, `lib/utils.ts` | Dua belas komponen UI beserta dependensi yang dipakai |
| `public/favicon.svg` | Favicon Berrie yang direferensikan metadata |
| `build/`, `scripts/`, `vite.config.ts`, `.openai/hosting.json` | Runtime preview/build Sites dan identitas proyek; dipertahankan |
| `lib/connector*`, `app/chatgpt-auth.ts`, `components/connector-error.tsx` | Dukungan opsional platform Sites; bukan fitur POS aktif |
| `db/`, `drizzle/`, `drizzle.config.ts`, `cloudflare-env.d.ts` | Tooling D1/Drizzle starter, termasuk perintah db:generate; bukan database bisnis prototipe |
| `vendor/` | Stylesheet yang diimport globals.css beserta lisensinya |

Pembersihan 7 Oktober 2026 menghapus komponen UI starter tanpa jalur import dari aplikasi, ikon placeholder dan contoh D1 terpisah. Konfigurasi, package manager/lockfile, runtime dan perilaku UI tetap. Manifest masih menyediakan dukungan tooling starter; tugas ini tidak mengubah dependensi. Petunjuk workflow platform berada pada skill Sites, bukan salinan manual starter di repo.

Root `berrie/` belum memiliki Git; direktori `berrie-site/` mempunyai Git sendiri. [Review dan identitas versi](REVIEW-KASIR.md) merekam versi 1 yang pernah disimpan; pembersihan lokal tidak otomatis memperbarui versi Sites atau melakukan deployment.
