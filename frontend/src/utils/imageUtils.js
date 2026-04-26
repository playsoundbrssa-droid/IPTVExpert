/**
 * Garante que a URL da imagem seja segura (HTTPS) ou use o proxy se necessário.
 */
export const safeImageUrl = (url) => {
    if (!url) return null;
    
    // Se já for Base64 ou Blob, retorna original
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    // Tenta forçar HTTPS primeiro (a maioria dos servidores modernos suporta)
    let safeUrl = url.replace(/^http:\/\//i, 'https://');

    // Se o domínio for conhecido por ter problemas de SSL ou se quisermos garantir 100% de sucesso,
    // poderíamos rotear pelo proxy aqui. Por enquanto, apenas forçamos HTTPS para limpar o aviso do console.
    return safeUrl;
};
