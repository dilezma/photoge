# Website Penyimpanan Foto dengan GitHub Database

Website penyimpanan foto sederhana yang menggunakan GitHub sebagai database.

## Fitur
1. **Autentikasi User** - Login dengan username, tersimpan di localStorage
2. **Gallery Foto** - Upload, lihat, download, dan hapus foto
3. **Admin Panel** - Lihat statistik semua user dan foto
4. **GitHub Integration** - Semua data disimpan di GitHub repository

## Setup Instruksi

### 1. Buat Repository GitHub
- Buat repository baru di GitHub
- Aktifkan GitHub Pages: Settings > Pages > Source: main branch

### 2. Generate Personal Access Token
1. Buka GitHub Settings > Developer settings > Personal access tokens
2. Klik "Generate new token"
3. Beri nama (contoh: "FotoKu Token")
4. Pilih permissions:
   - `repo` (Full control of private repositories)
   - `write:packages`
   - `delete:packages`
5. Generate token dan **COPY** tokennya (hanya muncul sekali)

### 3. Konfigurasi Website
1. Upload semua file ke repository GitHub
2. Buka file `script.js`
3. Edit bagian konfigurasi di baris 4-7:
```javascript
this.owner = 'GITHUB_USERNAME_ANDA';
this.repo = 'NAMA_REPOSITORY_ANDA';
this.token = 'TOKEN_GITHUB_ANDA';
this.branch = 'main';