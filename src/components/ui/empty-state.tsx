import { CalendarHeart } from "lucide-react";
export function EmptyState({ message }: { message: string }) { return <div className="rounded-[24px] border border-dashed border-[#d9d2c5] bg-white/60 p-10 text-center text-[#7b857f]"><CalendarHeart className="mx-auto mb-3 text-[#b78b47]" /><p className="text-sm font-semibold">{message}</p></div>; }
