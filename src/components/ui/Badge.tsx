type BadgeVariant =
  | 'unpaid' | 'partial' | 'paid' | 'waived' | 'void'
  | 'open' | 'in_progress' | 'resolved'
  | 'occupied' | 'vacant'

const classes: Record<BadgeVariant, string> = {
  unpaid:      'bg-red-100 text-red-700',
  partial:     'bg-amber-100 text-amber-700',
  paid:        'bg-green-100 text-green-700',
  waived:      'bg-blue-100 text-blue-700',
  void:        'bg-gray-100 text-gray-500',
  open:        'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-green-100 text-green-700',
  occupied:    'bg-green-100 text-green-700',
  vacant:      'bg-gray-100 text-gray-500',
}

const labels: Record<BadgeVariant, string> = {
  unpaid:      'Unpaid',
  partial:     'Partial',
  paid:        'Paid',
  waived:      'Waived',
  void:        'Void',
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  occupied:    'Occupied',
  vacant:      'Vacant',
}

export function Badge({ status }: { status: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  )
}
