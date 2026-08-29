import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CITIES, NER_STATES } from "@/lib/ner/geo";

/** Autocomplete city picker over the NER demo network. */
export function CityCombobox({
  value,
  onChange,
  placeholder = "Search a city…",
  disabledId,
  ariaLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabledId?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = CITIES.find((c) => c.id === value);

  const hubs = CITIES.filter((c) => c.hub);
  const others = CITIES.filter((c) => !c.hub);

  const renderItem = (c: (typeof CITIES)[number]) => (
    <CommandItem
      key={c.id}
      value={`${c.name} ${NER_STATES[c.state]} ${c.state}`}
      disabled={c.id === disabledId}
      onSelect={() => {
        onChange(c.id);
        setOpen(false);
      }}
    >
      <Check className={cn("mr-2 size-4", value === c.id ? "opacity-100" : "opacity-0")} />
      <span className="flex-1">{c.name}</span>
      <span className="text-xs text-muted-foreground">{NER_STATES[c.state]}</span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">
              {current ? `${current.name}, ${NER_STATES[current.state]}` : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a city name…" />
          <CommandList>
            <CommandEmpty>No matching NER location.</CommandEmpty>
            <CommandGroup heading="Freight hubs">{hubs.map(renderItem)}</CommandGroup>
            <CommandGroup heading="Other locations">{others.map(renderItem)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
