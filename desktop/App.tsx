import React, { useState, useEffect } from 'react'
const { ipcRenderer } = require('electron')

export default function App() {
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<{title?: string, text?: string}>({})

  useEffect(() => {
    const handleLog = (_event: any, message: string) => {
      setLogs((prevLogs) => [...prevLogs, message])
    }
    const handleResult = (_event: any, data: any) => {
      setResult(data)
    }

    ipcRenderer.on('agent:log', handleLog)
    ipcRenderer.on('agent:result', handleResult)

    return () => {
      ipcRenderer.removeListener('agent:log', handleLog)
      ipcRenderer.removeListener('agent:result', handleResult)
    }
  }, [])

  const startAgent = () => {
    setLogs([])
    setResult({})
    ipcRenderer.send('agent:start')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col gap-6 font-sans">
      <header className="border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Playwright Agent Terminal
        </h1>
        <p className="text-gray-400 mt-2">Experimental minimal configuration for Overdue.</p>
      </header>

      <div className="flex gap-4 items-center">
        <button 
          onClick={startAgent}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-semibold transition-colors focus:ring-4 focus:ring-blue-500/50 shadow-lg"
        >
          Start Agent
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Terminal logs panel */}
        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm border border-gray-700 shadow-inner overflow-y-auto hidden-scrollbar flex flex-col">
          <h2 className="text-gray-400 mb-2 border-b border-gray-700 pb-2 uppercase tracking-wider text-xs font-bold">Execution Logs</h2>
          <div className="flex-1 overflow-y-auto space-y-1">
            {logs.length === 0 && <span className="text-gray-500 italic">Waiting to start...</span>}
            {logs.map((log, i) => (
              <div key={i} className="text-green-400">
                <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Results panel */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner flex flex-col">
          <h2 className="text-gray-400 mb-2 border-b border-gray-700 pb-2 uppercase tracking-wider text-xs font-bold">Extracted Content</h2>
          <div className="flex-1 space-y-4 overflow-y-auto">
             {!result.title && <span className="text-gray-500 italic text-sm">No results yet.</span>}
             {result.title && (
               <div>
                 <h3 className="text-blue-300 text-sm uppercase tracking-wide font-bold mb-1">Page Title</h3>
                 <p className="text-white bg-gray-900 p-2 rounded">{result.title}</p>
               </div>
             )}
             {result.text && (
               <div>
                 <h3 className="text-blue-300 text-sm uppercase tracking-wide font-bold mb-1">Body Text</h3>
                 <div className="text-gray-300 bg-gray-900 p-2 rounded text-sm max-h-64 overflow-y-auto">
                   {result.text.split('\n').map((line, i) => (
                     <p key={i} className="mb-1">{line}</p>
                   ))}
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}
