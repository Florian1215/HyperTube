import useAuth from "@/contexts/AuthContext";
import {iMovie} from "@/types/movie";
import useModal from "@/contexts/ModalContext";
import {useEffect, useState} from "react";
import {iComment} from "@/types/comment";
import {useTranslations} from "next-intl";
import {useComments} from "@/services/comments.service";
import computeTotalPage from "@/utils/computeTotalPage";
import Colors from "@/components/Colors";
import ProfilePicture from "@/components/ProfilePicture";
import NewComment from "@/components/features/comment/NewComment";
import TextButton from "@/components/ui/Button/TextButton";
import Comments from "@/components/features/comment/Comments";

export default function CommentsSection({movie}: {movie: iMovie}) {
    const {user} = useAuth();
    const {openModal} = useModal();
    const [actualComments, setComments] = useState<iComment[]>([]);
    const [index, setIndex] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const t = useTranslations("comments");
    const {data} = useComments(movie.imdb_id, index);

    useEffect(() => {
        if (!data)
            return;
        const newData = structuredClone(data.data);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setComments(newData);
        setTotalPage(computeTotalPage(data));
    }, [data]);

    const addNewComment = (newComment: iComment) => setComments([newComment, ...actualComments]);

    return (<div className="mx-auto max-w-2xl w-9/10 flex flex-col items-center gap-7 mb-10">
        <div className="w-full">
            <h1 className="text-center">{t("title")}</h1>
            <Colors className="mt-1 sm:mt-2" />
        </div>
        <div className="w-full text-center">
            {
                user !== null ?
                <div className="flex gap-2 sm:gap-4">
                    <ProfilePicture user={user}/>
                    <NewComment user={user} onSubmit={addNewComment} movie={movie} />
                </div> :
                <TextButton onClick={() => openModal({type: "signin"})}>{t("signInToComment")}</TextButton>
            }
        </div>
        <Comments user={user} comments={actualComments} setComments={setComments} index={index} setIndex={setIndex} totalPage={totalPage} />
    </div>);
}
