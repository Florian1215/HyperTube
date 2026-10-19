"use client";

import React, {useEffect, useRef, useState} from "react";
import {FullScreenIcon, PlayPauseIcon} from "@/components/Icons";
import CloseButton from "@/components/ui/Button/CloseButton";
import Hls from "hls.js";
import loadVTT, {iSub} from "@/utils/loadVTT";
import {useLocale} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {patchUser} from "@/services/users.service";
import {syncMediaProgress, updateMediaProgress} from "@/services/medias.service";
import {iMediaDetails} from "@/types/media";
import IconButton from "@/components/ui/Button/IconButton";
import {useQueryClient} from "@tanstack/react-query";
import {iUser} from "@/types/user";
import {tT} from "@/types/utils";
import formatTime from "@/utils/formatTime";
import EpisodeLabel from "@/components/EpisodeLabel";

interface iAudioTrack {
    id: number
    language: string
    title: string
}

interface iSubtitleTrack {
    language: string
    title: string
    forced: boolean
    file: string
}

interface iStreamTracks {
    audio: {title: string}[]
    subtitles: iSubtitleTrack[]
}

const SUBTITLE_LANG_KEY = "playerSubtitleLang";
const SUBTITLE_OFF = "off";
const SUBTITLE_RELOAD_DELAY = 15000;

