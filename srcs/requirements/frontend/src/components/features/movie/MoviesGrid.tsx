import useAuth from "@/contexts/AuthContext";
import useResponsiveSize from "@/hooks/useResponsiveSize";
import {iMovie} from "@/types/movie";
import MovieCard from "@/components/features/movie/MovieCard";

export default function MoviesGrid({movieSets, setLimit, className, showDate=false} : {movieSets?: iMovie[], setLimit?: boolean, className?: string, showDate?: boolean}) {
    const {user} = useAuth();
    const size = useResponsiveSize();

    let moviesCount = 4;
    if (size === "xl")
        moviesCount = 3;
    else if (size === "xs")
        moviesCount = 2;

    return (<div className={"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 " + className}>
        {movieSets ?
            (setLimit ? movieSets.slice(0, moviesCount) : movieSets).map((movie, i) => (<MovieCard key={i} movie={movie} user={user} showDate={showDate}/>)) :
            [...Array(moviesCount)].map((_, i) => (<MovieCard key={i} user={user} />))
        }
    </div>);
}
