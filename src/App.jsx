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
  Lock,
  History
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
  // --- STYLING INJECTION ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // --- ROBUST DATE UTILITIES ---
  const getLocalDateString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeIncomingDate = (dateVal) => {
    if (!dateVal) return "";
    const dateStr = String(dateVal).split('T')[0].split(' ')[0]; // Extract YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? dateStr : getLocalDateString(d);
    } catch (e) { return dateStr; }
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

  const navigateDate = (days) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  const calculatePoints = (taskList) => {
    return taskList.reduce((acc, t) => t.status === 'Completed' ? acc + (parseInt(t.points) || 0) : acc, 0);
  };

  const fetchData = useCallback(async () => {
    if (!SCRIPT_URL) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(SCRIPT_URL, { redirect: 'follow' });
      if (!response.ok) throw new Error("Ledger Access Denied");
      const data = await response.json();
      
      if (data && data.tasks) {
        const taskMap = new Map();
        data.tasks.forEach(t => {
          if (t.id) {
            const dateKey = normalizeIncomingDate(t.date);
            const uniqueKey = `${t.id}-${dateKey}`;
            const normalizedTask = { 
              ...t, 
              date: dateKey,
              name: (t.name || "").trim(),
              category: (t.category || "General").trim()
            };
            
            const nameL = normalizedTask.name.toLowerCase();
            if (nameL === "nf" || nameL.includes("zero sugar") || nameL.includes("wake up") || nameL.includes("book reading")) {
              normalizedTask.category = "Behavioral Habits";
            }
            taskMap.set(uniqueKey, normalizedTask);
          }
        });
        
        const uniqueList = Array.from(taskMap.values());
        setTasks(uniqueList);
        setPoints(calculatePoints(uniqueList));
      }
    } catch (err) {
      setError("Database Sync Offline - Using Local Cache");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncToBackend = async (payload) => {
    setSyncing(true);
    try {
      await fetch(SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify(payload)
      });
    } catch (e) {
      setError("CRITICAL: Save Failed. Check connection.");
    } finally {
      setSyncing(false);
    }
  };

  const addTask = async (manualTask = null) => {
    if (!isTodaySelected && !manualTask) return;
    const t = manualTask || { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
      name: newTaskName, category: selectedCategory, status: "Pending", 
      points: 20, date: selectedDate 
    };
    if (!t.name.trim()) return;
    
    setTasks(prev => {
      const updated = [t, ...prev];
      setPoints(calculatePoints(updated));
      return updated;
    });
    if (!manualTask) setNewTaskName('');
    
    await syncToBackend({ action: 'add', task: t });
  };

  const startProtocol = async () => {
    const dateTasks = tasks.filter(t => t.date === selectedDate);
    const existingNames = dateTasks.map(t => t.name.toLowerCase().trim());
    
    const tasksToAdd = RECURRING_TASKS.filter(rt => !existingNames.includes(rt.name.toLowerCase().trim()));
    if (tasksToAdd.length === 0) return;

    for (const rt of tasksToAdd) {
      const newTask = { ...rt, id: `protocol-${rt.rid}-${selectedDate}`, status: 'Pending', date: selectedDate };
      await addTask(newTask);
    }
  };

  const toggleTask = async (taskId) => {
    if (!isTodaySelected) return;
    const taskIndex = tasks.findIndex(t => t.id.toString() === taskId.toString() && t.date === selectedDate);
    if (taskIndex === -1) return;

    const newStatus = tasks[taskIndex].status === 'Completed' ? 'Pending' : 'Completed';
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: newStatus };
    
    setTasks(updatedTasks);
    setPoints(calculatePoints(updatedTasks));

    await syncToBackend({ action: 'toggle', id: taskId, status: newStatus });
  };

  const isProtocolActive = useMemo(() => {
    const dateNames = tasks.filter(t => t.date === selectedDate).map(t => (t.name || "").toLowerCase().trim());
    return RECURRING_TASKS.every(rt => dateNames.includes(rt.name.toLowerCase().trim()));
  }, [tasks, selectedDate]);

  const groupedTasks = useMemo(() => {
    const filtered = tasks.filter(t => t.date === selectedDate);
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
    
    const dates = new Set(tasks.filter(t => t.status === 'Completed').map(t => t.date));
    let streak = 0; let d = new Date();
    while(dates.has(getLocalDateString(d))) { streak++; d.setDate(d.getDate()-1); }

    const last30 = Array.from({length: 30}, (_, i) => {
      const day = new Date(); day.setDate(day.getDate() - (29-i));
      const ds = getLocalDateString(day);
      const count = tasks.filter(t => t.date === ds && t.status === 'Completed').length;
      return { date: ds, intensity: Math.min(count, 4) };
    });

    const categoryConsistency = SECTIONS.map(s => {
      const filtered = tasks.filter(t => {
        const tCat = (t.category || '').toLowerCase().trim();
        const sCat = s.id.toLowerCase().trim();
        return tCat === sCat || (sCat === 'behavioral habits' && (tCat === 'behavioral' || tCat === 'behavioral habits'));
      });
      const completed = filtered.filter(t => t.status === 'Completed').length;
      const total = filtered.length;
      return { ...s, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });

    let rank = "INITIATE RECRUIT";
    if (currentLevel >= 3) rank = "DISCIPLINED AGENT";
    if (currentLevel >= 5) rank = "ELITE WARRIOR";
    if (currentLevel >= 10) rank = "SUPREME COMMANDER";

    return { currentLevel, progressXP, streak, last30, rank, categoryConsistency };
  }, [tasks, points]);

  if (loading && tasks.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-10 text-center">
      <Loader2 className="animate-spin text-blue-500 w-12 h-12 mb-6" />
      <p className="font-black tracking-[0.2em] text-[10px] uppercase italic text-blue-200">Synchronizing OS Integrity...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto shadow-2xl pb-32 flex flex-col pt-[env(safe-area-inset-top)] relative font-sans text-slate-900">
      
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[100] bg-red-600 text-white p-4 flex items-center justify-between shadow-2xl rounded-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
          </div>
          <button onClick={() => {setError(null); fetchData();}} className="bg-white/20 p-2 rounded-lg"><RefreshCcw size={14} /></button>
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
                {syncing ? 'Syncing Ledger...' : (isTodaySelected ? 'Live Mission' : 'Archive Data')}
               </p>
            </div>
          </div>
          <div className="bg-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-inner">
            <Trophy className={`w-4 h-4 ${points > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
            <span className="font-black text-amber-400 text-xl tracking-tighter">{points}</span>
          </div>
        </div>

        {/* Date Controller */}
        <div className="bg-white/5 rounded-2xl p-1.5 flex items-center justify-between border border-white/10 mb-2">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"><ChevronLeft size={22} className="text-blue-400" /></button>
          <div className="flex items-center gap-2" onClick={() => setSelectedDate(todayStr)}>
            <Calendar size={14} className={isTodaySelected ? "text-blue-400" : "text-slate-400"} />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">{isTodaySelected ? "Today" : selectedDate}</span>
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"><ChevronRight size={22} className="text-blue-400" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {view === 'daily' && (
          <>
            <button 
              onClick={startProtocol}
              disabled={isProtocolActive || syncing}
              className={`w-full p-5 rounded-[2.5rem] flex items-center justify-between shadow-xl transition-all border-2 ${
                isProtocolActive 
                ? 'bg-green-500/10 border-green-500/20 cursor-default' 
                : 'bg-slate-900 border-blue-500/30 text-white active:scale-95'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${isProtocolActive ? 'bg-green-500' : 'bg-blue-600'} p-3 rounded-2xl shadow-lg`}>
                  {isProtocolActive ? <ShieldCheck size={20} className="text-white" /> : <Power size={20} className="text-white" />}
                </div>
                <div className="text-left">
                  <h4 className={`text-[11px] font-black uppercase tracking-widest ${isProtocolActive ? 'text-green-600' : 'text-white'}`}>
                    {isProtocolActive ? 'Protocol Verified' : 'Execute Protocol'}
                  </h4>
                  <p className={`text-[7px] font-bold uppercase ${isProtocolActive ? 'text-green-600/60' : 'text-slate-400'}`}>
                    {isProtocolActive ? 'All benchmarks present for today' : 'Initialize Daily Behavioral Benchmarks'}
                  </p>
                </div>
              </div>
              {!isProtocolActive && <Zap size={16} className="text-amber-400 animate-pulse" />}
            </button>

            {!isTodaySelected && (
              <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/20 p-4 rounded-[2.2rem] flex items-center gap-4">
                <Lock size={20} className="text-amber-600" />
                <p className="text-[9px] font-black uppercase text-amber-700 tracking-widest leading-tight">Archival Lock: Read Only Mode Active</p>
              </div>
            )}

            {isTodaySelected && (
              <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="text" placeholder="Identify new target..." className="bg-transparent outline-none flex-1 px-4 py-1 text-sm font-bold placeholder:text-slate-300"
                    value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  />
                  <button onClick={() => addTask()} className="bg-slate-900 text-white p-3 rounded-xl active:scale-90 transition-all shadow-lg"><Plus size={18} strokeWidth={3} /></button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setSelectedCategory(s.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedCategory === s.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                      {s.id.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {SECTIONS.map(s => {
              const secTasks = groupedTasks[s.id] || [];
              if (secTasks.length === 0 && s.id !== 'Behavioral Habits') return null;
              return (
                <div key={s.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <div className={`${s.bg} ${s.color} p-2 rounded-xl shadow-inner`}>{s.icon}</div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{s.id}</h3>
                  </div>
                  <div className="space-y-3">
                    {secTasks.map(t => (
                      <div 
                        key={`${t.id}-${t.date}`} 
                        onClick={() => toggleTask(t.id)} 
                        className={`flex items-center justify-between p-5 rounded-[2.2rem] border-2 transition-all ${!isTodaySelected ? 'opacity-60 bg-slate-50 border-slate-100 cursor-default' : 'bg-white border-transparent shadow-md active:scale-98 cursor-pointer'} ${t.status === 'Completed' ? 'opacity-60 border-slate-100' : 'border-white'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${t.status === 'Completed' ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-slate-200 border-2 border-white shadow-inner'}`}>
                            {t.status === 'Completed' && <CheckCircle2 className="text-white w-4 h-4" />}
                          </div>
                          <p className={`text-[14px] font-bold leading-tight tracking-tight ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                        </div>
                        <span className={`text-[10px] font-black ${t.status === 'Completed' ? 'text-green-600' : 'text-slate-400'}`}>+{t.points} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {view === 'stats' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-10">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2"><Activity size={14} className="text-blue-500" />Efficiency Matrix</h3>
               {stats.categoryConsistency.map(cat => (
                 <div key={cat.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                       <div className="flex items-center gap-3">
                          <div className={`${cat.bg} ${cat.color} p-2 rounded-xl`}>{cat.icon}</div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{cat.id}</span>
                       </div>
                       <span className={`text-[11px] font-black ${cat.color}`}>{cat.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${cat.color.replace('text', 'bg')}`}
                         style={{ width: `${cat.percent}%` }}
                       />
                    </div>
                 </div>
               ))}
            </div>

            <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 text-slate-900">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest"><History size={14} className="text-blue-500" />Execution Matrix</h3>
              <div className="grid grid-cols-7 gap-2">
                {stats.last30.map((d, i) => (
                  <div key={i} className={`aspect-square rounded-lg transition-all ${d.intensity === 0 ? 'bg-slate-100' : d.intensity === 1 ? 'bg-blue-200' : d.intensity === 2 ? 'bg-blue-400' : d.intensity === 3 ? 'bg-blue-600' : 'bg-blue-900 shadow-sm'}`} title={d.date} />
                ))}
              </div>
              <p className="text-[8px] text-slate-400 mt-4 text-center font-bold uppercase tracking-tighter">Activity detected in last 30 intervals</p>
            </div>
          </div>
        )}

        {view === 'rank' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border-t border-white/10">
              <Flame className="absolute -right-8 -bottom-8 w-40 h-40 text-blue-500/10 rotate-12" />
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3">Evolution Protocol</p>
              <h2 className="text-3xl font-black mb-6 italic tracking-tighter uppercase text-blue-50 leading-tight">
                {stats.rank}
              </h2>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/10 shadow-inner">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.6)]" 
                  style={{ width: `${(stats.progressXP / 500) * 100}%` }} 
                />
              </div>
              <div className="flex justify-between mt-5 text-[10px] uppercase font-black tracking-widest">
                <p className="text-slate-500">LVL {stats.currentLevel}</p>
                <p className="text-blue-400">{500 - stats.progressXP} XP TO ASCEND</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-7 rounded-[2.5rem] text-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><TrendingUp className="text-orange-500" /></div>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.streak}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Streak</p>
              </div>
              <div className="bg-white p-7 rounded-[2.5rem] text-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Medal className="text-blue-500" /></div>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{points}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Score</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav Dock */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-slate-900/95 backdrop-blur-3xl rounded-[3rem] p-4 flex justify-between items-center shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] border border-white/10 z-50">
        <button onClick={() => setView('daily')} className={`flex-1 flex flex-col items-center py-2 transition-all duration-300 ${view === 'daily' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}>
          <CheckCircle2 size={24} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase mt-1.5 tracking-widest">Mission</span>
        </button>
        <button onClick={() => setView('rank')} className={`flex-1 flex flex-col items-center py-2 transition-all duration-300 ${view === 'rank' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}>
          <Trophy size={24} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase mt-1.5 tracking-widest">Rank</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex-1 flex flex-col items-center py-2 transition-all duration-300 ${view === 'stats' ? 'text-blue-400 scale-125' : 'text-slate-500'}`}>
          <BarChart3 size={24} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase mt-1.5 tracking-widest">Stats</span>
        </button>
      </div>
    </div>
  );
};

export default App;
