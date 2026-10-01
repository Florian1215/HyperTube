import {useState} from "react";
import {useTranslations} from "next-intl";
import computeTotalPage from "@/utils/computeTotalPage";
import Pagination from "@/components/ui/Pagination";
import MediasGrid from "@/components/MediasGrid";
import {useUserHistory} from "@/services/users.service";
import {iUser} from "@/types/user";
import SmallText from "@/components/ui/SmallText";

export default function ProfileTabMediaHistory({user}: {user: iUser}) {
    const [index, setIndex] = useState(1);
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const t = useTranslations("profile");
    const {data: watchMedias} = useUserHistory(user.id);
    const totalPage = computeTotalPage(watchMedias);

    if (!watchMedias || watchMedias.results.length === 0)
        return (<SmallText>{t("noMediasYet")}</SmallText>);
    return (<Pagination currentIndex={index} onClick={changeIndex} totalPage={totalPage} variableMT={true}>
        <MediasGrid mediaSets={watchMedias.results} inHistory={true}/>
    </Pagination>);
}
