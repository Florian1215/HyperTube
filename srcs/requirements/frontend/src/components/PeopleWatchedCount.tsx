import {useTranslations} from "next-intl";
import {EyeIcon} from "@/components/Icons";
import {iPeople} from "@/types/media";
import {iUser} from "@/types/user";

export default function PeopleWatchedCount({user, people, total, size = 16, className}: {user?: iUser, people: iPeople, total?: number, size?: number, className?: string}) {
    const t = useTranslations("people");
    const watched = people.watched_count ?? 0;
    const isFull = total !== undefined ? (watched === total && user) : false;

    if (total === undefined ? watched === 0 : total === 0)
        return null;

    return (<span className={"flex items-center gap-1 shrink-0 " + (isFull ? `text-${user?.color}` : "text-black") + (className ?? "")} title={t("watched", {count: watched})}>
        <EyeIcon size={size} color={isFull? user?.color : "black"}/>
        <span className="text-sm font-bold">{watched}{total !== undefined && `/${total}`}</span>
    </span>);
}
