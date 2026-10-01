import {iMedia} from "@/types/media";

export default function formatURL(media: iMedia) {
    return `/${media.type}/${media.id}`;
}