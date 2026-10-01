import {iUser} from "@/types/user";
import {iMedia} from "@/types/media";

export default function MediaWatchProgress({user, media}: {user?: iUser, media?: Pick<iMedia, "pourcent">}) {
    if (user && media?.pourcent && media.pourcent > 0)
        return (<div className={`absolute bottom-0 h-1 bg-${user.color} z-10`} style={{width: `${media.pourcent}%`}} />);
}
