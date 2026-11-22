import {useQueryClient} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import useApiMutation from "@/hooks/useApiMutation";
import useNotification from "@/contexts/NotificationContext";
import {blockUser} from "@/services/users.service";
import {iUser} from "@/types/user";

// everything a block can change: profiles, follows, lists of users and the friends activity
const BLOCK_QUERIES = ["user", "users", "user-follows", "user-blocked", "user-media-history"];

export default function useBlockUser() {
    const {execute} = useApiMutation();
    const queryClient = useQueryClient();
    const {addNotification} = useNotification();
    const t = useTranslations("profile");

    return async (user: iUser, block = !user.is_blocked) => {
        const data = await execute((locale) => blockUser(locale, user.id, block));
        if (!data)
            return null;
        BLOCK_QUERIES.forEach((key) => void queryClient.invalidateQueries({queryKey: [key]}));
        addNotification(t(block ? "blocked" : "unblocked", {username: user.username}), "success");
        return data;
    };
}
