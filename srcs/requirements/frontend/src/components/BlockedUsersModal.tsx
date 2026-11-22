"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import ProfilePicture from "@/components/ProfilePicture";
import InfiniteScroll from "@/components/ui/InfiniteScroll";
import TagButton from "@/components/ui/Button/TagButton";
import {useBlockedUsers} from "@/services/users.service";
import useBlockUser from "@/hooks/useBlockUser";

export default function BlockedUsersModal() {
    const {activeModal, closeModal} = useModal();

    if (activeModal.type !== "blocked")
        return null;
    return <BlockedUsersList onClose={closeModal}/>;
}

function BlockedUsersList({onClose}: {onClose: () => void}) {
    const t = useTranslations("profile");
    const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useBlockedUsers();
    const toggleBlock = useBlockUser();
    const users = data?.pages.flatMap((page) => page.results) ?? [];
    const loader = <div className="h-14 relative"><div className="custom-loading"/></div>;

    // blocked users can't be visited from here: their profile is not the point of this list
    return (<ModalLayout title={t("blockedTitle")} onCloseAction={onClose}>
        <div className="w-full sm:w-md max-h-100 overflow-y-auto">
            {isLoading ? loader : users.length === 0 ? <p className="p-2 text-gray">{t("noBlocked")}</p> :
                <InfiniteScroll hasMore={!!hasNextPage} loading={isFetchingNextPage} onLoadMore={() => void fetchNextPage()} loader={loader}>
                    <div className="divide-y divide-gray">
                        {users.map((user) => <div key={user.id} className="flex items-center gap-4 p-2">
                            <ProfilePicture size={3} user={user}/>
                            <span className="flex-1 min-w-0 truncate text-left font-semibold">{user.username}</span>
                            <TagButton className="w-28 shrink-0" onClick={() => void toggleBlock(user, false)}>{t("unblockShort")}</TagButton>
                        </div>)}
                    </div>
                </InfiniteScroll>}
        </div>
    </ModalLayout>);
}
