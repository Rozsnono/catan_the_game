import type { SVGProps } from 'react'
import type { Resource } from '@/types/game'
// Lightweight inline SVG icons (no external deps).

type IconProps = SVGProps<SVGSVGElement> & { title?: string }

function Base({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

// --- Resource icons ---------------------------------------------------------

type ResourceIconProps = Omit<IconProps, 'title'> & { resource: Resource; title?: string }

export function ResourceIcon({ resource, title, ...props }: ResourceIconProps) {
  switch (resource) {
    case 'wood':
      return (
        <Base {...props} title={title ?? 'Fa'} className='text-green-500'>
          <path d="M12 3c-2.8 1.6-4.2 3.6-4.2 5.9 0 2.3-1.3 3.7-2.8 4.6 1.6.8 3.2 1.9 3.2 4.2h7.6c0-2.3 1.6-3.4 3.2-4.2-1.6-.9-2.8-2.3-2.8-4.6C19 6.6 17.6 4.6 12 3z" />
          <path d="M12 14v7" />
          <path d="M9.5 21h5" />
        </Base>
      )
    case 'brick':
      return (
        <Base {...props} title={title ?? 'Tégla'} className='text-red-500'>
          <path d="M4 8h16v4H4z" />
          <path d="M4 12h16v4H4z" />
          <path d="M8 8v4" />
          <path d="M16 12v4" />
        </Base>
      )
    case 'wheat':
      return (
        <Base {...props} title={title ?? 'Búza'} className='text-yellow-500'>
          <path d="M12 4v16" />
          <path d="M12 7c-1.5 0-2.5-1-2.5-2.5C11 4.6 12 5.6 12 7z" />
          <path d="M12 7c1.5 0 2.5-1 2.5-2.5C13 4.6 12 5.6 12 7z" />
          <path d="M12 11c-1.5 0-2.5-1-2.5-2.5 1.5.1 2.5 1.1 2.5 2.5z" />
          <path d="M12 11c1.5 0 2.5-1 2.5-2.5-1.5.1-2.5 1.1-2.5 2.5z" />
          <path d="M12 15c-1.5 0-2.5-1-2.5-2.5 1.5.1 2.5 1.1 2.5 2.5z" />
          <path d="M12 15c1.5 0 2.5-1 2.5-2.5-1.5.1-2.5 1.1-2.5 2.5z" />
        </Base>
      )
    case 'sheep':
      return (
        <Base {...props} title={title ?? 'Juh'} className='text-emerald-700'>
          <path d="M7 13a5 5 0 0 1 10 0v1a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-1z" />
          <path d="M9 13a1 1 0 0 0 0 2" />
          <path d="M15 13a1 1 0 0 1 0 2" />
          <path d="M10 18v2" />
          <path d="M14 18v2" />
        </Base>
      )
    case 'ore':
      return (
        <Base {...props} title={title ?? 'Érc'} className='text-slate-400'>
          <path d="M7 20l-3-6 5-8 6-2 5 6-4 10H7z" />
          <path d="M10 10l2 2 3-3" />
        </Base>
      )
  }
}

export function ResourceLabel({ resource, children }: { resource: Resource; children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10">
        <ResourceIcon resource={resource} className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </span>
  )
}

export function DiceIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Dobókocka'}>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M9 9h.01" />
      <path d="M15 15h.01" />
      <path d="M15 9h.01" />
      <path d="M9 15h.01" />
    </Base>
  )
}

export function RoadIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Út'}>
      <path d="M6 17l5-10 7 14" />
      <path d="M7 17h14" />
    </Base>
  )
}

export function SettlementIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Település'}>
      <path d="M4 11l8-6 8 6v9H4v-9z" />
      <path d="M9 20v-7h6v7" />
    </Base>
  )
}

export function CityIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Város'}>
      <path d="M4 20V9l8-6 8 6v11" />
      <path d="M8 20v-6h3v6" />
      <path d="M13 20v-8h3v8" />
    </Base>
  )
}

export function TradeIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Kereskedelem'}>
      <path d="M7 7h10l-2-2" />
      <path d="M17 17H7l2 2" />
      <path d="M7 7v4" />
      <path d="M17 17v-4" />
    </Base>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Chat'}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 3 15V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Base>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <Base {...props} title={props.title ?? 'Győzelmi pont'}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
      <path d="M6 7H4a2 2 0 0 0 2 2" />
      <path d="M18 7h2a2 2 0 0 1-2 2" />
      <path d="M12 11v4" />
      <path d="M9 19h6" />
      <path d="M10 15h4" />
    </Base>
  )
}

export function CopyIcon(props: IconProps & { isCopied?: boolean }) {
  if (props.isCopied) {
    return (
      <Base {...props} title={props.title ?? 'Másolva!'}>
        <path d="M9 12l2 2 4-4" />
      </Base>
    )
  }
  return (
    <Base {...props} title={props.title ?? 'Másolás'}>
      <path d="M8 7V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
      <rect x="4" y="8" width="12" height="12" rx="2" />
    </Base>
  )
}

