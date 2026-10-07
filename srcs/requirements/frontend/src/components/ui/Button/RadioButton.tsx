export default function RadioButton({children, selected, onClick}: {children: string, selected: boolean, onClick: () => void}) {
    return (<button
        className={"uppercase text-nowrap px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm border " + (selected ? "text-white bg-black" : "text-black bg-white hover:bg-white-loading")}
        onClick={onClick}>
        {children}
    </button>);
}
