const parser = require('iptv-playlist-parser');

const m3u = `
#EXTM3U
#EXTINF:-1 tvg-id="id1" tvg-name="Canal 1" tvg-logo="logo1" group-title="Grupo 1",Canal 1
http://example.com/1.ts
`;

const result = parser.parse(m3u);
console.log(JSON.stringify(result, null, 2));
