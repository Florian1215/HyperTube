"use client";

import React, {useEffect, useRef, useState} from "react";
import Hls from "hls.js";
import {FullScreenIcon, PlayPauseIcon} from "@/components/Icons";
import LanguageDropdown from "@/components/LanguageDropdown";
import {tLocale} from "@/i18n/request";

// todo handle when click loading mode
// todo get subtitle
export default function VideoPlayer({src, color}: {src: string, color: string}) {
    const token = localStorage.getItem("token") ?? "coucou";
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(formatTime(0));
    const [duration, setDuration] = useState(formatTime(0));
    const [showControls, setShowControls] = useState(true);
    const resShowControl = useRef(showControls);
    const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<tLocale>("fr");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const video = videoRef.current;

        if (!video)
            return;


        // Safari
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src;
            return;
        }

        // Chrome, Firefox, Edge
        if (Hls.isSupported()) {
            const hls = new Hls({
                fetchSetup: (context, init) => {
                    init.headers = {
                        ...init.headers,
                        Authorization: `Bearer ${token}`,
                    };
                    console.log("SETUP");
                    return new Request(context.url, init);
                },
            });

            hls.loadSource(src);
            hls.attachMedia(video);

            return () => {
                hls.destroy();
            };
        }
    }, [src, token]);

    /* -------------- PLAY PAUSE ------------- */
    const togglePlay = () => {
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
        const percent = (video.currentTime / video.duration) * 100;
        setCurrentTime(formatTime(video.currentTime));
        setProgress(percent);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video)
            return ;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;

        video.currentTime = percent * video.duration;
        handleTimeUpdate();
    };

    /* ------------- FULL SCREEN ------------- */
    const toggleFullscreen = () => setFullscreenEnabled(!fullscreenEnabled);

    useEffect(() => {
        const container = containerRef.current;

        if (fullscreenEnabled) {
            if (container)
                container.requestFullscreen();
        } else // todo remake
            document.exitFullscreen();
    }, [fullscreenEnabled]);

    /* ---------------- SUBTITLES ---------------- todo */
    const changeSubtitle = (lang: tLocale) => {
        const video = videoRef.current;
        if (!video)
            return;

        Array.from(video.textTracks).forEach((track) => {
            track.mode = track.language === lang ? "showing" : "hidden";
        });

        setSelectedSubtitle(lang);
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
    }, []);

    return (<div ref={containerRef} className={"relative size-full overflow-hidden z-10 " + (showControls ? "bg-black" : "bg-[#000000]")} onMouseMove={resetHideTimer} >
        {isBuffering && (<div className="absolute inset-0 flex items-center justify-center  pointer-events-none bg-black/30">
            <div className="size-14 animate-spin border-6 rounded-full border-white border-t-transparent" />
        </div>)}

        <video
            ref={videoRef} src={src} className={"size-full" +  (!isPlaying ? " custom-cursor-play" : (showControls ? "" : " cursor-none"))}
            onClick={togglePlay} onTimeUpdate={handleTimeUpdate} controls={false}
            onLoadedMetadata={() => {
                const video = videoRef.current;
                if (!video)
                    return;
                setDuration(formatTime(video.duration));
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
                        <p>{currentTime} / {duration}</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="relative">
                            <button onClick={() => setShowSubtitleMenu((prev) => !prev)} className={"px-2 font-wide border " + (selectedSubtitle ? "text-black bg-white" : "border-white")}>CC</button>

                            {showSubtitleMenu && <LanguageDropdown handleSwitchLanguage={changeSubtitle} selected={selectedSubtitle} />}
                        </div>

                        <button onClick={toggleFullscreen} className="p-2">
                            <FullScreenIcon iFullScreen={fullscreenEnabled} />
                        </button>
                    </div>
                </div>

                <div className="w-full h-4 bg-gray cursor-pointer" onClick={handleSeek} >
                    <div className={`pointer-events-none h-full bg-${color}`} style={{width: `${progress}%`}} />
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
