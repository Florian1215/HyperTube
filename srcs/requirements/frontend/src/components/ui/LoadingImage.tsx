import React, {useState} from "react";
import Image, {ImageProps} from "next/image";

export default function LoadingImage({className, alt, ...props}: ImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (<>
        <Image {...props} alt={alt} className={(className ?? "") + (isLoaded ? " opacity-100" : " opacity-0")} onLoad={() => setIsLoaded(true)}/>
        {!isLoaded && <div className="absolute inset-0 size-full"><div className="custom-loading"/></div>}
    </>);
}
