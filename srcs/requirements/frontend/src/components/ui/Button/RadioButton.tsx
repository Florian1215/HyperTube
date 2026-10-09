export default function RadioButton({children, selected, onClick}: {children: string, selected: boolean, onClick: () => void}) {
    return (<button
        className={"uppercase text-nowrap px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm border border-black-light " + (selected ? "text-dwhite bg-dblack" : "text-dblack bg-dwhite hover:bg-dwhite-light")}
        onClick={onClick}>
        {children}
    </button>);
}
