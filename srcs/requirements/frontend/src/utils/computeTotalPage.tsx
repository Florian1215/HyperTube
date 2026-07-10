import {tListResponse} from "@/types/api";

export default function computeTotalPage(data?: tListResponse<unknown[]>) {
    if (data?.meta)
        return Math.ceil(data.meta.total / data.meta.per_page);
    return 1;
}
