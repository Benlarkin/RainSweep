import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const InboxIcon = (p: IconProps) => <Icon {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Icon>
export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => <Icon {...p} fill={filled ? 'currentColor' : 'none'}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Icon>
export const SendIcon = (p: IconProps) => <Icon {...p}><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></Icon>
export const FileIcon = (p: IconProps) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></Icon>
export const TrashIcon = (p: IconProps) => <Icon {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Icon>
export const ArchiveIcon = (p: IconProps) => <Icon {...p}><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></Icon>
export const AlertIcon = (p: IconProps) => <Icon {...p}><path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" /></Icon>
export const TagIcon = (p: IconProps) => <Icon {...p}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><path d="M7 7h.01" /></Icon>
export const MailIcon = (p: IconProps) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></Icon>
export const MailOpenIcon = (p: IconProps) => <Icon {...p}><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6z" /><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" /></Icon>
export const ReplyIcon = (p: IconProps) => <Icon {...p}><path d="M9 17 4 12l5-5" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></Icon>
export const ReplyAllIcon = (p: IconProps) => <Icon {...p}><path d="m7 17-5-5 5-5" /><path d="m12 17-5-5 5-5" /><path d="M22 18v-2a4 4 0 0 0-4-4H7" /></Icon>
export const ForwardIcon = (p: IconProps) => <Icon {...p}><path d="m15 17 5-5-5-5" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></Icon>
export const BackIcon = (p: IconProps) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>
export const PencilIcon = (p: IconProps) => <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></Icon>
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>
export const PaperclipIcon = (p: IconProps) => <Icon {...p}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Icon>
export const RefreshIcon = (p: IconProps) => <Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Icon>
export const KeyboardIcon = (p: IconProps) => <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" /></Icon>

export function LabelIcon({ id, ...props }: IconProps & { id: string }) {
  switch (id) {
    case 'INBOX': return <InboxIcon {...props} />
    case 'STARRED': return <StarIcon {...props} />
    case 'SENT': return <SendIcon {...props} />
    case 'DRAFT': return <FileIcon {...props} />
    case 'TRASH': return <TrashIcon {...props} />
    case 'SPAM': return <AlertIcon {...props} />
    default: return <TagIcon {...props} />
  }
}
