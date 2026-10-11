import {iUser} from "@/types/user";
import {iMedia} from "@/types/media";

export default function MediaWatchProgress({user, media}: {user?: iUser, media?: Pick<iMedia, "pourcent">}) {
    if (user && media?.pourcent && media.pourcent > 0)
        return (<div className="absolute bottom-0 h-1.5 bg-accent z-10" style={{width: `${media.pourcent}%`}} />);
}
