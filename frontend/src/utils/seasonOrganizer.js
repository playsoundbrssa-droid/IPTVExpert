/**
 * Utilitário para organizar uma lista plana de episódios em uma estrutura de temporadas
 */
export const organizeBySeasons = (episodes) => {
    if (!episodes || !Array.isArray(episodes)) return {};
    const seasons = {};

    episodes.forEach((ep) => {
        const name = ep.name || '';
        
        // Prioritize explicit properties if available (some backends/m3u provide them)
        let seasonNum = ep.season || null;
        let episodeNum = ep.episode || null;

        // Extraction using regex if not explicit
        if (seasonNum === null || episodeNum === null) {
            // Regex for Season: S01, S1, Season 1, Temporada 1, 1x01
            const sMatch = name.match(/[sS]\s*(\d+)/) || 
                          name.match(/(\d+)\s*x/i) || 
                          name.match(/(?:temporada|season)\s*(\d+)/i);
            
            // Regex for Episode: E01, E1, Episode 1, Episódio 1, 1x01
            const eMatch = name.match(/[eE]\s*(\d+)/) || 
                          name.match(/x\s*(\d+)/i) || 
                          name.match(/(?:epis[oó]dio|episode|capitulo|capítulo)\s*(\d+)/i);

            if (sMatch && seasonNum === null) seasonNum = parseInt(sMatch[1]);
            if (eMatch && episodeNum === null) episodeNum = parseInt(eMatch[1]);
        }

        // Fallback to Season 1 if not found
        seasonNum = seasonNum || 1;
        episodeNum = episodeNum || 0;

        if (!seasons[seasonNum]) {
            seasons[seasonNum] = [];
        }

        seasons[seasonNum].push({
            ...ep,
            order: episodeNum
        });
    });

    // Sort episodes within each season by their order (episode number)
    Object.keys(seasons).forEach(s => {
        seasons[s].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return seasons;
};
