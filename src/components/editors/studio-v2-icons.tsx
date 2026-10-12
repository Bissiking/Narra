import type { ReactNode } from "react";
export type StudioIconName = "play" | "pause" | "previous" | "next" | "undo" | "redo" | "save" | "export" | "layout" | "settings" | "expand" | "image" | "dialogue" | "action" | "music" | "sfx" | "note" | "video" | "plus" | "minus" | "close" | "chevron" | "grip" | "more" | "eye" | "hidden" | "lock" | "unlock" | "trash" | "volume" | "muted" | "cursor" | "clock" | "grid" | "list" | "edit";
const shapes: Record<StudioIconName, ReactNode> = {
 play:<path d="m8 5 11 7-11 7Z"/>, pause:<path d="M8 5v14M16 5v14"/>, previous:<><path d="m18 6-8 6 8 6ZM6 6v12"/></>, next:<path d="m6 6 8 6-8 6ZM18 6v12"/>,
 undo:<path d="m9 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/>, redo:<path d="m15 4 5 5-5 5M20 9h-9a6 6 0 0 0 0 12"/>,
 save:<path d="M5 3h12l3 3v15H4V3ZM8 3v7h8V3M8 21v-7h8v7"/>, export:<path d="M12 15V3m-4 4 4-4 4 4M5 11v10h14V11"/>,
 layout:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M8 15h8"/></>, settings:<><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/><circle cx="12" cy="12" r="3"/></>,
 expand:<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>, image:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 4-6 5 7"/></>,
 dialogue:<><path d="M4 4h16v13H9l-5 4Z"/><path d="M8 8h8M8 12h6"/></>, action:<><circle cx="14" cy="4" r="2"/><path d="m9 11 4-4 5 4 3-2M13 7l-3 8-5 6m5-6 5 2 1 4M9 11l-5 1"/></>,
 music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>, sfx:<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>,
 note:<><path d="M6 3h9l4 4v14H5V3ZM14 3v5h5M8 12h8M8 16h6"/></>, video:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4"/></>,
 plus:<path d="M12 5v14M5 12h14"/>, minus:<path d="M5 12h14"/>, close:<path d="m6 6 12 12M18 6 6 18"/>, chevron:<path d="m9 5 7 7-7 7"/>,
 grip:<><circle cx="9" cy="5" r=".7"/><circle cx="15" cy="5" r=".7"/><circle cx="9" cy="10" r=".7"/><circle cx="15" cy="10" r=".7"/><circle cx="9" cy="15" r=".7"/><circle cx="15" cy="15" r=".7"/><circle cx="9" cy="20" r=".7"/><circle cx="15" cy="20" r=".7"/></>,
 more:<><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>,
 eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>, hidden:<path d="m3 3 18 18M9 5a13 13 0 0 1 13 7l-3 4M6 7l-4 5s4 7 10 7l4-1"/>,
 lock:<><rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></>, unlock:<><rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0M12 14v3"/></>,
 trash:<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>, volume:<><path d="M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>, muted:<path d="M3 9h4l5-5v16l-5-5H3ZM17 9l5 6m0-6-5 6"/>,
 cursor:<path d="m5 3 14 10-7 1-3 7Z"/>, clock:<><circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5V2m0 7v5l3 2"/></>,
 grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>, list:<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>, edit:<path d="m16 3 5 5L9 20l-6 1 1-6Zm-2 2 5 5"/>
};
export default function StudioIcon({name}: {name:StudioIconName}) {return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;}
