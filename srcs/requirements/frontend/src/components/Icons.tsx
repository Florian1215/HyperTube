"use client";

import {useEffect, useState} from "react";

export function CrossIcon({color="black", size=30, className=""}) {
    const fullColor = `var(--color-${color})`;

    return (<svg className={className} width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="9.32258" y1="8.613" x2="27.2582" y2="26.5486" stroke={fullColor}/>
        <line x1="27.2584" y1="9.32279" x2="9.32279" y2="27.2584" stroke={fullColor}/>
    </svg>);
}

export function RightIcon({color="black", size=13}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} viewBox="0 0 16 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.97437 24.8514L12.4744 13.3514L1.47437 1.35144" stroke={fullColor} strokeWidth="4"/>
    </svg>);
}

export function LeftIcon({color="black", size=13}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} viewBox="0 0 16 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.2107 1.34854L2.71069 12.8485L13.7107 24.8485" stroke={fullColor} strokeWidth="4"/>
    </svg>);
}

export function RightArrowIcon({color="black", size=13}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} viewBox="0 0 45 61" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill={fullColor} d="M43.5076 28.1185C45.2048 29.325 45.1868 31.8514 43.4725 33.0335L4.70302 59.7671C2.71286 61.1394 -2.73295e-06 59.7148 -2.62728e-06 57.2973L-2.54102e-07 3.00532C-1.47579e-07 0.56835 2.75182 -0.851789 4.73811 0.560122L43.5076 28.1185Z"/>
    </svg>);
}

export function LeftArrowIcon({color="black", size=13}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} viewBox="0 0 45 61" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill={fullColor} d="M1.26197 32.1839C-0.435305 30.9775 -0.41727 28.4511 1.29706 27.269L40.0665 0.535405C42.0567 -0.836918 44.7695 0.587725 44.7695 3.00516L44.7695 57.2972C44.7695 59.7341 42.0177 61.1543 40.0314 59.7424L1.26197 32.1839Z"/>
    </svg>);
}

export function UserIcon({selected, color="black", size=20}: {selected: boolean, color?: string, size?: number}) {
    const fullColor = `var(--color-${color})`;

    if (selected) {
        return (<svg width={size} height={size} viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="5" r="4.5" fill={fullColor} stroke={fullColor}/>
            <path d="M0.511719 20.5879L0.510742 20.5752C0.268441 15.6859 4.19964 11.5 9 11.5C13.7908 11.5 17.7145 15.6692 17.4893 20.5459C17.4567 20.7138 17.2975 20.9506 16.835 21.2158C16.3717 21.4814 15.7019 21.7182 14.8701 21.9131C13.2124 22.3015 11.0205 22.5 8.82617 22.5C6.63112 22.5 4.47028 22.3014 2.87305 21.9141C2.07047 21.7194 1.44426 21.4844 1.03027 21.2256C0.605388 20.9599 0.511719 20.7418 0.511719 20.5996V20.5879Z" fill={fullColor} stroke={fullColor}/>
        </svg>);
    }
    return (<svg width={size} height={size} viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.99951 11C14.0932 11.0003 18.2436 15.433 17.9878 20.5996C17.5322 23.7494 0.556311 23.7991 0.0239258 20.748L0.0112305 20.5996C-0.244646 15.4328 3.90558 11 8.99951 11ZM8.99951 12C4.49281 12 0.780709 15.9391 1.00928 20.5508L1.01025 20.5635C1.03025 20.5957 1.0971 20.6784 1.29443 20.8018C1.64261 21.0194 2.21027 21.2384 2.99072 21.4277C4.53596 21.8024 6.65404 22 8.82568 22C10.9962 22 13.1481 21.8036 14.7563 21.4268C15.566 21.237 16.1823 21.0134 16.5854 20.7822C16.8782 20.6143 16.9671 20.496 16.9917 20.4561C17.1654 15.8853 13.4752 12.0003 8.99951 12ZM8.99951 0C11.7607 0.000263611 13.9995 2.23874 13.9995 5C13.9995 7.76126 11.7607 9.99974 8.99951 10C6.23809 10 3.99951 7.76142 3.99951 5C3.99951 2.23858 6.23809 0 8.99951 0ZM8.99951 1C6.79037 1 4.99951 2.79086 4.99951 5C4.99951 7.20914 6.79037 9 8.99951 9C11.2084 8.99974 12.9995 7.20898 12.9995 5C12.9995 2.79102 11.2084 1.00026 8.99951 1Z" fill={fullColor}/>
    </svg>);
}

