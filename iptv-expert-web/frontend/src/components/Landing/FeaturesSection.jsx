import React from 'react';
import { FiZap, FiShield, FiSmartphone, FiMonitor, FiDownload, FiWifi, FiCheck } from 'react-icons/fi';

export default function FeaturesSection() {
    const features = [
        {
            icon: FiZap,
            title: 'Velocidade Extrema',
            description: 'Carregamento instantâneo de canais e VODs com motor de parse otimizado.',
            color: 'blue',
        },
        {
            icon: FiShield,
            title: 'Segurança Total',
            description: 'Seus dados e listas protegidos com criptografia de ponta a ponta.',
            color: 'purple',
        },
        {
            icon: FiSmartphone,
            title: 'Multi-Dispositivo',
            description: 'Acesse de qualquer lugar: celular, tablet ou computador via navegador.',
            color: 'blue',
        },
        {
            icon: FiMonitor,
            title: 'Interface 4K',
            description: 'Design pensado para telas de alta resolução com fluidez de 60fps.',
            color: 'purple',
        },
    ];

    return (
        <section id="features" className="py-20 px-6">
            <div className="container mx-auto max-w-6xl space-y-20">

                {/* ══════════════════════════════════════════
                    DESTAQUE EXCLUSIVO: DOWNLOAD
                ═══════════════════════════════════════════ */}
                <div className="relative reveal">
                    {/* Glow de fundo */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-neon-purple/20 to-neon-blue/30 rounded-[2.5rem] blur-xl pointer-events-none" />

                    <div className="relative glass-panel rounded-[2.5rem] border border-primary/30 overflow-hidden">
                        <div className="flex flex-col lg:flex-row items-center gap-0">

                            {/* Lado esquerdo — texto */}
                            <div className="flex-1 p-10 lg:p-14">
                                {/* Badge EXCLUSIVO */}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                                    ✦ Exclusivo IPTV Expert · Nenhum outro tem
                                </div>

                                <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                                    Download para
                                    <br />
                                    <span className="text-gradient-neon">Assistir Offline</span>
                                </h2>

                                <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-lg">
                                    Baixe seus filmes, séries e até gravações de TV Ao Vivo diretamente no seu dispositivo. 
                                    Assista sem internet, no avião, no metrô, onde quiser — com qualidade original preservada.
                                </p>

                                {/* Checklist de vantagens */}
                                <ul className="space-y-3 mb-10">
                                    {[
                                        'Download em qualidade 4K, Full HD ou HD — você escolhe',
                                        'Gerenciador de downloads com fila automática',
                                        'Controle total de armazenamento local',
                                        'Disponível para todos os planos Premium',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                                            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                                                <FiCheck size={11} className="text-primary" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                    <FiWifi size={12} />
                                    <span>Após o download, conexão não necessária</span>
                                </div>
                            </div>

                            {/* Lado direito — visual mockup de download */}
                            <div className="flex-shrink-0 w-full lg:w-80 bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-white/5 p-8 flex flex-col gap-4">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Downloads Ativos</p>

                                {[
                                    { title: 'Oppenheimer', quality: '4K HDR', progress: 100, size: '18.4 GB' },
                                    { title: 'The Boys S4E1', quality: 'Full HD', progress: 67, size: '2.1 GB' },
                                    { title: 'Duna: Parte II', quality: '4K HDR', progress: 34, size: '16.7 GB' },
                                    { title: 'Breaking Bad S1', quality: 'Full HD', progress: 0, size: '8.9 GB' },
                                ].map((dl, i) => (
                                    <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-white leading-tight">{dl.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{dl.quality} · {dl.size}</p>
                                            </div>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${dl.progress === 100 ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                                {dl.progress === 100
                                                    ? <FiCheck size={13} />
                                                    : <FiDownload size={13} className="animate-bounce" />
                                                }
                                            </div>
                                        </div>
                                        {/* Barra de progresso */}
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${dl.progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                style={{ width: `${dl.progress || 5}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1.5 text-right">
                                            {dl.progress === 100 ? 'Concluído ✓' : dl.progress === 0 ? 'Na fila...' : `${dl.progress}% baixado`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    GRID DE OUTROS RECURSOS
                ═══════════════════════════════════════════ */}
                <div>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Desenvolvido para <span className="text-neon-blue">Performance.</span>
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Utilizamos as tecnologias mais modernas para entregar a melhor experiência de streaming do mercado.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="glass-panel p-8 rounded-3xl group hover:scale-105 transition-all duration-500 hover:border-primary/30 reveal"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/10 ${feature.color === 'blue' ? 'text-neon-blue' : 'text-neon-purple'}`}>
                                    <feature.icon className="text-2xl" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
