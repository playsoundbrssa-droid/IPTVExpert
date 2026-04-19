const { categorizeItem } = require('../src/services/m3uParserService');

const testCases = [
    { 
        name: 'Matrix 4K', 
        group: { title: 'FILMES 4K' }, 
        url: 'http://cdn.com/movie123.mp4', 
        expected: 'movies',
        description: 'Filme 4K com extensão .mp4' 
    },
    { 
        name: 'Globo RJ HD', 
        group: { title: 'CANAIS ABERTOS' }, 
        url: 'http://cdn.com/stream.m3u8', 
        expected: 'channels',
        description: 'Canal de TV HD em grupo de canais' 
    },
    { 
        name: 'The Boys S01E01', 
        group: { title: 'VOD' }, 
        url: 'http://cdn.com/series/video.mkv', 
        expected: 'series',
        description: 'Série com padrão S01E01 em grupo genérico VOD' 
    },
    { 
        name: 'Telecine Premium', 
        group: { title: 'TELECINE' }, 
        url: 'http://cdn.com/live.ts', 
        expected: 'channels',
        description: 'Canal Telecine (Live)' 
    },
    { 
        name: 'Novela Renascer', 
        group: { title: 'NOVELAS' }, 
        url: 'http://cdn.com/novela.mp4', 
        expected: 'series',
        description: 'Novela deve ser tratada como série' 
    },
    { 
        name: 'Batman vs Superman', 
        group: { title: 'Cinema' }, 
        url: 'http://cdn.com/movie.avi', 
        expected: 'movies',
        description: 'Filme em grupo Cinema com extensão .avi' 
    }
];

console.log('--- INICIANDO TESTES DE CATEGORIZAÇÃO ---\n');

let passed = 0;
testCases.forEach((t, i) => {
    const result = categorizeItem({ name: t.name, group: t.group, url: t.url });
    const success = result === t.expected;
    if (success) passed++;
    
    console.log(`${i + 1}. [${success ? '✅' : '❌'}] ${t.description}`);
    if (!success) {
        console.log(`   Esperado: ${t.expected} | Recebido: ${result}`);
    }
});

console.log(`\n--- RESULTADO: ${passed}/${testCases.length} PASSOU ---`);

process.exit(passed === testCases.length ? 0 : 1);
