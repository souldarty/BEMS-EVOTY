# PHP Native SSO Client

Proyek ini adalah implementasi Client Single Sign-On (SSO) sederhana menggunakan PHP Native. Aplikasi ini bertindak sebagai OAuth2 Client yang terhubung ke Server SSO (misalnya aplikasi Laravel dengan Passport/Sanctum OAuth) untuk melakukan autentikasi pengguna secara terpusat.

## Fitur
- **OAuth2 Authorization Code Flow**: Mendukung alur login OAuth2 standar lengkap dengan perlindungan parameter `state` (Anti-CSRF).
- **PHP Native Tanpa Dependensi**: Tidak memerlukan Composer atau framework tambahan. Skrip kustom `.env` parser sudah tertanam untuk memudahkan konfigurasi.
- **Integrasi cURL**: Menggunakan cURL standar PHP untuk pertukaran token dan pemanggilan API *User Info*.
- **Session Sederhana**: Data login dan access token disimpan di dalam session PHP.

## Persyaratan
- PHP 7.4 atau lebih baru (direkomendasikan PHP 8.x)
- Ekstensi PHP `curl` aktif
- Server SSO OAuth2 yang menyediakan endpoint otorisasi, token, dan user profile

## Struktur File
- `config.php`: Memuat konfigurasi dari file `.env`, mengatur URL SSO, kredensial, dan memulai sesi.
- `index.php`: Entry point aplikasi, akan me-redirect pengguna ke halaman login.
- `login.php`: Men-generate `state` untuk keamanan dan mengarahkan pengguna ke halaman otorisasi pada SSO Server.
- `callback.php`: Menangani *redirect* dari SSO Server, memvalidasi `state`, menukarkan `code` dengan *Access Token*, dan mengambil data pengguna.
- `dashboard.php`: Halaman terproteksi yang menampilkan data pengguna yang sedang login.
- `logout.php`: Membersihkan sesi dan mengeluarkan pengguna dari aplikasi (client-side logout).

## Cara Menjalankan

1. **Clone atau Letakkan di Web Server:**
   Pastikan folder proyek ini bisa diakses melalui web server lokal Anda seperti Herd, Valet, XAMPP, atau Laragon (misal: `http://php-sso-client.test`).

2. **Persiapkan Konfigurasi (`.env`):**
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Atur Kredensial:**
   Buka file `.env` dan sesuaikan nilainya:
   ```env
   BASE_URL=http://php-sso-client.test
   
   SSO_CLIENT_ID=client_id_dari_sso_server
   SSO_CLIENT_SECRET=client_secret_dari_sso_server
   SSO_SERVER_URL=http://url-sso-server.test
   ```
   *Catatan: Pastikan `redirect_uri` yang didaftarkan di SSO Server adalah `http://php-sso-client.test/callback.php`.*

4. **Jalankan Aplikasi:**
   Akses `http://php-sso-client.test` di browser. Anda akan diarahkan untuk login melalui SSO Server.

## Alur Autentikasi (Authorization Code Flow)
1. User mengklik tombol **Login** di `login.php`.
2. Aplikasi me-redirect user ke SSO Server (Endpoint `/oauth/authorize`) beserta Client ID dan `state`.
3. User melakukan login pada SSO Server dan menyetujui izin (Authorization).
4. SSO Server mengembalikan user ke `callback.php` beserta parameter `code`.
5. Di belakang layar (via cURL), `callback.php` menukarkan `code` dengan `Access Token` ke Endpoint `/oauth/token`.
6. Menggunakan `Access Token` tersebut, `callback.php` meminta data profil user dari Endpoint `/api/user`.
7. Profil user disimpan ke `$_SESSION['user']`, dan user dialihkan ke `dashboard.php`.
