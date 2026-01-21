
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MapPin, Beaker, Calendar, User, Info, Globe, Loader2, 
  History, Share2, Check, GraduationCap, Map as MapIcon, 
  Pill, Microscope, Activity, ShieldCheck, Zap, ExternalLink, ChevronRight
} from 'lucide-react';
import WorldMap from './components/WorldMap';
import { fetchMedicineOrigin } from './services/geminiService';
import { MedicineOrigin } from './types';

// Curated list of medicines for suggestions
const MEDICINE_DATABASE = [
  'Aspirin', 'Penicillin', 'Insulin', 'Metformin', 'Amoxicillin', 'Paracetamol', 
  'Ibuprofen', 'Morphine', 'Quinine', 'Streptomycin', 'Atorvastatin', 'Lisinopril', 
  'Levothyroxine', 'Amlodipine', 'Omeprazole', 'Metoprolol', 'Albuterol', 'Gabapentin', 
  'Losartan', 'Sertraline', 'Furosemide', 'Azithromycin', 'Hydrochlorothiazide', 
  'Simvastatin', 'Warfarin', 'Digoxin', 'Diazepam', 'Prednisone', 'Ciprofloxacin', 
  'Doxycycline', 'Fluoxetine', 'Lorezepam', 'Tramadol', 'Clopidogrel', 'Montelukast', 
  'Rosuvastatin', 'Pantoprazole', 'Escitalopram', 'Valsartan', 'Duloxetine', 
  'Meloxicam', 'Ranitidine', 'Oxycodone', 'Venlafaxine', 'Zolpidem',
  'Cyclosporine', 'Tacrolimus', 'Infliximab', 'Rituximab', 'Adalimumab'
].sort();

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MedicineOrigin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Helper to safely update URL history (won't run on blob: URLs)
  const updateUrlParams = (searchTerm: string | null) => {
    if (window.location.protocol.startsWith('blob')) return;
    
    try {
      const url = new URL(window.location.href);
      if (searchTerm) {
        url.searchParams.set('drug', searchTerm);
      } else {
        url.searchParams.delete('drug');
      }
      window.history.pushState({}, '', url);
    } catch (e) {
      console.warn('Could not update URL params:', e);
    }
  };

  // Handle clicks outside the search box to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pharm_origin_history');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Read URL params (works on blob: URLs usually, but we wrap for safety)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const drugParam = urlParams.get('drug');
      if (drugParam) {
        setQuery(drugParam);
        handleSearch(undefined, drugParam);
      }
    } catch (e) {
      console.warn('URL params not available');
    }
  }, []);

  // Filter suggestions based on query
  useEffect(() => {
    if (query.trim().length >= 2) {
      const filtered = MEDICINE_DATABASE.filter(med => 
        med.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const categories = [
    { 
      title: 'Antibiotics', 
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, 
      items: ['Penicillin', 'Streptomycin', 'Amoxicillin'] 
    },
    { 
      title: 'Hormones', 
      icon: <Activity className="w-5 h-5 text-rose-500" />, 
      items: ['Insulin', 'Thyroxine', 'Oxytocin'] 
    },
    { 
      title: 'Analgesics', 
      icon: <Zap className="w-5 h-5 text-amber-500" />, 
      items: ['Aspirin', 'Morphine', 'Ibuprofen'] 
    },
    { 
      title: 'Modern Biologics', 
      icon: <Microscope className="w-5 h-5 text-blue-500" />, 
      items: ['Metformin', 'Statins', 'Quinine'] 
    }
  ];

  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const searchTerm = searchOverride || query;
    if (!searchTerm.trim()) return;

    setShowSuggestions(false);
    setIsLoading(true);
    setError(null);
    
    updateUrlParams(searchTerm);

    try {
      const data = await fetchMedicineOrigin(searchTerm);
      setResult(data);
      setQuery(data.name);
      
      setRecentSearches(prev => {
        const updated = [data.name, ...prev.filter(i => i !== data.name)].slice(0, 6);
        localStorage.setItem('pharm_origin_history', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError('Information for this compound is currently unavailable. Please check the spelling or try a more common name.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(undefined, suggestion);
  };

  const handleShare = async () => {
    if (!result) return;
    
    // Fallback if URL sharing is problematic in blob environments
    let shareUrl = '';
    if (!window.location.protocol.startsWith('blob')) {
      shareUrl = `${window.location.origin}${window.location.pathname}?drug=${encodeURIComponent(result.name)}`;
    } else {
      shareUrl = `Search for "${result.name}" on PharmOrigin Explorer`;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
             setResult(null);
             setQuery('');
             updateUrlParams(null);
          }}>
            <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-blue-200">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">PharmOrigin <span className="text-blue-600">Explorer</span></h1>
          </div>
          
          <div ref={searchRef} className="relative w-full sm:w-96 group">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                placeholder="Search drug origin..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
              <button 
                type="submit" 
                disabled={isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-blue-200"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                <div className="p-2">
                  <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggestions</p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 rounded-xl text-sm font-bold text-slate-700 group transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-slate-50 group-hover:bg-blue-100 rounded-lg transition-colors">
                          <Pill className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span>{suggestion}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {!result && !isLoading && !error && (
          <div className="py-6 flex flex-col items-center">
            {/* Hero Section */}
            <div className="text-center mb-16 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100">
                <Microscope className="w-3.5 h-3.5" /> Clinical History Visualization
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-[1.1]">
                Every <span className="text-blue-600">Breakthrough</span> Has a Hometown.
              </h2>
              <p className="text-slate-500 text-xl leading-relaxed font-medium">
                The global map of pharmaceutical evolution. Discover the labs, researchers, and natural sources that shaped modern medicine.
              </p>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="w-full mb-12">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                   <History className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-widest">Recently Viewed</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => { setQuery(term); handleSearch(undefined, term); }}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2 group"
                    >
                      {term}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16">
              {categories.map((cat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-slate-50 rounded-2xl">
                      {cat.icon}
                    </div>
                    <h3 className="font-black text-slate-800 tracking-tight">{cat.title}</h3>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => { setQuery(item); handleSearch(undefined, item); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all flex items-center justify-between group"
                      >
                        {item}
                        <MapIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full border-t border-slate-200 pt-12 flex flex-col items-center">
                <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                   <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">H</div>
                   </div>
                   <p className="text-sm font-bold text-slate-600">A Pharmaceutics Project by <span className="text-slate-900">Himanshu</span></p>
                </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-100 p-8 rounded-[2rem] mb-10 shadow-xl shadow-red-50 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Search Error</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Try Another Term
            </button>
          </div>
        )}

        {(isLoading || result) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="relative group">
                {isLoading && (
                  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/50">
                    <div className="flex flex-col items-center gap-6">
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                      <div className="text-center">
                        <span className="text-2xl font-black text-slate-900 block mb-1">Synthesizing Data</span>
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Analyzing Geographical Origins...</span>
                      </div>
                    </div>
                  </div>
                )}
                <WorldMap origin={result || undefined} />
              </div>

              {result && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Chronicle of Discovery</h3>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-xl font-medium">
                    {result.briefHistory}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {result && (
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden sticky top-24">
                  <div className="bg-slate-900 p-10 text-white relative">
                    <button 
                      onClick={handleShare}
                      className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all backdrop-blur-md group border border-white/20"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                    
                    <div>
                      <div className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-lg shadow-blue-900/40">
                        {result.classification}
                      </div>
                      <h2 className="text-4xl font-black pr-10 leading-[1.1] tracking-tight">{result.name}</h2>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 gap-8">
                      <div className="flex items-center gap-6">
                        <div className="bg-orange-50 p-4 rounded-[1.5rem] border border-orange-100 text-orange-600 font-bold flex items-center justify-center w-14 h-14">
                          <MapPin />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Birthplace</p>
                          <p className="text-2xl font-black text-slate-900">{result.country}{result.city ? `, ${result.city}` : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="bg-purple-50 p-4 rounded-[1.5rem] border border-purple-100 text-purple-600 font-bold flex items-center justify-center w-14 h-14">
                          <Calendar />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Epoch</p>
                          <p className="text-2xl font-black text-slate-900">{result.discoveryYear}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="bg-emerald-50 p-4 rounded-[1.5rem] border border-emerald-100 text-emerald-600 font-bold flex items-center justify-center w-14 h-14">
                          <User />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Architect</p>
                          <p className="text-2xl font-black text-slate-900">{result.discoverer}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                      <div className="bg-blue-50/50 rounded-[2rem] p-8 relative overflow-hidden group border border-blue-100/50">
                        <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 relative z-10">Historical Context</p>
                        <p className="text-blue-900/80 leading-relaxed font-bold text-lg relative z-10">{result.funFact}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!result && isLoading && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 animate-pulse">
                  <div className="h-40 bg-slate-100 rounded-[2rem] w-full"></div>
                  <div className="h-8 bg-slate-100 rounded-full w-3/4"></div>
                  <div className="h-8 bg-slate-100 rounded-full w-1/2"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 pt-24 pb-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 text-white"><Pill className="w-5 h-5" /></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">PharmOrigin</h3>
              </div>
              <p className="text-slate-500 leading-relaxed font-bold">
                An interactive atlas of pharmacological evolution. Tracing the scientific and natural heritage of life-saving medicines.
              </p>
            </div>

            <div id="about-section">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-slate-900 rounded-lg shadow-lg shadow-slate-200 text-white"><User className="w-5 h-5" /></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">The Developer</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-900">Himanshu</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">DITU • Bpharm Scholar</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-600 font-bold">
                   <span>Dehradun, Uttarakhand, IN</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 text-white"><Globe className="w-5 h-5" /></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Stack</h3>
              </div>
              <p className="text-slate-500 leading-relaxed mb-8 font-bold">
                Built with Gemini 3 for pharmacological synthesis and D3.js for high-fidelity geospatial projection.
              </p>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em]">
              &copy; {new Date().getFullYear()} PharmOrigin Explorer • Visualizing the History of Health
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
