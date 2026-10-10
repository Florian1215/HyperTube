import {iMedia} from "@/types/media";

export default function formatReleaseDate(media: Pick<iMedia, "release_date">, locale: string) {
    if (!media.release_date)
        return undefined;
    return new Date(media.release_date).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"});
}
