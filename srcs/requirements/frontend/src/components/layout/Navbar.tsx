"use client";

import React, {useEffect, useRef, useState} from "react";
import {ExitDoorIcon, HypertubResponsiveLogo, SearchIcon, UserIcon} from "@/components/Icons";
import {Link, usePathname, useRouter} from "@/i18n/navigation";
import {useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import ProfilePicture from "@/components/ProfilePicture";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import IconButton from "@/components/ui/Button/IconButton";
import hasPerm from "@/utils/hasPerm";

interface iMenuItem {
    name: string
    href?: string
    external?: boolean
    action?: () => void
    danger?: boolean
    icon?: (selected: boolean) => React.ReactNode
}

export default function Navbar() {
    const {openModal, openSearch, closeSearch, searchOpen} = useModal();
    const {user, logout} = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("nav");
    const searchType = pathname === "/search" ? searchParams.get("type") : undefined;

    const menuItems: iMenuItem[] = user ? [
        {name: t("profile"), href: `/users/${user.id}`},
        ...(hasPerm(user, "admin") ? [{name: t("admin"), href: "/admin/", external: true}] : []),
        {name: t("settings"), href: "/settings"},
        {name: t("logout"), action: logout, danger: true, icon: (selected) => <ExitDoorIcon selected={selected} color="current"/>},
    ] : [
        {name: t("signin"), action: () => openModal({type: "signin"})},
        {name: t("createAccount"), action: () => openModal({type: "register"})},
    ];

    return (<nav className="flex justify-between items-center gap-3 px-6 sm:px-10 xl:px-16 py-4 sm:py-10">
        <Link className="flex items-center text-dblack hover:text-accent" href="/">
            <HypertubResponsiveLogo color="current"/>
        </Link>
        <NavLink href="/search" name={t("search")} selected={searchType === null || searchOpen} icon={<SearchIcon selected={searchType === null || searchOpen} color="current"/>} onClick={(e) => {
            if (pathname === "/search" || e.metaKey || e.ctrlKey || e.shiftKey)
                return;
            e.preventDefault();
            if (searchOpen)
                closeSearch();
            else
                openSearch();
        }}/>
        <NavLink href="/search?type=movies" name={t("movies")} selected={searchType === "movies"}/>
        <NavLink href="/search?type=series" name={t("series")} selected={searchType === "series"}/>
        <AccountMenu label={t("account")} items={menuItems} onClick={user ? () => router.push(`/users/${user.id}`) : () => openModal({type: "signin"})} hasMenu={!!user}>
            {(selected) => user ? <ProfilePicture user={user}/> : <UserIcon selected={selected}/>}
        </AccountMenu>
    </nav>);
}

function NavLink({href, name, selected, icon, onClick}: {href: string, name: string, selected: boolean, icon?: React.ReactNode, onClick?: (e: React.MouseEvent) => void}) {
    return (<Link className="uppercase flex items-center hover:text-accent" href={href} title={name} onClick={onClick}>
        {icon}
        <span style={{transform: "translateY(-1px)"}} className={`text-lg xl:text-2xl text-nowrap ${selected ? "font-base font-light" : "font-hairline"} ${icon ? "pl-1 xl:pl-2 hidden md:block" : ""}`}>{name}</span>
    </Link>);
}

function AccountMenu({label, items, onClick, hasMenu, children}: {label: string, items: iMenuItem[], onClick: () => void, hasMenu: boolean, children: (selected: boolean) => React.ReactNode}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const itemClassName = "uppercase text-xl font-hairline text-nowrap";

    useEffect(() => {
        if (!isOpen)
            return;
        const closeMenu = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node))
                setIsOpen(false);
        };
        document.addEventListener("pointerdown", closeMenu);
        return () => document.removeEventListener("pointerdown", closeMenu);
    }, [isOpen]);

    return (<div ref={ref} className="relative flex items-center" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        <button className="flex items-center" aria-label={label} aria-haspopup="menu" aria-expanded={isOpen} onClick={(e) => {
            const openMenu = hasMenu && (e.nativeEvent as PointerEvent).pointerType !== "mouse";
            setIsOpen(openMenu);
            if (!openMenu)
                onClick();
        }}>
            {children(isOpen)}
        </button>
        {isOpen && <div className="absolute z-50 top-full right-0 pt-2 sm:pt-4" role="menu">
            <div className="flex flex-col gap-1 items-start bg-dwhite py-4 px-5 custom-shadow-m border border-dblack">
                {items.map((item) => item.href && item.external ?
                    <a key={item.name} role="menuitem" className={`${itemClassName} hover:text-accent`} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}>{item.name}</a> :
                    item.href ?
                    <Link key={item.name} role="menuitem" className={`${itemClassName} hover:text-accent`} href={item.href} onClick={() => setIsOpen(false)}>{item.name}</Link> :
                    <IconButton key={item.name} role="menuitem" className={`${itemClassName} flex items-center gap-2`} hoverColor={item.danger ? "red" : "accent"} onClick={() => {
                        setIsOpen(false);
                        item.action?.();
                    }}>
                        {item.icon && <>
                            <span className="group-hover:hidden">{item.icon(false)}</span>
                            <span className="hidden group-hover:block">{item.icon(true)}</span>
                        </>}
                        {item.name}
                    </IconButton>
                )}
            </div>
        </div>}
    </div>);
}
