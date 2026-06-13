import {useEffect, useState} from "react";
import {iUser} from "@/types/user";
import {iComment} from "@/types/comment";
import {useProfileComments} from "@/services/comments.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Comments from "@/components/features/comment/Comments";

export default function CommentsProfileTab({user}: {user: iUser}) {
    const [index, setIndex] = useState(0);
    const {data} = useProfileComments(user.id, index);
    const [actualComments, setComments] = useState<iComment[]>([]);
    const [totalPage, setTotalPage] = useState(1);

    useEffect(() => {
        if (!data)
            return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setComments(data.data);
        setTotalPage(computeTotalPage(data));
    }, [data]);

    return (<div className="max-w-3xl w-full mx-auto">
        <Comments user={user} comments={actualComments} index={index} setIndex={setIndex} totalPage={totalPage} setComments={setComments} profilePage={true} />
    </div>);
}
