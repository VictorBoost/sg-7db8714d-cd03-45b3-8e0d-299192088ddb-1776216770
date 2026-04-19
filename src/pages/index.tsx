import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ShoppingBag,
    ShieldCheck,
    ArrowRight,
    Zap,
    Globe,
    Award,
    Users,
    Leaf,
    Waves,
    Briefcase,
    Handshake,
    Search,
    Bot,
    MessageCircle,
    LogOut,
    CreditCard,
    CheckCircle2,
    Lock
} from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
    const [user, setUser] = useState < any > (null);
    const [loading, setLoading] = useState(true);

    // LANDING PAGE IS THE MARKETPLACE (HOMEPAGE)
    const [activeApp, setActiveApp] = useState < 'marketplace' | 'tikachat' | 'hub' > ('marketplace');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    };

    const handleLogout = async () => await supabase.auth.signOut();

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-[#F8F5F2]">
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="font-mono text-xs uppercase tracking-[0.3em] text-[#1A2F1F]"
            >
                Syncing BlueTika...
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F5F2] text-[#1A2F1F] font-sans selection:bg-[#FFD04D] selection:text-[#1A2F1F]">
            {/* 1. PREMIUM KIWI NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 px-8 py-5 flex justify-between items-center bg-white/90 backdrop-blur-xl border-b border-black/5 shadow-sm">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveApp('marketplace')}>
                    <div className="w-10 h-10 bg-[#1A2F1F] rounded-xl flex items-center justify-center text-white font-black italic transform group-hover:rotate-12 transition-transform shadow-lg">
                        B
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tighter leading-none font-serif">BlueTika</h1>
                        <span className="text-[9px] uppercase tracking-widest opacity-40 font-black">Aotearoa Trusted</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <nav className="hidden lg:flex gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-[#1A2F1F]/60">
                        <span className="hover:text-amber-600 cursor-pointer transition-colors">Post a Project</span>
                        <span className="hover:text-amber-600 cursor-pointer transition-colors">Browse Projects</span>
                        <span className="hover:text-amber-600 cursor-pointer transition-colors">Active Contracts</span>
                    </nav>

                    <div className="hidden sm:flex items-center gap-4">
                        {!user ? (
                            <>
                                <button onClick={handleLogin} className="text-[10px] font-black uppercase text-[#1A2F1F] px-5 py-2.5 rounded-full hover:bg-slate-50 transition-all">Login</button>
                                <button className="bg-[#1A2F1F] text-white px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#FFD04D] hover:text-[#1A2F1F] transition-all shadow-md active:scale-95">Sign Up</button>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold uppercase opacity-30 tracking-widest">Authorized</span>
                                    <span className="text-sm font-semibold">{user.email?.split('@')[0]}</span>
                                </div>
                                <button onClick={handleLogout} className="p-2.5 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
                            </div>
                        )}
                        <button onClick={() => setActiveApp('tikachat')} className="p-2.5 bg-[#FFD04D]/10 text-[#1A2F1F] rounded-full hover:bg-[#FFD04D]/20 transition-all relative">
                            <Bot size={20} />
                            <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-20">
                <AnimatePresence mode="wait">
                    {activeApp === 'marketplace' ? (
                        <motion.div
                            key="marketplace"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white min-h-screen"
                        >
                            {/* --- HERO: AIRTASKER INSPIRED + NZ CULTURE --- */}
                            <header className="bg-[#1A2F1F] text-white py-32 px-12 text-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                                    <Leaf size={700} className="absolute -right-20 -top-20 rotate-45" />
                                    <Waves size={700} className="absolute -left-20 -bottom-20" />
                                </div>

                                <div className="relative z-10 max-w-5xl mx-auto">
                                    <div className="inline-flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-12 border border-white/5 shadow-sm">
                                        <ShieldCheck size={16} className="text-[#FFD04D]" /> Trusted by 10,000+ Kiwi Whānau
                                    </div>
                                    <h1 className="text-8xl md:text-[9.5rem] font-black tracking-tighter mb-10 leading-[0.85] font-serif">
                                        Projects made easy. <br />
                                        <span className="italic text-[#FFD04D]">Contracts secured.</span>
                                    </h1>
                                    <p className="text-xl md:text-2xl text-white/60 mb-20 max-w-2xl mx-auto font-medium leading-relaxed">
                                        Connecting New Zealand <span className="text-white font-bold">Clients</span> with local <span className="text-white font-bold">Service Providers</span>. Secure your mahi with bank-grade escrow protection.
                                    </p>

                                    {/* SEARCH BOX: THE CORE AIRTASKER ELEMENT */}
                                    <div className="bg-white rounded-[2.5rem] p-3 flex flex-col md:flex-row gap-3 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] max-w-3xl mx-auto transform translate-y-12 text-[#1A2F1F]">
                                        <div className="flex-[1.5] flex items-center gap-6 px-8 py-5 bg-slate-50 rounded-[2rem] border border-black/5 shadow-inner">
                                            <Search size={22} className="opacity-30" />
                                            <input type="text" placeholder="What project do you need a hand with?" className="bg-transparent border-none outline-none w-full text-xl font-black placeholder:text-slate-300" />
                                        </div>
                                        <button className="bg-[#FFD04D] text-[#1A2F1F] px-14 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#1A2F1F] hover:text-white transition-all shadow-xl active:scale-95">
                                            Search Projects
                                        </button>
                                    </div>
                                </div>
                            </header>

                            {/* --- WORKFLOW: STEPS TO SUCCESS --- */}
                            <section className="pt-48 pb-32 px-12 max-w-7xl mx-auto text-center">
                                <div className="mb-24">
                                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-600 mb-6">Mahi-to-Tikanga Workflow</div>
                                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 pr pr pr pr pr pr">The BlueTika System</h3>
                                    <div className="w-20 h-1 bg-[#FFD04D] mx-auto rounded-full" />
                                </div>

                                <div className="grid md:grid-cols-3 gap-20 relative">
                                    <div className="absolute top-12 left-0 w-full h-px border-t border-dashed border-slate-200 hidden lg:block -z-10" />

                                    {[
                                        {
                                            title: '1. Describe Project',
                                            desc: 'Clients post project details and budget (NZD). No upfront fees.',
                                            icon: <Briefcase />
                                        },
                                        {
                                            title: '2. Review Offers',
                                            desc: 'Service Providers bid for the work. Chat and compare reviews.',
                                            icon: <Handshake />
                                        },
                                        {
                                            title: '3. Award Contract',
                                            desc: 'Accept an offer to create a formal Contract. Funds move to escrow.',
                                            icon: <ShieldCheck />,
                                            highlight: true
                                        }
                                    ].map((step, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl ${step.highlight ? 'bg-[#FFD04D] text-[#1A2F1F]' : 'bg-white text-[#1A2F1F] border border-black/5'}`}>
                                                {step.icon}
                                            </div>
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-4">{step.title}</h4>
                                            <p className="text-sm text-slate-500 max-w-[20ch] leading-relaxed font-medium">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* --- CATEGORIES: POPULAR MAHI --- */}
                            <section className="py-32 px-12 bg-[#F8F5F2] border-y border-black/5">
                                <div className="max-w-7xl mx-auto">
                                    <div className="flex justify-between items-end mb-16">
                                        <div className="max-w-md">
                                            <h3 className="text-5xl font-black tracking-tighter mb-4 pr">Popular Projects</h3>
                                            <p className="text-slate-500 font-medium">Verified Kiwis ready to start your next contract today.</p>
                                        </div>
                                        <button className="text-[9px] font-black uppercase tracking-widest text-[#1A2F1F] border-b-2 border-amber-400 pb-1">View All Mahi →</button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                        {[
                                            { name: 'Home Cleaning', icon: <Waves />, color: 'bg-blue-50 text-blue-600', mahi: 'Te Hāpai' },
                                            { name: 'Garden Care', icon: <Leaf />, color: 'bg-emerald-50 text-emerald-600', mahi: 'Te Māra' },
                                            { name: 'Handyman', icon: <Award />, color: 'bg-amber-50 text-amber-600', mahi: 'Te Mahi' },
                                            { name: 'Delivery', icon: <Globe />, color: 'bg-purple-50 text-purple-600', mahi: 'Te Kawenga' }
                                        ].map((cat) => (
                                            <div key={cat.name} className="group p-10 bg-white border border-black/5 rounded-[4rem] hover:shadow-2xl transition-all cursor-pointer text-center hover:-translate-y-2">
                                                <div className={`w-20 h-20 ${cat.color} rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform`}>
                                                    {cat.icon}
                                                </div>
                                                <h4 className="font-black text-xs uppercase tracking-widest mb-1">{cat.name}</h4>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase italic mb-6 tracking-widest">{cat.mahi}</div>
                                                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A2F1F] group-hover:text-amber-500 transition-colors">
                                                    Find Pros <ArrowRight size={12} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* --- TRUST & CULTURE: THE TIKANGA FOUNDATION --- */}
                            <section className="py-40 px-12 max-w-7xl mx-auto">
                                <div className="grid lg:grid-cols-2 gap-24 items-center">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FFD04D] mb-8 flex items-center gap-3">
                                            <div className="h-px w-8 bg-amber-400" /> TIKANGA & TRUST
                                        </div>
                                        <h3 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 leading-[0.9] font-serif">A sanctuary for <span className="italic text-[#1A2F1F]/40">honest work</span>.</h3>

                                        <div className="space-y-12">
                                            <div className="flex gap-10 group">
                                                <div className="w-20 h-20 bg-[#F8F5F2] rounded-[2.5rem] flex items-center justify-center text-[#1A2F1F] flex-shrink-0 group-hover:bg-[#1A2F1F] group-hover:text-white transition-all shadow-xl">
                                                    <Users size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-widest mb-4">Community of Whanaungatanga</h4>
                                                    <p className="text-slate-500 text-lg leading-relaxed font-medium transition-colors">Every Service Provider is strictly identity-verified. We don't just connect emails; we connect humans through mutual respect.</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-10 group">
                                                <div className="w-20 h-20 bg-[#F8F5F2] rounded-[2.5rem] flex items-center justify-center text-[#1A2F1F] flex-shrink-0 group-hover:bg-[#1A2F1F] group-hover:text-white transition-all shadow-xl">
                                                    <Lock size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-widest mb-4">Project Escrow Protection</h4>
                                                    <p className="text-slate-500 text-lg leading-relaxed font-medium transition-colors">Once a Contract is awarded, funds are locked in our secure NZ vault. Service Providers are paid only when the Client confirms the project is done.</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-10 group">
                                                <div className="w-20 h-20 bg-[#F8F5F2] rounded-[2.5rem] flex items-center justify-center text-[#1A2F1F] flex-shrink-0 group-hover:bg-[#1A2F1F] group-hover:text-white transition-all shadow-xl">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-widest mb-4">NZ High Standards</h4>
                                                    <p className="text-slate-500 text-lg leading-relaxed font-medium transition-colors">100% NZ Owned and Locally Managed. We understand Kiwi regulations, ensuring all contracts meet local service expectations.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative pt-20">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400 rounded-full blur-[120px] opacity-20 -z-10" />
                                        <div className="relative rounded-[5rem] overflow-hidden shadow-[0_60px_100px_rgba(0,0,0,0.15)] border border-black/5 rotate-2 hover:rotate-0 transition-transform duration-700">
                                            <img src="https://picsum.photos/seed/kiwi-landscape/1000/1200" alt="New Zealand Pride" className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2F1F] via-transparent to-transparent opacity-60" />
                                            <div className="absolute bottom-16 left-16">
                                                <div className="text-[#FFD04D] text-[10px] font-black uppercase tracking-[0.4em] mb-4">Since 2026</div>
                                                <h4 className="text-4xl font-black text-white pr pr pr pr pr">BlueTika. <br />Kiwis Looking After Kiwis.</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* --- PREMIUM FOOTER --- */}
                            <footer className="bg-white pt-32 pb-16 px-12 border-t border-black/5 text-center">
                                <div className="max-w-7xl mx-auto flex flex-col items-center">
                                    <div className="w-16 h-16 bg-[#1A2F1F] rounded-2xl flex items-center justify-center text-white mb-10 shadow-2xl">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <h5 className="text-2xl font-black tracking-tighter mb-4 pr pr pr pr pr pr pr">BlueTika Ecosystem</h5>
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-16">The Premier Marketplace for Honest Mahi</p>

                                    <div className="w-full h-px bg-slate-100 mb-16" />

                                    <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-[#1A2F1F]/30">
                                        <div className="flex gap-10">
                                            <span className="hover:text-[#1A2F1F] cursor-pointer">Post a Project</span>
                                            <span className="hover:text-[#1A2F1F] cursor-pointer">Find a Provider</span>
                                            <span className="hover:text-[#1A2F1F] cursor-pointer">Help Center</span>
                                            <span className="hover:text-[#1A2F1F] cursor-pointer">Contact Us</span>
                                        </div>
                                        <div>© 2026 BlueTika Limited · Proudly NZ Owned</div>
                                    </div>
                                </div>
                            </footer>
                        </motion.div>
                    ) : (
                        <TikaChatView onBack={() => setActiveApp('marketplace')} />
                    )}
                </AnimatePresence>
            </main>

            {/* FOOTER STATUS BAR */}
            <footer className="fixed bottom-0 w-full p-8 flex justify-between items-center z-10 pointer-events-none">
                <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md px-6 py-3 rounded-full border border-black/5 shadow-2xl pointer-events-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Infrastructure: NZ-Aotearoa (Secure Node Active)</span>
                </div>
                <button onClick={() => setActiveApp('tikachat')} className="pointer-events-auto w-14 h-14 bg-[#1A2F1F] text-[#FFD04D] rounded-full flex items-center justify-center shadow-2xl hover:bg-[#FFD04D] hover:text-[#1A2F1F] transition-all transform hover:-translate-y-2 group">
                    <Bot size={24} className="group-hover:scale-110 transition-transform" />
                </button>
            </footer>
        </div>
    );
}

// --- TIKACHAT VIEW ---
function TikaChatView({ onBack }: { onBack: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl mx-auto px-8 py-20"
        >
            <div className="bg-[#0a0a0a] rounded-[5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col min-h-[75vh] text-white">
                <div className="px-12 py-10 bg-[#1A2F1F] flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-[#FFD04D] rounded-3xl flex items-center justify-center text-[#1A2F1F] shadow-xl shadow-[#FFD04D]/20">
                            <Bot size={36} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter pr pr pr pr pr pr pr">TikaChat <span className="text-[#FFD04D] italic">AI</span></h2>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Marketplace Intelligence Node: nz-node-1</p>
                        </div>
                    </div>
                    <button onClick={onBack} className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 px-6 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">← Back</button>
                </div>

                <div className="flex-1 p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mb-12 border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFD04D]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <MessageCircle className="text-[#FFD04D]" size={48} />
                    </div>
                    <h3 className="text-5xl font-black tracking-tight mb-8 font-serif pr pr pr pr pr">Kia Ora, I am Tika.</h3>
                    <p className="text-white/40 max-w-sm mb-16 text-xl leading-relaxed font-medium">I can help you manage your <span className="text-white">Projects</span>, verify <span className="text-white">Service Providers</span>, or track secure <span className="text-white">Contracts</span>.</p>

                    <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-[3rem] p-7 flex items-center gap-8 shadow-2xl group cursor-text">
                        <Search size={22} className="opacity-20 text-white" />
                        <input type="text" placeholder="Tell Tika what you need help with..." className="bg-transparent border-none outline-none flex-1 text-lg font-medium text-white/50 pointer-events-none" />
                        <Zap size={24} className="text-[#FFD04D] opacity-40 group-hover:animate-pulse" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
