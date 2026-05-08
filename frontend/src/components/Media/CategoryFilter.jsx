import React, { useRef, useState } from 'react';

export default function CategoryFilter({ groups, selectedGroup, onSelectGroup }) {
    const groupNames = Object.keys(groups || {})
        .filter(name => !name.includes('[MSEController]') && !name.includes('MediaSource'))
        .sort((a, b) => a.localeCompare(b));
    
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragged, setDragged] = useState(false);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragged(false);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) setDragged(true);
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar py-2 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        >
            <button
                onClick={() => { if (!dragged) onSelectGroup(null); }}
                className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-sm font-black transition-all duration-300 ${
                    !selectedGroup 
                    ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,92,231,0.4)] scale-105' 
                    : 'bg-[#151515] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                }`}
            >
                Todos
            </button>
            
            {groupNames.map(group => (
                <button
                    key={group}
                    onClick={() => { if (!dragged) onSelectGroup(group); }}
                    className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${
                        selectedGroup === group 
                        ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,92,231,0.4)] scale-105' 
                        : 'bg-[#151515] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                    }`}
                >
                    <span className="truncate max-w-[250px]">{group}</span>
                    <span className={`text-[11px] font-medium opacity-50 ${selectedGroup === group ? 'text-white' : 'text-gray-500'}`}>
                        {groups[group]?.length || 0}
                    </span>
                </button>
            ))}
        </div>
    );
}
