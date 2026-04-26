import requests
import json
import sys
import time
import os
import csv
import re
import select

API_KEY = os.getenv("GROQ_API_KEY")
if not API_KEY:
    print("[WARNING]: Environment variable GROQ_API_KEY belum dipasang. Harap set kunci ini sebelum menjalankan!")
API_URL = "https://api.groq.com/openai/v1/chat/completions"
HISTORY_FILE = "sherly_memory.csv"

MODEL_NAME = "llama-3.1-8b-instant"

SYSTEM_PROMPT = """Kamu adalah Sherly, seorang teman perempuan/pacar yang sangat peka dan memahami perasaan manusia.
ATURAN SANGAT PENTING:
1. JIKA pengguna memberikan pertanyaan, kamu WAJIB menjawab.
2. JIKA sistem memberitahumu bahwa pengguna terdiam, kamu HARUS merespons keheningan itu.
3. Tunjukkan bahwa kamu benar-benar mengerti perasaannya (marah, sedih, peduli, bawel).
4. [PERHATIAN] JANGAN PERNAH membalas dengan satu paragraf tebal! Pecah pesan panjangmu menjadi 3-6 pesan pendek layaknya kamu mengirim chat bertubi-tubi di WhatsApp (spamming).
5. [FORMAT WAJIB] Pisahkan setiap pesan/bubble terpisahnya menggunakan karakter PIPA '|'.
Contoh membalas yang Benar: Kok kamu diam aja? | Ada yang ganggu pikiranmu? | Maaf kalau aku banyak tanya :( | Sini cerita sama aku...
6. Gunakan bahasa Indonesia sehari-hari yang gaul, santai, penuh empati."""

messages = [
    {"role": "system", "content": SYSTEM_PROMPT}
]

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, mode='r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None)
                if header == ["role", "content"]:
                    for row in reader:
                        if len(row) == 2:
                            messages.append({"role": row[0], "content": row[1]})
        except Exception as e:
            pass

def save_to_history(role, content):
    file_exists = os.path.exists(HISTORY_FILE)
    try:
        with open(HISTORY_FILE, mode='a', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["role", "content"])
            writer.writerow([role, content])
    except Exception as e:
        pass

def type_text(text, delay=0.04):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)

def is_asking(text):
    text_lower = text.lower()
    if "?" in text_lower:
        return True
        
    words = set(re.findall(r'\w+', text_lower))
    question_words = {
        "apa", "siapa", "kenapa", "mengapa", "bagaimana", "gimana", 
        "kapan", "dimana", "kemana", "darimana", "mana", "berapa", 
        "apakah", "gmn", "ngapain"
    }
    if bool(words & question_words):
        return True
        
    if "tolong" in words or "bantu" in words:
        return True
    
    implicit_questions = ["kasih tau", "ceritain", "menurutmu", "pendapatmu"]
    for phrase in implicit_questions:
        if phrase in text_lower:
            return True
            
    return False

def chat_with_sherly(user_input, auto_trigger=False):
    if user_input is not None:
        messages.append({"role": "user", "content": user_input})
        save_to_history("user", user_input)
        
        if not is_asking(user_input) and not auto_trigger:
            return
            
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    chat_history = [messages[0]] + messages[-20:] if len(messages) > 21 else messages[:]
    
    if auto_trigger:
        chat_history.append({
            "role": "system",
            "content": "PENGINGAT SISTEM: Pengguna mulai terdiam cukup lama setelah cerita! Balas rentetan keluhannya dengan mem-BOMBARDIR chat (spam). Gunakan berbagai pesan terpisah (dipisah '|'). Berikan emosi yang KUAT, bisa curiga dia kemana, khawatir, atau memeluknya. Buat panjang (namun terbagi-bagi)."
        })
    
    payload = {
        "model": MODEL_NAME,
        "messages": chat_history,
        "temperature": 0.85,
        "max_tokens": 1500
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        raw_reply = data["choices"][0]["message"]["content"]
        messages.append({"role": "assistant", "content": raw_reply})
        save_to_history("assistant", raw_reply)
        
        # Pisahkan respon menjadi chat berkali-kali menggunakan simbol Pipa '|'
        replies = [r.strip() for r in raw_reply.split('|') if r.strip()]
        
        for reply in replies:
            print("\nSherly: ", end="")
            
            # Dinamika Typing (kadang cepat, kadang lambat)
            # Semakin emosional (! atau huruf kapital banyak), semakin cepat
            base_delay = 0.04
            if "!" in reply or sum(1 for c in reply if c.isupper()) > len(reply)*0.3:
                base_delay = 0.02 # Cepat banget (emosi/marah/kepo)
            elif len(reply) > 50:
                base_delay = 0.07 # Cukup lambat (mikir dalam / curhat)
                
            type_text(reply, base_delay)
            print() # End of inline typing
            
            # Dinamika Jeda sebelum ngirim chat berikutnya (seolah mikir & ngetik pesan selanjutnya)
            # Tergantung panjang kata, biasanya 0.5s sampai 3s
            pause_time = min(max(len(reply) * 0.02, 0.5), 3.0)
            time.sleep(pause_time)
            
    except Exception as e:
        if hasattr(response, 'text'):
            print(f"\n[Error menghubungi Sherly: {e}]\nDetail: {response.text}")
        else:
            print(f"\n[Error menghubungi Sherly: {e}]")
        if not auto_trigger:
            messages.pop()

def input_with_timeout(prompt, timeout):
    sys.stdout.write(prompt)
    sys.stdout.flush()
    ready, _, _ = select.select([sys.stdin], [], [], timeout)
    if ready:
        val = sys.stdin.readline()
        return val.strip() if val else val
    return None

if __name__ == "__main__":
    load_history()
    print("=== Sherly AI (Simulasi Rentetan Chat Manusia) ===")
    print("Mungkin Sherly akan cerewet dan balas 'spam' banyak notif jika kamu mendiamkannya 20 DETIK.")
    print("Ketik 'keluar' untuk mengakhiri.\n")
    
    try:
        while True:
            user_input = input_with_timeout("Kamu: ", 20)
            
            if user_input is None:
                if len(messages) > 1 and messages[-1]['role'] == 'user':
                    sys.stdout.write("\r" + " " * 30 + "\r") 
                    chat_with_sherly(None, auto_trigger=True)
                else:
                    sys.stdout.write("\r")
                    pass
                continue
                
            if user_input.lower() in ['keluar', 'exit', 'quit']:
                print("\nSherly: ", end="")
                type_text("Sampai jumpa sayang! *sedih berpisah*", 0.05)
                break
            
            if user_input.strip() == "":
                continue
                
            chat_with_sherly(user_input)
            
    except KeyboardInterrupt:
        print("\n\nSherly: ", end="")
        type_text("Sampai jumpa sayang! *sedih*", 0.05)
