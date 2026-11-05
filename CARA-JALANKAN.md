# Cara Menjalankan Tani.SM

## Cara paling gampang (recommended)

**Klik 2x file `start-server.bat`**

Otomatis:
1. nyalain server-nya
2. buka browser ke `http://localhost:8080` (atau 8081 kalau 8080 sudah dipakai)

Yang perlu diingat:
- **Jangan tutup jendela CMD hitamnya** selama web dipakai. Itu nyawa server-nya.
- Menutup **tab browser** saja tidak masalah, server tetap jalan.
- Kalau mau buka web lagi besok: klik 2x `start-server.bat` lagi. Nggak perlu hasil apa-apa.
- Kalau keluar `Port 8080 SEDANG PAKAI` → itu bukan error, artinya server lama masih hidup. Yang baru otomatis pindah ke 8081, dan browsernya otomatis ikut ke sana.

---

## Kenapa muncul "This site can't be reached"?

`localhost` bukan tempat penyimpanan web. Dia cuma alamat ke komputer sendiri, dan
harus ada program yang **menjawab** di alamat itu. Program itu = `dev-server.js`.

Kalau program itu mati, tidak ada yang menjawab → `ERR_CONNECTION_REFUSED`.

Yang mematikan biasanya:
- menutup terminal/CMD yang ngejalanin `node dev-server.js`
- restart atau shutdown laptop
- logout dari Windows

TadiERR_CONNECTION_REFUSED itu karena server-nya memang belum jalan, bukan karena
kodenya rusak. Sekarang sudah Jalan lagi.

---

## Kalau cara manual

```powershell
cd C:\Users\LENOVO\TaniSM
node dev-server.js
```

Lalu buka `http://localhost:8080`. Terminal harus tetap terbuka selama memakai web.

Port bentrok? Pakai port lain:

```powershell
$env:PORT=8081; node dev-server.js
```

---

## Kalau web-nya stuck / nampilin versi lama

Normalnya sudah tidak terjadi karena server ini sengaja mengirim header anti-cache.
Kalau nanti tetap)nampak aneh:

1. buka `http://localhost:8080/__reset__`
2. klik **Bersihkan Sekarang**
3. tutup semua tab TANIHUB, baru buka lagi

---

## Alamat halaman

| Halaman | Alamat |
|---|---|
| Pemilih portal | http://localhost:8080/login.html |
| Customer / Petani | http://localhost:8080/index.html |
| Admin Gudang | http://localhost:8080/admin.html |
