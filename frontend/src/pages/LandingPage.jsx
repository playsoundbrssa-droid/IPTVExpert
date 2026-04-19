import React, { useEffect, useState } from 'react';
import LandingNavbar from '../components/Landing/LandingNavbar';
import HeroSection from '../components/Landing/HeroSection';
import LandingFooter from '../components/Landing/LandingFooter';
import AuthScreen from '../components/Auth/AuthScreen';
import { FiX } from 'react-icons/fi';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    useEffect(() => {
        // Intersection Observer for scroll reveal animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const toggleLogin = () => setIsLoginOpen(!isLoginOpen);

    return (
        <div className="neon-bg-container min-h-screen relative overflow-hidden">
            {/* Imagem de Fundo Premium */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="/banner_iptv.png" 
                    className="w-full h-full object-cover opacity-30 scale-105" 
                    alt="background" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-10" />
            </div>

            <div className="relative z-20">
                <LandingNavbar onLoginClick={toggleLogin} />
            
            <main>
                <HeroSection onLoginClick={toggleLogin} />
            </main>

            <LandingFooter />

            {/* Auth Modal Overlay */}
            {isLoginOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" 
                        onClick={toggleLogin}
                    />
                    <div className="relative w-full max-w-md animate-fade-in-up">
                        <button 
                            onClick={toggleLogin}
                            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                        >
                            <FiX size={24} />
                        </button>
                        <AuthScreen isModal={true} />
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
