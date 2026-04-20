import React from 'react';
import { FiLayout, FiSearch, FiHeart, FiCpu } from 'react-icons/fi';

export default function ShowcaseSection() {
    const items = [
        { icon: FiLayout, title: "Organização Inteligente", desc: "Suas listas são automaticamente separadas por categorias." },
        { icon: FiSearch, title: "Busca Ultra Global", desc: "Encontre qualquer canal ou filme em milissegundos." },
        { icon: FiHeart, title: "Favoritos em Nuvem", desc: "Sincronize seus canais preferidos entre dispositivos." },
        { icon: FiCpu, title: "Engine HLS 2.0", desc: "Tecnologia de streaming com buffer inteligente." }
    ];

    return (
        <section id="showcase" className="py-12 md:py-16 px-4 md:px-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-neon-purple/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
                    <div className="reveal">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight leading-tight">
                            Recursos que <span className="text-gradient-neon">Elevam o Nível.</span>
                        </h2>
                        <p className="text-gray-400 text-base md:text-lg mb-8 md:mb-10 leading-relaxed">
                            Não é apenas um player. É uma central de entretenimento completa com funcionalidades 
                            desenvolvidas para entusiastas de IPTV.
                        </p>
                        
                        <div className="space-y-6">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-purple/50 transition-all">
                                        <item.icon className="text-neon-purple text-xl" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">{item.title}</h4>
                                        <p className="text-gray-500 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative reveal">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 rounded-[3rem] blur-2xl opacity-50"></div>
                        <div className="relative glass-panel rounded-[3rem] p-4 border-white/20 overflow-hidden shadow-2xl">
                            {/* Representative screenshot/visual */}
                            <div className="aspect-[4/3] bg-black/40 rounded-[2rem] flex flex-col items-start justify-start gap-3 overflow-hidden p-4">
                                {/* Mock channel cards */}
                                <div className="flex gap-2 px-1 w-full">
                                    {[80, 55, 60].map((w, i) => (
                                        <div key={i} className={`h-6 bg-neon-purple/20 rounded-full animate-pulse`} style={{ width: `${w}px`, animationDelay: `${i * 100}ms` }} />
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-3 w-full">
                                    <div className="h-20 md:h-28 bg-white/5 rounded-xl animate-pulse border border-white/5" />
                                    <div className="h-20 md:h-28 bg-neon-purple/10 rounded-xl animate-pulse delay-75 border border-neon-purple/20" />
                                    <div className="h-20 md:h-28 bg-white/5 rounded-xl animate-pulse delay-150 border border-white/5" />
                                </div>
                                <div className="w-full flex flex-col gap-2 px-1">
                                    <div className="w-3/4 h-3 bg-white/10 rounded-full" />
                                    <div className="w-1/2 h-3 bg-white/5 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
