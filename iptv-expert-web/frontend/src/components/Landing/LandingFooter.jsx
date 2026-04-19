import React from 'react';
import { FiTwitter, FiGithub, FiInstagram, FiTv } from 'react-icons/fi';

export default function LandingFooter() {
    return (
        <footer className="py-16 px-6 border-t border-white/5">
            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-6 origin-left">
                            <div className="w-36 md:w-48 overflow-hidden flex items-center justify-center rounded-xl hover:scale-105 transition-all">
                                <img src="/logo_banner.png" alt="IPTV Expert Logo" className="w-full h-auto object-contain scale-[1.02]" />
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            A plataforma definitiva para organizar e assistir seu conteúdo favorito com design e tecnologia de ponta.
                        </p>
                        <div className="flex gap-4">
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
