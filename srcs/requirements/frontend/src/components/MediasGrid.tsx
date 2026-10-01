import useAuth from "@/contexts/AuthContext";
import useResponsiveSize from "@/hooks/useResponsiveSize";
import {iMedia} from "@/types/media";
import MediaCard from "@/components/MediaCard";

export default function MediasGrid({mediaSets, setLimit, className, inHistory=false} : {mediaSets?: iMedia[], setLimit?: boolean, className?: string, inHistory?: boolean}) {
    const {user} = useAuth();
    const size = useResponsiveSize();

    let mediasCount = 4;
    if (size === "xl")
        mediasCount = 3;
    else if (size === "xs")
        mediasCount = 2;

    return (<div className={"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 " + className}>
        {mediaSets ?
            (setLimit ? mediaSets.slice(0, mediasCount) : mediaSets).map((media, i) => (<MediaCard key={i} media={media} user={user} inHistory={inHistory}/>)) :
            [...Array(mediasCount)].map((_, i) => (<MediaCard key={i} user={user}/>))
        }
    </div>);
}
