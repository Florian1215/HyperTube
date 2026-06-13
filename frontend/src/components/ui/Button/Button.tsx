export default function Button({children, onClick, className, disabled=false}: {children: React.ReactNode, onClick: () => void, className?: string, disabled?: boolean}) {
    return (<button
        disabled={disabled} onClick={onClick} type="button"
        className={"uppercase text-nowrap px-5 xl:px-5 h-10 text-white text-sm sm:text-base xl:text-lg " + (disabled ? "bg-gray " : "bg-black hover:bg-black-hover ") + className}>
        {children}
    </button>);
}
