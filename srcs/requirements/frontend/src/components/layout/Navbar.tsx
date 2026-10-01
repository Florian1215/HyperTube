"use client";

import React, {useState} from "react";
import {ExitDoorIcon, HypertubResponsiveLogo, LanguageIcon, RegisterIcon, SearchIcon, UserIcon} from "@/components/Icons";
import {usePathname} from "@/i18n/navigation";
import {useTranslations} from "next-intl";
import ProfilePicture from "@/components/ProfilePicture";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import SwitchLanguage from "@/components/layout/SwitchLanguage";
import Link from "next/link";

export interface iNavItem {
    name: string
    icon: ({color, size}: {
        selected: boolean
        color?: string
        size?: number
    }) => React.JSX.Element
    href?: string
    action?: () => void
    hover?: (Icon: ({selected}: {selected: boolean}) => React.JSX.Element) => React.JSX.Element
}

export default function Navbar() {
    const {openModal} = useModal();
    const {user, logout} = useAuth();
    const pathname = usePathname()
    const t = useTranslations("nav");
    const homeNav = {name: "", icon: HypertubResponsiveLogo, href: "/"};
    const searchNav = {name: t("search"), icon: SearchIcon, href: "/search"};

    const navItems: iNavItem[] = user ? [
        homeNav, searchNav, {
        name: t("account"), icon: () => <ProfilePicture user={user} />, href: "/users"}, {
        name: t("logout"), icon: ExitDoorIcon, action: logout}, {
        name: "", icon: LanguageIcon, hover: SwitchLanguage,
    },] : [
        homeNav, searchNav, {
        name: t("signin"), icon: UserIcon, action: () => openModal({type: "signin"})}, {
        name: t("createAccount"), icon: RegisterIcon, action: () => openModal({type: "register"})}, {
        name: "", icon: LanguageIcon, hover: SwitchLanguage,
    },];

    return (<nav className="flex justify-between px-6 sm:px-10 xl:px-16 py-4 sm:py-10">
        {navItems.map((item, index) => (<NavItem key={index} item={item} selected={pathname === item.href} logoutBtn={t("logout")} />))}
    </nav>)
}

function NavItem({item, selected, logoutBtn}: {item: iNavItem, selected: boolean, logoutBtn: string}) {
    const isLogoutBtn = item.name === logoutBtn;
    const className = "uppercase flex items-center";
    const PName = item.name ? <span style={{transform: "translateY(-1px)"}} className={"custom-underline pl-1 xl:pl-2 text-lg xl:text-2xl hidden md:block text-nowrap " + (selected ? "font-base font-light" : "font-hairline") + (isLogoutBtn ? " hover:text-red" : "")}>{item.name}</span> : null;
    const [isHover, setIsHover] = useState(false);

    if (item.href !== undefined) {
        return (<Link className={className} href={item.href}>
            {<item.icon selected={selected}/>}
            {PName}
        </Link>);
    }

    if (item.hover !== undefined)
        return item.hover(item.icon);

    return (<button
        className={className}
        onClick={item.action}
        onMouseEnter={() => (setIsHover(true))}
        onMouseLeave={() => (setIsHover(false))}>
        <item.icon selected={isHover && isLogoutBtn ? true : selected} color={isHover && isLogoutBtn ? "red" : "black"}/>
        {PName}
    </button>);
}
