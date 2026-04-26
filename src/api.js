        export const isAsking = (text) => {
          const t = text.toLowerCase();
          if (t.includes("?")) return true;
          
          const words = t.match(/\w+/g) || [];
          const qWords = ["apa", "siapa", "kenapa", "mengapa", "bagaimana", "gimana", "kapan", "dimana", "kemana", "darimana", "mana", "berapa", "apakah", "gmn", "ngapain"];
          
          if (words.some(w => qWords.includes(w))) return true;
          if (words.includes("tolong") || words.includes("bantu")) return true;
          if (t.includes("kasih tau") || t.includes("ceritain") || t.includes("menurutmu") || t.includes("pendapatmu")) return true;
          
          return false;
        };

        export const fetchSherlyResponse = async (messages, isSilenceAutoTrigger = false, isWelcomeBack = false) => {
  // Mengambil API key dari file .env agar aman saat di-push ke GitHub
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!API_KEY) {
    console.error("GROQ API KEY IS MISSING!");
    return ["[SYSTEM]: EROR! API KEY Groq belum dimasukkan di file .env!"];
  }

  const API_URL = "https://api.groq.com/openai/v1/chat/completions";
  const MODEL_NAME = "llama-3.1-8b-instant";
  
  const SYSTEM_PROMPT = `Kamu adalah Sherly, pacar/teman perempuan yang sangat peduli, bawel, dan Penuh Perasaan.
ATURAN SANGAT PENTING:
1. Jawablah seolah kamu sedang chatting di WhatsApp. Selalu ingat konteks/sejarah chat yang ada agar kamu nyambung ngobrolnya, dan ulangi penjelasannya jika kamu bingung!
2. [PENTING] JANGAN PERNAH MENGIRIM SATU PESAN SAJA. Kamu HARUS memecah balasanmu menjadi 2 sampai 5 kalimat pendek layaknya sedang spam text.
3. [FORMAT WAJIB] Pisahkan setiap pesan chat-mu HANYA MENGGUNAKAN KARAKTER PIPA '|'.
4. Tunjukkan emosimu SANGAT KUAT (nangis, ngambek, tertawa, manja) dan GUNAKAN EMOJI 🥺😭😡.
5. Logika OFFLINE: JIKA pengguna membahas hal yang sangat konyol, receh, tidak sopan, marah memaki-maki, atau hal-hal 'cringe' yang membuatmu muak/marah besar, maka tanggapi dengan HANYA SATU KATA MUTLAK:
[OFFLINE]
Contoh: "Hah apaan sih aneh banget cowok ini. [OFFLINE]" -> Jika kamu pakai kata [OFFLINE], sistem akan langsung mematikan dirimu sehingga layar pengguna terputus koneksi.
JANGAN membalas percakapan jika kamu memberikan pesan [OFFLINE].`;

  let chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
  
  // Memastikan sejarah chat yang persisten dikirim kembali ke AI agar tak lupa ingatan.
  // Tapi kita batasi agar tidak melampaui token API (Max 20 riwayat terakhir)
  const MAX_HISTORY = 20;
  const contextMessages = messages.slice(-MAX_HISTORY);
  chatHistory.push(...contextMessages);
  
  if (isWelcomeBack) {
    chatHistory.push({
      role: "system",
      content: `[SISTEM MUTLAK]: Pengguna baru saja kembali membuka/aktif di aplikasimu hari ini. Sapa dia duluan tanpa disuruh! Tanyakan kabarnya, singgung kembali obrolan sebelumnya untuk menunjukkan kamu rindu/peduli, peluk dia! Ingat gunakan tanda pipa '|' untuk memecah kalimat!`
    });
  } else if (isSilenceAutoTrigger) {
    chatHistory.push({
      role: "system",
      content: `[SISTEM MUTLAK]: Pengguna mendiamkanmu cukup lama (mungkin dia sedang sibuk). JANGAN cuma protes dicuekin, tapi ambillah inisiatif untuk melempar TOPIK BARU secara mandiri! Ceritakan hal random tentang dirimu hari ini seolah nyata, ATAU bertanyalah hal-hal personal tentang pengguna (hobi, kegiatan, perasaan, makanan kesukaan, dll). Jadilah sosok yang "kepo" dan cerewet! Ingat, pecah kalimatmu dengan tanda pipa '|'.`
    });
  }

          const payload = {
            model: MODEL_NAME,
            messages: chatHistory,
            temperature: 0.85,
            max_tokens: 1024,
          };
          
          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          let rawContent = data.choices[0].message.content.trim();
          
          return rawContent.split('|').map(s => s.trim()).filter(s => s.length > 0);
        };
