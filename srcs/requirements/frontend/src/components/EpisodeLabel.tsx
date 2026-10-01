import {useTranslations} from "next-intl";
import formatTime from "@/utils/formatTime";

export default function EpisodeLabel({season, episode, runtime = 0, className}: {season: number, episode: number, runtime?: number, className?: string}) {
    const t = useTranslations("serie");

    return (<p className={"text-xs opacity-70 " + (className ?? "")}>
        {t("seasonEpisode", {season, episode})}
        {runtime > 0 && ` · ${formatTime(runtime)}`}
    </p>);
}
