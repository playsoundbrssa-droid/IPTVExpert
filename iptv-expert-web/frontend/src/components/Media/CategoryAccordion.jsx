import React, { useState, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiGrid, FiList, FiRefreshCw } from 'react-icons/fi';

export default function CategoryAccordion({ groups, selectedGroup, onSelectGroup, onSync, isSyncing }) {
    const [expandedGroups, setExpandedGroups] = useState({});

    const hierarchy = useMemo(() => {
        const tree = {};
        Object.keys(groups).sort().forEach(fullName => {
            // Filtrar grupos técnicos/logs
            if (fullName.includes('[MSEController]') || fullName.includes('MediaSource')) return;

            const parts = fullName.split(/\s*[|:»]\s*/);
            const mainName = parts[0];
            const subName = parts.slice(1).join(' | ') || null;

            if (!tree[mainName]) {
                tree[mainName] = {
                    name: mainName,
                    subs: [],
                    totalCount: 0
                };
            }
            tree[mainName].subs.push({
                name: subName || mainName,
                fullName: fullName,
                count: groups[fullName].length
            });
            tree[mainName].totalCount += groups[fullName].length;
        });
        
        return Object.values(tree)
            .map(node => ({
                ...node,
                isFolder: node.subs.length > 1,
                displayName: node.subs.length === 1 ? node.subs[0].fullName : node.name
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [groups]);

    const toggleExpand = (mainName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [mainName]: !prev[mainName]
        }));
    };

    return (
        <div className="flex flex-col gap-1 w-full max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2 overflow-x-hidden">
            <div className="flex items-center gap-2 mb-1">
                <button
                    onClick={() => onSelectGroup(null)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 text-left ${
                        !selectedGroup 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/50' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                >
                    <FiGrid size={18} />
                    <span className="flex-1">Todas Categorias</span>
                    <span className="opacity-60 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">
                        {Object.values(groups).reduce((acc, curr) => acc + curr.length, 0)}
                    </span>
                </button>
                
                {onSync && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSync(); }}
                        disabled={isSyncing}
                        title="Sincronizar EPG"
                        className={`p-3 rounded-xl border transition-all ${isSyncing ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                    >
                        <FiRefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>

            {/* Hierarchical Categories */}
            {hierarchy.map(node => {
                const isExpanded = expandedGroups[node.name];
                const hasSubs = node.isFolder;
                
                // Check if any sub in this node is selected
                const isActive = node.subs.some(s => s.fullName === selectedGroup);

                return (
                    <div key={node.name} className="flex flex-col gap-1">
                        <button
                            onClick={() => hasSubs ? toggleExpand(node.name) : onSelectGroup(node.subs[0].fullName)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left group ${
                                isActive && !isExpanded
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'text-gray-300 hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <div className="flex-1 truncate flex items-center gap-2">
                                {hasSubs && (
                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                                        <FiChevronRight size={16} />
                                    </div>
                                )}
                                <span className="truncate">{node.displayName}</span>
                            </div>
                            <span className="text-[10px] opacity-40 font-medium group-hover:opacity-100 transition-opacity">
                                {node.totalCount}
                            </span>
                        </button>

                        {/* Subcategories (Accordion Content) */}
                        {hasSubs && isExpanded && (
                            <div className="flex flex-col gap-1 ml-6 pl-2 border-l border-white/10 animate-fade-in mb-1">
                                {node.subs.sort((a, b) => a.name.localeCompare(b.name)).map(sub => (
                                    <button
                                        key={sub.fullName}
                                        onClick={() => onSelectGroup(sub.fullName)}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all text-left flex justify-between items-center ${
                                            selectedGroup === sub.fullName
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="truncate">{sub.name}</span>
                                        <span className="text-[9px] opacity-60 ml-2">{sub.count}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
