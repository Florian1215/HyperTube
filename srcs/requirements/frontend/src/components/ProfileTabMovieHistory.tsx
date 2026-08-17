import {useState} from "react";
import {useTranslations} from "next-intl";
import computeTotalPage from "@/utils/computeTotalPage";
import Pagination from "@/components/ui/Pagination";
import MoviesGrid from "@/components/MoviesGrid";
import {useUserHistory} from "@/services/users.service";
import {iUser} from "@/types/user";
import SmallText from "@/components/ui/SmallText";

export default function ProfileTabMovieHistory({user}: {user: iUser}) {
    const [index, setIndex] = useState(1);
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const t = useTranslations("profile");
    const {data: watchMovies} = useUserHistory(user.id);
    const totalPage = computeTotalPage(watchMovies);

    if (!watchMovies || watchMovies.results.length === 0)
        return (<SmallText>{t("noMoviesYet")}</SmallText>);
    return (<Pagination currentIndex={index} onClick={changeIndex} totalPage={totalPage} variableMT={true}>
        <MoviesGrid movieSets={watchMovies.results} showDate={true}/>
    </Pagination>);
}