export function MenuIcon({ type, isChat, ...props }: IconProps & { type: 'overview' | 'actions' | 'dev' | 'trade' | 'bank' | 'players' | 'chat' | 'log', isChat?: boolean }) {
  switch (type) {
    case 'overview':
      return (
        <Base {...props} title={props.title ?? 'Játéktábla áttekintő'} fill='currentColor' stroke='none'>
          <path d="M4 18h16c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2ZM4 5h16v11H4V5Z"></path>
          <path d="M23 19H1v2h22v-2Z"></path>
          <path d="M13.97 7.53a3.495 3.495 0 0 0-4.95 0 3.495 3.495 0 0 0 0 4.95c1.18 1.18 3 1.34 4.36.47l2.09 2.09 1.06-1.06-2.09-2.09c.87-1.36.72-3.18-.47-4.36Zm-1.06 3.88c-.78.78-2.05.78-2.83 0-.78-.78-.78-2.05 0-2.83.78-.78 2.05-.78 2.83 0 .78.79.78 2.05 0 2.83Z"></path>
        </Base>
      )
    case 'actions':
      return (
        <Base {...props} title={props.title ?? 'Lehetséges akciók'} fill='currentColor' stroke='none'>
          <path d="M9.5 2h9L13 9h7.5l-12 13 2.5-9.5H4L9.5 2Z"></path>
        </Base>
      )
    case 'dev':
      return (
        <Base {...props} title={props.title ?? 'Fejlesztés'}>
          <path d="M19 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"></path>
          <path d="M12 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
          <path d="M15 12.5a3 3 0 0 0-6 0"></path>
          <path d="M9 15.5h6"></path>
          <path d="M9 18.5h3.5"></path>
        </Base>
      )
    case 'trade':
      return (
        <Base {...props} title={props.title ?? 'Kereskedelem'} fill='currentColor' stroke='none'>
          <path d="M9.33 11.5h2.17A4.5 4.5 0 0 1 16 16H8.999L9 17h8v-1a5.579 5.579 0 0 0-.886-3H19a5 5 0 0 1 4.516 2.851C21.151 18.972 17.322 21 13 21c-2.761 0-5.1-.59-7-1.625v-9.304A6.967 6.967 0 0 1 9.33 11.5ZM5 19a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9ZM18 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-7-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"></path>
        </Base>
      )
    case 'bank':
      return (
        <Base {...props} title={props.title ?? 'Bank'} fill='currentColor' stroke='none'>
          <path fillRule="evenodd" d="m2 6 9.5-5L21 6v2H2V6Zm2 4v7h3v-7H4Zm6 0v7h3v-7h-3Zm11 9v3H2v-3h19Zm-5-9v7h3v-7h-3Z" clipRule="evenodd"></path>
        </Base>
      )
    case 'players':
      return (
        <Base {...props} title={props.title ?? 'Játékosok'} fill='currentColor' stroke='none'>
          <path fillRule="evenodd" d="M10.99 8c0 1.66-1.33 3-2.99 3-1.66 0-3-1.34-3-3s1.34-3 3-3 2.99 1.34 2.99 3Zm8 0c0 1.66-1.33 3-2.99 3-1.66 0-3-1.34-3-3s1.34-3 3-3 2.99 1.34 2.99 3ZM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm7.03.05c.35-.03.68-.05.97-.05 2.33 0 7 1.17 7 3.5V19h-6v-2.5c0-1.48-.81-2.61-1.97-3.45Z" clipRule="evenodd"></path>
        </Base>
      )
    case 'chat':
      if (isChat) {
        return (
          <Base {...props} title={props.title ?? 'Chat'}>
            <path d="M22 7.98V17c0 1.1-.9 2-2 2H6l-4 4V5c0-1.1.9-2 2-2h10.1c-.06.32-.1.66-.1 1 0 .34.04.68.1 1H4v12h16V8.9c.74-.15 1.42-.48 2-.92ZM16 4c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3Z"></path>
          </Base>
        )
      }
      return (
        <Base {...props} title={props.title ?? 'Chat'}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 3 15V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
        </Base>
      )
    case 'log':
      return (
        <Base {...props} title={props.title ?? 'Játékmenet napló'} fill='currentColor' stroke='none'>
          <path d="M19 5v9h-5v5H5V5h14Zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10l6-6V5c0-1.1-.9-2-2-2Zm-7 11H7v-2h5v2Zm5-4H7V8h10v2Z"></path>
        </Base>
      )

  }
}


function FilledBase({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}


export function ResourcePill({ resource, label }: { resource: Resource; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-slate-100">
        <ResourceIcon resource={resource} className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </span>
  )
}
