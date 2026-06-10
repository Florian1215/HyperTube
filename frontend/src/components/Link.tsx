import React from "react";
import {useModal} from "@/context/ModalContext";
import {Link} from "@/i18n/navigation";
import {useAuth} from "@/context/AuthContext";

export default function LinkLoginRequired({children, href, className}: {children?: React.ReactNode, href: string, className?: string}) {
    const {openModal} = useModal();
    const {user, setCallbackUrl} = useAuth();

    return (<Link href={href} onClick={(e) => {
        if (!user) {
            e.preventDefault();
            setCallbackUrl(href.toString());
            openModal({type: "signin"});
        }
    }} className={className} >
        {children}
    </Link>);
}
