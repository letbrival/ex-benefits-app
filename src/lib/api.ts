const BASE = import.meta.env.VITE_API_BASE_URL || 'https://exbenefits-b10b9da6761c.herokuapp.com'

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export interface AccountMeta {
  name: string
  publicKey: string
  signer: boolean
  writable: boolean
}

export interface TxResult {
  programId: string
  instructionName: string
  accounts: AccountMeta[]
  instructionDataHex: string
  recentBlockHash: string
  signerPublicKey: string
  signature: string
}

export interface DevWallet {
  walletId: string
  publicKey: string
  privateKeyBase64: string
  keypairBase64: string
  keypairJson: number[]
  warning: string
}

/** Pick the derived PDA address from accounts by IDL name */
export function extractPDA(tx: TxResult, accountName: string): string | undefined {
  return tx.accounts.find(a => a.name === accountName)?.publicKey
}

export const api = {
  // Dev
  generateWallet: () => post<DevWallet>('/api/dev/wallets'),

  // Enterprise
  initializeEnterprise: (body: {
    adminAuthority: string
    settlementMint: string
    systemProgram: string
    enterpriseId: string
    treasuryAuthority: string
  }) => post<TxResult>('/api/enterprises/initialize', body),

  pauseEnterprise: (body: { adminAuthority: string; enterprise: string }) =>
    post<TxResult>('/api/enterprises/pause', body),

  resumeEnterprise: (body: { adminAuthority: string; enterprise: string }) =>
    post<TxResult>('/api/enterprises/resume', body),

  proposeAdminTransfer: (body: {
    adminAuthority: string
    enterprise: string
    proposedAdminAuthority: string
  }) => post<TxResult>('/api/enterprises/admin/propose', body),

  acceptAdminTransfer: (body: { newAdminAuthority: string; enterprise: string }) =>
    post<TxResult>('/api/enterprises/admin/accept', body),

  updateTreasuryAuthority: (body: {
    adminAuthority: string
    enterprise: string
    newTreasuryAuthority: string
  }) => post<TxResult>('/api/enterprises/treasury-authority', body),

  // Plans
  createPlan: (body: {
    adminAuthority: string
    enterprise: string
    settlementMint: string
    systemProgram: string
    planId: string
    args: {
      contractType: number          // 0=linear, 1=exponential
      allowedBeneficiaryTypes: number  // bitmask: bit0=employee,bit1=client,bit2=contractor,bit3=partner,bit4=other
      durationSeconds: string       // i64 as string
      curveKPpm: string             // "0" for linear
      earlySettlementEnabled: boolean
      revocable: boolean
    }
  }) => post<TxResult>('/api/plans/create', body),

  activatePlan: (body: {
    adminAuthority: string
    enterprise: string
    plan: string
  }) => post<TxResult>('/api/plans/activate', body),

  deactivatePlan: (body: {
    adminAuthority: string
    enterprise: string
    plan: string
  }) => post<TxResult>('/api/plans/deactivate', body),

  // Positions
  createPosition: (body: {
    adminAuthority: string
    enterprise: string
    plan: string
    settlementMint: string
    systemProgram: string
    args: {
      grantId: string
      beneficiary: string
      beneficiaryType: number
      principal: string
      startTimestamp: string
    }
  }) => post<TxResult>('/api/positions/create', body),

  fundPosition: (body: {
    treasuryAuthority: string
    enterprise: string
    plan: string
    position: string
    settlementMint: string
    treasuryTokenAccount: string
    positionVault: string
    tokenProgram: string
    amount: string
  }) => post<TxResult>('/api/positions/fund', body),

  claimVested: (body: {
    beneficiary: string
    enterprise: string
    plan: string
    position: string
    settlementMint: string
    positionVault: string
    beneficiaryTokenAccount: string
    tokenProgram: string
    associatedTokenProgram: string
    systemProgram: string
  }) => post<TxResult>('/api/positions/claim-vested', body),

  quotePosition: (body: {
    enterprise: string
    plan: string
    position: string
    settlementMint: string
    positionVault: string
    tokenProgram: string
  }) => post<TxResult>('/api/positions/quote', body),

  closePosition: (body: {
    adminAuthority: string
    enterprise: string
    plan: string
    position: string
    settlementMint: string
    positionVault: string
    rentRecipient: string
    tokenProgram: string
  }) => post<TxResult>('/api/positions/close', body),

  revokePosition: (body: {
    adminAuthority: string
    enterprise: string
    plan: string
    position: string
    beneficiary: string
    settlementMint: string
    positionVault: string
    beneficiaryTokenAccount: string
    treasuryAuthority: string
    treasuryTokenAccount: string
    tokenProgram: string
    associatedTokenProgram: string
    systemProgram: string
  }) => post<TxResult>('/api/positions/revoke', body),

  settleEarly: (body: {
    beneficiary: string
    enterprise: string
    plan: string
    position: string
    settlementMint: string
    positionVault: string
    beneficiaryTokenAccount: string
    treasuryAuthority: string
    treasuryTokenAccount: string
    tokenProgram: string
    associatedTokenProgram: string
    systemProgram: string
  }) => post<TxResult>('/api/positions/settle-early', body),
}

export const EXPLORER_URL = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`

export const EXPLORER_ADDR = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=devnet`

export const SYSTEM_PROGRAM = '11111111111111111111111111111111'
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'

/** Convert bitmask → array of type indices */
export function maskToTypes(mask: number): number[] {
  const types = []
  if (mask & (1 << 0)) types.push(0) // employee
  if (mask & (1 << 1)) types.push(1) // client
  if (mask & (1 << 2)) types.push(2) // contractor
  if (mask & (1 << 3)) types.push(3) // partner
  if (mask & (1 << 4)) types.push(4) // other
  return types
}

/** Convert array of type indices → bitmask */
export function typesToMask(types: number[]): number {
  let mask = 0
  for (const t of types) mask |= (1 << t)
  return mask
}
