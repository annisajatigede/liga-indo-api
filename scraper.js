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
      }
    }
  } catch (e) { console.error("Error Klasemen:", e); }

  // --- 2. SCRAPE JADWAL DENGAN DETEKSI TANGGAL OTOMATIS ---
  try {
    const resHome = await fetch(urlHome, { headers });
    if (resHome.ok) {
      const htmlHome = await resHome.text();
      let dataJadwal = [];
      
      const mapKlub = {
        "PSJ": "PERSIJA JAKARTA", "DUB": "DEWA UNITED BANTEN FC", "MDR": "MADURA UNITED FC",
        "BLI": "BALI UNITED FC", "SIB": "PERSIB BANDUNG", "PTR": "PERSITA",
        "PBY": "PERSEBAYA SURABAYA", "GFC": "GARUDAYAKSA FC", "JVU": "JAVA UNITED FC",
        "KFC": "PERSIK KEDIRI", "BOR": "BORNEO FC SAMARINDA", "PSM": "PSM MAKASSAR",
        "AFC": "AREMA FC", "KDR": "ISENMULANG KALTENG FC", "JOG": "PSIM YOGYAKARTA",
        "PSS": "PSS SLEMAN", "JAP": "PERSIJAP JEPARA", "BFC": "BHAYANGKARA LAMPUNG FC"
      };

      // Pecah halaman berdasarkan blok tulisan "Selengkapnya"
      const matchBlocks = htmlHome.split(/Selengkapnya/i);
      
      // Variabel penampung tanggal aktif saat mendaki baris teks halaman
      let tanggalAktif = "";

      matchBlocks.forEach((block) => {
        // Bersihkan kode tag HTML agar menjadi deretan teks polos terurut
        const cleanBlockText = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Cari teks tanggal di dalam blok ini (Contoh mendeteksi: "8 November 2026")
        const dateMatch = cleanBlockText.match(/(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i);
        if (dateMatch) {
          tanggalAktif = dateMatch[1];
        }

        // Cari pola struktur pertandingan
        const matchInfo = cleanBlockText.match(/\b([A-Z]{3})\s+(\d{1,2}:\d{1,2}(?:\s*WIB)?)\s+([A-Z]{3})\b/i);
        
        if (matchInfo) {
          const homeCode = matchInfo[1].toUpperCase();
          const infoText = matchInfo[2].trim();
          const awayCode = matchInfo[3].toUpperCase();

          if (mapKlub[homeCode] && mapKlub[awayCode]) {
            let matchStatus = "FT";
            if (infoText.includes("WIB")) {
              matchStatus = "UPCOMING";
            } else if (cleanBlockText.toUpperCase().includes("LIVE")) {
              matchStatus = "LIVE";
            }

            const isExist = dataJadwal.some(m => m.home === mapKlub[homeCode]);
            if (!isExist) {
              dataJadwal.push({
                tanggal: tanggalAktif || "Hari Ini", // Memasukkan tanggal ke dalam JSON
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
        console.log(`Berhasil menulis jadwal.json lengkap dengan tanggal.`);
      }
    }
  } catch (e) { console.error("Error Scraper Jadwal:", e); }
}

ambilSemuaData();
