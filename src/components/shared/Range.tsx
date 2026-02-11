export default function RangeInput(
    props: {
        id?: string;
        min: number;
        max: number;
        value: number;
        onChange: (value: number) => void;
        disabled?: boolean;
    }
) {

    return (
        <div className="flex items-center gap-2">
            <input disabled={props.disabled} id={props.id} type="range" min={props.min} max={props.max} value={props.value} onChange={e => props.onChange(Number(e.target.value))} className="w-full h-2 bg-neutral-quaternary rounded-full appearance-none cursor-pointer"></input>

            <div className="min-w-[2.5rem] rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-center text-sm text-slate-100">
                {props.value}
            </div>
        </div>
    )
}

