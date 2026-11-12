import React, { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { bot } from '../api';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

export default function Chat({ lang }) {
  const [phone,    setPhone]    = useState('');
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [started,  setStarted]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const push = (msg) => setMessages(prev => [...prev, msg]);

  const processReplies = (replies) => {
    for (const r of replies) {
      push({ from: 'bot', ...r });
    }
  };

  const send = async (textOverride, buttonIdOverride) => {
    const text     = textOverride  ?? input.trim();
    const buttonId = buttonIdOverride ?? undefined;

    if (!text && !buttonId) return;
    if (!phone) return;

    if (text) push({ from: 'user', type: 'text', body: text });
    setInput('');
    setLoading(true);

    try {
      const data = await bot.send({ userKey: phone, text: text || '', buttonId: buttonId || null });
      processReplies(data.replies || []);
    } catch (err) {
      push({ from: 'bot', type: 'text', body: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    if (!phone.trim()) return;
    setStarted(true);
    setMessages([]);
    setLoading(true);
    try {
      const data = await bot.send({ userKey: phone, text: 'menu' });
      processReplies(data.replies || []);
    } catch (err) {
      push({ from: 'bot', type: 'text', body: 'Could not connect. Check server.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setMessages([]);
    if (phone && started) {
      setLoading(true);
      try {
        const data = await bot.send({ userKey: phone, text: 'menu' });
        processReplies(data.replies || []);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-sm mx-auto px-2 py-4 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Phone setup */}
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Chat Assistant</h1>
            <p className="text-sm text-slate-400 mt-2">Try VouchPass through a WhatsApp-style chat</p>
          </div>
          <div className="w-full space-y-3">
            <input
              type="tel"
              placeholder="+237700000000 (or any number)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={start}
              disabled={!phone.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]"
            >
              Start Chat
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-800">VouchPass Assistant</p>
              <p className="text-xs text-slate-400">{phone}</p>
            </div>
            <button onClick={reset} className="p-2 text-slate-400 hover:text-slate-600 min-h-[44px]" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-2 px-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.from === 'user'
                  ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm'
                  : 'bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 space-y-3'
                }`}>
                  {/* Text body */}
                  {msg.body && <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>}

                  {/* Buttons */}
                  {msg.type === 'buttons' && msg.options && (
                    <div className="flex flex-col gap-2 mt-1">
                      {msg.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => send('', opt.id)}
                          disabled={loading}
                          className="w-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold py-2.5 rounded-xl min-h-[44px] transition-colors"
                        >
                          {opt.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* List (bottom sheet style on mobile, inline here) */}
                  {msg.type === 'list' && msg.options && (
                    <div className="flex flex-col gap-1.5 mt-1 max-h-48 overflow-y-auto">
                      {msg.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => send('', opt.id)}
                          disabled={loading}
                          className="w-full border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-medium py-2.5 rounded-xl min-h-[44px] text-left px-3 transition-colors"
                        >
                          {opt.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
