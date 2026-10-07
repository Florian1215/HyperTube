import {useState} from "react";
import {useTranslations} from "next-intl";
import computeTotalPage from "@/utils/computeTotalPage";
import Pagination from "@/components/ui/Pagination";
import MediasGrid from "@/components/MediasGrid";
import {useUserHistory} from "@/services/users.service";
import {iUser} from "@/types/user";
import {tMedia} from "@/types/utils";
import SmallText from "@/components/ui/SmallText";
import useAuth from "@/contexts/AuthContext";

export default function ProfileTabMediaHistory({user, type}: {user: iUser, type: tMedia}) {
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

export function ProfileTabMovies({user}: {user: iUser}) {
    return (<ProfileTabMediaHistory user={user} type="movies"/>);
}

export function ProfileTabSeries({user}: {user: iUser}) {
    return (<ProfileTabMediaHistory user={user} type="series"/>);
}
