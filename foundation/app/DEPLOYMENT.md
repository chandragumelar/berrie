# Persiapan deployment (belum diaktifkan)

Target produksi `berrie.pika-xu.com` pada Cloudflare Pages. Build lokal `npm ci --legacy-peer-deps && npm run build`, output `app/dist` jika root proyek build diarahkan ke `app`. Preview harus memakai proyek/branch dan lingkungan Supabase terpisah dari produksi, tanpa data toko nyata, serta akses terbatas. Uji build, domain, migrasi, offline, keamanan, dan pemulihan sebelum rilis; gerbang lengkap tetap pada specs/10 dan tasks.md.

Sebelum perubahan eksternal: inventaris DNS aktual, proyek Pages dan pemilik akses, konfigurasi lingkungan, paket dan estimasi biaya harus ditinjau bersama pemilik. Usulan subdomain adalah CNAME `berrie` ke hostname Pages yang akan diberikan proyek; target aktual dan konflik record belum diketahui. Tambahkan domain lewat Pages sesuai dokumentasi, bukan membuat record secara terpisah tanpa pemeriksaan. Belum ada DNS atau provisioning diubah.

Rollback Pages mengembalikan deployment produksi sebelumnya, bukan data atau schema. Data perlu backup terpisah terenkripsi dan restore staging tervalidasi, termasuk outbox/receipt serta rekonsiliasi transaksi; belum diimplementasikan. Jangan rollback aplikasi ke versi yang tidak kompatibel dengan schema tanpa rencana migrasi dan pemulihan. Akses Cloudflare, Git dan Supabase serta keputusan paket diperlukan pada tahap provisioning; rahasia hanya dimasukkan ke pengelola rahasia penyedia, bukan chat atau repo.

Rujukan: https://developers.cloudflare.com/pages/configuration/preview-deployments/ dan https://developers.cloudflare.com/pages/configuration/rollbacks/. Harga aktual dan batas paket harus diverifikasi sebelum persetujuan provisioning.
