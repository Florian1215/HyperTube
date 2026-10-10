"use client";

import React, {useMemo, useState} from "react";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import {useTranslations} from "next-intl";
import {iTorrent} from "@/types/media";
import Button from "@/components/ui/Button/Button";
import Pagination from "@/components/ui/Pagination";
import {DownloadIcon, SortIcon} from "@/components/Icons";
import IconButton from "@/components/ui/Button/IconButton";
import {API_URL} from "@/services/apiClient";
import {tT} from "@/types/utils";
import getBestTorrent from "@/utils/getBestTorrent";

type SortKey = "title" | "status" | "quality" | "size" | "language" | "seeders";
type SortDir = "asc" | "desc";

export default function SelectTorrentModal() {
    const itemPerPage = 10;
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("modal.selectTorrent");

    const [index, setIndex] = useState(1);
    const [sortKey, setSortKey] = useState<SortKey>("seeders");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const torrents = useMemo(() => {
        return activeModal.torrents ?? [];
    }, [activeModal.torrents]);

    const bestTorrentId = useMemo(() => getBestTorrent(torrents)?.id, [torrents]);

    const totalPage = useMemo(() => {
        return Math.ceil(torrents.length / itemPerPage);
    }, [torrents.length]);

    const sortedTorrents = useMemo(() => {
        return [...torrents].sort((a, b) => {
            let valA: string | number = a[sortKey];
            let valB: string | number = b[sortKey];

            if (typeof valA === "string")
                valA = valA.toLowerCase();
            if (typeof valB === "string")
                valB = valB.toLowerCase();

            if (sortKey === "seeders") {
                valA = Number(valA);
                valB = Number(valB);
            }

            if (valA < valB)
                return sortDir === "asc" ? -1 : 1;
            if (valA > valB)
                return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [torrents, sortKey, sortDir]);

    const changeSort = (key: SortKey) => {
        if (key === sortKey)
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        else {
            setSortKey(key);
            setSortDir("desc");
        }
        setIndex(1);
    };

    if (activeModal.type !== "select-torrent" || !activeModal.torrents || !activeModal.setTorrentId)
        return null;

    const renderHeader = (key: SortKey, label: string, hidden=false) => (
        <th onClick={() => changeSort(key)} className={"cursor-pointer select-none p-1 sm:px-3 sm:py-2 text-left text-xs sm:text-sm" + (hidden ? " hidden sm:table-cell" : "")}>
            <div className="flex items-center gap-1">
                {label}
                {sortKey === key && <SortIcon sideUp={sortDir === "asc"} />}
            </div>
        </th>);

    return (<ModalLayout onCloseAction={closeModal} title={t("title")} addMaxWTitle={false}>
        <Pagination currentIndex={index} totalPage={totalPage} onClick={setIndex}>
            <table className="w-full text-sm">
                <thead>
                <tr>
                    {renderHeader("title", t("columns.title"))}
                    {renderHeader("status", t("columns.status"))}
                    {renderHeader("quality", t("columns.quality"))}
                    {renderHeader("size", t("columns.size"))}
                    {renderHeader("language", t("columns.language"))}
                    {renderHeader("seeders", t("columns.seeds"))}
                    <th />
                </tr>
                </thead>

                <tbody>
                {sortedTorrents.slice((index - 1) * itemPerPage, (index - 1) * itemPerPage + itemPerPage).map((torrent) => (
                    <TorrentRow key={torrent.id} torrent={torrent} setTorrentId={activeModal.setTorrentId} closeModal={closeModal} t={t} autoSelected={torrent.id === bestTorrentId}/>
                ))}
                </tbody>
            </table>
        </Pagination>
    </ModalLayout>);
}

function TorrentRow({torrent, setTorrentId, closeModal, t, autoSelected}: {torrent: iTorrent; setTorrentId?: (id: string) => void; closeModal: () => void; t: tT, autoSelected: boolean}) {
    const className = "p-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-nowrap";

    return (<tr className={"border-t border-gray"}>
        <td className={className + " max-w-60 sm:max-w-96"} title={torrent.title}>
            <p className="truncate">{torrent.title}</p>
            {autoSelected && <p className="text-xs font-normal text-gray">{t("autoSelected")}</p>}
        </td>
        <td className={className}>{torrent.status}</td>
        <td className={className + " text-center"}>{torrent.quality}</td>
        <td className={className + " text-right"}>{`${Math.round(torrent.size)} ${t("gb")}`}</td>
        <td className={className + " text-right"}>{torrent.language}</td>
        <td className={className + " text-right"}>{torrent.seeders}</td>
        <td className={className}>
            <div className="flex items-center gap-2 sm:gap-3">
                <Button onClick={() => {
                        closeModal();
                        if (setTorrentId)
                            setTorrentId(torrent.id);
                    }}>{t("choose")}</Button>
                <IconButton title={t("download")} onClick={() => window.location.assign(`${API_URL}torrents/${torrent.id}/file/`)}>
                    {(color: string) => <DownloadIcon color={color}/>}
                </IconButton>
            </div>
        </td>
    </tr>);
}