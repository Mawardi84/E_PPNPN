# Absensi Digital & E-Kinerja PPNPN

Aplikasi web modern berbasis mobile-first untuk pencatatan presensi digital dan pelaporan kinerja harian pegawai PPNPN (Pegawai Pemerintah Non Pegawai Negeri), mencakup posisi **Cleaning Service** dan **Satuan Pengamanan (Satpam)**.

---

## 🌟 Fitur Utama

### 1. Presensi Digital Terverifikasi
* **Presensi Masuk & Pulang**: Pencatatan waktu real-time dengan validasi akurat (*Waktu Indonesia Barat*).
* **Verifikasi Wajah Biometrik**: Kamera langsung dengan animasi pemindai laser biometrik futuristik dan deteksi orientasi wajah.
* **Geolokasi GPS**: Deteksi koordinat presensi otomatis yang terintegrasi dengan tautan langsung ke Google Maps.
* **Pengajuan Izin & Sakit**: Formulir permohonan mandiri dengan opsi unggah surat dokter atau dokumen pendukung.

### 2. E-Kinerja Harian Berdasarkan Peran (Role-Based)
* **Cleaning Service (CS)**: Daftar periksa tugas harian (pembersihan area dalam/luar, toilet, kaca/jendela, penyiraman taman, dsb).
* **Satuan Pengamanan (Satpam)**: Daftar periksa penjagaan (patroli keliling, buku tamu, pemeriksaan gerbang, keamanan malam, dsb).
* **Unggah Foto Bukti Pekerjaan**: Dokumentasi visual langsung hasil pekerjaan fisik harian.
* **Catatan Pelaporan**: Area catatan fleksibel untuk menyampaikan kendala atau laporan khusus.

### 3. Keamanan & Sinkronisasi Cloud
* **Autentikasi Firebase**: Masuk aman dengan akun Google (*Single Sign-On*).
* **Penyimpanan Persisten Firestore**: Data absensi dan log kinerja tersimpan di cloud secara real-time.
* **Keamanan Data Pengguna**: Kontrol akses ketat (`firestore.rules`) yang mengisolasi data per pegawai.

---

## 🛠️ Tumpukan Teknologi (*Tech Stack*)

* **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Animasi & Transisi**: [Motion](https://motion.dev/) (`motion/react`)
* **Ikonografi**: [Lucide React](https://lucide.dev/)
* **Database & Auth**: [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Firebase Authentication](https://firebase.google.com/docs/auth)

---

## 📂 Struktur Direktori Proyek

```text
├── src/
│   ├── components/
│   │   ├── AttendanceCard.tsx   # Kartu riwayat presensi beranimasi
│   │   ├── CameraCapture.tsx    # Antarmuka kamera dengan laser scanner biometrik
│   │   ├── EKinerja.tsx         # Modul pelaporan tugas harian & bukti kerja
│   │   ├── LeaveForm.tsx        # Formulir pengajuan izin & sakit
│   │   ├── Login.tsx            # Halaman autentikasi akun Google
│   │   └── Profile.tsx          # Profil pegawai & pemilihan role tugas
│   ├── App.tsx                  # State mesin utama, navigasi tab & transisi
│   ├── firebase.ts              # Inisialisasi Firebase Auth & Firestore
│   ├── main.tsx                 # Titik masuk React DOM
│   ├── types.ts                 # Definisi tipe data & antarmuka TypeScript
│   └── index.css                # Konfigurasi Tailwind CSS
├── firestore.rules              # Aturan keamanan database Firestore
├── metadata.json                # Metadata aplikasi & izin frame (kamera, lokasi)
├── package.json                 # Dependensi dan skrip proyek
└── README.md                    # Dokumentasi proyek
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
* Node.js versi 18 atau yang lebih baru
* NPM atau PNPM

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan di Lingkungan Pengembangan (*Dev Server*)
```bash
npm run dev
```
Aplikasi dapat diakses pada browser melalui alamat `http://localhost:3000`.

### 4. Membangun untuk Produksi (*Production Build*)
```bash
npm run build
```

---

## 📱 Izin Perangkat yang Diperlukan

Untuk memastikan fungsionalitas presensi berjalan optimal, pengguna disarankan mengizinkan:
1. **Izin Akses Kamera (`Camera`)**: Digunakan untuk mengambil swafoto (*selfie*) presensi masuk/pulang dan foto bukti tugas e-kinerja.
2. **Izin Lokasi (`Geolocation`)**: Digunakan untuk merekam titik koordinat lokasi pegawai saat melakukan absensi.

---

## 📄 Lisensi
Hak Cipta © 2026. Dikembangkan untuk efisiensi operasional kepegawaian PPNPN.