export function SearchIcon({selected, color="black", size=20 }: {selected: boolean, color?: string, size?: number}) {
    const fullColor = `var(--color-${color})`;

    if (selected) {
        return (<svg width={size} height={size} viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.5 0C14.7467 0 19 4.25329 19 9.5C19 11.5618 18.3404 13.4682 17.2246 15.0254L27 24.2119L24.9453 26.3984L15.1152 17.1602C13.542 18.3154 11.6015 19 9.5 19C4.25329 19 0 14.7467 0 9.5C0 4.25329 4.25329 0 9.5 0ZM9.5 3C5.91015 3 3 5.91015 3 9.5C3 13.0899 5.91015 16 9.5 16C13.0899 16 16 13.0899 16 9.5C16 5.91015 13.0899 3 9.5 3Z" fill={fullColor}/>
        </svg>);
    }
    return (<svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.5 0C14.7467 0 19 4.25329 19 9.5C19 12.0712 17.9766 14.4019 16.3174 16.1123L26 25.2119L25.3154 25.9404L15.584 16.7949C13.9358 18.171 11.815 19 9.5 19C4.25329 19 0 14.7467 0 9.5C0 4.25329 4.25329 0 9.5 0ZM9.5 1C4.80558 1 1 4.80558 1 9.5C1 14.1944 4.80558 18 9.5 18C14.1944 18 18 14.1944 18 9.5C18 4.80558 14.1944 1 9.5 1Z" fill={fullColor}/>
    </svg>);
}

