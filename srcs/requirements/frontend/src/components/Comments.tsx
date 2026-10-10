import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import {deleteComment, patchComment} from "@/services/comments.service";
import Pagination from "@/components/ui/Pagination";
import Comment from "@/components/Comment";
import {iUser} from "@/types/user";
import {iComment, iCommentDetails} from "@/types/comment";
import dayjs from "dayjs";
import SmallText from "@/components/ui/SmallText";
import {useQueryClient} from "@tanstack/react-query";
import {removeCommentCache, updateCommentCache} from "@/services/comments.service";

export default function Comments({currentUser, comments, index, setIndex, totalPage, profilePage=false}: {currentUser?: iUser, comments: iComment[], index: number, setIndex: (newIndex: number) => void, totalPage: number, profilePage?: boolean}) {
    const {addNotification} = useNotification();
    const locale = useLocale();
    const t = useTranslations("comments");
    const queryClient = useQueryClient();
    const changeIndex = (newIndex: number) => {setIndex(newIndex);}
    const tSuccess = useTranslations("notifications.success");
    dayjs.locale(locale);

    const updateComment = (comment: iComment, newContent: string) => {
        patchComment(locale, comment.id, newContent.replace("\n\n", "\n")).then((saved) => {
            updateCommentCache(queryClient, saved);
            addNotification(tSuccess("commentChange"), "success");
        }).catch((e) => addNotification(e instanceof Error ? e.message : String(e), "error"));
    }

    const deleteDisplayComment = async (commentId: number) => {
        deleteComment(locale, commentId).then(() => {
            if (currentUser)
                removeCommentCache(queryClient, commentId, currentUser.id);
        });
    };

    if (!comments || comments.length === 0)
        return (<SmallText>{t(profilePage ? "noCommentsYet" : "noCommentsPrompt")}</SmallText>);

    return (<Pagination currentIndex={index} totalPage={totalPage} onClick={changeIndex}>
        <div className="flex flex-col gap-6">
            {comments.map((comment, index) => {
                const previousComment: iCommentDetails | null = (profilePage && index > 0) ? comments[index - 1] as iCommentDetails : null;
                return (<Comment key={index} currentUser={currentUser} comment={comment} updateComment={updateComment}
                         deleteComment={deleteDisplayComment} previousCommentMovieId={previousComment?.media.id}/>);
            })}
        </div>
    </Pagination>);
}
