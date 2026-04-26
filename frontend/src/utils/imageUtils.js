/**
 * Garante que a URL da imagem seja segura (HTTPS) ou use o proxy se necessário.
 * Essencial para evitar erros de "Mixed Content" no Vercel.
 */
export const safeImageUrl = (url) => {
    if (!url) return null;
    
    // Se já for Base64 ou Blob, retorna original
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    // Tenta forçar HTTPS primeiro
    // A maioria dos CDNs de IPTV já suporta HTTPS, mas os links vêm com HTTP por padrão
    let safeUrl = url.replace(/^http:\/\//i, 'https://');

    return safeUrl;
};
