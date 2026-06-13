import {useState} from "react";
import {useTranslations} from "next-intl";
import {useMovies} from "@/services/movies.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Pagination from "@/components/ui/Pagination";
import MoviesCard from "@/components/features/movie/MoviesCard";

export default function MovieHistoryTab() {
    const [index, setIndex] = useState(0);
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const t = useTranslations("profile");
    const {data: watchMovies} = useMovies("watched", index);
    const totalPage = computeTotalPage(watchMovies);

    if (!watchMovies || watchMovies.data.length === 0)
        return (<p className="small-text">{t("noMoviesYet")}</p>);
    return (<Pagination currenIndex={index} onClick={changeIndex} totalPage={totalPage}>
        <MoviesCard movieSets={watchMovies.data}/>
    </Pagination>);
}
