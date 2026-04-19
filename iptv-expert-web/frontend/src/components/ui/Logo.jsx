import React from 'react';

export default function BrandLogo({ className = "", size = "normal" }) {
    // Definimos a altura pra tela normal e menor e deixamos a largura (width) automática
    const heightClass = size === "small" ? "h-6" : "h-10";

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Logo Image */}
            <img 
                src="/logo.png" 
                alt="IPTV Expert Logo" 
                className={`${heightClass} w-auto object-contain drop-shadow-[0_0_8px_rgba(108,92,231,0.4)]`}
            />
        </div>
    );
}
