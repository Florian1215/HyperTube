export default function TextButton({children, onClick, className} : {children: string, onClick: () => void, className?: string}) {
    return (<button
        className={"text-sm font-light text-gray hover:underline hover:underline-gray text-nowrap " + className}
        onClick={onClick}>
        {children}
    </button>);
}
