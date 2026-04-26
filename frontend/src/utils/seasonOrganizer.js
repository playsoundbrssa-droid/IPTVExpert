/**
 * Utilitário para organizar uma lista plana de episódios em uma estrutura de temporadas.
 * Prioriza propriedades explícitas (season/episode) e faz fallback para detecção via Regex.
 */
export const organizeBySeasons = (episodes) => {
    const seasons = {};

    episodes.forEach((ep, index) => {
        const name = ep.name || '';
        
        // 1. Tentar pegar das propriedades explícitas (especialmente para Xtream)
        let seasonNum = ep.season !== undefined ? parseInt(ep.season) : null;
        let episodeNum = ep.episode !== undefined ? parseInt(ep.episode) : null;

        // 2. Se não houver propriedades explícitas, tentar detectar pelo nome (M3U)
        if (seasonNum === null) {
            // Padrões: S01E01, 1x01, Season 1, Temporada 1, T1
            const sMatch = name.match(/s(\d+)/i) || 
                          name.match(/(\d+)x/i) || 
                          name.match(/(?:temporada|season|t)\s*(\d+)/i);
            seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
        }

        if (episodeNum === null) {
            // Padrões: E01, x01, Ep 1, Episode 1, Cap 1, E1
            const eMatch = name.match(/e(\d+)/i) || 
                          name.match(/x(\d+)/i) || 
                          name.match(/(?:episódio|episode|ep|capítulo|cap|e)\s*(\d+)/i);
            episodeNum = eMatch ? parseInt(eMatch[1]) : (ep.order || index + 1);
        }

        // Garantir que seasonNum seja um número válido
        if (isNaN(seasonNum)) seasonNum = 1;

        if (!seasons[seasonNum]) {
            seasons[seasonNum] = [];
        }

        seasons[seasonNum].push({
            ...ep,
            season: seasonNum,
            episode: episodeNum,
            order: episodeNum
        });
    });

    // Ordenar episódios dentro de cada temporada
    Object.keys(seasons).forEach(s => {
        seasons[s].sort((a, b) => a.order - b.order);
    });

    return seasons;
};
