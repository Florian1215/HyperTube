import {iMedia} from "@/types/media";

/** Link to a media page; with an episode, the page opens on it and shows its image in the hero. */
export default function formatURL(media: iMedia, episode?: {season_number: number, episode_number: number}) {
    const url = `/${media.type}/${media.id}`;

    return episode ? `${url}?season=${episode.season_number}&episode=${episode.episode_number}` : url;
}
