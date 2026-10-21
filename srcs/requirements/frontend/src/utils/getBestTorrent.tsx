import {iTorrent} from "@/types/media";

const MOVIE_SIZE = {min: 1.5, ideal: 2.5, max: 3.5};
const EPISODE_SIZE = {min: 0.3, ideal: 1, max: 1.5};

const statusScore: Record<string, number> = {
    "completed": 3000,
    "transcoding": 2000,
    "downloading": 1000,
};

const qualityScore: Record<string, number> = {
    "2160p": 100,
    "1080p": 70,
    "720p": 40,
    "480p": 20,
};

const languageScore: Record<string, number> = {
    "MULTI": 30,
    "TRUEFRENCH": 25,
    "FRENCH": 20,
    "VOSTFR": 10,
    "VO": 0,
};

function getExpectedSize(torrent: iTorrent, isSerie: boolean, episodeCount?: number) {
    if (!isSerie)
        return MOVIE_SIZE;
    if (!torrent.is_season_pack)
        return EPISODE_SIZE;
    if (!episodeCount)
        return null;
    return {min: EPISODE_SIZE.min * episodeCount, ideal: EPISODE_SIZE.ideal * episodeCount, max: EPISODE_SIZE.max * episodeCount};
}

export default function getBestTorrent(torrents?: iTorrent[], isSerie = false, episodeCount?: number) {
    if (!torrents || !torrents.length)
        return null;

    const rank = (strictSize: boolean) => torrents.flatMap((torrent) => {
        const expected = getExpectedSize(torrent, isSerie, episodeCount);
        const status = statusScore[torrent.status] || 0;
        if (strictSize && expected && !status && (torrent.size < expected.min || torrent.size > expected.max))
            return [];

        const sizeScore = expected ? 30 * (1 - Math.min(1, Math.abs(torrent.size - expected.ideal) / (expected.max - expected.min))) : 0;
        const seedScore = Math.log10(torrent.seeders + 1) * 30;
        const score = status +
            (qualityScore[torrent.quality] || 0) +
            (languageScore[torrent.language] || 0) +
            seedScore +
            sizeScore;
        return [{torrent, score}];
    });
    let ranked = rank(true);
    if (!ranked.length)
        ranked = rank(false);
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0].torrent;
}
