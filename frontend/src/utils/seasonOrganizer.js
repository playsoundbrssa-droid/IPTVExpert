/**
 * Utilitário para organizar uma lista plana de episódios em uma estrutura de temporadas
 */
export const organizeBySeasons = (episodes) => {
    if (!episodes || !Array.isArray(episodes)) return {};
    
    const seasons = {};
    console.log(`[SEASON_ORG] Organizando ${episodes.length} episódios.`);

    episodes.forEach((ep) => {
        const name = ep.name || '';
        
        // Prioridade 1: Metadados explícitos (Xtream ou processados)
        let seasonNum = ep.season || null;
        let episodeNum = ep.episode || ep.order || null;

        // Se não tiver metadados, tenta extrair do nome (M3U)
        if (!seasonNum) {
            const sMatch = 
                name.match(/s(\d+)/i) || 
                name.match(/(\d+)x/i) || 
                name.match(/temporada\s+(\d+)/i) ||
                name.match(/t(\d+)/i) || // Suporte a T1, T01
                name.match(/season\s+(\d+)/i);

            const eMatch = 
                name.match(/e(\d+)/i) || 
                name.match(/x(\d+)/i) || 
                name.match(/episódio\s+(\d+)/i) ||
                name.match(/ep\s*(\d+)/i) ||
                name.match(/capítulo\s+(\d+)/i) ||
                name.match(/cap\s*(\d+)/i);

            seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
            episodeNum = eMatch ? parseInt(eMatch[1]) : 1;
        }

        if (!seasons[seasonNum]) {
            seasons[seasonNum] = [];
        }

        seasons[seasonNum].push({
            ...ep,
            season: seasonNum,
            episode: episodeNum,
            order: episodeNum || seasons[seasonNum].length + 1
        });
    });

    // Ordenar episódios dentro de cada temporada
    Object.keys(seasons).forEach(s => {
        seasons[s].sort((a, b) => a.order - b.order);
    });

    console.log(`[SEASON_ORG] Resultado: ${Object.keys(seasons).length} temporadas encontradas.`, Object.keys(seasons));
    return seasons;
};
