# Cara Menjalankan Project React Horizons_4

## 1️ Install Node.js
Jalankan installer Node.js yang ada di folder project:  
```
Project BEMS\React.js\node-v22.14.0-x64.msi
```
Ikuti langkah instalasi, pastikan opsi **"Add to PATH"** dicentang.

---

## 2️ Ubah Alamat IP API
Buka file:
```
C:\yourpath\Project BEMS\horizons_4.1\.env dan C:\yourpath\Project BEMS\horizons_4\vite.config.js
```
Ganti **alamat IP** sesuai dengan IP server yang digunakan.

pada file .env
VITE_API_URL='http://127.0.0.1:8080/api'  <---- ubah ip

pada file vite.config.js
export default defineConfig({
	plugins: [react(), addTransformIndexHtml],
	server: {
		cors: true,
		proxy: {
			'/api': {
			target: 'http://127.0.0.1:8080', <----ubah ip
			changeOrigin: true,
			rewrite: (path) => path.replace(/^\/api/, '')
			}
		},

---

## 3️ Pindah ke Folder Project
Buka **Terminal / **, lalu jalankan:
```
cd "C:\yourpath\Project BEMS\React.js\horizons_4.1\dist"
```
> Ganti `C:\yourpath` dengan lokasi folder di komputer kamu.

---

## 4️ Izinkan Eksekusi Script
Jalankan perintah:
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## 5️ Jalankan Project
Jalankan:
```
npx serve -s
```

## 6. RUN PHP Server
Buka **Terminal / **, atau bisa mendownload git bash, lalu jalankan:
```
cd "C:\yourpath\Project BEMS\PHP"
```
> Ganti `C:\yourpath` dengan lokasi folder di komputer kamu.

---

## 5️ Jalankan PHP Server
Jalankan:
```
php -S 0.0.0.0:8080
```
