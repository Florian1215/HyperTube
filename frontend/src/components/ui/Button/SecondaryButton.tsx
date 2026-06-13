export default function SecondaryButton({children, onClick, className} : {children: string, onClick: () => void, className?: string}) {
    return (<button
        className={"uppercase text-nowrap px-3 sm:px-5 h-8 sm:h-10 bg-white text-black text-sm sm:text-base xl:text-lg " + className}
        onClick={onClick}>
        {children}
    </button>);
}
