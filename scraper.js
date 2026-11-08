const fs = require('fs');

async function ambilSemuaData() {
  const urlKlasemen = "https://www.ileague.id/table/index/BRI_SUPER_LEAGUE_2026-27";
  const urlHome = "https://www.ileague.id/home/index/BRI_SUPER_LEAGUE_2026-27";
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  // --- 1. SCRAPE DATA KLASEMEN ---
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

  // --- 2. SCRAPE DATA LIVE SCORE (DARI HALAMAN DEPAN) ---
  try {
    const resHome = await fetch(urlHome, { headers });
    if (resHome.ok) {
      const htmlHome = await resHome.text();
      let dataJadwal = [];
      
      // Kamus konversi singkatan kode klub ke nama lengkap resmi
      const mapKlub = {
        "PSJ": "PERSIJA JAKARTA", "DUB": "DEWA UNITED BANTEN FC", "MDR": "MADURA UNITED FC",
        "BLI": "BALI UNITED FC", "SIB": "PERSIB BANDUNG", "PTR": "PERSITA",
        "PBY": "PERSEBAYA SURABAYA", "GFC": "GARUDAYAKSA FC", "JVU": "JAVA UNITED FC",
        "KFC": "PERSIK KEDIRI", "BOR": "BORNEO FC SAMARINDA", "PSM": "PSM MAKASSAR",
        "AFC": "AREMA FC", "KDR": "ISENMULANG KALTENG FC", "JOG": "PSIM YOGYAKARTA",
        "PSS": "PSS SLEMAN", "JAP": "PERSIJAP JEPARA", "BFC": "BHAYANGKARA LAMPUNG FC"
      };

      // Mencari baris teks pertandingan (contoh: BLI 0:0 x KDR atau JVU 19:00 WIB x SIB)
      const matches = htmlHome.match(/([A-Z]{3})\s+(\d{1,2}:\d{1,2}(?:\s*WIB)?)\s*x\s*([A-Z]{3})/gi);
      
      if (matches) {
        matches.forEach((matchText) => {
          const parts = matchText.match(/([A-Z]{3})\s+([\d\:\sWIB]+)\s*x\s*([A-Z]{3})/i);
          if (parts) {
            const homeCode = parts[1].toUpperCase();
            const timeOrScore = parts[2].trim();
            const awayCode = parts[3].toUpperCase();
            
            // Cek apakah pertandingan sedang berjalan (punya indikator LIVE di teks sekitarnya)
            const isLive = htmlHome.includes(matchText + "\nLIVE") || htmlHome.includes(timeOrScore + "<\/div>\n<div[^>]*>LIVE");

            dataJadwal.push({
              home: mapKlub[homeCode] || homeCode,
              away: mapKlub[awayCode] || awayCode,
              info: timeOrScore,
              status: isLive ? "LIVE" : (timeOrScore.includes("WIB") ? "UPCOMING" : "FT")
            });
          }
        });
      }
      
      if (dataJadwal.length > 0) {
        fs.writeFileSync('./jadwal.json', JSON.stringify(dataJadwal, null, 2));
        console.log("Berhasil memperbarui jadwal.json");
      }
    }
  } catch (e) { console.error("Error Jadwal:", e); }
}

ambilSemuaData();
