import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import React, {useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {addCommentCache, postComment, useComments} from "@/services/comments.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Colors from "@/components/Colors";
import TextButton from "@/components/ui/Button/TextButton";
import {iUser} from "@/types/user";
import useApiMutation from "@/hooks/useApiMutation";
import {useQueryClient} from "@tanstack/react-query";
import {iCommentDetails} from "@/types/comment";
import Button from "@/components/ui/Button/Button";
import ProfilePicture from "@/components/ProfilePicture";
import Comments from "@/components/Comments";
import {iMedia} from "@/types/media";

export default function CommentsSection({media}: {media: iMedia}) {
    const {user} = useAuth();
    const {openModal} = useModal();
    const [index, setIndex] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const t = useTranslations("comments");
    const {data} = useComments(media.type, media.id, index);

    useEffect(() => {
        if (!data)
            return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTotalPage(computeTotalPage(data));
    }, [data]);

    return (<div className="mx-auto max-w-2xl w-9/10 flex flex-col items-center gap-7 mb-10">
        <div className="w-full">
            <h2 className="text-center">{t("title")}</h2>
            <Colors className="mt-1 sm:mt-2" />
        </div>
        <div className="w-full text-center">
            {
                user ?
                    <div className="flex gap-2 sm:gap-4">
                        <ProfilePicture user={user}/>
                        <NewComment user={user} media={media} />
                    </div> :
                    <TextButton onClick={() => openModal({type: "signin"})}>{t("signInToComment")}</TextButton>
            }
        </div>
        <Comments currentUser={user} comments={data?.results ?? []} index={index} setIndex={setIndex} totalPage={totalPage} currentMedia={media}/>
    </div>);
}

function NewComment({user, media}: {user: iUser, media: iMedia}) {
    const [expendComment, setExpendComment] = useState(false);
    const [comment, setComment] = useState("");
    const t = useTranslations("comments");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const {execute} = useApiMutation(setErrors);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const queryClient = useQueryClient();

    const reset = () => {
        setComment("");
        setExpendComment(false);
        textareaRef?.current?.blur();
    };

    const handleComment = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (expendComment)
            setComment(e.target.value);
    }

    const handlePostComment = () => {
        const makePostRequest = async () => {
            return await execute((locale) => postComment(locale, media.type, media.id, comment.trim()));
        };

        makePostRequest().then((data) => {
            if (data) {
                data.user = user;
                const newComment = data as iCommentDetails;
                addCommentCache(queryClient, newComment, media, newComment.user.id);
            }
            reset();
        })
    }

    return (<div className="flex flex-col items-center w-full gap-2">
        <textarea ref={textareaRef} className={"border w-full block px-3 py-1.5" + (errors["content"] ? " border-red text-red" : "")}
                  style={{resize: expendComment ? "vertical" : "none"}}
                  maxLength={1000} rows={expendComment ? 5 : 1}
                  placeholder={expendComment ? "" : t("writeComment")}
                  onClick={() => setExpendComment(true)}
                  onKeyDown={(e) => {
                      if (comment.trim().length > 0 && e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                      }
                  }}
                  onChange={handleComment} value={comment}>
        </textarea>
        {errors["content"] && <span className="text-red text-xs">{errors["content"]}</span>}
        {expendComment && <Button onClick={handlePostComment} disabled={comment.trim().length <= 0} className="w-full">{t("publishComment")}</Button>}
        {expendComment && <TextButton onClick={reset}>{t("cancel")}</TextButton>}
    </div>);
}
