const fs = require('fs');

async function ambilSemuaData() {
  const urlKlasemen = "https://www.ileague.id/table/index/BRI_SUPER_LEAGUE_2026-27";
  const urlHome = "https://www.ileague.id/home/index/BRI_SUPER_LEAGUE_2026-27";
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  // --- 1. SCRAPE KLASEMEN UTAMA ---
  try {
    const resTable = await fetch(urlKlasemen, { headers });
    if (resTable.ok) {
      const htmlText = await resTable.text();
      let dataKlasemen = [];
      const trBlocks = htmlText.split(/<\/tr>/i);

      trBlocks.forEach((trHtml) => {
        const tdMatches = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tdMatches && tdMatches.length >= 8) {
          const cells = tdMatches.map(td => td.replace(/<[^>]*>/g, '').trim());
          const pos = cells[0];
          let klub = cells[1];
          if (isNaN(pos) || pos === "" || !klub) return;
          if (klub.includes("(-")) klub = klub.split("(-")[0].trim();

          dataKlasemen.push({
            pos: pos, klub: klub.toUpperCase(),
            m: cells[2], mg: cells[3], s: cells[4], k: cells[5],
            sg: cells.length >= 11 ? cells[8] : cells[cells.length - 2],
            poin: cells.length >= 11 ? cells[9] : cells[cells.length - 1]
          });
        }
      });
      if (dataKlasemen.length > 0) {
        fs.writeFileSync('./klasemen.json', JSON.stringify(dataKlasemen, null, 2));
        console.log("Berhasil memperbarui klasemen.json");
      }
    }
  } catch (e) { console.error("Error Klasemen:", e); }

  // --- 2. SCRAPE JADWAL & LIVE SCORE (ANTI-GAGAL) ---
  try {
    const resHome = await fetch(urlHome, { headers });
    if (resHome.ok) {
      const htmlHome = await resHome.text();
      let dataJadwal = [];
      
      // Kamus resmi pemetaan kode singkat ke nama lengkap klub BRI Super League
      const mapKlub = {
        "PSJ": "PERSIJA JAKARTA", "DUB": "DEWA UNITED BANTEN FC", "MDR": "MADURA UNITED FC",
        "BLI": "BALI UNITED FC", "SIB": "PERSIB BANDUNG", "PTR": "PERSITA",
        "PBY": "PERSEBAYA SURABAYA", "GFC": "GARUDAYAKSA FC", "JVU": "JAVA UNITED FC",
        "KFC": "PERSIK KEDIRI", "BOR": "BORNEO FC SAMARINDA", "PSM": "PSM MAKASSAR",
        "AFC": "AREMA FC", "KDR": "ISENMULANG KALTENG FC", "JOG": "PSIM YOGYAKARTA",
        "PSS": "PSS SLEMAN", "JAP": "PERSIJAP JEPARA", "BFC": "BHAYANGKARA LAMPUNG FC"
      };

      // Pecah seluruh dokumen halaman utama berdasarkan blok pembungkus pertandingan "Selengkapnya"
      const matchBlocks = htmlHome.split(/Selengkapnya/i);

      matchBlocks.forEach((block) => {
        // Membersihkan tag HTML di dalam blok pertandingan agar menjadi teks polos terurut
        const cleanBlockText = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Pola regex mendeteksi singkatan klub kiri, skor/waktu di tengah, dan singkatan klub kanan
        // Contoh teks hasil pembersihan: "BOR 1:1 PSM" atau "JVU 19:00 WIB SIB"
        const matchInfo = cleanBlockText.match(/\b([A-Z]{3})\s+(\d{1,2}:\d{1,2}(?:\s*WIB)?)\s+([A-Z]{3})\b/i);
        
        if (matchInfo) {
          const homeCode = matchInfo[1].toUpperCase();
          const infoText = matchInfo[2].trim();
          const awayCode = matchInfo[3].toUpperCase();

          // Pastikan kode 3 huruf tersebut memang terdaftar di dalam kamus klub Liga Indonesia
          if (mapKlub[homeCode] && mapKlub[awayCode]) {
            // Jika di dalam blok teks yang sama terdapat kata "LIVE", maka tandai statusnya sebagai LIVE
            let matchStatus = "FT";
            if (infoText.includes("WIB")) {
              matchStatus = "UPCOMING";
            } else if (cleanBlockText.toUpperCase().includes("LIVE")) {
              matchStatus = "LIVE";
            }

            // Mencegah duplikasi entri pertandingan yang sama
            const isExist = dataJadwal.some(m => m.home === mapKlub[homeCode]);
            if (!isExist) {
              dataJadwal.push({
                home: mapKlub[homeCode],
                away: mapKlub[awayCode],
                info: infoText,
                status: matchStatus
              });
            }
          }
        }
      });

      if (dataJadwal.length > 0) {
        fs.writeFileSync('./jadwal.json', JSON.stringify(dataJadwal, null, 2));
        console.log(`SUKSES: Berhasil membuat jadwal.json dengan ${dataJadwal.length} pertandingan.`);
      } else {
        console.log("GAGAL: Karakter penanda jadwal tidak ditemukan di halaman depan.");
      }
    }
  } catch (e) { console.error("Error Scraper Jadwal:", e); }
}

ambilSemuaData();
