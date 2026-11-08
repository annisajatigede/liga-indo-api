const fs = require('fs');

async function ambilData() {
  const targetUrl = "https://www.ileague.id/table/index/BRI_SUPER_LEAGUE_2026-27";
  // Menembak data via fetch node bawaan
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (!response.ok) throw new Error("Gagal memuat web sumber.");
    const htmlText = await response.text();
    
    // Karena kita tidak memakai library eksternal (biar cepat di Github Actions),
    // kita pakai teknik pemisah teks string baris demi baris
    const lines = htmlText.split('\n');
    let dataKlasemen = [];
    
    // Daftar tim resmi untuk filter keamanan data
    const namaKlubResmi = [
      "AREMA FC", "BALI UNITED FC", "BHAYANGKARA LAMPUNG FC", "BORNEO FC SAMARINDA", 
      "DEWA UNITED BANTEN FC", "GARUDAYAKSA FC", "ISENMULANG KALTENG FC", "JAVA UNITED FC", 
      "MADURA UNITED FC", "PERSEBAYA SURABAYA", "PERSIB BANDUNG", "PERSIJA JAKARTA", 
      "PERSIJAP JEPARA", "PERSIK KEDIRI", "PERSITA", "PSIM YOGYAKARTA", "PSM MAKASSAR", "PSS SLEMAN"
    ];

    for (let line of lines) {
      let trimmed = line.trim();
      // Pola regex membaca susunan baris data klasemen iLeague
      let match = trimmed.match(/^\s*(\d+)\s+([A-Za-z\s\-\(\)\d]+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d\-]+)\s+([\d\-]+)\s+([\d\-]+)\s+(\d+)/);
      
      if (match) {
        let pos = match[1];
        let rawKlub = match[2].trim();
        let main = match[3];
        let menang = match[4];
        let seri = match[5];
        let kalah = match[6];
        let sg = match[9];
        let poin = match[10];

        let upKlub = rawKlub.toUpperCase();
        let officialName = namaKlubResmi.find(k => upKlub.includes(k));

        if (officialName) {
          dataKlasemen.push({
            pos: pos,
            klub: officialName,
            m: main,
            mg: menang,
            s: seri,
            k: kalah,
            sg: sg,
            poin: poin
          });
        }
      }
    }

    if (dataKlasemen.length > 0) {
      // Simpan file hasil menjadi format JSON bersih
      fs.writeFileSync('./klasemen.json', JSON.stringify(dataKlasemen, null, 2));
      console.log(`Berhasil memperbarui ${dataKlasemen.length} tim.`);
    } else {
      console.log("Struktur tidak cocok saat parsing teks.");
    }
  } catch (error) {
    console.error("Error Scraper:", error);
    process.exit(1);
  }
}

ambilData();
