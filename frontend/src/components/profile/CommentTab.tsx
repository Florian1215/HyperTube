import {Comments} from "@/components/Comments";
import {useEffect, useState} from "react";
import {iUser} from "@/types/user";
import {computeTotalPage} from "@/components/Pagination";
import {useComments} from "@/api/comments";
import {iComment} from "@/types/comment";

export default function CommentsTab({user}: {user: iUser}) {
    const [index, setIndex] = useState(0);
    const {data} = useComments(user.id, index);
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
