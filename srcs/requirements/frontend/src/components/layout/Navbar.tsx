"use client";

import React, {useEffect, useRef, useState} from "react";
import {ExitDoorIcon, HypertubResponsiveLogo, SearchIcon, UserIcon} from "@/components/Icons";
import {Link, usePathname} from "@/i18n/navigation";
import {useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import ProfilePicture from "@/components/ProfilePicture";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";

interface iMenuItem {
    name: string
    href?: string
    action?: () => void
    danger?: boolean
    icon?: (selected: boolean, color: string) => React.ReactNode
}

export default function Navbar() {
    const {openModal, openSearch, closeSearch, searchOpen} = useModal();
    const {user, logout} = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations("nav");
    const searchType = pathname === "/search" ? searchParams.get("type") : undefined;

    const menuItems: iMenuItem[] = user ? [
        {name: t("profile"), href: `/users/${user.id}`},
        {name: t("settings"), href: "/settings"},
        {name: t("logout"), action: logout, danger: true, icon: (selected, color) => <ExitDoorIcon selected={selected} color={color}/>},
    ] : [
        {name: t("signin"), action: () => openModal({type: "signin"})},
        {name: t("createAccount"), action: () => openModal({type: "register"})},
    ];

    return (<nav className="flex justify-between items-center gap-3 px-6 sm:px-10 xl:px-16 py-4 sm:py-10">
        <Link className="flex items-center" href="/">
            <HypertubResponsiveLogo/>
        </Link>
        <NavLink href="/search" name={t("search")} selected={searchType === null || searchOpen} icon={<SearchIcon selected={searchType === null || searchOpen}/>} onClick={(e) => {
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
        <AccountMenu label={t("account")} items={menuItems} onClick={user ? undefined : () => openModal({type: "signin"})}>
            {(selected) => user ? <ProfilePicture user={user}/> : <UserIcon selected={selected}/>}
        </AccountMenu>
    </nav>);
}

function NavLink({href, name, selected, icon, onClick}: {href: string, name: string, selected: boolean, icon?: React.ReactNode, onClick?: (e: React.MouseEvent) => void}) {
    return (<Link className="uppercase flex items-center" href={href} title={name} onClick={onClick}>
        {icon}
        <span style={{transform: "translateY(-1px)"}} className={"custom-underline text-lg xl:text-2xl text-nowrap " + (selected ? "font-base font-light" : "font-hairline") + (icon ? " pl-1 xl:pl-2 hidden md:block" : "")}>{name}</span>
    </Link>);
}

function AccountMenu({label, items, onClick, children}: {label: string, items: iMenuItem[], onClick?: () => void, children: (selected: boolean) => React.ReactNode}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const itemClassName = "uppercase text-xl font-hairline text-nowrap custom-underline";

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
        <button className="flex items-center" aria-label={label} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => {
            setIsOpen(onClick === undefined);
            onClick?.();
        }}>
            {children(isOpen)}
        </button>
        {isOpen && <div className="absolute z-50 top-full right-0 pt-4" role="menu">
            <div className="flex flex-col gap-1 items-start bg-white py-4 px-5 custom-shadow-m border border-black">
                {items.map((item) => item.href ?
                    <Link key={item.name} role="menuitem" className={itemClassName} href={item.href} onClick={() => setIsOpen(false)}>{item.name}</Link> :
                    <button key={item.name} role="menuitem" className={itemClassName + " group flex items-center gap-2" + (item.danger ? " hover:text-red" : "")} onClick={() => {
                        setIsOpen(false);
                        item.action?.();
                    }}>
                        {item.icon && <>
                            <span className="group-hover:hidden">{item.icon(false, "black")}</span>
                            <span className="hidden group-hover:block">{item.icon(true, item.danger ? "red" : "black")}</span>
                        </>}
                        {item.name}
                    </button>
                )}
            </div>
        </div>}
    </div>);
}
