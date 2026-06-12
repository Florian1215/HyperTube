import React, {useState} from "react";

export default function LoadingText({center=false}) {
    const maxWidths = ["max-w-1/10", "max-w-3/10", "max-w-5/10", "max-w-7/10", "max-w-9/10"]
    const [randomWidth] = useState(() => maxWidths[Math.floor(Math.random() * maxWidths.length)]);

    return (<div className="h-8 sm:h-15 xl:h-20 w-full">
        <div className={"custom-loading " + randomWidth + (center ? " mx-auto" : "")} />
    </div>);
}
