import React from 'react';
import { FiTwitter, FiGithub, FiInstagram, FiTv } from 'react-icons/fi';

export default function LandingFooter() {
    return (
        <footer className="py-12 md:py-16 px-4 md:px-6 border-t border-white/5">
            <div className="container mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-16">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <img
                                src="/iptv_logo.png"
                                alt="IPTV Expert"
                                className="w-10 h-10 rounded-xl object-cover drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] logo-blend"
                            />
                            <span className="text-base font-black italic tracking-tighter bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                                IPTV EXPERT
                            </span>
                        </div>
                        <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
                            A plataforma definitiva para organizar e assistir seu conteúdo favorito com design e tecnologia de ponta.
                        </p>
                        <div className="flex gap-3">
                            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"><FiTwitter /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"><FiGithub /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"><FiInstagram /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Produto</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                            <li><a href="#showcase" className="hover:text-white transition-colors">Integrações</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Suporte</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Guias</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Suporte API</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Aviso Legal</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
                    <p>© 2024 IPTV Expert. Todos os direitos reservados.</p>
                    <p>Desenvolvido com ❤️ para apaixonados por streaming.</p>
                </div>
            </div>
        </footer>
    );
}
