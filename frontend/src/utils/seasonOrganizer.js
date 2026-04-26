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
            // Busca específica por S01, S1, etc. Prioriza o final do nome ou padrões isolados
            const sMatch = name.match(/s(\d+)/i) || 
                          name.match(/(?:temporada|season|t)\s*(\d+)/i) ||
                          name.match(/(\d+)x/i);
            seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
        }

        if (episodeNum === null) {
            // Busca específica por E01, E1, Ep1, etc.
            const eMatch = name.match(/e(\d+)/i) || 
                          name.match(/(?:episódio|episode|ep|capítulo|cap|e)\s*(\d+)/i) ||
                          name.match(/x(\d+)/i);
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
