"use client";

import React, {useEffect, useRef, useState} from "react";
import {FullScreenIcon, PlayPauseIcon} from "@/components/Icons";
import LanguageDropdown from "@/components/LanguageDropdown";
import {tLocale} from "@/i18n/request";
import Hls from "hls.js";

export default function VideoPlayer({src, color}: {src: string, color: string}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(formatTime(0));
    const [duration, setDuration] = useState(0);
    const [durationString, setDurationString] = useState(formatTime(0));
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

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src)
            return;

        const token = localStorage.getItem("token");

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: (xhr) => {
                    if (token)
                        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                },
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (event, data) => {console.error("HLS error:", data);});
            return () => {hls.destroy();};
        }
    }, [src]);

    /* -------------- PLAY PAUSE ------------- */
    useEffect(() => {
        const video = videoRef.current;
        if (!video)
            return;
        video.play();
        setIsPlaying(true);
    }, []);

    const togglePlay = () => {
        if (showSubtitleMenu)
            setShowSubtitleMenu(false);
        const video = videoRef.current;
        if (!video)
            return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            resetHideTimer();
        } else {
            video.pause();
            setIsPlaying(false);
            setShowControls(true);
        }
    };

    /* --------------- PROGRESS -------------- */
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video)
            return;
        setCurrentTime(formatTime(video.currentTime));
    };

    const getTimeFromClientX = (clientX: number) => {
        const video = videoRef.current;
        if (!video || !progressBarRef.current)
            return 0;

        const rect = progressBarRef.current.getBoundingClientRect();
        const percent = (clientX - rect.left) / rect.width;

        return Math.min(Math.max(percent * video.duration, 0), video.duration);
    };

    useEffect(() => {
        if (!isSeeking)
            return;

        const handleMove = (e: MouseEvent) => {
            const time = getTimeFromClientX(e.clientX);
            seekTimeRef.current = time;
            setSeekTime(time);
        };

        const handleUp = () => {
            const video = videoRef.current;
            if (!video) return;

            setIsSeeking(false);
            video.currentTime = seekTimeRef.current;
            video.play();
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isSeeking, seekTime]);

    const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video)
            return;

        setIsSeeking(true);
        const time = getTimeFromClientX(e.clientX);
        setSeekTime(time);
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

        Array.from(video.textTracks).forEach((track) => {
            track.mode = track.language === newLang ? "showing" : "hidden";
        });

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
            if (showSubtitleMenu)
                setShowSubtitleMenu(false);
            const video = videoRef.current;
            if (!video)
                return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    togglePlay();
                    break;

                case "ArrowRight":
                    e.preventDefault();
                    video.currentTime = Math.min(video.currentTime + 10, video.duration || Infinity);
                    break;

                case "ArrowLeft":
                    e.preventDefault();
                    video.currentTime = Math.max(video.currentTime - 10, 0);
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

    return (<div ref={containerRef} className={"absolute inset-0 size-full overflow-hidden z-10 " + (showControls ? "bg-black" : "bg-[#000000]") + ((isBuffering && seekTime === 0) ? "/20" : "")} onMouseMove={resetHideTimer} >
        {isBuffering && seekTime != 0 && (<div className="absolute inset-0 flex items-center justify-center  pointer-events-none bg-black/30">
            <div className="size-14 animate-spin border-10 rounded-full border-white border-t-transparent" />
        </div>)}

        <video ref={videoRef} className={"size-full" +  (!isPlaying ? " custom-cursor-play" : (showControls ? "" : " cursor-none"))}
            onClick={togglePlay} onTimeUpdate={handleTimeUpdate} controls={false}
            onLoadedMetadata={() => {
                const video = videoRef.current;
                if (!video)
                    return;
                if (video.duration === Infinity) { //todo handle error
                    setDuration(3600);
                    setDurationString(formatTime(3600));
                } else {
                    setDuration(video.duration);
                    setDurationString(formatTime(video.duration));
                }

            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}>

            <track kind="subtitles" src="/subtitles-fr.vtt" srcLang="fr" label="Français"/>
            <track kind="subtitles" src="/subtitles-en.vtt" srcLang="en" label="English"/>
            <track kind="subtitles" src="/subtitles-de.vtt" srcLang="de" label="Deutsch"/>
        </video>

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
                        <button onClick={() => setShowSubtitleMenu((prev) => !prev)} className={"px-2 font-wide border " + (selectedSubtitle ? "text-black bg-white" : "border-white")}>CC</button>
                        {showSubtitleMenu && <LanguageDropdown handleSwitchLanguage={changeSubtitle} selected={selectedSubtitle} className="bottom-12 right-8" strikethrough={true} />}

                        <button onClick={toggleFullscreen} className="p-2">
                            <FullScreenIcon iFullScreen={fullscreenEnabled} />
                        </button>
                    </div>
                </div>

                <div ref={progressBarRef} className="w-full h-4 bg-gray cursor-pointer select-none" onMouseDown={handleSeekStart}>
                    <div className={`pointer-events-none h-full bg-${color}`} style={{width: `${(seekTime / duration) * 100 || 0}%`}} />
                </div>
            </div>
        </div>
    </div>);
}


function formatTime(time: number) {
    if (!time || isNaN(time))
        return "0h0m00";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    return `${hours}h${minutes}m${seconds.toString().padStart(2, "0")}`;
}
