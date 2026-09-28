import { FormEvent, KeyboardEvent, useRef, useState, Dispatch, SetStateAction, useEffect } from "react";
import ReactMarkdown from "react-markdown";

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

function PatientScreen({ messages, setMessages, summary, setSummary }: { messages: Message[], setMessages: Dispatch<SetStateAction<Message[]>>, summary: SummaryData, setSummary: Dispatch<SetStateAction<SummaryData>> }) {
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(Math.max(...initialMessages.map(m => m.id)) + 1);

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();

    if (!text || isLoading) return;

    // Add user message immediately
    const userMessage: Message = { id: nextId.current++, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsLoading(true);
    scrollToLatest();

    try {
      // Import and initialize the SDK client
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      const interaction = await client.interactions.create({
        agent: "antigravity-preview-09-2026",
        environment: "d87c84b1a4bbfa4d92ff117ab0819040",
        input: text,
      });

      const assistantMessage: Message = { id: nextId.current++, role: "assistant", text: interaction.output_text };
      setMessages((current) => [...current, assistantMessage]);
      
      // Dynamically generate the summary in the background
      // Dynamically generate the summary in the background with automatic retries for high demand (503)
      setIsSummarizing(true);
      
      const historyText = messages.concat([userMessage, assistantMessage])
        .map(m => `${m.role}: ${m.text}`)
        .join('\n');
        
      const patientHistory = "Oct 12, 2023 - Annual Physical (All vitals normal). Jun 04, 2022 - Urgent Care Visit (Treated for minor sprain).";
      
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      
      while (attempt < maxRetries && !success) {
        try {
          const summaryRes = await client.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `Summarize this medical triage conversation into JSON. 
            
Patient's Known Past Medical History: ${patientHistory}

Instructions:
- Analyze the present conversation alongside the past medical history.
- Determine the priority level.
- List the key symptoms and issues (combining both past and present context if relevant).
- Formulate possible causes based on the intersection of past and present issues.
- Provide a short summary of current clinical literature or PubMed recommendations related to the possible causes.

Return ONLY valid JSON matching this schema: {"priority": "High Priority" | "Medium Priority" | "Low Priority", "symptoms": ["array", "of", "strings"], "possibleCauses": "string", "pubmedRecommendations": "string"} 

Conversation:
${historyText}`,
          });
          
          const rawText = summaryRes.text || "";
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            setSummary(JSON.parse(jsonMatch[0]));
            success = true;
          } else {
            console.error("Invalid summary format received from AI:", rawText);
            alert("Symptom summary AI returned invalid format. Check console.");
            break; // Don't retry on formatting errors
          }
        } catch (summaryError: any) {
          const status = summaryError?.status || summaryError?.response?.status || 500;
          const isRateLimit = status === 429 || status === 503 || status === "UNAVAILABLE";
          
          attempt++;
          if (isRateLimit && attempt < maxRetries) {
            console.warn(`Summary generation high demand (Attempt ${attempt}). Retrying in 2 seconds...`);
            await new Promise(res => setTimeout(res, 2000 * attempt)); // Exponential backoff: 2s, 4s...
          } else {
            console.error("Failed to generate dynamic summary", summaryError);
            alert(`Summary generation failed: ${summaryError?.message || 'Unknown error'}`);
            break;
          }
        }
      }
      setIsSummarizing(false);

    } catch (error: any) {
      console.error("Failed to query agent:", error);
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: `Connection failed: ${error?.message || 'Unknown error'}. (Check your browser console for more details)` },
      ]);
    } finally {
      setIsLoading(false);
      scrollToLatest();
    }
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
            Hello! I'm your medical AI assistant. I can help you identify
            symptoms, provide general health information, and suggest next
            steps. How can I help you today?
          </p>
        </div>

        {messages.map((message) => (
          <div className={`message-row ${message.role}`} key={message.id}>
            <div className="message-bubble markdown-body"><ReactMarkdown>{message.text}</ReactMarkdown></div>
          </div>
        ))}

        <section className="summary-card" aria-label="Symptom summary">
          <div className="summary-heading">
            <p className="summary-title">Symptom Summary {isSummarizing && <span className="text-xs font-normal text-gray-500 animate-pulse ml-2">Updating...</span>}</p>
            <span className="priority-badge" style={{
              color: summary.priority === 'High Priority' ? '#dc2626' : summary.priority === 'Medium Priority' ? '#ea580c' : '#16a34a',
              backgroundColor: summary.priority === 'High Priority' ? '#fef2f2' : summary.priority === 'Medium Priority' ? '#fff7ed' : '#f0fdf4',
            }}>{summary.priority}</span>
          </div>
          <div className="symptom-list">
            {summary.symptoms.map((symptom) => (
              <div className="symptom" key={symptom}>
                <img alt="" src={`${assetPath}/d2463.svg`} />
                <p>{symptom}</p>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="possible-causes">
            <p className="causes-title">Possible Causes:</p>
            <p>{summary.possibleCauses}</p>
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

function ProviderScreen({ messages, summary }: { messages: Message[], summary: SummaryData }) {
  return (
    <div className="flex h-dvh bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 hidden md:flex">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">HealthProvider</h2>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1 tracking-wider">Dashboard</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Active Patients</p>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer shadow-sm relative">
              <div className="absolute w-2 h-2 rounded-full bg-blue-500 top-4 right-3 animate-pulse"></div>
              <p className="font-semibold text-blue-900">Jane Doe</p>
              <p className="text-xs text-blue-700 mt-1">AI Triage Complete</p>
            </div>
          </div>
          <div className="px-3">
            <div className="p-3 rounded-lg border border-transparent hover:bg-gray-50 cursor-pointer transition-colors">
              <p className="font-medium text-gray-700">John Smith</p>
              <p className="text-xs text-gray-500 mt-1">Follow-up Review</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent hover:bg-gray-50 cursor-pointer transition-colors">
              <p className="font-medium text-gray-700">Maria Garcia</p>
              <p className="text-xs text-gray-500 mt-1">Lab Results</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">Jane Doe</h1>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">Online</span>
            </div>
            <p className="text-gray-500 text-sm font-medium">DOB: 1991-05-14 (Age 32) &nbsp;&bull;&nbsp; Female &nbsp;&bull;&nbsp; MRN: 9482-104</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            Start Telehealth Visit
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 flex flex-col xl:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
               <div className="flex items-center justify-between mb-5">
                 <h3 className="text-lg font-bold text-gray-800">AI Triage Summary</h3>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                   summary.priority === 'High Priority' ? 'bg-red-50 text-red-600 border-red-100' :
                   summary.priority === 'Medium Priority' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                   'bg-green-50 text-green-600 border-green-100'
                 }`}>
                   {summary.priority}
                 </span>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Reported Symptoms</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 font-medium">
                      {summary.symptoms.map((symptom, idx) => (
                        <li key={idx}>{symptom}</li>
                      ))}
                    </ul>
                 </div>
                 <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-xs text-orange-600 uppercase tracking-wider font-semibold mb-2">AI Assessment</p>
                    <p className="text-sm text-gray-800 font-medium">{summary.possibleCauses}</p>
                 </div>
               </div>

               {summary.pubmedRecommendations && (
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p className="text-xs text-blue-800 uppercase tracking-wider font-semibold mb-2">PubMed Clinical Literature Recommendations</p>
                    <div className="text-sm text-gray-800 font-medium markdown-body"><ReactMarkdown>{summary.pubmedRecommendations}</ReactMarkdown></div>
                 </div>
               )}
               
               <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Quick Actions</h3>
               <div className="flex flex-wrap gap-3">
                 <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                   Order Labs
                 </button>
                 <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                   Prescribe Medication
                 </button>
                 <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                   Request In-Person Visit
                 </button>
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-bold text-gray-800 mb-4">Patient History</h3>
               <div className="space-y-4">
                 <div className="flex gap-4 items-start">
                   <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
                   <div>
                     <p className="text-sm font-semibold text-gray-800">Annual Physical</p>
                     <p className="text-xs text-gray-500">Oct 12, 2023 - All vitals normal.</p>
                   </div>
                 </div>
                 <div className="flex gap-4 items-start">
                   <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
                   <div>
                     <p className="text-sm font-semibold text-gray-800">Urgent Care Visit</p>
                     <p className="text-xs text-gray-500">Jun 04, 2022 - Treated for minor sprain.</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="xl:w-[400px] flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[500px]">
              <div className="p-5 border-b border-gray-200 bg-gray-50/50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800">Live AI Chat Transcript</h3>
                <p className="text-xs text-gray-500 mt-1">Real-time sync with patient app</p>
              </div>
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 text-sm">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200'}`}>
                      <p className="text-xs font-bold opacity-50 mb-1 uppercase tracking-wider">{m.role === 'user' ? 'Jane' : 'Triage AI'}</p>
                      <div className="font-medium leading-relaxed markdown-body text-[13px]"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type SummaryData = {
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  symptoms: string[];
  possibleCauses: string;
  pubmedRecommendations?: string;
};

const initialSummary: SummaryData = {
  priority: "High Priority",
  symptoms: ["Persistent headache (3 days)", "Dizziness upon standing", "Sensitivity to light"],
  possibleCauses: "Based on your symptoms, it is recommended to consult a primary care physician. Possible causes may include dehydration, migraines, or sinus pressure.",
  pubmedRecommendations: "Review recent literature on orthostatic hypotension triggers and acute migraine management protocols."
};

// Custom hook to sync state across browser tabs (for smoke and mirrors demo)
function useSharedState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state, key]);

  return [state, setState] as const;
}

export default function App() {
  // Read the mode from the Vite environment variable (injected during build)
  const appMode = import.meta.env.VITE_APP_MODE || "patient";
  const isProviderRoute = window.location.pathname.startsWith('/provider');
  const [messages, setMessages] = useSharedState<Message[]>('demo_messages', initialMessages);
  const [summary, setSummary] = useSharedState<SummaryData>('demo_summary', initialSummary);

  // Show provider screen if explicitly built for it (Docker) OR if navigating to /provider in dev mode
  if (appMode === "provider" || isProviderRoute) {
    return <ProviderScreen messages={messages} summary={summary} />;
  }
  
  return <PatientScreen messages={messages} setMessages={setMessages} summary={summary} setSummary={setSummary} />;
}
