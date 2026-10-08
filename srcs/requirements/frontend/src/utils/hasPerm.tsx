import {iUser} from "@/types/user";

export type tPerm = "medias.can_recommend_medias";

export default function hasPerm(user: iUser | undefined, perm: tPerm) {
    const perms = user?.perm ? user.perm.split(",") : [];
    return perms.includes("admin") || perms.includes(perm);
}
