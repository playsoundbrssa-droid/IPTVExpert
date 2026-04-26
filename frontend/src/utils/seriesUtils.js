/**
 * Limpa o nome de um item para extrair o título base da série.
 */
export const getSeriesBaseName = (name) => {
    if (!name) return '';
    return name
        // 1. Remove padrões de episódios e tudo que vem depois
        .replace(/\s*[[({]*\s*[sS]\d+[eE]\d+.*[\])}]*$/i, '') // S01E01 com ou sem colchetes
        .replace(/\s*[[({]*\s*(\d{1,2}x\d{1,2}|x\d{1,2}).*[\])}]*$/i, '') // 1x01
        .replace(/\s*[[({]*\s*(Temporada|Season|T)\s*\d+.*[\])}]*$/i, '') // Temporada/Season/T + N
        .replace(/\s*[[({]*\s*(Episódio|Capítulo|Ep|E)\s*\d+.*[\])}]*$/i, '') // Episódio/Capítulo/Ep/E + N
        
        // 2. Remove anos entre parênteses ou colchetes
        .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]].*/g, '')
        
        // 3. Remove tags de qualidade e áudio (finais ou meio)
        .replace(/\s*(4[kK]|1080[pP]|720[pP]|[fF][hH][dD]|[hH][dD]|[sS][dD]|[uU][hH][dD])\b/gi, '')
        .replace(/\s*(Dublado|Legendado|Dual|Multi|Legend|Dub)\b/gi, '')
        
        // 4. Limpeza de caracteres residuais no final
        .replace(/\s*[-|–—:._(]+\s*$/, '') // Trailing dashes, pipes, colons etc
        .trim();
};

/**
 * Tenta encontrar o melhor logo para uma série consolidated.
 * Prioriza logos que não pareçam ser thumbnails de episódios.
 */
export const getBestSeriesLogo = (items) => {
    if (!items || items.length === 0) return null;
    
    // Tenta encontrar um que não tenha padrões de episódio no nome do arquivo do logo
    const bestLogoItem = items.find(it => {
        if (!it.logo) return false;
        const logoLower = it.logo.toLowerCase();
        // Filtra logos que parecem miniaturas de episódios
        return !logoLower.includes('s0') && 
               !logoLower.includes('e0') && 
               !logoLower.includes('1x') &&
               !logoLower.includes('thumb') &&
               !logoLower.includes('snap');
    });

    return (bestLogoItem || items[0]).logo;
};
