import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  navEntries,
  type NavEntry,
  type NavLinkItem,
} from '@/components/layout/nav-config'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { canAccessNav } from '@/features/permissions/catalog'
import { cn } from '@/lib/utils'

function linkClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
  )
}

function SidebarLinkWithMatch({
  item,
  nested = false,
  onNavigate,
}: {
  item: NavLinkItem
  nested?: boolean
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const isActive = item.match ? item.match(pathname) : pathname === item.to

  return (
    <NavLink
      to={item.to}
      className={cn(linkClassName(isActive), nested && 'pl-9')}
      onClick={onNavigate}
    >
      <item.icon className="size-4 shrink-0" />
      {item.label}
    </NavLink>
  )
}

function SidebarNavGroup({
  entry,
  onNavigate,
}: {
  entry: Extract<NavEntry, { type: 'group' }>
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const isSectionActive = entry.items.some((item) =>
    item.match ? item.match(pathname) : pathname === item.to
  )
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (isSectionActive) {
      setExpanded(true)
    }
  }, [isSectionActive])

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          isSectionActive
            ? 'text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
        )}
      >
        <entry.icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 opacity-60 transition-transform duration-200',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {expanded ? (
        <div className="space-y-0.5">
          {entry.items.map((item) => (
            <SidebarLinkWithMatch key={item.to} item={item} nested onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function useVisibleNavEntries(): NavEntry[] {
  const { user } = useAuth()

  return useMemo(
    () =>
      navEntries
        .filter((entry) => {
          if (entry.type === 'link') {
            return canAccessNav(user?.role, user?.permissions, entry.item.navPath)
          }

          return entry.items.some((item) =>
            canAccessNav(user?.role, user?.permissions, item.navPath)
          )
        })
        .map((entry) => {
          if (entry.type === 'group') {
            return {
              ...entry,
              items: entry.items.filter((item) =>
                canAccessNav(user?.role, user?.permissions, item.navPath)
              ),
            }
          }
          return entry
        }),
    [user?.permissions, user?.role]
  )
}

export function AppNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  const visibleEntries = useVisibleNavEntries()

  return (
    <nav className={cn('scrollbar-subtle flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3', className)}>
      {visibleEntries.map((entry) => {
        if (entry.type === 'link') {
          return (
            <SidebarLinkWithMatch
              key={entry.item.to}
              item={entry.item}
              onNavigate={onNavigate}
            />
          )
        }

        return <SidebarNavGroup key={entry.id} entry={entry} onNavigate={onNavigate} />
      })}
    </nav>
  )
}

export function getAppVersionLabel() {
  const fromEnv = import.meta.env.VITE_APP_VERSION?.trim()
  if (fromEnv) return fromEnv
  const buildId = import.meta.env.VITE_BUILD_ID?.trim()
  if (!buildId) return null
  const versionPart = buildId.split('-')[0]?.trim()
  return versionPart || null
}

export function SidebarBrandFooter({ className }: { className?: string }) {
  const appVersion = getAppVersionLabel()
  const copyrightYear = new Date().getFullYear()

  return (
    <footer
      className={cn(
        'text-sidebar-foreground/60 shrink-0 border-t px-4 py-3 text-xs leading-relaxed',
        className
      )}
    >
      <p>© {copyrightYear} Nega POS</p>
      <p className="mt-0.5 tabular-nums">{appVersion ? `v${appVersion}` : 'v—'}</p>
    </footer>
  )
}

export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-svh w-56 shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">
          NEGA <span className="font-light text-muted-foreground">POS</span>
        </span>
      </div>
      <AppNavLinks />
      <SidebarBrandFooter />
    </aside>
  )
}
