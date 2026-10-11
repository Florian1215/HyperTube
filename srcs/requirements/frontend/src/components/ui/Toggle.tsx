export default function Toggle({val, setter}: {val: boolean, setter: (val: boolean) => void}) {
    return (<button type="button" onClick={() => setter(!val)} className={"mt-2 relative w-9 h-5 transition-colors " + (val ? "bg-cblack" : "bg-gray")}>
        <span className={"absolute inset-0.5 size-4 bg-dwhite transition-transform " + (val ? "translate-x-4" : "translate-x-0")}/>
    </button>);
}
