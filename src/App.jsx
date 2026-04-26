import { useState, useEffect, useRef } from 'react';
import './index.css';
import { isAsking, fetchSherlyResponse } from './api';

function App() {
  // Load initial state dari localStorage untuk Persistent Memory
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('sherly_messages');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading memory:', e);
    }
    return [];
  });
  const [presence, setPresence] = useState(() => {
    return localStorage.getItem('sherly_presence') || 'ONLINE'; // 'ONLINE' | 'TYPING' | 'OFFLINE'
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const messagesEndRef = useRef(null);
  const silenceTimer = useRef(null);
  const chatContainerRef = useRef(null);
  
  const latestMessages = useRef(messages);
  
  // Sinkronisasi memori ke LocalStorage setiap ada perubahan
  useEffect(() => {
    latestMessages.current = messages;
    localStorage.setItem('sherly_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('sherly_presence', presence);
  }, [presence]);

  const scrollToBottom = () => {
    // Only scroll if we are already somewhat near the bottom,
    // so we don't snap away when user scrolls up to read history.
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTypingLocal]);

  // Menggunakan Google TTS Audio Web
  const speakText = (text) => {
    return new Promise((resolve) => {
      const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\*\|]/gu, '').trim();
      if (!cleanText) return resolve();

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id-ID&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(url);
      
      const failsafeTimer = setTimeout(() => {
        resolve();
      }, (cleanText.length * 90) + 2000);

      audio.onended = () => { clearTimeout(failsafeTimer); resolve(); };
      audio.onerror = () => { clearTimeout(failsafeTimer); resolve(); };
      audio.play().catch(() => { clearTimeout(failsafeTimer); resolve(); });
    });
  };

  // Efek berjalan SATU KALI saat halaman termuat
  useEffect(() => {
    const hasGreeted = sessionStorage.getItem('sherly_greeted');
    if (!hasGreeted) {
      sessionStorage.setItem('sherly_greeted', 'true');
      // Jika ada riwayat, sapa balik.
      // Timeout agar layar sempet render UI dulu.
      setTimeout(() => {
        const currentMsgs = latestMessages.current;
        if (currentMsgs.length > 0) {
          triggerSherlyResponse(currentMsgs, false, true);
        }
      }, 2500);
    }
  }, []);

  const triggerSherlyResponse = async (chatContext, autoTrigger = false, isWelcomeBack = false) => {
    setIsTypingLocal(true);
    setPresence('TYPING');
    try {
      const gptMessages = chatContext.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || '' // safety
      }));
      
      const replies = await fetchSherlyResponse(gptMessages, autoTrigger, isWelcomeBack);
      
      setIsTypingLocal(false);
      setPresence('ONLINE');
      
      for (const reply of replies) {
        // Logika Deteksi Offline "Cringe"
        if (reply.includes('[OFFLINE]')) {
          setPresence('OFFLINE');
          return; // Hentikan membalas
        }

        setPresence('TYPING');
        setIsTypingLocal(true);
        const typeDelay = Math.min(Math.max(reply.length * 30, 800), 2000);
        await new Promise(r => setTimeout(r, typeDelay));
        setIsTypingLocal(false);
        setPresence('ONLINE');
        
        setMessages(prev => [...prev, { text: reply, sender: 'sherly' }]);
        
        // Timeout sedikit biar UI merender bubble dulu sebelum disuarakan
        await new Promise(r => setTimeout(r, 50)); 
        await speakText(reply);
        
        await new Promise(r => setTimeout(r, 600));
      }
      
    } catch (err) {
      console.error(err);
      setIsTypingLocal(false);
      setPresence('ONLINE');
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Paksa aktif (bangunkan dari status Offline)
    if (presence === 'OFFLINE') {
      setPresence('ONLINE');
    }

    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    const newUserMsg = { text: inputValue, sender: 'user' };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInputValue('');
    
    // Auto scroll keras ke bawah setiap kita klik send
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    if (isAsking(newUserMsg.text)) {
      triggerSherlyResponse(newHistory, false);
    } else {
      silenceTimer.current = setTimeout(() => {
        const currentMsgs = latestMessages.current;
        if (currentMsgs.length > 0 && currentMsgs[currentMsgs.length - 1].sender === 'user') {
          // Hanya nge-spam otomatis jika dia statusnya Online (kalau Offline, dia beneran cuek mati)
          if (localStorage.getItem('sherly_presence') !== 'OFFLINE') {
            triggerSherlyResponse(currentMsgs, true);
          }
        }
      }, 15000); 
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="chat-container">
      <div className="header">
        <div className="header-top">
          <h2>SHERLY.AI</h2>
          <div className="status-container">
            <span className={`status-dot ${presence.toLowerCase()}`}></span>
            {presence === 'TYPING' ? 'TYPING' : presence}
          </div>
        </div>
        {presence === 'TYPING' && (
          <div className="typing-text">Sherly is replying...</div>
        )}
      </div>
      
      <div className="chat-section">
        <div className="messages" ref={chatContainerRef}>
          {messages.length === 0 && (
             <div className="empty-state">Secure Connection Established. Start Interaction.</div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-sherly'}`}>
              {msg.text}
            </div>
          ))}
          {isTypingLocal && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area">
          <input 
            type="text" 
            className="chat-input" 
            placeholder={presence === 'OFFLINE' ? "SHE IS IGNORING YOU..." : "TYPE YOUR MESSAGE..."} 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-button" onClick={handleSend} aria-label="Send">
            &#8593;
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
