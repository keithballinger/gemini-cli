import React, { useState, useRef, useEffect } from 'react';
import { VirtualFileSystem } from '../core/VirtualFileSystem';
import { BrowserGeminiService } from '../core/BrowserGeminiService';

interface ChatInterfaceProps {
  vfs: VirtualFileSystem;
}

export function ChatInterface({ vfs }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [geminiService, setGeminiService] = useState<BrowserGeminiService | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check if API key is stored in localStorage
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      initializeService(storedKey);
    }
  }, [vfs]);

  const initializeService = async (key: string) => {
    try {
      console.log('Attempting to initialize with API key:', key.substring(0, 10) + '...');
      const service = new BrowserGeminiService({ apiKey: key.trim(), vfs });
      await service.initialize();
      setGeminiService(service);
      setShowApiKeyInput(false);
      setInitError(null);
    } catch (error) {
      setInitError(error instanceof Error ? error.message : 'Failed to initialize');
      console.error('Failed to initialize:', error);
    }
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    localStorage.setItem('gemini_api_key', apiKey);
    await initializeService(apiKey);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !geminiService) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await geminiService.sendMessage(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="chat-interface">
      {showApiKeyInput ? (
        <div className="api-key-container">
          <h2>Enter Gemini API Key</h2>
          <p>You need a Gemini API key to use this chat. Get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</p>
          <form onSubmit={handleApiKeySubmit} className="api-key-form">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="api-key-input"
            />
            <button type="submit" disabled={!apiKey.trim()} className="api-key-button">
              Start Chatting
            </button>
          </form>
          {initError && (
            <div className="error-message">
              {initError}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="loading-indicator">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Gemini something..."
              className="chat-input"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="send-button">
              Send
            </button>
            <button 
              type="button" 
              onClick={() => {
                localStorage.removeItem('gemini_api_key');
                setShowApiKeyInput(true);
                setGeminiService(null);
                setMessages([]);
              }}
              className="clear-key-button"
              title="Clear API Key"
            >
              ⚙️
            </button>
          </form>
        </>
      )}
    </div>
  );
}