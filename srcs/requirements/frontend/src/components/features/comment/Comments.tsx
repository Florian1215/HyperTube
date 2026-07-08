import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import {deleteComment, patchComment} from "@/services/comments.service";
import Pagination from "@/components/ui/Pagination";
import Comment from "@/components/features/comment/Comment";
import {iUser} from "@/types/user";
import {iComment, iCommentDetails} from "@/types/comment";
import dayjs from "dayjs";
import SmallText from "@/components/ui/SmallText";

export default function Comments({currentUser, comments, setComments, index, setIndex, totalPage, profilePage=false}: {currentUser?: iUser, comments: iComment[], setComments: (newComments: iComment[] | iCommentDetails[]) => void, index: number, setIndex: (newIndex: number) => void, totalPage: number, profilePage?: boolean}) {
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
                patchComment(locale, commentId, newComment.content).then(() => {});
                return newComment;
            }
            else
                return comment;
        }));
        addNotification(tSuccess("commentChange"), "success");
    }

    const deleteDisplayComment = (commentId: number) => deleteComment(locale, commentId).then(() => setComments(comments.filter(c => c.id !== commentId)));

    if (!comments || comments.length === 0)
        return (<SmallText>{t(profilePage ? "noCommentsYet" : "noCommentsPrompt")}</SmallText>);

    return (<Pagination currenIndex={index} totalPage={totalPage} onClick={changeIndex}>
        <div className="flex flex-col gap-6">
            {comments.map((comment, index) => {
                const previousComment: iCommentDetails | null = (profilePage && index > 0) ? comments[index - 1] as iCommentDetails : null;
                return (<Comment key={index} currentUser={currentUser} comment={comment} updateComment={updateComment}
                         deleteComment={deleteDisplayComment} previousCommentMovieId={previousComment?.movie.imdb_id}/>);
            })}
        </div>
    </Pagination>);
}