export function EyeIcon({color="black", size=24, crossed=false}: {color?: string, size?: number, crossed?: boolean}) {
    const fullColor = `var(--color-${color})`;

    if (crossed)
        return (<svg height={size} width={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
            <g clipPath="url(#clip0_2902_56205)">
                <path
                    d="M12.0001 4.0645C9.61239 4.0645 7.67013 4.77712 6.12007 5.77699L18.4148 17.9851C21.6687 15.6147 23.0001 12.0645 23.0001 12.0645C23.0001 12.0645 20.0001 4.0645 12.0001 4.0645ZM12.0001 7.0645C14.7611 7.0645 17.0001 9.3035 17.0001 12.0645C17.0001 13.3004 16.5514 14.4318 15.8081 15.3045L8.64004 8.36201C9.52782 7.55584 10.7067 7.0645 12.0001 7.0645ZM12.0001 9.0645C11.5336 9.0645 11.0784 9.17312 10.6682 9.37635L14.6875 13.3979C14.8912 12.9873 15.0001 12.5315 15.0001 12.0645C15.0001 11.2688 14.684 10.5058 14.1214 9.94318C13.5588 9.38057 12.7957 9.0645 12.0001 9.0645Z"
                    fill={fullColor}/>
                <path fillRule="evenodd" clipRule="evenodd"
                      d="M22.343 23.7651L0.28125 1.70335L1.6389 0.345703L23.7006 22.4074L22.343 23.7651Z"
                      fill={fullColor}/>
                <path d="M11.8195 15.059C10.305 14.969 9.09286 13.7556 9.00513 12.2405L11.8195 15.059Z"
                      fill={fullColor}/>
                <path
                    d="M6.99561 12.0645C6.99561 14.7894 9.21646 17.0688 12 17.0688C12.5652 17.0688 13.0909 16.9785 13.5982 16.8068L16.0873 19.2959C12.6987 20.6758 5.05674 21.1038 0.995605 12.0645C1.37115 11.13 2.38425 9.12997 4.13971 7.37451L7.25761 10.4924C6.99561 11.1736 6.99561 12.0645 6.99561 12.0645Z"
                    fill={fullColor}/>
            </g>
            <defs>
                <clipPath id="clip0_2902_56205">
                    <rect width="24" height="24" fill={fullColor}/>
                </clipPath>
            </defs>
        </svg>);

    return (<svg height={size} width={size} viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
        <path
            d="M12 4.08398C4 4.08398 1 12.084 1 12.084C1 12.084 4 20.084 12 20.084C20 20.084 23 12.084 23 12.084C23 12.084 20 4.08398 12 4.08398ZM12 7.08398C14.761 7.08398 17 9.32298 17 12.084C17 14.845 14.761 17.084 12 17.084C9.239 17.084 7 14.845 7 12.084C7 9.32298 9.239 7.08398 12 7.08398ZM12 9.08398C11.2044 9.08398 10.4413 9.40005 9.87868 9.96266C9.31607 10.5253 9 11.2883 9 12.084C9 12.8796 9.31607 13.6427 9.87868 14.2053C10.4413 14.7679 11.2044 15.084 12 15.084C12.7956 15.084 13.5587 14.7679 14.1213 14.2053C14.6839 13.6427 15 12.8796 15 12.084C15 11.2883 14.6839 10.5253 14.1213 9.96266C13.5587 9.40005 12.7956 9.08398 12 9.08398Z"
            fill={fullColor}/>
    </svg>);
}

export function HypertubResponsiveLogo({color="black", height=20}: {color?: string, height?: number, width?: number, className?: string}) {
    const fullColor = `var(--color-${color})`;
    const defaultRecWidth = 266;
    const minWindowWidth = 640;
    const [recWidth, setRecWidth] = useState(defaultRecWidth);

    const handleResize = (value: number) => value - defaultRecWidth + recWidth;

    useEffect(() => {
        const handlWindowResize = () => {
            let newRecWidth = (window.innerWidth - minWindowWidth) / 3;
            if (newRecWidth < 0)
                newRecWidth = 0;
            setRecWidth(newRecWidth);
        };
        handlWindowResize();
        window.addEventListener("resize", handlWindowResize);

        return () => window.removeEventListener("resize", handlWindowResize);
    }, []);

    return (<svg className="h-2 sm:h-6 md:h-4 xl:h-6 w-auto" width={height * handleResize(1110) / 65} height={height} viewBox={`0 0 ${handleResize(1110)} 65`} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/*h*/} <path d="M590.15 30.5918C590.15 41.8558 595.142 48.1279 610.758 48.1279C611.645 48.1279 612.498 48.1057 613.317 48.0654V64.6094C612.48 64.6282 611.626 64.6396 610.758 64.6396C579.014 64.6396 567.75 52.0958 567.75 30.5918V0H590.15V30.5918Z" fill={fullColor}/>
        {/*y*/} <path d="M22.5283 23.4238H63.7441V0H86.2725V64H63.7441V40.0645H22.5283V64H0V0H22.5283V23.4238Z" fill={fullColor}/>
        {/*p*/} <path d="M143.669 25.0879L166.325 0H194.613L154.805 39.2959V64H132.277V39.2959L92.4688 0H120.757L143.669 25.0879Z" fill={fullColor}/>
        {/*e*/} <path fillRule="evenodd" clipRule="evenodd" d="M253.483 0C273.451 7.96847e-05 285.099 6.0165 285.099 20.6084C285.098 35.2001 273.451 41.2158 252.971 41.2158H223.403V64H200.875V0H253.483ZM223.403 25.4717H252.587C258.987 25.4717 262.699 24.4481 262.699 20.6084C262.699 16.7684 258.987 15.8721 252.587 15.8721H223.403V25.4717Z" fill={fullColor}/>
        {/*r*/} <path d="M374.25 15.8721H316.778V23.9355H371.946V39.8076H316.778V48.1279H374.25V64H294.25V0H374.25V15.8721Z" fill={fullColor}/>
        {/*t*/} <path fillRule="evenodd" clipRule="evenodd" d="M440.483 0C460.451 5.76439e-05 472.098 4.35202 472.099 18.4316C472.099 28.6716 463.907 32.8956 454.179 34.5596C463.395 35.3276 467.747 38.2719 469.411 46.4639L471.331 55.9355C472.099 59.7752 472.483 61.5677 473.635 62.8477V64H451.363C449.571 61.8241 449.315 59.2642 448.547 56.3203L446.499 48.1279C445.219 42.6241 443.043 40.3204 434.979 40.3203H410.403V64H387.875V0H440.483ZM410.403 26.2402H438.819C445.987 26.2402 449.699 25.216 449.699 20.9922C449.699 16.6403 445.987 15.8721 438.819 15.8721H410.403V26.2402Z" fill={fullColor}/>
        {/*u 1/2*/} <path d="M558.469 16.6396H530.181V64H507.909V16.6396H479.621V0H558.469V16.6396Z" fill={fullColor}/>
        {/*u 2/2*/} <path d={`M${handleResize(917.01)} 30.5918C${handleResize(917.01)} 52.0958 ${handleResize(905.874)} 64.6396 ${handleResize(874.258)} 64.6396C${handleResize(873.602)} 64.6396 ${handleResize(872.956)} 64.6318 ${handleResize(872.317)} 64.6211V48.0928C872.945 48.1155 ${handleResize(873.592)} 48.1279 ${handleResize(874.258)} 48.1279C${handleResize(889.874)} 48.1279 ${handleResize(894.866)} 41.8558 ${handleResize(894.866)} 30.5918V0H${handleResize(917.01)}V30.5918Z`} fill={fullColor}/>
        {/*b*/} <path fillRule="evenodd" clipRule="evenodd" d={`M${handleResize(982.98)} 0C${handleResize(1001.54)} 6.95936e-05 ${handleResize(1013.96)} 4.09606 ${handleResize(1013.96)} 16.3838C${handleResize(1013.96)} 23.4238 ${handleResize(1008.71)} 27.2637 ${handleResize(1000.26)} 29.0557C${handleResize(1010.24)} 30.7196 ${handleResize(1016.64)} 34.9439 ${handleResize(1016.64)} 44.9277C${handleResize(1016.64)} 58.6237 ${handleResize(1003.33)} 64 ${handleResize(984.516)} 64H${handleResize(930.5)}V0H${handleResize(982.98)}ZM${handleResize(952.9)} 48.1279H${handleResize(984.26)}C${handleResize(990.532)} 48.1279 ${handleResize(994.244)} 47.3595 ${handleResize(994.244)} 43.5195C${handleResize(994.244)} 39.5519 ${handleResize(990.532)} 38.7842 ${handleResize(984.26)} 38.7842H${handleResize(952.9)}V48.1279ZM${handleResize(952.9)} 24.5762H${handleResize(983.492)}C${handleResize(989.38)} 24.5762 ${handleResize(993.22)} 23.9357 ${handleResize(993.22)} 20.0957C${handleResize(993.22)} 16.512 ${handleResize(989.38)} 15.8721 ${handleResize(983.492)} 15.8721H${handleResize(952.9)}V24.5762Z`} fill={fullColor}/>
        {/*e*/} <path d={`M${handleResize(1109.12)} 15.8721H${handleResize(1051.65)}V23.9355H${handleResize(1106.82)}V39.8076H${handleResize(1051.65)}V48.1279H${handleResize(1109.12)}V64H${handleResize(1029.12)}V0H${handleResize(1109.12)}V15.8721Z`} fill={fullColor}/>
        <rect x="608.317" y="48" width={recWidth} height="16.5" fill={fullColor}/>
    </svg>);
}

