import { useState, useEffect, useCallback, type FormEvent, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiKey, setApiKey, removeApiKey, streamChat, hasBackendAvailable, type ChatMessage } from "../lib/ai";
import { getMentalist, getSelectedMentalistId, setSelectedMentalistId, MENTALISTS, type Mentalist } from "../lib/mentalists";
import MentalistSelector from "../components/MentalistSelector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ────────── Settings Modal ────────── */
function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  setHasKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setHasKey: Dispatch<SetStateAction<boolean>>;
}) {
  const [key, setKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-deep-purple border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <h2 className="font-display text-lg text-white mb-1">Settings</h2>
        <p className="text-ghost text-xs mb-5 leading-relaxed">
          Enter your{" "}
          <a
            href="https://openrouter.ai/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            OpenRouter API key
          </a>{" "}
          to connect with the mentalist. Your key stays in your browser only.
        </p>

        <div className="relative mb-4">
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-ghost/40 outline-none focus:border-gold/40 transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost/50 hover:text-ghost text-xs"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (key.trim()) {
                setApiKey(key.trim());
                setHasKey(true);
              } else {
                removeApiKey();
                setHasKey(false);
              }
              onClose();
            }}
            className="flex-1 py-2.5 bg-gold/20 hover:bg-gold/30 text-gold text-sm rounded-xl border border-gold/20 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-ghost text-sm rounded-xl border border-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>

        {apiKey && (
          <button
            onClick={() => {
              removeApiKey();
              setHasKey(false);
              setKey("");
            }}
            className="w-full mt-2 py-2 text-red-400/70 hover:text-red-400 text-xs transition-colors"
          >
            Remove API key
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ────────── Chat Page ────────── */
export default function ChatPage() {
  const [selectedMentalistId, setSelectedMentalistIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasKey, setHasKey] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMentalistMenu, setShowMentalistMenu] = useState(false);
  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load selected mentalist on mount
  useEffect(() => {
    const saved = getSelectedMentalistId();
    if (saved) {
      setSelectedMentalistIdState(saved);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const element = document.querySelector('[data-messages-end]');
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const handleMentalistSelect = (id: string) => {
    setSelectedMentalistId(id);
    setSelectedMentalistIdState(id);
    setMessages([]);
    setHasStarted(false);
    setShowMentalistMenu(false);
  };

  const mentalist = selectedMentalistId ? getMentalist(selectedMentalistId) : null;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Only require API key if no backend is available
      if (!hasBackendAvailable() && !getApiKey()) {
        setShowSettings(true);
        return;
      }

      setHasStarted(true);
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const apiMessages: ChatMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulated = "";

      await streamChat(
        apiMessages,
        (chunk) => {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        },
        () => {
          setIsLoading(false);
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: error } : m
            )
          );
          setIsLoading(false);
        },
        selectedMentalistId
      );
    },
    [isLoading, messages, selectedMentalistId]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Show selector if no mentalist selected yet
  if (!selectedMentalistId || !mentalist) {
    return <MentalistSelector onSelect={handleMentalistSelect} />;
  }

  return (
    <div className="h-full flex flex-col bg-midnight relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-20"
          style={{
            background: "radial-gradient(ellipse, #2d1b4e 0%, transparent 70%)",
            animation: "nebula-drift 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-15"
          style={{
            background: "radial-gradient(ellipse, #1a1025 0%, transparent 70%)",
            animation: "nebula-drift 25s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[80px] opacity-10"
          style={{
            background: "radial-gradient(ellipse, #d4a85322 0%, transparent 70%)",
            animation: "pulse-glow 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-midnight/80 backdrop-blur-xl">
        <div className="relative">
          <img
            src={mentalist.avatarUrl}
            alt={mentalist.name}
            className="w-10 h-10 rounded-full object-cover ring-2"
            style={{ ringColor: `${mentalist.themeColor}60` }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-midnight" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-display font-semibold text-white tracking-wide">
            {mentalist.name}
          </h1>
          <p className="text-[11px] font-body">
            <span style={{ color: `${mentalist.themeColor}CC` }}>
              {mentalist.title}
            </span>
            <span className="text-ghost/50"> • </span>
            <span className="text-emerald-500">Online</span>
          </p>
        </div>
        <button
          onClick={() => setShowMentalistMenu(!showMentalistMenu)}
          className="p-2.5 rounded-lg hover:bg-[#fbbf24]/10 transition-colors group active:bg-[#fbbf24]/20"
          title="Switch Mentalist"
        >
          <svg
            className="w-6 h-6"
            style={{ color: '#fbbf24', stroke: '#fbbf24' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Mentalist Menu Dropdown */}
      <AnimatePresence>
        {showMentalistMenu && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 right-4 z-50 bg-deep-purple border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-64"
          >
            <div className="p-2">
              <p className="text-xs text-ghost/60 px-3 py-2 font-medium">Switch Mentalist</p>
              {Object.values(MENTALISTS).map((mentalistData) => (
                <button
                  key={mentalistData.id}
                  onClick={() => handleMentalistSelect(mentalistData.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    selectedMentalistId === mentalistData.id
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <img
                    src={mentalistData.avatarUrl}
                    alt={mentalistData.name}
                    className="w-8 h-8 rounded-full object-cover ring-1"
                    style={{ ringColor: `${mentalistData.themeColor}60` }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm text-white font-medium">{mentalistData.name}</p>
                    <p className="text-[10px] text-ghost/60">{mentalistData.title}</p>
                  </div>
                  {selectedMentalistId === mentalistData.id && (
                    <svg
                      className="w-4 h-4"
                      style={{ color: mentalistData.themeColor }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {!hasStarted && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              >
                <img
                  src={mentalist.avatarUrl}
                  alt={mentalist.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 shadow-2xl mx-auto mb-6"
                  style={{ 
                    ringColor: `${mentalist.themeColor}50`,
                    boxShadow: `0 20px 60px ${mentalist.themeColor}20`
                  }}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-display text-2xl sm:text-3xl font-bold text-white mb-2"
              >
                Welcome
                <br />
                to the <span className="shimmer-text">Mind's Eye</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-ghost text-sm sm:text-base max-w-md mb-8 font-light leading-relaxed"
              >
                {mentalist.tagline}
              </motion.p>


              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-2 gap-2 sm:gap-3 max-w-sm w-full"
              >
                {mentalist.starterPrompts.map((prompt, i) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2.5 text-xs sm:text-sm border rounded-xl bg-white/[0.03] backdrop-blur-sm transition-colors font-body"
                    style={{
                      color: `${mentalist.themeColor}DD`,
                      borderColor: `${mentalist.themeColor}30`,
                    }}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index === messages.length - 1 ? 0.05 : 0,
              }}
              className={`flex gap-3 mb-4 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <img
                  src={mentalist.avatarUrl}
                  alt={mentalist.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 flex-shrink-0 mt-0.5"
                  style={{ ringColor: `${mentalist.themeColor}50` }}
                />
              )}
              <div
                className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-body ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-gold/20 to-gold/10 text-white border border-gold/20 rounded-br-md"
                    : "bg-white/[0.05] text-silver border border-white/[0.06] rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" && !msg.content && isLoading ? (
                  <div className="flex items-center gap-1 py-1">
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gold/60 inline-block" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gold/60 inline-block" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gold/60 inline-block" />
                  </div>
                ) : (
                  <div className="chat-message-content whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mystic-purple to-deep-purple flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                  <span className="text-xs text-gold/80">You</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} data-messages-end />
      </div>

      {/* Input area */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-t border-white/[0.06] bg-midnight/80 backdrop-blur-xl">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 focus-within:border-gold/30 transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the mentalist anything..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-ghost/50 outline-none font-body disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-purple-600/30 disabled:opacity-30 transition-all relative"
            style={{
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}
          >
            <svg
              className="w-6 h-6"
              style={{ color: '#fbbf24' }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-ghost/30 text-center mt-2 font-body">
          Powered by the mind ✦ Inspired by {mentalist.name}
        </p>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            apiKey={getApiKey() || ""}
            setHasKey={setHasKey}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
