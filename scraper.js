const fs = require('fs');

async function ambilData() {
  const targetUrl = "https://www.ileague.id/table/index/BRI_SUPER_LEAGUE_2026-27";
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) throw new Error("Gagal memuat web sumber. Status: " + response.status);
    const htmlText = await response.text();
    
    let dataKlasemen = [];
    
    // Daftar tim resmi untuk filter keamanan data klasemen Anda
    const namaKlubResmi = [
      "AREMA FC", "BALI UNITED FC", "BHAYANGKARA LAMPUNG FC", "BORNEO FC SAMARINDA", 
      "DEWA UNITED BANTEN FC", "GARUDAYAKSA FC", "ISENMULANG KALTENG FC", "JAVA UNITED FC", 
      "MADURA UNITED FC", "PERSEBAYA SURABAYA", "PERSIB BANDUNG", "PERSIJA JAKARTA", 
      "PERSIJAP JEPARA", "PERSIK KEDIRI", "PERSITA", "PSIM YOGYAKARTA", "PSM MAKASSAR", "PSS SLEMAN"
    ];

    // Potong HTML berdasarkan baris tabel <tr>
    const trBlocks = htmlText.split(/<\/tr>/i);

    trBlocks.forEach((trHtml) => {
      // Ambil teks yang berada di dalam setiap tag data kolom <td>
      const tdMatches = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      
      if (tdMatches && tdMatches.length >= 8) {
        // Membersihkan tag HTML dari dalam teks kolom agar menjadi teks polos bersih
        const cells = tdMatches.map(td => td.replace(/<[^>]*>/g, '').trim());
        
        const pos = cells[0];
        let rawKlub = cells[1];
        
        // Lewati baris jika kolom peringkat bukan berupa angka
        if (isNaN(pos) || pos === "" || !rawKlub) return;

        // Bersihkan sisa karakter pengurangan poin jika ada
        if (rawKlub.includes("(-")) {
          rawKlub = rawKlub.split("(-")[0].trim();
        }

        const upKlub = rawKlub.toUpperCase();
        const officialName = namaKlubResmi.find(k => upKlub.includes(k));

        if (officialName) {
          // Petakan letak data kolom iLeague secara akurat
          const main = cells[2] || "0";
          const menang = cells[3] || "0";
          const seri = cells[4] || "0";
          const kalah = cells[5] || "0";
          
          let sg = "0";
          let poin = "0";

          // Adaptasi dinamis jika iLeague memiliki kolom GF/GA tambahan di tengah
          if (cells.length >= 11) {
            sg = cells[8] || "0"; // Kolom GD (Selisih Gol)
            poin = cells[9] || "0"; // Kolom Poin Utama
          } else {
            sg = cells[cells.length - 2] || "0";
            poin = cells[cells.length - 1] || "0";
          }

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
    });

    // Validasi akhir sebelum menulis file data ke repository GitHub
    if (dataKlasemen.length > 0) {
      fs.writeFileSync('./klasemen.json', JSON.stringify(dataKlasemen, null, 2));
      console.log(`SUKSES: Berhasil memperbarui data klasemen untuk ${dataKlasemen.length} tim.`);
    } else {
      console.log("GAGAL: Struktur HTML tabel berubah, array data kosong.");
    }
  } catch (error) {
    console.error("Error Scraper:", error);
    process.exit(1);
  }
}

ambilData();
