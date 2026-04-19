import { ShoppingBag, ShieldCheck, ArrowRight, Star, CreditCard } from 'lucide-react';

export default function MarketplaceHome() {
    return (
        <div className="min-h-screen bg-white font-sans text-black">
            {/* Blue Header Section */}
            <nav className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                        <ShoppingBag size={20} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tighter">Bluetika Marketplace</h1>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    Secure ESCROW Active
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto py-20 px-8">
                <div className="text-center mb-16">
                    <h2 className="text-6xl font-bold tracking-tighter mb-6">Service Escrow <br /> You Can Trust.</h2>
                    <p className="text-gray-500 max-w-sm mx-auto mb-10 text-lg">The safest way to hire professionals in New Zealand.</p>
                    <button className="bg-black text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs">Browse Services</button>
                </div>

                {/* Example Service Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-10 border-2 border-black rounded-[3rem] bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><ShieldCheck size={28} /></div>
                            <div className="flex gap-1 text-yellow-400"><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
                        </div>
                        <h3 className="text-2xl font-bold mb-4 italic italic">Legal & Escrow Services</h3>
                        <p className="text-gray-400 mb-8">Funds are held in a secure vault until you approve the work.</p>
                        <div className="flex justify-between items-center pt-6 border-t border-black/5">
                            <span className="font-bold text-lg">$150 / session</span>
                            <span className="text-blue-600 font-bold flex items-center gap-2">Details <ArrowRight size={16} /></span>
                        </div>
                    </div>

                    <div className="p-10 border-2 border-black rounded-[3rem] bg-slate-50">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6321] mb-6"><CreditCard size={28} /></div>
                        <h3 className="text-2xl font-bold mb-4 italic italic">Business Shared Billing</h3>
                        <p className="text-gray-400 mb-8">Synchronize your payment methods across all Bluetika services.</p>
                        <button className="w-full bg-white border-2 border-black py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px]">Setup Stripe</button>
                    </div>
                </div>
            </main>

            <footer className="py-10 text-center text-gray-300 text-[10px] items-center gap-2 flex justify-center uppercase font-bold">
                <div className="w-2 h-2 rounded-full bg-green-500" /> All Systems Operational
            </footer>
        </div>
    );
}