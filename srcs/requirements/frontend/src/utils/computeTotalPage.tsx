import {iComment} from "@/types/comment";
import {iMovie} from "@/types/movie";
import {tListResponse} from "@/types/api";

export default function computeTotalPage(data?: tListResponse<iMovie[] | iComment[]>) {
    if (data?.meta)
        return Math.ceil(data.meta.total / data.meta.per_page);
    return 1;
}
