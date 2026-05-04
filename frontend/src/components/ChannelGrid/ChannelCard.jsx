import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { getProxyImageUrl } from '../../services/api';

export default function ChannelCard({ channel, onClick }) {
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    const isFavorite = favorites.some(f => f.id === channel.id);

    const toggleFavorite = (e) => {
        e.stopPropagation();
        if (isFavorite) {
            removeFavorite(channel.id);
        } else {
            addFavorite(channel);
        }
    };

    return (
        <div
            onClick={onClick}
            className="glass-card rounded-xl overflow-hidden cursor-pointer group flex flex-col h-full"
        >
            <div className="relative aspect-video bg-black/40 flex items-center justify-center p-4">
                {channel.logo ? (
                    <img src={getProxyImageUrl(channel.logo)} alt={channel.name} loading="lazy" className="max-w-full max-h-full object-contain drop-shadow-lg scale-95 group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest text-xs">Sem Logo</div>
                )}
                
                {/* Overlay gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <button
                    onClick={toggleFavorite}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 z-10 ${
                        isFavorite 
                            ? 'opacity-100 bg-primary/20 text-primary hover:bg-primary/30 shadow-[0_0_10px_rgba(108,92,231,0.3)]' 
                            : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white hover:bg-black/80'
                    }`}
                >
                    {isFavorite ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                </button>
            </div>
            <div className="p-3 border-t border-white/5 bg-gradient-to-b from-transparent to-black/20 flex-1 flex flex-col justify-center">
                <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-tight" title={channel.name}>
                    {channel.name}
                </p>
                {channel.group && (
                    <p className="text-[10px] text-primary/70 uppercase tracking-wider font-bold mt-1 truncate">
                        {channel.group}
                    </p>
                )}
            </div>
        </div>
    );
}