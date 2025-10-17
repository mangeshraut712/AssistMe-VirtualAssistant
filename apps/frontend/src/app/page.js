'use client';
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Placeholder for model selector, voice, etc.
  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="logo-button" onClick={() => window.location.reload()}>
              <img src="AssistMe logo.png" alt="AssistMe Logo" className="logo" />
            </button>
          </div>
          <div className="header-center">
            <h1 className="app-name">AssistMe</h1>
          </div>
          <div className="header-right">
            <div className="model-selector">
              <button className="model-button">
                <span className="model-name">Grok-2</span>
                <i className="fas fa-chevron-down"></i>
              </button>
              <div className="model-dropdown">
                {/* Model options here */}
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button" title="Test models">
                <i className="fas fa-chart-bar"></i>
              </button>
              <button className="icon-button" title="Toggle theme">
                <i className="fas fa-moon"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-header">
              <h1>Hello! I'm AssistMe</h1>
              <p>Ask me anything or try these suggestions:</p>
            </div>
            <div className="suggestions">
              <button className="suggestion-button">
                <i className="fas fa-bolt"></i>
                Explain quantum computing
              </button>
              <button className="suggestion-button">
                <i className="fas fa-rocket"></i>
                Write a space story
              </button>
              <button className="suggestion-button">
                <i className="fas fa-brain"></i>
                Latest AI news
              </button>
              <button className="suggestion-button">
                <i className="fas fa-utensils"></i>
                Meal prep ideas
              </button>
            </div>
          </div>
        )}

        <div className="chat-messages" style={{ display: messages.length > 0 ? 'flex' : 'none' }}>
          {/* Messages */}
        </div>

        <div className="message-input-container">
          <div className="message-input-wrapper">
            <textarea
              className="message-input"
              placeholder="Ask me anything..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
            />
            <button className="voice-button" title="Voice input">
              <i className="fas fa-microphone"></i>
            </button>
            <button className="send-button disabled" title="Send message">
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
          <p className="disclaimer">
            AssistMe can make mistakes. Consider checking important information.
          </p>
        </div>
      </main>
    </div>
  );
}
