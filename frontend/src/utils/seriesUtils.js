/**
 * Limpa o nome de um item para extrair o título base da série.
 */
export const getSeriesBaseName = (name) => {
    if (!name) return '';
    return name
        // 1. Remove padrões de episódios e tudo que vem depois
        .replace(/\s*[sS]\d+\s*[eE]\d+.*/i, '')
        .replace(/\s*[sS]\s*\d+\s*[eE]\s*\d+.*/i, '')
        .replace(/\s*(\d{1,2}\s*x\s*\d{1,2}|x\d{1,2}).*/i, '')
        .replace(/\s*(?:temporada|season|epis[oó]dio|episode|capitulo|capítulo|ep)\s*\d+.*/i, '')
        
        // 2. Remove anos entre parênteses ou colchetes (se vierem depois do nome)
        .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]].*/g, '')
        
        // 3. REMOÇÃO AGRESSIVA DE TAGS TÉCNICAS
        .replace(/\s*[\(\[].*?[\)\]]/g, ' ') // Remove qualquer coisa entre () ou []
        .replace(/\s*\b(4[kK]|[uU][hH][dD]|[fF][hH][dD]|1080[pP]|[hH][dD]|720[pP]|[sS][dD])\b/gi, '')
        .replace(/\s*\b([hH]264|[hH]265|[hH][eE][vV][cC]|[xX]264|[xX]265|[aA][vV][cC])\b/gi, '')
        .replace(/\s*\b([hH][dD][rR]|[dD][oO][lL][bB][yY]|[aA][tT][mM][oO][sS])\b/gi, '')
        .replace(/\s*\b([dD][uU][bB][lL][aA][dD][oO]|[lL][eE][gG][eE][nN][dD][aA][dD][oO]|[dD][uU][aA][lL]|[mM][uU][lL][tT][iI]|[oO][rR][iI][gG][iI][nN][aA][lL])\b/gi, '')
        .replace(/\s*\b([wW][eE][bB]-?[dD][lL]|[bB][lL][uU]-?[rR][aA][yY]|[hH][dD][tT][vV]|[hH][dD]-?[rR][iI][pP])\b/gi, '')
        .replace(/\s*\b(netflix|amazon|disney|apple|hbo|globoplay)\b/gi, '')
        
        // 4. Limpeza de caracteres residuais e espaços duplos
        .replace(/\s*[-|–—:._(]+\s*$/, '') 
        .replace(/\s+/g, ' ')
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