export function HypertubeLogo({color="black", height=20, width, className}: {color?: string, height?: number, width?: number, className?: string}) {
    const fullColor = `var(--color-${color})`;
    const preserveRatio = height && width ? "none" : "xMidYMid meet";
    if (!width)
        width = (height * 347) / 21
    if (!height)
        height = (width * 21) / 347

    return (<svg className={className} width={width} height={height} viewBox="0 0 347 21" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio={preserveRatio}>
        <path d="M7.04004 7.31934H19.9199V0H26.96V20H19.9199V12.5195H7.04004V20H0V0H7.04004V7.31934Z" fill={fullColor}/>
        <path d="M44.8965 7.83984L51.9766 0H60.8164L48.377 12.2793V20H41.3369V12.2793L28.8965 0H37.7363L44.8965 7.83984Z" fill={fullColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M79.2139 0C85.4536 8.58141e-05 89.0937 1.87964 89.0938 6.43945C89.0938 10.9994 85.4535 12.8798 79.0537 12.8799H69.8135V20H62.7734V0H79.2139ZM69.8135 7.95996H78.9336C80.9335 7.95994 82.0938 7.63942 82.0938 6.43945C82.0937 5.23958 80.9334 4.95998 78.9336 4.95996H69.8135V7.95996Z" fill={fullColor}/>
        <path d="M116.953 4.95996H98.9932V7.47949H116.233V12.4395H98.9932V15.04H116.953V20H91.9531V0H116.953V4.95996Z" fill={fullColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M137.651 0C143.891 6.20791e-05 147.531 1.35987 147.531 5.75977C147.531 8.95963 144.971 10.2798 141.931 10.7998C144.811 11.0398 146.171 11.9595 146.691 14.5195L147.291 17.4795C147.531 18.6794 147.651 19.2397 148.011 19.6396V20H141.051C140.491 19.32 140.411 18.5196 140.171 17.5996L139.531 15.04C139.131 13.32 138.451 12.5996 135.931 12.5996H128.251V20H121.211V0H137.651ZM128.251 8.19922H137.131C139.371 8.19922 140.531 7.87957 140.531 6.55957C140.531 5.19957 139.371 4.95996 137.131 4.95996H128.251V8.19922Z" fill={fullColor}/>
        <path d="M174.521 5.19922H165.682V20H158.722V5.19922H149.882V0H174.521V5.19922Z" fill={fullColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M306.618 0C312.418 2.13266e-05 316.298 1.27951 316.298 5.11914C316.298 7.31914 314.658 8.5191 312.018 9.0791C315.138 9.5991 317.138 10.92 317.138 14.04C317.137 18.3197 312.977 20 307.098 20H290.218V0H306.618ZM297.218 15.04H307.018C308.978 15.04 310.138 14.7996 310.138 13.5996C310.138 12.3596 308.978 12.1191 307.018 12.1191H297.218V15.04ZM297.218 7.67969H306.778C308.618 7.67967 309.818 7.47923 309.818 6.2793C309.818 5.1596 308.618 4.95998 306.778 4.95996H297.218V7.67969Z" fill={fullColor}/>
        <path d="M346.038 4.95996H328.078V7.47949H345.318V12.4395H328.078V15.04H346.038V20H321.038V0H346.038V4.95996Z" fill={fullColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M190.862 15.04C185.982 15.04 184.422 13.0796 184.422 9.55957V0H177.422V9.55957C177.422 16.2796 180.942 20.1992 190.862 20.1992H272.643C282.522 20.1992 286.002 16.2795 286.002 9.55957V0H279.082V9.55957C279.082 13.0107 277.583 14.9611 272.925 15.0361L190.862 15.04Z" fill={fullColor}/>
    </svg>);
}

export function ExitDoorIcon({selected, color="black", size=20}: {selected: boolean, color?: string, size?: number}) {
    const fullColor = `var(--color-${color})`;

    if (selected) {
        return (<svg width={size} height={size} viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.75 0C21.3023 1.93276e-07 21.75 0.447715 21.75 1V22C21.75 22.5523 21.3023 23 20.75 23H8.75C8.19772 23 7.75 22.5523 7.75 22V14H12.8311C13.1072 14 13.3311 13.7761 13.3311 13.5V10.5C13.3311 10.2239 13.1072 10 12.8311 10H7.75V1C7.75 0.447715 8.19772 2.41596e-08 8.75 0H20.75Z" fill={fullColor}/>
            <path d="M0.146446 11.6464C-0.0488157 11.8417 -0.0488157 12.1583 0.146446 12.3536L3.32843 15.5355C3.52369 15.7308 3.84027 15.7308 4.03553 15.5355C4.2308 15.3403 4.2308 15.0237 4.03553 14.8284L1.20711 12L4.03553 9.17157C4.2308 8.97631 4.2308 8.65973 4.03553 8.46447C3.84027 8.2692 3.52369 8.2692 3.32843 8.46447L0.146446 11.6464ZM12 12V11.5L0.5 11.5V12V12.5L12 12.5V12Z" fill={fullColor}/>
        </svg>);
    }
    return (<svg width={size} height={size} viewBox="0 0 23 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.75 0C21.5784 2.06158e-05 22.25 0.671585 22.25 1.5V22.5C22.25 23.3284 21.5784 24 20.75 24H8.75C7.92157 24 7.25 23.3284 7.25 22.5V18.5H8.25V22.5C8.25 22.7761 8.47386 23 8.75 23H20.75C21.0261 23 21.25 22.7761 21.25 22.5V1.5C21.25 1.22387 21.0261 1.00002 20.75 1H8.75C8.47386 1 8.25 1.22386 8.25 1.5V6.5H7.25V1.5C7.25 0.671573 7.92157 0 8.75 0H20.75ZM3.32812 8.96484C3.52339 8.7696 3.8399 8.76959 4.03516 8.96484C4.23039 9.1601 4.23039 9.47662 4.03516 9.67188L1.70703 12H12V13H1.70703L4.03516 15.3281C4.23039 15.5234 4.23039 15.8399 4.03516 16.0352C3.8399 16.2304 3.52339 16.2304 3.32812 16.0352L0.146484 12.8535C-0.0487776 12.6583 -0.0487776 12.3417 0.146484 12.1465L3.32812 8.96484Z" fill={fullColor}/>
    </svg>);
}

export function CheckIcon({color="black", size=20, className="" }) {
    const fullColor = `var(--color-${color})`;

    return (<svg className={className} width={size} height={size} viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.7087 0.401886L6.653 13.184L0.459512 6.99635" stroke={fullColor} strokeWidth="1.1"/>
    </svg>);
}

export function GridIcon({color="black", size=20}) {
    const fullColor = `var(--color-${color})`;

    return (<svg height={size} width={size} fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 15">
        <path fill={fullColor} stroke={fullColor} strokeWidth="1.5" d="M1.252 1.697h4.5v4.5h-4.5zM8.752 1.697h4.5v4.5h-4.5zM16.252 1.697h4.5v4.5h-4.5zM1.252 9.197h4.5v4.5h-4.5zM8.752 9.197h4.5v4.5h-4.5zM16.252 9.197h4.5v4.5h-4.5z"/>
    </svg>);
}

export function ListIcon({color="black", size=20}) {
    const fullColor = `var(--color-${color})`;

    return (<svg height={size} width={size} fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 14">
        <path fillRule="evenodd" clipRule="evenodd" d="M21.499 3.33H5.719V.505h15.78V3.33ZM3.325 3.33H.5V.505h2.825V3.33ZM21.499 8.649H5.719V5.824h15.78v2.825ZM3.325 8.661H.5V5.836h2.825v2.825ZM21.499 13.966H5.719v-2.825h15.78v2.825ZM3.325 13.964H.5V11.14h2.825v2.825Z"
              fill={fullColor}/>
    </svg>);
}

export function SortIcon({sideUp=true, color="black", size=15}) {
    const fullColor = `var(--color-${color})`;

    return (<svg height={size} width={size} fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 16">
        {sideUp ?
            <path d="M5.95 4.68171e-06L4.13909 4.99834e-06L4.13909 11.74L1.30182 9.11728L-8.4212e-07 10.3827L5.04455 15.1991L9.62091 10.3827L8.32 9.11637L5.95 11.7391L5.95 4.68171e-06Z" fill={fullColor}/> :
            <path d="M5.95 15.1991L4.13909 15.1991L4.13909 3.45909L1.30182 6.08182L-8.4212e-07 4.81636L5.04455 8.82016e-07L9.62091 4.81637L8.32 6.08273L5.95 3.46L5.95 15.1991Z" fill={fullColor}/>}
    </svg>);
}

export function StarIcon({color="yellow", size=18}) {
    const fullColor = `var(--color-${color})`;

    return (<svg height={size} width={size} viewBox="0 0 55 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill={fullColor} d="M24.6816 2.22729C25.43 -0.0759635 28.6891 -0.0759652 29.4375 2.22729L33.7686 15.5574C34.2371 16.9995 35.5814 17.9763 37.0977 17.9763H51.1133C53.5351 17.9763 54.5423 21.0753 52.583 22.4988L41.2432 30.7371C40.0167 31.6283 39.5033 33.2082 39.9717 34.6501L44.3037 47.9802C45.0521 50.2835 42.4153 52.1996 40.4561 50.7761L29.1172 42.5369C27.8905 41.6456 26.2287 41.6456 25.002 42.5369L13.6631 50.7761C11.7038 52.1996 9.06705 50.2835 9.81543 47.9802L14.1475 34.6501C14.6158 33.2082 14.1025 31.6283 12.876 30.7371L1.53613 22.4988C-0.423148 21.0753 0.584047 17.9763 3.00586 17.9763H17.0215C18.5378 17.9763 19.882 16.9995 20.3506 15.5574L24.6816 2.22729Z"/>
    </svg>);
}

export function EditIcon({color="black", size=20}) {
    const fullColor = `var(--color-${color})`;

    return (<svg height={size} width={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384.24 384.24">
        <path fill={fullColor} d="M36.48,101.52v242.88h247.92v-147.24c0-2.47,2.35-7.1,3.96-9,10.13-12.03,29.21-5.61,30.57,9.75l.03,160.05c-.72,10.4-8.32,19.07-18.66,20.7-92.33.72-184.77.09-277.14.32-11.16-.52-20.35-9.38-21.24-20.52V87.47c.89-11.04,9.94-19.89,21.01-20.51l163.41.03c13.94,1.27,21.09,17.68,11.79,28.53-2.23,2.61-7.54,6-11.04,6H36.48Z"/>
        <path fill={fullColor} d="M275.88,53.04l55.45,56.64-125.05,124.8c-14.41,4.97-29.59,7.1-44.53,9.95-4.34.83-14.3,3.7-18.05,3.18-4.28-.59-6.87-4.48-6.63-8.66.2-3.47,2.02-9.14,2.74-12.87,3.07-15.92,5.25-32.16,10.57-47.51l125.51-125.53Z"/>
        <path fill={fullColor} d="M328.74,1.26c2.55-.35,4.91.09,7.1,1.42l44.44,44.12c3.6,3.75,4.02,9.1.72,13.21l-38.16,38.15-56.5-56.55L324.48,3.24c1.14-.92,2.81-1.78,4.26-1.98Z"/>
    </svg>);
}

export function BookmarkIcon({color="black", size=20, filled=false}: {color?: string, size?: number, filled?: boolean}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill={filled ? fullColor : "none"} stroke={fullColor} strokeWidth={2} d="M6 3h12v18l-6-4.5L6 21V3Z"/>
    </svg>);
}

export function RewatchIcon({color="black", size=16}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="390.14 200 12 12" fill="none">
        <path stroke={fullColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M400.112557,201 L400.112557,203.5 L397.615057,203.5 M391.5012,206.055 C391.5012,203.45 393.579117,201.335 396.141549,201.335 C397.510177,201.335 398.738945,201.935 399.593089,202.895 C399.757924,203.085 399.912769,203.29 400.052629,203.505 M392.120557,211 L392.120557,208.5 L394.618057,208.5 M400.786914,206.055 C400.786914,208.665 398.708997,210.78 396.14157,210.78 C394.777937,210.78 393.544174,210.175 392.695025,209.22 C392.53019,209.03 392.375346,208.825 392.235486,208.605"/>
    </svg>);
}

export function TrashIcon({color="red", size=20}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1278 1598">
        <path fill={fullColor} d="M1257.1000,454.005 L20.000,454.005 C8.954,454.005 -0.000,445.050 -0.000,434.005 L-0.000,263.995 C-0.000,252.950 8.954,243.995 20.000,243.995 L1257.1000,243.995 C1269.046,243.995 1278.000,252.950 1278.000,263.995 L1278.000,434.005 C1278.000,445.050 1269.046,454.005 1257.1000,454.005 ZM883.229,152.090 L395.273,152.090 C384.227,152.090 375.273,143.136 375.273,132.090 L375.273,20.638 C375.273,9.592 384.227,0.638 395.273,0.638 L883.229,0.638 C894.274,0.638 903.229,9.592 903.229,20.638 L903.229,132.090 C903.229,143.136 894.274,152.090 883.229,152.090 ZM131.273,545.638 L1159.229,545.638 C1170.274,545.638 1179.229,554.592 1179.229,565.638 L1179.229,1577.090 C1179.229,1588.136 1170.274,1597.090 1159.229,1597.090 L131.273,1597.090 C120.227,1597.090 111.273,1588.136 111.273,1577.090 L111.273,565.638 C111.273,554.592 120.227,545.638 131.273,545.638 ZM766.000,1421.005 C766.000,1432.050 774.954,1441.005 786.000,1441.005 L833.1000,1441.005 C845.046,1441.005 854.000,1432.050 854.000,1421.005 L854.000,720.995 C854.000,709.950 845.046,700.995 833.1000,700.995 L786.000,700.995 C774.954,700.995 766.000,709.950 766.000,720.995 L766.000,1421.005 ZM436.000,1421.005 C436.000,1432.050 444.954,1441.005 455.1000,1441.005 L503.1000,1441.005 C515.046,1441.005 524.000,1432.050 524.000,1421.005 L524.000,720.995 C524.000,709.950 515.046,700.995 503.1000,700.995 L455.1000,700.995 C444.954,700.995 436.000,709.950 436.000,720.995 L436.000,1421.005 Z"/>
    </svg>);
}

export function PlayPauseIcon({color = "white", isPlaying = false, size=25}) {
    const fullColor = `var(--color-${color})`;

    if (isPlaying)
        return (<svg width={size} height={size} viewBox="0 0 22 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 0C6.55228 0 7 0.447715 7 1V26C7 26.5523 6.55228 27 6 27H1C0.447715 27 4.02663e-09 26.5523 0 26V1C0 0.447715 0.447715 2.41595e-08 1 0H6ZM21 0C21.5523 0 22 0.447715 22 1V26C22 26.5523 21.5523 27 21 27H16C15.4477 27 15 26.5523 15 26V1C15 0.447715 15.4477 2.41595e-08 16 0H21Z" fill={fullColor}/>
        </svg>);
    return (<svg width={size} height={size} viewBox="0 0 23 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.6016 13.0769C21.9192 13.2721 21.9192 13.7333 21.6016 13.9285L1.26172 26.4294C0.928574 26.6342 0.499999 26.3947 0.499999 26.0037L0.5 1.00171C0.5 0.610677 0.928576 0.371177 1.26172 0.575927L21.6016 13.0769Z" fill={fullColor}/>
    </svg>);
}

export function FullScreenIcon({color="white", iFullScreen=false, size=21}) {
    const fullColor = `var(--color-${color})`;

    if (iFullScreen)
        return (<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1599 1598">
            <path fillRule="evenodd" fill={fullColor} d="M1596.145,151.551 L1234.463,512.971 L1524.533,512.971 C1535.587,512.971 1544.549,521.927 1544.549,532.974 L1544.549,698.1000 C1544.549,710.047 1535.587,719.003 1524.533,719.003 L1063.160,719.003 L897.026,719.003 C885.972,719.003 877.010,710.047 877.010,698.1000 L877.010,532.974 L877.010,71.903 C877.010,60.856 885.972,51.900 897.026,51.900 L1063.160,51.900 C1074.215,51.900 1083.177,60.856 1083.177,71.903 L1083.177,372.785 L1450.363,5.865 C1458.180,-1.947 1470.853,-1.947 1478.670,5.865 L1596.145,123.263 C1603.962,131.074 1603.962,143.739 1596.145,151.551 ZM705.486,1549.129 L539.452,1549.129 C528.404,1549.129 519.448,1540.179 519.448,1529.138 L519.448,1228.425 L152.483,1595.139 C144.671,1602.946 132.005,1602.946 124.193,1595.139 L6.789,1477.807 C-1.023,1469.1000 -1.023,1457.342 6.789,1449.534 L368.253,1088.319 L78.358,1088.319 C67.310,1088.319 58.354,1079.368 58.354,1068.327 L58.354,902.395 C58.354,891.354 67.310,882.403 78.358,882.403 L539.452,882.403 L705.486,882.403 C716.534,882.403 725.490,891.354 725.490,902.395 L725.490,1068.327 L725.490,1529.138 C725.490,1540.179 716.534,1549.129 705.486,1549.129 Z"/>
        </svg>);
    return (<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1599 1598">
        <path fillRule="evenodd" fill={fullColor} d="M1578.996,666.726 L1412.962,666.726 C1401.914,666.726 1392.958,657.776 1392.958,646.734 L1392.958,346.022 L983.567,755.162 C975.755,762.969 963.089,762.969 955.277,755.162 L837.873,637.830 C830.061,630.023 830.061,617.365 837.873,609.558 L1241.763,205.915 L951.868,205.915 C940.820,205.915 931.864,196.965 931.864,185.924 L931.864,19.992 C931.864,8.951 940.820,0.000 951.868,0.000 L1412.962,0.000 L1578.996,0.000 C1590.044,0.000 1598.1000,8.951 1598.1000,19.992 L1598.1000,185.924 L1598.1000,646.734 C1598.1000,657.776 1590.044,666.726 1578.996,666.726 ZM357.164,1394.1000 L646.1000,1394.1000 C658.046,1394.1000 666.1000,1403.954 666.1000,1414.1000 L666.1000,1580.1000 C666.1000,1592.046 658.046,1600.1000 646.1000,1600.1000 L186.000,1600.1000 L20.000,1600.1000 C8.954,1600.1000 0.000,1592.046 0.000,1580.1000 L0.000,1414.1000 L0.000,954.000 C0.000,942.954 8.954,933.1000 20.000,933.1000 L186.000,933.1000 C197.046,933.1000 206.000,942.954 206.000,954.000 L206.000,1254.836 L615.308,845.528 C623.118,837.718 635.782,837.718 643.592,845.528 L760.972,962.908 C768.782,970.718 768.782,983.382 760.972,991.192 L357.164,1394.1000 Z"/>
    </svg>)
}

export function CopyIcon({color="white", size=15}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} aria-hidden="true" focusable="false"
                 viewBox="0 0 16 16" fill="currentColor" display="inline-block"
                 overflow="visible">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" fill={fullColor}/>
        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" fill={fullColor}/>
    </svg>);
}

export function DownloadIcon({color="black", size=20}) {
    const fullColor = `var(--color-${color})`;

    return (<svg width={size} height={size} aria-hidden="true" focusable="false" viewBox="0 0 16 16">
        <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" fill={fullColor}/>
        <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" fill={fullColor}/>
    </svg>);
}
