import {useState} from "react";
import {iUser} from "@/types/user";
import {useProfileComments} from "@/services/comments.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Comments from "@/components/Comments";
import useAuth from "@/contexts/AuthContext";

export default function ProfileTabComments({user}: {user: iUser}) {
    const [index, setIndex] = useState(1);
    const {data: comments} = useProfileComments(user.id, index);
    const {user: currentUser} = useAuth();
    const totalPage = computeTotalPage(comments);

    return (<div className="max-w-3xl w-full mx-auto">
        <Comments currentUser={currentUser} comments={comments?.results ?? []} index={index} setIndex={setIndex} totalPage={totalPage} profilePage={true}/>
    </div>);
}
