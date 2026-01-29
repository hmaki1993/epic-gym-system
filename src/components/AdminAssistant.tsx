import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { useGymData } from '../hooks/useData';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini (Replace with your API Key or use env)
const GEN_AI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function AdminAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: 'Hello Admin! I have access to the full gym database. Ask me anything about students, coaches, or finance.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Get live data context
    const gymData = useGymData();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !GEN_AI_KEY) {
            if (!GEN_AI_KEY) alert('Please set VITE_GEMINI_API_KEY in .env');
            return;
        }

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
                You are the AI Assistant for Epic Gym Academy.
                Current System Time: ${new Date().toLocaleString()}
                
                Here is the LIVE Database Context:
                ${JSON.stringify(gymData, null, 2)}

                User Question: "${userMsg}"

                Instructions:
                1. Answer as a professional gym manager.
                2. Use the provided JSON data to answer accurately.
                3. If asking for lists, summarize or give top 5.
                4. Be concise and helpful.
                5. If you calculate something (like revenue), explain how.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error accessing the AI service.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 animate-bounce-slow"
            >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                <Bot className="w-8 h-8 relative z-10" />
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-300 shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col
            ${isMinimized
                ? 'bottom-6 right-6 w-72 h-14 rounded-full cursor-pointer'
                : 'bottom-6 right-6 w-[90vw] md:w-96 h-[600px] max-h-[80vh] rounded-2xl'
            }`}
        >
            {/* Header */}
            <div
                className="bg-gradient-to-r from-secondary to-slate-800 p-4 flex items-center justify-between text-white cursor-pointer"
                onClick={() => isMinimized && setIsMinimized(false)}
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold">Admin AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-white/10 p-1 rounded">
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    {!isMinimized && (
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto" ref={scrollRef}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-primary text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.role === 'model' && <Bot className="w-4 h-4 mb-2 text-primary opacity-50" />}
                                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span className="text-xs text-gray-400">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about students, revenue..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="p-2 bg-gradient-to-r from-primary to-pink-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
