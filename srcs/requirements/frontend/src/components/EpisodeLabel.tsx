import {useTranslations} from "next-intl";

export default function EpisodeLabel({season, episode, className}: {season: number, episode: number, className?: string}) {
    const t = useTranslations("serie");

    return (<p className={"text-xs opacity-70 " + (className ?? "")}>
        {t("seasonEpisode", {season, episode})}
    </p>);
}