function getSaved(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function setSaved(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

export default function VideoPlayer({media, src, runtime, startAt=0, seasonNumber, episodeNumber, episodeName, user, setErrorAction, tAction, nextEpisodeAction, nextEpisodeShownAction, endedAction}: {media: iMediaDetails, src: string, runtime: number, startAt?: number, seasonNumber?: number, episodeNumber?: number, episodeName?: string, user?: iUser, setErrorAction: (e: string) => void, tAction: tT, nextEpisodeAction?: () => void, nextEpisodeShownAction?: () => void, endedAction?: () => void}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pauseCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(formatTime(0));
    const [downloadDuration, setDownloadDuration] = useState(0);
    const [fullDuration, setFullDuration] = useState(runtime * 60);
    const [durationString, setDurationString] = useState("");
    const [showControls, setShowControls] = useState(true);
    const resShowControl = useRef(showControls);
    const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number | undefined>();
    const [subtitleTracks, setSubtitleTracks] = useState<iSubtitleTrack[]>([]);
    const [audioTracks, setAudioTracks] = useState<iAudioTrack[]>([]);
    const [selectedAudio, setSelectedAudio] = useState(-1);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const hlsRef = useRef<Hls | null>(null);
    const {updateUser} = useAuth();
    const locale = useLocale();
    const streamDir = src.slice(0, src.lastIndexOf("/") + 1);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekTime, setSeekTime] = useState(0);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const seekTimeRef = useRef(0);
    const [subs, setSubs] = useState<iSub[]>([]);
    const [currentText, setCurrentText] = useState("");
    const [pictureRect, setPictureRect] = useState<{top: number, left: number, width: number, height: number}>();
    const playStateBeforeSeeking = useRef(false);
    const lastSent = useRef(0);
    const setComplete = useRef(false);
    const min15 = 15 * 60;
    const min5 = 5 * 60;
    const min3 = 3 * 60;
    const isLiveRef = useRef(true);
    const queryClient = useQueryClient();
    const resumed = useRef(false);
    const pointerTypeRef = useRef("mouse");
    const tapRef = useRef<{time: number, timeout?: ReturnType<typeof setTimeout>}>({time: 0});
    const seekFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [seekFeedback, setSeekFeedback] = useState<{side: "left" | "right", amount: number}>();
    const barDuration = Math.max(fullDuration, downloadDuration);
    const controlsVisible = showControls || showAudioMenu || showSubtitleMenu;
    const showNextEpisode = !!nextEpisodeAction && fullDuration > 0 && seekTime + min5 > fullDuration;

    useEffect(() => {
        if (showNextEpisode)
            nextEpisodeShownAction?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showNextEpisode]);
    const completeBefore = episodeNumber === undefined ? min15 : min3;

    /* ---------------------------------------------------- INIT ---------------------------------------------------- */
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src)
            return;

        if (Hls.isSupported()) {
            const hls = new Hls({startPosition: 0});
            const controller = new AbortController();
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            const streamTracks: Promise<iStreamTracks | undefined> = fetch(`${streamDir}tracks.json`, {signal: controller.signal})
                .then((res) => res.ok ? res.json() : undefined).catch(() => undefined);
            streamTracks.then((tracks) => {
                if (controller.signal.aborted || !tracks?.subtitles?.length)
                    return;
                setSubtitleTracks(tracks.subtitles);
                const saved = getSaved(SUBTITLE_LANG_KEY);
                if (!saved || saved === SUBTITLE_OFF)
                    return;
                const sameLanguage = tracks.subtitles.map((track, index) => ({track, index})).filter(({track}) => track.language === saved);
                const subtitle = sameLanguage.find(({track}) => !track.forced) ?? sameLanguage[0];
                if (subtitle)
                    setSelectedSubtitle(subtitle.index);
            });
            hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                const titles = (await streamTracks)?.audio ?? [];
                if (controller.signal.aborted)
                    return;
                const tracks = hls.audioTracks.map((track, index) => ({id: index, language: track.lang ?? "", title: titles[index]?.title ?? ""}));
                setAudioTracks(tracks);
                const preferred = user ? (user.preferred_language === "vf" ? "fr" : media.original_language) : undefined;
                const wanted = tracks.find((track) => preferred && track.language === preferred);
                if (wanted && wanted.id !== hls.audioTrack)
                    hls.audioTrack = wanted.id;
                setSelectedAudio(wanted?.id ?? hls.audioTrack);
            });
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, (_, data) => setSelectedAudio(data.id));
            hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
                if (data.details)
                    setDownloadDuration(data.details.totalduration);
                if (!resumed.current) {
                    resumed.current = true;
                    if (startAt > 0 && startAt < data.details.totalduration)
                        video.currentTime = startAt;
                }
                if (!data.details.live && isLiveRef.current) {
                    isLiveRef.current = false;
                    setFullDuration(data.details.totalduration);
                }
            });
            hls.on(Hls.Events.ERROR, async (_, data) => {
                if (data.fatal)
                    setErrorAction(data.error.message);
            });
            return () => {
                controller.abort();
                hlsRef.current = null;
                hls.destroy();
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    /* ------------------------------------------------- PLAY PAUSE ------------------------------------------------- */
    useEffect(() => {
        const video = videoRef.current;
        if (!video)
            return;
        video.play().then(() => {});
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDurationString(formatTime(fullDuration));
    }, [fullDuration]);

    useEffect(() => {
        const video = videoRef.current;

        if (!video)
            return;
        const drawPausedFrame = () => {
            const canvas = pauseCanvasRef.current;
            const context = canvas?.getContext("2d");

            if (!canvas || !context || !video.paused || !video.videoWidth)
                return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => {
            drawPausedFrame();
            setIsPlaying(false);
        };

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("seeked", drawPausedFrame);
        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("seeked", drawPausedFrame);
        };
    }, []);

    const togglePlay = () => {
        if (showSubtitleMenu)
            setShowSubtitleMenu(false);
        setShowAudioMenu(false);
        const video = videoRef.current;
        if (!video)
            return;

        if (video.paused) {
            video.play().then(() => {
                resetHideTimer();
            });
        } else {
            video.pause();
            setShowControls(true);
        }
    };

    /* ------------------------------------------------- DOUBLE TAP ------------------------------------------------- */
    const seekBy = (side: "left" | "right") => {
        const video = videoRef.current;
        if (!video)
            return;
        const delta = side === "left" ? -10 : 10;
        video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || Infinity);

        setSeekFeedback((prev) => ({side, amount: prev?.side === side ? prev.amount + 10 : 10}));
        clearTimeout(seekFeedbackTimeoutRef.current);
        seekFeedbackTimeoutRef.current = setTimeout(() => setSeekFeedback(undefined), 700);
    };

    const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
        if (pointerTypeRef.current !== "touch")
            return togglePlay();

        const tap = tapRef.current;
        const now = e.timeStamp;
        const rect = e.currentTarget.getBoundingClientRect();
        const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";

        clearTimeout(tap.timeout);
        tap.timeout = undefined;
        if (now - tap.time < 300) {
            tap.time = now;
            seekBy(side);
            return;
        }
        tap.time = now;
        tap.timeout = setTimeout(() => {
            tap.timeout = undefined;
            togglePlay();
        }, 300);
    };

    /* --------------------------------------------------- PROGRESS ------------------------------------------------- */
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video)
            return;
        setCurrentTime(formatTime(video.currentTime));
        if (!isSeeking)
            setSeekTime(video.currentTime);

        if (user && !setComplete.current && fullDuration > 0) {
            const progress = Math.floor(video.currentTime);
            if (video.currentTime + completeBefore > fullDuration) {
                setComplete.current = true;
                updateMediaProgress(media.id, media.type, progress, 100, true, true, seasonNumber, episodeNumber).then((data) => {
                    syncMediaProgress(queryClient, user.id, media, data, episodeNumber);
                }).catch(() => {setComplete.current = false;});
            } else if (progress > min5 && Math.abs(progress - lastSent.current) >= 15) {
                lastSent.current = progress;
                const pourcent = Math.min(100, Math.ceil((video.currentTime / fullDuration) * 100));
                updateMediaProgress(media.id, media.type, progress, pourcent, false, true, seasonNumber, episodeNumber).then((data) => {
                    syncMediaProgress(queryClient, user.id, media, data, episodeNumber);
                }).catch(() => {});
            }
        }
    };

    const getTimeFromClientX = (clientX: number) => {
        const video = videoRef.current;
        if (!video || !progressBarRef.current)
            return 0;

        const rect = progressBarRef.current.getBoundingClientRect();
        const percent = (clientX - rect.left) / rect.width;
        return Math.max(0, percent * downloadDuration);
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
                video.play().then(() => {});
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

    /* ----------------------------------------------- PICTURE AREA ------------------------------------------------- */
    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container)
            return;

        const update = () => {
            const {clientWidth: width, clientHeight: height} = container;
            if (!video.videoWidth || !video.videoHeight) {
                setPictureRect(undefined);
                return;
            }
            const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
            const pictureWidth = video.videoWidth * scale;
            const pictureHeight = video.videoHeight * scale;
            setPictureRect({top: (height - pictureHeight) / 2, left: (width - pictureWidth) / 2, width: pictureWidth, height: pictureHeight});
        };

        const observer = new ResizeObserver(update);
        observer.observe(container);
        video.addEventListener("loadedmetadata", update);
        video.addEventListener("resize", update);
        return () => {
            observer.disconnect();
            video.removeEventListener("loadedmetadata", update);
            video.removeEventListener("resize", update);
        };
    }, []);

    /* ------------------------------------------------ FULL SCREEN ------------------------------------------------- */
    const toggleFullscreen = async () => {
        if (showSubtitleMenu)
            setShowSubtitleMenu(false);
        setShowAudioMenu(false);
        setFullscreenEnabled(!fullscreenEnabled);
        const container = containerRef.current;
        if (!container)
            return ;
        if (!document.fullscreenElement)
            await container.requestFullscreen();
        else
            await document.exitFullscreen();
    }

    /* ------------------------------------------------- SUBTITLES -------------------------------------------------- */
    useEffect(() => {
        const t = videoRef.current?.currentTime ?? 0;
        setCurrentText(subs.filter(s => t >= s.start && t <= s.end).map(s => s.text).join("\n"));
    }, [seekTime, subs]);

    const subtitleFile = selectedSubtitle === undefined ? undefined : subtitleTracks[selectedSubtitle]?.file;

    useEffect(() => {
        if (!subtitleFile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSubs([]);
            return;
        }
        const controller = new AbortController();
        const load = () => loadVTT(`${streamDir}${subtitleFile}`, controller.signal).then((newSubs) => {
            if (!controller.signal.aborted)
                setSubs(newSubs);
        }).catch(() => {});
        load();
        const interval = setInterval(() => {
            if (isLiveRef.current)
                load();
        }, SUBTITLE_RELOAD_DELAY);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [subtitleFile, streamDir]);

    const changeSubtitle = (index?: number) => {
        setSelectedSubtitle(index);
        setSaved(SUBTITLE_LANG_KEY, index === undefined ? SUBTITLE_OFF : (subtitleTracks[index]?.language || SUBTITLE_OFF));
        setShowSubtitleMenu(false);
    };

    const changeAudio = (track: iAudioTrack) => {
        const hls = hlsRef.current;
        if (!hls)
            return;
        hls.audioTrack = track.id;
        setSelectedAudio(track.id);
        setShowAudioMenu(false);
        if (!user || media.original_language === "fr")
            return;
        const preferred = track.language === "fr" ? "vf" : (track.language === media.original_language ? "vo" : undefined);
        if (preferred && preferred !== (user.preferred_language ?? "vo"))
            patchUser(locale, ["preferred_language", preferred], user.id).then((data) => updateUser({preferred_language: data.preferred_language})).catch(() => {});
    };

    const getTrackLabel = (track: {language: string, title: string, forced?: boolean}, index: number) => {
        let label = "";
        try {
            label = track.language ? (new Intl.DisplayNames([locale], {type: "language"}).of(track.language) ?? "") : "";
        } catch {}
        label = label ? label.charAt(0).toUpperCase() + label.slice(1) : `${tAction("track")} ${index + 1}`;
        const details = [track.title, track.forced ? tAction("forcedSubtitles") : ""].filter((detail) => detail && detail.toLowerCase() !== label.toLowerCase());
        return details.length ? `${label} (${details.join(", ")})` : label;
    };

    /* ------------------------------------------------ HIDE CONTROL ------------------------------------------------ */
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

    /* -------------------------------------------------- KEYBOARD -------------------------------------------------- */
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const active = document.activeElement;

            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA"))
                return;
            const video = videoRef.current;
            if (!video)
                return;
            if (showSubtitleMenu)
                setShowSubtitleMenu(false);
            setShowAudioMenu(false);

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
                    toggleFullscreen().then(() => {});
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

    /* ---------------------------------------------- REACT COMPONENT ----------------------------------------------- */
    return (<div ref={containerRef} className={`absolute inset-0 size-full overflow-hidden z-10 ${showControls ? "bg-black" : "bg-[#000000]"}${(isBuffering && seekTime === 0) ? "/10" : ""}`} onMouseMove={resetHideTimer} >
        {isBuffering && seekTime != 0 && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-14 animate-spin border-10 rounded-full border-white border-t-transparent" />
        </div>)}

        <video ref={videoRef} className={`size-full ${!isPlaying ? "custom-cursor-play" : (showControls ? "" : "cursor-none")}`}
            onPointerDown={(e) => pointerTypeRef.current = e.pointerType} onClick={handleVideoClick} onTimeUpdate={handleTimeUpdate} onEnded={endedAction} controls={false}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}>
        </video>
        <canvas ref={pauseCanvasRef} className={`absolute inset-0 size-full object-contain pointer-events-none ${isPlaying ? "invisible" : ""}`}/>
        <div style={{opacity: !isPlaying ? 0.5 : 0}} className="custom-noise transition-opacity duration-300"/>
        {seekFeedback && <div className={`absolute inset-y-0 w-1/2 flex items-center justify-center pointer-events-none bg-white/10 z-20 ${seekFeedback.side === "left" ? "left-0 rounded-r-[50%]" : "right-0 rounded-l-[50%]"}`}>
            <p className="text-white font-bold tracking-widest text-xs font-wide">{seekFeedback.side === "left" ? `-${seekFeedback.amount}s` : `+${seekFeedback.amount}s`}</p>
        </div>}

        {currentText && <div className={`absolute flex items-end pointer-events-none ${pictureRect ? "" : "inset-0"} ${isPlaying ? "z-10" : ""}`} style={pictureRect}>
            <div className="w-full flex justify-center px-2 pb-3 sm:pb-8 xl:pb-10 text-center text-base sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-white font-bold custom-text-shadow">
                <div className="shrink-0 whitespace-pre leading-tight" dangerouslySetInnerHTML={{ __html: currentText }}/>
            </div>
        </div>}
        <div className={`absolute inset-0 flex items-end pointer-events-none transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
            {showNextEpisode &&
                <button onClick={nextEpisodeAction} className="pointer-events-auto absolute top-2 right-3 sm:top-4 sm:right-6 z-30 px-3 sm:px-5 h-8 sm:h-10 uppercase font-bold text-nowrap text-sm sm:text-base border bg-white text-black hover:bg-white-light">{tAction("nextEpisode")}</button>}
            <div className="bg-gradient" />
            {seasonNumber !== undefined && episodeNumber !== undefined && <div className="absolute top-2 left-3 sm:top-4 sm:left-6 z-20 max-w-1/2 text-left text-white">
                {episodeName && <p className="font-semibold uppercase truncate sm:text-lg">{episodeName}</p>}
                <EpisodeLabel season={seasonNumber} episode={episodeNumber}/>
            </div>}
            <div className="flex flex-col w-full z-20 pointer-events-auto gap-4 text-white">
                <div className="mx-3 sm:mx-4 flex justify-between items-center">
                    <div className="flex gap-2 sm:gap-4 items-center">
                        <IconButton accent={true} color="white" className="px-1 sm:px-3" onClick={togglePlay}><PlayPauseIcon isPlaying={isPlaying} color="current"/></IconButton>
                        <p>{isSeeking ? formatTime(seekTime) : currentTime} / {durationString}</p>
                    </div>

                    <div className="flex gap-2 sm:gap-4 items-center">
                        {audioTracks.length > 1 && <button title={tAction("audio")} onClick={() => {
                            setShowSubtitleMenu(false);
                            setShowAudioMenu((prev) => !prev);
                        }} className="px-2 font-wide border hover:text-accent uppercase">{audioTracks.find((track) => track.id === selectedAudio)?.language || tAction("audio")}</button>}
                        {showAudioMenu && <TracksMenu title={tAction("audio")} onClose={() => setShowAudioMenu(false)}>
                            {audioTracks.map((track, index) => <TrackButton key={track.id} selected={track.id === selectedAudio} onClick={() => changeAudio(track)}>{getTrackLabel(track, index)}</TrackButton>)}
                        </TracksMenu>}
                        {subtitleTracks.length > 0 && <button title={tAction("subtitles")} onClick={() => {
                            setShowAudioMenu(false);
                            setShowSubtitleMenu((prev) => !prev);
                        }} className={`px-2 font-wide border ${selectedSubtitle !== undefined ? "text-black bg-white hover:bg-accent" : "hover:text-accent"}`}>CC</button>}
                        {showSubtitleMenu && <TracksMenu title={tAction("subtitles")} onClose={() => setShowSubtitleMenu(false)}>
                            <TrackButton selected={selectedSubtitle === undefined} onClick={() => changeSubtitle()}>{tAction("subtitlesOff")}</TrackButton>
                            {subtitleTracks.map((track, index) => <TrackButton key={index} selected={index === selectedSubtitle} onClick={() => changeSubtitle(index)}>{getTrackLabel(track, index)}</TrackButton>)}
                        </TracksMenu>}

                        <IconButton accent={true} color="white" className="px-1 sm:px-3" onClick={toggleFullscreen}><FullScreenIcon iFullScreen={fullscreenEnabled} color="current"/></IconButton>
                    </div>
                </div>

                <div className="w-full h-4 bg-black-light border-t-black">
                    <div ref={progressBarRef} className="h-full bg-gray cursor-pointer select-none" onMouseDown={handleSeekStart} style={{width: `${barDuration ? (downloadDuration / barDuration) * 100 : 0}%`}}>
                        <div className="pointer-events-none h-full bg-accent" style={{width: `${downloadDuration ? (seekTime / downloadDuration) * 100 : 0}%`}} />
                    </div>
                </div>
            </div>
        </div>
    </div>);
}

function TracksMenu({title, onClose, children}: {title: string, onClose: () => void, children: React.ReactNode}) {
    return (<div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 text-white sm:inset-auto sm:bottom-12 sm:right-8 sm:block sm:bg-transparent sm:py-6 sm:px-8" onClick={onClose}>
        <div className="flex flex-col max-h-[75%] bg-black border-t border-white/30 sm:max-h-none sm:bg-transparent sm:border-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between px-4 py-2 border-b border-white/30 sm:hidden">
                <p className="font-wide uppercase">{title}</p>
                <CloseButton size={24} color="white" onClickAction={onClose}/>
            </div>
            <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain sm:gap-1 sm:items-start sm:bg-white sm:py-4 sm:px-5 sm:shadow-[8px_7px_0_var(--color-cblack)] sm:border sm:border-black sm:text-black sm:text-left sm:max-h-[60vh]">
                {children}
            </div>
        </div>
    </div>);
}

function TrackButton({selected, onClick, children}: {selected: boolean, onClick: () => void, children: React.ReactNode}) {
    return (<button className={`flex items-center gap-3 w-full px-4 py-3 border-b border-white/15 text-base text-left wrap-break-word sm:w-auto sm:p-0 sm:border-0 sm:text-lg sm:text-nowrap ${selected ? "font-base font-light text-accent sm:text-black" : "font-hairline hover:text-accent"}`} onClick={onClick}>
        <span className={`size-2 shrink-0 rounded-full bg-accent sm:hidden ${selected ? "" : "invisible"}`}/>
        {children}
    </button>);
}
