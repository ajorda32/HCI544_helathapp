import { FormEvent, KeyboardEvent, useRef, useState } from "react";

const assetPath = "/assets";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    text: "I've had a persistent headache for 3 days and feel a bit dizzy when I stand up.",
  },
  {
    id: 2,
    role: "assistant",
    text: "I'm sorry to hear that. Can you tell me more about the headache? Is it a sharp pain, a dull ache, or a pressure feeling?",
  },
  {
    id: 3,
    role: "user",
    text: "It's more of a dull ache on the right side of my head.",
  },
  {
    id: 4,
    role: "assistant",
    text: "That helps narrow it down. Have you experienced any fever, blurred vision, or sensitivity to light?",
  },
  {
    id: 5,
    role: "user",
    text: "No fever, but light does bother me a bit.",
  },
  {
    id: 6,
    role: "assistant",
    text: "I'm going to summarize your symptoms and provide some possible causes.",
  },
];

function IconButton({
  icon,
  label,
  className = "",
  disabled = false,
  type = "button",
}: {
  icon: string;
  label: string;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`}
      disabled={disabled}
      type={type}
    >
      <img alt="" src={`${assetPath}/${icon}`} />
    </button>
  );
}

export default function App() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const chatRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(initialMessages.length + 1);

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();

    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text },
    ]);
    setDraft("");
    scrollToLatest();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="chat-screen">
      <header className="app-header">
        <div className="header-left">
          <IconButton icon="8d908.svg" label="Go back" />
          <div className="title-group">
            <p className="app-title">Medical AI Assistant</p>
            <p className="app-subtitle">Symptom Checker</p>
          </div>
        </div>
        <div className="header-actions">
          <IconButton icon="8ea0e.svg" label="Conversation information" />
          <IconButton icon="c927e.svg" label="More options" />
        </div>
      </header>

      <div className="chat-area" ref={chatRef}>
        <div className="system-message">
          <p>
            Hello! I&apos;m your medical AI assistant. I can help you identify
            symptoms, provide general health information, and suggest next
            steps. How can I help you today?
          </p>
        </div>

        {messages.map((message) => (
          <div className={`message-row ${message.role}`} key={message.id}>
            <p className="message-bubble">{message.text}</p>
          </div>
        ))}

        <section className="summary-card" aria-label="Symptom summary">
          <div className="summary-heading">
            <p className="summary-title">Symptom Summary</p>
            <span className="priority-badge">High Priority</span>
          </div>
          <div className="symptom-list">
            {[
              "Persistent headache (3 days)",
              "Dizziness upon standing",
              "Sensitivity to light",
            ].map((symptom) => (
              <div className="symptom" key={symptom}>
                <img alt="" src={`${assetPath}/d2463.svg`} />
                <p>{symptom}</p>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="possible-causes">
            <p className="causes-title">Possible Causes:</p>
            <p>
              Based on your symptoms, it is recommended to consult a primary
              care physician. Possible causes may include dehydration,
              migraines, or sinus pressure.
            </p>
          </div>
        </section>
      </div>

      <form className="input-area" onSubmit={sendMessage}>
        <div className="input-container">
          <IconButton icon="f5c51.svg" label="Add an item" />
          <textarea
            aria-label="Message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your symptoms or questions..."
            rows={1}
            value={draft}
          />
          <IconButton icon="30b85.svg" label="Attach a file" />
          <IconButton
            className="send-button"
            disabled={!draft.trim()}
            icon="f98a0.svg"
            label="Send message"
            type="submit"
          />
        </div>
      </form>
    </main>
  );
}
