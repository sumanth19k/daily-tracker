import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Plus, 
  BarChart3,
  Flame,
  TrendingUp,
  Loader2,
  RefreshCcw,
  RefreshCw,
  AlertCircle,
  Target,
  Dumbbell,
  BookOpen,
  Brain,
  Coffee,
  Quote,
  Calendar,
  Zap,
  Power,
  ShieldCheck,
  ZapOff,
  ChevronRight,
  ChevronLeft,
  Medal,
  Activity,
  BrainCircuit,
  Sparkles,
  Lock
} from 'lucide-react';

// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9lJlJCUBH0q1qxfpVH09Gm17Py5b7ueAFyuKQhHWCV4SU-Wez9hO4MDRUQWwuLJURIw/exec".trim(); 
const apiKey = "zSKFn01nBUsB71TwAUJ08O8USbtRkaQMECGphgUw"; 

const SECTIONS = [
  { id: 'Fitness', icon: <Dumbbell size={14} />, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'Education', icon: <BookOpen size={14} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'Behavioral Habits', icon: <Brain size={14} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'Research', icon: <Target size={14} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Recreational', icon: <Coffee size={14} />, color: 'text-rose-500', bg: 'bg-rose-500/10' }
];

const RECURRING_TASKS = [
  { rid: 'B01', name: "Zero Sugar / No Junk Day", category: "Behavioral Habits", points: 20 },
  { rid: 'B02', name: "Wake up before 6:00 AM", category: "Behavioral Habits", points: 20 },
  { rid: 'B03', name: "NF", category: "Behavioral Habits", points: 30 },
  { rid: 'B04', name: "30-Minute Book Reading", category: "Behavioral Habits", points: 20 },
  { rid: 'B05', name: "Posture Check (Desk Work)", category: "Fitness", points: 10 }
];

const App = () => {
  // CSS Injection to ensure Tailwind works in all environments
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const getLocalDateString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('daily'); 
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Fitness');
  const [points, setPoints] = useState(0);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState("");
  const isTodaySelected = selectedDate === todayStr;

  const normalizeIncomingDate = (dateVal) => {
    if (!dateVal) return "";
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).split(' ')[0]; 
      return getLocalDateString(d);
    } catch (e) {
      return String(dateVal).split(' ')[0];
    }
  };

  const navigateDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  const callGemini = async (prompt, systemPrompt) => {
    setAiLoading(true);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const result = await response.json();
      setAiBriefing(result.candidates?.[0]?.content?.parts?.[0]?.text || "Strategic link error.");
    } catch (err) {
      setAiBriefing("Intelligence engine offline.");
    } finally {
      setAiLoading(false);
    }
  };

  const getStrategicBriefing = () => {
    const pendingTasks = tasks
      .filter(t => normalizeIncomingDate(t.date) === selectedDate && t.status !== 'Completed')
      .map(t => t.name)
      .join(", ");

    if (!pendingTasks) {
      setAiBriefing("Sector clear. Target objectives eliminated.");
      return;
    }

    const systemPrompt = "You are 'Friday', a military-grade AI strategist for a high-performing scholar. Tone: Cold, elite, ultra-efficient. 50 words max.";
    const prompt = `Pending Quests: [${pendingTasks}]. Deliver high-intensity tactical briefing.`;
    callGemini(prompt, systemPrompt);
  };

  const fetchData = useCallback(async () => {
    if (!SCRIPT_URL) return;
    try {
      setLoading(true);
      const response = await fetch(SCRIPT_URL, { redirect: 'follow' });
      const data = await response.json();
      
      if (data && data.tasks) {
        const taskMap = new Map();
        data.tasks.forEach(t => {
          if (t.id) {
            const dateKey = normalizeIncomingDate(t.date);
            const uniqueKey = `${t.id}-${dateKey}`;
            const normalizedTask = { ...t, date: dateKey };
            
            const nameLower = (t.name || "").toLowerCase();
            const catLower = (t.category || "").toLowerCase();
            if (catLower === 'behavioral' || nameLower.includes("nf") || nameLower.includes("sugar") || nameLower.includes("wake up")) {
              normalizedTask.category = "Behavioral Habits";
            }

            taskMap.set(uniqueKey, normalizedTask);
          }
        });
        
        setTasks(Array.from(taskMap.values()));
        setPoints(data.totalPoints || 0);
      }
    } catch (err) {
      setError("Sync Connection Lost");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const addTask = async (manualTask = null) => {
    if (!isTodaySelected && !manualTask) return;

    const t = manualTask || { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
      name: newTaskName, 
      category: selectedCategory, 
      status: "Pending", 
      points: 20, 
      date: selectedDate 
    };

    if (!t.name.trim()) return;
    
    setTasks(prev => [t, ...prev]);
    if (!manualTask) setNewTaskName('');
    
    setSyncing(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'add', task: t })
      });
    } catch (e) {
      setError("Database Update Failed");
    } finally {
      setSyncing(false);
    }
  };

  const startProtocol = async () => {
    const dateTasks = tasks.filter(t => normalizeIncomingDate(t.date) === selectedDate);
    const existingNames = dateTasks.map(t => t.name.toLowerCase().trim());
    
    const tasksToAdd = RECURRING_TASKS.filter(rt => !existingNames.includes(rt.name.toLowerCase().trim()));
    if (tasksToAdd.length === 0) return;

    for (const rt of tasksToAdd) {
      const newTask = { 
        ...rt, 
        id: `protocol-${rt.rid}-${selectedDate}`, 
        status: 'Pending', 
        date: selectedDate 
      };
      await addTask(newTask);
    }
  };

  const toggleTask = async (taskId) => {
    if (!isTodaySelected) return;

    const task = tasks.find(t => t.id.toString() === taskId.toString() && normalizeIncomingDate(t.date) === selectedDate);
    if (!task) return;

    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    setTasks(prev => prev.map(t => (t.id.toString() === taskId.toString() && normalizeIncomingDate(t.date) === selectedDate) ? { ...t, status: newStatus } : t));
    
    setSyncing(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'toggle', id: taskId, status: newStatus })
      });
    } catch (e) {
      setError("Toggle Failed");
    } finally {
      setSyncing(false);
    }
  };

  const isProtocolActive = useMemo(() => {
    const dateNames = tasks.filter(t => normalizeIncomingDate(t.date) === selectedDate).map(t => t.name?.toLowerCase().trim());
    return RECURRING_TASKS.every(rt => dateNames.includes(rt.name.toLowerCase().trim()));
  }, [tasks, selectedDate]);

  const groupedTasks = useMemo(() => {
    const filtered = tasks.filter(t => normalizeIncomingDate(t.date) === selectedDate);
    
    return SECTIONS.reduce((acc, s) => {
      acc[s.id] = filtered.filter(t => {
        const tCat = (t.category || '').toLowerCase().trim();
        const sCat = s.id.toLowerCase().trim();
        return tCat === sCat || (sCat === 'behavioral habits' && (tCat === 'behavioral' || tCat === 'behavioral habits'));
      });
      return acc;
    }, {});
  }, [tasks, selectedDate]);

  const stats = useMemo(() => {
    const currentLevel = Math.floor(points / 500) + 1;
    const progressXP = points % 500;
    
    const dates = new Set(tasks.filter(t => t.status === 'Completed').map(t => normalizeIncomingDate(t.date)));
    let streak = 0; let d = new Date();
    while(dates.has(getLocalDateString(d))) { streak++; d.setDate(d.getDate()-1); }

    const last30 = Array.from({length: 30}, (_, i) => {
      const day = new Date(); day.setDate(day.getDate() - (29-i));
      const ds = getLocalDateString(day);
      const count = tasks.filter(t => normalizeIncomingDate(t.date) === ds && t.status === 'Completed').length;
      return { date: ds, intensity: Math.min(count, 4) };
    });

    // Level-based titles for motivation
    let rank = "INITIATE RECRUIT";
    if (currentLevel === 2) rank = "DISCIPLINED OPERATIVE";
    if (currentLevel === 3) rank = "VANGUARD AGENT";
    if (currentLevel === 4) rank = "SPECIALIST OPERATOR";
    if (currentLevel >= 5) rank = "ELITE WARRIOR";
    if (currentLevel >= 10) rank = "SUPREME COMMANDER";

    return { currentLevel, progressXP, streak, last30, rank };
  }, [tasks, points]);

  if (loading && tasks.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
      <Loader2 className="animate-spin text-blue-500 w-12 h-12 mb-4" />
      <p className="font-black tracking-widest text-[10px] uppercase italic">Aligning Mission Clock...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto shadow-2xl pb-32 flex flex-col pt-[env(safe-area-inset-top)] relative font-sans text-slate-900">
      
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[100] bg-red-600 text-white p-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 rounded-2xl">
          <div className="flex items-center gap-2 px-2">
            <AlertCircle size={14} />
            <span className="text-[9px] font-black uppercase tracking-wider">{error}</span>
          </div>
          <button onClick={fetchData} className="p-1"><RefreshCcw size={12} /></button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 bg-slate-900 text-white rounded-b-[3.5rem] shadow-2xl border-b border-blue-500/20">
        <div className="flex justify-between items-center mb-6 mt-2">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-blue-400 italic">FRIDAY OS</h1>
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
               <p className="text-slate-400 text-[8px] uppercase tracking-widest font-bold">
                {isTodaySelected ? 'Live Mission' : 'History Link'}
               </p>
            </div>
          </div>
          <div className="bg-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-inner">
            <Trophy className="text-amber-400 w-4 h-4" />
            <span className="font-black text-amber-400 text-xl tracking-tighter">{points}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white/5 rounded-2xl p-1.5 flex items-center justify-between border border-white/10 mb-2">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ChevronLeft size={20} className="text-blue-400" />
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedDate(todayStr)}>
            <Calendar size={14} className={isTodaySelected ? "text-blue-400" : "text-slate-400"} />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">
              {isTodaySelected ? "Today" : selectedDate}
            </span>
          </div>

          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ChevronRight size={20} className="text-blue-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {view === 'daily' && (
          <>
            {/* Gemini Briefing */}
            <div className="space-y-3">
              <button 
                onClick={getStrategicBriefing}
                disabled={aiLoading}
                className="w-full bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-between group shadow-xl active:scale-95 transition-all border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                  </div>
                  <div className="text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Tactical Briefing</h4>
                    <p className="text-[7px] font-bold uppercase text-blue-100/60">Analyze active cycle</p>
                  </div>
                </div>
                <Sparkles size={14} className="text-white animate-pulse" />
              </button>

              {aiBriefing && (
                <div className="bg-slate-900 text-white p-5 rounded-[2.2rem] border-2 border-blue-500/30 animate-in zoom-in-95 duration-300 relative shadow-2xl">
                  <div className="flex gap-3 items-start">
                      <div className="mt-1 bg-blue-500/20 p-1.5 rounded-lg text-blue-400"><Target size={14} /></div>
                      <p className="text-xs font-bold italic leading-relaxed text-blue-50 pr-4">{aiBriefing}</p>
                  </div>
                  <button onClick={() => setAiBriefing("")} className="absolute top-4 right-4 text-white/40">×</button>
                </div>
              )}
            </div>

            {/* Protocol Init */}
            <button 
              onClick={startProtocol}
              disabled={isProtocolActive || syncing}
              className={`w-full p-4 rounded-[2rem] flex items-center justify-between shadow-lg transition-all border ${
                isProtocolActive ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-blue-500/30 text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${isProtocolActive ? 'bg-green-500' : 'bg-blue-600'} p-2.5 rounded-xl shadow-sm`}>
                  {isProtocolActive ? <ShieldCheck size={18} className="text-white" /> : <Power size={18} className="text-white" />}
                </div>
                <div className="text-left">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${isProtocolActive ? 'text-slate-600' : 'text-white'}`}>
                    {isProtocolActive ? 'Protocol Active' : 'Initialize Protocol'}
                  </h4>
                  <p className="text-[7px] font-bold uppercase text-slate-400 tracking-tighter">
                    {isProtocolActive ? 'Cycle benchmarks verified.' : 'Trigger recurring mission benchmarks'}
                  </p>
                </div>
              </div>
              {!isProtocolActive && <Zap size={14} className="text-amber-400 animate-pulse" />}
            </button>

            {/* Locked Info */}
            {!isTodaySelected && (
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-[2.2rem] flex items-center gap-4">
                <Lock size={18} className="text-amber-500" />
                <div>
                   <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-tighter leading-none mb-1">Archival State</h4>
                   <p className="text-[7px] font-bold uppercase text-amber-500/60">Modifications locked to live cycle</p>
                </div>
              </div>
            )}

            {/* Input (Live Only) */}
            {isTodaySelected && (
              <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <input 
                    type="text" placeholder="Identify new target..." className="bg-transparent outline-none flex-1 px-4 py-1 text-sm font-bold"
                    value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  />
                  <button onClick={() => addTask()} className="bg-slate-900 text-white p-3 rounded-xl active:scale-95 transition-all"><Plus size={18} /></button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setSelectedCategory(s.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedCategory === s.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                      {s.id.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Task Render */}
            {SECTIONS.map(s => {
              const secTasks = groupedTasks[s.id] || [];
              if (secTasks.length === 0 && s.id !== 'Behavioral Habits') return null;
              
              return (
                <div key={s.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <div className={`${s.bg} ${s.color} p-2 rounded-xl`}>{s.icon}</div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.id}</h3>
                  </div>
                  <div className="space-y-3">
                    {secTasks.map(t => (
                      <div 
                        key={`${t.id}-${t.date}`} 
                        onClick={() => toggleTask(t.id)} 
                        className={`flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all ${!isTodaySelected ? 'opacity-70 bg-slate-50 border-slate-100 cursor-default' : 'bg-white border-transparent shadow-sm active:scale-98 cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${t.status === 'Completed' ? 'bg-green-500 shadow-md shadow-green-200' : 'bg-slate-200'}`}>
                            {t.status === 'Completed' && <CheckCircle2 className="text-white w-3 h-3" />}
                          </div>
                          <p className={`text-[13px] font-bold leading-tight ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                        </div>
                        <span className={`text-[9px] font-black ${t.status === 'Completed' ? 'text-green-600' : 'text-slate-300'}`}>+{t.points} XP</span>
                      </div>
                    ))}
                    {secTasks.length === 0 && (
                      <div className="py-8 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                        <ZapOff size={20} className="text-slate-300 mb-1" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Sector Ready</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {view === 'stats' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 text-slate-900">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                <Calendar size={14} className="text-blue-500" />Execution Matrix
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {stats.last30.map((d, i) => (
                  <div key={i} className={`aspect-square rounded-lg transition-all ${d.intensity === 0 ? 'bg-slate-100' : d.intensity === 1 ? 'bg-blue-200' : d.intensity === 2 ? 'bg-blue-400' : d.intensity === 3 ? 'bg-blue-600' : 'bg-blue-900 shadow-[0_0_8px_rgba(30,64,175,0.2)]'}`} title={d.date} />
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'rank' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8">
            <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border-t border-white/10">
              <Flame className="absolute -right-8 -bottom-8 w-40 h-40 text-blue-500/10 rotate-12" />
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Evolution Protocol</p>
              <h2 className="text-3xl font-black mb-6 italic tracking-tighter uppercase text-blue-50">
                {stats.rank}
              </h2>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(stats.progressXP / 500) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-5 text-[10px] uppercase font-black">
                <p className="text-slate-500">LEVEL {stats.currentLevel}</p>
                <p className="text-blue-400">{500 - stats.progressXP} XP TO ADVANCE</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-7 rounded-[2.5rem] text-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><TrendingUp className="text-orange-500" /></div>
                <p className="text-3xl font-black">{stats.streak}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Streak</p>
              </div>
              <div className="bg-white p-7 rounded-[2.5rem] text-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Medal className="text-blue-500" /></div>
                <p className="text-3xl font-black">{points}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lifetime Score</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav Dock */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-slate-900/95 backdrop-blur-xl rounded-[3rem] p-4 flex justify-between items-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 z-50">
        <button onClick={() => setView('daily')} className={`flex-1 flex flex-col items-center py-2 transition-all ${view === 'daily' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}><CheckCircle2 size={22} /><span className="text-[8px] font-black uppercase mt-1">Mission</span></button>
        <button onClick={() => setView('rank')} className={`flex-1 flex flex-col items-center py-2 transition-all ${view === 'rank' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}><Trophy size={22} /><span className="text-[8px] font-black uppercase mt-1">Rank</span></button>
        <button onClick={() => setView('stats')} className={`flex-1 flex flex-col items-center py-2 transition-all ${view === 'stats' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}><BarChart3 size={22} /><span className="text-[8px] font-black uppercase mt-1">Stats</span></button>
      </div>
    </div>
  );
};

export default App;