/**
 * Utilitário para organizar uma lista plana de episódios em uma estrutura de temporadas
 */
export const organizeBySeasons = (episodes) => {
    const seasons = {};

    episodes.forEach((ep) => {
        const name = ep.name || '';
        
        let seasonNum = ep.season || 1;
        let episodeNum = ep.episode || 1;

        // Tenta extrair do nome apenas se não houver já explícito
        if (!ep.season || !ep.episode) {
            const sMatch = name.match(/s(\d+)/i) || name.match(/(\d+)x/i) || name.match(/temporada\s+(\d+)/i);
            const eMatch = name.match(/e(\d+)/i) || name.match(/x(\d+)/i) || name.match(/episódio\s+(\d+)/i);

            if (sMatch) seasonNum = parseInt(sMatch[1]);
            if (eMatch) episodeNum = parseInt(eMatch[1]);
        }

        if (!seasons[seasonNum]) {
            seasons[seasonNum] = [];
        }

        seasons[seasonNum].push({
            ...ep,
            order: episodeNum
        });
    });

    // Ordenar episódios dentro de cada temporada
    Object.keys(seasons).forEach(s => {
        seasons[s].sort((a, b) => a.order - b.order);
    });

    return seasons;
};
