"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import {Link} from "@/i18n/navigation";
import ProfilePicture from "@/components/ProfilePicture";
import FollowButton from "@/components/FollowButton";
import {UserContextMenu} from "@/components/UserRightClick";
import InfiniteScroll from "@/components/ui/InfiniteScroll";
import {useUserFollows} from "@/services/users.service";

export default function FollowsModal() {
    const {activeModal, closeModal} = useModal();
    const follows = activeModal.type === "follows" ? activeModal.follows : undefined;

    if (!follows)
        return null;
    return <FollowsList key={`${follows.user.id}-${follows.list}`} userId={follows.user.id} list={follows.list} onClose={closeModal}/>;
}

function FollowsList({userId, list, onClose}: {userId: number, list: "following" | "followers", onClose: () => void}) {
    const t = useTranslations("profile");
    const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useUserFollows(userId, list);
    const users = data?.pages.flatMap((page) => page.results) ?? [];
    const loader = <div className="h-14 relative"><div className="custom-loading"/></div>;

    return (<ModalLayout title={t(list === "following" ? "followingTitle" : "followersTitle")} onCloseAction={onClose}>
        <div className="w-full sm:w-md max-h-100 overflow-y-auto">
            {isLoading ? loader : users.length === 0 ? <p className="p-2 text-gray">{t(list === "following" ? "noFollowing" : "noFollowers")}</p> :
                <InfiniteScroll hasMore={!!hasNextPage} loading={isFetchingNextPage} onLoadMore={() => void fetchNextPage()} loader={loader}>
                    <div className="divide-y divide-gray">
                        {users.map((user) => <UserContextMenu key={user.id} user={user}><div className="flex items-center gap-4 p-2 hover:bg-dwhite-light">
                            <Link href={`/users/${user.id}`} onClick={onClose} className="flex flex-1 min-w-0 items-center gap-4">
                                <ProfilePicture size={3} user={user}/>
                                <span className="flex-1 min-w-0 truncate text-left font-semibold">{user.username}</span>
                            </Link>
                            <FollowButton user={user} className="w-28 shrink-0"/>
                        </div></UserContextMenu>)}
                    </div>
                </InfiniteScroll>}
        </div>
    </ModalLayout>);
}
