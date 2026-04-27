import { useState, useEffect, useRef } from 'react';
import './index.css';
import { fetchSherlyResponse } from './api';

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

  // Menggunakan Web Speech API bawaan browser (tidak butuh server/API eksternal)
  const speakText = (text) => {
    return new Promise((resolve) => {
      const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\*\|]/gu, '').trim();
      if (!cleanText || !window.speechSynthesis) return resolve();

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.15;

      // Try to pick a female Indonesian voice if available
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('id'))
        || voices.find(v => v.lang.startsWith('ms')); // Malay fallback
      if (idVoice) utterance.voice = idVoice;

      const failsafeTimer = setTimeout(() => {
        window.speechSynthesis.cancel();
        resolve();
      }, (cleanText.length * 120) + 3000);

      utterance.onend = () => { clearTimeout(failsafeTimer); resolve(); };
      utterance.onerror = () => { clearTimeout(failsafeTimer); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  };

  // Preload voices (some browsers load them async)
  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices();
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Efek berjalan SATU KALI saat halaman termuat
  useEffect(() => {
    const hasGreeted = sessionStorage.getItem('sherly_greeted');
    if (!hasGreeted) {
      sessionStorage.setItem('sherly_greeted', 'true');
      setTimeout(() => {
        const currentMsgs = latestMessages.current;
        if (currentMsgs.length > 0) {
          triggerSherlyResponse(currentMsgs, false, true);
        }
      }, 2500);
    }
  }, []);

  // Global silence timer so she chats proactively after 20 seconds of silence
  useEffect(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    if (!isTypingLocal && presence !== 'OFFLINE' && messages.length > 0) {
      if (messages[messages.length - 1].sender === 'sherly') {
        silenceTimer.current = setTimeout(() => {
          triggerSherlyResponse(latestMessages.current, true);
        }, 20000);
      }
    }
  }, [messages, isTypingLocal, presence]);

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
        if (reply.includes('[OFFLINE]')) {
          setPresence('OFFLINE');
          return; 
        }

        setPresence('TYPING');
        setIsTypingLocal(true);
        const typeDelay = Math.min(Math.max(reply.length * 30, 800), 2000);
        await new Promise(r => setTimeout(r, typeDelay));
        setIsTypingLocal(false);
        setPresence('ONLINE');
        
        setMessages(prev => [...prev, { text: reply, sender: 'sherly' }]);
        
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

    if (presence === 'OFFLINE') {
      setPresence('ONLINE');
    }

    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    const newUserMsg = { text: inputValue, sender: 'user' };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInputValue('');
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    triggerSherlyResponse(newHistory, false);
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
