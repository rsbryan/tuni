import { coverGradient, coverInitials } from "@/lib/covers";
import { MusicItem } from "@/lib/types";

export function Artwork({
  item,
  className = "",
}: {
  item: MusicItem;
  className?: string;
}) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt=""
        className={`${className} object-cover`}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center`}
      style={{ background: coverGradient(item.id + item.title) }}
    >
      <span className="font-display italic text-ink/70 text-[0.9em] select-none">
        {coverInitials(item.title)}
      </span>
    </div>
  );
}
