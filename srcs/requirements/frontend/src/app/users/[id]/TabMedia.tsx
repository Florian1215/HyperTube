import {useState} from "react";
import {useTranslations} from "next-intl";
import computeTotalPage from "@/utils/computeTotalPage";
import Pagination from "@/components/ui/Pagination";
import MediasGrid from "@/components/MediasGrid";
import {useUserHistory, useUserWatchlist} from "@/services/users.service";
import {iUser} from "@/types/user";
import {tMedia} from "@/types/utils";
import SmallText from "@/components/ui/SmallText";
import useAuth from "@/contexts/AuthContext";

export default function TabMediaHistory({user, type}: {user: iUser, type: tMedia}) {
    const [index, setIndex] = useState(1);
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const t = useTranslations("profile");
    const {user: authUser} = useAuth();
    const grouped = type === "series" && (authUser?.group_series ?? true);
    const {data: watchMedias} = useUserHistory(user.id, type, index, grouped);
    const totalPage = computeTotalPage(watchMedias);

    if (watchMedias && watchMedias.results.length === 0)
        return (<SmallText>{t("noMediasYet")}</SmallText>);
    return (<Pagination currentIndex={index} onClick={changeIndex} totalPage={totalPage} variableMT={true}>
        <MediasGrid mediaSets={watchMedias?.results} inHistory={true}/>
    </Pagination>);
}

export function TabWatchlist({user}: {user: iUser}) {
    const [index, setIndex] = useState(1);
    const t = useTranslations("profile");
    const {data: medias} = useUserWatchlist(user.id, index);

    if (medias && medias.results.length === 0)
        return (<SmallText>{t("noWatchlistYet")}</SmallText>);
    return (<Pagination currentIndex={index} onClick={setIndex} totalPage={computeTotalPage(medias)} variableMT={true}>
        <MediasGrid mediaSets={medias?.results}/>
    </Pagination>);
}

export function TabMovies({user}: {user: iUser}) {
    return (<TabMediaHistory user={user} type="movies"/>);
}

export function TabSeries({user}: {user: iUser}) {
    return (<TabMediaHistory user={user} type="series"/>);
}
