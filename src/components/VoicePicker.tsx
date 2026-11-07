import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { voiceOptions } from '@/lib/voices';

interface VoicePickerProps {
  value: string;
  onChange: (voiceID: string) => void;
  isDisabled?: boolean;
}

export function VoicePicker({ value, onChange, isDisabled = false }: VoicePickerProps) {
  return (
    <Select
      items={voiceOptions}
      value={value}
      onValueChange={(nextValue) => onChange(String(nextValue ?? value))}
      disabled={isDisabled}
    >
      <SelectTrigger className='sm:w-44' aria-label='Voice'>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {voiceOptions.map((voice) => (
          <SelectItem key={voice.value} value={voice.value}>
            {voice.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
