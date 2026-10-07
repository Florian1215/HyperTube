"use client";

import {useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import {iUser} from "@/types/user";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import useApiMutation from "@/hooks/useApiMutation";
import {updateQuery} from "@/hooks/useApiQuery";
import {followUser} from "@/services/users.service";
import TagButton from "@/components/ui/Button/TagButton";

export default function FollowButton({user, className}: {user: iUser, className?: string}) {
    const {user: authUser} = useAuth();
    const {openModal} = useModal();
    const {execute} = useApiMutation();
    const queryClient = useQueryClient();
    const t = useTranslations("profile");
    const [pending, setPending] = useState(false);

    if (authUser?.id === user.id)
        return null;

    const handleFollow = async () => {
        if (!authUser) {
            openModal({type: "signin"});
            return;
        }
        setPending(true);
        const data = await execute((locale) => followUser(locale, user.id, !user.is_following));
        if (data) {
            queryClient.setQueriesData({queryKey: ["user", String(user.id)]}, data);
            updateQuery(queryClient, ["users"], data);
        }
        setPending(false);
    };

    return (<TagButton onClick={handleFollow} disabled={pending} className={className}>
        {t(user.is_following ? "unfollow" : "follow")}
    </TagButton>);
}
