import {tListResponse} from "@/types/api";

export default function computeTotalPage(data?: tListResponse<unknown>) {
    if (data && data.count > 0 && data.results.length !== 0)
        return Math.ceil(data.count / data.per_page);
    return 1;
}
