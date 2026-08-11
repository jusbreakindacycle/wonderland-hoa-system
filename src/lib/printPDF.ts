const HOA_NAME = 'Wonderland Townhomes Homeowners Association'

function fmtPHP(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

function openPrintWindow(html: string) {
  const win = window.open('', '_blank', 'width=960,height=700')
  if (!win) {
    alert('Please allow pop-ups for this site to generate PDFs.\n\nGo to your browser settings → Site settings → Pop-ups and redirects → Allow.')
    return
  }
  win.document.write(html)
  win.document.close()
}

// ─── DELINQUENCY REPORT ──────────────────────────────────────────────────────

export type DelinquencyRow = {
  id: string
  unit_id: string
  billing_month: string
  balance: number
  due_date: string
  status: 'unpaid' | 'partial'
  units: { unit_code: string; homeowners: { full_name: string; is_active: boolean }[] } | null
}

export function printDelinquencyReport(rows: DelinquencyRow[]) {
  const totalAmount  = rows.reduce((s, r) => s + r.balance, 0)
  const uniqueUnits  = new Set(rows.map(r => r.unit_id)).size
  const daysOver     = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  const today        = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayShort   = new Date().toISOString().split('T')[0]

  const tableRows = rows.map((r, i) => {
    const owner    = r.units?.homeowners?.find(h => h.is_active)?.full_name ?? '—'
    const days     = daysOver(r.due_date)
    const critical = days >= 90
    const rowBg    = critical ? '#fff1f2' : (i % 2 === 0 ? '#ffffff' : '#f8fafc')
    const sBg      = r.status === 'unpaid' ? '#fee2e2' : '#fef3c7'
    const sColor   = r.status === 'unpaid' ? '#dc2626'  : '#d97706'
    const dColor   = critical ? 'color:#dc2626;font-weight:700' : 'color:#d97706;font-weight:600'
    return `<tr style="background:${rowBg};">
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${i + 1}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#111827;">${r.units?.unit_code ?? '—'}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;">${owner}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;">${r.billing_month}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#dc2626;">${fmtPHP(r.balance)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;">${new Date(r.due_date).toLocaleDateString('en-PH')}</td>
      <td style="padding:8px 12px;font-size:12px;${dColor}">${days}d</td>
      <td style="padding:8px 12px;"><span style="background:${sBg};color:${sColor};padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">${r.status}</span></td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>Delinquency Report — ${todayShort}</title>
<style>
  @page { margin:1.5cm 1.8cm; size:A4 landscape; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:-apple-system,'Segoe UI',Arial,sans-serif; color:#111827; background:#fff; }
  @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>

<!-- HEADER -->
<div style="background:linear-gradient(135deg,#0f2952 0%,#1d4ed8 100%);padding:26px 32px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="color:#93c5fd;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">${HOA_NAME}</div>
    <div style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Delinquency Report</div>
    <div style="color:#bfdbfe;font-size:12px;margin-top:5px;">${today}</div>
  </div>
  <div style="text-align:right;">
    <div style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:8px 16px;">
      <div style="color:#93c5fd;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Classification</div>
      <div style="color:#fff;font-size:13px;font-weight:700;margin-top:2px;">Confidential</div>
    </div>
  </div>
</div>

<!-- SUMMARY -->
<div style="display:flex;gap:0;background:#f0f4ff;border-bottom:1px solid #c7d7fe;">
  <div style="flex:1;padding:16px 24px;border-right:1px solid #c7d7fe;">
    <div style="font-size:10px;color:#4361c2;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Delinquent Units</div>
    <div style="font-size:28px;font-weight:800;color:#1d4ed8;margin-top:3px;">${uniqueUnits}</div>
  </div>
  <div style="flex:1;padding:16px 24px;border-right:1px solid #c7d7fe;">
    <div style="font-size:10px;color:#b45309;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Overdue Records</div>
    <div style="font-size:28px;font-weight:800;color:#d97706;margin-top:3px;">${rows.length}</div>
  </div>
  <div style="flex:1;padding:16px 24px;border-right:1px solid #c7d7fe;">
    <div style="font-size:10px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Critical (90d+)</div>
    <div style="font-size:28px;font-weight:800;color:#dc2626;margin-top:3px;">${rows.filter(r => daysOver(r.due_date) >= 90).length}</div>
  </div>
  <div style="flex:2;padding:16px 24px;">
    <div style="font-size:10px;color:#0f2952;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total Outstanding</div>
    <div style="font-size:28px;font-weight:800;color:#0f2952;margin-top:3px;">${fmtPHP(totalAmount)}</div>
  </div>
</div>

<!-- TABLE -->
<div style="padding:20px 32px;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#0f2952;">
        ${['#','Unit','Homeowner','Month','Balance','Due Date','Days Over','Status']
          .map(h => `<th style="padding:10px 12px;font-size:10px;font-weight:700;color:#93c5fd;text-align:left;text-transform:uppercase;letter-spacing:1px;border:none;">${h}</th>`)
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr style="background:#e8f0ff;border-top:2px solid #93c5fd;">
        <td colspan="4" style="padding:10px 12px;font-size:12px;font-weight:700;color:#0f2952;text-align:right;border:none;">TOTAL OUTSTANDING</td>
        <td style="padding:10px 12px;font-size:14px;font-weight:800;color:#dc2626;border:none;">${fmtPHP(totalAmount)}</td>
        <td colspan="3" style="border:none;"></td>
      </tr>
    </tbody>
  </table>
</div>

<!-- FOOTER -->
<div style="padding:14px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-size:10px;color:#9ca3af;">Generated by WHOA System · ${HOA_NAME} · ${todayShort}</div>
  <div style="font-size:10px;color:#9ca3af;">This report is confidential and intended for HOA officers only.</div>
</div>

<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</body></html>`

  openPrintWindow(html)
}

// ─── PAYMENT RECEIPT ─────────────────────────────────────────────────────────

export type ReceiptPayment = {
  id: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_date: string
  credit_used: number
  notes: string | null
  units: { unit_code: string; homeowners: { full_name: string; is_active: boolean }[] } | null
  received_by_profile: { full_name: string } | null
  payment_allocations: {
    id: string
    amount_allocated: number
    dues: { billing_month: string; due_date: string } | null
  }[]
}

export function printPaymentReceipt(payment: ReceiptPayment) {
  const receiptNo   = payment.id.replace(/-/g, '').toUpperCase().substring(0, 10)
  const owner       = payment.units?.homeowners?.find(h => h.is_active)?.full_name ?? '—'
  const method      = (payment.payment_method ?? '').replace('_', ' ')
  const methodLabel = method.charAt(0).toUpperCase() + method.slice(1)
  const issueDate   = new Date(payment.payment_date).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const detailRows = [
    ['Unit',            payment.units?.unit_code ?? '—'],
    ['Homeowner',       owner],
    ['Payment Method',  methodLabel],
    ...(payment.reference_number ? [['Reference No.',  payment.reference_number]] : []),
    ...(payment.notes             ? [['Notes',         payment.notes]]             : []),
  ].map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#6b7280;width:38%;">${label}</td>
      <td style="padding:9px 14px;font-size:13px;font-weight:500;color:#111827;">${value}</td>
    </tr>`).join('')

  const allocRows = payment.payment_allocations.map((a, i) => {
    const code = a.dues?.billing_month ?? '—'
    let period = '—'
    if (code !== '—') {
      const [y, m] = code.split('-')
      period = new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    }
    return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f0fdf4'};">
      <td style="padding:8px 14px;font-size:12px;font-family:monospace;color:#374151;">${code}</td>
      <td style="padding:8px 14px;font-size:12px;color:#374151;">${period}</td>
      <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">${fmtPHP(a.amount_allocated)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>Receipt ${receiptNo}</title>
<style>
  @page { margin:1.8cm 2cm; size:A5; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:-apple-system,'Segoe UI',Arial,sans-serif; color:#111827; background:#fff; max-width:560px; margin:0 auto; }
  @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; max-width:100%; } }
  @media screen{ body{ padding:24px; } }
</style>
</head><body>

<!-- LETTERHEAD -->
<div style="background:linear-gradient(135deg,#14532d 0%,#15803d 100%);padding:22px 24px;border-radius:12px 12px 0 0;">
  <div style="color:#bbf7d0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;">Official Payment Receipt</div>
  <div style="color:#fff;font-size:17px;font-weight:800;">${HOA_NAME}</div>
  <div style="color:#bbf7d0;font-size:10px;margin-top:3px;">Wonderland Townhomes, Philippines</div>
</div>

<!-- RECEIPT ID + DATE -->
<div style="background:#f0fdf4;border:1px solid #86efac;border-top:none;padding:11px 22px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
  <div>
    <span style="font-size:9px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">OR No.</span>
    <span style="font-size:13px;font-weight:800;color:#14532d;margin-left:8px;font-family:monospace;letter-spacing:1px;">${receiptNo}</span>
  </div>
  <div style="font-size:11px;color:#15803d;font-weight:600;">${issueDate}</div>
</div>

<!-- DETAILS TABLE -->
<div style="padding:0 22px;margin-bottom:14px;">
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tbody>${detailRows}</tbody>
  </table>
</div>

<!-- ALLOCATIONS -->
${payment.payment_allocations.length > 0 ? `
<div style="padding:0 22px;margin-bottom:14px;">
  <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Applied To (Billing Months Covered)</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#f0fdf4;">
        <th style="padding:7px 14px;font-size:9px;font-weight:700;color:#6b7280;text-align:left;text-transform:uppercase;">Code</th>
        <th style="padding:7px 14px;font-size:9px;font-weight:700;color:#6b7280;text-align:left;text-transform:uppercase;">Period</th>
        <th style="padding:7px 14px;font-size:9px;font-weight:700;color:#6b7280;text-align:right;text-transform:uppercase;">Applied</th>
      </tr>
    </thead>
    <tbody>${allocRows}</tbody>
  </table>
</div>` : ''}

<!-- AMOUNT TOTAL -->
<div style="margin:0 22px 14px;background:linear-gradient(135deg,#14532d,#16a34a);border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="color:#bbf7d0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total Amount Paid</div>
    ${payment.credit_used > 0 ? `<div style="color:#86efac;font-size:10px;margin-top:2px;">Incl. ${fmtPHP(payment.credit_used)} HOA credit</div>` : ''}
  </div>
  <div style="color:#fff;font-size:22px;font-weight:800;">${fmtPHP(payment.amount)}</div>
</div>

<!-- RECEIVED BY + SIGNATURE -->
<div style="padding:0 22px 20px;">
  <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">Received By</div>
      <div style="font-size:14px;font-weight:700;color:#111827;">${payment.received_by_profile?.full_name ?? '—'}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:1px;">HOA Officer / Treasurer</div>
    </div>
    <div style="text-align:center;">
      <div style="width:140px;border-top:1px solid #374151;padding-top:4px;">
        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Authorized Signature</div>
      </div>
    </div>
  </div>
</div>

<!-- FOOTER NOTE -->
<div style="margin:0 22px;padding:8px 12px;text-align:center;border:1px dashed #d1d5db;border-radius:6px;">
  <div style="font-size:9px;color:#9ca3af;">This is a computer-generated receipt. No wet signature required.</div>
  <div style="font-size:9px;color:#d1d5db;margin-top:2px;">WHOA System · ${HOA_NAME}</div>
</div>

<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</body></html>`

  openPrintWindow(html)
}
