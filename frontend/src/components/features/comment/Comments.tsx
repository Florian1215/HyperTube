import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import {deleteComment, patchComment} from "@/services/comments.service";
import Pagination from "@/components/ui/Pagination";
import Comment from "@/components/features/comment/Comment";
import {iUser} from "@/types/user";
import {iComment} from "@/types/comment";
import dayjs from "dayjs";

export default function Comments({user, comments, setComments, index, setIndex, totalPage, profilePage = false}: {user: iUser | null, comments: iComment[], setComments: (newComments: iComment[]) => void, index: number, setIndex: (newIndex: number) => void, totalPage: number, profilePage?: boolean}) {
    const {addNotification} = useNotification();
    const locale = useLocale();
    const t = useTranslations("comments");
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const tSuccess = useTranslations("notifications.success");
    dayjs.locale(locale);

    const updateComment = (commentId: number, newContent: string) => {
        setComments(comments.map((comment) => {
            if (comment.id === commentId) {
                const newComment = structuredClone(comment);
                newComment.content = newContent.replace("\n\n", "\n");
                newComment.edited = true;
                patchComment(locale, commentId, newComment.content);
                return newComment;
            }
            else
                return comment;
        }));
        addNotification(tSuccess("commentChange"), "success");
    }

    const deleteDisplayComment = (commentId: number) => deleteComment(locale, commentId).then(() => setComments(comments.filter(c => c.id !== commentId)));

    if (!comments || comments.length === 0)
        return (<p className="small-text">{t(profilePage ? "noCommentsYet" : "noCommentsPrompt")}</p>);

    return (<Pagination currenIndex={index} totalPage={totalPage} onClick={changeIndex}>
        <div className="flex flex-col gap-6">
            {comments.map((comment, index) => <Comment key={index} currentUser={user} comment={comment} updateComment={updateComment} deleteComment={deleteDisplayComment} profilePage={profilePage} />)}
        </div>
    </Pagination>);
}
