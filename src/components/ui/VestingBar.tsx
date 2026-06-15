interface VestingBarProps {
  startDate: string
  durationSeconds: number
  funded: string
  claimed: string
  principal: string
}

export function VestingBar({ startDate, durationSeconds, funded, claimed, principal }: VestingBarProps) {
  const now = Date.now() / 1000
  const start = new Date(startDate).getTime() / 1000
  const end = start + durationSeconds
  const elapsed = Math.max(0, Math.min(now - start, durationSeconds))
  const vestPct = durationSeconds > 0 ? (elapsed / durationSeconds) * 100 : 0

  const principalN = BigInt(principal || '0')
  const fundedN = BigInt(funded || '0')
  const claimedN = BigInt(claimed || '0')

  const fundedPct = principalN > 0n ? Number((fundedN * 100n) / principalN) : 0
  const claimedPct = principalN > 0n ? Number((claimedN * 100n) / principalN) : 0

  const fmt = (n: bigint) => (Number(n) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Vesting progress</span>
          <span>{vestPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${vestPct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Principal</p>
          <p className="text-sm font-semibold text-gray-900">{fmt(principalN)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Funded</p>
          <p className="text-sm font-semibold text-blue-600">{fmt(fundedN)}</p>
          {fundedPct > 0 && <p className="text-xs text-gray-400">{fundedPct.toFixed(0)}%</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500">Claimed</p>
          <p className="text-sm font-semibold text-green-600">{fmt(claimedN)}</p>
          {claimedPct > 0 && <p className="text-xs text-gray-400">{claimedPct.toFixed(0)}%</p>}
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Start: {new Date(startDate).toLocaleDateString()}</span>
        <span>End: {new Date(end * 1000).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
