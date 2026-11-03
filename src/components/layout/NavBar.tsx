import { NavLink } from 'react-router-dom'
import type { Entry } from '../../types/entry'
import SearchBar from './SearchBar'

const links = [
  { to: '/spreadsheet', label: '一覧' },
  { to: '/graph', label: 'グラフ' },
  { to: '/quiz', label: '復習' },
  { to: '/settings', label: '設定' },
] as const

interface NavBarProps {
  onSearchSelect: (entry: Entry) => void
}

export default function NavBar({ onSearchSelect }: NavBarProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <h1 className="text-xl font-bold tracking-tight">語録</h1>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <SearchBar onSelectEntry={onSearchSelect} />
      </div>
    </header>
  )
}
