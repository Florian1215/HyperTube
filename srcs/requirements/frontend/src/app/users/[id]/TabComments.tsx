import {useState} from "react";
import {iUser} from "@/types/user";
import {useProfileComments} from "@/services/comments.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Comments from "@/components/Comments";
import useAuth from "@/contexts/AuthContext";
import SmallText from "@/components/ui/SmallText";
import {useTranslations} from "next-intl";

export default function TabComments({user}: {user: iUser}) {
    const [index, setIndex] = useState(1);
    const {data: comments} = useProfileComments(user.id, index);
    const {user: currentUser} = useAuth();
    const totalPage = computeTotalPage(comments);
    const t = useTranslations("profile");

    if (user.can_see_history === false)
        return (<SmallText>{t("privateComments")}</SmallText>);
    return (<div className="max-w-3xl w-full mx-auto">
        <Comments currentUser={currentUser} comments={comments?.results ?? []} index={index} setIndex={setIndex} totalPage={totalPage} profilePage={true}/>
    </div>);
}
