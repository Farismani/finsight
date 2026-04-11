import { useEffect, useState } from 'react'

import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  const [hyperMode, setHyperMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem('finsight-hyper-mode') === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem('finsight-hyper-mode', String(hyperMode))
  }, [hyperMode])

  return (
    <div className={`min-h-screen lg:grid lg:grid-cols-[270px_1fr] ${hyperMode ? 'hyper-mode' : ''}`}>
      <Sidebar />
      <main className="grid-shell min-h-screen">
        <Header
          hyperMode={hyperMode}
          onToggleMode={() => setHyperMode((current) => !current)}
        />
        <div className="px-5 pb-8 pt-6 sm:px-8">{children}</div>
      </main>
    </div>
  )
}
