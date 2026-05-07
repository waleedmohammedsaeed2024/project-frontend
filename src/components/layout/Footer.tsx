import { Boxes } from 'lucide-react'

const APP_NAME = 'نظام متابعة المخزون'
const DEVELOPER = 'وليد محمد سعيد'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '14px 24px',
        background: 'oklch(0.96 0.005 240)',
        borderTop: '1px solid oklch(0.88 0.01 240)',
        color: 'oklch(0.40 0.02 240)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Boxes size={15} color="white" />
        </div>
        <span style={{ fontWeight: 700, color: 'oklch(0.30 0.03 240)' }}>{APP_NAME}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
        <span>المطور</span>
        <span style={{
          padding: '3px 10px',
          borderRadius: 999,
          background: 'oklch(0.92 0.02 240)',
          color: 'oklch(0.30 0.06 240)',
          fontWeight: 700,
        }}>
          {DEVELOPER}
        </span>
      </div>

      <div style={{ fontSize: 12, color: 'oklch(0.50 0.02 240)' }}>
        © {year} — جميع الحقوق محفوظة للمطور
      </div>
    </footer>
  )
}
