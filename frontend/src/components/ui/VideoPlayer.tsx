"use client";

import React, {useEffect, useRef, useState} from "react";
import {FullScreenIcon, PlayPauseIcon} from "@/components/Icons";
import LanguageDropdown from "@/components/LanguageDropdown";
import {tLocale} from "@/i18n/request";
import Hls from "hls.js";
import {useDownloadSubtitle, useLoginOpenSubtitles, useSubtitles} from "@/hooks/useSubtitles";
import {useLocale} from "next-intl";
import loadSRT from "@/utils/loadSRT";
import useModal from "@/contexts/ModalContext";
import {refreshAccessToken} from "@/services/auth.service";
import {updateMovieProgress} from "@/services/movies.service";

interface iSub{
    start: number
    end: number
    text: string
}

export default function VideoPlayer({src, color, duration, setErrorAction, imdbId}: {src: string, color: string, duration: number, setErrorAction: (e: string) => void, imdbId: string}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(formatTime(0));
    const [downloadDuration, setDownloadDuration] = useState(0);
    const durationString = formatTime(duration);
    const [showControls, setShowControls] = useState(true);
    const resShowControl = useRef(showControls);
    const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<tLocale | undefined>();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekTime, setSeekTime] = useState(0);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const seekTimeRef = useRef(0);
    const {data: getSubtitlesMovie} = useSubtitles(imdbId, selectedSubtitle);
    const {data: loginOpenSubtitles} = useLoginOpenSubtitles();
    const {data: downloadSubtitle} = useDownloadSubtitle(getSubtitlesMovie?.data[0].attributes.files[0].file_id, loginOpenSubtitles?.token);
    const [subs, setSubs] = useState<iSub[]>([]);
    const [currentText, setCurrentText] = useState("");
    const locale = useLocale() as tLocale;
    const {openModal} = useModal();
    const handleKeyPress = useRef(true);
    const playStateBeforeSeeking = useRef(false);
    const lastSent = useRef(0);
    const setComplete = useRef(false);
    const min15 = 15 * 60;

    useEffect(() => {
        if (downloadSubtitle)
            loadSRT(downloadSubtitle.link).then(setSubs);
    }, [downloadSubtitle]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src)
            return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: (xhr) => {
                    const token = localStorage.getItem("token");

                    if (token)
                        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                },
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
                if (data.details)
                    setDownloadDuration(data.details.totalduration);
            });
            hls.on(Hls.Events.ERROR, async (_, data) => {
                const status = data?.response?.code;
                console.log("ERROR", data);

                if (status === 401) {
                    try {
                        await refreshAccessToken(locale);
                        hls.stopLoad();
                        hls.startLoad(-1);
                    } catch {
                        videoRef?.current?.pause();
                        handleKeyPress.current = false;
                        openModal({type: "signin", noClose: true, setHandleKeyPress: () => {handleKeyPress.current = true;}});
                    }
                } else if (data.fatal)
                    setErrorAction(data.error.message)
            });
            return () => {hls.destroy();};
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    /* -------------- PLAY PAUSE ------------- */
    // useEffect(() => { //todo keep ?
    //     const video = videoRef.current;
    //     if (!video)
    //         return;
    //     video.play();
    //     setIsPlaying(true);
    // }, []);

    useEffect(() => {
        const video = videoRef.current;

        if (!video)
            return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
        };
    }, []);

    const togglePlay = () => {
        if (showSubtitleMenu)
            setShowSubtitleMenu(false);
        const video = videoRef.current;
        if (!video)
            return;

        if (video.paused) {
            video.play();
            resetHideTimer();
        } else {
            video.pause();
            setShowControls(true);
        }
    };

    /* --------------- PROGRESS -------------- */
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video)
            return;
        setCurrentTime(formatTime(video.currentTime));
        if (!isSeeking)
            setSeekTime(video.currentTime);

        if (subs.length > 0) {
            const current = subs.find(s => video.currentTime >= s.start && video.currentTime <= s.end);
            setCurrentText(current?.text ?? "");
        }

        if (!setComplete.current) {
            if (video.currentTime + min15 > duration) {
                updateMovieProgress(imdbId, Math.floor((video.currentTime + min15) % 60), true);
                setComplete.current = true;
            } else {
                const second = Math.floor(video.currentTime % 60);
                if (second - lastSent.current >= 30) {
                    lastSent.current = second;
                    updateMovieProgress(imdbId, second, false);
                }
            }
        }
    };

    const getTimeFromClientX = (clientX: number) => {
        const video = videoRef.current;
        if (!video || !progressBarRef.current)
            return 0;

        const rect = progressBarRef.current.getBoundingClientRect();
        const percent = (clientX - rect.left) / rect.width;
        return Math.max(0, percent * duration);
    };

    useEffect(() => {
        if (!isSeeking)
            return;

        const handleMove = (e: MouseEvent) => {
            const time = getTimeFromClientX(e.clientX);
            if (videoRef.current && time < videoRef.current.duration) {
                seekTimeRef.current = time;
                setSeekTime(time);
            }
        };

        const handleUp = () => {
            const video = videoRef.current;
            if (!video)
                return;
            if (seekTimeRef.current < video.duration)
                video.currentTime = seekTimeRef.current;
            setIsSeeking(false);
            if (playStateBeforeSeeking.current)
                video.play();
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSeeking, seekTime]);

    const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video)
            return;

        playStateBeforeSeeking.current = isPlaying;
        setIsSeeking(true);
        const time = getTimeFromClientX(e.clientX);
        setSeekTime(time);
        seekTimeRef.current = time;
        video.pause();
    };

    /* ------------- FULL SCREEN ------------- */
    const toggleFullscreen = () => {
        if (showSubtitleMenu)
            setShowSubtitleMenu(false);
        setFullscreenEnabled(!fullscreenEnabled);
        const container = containerRef.current;
        if (!container)
            return ;
        if (!document.fullscreenElement)
            container.requestFullscreen();
        else
            document.exitFullscreen();
    }

    /* -------------- SUBTITLES -------------- */
    const changeSubtitle = (lang: tLocale) => {
        const video = videoRef.current;
        if (!video)
            return;

        const newLang = lang === selectedSubtitle ? undefined : lang;
        setSelectedSubtitle(newLang);
        setShowSubtitleMenu(false);
    };

    /* ------------ HIDE CONTROLS ------------ */
    const resetHideTimer = () => {
        setShowControls(true);
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            if (resShowControl.current)
                setShowControls(false);
        }, 2500);
    };

    useEffect(() => {
        resShowControl.current = isPlaying;
    }, [isPlaying]);

    /* --------------- KEYBOARD -------------- */
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video || !handleKeyPress.current)
                return;
            if (showSubtitleMenu)
                setShowSubtitleMenu(false);

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    togglePlay();
                    break;

                case "ArrowRight":
                    e.preventDefault();
                    const newTime = video.currentTime + 10;
                    if (newTime < video.duration)
                        video.currentTime = newTime;
                    break;

                case "ArrowLeft":
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;

                case "KeyF":
                    e.preventDefault();
                    toggleFullscreen();
                    break;

                case "KeyC":
                    e.preventDefault();
                    setShowSubtitleMenu((prev) => !prev);
                    break;
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (<div ref={containerRef} className={"absolute inset-0 size-full overflow-hidden z-10 " + (showControls ? "bg-black" : "bg-[#000000]") + ((isBuffering && seekTime === 0) ? "/10" : "")} onMouseMove={resetHideTimer} >
        {isBuffering && seekTime != 0 && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black">
            <div className="size-14 animate-spin border-10 rounded-full border-white border-t-transparent" />
        </div>)}

        <video ref={videoRef} className={"size-full" +  (!isPlaying ? " custom-cursor-play" : (showControls ? "" : " cursor-none"))}
            onClick={togglePlay} onTimeUpdate={handleTimeUpdate} controls={false}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}>
        </video>

        {subs && <div className="absolute bottom-12 w-full text-center text-3xl pointer-events-none text-white font-bold whitespace-pre-line custom-text-shadow">{currentText}</div>}

        <div className={"absolute inset-0 flex items-end pointer-events-none transition-opacity duration-300 " + (showControls ? "opacity-100" : "opacity-0")}>
            <div style={{opacity: !isPlaying ? 0.5 : 0}} className="custom-noise transition-opacity duration-300"/>
            <div className="bg-gradient" />

            <div className="flex flex-col w-full z-20 pointer-events-auto gap-2 text-white">
                <div className="mx-4 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <button onClick={togglePlay} className="p-2">
                            <PlayPauseIcon isPlaying={isPlaying} />
                        </button>
                        <p>{currentTime} / {durationString}</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        {loginOpenSubtitles && <button onClick={() => setShowSubtitleMenu((prev) => !prev)} className={"px-2 font-wide border " + (selectedSubtitle ? "text-black bg-white" : "border-white")}>CC</button>}
                        {showSubtitleMenu && <LanguageDropdown handleSwitchLanguage={changeSubtitle} selected={selectedSubtitle} className="bottom-12 right-8" strikethrough={true} />}

                        <button onClick={toggleFullscreen} className="p-2">
                            <FullScreenIcon iFullScreen={fullscreenEnabled} />
                        </button>
                    </div>
                </div>

                <div className="w-full h-4 bg-black-hover border-t-black">
                    <div ref={progressBarRef} className="h-full bg-gray cursor-pointer select-none" onMouseDown={handleSeekStart} style={{width: `${(downloadDuration / duration) * 100 || 0}%`}}>
                        <div className={`pointer-events-none h-full bg-${color}`} style={{width: `${(seekTime / duration) * 100 || 0}%`}} />
                    </div>
                </div>
            </div>
        </div>
    </div>);
}

function formatTime(time: number) {
    if (!time || isNaN(time))
        return "0h0m";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    let result = `${minutes}m`;
    if (hours > 0)
        result = `${hours}h${result}`;
    if (seconds > 0)
        result += seconds.toString().padStart(2, "0");
    return result;
}
