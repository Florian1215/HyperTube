import React, {useState} from "react";

export default function LoadingText({center=false}) {
    const maxWidths = ["max-w-40", "max-w-70", "max-w-100", "max-w-130", "max-w-150"]
    const [randomWidth] = useState(() => maxWidths[Math.floor(Math.random() * maxWidths.length)]);

    return (<div className="h-8 sm:h-15 xl:h-20 w-full">
        <div className={"custom-loading " + randomWidth + (center ? " mx-auto" : "")} />
    </div>);
}
